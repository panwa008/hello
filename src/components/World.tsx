import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useApp, useNow } from '../store/AppStore'
import { bkkHour, worldMood, type CareKey } from '../lib/world'
import type { PetData } from '../store/AppStore'

/** Short Thai mood phrase for a pet. */
export function petMoodLine(p: PetData, care?: Record<CareKey, boolean>, d = new Date()) {
  const h = bkkHour(d)
  if (p.hunger < 35) return { th: 'หิวแล้ว… ขอขนมหน่อย', emoji: '🍖', tag: 'หิว' }
  if (h >= 22 || h < 6 || p.energy < 25) return { th: 'ง่วงตอนดึก หาวแล้ว~', emoji: '😴', tag: 'ง่วง' }
  if (care?.walk) return { th: 'อารมณ์ดีหลังเดินเล่น', emoji: '🌸', tag: 'อารมณ์ดี' }
  if (care?.play) return { th: 'ยังตื่นเต้นจากเกมเมื่อกี้', emoji: '⚽', tag: 'อารมณ์ดี' }
  if (p.mood < 45) return { th: 'เหงานิดหน่อย อยากให้เล่นด้วย', emoji: '🥺', tag: 'เหงา' }
  return { th: 'อารมณ์ดี พร้อมออกสำรวจ!', emoji: '💖', tag: 'อารมณ์ดี' }
}

export function LivingWorldBanner({ nearestEgg }: { nearestEgg?: number }) {
  const { d, pet, go, world } = useApp()
  const now = useNow(60_000)
  const m = worldMood(new Date(now))
  const mood = petMoodLine(pet, world.care)
  const toNext = 100 - ((d.steps - d.redeemed) % 100)
  const dark = m.kind === 'night'
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass relative overflow-hidden rounded-[28px] p-4 sm:p-5" style={{ background: m.grad }}>
      <motion.span className="pointer-events-none absolute -right-2 -top-3 text-7xl opacity-70" animate={{ y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity }}>{m.emoji}</motion.span>
      {m.kind === 'rain' && <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(105deg, transparent 0 14px, rgba(255,255,255,.9) 14px 15px)' }} />}
      <div className={`relative ${dark ? 'text-white' : 'text-ink'}`}>
        <div className={`text-[11px] font-semibold uppercase tracking-wide ${dark ? 'text-white/70' : 'text-ink/50'}`}>Living World · โลกวันนี้</div>
        <div className="mt-0.5 text-xl font-bold">{m.part} {m.th}</div>
        <div className={`text-xs ${dark ? 'text-white/75' : 'text-ink/55'}`}>{m.en} · วันนี้โลกมีอะไรใหม่บ้าง~</div>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <button onClick={() => go('explorer')} className="rounded-2xl bg-white/65 px-3 py-2 text-left text-ink backdrop-blur hover:bg-white/85">
            <div className="text-[11px] text-ink/50">ไข่ใกล้สุด</div>
            <div className="font-semibold">🥚 {nearestEgg != null ? `${nearestEgg} ม.` : 'ออกไปสแกนดูสิ'}</div>
          </button>
          <button onClick={() => go('pets')} className="rounded-2xl bg-white/65 px-3 py-2 text-left text-ink backdrop-blur hover:bg-white/85">
            <div className="text-[11px] text-ink/50">น้อง {pet.name} ตอนนี้</div>
            <div className="truncate font-semibold">{mood.emoji} {mood.tag} · {mood.th}</div>
          </button>
          <button onClick={() => go('wallet')} className="rounded-2xl bg-white/65 px-3 py-2 text-left text-ink backdrop-blur hover:bg-white/85">
            <div className="text-[11px] text-ink/50">ก้าวถึงพอยท์ถัดไป</div>
            <div className="font-semibold">👣 อีก {toNext} ก้าว <span className="text-xs font-normal text-ink/50">({d.steps.toLocaleString()} วันนี้)</span></div>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export function DailyQuests({ compact = false }: { compact?: boolean }) {
  const { world, claimQuest, go } = useApp()
  const done = world.quests.filter((q) => q.claimed).length
  const jump: Record<string, () => void> = { walk: () => go('explorer'), greet: () => go('explorer'), care: () => go('pets') }
  return (
    <div className="glass rounded-[28px] p-4">
      <div className="mb-2 flex items-center justify-between">
        <div><div className="font-semibold">ภารกิจวันนี้ <span className="text-xs font-normal text-ink/45">Daily Quests</span></div><div className="text-[11px] text-ink/45">รีเซ็ตทุกเที่ยงคืน (เวลาไทย)</div></div>
        <span className="chip bg-lav text-plum-600">{done}/3 สำเร็จ</span>
      </div>
      <div className="space-y-2">
        {world.quests.map((q) => (
          <div key={q.id} className="flex items-center gap-3 rounded-2xl bg-white/65 p-2.5">
            <button onClick={jump[q.id]} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-xl">{q.emoji}</button>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-sm font-semibold"><span className="truncate">{q.titleTh}</span><span className="shrink-0 text-[11px] font-normal text-ink/45">{q.progress.toLocaleString()}/{q.target.toLocaleString()}</span></div>
              {!compact && <div className="text-[10px] text-ink/40">{q.titleEn}</div>}
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-plum/10">
                <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#A8E6CF,#9B7EBD)' }} initial={false} animate={{ width: `${(q.progress / q.target) * 100}%` }} />
              </div>
            </div>
            {q.claimed ? <span className="chip bg-mint/60 text-emerald-700">✓ รับแล้ว</span>
              : q.completed ? <motion.button whileTap={{ scale: 0.9 }} animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} onClick={() => claimQuest(q.id)} className="btn-primary rounded-full px-3 py-1.5 text-xs font-semibold text-white">รับ +{q.rewardPoints}</motion.button>
              : <span className="chip bg-white text-ink/45">+{q.rewardPoints} P</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

/** First-session tip: walk → collect egg → hatch. Shows until dismissed or a pet was hatched. */
export function FirstTip() {
  const { d, world, dismissTip, go, online } = useApp()
  const hatchedAny = online ? d.pets.length > 1 : d.pets.some((p) => !['pt1', 'pt2', 'pt3'].includes(p.id))
  const show = !world.tipDismissed && !hatchedAny
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 rounded-full bg-white/75 py-1.5 pl-3 pr-1.5 text-xs text-ink/70 shadow-sm backdrop-blur">
          <span>💡</span>
          <button onClick={() => go('explorer')} className="flex-1 text-left">เริ่มแบบนี้: <b>เดิน 👣</b> → <b>เก็บไข่ 🥚</b> → <b>ฟักที่บ้านน้อง 🐣</b></button>
          <button aria-label="ปิดคำแนะนำ" onClick={dismissTip} className="grid h-6 w-6 place-items-center rounded-full hover:bg-white"><X size={12} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
