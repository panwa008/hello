import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { MarketItem, Person, PrivacyMode, StatusKey } from '../data/types'
import { FRIEND_IDS, MARKET, PEOPLE, POSTS, REQUEST_IDS, byId, registerPeople } from '../data/mock'
import { hashPass, inStepWindow, load, save, today, uid } from '../lib/storage'
import { ONLINE, ApiFail, api, getTokens, setOnAuthLost, setTokens } from '../lib/api'
import { bearingTo, destination, haversine, MOCK_HOME, toScreen } from '../lib/geo'
import { connectRealtime } from '../lib/realtime'
import { pedometerSupported, requestMotionPermission, startPedometer } from '../lib/pedometer'

/** Server feature flags (from /api/health). Offline/demo build: everything allowed. */
export interface Features { env: 'production' | 'development'; demoBots: boolean; demoTopup: boolean; simSteps: boolean; manualSteps: boolean; truemoney: 'sandbox' | 'live'; promptpay: boolean }
const DEV_FEATURES: Features = { env: 'development', demoBots: true, demoTopup: true, simSteps: true, manualSteps: true, truemoney: 'sandbox', promptpay: false }

export type Screen =
  | 'home' | 'explorer' | 'friends' | 'chat' | 'pets' | 'petshop' | 'market'
  | 'avatar' | 'avatarshop' | 'game' | 'profile' | 'wallet' | 'more'
export const SCREEN_IDS: Screen[] = ['home', 'explorer', 'friends', 'chat', 'pets', 'petshop', 'market', 'avatar', 'avatarshop', 'game', 'profile', 'wallet', 'more']

export interface Outfit { hair: string; top: string; bottom: string; shoes: string; acc: string; aura?: string; backpack?: string }
export type PetSlot = 'head' | 'face' | 'neck' | 'back'
export interface User { id: string; email: string; name: string; handle: string; bio: string; gender: 'f' | 'm'; hair: string; skin: string; pass: string; createdAt: number; level: number }
export interface Comment { id: string; by: string; text: string; time: number; replies: Comment[] }
export type SceneKind = 'sunset' | 'lavender' | 'city' | 'beach' | 'cafe' | 'night'
export interface FeedPost { id: string; authorId: string; time: number; place: string; text: string; tags: string[]; scene: SceneKind; image?: string; feeling?: string; likes: number; comments: Comment[] }
export interface Msg { id: string; from: string; text: string; time: number; kind?: 'text' | 'wave' | 'hi' | 'feed' | 'market' }
export interface Notif { id: string; text: string; emoji: string; time: number; read: boolean; to?: Screen; chat?: string }
export interface PetData { id: string; name: string; kind: string; palette: string; rarity: string; level: number; xp: number; hunger: number; mood: number; energy: number; acc?: string; gear?: Partial<Record<PetSlot, string>> }
export interface EggData { id: string; hue: string; rarity: string; start: number; dur: number; source: string }
export interface Tx { id: string; t: string; v: number; time: number; thb?: number }
export interface Order { id: string; itemId: string; name: string; emoji: string; seller: string; method: 'points' | 'thb'; pay: string; amount: number; time: number; status: 'pending' | 'done'; meet: string }
export interface Story { id: string; by: string; scene: SceneKind; text: string; time: number; image?: string }
export interface Daily { date: string; feedOthers: number; battleWins: number; puzzlePlays: number; runnerPlays: number; advPlays: number; claimed: string[] }

export interface Data {
  points: number; steps: number; stepsDate: string; redeemed: number
  pets: PetData[]; activePet: string; pose: string; walking: boolean; lastDecay: number
  eggs: EggData[]; food: Record<string, number>; owned: string[]; outfit: Outfit
  friends: string[]; requests: string[]; sent: string[]; privacy: PrivacyMode; relationship: StatusKey
  posts: FeedPost[]; liked: string[]; saved: string[]; stories: Story[]; seen: string[]
  chats: Record<string, Msg[]>; unread: Record<string, number>; notifs: Notif[]
  tx: Tx[]; orders: Order[]; listings: MarketItem[]; sold: string[]; market: MarketItem[]
  daily: Daily; best: Record<string, number>
  settings: { notif: boolean; steps: boolean; petVisible: boolean; feedByOthers: boolean }
}

const MIN = 60_000, HOUR = 3_600_000
export const EGG_DUR: Record<string, number> = { Common: 20_000, Rare: 35_000, Epic: 50_000, Legendary: 75_000 }
export const HATCH_POOL: Record<string, { kind: string; palette: string; names: string[] }[]> = {
  Common: [{ kind: 'มังกรมิ้นต์', palette: 'sora', names: ['Sora', 'Minty', 'Leaf'] }],
  Rare: [{ kind: 'มังกรซากุระ', palette: 'mochi', names: ['Mochi', 'Sakura', 'Peachy'] }, { kind: 'มังกรมิ้นต์', palette: 'sora', names: ['Aqua', 'Breeze'] }],
  Epic: [{ kind: 'มังกรเมฆ', palette: 'lumi', names: ['Cloudy', 'Lulu', 'Puff'] }],
  Legendary: [{ kind: 'มังกรดวงดาว', palette: 'nova', names: ['Nova', 'Stella', 'Cosmo'] }],
}
const daily0 = (): Daily => ({ date: today(), feedOthers: 0, battleWins: 0, puzzlePlays: 0, runnerPlays: 0, advPlays: 0, claimed: [] })

function seed(): Data {
  const now = Date.now()
  const offs = [5 * MIN, 22 * MIN, HOUR, 3 * HOUR, 26 * HOUR]
  return {
    points: 11250, steps: 7853, stepsDate: today(), redeemed: 0,
    pets: [
      { id: 'pt1', name: 'Lumi', kind: 'มังกรเมฆ', palette: 'lumi', rarity: 'Epic', level: 12, xp: 64, hunger: 62, mood: 84, energy: 71 },
      { id: 'pt2', name: 'Mochi', kind: 'มังกรซากุระ', palette: 'mochi', rarity: 'Rare', level: 7, xp: 30, hunger: 80, mood: 70, energy: 90, gear: { head: 'c2' }, acc: 'c2' },
      { id: 'pt3', name: 'Sora', kind: 'มังกรมิ้นต์', palette: 'sora', rarity: 'Rare', level: 5, xp: 12, hunger: 55, mood: 66, energy: 60 },
    ],
    activePet: 'pt1', pose: 'pose1', walking: true, lastDecay: now,
    eggs: [
      { id: 'eg1', hue: '#F5A9C5', rarity: 'Rare', start: now - 30_000, dur: 35_000, source: 'พบที่สวนเบญจกิติ' },
      { id: 'eg2', hue: '#9B7EBD', rarity: 'Epic', start: now - 10_000, dur: 50_000, source: 'กล่องสุ่ม' },
      { id: 'eg3', hue: '#9FD3F5', rarity: 'Common', start: now - 60_000, dur: 20_000, source: 'พบริมแม่น้ำ' },
    ],
    food: { f1: 5, f2: 3, f4: 2, f5: 1 },
    owned: ['a1', 'b1', 'h1', 's1', 'x3', 'c2'],
    outfit: { hair: 'h1', top: 'a1', bottom: 'b1', shoes: 's1', acc: 'none', aura: 'none', backpack: 'none' },
    friends: FRIEND_IDS, requests: REQUEST_IDS, sent: [], privacy: 'nearby', relationship: 'open',
    posts: POSTS.map((p, i) => ({ ...p, time: now - offs[i], comments: p.comments.map((c, j) => ({ id: `c${i}${j}`, by: c.by, text: c.text, time: now - offs[i] + (j + 1) * MIN, replies: [] })) })),
    liked: ['p3'], saved: [], stories: [], seen: [],
    chats: {
      u1: [{ id: 'm1', from: 'u1', text: 'สวัสดีจ้า Lumi น่ารักมากเลย 💜', time: now - 40 * MIN }, { id: 'm2', from: 'me', text: 'ขอบคุณน้าา น้องฝากทักทาย 🐉', time: now - 38 * MIN }, { id: 'm3', from: 'u1', text: 'เย็นนี้ไปเดินสวนด้วยกันมั้ย 🌸', time: now - 6 * MIN }],
      u2: [{ id: 'm4', from: 'u2', text: 'คาเฟ่แถวนี้มีโปรเครื่องดื่มลด 20% นะ ☕', time: now - 2 * HOUR }],
      u4: [{ id: 'm5', from: 'me', text: 'ไข่ Rare ฟักเป็นตัวอะไรหรอ', time: now - 5 * HOUR }, { id: 'm6', from: 'u4', text: 'มังกรน้ำเงินเลย ✨ เดี๋ยวพาไปให้ดู', time: now - 4 * HOUR }],
    },
    unread: { u1: 1, u2: 1 },
    notifs: [
      { id: 'n1', text: 'Luna ส่งข้อความหาคุณ', emoji: '💬', time: now - 6 * MIN, read: false, to: 'chat', chat: 'u1' },
      { id: 'n2', text: 'Arthit ส่งคำขอเป็นเพื่อน', emoji: '🫶', time: now - 30 * MIN, read: false, to: 'friends' },
      { id: 'n3', text: 'มีไข่ลึกลับอยู่ใกล้คุณ 150 ม.', emoji: '🥚', time: now - 2 * HOUR, read: true, to: 'explorer' },
    ],
    tx: [
      { id: 't1', t: 'แลกก้าวเดิน 5,200 ก้าว', v: 52, time: now - 23 * HOUR },
      { id: 't2', t: 'ซื้อไข่เทพนิยาย', v: -1200, time: now - 26 * HOUR },
      { id: 't3', t: 'เติมเงิน TrueMoney ฿100', v: 11000, time: now - 72 * HOUR, thb: 100 },
    ],
    orders: [], listings: [], sold: [], market: MARKET,
    daily: daily0(), best: {},
    settings: { notif: true, steps: true, petVisible: true, feedByOthers: true },
  }
}

const REPLIES = ['ได้เลยยย 😆', 'จริงหรอ น่าสนใจมาก ✨', 'ฮ่า ๆ น่ารักอะ 💜', 'เดี๋ยวพาน้องไปเจอนะ 🐾', 'ตอนนี้อยู่แถวสวนเลย มาเดินด้วยกันมั้ย 🌸', 'ขอบคุณน้าา 🫶', 'โอเค แล้วเจอกัน 👋', 'วันนี้เดินไปกี่ก้าวแล้ว? 👣']
const MARKET_BACK = ['ยังอยู่ครับ/ค่ะ 😊 นัดรับได้เลย', 'ยังไม่มีคนจองนะ สนใจนัดดูของไหม?', 'ได้เลย ส่งรูปเพิ่มให้ทีหลังนะ 📸']
const WAVE_BACK = ['👋 หวัดดีจ้า!', 'โบกมือกลับ 👋😊', 'ไฮ~ ยินดีที่ได้รู้จักนะ ✨']

interface Toast { id: number; text: string; emoji?: string }
export interface Geo { lat: number; lng: number; accuracy: number | null; source: 'gps' | 'mock' | 'sim'; at: number }
export interface EggSpot { id: string; distance: number; angle: number; rarity: string; lat: number; lng: number }
/** Keys kept only on the device (synced as prefs); everything else is server truth when online. */
const LOCAL_KEYS = ['pose', 'notifs', 'seen', 'saved', 'settings', 'lastDecay'] as const
type ServerState = Partial<Data> & { user?: Omit<User, 'pass'>; people?: Person[]; prefs?: Partial<Data>; serverTime?: number }

function useStoreImpl() {
  const [accounts, setAccounts] = useState<User[]>(() => (ONLINE ? [] : load('hello.accounts', [] as User[])))
  const [session, setSession] = useState<string | null>(() => (ONLINE ? null : load('hello.session', null as string | null)))
  const [serverUser, setServerUser] = useState<User | null>(null)
  const user = ONLINE ? serverUser : accounts.find((a) => a.id === session) ?? null
  const [d, setD] = useState<Data | null>(() => (!ONLINE && session ? migrate(load<Data | null>('hello.data.' + session, null)) : null))
  const [booting, setBooting] = useState(ONLINE && !!getTokens())
  const parse = () => { const [s, arg] = location.hash.replace('#/', '').split('/'); return { s: (SCREEN_IDS.includes(s as Screen) ? s : 'home') as Screen, arg: arg ?? null } }
  const [screen, setScreen] = useState<Screen>(() => parse().s)
  const [chatWith, setChatWith] = useState<string | null>(() => parse().arg)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [typing, setTyping] = useState<Record<string, boolean>>({})
  const [walkSim, setWalkSimRaw] = useState(false)
  const [drift, setDrift] = useState(0)
  const [busy, setBusy] = useState(0)
  const screenRef = useRef(screen); screenRef.current = screen
  const chatRef = useRef(chatWith); chatRef.current = chatWith
  const dRef = useRef(d); dRef.current = d

  useEffect(() => { if (!ONLINE) save('hello.accounts', accounts) }, [accounts])
  useEffect(() => { if (!ONLINE) save('hello.session', session) }, [session])
  useEffect(() => { if (session && d) save('hello.data.' + session, d) }, [d, session])

  const up = useCallback((fn: (d: Data) => Data) => setD((cur) => (cur ? fn(cur) : cur)), [])

  const toast = useCallback((text: string, emoji?: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-2), { id, text, emoji }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])
  const notify = useCallback((n: Omit<Notif, 'id' | 'time' | 'read'>) => up((x) => ({ ...x, notifs: [{ ...n, id: uid('n'), time: Date.now(), read: false }, ...x.notifs].slice(0, 40) })), [up])

  const go = useCallback((s: Screen, arg?: string | null) => {
    setScreen(s)
    if (s === 'chat') setChatWith(arg ?? null)
    history.replaceState(null, '', '#/' + s + (s === 'chat' && arg ? '/' + arg : ''))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  useEffect(() => {
    const onHash = () => { const { s, arg } = parse(); setScreen(s); if (s === 'chat') setChatWith(arg) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // ================= ONLINE: server state sync =================
  const [features, setFeatures] = useState<Features>(DEV_FEATURES)
  useEffect(() => {
    if (!ONLINE) return
    api<{ features?: Features }>('/health', { auth: false }).then((h) => { if (h.features) setFeatures({ ...DEV_FEATURES, ...h.features }) }).catch(() => {})
  }, [])
  const [rtConnected, setRtConnected] = useState(false)
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [serverPeople, setServerPeople] = useState<Person[]>([])
  const clockSkew = useRef(0)
  const applyState = useCallback((s: ServerState) => {
    if (s.serverTime) clockSkew.current = s.serverTime - Date.now()
    if (s.user) setServerUser({ ...(s.user as User), pass: '' })
    if (s.people) { registerPeople(s.people); setServerPeople(s.people) }
    setD((cur) => {
      const { user: _u, people: _p, prefs, serverTime: _t, ...rest } = s
      const base = cur ?? migrate({ ...seed(), ...(prefs ?? {}) } as Data)!
      const next = { ...base, ...rest } as Data
      for (const k of LOCAL_KEYS) (next as unknown as Record<string, unknown>)[k] = (base as unknown as Record<string, unknown>)[k]
      // keep un-synced local steps (walk simulator) for the same day
      if (cur && cur.stepsDate === next.stepsDate && cur.steps > next.steps) next.steps = cur.steps
      if (cur) {
        // derive notifications from what changed on the server
        const notifs: Notif[] = []
        for (const [peer, n] of Object.entries(next.unread)) {
          if ((n ?? 0) > (cur.unread[peer] ?? 0)) {
            const viewing = screenRef.current === 'chat' && chatRef.current === peer
            const last = next.chats[peer]?.[next.chats[peer].length - 1]
            const p = byId(peer)
            if (!viewing && last && last.from !== 'me') {
              notifs.push({ id: uid('n'), text: `${p.name}: ${last.text}`, emoji: '💬', time: Date.now(), read: false, to: 'chat', chat: peer })
              if (base.settings.notif !== false) setTimeout(() => toast(`${p.name}: ${last.text}`, '💬'), 0)
            }
          }
        }
        for (const id of next.requests) if (!cur.requests.includes(id)) notifs.push({ id: uid('n'), text: `${byId(id).name} ส่งคำขอเป็นเพื่อน`, emoji: '🫶', time: Date.now(), read: false, to: 'friends' })
        for (const id of next.friends) if (!cur.friends.includes(id) && cur.sent.includes(id)) {
          notifs.push({ id: uid('n'), text: `${byId(id).name} ตอบรับคำขอเป็นเพื่อนแล้ว`, emoji: '🫶', time: Date.now(), read: false, to: 'friends' })
          setTimeout(() => toast(`${byId(id).name} ตอบรับเป็นเพื่อนแล้ว!`, '🫶'), 0)
        }
        if (notifs.length) next.notifs = [...notifs, ...base.notifs].slice(0, 40)
      }
      return next
    })
  }, [toast])

  const refreshState = useCallback(async () => {
    if (!ONLINE || !getTokens()) return
    try { const r = await api<{ state: ServerState }>('/me'); applyState(r.state) } catch { /* offline blip */ }
  }, [applyState])

  /** Run a server mutation; merges the returned state. Returns `result` (or true) on success, null on failure (toasted). */
  const act = useCallback(async <T = any,>(path: string, body?: unknown, method?: string, opts: { quiet?: boolean } = {}): Promise<T | null> => {
    setBusy((b) => b + 1)
    try {
      const r = await api<{ result?: T; state?: ServerState }>(path, { method: method ?? (body === undefined ? 'POST' : 'POST'), body: body ?? {} })
      if (r.state) applyState(r.state)
      return (r.result ?? (true as unknown as T))
    } catch (e) {
      const err = e as ApiFail
      if (!opts.quiet) toast(err.message, err.code === 'insufficient_points' ? '🥺' : '⚠️')
      if (err.status && err.status !== 401) refreshState()
      return null
    } finally { setBusy((b) => b - 1) }
  }, [applyState, refreshState, toast])

  const logoutRef = useRef<() => void>(() => {})
  useEffect(() => {
    if (!ONLINE) return
    setOnAuthLost(() => { logoutRef.current(); toast('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', '🔒') })
    if (getTokens()) api<{ state: ServerState }>('/me').then((r) => { applyState(r.state); setSession(r.state.user!.id) }).catch(() => setTokens(null)).finally(() => setBooting(false))
  }, [applyState, toast])

  // poll state while signed in (fallback for chat replies, friend accepts, pet decay) — slow when realtime is connected
  useEffect(() => {
    if (!ONLINE || !session) return
    const t = setInterval(() => { if (document.visibilityState === 'visible') refreshState() }, rtConnected ? 90_000 : 25_000)
    return () => clearInterval(t)
  }, [session, refreshState, rtConnected])

  // sync device prefs (pose, saved, settings, seen)
  const prefsKey = d ? JSON.stringify([d.pose, d.saved, d.seen.slice(-50), d.settings]) : ''
  useEffect(() => {
    if (!ONLINE || !session || !prefsKey) return
    const t = setTimeout(() => {
      const x = dRef.current; if (!x) return
      api('/me/prefs', { method: 'PUT', body: { pose: x.pose, saved: x.saved, seen: x.seen.slice(-50), settings: x.settings } }).catch(() => {})
    }, 1500)
    return () => clearTimeout(t)
  }, [prefsKey, session])

  // ---- daily rollover + pet decay (offline only; the server does this when online) ----
  useEffect(() => {
    if (!session || ONLINE) return
    const tick = () => up((x) => {
      let n = x
      if (x.stepsDate !== today()) n = { ...n, steps: 0, redeemed: 0, stepsDate: today(), daily: daily0() }
      const mins = Math.floor((Date.now() - x.lastDecay) / MIN)
      if (mins >= 1) {
        const k = Math.min(mins, 600)
        n = { ...n, lastDecay: Date.now(), pets: n.pets.map((p) => ({ ...p, hunger: Math.max(0, p.hunger - k * 0.5), mood: Math.max(0, p.mood - k * 0.25), energy: Math.min(100, p.energy + k * 0.4) })) }
      }
      return n
    })
    tick()
    const t = setInterval(tick, 30_000)
    return () => clearInterval(t)
  }, [session, up])

  // ================= GPS / location =================
  const [geo, setGeo] = useState<Geo | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoWanted, setGeoWanted] = useState(false)
  const [eggSpots, setEggSpots] = useState<EggSpot[]>([])
  const [nearbyPeople, setNearbyPeople] = useState<Person[] | null>(null)
  const geoRef = useRef(geo); geoRef.current = geo
  const lastPost = useRef<{ at: number; lat: number; lng: number } | null>(null)
  const realFix = useRef<Geo | null>(null)
  const walkRef = useRef(walkSim); walkRef.current = walkSim

  const startGeo = useCallback(() => setGeoWanted(true), [])
  const useMock = useCallback((why?: string) => {
    if (why) setGeoError(why)
    setGeo((g) => g ?? { lat: MOCK_HOME.lat, lng: MOCK_HOME.lng, accuracy: null, source: 'mock', at: Date.now() })
  }, [])
  useEffect(() => {
    if (!geoWanted || !session) return
    if (!('geolocation' in navigator)) { useMock('อุปกรณ์นี้ไม่รองรับ GPS — ใช้ตำแหน่งจำลอง'); return }
    if (!window.isSecureContext) { useMock('GPS ต้องใช้ HTTPS หรือ localhost — ใช้ตำแหน่งจำลอง'); return }
    const fallback = setTimeout(() => { if (!realFix.current) useMock('ยังหา GPS ไม่เจอ — ใช้ตำแหน่งจำลองไปก่อน') }, 8000)
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const g: Geo = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy), source: 'gps', at: Date.now() }
        realFix.current = g; setGeoError(null)
        if (!walkRef.current) setGeo(g)
      },
      (e) => useMock(e.code === 1 ? 'ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง — ใช้ตำแหน่งจำลอง (เปิดสิทธิ์ในเบราว์เซอร์ได้)' : 'อ่าน GPS ไม่ได้ — ใช้ตำแหน่งจำลอง'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20_000 },
    )
    return () => { clearTimeout(fallback); navigator.geolocation.clearWatch(id) }
  }, [geoWanted, session, useMock])

  // post location to the server (≥3 s apart, or moved ≥8 m)
  const loadNearby = useCallback(async () => {
    if (!ONLINE || !getTokens()) return
    try {
      const r = await api<{ located: boolean; people: Person[]; eggs: EggSpot[] }>('/explorer/nearby?radius=1000')
      const ppl = r.people.map((p) => ({ ...p, angle: toScreen(p.angle) }))
      registerPeople(ppl.filter((p) => p.visibility !== 'dot'))
      setNearbyPeople(r.located ? ppl : null)
      setEggSpots(r.eggs)
    } catch { /* ignore */ }
  }, [])
  useEffect(() => {
    if (!ONLINE || !geo || !session) return
    if (geo.source !== 'gps' && features.env === 'production') return // production: only real GPS fixes are shared
    const lp = lastPost.current
    const moved = lp ? haversine(lp.lat, lp.lng, geo.lat, geo.lng) : Infinity
    if (lp && Date.now() - lp.at < 3000 && moved < 8) return
    lastPost.current = { at: Date.now(), lat: geo.lat, lng: geo.lng }
    api<{ result: { eggs: EggSpot[] } }>('/explorer/location', { body: { lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy ?? undefined, source: geo.source === 'gps' ? 'gps' : 'mock' } })
      .then((r) => { if (r.result?.eggs) setEggSpots(r.result.eggs) })
      .catch((e: ApiFail) => { if (e.code === 'teleport') toast(e.message, '📍') })
  }, [geo, session, toast, features.env])
  // poll nearby while located (10 s; 30 s when realtime pushes "explorer:changed")
  useEffect(() => {
    if (!ONLINE || !session || !geo) return
    loadNearby()
    const t = setInterval(() => { if (document.visibilityState === 'visible') loadNearby() }, rtConnected ? 30_000 : 10_000)
    return () => clearInterval(t)
  }, [session, !!geo, loadNearby, rtConnected])

  // ---- realtime (Socket.io): presence + chat push + explorer hints ----
  const hasGeo = useRef(false); hasGeo.current = !!geo
  useEffect(() => {
    if (!ONLINE || !session) return
    let stateT: ReturnType<typeof setTimeout> | undefined, lastNearby = 0
    const soonState = () => { clearTimeout(stateT); stateT = setTimeout(refreshState, 250) }
    const off = connectRealtime({
      onStatus: setRtConnected,
      onChat: (m) => { setTyping((t) => (t[m.from] ? { ...t, [m.from]: false } : t)); soonState() },
      onState: soonState,
      onPresenceList: (ids) => setOnlineIds(new Set(ids)),
      onPresence: ({ userId, online }) => setOnlineIds((cur) => { const n = new Set(cur); if (online) n.add(userId); else n.delete(userId); return n }),
      onExplorer: () => { if (hasGeo.current && Date.now() - lastNearby > 2000) { lastNearby = Date.now(); loadNearby() } },
      onPayment: (p) => { soonState(); if (p.status === 'succeeded') toast(`ชำระเงินสำเร็จ +${p.points.toLocaleString()} P`, '💳'); else if (p.status === 'failed') toast('การชำระเงินไม่สำเร็จ', '⚠️') },
    })
    return () => { clearTimeout(stateT); off(); setRtConnected(false) }
  }, [session, refreshState, loadNearby, toast])
  // local live distance to egg spots between polls
  const liveEggs = useMemo(() => (geo ? eggSpots.map((e) => ({ ...e, distance: Math.round(haversine(geo.lat, geo.lng, e.lat, e.lng)), angle: toScreen(bearingTo(geo.lat, geo.lng, e.lat, e.lng)) })) : eggSpots.map((e) => ({ ...e, angle: toScreen(e.angle) }))), [geo, eggSpots])

  const setWalkSim = useCallback((on: boolean) => {
    if (on && !features.simSteps) { toast('ปิดการเดินจำลองในโหมดจริง ใช้ตัวนับก้าวของเครื่องแทน', '🚫'); return }
    setWalkSimRaw(on)
    if (on) { setGeoWanted(true); setGeo((g) => (g ? { ...g, source: 'sim', at: Date.now() } : { lat: MOCK_HOME.lat, lng: MOCK_HOME.lng, accuracy: null, source: 'sim', at: Date.now() })) }
    else if (realFix.current) setGeo(realFix.current)
    else setGeo((g) => (g ? { ...g, source: 'mock' } : g))
  }, [features.simSteps, toast])

  // ---- simulated walk: steps + people drift + (online) a GPS path toward the nearest egg ----
  const eggsRef = useRef(liveEggs); eggsRef.current = liveEggs
  useEffect(() => {
    if (!walkSim) return
    const t = setInterval(() => {
      setDrift((v) => v + 1)
      if (inStepWindow()) up((x) => (x.settings.steps ? { ...x, steps: x.steps + 14 + Math.floor(Math.random() * 10) } : x))
      setGeo((g) => {
        if (!g) return g
        const target = [...eggsRef.current].sort((a, b) => a.distance - b.distance)[0]
        const brg = target && target.distance > 40 ? bearingTo(g.lat, g.lng, target.lat, target.lng) : ((Date.now() / 1000) * 7) % 360
        const p = destination(g.lat, g.lng, 12, brg)
        return { ...g, ...p, source: 'sim', at: Date.now() }
      })
    }, 1000)
    return () => clearInterval(t)
  }, [walkSim, up])

  // ---- steps → server (online) ----
  const syncedSteps = useRef(0)
  const syncSteps = useCallback(async (source: 'sim' | 'manual' | 'device' = 'sim') => {
    const x = dRef.current
    if (!ONLINE || !x || x.steps === syncedSteps.current) return
    try {
      const r = await api<{ state: ServerState }>('/wallet/steps', { body: { steps: x.steps, source } })
      syncedSteps.current = x.steps; applyState(r.state)
    } catch (e) {
      toast((e as ApiFail).message, '👣')
      // server value wins on rejection
      const r = await api<{ state: ServerState }>('/me').catch(() => null)
      if (r) { syncedSteps.current = r.state.steps ?? 0; setD((cur) => (cur ? { ...cur, steps: r.state.steps ?? cur.steps } : cur)); applyState(r.state) }
    }
  }, [applyState, toast])
  useEffect(() => {
    if (!ONLINE || !walkSim) return
    const t = setInterval(() => syncSteps('sim'), 5000)
    return () => { clearInterval(t); syncSteps('sim') }
  }, [walkSim, syncSteps])

  // ---- device pedometer (DeviceMotion) → server as source "device" ----
  const [pedometer, setPedometer] = useState(false)
  useEffect(() => {
    if (!pedometer) return
    const stop = startPedometer((n) => { if (inStepWindow()) up((x) => (x.settings.steps ? { ...x, steps: x.steps + n } : x)) })
    const t = ONLINE ? setInterval(() => syncSteps('device'), 15_000) : undefined
    return () => { stop(); if (t) clearInterval(t); if (ONLINE) syncSteps('device') }
  }, [pedometer, up, syncSteps])
  const togglePedometer = useCallback(async () => {
    if (pedometer) { setPedometer(false); return }
    if (!pedometerSupported()) { toast('อุปกรณ์/เบราว์เซอร์นี้นับก้าวไม่ได้ (ต้องเป็นมือถือ + HTTPS)', '📵'); return }
    if (!(await requestMotionPermission())) { toast('ไม่ได้รับอนุญาตให้ใช้เซ็นเซอร์การเคลื่อนไหว', '🔒'); return }
    setPedometer(true); toast('เริ่มนับก้าวจากเซ็นเซอร์ของเครื่องแล้ว — พกมือถือติดตัวไว้นะ', '👣')
  }, [pedometer, toast])

  const offlinePeople: Person[] = useMemo(() => PEOPLE.map((p, i) => drift === 0 ? p : ({
    ...p,
    distance: Math.max(25, Math.round(p.distance + Math.sin(drift / 6 + i) * 45 * (i % 3 === 0 ? 1.4 : 1))),
    angle: (p.angle + drift * (i % 2 ? 0.6 : -0.4)) % 360,
  })), [drift])
  const people: Person[] = ONLINE ? nearbyPeople ?? serverPeople.filter((p) => p.distance > 0) : offlinePeople
  const person = useCallback((id: string) => people.find((p) => p.id === id) ?? byId(id), [people])

  // ================= auth =================
  const startSession = (u: User, fresh: boolean) => {
    const existing = load<Data | null>('hello.data.' + u.id, null)
    setD(fresh || !existing ? seed() : migrate(existing))
    setSession(u.id)
    go('home')
  }
  const onlineAuth = async (path: string, body: unknown, welcome: (n: string) => string) => {
    try {
      const r = await api<{ result: { tokens: { accessToken: string; refreshToken: string } }; state: ServerState }>(path, { body, auth: false })
      setTokens(r.result.tokens)
      setD(null); applyState(r.state); setSession(r.state.user!.id); go('home')
      setTimeout(() => toast(welcome(r.state.user!.name), '💜'), 300)
      return null
    } catch (e) { return (e as Error).message }
  }
  const register = async (f: { name: string; email: string; pass: string; gender: 'f' | 'm' }): Promise<string | null> => {
    const email = f.email.trim().toLowerCase()
    if (!f.name.trim()) return 'กรุณาใส่ชื่อที่แสดง'
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'อีเมลไม่ถูกต้อง'
    const minPass = features.env === 'production' ? 8 : 6
    if (f.pass.length < minPass) return `รหัสผ่านอย่างน้อย ${minPass} ตัวอักษร`
    if (ONLINE) return onlineAuth('/auth/register', { name: f.name.trim(), email, password: f.pass, gender: f.gender }, (n) => `ยินดีต้อนรับ ${n}! รับโบนัสสมาชิกใหม่ 🎁`)
    if (accounts.some((a) => a.email === email)) return 'อีเมลนี้มีบัญชีแล้ว ลองเข้าสู่ระบบ'
    const id = uid('usr')
    const u: User = { id, email, name: f.name.trim(), handle: '@' + f.name.trim().toLowerCase().replace(/\s+/g, '.'), bio: 'สวัสดี! เพิ่งมาใหม่ใน Hello 👋', gender: f.gender, hair: f.gender === 'f' ? '#7A4A35' : '#2A2433', skin: '#FCE0CF', pass: hashPass(f.pass, id), createdAt: Date.now(), level: 1 }
    setAccounts((a) => [...a, u])
    startSession(u, true)
    setTimeout(() => toast(`ยินดีต้อนรับ ${u.name}! รับโบนัสสมาชิกใหม่`, '🎁'), 300)
    return null
  }
  const login = async (email: string, pass: string): Promise<string | null> => {
    if (ONLINE) return onlineAuth('/auth/login', { email: email.trim().toLowerCase(), password: pass }, (n) => `ยินดีต้อนรับกลับ ${n}`)
    const u = accounts.find((a) => a.email === email.trim().toLowerCase())
    if (!u || u.pass !== hashPass(pass, u.id)) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
    startSession(u, false)
    setTimeout(() => toast(`ยินดีต้อนรับกลับ ${u.name}`, '💜'), 300)
    return null
  }
  const demoLogin = async (): Promise<string | null> => {
    if (ONLINE) {
      if (features.env === 'production') return 'บัญชีเดโมปิดในโหมดจริง / demo login is disabled in production'
      return login('mayy@hello.app', 'hello123')
    }
    let u = accounts.find((a) => a.email === 'mayy@hello.app')
    if (!u) {
      u = { id: 'usr-demo', email: 'mayy@hello.app', name: 'Mayy', handle: '@mayy.bright', bio: 'Love pets 🐾 | Traveling ✈️ | Coffee addict ☕', gender: 'f', hair: '#7A4A35', skin: '#FCE0CF', pass: hashPass('hello123', 'usr-demo'), createdAt: Date.now(), level: 28 }
      const nu = u
      setAccounts((a) => [...a, nu])
    }
    startSession(u, false)
    return null
  }
  const logout = () => {
    if (ONLINE) { const t = getTokens(); if (t) api('/auth/logout', { body: { refreshToken: t.refreshToken }, auth: false }).catch(() => {}); setTokens(null); setServerUser(null); setNearbyPeople(null); setEggSpots([]) }
    setSession(null); setD(null); setWalkSimRaw(false); setGeoWanted(false); setGeo(null); realFix.current = null; lastPost.current = null
    history.replaceState(null, '', '#/home'); setScreen('home')
  }
  logoutRef.current = logout
  const resetData = () => { if (ONLINE) { toast('โหมดออนไลน์: ข้อมูลอยู่บนเซิร์ฟเวอร์ (ใช้ npm run seed เพื่อรีเซ็ต)', 'ℹ️'); return } setWalkSimRaw(false); setD(seed()) }
  const updateProfile = async (patch: Partial<Pick<User, 'name' | 'handle' | 'bio' | 'gender' | 'hair' | 'skin'>>): Promise<string | null> => {
    if (!user) return 'กรุณาเข้าสู่ระบบ'
    if (patch.name !== undefined && !patch.name.trim()) return 'ชื่อห้ามว่าง'
    if (patch.handle !== undefined && !/^@[\w.]{2,24}$/.test(patch.handle)) return 'ชื่อผู้ใช้ต้องขึ้นต้นด้วย @ และใช้ a-z 0-9 . _'
    if (ONLINE) {
      try { const r = await api<{ state: ServerState }>('/me', { method: 'PATCH', body: patch }); applyState(r.state); return null } catch (e) { return (e as Error).message }
    }
    setAccounts((a) => a.map((x) => (x.id === user.id ? { ...x, ...patch } : x)))
    return null
  }
  const changePassword = async (old: string, nw: string): Promise<string | null> => {
    if (!user) return 'กรุณาเข้าสู่ระบบ'
    if (nw.length < 6) return 'รหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร'
    if (ONLINE) {
      try { await api('/me/password', { body: { old, password: nw } }); return null } catch (e) { return (e as Error).message }
    }
    if (user.pass !== hashPass(old, user.id)) return 'รหัสผ่านเดิมไม่ถูกต้อง'
    setAccounts((a) => a.map((x) => (x.id === user.id ? { ...x, pass: hashPass(nw, user.id) } : x)))
    return null
  }

  // ---- points (offline helpers; online screens call `act`) ----
  const addTx = (x: Data, t: string, v: number, thb?: number): Data => ({ ...x, tx: [{ id: uid('t'), t, v, time: Date.now(), thb }, ...x.tx].slice(0, 60) })
  const spend = (n: number, label: string, quiet = false) => {
    if (!d || d.points < n) { toast('พอยท์ไม่พอ ลองเติมเงินหรือแลกก้าวเดินนะ', '🥺'); return false }
    up((x) => addTx({ ...x, points: x.points - n }, label, -n))
    if (!quiet) toast(`${label} −${n.toLocaleString()} P`, '✨')
    return true
  }
  const earn = (n: number, label: string, thb?: number) => {
    up((x) => addTx({ ...x, points: x.points + n }, label, n, thb))
    toast(`${label} +${n.toLocaleString()} P`, '🎉')
  }

  // ---- chat ----
  const pushMsg = (x: Data, peer: string, m: Msg, unread: boolean): Data => ({
    ...x, chats: { ...x.chats, [peer]: [...(x.chats[peer] ?? []), m] }, unread: unread ? { ...x.unread, [peer]: (x.unread[peer] ?? 0) + 1 } : x.unread,
  })
  const sendMsg = (peer: string, text: string, kind: Msg['kind'] = 'text') => {
    if (!text.trim()) return
    if (ONLINE) {
      const tmp = { id: uid('tmp'), from: 'me', text: text.trim(), time: Date.now(), kind }
      up((x) => pushMsg(x, peer, tmp, false))
      act<{ id: string; reply?: { text: string; at: number } | null }>(`/chats/${peer}`, { text: text.trim(), kind }).then((r) => {
        if (!r?.reply) return
        setTimeout(() => setTyping((t) => ({ ...t, [peer]: true })), 700)
        const wait = Math.min(6000, Math.max(800, r.reply.at - (Date.now() + clockSkew.current) + 250))
        setTimeout(() => { setTyping((t) => ({ ...t, [peer]: false })); refreshState() }, wait)
      })
      return
    }
    up((x) => pushMsg(x, peer, { id: uid('m'), from: 'me', text: text.trim(), time: Date.now(), kind }, false))
    const p = byId(peer)
    if (p.status === 'hidden') return
    setTimeout(() => setTyping((t) => ({ ...t, [peer]: true })), 700)
    setTimeout(() => {
      setTyping((t) => ({ ...t, [peer]: false }))
      const reply = kind === 'market' ? MARKET_BACK[Math.floor(Math.random() * MARKET_BACK.length)] : kind === 'wave' || kind === 'hi' ? WAVE_BACK[Math.floor(Math.random() * WAVE_BACK.length)] : REPLIES[Math.floor(Math.random() * REPLIES.length)]
      const viewing = screenRef.current === 'chat' && chatRef.current === peer
      up((x) => pushMsg(x, peer, { id: uid('m'), from: peer, text: reply, time: Date.now() }, !viewing))
      if (!viewing) { notify({ text: `${p.name}: ${reply}`, emoji: '💬', to: 'chat', chat: peer }); if (d?.settings.notif !== false) toast(`${p.name}: ${reply}`, '💬') }
    }, 1800 + Math.random() * 1500)
  }
  const markRead = (peer: string) => {
    if (ONLINE && d?.unread[peer]) api(`/chats/${peer}/read`, { body: {} }).catch(() => {})
    up((x) => (x.unread[peer] ? { ...x, unread: { ...x.unread, [peer]: 0 } } : x))
  }

  // ---- friends ----
  const addFriend = (id: string) => {
    if (ONLINE) { act('/friends/request', { id }).then((r) => { if (r) toast('ส่งคำขอเป็นเพื่อนแล้ว', '💌'); setTimeout(refreshState, 4500) }); return }
    up((x) => ({ ...x, sent: [...new Set([...x.sent, id])] }))
    toast('ส่งคำขอเป็นเพื่อนแล้ว', '💌')
    const p = byId(id)
    if (p.status === 'open' || p.status === 'single') setTimeout(() => {
      up((x) => (x.friends.includes(id) ? x : { ...x, friends: [id, ...x.friends], sent: x.sent.filter((s) => s !== id) }))
      notify({ text: `${p.name} ตอบรับคำขอเป็นเพื่อนแล้ว`, emoji: '🫶', to: 'friends' })
      toast(`${p.name} ตอบรับเป็นเพื่อนแล้ว!`, '🫶')
    }, 4000)
  }

  const unreadChats = d ? Object.values(d.unread).reduce((a, b) => a + (b || 0), 0) : 0
  const unreadNotifs = d ? d.notifs.filter((n) => !n.read).length : 0
  const pet = d ? d.pets.find((p) => p.id === d.activePet) ?? d.pets[0] : null
  const updatePet = (id: string, fn: (p: PetData) => PetData) => up((x) => ({ ...x, pets: x.pets.map((p) => (p.id === id ? fn(p) : p)) }))
  const bumpDaily = (k: keyof Omit<Daily, 'date' | 'claimed'>) => up((x) => ({ ...x, daily: { ...x.daily, [k]: x.daily[k] + 1 } }))
  /** Set privacy everywhere (server when online). */
  const setPrivacy = (privacy: PrivacyMode) => {
    up((x) => ({ ...x, privacy }))
    if (ONLINE) act('/me/privacy', { privacy }, 'PATCH', { quiet: false })
  }
  const setRelationship = (relationship: StatusKey) => {
    up((x) => ({ ...x, relationship }))
    if (ONLINE) act('/me/privacy', { relationship }, 'PATCH')
  }

  return {
    online: ONLINE, booting, busy: busy > 0, act, refreshState, syncSteps, features, rtConnected,
    isOnline: (id: string) => onlineIds.has(id), pedometer, togglePedometer, pedometerSupported: pedometerSupported(),
    user, accounts, register, login, demoLogin, logout, resetData, updateProfile, changePassword,
    d: d as Data, up, screen, go, chatWith, toasts, toast, notify,
    spend, earn, sendMsg, markRead, typing, addFriend, setPrivacy, setRelationship,
    walkSim, setWalkSim, people, person,
    geo, geoError, startGeo, eggSpots: liveEggs, loadNearby,
    unreadChats, unreadNotifs, pet: pet as PetData, updatePet, bumpDaily,
  }
}

function migrate(x: Data | null): Data | null {
  if (!x) return null
  const s = seed()
  return { ...s, ...x, market: x.market ?? s.market, daily: x.daily ?? s.daily, settings: { ...s.settings, ...(x.settings ?? {}) }, outfit: { ...s.outfit, ...(x.outfit ?? {}) } }
}

type Store = ReturnType<typeof useStoreImpl>
const Ctx = createContext<Store | null>(null)
export function AppProvider({ children }: { children: ReactNode }) {
  const v = useStoreImpl()
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>
}
export const useApp = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useApp outside provider')
  return c
}
export function useNow(ms = 1000) {
  const [n, setN] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return n
}

/** Add XP to a pet, levelling up every 100 XP. */
export function addXp(p: PetData, n: number): PetData {
  let xp = p.xp + n, level = p.level
  while (xp >= 100) { xp -= 100; level++ }
  return { ...p, xp, level }
}
