# Hello

Monorepo for the Hello platform — web app (Vite + React + TS, repo root) and API (Hono + SQLite, `backend/`).
โมโนเรโปของแพลตฟอร์ม Hello — เว็บแอป (ที่ root) และ API (`backend/`)

- **[SETUP.md](SETUP.md)** — how to run / deploy · วิธีติดตั้งและรัน
- **[CAUTIONS.md](CAUTIONS.md)** — safety & security notes, read before going live · ข้อควรระวัง อ่านก่อนเปิดใช้งานจริง
- **[backend/README.md](backend/README.md)** — API docs & config · เอกสาร API

Secrets go in `.env` files that are git-ignored; copy from `*.env.example`. Never commit `backend/data/*.db`.
