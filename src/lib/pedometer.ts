/**
 * Browser pedometer (DeviceMotion). Not as accurate as the OS step counter (HealthKit / Google Fit) —
 * a native app should use those. Steps are detected as peaks of the acceleration magnitude:
 *   low-pass gravity removal → magnitude → peak above an adaptive threshold → ≥ 250 ms between steps.
 * Needs HTTPS. iOS 13+ requires DeviceMotionEvent.requestPermission() from a user gesture.
 */
type DM = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }

export const pedometerSupported = () => typeof window !== 'undefined' && 'DeviceMotionEvent' in window && window.isSecureContext

export async function requestMotionPermission(): Promise<boolean> {
  if (!pedometerSupported()) return false
  const D = window.DeviceMotionEvent as DM
  if (typeof D.requestPermission === 'function') {
    try { return (await D.requestPermission()) === 'granted' } catch { return false }
  }
  return true // Android / desktop: no prompt (some browsers gate it behind site settings)
}

export function startPedometer(onStep: (n: number) => void): () => void {
  let g = [0, 0, 0], avg = 1.2, lastPeak = 0, rising = false, prev = 0, got = false
  const handler = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity
    if (!a || a.x == null || a.y == null || a.z == null) return
    got = true
    const k = 0.9 // gravity low-pass
    g = [k * g[0] + (1 - k) * a.x, k * g[1] + (1 - k) * a.y, k * g[2] + (1 - k) * a.z]
    const lx = a.x - g[0], ly = a.y - g[1], lz = a.z - g[2]
    const m = Math.sqrt(lx * lx + ly * ly + lz * lz)
    avg = 0.98 * avg + 0.02 * m
    const thr = Math.max(1.1, avg * 1.4)
    const t = e.timeStamp || performance.now()
    if (m > prev) rising = true
    else if (rising) { // local maximum
      rising = false
      if (prev > thr && t - lastPeak > 250) { lastPeak = t; onStep(1) }
    }
    prev = m
  }
  window.addEventListener('devicemotion', handler)
  const check = setTimeout(() => { if (!got) console.warn('[pedometer] no motion events — sensor unavailable or blocked') }, 3000)
  return () => { clearTimeout(check); window.removeEventListener('devicemotion', handler) }
}
