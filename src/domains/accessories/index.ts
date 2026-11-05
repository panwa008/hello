/**
 * Accessories domain — one shared shape, two strictly separate catalogs.
 *  - human: avatar cosmetics, sold only in Avatar Shop (digital, Hello Points)
 *  - pet:   pet gear, sold only in Pet Shop (digital, Hello Points)
 * Neither ever appears in the Real Goods Market.
 */
import { AVATAR_SHOP, PET_SHOP, PET_SLOT, PET_SLOT_LABEL } from '../../data/mock'
import type { ShopItem } from '../../data/types'

export type AccessoryKind = 'human' | 'pet'
interface AccessoryBase extends ShopItem { kind: AccessoryKind; realm: 'digital'; slot: string; slotLabel: string }
export interface HumanAccessory extends AccessoryBase { kind: 'human'; slot: 'acc' | 'aura' | 'backpack' }
export interface PetAccessory extends AccessoryBase { kind: 'pet'; slot: 'head' | 'face' | 'neck' | 'back' }
export type Accessory = HumanAccessory | PetAccessory

const HUMAN_SLOTS: [keyof typeof AVATAR_SHOP, HumanAccessory['slot'], string][] = [['accessories', 'acc', 'เครื่องประดับ'], ['aura', 'aura', 'ออร่า'], ['backpack', 'backpack', 'เป้']]

export const HUMAN_ACCESSORIES: HumanAccessory[] = HUMAN_SLOTS.flatMap(([cat, slot, slotLabel]) => (AVATAR_SHOP[cat] ?? []).map((i) => ({ ...i, kind: 'human' as const, realm: 'digital' as const, slot, slotLabel })))
export const PET_ACCESSORIES: PetAccessory[] = PET_SHOP.cosmetics.map((i) => { const slot = PET_SLOT[i.id] ?? 'head'; return { ...i, kind: 'pet' as const, realm: 'digital' as const, slot, slotLabel: PET_SLOT_LABEL[slot] } })

export const ACCESSORY_KIND: Record<AccessoryKind, { th: string; en: string; emoji: string; shop: 'avatarshop' | 'petshop'; shopLabel: string }> = {
  human: { th: 'แต่งตัวอวตาร', en: 'Avatar Accessories', emoji: '💎', shop: 'avatarshop', shopLabel: 'ร้านแต่งตัวอวตาร' },
  pet: { th: 'เครื่องประดับสัตว์เลี้ยง', en: 'Pet Accessories', emoji: '🎀', shop: 'petshop', shopLabel: 'ร้านสัตว์เลี้ยง' },
}
export const accessoriesOf = (k: AccessoryKind): Accessory[] => (k === 'human' ? HUMAN_ACCESSORIES : PET_ACCESSORIES)
