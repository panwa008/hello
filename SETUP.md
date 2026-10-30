# Hello — Setup / วิธีติดตั้ง

Full-stack: **web** (`hello/`, React 19 + Vite 8 + Tailwind 4) + **API** (`hello-backend/`, Node + TypeScript + Hono + better-sqlite3 + JWT + Zod).
Web → http://localhost:5173 · API → http://localhost:3001 (`/api/health`)

Demo login / บัญชีทดลอง: **mayy@hello.app / hello123**

---

## 🇹🇭 ภาษาไทย

### 1. เริ่มใช้งานเร็ว (npm)
ต้องมี Node.js 20+ (แนะนำ 22) วางสองโฟลเดอร์ไว้ข้างกัน: `hello/` และ `hello-backend/`
```bash
cd hello
npm run setup                          # ติดตั้ง dependency ทั้ง web + api
cp .env.example .env                   # (ไม่บังคับ)
cp ../hello-backend/.env.example ../hello-backend/.env   # ตั้ง JWT_SECRET
npm run dev                            # รัน api (3001) + web (5173) พร้อมกัน
```
เปิด http://localhost:5173 แล้วล็อกอินด้วยบัญชีทดลอง ฐานข้อมูลจะสร้างและ seed อัตโนมัติครั้งแรก (`hello-backend/data/hello.db`)

คำสั่งอื่น:
| คำสั่ง (ใน `hello/`) | ทำอะไร |
|---|---|
| `npm run dev:web` / `npm run dev:api` | รันแยกทีละตัว |
| `npm run build:all` | build api (`dist/`) + web (`dist/`) |
| `npm run start:api` | รัน api จาก build (production) |
| `npm run preview` | เสิร์ฟ web ที่ build แล้ว (proxy `/api` ด้วย) |
| `npm run smoke` | smoke test API (ต้องเปิด api อยู่) |
| `npm --prefix ../hello-backend run seed` | ล้างฐานข้อมูลแล้ว seed ใหม่ |

### 2. Docker
```bash
cd hello
docker compose up --build -d                     # โหมด dev/sandbox (ไม่มีไฟล์ env)
# production: ดูหัวข้อ 7
```
web (nginx) ที่พอร์ต 5173 (รวม WebSocket `/api/socket.io`) ส่งต่อ `/api/` ไปยัง api:3001 ข้อมูลเก็บใน volume `hello-data`
> หมายเหตุ: ไฟล์ docker ถูกเขียนไว้แล้วแต่ยังไม่ได้ทดสอบบนเครื่อง build (ไม่มี Docker)

### 3. ตัวแปรแวดล้อม
**Web (`hello/.env`)**
- `VITE_API_URL` — `/` = ใช้ API ผ่าน proxy (ค่าเริ่มต้น), URL เต็ม = เรียกตรง, **ว่าง/ไม่ตั้ง = โหมดออฟไลน์ (localStorage)**
- `API_PROXY_TARGET` — ปลายทาง proxy ของ Vite (ค่าเริ่มต้น `http://localhost:3001`)
- `HTTPS=1` — เปิด HTTPS (self-signed) สำหรับทดสอบ GPS บนมือถือ

**API (`hello-backend/.env`)** — ดูทุกตัวใน `hello-backend/.env.example` (dev) และ `hello-backend/.env.production.example` (production)
- เมื่อ `NODE_ENV=production` ค่าเริ่มต้นจะเปลี่ยนเป็นโหมดจริงอัตโนมัติ: `DEMO_BOTS/DEMO_TOPUP/DEMO_SEED/ALLOW_SIM_STEPS/ALLOW_MANUAL_STEPS/ALLOW_MOCK_LOCATION=false`, `TRUEMONEY_MODE=live`, `BCRYPT_ROUNDS=12`, `TRUST_PROXY=true`
- เซิร์ฟเวอร์ **ไม่ยอมบูต** (exit 78) ถ้า production ไม่มี `JWT_SECRET` (≥32 ตัว) หรือ `CORS_ORIGIN` เป็น `*`/ไม่ใช่ https

### 4. GPS / Explorer
- เบราว์เซอร์อนุญาต GPS เฉพาะ **HTTPS หรือ localhost** — ทดสอบบนมือถือในวง LAN ให้รัน `HTTPS=1 npm run dev:web` แล้วเปิด `https://<IP-เครื่อง>:5173` (กดยอมรับ certificate)
- ถ้าไม่อนุญาต/ไม่มี GPS แอปจะใช้ตำแหน่งจำลอง (mock) หรือโหมดจำลองเดินแทน ป้ายบนเรดาร์จะบอกแหล่งตำแหน่ง
- กฎความเป็นส่วนตัว: ≤200 ม. เห็นชัด, 200–500 ม. เบลอ, >500 ม. เป็นจุดไม่ระบุตัวตน และ API ไม่ส่งพิกัดดิบของคนอื่น (คำนวณ Haversine ฝั่งเซิร์ฟเวอร์)
- เก็บไข่บนแผนที่ได้เมื่อเดินเข้าใกล้ ≤200 ม.

### 5. Smoke test
```bash
npm run smoke                                   # ตรงไปที่ api :3001
API=http://localhost:5173/api npm run smoke     # ผ่าน proxy ของ web
```
ครอบคลุม: login/refresh, GPS + nearby (กฎ 200/500 ม.), ซื้อของ PetShop/AvatarShop, equip, ตู้เสื้อผ้า 7 ช่อง, เกม 4 เกม (+กันโกง), เดิน GPS ไปเก็บไข่, ก้าวเดิน/แลก, TrueMoney sandbox + webhook ลายเซ็น (กันเติมซ้ำ), PromptPay, socket.io, ตลาด
> smoke test แก้ข้อมูลของผู้ใช้ทดลองจริง — รัน `seed` เพื่อรีเซ็ต

```bash
npm run smoke:prod-config    # บูต API แบบ NODE_ENV=production บน DB ชั่วคราว แล้วตรวจว่า "ปิดเดโม + ปฏิเสธอย่างปลอดภัย" ครบ
```
ตรวจ: ไม่ยอมบูตถ้า secret อ่อน/CORS `*`, ไม่มีบัญชีเดโม, security headers, rate limit 429, ตรวจจับ refresh token ถูกใช้ซ้ำ, TrueMoney ไม่มีคีย์ → 501 (ไทย+อังกฤษ), webhook ผิดลายเซ็น/หมดเวลา → 401, ยอดไม่ตรง → 409, webhook ถูกต้อง → เติมครั้งเดียว

### 6. สิ่งที่ทำแล้ว / ข้อจำกัด
- ✅ TrueMoney: adapter sandbox + live, webhook HMAC-SHA256 (`X-TrueMoney-Signature`, `X-TrueMoney-Timestamp`, หน้าต่าง 5 นาที), เติมพอยท์ครั้งเดียวต่อ payment (unique index), ไม่มีคีย์ → 501
- ⚠️ ชื่อฟิลด์/endpoint ของ TrueMoney live เป็น **โครงที่ปรับได้** (`TRUEMONEY_CHARGE_PATH`, ชื่อ header) — ต้องเทียบกับเอกสารที่ได้ตอนเซ็นสัญญา merchant ก่อนเปิดจริง (`src/payments/truemoney.ts`)
- ✅ PromptPay QR (EMVCo + CRC16) — ยืนยันยอดผ่าน webhook ธนาคารเท่านั้น
- ✅ Realtime ผ่าน Socket.io (`/api/socket.io`): แชท, ออนไลน์/ออฟไลน์, คนรอบตัวขยับ, ผลชำระเงิน · polling ยังอยู่เป็นสำรอง (ช้าลงเมื่อเชื่อมต่อได้)
- ✅ นับก้าวจากเซ็นเซอร์มือถือ (DeviceMotion, ต้อง HTTPS) — แม่นน้อยกว่า HealthKit/Google Fit; แอป native ควรใช้ของระบบ
- คนรอบตัวจำลอง/เติมพอยท์ทดสอบ/กรอกก้าวเอง มีเฉพาะ dev เท่านั้น
- ระบบ rate limit เป็นแบบ in-memory (เครื่องเดียว) — ถ้ารันหลาย instance ให้ใช้ Redis + socket.io Redis adapter
- ฐานข้อมูล SQLite เหมาะกับเครื่องเดียว — สำรองไฟล์ `/data/hello.db` ทุกวัน หรือย้ายไป Postgres เมื่อโต

### 7. Deploy production
```bash
cd hello-backend
cp .env.production.example .env.production     # ห้าม commit — .gitignore กันไว้แล้ว
# แก้: JWT_SECRET=$(openssl rand -hex 32), CORS_ORIGIN=https://<โดเมน>, PUBLIC_API_URL=https://<โดเมน>, TRUEMONEY_* จากสัญญา merchant
cd ../hello
HELLO_ENV_FILE=../hello-backend/.env.production NODE_ENV=production docker compose up --build -d
docker compose logs api | head          # ต้องเห็น "(production, payments=live)" และไม่มี ✖
curl -s https://<โดเมน>/api/health      # features.env = production, demoBots=false
```
- วาง HTTPS ไว้ข้างหน้า (Caddy / Cloudflare / load balancer) → nginx :5173 — GPS, เซ็นเซอร์ก้าว และ webhook ต้องเป็น HTTPS
- ลงทะเบียน webhook กับ TrueMoney: `https://<โดเมน>/api/payments/truemoney/webhook` (PromptPay: `/api/payments/promptpay/webhook`)
- ไม่ใช้ Docker: `npm ci && npm run build && NODE_ENV=production node --env-file=.env.production dist/index.js` ใต้ systemd/pm2 + reverse proxy ที่รองรับ WebSocket Upgrade

### ✅ ก่อนเปิดจริงต้องมี…
- [ ] สัญญา merchant TrueMoney + คีย์ 4 ตัว (`TRUEMONEY_API_BASE`, `TRUEMONEY_MERCHANT_ID`, `TRUEMONEY_API_KEY`, `TRUEMONEY_API_SECRET`) + `TRUEMONEY_WEBHOOK_SECRET` + `PUBLIC_API_URL` และทดสอบกับ sandbox ของ TrueMoney เองแล้ว
- [ ] เทียบ field mapping ใน `src/payments/truemoney.ts` กับเอกสาร API จริง (endpoint, header ลายเซ็น, ชื่อฟิลด์ status/amount)
- [ ] โดเมน + HTTPS, `CORS_ORIGIN` ตรงโดเมน, `JWT_SECRET` สุ่มใหม่ (ไม่ใช้ซ้ำกับ dev)
- [ ] `npm run smoke:prod-config` ผ่าน และ `/api/health` แสดง `env: production`
- [ ] สำรองฐานข้อมูลอัตโนมัติ + ทดลองกู้คืน
- [ ] นโยบายความเป็นส่วนตัว (PDPA) + ข้อตกลงการใช้งาน + ช่องทางลบบัญชี/ขอข้อมูล
- [ ] นโยบายคืนเงิน/ระงับพอยท์ และขั้นตอนรับเรื่องร้องเรียน
- [ ] ระบบรายงาน/บล็อกผู้ใช้ + คนดูแลเนื้อหา, ข้อจำกัดอายุ (แนะนำ 18+ สำหรับฟีเจอร์ตำแหน่ง/สถานะโสด)
- [ ] ข้อความขอสิทธิ์ตำแหน่ง/เซ็นเซอร์ (ถ้าทำแอป native) — ดู `CAUTIONS.md`
- [ ] ตลาดซื้อขายแบบเงินจริงระหว่างผู้ใช้ปิดไว้ (501) จนกว่าจะใช้ผู้ให้บริการ escrow ที่มีใบอนุญาต
- [ ] อ่าน `CAUTIONS.md` ทั้งหมด

---

## 🇬🇧 English

### 1. Quick start (npm)
Node.js 20+ (22 recommended). Keep `hello/` and `hello-backend/` side by side.
```bash
cd hello
npm run setup                          # installs web + api deps
cp .env.example .env                   # optional
cp ../hello-backend/.env.example ../hello-backend/.env   # set JWT_SECRET
npm run dev                            # api (3001) + web (5173) together
```
Open http://localhost:5173 and sign in with the demo account. The SQLite DB is created and seeded automatically on first start (`hello-backend/data/hello.db`).

| Script (in `hello/`) | Purpose |
|---|---|
| `npm run dev:web` / `npm run dev:api` | run one side only |
| `npm run build:all` | build api + web |
| `npm run start:api` | run the built api |
| `npm run preview` | serve built web (also proxies `/api`) |
| `npm run smoke` | API smoke test (api must be running) |
| `npm --prefix ../hello-backend run seed` | wipe + reseed the DB |

### 2. Docker
```bash
cd hello
docker compose up --build -d          # dev/sandbox (no env file); production: see section 7
```
nginx serves the web on 5173 and proxies `/api/` (incl. the `/api/socket.io` WebSocket) → `api:3001`; data lives in the `hello-data` volume.
> Note: the compose/Dockerfiles are written but were not run on the build machine (no Docker there).

### 3. Environment
**Web (`hello/.env`)**
- `VITE_API_URL` — `/` = API via proxy (default), full URL = direct, **empty/unset = offline mode (localStorage only)**
- `API_PROXY_TARGET` — Vite proxy target (default `http://localhost:3001`)
- `HTTPS=1` — self-signed HTTPS dev server, for GPS on phones

**API** — see `hello-backend/.env.example` (dev) and `hello-backend/.env.production.example` (production). `NODE_ENV=production` switches every demo flag off, `TRUEMONEY_MODE` to `live`, bcrypt cost to 12 and trusts the proxy. The API refuses to boot (exit 78) without a strong `JWT_SECRET` and an https `CORS_ORIGIN` list.

### 4. GPS / Explorer
- Browsers only expose geolocation on **HTTPS or localhost**. For a phone on your LAN: `HTTPS=1 npm run dev:web`, open `https://<your-LAN-IP>:5173`, accept the certificate.
- Without GPS permission the app falls back to a mock location or the walk simulator; the radar chip shows the source.
- Privacy: ≤200 m clear, 200–500 m blurred, >500 m anonymous dots; the API never returns other users' raw coordinates (Haversine computed server-side).
- Map eggs can be collected within 200 m.

### 5. Smoke test
```bash
npm run smoke                                   # direct to :3001
API=http://localhost:5173/api npm run smoke     # through the web proxy
```
Covers login/refresh, GPS + nearby rules, PetShop/AvatarShop buys, equip, 7-slot wardrobe, 4 games (+anti-cheat), GPS walk to an egg + collect, steps sync/redeem, TrueMoney sandbox, market. It mutates the demo user — run `seed` to reset.

`npm run smoke:prod-config` boots the API with `NODE_ENV=production` on a temp DB and verifies boot refusals, no demo data, headers, rate limits, refresh-reuse detection, 501 without TrueMoney keys, webhook signature/replay/amount checks and exactly-once crediting.

### 6. Status / limits
- TrueMoney sandbox + live adapter, HMAC-signed webhooks, idempotent crediting; 501 when keys are missing. **The live request/field mapping is configurable scaffolding — align it with the official merchant API spec before launch.**
- PromptPay QR (EMVCo) — credited only via a signed bank webhook.
- Socket.io realtime (chat, presence, nearby changes, payment results); polling remains as a slower fallback.
- DeviceMotion pedometer (HTTPS); native apps should use HealthKit / Google Fit.
- In-memory rate limits and SQLite = single instance. Use Redis (+ socket.io Redis adapter) / Postgres to scale out.

### 7. Production deploy
Copy `hello-backend/.env.production.example` → `.env.production`, fill it in, then `HELLO_ENV_FILE=../hello-backend/.env.production NODE_ENV=production docker compose up --build -d`. Terminate HTTPS in front of nginx and register `https://<domain>/api/payments/truemoney/webhook` with TrueMoney. Go through the Thai checklist above ("ก่อนเปิดจริงต้องมี…") and `CAUTIONS.md` before launch.

### API reference
Full route list: [`../hello-backend/README.md`](../hello-backend/README.md). All mutations return `{ ok, result, state }`.
