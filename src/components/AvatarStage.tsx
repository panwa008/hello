import { motion } from 'framer-motion'
import { RotateCcw, RotateCw } from 'lucide-react'
import { useState } from 'react'
import type { Outfit } from '../store/AppStore'
import { AvatarFigure } from './AvatarFigure'

export function AvatarStage({ outfit, height = 340, className = '' }: { outfit: Outfit; height?: number; className?: string }) {
  const [angle, setAngle] = useState(0)
  const norm = ((angle % 360) + 360) % 360
  const back = norm > 90 && norm < 270
  return (
    <div className={`relative overflow-hidden rounded-[26px] ${className}`} style={{ background: 'radial-gradient(circle at 50% 30%, #fff 0%, #F1E9FC 45%, #E3D6F6 100%)' }}>
      <div className="absolute inset-x-0 bottom-6 mx-auto h-10 w-56 rounded-[50%] bg-white/70 shadow-[0_0_40px_rgba(155,126,189,.35)]" />
      {Array.from({ length: 8 }).map((_, i) => <span key={i} className="anim-sparkle absolute text-plum/40" style={{ left: `${10 + i * 11}%`, top: `${12 + (i * 23) % 60}%`, animationDelay: `${i * 0.3}s` }}>✦</span>)}
      <div className="relative flex justify-center pt-4 pb-6" style={{ perspective: 800 }}>
        <motion.div animate={{ rotateY: angle }} transition={{ type: 'spring', stiffness: 90, damping: 16 }} style={{ transformStyle: 'preserve-3d' }} className="anim-breathe">
          <div style={{ transform: back ? 'scaleX(-1)' : undefined }}><AvatarFigure outfit={outfit} back={back} height={height} /></div>
        </motion.div>
      </div>
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAngle((a) => a - 45)} className="glass grid h-10 w-10 place-items-center rounded-full text-plum-600"><RotateCcw size={18} /></motion.button>
        <span className="glass rounded-full px-3 py-2 text-xs font-medium text-ink/60">{back ? 'ด้านหลัง' : norm === 0 ? 'ด้านหน้า' : 'ด้านข้าง'} · {norm}°</span>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAngle((a) => a + 45)} className="glass grid h-10 w-10 place-items-center rounded-full text-plum-600"><RotateCw size={18} /></motion.button>
      </div>
    </div>
  )
}
