import { Lock, MessageCircle, UserPlus, Utensils, Check, Hand, Send } from 'lucide-react'
import { STATUS } from '../data/status'
import type { Person } from '../data/types'
import { canAddFriend, canMessage, canViewInfo, zone } from '../lib/rules'
import { useApp } from '../store/AppStore'
import { Face } from './art'
import { isDot } from './Radar'
import { Btn, Sheet } from './ui'

export function PersonSheet({ person, onClose }: { person: Person | null; onClose: () => void }) {
  const app = useApp()
  const p = person ? app.person(person.id) : null
  return (
    <Sheet open={!!p && !isDot(p)} onClose={onClose} title={p ? (zone(p.distance) === 'near' ? 'โปรไฟล์ใกล้คุณ' : 'ผู้ใช้ในระยะไกล') : ''}>
      {p && !isDot(p) && (() => {
        const z = zone(p.distance)
        const s = STATUS[p.status]
        const isFriend = app.d.friends.includes(p.id)
        const g = app.user?.gender ?? 'f'
        const ruleOk = canMessage(p, { isFriend, myGender: g, myStatus: app.d.relationship })
        const stealth = app.d.privacy === 'invisible' || app.d.privacy === 'ghost'
        const msg = ruleOk && (isFriend || (z !== 'far' && !stealth))
        const hasThread = (app.d.chats[p.id]?.length ?? 0) > 0
        const info = (z === 'near' || isFriend) && canViewInfo(p, isFriend)
        const sent = app.d.sent.includes(p.id)
        const add = canAddFriend(p, g) && !isFriend && z !== 'far'
        const hidden = p.status === 'hidden'
        const blurred = (z !== 'near' && !isFriend) || hidden
        const why = hidden ? 'ผู้ใช้นี้ปิดบังตัวตน ทักหาไม่ได้'
          : !ruleOk ? `สถานะ “${s.th}” ไม่อนุญาตให้คุณทักหา`
          : z === 'far' && !isFriend ? 'อยู่ไกลเกิน 500 ม. — เดินเข้าไปใกล้อีกนิดนะ'
          : stealth && !isFriend ? 'คุณอยู่ในโหมดผี/ล่องหน ทักได้เฉพาะเพื่อน' : ''
        const hi = (kind: 'hi' | 'wave') => {
          app.sendMsg(p.id, kind === 'hi' ? 'สวัสดี 👋 ยินดีที่ได้รู้จักนะ' : '👋 โบกมือทักทาย', kind)
          app.toast(kind === 'hi' ? `ทักทาย ${p.name} แล้ว` : `โบกมือให้ ${p.name}`, '👋')
        }
        return (
          <div>
            <div className="relative overflow-hidden rounded-3xl p-5 text-center" style={{ background: `linear-gradient(160deg, ${s.soft}, #fff)` }}>
              <div className="mx-auto w-fit" style={{ filter: blurred ? 'blur(6px)' : undefined }}>
                <Face p={p} size={92} ring={s.color} />
              </div>
              <div className="mt-3 text-lg font-bold">{blurred ? '••••••' : p.name}</div>
              <div className="text-xs text-ink/50">{blurred ? 'ไม่เปิดเผยตัวตน' : `${p.handle} · Lv.${p.level}`}</div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="chip text-white" style={{ background: s.color }}>● {s.th}</span>
                <span className="chip bg-white/80 text-ink/70">📍 {p.distance} ม.</span>
                {isFriend && <span className="chip bg-mint/60 text-emerald-700">เพื่อน</span>}
              </div>
            </div>
            <p className="mt-3 rounded-2xl bg-white/70 p-3 text-xs text-ink/60"><b style={{ color: s.color }}>กติกาสถานะ:</b> {s.rule}</p>
            {info ? (
              <div className="mt-3 space-y-2 text-sm">
                <div className="rounded-2xl bg-white/70 p-3">💭 {p.mood}</div>
                <div className="rounded-2xl bg-white/70 p-3">{p.bio}</div>
                {p.petEmoji && (
                  <div className="flex items-center justify-between rounded-2xl bg-white/70 p-3">
                    <span>{p.petEmoji} น้อง {p.petName ?? 'Pet'} กำลังเดินข้าง ๆ</span>
                    <Btn variant="soft" className="!px-3 !py-1 text-xs" disabled={app.online && !isFriend} title={app.online && !isFriend ? 'ให้อาหารได้เฉพาะสัตว์เลี้ยงของเพื่อน' : ''}
                      onClick={() => {
                        if (app.online) { app.act(`/friends/${p.id}/feed-pet`).then((r) => r && app.toast(`ให้อาหารน้อง ${p.petName ?? ''} แล้ว −20 P`, '🍖')); return }
                        if (app.spend(20, `ให้อาหารน้อง ${p.petName ?? ''}`)) app.bumpDaily('feedOthers')
                      }}><Utensils size={14} /> ให้อาหาร</Btn>
                  </div>
                )}
                <div className="text-xs text-ink/50">เพื่อนร่วมกัน {p.mutual} คน</div>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/70 p-3 text-sm text-ink/60"><Lock size={16} /> {z !== 'near' && !isFriend ? 'อยู่นอกรัศมี 200 ม. — เห็นเพียงสถานะ' : 'ผู้ใช้นี้จำกัดการดูข้อมูล'}</div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Btn disabled={!msg} className="disabled:opacity-40" onClick={() => hi('hi')}><Send size={16} /> Say Hi</Btn>
              <Btn variant="soft" disabled={!msg} className="disabled:opacity-40" onClick={() => hi('wave')}><Hand size={16} /> โบกมือ</Btn>
              <Btn variant="ghost" disabled={!msg && !hasThread} className="disabled:opacity-40" onClick={() => { onClose(); app.go('chat', p.id) }}><MessageCircle size={16} /> เปิดแชท</Btn>
              <Btn variant="ghost" disabled={isFriend || !add || sent} className="disabled:opacity-40" onClick={() => app.addFriend(p.id)}>
                {isFriend ? <><Check size={16} /> เป็นเพื่อนแล้ว</> : sent ? <><Check size={16} /> ส่งคำขอแล้ว</> : <><UserPlus size={16} /> เพิ่มเพื่อน</>}
              </Btn>
            </div>
            {why && <p className="mt-2 text-center text-[11px] text-ink/45">🔒 {why}</p>}
            {isFriend && <button onClick={() => { if (confirm(`เลิกเป็นเพื่อนกับ ${p.name}?`)) { if (app.online) app.act(`/friends/${p.id}`, {}, 'DELETE').then((r) => r && app.toast('เลิกเป็นเพื่อนแล้ว', '💔'))
                else { app.up((x) => ({ ...x, friends: x.friends.filter((f) => f !== p.id) })); app.toast('เลิกเป็นเพื่อนแล้ว', '💔') } } }} className="mx-auto mt-3 block text-[11px] font-semibold text-rose-400 hover:text-rose-500">เลิกเป็นเพื่อน</button>}
          </div>
        )
      })()}
    </Sheet>
  )
}
