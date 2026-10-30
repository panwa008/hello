import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Egg, PALETTES, PetDragon } from '../components/art'
import { Btn, Card, Header, PageTitle, Points, Rarity, Sheet, Tabs } from '../components/ui'
import { PET_SHOP } from '../data/mock'
import type { ShopItem } from '../data/types'
import { EGG_DUR, useApp, type PetData } from '../store/AppStore'
import { uid } from '../lib/storage'
import { Minus, Plus } from 'lucide-react'

const EGG_HUE: Record<string, string> = { e1: '#F5A9C5', e2: '#9FD3F5', e3: '#9B7EBD', e4: '#A8E6CF' }
type Loot = { key: string; name: string; emoji: string; rarity: string; palette?: string; w: number }
const LOOT: Loot[] = [
  { key: 'nova', name: 'มังกรดวงดาว Nova', emoji: '🐉', rarity: 'Legendary', palette: 'nova', w: 2 },
  { key: 'c5', name: 'ปีกนางฟ้า', emoji: '🪽', rarity: 'Epic', w: 13 },
  { key: 'c1', name: 'มงกุฎดาว', emoji: '👑', rarity: 'Rare', w: 17 },
  { key: 'f6', name: 'แอปเปิลทอง x3', emoji: '🍎', rarity: 'Rare', w: 18 },
  { key: 'f5', name: 'โดนัทสายรุ้ง x2', emoji: '🍩', rarity: 'Common', w: 25 },
  { key: 'pts', name: '200 Hello Points', emoji: '🪙', rarity: 'Common', w: 25 },
]
const roll = () => { let r = Math.random() * 100; for (const l of LOOT) { if ((r -= l.w) < 0) return l } return LOOT[LOOT.length - 1] }
const RAR = (r?: string) => (r ? r[0].toUpperCase() + r.slice(1) : 'Common')

export default function PetShop() {
  const app = useApp()
  const [tab, setTab] = useState<'eggs' | 'food' | 'cosmetics'>('eggs')
  const [boxOpen, setBoxOpen] = useState(false)
  const [loot, setLoot] = useState<Loot | null>(null)

  const [pick, setPick] = useState<ShopItem | null>(null)
  const [qty, setQty] = useState(1)
  const kindOf = (it: ShopItem) => (it.id.startsWith('e') ? 'eggs' : it.id.startsWith('f') ? 'food' : 'cosmetics')
  const confirm = () => {
    if (!pick) return
    const k = kindOf(pick), n = k === 'cosmetics' ? 1 : qty
    if (app.online) {
      const it = pick
      app.act('/shop/buy', { itemId: it.id, qty: n }).then((r) => { if (r) { app.toast(`ซื้อ ${it.name}${n > 1 ? ` x${n}` : ''} แล้ว`, it.emoji); setPick(null) } })
      return
    }
    if (!app.spend(pick.price * n, `ซื้อ ${pick.name}${n > 1 ? ` x${n}` : ''}`)) return
    const now = Date.now()
    app.up((x) => {
      if (k === 'eggs') { const r = RAR(pick.rarity); return { ...x, eggs: [...x.eggs, ...Array.from({ length: n }, (_, i) => ({ id: uid('eg'), hue: EGG_HUE[pick.id], rarity: r, start: now + i, dur: EGG_DUR[r] ?? 20000, source: `ซื้อจากร้าน (${pick.name})` }))] } }
      if (k === 'food') return { ...x, food: { ...x.food, [pick.id]: (x.food[pick.id] ?? 0) + n } }
      return { ...x, owned: [...x.owned, pick.id] }
    })
    setPick(null)
  }
  const grantLoot = (l: Loot) => {
    if (l.key === 'pts') { app.earn(200, 'Legendary Box: Points'); return }
    app.up((x) => {
      if (l.key === 'nova') {
        const np: PetData = { id: uid('pt'), name: x.pets.some((p) => p.name === 'Nova') ? `Nova ${x.pets.length + 1}` : 'Nova', kind: 'มังกรดวงดาว', palette: 'nova', rarity: 'Legendary', level: 1, xp: 0, hunger: 80, mood: 100, energy: 100 }
        return { ...x, pets: [...x.pets, np] }
      }
      if (l.key === 'f6' || l.key === 'f5') return { ...x, food: { ...x.food, [l.key]: (x.food[l.key] ?? 0) + (l.key === 'f6' ? 3 : 2) } }
      if (x.owned.includes(l.key)) return { ...x, points: x.points + 150 }
      return { ...x, owned: [...x.owned, l.key] }
    })
    if ((l.key === 'c1' || l.key === 'c5') && app.d.owned.includes(l.key)) app.toast('มีอยู่แล้ว แปลงเป็น 150 P', '🪙')
    app.notify({ text: `เปิดกล่องได้ ${l.name}!`, emoji: l.emoji, to: 'pets' })
  }
  const openBox = () => {
    if (app.online) {
      if (app.d.points < 300) { app.toast('พอยท์ไม่พอ', '🪙'); return }
      setLoot(null); setBoxOpen(true)
      const minAnim = new Promise((r) => setTimeout(r, 1600))
      app.act<{ loot: Omit<Loot, 'w'>; note?: string }>('/shop/lootbox').then(async (r) => {
        await minAnim
        if (!r) { setBoxOpen(false); return }
        setLoot({ ...r.loot, w: 0 })
        if (r.note) app.toast(r.note, '🪙')
        app.notify({ text: `เปิดกล่องได้ ${r.loot.name}!`, emoji: r.loot.emoji, to: 'pets' })
      })
      return
    }
    if (!app.spend(300, 'เปิดกล่อง Legendary')) return
    setLoot(null); setBoxOpen(true)
    const l = roll()
    setTimeout(() => { setLoot(l); grantLoot(l) }, 1600)
  }
  return (
    <div>
      <PageTitle en="Pet Shop" th="ร้านสัตว์เลี้ยง" right={<span className="chip bg-white/80 text-ink"><Points n={app.d.points} /></span>} />
      <p className="-mt-2 mb-4 text-xs text-ink/50">ไอเท็มในแอปเท่านั้น · ใช้ Hello Points ซื้อ (แยกจากตลาดซื้อขายของจริง)</p>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="relative overflow-hidden !p-0">
          <div className="relative h-full min-h-[380px] p-6 text-white" style={{ background: 'radial-gradient(circle at 50% 35%, #E9D8FF 0%, #A889E0 40%, #6A4BA6 100%)' }}>
            {Array.from({ length: 18 }).map((_, i) => <span key={i} className="anim-sparkle absolute text-amber-100" style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%`, animationDelay: `${i * 0.25}s`, fontSize: 8 + (i % 3) * 5 }}>✦</span>)}
            <div className="relative text-center">
              <div className="text-xs tracking-[0.3em] text-white/70">MYSTERY BOX</div>
              <div className="bg-gradient-to-r from-amber-200 via-white to-pink-200 bg-clip-text text-3xl font-extrabold text-transparent">Legendary Box</div>
              <div className="mt-1 text-xs text-white/80">ลุ้นรับสัตว์ระดับตำนาน & ไอเท็มหายาก</div>
            </div>
            <motion.div className="relative mx-auto mt-6 grid h-40 w-48 place-items-center" animate={{ y: [0, -8, 0], rotate: [0, -2, 2, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
              <div className="absolute inset-0 rounded-[40px] bg-amber-200/30 blur-2xl" />
              <div className="relative h-32 w-44 rounded-3xl border-4 border-amber-200 bg-gradient-to-b from-[#8C6BD1] to-[#5A3C99] shadow-2xl">
                <div className="absolute -top-5 left-[-6px] right-[-6px] h-10 rounded-2xl border-4 border-amber-200 bg-gradient-to-b from-[#A88AE6] to-[#7A5BC0]" />
                <div className="absolute left-1/2 top-2 h-full w-6 -translate-x-1/2 bg-amber-200/90" />
                <div className="absolute left-1/2 top-9 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full bg-amber-300 text-xl shadow-lg">💎</div>
                <div className="shimmer absolute inset-0 rounded-3xl" />
              </div>
            </motion.div>
            <div className="relative mt-6 flex items-center justify-center gap-3">
              <Btn onClick={openBox} className="!bg-white !bg-none !text-plum-600 !px-6">เปิดกล่อง · <Points n={300} /></Btn>
            </div>
            <div className="relative mt-4 flex justify-center gap-2 text-[10px]">
              {['Legendary 2%', 'Epic 13%', 'Rare 35%', 'Common 50%'].map((r) => <span key={r} className="rounded-full bg-white/15 px-2 py-1">{r}</span>)}
            </div>
          </div>
        </Card>
        <Card delay={0.05}>
          <div className="mb-4"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'eggs', label: '🥚 ไข่' }, { id: 'food', label: '🍓 อาหาร' }, { id: 'cosmetics', label: '🎀 แต่งตัวน้อง' }]} /></div>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PET_SHOP[tab].map((it) => {
                const owned = tab === 'cosmetics' && app.d.owned.includes(it.id)
                return (
                  <motion.div key={it.id} whileHover={{ y: -4 }} className="flex flex-col rounded-3xl bg-white/75 p-3">
                    <div className="relative grid h-28 place-items-center rounded-2xl" style={{ background: `linear-gradient(135deg, ${it.tint[0]}, ${it.tint[1]})` }}>
                      {tab === 'eggs' ? <div className="anim-float"><Egg hue={EGG_HUE[it.id]} size={52} glow /></div> : <span className="text-5xl drop-shadow">{it.emoji}</span>}
                      <span className="absolute left-2 top-2"><Rarity r={it.rarity} /></span>
                      {tab === 'food' && app.d.food[it.id] ? <span className="chip absolute right-2 top-2 !px-2 bg-white/80 text-[10px]">มี {app.d.food[it.id]}</span> : null}
                    </div>
                    <div className="mt-2 text-sm font-semibold">{it.name}</div>
                    <div className="min-h-[16px] text-[11px] text-ink/50">{it.desc}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <Points n={it.price} className="text-sm" />
                      <Btn disabled={owned} onClick={() => { setPick(it); setQty(1) }} className="!px-3 !py-1 text-xs disabled:opacity-50">{owned ? 'มีแล้ว' : 'ซื้อ'}</Btn>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>
      <Card delay={0.1} className="mt-4">
        <Header title="ไข่หาได้จากการสำรวจ" sub="ระบบสุ่มวางไข่ตามสถานที่จริง — สวน ทะเล ภูเขา คาเฟ่" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['🌳', 'สวนสาธารณะ', 'ไข่ทุ่งดอกไม้'], ['🌊', 'ทะเล/แม่น้ำ', 'ไข่ทะเลดาว'], ['🏯', 'วัด/โบราณสถาน', 'ไข่เทพนิยาย'], ['🌌', 'จุดชมดาว', 'ไข่ต่างดาว']].map(([e, p, egg]) => (
            <div key={p} className="rounded-2xl bg-white/70 p-3"><div className="text-2xl">{e}</div><div className="text-sm font-semibold">{p}</div><div className="text-xs text-ink/50">มีโอกาสพบ {egg}</div></div>
          ))}
        </div>
      </Card>
      <Sheet open={!!pick} onClose={() => setPick(null)} title="ยืนยันการซื้อ">
        {pick && (() => {
          const k = kindOf(pick), n = k === 'cosmetics' ? 1 : qty, total = pick.price * n, enough = app.d.points >= total
          return (
            <div>
              <div className="flex items-center gap-4 rounded-3xl p-4" style={{ background: `linear-gradient(135deg, ${pick.tint[0]}, ${pick.tint[1]})` }}>
                {k === 'eggs' ? <Egg hue={EGG_HUE[pick.id]} size={56} glow /> : <span className="text-5xl">{pick.emoji}</span>}
                <div><div className="font-semibold">{pick.name}</div><div className="text-xs text-ink/55">{pick.desc ?? (k === 'cosmetics' ? 'เครื่องประดับสำหรับสัตว์เลี้ยง' : '')}</div>{k === 'eggs' && <div className="text-[11px] text-ink/50">ฟักภายใน ~{Math.round((EGG_DUR[RAR(pick.rarity)] ?? 20000) / 1000)} วินาที (เดโม)</div>}</div>
              </div>
              {k !== 'cosmetics' && (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/70 p-3"><span className="text-sm">จำนวน</span>
                  <div className="flex items-center gap-3"><button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-8 w-8 place-items-center rounded-full bg-lav"><Minus size={14} /></button><span className="w-6 text-center font-bold">{qty}</span><button onClick={() => setQty((q) => Math.min(k === 'eggs' ? 3 : 20, q + 1))} className="grid h-8 w-8 place-items-center rounded-full bg-lav"><Plus size={14} /></button></div>
                </div>
              )}
              <div className="mt-3 space-y-1 rounded-2xl bg-white/70 p-3 text-sm">
                <div className="flex justify-between"><span>รวม</span><Points n={total} /></div>
                <div className="flex justify-between text-ink/55"><span>คงเหลือหลังซื้อ</span><span className={enough ? '' : 'text-rose-500'}>{(app.d.points - total).toLocaleString()} P</span></div>
              </div>
              <Btn className="mt-4 w-full" disabled={!enough} onClick={confirm}>{enough ? 'ยืนยันชำระด้วยพอยท์' : 'พอยท์ไม่พอ'}</Btn>
              {!enough && <button onClick={() => { setPick(null); app.go('wallet') }} className="mt-2 w-full text-center text-xs text-plum-600 underline">เติมพอยท์ที่กระเป๋าเงิน</button>}
            </div>
          )
        })()}
      </Sheet>
      <Sheet open={boxOpen} onClose={() => setBoxOpen(false)} title="Legendary Box">
        <div className="grid min-h-[280px] place-items-center text-center">
          {!loot ? (
            <motion.div animate={{ rotate: [0, -8, 8, -8, 8, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="text-7xl">🎁</motion.div>
          ) : (
            <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
              <div className="mx-auto w-fit">{loot.palette ? <PetDragon palette={PALETTES[loot.palette]} size={170} /> : <span className="text-8xl">{loot.emoji}</span>}</div>
              <div className="mt-2"><Rarity r={loot.rarity} /></div>
              <div className="mt-1 text-xl font-bold">{loot.name}</div>
              <div className="text-xs text-ink/50">ได้รับเข้ากระเป๋าแล้ว</div>
              <div className="mt-3 flex justify-center gap-2"><Btn variant="soft" onClick={() => { setBoxOpen(false); app.go('pets') }}>ไปบ้านสัตว์เลี้ยง</Btn><Btn onClick={openBox}>เปิดอีก · 300</Btn></div>
            </motion.div>
          )}
        </div>
      </Sheet>
    </div>
  )
}
