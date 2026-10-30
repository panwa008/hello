import { db, now, today, uid, tx } from './db'
import { hashPassword } from './auth'
import { config } from './config'
import data from './seed-data.json'

const MIN = 60_000, HOUR = 3_600_000
type P = (typeof data.PEOPLE)[number]

function insertBot(p: P) {
  db.prepare(`INSERT OR IGNORE INTO users (id,email,pass_hash,name,handle,bio,gender,hair,skin,level,is_bot,status,privacy,mood,pet_emoji,pet_name,bg,mutual,bot_distance,bot_bearing,walking,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,?,?,?,1,?)`).run(
    p.id, null, null, p.name, p.handle, p.bio, p.gender, p.hair, p.skin, p.level, p.status, p.status === 'hidden' ? 'ghost' : 'public', p.mood,
    (p as { petEmoji?: string }).petEmoji ?? null, (p as { petName?: string }).petName ?? null, JSON.stringify(p.bg), p.mutual, p.distance, p.angle, now() - 30 * 24 * HOUR)
  db.prepare('INSERT OR IGNORE INTO wallets (user_id, points, steps_date) VALUES (?,?,?)').run(p.id, 5000, today())
}

/** Give a user the starter world (pets, eggs, wardrobe, friends, chats...). */
export function starterKit(userId: string, opts: { points?: number; steps?: number } = {}) {
  const t = now()
  db.prepare('INSERT OR REPLACE INTO wallets (user_id, points, steps, steps_date, steps_synced_at, redeemed) VALUES (?,?,?,?,?,0)').run(userId, opts.points ?? 11250, opts.steps ?? 0, today(), t)
  const pets = [
    ['Lumi', 'มังกรเมฆ', 'lumi', 'Epic', 12, 64, 62, 84, 71],
    ['Mochi', 'มังกรซากุระ', 'mochi', 'Rare', 7, 30, 80, 70, 90],
    ['Sora', 'มังกรมิ้นต์', 'sora', 'Rare', 5, 12, 55, 66, 60],
  ] as const
  const ids: string[] = []
  pets.forEach((p, i) => {
    const id = uid('pt'); ids.push(id)
    db.prepare('INSERT INTO pets (id,user_id,name,kind,palette,rarity,level,xp,hunger,mood,energy,last_tick,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id, userId, ...p, t, t + i)
  })
  db.prepare('UPDATE users SET active_pet=? WHERE id=?').run(ids[0], userId)
  const eggs = [['#F5A9C5', 'Rare', t - 30_000, 35_000, 'พบที่สวนเบญจกิติ'], ['#9B7EBD', 'Epic', t - 10_000, 50_000, 'กล่องสุ่ม'], ['#9FD3F5', 'Common', t - 60_000, 20_000, 'พบริมแม่น้ำ']] as const
  for (const e of eggs) db.prepare('INSERT INTO eggs (id,user_id,hue,rarity,start_at,dur_ms,source) VALUES (?,?,?,?,?,?,?)').run(uid('eg'), userId, ...e)
  const inv: [string, number][] = [['f1', 5], ['f2', 3], ['f4', 2], ['f5', 1], ['a1', 1], ['b1', 1], ['h1', 1], ['s1', 1], ['x3', 1], ['c2', 1]]
  for (const [i, q] of inv) db.prepare('INSERT OR REPLACE INTO inventory (user_id,item_id,qty) VALUES (?,?,?)').run(userId, i, q)
  db.prepare("INSERT OR REPLACE INTO outfits (user_id,hair,top,bottom,shoes,acc,aura,backpack) VALUES (?,'h1','a1','b1','s1','none','none','none')").run(userId)
  db.prepare('INSERT OR IGNORE INTO pet_gear (pet_id,slot,item_id) VALUES (?,?,?)').run(ids[1], 'head', 'c2')
  // Demo social graph / chats / fake history only when demo content is enabled AND the bot users exist.
  const demoWorld = (config.demoBots || config.demoSeed) && !!db.prepare("SELECT 1 FROM users WHERE id='u1' AND is_bot=1").get()
  if (!demoWorld) return
  for (const f of data.FRIEND_IDS) db.prepare("INSERT OR IGNORE INTO friendships (requester,addressee,status,created_at) VALUES (?,?,'accepted',?)").run(f, userId, t - 10 * 24 * HOUR)
  for (const r of data.REQUEST_IDS) db.prepare("INSERT OR IGNORE INTO friendships (requester,addressee,status,created_at) VALUES (?,?,'pending',?)").run(r, userId, t - 30 * MIN)
  const msgs: [string, string, string, number, boolean][] = [
    ['u1', userId, 'สวัสดีจ้า Lumi น่ารักมากเลย 💜', 40, true], [userId, 'u1', 'ขอบคุณน้าา น้องฝากทักทาย 🐉', 38, true], ['u1', userId, 'เย็นนี้ไปเดินสวนด้วยกันมั้ย 🌸', 6, false],
    ['u2', userId, 'คาเฟ่แถวนี้มีโปรเครื่องดื่มลด 20% นะ ☕', 120, false],
    [userId, 'u4', 'ไข่ Rare ฟักเป็นตัวอะไรหรอ', 300, true], ['u4', userId, 'มังกรน้ำเงินเลย ✨ เดี๋ยวพาไปให้ดู', 240, true],
  ]
  for (const [f, to, text, ago, read] of msgs) db.prepare('INSERT INTO messages (id,from_id,to_id,text,kind,read_at,created_at) VALUES (?,?,?,?,?,?,?)').run(uid('m'), f, to, text, 'text', read ? t : null, t - ago * MIN)
  const txs: [string, number, number, number?][] = [['แลกก้าวเดิน 5,200 ก้าว', 52, 23], ['ซื้อไข่เทพนิยาย', -1200, 26], ['เติมเงิน TrueMoney ฿100 (sandbox)', 11000, 72, 100]]
  for (const [l, v, h, thb] of txs) db.prepare('INSERT INTO transactions (id,user_id,label,points,thb,kind,created_at) VALUES (?,?,?,?,?,?,?)').run(uid('tx'), userId, l, v, thb ?? null, 'seed', t - h * HOUR)
  if (db.prepare("SELECT 1 FROM posts WHERE id='p3'").get()) db.prepare('INSERT OR IGNORE INTO post_likes (post_id,user_id) VALUES (?,?)').run('p3', userId)
}

export async function seedIfEmpty(force = false) {
  const has = db.prepare('SELECT COUNT(*) n FROM users').get() as { n: number }
  if (has.n > 0 && !force) return false
  const seedBots = config.demoBots || config.demoSeed
  if (!seedBots) { if (!has.n) console.log('[hello] production profile: no demo data seeded (DEMO_SEED/DEMO_BOTS off)'); return false }
  const hash = config.demoSeed && config.demoPassword ? await hashPassword(config.demoPassword) : null
  tx(() => {
    if (force) for (const t of ['refresh_tokens', 'transactions', 'pet_gear', 'pets', 'eggs', 'inventory', 'outfits', 'post_likes', 'comments', 'posts', 'stories', 'friendships', 'messages', 'orders', 'listings', 'locations', 'location_trail', 'egg_spots', 'game_scores', 'daily_counters', 'mission_claims', 'wallets', 'users']) db.exec(`DELETE FROM ${t}`)
    for (const p of data.PEOPLE) insertBot(p)
    const t = now(), offs = [5 * MIN, 22 * MIN, HOUR, 3 * HOUR, 26 * HOUR]
    data.POSTS.forEach((p, i) => {
      db.prepare('INSERT INTO posts (id,user_id,text,tags,place,scene,base_likes,created_at) VALUES (?,?,?,?,?,?,?,?)').run(p.id, p.authorId, p.text, JSON.stringify(p.tags), p.place, p.scene, p.likes, t - offs[i])
      p.comments.forEach((c, j) => db.prepare('INSERT INTO comments (id,post_id,user_id,text,created_at) VALUES (?,?,?,?,?)').run(`c${i}${j}`, p.id, c.by, c.text, t - offs[i] + (j + 1) * MIN))
    })
    const byName = new Map(data.PEOPLE.map((p) => [p.name, p.id]))
    for (const m of data.MARKET) db.prepare('INSERT INTO listings (id,seller_id,name,thb,points,emoji,tint,condition,category,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(m.id, byName.get(m.seller) ?? 'u1', m.name, m.thb, (m as { points?: number }).points ?? null, m.emoji, JSON.stringify(m.tint), m.condition, m.category, 'active', t - HOUR)
    if (!hash) return
    const demo = 'usr_mayy'
    db.prepare(`INSERT INTO users (id,email,pass_hash,name,handle,bio,gender,hair,skin,level,status,privacy,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(demo, 'mayy@hello.app', hash, 'Mayy', '@mayy.bright', 'Love pets 🐾 | Traveling ✈️ | Coffee addict ☕', 'f', '#7A4A35', '#FCE0CF', 28, 'open', 'nearby', t - 90 * 24 * HOUR)
    starterKit(demo, { points: 11250, steps: 0 })
  })
  console.log(hash ? `[hello] seeded demo data (mayy@hello.app${config.prod ? '' : ' / ' + config.demoPassword})` : '[hello] seeded demo bots/content (no demo login: DEMO_SEED off)')
  return true
}

if (require.main === module) {
  seedIfEmpty(process.argv.includes('--force')).then((r) => { console.log(r ? 'seed done' : 'already seeded (use --force to reset)'); process.exit(0) })
}
