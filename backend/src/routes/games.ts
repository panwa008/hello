import { z } from 'zod'
import { db, now, uid, bad, today, ApiError, tx } from '../db'
import { body, done, router } from '../http'
import { credit, bump, claimMission, addEgg, getPet, savePet, petView, walletRow } from '../services'
import { getUser } from '../state'

const r = router()
const DAILY_CAP = Number(process.env.GAME_DAILY_CAP ?? 1000)
const MIN_INTERVAL: Record<string, number> = { g1: 8_000, g2: 5_000, g3: 8_000, g4: 6_000 }
const NAMES: Record<string, string> = { g1: 'adventure', g2: 'battle', g3: 'runner', g4: 'puzzle' }
const ALIASES: Record<string, string> = { adventure: 'g1', battle: 'g2', runner: 'g3', puzzle: 'g4', g1: 'g1', g2: 'g2', g3: 'g3', g4: 'g4' }

const Score = z.object({
  gems: z.number().int().min(0).max(30).optional(), egg: z.boolean().optional(),
  win: z.boolean().optional(), petId: z.string().optional(),
  stars: z.number().int().min(0).max(200).optional(),
  moves: z.number().int().min(0).max(500).optional(), durationMs: z.number().int().min(0).max(3_600_000).optional(),
})

function earnedToday(userId: string, game: string) {
  const start = new Date(`${today()}T00:00:00+07:00`).getTime()
  return (db.prepare('SELECT COALESCE(SUM(points),0) s FROM game_scores WHERE user_id=? AND game=? AND created_at>=?').get(userId, game, start) as { s: number }).s
}

r.post('/games/:game/score', body(Score), (c) => {
  const id = c.get('userId'), game = ALIASES[c.req.param('game')]
  if (!game) throw bad('ไม่รู้จักเกมนี้')
  const f = c.req.valid('json')
  const res = tx(() => {
    const last = db.prepare('SELECT MAX(created_at) t FROM game_scores WHERE user_id=? AND game=?').get(id, game) as { t: number | null }
    if (last.t && now() - last.t < MIN_INTERVAL[game]) throw new ApiError(429, 'ส่งคะแนนถี่เกินไป รอสักครู่นะ', 'too_fast')
    let pts = 0, score = 0, label = '', extra: Record<string, unknown> = {}
    if (game === 'g1') {
      const gems = f.gems ?? 0, egg = !!f.egg
      pts = gems * 5 + (egg ? 40 : 0); score = pts; label = egg ? 'Adventure: เจอไข่!' : 'Adventure: เก็บเพชร'
      if (egg) extra.eggId = addEgg(id, Math.random() < 0.3 ? 'Rare' : 'Common', '#A8E6CF', 'จากเกม Adventure', 25_000)
      bump(id, 'advPlays')
    } else if (game === 'g2') {
      if (f.win === undefined) throw bad('ต้องระบุผลแพ้/ชนะ')
      const pet = getPet(id, f.petId ?? getUser(id)!.active_pet ?? '')
      if (pet.energy < 15) throw bad(`${pet.name} พลังงานไม่พอ ให้พักก่อนนะ`, 'tired')
      pts = f.win ? 80 : 10; score = f.win ? 1 : 0; label = f.win ? 'ชนะ Pet Battle' : 'ร่วมสนุก Pet Battle'
      extra.pet = petView(savePet({ ...pet, xp: pet.xp + (f.win ? 25 : 8), energy: pet.energy - 15, mood: pet.mood + (f.win ? 8 : -3) }))
      if (f.win) bump(id, 'battleWins')
    } else if (game === 'g3') {
      const stars = f.stars ?? 0
      pts = Math.min(150, stars * 2); score = stars; label = `Runner: ${stars} ดาว`
      bump(id, 'runnerPlays')
    } else {
      if ((f.moves ?? 0) < 6) throw bad('ผลเกมไม่ถูกต้อง', 'invalid_result')
      pts = 50; score = Math.max(1, 100 - (f.moves ?? 0)); label = 'ชนะ Puzzle'
      bump(id, 'puzzlePlays')
    }
    const room = Math.max(0, DAILY_CAP - earnedToday(id, game))
    const award = Math.min(pts, room)
    db.prepare('INSERT INTO game_scores (id,user_id,game,score,points,meta,created_at) VALUES (?,?,?,?,?,?,?)').run(uid('gs'), id, game, score, award, JSON.stringify(f), now())
    if (award > 0) credit(id, award, label, 'game')
    return { game: NAMES[game], points: award, capped: award < pts, label, ...extra }
  })
  return done(c, res, 201)
})

r.get('/games/leaderboard', (c) => {
  // weekly score = today's steps + battle wins * 300 (same formula as the app)
  const users = db.prepare('SELECT id,name FROM users WHERE is_bot=0').all() as { id: string; name: string }[]
  const rows = users.map((u) => {
    const wins = (db.prepare(`SELECT COUNT(*) n FROM game_scores WHERE user_id=? AND game='g2' AND score>0`).get(u.id) as { n: number }).n
    return { id: u.id === c.get('userId') ? 'me' : u.id, name: u.name, score: walletRow(u.id).steps + wins * 300 }
  })
  const bots = [['u1', 12840], ['u3', 11210], ['u5', 9930], ['u8', 6420]].map(([id, s]) => ({ id: id as string, name: getUser(id as string)?.name ?? '', score: s as number }))
  return c.json({ ok: true, board: [...rows, ...bots].sort((a, b) => b.score - a.score).slice(0, 20) })
})

r.post('/missions/:id/claim', (c) => done(c, claimMission(c.get('userId'), c.req.param('id'))))
export default r
