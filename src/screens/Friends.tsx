import { motion } from 'framer-motion'
import { Check, MessageCircle, Search, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { Face } from '../components/art'
import { PersonSheet } from '../components/PersonSheet'
import { Btn, Card, Header, PageTitle, Tabs } from '../components/ui'
import { byId, SUGGEST_IDS } from '../data/mock'
import { STATUS } from '../data/status'
import type { Person } from '../data/types'
import { useApp } from '../store/AppStore'

export default function Friends() {
  const app = useApp()
  const [tab, setTab] = useState<'all' | 'online' | 'pets'>('all')
  const [q, setQ] = useState('')
  const [pick, setPick] = useState<Person | null>(null)
  const accept = (id: string) => {
    if (app.online) { app.act(`/friends/${id}/accept`).then((r) => r && app.toast(`เป็นเพื่อนกับ ${byId(id).name} แล้ว`, '🫶')); return }
    app.up((x) => ({ ...x, friends: [id, ...x.friends], requests: x.requests.filter((r) => r !== id) })); app.toast(`เป็นเพื่อนกับ ${byId(id).name} แล้ว`, '🫶'); app.earn(10, 'เพื่อนใหม่')
  }
  const decline = (id: string) => {
    if (app.online) { app.act(`/friends/${id}/decline`).then((r) => r && app.toast('ปฏิเสธคำขอแล้ว', '🙅')); return }
    app.up((x) => ({ ...x, requests: x.requests.filter((r) => r !== id) })); app.toast('ปฏิเสธคำขอแล้ว', '🙅')
  }
  let list = app.d.friends.map((id) => app.person(id)).filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
  if (tab === 'online') list = list.filter((p) => p.distance < 300)
  if (tab === 'pets') list = list.filter((p) => p.petEmoji)
  return (
    <div>
      <PageTitle en="Friends" th="เพื่อนของฉัน" right={<span className="chip bg-white/80 text-plum-600">{app.d.friends.length} เพื่อน</span>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-ink/40"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาเพื่อน..." className="w-full bg-transparent text-sm text-ink outline-none" /></div>
            <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'ทั้งหมด' }, { id: 'online', label: 'อยู่ใกล้' }, { id: 'pets', label: 'มีสัตว์เลี้ยง' }]} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((p, i) => (
              <motion.div key={p.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 rounded-3xl bg-white/70 p-3 hover:bg-white">
                <button onClick={() => setPick(p)} className="relative"><Face p={p} size={52} ring={STATUS[p.status].color} />{p.distance < 300 && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-white" />}</button>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{p.name} <span className="text-sm">{p.petEmoji}</span></div>
                  <div className="truncate text-xs text-ink/50">{p.mood}</div>
                  <span className="mt-1 inline-block text-[10px] font-medium" style={{ color: STATUS[p.status].color }}>● {STATUS[p.status].th} · {p.distance} ม.</span>
                </div>
                <Btn variant="soft" className="!h-9 !w-9 !p-0" onClick={() => app.go('chat', p.id)}><MessageCircle size={16} /></Btn>
              </motion.div>
            ))}
            {list.length === 0 && <p className="col-span-full py-8 text-center text-sm text-ink/40">ไม่พบเพื่อน 🥺</p>}
          </div>
        </Card>
        <div className="space-y-4">
          <Card delay={0.05}>
            <Header title="คำขอเป็นเพื่อน" sub={`${app.d.requests.length} คำขอใหม่`} />
            <div className="space-y-2">
              {app.d.requests.map((id) => {
                const p = byId(id)
                return (
                  <motion.div layout key={id} exit={{ opacity: 0 }} className="flex items-center gap-3 rounded-2xl bg-white/70 p-2.5">
                    <Face p={p} size={44} ring={STATUS[p.status].color} />
                    <div className="flex-1"><div className="text-sm font-semibold">{p.name}</div><div className="text-[11px] text-ink/50">เพื่อนร่วมกัน {p.mutual} คน</div></div>
                    <Btn className="!h-9 !w-9 !p-0" onClick={() => accept(id)}><Check size={16} /></Btn>
                    <Btn variant="ghost" className="!h-9 !w-9 !p-0" onClick={() => decline(id)}><X size={16} /></Btn>
                  </motion.div>
                )
              })}
              {app.d.requests.length === 0 && <p className="py-4 text-center text-sm text-ink/40">ไม่มีคำขอค้างอยู่ ✨</p>}
            </div>
          </Card>
          <Card delay={0.1}>
            <Header title="คนที่คุณอาจรู้จัก" sub="จากการเดินผ่านกันบ่อย ๆ" />
            <div className="grid grid-cols-2 gap-2">
              {SUGGEST_IDS.map((id) => {
                const p = byId(id)
                const sent = app.d.sent.includes(id) || app.d.friends.includes(id)
                return (
                  <div key={id} className="flex flex-col items-center rounded-2xl bg-white/70 p-3 text-center">
                    <Face p={p} size={56} ring={STATUS[p.status].color} />
                    <div className="mt-2 text-sm font-semibold">{p.name}</div>
                    <div className="text-[10px] text-ink/50">{STATUS[p.status].th}</div>
                    <Btn disabled={sent} className="mt-2 w-full !py-1.5 text-xs disabled:opacity-50" onClick={() => app.addFriend(id)}>{app.d.friends.includes(id) ? 'เพื่อนแล้ว' : sent ? 'ส่งแล้ว' : <><UserPlus size={13} /> เพิ่ม</>}</Btn>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
      <PersonSheet person={pick} onClose={() => setPick(null)} />
    </div>
  )
}
