#!/usr/bin/env node
/**
 * Production-profile safety test (npm run smoke:prod-config — run after `npm run build`).
 * Boots dist/ with NODE_ENV=production on a throw-away DB and NO TrueMoney keys and asserts that:
 *   - boot is refused without JWT_SECRET, with CORS_ORIGIN="*", with DEMO_SEED but no strong DEMO_PASSWORD
 *   - demo bots / demo seed / demo top-up / manual + simulated steps are OFF by default
 *   - TrueMoney defaults to live and refuses (501, names the missing env vars) — the wallet is never credited
 *   - PromptPay QR refuses without PROMPTPAY_ID; unsigned webhooks are rejected; security headers + rate limit are on
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const entry = join(root, 'dist', 'index.js')
if (!existsSync(entry)) { console.error('dist/index.js missing — run `npm run build` first'); process.exit(1) }
const tmp = mkdtempSync(join(tmpdir(), 'hello-prodcfg-'))
const PORT = 3000 + 90 + Math.floor(Math.random() * 9)
let fails = 0
const pass = (m) => console.log('✅ ' + m)
const fail = (m) => { console.log('❌ ' + m); fails++ }
const check = (cond, m, extra = '') => (cond ? pass(m) : fail(m + (extra ? ' — ' + extra : '')))

// Strip anything TrueMoney/PromptPay/demo-related inherited from the caller's shell.
const base = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(TRUEMONEY_|PROMPTPAY_|DEMO_|ALLOW_|JWT_SECRET|CORS_ORIGIN|PUBLIC_API_URL|PORT|DB_FILE|NODE_ENV|RATE_LIMIT)/.test(k)))
const envFor = (extra) => ({ ...base, NODE_ENV: 'production', PORT: String(PORT), HOST: '127.0.0.1', DB_FILE: join(tmp, `t${Math.random().toString(36).slice(2)}.db`), LOG: 'false', ...extra })
const good = { JWT_SECRET: randomBytes(32).toString('hex'), CORS_ORIGIN: 'https://app.example.test' }

function run(env, waitFor = 'listening', ms = 8000) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [entry], { env, cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    const t = setTimeout(() => resolve({ p, out, code: null }), ms)
    const on = (d) => { out += d; if (waitFor && out.includes(waitFor)) { clearTimeout(t); resolve({ p, out, code: null }) } }
    p.stdout.on('data', on); p.stderr.on('data', on)
    p.on('exit', (code) => { clearTimeout(t); resolve({ p, out, code }) })
  })
}
async function refuses(name, extra, needle) {
  const r = await run(envFor(extra))
  if (r.code === null) r.p.kill()
  check(r.code === 78 && r.out.includes(needle), `boot refused: ${name}`, `exit=${r.code} ${r.out.slice(0, 200)}`)
}

const API = `http://127.0.0.1:${PORT}/api`
async function call(method, path, body, tok, headers = {}) {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}), ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) })
  let j = {}; try { j = await r.json() } catch {}
  return { code: r.status, j, h: r.headers }
}

try {
  await refuses('no JWT_SECRET', { CORS_ORIGIN: good.CORS_ORIGIN }, 'JWT_SECRET')
  await refuses('weak JWT_SECRET', { JWT_SECRET: 'short', CORS_ORIGIN: good.CORS_ORIGIN }, 'JWT_SECRET')
  await refuses('CORS_ORIGIN="*"', { JWT_SECRET: good.JWT_SECRET, CORS_ORIGIN: '*' }, 'CORS_ORIGIN')
  await refuses('missing CORS_ORIGIN', { JWT_SECRET: good.JWT_SECRET }, 'CORS_ORIGIN')
  await refuses('DEMO_SEED=true with default password', { ...good, DEMO_SEED: 'true', DEMO_PASSWORD: 'hello123' }, 'DEMO_PASSWORD')
  await refuses('invalid TRUEMONEY_MODE', { ...good, TRUEMONEY_MODE: 'yolo' }, 'TRUEMONEY_MODE')

  const srv = await run(envFor({ ...good, RATE_LIMIT_AUTH_PER_MIN: '6' }))
  if (srv.code !== null) { fail('server did not start with a valid production config: ' + srv.out); throw new Error('boot') }
  pass(`production server booted on :${PORT} (${srv.out.trim().split('\n').pop()})`)
  try {
    const h = await call('GET', '/health')
    check(h.j.truemoney === 'live', 'TRUEMONEY_MODE defaults to live', JSON.stringify(h.j))
    const f = h.j.features ?? {}
    check(h.j.demoBots === false && f.demoTopup === false && f.simSteps === false && f.manualSteps === false, 'demo bots / demo top-up / sim + manual steps OFF by default', JSON.stringify(f))
    check(h.j.users === 0, 'no demo users seeded (DEMO_SEED off)', `users=${h.j.users}`)
    check(!!h.h.get('strict-transport-security') && h.h.get('x-frame-options') === 'DENY' && (h.h.get('content-security-policy') ?? '').includes("default-src 'none'"), 'security headers (HSTS, X-Frame-Options, CSP)')
    const cors = await fetch(API + '/health', { headers: { Origin: 'https://evil.example' } })
    check(!cors.headers.get('access-control-allow-origin'), 'CORS: foreign origin not allowed')
    const cors2 = await fetch(API + '/health', { headers: { Origin: good.CORS_ORIGIN } })
    check(cors2.headers.get('access-control-allow-origin') === good.CORS_ORIGIN, 'CORS: configured origin allowed')

    const demo = await call('POST', '/auth/login', { email: 'mayy@hello.app', password: 'hello123' })
    check(demo.code === 401, 'demo login mayy@hello.app/hello123 does not exist', `code=${demo.code}`)
    const weak = await call('POST', '/auth/register', { name: 'W', email: 'weak@example.test', password: 'abc123' })
    check(weak.code === 400, 'production password policy (min 8)', `code=${weak.code}`)
    const reg = await call('POST', '/auth/register', { name: 'Prod Tester', email: 'prod@example.test', password: 'correct-horse-battery' })
    check(reg.code === 201, 'register real user', `code=${reg.code} ${JSON.stringify(reg.j).slice(0, 200)}`)
    const tok = reg.j?.result?.tokens?.accessToken, ref = reg.j?.result?.tokens?.refreshToken
    const p0 = reg.j?.state?.points

    // refresh rotation + reuse detection
    const r1 = await call('POST', '/auth/refresh', { refreshToken: ref })
    const reuse = await call('POST', '/auth/refresh', { refreshToken: ref })
    const r2 = await call('POST', '/auth/refresh', { refreshToken: r1.j?.result?.tokens?.refreshToken })
    check(r1.code === 200 && reuse.code === 401 && reuse.j.code === 'refresh_reused' && r2.code === 401, 'refresh rotation + reuse detection revokes the session family', `${r1.code}/${reuse.code}:${reuse.j.code}/${r2.code}`)

    const ch = await call('POST', '/payments/truemoney/charge', { thb: 100, phone: '0812345678' }, tok)
    const need = ['TRUEMONEY_API_BASE', 'TRUEMONEY_MERCHANT_ID', 'TRUEMONEY_API_KEY', 'TRUEMONEY_API_SECRET', 'TRUEMONEY_WEBHOOK_SECRET', 'PUBLIC_API_URL']
    check(ch.code === 501 && ch.j.code === 'payment_not_configured' && need.every((k) => ch.j.missing?.includes(k)), 'live TrueMoney without keys → 501 listing missing env vars', `code=${ch.code} ${JSON.stringify(ch.j)}`)
    check(/ยังไม่ได้ตั้งค่า/.test(ch.j.error ?? '') && /not configured/.test(ch.j.error ?? ''), '501 message is Thai + English')
    const tu = await call('POST', '/wallet/topup', { thb: 20, phone: '0812345678', sandboxAsync: true }, tok)
    check(tu.code === 501, 'legacy /wallet/topup also refuses (501)', `code=${tu.code}`)
    const sbx = await call('POST', '/payments/truemoney/charge', { thb: 20, phone: '0812345678', sandboxAsync: true }, tok)
    check(sbx.code === 501, 'sandboxAsync flag cannot bypass live mode', `code=${sbx.code}`)
    const dt = await call('POST', '/wallet/demo-topup', { points: 5000 }, tok)
    check(dt.code === 403, 'demo top-up disabled (403)', `code=${dt.code}`)
    const ms = await call('POST', '/wallet/steps', { steps: 100, source: 'manual' }, tok)
    const ss = await call('POST', '/wallet/steps', { steps: 100, source: 'sim' }, tok)
    check(ms.code === 403 && ss.code === 403, 'manual + simulated steps rejected (403)', `manual=${ms.code} sim=${ss.code}`)
    const ds = await call('POST', '/wallet/steps', { steps: 100, source: 'device' }, tok)
    check(ds.code === 200, 'device pedometer steps accepted', `code=${ds.code}`)
    const ml = await call('POST', '/explorer/location', { lat: 13.75, lng: 100.5, source: 'mock' }, tok)
    const gl = await call('POST', '/explorer/location', { lat: 13.75, lng: 100.5, accuracy: 10, source: 'gps' }, tok)
    check(ml.code === 403 && gl.code === 200, 'mock location rejected, GPS accepted', `mock=${ml.code} gps=${gl.code}`)
    const pp = await call('POST', '/payments/promptpay/qr', { thb: 50 }, tok)
    check(pp.code === 501 && /PROMPTPAY_ID/.test(JSON.stringify(pp.j)), 'PromptPay QR without PROMPTPAY_ID → 501', `code=${pp.code}`)
    const mk = await call('POST', '/market/orders', { listingId: 'x', method: 'thb', pay: 'truemoney' }, tok)
    check(mk.code === 501, 'market online THB payment refused in live mode (501)', `code=${mk.code}`)
    const wh = await call('POST', '/payments/truemoney/webhook', { event_id: 'e1', reference: 'pay_x', status: 'SUCCESS', amount: '100.00' }, undefined, { 'X-TrueMoney-Signature': 'sha256=' + '0'.repeat(64) })
    check(wh.code === 501 || wh.code === 401, 'unsigned/unconfigured webhook rejected', `code=${wh.code}`)
    const sc = await call('POST', '/payments/pay_x/sandbox-complete', {}, tok)
    check(sc.code === 403 || sc.code === 404, 'sandbox-complete unavailable', `code=${sc.code}`)
    const me = await call('GET', '/me', undefined, tok)
    check(me.j?.state?.points === p0, `wallet never credited (points ${p0} → ${me.j?.state?.points})`)
    check((me.j?.state?.friends ?? []).length === 0, 'no demo friends/bots attached to new users')

    let limited = false
    for (let i = 0; i < 8; i++) { const r = await call('POST', '/auth/login', { email: 'prod@example.test', password: 'wrong-password' }); if (r.code === 429) { limited = !!r.h.get('retry-after'); break } }
    check(limited, 'login rate limit → 429 + Retry-After')
  } finally { srv.p.kill() }

  // Phase 2: live keys present (placeholder values) but provider unreachable → no credit; only a signed webhook credits, once.
  const WHS = randomBytes(24).toString('hex')
  const live = await run(envFor({ ...good, TRUEMONEY_API_BASE: 'https://127.0.0.1:9', TRUEMONEY_MERCHANT_ID: 'TEST-MERCHANT', TRUEMONEY_API_KEY: 'test-key', TRUEMONEY_API_SECRET: 'test-secret', TRUEMONEY_WEBHOOK_SECRET: WHS, PUBLIC_API_URL: 'https://api.example.test', TRUEMONEY_TIMEOUT_MS: '2000' }))
  if (live.code !== null) fail('live-configured server did not boot: ' + live.out)
  else try {
    const { createHmac } = await import('node:crypto')
    const reg = await call('POST', '/auth/register', { name: 'Live Tester', email: 'live@example.test', password: 'correct-horse-battery' })
    const tok = reg.j?.result?.tokens?.accessToken, p0 = reg.j?.state?.points
    const cfg = await call('GET', '/payments/config', undefined, tok)
    check(cfg.j?.result?.truemoney?.ready === true, 'live config detected as complete')
    const ch = await call('POST', '/payments/truemoney/charge', { thb: 100, phone: '0812345678' }, tok)
    check(ch.code === 502 && ch.j.code === 'provider_error', 'provider unreachable → 502, nothing credited', `code=${ch.code} ${JSON.stringify(ch.j).slice(0, 160)}`)
    const list = await call('GET', '/payments', undefined, tok)
    const pid = list.j?.result?.[0]?.id
    check(list.j?.result?.[0]?.status === 'failed', 'payment recorded as failed', JSON.stringify(list.j?.result?.[0]))
    const hook = async (obj, secret = WHS) => {
      const raw = JSON.stringify(obj), ts = String(Math.floor(Date.now() / 1000))
      const sig = createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex')
      return call('POST', '/payments/truemoney/webhook', raw, undefined, { 'X-TrueMoney-Signature': 'sha256=' + sig, 'X-TrueMoney-Timestamp': ts })
    }
    const ev = { event_id: 'evt_live_1', reference: pid, status: 'SUCCESS', amount: '100.00', transaction_id: 'tm_123' }
    check((await hook(ev, 'wrong-secret')).code === 401, 'live webhook with wrong secret → 401')
    const old = await call('POST', '/payments/truemoney/webhook', JSON.stringify(ev), undefined, { 'X-TrueMoney-Signature': 'sha256=' + createHmac('sha256', WHS).update(`1000.${JSON.stringify(ev)}`).digest('hex'), 'X-TrueMoney-Timestamp': '1000' })
    check(old.code === 401, 'stale timestamp (replay) → 401')
    const bad = await hook({ ...ev, event_id: 'evt_live_amt', amount: '1.00' })
    check(bad.code === 409, 'amount mismatch → 409, not credited', `code=${bad.code}`)
    const ok1 = await hook(ev), ok2 = await hook(ev), ok3 = await hook({ ...ev, event_id: 'evt_live_2' })
    check(ok1.j.credited === true && ok2.j.duplicate === true && ok3.j.credited === false, 'signed webhook credits exactly once (replay + second event ignored)', JSON.stringify([ok1.j, ok2.j, ok3.j]))
    const me = await call('GET', '/me', undefined, tok)
    check(me.j?.state?.points === p0 + 11000, `wallet +11000 P after verified webhook (${p0} → ${me.j?.state?.points})`)
  } finally { live.p.kill() }
} catch (e) { if (e.message !== 'boot') fail(String(e)) } finally { rmSync(tmp, { recursive: true, force: true }) }

console.log(fails ? `\n💥 ${fails} production-config check(s) failed` : '\n🎉 production config smoke passed — live mode refuses safely without keys')
process.exit(fails ? 1 : 0)
