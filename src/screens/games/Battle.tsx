import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { PALETTES, PetDragon } from '../../components/art'
import { Btn } from '../../components/ui'
import { PEOPLE } from '../../data/mock'
import type { PetData } from '../../store/AppStore'

type Act = 'atk' | 'sp' | 'def' | 'heal'
const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))

export function Battle({ pet, onEnd }: { pet: PetData; onEnd: (win: boolean) => void }) {
  const foe = useMemo(() => {
    const owners = PEOPLE.filter((p) => p.petName)
    const o = owners[Math.floor(Math.random() * owners.length)]
    const pal = ['mochi', 'sora', 'nova', 'lumi'][Math.floor(Math.random() * 4)]
    return { name: o.petName!, owner: o.name, palette: pal, level: Math.max(1, pet.level + rnd(-2, 2)) }
  }, [pet.level])
  const maxMe = 90 + pet.level * 5, maxFoe = 90 + foe.level * 5
  const [me, setMe] = useState(maxMe)
  const [en, setEn] = useState(maxFoe)
  const [cd, setCd] = useState(0)
  const [heals, setHeals] = useState(2)
  const [guard, setGuard] = useState(false)
  const [turn, setTurn] = useState<'me' | 'foe'>('me')
  const [log, setLog] = useState<string[]>([`${foe.owner} ส่งน้อง ${foe.name} ลงสนาม!`])
  const [hit, setHit] = useState<'me' | 'foe' | null>(null)
  const [pop, setPop] = useState<{ who: 'me' | 'foe'; t: string } | null>(null)
  const done = me <= 0 || en <= 0
  const [reported, setReported] = useState(false)
  useEffect(() => { if (done && !reported) { setReported(true); onEnd(en <= 0) } }, [done, reported, en, onEnd])
  const flash = (who: 'me' | 'foe', t: string) => { setHit(who); setPop({ who, t }); setTimeout(() => setHit(null), 350); setTimeout(() => setPop(null), 800) }
  const act = (a: Act) => {
    if (turn !== 'me' || done) return
    const base = 10 + Math.floor(pet.level / 2)
    if (a === 'atk') { const d = rnd(base, base + 7); setEn((h) => Math.max(0, h - d)); flash('foe', `-${d}`); setLog((l) => [`${pet.name} ใช้ กรงเล็บเมฆ! (${d})`, ...l]) }
    if (a === 'sp') { const d = rnd(base + 14, base + 24); setEn((h) => Math.max(0, h - d)); setCd(3); flash('foe', `-${d}!`); setLog((l) => [`${pet.name} ใช้ ลมหายใจดวงดาว ✨ (${d})`, ...l]) }
    if (a === 'def') { setGuard(true); setLog((l) => [`${pet.name} ตั้งการ์ด 🛡️`, ...l]) }
    if (a === 'heal') { const h = 28; setMe((v) => Math.min(maxMe, v + h)); setHeals((n) => n - 1); flash('me', `+${h}`); setLog((l) => [`${pet.name} กินผลไม้ฟื้นพลัง 🍎 (+${h})`, ...l]) }
    if (a !== 'sp') setCd((c) => Math.max(0, c - 1))
    setTurn('foe')
  }
  useEffect(() => {
    if (turn !== 'foe' || done) return
    const t = setTimeout(() => {
      const base = 9 + Math.floor(foe.level / 2)
      const big = Math.random() < 0.25
      let d = big ? rnd(base + 10, base + 18) : rnd(base, base + 7)
      if (guard) d = Math.round(d / 3)
      setMe((h) => Math.max(0, h - d)); flash('me', `-${d}`)
      setLog((l) => [`${foe.name} ${big ? 'พ่นไฟสีชมพู 🔥' : 'พุ่งชน'}${guard ? ' (ถูกกันไว้)' : ''} (${d})`, ...l])
      setGuard(false); setTurn('me')
    }, 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn])
  const bar = (v: number, m: number, c: string) => <div className="h-2.5 overflow-hidden rounded-full bg-white/70"><motion.div className="h-full rounded-full" style={{ background: c }} animate={{ width: `${(v / m) * 100}%` }} /></div>
  const fighter = (who: 'me' | 'foe') => (
    <div className="relative flex-1 text-center">
      <motion.div animate={hit === who ? { x: [0, -8, 8, -4, 0] } : { y: [0, -6, 0] }} transition={hit === who ? { duration: 0.35 } : { repeat: Infinity, duration: 2.4 }}>
        <div style={{ transform: who === 'foe' ? 'scaleX(-1)' : undefined }}><PetDragon palette={PALETTES[who === 'me' ? pet.palette : foe.palette] ?? PALETTES.lumi} size={120} pose={who === 'me' ? 'pose3' : 'pose1'} /></div>
      </motion.div>
      <AnimatePresence>{pop?.who === who && <motion.span initial={{ y: 0, opacity: 0 }} animate={{ y: -30, opacity: 1 }} exit={{ opacity: 0 }} className={`absolute left-1/2 top-4 -translate-x-1/2 text-xl font-extrabold ${pop.t.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>{pop.t}</motion.span>}</AnimatePresence>
    </div>
  )
  return (
    <div>
      <div className="rounded-3xl bg-gradient-to-b from-[#EDE4FB] to-[#FCE8F1] p-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><div className="mb-1 font-semibold">{pet.name} Lv.{pet.level} {guard && '🛡️'}</div>{bar(me, maxMe, 'linear-gradient(90deg,#A8E6CF,#34C77B)')}<div className="mt-0.5 text-ink/50">{me}/{maxMe}</div></div>
          <div className="text-right"><div className="mb-1 font-semibold">{foe.name} Lv.{foe.level}</div>{bar(en, maxFoe, 'linear-gradient(90deg,#F5A9C5,#F0576B)')}<div className="mt-0.5 text-ink/50">{en}/{maxFoe}</div></div>
        </div>
        <div className="flex items-end">{fighter('me')}<span className="pb-10 text-2xl">⚔️</span>{fighter('foe')}</div>
      </div>
      {!done ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Btn disabled={turn !== 'me'} className="disabled:opacity-50" onClick={() => act('atk')}>🐾 โจมตี</Btn>
          <Btn variant="soft" disabled={turn !== 'me' || cd > 0} className="disabled:opacity-50" onClick={() => act('sp')}>✨ ท่าพิเศษ {cd > 0 && `(${cd})`}</Btn>
          <Btn variant="ghost" disabled={turn !== 'me'} className="disabled:opacity-50" onClick={() => act('def')}>🛡️ ป้องกัน</Btn>
          <Btn variant="ghost" disabled={turn !== 'me' || heals <= 0} className="disabled:opacity-50" onClick={() => act('heal')}>🍎 ฟื้นพลัง ({heals})</Btn>
        </div>
      ) : (
        <div className={`mt-3 rounded-2xl p-3 text-center font-semibold ${en <= 0 ? 'bg-mint/50' : 'bg-pink/30'}`}>{en <= 0 ? '🏆 ชนะ! +80 P · +25 XP' : '🥲 แพ้ไปนิดเดียว +10 P · +8 XP'}</div>
      )}
      <div className="mt-3 h-24 space-y-1 overflow-y-auto rounded-2xl bg-white/60 p-2 text-xs text-ink/60 no-scrollbar">{log.map((l, i) => <div key={log.length - i} className={i === 0 ? 'font-semibold text-ink' : ''}>{l}</div>)}</div>
      {turn === 'foe' && !done && <p className="mt-1 text-center text-xs text-ink/50">ฝ่ายตรงข้ามกำลังคิด…</p>}
    </div>
  )
}
