# Hello API

Node + TypeScript + **Hono** · **better-sqlite3** (file DB, no external server) · **JWT** (HS256) · **Zod** validation · bcrypt passwords.

```bash
npm install
npm run dev      # tsx watch, http://localhost:3001
npm run build    # tsc → dist/
npm start        # node dist/index.js
npm run seed     # wipe + reseed demo data
npm run smoke    # end-to-end smoke test against a running API
```

Demo login: **mayy@hello.app / hello123** (seeded automatically on first start). Config: see `.env.example`.

## Conventions

* Base path `/api`. Everything except `/api/health`, `/api/catalog`, `/api/auth/*` needs `Authorization: Bearer <accessToken>`.
* Access token: 15 min. Refresh token: 30 days, single-use (rotated on every `/auth/refresh`), stored hashed.
* Errors: `{ ok:false, error:"<Thai message>", code:"<machine_code>", issues? }` with 4xx/5xx status.
* **Every mutation** returns `{ ok:true, result, state }`. `state` is the full app snapshot (same shape as the web app's `Data`: points, steps, pets, eggs, food, owned, outfit, friends, posts, chats, tx, orders, listings, market, daily, best, people, user …), so clients can replace local state with the server truth after each action.
* The server is authoritative for points, inventory, pet stats, game awards, steps and locations.

## Routes

### Auth & profile
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | /auth/register | `{name,email,password(≥6),gender?}` | 201, starter kit + 5,500 P |
| POST | /auth/login | `{email,password}` | → `result.tokens {accessToken, refreshToken}` + state |
| POST | /auth/refresh | `{refreshToken}` | rotates |
| POST | /auth/logout | `{refreshToken}` | revokes |
| GET | /me | – | `{ok, state}` |
| PATCH | /me | `{name?,handle?,bio?,gender?,hair?,skin?}` | |
| POST | /me/password | `{old,password}` | revokes all refresh tokens |
| PATCH | /me/privacy | `{privacy?: public|nearby|friends|ghost|invisible, relationship?: open|single|heartbroken|taken|family|hidden}` | |
| PUT | /me/prefs | any JSON (≤64 KB) | UI prefs (pose, settings, saved…) |
| DELETE | /me | – | delete account |

### Feed, friends, chat
| Method | Path | Body |
|---|---|---|
| GET | /feed | – |
| POST | /posts | `{text, tags?, place?, scene?, image?(dataURL)}` (first post of the day +20 P) |
| DELETE | /posts/:id | |
| POST | /posts/:id/like | `{like?:boolean}` |
| POST | /posts/:id/comments | `{text, parentId?}` |
| DELETE | /posts/:pid/comments/:cid | |
| POST | /stories · DELETE /stories/:id | `{text, scene, image?}` |
| GET | /users?q= · /users/:id | public profile (privacy aware) |
| POST | /friends/request | `{id}` |
| POST | /friends/:id/accept · /decline · DELETE /friends/:id | |
| POST | /friends/:id/feed-pet | −20 P, counts for the "feed friends' pets" mission |
| POST | /chats/:peer | `{text, kind?: text|wave|hi|feed|market}` → demo people auto-reply |
| POST | /chats/:peer/read | mark read |

### Pets
| Method | Path | Body |
|---|---|---|
| GET | /pets · /pets/:id | |
| POST | /pets/:id/feed | `{food:"f1".."f6"}` (consumes inventory) |
| POST | /pets/:id/play · /rest · /pet | |
| PATCH | /pets/:id | `{name}` |
| DELETE | /pets/:id | (keeps at least one) |
| POST | /pets/:id/active | set active pet |
| POST | /pets/:id/equip | `{itemId}` — slot from catalog: head/face/neck/back; an item can be worn by one pet only |
| POST | /pets/:id/unequip | `{slot}` or `{itemId}` |
| POST | /walking | `{walking:boolean}` |
| POST | /eggs/:id/hatch | only after `readyAt` → 201 `{pet}` |
| POST | /eggs/:id/speed | −50 P, hatch now |

Stats decay lazily on the server (hunger −0.5/min, mood −0.25/min, energy +0.4/min).

### Shops, avatar, market, wallet
| Method | Path | Body |
|---|---|---|
| GET | /catalog (public) · /shop/catalog | items with price, slot, rarity, sale |
| POST | /shop/buy | `{itemId, qty?}` eggs, food, pet cosmetics |
| POST | /shop/lootbox | −300 P → `{loot, pet?}` |
| GET | /avatar | `{outfit, owned}` |
| POST | /avatar/buy | `{itemId, equip?}` wardrobe item |
| PUT | /avatar/outfit | partial `{hair,top,bottom,shoes,acc,aura,backpack}`; `acc/aura/backpack` may be `"none"` |
| GET | /market?q=&category= | |
| POST | /market/listings | `{name, thb, points?, emoji?, condition?, category?}` |
| DELETE | /market/listings/:id | |
| POST | /market/orders | `{listingId, method: points|thb, pay?: truemoney|promptpay|card|cod, meet?}` |
| POST | /market/orders/:id/confirm | buyer confirms receipt |
| GET | /wallet | balance, steps, tx |
| POST | /wallet/steps | `{steps, source: manual|device|sim}` — daily total; validated (monotonic, ≤80k, ≤4 steps/s since midnight, sim rate limit) |
| POST | /wallet/redeem | unredeemed steps → points (100 steps = 1 P, 00:01–23:59) |
| POST | /wallet/topup | `{thb, phone}` TrueMoney **sandbox** (20/50/100/200/300 THB packages) |
| POST | /wallet/demo-topup | `{points}` (disable with `DEMO_TOPUP=false`) |

### Explorer (real GPS)
| Method | Path | Body / query |
|---|---|---|
| POST | /explorer/location | `{lat, lng, accuracy?, source: gps|mock}` (teleport >70 m/s rejected) |
| GET | /explorer/nearby?radius=1000 | Haversine. `visibility`: `clear` ≤200 m, `blur` 200–500 m (no bio/mood), `dot` >500 m (anonymous id, no name). Never returns other users' coordinates — only rounded `distance` (m) + `angle` (bearing °). Respects privacy: invisible users hidden, friends-only visible to friends only. Real users count only if their location is <15 min old. |
| GET | /explorer/eggs | egg spots (spawns one 150–450 m away when none nearby) |
| POST | /explorer/eggs/:id/collect | requires the server-side location (≤5 min old) within **200 m** |
| GET | /explorer/trail | your last 200 fixes (24 h retention) |

### Games & missions
| Method | Path | Body | Award (server-side) |
|---|---|---|---|
| POST | /games/adventure/score | `{gems≤30, egg?}` | gems×5 (+40 & an egg if found) |
| POST | /games/battle/score | `{win, petId?}` | 80 win / 10 loss, pet XP +25/+8, energy −15 |
| POST | /games/runner/score | `{stars≤200}` | min(150, stars×2) |
| POST | /games/puzzle/score | `{moves}` | 50 |
| GET | /games/leaderboard | | |
| POST | /missions/:id/claim | | checked against server counters (walk, feed, battle, puzzle, runner, adv) |

Per game: minimum interval between submissions and a daily cap (`GAME_DAILY_CAP`, default 1000 P).

### Payments (`src/payments/*`)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/payments/config` | mode (sandbox/live), configured?, missing env vars, PromptPay availability |
| POST | `/api/payments/truemoney/charge` | `{thb, phone}` → 201 succeeded (sandbox) · 202 pending (live; `redirectUrl`) · 501 not configured · 502 provider error |
| POST | `/api/payments/promptpay/qr` | `{thb}` → EMVCo payload (`qrPayload`) · 501 without `PROMPTPAY_ID`/`PROMPTPAY_BILLER_ID` |
| GET | `/api/payments`, `/api/payments/:id` | own payments |
| POST | `/api/payments/:id/sandbox-complete` | sandbox only |
| POST | `/api/payments/truemoney/webhook` | public; HMAC-SHA256 hex of `${timestamp}.${rawBody}` with `TRUEMONEY_WEBHOOK_SECRET` in `X-TrueMoney-Signature` (`sha256=` prefix optional) + `X-TrueMoney-Timestamp` (unix s, ±300 s). Body: `event_id`, `reference` (= `pay_…`), `status`, `amount` |
| POST | `/api/payments/promptpay/webhook` | same scheme with `PROMPTPAY_WEBHOOK_SECRET`, `X-PromptPay-Signature/Timestamp`, `ref1` = payment id |

Crediting is exactly-once (event dedupe + unique index on `transactions(ref)` for top-ups) and the amount must match the package.

### Realtime
Socket.io at `/api/socket.io`, `auth: { token: <accessToken> }`. Server → client hints: `chat:message`, `presence`, `presence:list`, `explorer:changed`, `payment:update`, `state:changed`.

### Production
`NODE_ENV=production` → demo features off, TrueMoney live, bcrypt 12, trust proxy. Boot fails (exit 78) without a strong `JWT_SECRET` and https `CORS_ORIGIN`. See `.env.production.example`, `../hello/SETUP.md` §7 and `../hello/CAUTIONS.md`. Verify with `npm run smoke:prod-config`.
