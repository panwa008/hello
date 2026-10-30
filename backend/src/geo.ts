const R = 6_371_000
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** Great-circle distance in metres (Haversine). */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}
/** Initial bearing from point 1 to point 2, degrees 0..360 (0 = north). */
export function bearing(lat1: number, lng1: number, lat2: number, lng2: number) {
  const y = Math.sin(rad(lng2 - lng1)) * Math.cos(rad(lat2))
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lng2 - lng1))
  return (deg(Math.atan2(y, x)) + 360) % 360
}
/** Point at `dist` metres along `brg` degrees from origin. */
export function destination(lat: number, lng: number, dist: number, brg: number) {
  const d = dist / R, b = rad(brg), p1 = rad(lat), l1 = rad(lng)
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b))
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2))
  return { lat: deg(p2), lng: ((deg(l2) + 540) % 360) - 180 }
}
export type Zone = 'near' | 'mid' | 'far'
export const zoneOf = (m: number): Zone => (m <= 200 ? 'near' : m <= 500 ? 'mid' : 'far')
