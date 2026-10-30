import { Hono, type Context } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { ZodType } from 'zod'
import { buildState } from './state'
import { ApiError } from './db'
import type { AuthEnv } from './auth'

export const router = () => new Hono<AuthEnv>()
/** Standard mutation response: `{ ok, result, state }` so clients can reconcile. */
export const done = (c: Context<AuthEnv>, result: unknown = null, status: 200 | 201 | 202 = 200) => c.json({ ok: true, result, state: buildState(c.get('userId')) }, status)
/** JSON body validator that returns our error shape. */
export const body = <T extends ZodType>(schema: T) => zValidator('json', schema, (r, c) => {
  if (!r.success) return c.json({ ok: false, error: 'ข้อมูลไม่ถูกต้อง', code: 'validation', issues: r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) }, 400)
})
export const query = <T extends ZodType>(schema: T) => zValidator('query', schema, (r, c) => {
  if (!r.success) return c.json({ ok: false, error: 'พารามิเตอร์ไม่ถูกต้อง', code: 'validation', issues: r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) }, 400)
})
export { ApiError }
