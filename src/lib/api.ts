/** Hello API client. Online mode is enabled when VITE_API_URL is set ("/" = same origin via proxy). */
const RAW = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
export const ONLINE = !!RAW
const BASE = !RAW ? '' : (RAW === '/' ? '' : RAW.replace(/\/+$/, '')) + '/api'

const TOK = 'hello.tokens'
export interface Tokens { accessToken: string; refreshToken: string }
let tokens: Tokens | null = (() => { try { return JSON.parse(localStorage.getItem(TOK) ?? 'null') } catch { return null } })()
export const getTokens = () => tokens
export function setTokens(t: Tokens | null) {
  tokens = t
  try { if (t) localStorage.setItem(TOK, JSON.stringify(t)); else localStorage.removeItem(TOK) } catch { /* private mode */ }
}

export class ApiFail extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message) }
}

/** Origin of the API for Socket.io ('' = same origin). */
export const API_ORIGIN = !RAW || RAW === '/' ? '' : RAW.replace(/\/+$/, '')
// Keep tabs in sync: another tab may have rotated the refresh token (reusing an old one revokes every session).
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => {
  if (e.key !== TOK) return
  try { tokens = JSON.parse(e.newValue ?? 'null') } catch { tokens = null }
})
const fromStorage = (): Tokens | null => { try { return JSON.parse(localStorage.getItem(TOK) ?? 'null') } catch { return tokens } }

let refreshing: Promise<boolean> | null = null
export async function refresh(): Promise<boolean> {
  const stored = fromStorage()
  if (stored && tokens && stored.refreshToken !== tokens.refreshToken) { tokens = stored; return true } // already rotated by another tab
  if (!tokens?.refreshToken) return false
  refreshing ??= (async () => {
    try {
      const r = await fetch(BASE + '/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: tokens!.refreshToken }) })
      if (!r.ok) { setTokens(null); return false }
      const j = await r.json(); setTokens(j.result.tokens); return true
    } catch { return false } finally { setTimeout(() => { refreshing = null }, 0) }
  })()
  return refreshing
}

export let onAuthLost: () => void = () => {}
export const setOnAuthLost = (fn: () => void) => { onAuthLost = fn }

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const doFetch = () => fetch(BASE + path, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers: { ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(opts.auth !== false && tokens ? { Authorization: 'Bearer ' + tokens.accessToken } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  let r: Response
  try { r = await doFetch() } catch { throw new ApiFail('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ต', 0, 'network') }
  if (r.status === 401 && opts.auth !== false && tokens) {
    if (await refresh()) r = await doFetch()
    else { onAuthLost(); throw new ApiFail('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401, 'auth') }
  }
  let j: any = null
  try { j = await r.json() } catch { /* empty */ }
  if (!r.ok || j?.ok === false) throw new ApiFail(j?.error ?? `เกิดข้อผิดพลาด (${r.status})`, r.status, j?.code)
  return j as T
}
