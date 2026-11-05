import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingBag, X } from 'lucide-react'
import { useState } from 'react'
import { AvatarStage } from '../../components/AvatarStage'
import { Btn, Card, Header, PageTitle, Points, Rarity, Sheet, Tabs } from '../../components/ui'
import { AVATAR_SHOP } from '../../data/mock'
import type { ShopItem } from '../../data/types'
import { useApp, type Outfit } from '../../store/AppStore'
import { CAT_MAP } from '../avatar/AvatarScreen'
import { RealmBanner } from '../shared/realm'

const SALE = new Set(['a4', 'h3'])
const price = (it: ShopItem) => (SALE.has(it.id) ? Math.round(it.price * 0.8) : it.price)
const slotOf = (id: string) => CAT_MAP.find((c) => AVATAR_SHOP[c.id].some((i) => i.id === id))!.slot
const ALL = Object.values(AVATAR_SHOP).flat()

export default function AvatarShop() {
  const app = useApp()
  const { d } = app
  const [cat, setCat] = useState<keyof typeof AVATAR_SHOP>('tops')
  const [trial, setTrial] = useState<Partial<Outfit>>({})
  const [cart, setCart] = useState<string[]>([])
  const [checkout, setCheckout] = useState(false)
  const [equip, setEquip] = useState(true)
  const c = CAT_MAP.find((x) => x.id === cat)!
  const preview = { ...d.outfit, ...trial }
  const items = cart.map((id) => ALL.find((i) => i.id === id)!)
  const total = items.reduce((s, i) => s + price(i), 0)
  const toggleCart = (id: string) => setCart((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]))
  const wear = (o: Partial<Outfit>) => {
    const next = { ...app.d.outfit, ...o }
    app.up((x) => ({ ...x, outfit: next }))
    if (app.online) app.act('/avatar/outfit', next, 'PUT')
  }
  const pay = async () => {
    if (app.online) {
      if (d.points < total) { app.toast('พอยท์ไม่พอ ไปเติมที่กระเป๋าเงินนะ', '🪙'); return }
      for (const it of items) {
        const r = await app.act('/avatar/buy', { itemId: it.id, equip })
        if (!r) return // stop on first failure; already-bought items stay bought
        setCart((x) => x.filter((y) => y !== it.id))
      }
      app.toast(equip ? 'ซื้อและสวมใส่แล้ว!' : 'ซื้อแล้ว ไปที่ตู้เสื้อผ้าเพื่อสวมใส่', '🛍️')
      setTrial({}); setCheckout(false)
      return
    }
    if (!app.spend(total, `ร้านแต่งตัว ${items.length} ชิ้น`)) return
    app.up((x) => {
      const outfit = { ...x.outfit }
      if (equip) items.forEach((i) => { outfit[slotOf(i.id)] = i.id })
      return { ...x, owned: [...new Set([...x.owned, ...cart])], outfit }
    })
    app.toast(equip ? 'ซื้อและสวมใส่แล้ว!' : 'ซื้อแล้ว ไปที่ตู้เสื้อผ้าเพื่อสวมใส่', '🛍️')
    setCart([]); setTrial({}); setCheckout(false)
  }
  const trialUnowned = Object.values(trial).filter((v): v is string => !!v && v !== 'none' && !d.owned.includes(v))
  return (
    <div>
      <PageTitle en="Avatar Boutique · Digital" th="ร้านแต่งตัวอวตาร" right={<div className="flex items-center gap-2"><span className="chip bg-white/80"><Points n={d.points} />
      <RealmBanner realm="digital">Fitting Room · ห้องลองชุดอวตาร · ใช้ Hello Points เท่านั้น · ไม่ใช่เสื้อผ้าจริง</RealmBanner></span>
        <button onClick={() => setCheckout(true)} className="relative grid h-10 w-10 place-items-center rounded-full bg-white/80 text-plum-600"><ShoppingBag size={18} />{cart.length > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-pink px-1 text-[10px] font-bold text-white">{cart.length}</span>}</button></div>} />
      <div className="mb-4 overflow-hidden rounded-[28px] bg-gradient-to-r from-[#F9D7E6] via-[#EADCFB] to-[#D6F3E7] p-5">
        <div className="text-xs font-semibold tracking-[0.25em] text-plum">NEW COLLECTION</div>
        <div className="text-2xl font-bold">Sakura Dream 🌸</div>
        <div className="text-sm text-ink/60">เดรสซากุระลิมิเต็ด + ผมชมพู ลด 20% ถึงสิ้นเดือน</div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <div className="mb-4"><Tabs value={cat} onChange={setCat} tabs={CAT_MAP.map((x) => ({ id: x.id, label: x.label }))} /></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {AVATAR_SHOP[cat].map((it, i) => {
              const owned = d.owned.includes(it.id)
              const inCart = cart.includes(it.id)
              const trying = trial[c.slot] === it.id
              return (
                <motion.div key={it.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -4 }} className={`rounded-3xl bg-white/75 p-3 ${trying ? 'ring-2 ring-pink' : ''}`}>
                  <div className="relative grid aspect-square place-items-center rounded-2xl" style={{ background: `linear-gradient(135deg, ${it.tint[0]}, ${it.tint[1]})` }}>
                    <span className="text-5xl drop-shadow">{it.emoji}</span>
                    <span className="absolute left-2 top-2"><Rarity r={it.rarity} /></span>
                    {(it.tag || SALE.has(it.id)) && <span className="chip absolute right-2 top-2 !px-2 bg-pink text-[10px] text-white">{SALE.has(it.id) ? '-20%' : it.tag}</span>}
                  </div>
                  <div className="mt-2 truncate text-sm font-semibold">{it.name}</div>
                  <div className="flex items-center gap-1"><Points n={price(it)} className="text-sm" />{SALE.has(it.id) && <span className="text-[10px] text-ink/40 line-through">{it.price}</span>}</div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <Btn variant="ghost" className="!px-2 !py-1 text-[11px]" onClick={() => setTrial({ ...trial, [c.slot]: it.id })}>ลองใส่</Btn>
                    {owned ? <Btn variant="soft" className="!px-2 !py-1 text-[11px]" onClick={() => { wear({ [c.slot]: it.id }); app.toast(`สวม${it.name}แล้ว`, it.emoji) }}>สวมใส่</Btn>
                      : <Btn variant={inCart ? 'soft' : 'primary'} className="!px-2 !py-1 text-[11px]" onClick={() => toggleCart(it.id)}>{inCart ? 'ในตะกร้า ✓' : 'ใส่ตะกร้า'}</Btn>}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </Card>
        <Card delay={0.05} className="lg:sticky lg:top-24 h-fit !p-3">
          <Header title="ห้องลองชุด" sub="Fitting room" right={<button className="text-xs text-plum-600" onClick={() => setTrial({})}>ล้าง</button>} />
          <AvatarStage outfit={preview} height={300} />
          {trialUnowned.length > 0 ? (
            <Btn className="mt-3 w-full" onClick={() => { setCart((x) => [...new Set([...x, ...trialUnowned])]); setCheckout(true) }}><ShoppingBag size={14} /> ซื้อทั้งลุค ({trialUnowned.length} ชิ้น)</Btn>
          ) : (
            <Btn className="mt-3 w-full" disabled={!Object.keys(trial).length} onClick={() => { wear(trial); setTrial({}); app.toast('สวมใส่ลุคนี้แล้ว', '👗') }}>สวมใส่ชุดนี้</Btn>
          )}
        </Card>
      </div>
      <Sheet open={checkout} onClose={() => setCheckout(false)} title="ตะกร้าสินค้า 🛍️">
        {items.length === 0 ? <p className="py-8 text-center text-sm text-ink/50">ตะกร้าว่าง — เลือกไอเท็มที่ชอบได้เลย</p> : (
          <div>
            <AnimatePresence>
              {items.map((i) => (
                <motion.div key={i.id} layout exit={{ opacity: 0, x: 40 }} className="mb-2 flex items-center gap-3 rounded-2xl bg-white/75 p-2">
                  <span className="grid h-12 w-12 place-items-center rounded-xl text-2xl" style={{ background: `linear-gradient(135deg, ${i.tint[0]}, ${i.tint[1]})` }}>{i.emoji}</span>
                  <div className="flex-1"><div className="text-sm font-medium">{i.name}</div><Points n={price(i)} className="text-xs" /></div>
                  <button onClick={() => toggleCart(i.id)} className="p-2 text-ink/40"><X size={16} /></button>
                </motion.div>
              ))}
            </AnimatePresence>
            <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={equip} onChange={(e) => setEquip(e.target.checked)} className="accent-[#9B7EBD]" /> สวมใส่ทันทีหลังซื้อ</label>
            <div className="mt-3 space-y-1 rounded-2xl bg-white/70 p-3 text-sm">
              <div className="flex justify-between"><span>รวม {items.length} ชิ้น</span><Points n={total} /></div>
              <div className="flex justify-between text-ink/55"><span>คงเหลือ</span><span className={d.points >= total ? '' : 'text-rose-500'}>{(d.points - total).toLocaleString()} P</span></div>
            </div>
            <Btn className="mt-4 w-full" disabled={d.points < total} onClick={pay}>{d.points >= total ? `ชำระ ${total.toLocaleString()} พอยท์` : 'พอยท์ไม่พอ'}</Btn>
            {d.points < total && <button onClick={() => { setCheckout(false); app.go('wallet') }} className="mt-2 w-full text-xs text-plum-600 underline">เติมพอยท์</button>}
          </div>
        )}
      </Sheet>
    </div>
  )
}
