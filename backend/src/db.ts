import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

const file = process.env.DB_FILE ?? path.resolve(process.cwd(), 'data', 'hello.db')
if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true })

export const db = new Database(file)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE, pass_hash TEXT, name TEXT NOT NULL, handle TEXT NOT NULL, bio TEXT DEFAULT '',
  gender TEXT DEFAULT 'f', hair TEXT DEFAULT '#7A4A35', skin TEXT DEFAULT '#FCE0CF', level INTEGER DEFAULT 1,
  is_bot INTEGER DEFAULT 0, status TEXT DEFAULT 'open', privacy TEXT DEFAULT 'nearby', mood TEXT DEFAULT '',
  pet_emoji TEXT, pet_name TEXT, bg TEXT, mutual INTEGER DEFAULT 0, bot_distance REAL, bot_bearing REAL,
  walking INTEGER DEFAULT 1, active_pet TEXT, prefs TEXT DEFAULT '{}', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL, revoked INTEGER DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS wallets (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, points INTEGER NOT NULL DEFAULT 0,
  steps INTEGER DEFAULT 0, steps_date TEXT, steps_synced_at INTEGER, redeemed INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, label TEXT NOT NULL,
  points INTEGER NOT NULL, thb REAL, kind TEXT, ref TEXT, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tx_user ON transactions(user_id, created_at);
CREATE TABLE IF NOT EXISTS pets (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, kind TEXT NOT NULL,
  palette TEXT NOT NULL, rarity TEXT NOT NULL, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, hunger REAL DEFAULT 80,
  mood REAL DEFAULT 80, energy REAL DEFAULT 100, last_tick INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS pet_gear (
  pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE, slot TEXT NOT NULL, item_id TEXT NOT NULL, PRIMARY KEY (pet_id, slot)
);
CREATE TABLE IF NOT EXISTS eggs (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, hue TEXT, rarity TEXT NOT NULL,
  start_at INTEGER NOT NULL, dur_ms INTEGER NOT NULL, source TEXT
);
CREATE TABLE IF NOT EXISTS inventory (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, item_id TEXT NOT NULL, qty INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, item_id)
);
CREATE TABLE IF NOT EXISTS outfits (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, hair TEXT, top TEXT, bottom TEXT, shoes TEXT,
  acc TEXT DEFAULT 'none', aura TEXT DEFAULT 'none', backpack TEXT DEFAULT 'none'
);
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, text TEXT, tags TEXT DEFAULT '[]',
  place TEXT, scene TEXT, image TEXT, feeling TEXT, base_likes INTEGER DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS post_likes (post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, user_id TEXT NOT NULL, PRIMARY KEY (post_id, user_id));
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, user_id TEXT NOT NULL, parent_id TEXT,
  text TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, scene TEXT, text TEXT, image TEXT, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS friendships (
  requester TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, addressee TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL, PRIMARY KEY (requester, addressee)
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, from_id TEXT NOT NULL, to_id TEXT NOT NULL, text TEXT NOT NULL, kind TEXT DEFAULT 'text',
  read_at INTEGER, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS msg_pair ON messages(from_id, to_id, created_at);
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY, seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, thb REAL NOT NULL,
  points INTEGER, emoji TEXT, tint TEXT, condition TEXT, category TEXT, status TEXT DEFAULT 'active', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  method TEXT NOT NULL, pay TEXT NOT NULL, amount REAL NOT NULL, meet TEXT, status TEXT DEFAULT 'pending', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS locations (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, lat REAL NOT NULL, lng REAL NOT NULL, accuracy REAL,
  source TEXT DEFAULT 'gps', updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS location_trail (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS egg_spots (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, lat REAL NOT NULL, lng REAL NOT NULL,
  rarity TEXT NOT NULL, collected INTEGER DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS game_scores (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, game TEXT NOT NULL, score INTEGER NOT NULL,
  points INTEGER NOT NULL, meta TEXT, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS gs_user ON game_scores(user_id, game, created_at);
CREATE TABLE IF NOT EXISTS daily_counters (user_id TEXT NOT NULL, date TEXT NOT NULL, key TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, date, key));
CREATE TABLE IF NOT EXISTS mission_claims (user_id TEXT NOT NULL, date TEXT NOT NULL, mission TEXT NOT NULL, PRIMARY KEY (user_id, date, mission));
`)

export const uid = (p = 'id') => p + '_' + Date.now().toString(36) + randomBytes(4).toString('hex')
export const now = () => Date.now()
export const tx = <T>(fn: () => T): T => db.transaction(fn)()

const TZ = process.env.TZ_APP ?? 'Asia/Bangkok'
/** Local calendar date (YYYY-MM-DD) in the app timezone. */
export function today(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
/** Seconds elapsed since local midnight in the app timezone. */
export function secondsSinceMidnight(d = new Date()) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(d)
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0)
  return g('hour') * 3600 + g('minute') * 60 + g('second')
}
/** Steps count only between 00:01 and 23:59 local time. */
export const inStepWindow = (d = new Date()) => { const s = secondsSinceMidnight(d); return s >= 60 && s < 23 * 3600 + 59 * 60 + 59 }

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'error') { super(message) }
}
export const bad = (msg: string, code = 'bad_request') => new ApiError(400, msg, code)
export const notFound = (msg = 'ไม่พบข้อมูล') => new ApiError(404, msg, 'not_found')

// ---------- payments (real-mode plumbing) ----------
db.exec(`
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, method TEXT NOT NULL, mode TEXT NOT NULL,
  amount_thb REAL NOT NULL, points INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',             -- pending | succeeded | failed | expired
  provider_ref TEXT, redirect_url TEXT, qr_payload TEXT, phone_masked TEXT, error TEXT,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, credited_at INTEGER
);
CREATE INDEX IF NOT EXISTS pay_user ON payments(user_id, created_at);
CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,                                  -- provider event id (dedupe)
  payment_id TEXT, provider TEXT NOT NULL, status TEXT, verified INTEGER NOT NULL, body TEXT, received_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tx_topup_ref ON transactions(ref) WHERE kind='topup' AND ref IS NOT NULL;
`)
