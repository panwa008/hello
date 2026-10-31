import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, Camera, ChevronLeft, ChevronRight, Heart, Image as ImageIcon, MapPin, MessageCircle, Plus, Send, Share2, Smile, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Face, PALETTES, PetDragon, Scene } from '../components/art'
import { MeFace } from '../components/Layout'
import { Radar } from '../components/Radar'
import { DailyQuests, FirstTip, LivingWorldBanner } from '../components/World'
import { Bar, Btn, Card, Header, Sheet, Tabs } from '../components/ui'
import { byId, STORIES } from '../data/mock'
import { STATUS } from '../data/status'
import { useApp, type Comment, type FeedPost, type SceneKind, type Story } from '../store/AppStore'
import { ago, uid } from '../lib/storage'
import { fileToDataUrl } from '../lib/image'
import { zone } from '../lib/rules'

const SCENES: SceneKind[] = ['sunset', 'lavender', 'city', 'beach', 'cafe', 'night']
const STORY_TEXT = ['เดินเล่นยามเย็น 🌇', 'น้องมังกรง่วงแล้ว 😴', 'กาแฟแก้วที่ 3 ☕', 'ทะเลวันนี้สวยมาก 🌊', 'ทุ่งลาเวนเดอร์ 💜', 'ไฟเมืองตอนกลางคืน ✨', 'ไข่ใบใหม่! 🥚', 'ฝนตกแต่ใจฟู 🌧️']
const PLACES = ['สวนเบญจกิติ', 'สยามพารากอน', 'คาเฟ่ลาเวนเดอร์', 'ริมแม่น้ำเจ้าพระยา', 'สวนลุมพินี', 'บ้าน 🏠']
const FEELINGS = ['😊 มีความสุข', '🥰 ตกหลุมรัก', '😴 ง่วง', '🤩 ตื่นเต้น', '😌 ชิล', '🥲 เหนื่อยนิดหน่อย']

type StoryGroup = { by: string; items: Story[] }

function useStoryGroups(): StoryGroup[] {
  const { d } = useApp()
  return useMemo(() => {
    const day = new Date(); day.setHours(0, 0, 0, 0)
    const base = day.getTime() + 8 * 3_600_000
    const others = STORIES.map((id, i) => ({ by: id, items: [0, 1].slice(0, i % 3 === 0 ? 2 : 1).map((k) => ({ id: `s-${id}-${k}`, by: id, scene: SCENES[(i + k * 2) % 6], text: STORY_TEXT[(i + k) % STORY_TEXT.length], time: Math.min(Date.now() - 600_000, base + i * 1_800_000) })) }))
    const mine = d.stories.filter((s) => Date.now() - s.time < 86_400_000)
    return mine.length ? [{ by: 'me', items: mine }, ...others] : others
  }, [d.stories])
}

function StoryViewer({ groups, start, onClose }: { groups: StoryGroup[]; start: number; onClose: () => void }) {
  const { user, up, sendMsg, toast, d, online, act } = useApp()
  const [g, setG] = useState(start)
  const [k, setK] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reply, setReply] = useState('')
  const group = groups[g]; const s = group?.items[k]
  const next = () => { if (k < group.items.length - 1) setK(k + 1); else if (g < groups.length - 1) { setG(g + 1); setK(0) } else onClose() }
  const prev = () => { if (k > 0) setK(k - 1); else if (g > 0) { setG(g - 1); setK(0) } }
  useEffect(() => {
    if (!s) return
    up((x) => (x.seen.includes(s.id) ? x : { ...x, seen: [...x.seen, s.id].slice(-200) }))
    if (paused) return
    const t = setTimeout(next, 5000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, k, paused])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  })
  if (!s) return null
  const p = group.by === 'me' ? null : byId(group.by)
  const isFriend = p ? d.friends.includes(p.id) : false
  return (
    <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-plum-800/80 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="relative h-full w-full max-w-[440px] overflow-hidden sm:h-[88vh] sm:rounded-[32px]">
        <motion.div key={s.id} initial={{ scale: 1.05, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0">
          {s.image ? <img src={s.image} className="h-full w-full object-cover" alt="" /> : <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full"><Scene kind={s.scene} /></div>}
        </motion.div>
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/45 to-transparent" />
        <div className="absolute inset-x-3 top-3 flex gap-1">
          {group.items.map((it, i) => (
            <div key={it.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/35">
              <motion.div key={s.id + paused} className="h-full bg-white" initial={{ width: i < k ? '100%' : '0%' }} animate={{ width: i < k ? '100%' : i === k ? (paused ? undefined : '100%') : '0%' }} transition={{ duration: i === k ? 5 : 0, ease: 'linear' }} />
            </div>
          ))}
        </div>
        <div className="absolute inset-x-3 top-7 flex items-center gap-2 text-white">
          {p ? <Face p={p} size={36} /> : <MeFace size={36} />}
          <div className="text-sm font-semibold drop-shadow">{p?.name ?? user?.name}<span className="ml-2 text-xs font-normal opacity-80">{ago(s.time)}</span></div>
          <button onClick={onClose} className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-black/25"><X size={18} /></button>
        </div>
        <button aria-label="ก่อนหน้า" onClick={prev} className="absolute left-0 top-20 bottom-24 w-1/3" />
        <button aria-label="ถัดไป" onClick={next} className="absolute right-0 top-20 bottom-24 w-2/3" />
        <div className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.4)]">{s.text}</div>
        <div className="absolute inset-x-3 bottom-4 flex gap-2">
          {p ? (
            <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); if (!reply.trim()) return; if (!isFriend) { toast('ตอบกลับสตอรี่ได้เฉพาะเพื่อน', '🔒'); return } sendMsg(p.id, `ตอบกลับสตอรี่: ${reply}`); setReply(''); toast('ส่งข้อความแล้ว', '💬') }}>
              <input value={reply} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} onChange={(e) => setReply(e.target.value)} placeholder={isFriend ? `ตอบกลับ ${p.name}...` : 'ตอบกลับได้เฉพาะเพื่อน'} className="flex-1 rounded-full bg-white/25 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/70 backdrop-blur" />
              <button className="grid h-10 w-10 place-items-center rounded-full bg-white/25 text-white"><Send size={16} /></button>
              <button type="button" onClick={() => toast(`ส่ง 💜 ให้ ${p.name}`, '💜')} className="grid h-10 w-10 place-items-center rounded-full bg-white/25 text-white"><Heart size={16} /></button>
            </form>
          ) : (
            <button onClick={() => { if (online) act(`/stories/${s.id}`, {}, 'DELETE'); else up((x) => ({ ...x, stories: x.stories.filter((y) => y.id !== s.id) })); toast('ลบสตอรี่แล้ว', '🗑️'); onClose() }} className="mx-auto flex items-center gap-2 rounded-full bg-white/25 px-4 py-2 text-sm text-white"><Trash2 size={15} /> ลบสตอรี่นี้</button>
          )}
        </div>
        <button onClick={prev} className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white sm:grid"><ChevronLeft size={18} /></button>
        <button onClick={next} className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white sm:grid"><ChevronRight size={18} /></button>
      </div>
    </motion.div>
  )
}

function NewStory({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { up, toast, online, act } = useApp()
  const [text, setText] = useState('')
  const [scene, setScene] = useState<SceneKind>('lavender')
  const [img, setImg] = useState<string>()
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <Sheet open={open} onClose={onClose} title="เพิ่มสตอรี่ (24 ชม.)">
      <div className="relative mx-auto aspect-[9/12] w-48 overflow-hidden rounded-3xl">
        {img ? <img src={img} className="h-full w-full object-cover" alt="" /> : <div className="h-full [&>svg]:h-full [&>svg]:w-full"><Scene kind={scene} /></div>}
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 text-center text-lg font-bold text-white drop-shadow">{text || 'พิมพ์ข้อความ...'}</div>
      </div>
      <input value={text} onChange={(e) => setText(e.target.value)} maxLength={60} placeholder="ข้อความบนสตอรี่" className="mt-3 w-full rounded-2xl bg-white/80 px-4 py-2.5 text-sm outline-none" />
      <div className="mt-3 flex flex-wrap gap-2">
        {SCENES.map((k) => <button key={k} onClick={() => { setScene(k); setImg(undefined) }} className={`h-10 w-10 overflow-hidden rounded-xl ring-2 ${scene === k && !img ? 'ring-plum' : 'ring-transparent'} [&>svg]:h-full [&>svg]:w-full`}><Scene kind={k} /></button>)}
        <button onClick={() => fileRef.current?.click()} className="grid h-10 w-10 place-items-center rounded-xl bg-white/80 text-plum-600"><ImageIcon size={18} /></button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImg(await fileToDataUrl(f, 720)) }} />
      </div>
      <Btn className="mt-4 w-full" onClick={async () => {
        if (online) { if (!(await act('/stories', { scene, text: text || '✨', image: img }))) return }
        else up((x) => ({ ...x, stories: [{ id: uid('st'), by: 'me', scene, text: text || '✨', time: Date.now(), image: img }, ...x.stories] }))
        toast('ลงสตอรี่แล้ว!', '📸'); setText(''); setImg(undefined); onClose() }}>แชร์สตอรี่</Btn>
    </Sheet>
  )
}

function Stories() {
  const { d } = useApp()
  const groups = useStoryGroups()
  const [view, setView] = useState<number | null>(null)
  const [add, setAdd] = useState(false)
  const hasMine = groups[0]?.by === 'me'
  return (
    <Card className="!p-4">
      <div className="flex gap-4 overflow-x-auto no-scrollbar">
        <button onClick={() => (hasMine ? setView(0) : setAdd(true))} className="flex shrink-0 flex-col items-center gap-1.5">
          <div className="relative">
            <div className="rounded-full p-[3px]" style={{ background: hasMine ? 'conic-gradient(#F5A9C5, #9B7EBD, #A8E6CF, #F5A9C5)' : 'transparent' }}><div className="rounded-full bg-white p-[2px]"><MeFace size={56} /></div></div>
            <span onClick={(e) => { e.stopPropagation(); setAdd(true) }} className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full btn-primary text-white ring-2 ring-white"><Plus size={14} /></span>
          </div>
          <span className="text-[11px] font-medium text-ink/70">สตอรี่ของคุณ</span>
        </button>
        {groups.map((gr, i) => {
          if (gr.by === 'me') return null
          const p = byId(gr.by)
          const seen = gr.items.every((s) => d.seen.includes(s.id))
          return (
            <motion.button key={gr.by} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -3 }} onClick={() => setView(i)} className="flex shrink-0 flex-col items-center gap-1.5">
              <div className="rounded-full p-[3px]" style={{ background: seen ? '#D9D2E6' : 'conic-gradient(#F5A9C5, #9B7EBD, #A8E6CF, #F5A9C5)' }}>
                <div className="rounded-full bg-white p-[2px]"><Face p={p} size={56} /></div>
              </div>
              <span className={`text-[11px] font-medium ${seen ? 'text-ink/40' : 'text-ink/70'}`}>{p.name}</span>
            </motion.button>
          )
        })}
      </div>
      <AnimatePresence>{view !== null && <StoryViewer groups={groups} start={view} onClose={() => setView(null)} />}</AnimatePresence>
      <NewStory open={add} onClose={() => setAdd(false)} />
    </Card>
  )
}

function Composer() {
  const { up, toast, earn, d, online, act } = useApp()
  const [text, setText] = useState('')
  const [img, setImg] = useState<string>()
  const [place, setPlace] = useState<string>()
  const [feeling, setFeeling] = useState<string>()
  const [pick, setPick] = useState<'place' | 'feeling' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const onFile = async (f?: File) => { if (f) { try { setImg(await fileToDataUrl(f)) } catch { toast('อ่านรูปไม่ได้', '⚠️') } } }
  const post = async () => {
    if (!text.trim() && !img) { toast('พิมพ์อะไรสักหน่อยนะ', '✍️'); return }
    const tags = (text.match(/#[^\s#]+/g) ?? [])
    if (online) {
      const r = await act<{ bonus?: number }>('/posts', { text: text.replace(/#[^\s#]+/g, '').trim(), tags, place: place ?? 'กรุงเทพฯ', scene: SCENES[Math.floor(Math.random() * 6)], image: img, feeling })
      if (!r) return
      setText(''); setImg(undefined); setPlace(undefined); setFeeling(undefined)
      toast((r as { bonus?: number }).bonus ? 'โพสต์แรกของวัน +20 P' : 'โพสต์แล้ว!', '🎉')
      return
    }
    const first = !d.posts.some((p) => p.authorId === 'me' && Date.now() - p.time < 86_400_000)
    up((x) => ({ ...x, posts: [{ id: uid('p'), authorId: 'me', time: Date.now(), place: place ?? 'กรุงเทพฯ', text: text.replace(/#[^\s#]+/g, '').trim(), tags, scene: SCENES[Math.floor(Math.random() * 6)], image: img, feeling, likes: 0, comments: [] }, ...x.posts] }))
    setText(''); setImg(undefined); setPlace(undefined); setFeeling(undefined)
    if (first) earn(20, 'โพสต์แรกของวัน'); else toast('โพสต์แล้ว!', '🎉')
  }
  const btn = 'flex items-center gap-1 rounded-full px-3 py-1.5 hover:bg-white'
  return (
    <Card delay={0.05} className="!p-4">
      <div className="flex items-start gap-3">
        <MeFace size={42} />
        <textarea value={text} rows={text.length > 40 ? 3 : 1} onChange={(e) => setText(e.target.value)} placeholder="วันนี้เจออะไรดี ๆ บ้าง~ (ใส่ #แท็ก ได้)" className="flex-1 resize-none rounded-3xl bg-white/80 px-4 py-2.5 text-sm outline-none placeholder:text-ink/40 focus:ring-2 focus:ring-plum/30" />
        <Btn onClick={post} aria-label="โพสต์"><Send size={15} /></Btn>
      </div>
      {(img || place || feeling) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 pl-[54px] text-xs">
          {img && <div className="relative"><img src={img} className="h-20 rounded-2xl object-cover" alt="" /><button onClick={() => setImg(undefined)} className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-white shadow"><X size={12} /></button></div>}
          {place && <span className="chip">📍 {place} <button onClick={() => setPlace(undefined)}><X size={11} /></button></span>}
          {feeling && <span className="chip">{feeling} <button onClick={() => setFeeling(undefined)}><X size={11} /></button></span>}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-1 pl-[54px] text-xs text-ink/60">
        <button className={btn + ' bg-white/60'} onClick={() => fileRef.current?.click()}><ImageIcon size={14} className="text-emerald-500" />รูปภาพ</button>
        <button className={btn + ' bg-white/60'} onClick={() => camRef.current?.click()}><Camera size={14} className="text-sky-500" />กล้อง</button>
        <button className={btn + ' bg-white/60'} onClick={() => setPick('place')}><MapPin size={14} className="text-pink-500" />เช็คอิน</button>
        <button className={btn + ' bg-white/60'} onClick={() => setPick('feeling')}><Smile size={14} className="text-amber-500" />ความรู้สึก</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      <Sheet open={!!pick} onClose={() => setPick(null)} title={pick === 'place' ? 'เช็คอินที่ไหน?' : 'รู้สึกอย่างไร?'}>
        <div className="grid grid-cols-2 gap-2">
          {(pick === 'place' ? PLACES : FEELINGS).map((v) => (
            <button key={v} onClick={() => { if (pick === 'place') setPlace(v); else setFeeling(v); setPick(null) }} className="rounded-2xl bg-white/80 px-3 py-3 text-sm hover:bg-white">{pick === 'place' ? '📍 ' : ''}{v}</button>
          ))}
        </div>
      </Sheet>
    </Card>
  )
}

function CommentRow({ c, onReply, depth = 0 }: { c: Comment; onReply?: (c: Comment) => void; depth?: number }) {
  const { user } = useApp()
  const by = c.by === 'me' ? null : byId(c.by)
  return (
    <div className={depth ? 'ml-9' : ''}>
      <div className="flex items-start gap-2">
        {by ? <Face p={by} size={28} /> : <MeFace size={28} />}
        <div>
          <div className="rounded-2xl rounded-tl-md bg-white/80 px-3 py-1.5 text-sm"><b className="text-xs">{by?.name ?? user?.name}</b><div>{c.text}</div></div>
          <div className="mt-0.5 flex gap-3 pl-2 text-[11px] text-ink/45">{ago(c.time)}{onReply && <button onClick={() => onReply(c)} className="font-semibold hover:text-plum-600">ตอบกลับ</button>}</div>
        </div>
      </div>
      {c.replies.map((r) => <div key={r.id} className="mt-2"><CommentRow c={r} depth={1} /></div>)}
    </div>
  )
}

function PostCard({ post, i }: { post: FeedPost; i: number }) {
  const { d, up, user, toast, people } = useApp()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [burst, setBurst] = useState(false)
  const mine = post.authorId === 'me'
  const a = mine ? null : people.find((p) => p.id === post.authorId) ?? byId(post.authorId)
  const isLiked = d.liked.includes(post.id)
  const saved = d.saved.includes(post.id)
  const count = post.comments.reduce((n, c) => n + 1 + c.replies.length, 0)
  const { online, act } = useApp()
  const like = () => online ? act(`/posts/${post.id}/like`, { like: !isLiked }, 'POST', { quiet: true }) : up((x) => ({ ...x, liked: isLiked ? x.liked.filter((l) => l !== post.id) : [...x.liked, post.id] }))
  const setPost = (fn: (p: FeedPost) => FeedPost) => up((x) => ({ ...x, posts: x.posts.map((p) => (p.id === post.id ? fn(p) : p)) }))
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    if (online) {
      act(`/posts/${post.id}/comments`, { text: draft.trim(), parentId: replyTo?.id })
      setDraft(''); setReplyTo(null); return
    }
    const c: Comment = { id: uid('c'), by: 'me', text: draft.trim(), time: Date.now(), replies: [] }
    setPost((p) => ({ ...p, comments: replyTo ? p.comments.map((x) => (x.id === replyTo.id ? { ...x, replies: [...x.replies, c] } : x)) : [...p.comments, c] }))
    setDraft(''); setReplyTo(null)
    if (!mine && Math.random() < 0.6) setTimeout(() => setPost((p) => ({ ...p, comments: p.comments.map((x) => (x.id === (replyTo?.id ?? c.id) ? { ...x, replies: [...x.replies, { id: uid('c'), by: post.authorId, text: 'ขอบคุณที่แวะมาเม้นน้าา 💜', time: Date.now(), replies: [] }] } : x)) })), 2500)
  }
  return (
    <Card delay={Math.min(0.3, 0.1 + i * 0.05)} className="!p-0 overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        {a ? <Face p={a} size={44} ring={STATUS[a.status].color} /> : <MeFace size={44} />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold">{a?.name ?? user?.name} {a && <span className="h-2 w-2 rounded-full" style={{ background: STATUS[a.status].color }} />}{post.feeling && <span className="font-normal text-ink/50">· รู้สึก {post.feeling}</span>}</div>
          <div className="text-xs text-ink/45">{ago(post.time)} · 📍 {post.place}{a && ` · ${a.distance} ม.`}</div>
        </div>
        {mine && <button onClick={() => { if (confirm('ลบโพสต์นี้?')) { if (online) act(`/posts/${post.id}`, {}, 'DELETE'); else up((x) => ({ ...x, posts: x.posts.filter((p) => p.id !== post.id) })); toast('ลบโพสต์แล้ว', '🗑️') } }} className="rounded-full p-2 text-ink/40 hover:bg-white/60 hover:text-rose-500" aria-label="ลบโพสต์"><Trash2 size={16} /></button>}
      </div>
      {post.text && <p className="whitespace-pre-wrap px-4 text-[15px] leading-relaxed">{post.text}</p>}
      {post.tags.length > 0 && <div className="px-4 pt-1 text-sm text-plum-600">{post.tags.join(' ')}</div>}
      <div className="relative mx-4 mt-3 aspect-[16/9] overflow-hidden rounded-3xl select-none" onDoubleClick={() => { if (!isLiked) like(); setBurst(true); setTimeout(() => setBurst(false), 700) }}>
        {post.image ? <img src={post.image} className="h-full w-full object-cover" alt="" /> : <Scene kind={post.scene} />}
        {a?.petEmoji && !post.image && <span className="absolute bottom-3 left-3 rounded-full bg-white/80 px-3 py-1 text-xs font-medium backdrop-blur">{a.petEmoji} กับน้อง {a.petName ?? 'Pet'}</span>}
        <AnimatePresence>{burst && <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1.2, opacity: 1 }} exit={{ scale: 1.6, opacity: 0 }} className="absolute inset-0 grid place-items-center text-7xl">💖</motion.div>}</AnimatePresence>
      </div>
      <div className="flex items-center gap-1 px-3 py-2">
        <motion.button whileTap={{ scale: 1.3 }} onClick={like} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm ${isLiked ? 'text-pink-500' : 'text-ink/60'} hover:bg-white/60`}>
          <Heart size={19} fill={isLiked ? 'currentColor' : 'none'} /> {post.likes + (isLiked ? 1 : 0)}
        </motion.button>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-ink/60 hover:bg-white/60"><MessageCircle size={19} /> {count}</button>
        <button onClick={() => { navigator.clipboard?.writeText(`${location.origin}/#/home?post=${post.id}`).catch(() => {}); toast('คัดลอกลิงก์โพสต์แล้ว', '🔗') }} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-ink/60 hover:bg-white/60"><Share2 size={18} /> แชร์</button>
        <button onClick={() => { up((x) => ({ ...x, saved: saved ? x.saved.filter((s) => s !== post.id) : [...x.saved, post.id] })); toast(saved ? 'เลิกบันทึกแล้ว' : 'บันทึกโพสต์แล้ว', '🔖') }} className={`ml-auto rounded-full p-2 hover:bg-white/60 ${saved ? 'text-plum-600' : 'text-ink/60'}`}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 px-4 pb-4">
              {post.comments.length === 0 && <p className="text-center text-xs text-ink/45">ยังไม่มีความคิดเห็น เป็นคนแรกเลย!</p>}
              {post.comments.map((c) => <CommentRow key={c.id} c={c} onReply={(c) => setReplyTo(c)} />)}
              {replyTo && <div className="flex items-center gap-2 pl-2 text-xs text-plum-600">กำลังตอบกลับ {replyTo.by === 'me' ? 'ตัวเอง' : byId(replyTo.by).name}<button onClick={() => setReplyTo(null)}><X size={12} /></button></div>}
              <form onSubmit={submit} className="flex gap-2 pt-1">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={replyTo ? 'เขียนคำตอบ...' : 'เขียนความคิดเห็น...'} className="flex-1 rounded-full bg-white/80 px-4 py-2 text-sm outline-none" />
                <Btn type="submit" className="!px-3"><Send size={14} /></Btn>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

function SideColumn() {
  const { go, pet, d, people } = useApp()
  const near = people.filter((p) => zone(p.distance) === 'near' && p.status !== 'hidden').length
  return (
    <div className="space-y-4">
      <Card delay={0.1} className="cursor-pointer !p-3" onClick={() => go('explorer')}>
        <Header title="Map Explorer" sub={`มีคน ${near} คนในรัศมี 200 ม.`} right={<span className="chip bg-lav text-plum-600">เปิดแผนที่</span>} />
        <Radar compact />
      </Card>
      <Card delay={0.15} className="relative overflow-hidden !bg-gradient-to-br from-[#EFE6FD] to-[#FCE8F1]">
        <Header title="Fantasy Pet" sub={`น้อง ${pet.name} · Lv.${pet.level}`} right={<Btn variant="ghost" className="!py-1 text-xs" onClick={() => go('pets')}>ดูบ้าน</Btn>} />
        <div className="flex items-center gap-2">
          <div className="anim-float"><PetDragon palette={PALETTES[pet.palette] ?? PALETTES.lumi} size={130} pose={d.pose} /></div>
          <div className="flex-1 space-y-2">
            <Bar value={pet.hunger} from="#FFD3B5" to="#F5A9C5" label="ความอิ่ม" icon="🍖" />
            <Bar value={pet.mood} from="#A8E6CF" to="#9FD3F5" label="อารมณ์" icon="💖" />
          </div>
        </div>
      </Card>
      <Card delay={0.2} className="cursor-pointer" onClick={() => go('wallet')}>
        <Header title="ก้าวเดินวันนี้" sub="100 ก้าว = 1 พอยท์" />
        <div className="flex items-end justify-between">
          <div><div className="text-3xl font-bold text-plum-600">{d.steps.toLocaleString()}</div><div className="text-xs text-ink/50">/ 10,000 ก้าว</div></div>
          <div className="text-right text-xs text-ink/50">ยอดพอยท์<div className="text-lg font-bold text-ink">✦ {d.points.toLocaleString()}</div></div>
        </div>
        <div className="mt-3"><Bar value={(d.steps / 10000) * 100} from="#A8E6CF" to="#34C77B" label="เป้าหมาย" icon="👣" /></div>
      </Card>
    </div>
  )
}

export default function Home() {
  const { d, go, eggSpots, online } = useApp()
  const nearestEgg = online ? (eggSpots.length ? Math.min(...eggSpots.map((e) => e.distance)) : undefined) : 430
  const [tab, setTab] = useState<'all' | 'friends' | 'mine' | 'saved'>('all')
  const posts = d.posts.filter((p) => (tab === 'all' ? true : tab === 'friends' ? d.friends.includes(p.authorId) : tab === 'mine' ? p.authorId === 'me' : d.saved.includes(p.id)))
  const readyEggs = d.eggs.filter((e) => Date.now() - e.start >= e.dur).length
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-4">
        <FirstTip />
        <LivingWorldBanner nearestEgg={nearestEgg} />
        {readyEggs > 0 && <motion.button onClick={() => go('pets')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass flex w-full items-center gap-3 rounded-[24px] bg-gradient-to-r from-pink/40 to-lav p-3 text-left text-sm"><span className="text-2xl">🐣</span><span>ไข่ {readyEggs} ฟองพร้อมฟักแล้ว! แตะเพื่อไปที่บ้านสัตว์เลี้ยง</span></motion.button>}
        <DailyQuests />
        <Stories />
        <Composer />
        <Tabs tabs={[{ id: 'all', label: 'ทั้งหมด' }, { id: 'friends', label: 'เพื่อน' }, { id: 'mine', label: 'ของฉัน' }, { id: 'saved', label: 'บันทึกไว้' }]} value={tab} onChange={setTab} />
        {posts.length === 0 && <Card className="text-center text-sm text-ink/50">ยังไม่มีโพสต์ในหมวดนี้ ✨</Card>}
        {posts.map((p, i) => <PostCard key={p.id} post={p} i={i} />)}
      </div>
      <div className="hidden xl:block"><div className="sticky top-24"><SideColumn /></div></div>
    </div>
  )
}
