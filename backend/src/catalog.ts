/** Server-side catalog. Prices here are authoritative (clients only display). */
export type ItemKind = 'egg' | 'food' | 'pet_cosmetic' | 'wardrobe'
export type AvatarSlot = 'hair' | 'top' | 'bottom' | 'shoes' | 'acc' | 'aura' | 'backpack'
export type PetSlot = 'head' | 'face' | 'neck' | 'back'

export interface CatalogItem { id: string; name: string; price: number; kind: ItemKind; emoji: string; rarity?: string; slot?: AvatarSlot | PetSlot }

const I = (id: string, name: string, price: number, kind: ItemKind, emoji: string, extra: Partial<CatalogItem> = {}): CatalogItem => ({ id, name, price, kind, emoji, ...extra })

export const CATALOG: CatalogItem[] = [
  // eggs
  I('e1', 'ไข่ทุ่งดอกไม้', 300, 'egg', '🥚', { rarity: 'Common' }),
  I('e2', 'ไข่ทะเลดาว', 650, 'egg', '🥚', { rarity: 'Rare' }),
  I('e3', 'ไข่เทพนิยาย', 1200, 'egg', '🥚', { rarity: 'Epic' }),
  I('e4', 'ไข่ต่างดาว', 1800, 'egg', '🥚', { rarity: 'Epic' }),
  // food
  I('f1', 'คุกกี้ดาว', 20, 'food', '🍪'), I('f2', 'เบอร์รี่วิเศษ', 35, 'food', '🍓'), I('f3', 'นมเมฆ', 40, 'food', '🥛'),
  I('f4', 'ปลาแซลมอน', 50, 'food', '🐟'), I('f5', 'โดนัทสายรุ้ง', 80, 'food', '🍩'), I('f6', 'แอปเปิลทอง', 150, 'food', '🍎'),
  // pet cosmetics (slot-based)
  I('c1', 'มงกุฎดาว', 400, 'pet_cosmetic', '👑', { slot: 'head', rarity: 'Rare' }),
  I('c2', 'โบว์ชมพู', 120, 'pet_cosmetic', '🎀', { slot: 'head' }),
  I('c3', 'แว่นหัวใจ', 180, 'pet_cosmetic', '🕶️', { slot: 'face' }),
  I('c4', 'ผ้าพันคอมิ้นต์', 150, 'pet_cosmetic', '🧣', { slot: 'neck' }),
  I('c5', 'ปีกนางฟ้า', 900, 'pet_cosmetic', '🪽', { slot: 'back', rarity: 'Epic' }),
  I('c6', 'หมวกพ่อมด', 350, 'pet_cosmetic', '🎩', { slot: 'head', rarity: 'Rare' }),
  I('c7', 'ปลอกคอกระดิ่ง', 140, 'pet_cosmetic', '🔔', { slot: 'neck' }),
  I('c8', 'กระเป๋าเป้จิ๋ว', 260, 'pet_cosmetic', '🎒', { slot: 'back' }),
  // avatar wardrobe
  I('a1', 'เสื้อครอปขาว', 220, 'wardrobe', '👚', { slot: 'top' }), I('a2', 'คาร์ดิแกนลาเวนเดอร์', 380, 'wardrobe', '🧥', { slot: 'top' }),
  I('a3', 'เสื้อยืดมิ้นต์', 180, 'wardrobe', '👕', { slot: 'top' }), I('a4', 'เดรสซากุระ', 690, 'wardrobe', '👗', { slot: 'top', rarity: 'Epic' }),
  I('b1', 'กางเกงยีนส์ขาสั้น', 200, 'wardrobe', '🩳', { slot: 'bottom' }), I('b2', 'กระโปรงพลีท', 260, 'wardrobe', '👗', { slot: 'bottom' }),
  I('b3', 'กางเกงขายาวครีม', 240, 'wardrobe', '👖', { slot: 'bottom' }),
  I('h1', 'ผมยาวลอนน้ำตาล', 300, 'wardrobe', '💇‍♀️', { slot: 'hair' }), I('h2', 'ผมม่วงพาสเทล', 450, 'wardrobe', '💜', { slot: 'hair' }),
  I('h3', 'ผมชมพูซากุระ', 450, 'wardrobe', '🌸', { slot: 'hair' }), I('h4', 'ผมบ็อบดำ', 250, 'wardrobe', '🖤', { slot: 'hair' }),
  I('s1', 'สนีกเกอร์ขาว', 280, 'wardrobe', '👟', { slot: 'shoes' }), I('s2', 'บูทหนังครีม', 420, 'wardrobe', '👢', { slot: 'shoes' }),
  I('s3', 'ส้นสูงคริสตัล', 520, 'wardrobe', '👠', { slot: 'shoes' }),
  I('x1', 'กระเป๋าสะพาย', 350, 'wardrobe', '👜', { slot: 'acc' }), I('x2', 'สร้อยดาว', 300, 'wardrobe', '📿', { slot: 'acc' }),
  I('x3', 'หมวกเบเร่ต์พีช', 80, 'wardrobe', '🧢', { slot: 'acc' }), I('x4', 'กิ๊บดอกไม้', 90, 'wardrobe', '🌼', { slot: 'acc' }),
  I('z1', 'ออร่าลาเวนเดอร์', 500, 'wardrobe', '💜', { slot: 'aura', rarity: 'Rare' }), I('z2', 'ออร่าซากุระ', 650, 'wardrobe', '🌸', { slot: 'aura', rarity: 'Rare' }),
  I('z3', 'ออร่าดวงดาว', 1200, 'wardrobe', '✨', { slot: 'aura', rarity: 'Epic' }),
  I('k1', 'เป้หมีน้อย', 320, 'wardrobe', '🧸', { slot: 'backpack' }), I('k2', 'เป้ปีกนางฟ้า', 780, 'wardrobe', '🪽', { slot: 'backpack', rarity: 'Epic' }),
  I('k3', 'เป้มังกรมิ้นต์', 540, 'wardrobe', '🐉', { slot: 'backpack', rarity: 'Rare' }),
]
export const ITEM = new Map(CATALOG.map((i) => [i.id, i]))
export const AVATAR_SLOTS: AvatarSlot[] = ['hair', 'top', 'bottom', 'shoes', 'acc', 'aura', 'backpack']
export const PET_SLOTS: PetSlot[] = ['head', 'face', 'neck', 'back']
export const OPTIONAL_SLOTS: AvatarSlot[] = ['acc', 'aura', 'backpack']
export const SALE = new Set(['a4', 'h3'])
export const priceOf = (it: CatalogItem) => (SALE.has(it.id) ? Math.round(it.price * 0.8) : it.price)

export const FOOD_FX: Record<string, { hunger: number; mood: number }> = {
  f1: { hunger: 15, mood: 2 }, f2: { hunger: 20, mood: 5 }, f3: { hunger: 25, mood: 3 }, f4: { hunger: 30, mood: 4 }, f5: { hunger: 20, mood: 20 }, f6: { hunger: 100, mood: 100 },
}
export const EGG_DUR: Record<string, number> = { Common: 20_000, Rare: 35_000, Epic: 50_000, Legendary: 75_000 }
export const EGG_HUE: Record<string, string> = { e1: '#F5A9C5', e2: '#9FD3F5', e3: '#9B7EBD', e4: '#A8E6CF' }
export const HATCH_POOL: Record<string, { kind: string; palette: string; names: string[] }[]> = {
  Common: [{ kind: 'มังกรมิ้นต์', palette: 'sora', names: ['Sora', 'Minty', 'Leaf'] }],
  Rare: [{ kind: 'มังกรซากุระ', palette: 'mochi', names: ['Mochi', 'Sakura', 'Peachy'] }, { kind: 'มังกรมิ้นต์', palette: 'sora', names: ['Aqua', 'Breeze'] }],
  Epic: [{ kind: 'มังกรเมฆ', palette: 'lumi', names: ['Cloudy', 'Lulu', 'Puff'] }],
  Legendary: [{ kind: 'มังกรดวงดาว', palette: 'nova', names: ['Nova', 'Stella', 'Cosmo'] }],
}
export const LOOT = [
  { key: 'nova', name: 'มังกรดวงดาว Nova', emoji: '🐉', rarity: 'Legendary', palette: 'nova', w: 2 },
  { key: 'c5', name: 'ปีกนางฟ้า', emoji: '🪽', rarity: 'Epic', w: 13 },
  { key: 'c1', name: 'มงกุฎดาว', emoji: '👑', rarity: 'Rare', w: 17 },
  { key: 'f6', name: 'แอปเปิลทอง x3', emoji: '🍎', rarity: 'Rare', w: 18 },
  { key: 'f5', name: 'โดนัทสายรุ้ง x2', emoji: '🍩', rarity: 'Common', w: 25 },
  { key: 'pts', name: '200 Hello Points', emoji: '🪙', rarity: 'Common', w: 25 },
]
export const TOPUP = [
  { thb: 20, points: 2000 }, { thb: 50, points: 5200 }, { thb: 100, points: 11000 }, { thb: 200, points: 22100 }, { thb: 300, points: 34000 },
]
export const MISSIONS = [
  { id: 'walk', key: 'steps', n: 5000, r: 100, t: 'เดินครบ 5,000 ก้าว' },
  { id: 'feed', key: 'feedOthers', n: 3, r: 30, t: 'ให้อาหารสัตว์เลี้ยงเพื่อน 3 ครั้ง' },
  { id: 'battle', key: 'battleWins', n: 1, r: 50, t: 'ชนะ Pet Battle 1 ครั้ง' },
  { id: 'puzzle', key: 'puzzlePlays', n: 2, r: 20, t: 'เล่น Puzzle ชนะ 2 รอบ' },
  { id: 'runner', key: 'runnerPlays', n: 1, r: 20, t: 'เล่น Runner 1 รอบ' },
  { id: 'adv', key: 'advPlays', n: 1, r: 20, t: 'ออกผจญภัย 1 รอบ' },
] as const
