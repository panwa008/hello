import { motion } from 'framer-motion'
import { Bell, ChevronRight, Footprints, Globe, HelpCircle, Image, LogOut, Shield } from 'lucide-react'
import { useState } from 'react'
import { Btn, Card, Header, PageTitle, Sheet } from '../components/ui'
import { PRIVACY, STATUS } from '../data/status'
import type { PrivacyMode, StatusKey } from '../data/types'
import { useApp } from '../store/AppStore'

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={`relative h-7 w-12 rounded-full transition-colors ${on ? 'bg-plum' : 'bg-ink/15'}`}>
      <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${on ? 'right-1' : 'left-1'}`} />
    </button>
  )
}

export default function More() {
  const app = useApp()
  const { d } = app
  const toggles = d.settings
  const flip = (k: keyof typeof toggles) => app.up((x) => ({ ...x, settings: { ...x.settings, [k]: !x.settings[k] } }))
  const [confirmOut, setConfirmOut] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  return (
    <div>
      <PageTitle en="Settings" th="ตั้งค่า & เพิ่มเติม" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Header icon={<Shield size={16} />} title="โหมดความเป็นส่วนตัว" sub="Privacy Mode — ควบคุมว่าใครเห็นตำแหน่งคุณ" />
          <div className="space-y-2">
            {(Object.keys(PRIVACY) as PrivacyMode[]).map((k) => {
              const on = d.privacy === k
              return (
                <motion.button key={k} whileTap={{ scale: 0.98 }} onClick={() => { app.setPrivacy(k); app.toast(`เปลี่ยนเป็นโหมด ${PRIVACY[k].th}`, PRIVACY[k].emoji) }} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${on ? 'bg-white shadow-md ring-2 ring-plum/50' : 'bg-white/60 hover:bg-white/80'}`}>
                  <span className="text-2xl">{PRIVACY[k].emoji}</span>
                  <div className="flex-1"><div className="text-sm font-semibold">{PRIVACY[k].th} <span className="text-[10px] font-normal text-ink/40">{PRIVACY[k].en}</span></div><div className="text-xs text-ink/50">{PRIVACY[k].desc}</div></div>
                  <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${on ? 'border-plum' : 'border-ink/20'}`}>{on && <span className="h-2.5 w-2.5 rounded-full bg-plum" />}</span>
                </motion.button>
              )
            })}
          </div>
        </Card>
        <Card delay={0.05}>
          <Header icon={<span>💞</span>} title="สถานะความสัมพันธ์" sub="Relationship Status — แยกจากโหมดความเป็นส่วนตัว" />
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(STATUS) as StatusKey[]).map((k) => {
              const on = d.relationship === k
              return (
                <motion.button key={k} whileTap={{ scale: 0.97 }} onClick={() => { app.setRelationship(k); app.toast(`สถานะ: ${STATUS[k].th}`, '💞') }} className={`rounded-2xl p-3 text-left transition ${on ? 'shadow-md' : 'bg-white/60'}`} style={on ? { background: STATUS[k].soft, boxShadow: `0 0 0 2px ${STATUS[k].color}` } : undefined}>
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: STATUS[k].color }}><span className="h-3 w-3 rounded-full" style={{ background: STATUS[k].color }} />{STATUS[k].th}</div>
                  <div className="mt-1 text-[11px] leading-snug text-ink/55">{STATUS[k].rule}</div>
                </motion.button>
              )
            })}
          </div>
        </Card>
        <Card delay={0.1}>
          <Header title="การตั้งค่าทั่วไป" />
          {[
            ['notif', Bell, 'การแจ้งเตือน', 'แสดงป๊อปอัปข้อความ คำขอเพื่อน ไข่ฟัก'],
            ['steps', Footprints, 'นับก้าวเดิน', 'ปิดแล้วการเดินจำลองจะไม่นับก้าว'],
            ['petVisible', Image, 'ให้คนในรัศมีเห็นสัตว์เลี้ยง', 'น้องจะเดินข้างคุณบนแผนที่'],
            ['feedByOthers', Image, 'อนุญาตให้คนอื่นให้อาหารน้อง', 'เมื่อถูกชะตากัน 💕'],
          ].map(([k, I, t, d]) => {
            const Icon = I as typeof Bell
            return (
              <div key={k as string} className="mb-2 flex items-center gap-3 rounded-2xl bg-white/60 p-3">
                <Icon size={18} className="text-plum-600" />
                <div className="flex-1"><div className="text-sm font-medium">{t as string}</div><div className="text-[11px] text-ink/50">{d as string}</div></div>
                <Toggle on={toggles[k as keyof typeof toggles]} onChange={() => flip(k as keyof typeof toggles)} />
              </div>
            )
          })}
        </Card>
        <Card delay={0.15}>
          <Header title="อื่น ๆ" />
          {[[Globe, 'ภาษา', 'ไทย'], [HelpCircle, 'ศูนย์ช่วยเหลือ', ''], [Shield, 'ความปลอดภัยและการรายงาน', ''], [Image, 'ภาพอ้างอิงดีไซน์ (inspiration)', '/refs']].map(([I, t, v]) => {
            const Icon = I as typeof Globe
            return (
              <a key={t as string} href={v === '/refs' ? '/refs/petoria-mockup.png' : undefined} target="_blank" rel="noreferrer" className="mb-2 flex cursor-pointer items-center gap-3 rounded-2xl bg-white/60 p-3 hover:bg-white/80">
                <Icon size={18} className="text-plum-600" /><span className="flex-1 text-sm font-medium">{t as string}</span><span className="text-xs text-ink/40">{v === '/refs' ? 'เปิดดู' : (v as string)}</span><ChevronRight size={16} className="text-ink/30" />
              </a>
            )
          })}
          <button onClick={() => app.go('profile')} className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-white/60 p-3 text-left hover:bg-white/80"><span className="text-lg">👤</span><span className="flex-1 text-sm font-medium">บัญชี: {app.user?.email}</span><ChevronRight size={16} className="text-ink/30" /></button>
          <button onClick={() => setConfirmReset(true)} className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-white/60 p-3 text-left text-sm text-ink/60 hover:bg-white/80">🧹 <span className="flex-1">รีเซ็ตข้อมูลเดโมของบัญชีนี้</span></button>
          <button onClick={() => setConfirmOut(true)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-pink/20 p-3 text-sm font-semibold text-pink-600"><LogOut size={16} /> ออกจากระบบ</button>
          <p className="mt-4 text-center text-[11px] text-ink/40">Hello v0.2 · EXPLORE · CONNECT · PLAY · ข้อมูลเก็บในเบราว์เซอร์นี้</p>
        </Card>
      </div>
      <Sheet open={confirmOut} onClose={() => setConfirmOut(false)} title="ออกจากระบบ?">
        <p className="text-sm text-ink/60">ข้อมูลของคุณยังถูกเก็บไว้ในเครื่องนี้ เข้าสู่ระบบอีกครั้งเพื่อใช้งานต่อ</p>
        <div className="mt-4 grid grid-cols-2 gap-2"><Btn variant="ghost" onClick={() => setConfirmOut(false)}>ยกเลิก</Btn><Btn onClick={() => { setConfirmOut(false); app.logout() }}>ออกจากระบบ</Btn></div>
      </Sheet>
      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="รีเซ็ตข้อมูล?">
        <p className="text-sm text-ink/60">โพสต์ แชท สัตว์เลี้ยง พอยท์ และไอเท็มทั้งหมดของบัญชีนี้จะกลับเป็นค่าเริ่มต้น (บัญชีและรหัสผ่านยังอยู่)</p>
        <div className="mt-4 grid grid-cols-2 gap-2"><Btn variant="ghost" onClick={() => setConfirmReset(false)}>ยกเลิก</Btn><Btn onClick={() => { setConfirmReset(false); app.resetData(); app.toast('รีเซ็ตข้อมูลแล้ว', '🧹') }}>รีเซ็ต</Btn></div>
      </Sheet>
    </div>
  )
}
