import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useApp } from '../store/AppStore'

export function Card({ className = '', children, delay = 0, ...rest }: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`glass rounded-[28px] p-4 sm:p-5 ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export function Header({ title, sub, right, icon }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/70 text-plum-600">{icon}</span>}
        <div className="min-w-0">
          <h3 className="title truncate">{title}</h3>
          {sub && <p className="text-xs text-ink/50 truncate">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

export function PageTitle({ en, th, right }: { en: string; th: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.25em] text-plum uppercase">{en}</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">{th}</h1>
      </div>
      {right}
    </div>
  )
}

export function Bar({ value, from, to, label, icon }: { value: number; from: string; to: string; label: string; icon: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-medium text-ink/70">
        <span>{icon} {label}</span><span>{Math.round(value)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/80 shadow-inner">
        <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ type: 'spring', stiffness: 80, damping: 18 }} />
      </div>
    </div>
  )
}

export function Btn({ children, variant = 'primary', className = '', ...rest }: HTMLMotionProps<'button'> & { variant?: 'primary' | 'ghost' | 'soft' }) {
  const v = variant === 'primary' ? 'btn-primary' : variant === 'soft' ? 'bg-lav text-plum-600' : 'bg-white/80 text-ink/80 border border-white'
  return (
    <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.95 }} className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${v} ${className}`} {...rest}>
      {children}
    </motion.button>
  )
}

export function Points({ n, className = '' }: { n: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${className}`}>
      <span className="grid h-4 w-4 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-[9px] text-white">P</span>
      {n.toLocaleString()}
    </span>
  )
}

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-plum-800/25 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="glass-strong relative z-10 w-full max-w-md rounded-t-[32px] p-5 pb-8 sm:rounded-[32px] max-h-[88vh] overflow-y-auto no-scrollbar"
            initial={{ y: 80, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-plum/20 sm:hidden" />
            <div className="mb-2 flex items-center justify-between">
              <h3 className="title">{title}</h3>
              <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-white/80 text-ink/60 hover:text-ink"><X size={16} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Toasts() {
  const { toasts } = useApp()
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ y: -30, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0 }} className="glass-strong rounded-full px-4 py-2 text-sm font-medium text-ink">
            {t.emoji} {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto no-scrollbar rounded-full bg-white/60 p-1">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} className={`relative shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${value === t.id ? 'text-white' : 'text-ink/60 hover:text-ink'}`}>
          {value === t.id && <motion.span layoutId={'tab-' + tabs.map((x) => x.id).join()} className="absolute inset-0 rounded-full btn-primary" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          <span className="relative">{t.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Rarity({ r }: { r?: string }) {
  if (!r) return null
  const m: Record<string, string> = { common: 'bg-white text-ink/60', rare: 'bg-sky-100 text-sky-600', epic: 'bg-violet-100 text-violet-600', legendary: 'bg-amber-100 text-amber-600' }
  return <span className={`chip !px-2 !py-0.5 !text-[10px] uppercase tracking-wide ${m[r.toLowerCase()] ?? m.common}`}>{r}</span>
}
