import { motion } from 'framer-motion'
import { Activity, Clock, Footprints, Pause, Pencil, Play, QrCode, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../lib/api'
import { Btn, Card, Header, PageTitle, Points, Sheet } from '../components/ui'
import { TOPUP } from '../data/mock'
import { useApp } from '../store/AppStore'
import { ago, inStepWindow, uid } from '../lib/storage'

function StepRing({ steps, goal = 10000 }: { steps: number; goal?: number }) {
  const r = 70, c = 2 * Math.PI * r, pct = Math.min(1, steps / goal)
  return (
    <svg width="180" height="180" viewBox="0 0 180 180">
      <defs><linearGradient id="ring" x1="0" x2="1"><stop offset="0" stopColor="#A8E6CF" /><stop offset="1" stopColor="#34C77B" /></linearGradient></defs>
      <circle cx="90" cy="90" r={r} stroke="#EEE7F8" strokeWidth="14" fill="none" />
      <motion.circle cx="90" cy="90" r={r} stroke="url(#ring)" strokeWidth="14" fill="none" strokeLinecap="round" transform="rotate(-90 90 90)" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ duration: 1.4, ease: 'easeOut' }} />
      <text x="90" y="86" textAnchor="middle" fontSize="30" fontWeight="700" fill="#2E2342">{steps.toLocaleString()}</text>
      <text x="90" y="108" textAnchor="middle" fontSize="11" fill="#2E234288">/ {goal.toLocaleString()} ก้าว</text>
    </svg>
  )
}

export default function Wallet() {
  const app = useApp()
  const { d } = app
  const [pack, setPack] = useState<(typeof TOPUP)[number] | null>(null)
  const [phone, setPhone] = useState('')
  const [stage, setStage] = useState<'form' | 'proc' | 'pending' | 'qr' | 'ok'>('form')
  const [payment, setPayment] = useState<{ id: string; status: string; redirectUrl?: string | null; qrPayload?: string | null; mode: string } | null>(null)
  const [qrImg, setQrImg] = useState('')
  const f = app.features
  const live = f.truemoney === 'live'
  const stepSource = app.pedometer ? 'device' : app.walkSim ? 'sim' : f.manualSteps ? 'manual' : 'device'
  // pending payment: poll status (realtime "payment:update" also refreshes the wallet)
  useEffect(() => {
    if (!app.online || !payment || payment.status !== 'pending') return
    const t = setInterval(() => api<{ result: typeof payment }>(`/payments/${payment.id}`).then((r) => {
      if (r.result && r.result.status !== 'pending') { setPayment(r.result); if (r.result.status === 'succeeded') { setStage('ok'); app.refreshState() } else setStage('form') }
    }).catch(() => {}), 3000)
    return () => clearInterval(t)
  }, [payment?.id, payment?.status]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (payment?.qrPayload) QRCode.toDataURL(payment.qrPayload, { margin: 1, width: 240 }).then(setQrImg).catch(() => setQrImg('')); else setQrImg('') }, [payment?.qrPayload])
  const [edit, setEdit] = useState(false)
  const [stepIn, setStepIn] = useState('')
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all')
  const left = Math.max(0, d.steps - d.redeemed)
  const avail = Math.floor(left / 100)
  const redeem = () => {
    if (!inStepWindow()) { app.toast('ช่วง 00:00 และ 23:59 ระบบปิดแลกก้าวชั่วคราว', '⏰'); return }
    if (avail <= 0) return
    if (app.online) {
      app.syncSteps(stepSource).then(() => app.act<{ points: number; steps: number }>('/wallet/redeem')).then((r) => r && app.toast(`แลก ${r.steps.toLocaleString()} ก้าว → +${r.points} P`, '👣'))
      return
    }
    app.up((x) => ({ ...x, redeemed: x.redeemed + avail * 100 }))
    app.earn(avail, `แลกก้าวเดิน ${(avail * 100).toLocaleString()} ก้าว`)
  }
  const saveSteps = () => {
    const n = Number(stepIn)
    if (!Number.isFinite(n) || n < 0 || n > 80000) { app.toast('ใส่จำนวนก้าว 0 – 80,000', '⚠️'); return }
    if (n < d.redeemed) { app.toast(`ต้องไม่น้อยกว่าก้าวที่แลกไปแล้ว (${d.redeemed.toLocaleString()})`, '⚠️'); return }
    app.up((x) => ({ ...x, steps: Math.round(n) })); setEdit(false)
    if (app.online) setTimeout(() => app.syncSteps('manual').then(() => app.toast('ซิงก์ก้าวเดินกับเซิร์ฟเวอร์แล้ว', '👣')), 60)
    else app.toast('ซิงก์ก้าวเดินแล้ว', '👣')
  }
  const validPhone = /^0[689]\d{8}$/.test(phone)
  const pay = () => {
    if (!pack || !validPhone) return
    setStage('proc')
    if (app.online) {
      const minAnim = new Promise((r) => setTimeout(r, 1200))
      app.act<NonNullable<typeof payment>>('/payments/truemoney/charge', { thb: pack.thb, phone }).then(async (r) => {
        await minAnim
        if (!r) { setStage('form'); return } // 501 not configured / provider error → toast shown by act()
        setPayment(r)
        if (r.status === 'succeeded') setStage('ok')
        else { setStage('pending'); if (r.redirectUrl) window.open(r.redirectUrl, '_blank', 'noopener') }
      })
      return
    }
    setTimeout(() => { app.earn(pack.points, `เติมเงิน TrueMoney ฿${pack.thb} (${phone.slice(0, 3)}-xxx-${phone.slice(-4)})`, pack.thb); setStage('ok') }, 1600)
  }
  const promptPay = () => {
    if (!pack) return
    setStage('proc')
    app.act<NonNullable<typeof payment>>('/payments/promptpay/qr', { thb: pack.thb }).then((r) => { if (r) { setPayment(r); setStage('qr') } else setStage('form') })
  }
  const sandboxComplete = () => payment && app.act(`/payments/${payment.id}/sandbox-complete`, {}).then((r) => r && setStage('ok'))
  const demoTopup = () => {
    if (app.online) app.act('/wallet/demo-topup', { points: 1000 }).then((r) => r && app.toast('เติมพอยท์ทดสอบ +1,000 P', '🧪'))
    else app.earn(1000, 'เติมพอยท์ทดสอบ (demo)')
  }
  const tx = d.tx.filter((t) => filter === 'all' || (filter === 'in' ? t.v > 0 : t.v < 0 || (t.thb ?? 0) < 0))
  return (
    <div>
      <PageTitle en="Wallet & Top-up" th="กระเป๋าเงิน" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden !bg-gradient-to-br from-[#B79BE0] to-[#7E5BB5] text-white lg:col-span-1">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15" />
          <div className="absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-pink/30" />
          <div className="relative">
            <div className="text-sm opacity-80">ยอดพอยท์คงเหลือ</div>
            <motion.div key={d.points} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-4xl font-extrabold">✦ {d.points.toLocaleString()}</motion.div>
            <div className="mt-1 text-xs opacity-75">Hello Points · ใช้ซื้อไข่ อาหาร ชุด และไอเท็มในแอป</div>
            <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl bg-white/15 p-3">ได้จากก้าววันนี้<div className="text-lg font-bold">{(d.redeemed / 100).toLocaleString()} P</div></div>
              <div className="rounded-2xl bg-white/15 p-3">ยังแลกได้<div className="text-lg font-bold">{avail.toLocaleString()} P</div></div>
            </div>
          </div>
        </Card>
        <Card delay={0.05} className="lg:col-span-2">
          <Header icon={<Footprints size={16} />} title="ระบบก้าวเดิน" sub="100 ก้าว = 1 พอยท์ · นับเฉพาะก้าวประจำวัน" right={f.manualSteps ? <button onClick={() => { setStepIn(String(d.steps)); setEdit(true) }} className="flex items-center gap-1 text-xs text-plum-600"><Pencil size={12} /> ซิงก์ก้าว</button> : undefined} />
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <StepRing steps={d.steps} />
            <div className="w-full flex-1 space-y-3">
              <div className="flex items-center gap-2 rounded-2xl bg-white/70 p-3 text-sm"><Clock size={16} className="text-plum" /> ช่วงเวลาที่นับ: <b>00:01 – 23:59</b> ของวันนี้</div>
              <button onClick={app.togglePedometer} className={`flex w-full items-center gap-2 rounded-2xl p-3 text-sm ${app.pedometer ? 'bg-mint/50 text-emerald-700' : 'bg-white/70'}`}>
                <Activity size={16} /> {app.pedometer ? 'กำลังนับก้าวจากเซ็นเซอร์มือถือ… (แตะเพื่อหยุด)' : 'นับก้าวด้วยเซ็นเซอร์มือถือ'}
                {app.pedometer && <span className="ml-auto h-2 w-2 animate-ping rounded-full bg-emerald-500" />}
              </button>
              {!app.pedometerSupported && <div className="-mt-1 px-1 text-[11px] text-ink/45">ต้องเปิดบนมือถือผ่าน HTTPS (iPhone จะถามสิทธิ์ Motion &amp; Orientation)</div>}
              {f.simSteps && <button onClick={() => app.setWalkSim(!app.walkSim)} className={`flex w-full items-center gap-2 rounded-2xl p-3 text-sm ${app.walkSim ? 'bg-mint/50 text-emerald-700' : 'bg-white/70'}`}>
                {app.walkSim ? <Pause size={16} /> : <Play size={16} />} {app.walkSim ? 'กำลังจำลองการเดิน… (+~18 ก้าว/วินาที)' : 'จำลองการเดิน (เดโม)'}
                {app.walkSim && <span className="ml-auto h-2 w-2 animate-ping rounded-full bg-emerald-500" />}
              </button>}
              <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-700">⚠️ ก้าวที่ไม่ได้แลกภายใน 23:59 จะหมดอายุ ไม่สามารถยกไปแลกวันถัดไปได้</div>
              <div className="flex items-center justify-between gap-2 rounded-2xl bg-white/70 p-3">
                <div><div className="text-xs text-ink/50">แลกได้ตอนนี้</div><div className="text-xl font-bold text-emerald-600">{(avail * 100).toLocaleString()} ก้าว → {avail.toLocaleString()} P</div></div>
                <Btn disabled={avail <= 0} className="disabled:opacity-50" onClick={redeem}>แลกพอยท์</Btn>
              </div>
            </div>
          </div>
        </Card>
      </div>
      <Card delay={0.1} className="mt-4">
        <Header icon={<Smartphone size={16} />} title="เติมเงินผ่าน TrueMoney" sub={`เลือกแพ็กเกจที่ต้องการ · ${!app.online ? 'โหมดเดโม (ไม่ตัดเงินจริง)' : live ? 'ชำระเงินจริง — พอยท์เข้าหลัง TrueMoney ยืนยัน' : 'โหมด sandbox (ไม่ตัดเงินจริง)'}`} right={<div className="flex items-center gap-2">{f.demoTopup && <button onClick={demoTopup} className="chip bg-lav text-plum-600">🧪 +1,000 P ทดสอบ</button>}<span className="chip bg-orange-100 text-orange-600 font-bold">TrueMoney</span></div>} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TOPUP.map((t, i) => (
            <motion.button key={t.thb} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} whileHover={{ y: -5 }} whileTap={{ scale: 0.96 }} onClick={() => { setPack(t); setStage('form'); setPayment(null) }}
              className={`relative rounded-3xl p-4 text-left ${t.best ? 'bg-gradient-to-br from-[#FCE4EF] to-[#EADCFB] ring-2 ring-pink' : 'bg-white/75'}`}>
              {t.best && <span className="chip absolute -top-2 right-3 bg-pink text-white">คุ้มสุด</span>}
              <div className="text-xs text-ink/50">฿{t.thb} THB</div>
              <div className="mt-1 text-2xl font-extrabold text-plum-600">{t.points.toLocaleString()}</div>
              <div className="text-xs text-ink/50">พอยท์</div>
              {t.bonus && <span className="chip mt-2 inline-block bg-mint/60 text-emerald-700">โบนัส {t.bonus}</span>}
            </motion.button>
          ))}
        </div>
      </Card>
      <Card delay={0.15} className="mt-4">
        <Header title="ประวัติธุรกรรม" sub={`${d.tx.length} รายการ`} right={<div className="flex gap-1">{([['all', 'ทั้งหมด'], ['in', 'รับ'], ['out', 'จ่าย']] as const).map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`chip !py-1 ${filter === k ? 'btn-primary text-white' : 'bg-white/70 text-ink/60'}`}>{l}</button>)}</div>} />
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {tx.length === 0 && <p className="py-6 text-center text-sm text-ink/40">ยังไม่มีรายการ</p>}
          {tx.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white/70 p-3 text-sm">
              <div className="min-w-0"><div className="truncate font-medium">{h.t}</div><div className="text-[11px] text-ink/45">{ago(h.time)}{h.thb ? ` · ${h.thb > 0 ? 'ชำระ' : 'จ่าย'} ฿${Math.abs(h.thb).toLocaleString()}` : ''}</div></div>
              <span className={`shrink-0 font-bold ${h.v > 0 ? 'text-emerald-600' : h.v < 0 ? 'text-pink-500' : 'text-ink/50'}`}>{h.v === 0 ? `-฿${Math.abs(h.thb ?? 0).toLocaleString()}` : `${h.v > 0 ? '+' : ''}${h.v.toLocaleString()} P`}</span>
            </div>
          ))}
        </div>
      </Card>
      <Sheet open={edit} onClose={() => setEdit(false)} title="ซิงก์ก้าวเดิน 👣">
        <p className="mb-3 text-xs text-ink/55">เดโม: ใส่จำนวนก้าวจากแอปสุขภาพของคุณ (เวอร์ชันจริงจะดึงจาก Apple Health / Google Fit อัตโนมัติ){app.online ? ' · เซิร์ฟเวอร์ตรวจเพดานรายวันและห้ามน้อยกว่าก้าวที่แลกไปแล้ว' : ''}</p>
        <input value={stepIn} onChange={(e) => setStepIn(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className="w-full rounded-2xl bg-white/80 p-3 text-center text-2xl font-bold outline-none" />
        <div className="mt-2 flex gap-2">{[1000, 2500, 5000].map((n) => <button key={n} onClick={() => setStepIn(String(Number(stepIn || 0) + n))} className="chip flex-1 bg-lav text-plum-600">+{n.toLocaleString()}</button>)}</div>
        <Btn className="mt-4 w-full" onClick={saveSteps}>บันทึก</Btn>
      </Sheet>
      <Sheet open={!!pack} onClose={() => setPack(null)} title={stage === 'ok' ? 'เติมเงินสำเร็จ 🎉' : 'ยืนยันการเติมเงิน'}>
        {pack && (
          <div className="text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-orange-300 to-orange-500 text-3xl text-white shadow-lg">{stage === 'ok' ? '✅' : '💳'}</div>
            <div className="mt-3 text-sm text-ink/60">TrueMoney Wallet</div>
            <div className="text-3xl font-extrabold">฿{pack.thb}</div>
            <div className="mt-1"><Points n={pack.points} className="text-lg text-plum-600" /></div>
            {stage === 'form' && <>
              <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="tel" placeholder="เบอร์ TrueMoney เช่น 0812345678" className="mt-4 w-full rounded-2xl bg-white/80 p-3 text-center text-sm outline-none" />
              {phone && !validPhone && <div className="mt-1 text-[11px] text-rose-500">เบอร์มือถือ 10 หลัก ขึ้นต้นด้วย 06/08/09</div>}
              <p className="mt-3 rounded-2xl bg-white/70 p-3 text-xs text-ink/50">{!app.online ? 'โหมดเดโม — ไม่มีการตัดเงินจริง ระบบจะเพิ่มพอยท์ให้หลังยืนยัน' : live ? 'ชำระเงินจริงผ่าน TrueMoney — พอยท์จะเข้าเมื่อ TrueMoney ยืนยันการชำระ (webhook) เท่านั้น · ไม่มีการเก็บข้อมูลบัตร' : 'TrueMoney sandbox — เซิร์ฟเวอร์ยืนยันแพ็กเกจและเพิ่มพอยท์ ไม่มีการตัดเงินจริง'}</p>
              <Btn className="mt-4 w-full" disabled={!validPhone} onClick={pay}>ยืนยันชำระเงิน</Btn>
              {app.online && f.promptpay && <button onClick={promptPay} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/80 py-3 text-sm font-semibold text-plum-600"><QrCode size={16} /> จ่ายด้วย PromptPay QR</button>}
            </>}
            {stage === 'proc' && <div className="py-6"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" /><p className="mt-2 text-sm text-ink/60">กำลังเชื่อมต่อ TrueMoney…</p></div>}
            {stage === 'pending' && <div className="py-4">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
              <p className="mt-2 text-sm text-ink/60">รอ TrueMoney ยืนยันการชำระเงิน… พอยท์จะเข้าอัตโนมัติ</p>
              {payment?.redirectUrl && <a href={payment.redirectUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-orange-600 underline">เปิดหน้าชำระเงิน TrueMoney</a>}
              {payment?.mode === 'sandbox' && <Btn variant="ghost" className="mt-3 w-full" onClick={sandboxComplete}>จำลองว่าชำระแล้ว (sandbox)</Btn>}
            </div>}
            {stage === 'qr' && <div className="py-2">
              {qrImg ? <img src={qrImg} alt="PromptPay QR" className="mx-auto h-56 w-56 rounded-2xl bg-white p-2" /> : <div className="mx-auto h-56 w-56 animate-pulse rounded-2xl bg-white/70" />}
              <p className="mt-2 text-xs text-ink/55">สแกนด้วยแอปธนาคาร · พอยท์จะเข้าเมื่อธนาคารยืนยัน (หมดอายุใน 30 นาที)</p>
              {payment?.mode === 'sandbox' && <Btn variant="ghost" className="mt-3 w-full" onClick={sandboxComplete}>จำลองว่าสแกนจ่ายแล้ว (sandbox)</Btn>}
            </div>}
            {stage === 'ok' && <><p className="mt-3 text-sm text-ink/60">ยอดพอยท์ใหม่ {d.points.toLocaleString()} P · เลขอ้างอิง {(payment?.id ?? uid('TM')).slice(-8).toUpperCase()}</p><Btn className="mt-4 w-full" onClick={() => setPack(null)}>เสร็จสิ้น</Btn></>}
          </div>
        )}
      </Sheet>
    </div>
  )
}
