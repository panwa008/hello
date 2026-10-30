export type StatusKey = 'open' | 'single' | 'heartbroken' | 'taken' | 'family' | 'hidden'
export type PrivacyMode = 'public' | 'nearby' | 'friends' | 'ghost' | 'invisible'

export interface Person {
  id: string
  name: string
  handle: string
  status: StatusKey
  distance: number // meters
  angle: number // degrees on radar
  skin: string
  hair: string
  bg: [string, string]
  bio: string
  mood: string
  petEmoji?: string
  petName?: string
  gender: 'f' | 'm'
  mutual: number
  level: number
  /** online radar: clear ≤200 m, blur 200–500 m, dot >500 m (anonymous) */
  visibility?: 'clear' | 'blur' | 'dot'
  friend?: boolean
}

export interface Post {
  id: string
  authorId: string
  time: string
  place: string
  text: string
  tags: string[]
  scene: 'sunset' | 'lavender' | 'city' | 'beach' | 'cafe' | 'night'
  likes: number
  comments: { by: string; text: string }[]
}

export interface ShopItem {
  id: string
  name: string
  price: number
  emoji: string
  tint: [string, string]
  tag?: string
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  desc?: string
}

export interface MarketItem {
  id: string
  name: string
  thb: number
  points?: number
  emoji: string
  tint: [string, string]
  seller: string
  distance: string
  condition: string
  category: string
  sellerId?: string
  status?: string
}
