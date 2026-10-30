import type { Server as HttpServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import { config } from './config'
import { verifyAccess } from './auth'
import { db } from './db'

/**
 * Realtime push (Socket.io at path /api/socket.io).
 * Events → client:
 *   chat:message      { from, to, id }            new message (incl. bot replies)
 *   presence          { userId, online }          friend came online / went offline
 *   presence:list     { online: string[] }        friends online right now (on connect)
 *   explorer:changed  { userId }                  someone nearby moved — client re-fetches /explorer/nearby (no coordinates are pushed)
 *   payment:update    { id, status, ... }         a top-up was credited / failed
 *   state:changed     {}                          generic "refresh your state"
 */
let io: Server | null = null
const sockets = new Map<string, Set<string>>() // userId → socket ids

export const isOnline = (userId: string) => (sockets.get(userId)?.size ?? 0) > 0
const friendsOf = (userId: string) =>
  (db.prepare("SELECT CASE WHEN requester=? THEN addressee ELSE requester END id FROM friendships WHERE status='accepted' AND (requester=? OR addressee=?)").all(userId, userId, userId) as { id: string }[]).map((r) => r.id)

export function emitToUser(userId: string, event: string, payload: unknown = {}) {
  io?.to(`u:${userId}`).emit(event, payload)
}
/** Tell friends + recently-near users to refresh nearby. Only ids travel, never coordinates. */
export function emitExplorerChanged(userId: string, audience: string[]) {
  for (const id of new Set(audience)) if (id !== userId) emitToUser(id, 'explorer:changed', { userId })
}
function presence(userId: string, online: boolean) {
  const priv = db.prepare('SELECT privacy FROM users WHERE id=?').get(userId) as { privacy?: string } | undefined
  if (priv?.privacy === 'ghost') return // ghost mode: never broadcast presence
  for (const f of friendsOf(userId)) emitToUser(f, 'presence', { userId, online })
}

export function attachRealtime(server: HttpServer) {
  const origins = config.corsOrigins
  io = new Server(server, {
    path: '/api/socket.io',
    cors: { origin: origins.includes('*') ? true : origins, credentials: false },
    serveClient: false,
    maxHttpBufferSize: 16 * 1024, // clients don't upload over the socket
    pingInterval: 25_000, pingTimeout: 20_000,
  })
  io.use(async (socket, next) => {
    const token = (socket.handshake.auth as { token?: string } | undefined)?.token
    const uid = token ? await verifyAccess(token) : null
    if (!uid) return next(new Error('unauthorized'))
    socket.data.userId = uid
    next()
  })
  io.on('connection', (socket: Socket) => {
    const uid = socket.data.userId as string
    socket.join(`u:${uid}`)
    const set = sockets.get(uid) ?? new Set(); const first = set.size === 0
    set.add(socket.id); sockets.set(uid, set)
    if (first) presence(uid, true)
    socket.emit('presence:list', { online: friendsOf(uid).filter(isOnline) })
    socket.on('disconnect', () => {
      const s = sockets.get(uid); s?.delete(socket.id)
      if (s && s.size === 0) { sockets.delete(uid); presence(uid, false) }
    })
  })
  return io
}
export const closeRealtime = () => io?.close()
