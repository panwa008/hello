/** Living World helpers: Bangkok day key, time-of-day weather mood, world spots. */
export const bkkDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
export const bkkHour = (d = new Date()) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', hourCycle: 'h23' }).format(d))

export function hashStr(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
/** Deterministic 0..1 generator from a seed string. */
export function rng(seed: string) { let a = hashStr(seed); return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

export type QuestId = 'walk' | 'greet' | 'care'
export interface Quest { id: QuestId; titleTh: string; titleEn: string; emoji: string; progress: number; target: number; rewardPoints: number; completed: boolean; claimed: boolean }
export type CareKey = 'feed' | 'play' | 'walk'
export interface WorldDay { date: string; quests: Quest[]; care: Record<CareKey, boolean>; careBonus: boolean; checkins: string[]; tipDismissed?: boolean }

export const QUEST_DEFS: Omit<Quest, 'progress' | 'completed' | 'claimed'>[] = [
  { id: 'walk', titleTh: 'เดินให้ครบ 1,000 ก้าว', titleEn: 'Walk 1,000 steps', emoji: '👣', target: 1000, rewardPoints: 20 },
  { id: 'greet', titleTh: 'ทักทายคนใกล้ ๆ 1 คน', titleEn: 'Say hi to someone nearby', emoji: '👋', target: 1, rewardPoints: 20 },
  { id: 'care', titleTh: 'ดูแลน้องประจำวัน', titleEn: 'Daily pet care', emoji: '🐾', target: 1, rewardPoints: 30 },
]
export const CARE_BONUS = 15
export const CHECKIN_POINTS = 5
export const freshWorld = (tipDismissed = false): WorldDay => ({
  date: bkkDay(), quests: QUEST_DEFS.map((q) => ({ ...q, progress: 0, completed: false, claimed: false })),
  care: { feed: false, play: false, walk: false }, careBonus: false, checkins: [], tipDismissed,
})

export type WeatherKind = 'sunny' | 'rain' | 'fog' | 'night'
export interface WorldMood { kind: WeatherKind; th: string; en: string; emoji: string; part: string; grad: string }
const PART = (h: number) => (h < 5 ? 'ดึกแล้ว' : h < 11 ? 'เช้านี้' : h < 16 ? 'บ่ายนี้' : h < 19 ? 'เย็นนี้' : 'คืนนี้')
export function worldMood(d = new Date()): WorldMood {
  const h = bkkHour(d)
  const part = PART(h)
  if (h >= 19 || h < 5) return { kind: 'night', th: 'ฟ้าใส ดาวเต็มฟ้า', en: 'Starry night', emoji: '🌙', part, grad: 'linear-gradient(135deg,#C9C2F0 0%,#9B7EBD 55%,#7C8FD6 100%)' }
  const pick = (['sunny', 'sunny', 'rain', 'fog'] as const)[hashStr('wx' + bkkDay(d)) % 4]
  if (pick === 'rain') return { kind: 'rain', th: 'ฝนพรำเบา ๆ', en: 'Soft rain', emoji: '🌧️', part, grad: 'linear-gradient(135deg,#CFE6FA 0%,#B7C7F2 55%,#D9CDF5 100%)' }
  if (pick === 'fog') return { kind: 'fog', th: 'หมอกบางฟุ้ง ๆ', en: 'Misty', emoji: '🌫️', part, grad: 'linear-gradient(135deg,#EEF0F6 0%,#DCD6EC 55%,#F3E3EE 100%)' }
  return h >= 16
    ? { kind: 'sunny', th: 'แดดเย็นสีพีช', en: 'Golden hour', emoji: '🌇', part, grad: 'linear-gradient(135deg,#FFD3B5 0%,#F5A9C5 55%,#CDB8F2 100%)' }
    : { kind: 'sunny', th: 'แดดอ่อน ท้องฟ้าใส', en: 'Sunny', emoji: '☀️', part, grad: 'linear-gradient(135deg,#FFF1C9 0%,#FCE8F1 50%,#CDEFE0 100%)' }
}

export type SpotKind = 'cafe' | 'park' | 'temple' | 'uni' | 'portal' | 'quest'
export interface WorldSpot { id: string; kind: SpotKind; name: string; emoji: string; color: string; distance: number; angle: number; bonus: string; quest?: 'walk' | 'greet' | 'care' }
export const SPOT_STYLE: Record<SpotKind, { emoji: string; color: string; th: string }> = {
  cafe: { emoji: '☕', color: '#E8A87C', th: 'คาเฟ่' },
  park: { emoji: '🌳', color: '#34C77B', th: 'สวน' },
  temple: { emoji: '🛕', color: '#E6B422', th: 'วัด' },
  uni: { emoji: '🎓', color: '#6FA8DC', th: 'มหาวิทยาลัย' },
  portal: { emoji: '🌀', color: '#9B7EBD', th: 'ประตูมิติ' },
  quest: { emoji: '⭐', color: '#F5A9C5', th: 'จุดภารกิจ' },
}
const NAMES: Record<'cafe' | 'park' | 'temple' | 'uni', string[]> = {
  cafe: ['คาเฟ่ลาเวนเดอร์', 'Mochi Café', 'ร้านกาแฟหัวมุม', 'Cloud Brew'],
  park: ['สวนเบญจกิติ', 'สวนลุมพินี', 'สวนหย่อมริมคลอง', 'ลานหญ้าสีมิ้นต์'],
  temple: ['วัดใกล้บ้าน', 'วัดริมน้ำ', 'ศาลเจ้าเล็ก ๆ'],
  uni: ['มหาวิทยาลัยใกล้คุณ', 'ลานกิจกรรมนักศึกษา', 'หอสมุดกลาง'],
}
const BONUS: Record<'cafe' | 'park' | 'temple' | 'uni', string> = {
  cafe: 'เช็คอินได้ · โอกาสเจอเพื่อนใหม่', park: 'เช็คอินได้ · โอกาสพบไข่สูงขึ้น 🥚', temple: 'เช็คอินได้ · ใจสงบ น้องอารมณ์ดี', uni: 'เช็คอินได้ · ลุ้นแบดจ์นักสำรวจ 🏅',
}
/** Client-generated spots, stable per day + rough location (~1 km grid). Works offline and online. */
export function worldSpots(lat: number, lng: number, quests: Quest[], d = new Date()): WorldSpot[] {
  const day = bkkDay(d)
  const r = rng(`${day}:${lat.toFixed(2)}:${lng.toFixed(2)}`)
  const spots: WorldSpot[] = (['cafe', 'park', 'temple', 'uni', 'cafe', 'park'] as const).map((k, i) => {
    const list = NAMES[k]
    return { id: `lm-${k}-${i}`, kind: k, name: list[Math.floor(r() * list.length)], emoji: SPOT_STYLE[k].emoji, color: SPOT_STYLE[k].color, distance: Math.round(80 + r() * 620), angle: Math.round(r() * 360), bonus: BONUS[k] }
  })
  const h = bkkHour(d)
  if (h >= 17 || h < 2 || hashStr('portal' + day) % 3 === 0) spots.push({ id: 'portal-' + day, kind: 'portal', name: 'ประตูมิติยามเย็น', emoji: '🌀', color: SPOT_STYLE.portal.color, distance: Math.round(150 + r() * 400), angle: Math.round(r() * 360), bonus: 'เปิดเฉพาะวันนี้ · ลุ้นไข่หายาก ✨' })
  for (const q of quests) if (!q.completed && q.id !== 'care') spots.push({ id: 'q-' + q.id, kind: 'quest', name: q.titleTh, emoji: '⭐', color: SPOT_STYLE.quest.color, distance: Math.round(60 + r() * 140), angle: Math.round(r() * 360), bonus: q.id === 'walk' ? 'เดินไปถึงจุดนี้ = นับเข้าภารกิจเดิน' : 'มีคนใจดีรออยู่แถวนี้ ลองทักดูสิ', quest: q.id })
  return spots
}
