/** Geo helpers (same math as the API). */
const R = 6371008.8, rad = (d: number) => (d * Math.PI) / 180, deg = (r: number) => (r * 180) / Math.PI
export const MOCK_HOME = { lat: 13.7299, lng: 100.5585, label: 'สวนเบญจกิติ, กรุงเทพฯ' }
export function haversine(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}
/** Compass bearing 0° = north, clockwise. */
export function bearingTo(aLat: number, aLng: number, bLat: number, bLng: number) {
  const y = Math.sin(rad(bLng - aLng)) * Math.cos(rad(bLat))
  const x = Math.cos(rad(aLat)) * Math.sin(rad(bLat)) - Math.sin(rad(aLat)) * Math.cos(rad(bLat)) * Math.cos(rad(bLng - aLng))
  return (deg(Math.atan2(y, x)) + 360) % 360
}
export function destination(lat: number, lng: number, dist: number, brg: number) {
  const d = dist / R, b = rad(brg), p1 = rad(lat), l1 = rad(lng)
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b))
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2))
  return { lat: deg(p2), lng: ((deg(l2) + 540) % 360) - 180 }
}
/** Compass bearing → radar screen angle (0° = right/east, clockwise, y down). */
export const toScreen = (bearing: number) => (bearing - 90 + 360) % 360
