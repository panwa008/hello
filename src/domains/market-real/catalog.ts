/** Real Goods Market — physical items only (new & used). Digital/pet/avatar items never belong here. */
import type { MarketItem } from '../../data/types'

export const REAL_CATEGORIES = ['อิเล็กทรอนิกส์', 'ของใช้ในบ้าน', 'แฟชั่น', 'เฟอร์นิเจอร์', 'บ้านและสวน', 'แม่และเด็ก', 'งานอดิเรก', 'กีฬา', 'อื่น ๆ'] as const
export const CAT_EMOJI: Record<string, string> = { 'อิเล็กทรอนิกส์': '📱', 'ของใช้ในบ้าน': '🍳', 'แฟชั่น': '👕', 'เฟอร์นิเจอร์': '🪑', 'บ้านและสวน': '🪴', 'แม่และเด็ก': '🍼', 'งานอดิเรก': '🎸', 'กีฬา': '⚽', 'อื่น ๆ': '📦' }

export type ConditionGroup = 'new' | 'openbox' | 'used'
export const CONDITIONS: { id: ConditionGroup; th: string; en: string; cls: string }[] = [
  { id: 'new', th: 'ใหม่', en: 'NEW', cls: 'bg-emerald-500 text-white' },
  { id: 'openbox', th: 'เปิดกล่อง', en: 'OPEN BOX', cls: 'bg-sky-500 text-white' },
  { id: 'used', th: 'มือสอง', en: 'USED', cls: 'bg-amber-500 text-white' },
]
export const USED_GRADES = ['เหมือนใหม่', '95%', '90%', 'ใช้งานปกติ']

/** Legacy free-text conditions ("มือสอง 95%", "เหมือนใหม่", "ใช้งานปกติ") map to used. */
export function conditionGroup(c?: string): ConditionGroup {
  const s = (c ?? '').trim()
  if (s.startsWith('เปิดกล่อง')) return 'openbox'
  if (s === 'ใหม่' || s.startsWith('ใหม่ ')) return 'new'
  return 'used'
}
export const conditionMeta = (c?: string) => CONDITIONS.find((x) => x.id === conditionGroup(c))!

const DIGITAL_RX = /อวตาร|avatar|สกิน|skin|ไอเท็ม|item|ไข่สัตว์เลี้ยง|hello ?points|พอยท์|nft|ดิจิทัล|digital|ออร่า|aura/i
/** Hard guard: only physical goods in a known real-world category reach the Real Market UI. */
export const isRealGood = (m: Pick<MarketItem, 'name' | 'category'>) => (REAL_CATEGORIES as readonly string[]).includes(m.category) && !DIGITAL_RX.test(m.name)

export type MarketFilter = 'all' | ConditionGroup
