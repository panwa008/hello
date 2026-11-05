import { motion } from 'framer-motion'
import { Bell, Compass, Ellipsis, House, PawPrint, Search, MessageCircle, LogOut, CheckCheck } from 'lucide-react'
import { WORLDS } from '../domains/nav'
import { REALM } from '../domains/shared/realm'
import { useMemo, useState, type ReactNode } from 'react'
import { useApp, type Screen, type User as U } from '../store/AppStore'
import { Face, PawLogo } from './art'
import { Points, Sheet } from './ui'
import { ago } from '../lib/storage'

export { NAV } from '../domains/nav'

export const meFace = (u: Pick<U, 'hair' | 'skin' | 'gender'> | null) => ({ id: 'me', hair: u?.hair ?? '#7A4A35', skin: u?.skin ?? '#FCE0CF', bg: ['#FBE3EE', '#E6DBFA'] as [string, string], gender: u?.gender ?? ('f' as const) })
export function MeFace({ size = 36, ring }: { size?: number; ring?: string }) {
  const { user } = useApp()
  return <Face p={meFace(user)} size={size} ring={ring} />
}

const Badge = ({ n, className = '' }: { n: number; className?: string }) =>
  n > 0 ? <span className={`grid min-w-[18px] place-items-center rounded-full bg-pink px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-white ${className}`}>{n > 9 ? '9+' : n}</span> : null

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <PawLogo size={44} />
      <div>
        <div className="text-2xl font-extrabold leading-none tracking-tight bg-gradient-to-r from-plum-600 to-pink bg-clip-text text-transparent">Hello</div>
        <div className="mt-1 text-[9px] font-semibold tracking-[0.22em] text-plum">EXPLORE · CONNECT · PLAY</div>
      </div>
    </div>
  )
}

function Sidebar() {
  const { screen, go, d, user, unreadChats, d: { requests }, logout } = useApp()
  return (
    <aside className="glass sticky top-4 hidden h-[calc(100vh-2rem)] w-60 shrink-0 flex-col rounded-[32px] p-5 lg:flex">
      <Brand />
      <nav className="mt-5 flex-1 space-y-0.5 overflow-y-auto no-scrollbar">
        {WORLDS.map((g) => (
          <div key={g.key} className="pb-1">
            {g.key !== 'core' && <div className={`mx-1 mb-1 mt-3 flex items-center gap-1.5 rounded-xl px-2 py-1 text-[10px] font-bold tracking-[0.16em] uppercase ${g.key === 'real' || g.key === 'digital' ? REALM[g.key].text : 'text-ink/35'}`} style={g.key === 'real' || g.key === 'digital' ? { background: REALM[g.key].grad } : undefined}>{g.emoji} {g.th} <span className="font-medium opacity-60">· {g.en}</span></div>}
            {g.items.map((n) => {
              const active = screen === n.id
              const badge = n.id === 'chat' ? unreadChats : n.id === 'friends' ? requests.length : 0
              return (
                <button key={n.id} onClick={() => go(n.id)} className={`relative flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-colors ${active ? 'text-plum-600' : 'text-ink/60 hover:text-ink hover:bg-white/50'}`}>
                  {active && <motion.span layoutId="side-active" className="absolute inset-0 rounded-2xl bg-white shadow-[0_6px_18px_-8px_rgba(126,91,181,.45)]" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                  <n.icon size={18} className="relative" />
                  <span className="relative">{n.label}</span>
                  {badge > 0 ? <Badge n={badge} className="relative ml-auto" /> : <span className="relative ml-auto text-[10px] text-ink/30">{n.en}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </nav>
      <button onClick={() => go('wallet')} className="mt-3 rounded-3xl bg-gradient-to-br from-[#CDB8F2] to-[#9B7EBD] p-4 text-left text-white shadow-lg">
        <div className="text-xs opacity-80">Hello Points</div>
        <div className="text-2xl font-bold">✦ {d.points.toLocaleString()}</div>
        <div className="mt-2 rounded-full bg-white/90 py-1.5 text-center text-xs font-semibold text-plum-600">เติม / แลก</div>
      </button>
      <div className="mt-3 flex items-center gap-1">
        <button onClick={() => go('profile')} className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl p-1.5 hover:bg-white/50">
          <MeFace size={36} />
          <div className="min-w-0 text-left"><div className="truncate text-sm font-semibold">{user?.name}</div><div className="text-[11px] text-ink/50">Lv.{user?.level} · ออนไลน์</div></div>
        </button>
        <button title="ออกจากระบบ" onClick={logout} className="grid h-9 w-9 place-items-center rounded-full text-ink/40 hover:bg-white/70 hover:text-plum-600"><LogOut size={16} /></button>
      </div>
    </aside>
  )
}

function SearchBox() {
  const { people, d, go } = useApp()
  const [q, setQ] = useState('')
  const res = useMemo(() => (q.trim() ? people.filter((p) => p.status !== 'hidden' && (p.name + p.handle + (p.petName ?? '')).toLowerCase().includes(q.toLowerCase())).slice(0, 6) : []), [q, people])
  return (
    <div className="relative hidden flex-1 items-center gap-2 text-ink/40 sm:flex">
      <Search size={18} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาเพื่อน หรือสัตว์เลี้ยง..." className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/40" />
      {res.length > 0 && (
        <div className="glass-strong absolute left-0 top-10 z-50 w-80 rounded-3xl p-2">
          {res.map((p) => {
            const f = d.friends.includes(p.id)
            return (
              <button key={p.id} onClick={() => { setQ(''); go(f ? 'chat' : 'friends', p.id) }} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-white/70">
                <Face p={p} size={36} />
                <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-ink">{p.name}</div><div className="text-[11px] text-ink/50">{p.handle} · {p.distance} ม.</div></div>
                <span className="chip !text-[10px]">{f ? 'แชท' : 'ดูโปรไฟล์'}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TopBar({ onBell }: { onBell: () => void }) {
  const { d, go, unreadNotifs } = useApp()
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-4 px-4 pt-3 pb-2 sm:mx-0 sm:px-0">
      <div className="glass-strong flex items-center gap-3 rounded-full py-2 pl-3 pr-2 sm:pl-5">
        <div className="lg:hidden"><PawLogo size={32} /></div>
        <div className="lg:hidden text-lg font-extrabold text-plum-600">Hello</div>
        <SearchBox />
        <div className="flex-1 sm:hidden" />
        <button onClick={() => go('wallet')} className="rounded-full bg-white/80 px-3 py-1.5 text-sm"><Points n={d.points} /></button>
        <button onClick={onBell} aria-label="การแจ้งเตือน" className="relative grid h-9 w-9 place-items-center rounded-full bg-white/80 text-ink/70">
          <Bell size={18} /><Badge n={unreadNotifs} className="absolute -right-1 -top-1" />
        </button>
        <button onClick={() => go('profile')} className="hidden sm:block"><MeFace size={36} /></button>
      </div>
    </header>
  )
}

function Notifications({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { d, up, go } = useApp()
  const readAll = () => up((x) => ({ ...x, notifs: x.notifs.map((n) => ({ ...n, read: true })) }))
  return (
    <Sheet open={open} onClose={onClose} title="การแจ้งเตือน">
      <div className="mb-2 flex justify-end">
        <button onClick={readAll} className="flex items-center gap-1 text-xs font-semibold text-plum-600"><CheckCheck size={14} /> อ่านทั้งหมด</button>
      </div>
      {d.notifs.length === 0 && <p className="py-8 text-center text-sm text-ink/50">ยังไม่มีการแจ้งเตือน 🌙</p>}
      <div className="space-y-1.5">
        {d.notifs.map((n) => (
          <button key={n.id} onClick={() => { up((x) => ({ ...x, notifs: x.notifs.map((m) => (m.id === n.id ? { ...m, read: true } : m)) })); if (n.to) go(n.to, n.chat); onClose() }}
            className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ${n.read ? 'bg-white/50' : 'bg-white shadow-sm'}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lav text-lg">{n.emoji}</span>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{n.text}</div><div className="text-[11px] text-ink/45">{ago(n.time)}</div></div>
            {!n.read && <span className="h-2 w-2 rounded-full bg-pink" />}
          </button>
        ))}
      </div>
    </Sheet>
  )
}

function BottomNav({ onMore }: { onMore: () => void }) {
  const { screen, go, unreadChats } = useApp()
  const items: { id: Screen | 'moremenu'; label: string; icon: typeof House }[] = [
    { id: 'home', label: 'หน้าหลัก', icon: House },
    { id: 'explorer', label: 'สำรวจ', icon: Compass },
    { id: 'chat', label: 'แชท', icon: MessageCircle },
    { id: 'pets', label: 'สัตว์เลี้ยง', icon: PawPrint },
    { id: 'moremenu', label: 'เมนู', icon: Ellipsis },
  ]
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="glass-strong mx-auto flex max-w-md items-center justify-around rounded-[28px] px-2 py-2">
        {items.map((it) => {
          const active = screen === it.id
          return (
            <button key={it.id} onClick={() => (it.id === 'moremenu' ? onMore() : go(it.id))} className="relative flex w-16 flex-col items-center gap-0.5 py-1">
              {active && <motion.span layoutId="bottom-active" className="absolute inset-0 rounded-2xl bg-lav" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <it.icon size={20} className={`relative ${active ? 'text-plum-600' : 'text-ink/50'}`} />
              {it.id === 'chat' && <Badge n={unreadChats} className="absolute right-2 top-0" />}
              <span className={`relative text-[10px] font-medium ${active ? 'text-plum-600' : 'text-ink/50'}`}>{it.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const [more, setMore] = useState(false)
  const [bell, setBell] = useState(false)
  const { go, logout } = useApp()
  return (
    <div className="mx-auto flex max-w-[1440px] gap-5 px-4 pb-28 lg:p-4 lg:pb-8">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <TopBar onBell={() => setBell(true)} />
        {children}
      </main>
      <BottomNav onMore={() => setMore(true)} />
      <Notifications open={bell} onClose={() => setBell(false)} />
      <Sheet open={more} onClose={() => setMore(false)} title="เมนูทั้งหมด">
        <div className="space-y-4 pt-1">
          {WORLDS.map((g) => {
            const realm = g.key === 'real' || g.key === 'digital' ? REALM[g.key] : null
            return (
              <section key={g.key} className={realm ? 'rounded-[24px] p-3' : ''} style={realm ? { background: realm.grad } : undefined}>
                <div className="mb-2 flex items-baseline gap-2 px-1">
                  <span className={`text-xs font-bold ${realm ? realm.text : 'text-ink/50'}`}>{g.emoji} {g.th}</span>
                  <span className="text-[10px] tracking-[0.15em] text-ink/40 uppercase">{g.en}</span>
                  {realm && <span className="ml-auto truncate text-[10px] text-ink/45">{realm.tagline}</span>}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {g.items.map((n) => (
                    <motion.button whileTap={{ scale: 0.92 }} key={n.id} onClick={() => { go(n.id); setMore(false) }} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/75 p-2.5">
                      <n.icon size={22} className="text-plum-600" />
                      <span className="text-center text-[11px] font-medium leading-tight text-ink/70">{n.label}</span>
                    </motion.button>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
        <button onClick={() => { setMore(false); logout() }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/70 py-3 text-sm font-semibold text-rose-500"><LogOut size={16} /> ออกจากระบบ</button>
      </Sheet>
    </div>
  )
}
