import { motion } from 'framer-motion'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Btn } from '../../components/ui'

const N = 7, MOVES = 24
type Cell = 'empty' | 'gem' | 'trap' | 'egg' | 'tree'
function makeMap(): Cell[] {
  const m: Cell[] = Array(N * N).fill('empty')
  const free = () => { let i; do { i = Math.floor(Math.random() * N * N) } while (m[i] !== 'empty' || i === start || Math.abs((i % N) - 3) + Math.abs(Math.floor(i / N) - 6) < 2); return i }
  const start = 6 * N + 3
  for (let k = 0; k < 6; k++) m[free()] = 'tree'
  for (let k = 0; k < 8; k++) m[free()] = 'gem'
  for (let k = 0; k < 4; k++) m[free()] = 'trap'
  m[free()] = 'egg'
  return m
}
const ICON: Record<Cell, string> = { empty: '', gem: '💎', trap: '🕸️', egg: '🥚', tree: '🌳' }

export function Adventure({ onEnd }: { onEnd: (r: { gems: number; egg: boolean }) => void }) {
  const [map, setMap] = useState(makeMap)
  const [pos, setPos] = useState({ x: 3, y: 6 })
  const [seen, setSeen] = useState<Set<number>>(() => new Set([45, 46, 47, 38, 39, 40, 44, 48].filter((i) => i >= 0)))
  const [moves, setMoves] = useState(MOVES)
  const [hearts, setHearts] = useState(3)
  const [gems, setGems] = useState(0)
  const [egg, setEgg] = useState(false)
  const [msg, setMsg] = useState('เดินสำรวจหาไข่ที่ซ่อนอยู่ในหมอก! 🌫️')
  const over = egg || moves <= 0 || hearts <= 0
  const [reported, setReported] = useState(false)
  useEffect(() => { if (over && !reported) { setReported(true); onEnd({ gems, egg }) } }, [over, reported, gems, egg, onEnd])
  const reveal = (x: number, y: number) => setSeen((s) => { const n = new Set(s); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < N && Y < N) n.add(Y * N + X) } return n })
  const move = useCallback((dx: number, dy: number) => {
    if (over) return
    const x = pos.x + dx, y = pos.y + dy
    if (x < 0 || y < 0 || x >= N || y >= N) return
    const i = y * N + x, c = map[i]
    if (c === 'tree') { setMsg('ต้นไม้ขวางทาง 🌳'); return }
    setPos({ x, y }); setMoves((m) => m - 1); reveal(x, y)
    if (c === 'gem') { setGems((g) => g + 1); setMsg('ได้เพชร! +5 P 💎') }
    if (c === 'trap') { setHearts((h) => h - 1); setMsg('ติดใยแมงมุม! เสียหัวใจ 1 ดวง 🕸️') }
    if (c === 'egg') { setEgg(true); setMsg('เจอไข่ลึกลับแล้ว! 🥚✨') }
    if (c === 'empty') setMsg(['ลมพัดเย็นสบาย 🍃', 'ได้ยินเสียงนกร้อง 🐦', 'ใกล้แล้วมั้งนะ… 👀'][Math.floor(Math.random() * 3)])
    if (c !== 'empty') setMap((m) => m.map((v, k) => (k === i && c !== 'trap' ? 'empty' : v)))
  }, [pos, map, over])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key]; if (d) { e.preventDefault(); move(d[0], d[1]) } }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [move])
  const reset = () => { setMap(makeMap()); setPos({ x: 3, y: 6 }); setSeen(new Set([45, 46, 47, 38, 39, 40, 44, 48])); setMoves(MOVES); setHearts(3); setGems(0); setEgg(false); setReported(false); setMsg('รอบใหม่! หาไข่ให้เจอ 🥚') }
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm font-medium"><span>{'❤️'.repeat(Math.max(0, hearts))}{'🤍'.repeat(3 - Math.max(0, hearts))}</span><span>💎 {gems}</span><span>👣 {moves}</span></div>
      <div className="grid gap-1 rounded-3xl bg-gradient-to-br from-[#CFEBDD] to-[#BFE0F5] p-2" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
        {map.map((c, i) => {
          const x = i % N, y = Math.floor(i / N), me = x === pos.x && y === pos.y, vis = seen.has(i)
          const adj = Math.abs(x - pos.x) + Math.abs(y - pos.y) === 1
          return (
            <button key={i} onClick={() => adj && move(x - pos.x, y - pos.y)} className={`relative grid aspect-square place-items-center rounded-lg text-lg transition-colors ${vis ? 'bg-white/70' : 'bg-plum/30'} ${adj && !over ? 'ring-2 ring-white/80' : ''}`}>
              {me ? <motion.span layoutId="adv-me" className="text-xl">🐉</motion.span> : vis ? ICON[c] : <span className="text-xs text-white/60">☁️</span>}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-center text-sm text-ink/60">{msg}</p>
      {!over ? (
        <div className="mx-auto mt-2 grid w-36 grid-cols-3 gap-1">
          <span /><Btn variant="soft" className="!p-2" onClick={() => move(0, -1)}><ArrowUp size={16} /></Btn><span />
          <Btn variant="soft" className="!p-2" onClick={() => move(-1, 0)}><ArrowLeft size={16} /></Btn><Btn variant="soft" className="!p-2" onClick={() => move(0, 1)}><ArrowDown size={16} /></Btn><Btn variant="soft" className="!p-2" onClick={() => move(1, 0)}><ArrowRight size={16} /></Btn>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-mint/40 p-3 text-center">
          <div className="font-semibold">{egg ? '🎉 สำเร็จ! ไข่ถูกส่งไปที่ตู้ฟักแล้ว' : hearts <= 0 ? '😵 หัวใจหมดแล้ว' : '⌛ ก้าวหมดแล้ว'}</div>
          <div className="text-sm text-ink/60">ได้รับ {gems * 5 + (egg ? 40 : 0)} P</div>
          <Btn className="mt-2" onClick={reset}><RotateCcw size={14} /> เล่นอีกครั้ง</Btn>
        </div>
      )}
    </div>
  )
}
