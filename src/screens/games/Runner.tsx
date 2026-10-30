import { ArrowLeft, ArrowRight, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Btn } from '../../components/ui'

type Obj = { id: number; lane: number; y: number; kind: 'star' | 'gold' | 'rock' }
const DURATION = 30

export function Runner({ onEnd }: { onEnd: (stars: number) => void }) {
  const [state, setState] = useState<'ready' | 'run' | 'over'>('ready')
  const [, force] = useState(0)
  const g = useRef({ lane: 1, objs: [] as Obj[], stars: 0, lives: 3, t: 0, spawn: 0, id: 0, flash: 0 })
  const onEndRef = useRef(onEnd); onEndRef.current = onEnd
  const start = () => { g.current = { lane: 1, objs: [], stars: 0, lives: 3, t: 0, spawn: 0, id: 0, flash: 0 }; setState('run') }
  const steer = (d: number) => { g.current.lane = Math.max(0, Math.min(2, g.current.lane + d)); force((n) => n + 1) }
  useEffect(() => {
    if (state !== 'run') return
    let raf = 0, last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const s = g.current
      s.t += dt; s.spawn -= dt; s.flash = Math.max(0, s.flash - dt)
      const speed = 38 + s.t * 2.2 // % of track per second
      if (s.spawn <= 0) {
        s.spawn = Math.max(0.32, 0.75 - s.t * 0.012)
        const r = Math.random()
        s.objs.push({ id: s.id++, lane: Math.floor(Math.random() * 3), y: -8, kind: r < 0.07 ? 'gold' : r < 0.62 ? 'star' : 'rock' })
      }
      s.objs = s.objs.filter((o) => {
        o.y += speed * dt
        if (o.y > 78 && o.y < 92 && o.lane === s.lane) {
          if (o.kind === 'rock') { s.lives--; s.flash = 0.4 } else s.stars += o.kind === 'gold' ? 5 : 1
          return false
        }
        return o.y < 105
      })
      if (s.lives <= 0 || s.t >= DURATION) { setState('over'); onEndRef.current(s.stars); force((n) => n + 1); return }
      force((n) => n + 1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); steer(-1) } if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); steer(1) } }
    window.addEventListener('keydown', key)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', key) }
  }, [state])
  const s = g.current
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm font-medium"><span>{'❤️'.repeat(Math.max(0, s.lives))}{'🤍'.repeat(3 - Math.max(0, s.lives))}</span><span>⭐ {s.stars}</span><span>⏱️ {Math.max(0, Math.ceil(DURATION - s.t))} วิ</span></div>
      <div className={`relative h-[380px] touch-none select-none overflow-hidden rounded-3xl bg-gradient-to-b from-[#FDE7DA] via-[#F6E3F1] to-[#E9DEFB] ${s.flash > 0 ? 'ring-4 ring-rose-300' : ''}`}
        onPointerDown={(e) => { if (state !== 'run') return; const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); steer(e.clientX - r.left < r.width / 2 ? -1 : 1) }}>
        {[1, 2].map((k) => <div key={k} className="absolute inset-y-0 w-px bg-white/80" style={{ left: `${(k / 3) * 100}%` }} />)}
        {s.objs.map((o) => (
          <span key={o.id} className="absolute -translate-x-1/2 text-3xl" style={{ left: `${(o.lane + 0.5) * 33.33}%`, top: `${o.y}%` }}>{o.kind === 'rock' ? '🪨' : o.kind === 'gold' ? '🌟' : '⭐'}</span>
        ))}
        <span className="absolute bottom-[6%] -translate-x-1/2 text-4xl transition-[left] duration-100" style={{ left: `${(s.lane + 0.5) * 33.33}%` }}>🐉</span>
        {state !== 'run' && (
          <div className="absolute inset-0 grid place-items-center bg-white/40 backdrop-blur-sm">
            <div className="text-center">
              {state === 'over' && <><div className="text-3xl font-bold text-plum-600">⭐ {s.stars}</div><div className="mb-3 text-sm text-ink/60">ได้รับ {Math.min(150, s.stars * 2)} P</div></>}
              {state === 'ready' && <p className="mb-3 px-6 text-sm text-ink/60">เก็บดาว ⭐ หลบหิน 🪨 ใน 30 วินาที<br />ใช้ ← → หรือแตะซ้าย/ขวา</p>}
              <Btn onClick={start}><Play size={14} /> {state === 'over' ? 'เล่นอีกครั้ง' : 'เริ่มวิ่ง!'}</Btn>
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
        <Btn variant="soft" onClick={() => steer(-1)}><ArrowLeft size={16} /></Btn>
        <Btn variant="soft" onClick={() => steer(1)}><ArrowRight size={16} /></Btn>
      </div>
    </div>
  )
}
