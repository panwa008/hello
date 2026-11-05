import { AnimatePresence, motion } from 'framer-motion'
import { Backpack, ChevronLeft, ChevronRight, Footprints, Gamepad2, Moon, Pencil, Plus, Utensils, X, Zap } from 'lucide-react'
import { useRef, useState } from 'react'
import { Egg, PALETTES, PetDragon } from '../../components/art'
import { Bar, Btn, Card, Header, PageTitle, Rarity, Sheet } from '../../components/ui'
import { PET_POSES, PET_SHOP, PET_SLOT, PET_SLOT_LABEL } from '../../data/mock'
import { addXp, HATCH_POOL, useApp, useNow, type EggData, type PetData, type PetSlot } from '../../store/AppStore'
import { uid } from '../../lib/storage'
import { petMoodLine } from '../../components/World'
import type { CareKey } from '../../lib/world'
import { RealmBanner } from '../shared/realm'

export const FOOD_FX: Record<string, { hunger: number; mood: number }> = {
  f1: { hunger: 15, mood: 2 }, f2: { hunger: 20, mood: 5 }, f3: { hunger: 25, mood: 3 }, f4: { hunger: 30, mood: 4 }, f5: { hunger: 20, mood: 20 }, f6: { hunger: 100, mood: 100 },
}
const COS = Object.fromEntries(PET_SHOP.cosmetics.map((c) => [c.id, c]))

const SLOTS: PetSlot[] = ['head', 'face', 'neck', 'back']
/** Gear per slot (falls back to the legacy single `acc`). */
export const gearOf = (p: PetData): Partial<Record<PetSlot, string>> => p.gear ?? (p.acc ? { [PET_SLOT[p.acc] ?? 'head']: p.acc } : {})

export function PetWithAcc({ pet, size, pose }: { pet: PetData; size: number; pose?: string }) {
  const g = gearOf(pet)
  const pos: Record<PetSlot, React.CSSProperties> = {
    head: { top: size * 0.02, left: '50%', transform: 'translateX(-50%)', fontSize: size * 0.2 },
    face: { top: size * 0.3, left: '50%', transform: 'translateX(-50%)', fontSize: size * 0.17 },
    neck: { top: size * 0.5, left: '50%', transform: 'translateX(-50%)', fontSize: size * 0.17 },
    back: { top: size * 0.34, left: '50%', transform: `translateX(${size * 0.12}px)`, fontSize: size * 0.22, zIndex: -1 },
  }
  return (
    <div className="relative isolate" style={{ width: size, height: size }}>
      {SLOTS.map((sl) => { const c = g[sl] ? COS[g[sl]!] : null; return c ? <span key={sl} className="pointer-events-none absolute drop-shadow" style={pos[sl]}>{c.emoji}</span> : null })}
      <PetDragon palette={PALETTES[pet.palette] ?? PALETTES.lumi} size={size} pose={pose} />
    </div>
  )
}

export default function Pets() {
  const app = useApp()
  const { d, pet } = app
  const now = useNow(1000)
  const [hearts, setHearts] = useState<number[]>([])
  const [bag, setBag] = useState(false)
  const [hatched, setHatched] = useState<PetData | null>(null)
  const [hatchEgg, setHatchEgg] = useState<EggData | null>(null)
  const burst = () => setHearts((h) => [...h, Date.now() + Math.random()])
  const [slot, setSlot] = useState<PetSlot>('head')
  const [bagTab, setBagTab] = useState<'food' | 'gear' | 'eggs'>('food')
  const lastPat = useRef(0)
  const [cheer, setCheer] = useState<{ k: CareKey; t: number } | null>(null)
  const care = (k: CareKey) => { if (app.careDone(k)) { setCheer({ k, t: Date.now() }); burst(); burst(); app.toast(k === 'feed' ? 'ดูแลประจำวัน: ป้อนข้าวแล้ว ✓' : k === 'play' ? 'ดูแลประจำวัน: เล่นด้วยแล้ว ✓' : 'ดูแลประจำวัน: พาเดินแล้ว ✓', '🐾') } }
  const online = app.online
  const feed = (id: string) => {
    const f = PET_SHOP.food.find((x) => x.id === id)!
    if ((d.food[id] ?? 0) <= 0) { app.toast('อาหารหมด ไปซื้อที่ร้านสัตว์เลี้ยงนะ', '🛒'); return }
    if (pet.hunger >= 100) { app.toast(`น้อง ${pet.name} อิ่มแล้ว~`, '😋'); return }
    burst(); care('feed')
    if (online) { app.act(`/pets/${pet.id}/feed`, { food: id }).then((r) => r && app.toast(`น้อง ${pet.name} กิน${f.name} อร่อยมาก! +5 XP`, f.emoji)); return }
    const fx = FOOD_FX[id] ?? { hunger: 15, mood: 3 }
    app.up((x) => ({ ...x, food: { ...x.food, [id]: x.food[id] - 1 } }))
    app.updatePet(pet.id, (p) => ({ ...addXp(p, 5), hunger: Math.min(100, p.hunger + fx.hunger), mood: Math.min(100, p.mood + fx.mood) }))
    app.toast(`น้อง ${pet.name} กิน${f.name} อร่อยมาก! +5 XP`, f.emoji)
  }
  const quickFeed = () => {
    const first = PET_SHOP.food.map((f) => f.id).find((k) => (d.food[k] ?? 0) > 0)
    if (first) feed(first); else app.toast('อาหารหมด ไปซื้อที่ร้านสัตว์เลี้ยงนะ', '🛒')
  }
  const play = () => {
    if (pet.energy < 10) { app.toast(`น้อง ${pet.name} เหนื่อยแล้ว ให้พักก่อนนะ`, '😴'); return }
    if (pet.hunger < 10) { app.toast(`น้อง ${pet.name} หิวจนเล่นไม่ไหว ให้อาหารก่อน`, '🍖'); return }
    app.up((x) => ({ ...x, pose: 'pose3' })); burst(); burst(); care('play')
    if (online) { app.act(`/pets/${pet.id}/play`).then((r) => r && app.toast(`เล่นลูกบอลกับ ${pet.name}! +8 XP`, '⚽')); return }
    app.updatePet(pet.id, (p) => ({ ...addXp(p, 8), mood: Math.min(100, p.mood + 12), energy: Math.max(0, p.energy - 10), hunger: Math.max(0, p.hunger - 4) }))
    app.toast(`เล่นลูกบอลกับ ${pet.name}! +8 XP`, '⚽')
  }
  const rest = () => {
    app.up((x) => ({ ...x, pose: 'pose4' }))
    if (online) { app.act(`/pets/${pet.id}/rest`).then((r) => r && app.toast(`${pet.name} งีบหลับ… พลังงาน +30`, '💤')); return }
    app.updatePet(pet.id, (p) => ({ ...p, energy: Math.min(100, p.energy + 30), mood: Math.min(100, p.mood + 2) }))
    app.toast(`${pet.name} งีบหลับ… พลังงาน +30`, '💤')
  }
  const pat = () => {
    burst()
    if (Date.now() - lastPat.current < 1500) return
    lastPat.current = Date.now()
    if (online) app.act(`/pets/${pet.id}/pet`, undefined, undefined, { quiet: true })
    else app.updatePet(pet.id, (p) => ({ ...p, mood: Math.min(100, p.mood + 1) }))
  }
  const toggleWalk = () => {
    const next = !d.walking
    if (next) care('walk')
    if (online) app.act('/walking', { walking: next })
    else app.up((x) => ({ ...x, walking: next }))
    app.toast(next ? 'น้องจะเดินข้างคุณบนแผนที่' : 'เก็บน้องเข้ากระเป๋าแล้ว', next ? '🐾' : '🎒')
  }
  const careWalk = () => {
    if (app.world.care.walk) { app.toast(`วันนี้พา ${pet.name} เดินแล้ว~`, '🌸'); return }
    if (!d.walking) { if (online) app.act('/walking', { walking: true }, undefined, { quiet: true }); else app.up((x) => ({ ...x, walking: true })) }
    if (!online) app.updatePet(pet.id, (p) => ({ ...addXp(p, 5), mood: Math.min(100, p.mood + 8), energy: Math.max(0, p.energy - 5) }))
    care('walk')
  }
  const moodLine = petMoodLine(pet, app.world.care, new Date(now))
  const rename = () => {
    const n = prompt('ตั้งชื่อใหม่ให้น้อง', pet.name)?.trim().slice(0, 16)
    if (!n) return
    if (online) app.act(`/pets/${pet.id}`, { name: n }, 'PATCH').then((r) => r && app.toast(`ชื่อใหม่: ${n}`, '✏️'))
    else { app.updatePet(pet.id, (p) => ({ ...p, name: n })); app.toast(`ชื่อใหม่: ${n}`, '✏️') }
  }
  const setActive = (id: string) => {
    if (id === pet.id) return
    app.up((x) => ({ ...x, activePet: id }))
    if (online) app.act(`/pets/${id}/active`, undefined, undefined, { quiet: true })
  }
  const cycle = (dir: number) => { const i = d.pets.findIndex((p) => p.id === pet.id); setActive(d.pets[(i + dir + d.pets.length) % d.pets.length].id) }
  const wornBy = (itemId: string) => d.pets.find((p) => Object.values(gearOf(p)).includes(itemId))
  const equip = (itemId: string) => {
    const c = COS[itemId]; const sl = PET_SLOT[itemId] ?? 'head'
    if (online) { app.act(`/pets/${pet.id}/equip`, { itemId }).then((r) => r && app.toast(`${pet.name} ใส่${c.name}แล้ว`, c.emoji)); return }
    app.up((x) => ({
      ...x, pets: x.pets.map((p) => {
        let g = { ...gearOf(p) }
        for (const k of SLOTS) if (g[k] === itemId) delete g[k]
        if (p.id === pet.id) g = { ...g, [sl]: itemId }
        return { ...p, gear: g, acc: g.head ?? Object.values(g)[0] }
      }),
    }))
    app.toast(`${pet.name} ใส่${c.name}แล้ว`, c.emoji)
  }
  const unequip = (sl: PetSlot) => {
    if (!gearOf(pet)[sl]) return
    if (online) { app.act(`/pets/${pet.id}/unequip`, { slot: sl }); return }
    app.updatePet(pet.id, (p) => { const g = { ...gearOf(p) }; delete g[sl]; return { ...p, gear: g, acc: g.head ?? Object.values(g)[0] } })
  }
  const hatch = (e: EggData) => {
    setHatchEgg(e); setHatched(null)
    if (online) {
      const minAnim = new Promise((r) => setTimeout(r, 1900))
      app.act<{ pet: PetData }>(`/eggs/${e.id}/hatch`).then(async (r) => {
        await minAnim
        if (!r) { setHatchEgg(null); return }
        app.notify({ text: `ไข่ฟักแล้ว! ได้ ${r.pet.name} (${r.pet.kind})`, emoji: '🐣', to: 'pets' })
        setHatched(r.pet)
      })
      return
    }
    const pool = HATCH_POOL[e.rarity] ?? HATCH_POOL.Common
    const pick = pool[Math.floor(Math.random() * pool.length)]
    const used = new Set(d.pets.map((p) => p.name))
    const name = pick.names.find((n) => !used.has(n)) ?? pick.names[0] + ' ' + (d.pets.length + 1)
    const np: PetData = { id: uid('pt'), name, kind: pick.kind, palette: pick.palette, rarity: e.rarity, level: 1, xp: 0, hunger: 70, mood: 90, energy: 100, gear: {} }
    setTimeout(() => {
      app.up((x) => ({ ...x, eggs: x.eggs.filter((y) => y.id !== e.id), pets: [...x.pets, np] }))
      app.notify({ text: `ไข่ฟักแล้ว! ได้ ${np.name} (${np.kind})`, emoji: '🐣', to: 'pets' })
      setHatched(np)
    }, 1900)
  }
  const speed = (e: EggData) => {
    if (online) { app.act(`/eggs/${e.id}/speed`).then((r) => r && app.toast('เร่งการฟักไข่ −50 P', '⚡')); return }
    if (app.spend(50, 'เร่งการฟักไข่')) app.up((x) => ({ ...x, eggs: x.eggs.map((y) => (y.id === e.id ? { ...y, start: y.start - y.dur } : y)) }))
  }
  const owned = PET_SHOP.cosmetics.filter((c) => d.owned.includes(c.id))
  const foods = PET_SHOP.food.filter((f) => d.food[f.id])
  return (
    <div>
      <PageTitle en="Pet House" th="บ้านสัตว์เลี้ยง" right={<Btn variant="ghost" onClick={() => app.go('petshop')}>🛍️ ร้านสัตว์เลี้ยง</Btn>} />
      <RealmBanner realm="digital">สัตว์เลี้ยงในโลกอวตาร · ดูแล ฟักไข่ แต่งตัวน้อง</RealmBanner>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="relative overflow-hidden !p-0">
          <div className="relative h-[420px] sm:h-[460px] overflow-hidden rounded-[28px]" style={{ background: 'linear-gradient(180deg,#F6EAFE 0%,#FCE4EF 55%,#EAD9F7 56%,#E2D2F5 100%)' }}>
            <div className="absolute hidden sm:block left-6 top-6 h-28 w-24 rounded-t-full border-8 border-white/80 bg-gradient-to-b from-sky-200 to-pink-100 shadow-inner" />
            <div className="absolute hidden sm:block right-8 top-10 text-4xl">🪴</div>
            <div className="absolute right-24 top-6 hidden sm:flex gap-1 text-xl">{['⭐', '🌙', '✨'].map((c, i) => <span key={i} className="anim-float" style={{ animationDelay: `${i * 0.4}s` }}>{c}</span>)}</div>
            <div className="absolute bottom-10 left-1/2 h-16 w-[70%] -translate-x-1/2 rounded-[50%] bg-gradient-to-r from-pink/40 via-white/60 to-mint/40 blur-[1px]" />
            <div className="absolute bottom-6 left-6 text-4xl">🧸</div>
            <div className="absolute bottom-6 right-6 text-4xl">🎀</div>
            {!d.walking && <div className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-xs text-ink/60">🎒 อยู่ในกระเป๋า (ไม่แสดงบนแผนที่)</div>}
            <motion.div key={pet.id} initial={{ scale: 0.6, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }} className="absolute inset-x-0 bottom-8 flex justify-center">
              <motion.div whileTap={{ scale: 0.92, rotate: -4 }} onClick={pat} className="anim-float cursor-pointer">
                <PetWithAcc pet={pet} size={300} pose={d.pose} />
              </motion.div>
            </motion.div>
            {d.pets.length > 1 && (
              <div className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-2">
                <button aria-label="ตัวก่อนหน้า" onClick={() => cycle(-1)} className="glass grid h-8 w-8 place-items-center rounded-full text-plum-600"><ChevronLeft size={16} /></button>
                <div className="glass flex gap-1 rounded-full px-2 py-1">
                  {d.pets.map((p) => <button key={p.id} title={p.name} onClick={() => setActive(p.id)} className={`h-2 rounded-full transition-all ${p.id === pet.id ? 'w-5 bg-plum' : 'w-2 bg-plum/25'}`} />)}
                </div>
                <button aria-label="ตัวถัดไป" onClick={() => cycle(1)} className="glass grid h-8 w-8 place-items-center rounded-full text-plum-600"><ChevronRight size={16} /></button>
              </div>
            )}
            <AnimatePresence>
              {hearts.slice(-6).map((h, i) => (
                <motion.span key={h} initial={{ opacity: 1, y: 0, x: (i % 3 - 1) * 30 }} animate={{ opacity: 0, y: -160 }} exit={{ opacity: 0 }} transition={{ duration: 1.4 }} onAnimationComplete={() => setHearts((x) => x.filter((y) => y !== h))} className="pointer-events-none absolute left-1/2 top-1/2 text-3xl">💖</motion.span>
              ))}
            </AnimatePresence>
            <div className="glass absolute left-3 top-3 rounded-3xl p-3 sm:left-6 sm:top-40">
              <button onClick={rename} className="flex items-center gap-2"><span className="text-lg font-bold">{pet.name}</span><Pencil size={12} className="text-ink/40" /><Rarity r={pet.rarity} /></button>
              <div className="text-xs text-ink/55">{pet.kind} · Lv.{pet.level}</div>
              <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-white"><motion.div className="h-full rounded-full bg-gradient-to-r from-plum to-pink" animate={{ width: `${pet.xp}%` }} /></div>
              <div className="mt-1 text-[10px] text-ink/40">XP {pet.xp}/100</div>
              <motion.div key={moodLine.th} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 max-w-[11rem] text-xs font-medium text-plum-600">{moodLine.emoji} {moodLine.th}</motion.div>
            </div>
            <div className="absolute right-3 top-3 flex sm:top-24 flex-col gap-2 sm:right-6">
              {[{ i: Utensils, l: 'ให้อาหาร', f: quickFeed }, { i: Gamepad2, l: 'เล่นด้วย', f: play }, { i: Moon, l: 'พักผ่อน', f: rest }, { i: Footprints, l: d.walking ? 'กำลังเดินข้าง' : 'พาเดิน', f: toggleWalk }, { i: Backpack, l: 'กระเป๋า', f: () => setBag(true) }].map((a) => (
                <motion.button key={a.l} whileHover={{ x: -3 }} whileTap={{ scale: 0.92 }} onClick={a.f} className="glass flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold text-plum-600"><a.i size={16} />{a.l}</motion.button>
              ))}
            </div>
          </div>
        </Card>
        <div className="space-y-4">
          <Card delay={0.02} className="!bg-gradient-to-br from-[#FDF1F7] to-[#EEF7F2]">
            <Header title="ดูแลประจำวัน" sub={`Daily Care · ${pet.name} · ทำได้อย่างละครั้งต่อวัน`} right={app.world.careBonus ? <span className="chip bg-mint/60 text-emerald-700">🎀 ครบแล้ว!</span> : <span className="chip bg-white text-ink/50">ครบ 3 = +15 P</span>} />
            <div className="grid grid-cols-3 gap-2">
              {([{ k: 'feed', e: '🍖', th: 'ป้อนข้าว', en: 'Feed', f: quickFeed }, { k: 'play', e: '⚽', th: 'เล่นด้วย', en: 'Play', f: play }, { k: 'walk', e: '🌿', th: 'พาเดิน', en: 'Walk', f: careWalk }] as const).map((a) => {
                const done = app.world.care[a.k]
                return (
                  <motion.button key={a.k} whileTap={{ scale: 0.92 }} onClick={a.f} animate={cheer?.k === a.k ? { scale: [1, 1.12, 1], rotate: [0, -4, 4, 0] } : {}} transition={{ duration: 0.5 }}
                    className={`relative rounded-2xl p-3 text-center ${done ? 'bg-mint/50 ring-2 ring-emerald-300/60' : 'bg-white/75 hover:bg-white'}`}>
                    <div className="text-2xl">{done ? '✅' : a.e}</div>
                    <div className="text-xs font-semibold">{a.th}</div><div className="text-[10px] text-ink/40">{a.en}</div>
                  </motion.button>
                )
              })}
            </div>
          </Card>
          <Card delay={0.05}>
            <Header title="สถานะน้อง" sub="ค่าสถานะลดลงตามเวลา ดูแลบ่อย ๆ นะ" right={<Btn onClick={quickFeed} className="!py-1.5 text-xs"><Utensils size={14} /> ให้อาหาร</Btn>} />
            <div className="space-y-3">
              <Bar value={pet.hunger} from="#FFD3B5" to="#F5A9C5" label="ความอิ่ม" icon="🍖" />
              <Bar value={pet.mood} from="#A8E6CF" to="#9FD3F5" label="อารมณ์" icon="💖" />
              <Bar value={pet.energy} from="#E8E0F5" to="#9B7EBD" label="พลังงาน" icon="⚡" />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {foods.map((f) => (
                <motion.button key={f.id} whileTap={{ scale: 0.9 }} onClick={() => feed(f.id)} title={f.desc} className="relative rounded-2xl p-2 text-center" style={{ background: `linear-gradient(135deg, ${f.tint[0]}, ${f.tint[1]})` }}>
                  <div className="text-2xl">{f.emoji}</div><div className="truncate text-[10px] text-ink/60">{f.name}</div>
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-plum px-1 text-[10px] font-bold text-white">{d.food[f.id]}</span>
                </motion.button>
              ))}
              {foods.length === 0 && <button onClick={() => app.go('petshop')} className="col-span-4 rounded-2xl bg-white/70 p-3 text-xs text-ink/60">อาหารหมดแล้ว — ไปซื้อที่ร้าน 🛒</button>}
            </div>
          </Card>
          <Card delay={0.1}>
            <Header title="ท่าทางน้อง" sub="Pet Poses" />
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {PET_POSES.map((p) => (
                <button key={p.id} onClick={() => app.up((x) => ({ ...x, pose: p.id }))} className={`shrink-0 rounded-2xl px-3 py-2 text-center transition ${d.pose === p.id ? 'btn-primary text-white' : 'bg-white/70 text-ink/70'}`}>
                  <div className="text-xl">{p.emoji}</div><div className="text-[11px] font-medium">{p.name}</div>
                </button>
              ))}
            </div>
          </Card>
          <Card delay={0.12}>
            <Header title="แต่งตัวน้อง" sub="ใส่ได้ช่องละ 1 ชิ้น · ไอเท็มย้ายระหว่างน้องได้" right={<Btn variant="ghost" className="!py-1.5 text-xs" onClick={() => { setBagTab('gear'); setBag(true) }}><Backpack size={14} /> กระเป๋า</Btn>} />
            <div className="grid grid-cols-4 gap-2">
              {SLOTS.map((sl) => {
                const it = gearOf(pet)[sl] ? COS[gearOf(pet)[sl]!] : null
                return (
                  <button key={sl} onClick={() => setSlot(sl)} className={`relative rounded-2xl p-2 text-center transition ${slot === sl ? 'bg-white ring-2 ring-plum/40' : 'bg-white/60'}`}>
                    <div className="text-2xl">{it ? it.emoji : '➕'}</div>
                    <div className="text-[10px] text-ink/55">{PET_SLOT_LABEL[sl]}</div>
                    {it && <span role="button" aria-label={`ถอด${it.name}`} onClick={(e) => { e.stopPropagation(); unequip(sl) }} className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-rose-400 text-white"><X size={11} /></span>}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {owned.filter((c) => (PET_SLOT[c.id] ?? 'head') === slot).map((c) => {
                const w = wornBy(c.id), on = w?.id === pet.id
                return (
                  <button key={c.id} onClick={() => (on ? unequip(slot) : equip(c.id))} className={`rounded-2xl px-3 py-2 text-xs ${on ? 'btn-primary text-white' : 'bg-white/70'}`}>
                    {c.emoji} {c.name}{w && !on && <span className="ml-1 text-[10px] text-ink/40">(ใส่อยู่กับ {w.name})</span>}
                  </button>
                )
              })}
              {owned.filter((c) => (PET_SLOT[c.id] ?? 'head') === slot).length === 0 && <button onClick={() => app.go('petshop')} className="text-xs text-ink/45 hover:text-plum-600">ยังไม่มีไอเท็มช่อง{PET_SLOT_LABEL[slot]} — ไปร้านค้า 🛍️</button>}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card delay={0.15}>
          <Header title="ตู้ฟักไข่" sub="ไข่จะฟักเองเมื่อครบเวลา · เร่งได้ 50 P" right={<Btn variant="soft" className="!h-9 !w-9 !p-0" onClick={() => app.go('petshop')}><Plus size={16} /></Btn>} />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {d.eggs.map((e, i) => {
              const pr = Math.min(100, ((now - e.start) / e.dur) * 100), ready = pr >= 100
              const left = Math.max(0, Math.ceil((e.dur - (now - e.start)) / 1000))
              return (
                <div key={e.id} className="flex flex-col items-center rounded-2xl bg-white/70 p-2">
                  <motion.button whileHover={{ y: -4, rotate: [0, -6, 6, 0] }} onClick={() => (ready ? hatch(e) : app.toast(`อีก ${left} วินาทีจะฟัก · ${e.source}`, '🥚'))} className={ready ? 'anim-float' : ''} style={{ animationDelay: `${i * 0.3}s` }}><Egg hue={e.hue} size={44} glow={ready} /></motion.button>
                  <Rarity r={e.rarity} />
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-lav"><div className="h-full bg-gradient-to-r from-mint to-plum transition-[width] duration-1000" style={{ width: `${pr}%` }} /></div>
                  {ready ? <button onClick={() => hatch(e)} className="mt-1 text-[11px] font-bold text-plum-600">ฟักเลย! 🐣</button> : <button onClick={() => speed(e)} className="mt-1 flex items-center gap-0.5 text-[10px] text-ink/50 hover:text-plum-600"><Zap size={10} />{left} วิ</button>}
                </div>
              )
            })}
            {d.eggs.length === 0 && <button onClick={() => app.go('petshop')} className="col-span-full rounded-2xl bg-white/60 p-4 text-sm text-ink/50">ตู้ฟักว่าง — ซื้อไข่หรือเก็บจากแผนที่ 🥚</button>}
          </div>
        </Card>
        <Card delay={0.2}>
          <Header title="คอลเลกชันของฉัน" sub={`${d.pets.length} ตัว · แตะเพื่อสลับตัวหลัก`} />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {d.pets.map((c) => (
              <motion.button key={c.id} whileHover={{ y: -3 }} onClick={() => setActive(c.id)} className={`relative flex flex-col items-center rounded-2xl p-2 transition ${pet.id === c.id ? 'bg-white shadow-md ring-2 ring-plum/40' : 'bg-white/60'}`}>
                <PetWithAcc pet={c} size={64} />
                <div className="text-xs font-semibold">{c.name}</div>
                <div className="text-[10px] text-ink/45">Lv.{c.level} · {c.rarity}</div>
                {pet.id === c.id && <span className="absolute left-1 top-1 rounded-full bg-plum px-1.5 text-[9px] font-bold text-white">หลัก</span>}
              </motion.button>
            ))}
          </div>
        </Card>
      </div>

      <Sheet open={bag} onClose={() => setBag(false)} title="กระเป๋าสัตว์เลี้ยง 🎒">
        <p className="mb-3 text-xs text-ink/50">ของทั้งหมดของคุณ · แตะอาหารเพื่อป้อน, แตะเครื่องประดับเพื่อใส่ให้ {pet.name}</p>
        <div className="mb-3 flex gap-2">
          {([['food', `🍖 อาหาร (${foods.reduce((a, f) => a + (d.food[f.id] ?? 0), 0)})`], ['gear', `🎀 เครื่องประดับ (${owned.length})`], ['eggs', `🥚 ไข่ (${d.eggs.length})`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setBagTab(k)} className={`flex-1 rounded-2xl py-2 text-xs font-semibold ${bagTab === k ? 'btn-primary text-white' : 'bg-white/70 text-ink/60'}`}>{l}</button>
          ))}
        </div>
        <div className="grid max-h-[46vh] grid-cols-3 gap-2 overflow-y-auto">
          {bagTab === 'food' && foods.map((f) => (
            <button key={f.id} onClick={() => feed(f.id)} className="rounded-2xl p-3 text-center" style={{ background: `linear-gradient(135deg, ${f.tint[0]}, ${f.tint[1]})` }}>
              <div className="text-3xl">{f.emoji}</div><div className="text-[11px]">{f.name}</div><div className="text-[10px] text-ink/50">x{d.food[f.id]} · แตะเพื่อป้อน</div>
            </button>
          ))}
          {bagTab === 'gear' && owned.map((c) => {
            const w = wornBy(c.id)
            return (
              <button key={c.id} onClick={() => equip(c.id)} className={`rounded-2xl p-3 text-center ${w?.id === pet.id ? 'ring-2 ring-plum' : ''}`} style={{ background: `linear-gradient(135deg, ${c.tint[0]}, ${c.tint[1]})` }}>
                <div className="text-3xl">{c.emoji}</div><div className="text-[11px]">{c.name}</div>
                <div className="text-[10px] text-ink/50">{PET_SLOT_LABEL[PET_SLOT[c.id] ?? 'head']} · {w ? `ใส่: ${w.name}` : 'ว่าง'}</div>
              </button>
            )
          })}
          {bagTab === 'eggs' && d.eggs.map((e) => {
            const ready = now - e.start >= e.dur
            return (
              <button key={e.id} onClick={() => { if (ready) { setBag(false); hatch(e) } else app.toast(`อีก ${Math.ceil((e.dur - (now - e.start)) / 1000)} วินาที`, '🥚') }} className="flex flex-col items-center rounded-2xl bg-white/70 p-3">
                <Egg hue={e.hue} size={40} glow={ready} /><Rarity r={e.rarity} /><div className="text-[10px] text-ink/50">{ready ? 'ฟักได้แล้ว!' : e.source}</div>
              </button>
            )
          })}
          {((bagTab === 'food' && !foods.length) || (bagTab === 'gear' && !owned.length) || (bagTab === 'eggs' && !d.eggs.length)) && <button onClick={() => { setBag(false); app.go('petshop') }} className="col-span-3 rounded-2xl bg-white/60 p-4 text-xs text-ink/50">ว่างเปล่า — ไปร้านสัตว์เลี้ยง 🛍️</button>}
        </div>
        <Btn className="mt-4 w-full" onClick={() => { toggleWalk(); setBag(false) }}>{d.walking ? '🎒 เก็บน้องเข้ากระเป๋า' : '🐾 ปล่อยน้องเดินข้างฉัน'}</Btn>
      </Sheet>
      <Sheet open={!!hatchEgg} onClose={() => { setHatchEgg(null); setHatched(null) }} title={hatched ? 'ยินดีด้วย! 🎉' : 'ไข่กำลังฟัก…'}>
        <div className="py-4 text-center">
          {!hatched && hatchEgg && <motion.div animate={{ rotate: [0, -12, 12, -8, 8, 0], scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="mx-auto w-fit"><Egg hue={hatchEgg.hue} size={90} glow /></motion.div>}
          {hatched && (
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring' }}>
              <div className="mx-auto w-fit"><PetDragon palette={PALETTES[hatched.palette]} size={160} /></div>
              <div className="text-lg font-bold">ได้น้อง {hatched.name}! ({hatched.kind})</div>
              <div className="mt-1"><Rarity r={hatched.rarity} /></div>
              <div className="mt-4 flex justify-center gap-2">
                <Btn onClick={() => { setActive(hatched.id); setHatchEgg(null); setHatched(null) }}>ตั้งเป็นตัวหลัก</Btn>
                <Btn variant="ghost" onClick={() => { setHatchEgg(null); setHatched(null) }}>ไว้ทีหลัง</Btn>
              </div>
            </motion.div>
          )}
        </div>
      </Sheet>
    </div>
  )
}
