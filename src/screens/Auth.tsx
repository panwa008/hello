import { motion } from 'framer-motion'
import { useState } from 'react'
import { Eye, EyeOff, Sparkles } from 'lucide-react'
import { useApp } from '../store/AppStore'
import { PawLogo, PetDragon, PALETTES } from '../components/art'

export default function Auth() {
  const app = useApp()
  const [mode, setMode] = useState<'login' | 'register'>(app.online || app.accounts.length ? 'login' : 'register')
  const [f, setF] = useState({ name: '', email: '', pass: '', gender: 'f' as 'f' | 'm' })
  const [show, setShow] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const run = async (fn: () => Promise<string | null>) => {
    if (loading) return
    setLoading(true); setErr(null)
    try { setErr(await fn()) } finally { setLoading(false) }
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    run(() => (mode === 'login' ? app.login(f.email, f.pass) : app.register(f)))
  }
  const input = 'w-full rounded-2xl bg-white/80 px-4 py-3 text-sm outline-none ring-1 ring-plum/10 focus:ring-2 focus:ring-plum/40'
  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[36px] glass-strong md:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-[#E9DEFB] via-[#F6E3F1] to-[#FDE7DA] p-8 md:flex">
          <div className="flex items-center gap-3"><PawLogo size={48} /><div><div className="text-3xl font-extrabold text-plum-600">Hello</div><div className="text-[10px] font-semibold tracking-[0.22em] text-plum">EXPLORE · CONNECT · PLAY</div></div></div>
          <div className="anim-float mx-auto"><PetDragon palette={PALETTES.lumi} size={240} /></div>
          <div>
            <h2 className="text-xl font-bold text-ink">เจอเพื่อนใหม่ใกล้ตัว 👋</h2>
            <p className="mt-1 text-sm text-ink/60">เลี้ยงมังกรน้อย เดินสะสมก้าว แลกพอยท์ แต่งตัวอวตาร และซื้อขายของมือสองในชุมชนของคุณ</p>
          </div>
        </div>
        <motion.form key={mode} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} onSubmit={submit} className="space-y-3 p-7 sm:p-10">
          <div className="mb-4 flex items-center gap-3 md:hidden"><PawLogo size={40} /><span className="text-2xl font-extrabold text-plum-600">Hello</span></div>
          <h1 className="text-2xl font-bold">{mode === 'login' ? 'ยินดีต้อนรับกลับ 💜' : 'สร้างบัญชีใหม่ ✨'}</h1>
          <p className="text-sm text-ink/55">{mode === 'login' ? 'เข้าสู่ระบบเพื่อไปหาเพื่อนและน้องมังกรของคุณ' : (app.online ? 'สมัครฟรี รับพอยท์เริ่มต้น 5,500 P และมังกร 3 ตัว' : 'สมัครฟรี รับพอยท์เริ่มต้น 11,250 P และมังกร 3 ตัว')}</p>
          {mode === 'register' && (
            <>
              <input className={input} placeholder="ชื่อที่แสดง" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="nickname" />
              <div className="flex gap-2">
                {(['f', 'm'] as const).map((g) => (
                  <button type="button" key={g} onClick={() => setF({ ...f, gender: g })} className={`flex-1 rounded-2xl py-2.5 text-sm font-medium ${f.gender === g ? 'btn-primary text-white' : 'bg-white/70 text-ink/60'}`}>{g === 'f' ? 'หญิง 👩' : 'ชาย 👨'}</button>
                ))}
              </div>
            </>
          )}
          <input className={input} type="email" placeholder="อีเมล" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" />
          <div className="relative">
            <input className={input} type={show ? 'text' : 'password'} placeholder={`รหัสผ่าน (อย่างน้อย ${app.features.env === 'production' ? 8 : 6} ตัว)`} value={f.pass} onChange={(e) => setF({ ...f, pass: e.target.value })} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-ink/40">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          {err && <div className="rounded-2xl bg-rose-50 px-4 py-2 text-sm text-rose-500">{err}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full rounded-2xl py-3 font-semibold text-white disabled:opacity-60">{loading ? 'กำลังเชื่อมต่อ…' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</button>
{app.features.env !== 'production' && <>
          <div className="flex items-center gap-3 py-1 text-xs text-ink/40"><span className="h-px flex-1 bg-ink/10" />หรือ<span className="h-px flex-1 bg-ink/10" /></div>
          <button type="button" disabled={loading} onClick={() => run(app.demoLogin)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/80 py-3 text-sm font-semibold text-plum-600 ring-1 ring-plum/15">
            <Sparkles size={16} /> เข้าใช้ด้วยบัญชีเดโม (Mayy)
          </button>
          <p className="text-center text-[11px] text-ink/40">mayy@hello.app · hello123</p>
          </>}
          <p className="pt-2 text-center text-sm text-ink/60">
            {mode === 'login' ? 'ยังไม่มีบัญชี? ' : 'มีบัญชีแล้ว? '}
            <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(null) }} className="font-semibold text-plum-600">{mode === 'login' ? 'สมัครเลย' : 'เข้าสู่ระบบ'}</button>
          </p>
          <p className="text-center text-[10px] text-ink/35">{app.online ? '🟢 ออนไลน์: เชื่อมต่อ Hello API (บัญชีและข้อมูลเก็บบนเซิร์ฟเวอร์)' : 'ออฟไลน์เดโม: ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น (localStorage)'}</p>
        </motion.form>
      </div>
    </div>
  )
}
