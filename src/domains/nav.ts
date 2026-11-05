import { Compass, Egg, Ellipsis, Gamepad2, Gem, House, MessageCircle, PawPrint, Shirt, Sparkles, Store, User, Users, Wallet } from 'lucide-react'
import type { Screen } from '../store/AppStore'
import type { Realm } from './shared/realm'

export type NavItem = { id: Screen; label: string; en: string; icon: typeof House }
export type NavGroup = { key: 'core' | Realm | 'account'; th: string; en: string; emoji?: string; items: NavItem[] }

/** IA: real world and avatar world are separate sections. */
export const WORLDS: NavGroup[] = [
  { key: 'core', th: 'หลัก', en: 'Hello', items: [
    { id: 'home', label: 'หน้าหลัก', en: 'Home', icon: House },
    { id: 'chat', label: 'แชท', en: 'Chat', icon: MessageCircle },
  ] },
  { key: 'real', th: 'โลกจริง', en: 'Real World', emoji: '🌏', items: [
    { id: 'explorer', label: 'สำรวจ', en: 'Explorer', icon: Compass },
    { id: 'friends', label: 'เพื่อน', en: 'Friends', icon: Users },
    { id: 'market', label: 'ตลาดของจริง', en: 'Real Market', icon: Store },
  ] },
  { key: 'digital', th: 'โลกอวตาร', en: 'Avatar World', emoji: '✨', items: [
    { id: 'avatar', label: 'อวตาร', en: 'Avatar', icon: Sparkles },
    { id: 'pets', label: 'สัตว์เลี้ยง', en: 'Pets', icon: PawPrint },
    { id: 'avatarshop', label: 'ร้านแต่งตัวอวตาร', en: 'Avatar Shop', icon: Shirt },
    { id: 'petshop', label: 'ร้านสัตว์เลี้ยง', en: 'Pet Shop', icon: Egg },
    { id: 'accessories', label: 'เครื่องประดับ', en: 'Accessories', icon: Gem },
    { id: 'game', label: 'อาร์เคดเกม', en: 'Arcade', icon: Gamepad2 },
  ] },
  { key: 'account', th: 'บัญชี', en: 'Account', items: [
    { id: 'wallet', label: 'กระเป๋าเงิน', en: 'Wallet', icon: Wallet },
    { id: 'profile', label: 'โปรไฟล์', en: 'Profile', icon: User },
    { id: 'more', label: 'ตั้งค่า', en: 'Settings', icon: Ellipsis },
  ] },
]
export const NAV: NavItem[] = WORLDS.flatMap((g) => g.items)
