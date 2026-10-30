/**
 * Realtime client (Socket.io, path /api/socket.io). Connects only when the API is online and the user is signed in.
 * The server pushes *hints* (chat:message, presence, explorer:changed, payment:update, state:changed);
 * data itself is always re-fetched over the authenticated REST API.
 */
import { io, type Socket } from 'socket.io-client'
import { API_ORIGIN, ONLINE, getTokens, refresh } from './api'

export type RealtimeHandlers = {
  onChat?: (m: { from: string; to: string }) => void
  onPresence?: (p: { userId: string; online: boolean }) => void
  onPresenceList?: (online: string[]) => void
  onExplorer?: () => void
  onPayment?: (p: { id: string; status: string; points: number }) => void
  onState?: () => void
  onStatus?: (connected: boolean) => void
}

export function connectRealtime(h: RealtimeHandlers): () => void {
  if (!ONLINE || !getTokens()) return () => {}
  const s: Socket = io(API_ORIGIN || undefined, {
    path: '/api/socket.io',
    transports: ['websocket', 'polling'],
    auth: (cb) => cb({ token: getTokens()?.accessToken }),
    reconnectionDelay: 1000, reconnectionDelayMax: 15_000,
  })
  s.on('connect', () => h.onStatus?.(true))
  s.on('disconnect', () => h.onStatus?.(false))
  s.on('connect_error', async (e) => {
    h.onStatus?.(false)
    // expired access token → refresh, then let socket.io retry with the new one
    if (e.message === 'unauthorized' && (await refresh())) setTimeout(() => s.connect(), 500)
  })
  s.on('chat:message', (m) => h.onChat?.(m))
  s.on('presence', (p) => h.onPresence?.(p))
  s.on('presence:list', (p: { online: string[] }) => h.onPresenceList?.(p.online))
  s.on('explorer:changed', () => h.onExplorer?.())
  s.on('payment:update', (p) => h.onPayment?.(p))
  s.on('state:changed', () => h.onState?.())
  return () => { s.removeAllListeners(); s.disconnect() }
}
