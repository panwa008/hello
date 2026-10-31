import { motion } from 'framer-motion'
import { Locate, Footprints, Pause } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Radar, visOf, type RadarEgg, type RadarFilter } from '../components/Radar'
import { PersonSheet } from '../components/PersonSheet'
import { Btn, Card, Header, PageTitle, Sheet, Tabs } from '../components/ui'
import { Face } from '../components/art'
import { PRIVACY, STATUS } from '../data/status'
import type { Person, PrivacyMode, StatusKey } from '../data/types'
import { zone } from '../lib/rules'
import { useApp } from '../store/AppStore'
import { uid } from '../lib/storage'
import { MOCK_HOME } from '../lib/geo'
import { SPOT_STYLE, worldSpots, type WorldSpot } from '../lib/world'
import { FirstTip } from '../components/World'

export function StatusLegend() {
  return (
    <div className="space-y-2">
      {(Object.keys(STATUS) as StatusKey[]).map((k) => (
        <div key={k} className="flex items-start gap-3 rounded-2xl bg-white/60 p-2.5">
          <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white" style={{ background: STATUS[k].color, boxShadow: `0 0 10px ${STATUS[k].color}88` }} />
          <div>
            <div className="text-sm font-semibold" style={{ color: STATUS[k].color }}>{STATUS[k].th} <span className="text-[10px] font-normal text-ink/40">({STATUS[k].en})</span></div>
            <div className="text-[11px] leading-snug text-ink/55">{STATUS[k].rule}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

const HUES = ['#F5A9C5', '#9FD3F5', '#A8E6CF', '#CDB8F2', '#FFD3B5']

export default function Explorer() {
  const app = useApp()
  const { people, d, walkSim, setWalkSim, geo, geoError } = app
  const [filter, setFilter] = useState<RadarFilter>('all')
  const [pick, setPick] = useState<Person | null>(null)
  const [egg, setEgg] = useState<{ distance: number; angle: number } | null>({ distance: 430, angle: 35 })
  const [busyEgg, setBusyEgg] = useState(false)
  const [layer, setLayer] = useState<'all' | 'people' | 'world'>('all')
  const [spot, setSpot] = useState<WorldSpot | null>(null)
  const loc = geo ?? { lat: MOCK_HOME.lat, lng: MOCK_HOME.lng }
  const spots = useMemo(() => worldSpots(loc.lat, loc.lng, app.world.quests), [loc.lat.toFixed(2), loc.lng.toFixed(2), app.world.quests.map((q) => q.completed).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { app.startGeo() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (app.online || !walkSim || !egg) return
    const t = setInterval(() => setEgg((e) => (e ? { ...e, distance: Math.max(60, e.distance - 12) } : e)), 1000)
    return () => clearInterval(t)
  }, [walkSim, egg, app.online])
  const eggs: RadarEgg[] = app.online ? app.eggSpots : egg ? [{ id: 'local', ...egg }] : []
  const nearestEgg = [...eggs].sort((a, b) => a.distance - b.distance)[0]
  const collectOnline = async (e: RadarEgg) => {
    if (busyEgg) return
    if (e.distance > 200) { app.toast(`ไข่อยู่ห่าง ${e.distance} ม. เดินเข้าไปให้ใกล้ ≤200 ม. ก่อนนะ`, '🚶'); return }
    setBusyEgg(true)
    const r = await app.act<{ eggId: string; rarity: string }>(`/explorer/eggs/${e.id}/collect`)
    setBusyEgg(false)
    if (!r) return
    app.notify({ text: `เก็บไข่ ${r.rarity} ได้! วางในตู้ฟักแล้ว (+10 P)`, emoji: '🥚', to: 'pets' })
    app.toast(`ได้ไข่ ${r.rarity}! ไปดูที่ตู้ฟักได้เลย`, '🥚')
    app.loadNearby()
  }
  const collect = (e?: RadarEgg) => {
    if (app.online) { if (e ?? nearestEgg) collectOnline((e ?? nearestEgg)!); return }
    if (!egg) return
    if (zone(egg.distance) !== 'near') { app.toast(`ไข่อยู่ห่าง ${egg.distance} ม. เดินเข้าไปให้ใกล้ ≤200 ม. ก่อนนะ`, '🚶'); return }
    const rarity = Math.random() < 0.15 ? 'Epic' : Math.random() < 0.5 ? 'Rare' : 'Common'
    const dur = { Common: 20_000, Rare: 35_000, Epic: 50_000 }[rarity]!
    app.up((x) => ({ ...x, eggs: [...x.eggs, { id: uid('eg'), hue: HUES[Math.floor(Math.random() * HUES.length)], rarity, start: Date.now(), dur, source: 'เก็บได้จากแผนที่' }] }))
    app.notify({ text: `เก็บไข่ ${rarity} ได้! วางในตู้ฟักแล้ว`, emoji: '🥚', to: 'pets' })
    app.toast(`ได้ไข่ ${rarity}! ไปดูที่ตู้ฟักได้เลย`, '🥚')
    setEgg(null)
    setTimeout(() => setEgg({ distance: 480 + Math.round(Math.random() * 200), angle: Math.round(Math.random() * 360) }), 8000)
  }
  const visible = people.filter((p) => visOf(p) === 'clear')
  const counts = { near: visible.length, mid: people.filter((p) => visOf(p) === 'blur').length, far: people.filter((p) => visOf(p) === 'dot').length }
  const srcLabel = !geo ? 'กำลังหาตำแหน่ง…' : geo.source === 'gps' ? `GPS จริง${geo.accuracy != null ? ` ±${geo.accuracy} ม.` : ''}` : geo.source === 'sim' ? 'เดินจำลอง' : `ตำแหน่งจำลอง · ${MOCK_HOME.label}`
  const srcCls = !geo ? 'bg-white/80 text-ink/50' : geo.source === 'gps' ? 'bg-emerald-100 text-emerald-700' : geo.source === 'sim' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'
  const stealth = d.privacy === 'invisible' || d.privacy === 'ghost'
  return (
    <div>
      <PageTitle en="World Scanner" th="สแกนโลกรอบตัวคุณ" right={<span className={`chip ${srcCls}`} title={geo ? `${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}` : ''}>📍 {srcLabel}</span>} />
      <div className="mb-3"><FirstTip /></div>
      {geoError && geo?.source !== 'gps' && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[24px] bg-amber-50/90 p-3 text-sm text-amber-800">
          <span className="text-xl">🛰️</span><div className="flex-1">{geoError}{app.online ? ' · เซิร์ฟเวอร์ยังคำนวณระยะจริงจากตำแหน่งนี้' : ''}</div>
        </div>
      )}
      {stealth && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[24px] bg-violet-100/80 p-3 text-sm text-violet-800">
          <span className="text-2xl">{PRIVACY[d.privacy].emoji}</span>
          <div className="flex-1"><b>คุณอยู่ใน{PRIVACY[d.privacy].th}</b> — {PRIVACY[d.privacy].desc}. คนแปลกหน้าจะทักคุณไม่ได้ และคุณทักได้เฉพาะเพื่อน</div>
          <Btn variant="ghost" className="!py-1.5 text-xs" onClick={() => app.setPrivacy('nearby')}>กลับเป็นใกล้เคียง</Btn>
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="!p-3 sm:!p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap gap-2">
              <Tabs value={layer} onChange={setLayer} tabs={[{ id: 'all', label: '🌍 ทุกชั้น' }, { id: 'people', label: '🧑 คน' }, { id: 'world', label: '🗺️ โลก' }]} />
              {layer !== 'world' && <Tabs value={filter} onChange={setFilter} tabs={[{ id: 'all', label: 'ทั้งหมด' }, { id: 'near', label: '≤ 200 ม.' }, { id: 'mid', label: '200–500 ม.' }, { id: 'far', label: '500 ม.+' }]} />}
            </div>
            <div className="flex gap-2">
              {app.features.simSteps && <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setWalkSim(!walkSim); app.toast(walkSim ? 'หยุดเดินจำลองแล้ว' : 'เริ่มเดินจำลอง — ก้าวเดินจะเพิ่มขึ้นเรื่อย ๆ', walkSim ? '⏸️' : '🚶') }}
                className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${walkSim ? 'btn-primary text-white' : 'bg-white/80 text-plum-600'}`}>
                {walkSim ? <Pause size={14} /> : <Footprints size={14} />} {walkSim ? 'หยุดเดิน' : 'จำลองการเดิน'}
              </motion.button>}
              <motion.button whileTap={{ scale: 0.9 }} title="กลับตำแหน่งฉัน" onClick={() => { setFilter('all'); app.startGeo(); app.loadNearby(); app.toast(geo ? `ตำแหน่งปัจจุบัน: ${srcLabel}` : 'กำลังหาตำแหน่ง…', '📍') }} className="grid h-9 w-9 place-items-center rounded-full bg-white/80 text-plum-600"><Locate size={16} /></motion.button>
            </div>
          </div>
          <div className="mx-auto max-w-[680px]"><Radar filter={filter} onPick={setPick} eggs={layer === 'people' ? [] : eggs} onEgg={collect} spots={layer === 'people' ? [] : spots} onSpot={setSpot} showPeople={layer !== 'world'} /></div>
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
            <span className="chip bg-emerald-100 text-emerald-700">● 0–200 ม. · เห็นชัด {counts.near} คน</span>
            <span className="chip bg-sky-100 text-sky-700">● 200–500 ม. · ภาพเบลอ {counts.mid} คน</span>
            <span className="chip bg-violet-100 text-violet-700">● 500 ม.+ · จุดสถานะ {counts.far} คน</span>
            {nearestEgg && <button onClick={() => collect(nearestEgg)} className="chip bg-pink-100 text-pink-600">🥚 ไข่ใกล้สุด {nearestEgg.distance} ม.{nearestEgg.distance <= 200 ? ' · แตะเพื่อเก็บ' : ''}{eggs.length > 1 ? ` (มี ${eggs.length} ฟอง)` : ''}</button>}
            {layer !== 'people' && (Object.keys(SPOT_STYLE) as (keyof typeof SPOT_STYLE)[]).filter((k) => spots.some((x) => x.kind === k)).map((k) => <span key={k} className="chip" style={{ background: SPOT_STYLE[k].color + '26', color: '#4a3d63' }}>{SPOT_STYLE[k].emoji} {SPOT_STYLE[k].th}</span>)}
            {walkSim && <span className="chip bg-white text-emerald-600">👣 วันนี้ {d.steps.toLocaleString()} ก้าว</span>}
          </div>
        </Card>
        <div className="space-y-4">
          <Card delay={0.05}>
            <Header title="ใกล้คุณตอนนี้" sub="ภายในรัศมี 200 ม. · แตะเพื่อทักทาย" />
            <div className="space-y-1">
              {visible.map((p) => (
                <button key={p.id} onClick={() => setPick(p)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-white/70">
                  {p.status === 'hidden' ? <span className="grid h-10 w-10 place-items-center rounded-full bg-violet-200 text-violet-700">?</span> : <Face p={p} size={40} ring={STATUS[p.status].color} />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{p.status === 'hidden' ? 'ผู้ใช้ปิดบัง' : p.name} {p.petEmoji}</div>
                    <div className="truncate text-xs text-ink/50">{p.mood}</div>
                  </div>
                  <span className="text-xs text-ink/40">{p.distance} ม.</span>
                </button>
              ))}
              {visible.length === 0 && <p className="py-4 text-center text-sm text-ink/45">ไม่มีใครในระยะ 200 ม. ลองเดินดูนะ 🚶</p>}
            </div>
          </Card>
          <Card delay={0.1}>
            <Header title="การมองเห็นของฉัน" sub="เลือกว่าใครเห็นคุณบนแผนที่" />
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PRIVACY) as PrivacyMode[]).map((k) => (
                <button key={k} onClick={() => app.setPrivacy(k)} className={`rounded-2xl p-2.5 text-left text-xs ${d.privacy === k ? 'bg-white ring-2 ring-plum/40' : 'bg-white/60'}`}>
                  <div className="font-semibold">{PRIVACY[k].emoji} {PRIVACY[k].th}</div>
                </button>
              ))}
            </div>
          </Card>
          <Card delay={0.15}>
            <Header title="สถานะของคน" sub="สีบอกว่าใครทักหาได้แค่ไหน" />
            <StatusLegend />
          </Card>
        </div>
      </div>
      <PersonSheet person={pick} onClose={() => setPick(null)} />
      <Sheet open={!!spot} onClose={() => setSpot(null)} title={spot ? `${SPOT_STYLE[spot.kind].th} ใกล้คุณ` : ''}>
        {spot && (() => {
          const done = app.world.checkins.includes(spot.id)
          const near = spot.distance <= 200 || spot.kind === 'quest'
          return (
            <div>
              <div className="rounded-3xl p-5 text-center" style={{ background: `linear-gradient(160deg, ${spot.color}33, #fff)` }}>
                <motion.div className="text-5xl" animate={{ rotate: spot.kind === 'portal' ? 360 : 0 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}>{spot.emoji}</motion.div>
                <div className="mt-2 text-lg font-bold">{spot.name}</div>
                <div className="mt-1 flex justify-center gap-2"><span className="chip bg-white/80 text-ink/70">📍 {spot.distance} ม.</span>{done && <span className="chip bg-mint/60 text-emerald-700">✓ เช็คอินแล้ววันนี้</span>}</div>
              </div>
              <p className="mt-3 rounded-2xl bg-white/70 p-3 text-sm">✨ {spot.bonus}</p>
              <p className="mt-2 text-center text-[11px] text-ink/45">เช็คอินครั้งแรกของวันได้ +5 P · เข้าใกล้ ≤200 ม. ก่อนนะ</p>
              <Btn className="mt-3 w-full" disabled={done} onClick={() => {
                if (!near) { app.toast(`${spot.name} อยู่ห่าง ${spot.distance} ม. เดินเข้าไปอีกนิดนะ`, '🚶'); return }
                app.checkIn(spot); setSpot(null)
              }}>{done ? 'เช็คอินแล้ว' : 'เช็คอินที่นี่'}</Btn>
            </div>
          )
        })()}
      </Sheet>
    </div>
  )
}
