import { motion } from 'framer-motion'
import { CheckCircle2, Heart, MapPin, MessageCircle, Package, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Face } from '../../components/art'
import { Btn, Card, PageTitle, Points, Sheet, Tabs } from '../../components/ui'
import { byId, PEOPLE } from '../../data/mock'
import type { MarketItem } from '../../data/types'
import { useApp, type Order } from '../../store/AppStore'
import { ago, uid } from '../../lib/storage'
import { RealmBanner } from '../shared/realm'
import { CAT_EMOJI, CONDITIONS, conditionGroup, conditionMeta, isRealGood, REAL_CATEGORIES, USED_GRADES, type ConditionGroup, type MarketFilter } from './catalog'

const ALL_CAT = 'ทุกหมวด'
const EMOJIS = ['📦', '👕', '👟', '📱', '💻', '🎧', '📚', '🪑', '🧸', '🎸', '⚽', '🪴', '🍳', '🍼']
const TINTS: [string, string][] = [['#E6DBFA', '#F6F2FC'], ['#FDE4EF', '#FFF5F9'], ['#DDF7E9', '#F2FFF8'], ['#DDF0FC', '#F2FAFF'], ['#FFF3C4', '#FFFBEA']]
const MEETS = ['สวนลุมพินี ประตู 1', 'BTS อโศก ทางออก 3', 'คาเฟ่ Lavender Days', 'หน้า 7-Eleven ใกล้คุณ']
const PAYS = [{ id: 'tm', l: 'TrueMoney Wallet', e: '🟠' }, { id: 'pp', l: 'PromptPay QR', e: '🔷' }, { id: 'cod', l: 'เงินสดตอนนัดรับ', e: '💵' }]

export default function Market() {
  const app = useApp()
  const { d, user } = app
  const [tab, setTab] = useState<'shop' | 'orders' | 'mine'>('shop')
  const [cat, setCat] = useState<string>(ALL_CAT)
  const [cond, setCond] = useState<MarketFilter>('all')
  const [q, setQ] = useState('')
  const [fav, setFav] = useState<Set<string>>(new Set())
  const [pick, setPick] = useState<MarketItem | null>(null)
  const [buy, setBuy] = useState<MarketItem | null>(null)
  const [method, setMethod] = useState<'points' | 'thb'>('thb')
  const [pay, setPay] = useState('tm')
  const [meet, setMeet] = useState(MEETS[0])
  const [step, setStep] = useState<'form' | 'proc' | 'ok'>('form')
  const [sell, setSell] = useState(false)
  const [form, setForm] = useState<{ name: string; thb: string; category: string; group: ConditionGroup | ''; grade: string; emoji: string }>({ name: '', thb: '', category: '', group: '', grade: USED_GRADES[1], emoji: '📦' })
  const all = (app.online ? d.market : [...d.listings, ...d.market]).filter(isRealGood)
  const live = all.filter((m) => !d.sold.includes(m.id) && (m.status ?? 'active') === 'active' && (app.online || m.seller !== user?.name))
  const countOf = (g: MarketFilter) => live.filter((m) => g === 'all' || conditionGroup(m.condition) === g).length
  const items = live.filter((m) => (cond === 'all' || conditionGroup(m.condition) === cond) && (cat === ALL_CAT || m.category === cat) && m.name.toLowerCase().includes(q.toLowerCase()))
  const sellerOf = (m: MarketItem) => (m.sellerId ? byId(m.sellerId) : PEOPLE.find((p) => p.name === m.seller))
  const seller = pick ? sellerOf(pick) : undefined
  const chatSeller = (m: MarketItem) => {
    const s = sellerOf(m); if (!s) return
    if (!(d.chats[s.id] ?? []).some((x) => x.kind === 'market' && x.text.includes(m.name))) app.sendMsg(s.id, `สวัสดีค่ะ สนใจ "${m.name}" ราคา ฿${m.thb.toLocaleString()} ยังอยู่ไหมคะ?`, 'market')
    setPick(null); app.go('chat', s.id)
  }
  const startBuy = (m: MarketItem) => { setBuy(m); setMethod(m.points && d.points >= m.points ? 'points' : 'thb'); setStep('form'); setPick(null) }
  const PAY_API: Record<string, string> = { tm: 'truemoney', pp: 'promptpay', cod: 'cod' }
  const confirm = () => {
    if (!buy) return
    if (app.online) {
      setStep('proc')
      const it = buy, minAnim = new Promise((r) => setTimeout(r, 1000))
      app.act<{ sandbox: boolean }>('/market/orders', { listingId: it.id, method, pay: PAY_API[pay] ?? 'cod', meet }).then(async (r) => {
        await minAnim
        if (!r) { setStep('form'); return }
        app.notify({ text: `สั่งซื้อ ${it.name} สำเร็จ · นัดรับ ${meet}${r.sandbox ? ' (ชำระเงินแบบ sandbox)' : ''}`, emoji: '📦', to: 'market' })
        setStep('ok')
      })
      return
    }
    if (method === 'points') { if (!app.spend(buy.points!, `ตลาด: ${buy.name}`, true)) return }
    setStep('proc')
    setTimeout(() => {
      const o: Order = { id: uid('od'), itemId: buy.id, name: buy.name, emoji: buy.emoji, seller: buy.seller, method, pay: method === 'points' ? 'Hello Points' : PAYS.find((p) => p.id === pay)!.l, amount: method === 'points' ? buy.points! : buy.thb, time: Date.now(), status: 'pending', meet }
      app.up((x) => ({ ...x, orders: [o, ...x.orders], sold: [...x.sold, buy.id], tx: method === 'thb' && pay !== 'cod' ? [{ id: uid('tx'), t: `ตลาด: ${buy.name} (${o.pay})`, v: 0, thb: -buy.thb, time: Date.now() }, ...x.tx] : x.tx }))
      const s = sellerOf(buy)
      if (s) app.sendMsg(s.id, `สั่งซื้อ "${buy.name}" แล้วนะคะ นัดรับที่ ${meet} 🙏`, 'market')
      app.notify({ text: `สั่งซื้อ ${buy.name} สำเร็จ · นัดรับ ${meet}`, emoji: '📦', to: 'market' })
      setStep('ok')
    }, 1400)
  }
  const post = () => {
    const thb = Number(form.thb)
    if (!form.name.trim() || !thb || thb <= 0) { app.toast('กรอกชื่อสินค้าและราคาให้ครบ', '⚠️'); return }
    if (!form.group) { app.toast('เลือกสภาพสินค้า: ใหม่ / มือสอง / เปิดกล่อง', '⚠️'); return }
    if (!form.category) { app.toast('เลือกหมวดสินค้าในโลกจริง', '⚠️'); return }
    if (!isRealGood({ name: form.name, category: form.category })) { app.toast('ตลาดของจริงรับเฉพาะสินค้าที่จับต้องได้ — ไอเท็มอวตาร/สัตว์เลี้ยงไปที่ร้านโลกอวตาร', '🚫'); return }
    const condition = form.group === 'used' ? `มือสอง ${form.grade}` : form.group === 'new' ? 'ใหม่' : 'เปิดกล่อง'
    if (app.online) {
      app.act('/market/listings', { name: form.name.trim(), thb, category: form.category, condition, emoji: form.emoji }).then((r) => {
        if (r) { app.toast('ลงประกาศขายแล้ว!', '📦'); setSell(false); setTab('mine'); setForm({ ...form, name: '', thb: '', group: '', category: '' }) }
      })
      return
    }
    const m: MarketItem = { id: uid('ls'), name: form.name.trim(), thb, points: thb * 100, emoji: form.emoji, tint: TINTS[Math.floor(Math.random() * TINTS.length)], seller: user!.name, distance: '0 ม.', condition, category: form.category }
    app.up((x) => ({ ...x, listings: [m, ...x.listings] }))
    app.toast('ลงประกาศขายแล้ว!', '📦'); setSell(false); setTab('mine'); setForm({ ...form, name: '', thb: '', group: '', category: '' })
  }
  const mine = app.online ? d.listings : d.listings.filter((m) => m.seller === user?.name)
  const confirmOrder = (id: string) => {
    if (app.online) { app.act(`/market/orders/${id}/confirm`).then((r) => r && app.toast('ยืนยันรับสินค้าแล้ว ขอบคุณที่ใช้ตลาดของจริง', '✅')); return }
    app.up((x) => ({ ...x, orders: x.orders.map((y) => (y.id === id ? { ...y, status: 'done' } : y)) })); app.toast('ยืนยันรับสินค้าแล้ว ขอบคุณที่ใช้ตลาดของจริง', '✅')
  }
  const removeListing = (id: string) => {
    if (app.online) { app.act(`/market/listings/${id}`, undefined, 'DELETE').then((r) => r && app.toast('ลบประกาศแล้ว', '🗑️')); return }
    app.up((x) => ({ ...x, listings: x.listings.filter((y) => y.id !== id) })); app.toast('ลบประกาศแล้ว', '🗑️')
  }
  return (
    <div>
      <PageTitle en="Real Goods Market" th="ตลาดของจริง" right={<Btn onClick={() => setSell(true)}><Plus size={16} /> ลงขาย</Btn>} />
      <RealmBanner realm="real" right={<span className="chip hidden bg-white/85 !text-[10px] text-ink/60 sm:inline-flex">🤝 นัดรับ · COD</span>}>ของใช้ในโลกจริง · ของใหม่และมือสอง · นัดรับใกล้คุณ — ไม่ใช่ไอเท็มอวตาร</RealmBanner>
      <div className="mb-4"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'shop', label: '🛍️ เลือกซื้อ' }, { id: 'orders', label: `📦 คำสั่งซื้อ${d.orders.length ? ` (${d.orders.length})` : ''}` }, { id: 'mine', label: `🏷️ ของที่ฉันขาย${mine.length ? ` (${mine.length})` : ''}` }]} /></div>
      {tab === 'shop' && <>
        <Card className="mb-4 !p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-ink/40"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาของจริง: มือถือ เก้าอี้ เสื้อผ้า..." className="w-full bg-transparent text-sm text-ink outline-none" /></div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {([['all', 'ทั้งหมด'], ...CONDITIONS.map((c) => [c.id, c.th])] as [MarketFilter, string][]).map(([id, l]) => <button key={id} onClick={() => setCond(id)} className={`chip shrink-0 !py-1.5 font-semibold transition ${cond === id ? 'btn-primary text-white' : 'bg-white/80 text-ink/65'}`}>{l} <span className="opacity-60">{countOf(id)}</span></button>)}
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto border-t border-white/60 pt-2.5 no-scrollbar">
            <span className="shrink-0 text-[10px] font-bold tracking-[0.15em] text-ink/40">หมวดหมู่</span>
            {[ALL_CAT, ...REAL_CATEGORIES].map((c) => <button key={c} onClick={() => setCat(c)} className={`chip shrink-0 !py-1 !text-[11px] transition ${cat === c ? 'bg-ink text-white' : 'bg-white/60 text-ink/55'}`}>{CAT_EMOJI[c] ?? '🗂️'} {c}</button>)}
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((m, i) => (
            <motion.div key={m.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -5 }} onClick={() => setPick(m)} className="glass cursor-pointer overflow-hidden rounded-[26px] p-2.5">
              <div className="relative grid aspect-square place-items-center rounded-[20px]" style={{ background: `linear-gradient(140deg, ${m.tint[0]}, ${m.tint[1]})` }}>
                <span className="text-6xl drop-shadow-lg sm:text-7xl">{m.emoji}</span>
                <button onClick={(e) => { e.stopPropagation(); setFav((f) => { const n = new Set(f); n.has(m.id) ? n.delete(m.id) : n.add(m.id); return n }) }} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/85 text-pink-500"><Heart size={15} fill={fav.has(m.id) ? 'currentColor' : 'none'} /></button>
                <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wider shadow ${conditionMeta(m.condition).cls}`}>{conditionMeta(m.condition).th}</span>
                <span className="chip absolute bottom-2 left-2 bg-white/85 !text-[10px] text-ink/60"><MapPin size={10} className="inline" /> {m.distance}</span>
              </div>
              <div className="px-1 pb-1 pt-2">
                <div className="truncate text-sm font-semibold">{m.name}</div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-plum-600">฿{m.thb.toLocaleString()}</span>
                  {m.points && <span className="text-[10px] text-ink/45">หรือ {m.points.toLocaleString()} P</span>}
                </div>
                <div className="truncate text-[11px] text-ink/45">{CAT_EMOJI[m.category] ?? '📦'} {m.category} · {m.condition} · {m.seller}</div>
              </div>
            </motion.div>
          ))}
        </div>
        {items.length === 0 && <p className="py-12 text-center text-ink/40">ไม่พบของจริงในตัวกรองนี้</p>}
      </>}
      {tab === 'orders' && (
        <div className="space-y-3">
          {d.orders.length === 0 && <Card><p className="py-8 text-center text-sm text-ink/50">ยังไม่มีคำสั่งซื้อ</p></Card>}
          {d.orders.map((o) => (
            <Card key={o.id} className="flex items-center gap-3 !p-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lav text-3xl">{o.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{o.name}</div>
                <div className="text-[11px] text-ink/50">{o.seller} · {o.method === 'points' ? `${o.amount.toLocaleString()} P` : `฿${o.amount.toLocaleString()}`} · {o.pay}</div>
                <div className="text-[11px] text-ink/50">📍 {o.meet} · {ago(o.time)}</div>
              </div>
              {o.status === 'done' ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 size={14} /> รับแล้ว</span>
                : <Btn className="!px-3 !py-1.5 text-xs" onClick={() => confirmOrder(o.id)}><Package size={14} /> ได้รับของแล้ว</Btn>}
            </Card>
          ))}
        </div>
      )}
      {tab === 'mine' && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          <button onClick={() => setSell(true)} className="grid aspect-[3/4] place-items-center rounded-[26px] border-2 border-dashed border-plum/30 bg-white/50 text-plum-600"><div className="text-center"><Plus className="mx-auto" /><div className="text-sm">ลงขายสินค้าใหม่</div></div></button>
          {mine.map((m) => (
            <div key={m.id} className="glass rounded-[26px] p-2.5">
              <div className="grid aspect-square place-items-center rounded-[20px]" style={{ background: `linear-gradient(140deg, ${m.tint[0]}, ${m.tint[1]})` }}><span className="text-6xl">{m.emoji}</span></div>
              <div className="mt-2 truncate text-sm font-semibold">{m.name}</div>
              <div className="text-base font-bold text-plum-600">฿{m.thb.toLocaleString()}</div>
              <div className="text-[11px] text-ink/45">{m.condition} · {m.category}</div>
              {m.status === 'sold' ? <span className="mt-1 block text-xs font-semibold text-emerald-600">ขายแล้ว ✓</span> : <button onClick={() => removeListing(m.id)} className="mt-1 flex items-center gap-1 text-xs text-rose-500"><Trash2 size={12} /> ลบประกาศ</button>}
            </div>
          ))}
        </div>
      )}

      <Sheet open={!!pick} onClose={() => setPick(null)} title="รายละเอียดสินค้า">
        {pick && (
          <div>
            <div className="grid aspect-[4/3] place-items-center rounded-3xl" style={{ background: `linear-gradient(140deg, ${pick.tint[0]}, ${pick.tint[1]})` }}><span className="text-8xl">{pick.emoji}</span></div>
            <h3 className="mt-3 text-lg font-bold">{pick.name}</h3>
            <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-plum-600">฿{pick.thb.toLocaleString()}</span>{pick.points && <Points n={pick.points} className="text-sm text-ink/60" />}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs"><span className={`chip font-bold ${conditionMeta(pick.condition).cls}`}>{conditionMeta(pick.condition).th}</span><span className="chip bg-white/80">{pick.condition}</span><span className="chip bg-white/80">{pick.category}</span><span className="chip bg-white/80">📍 {pick.distance}</span></div>
            {seller && <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/70 p-3"><Face p={seller} size={40} /><div className="flex-1"><div className="text-sm font-semibold">{seller.name}</div><div className="text-[11px] text-ink/50">ผู้ขาย · ตอบกลับไว ⚡</div></div><ShieldCheck className="text-emerald-500" size={20} /></div>}
            <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-[11px] text-amber-700">💡 นัดรับสินค้าในที่สาธารณะ ตรวจสอบของก่อนชำระเงินเสมอ</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Btn variant="ghost" disabled={!seller || seller.status === 'hidden'} onClick={() => chatSeller(pick)}><MessageCircle size={16} /> แชทผู้ขาย</Btn>
              <Btn onClick={() => startBuy(pick)}>ซื้อเลย</Btn>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={!!buy} onClose={() => setBuy(null)} title={step === 'ok' ? 'สั่งซื้อสำเร็จ 🎉' : 'ชำระเงิน'}>
        {buy && step === 'form' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl bg-white/75 p-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-lav text-2xl">{buy.emoji}</span><div className="flex-1"><div className="text-sm font-semibold">{buy.name}</div><div className="text-xs text-ink/50">ผู้ขาย {buy.seller} · {buy.distance}</div></div></div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMethod('thb')} className={`rounded-2xl p-3 text-left text-sm ${method === 'thb' ? 'bg-white ring-2 ring-plum' : 'bg-white/60'}`}><div className="font-bold">฿{buy.thb.toLocaleString()}</div><div className="text-[11px] text-ink/50">จ่ายเงินบาท</div></button>
              <button disabled={!buy.points} onClick={() => setMethod('points')} className={`rounded-2xl p-3 text-left text-sm disabled:opacity-40 ${method === 'points' ? 'bg-white ring-2 ring-plum' : 'bg-white/60'}`}><div className="font-bold">{buy.points ? `${buy.points.toLocaleString()} P` : '—'}</div><div className="text-[11px] text-ink/50">{buy.points ? `มี ${d.points.toLocaleString()} P` : 'ผู้ขายไม่รับพอยท์'}</div></button>
            </div>
            {method === 'thb' && <div className="space-y-1.5">{PAYS.map((p) => <label key={p.id} className={`flex cursor-pointer items-center gap-2 rounded-2xl p-2.5 text-sm ${pay === p.id ? 'bg-white ring-1 ring-plum/40' : 'bg-white/60'}`}><input type="radio" checked={pay === p.id} onChange={() => setPay(p.id)} className="accent-[#9B7EBD]" />{p.e} {p.l}</label>)}</div>}
            <div><div className="mb-1 text-xs text-ink/55">จุดนัดรับ (ที่สาธารณะ)</div><select value={meet} onChange={(e) => setMeet(e.target.value)} className="w-full rounded-2xl bg-white/80 p-2.5 text-sm outline-none">{MEETS.map((m) => <option key={m}>{m}</option>)}</select></div>
            <p className="text-[11px] text-ink/45">⚠️ เดโม: ไม่มีการตัดเงินจริง {method === 'points' ? '(หักพอยท์ในแอป)' : ''}</p>
            <Btn className="w-full" disabled={method === 'points' && d.points < (buy.points ?? 0)} onClick={confirm}>{method === 'points' ? (d.points < (buy.points ?? 0) ? 'พอยท์ไม่พอ' : `ยืนยันจ่าย ${buy.points?.toLocaleString()} P`) : pay === 'cod' ? 'ยืนยันนัดรับ' : `ยืนยันชำระ ฿${buy.thb.toLocaleString()}`}</Btn>
          </div>
        )}
        {step === 'proc' && <div className="grid min-h-[200px] place-items-center"><div className="text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-lav border-t-plum" /><p className="mt-3 text-sm text-ink/60">กำลังดำเนินการ…</p></div></div>}
        {buy && step === 'ok' && (
          <div className="py-4 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="text-6xl">✅</motion.div>
            <p className="mt-2 font-semibold">สั่งซื้อ {buy.name} แล้ว</p>
            <p className="text-xs text-ink/55">นัดรับที่ {meet} · แจ้งผู้ขายในแชทแล้ว</p>
            <div className="mt-4 grid grid-cols-2 gap-2"><Btn variant="ghost" onClick={() => { setBuy(null); setTab('orders') }}>ดูคำสั่งซื้อ</Btn><Btn onClick={() => { const s = sellerOf(buy); setBuy(null); if (s) app.go('chat', s.id) }}>เปิดแชท</Btn></div>
          </div>
        )}
      </Sheet>

      <Sheet open={sell} onClose={() => setSell(false)} title="ลงขายของจริง 🏷️">
        <div className="space-y-3">
          <p className="rounded-2xl bg-emerald-50 p-2.5 text-[11px] text-emerald-700">🌏 สินค้าที่มีอยู่จริงเท่านั้น (ของใหม่/มือสอง) · ไอเท็มอวตารและสัตว์เลี้ยงขายไม่ได้ที่นี่</p>
          <div className="flex flex-wrap gap-1.5">{EMOJIS.map((e) => <button key={e} onClick={() => setForm({ ...form, emoji: e })} className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${form.emoji === e ? 'bg-white ring-2 ring-plum' : 'bg-white/60'}`}>{e}</button>)}</div>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60} placeholder="ชื่อสินค้า" className="w-full rounded-2xl bg-white/80 p-3 text-sm outline-none" />
          <input value={form.thb} onChange={(e) => setForm({ ...form, thb: e.target.value.replace(/\D/g, '') })} inputMode="numeric" placeholder="ราคา (บาท)" className="w-full rounded-2xl bg-white/80 p-3 text-sm outline-none" />
          <div>
            <div className="mb-1 text-xs font-semibold text-ink/60">สภาพสินค้า *</div>
            <div className="grid grid-cols-3 gap-2">{CONDITIONS.map((c) => <button key={c.id} onClick={() => setForm({ ...form, group: c.id })} className={`rounded-2xl p-2.5 text-sm font-semibold transition ${form.group === c.id ? `${c.cls} shadow-md` : 'bg-white/70 text-ink/60'}`}>{c.th}<div className="text-[9px] tracking-widest opacity-70">{c.en}</div></button>)}</div>
            {form.group === 'used' && <div className="mt-2 flex flex-wrap gap-1.5">{USED_GRADES.map((g) => <button key={g} onClick={() => setForm({ ...form, grade: g })} className={`chip !text-[11px] ${form.grade === g ? 'bg-amber-500 text-white' : 'bg-white/70 text-ink/60'}`}>{g}</button>)}</div>}
          </div>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-2xl bg-white/80 p-3 text-sm outline-none"><option value="">เลือกหมวดสินค้า (ของจริง) *</option>{REAL_CATEGORIES.map((c) => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}</select>
          <p className="text-[11px] text-ink/45">ผู้ซื้อจ่ายเป็นพอยท์ได้ที่อัตรา ฿1 = 100 P</p>
          <Btn className="w-full" onClick={post}>ลงประกาศ</Btn>
        </div>
      </Sheet>
    </div>
  )
}
