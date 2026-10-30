import { motion } from 'framer-motion'
import { useApp } from '../store/AppStore'
import { STATUS } from '../data/status'
import type { Person } from '../data/types'
import { zone } from '../lib/rules'
import { Face } from './art'
import { MeFace } from './Layout'

export type RadarFilter = 'all' | 'near' | 'mid' | 'far'

function radius(d: number) {
  if (d <= 200) return (d / 200) * 0.34
  if (d <= 500) return 0.34 + ((d - 200) / 300) * 0.34
  return Math.min(0.94, 0.68 + ((d - 500) / 300) * 0.24)
}

function MapBg() {
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <rect width="400" height="400" fill="#F4F1FA" />
      <path d="M-10 300 C80 260 140 330 230 290 S360 230 420 260 V320 C360 290 300 340 230 340 S90 310 -10 350Z" fill="#CFE6FA" />
      <ellipse cx="90" cy="110" rx="70" ry="48" fill="#D8F2E4" />
      <ellipse cx="320" cy="90" rx="50" ry="36" fill="#D8F2E4" />
      <ellipse cx="300" cy="360" rx="60" ry="30" fill="#D8F2E4" />
      <circle cx="80" cy="100" r="7" fill="#BDE7CF" /><circle cx="105" cy="120" r="9" fill="#BDE7CF" /><circle cx="330" cy="85" r="8" fill="#BDE7CF" />
      <g stroke="#fff" strokeWidth="10" fill="none" strokeLinecap="round">
        <path d="M0 200 H400" /><path d="M200 0 V400" /><path d="M0 60 L400 160" /><path d="M60 400 L160 0" />
        <path d="M260 0 L380 400" />
      </g>
      <g stroke="#ECE6F6" strokeWidth="4" fill="none">
        <path d="M0 130 H400" /><path d="M0 250 H400" /><path d="M120 0 V400" /><path d="M300 0 V400" />
      </g>
      {[[150, 150], [240, 120], [170, 260], [260, 240], [330, 180], [60, 220], [110, 320]].map(([x, y], i) => <rect key={i} x={x} y={y} width="26" height="18" rx="4" fill="#E9E2F5" />)}
    </svg>
  )
}

export interface RadarEgg { id: string; distance: number; angle: number; rarity?: string }
/** What the viewer may see of a person: the server decides when online (clear ≤200 m, blur ≤500 m, dot beyond). */
export const visOf = (p: Person) => p.visibility ?? (zone(p.distance) === 'near' ? 'clear' : zone(p.distance) === 'mid' ? 'blur' : 'dot')
export const isDot = (p: Person) => visOf(p) === 'dot' || p.id.startsWith('anon_')

export function Radar({ filter = 'all', onPick, compact = false, eggs = [], onEgg }: { filter?: RadarFilter; onPick?: (p: Person) => void; compact?: boolean; eggs?: RadarEgg[]; onEgg?: (e: RadarEgg) => void }) {
  const { people: all, d, walkSim, toast } = useApp()
  const people = all.filter((p) => filter === 'all' || zone(p.distance) === filter)
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[24px]">
      <MapBg />
      {/* rings */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="absolute rounded-full border-2 border-dashed border-plum/25" style={{ width: '96%', height: '96%' }} />
        <div className="absolute rounded-full border-2 border-sky-300/70 bg-sky-200/20" style={{ width: '68%', height: '68%' }} />
        <div className="absolute rounded-full border-2 border-emerald-300/80 bg-emerald-200/25" style={{ width: '34%', height: '34%' }} />
        {/* sweep */}
        <div className="anim-sweep absolute rounded-full" style={{ width: '68%', height: '68%', background: 'conic-gradient(from 0deg, rgba(155,126,189,0.28), transparent 25%)' }} />
      </div>
      {!compact && (
        <>
          <span className="chip absolute left-1/2 top-[33%] -translate-x-1/2 bg-emerald-100/90 text-emerald-600">200 ม.</span>
          <span className="chip absolute left-1/2 top-[16%] -translate-x-1/2 bg-sky-100/90 text-sky-600">500 ม.</span>
        </>
      )}
      {/* people */}
      {people.map((p, i) => {
        const r = radius(p.distance)
        const a = (p.angle * Math.PI) / 180
        const x = 50 + Math.cos(a) * r * 50
        const y = 50 + Math.sin(a) * r * 50
        const vis = visOf(p)
        const z = vis === 'clear' ? 'near' : vis === 'blur' ? 'mid' : 'far'
        const s = STATUS[p.status]
        const size = compact ? 26 : 40
        return (
          <motion.button
            key={p.id}
            onClick={() => (isDot(p) ? toast(`${s.th} · ห่างประมาณ ${p.distance} ม. — เข้าใกล้กว่านี้เพื่อดูโปรไฟล์`, '📍') : onPick?.(p))}
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 + i * 0.03, type: 'spring' }}
            whileHover={{ scale: 1.15, zIndex: 20 }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%`, transition: 'left 1s linear, top 1s linear' }}
            title={z === 'near' ? p.name : s.th}
          >
            {z === 'far' ? (
              <span className="block h-3 w-3 rounded-full ring-2 ring-white" style={{ background: s.color, boxShadow: `0 0 10px ${s.color}` }} />
            ) : p.status === 'hidden' ? (
              <span className="grid place-items-center rounded-full text-white ring-[3px] ring-white" style={{ width: size * 0.8, height: size * 0.8, background: s.color, filter: z === 'mid' ? 'blur(1.5px)' : undefined }}>?</span>
            ) : (
              <span className="relative block">
                <span style={{ filter: z === 'mid' ? 'blur(3px) saturate(.7)' : undefined, display: 'block' }}>
                  <Face p={p} size={z === 'mid' ? size * 0.8 : size} ring={s.color} />
                </span>
                {z === 'near' && p.petEmoji && !compact && <span className="absolute -bottom-1 -right-2 text-sm drop-shadow">{p.petEmoji}</span>}
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-white" style={{ background: s.color }} />
              </span>
            )}
          </motion.button>
        )
      })}
      {eggs.map((egg) => {
        const r = radius(egg.distance), a = (egg.angle * Math.PI) / 180
        return (
          <button key={egg.id} onClick={() => onEgg?.(egg)} title={`ไข่ลึกลับ ${egg.rarity ?? ''} · ${egg.distance} ม.`} className="absolute -translate-x-1/2 -translate-y-1/2 text-2xl anim-float" style={{ left: `${50 + Math.cos(a) * r * 50}%`, top: `${50 + Math.sin(a) * r * 50}%`, transition: 'left 1s linear, top 1s linear', filter: zone(egg.distance) === 'near' ? 'drop-shadow(0 0 8px #F5A9C5)' : 'grayscale(.5) opacity(.7)' }}>🥚</button>
        )
      })}
      {/* me */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute inset-0 rounded-full bg-plum/40" style={{ animation: 'pulse-ring 2s ease-out infinite' }} />
        <div className="relative rounded-full ring-4 ring-white shadow-xl" style={{ opacity: d.privacy === 'invisible' ? 0.35 : d.privacy === 'ghost' ? 0.6 : 1, filter: d.privacy === 'ghost' ? 'grayscale(.6)' : undefined }}><MeFace size={compact ? 34 : 54} ring="#9B7EBD" /></div>
        {d.privacy === 'ghost' && <span className="absolute -left-4 -top-2 text-lg">👻</span>}
        {!compact && d.walking && d.settings.petVisible && <span className="absolute -bottom-2 -right-4 text-xl anim-float">🐉</span>}
        {!compact && walkSim && <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">🚶 กำลังเดิน</span>}
      </div>
    </div>
  )
}
