/**
 * Central runtime configuration + production profile.
 *
 * NODE_ENV=production flips every demo/sandbox switch OFF unless it is set explicitly:
 *   DEMO_BOTS=false · DEMO_TOPUP=false · ALLOW_SIM_STEPS=false · ALLOW_MANUAL_STEPS=false · DEMO_SEED=false · TRUEMONEY_MODE=live
 * Sandbox behaviour in production is only possible by setting the variable explicitly (e.g. TRUEMONEY_MODE=sandbox).
 */
export const NODE_ENV = process.env.NODE_ENV ?? 'development'
export const IS_PROD = NODE_ENV === 'production'

const raw = (k: string) => { const v = process.env[k]; return v === undefined || v.trim() === '' ? undefined : v.trim() }
/** Boolean env flag; unset → `def`. */
export function flag(k: string, def: boolean) {
  const v = raw(k)
  if (v === undefined) return def
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())
}
const num = (k: string, def: number) => { const v = Number(raw(k)); return Number.isFinite(v) && raw(k) !== undefined ? v : def }
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export type PayMode = 'sandbox' | 'live'
const mode = (raw('TRUEMONEY_MODE') ?? (IS_PROD ? 'live' : 'sandbox')).toLowerCase()

export const config = {
  env: NODE_ENV,
  prod: IS_PROD,
  port: num('PORT', 3001),
  host: raw('HOST') ?? '0.0.0.0',
  /** Feature switches (default ON in dev, OFF in production). */
  demoBots: flag('DEMO_BOTS', !IS_PROD),
  demoTopup: flag('DEMO_TOPUP', !IS_PROD),
  allowSimSteps: flag('ALLOW_SIM_STEPS', !IS_PROD),
  allowManualSteps: flag('ALLOW_MANUAL_STEPS', !IS_PROD),
  /** Accept non-GPS ("mock") positions on /explorer/location. Production: real GPS fixes only. */
  allowMockLocation: flag('ALLOW_MOCK_LOCATION', !IS_PROD),
  demoSeed: flag('DEMO_SEED', !IS_PROD),
  /** Password for the seeded demo account. Dev default only — production must provide its own. */
  demoPassword: raw('DEMO_PASSWORD') ?? (IS_PROD ? undefined : 'hello123'),
  starterPoints: Math.max(0, Math.floor(num('STARTER_POINTS', 5000))),
  /** Payments */
  payMode: (mode === 'live' ? 'live' : mode === 'sandbox' ? 'sandbox' : 'invalid') as PayMode | 'invalid',
  /** Auth */
  jwtSecret: raw('JWT_SECRET') ?? (IS_PROD ? '' : 'dev-only-change-me-hello-secret'),
  accessTtl: clamp(num('ACCESS_TTL_SEC', 15 * 60), 60, 3600),
  refreshTtl: clamp(num('REFRESH_TTL_SEC', 30 * 24 * 3600), 3600, 90 * 24 * 3600),
  bcryptRounds: clamp(Math.floor(num('BCRYPT_ROUNDS', IS_PROD ? 12 : 10)), 10, 15),
  /** HTTP */
  corsOrigins: (raw('CORS_ORIGIN') ?? (IS_PROD ? '' : '*')).split(',').map((s) => s.trim()).filter(Boolean),
  trustProxy: flag('TRUST_PROXY', IS_PROD),
  rateLimit: flag('RATE_LIMIT', true),
  rlAuthPerMin: num('RATE_LIMIT_AUTH_PER_MIN', 10),
  rlRefreshPerMin: num('RATE_LIMIT_REFRESH_PER_MIN', 30),
  rlPayPerMin: num('RATE_LIMIT_PAY_PER_MIN', 10),
  rlWebhookPerMin: num('RATE_LIMIT_WEBHOOK_PER_MIN', 120),
}

/** Fatal misconfigurations — the server refuses to boot in production when any are present. */
export function configErrors(): string[] {
  const e: string[] = []
  if (config.payMode === 'invalid') e.push(`TRUEMONEY_MODE must be "sandbox" or "live" (got "${raw('TRUEMONEY_MODE')}")`)
  if (!IS_PROD) return e
  if (!config.jwtSecret || config.jwtSecret.length < 32 || /change-me/i.test(config.jwtSecret)) e.push('JWT_SECRET is required in production (≥32 random chars, e.g. `openssl rand -hex 32`)')
  if (!config.corsOrigins.length) e.push('CORS_ORIGIN is required in production (comma-separated https:// origins of your web app)')
  if (config.corsOrigins.includes('*')) e.push('CORS_ORIGIN="*" is not allowed in production — list your exact origins')
  for (const o of config.corsOrigins) if (o !== '*' && !/^https:\/\//.test(o) && !flag('ALLOW_HTTP_ORIGIN', false)) e.push(`CORS_ORIGIN entry "${o}" must be https:// (set ALLOW_HTTP_ORIGIN=true only for internal testing)`)
  if (config.demoSeed && (!config.demoPassword || config.demoPassword === 'hello123' || config.demoPassword.length < 12)) e.push('DEMO_SEED=true in production needs DEMO_PASSWORD (≥12 chars, not the dev default)')
  return e
}

/** Non-fatal warnings printed at boot. */
export function configWarnings(): string[] {
  const w: string[] = []
  if (IS_PROD) {
    for (const [k, v] of [['DEMO_BOTS', config.demoBots], ['DEMO_TOPUP', config.demoTopup], ['ALLOW_SIM_STEPS', config.allowSimSteps], ['ALLOW_MANUAL_STEPS', config.allowManualSteps], ['ALLOW_MOCK_LOCATION', config.allowMockLocation], ['DEMO_SEED', config.demoSeed]] as const) if (v) w.push(`${k}=true in production (explicit override)`)
    if (config.payMode === 'sandbox') w.push('TRUEMONEY_MODE=sandbox in production (explicit override) — top-ups credit points WITHOUT real money')
  }
  return w
}

/** Public, non-secret feature flags (exposed on /api/health so the web app can adapt its UI). */
export const publicFeatures = () => ({
  env: IS_PROD ? 'production' : 'development',
  demoBots: config.demoBots, demoTopup: config.demoTopup, simSteps: config.allowSimSteps, manualSteps: config.allowManualSteps, mockLocation: config.allowMockLocation,
  truemoney: config.payMode,
})
