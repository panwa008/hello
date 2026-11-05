import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Card, PageTitle, Points, Rarity, Tabs } from '../../components/ui'
import { useApp } from '../../store/AppStore'
import { RealmBanner } from '../shared/realm'
import { ACCESSORY_KIND, accessoriesOf, type AccessoryKind } from '.'

/** Accessories hub: one entry, two digital catalogs (people vs pets). Never mixed with the Real Market. */
export default function AccessoriesHub() {
  const app = useApp()
  const [kind, setKind] = useState<AccessoryKind>('human')
  const k = ACCESSORY_KIND[kind]
  const items = accessoriesOf(kind)
  return (
    <div>
      <PageTitle en="Accessories Atelier" th="เครื่องประดับ" right={<span className="chip bg-white/80"><Points n={app.d.points} /></span>} />
      <RealmBanner realm="digital">เครื่องประดับดิจิทัลสำหรับอวตารและสัตว์เลี้ยง · ใช้ Hello Points · ไม่มีขายในตลาดของจริง</RealmBanner>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {(Object.keys(ACCESSORY_KIND) as AccessoryKind[]).map((id, i) => {
          const m = ACCESSORY_KIND[id], on = kind === id
          return (
            <motion.button key={id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -3 }} onClick={() => setKind(id)}
              className={`glass flex items-center gap-4 rounded-[28px] p-4 text-left transition ${on ? 'ring-2 ring-plum/60 shadow-lg' : ''}`}>
              <span className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-white to-lav text-4xl shadow-inner">{m.emoji}</span>
              <div className="flex-1">
                <div className="text-[10px] font-bold tracking-[0.2em] text-plum uppercase">{m.en}</div>
                <div className="text-lg font-bold">{m.th}</div>
                <div className="text-xs text-ink/50">{accessoriesOf(id).length} ชิ้น · ขายใน{m.shopLabel}</div>
              </div>
            </motion.button>
          )
        })}
      </div>
      <Card className="!p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Tabs value={kind} onChange={setKind} tabs={[{ id: 'human', label: '💎 คน / อวตาร' }, { id: 'pet', label: '🎀 สัตว์เลี้ยง' }]} />
          <button onClick={() => app.go(k.shop)} className="flex items-center gap-1 text-xs font-semibold text-plum-600">ไป{k.shopLabel} <ChevronRight size={14} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((it) => (
            <button key={it.id} onClick={() => app.go(k.shop)} className="rounded-[22px] bg-white/70 p-2.5 text-left transition hover:bg-white">
              <div className="relative grid aspect-square place-items-center rounded-[18px] text-5xl" style={{ background: `linear-gradient(140deg, ${it.tint[0]}, ${it.tint[1]})` }}>
                {it.emoji}
                <span className="chip absolute left-1.5 top-1.5 bg-white/85 !text-[9px] text-ink/55">{it.slotLabel}</span>
              </div>
              <div className="mt-2 truncate text-sm font-semibold">{it.name}</div>
              <div className="flex items-center justify-between"><Points n={it.price} className="text-xs" />{it.rarity && <Rarity r={it.rarity} />}</div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
