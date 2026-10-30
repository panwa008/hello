export const load = <T,>(k: string, fallback: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback } catch { return fallback }
}
export const save = (k: string, v: unknown) => {
  try { localStorage.setItem(k, JSON.stringify(v)); return true } catch { return false }
}
/** Demo-only password hash (client-side). Not real security. */
export function hashPass(pw: string, salt: string) {
  let h1 = 0xdeadbeef ^ salt.length, h2 = 0x41c6ce57
  const s = salt + ':' + pw
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677) }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}
export const uid = (p = 'id') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export function ago(t: number) {
  const s = Math.max(0, (Date.now() - t) / 1000)
  if (s < 45) return 'เมื่อสักครู่'
  if (s < 3600) return `${Math.round(s / 60)} นาทีที่แล้ว`
  if (s < 86400) return `${Math.round(s / 3600)} ชม.ที่แล้ว`
  if (s < 172800) return 'เมื่อวาน'
  return new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}
export const clock = (t: number) => new Date(t).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
/** Steps only count between 00:01 and 23:59 local time. */
export const inStepWindow = (d = new Date()) => !(d.getHours() === 0 && d.getMinutes() === 0) && !(d.getHours() === 23 && d.getMinutes() === 59 && d.getSeconds() > 58)
