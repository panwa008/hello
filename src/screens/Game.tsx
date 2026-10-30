import { motion } from 'framer-motion'
import { Play, Trophy } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Btn, Card, Header, PageTitle, Sheet } from '../components/ui'
import { GAMES } from '../data/mock'
import { addXp, useApp } from '../store/AppStore'
import { byId } from '../data/mock'
import { uid } from '../lib/storage'
import { api } from '../lib/api'
import { Adventure } from './games/Adventure'
import { Battle } from './games/Battle'
import { Runner } from './games/Runner'

const SWEETS = ['🍓', '🍩', '🧁', '🍬', '🍪', '🍡']

function MemoryGame({ onWin }: { onWin: (moves: number) => void }) {
  const fired = useRef(false)
  const [cards, setCards] = useState(() => [...SWEETS, ...SWEETS].sort(() => Math.random() - 0.5).map((e, i) => ({ i, e, open: false, done: false })))
  const [sel, setSel] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const { online } = useApp()
  useEffect(() => {
    if (sel.length !== 2) return
    const [a, b] = sel
    const t = setTimeout(() => {
      setCards((c) => c.map((x) => (x.i === a || x.i === b ? (c[a].e === c[b].e ? { ...x, done: true } : { ...x, open: false }) : x)))
      setSel([])
    }, 600)
    return () => clearTimeout(t)
  }, [sel])
  const won = cards.every((c) => c.done)
  useEffect(() => { if (won && !fired.current) { fired.current = true; onWin(moves) } }, [won, onWin, moves])
  return (
    <div>
      <div className="mb-3 flex justify-between text-sm text-ink/60"><span>จับคู่ขนมให้ครบ!</span><span>ครั้ง: {moves}</span></div>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((c) => (
          <motion.button key={c.i} whileTap={{ scale: 0.9 }} onClick={() => { if (c.open || c.done || sel.length === 2) return; setCards((cs) => cs.map((x) => (x.i === c.i ? { ...x, open: true } : x))); setSel((s) => [...s, c.i]); setMoves((m) => m + (sel.length === 1 ? 1 : 0)) }}
            animate={{ rotateY: c.open || c.done ? 180 : 0 }} transition={{ duration: 0.35 }}
            className={`grid aspect-square place-items-center rounded-2xl text-3xl ${c.done ? 'bg-mint/60' : c.open ? 'bg-white' : 'btn-primary'}`}>
            <span style={{ transform: 'rotateY(180deg)' }}>{c.open || c.done ? c.e : ''}</span>
            {!(c.open || c.done) && <span className="text-white/80 text-lg">?</span>}
          </motion.button>
        ))}
      </div>
      {won && <div className="mt-4 rounded-2xl bg-mint/40 p-3 text-center font-semibold">🎉 ชนะแล้ว ใน {moves} ครั้ง! {online ? 'กำลังส่งผลไปที่เซิร์ฟเวอร์…' : 'ได้รับ 50 พอยท์'}</div>}
    </div>
  )
}

export default function Game() {
  const app = useApp()
  const { d } = app
  const [open, setOpen] = useState<string | null>(null)
  const [round, setRound] = useState(0)
  const g = GAMES.find((x) => x.id === open)
  const best = (k: string, v: number) => app.up((x) => ({ ...x, best: { ...x.best, [k]: Math.max(x.best[k] ?? 0, v) } }))
  const t0 = useRef(Date.now())
  useEffect(() => { t0.current = Date.now() }, [round])
  /** Online: the server validates the run and awards points. */
  const submit = (game: string, body: Record<string, unknown>) =>
    app.act<{ points: number; capped: boolean; label: string; eggId?: string }>(`/games/${game}/score`, { ...body, durationMs: Date.now() - t0.current }).then((r) => {
      if (!r) return
      app.toast(r.points ? `${r.label} +${r.points} P` : r.capped ? 'ครบเพดานพอยท์จากเกมนี้วันนี้แล้ว' : r.label, r.eggId ? '🥚' : '🎮')
      if (r.eggId) app.notify({ text: 'ได้ไข่จากเกม Adventure! ไปดูที่ตู้ฟักไข่', emoji: '🥚', to: 'pets' })
    })
  const onPuzzle = useCallback((moves: number) => {
    if (app.online) { submit('puzzle', { moves }); return }
    app.earn(50, 'ชนะ Puzzle'); app.bumpDaily('puzzlePlays')
  }, [app.online]) // eslint-disable-line react-hooks/exhaustive-deps
  const onAdv = useCallback(({ gems, egg }: { gems: number; egg: boolean }) => {
    if (app.online) { submit('adventure', { gems, egg }); return }
    const pts = gems * 5 + (egg ? 40 : 0)
    if (egg) app.up((x) => ({ ...x, eggs: [...x.eggs, { id: uid('eg'), hue: '#A8E6CF', rarity: Math.random() < 0.3 ? 'Rare' : 'Common', start: Date.now(), dur: 25_000, source: 'จากเกม Adventure' }] }))
    if (pts) app.earn(pts, egg ? 'Adventure: เจอไข่!' : 'Adventure: เก็บเพชร')
    app.bumpDaily('advPlays'); best('g1', pts)
  }, [app.online]) // eslint-disable-line react-hooks/exhaustive-deps
  const onBattle = useCallback((win: boolean) => {
    if (app.online) { submit('battle', { win, petId: app.pet.id }); return }
    app.earn(win ? 80 : 10, win ? 'ชนะ Pet Battle' : 'ร่วมสนุก Pet Battle')
    app.updatePet(app.pet.id, (p) => ({ ...addXp(p, win ? 25 : 8), energy: Math.max(0, p.energy - 15), mood: Math.min(100, p.mood + (win ? 8 : -3)) }))
    if (win) { app.bumpDaily('battleWins'); app.up((x) => ({ ...x, best: { ...x.best, g2: (x.best.g2 ?? 0) + 1 } })) }
  }, [app.online, app.pet.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const onRun = useCallback((stars: number) => {
    if (app.online) { submit('runner', { stars }); return }
    const pts = Math.min(150, stars * 2)
    if (pts) app.earn(pts, `Runner: ${stars} ดาว`)
    app.bumpDaily('runnerPlays'); best('g3', stars)
  }, [app.online]) // eslint-disable-line react-hooks/exhaustive-deps
  const missions = [
    { id: 'walk', t: 'เดินครบ 5,000 ก้าว', v: d.steps, n: 5000, r: 100 },
    { id: 'feed', t: 'ให้อาหารสัตว์เลี้ยงเพื่อน 3 ครั้ง', v: d.daily.feedOthers, n: 3, r: 30 },
    { id: 'battle', t: 'ชนะ Pet Battle 1 ครั้ง', v: d.daily.battleWins, n: 1, r: 50 },
    { id: 'puzzle', t: 'เล่น Puzzle ชนะ 2 รอบ', v: d.daily.puzzlePlays, n: 2, r: 20 },
    { id: 'runner', t: 'เล่น Runner 1 รอบ', v: d.daily.runnerPlays, n: 1, r: 20 },
    { id: 'adv', t: 'ออกผจญภัย 1 รอบ', v: d.daily.advPlays, n: 1, r: 20 },
  ]
  const claim = (m: (typeof missions)[number]) => {
    if (app.online) { app.act(`/missions/${m.id}/claim`).then((r) => r && app.toast(`ภารกิจสำเร็จ +${m.r} P`, '🎯')); return }
    app.up((x) => ({ ...x, daily: { ...x.daily, claimed: [...x.daily.claimed, m.id] } })); app.earn(m.r, `ภารกิจ: ${m.t}`)
  }
  const myScore = d.steps + (d.best.g2 ?? 0) * 300
  const [serverBoard, setServerBoard] = useState<{ id: string; name: string; score: number }[] | null>(null)
  useEffect(() => {
    if (!app.online) return
    let live = true
    api<{ board: { id: string; name: string; score: number }[] }>('/games/leaderboard').then((r) => live && setServerBoard(r.board)).catch(() => {})
    return () => { live = false }
  }, [app.online, d.steps, d.best.g2])
  const localBoard = [{ n: byId('u1').name, s: 12840 }, { n: byId('u3').name, s: 11210 }, { n: byId('u5').name, s: 9930 }, { n: byId('u8').name, s: 6420 }, { n: `${app.user?.name} (คุณ)`, s: myScore, me: true }].sort((a, b) => b.s - a.s)
  const board = serverBoard ? serverBoard.map((b) => ({ n: b.id === 'me' ? `${b.name} (คุณ)` : b.name, s: b.score, me: b.id === 'me' })) : localBoard
  const rank = board.findIndex((b) => b.me) + 1
  const lowEnergy = app.pet.energy < 20
  return (
    <div>
      <PageTitle en="Mini Games" th="เกมสนุก ๆ" right={<span className="chip bg-white/80 text-plum-600"><Trophy size={12} className="inline" /> อันดับ #{rank}</span>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {GAMES.map((g, i) => (
          <motion.button key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -6, rotate: i % 2 ? 1 : -1 }} whileTap={{ scale: 0.96 }} onClick={() => { setRound((r) => r + 1); setOpen(g.id) }}
            className="relative aspect-[4/5] overflow-hidden rounded-[28px] p-4 text-left text-white shadow-[0_18px_40px_-18px_rgba(110,80,160,.6)]" style={{ background: `linear-gradient(160deg, ${g.grad[0]}, ${g.grad[1]})` }}>
            <div className="absolute -right-6 -top-6 text-[120px] opacity-30">{g.art}</div>
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent" />
            <span className="anim-float absolute left-1/2 top-[30%] -translate-x-1/2 text-7xl drop-shadow-xl">{g.emoji}</span>
            <div className="absolute bottom-4 left-4 right-4">
              <div className="text-xl font-bold drop-shadow">{g.name}</div>
              <div className="text-xs opacity-90">{g.th}</div>
              <div className="mt-2 flex items-center justify-between"><span className="chip bg-white/25 backdrop-blur">{d.best[g.id] ? `สถิติ ${d.best[g.id]}` : 'ยังไม่เคยเล่น'}</span><span className="grid h-9 w-9 place-items-center rounded-full bg-white text-plum-600"><Play size={16} fill="currentColor" /></span></div>
            </div>
          </motion.button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card delay={0.2}>
          <Header title="ภารกิจประจำวัน" sub="รีเซ็ตทุกวัน 00:01" />
          {missions.map((m) => {
            const done = m.v >= m.n, claimed = d.daily.claimed.includes(m.id)
            return (
              <div key={m.id} className="mb-2 flex items-center gap-3 rounded-2xl bg-white/70 p-3">
                <div className="flex-1"><div className="text-sm font-medium">{m.t} <span className="text-xs text-ink/40">({Math.min(m.v, m.n).toLocaleString()}/{m.n.toLocaleString()})</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-lav"><div className="h-full rounded-full bg-gradient-to-r from-mint to-plum" style={{ width: `${Math.min(100, (m.v / m.n) * 100)}%` }} /></div></div>
                {claimed ? <span className="text-xs font-semibold text-emerald-600">รับแล้ว ✓</span> : done ? <Btn className="!px-3 !py-1 text-xs" onClick={() => claim(m)}>รับ +{m.r}</Btn> : <span className="text-xs font-semibold text-plum-600">+{m.r} P</span>}
              </div>
            )
          })}
        </Card>
        <Card delay={0.25}>
          <Header title="กระดานผู้นำสัปดาห์นี้" sub="คะแนน = ก้าวเดิน + ชัยชนะ Pet Battle × 300" />
          {board.map((b, i) => (
            <div key={b.n + i} className={`mb-2 flex items-center gap-3 rounded-2xl p-3 ${b.me ? 'bg-lav' : 'bg-white/70'}`}><span className="w-6 text-center text-lg">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span><span className="flex-1 text-sm font-medium">{b.n}</span><span className="text-sm font-bold text-plum-600">{b.s.toLocaleString()}</span></div>
          ))}
        </Card>
      </div>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={g ? `${g.emoji} ${g.name} · ${g.th}` : ''}>
        {g?.id === 'g4' && <MemoryGame key={round} onWin={onPuzzle} />}
        {g?.id === 'g1' && <Adventure key={round} onEnd={onAdv} />}
        {g?.id === 'g3' && <Runner key={round} onEnd={onRun} />}
        {g?.id === 'g2' && (lowEnergy ? (
          <div className="py-6 text-center"><div className="text-5xl">😴</div><p className="mt-2 text-sm text-ink/60">น้อง {app.pet.name} พลังงานต่ำ ({Math.round(app.pet.energy)}%) ให้พักก่อนนะ</p><Btn className="mt-3" onClick={() => { setOpen(null); app.go('pets') }}>ไปพักผ่อนที่บ้าน</Btn></div>
        ) : <Battle key={round} pet={app.pet} onEnd={onBattle} />)}
      </Sheet>
    </div>
  )
}
