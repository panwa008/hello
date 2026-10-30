import type { Person, Post, ShopItem, MarketItem } from './types'

export const ME = {
  id: 'me',
  name: 'Mayy',
  handle: '@mayy.bright',
  bio: 'Love pets 🐾 | Traveling ✈️ | Coffee addict ☕',
  points: 7853,
  friends: 1200,
  followers: 8700,
  posts: 126,
  level: 28,
}

const P = (p: Partial<Person> & Pick<Person, 'id' | 'name' | 'status' | 'distance' | 'angle'>): Person => ({
  handle: '@' + p.name.toLowerCase().replace(/\s/g, ''),
  skin: '#FBDCC8',
  hair: '#5B3B2E',
  bg: ['#EDE3FB', '#FBE3EE'],
  bio: 'ชอบเดินเล่น ถ่ายรูป และสัตว์เลี้ยงน่ารัก ๆ',
  mood: 'กำลังเดินเล่น 🚶‍♀️',
  gender: 'f',
  mutual: 3,
  level: 12,
  ...p,
})

export const PEOPLE: Person[] = [
  P({ id: 'u1', name: 'Luna', status: 'open', distance: 60, angle: 20, hair: '#8E6CCB', bg: ['#E6DBFA', '#D5C4F3'], petEmoji: '🐉', petName: 'Lumi', mood: 'หาเพื่อนเดินสวน 🌸', level: 31, mutual: 8 }),
  P({ id: 'u2', name: 'Kaito', status: 'single', distance: 95, angle: 110, hair: '#2A2A3A', gender: 'm', bg: ['#DDF0FC', '#E7F5FF'], petEmoji: '🦊', petName: 'Kon', mood: 'ฟังเพลงที่คาเฟ่ ☕', level: 18 }),
  P({ id: 'u3', name: 'Ploy', status: 'taken', distance: 140, angle: 200, hair: '#C0745B', bg: ['#FDE4EF', '#FFF0F6'], petEmoji: '🐰', petName: 'Mochi', level: 22 }),
  P({ id: 'u4', name: 'Nong Fah', status: 'open', distance: 170, angle: 290, hair: '#1F1B2E', bg: ['#DDF7E9', '#F0FFF7'], petEmoji: '🐱', petName: 'Tofu', mood: 'ให้อาหารสัตว์อยู่ 🍡' }),
  P({ id: 'u5', name: 'Mint', status: 'family', distance: 120, angle: 330, hair: '#6B4A3A', bg: ['#DFE5FB', '#EEF1FF'], petEmoji: '🐶', petName: 'Pudding' }),
  P({ id: 'u6', name: 'Arthit', status: 'single', distance: 260, angle: 50, hair: '#2B2420', gender: 'm', bg: ['#DDF0FC', '#E8F7FF'], petEmoji: '🦄' }),
  P({ id: 'u7', name: 'Bam', status: 'heartbroken', distance: 330, angle: 150, hair: '#D9A066', bg: ['#FDE1E5', '#FFF0F2'], mood: 'ขออยู่เงียบ ๆ 🌧️' }),
  P({ id: 'u8', name: 'Nina', status: 'taken', distance: 410, angle: 240, hair: '#A0522D', bg: ['#FDE4EF', '#FFF0F6'], petEmoji: '🐼' }),
  P({ id: 'u9', name: 'Tan', status: 'hidden', distance: 300, angle: 260, hair: '#333', gender: 'm', bg: ['#EEE3FA', '#F6F0FF'] }),
  P({ id: 'u10', name: 'Pim', status: 'open', distance: 450, angle: 340, hair: '#E5B7A0', bg: ['#DDF7E9', '#F0FFF7'], petEmoji: '🐣' }),
  P({ id: 'u11', name: 'Jay', status: 'family', distance: 380, angle: 90, hair: '#3B2F2F', gender: 'm', bg: ['#DFE5FB', '#EEF1FF'] }),
  P({ id: 'u12', name: 'Fern', status: 'single', distance: 620, angle: 10, hair: '#6B3E2E', bg: ['#DDF0FC', '#fff'] }),
  P({ id: 'u13', name: 'Beam', status: 'open', distance: 700, angle: 70, hair: '#222', gender: 'm', bg: ['#DDF7E9', '#fff'] }),
  P({ id: 'u14', name: 'Ice', status: 'taken', distance: 680, angle: 135, hair: '#A66', bg: ['#FDE4EF', '#fff'] }),
  P({ id: 'u15', name: 'View', status: 'family', distance: 760, angle: 185, hair: '#432', bg: ['#DFE5FB', '#fff'] }),
  P({ id: 'u16', name: 'Oat', status: 'hidden', distance: 650, angle: 225, hair: '#111', gender: 'm', bg: ['#EEE3FA', '#fff'] }),
  P({ id: 'u17', name: 'Praew', status: 'heartbroken', distance: 720, angle: 280, hair: '#B5651D', bg: ['#FDE1E5', '#fff'] }),
  P({ id: 'u18', name: 'Kwan', status: 'single', distance: 640, angle: 315, hair: '#5A3A2A', bg: ['#DDF0FC', '#fff'] }),
  P({ id: 'u19', name: 'Toey', status: 'open', distance: 590, angle: 250, hair: '#7A4A3A', bg: ['#DDF7E9', '#fff'] }),
  P({ id: 'u20', name: 'Nat', status: 'family', distance: 610, angle: 160, hair: '#2a2a2a', gender: 'm', bg: ['#DFE5FB', '#fff'] }),
]

/** Extra people known from the server (real users, anonymised radar dots). */
const REGISTRY = new Map<string, Person>()
export const registerPeople = (list: Person[]) => { for (const p of list) REGISTRY.set(p.id, p) }
export const byId = (id: string): Person =>
  REGISTRY.get(id) ?? PEOPLE.find((p) => p.id === id) ?? { id, name: 'ผู้ใช้ Hello', handle: '@user', status: 'open', distance: 0, angle: 0, skin: '#FCE0CF', hair: '#4A3A35', bg: ['#EEE8FA', '#fff'], bio: '', mood: '', gender: 'f', mutual: 0, level: 1 }

export const STORIES = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u8', 'u10']

export const POSTS: Post[] = [
  { id: 'p1', authorId: 'u1', time: '5 นาทีที่แล้ว', place: 'สวนเบญจกิติ', text: 'เดินเล่นที่สวนแล้วเจอออร่าสีม่วงเต็มทุ่งเลย 💜 น้อง Lumi ชอบมาก บินวนไม่ยอมกลับบ้าน ✨', tags: ['#HelloWalk', '#PetLife'], scene: 'lavender', likes: 128, comments: [{ by: 'u3', text: 'น่ารักมากกก 😍' }, { by: 'u4', text: 'อยากไปบ้างงง' }] },
  { id: 'p2', authorId: 'u2', time: '22 นาทีที่แล้ว', place: 'Café Amarin', text: 'พระอาทิตย์ตกวันนี้สวยมากกก 🌅 ใครอยู่แถวนี้มาเดินเก็บก้าวด้วยกันได้นะ', tags: ['#Sunset', '#Bangkok'], scene: 'sunset', likes: 96, comments: [{ by: 'u1', text: 'ไปด้วยยย 🙋‍♀️' }] },
  { id: 'p3', authorId: 'u4', time: '1 ชม.ที่แล้ว', place: 'ริมแม่น้ำเจ้าพระยา', text: 'วันนี้ฟักไข่ได้น้องใหม่ระดับ Rare! 🥚➡️🐉 ใครอยู่ใกล้ ๆ มาให้อาหารน้องได้นะ', tags: ['#EggHatch', '#Rare'], scene: 'night', likes: 342, comments: [{ by: 'u5', text: 'ยินดีด้วยค่าาา 🎉' }, { by: 'u2', text: 'Rare เลยหรอ เก่งมาก' }] },
  { id: 'p4', authorId: 'u3', time: '3 ชม.ที่แล้ว', place: 'Siam Square', text: 'แต่งตัวใหม่ให้อวตาร ชุดคอลเลกชัน Sakura Dream 🌸 ใส่แล้วรู้สึกตัวเบาเหมือนลอยได้', tags: ['#OOTD', '#AvatarStyle'], scene: 'city', likes: 210, comments: [] },
  { id: 'p5', authorId: 'u5', time: 'เมื่อวาน', place: 'บางแสน', text: 'พาครอบครัวกับน้อง Pudding มาทะเล 🌊 เดินไป 12,000 ก้าว ได้ 120 พอยท์!', tags: ['#Family', '#Steps'], scene: 'beach', likes: 77, comments: [{ by: 'u1', text: 'สุดยอดดด' }] },
]

export const FRIEND_IDS = ['u1', 'u2', 'u3', 'u4', 'u5', 'u8', 'u10', 'u11']
export const REQUEST_IDS = ['u6', 'u12', 'u13']
export const SUGGEST_IDS = ['u14', 'u15', 'u18', 'u19']

// ===== Pet shop (in-app only) =====
export const PET_SHOP: Record<string, ShopItem[]> = {
  eggs: [
    { id: 'e1', name: 'ไข่ทุ่งดอกไม้', price: 300, emoji: '🥚', tint: ['#FDE4EF', '#FFF5F9'], rarity: 'common', desc: 'โอกาสได้สัตว์ธาตุดิน/ดอกไม้' },
    { id: 'e2', name: 'ไข่ทะเลดาว', price: 650, emoji: '🥚', tint: ['#DDF0FC', '#F2FAFF'], rarity: 'rare', desc: 'สัตว์ทะเลลึกเรืองแสง' },
    { id: 'e3', name: 'ไข่เทพนิยาย', price: 1200, emoji: '🥚', tint: ['#EEE3FA', '#F8F3FF'], rarity: 'epic', desc: 'มังกร ยูนิคอร์น กิเลน' },
    { id: 'e4', name: 'ไข่ต่างดาว', price: 1800, emoji: '🥚', tint: ['#DDF7E9', '#F2FFF8'], rarity: 'epic', desc: 'สิ่งมีชีวิตจากกาแล็กซีอื่น' },
  ],
  food: [
    { id: 'f1', name: 'คุกกี้ดาว', price: 20, emoji: '🍪', tint: ['#FFE9D6', '#FFF6EE'], desc: '+15 อิ่ม' },
    { id: 'f2', name: 'เบอร์รี่วิเศษ', price: 35, emoji: '🍓', tint: ['#FDE1E5', '#FFF2F4'], desc: '+20 อิ่ม +5 อารมณ์' },
    { id: 'f3', name: 'นมเมฆ', price: 40, emoji: '🥛', tint: ['#EEF1FF', '#fff'], desc: '+25 อิ่ม' },
    { id: 'f4', name: 'ปลาแซลมอน', price: 50, emoji: '🐟', tint: ['#DDF0FC', '#F2FAFF'], desc: '+30 อิ่ม' },
    { id: 'f5', name: 'โดนัทสายรุ้ง', price: 80, emoji: '🍩', tint: ['#F5E1FB', '#FFF5FF'], desc: '+20 อิ่ม +20 อารมณ์' },
    { id: 'f6', name: 'แอปเปิลทอง', price: 150, emoji: '🍎', tint: ['#FFF3C4', '#FFFBEA'], desc: 'เต็มหลอดทันที' },
  ],
  cosmetics: [
    { id: 'c1', name: 'มงกุฎดาว', price: 400, emoji: '👑', tint: ['#FFF3C4', '#FFFBEA'], rarity: 'rare' },
    { id: 'c2', name: 'โบว์ชมพู', price: 120, emoji: '🎀', tint: ['#FDE4EF', '#FFF5F9'] },
    { id: 'c3', name: 'แว่นหัวใจ', price: 180, emoji: '🕶️', tint: ['#EEE3FA', '#F8F3FF'] },
    { id: 'c4', name: 'ผ้าพันคอมิ้นต์', price: 150, emoji: '🧣', tint: ['#DDF7E9', '#F2FFF8'] },
    { id: 'c5', name: 'ปีกนางฟ้า', price: 900, emoji: '🪽', tint: ['#F6F2FC', '#fff'], rarity: 'epic' },
    { id: 'c6', name: 'หมวกพ่อมด', price: 350, emoji: '🎩', tint: ['#E6DBFA', '#F6F2FC'], rarity: 'rare' },
    { id: 'c7', name: 'ปลอกคอกระดิ่ง', price: 140, emoji: '🔔', tint: ['#FFF3C4', '#FFFBEA'], tag: 'ใหม่' },
    { id: 'c8', name: 'กระเป๋าเป้จิ๋ว', price: 260, emoji: '🎒', tint: ['#FFE0D6', '#FFF5F1'], tag: 'ใหม่' },
  ],
}

/** Where each pet cosmetic is worn (one item per slot, per pet). */
export const PET_SLOT: Record<string, 'head' | 'face' | 'neck' | 'back'> = { c1: 'head', c2: 'head', c6: 'head', c3: 'face', c4: 'neck', c7: 'neck', c5: 'back', c8: 'back' }
export const PET_SLOT_LABEL: Record<'head' | 'face' | 'neck' | 'back', string> = { head: 'หัว', face: 'หน้า', neck: 'คอ', back: 'หลัง / เป้' }

export const PET_POSES = [
  { id: 'pose1', name: 'นั่งยิ้ม', emoji: '😊' },
  { id: 'pose2', name: 'กางปีก', emoji: '🪽' },
  { id: 'pose3', name: 'เล่นลูกบอล', emoji: '⚽' },
  { id: 'pose4', name: 'นอนหลับ', emoji: '💤' },
  { id: 'pose5', name: 'เดินตาม', emoji: '🐾' },
]

// ===== Avatar shop =====
export const AVATAR_SHOP: Record<string, ShopItem[]> = {
  tops: [
    { id: 'a1', name: 'เสื้อครอปขาว', price: 220, emoji: '👚', tint: ['#F6F2FC', '#fff'] },
    { id: 'a2', name: 'คาร์ดิแกนลาเวนเดอร์', price: 380, emoji: '🧥', tint: ['#E6DBFA', '#F6F2FC'], tag: 'ใหม่' },
    { id: 'a3', name: 'เสื้อยืดมิ้นต์', price: 180, emoji: '👕', tint: ['#DDF7E9', '#F2FFF8'] },
    { id: 'a4', name: 'เดรสซากุระ', price: 690, emoji: '👗', tint: ['#FDE4EF', '#FFF5F9'], rarity: 'epic', tag: 'ลิมิเต็ด' },
  ],
  bottoms: [
    { id: 'b1', name: 'กางเกงยีนส์ขาสั้น', price: 200, emoji: '🩳', tint: ['#DDF0FC', '#F2FAFF'] },
    { id: 'b2', name: 'กระโปรงพลีท', price: 260, emoji: '👗', tint: ['#FDE4EF', '#FFF5F9'] },
    { id: 'b3', name: 'กางเกงขายาวครีม', price: 240, emoji: '👖', tint: ['#FFF3E4', '#FFFBF5'] },
  ],
  hair: [
    { id: 'h1', name: 'ผมยาวลอนน้ำตาล', price: 300, emoji: '💇‍♀️', tint: ['#FFE9D6', '#FFF6EE'] },
    { id: 'h2', name: 'ผมม่วงพาสเทล', price: 450, emoji: '💜', tint: ['#E6DBFA', '#F6F2FC'], rarity: 'rare' },
    { id: 'h3', name: 'ผมชมพูซากุระ', price: 450, emoji: '🌸', tint: ['#FDE4EF', '#FFF5F9'], rarity: 'rare' },
    { id: 'h4', name: 'ผมบ็อบดำ', price: 250, emoji: '🖤', tint: ['#EEEEF3', '#fff'] },
  ],
  shoes: [
    { id: 's1', name: 'สนีกเกอร์ขาว', price: 280, emoji: '👟', tint: ['#F6F2FC', '#fff'] },
    { id: 's2', name: 'บูทหนังครีม', price: 420, emoji: '👢', tint: ['#FFF3E4', '#FFFBF5'] },
    { id: 's3', name: 'ส้นสูงคริสตัล', price: 520, emoji: '👠', tint: ['#FDE4EF', '#FFF5F9'], rarity: 'rare' },
  ],
  accessories: [
    { id: 'x1', name: 'กระเป๋าสะพาย', price: 350, emoji: '👜', tint: ['#FFE9D6', '#FFF6EE'] },
    { id: 'x2', name: 'สร้อยดาว', price: 300, emoji: '📿', tint: ['#FFF3C4', '#FFFBEA'] },
    { id: 'x3', name: 'หมวกเบเร่ต์พีช', price: 80, emoji: '🧢', tint: ['#FFE0D6', '#FFF5F1'] },
    { id: 'x4', name: 'กิ๊บดอกไม้', price: 90, emoji: '🌼', tint: ['#FFF3C4', '#FFFBEA'] },
  ],
  aura: [
    { id: 'z1', name: 'ออร่าลาเวนเดอร์', price: 500, emoji: '💜', tint: ['#E6DBFA', '#F6F2FC'], rarity: 'rare', tag: 'ใหม่' },
    { id: 'z2', name: 'ออร่าซากุระ', price: 650, emoji: '🌸', tint: ['#FDE4EF', '#FFF5F9'], rarity: 'rare' },
    { id: 'z3', name: 'ออร่าดวงดาว', price: 1200, emoji: '✨', tint: ['#FFF3C4', '#FFFBEA'], rarity: 'epic' },
  ],
  backpack: [
    { id: 'k1', name: 'เป้หมีน้อย', price: 320, emoji: '🧸', tint: ['#FFE9D6', '#FFF6EE'], tag: 'ใหม่' },
    { id: 'k2', name: 'เป้ปีกนางฟ้า', price: 780, emoji: '🪽', tint: ['#F6F2FC', '#fff'], rarity: 'epic' },
    { id: 'k3', name: 'เป้มังกรมิ้นต์', price: 540, emoji: '🐉', tint: ['#DDF7E9', '#F2FFF8'], rarity: 'rare' },
  ],
}

// ===== Real-world market =====
export const MARKET: MarketItem[] = [
  { id: 'm1', name: 'กระเป๋าหนังแท้ สีครีม', thb: 1250, points: 125000, emoji: '👜', tint: ['#FFE9D6', '#FFF6EE'], seller: 'Ploy', distance: '140 ม.', condition: 'มือสอง 95%', category: 'แฟชั่น' },
  { id: 'm2', name: 'กล้องฟิล์ม Retro 35mm', thb: 850, emoji: '📷', tint: ['#EEEEF3', '#FAFAFD'], seller: 'Kaito', distance: '95 ม.', condition: 'ใช้งานปกติ', category: 'อิเล็กทรอนิกส์' },
  { id: 'm3', name: 'กีตาร์โปร่ง 39"', thb: 3200, emoji: '🎸', tint: ['#FFE0D6', '#FFF5F1'], seller: 'Arthit', distance: '260 ม.', condition: 'มือสอง 90%', category: 'งานอดิเรก' },
  { id: 'm4', name: 'เก้าอี้โซฟาบีนแบ็ก', thb: 2100, emoji: '🛋️', tint: ['#DDF0FC', '#F2FAFF'], seller: 'Mint', distance: '120 ม.', condition: 'เหมือนใหม่', category: 'เฟอร์นิเจอร์' },
  { id: 'm5', name: 'นาฬิกาข้อมือวินเทจ', thb: 5600, emoji: '⌚', tint: ['#FFF3C4', '#FFFBEA'], seller: 'Jay', distance: '380 ม.', condition: 'มือสอง 92%', category: 'แฟชั่น' },
  { id: 'm6', name: 'ต้นไม้ฟอกอากาศ', thb: 650, points: 65000, emoji: '🪴', tint: ['#DDF7E9', '#F2FFF8'], seller: 'Pim', distance: '450 ม.', condition: 'ใหม่', category: 'บ้านและสวน' },
  { id: 'm7', name: 'หูฟังไร้สาย', thb: 1890, emoji: '🎧', tint: ['#EEE3FA', '#F8F3FF'], seller: 'Beam', distance: '700 ม.', condition: 'มือสอง 97%', category: 'อิเล็กทรอนิกส์' },
  { id: 'm8', name: 'จักรยานพับได้', thb: 4500, emoji: '🚲', tint: ['#DDF0FC', '#F2FAFF'], seller: 'Fern', distance: '620 ม.', condition: 'ใช้งานปกติ', category: 'กีฬา' },
  { id: 'm9', name: 'โคมไฟตั้งโต๊ะมินิมอล', thb: 490, points: 49000, emoji: '💡', tint: ['#FFF3C4', '#FFFBEA'], seller: 'Nina', distance: '410 ม.', condition: 'เหมือนใหม่', category: 'เฟอร์นิเจอร์' },
]

export const TOPUP = [
  { thb: 20, points: 2000 },
  { thb: 50, points: 5200, bonus: '+4%' },
  { thb: 100, points: 11000, bonus: '+10%' },
  { thb: 200, points: 22100, bonus: '+10.5%' },
  { thb: 300, points: 34000, bonus: '+13%', best: true },
]

export const GAMES = [
  { id: 'g1', name: 'Adventure', th: 'ผจญภัยตามหาไข่', level: 12, emoji: '🗺️', grad: ['#9FD3F5', '#A8E6CF'], art: '🏔️' },
  { id: 'g2', name: 'Pet Battle', th: 'ประลองสัตว์เลี้ยง', level: 8, emoji: '⚔️', grad: ['#C7B2EC', '#F5A9C5'], art: '🐉' },
  { id: 'g3', name: 'Runner', th: 'วิ่งเก็บดาว', level: 5, emoji: '🏃‍♀️', grad: ['#FFD3B5', '#F5A9C5'], art: '⭐' },
  { id: 'g4', name: 'Puzzle', th: 'จับคู่ขนมหวาน', level: 7, emoji: '🧩', grad: ['#A8E6CF', '#C7B2EC'], art: '🍬' },
]
