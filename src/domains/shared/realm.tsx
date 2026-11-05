import type { ReactNode } from 'react'

/** Hello runs two worlds in parallel. Every module belongs to exactly one. */
export type Realm = 'real' | 'digital'

export const REALM: Record<Realm, { th: string; en: string; emoji: string; tagline: string; grad: string; ring: string; text: string }> = {
  real: { th: 'โลกจริง', en: 'Real World', emoji: '🌏', tagline: 'ของจริง · คนจริง · นัดรับจริง', grad: 'linear-gradient(120deg,#DDF7E9cc,#DDF0FCcc 55%,#FFF3E4cc)', ring: '#7CC8A4', text: 'text-emerald-700' },
  digital: { th: 'โลกอวตาร', en: 'Avatar World', emoji: '✨', tagline: 'ไอเท็มดิจิทัล · ใช้ Hello Points เท่านั้น · ไม่ใช่ของจริง', grad: 'linear-gradient(120deg,#E6DBFAcc,#FDE4EFcc 55%,#FFF3C4cc)', ring: '#9B7EBD', text: 'text-plum-600' },
}

export function RealmChip({ realm, className = '' }: { realm: Realm; className?: string }) {
  const r = REALM[realm]
  return <span className={`chip !py-0.5 !text-[10px] font-semibold ${r.text} ${className}`} style={{ background: r.grad, boxShadow: `inset 0 0 0 1px ${r.ring}55` }}>{r.emoji} {r.th} · {r.en}</span>
}

/** Thin luxe banner placed under a PageTitle so users always know which world they are in. */
export function RealmBanner({ realm, children, right }: { realm: Realm; children?: ReactNode; right?: ReactNode }) {
  const r = REALM[realm]
  return (
    <div className="glass mb-4 flex items-center gap-3 overflow-hidden rounded-[22px] px-4 py-2.5" style={{ background: r.grad, boxShadow: `inset 0 0 0 1px ${r.ring}40, 0 10px 30px -18px ${r.ring}` }}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white/80 text-lg shadow-sm">{r.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className={`text-[11px] font-bold tracking-[0.18em] uppercase ${r.text}`}>{r.th} · {r.en}</div>
        <div className="truncate text-xs text-ink/65">{children ?? r.tagline}</div>
      </div>
      {right}
    </div>
  )
}
