import { motion } from 'framer-motion'
import { KeyRound, MapPin, Pencil, Share2 } from 'lucide-react'
import { useState } from 'react'
import { AvatarStage } from '../components/AvatarStage'
import { Scene } from '../components/art'
import { MeFace } from '../components/Layout'
import { Btn, Card, Header, Rarity, Sheet } from '../components/ui'
import { STATUS, PRIVACY } from '../data/status'
import { useApp } from '../store/AppStore'
import { PetWithAcc } from './Pets'

const HAIRS = ['#7A4A35', '#2A2433', '#A98BE0', '#F2A5C3', '#C0745B', '#D9A066']
const SKINS = ['#FCE0CF', '#F5D0B5', '#E8B894', '#C98E6B', '#8D5B3E']
const input = 'w-full rounded-2xl bg-white/80 p-3 text-sm outline-none focus:ring-2 focus:ring-plum/40'

export default function Profile() {
  const app = useApp()
  const { d, user } = app
  const s = STATUS[d.relationship]
  const [edit, setEdit] = useState(false)
  const [pw, setPw] = useState(false)
  const [f, setF] = useState({ name: '', handle: '', bio: '', gender: 'f' as 'f' | 'm', hair: '', skin: '' })
  const [pf, setPf] = useState({ old: '', nw: '', nw2: '' })
  const [err, setErr] = useState('')
  if (!user) return null
  const myPosts = d.posts.filter((p) => p.authorId === 'me')
  const openEdit = () => { setF({ name: user.name, handle: user.handle, bio: user.bio, gender: user.gender, hair: user.hair, skin: user.skin }); setErr(''); setEdit(true) }
  const save = async () => { const e = await app.updateProfile({ ...f, name: f.name.trim(), handle: f.handle.trim(), bio: f.bio.trim() }); if (e) setErr(e); else { setEdit(false); app.toast('บันทึกโปรไฟล์แล้ว', '✅') } }
  const savePw = async () => {
    if (pf.nw !== pf.nw2) { setErr('รหัสผ่านใหม่ไม่ตรงกัน'); return }
    const e = await app.changePassword(pf.old, pf.nw); if (e) setErr(e); else { setPw(false); setPf({ old: '', nw: '', nw2: '' }); app.toast('เปลี่ยนรหัสผ่านแล้ว', '🔐') }
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card className="overflow-hidden !p-0">
          <div className="relative h-40 sm:h-52"><Scene kind="lavender" /><div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent" /></div>
          <div className="relative px-5 pb-5">
            <div className="-mt-14 flex flex-wrap items-end gap-4">
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="rounded-full bg-white p-1.5 shadow-xl"><MeFace size={110} ring={s.color} /></motion.div>
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-2 text-2xl font-bold">{user.name} <span className="chip bg-gradient-to-r from-plum to-pink text-white">Lv.{user.level}</span></div>
                <div className="text-sm text-ink/50">{user.handle} · <MapPin size={12} className="inline" /> กรุงเทพฯ · {user.email}</div>
              </div>
              <div className="flex gap-2 pb-1">
                <Btn onClick={openEdit}><Pencil size={15} /> แก้ไขโปรไฟล์</Btn>
                <Btn variant="ghost" className="!px-3" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/#/profile`).catch(() => {}); app.toast('คัดลอกลิงก์โปรไฟล์แล้ว', '🔗') }}><Share2 size={15} /></Btn>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:max-w-md">
              {[[myPosts.length, 'โพสต์', 'home'], [d.friends.length, 'เพื่อน', 'friends'], [d.pets.length, 'สัตว์เลี้ยง', 'pets']].map(([n, l, to]) => (
                <button key={l as string} onClick={() => app.go(to as 'home')} className="rounded-2xl bg-white/70 py-3 hover:bg-white"><div className="text-xl font-bold">{n}</div><div className="text-xs text-ink/50">{l}</div></button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <button onClick={() => app.go('more')} className="chip text-white" style={{ background: s.color }}>● {s.th}</button>
              <button onClick={() => app.go('more')} className="chip bg-white/80">{PRIVACY[d.privacy].emoji} {PRIVACY[d.privacy].th}</button>
              <span className="chip bg-white/80">✦ {d.points.toLocaleString()} P</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-ink/70">{user.bio || <span className="text-ink/40">ยังไม่มีคำแนะนำตัว — กด “แก้ไขโปรไฟล์”</span>}</p>
          </div>
        </Card>
        <Card delay={0.05}>
          <Header title="สัตว์เลี้ยงของฉัน" sub={`${d.pets.length} ตัว`} right={<Btn variant="ghost" className="!py-1 text-xs" onClick={() => app.go('pets')}>ดูทั้งหมด</Btn>} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {d.pets.slice(0, 8).map((p) => (
              <motion.button key={p.id} whileHover={{ y: -4 }} onClick={() => { if (app.online) app.act(`/pets/${p.id}/active`, {}, 'POST', { quiet: true }); else app.up((x) => ({ ...x, activePet: p.id })); app.go('pets') }} className="flex flex-col items-center rounded-3xl bg-gradient-to-b from-white to-lav-50 p-3">
                <PetWithAcc pet={p} size={90} /><div className="text-sm font-semibold">{p.name}</div><Rarity r={p.rarity} />
              </motion.button>
            ))}
          </div>
        </Card>
        <Card delay={0.1}>
          <Header title="โพสต์ของฉัน" sub={myPosts.length ? `${myPosts.length} โพสต์` : 'ยังไม่มีโพสต์'} right={<Btn variant="ghost" className="!py-1 text-xs" onClick={() => app.go('home')}>โพสต์ใหม่</Btn>} />
          <div className="grid grid-cols-3 gap-2">
            {myPosts.map((p) => (
              <button key={p.id} onClick={() => app.go('home')} className="relative aspect-square overflow-hidden rounded-2xl">
                {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <Scene kind={p.scene} />}
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/50 p-1.5 text-left text-[10px] text-white">{p.text}</span>
              </button>
            ))}
            {myPosts.length === 0 && <p className="col-span-3 py-6 text-center text-sm text-ink/40">แชร์ช่วงเวลาแรกของคุณที่หน้าหลัก ✨</p>}
          </div>
        </Card>
      </div>
      <Card delay={0.1} className="h-fit !p-3 lg:sticky lg:top-24">
        <Header title="Avatar 3D" sub="หมุนดูได้รอบตัว" right={<Btn variant="ghost" className="!py-1 text-xs" onClick={() => app.go('avatar')}>แต่งตัว</Btn>} />
        <AvatarStage outfit={d.outfit} height={330} />
      </Card>

      <Sheet open={edit} onClose={() => setEdit(false)} title="แก้ไขโปรไฟล์">
        <div className="space-y-3">
          <div className="flex justify-center"><div className="rounded-full bg-white p-1"><MeFacePreview gender={f.gender} hair={f.hair} skin={f.skin} /></div></div>
          <label className="block text-xs text-ink/55">ชื่อที่แสดง<input value={f.name} maxLength={30} onChange={(e) => setF({ ...f, name: e.target.value })} className={input} /></label>
          <label className="block text-xs text-ink/55">ชื่อผู้ใช้<input value={f.handle} maxLength={25} onChange={(e) => setF({ ...f, handle: e.target.value.startsWith('@') ? e.target.value : '@' + e.target.value })} className={input} /></label>
          <label className="block text-xs text-ink/55">แนะนำตัว<textarea value={f.bio} maxLength={160} rows={3} onChange={(e) => setF({ ...f, bio: e.target.value })} className={input} /><span className="float-right text-[10px]">{f.bio.length}/160</span></label>
          <div className="text-xs text-ink/55">เพศ (ใช้กับกฎการส่งข้อความ)
            <div className="mt-1 grid grid-cols-2 gap-2">{([['f', '👩 หญิง'], ['m', '👨 ชาย']] as const).map(([k, l]) => <button key={k} onClick={() => setF({ ...f, gender: k })} className={`rounded-2xl p-2.5 text-sm ${f.gender === k ? 'bg-white ring-2 ring-plum' : 'bg-white/60'}`}>{l}</button>)}</div>
          </div>
          <div className="text-xs text-ink/55">สีผม<div className="mt-1 flex gap-2">{HAIRS.map((c) => <button key={c} onClick={() => setF({ ...f, hair: c })} className={`h-8 w-8 rounded-full ${f.hair === c ? 'ring-2 ring-plum ring-offset-2' : ''}`} style={{ background: c }} />)}</div></div>
          <div className="text-xs text-ink/55">สีผิว<div className="mt-1 flex gap-2">{SKINS.map((c) => <button key={c} onClick={() => setF({ ...f, skin: c })} className={`h-8 w-8 rounded-full ${f.skin === c ? 'ring-2 ring-plum ring-offset-2' : ''}`} style={{ background: c }} />)}</div></div>
          {err && <p className="rounded-2xl bg-rose-50 p-2 text-xs text-rose-600">{err}</p>}
          <Btn className="w-full" onClick={save}>บันทึก</Btn>
          <button onClick={() => { setEdit(false); setErr(''); setPw(true) }} className="flex w-full items-center justify-center gap-1 text-xs text-plum-600"><KeyRound size={12} /> เปลี่ยนรหัสผ่าน</button>
        </div>
      </Sheet>
      <Sheet open={pw} onClose={() => setPw(false)} title="เปลี่ยนรหัสผ่าน 🔐">
        <div className="space-y-3">
          <input type="password" placeholder="รหัสผ่านปัจจุบัน" value={pf.old} onChange={(e) => setPf({ ...pf, old: e.target.value })} className={input} />
          <input type="password" placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)" value={pf.nw} onChange={(e) => setPf({ ...pf, nw: e.target.value })} className={input} />
          <input type="password" placeholder="ยืนยันรหัสผ่านใหม่" value={pf.nw2} onChange={(e) => setPf({ ...pf, nw2: e.target.value })} className={input} />
          {err && <p className="rounded-2xl bg-rose-50 p-2 text-xs text-rose-600">{err}</p>}
          <Btn className="w-full" onClick={savePw}>ยืนยัน</Btn>
        </div>
      </Sheet>
    </div>
  )
}

import { Face } from '../components/art'
import { meFace } from '../components/Layout'
function MeFacePreview({ gender, hair, skin }: { gender: 'f' | 'm'; hair: string; skin: string }) {
  return <Face p={meFace({ gender, hair, skin })} size={88} />
}
