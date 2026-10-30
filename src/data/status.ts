import type { StatusKey, PrivacyMode } from './types'

export const STATUS: Record<StatusKey, { th: string; en: string; color: string; soft: string; rule: string }> = {
  open: { th: 'เปิดเผย', en: 'Open', color: '#34C77B', soft: '#DDF7E9', rule: 'ทุกคนทักหาได้ / ส่งเพิ่มเพื่อน / ดูข้อมูลได้' },
  single: { th: 'โสด', en: 'Single', color: '#4FB3F0', soft: '#DDF0FC', rule: 'เพศตรงข้ามทักได้ / ส่งเพิ่มเพื่อนได้ / ดูข้อมูลโดยรวมไม่ได้' },
  heartbroken: { th: 'อกหัก', en: 'Heartbroken', color: '#F0576B', soft: '#FDE1E5', rule: 'เฉพาะเพื่อนเท่านั้นที่ทักหาได้' },
  taken: { th: 'มีแฟนแล้ว', en: 'Taken', color: '#F27FB2', soft: '#FDE4EF', rule: 'เพื่อนและเพศเดียวกันทักหาได้' },
  family: { th: 'มีครอบครัว', en: 'Family', color: '#3D5BD9', soft: '#DFE5FB', rule: 'เพื่อนและคนมีครอบครัวทักหาได้' },
  hidden: { th: 'ปิดบัง', en: 'Hidden', color: '#9B6AD8', soft: '#EEE3FA', rule: 'ไม่สามารถทักหาได้ / ดูข้อมูลไม่ได้' },
}

export const PRIVACY: Record<PrivacyMode, { th: string; en: string; desc: string; emoji: string }> = {
  public: { th: 'สาธารณะ', en: 'Public', desc: 'ทุกคนบนแผนที่เห็นคุณและโปรไฟล์', emoji: '🌍' },
  nearby: { th: 'เฉพาะใกล้เคียง', en: 'Nearby', desc: 'เห็นเฉพาะคนในรัศมี 500 ม.', emoji: '📍' },
  friends: { th: 'เฉพาะเพื่อน', en: 'Friends', desc: 'เฉพาะเพื่อนเท่านั้นที่เห็นตำแหน่ง', emoji: '🫂' },
  ghost: { th: 'โหมดผี', en: 'Ghost', desc: 'แสดงเป็นจุดจาง ไม่ระบุตัวตน', emoji: '👻' },
  invisible: { th: 'ล่องหน', en: 'Invisible', desc: 'ไม่ปรากฏบนแผนที่เลย', emoji: '🫥' },
}
