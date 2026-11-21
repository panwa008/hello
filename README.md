# Hello

Monorepo for the Hello platform — web app (Vite + React + TS, repo root) and API (Hono + SQLite, `backend/`).
โมโนเรโปของแพลตฟอร์ม Hello — เว็บแอป (ที่ root) และ API (`backend/`)

- **[SETUP.md](SETUP.md)** — how to run / deploy · วิธีติดตั้งและรัน
- **[CAUTIONS.md](CAUTIONS.md)** — safety & security notes, read before going live · ข้อควรระวัง อ่านก่อนเปิดใช้งานจริง
- **[backend/README.md](backend/README.md)** — API docs & config · เอกสาร API

Secrets go in `.env` files that are git-ignored; copy from `*.env.example`. Never commit `backend/data/*.db`.

On Windows use **Node.js 20 or 22 LTS** (22 recommended) and Git for Windows, then in PowerShell: `git clone https://github.com/panwa008/hello.git`, `cd hello`, `npm run setup`, `npm run dev`. Full steps and troubleshooting are in [SETUP.md](SETUP.md) §1.1.
บน Windows ใช้ Node.js 20 หรือ 22 LTS แล้วดูขั้นตอนใน [SETUP.md](SETUP.md) หัวข้อ 1.1
