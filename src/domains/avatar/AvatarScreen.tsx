import { motion } from 'framer-motion'
import { Check, Lock } from 'lucide-react'
import { useState } from 'react'
import { AvatarStage } from '../../components/AvatarStage'
import { Btn, Card, Header, PageTitle, Tabs } from '../../components/ui'
import { AVATAR_SHOP } from '../../data/mock'
import { useApp, type Outfit } from '../../store/AppStore'
import { RealmBanner } from '../shared/realm'

export const CAT_MAP: { id: keyof typeof AVATAR_SHOP; label: string; slot: keyof Outfit }[] = [
  { id: 'hair', label: 'ทรงผม', slot: 'hair' },
  { id: 'tops', label: 'เสื้อ', slot: 'top' },
  { id: 'bottoms', label: 'กางเกง/กระโปรง', slot: 'bottom' },
  { id: 'shoes', label: 'รองเท้า', slot: 'shoes' },
  { id: 'accessories', label: 'เครื่องประดับ', slot: 'acc' },
  { id: 'aura', label: 'ออร่า', slot: 'aura' },
  { id: 'backpack', label: 'กระเป๋าเป้', slot: 'backpack' },
]
export const OPTIONAL_SLOTS = new Set<keyof Outfit>(['acc', 'aura', 'backpack'])
export const DEFAULT_OUTFIT: Outfit = { hair: 'h1', top: 'a1', bottom: 'b1', shoes: 's1', acc: 'none', aura: 'none', backpack: 'none' }

export default function Avatar() {
  const app = useApp()
  const outfit = app.d.outfit
  const setOutfit = (o: Partial<Outfit>) => {
    const next = { ...DEFAULT_OUTFIT, ...app.d.outfit, ...o }
    app.up((x) => ({ ...x, outfit: next }))
    if (app.online) app.act('/avatar/outfit', next, 'PUT', { quiet: false })
  }
  const save = async () => {
    if (app.online) { const r = await app.act('/avatar/outfit', { ...DEFAULT_OUTFIT, ...outfit }, 'PUT'); if (!r) return }
    app.toast('บันทึกลุคแล้ว · จะแสดงบนแผนที่และโปรไฟล์', '💾')
  }
  const ownedCount = Object.values(AVATAR_SHOP).flat().filter((i) => app.d.owned.includes(i.id)).length
  const [cat, setCat] = useState<keyof typeof AVATAR_SHOP>('tops')
  const c = CAT_MAP.find((x) => x.id === cat)!
  return (
    <div>
      <PageTitle en="Avatar 3D" th="อวตารของฉัน" right={<Btn variant="ghost" onClick={() => app.go('avatarshop')}>👗 ร้านแต่งตัว</Btn>} />
      <RealmBanner realm="digital">ตัวตนของคุณในโลกอวตาร · ชุดและเครื่องประดับเป็นไอเท็มดิจิทัล</RealmBanner>
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card className="!p-3">
          <AvatarStage outfit={outfit} height={360} />
          <div className="mt-3 flex gap-2">
            <Btn className="flex-1" onClick={save}>บันทึกลุค</Btn>
            <Btn variant="ghost" onClick={() => setOutfit(DEFAULT_OUTFIT)}>รีเซ็ต</Btn>
          </div>
        </Card>
        <Card delay={0.05}>
          <Header title="ตู้เสื้อผ้า" sub={`Wardrobe · มี ${ownedCount} ชิ้น · แตะเพื่อสวมใส่ (บันทึกอัตโนมัติ${app.online ? 'ไปที่เซิร์ฟเวอร์' : ''})`} />
          <div className="mb-3 grid grid-cols-7 gap-1.5">
            {CAT_MAP.map((x) => {
              const v = outfit[x.slot], it = AVATAR_SHOP[x.id].find((i) => i.id === v)
              return (
                <button key={x.id} onClick={() => setCat(x.id)} title={x.label} className={`rounded-2xl p-1.5 text-center ${cat === x.id ? 'bg-white ring-2 ring-plum/40' : 'bg-white/60'}`}>
                  <div className="text-xl">{it ? it.emoji : '—'}</div><div className="truncate text-[9px] text-ink/50">{x.label}</div>
                </button>
              )
            })}
          </div>
          <div className="mb-4"><Tabs value={cat} onChange={setCat} tabs={CAT_MAP.map((x) => ({ id: x.id, label: x.label }))} /></div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {OPTIONAL_SLOTS.has(c.slot) && (
              <button onClick={() => setOutfit({ [c.slot]: 'none' } as Partial<Outfit>)} className={`grid aspect-square place-items-center rounded-3xl bg-white/70 text-sm text-ink/50 ${(outfit[c.slot] ?? 'none') === 'none' ? 'ring-2 ring-plum' : ''}`}>ไม่ใส่</button>
            )}
            {AVATAR_SHOP[cat].map((it, i) => {
              const owned = app.d.owned.includes(it.id)
              const on = outfit[c.slot] === it.id
              return (
                <motion.button key={it.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }}
                  onClick={() => owned ? setOutfit({ [c.slot]: it.id } as Partial<Outfit>) : app.go('avatarshop')}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-3xl transition ${on ? 'ring-2 ring-plum shadow-lg' : ''}`} style={{ background: `linear-gradient(135deg, ${it.tint[0]}, ${it.tint[1]})` }}>
                  <span className={`text-4xl ${owned ? '' : 'opacity-40 grayscale'}`}>{it.emoji}</span>
                  <span className="mt-1 px-1 text-center text-[10px] leading-tight text-ink/70">{it.name}</span>
                  {on && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full btn-primary"><Check size={12} /></span>}
                  {!owned && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-white/90 text-ink/50"><Lock size={11} /></span>}
                </motion.button>
              )
            })}
          </div>
          <p className="mt-4 text-xs text-ink/45">🔒 ไอเท็มที่ล็อกอยู่ซื้อได้ที่ร้านแต่งตัว · ระบบรองรับการเพิ่ม/เปลี่ยนสินค้าภายหลัง</p>
        </Card>
      </div>
    </div>
  )
}
