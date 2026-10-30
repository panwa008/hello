import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Search, Send, Smile, Hand, Lock } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Face } from '../components/art'
import { MeFace } from '../components/Layout'
import { Card, PageTitle } from '../components/ui'
import { byId } from '../data/mock'
import { STATUS } from '../data/status'
import { canMessage, zone } from '../lib/rules'
import { useApp } from '../store/AppStore'
import { ago, clock } from '../lib/storage'

const STICKERS = ['👋', '💜', '🐉', '🥚', '😂', '🥰', '🌸', '☕', '👣', '✨']

function Inbox({ active, onOpen }: { active: string | null; onOpen: (id: string) => void }) {
  const { d, typing, isOnline } = useApp()
  const [q, setQ] = useState('')
  const threads = useMemo(() => {
    const ids = new Set([...Object.keys(d.chats).filter((k) => d.chats[k].length), ...d.friends])
    return [...ids].map((id) => ({ id, p: byId(id), last: d.chats[id]?.[d.chats[id].length - 1] }))
      .filter((t) => t.p && t.p.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (b.last?.time ?? 0) - (a.last?.time ?? 0))
  }, [d.chats, d.friends, q])
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-ink/40"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาแชท..." className="w-full bg-transparent text-sm text-ink outline-none" /></div>
      <div className="space-y-1">
        {threads.map(({ id, p, last }) => {
          const un = d.unread[id] ?? 0
          return (
            <button key={id} onClick={() => onOpen(id)} className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors ${active === id ? 'bg-white shadow-sm' : 'hover:bg-white/60'}`}>
              <div className="relative"><Face p={p} size={46} ring={STATUS[p.status].color} />{(isOnline(id) || zone(p.distance) === 'near') && <span title={isOnline(id) ? 'ออนไลน์' : 'อยู่ใกล้'} className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white ${isOnline(id) ? 'bg-emerald-400' : 'bg-sky-300'}`} />}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className={`text-sm ${un ? 'font-bold' : 'font-semibold'}`}>{p.name}</span>{!d.friends.includes(id) && <span className="chip !px-1.5 !py-0 !text-[9px]">ใกล้เคียง</span>}<span className="ml-auto text-[10px] text-ink/40">{last ? ago(last.time) : ''}</span></div>
                <div className={`truncate text-xs ${un ? 'font-semibold text-ink' : 'text-ink/50'}`}>{typing[id] ? <i className="text-plum-600">กำลังพิมพ์...</i> : last ? (last.from === 'me' ? 'คุณ: ' : '') + last.text : 'เริ่มแชทกันเลย 👋'}</div>
              </div>
              {un > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-pink px-1 text-[10px] font-bold text-white">{un}</span>}
            </button>
          )
        })}
        {threads.length === 0 && <p className="py-8 text-center text-sm text-ink/45">ยังไม่มีแชท ลองไปทักคนใกล้ ๆ ที่หน้าสำรวจ 🧭</p>}
      </div>
    </div>
  )
}

function Thread({ id, onBack }: { id: string; onBack: () => void }) {
  const app = useApp()
  const { d, typing, user } = app
  const p = app.person(id)
  const msgs = d.chats[id] ?? []
  const [text, setText] = useState('')
  const [stick, setStick] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const isFriend = d.friends.includes(id)
  const allowed = canMessage(p, { isFriend, myGender: user?.gender ?? 'f', myStatus: d.relationship }) && (isFriend || zone(p.distance) !== 'far') || (p.status !== 'hidden' && msgs.some((m) => m.kind === 'market'))
  useEffect(() => { app.markRead(id) }, [id, msgs.length]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs.length, typing[id]])
  const send = (t: string, kind?: 'wave') => { if (!allowed) return; app.sendMsg(id, t, kind); setText(''); setStick(false) }
  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[460px] flex-col lg:h-[calc(100vh-10rem)]">
      <div className="flex items-center gap-3 border-b border-plum/10 pb-3">
        <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-full bg-white/80 md:hidden"><ArrowLeft size={18} /></button>
        <Face p={p} size={42} ring={STATUS[p.status].color} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{p.name} {p.petEmoji}</div>
          <div className="text-[11px] text-ink/50">{typing[id] ? 'กำลังพิมพ์...' : `${STATUS[p.status].th} · ห่าง ${p.distance} ม.`}</div>
        </div>
        <button onClick={() => send('👋 โบกมือทักทาย', 'wave')} disabled={!allowed} className="grid h-9 w-9 place-items-center rounded-full bg-white/80 text-plum-600 disabled:opacity-40" title="โบกมือ"><Hand size={16} /></button>
      </div>
      <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto py-4">
        {msgs.length === 0 && <div className="py-10 text-center text-sm text-ink/45"><div className="mb-2 text-4xl">👋</div>เริ่มต้นทักทาย {p.name} กันเลย</div>}
        {msgs.map((m, i) => {
          const me = m.from === 'me'
          const showTime = i === 0 || m.time - msgs[i - 1].time > 10 * 60_000
          const big = /^\p{Extended_Pictographic}+$/u.test(m.text)
          return (
            <div key={m.id}>
              {showTime && <div className="my-2 text-center text-[10px] text-ink/40">{ago(m.time)} · {clock(m.time)}</div>}
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex items-end gap-2 ${me ? 'justify-end' : ''}`}>
                {!me && <Face p={p} size={26} />}
                <div className={big ? 'text-4xl' : `max-w-[75%] rounded-3xl px-4 py-2 text-sm ${me ? 'btn-primary rounded-br-md text-white' : 'rounded-bl-md bg-white'}`}>{m.text}</div>
                {me && <MeFace size={22} />}
              </motion.div>
            </div>
          )
        })}
        <AnimatePresence>
          {typing[id] && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-end gap-2">
              <Face p={p} size={26} />
              <div className="flex gap-1 rounded-3xl rounded-bl-md bg-white px-4 py-3">{[0, 1, 2].map((k) => <motion.span key={k} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: k * 0.15 }} className="h-1.5 w-1.5 rounded-full bg-plum/50" />)}</div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={end} />
      </div>
      {allowed ? (
        <>
          <AnimatePresence>{stick && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="flex flex-wrap gap-2 pb-2">{STICKERS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-2xl bg-white/80 px-2.5 py-1.5 text-2xl hover:bg-white">{s}</button>)}</div>
            </motion.div>
          )}</AnimatePresence>
          <form onSubmit={(e) => { e.preventDefault(); send(text) }} className="flex items-center gap-2">
            <button type="button" onClick={() => setStick(!stick)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/80 text-amber-500"><Smile size={20} /></button>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์ข้อความ..." className="min-w-0 flex-1 rounded-full bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-plum/30" />
            <button className="btn-primary grid h-11 w-11 shrink-0 place-items-center rounded-full text-white"><Send size={18} /></button>
          </form>
        </>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl bg-white/70 p-3 text-sm text-ink/60"><Lock size={16} /> ตอนนี้ส่งข้อความไม่ได้ — {STATUS[p.status].rule}</div>
      )}
    </div>
  )
}

export default function Chat() {
  const { chatWith, go, unreadChats } = useApp()
  const open = (id: string | null) => go('chat', id)
  return (
    <div>
      <PageTitle en="Chat" th="ข้อความ" right={<span className="chip bg-white/80 text-plum-600">{unreadChats ? `${unreadChats} ยังไม่อ่าน` : 'อ่านครบแล้ว ✨'}</span>} />
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Card className={chatWith ? 'hidden md:block' : ''}><Inbox active={chatWith} onOpen={open} /></Card>
        <Card className={chatWith ? '' : 'hidden md:block'}>
          {chatWith && byId(chatWith) ? <Thread key={chatWith} id={chatWith} onBack={() => open(null)} /> : (
            <div className="grid h-[420px] place-items-center text-center text-ink/45"><div><div className="mb-2 text-5xl">💬</div>เลือกแชทจากรายการ<br /><span className="text-xs">หรือไปทักคนใกล้ ๆ ที่หน้าสำรวจ</span></div></div>
          )}
        </Card>
      </div>
    </div>
  )
}
