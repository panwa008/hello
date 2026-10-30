# ⚠️ ข้อควรระวังก่อนเปิดใช้จริง — Hello

> สรุปสั้น: **ตำแหน่งคน + เงินจริง + คนแปลกหน้า** = ความเสี่ยงสูงสุดของแอปนี้ อ่านให้ครบก่อนเปิดให้คนทั่วไปใช้
> English summary at the bottom.

## 1. ความลับ (Secrets) — ห้ามหลุดเด็ดขาด
- **ห้าม commit** `.env`, `.env.production`, คีย์ TrueMoney, `JWT_SECRET`, ไฟล์ `*.db` (มีข้อมูลผู้ใช้และพิกัด) — `.gitignore` กันไว้แล้ว แต่ให้ตรวจ `git status` ทุกครั้งก่อน push
- ถ้าเผลอ push ความลับขึ้น GitHub: **ถือว่าหลุดแล้ว** → เปลี่ยนคีย์ทันที (ลบ commit ไม่พอ เพราะมีคนดึงไปได้แล้ว)
- ค่า `VITE_*` ฝั่งเว็บ **ถูกฝังในเบราว์เซอร์** ทุกคนเห็นได้ — ห้ามใส่ความลับใด ๆ
- ใช้ `JWT_SECRET` คนละค่าระหว่าง dev / production และเปลี่ยนทันทีถ้าสงสัยว่าหลุด (ผู้ใช้ทุกคนจะต้องล็อกอินใหม่)
- เปิด GitHub secret scanning / Dependabot ใน repo

## 2. การชำระเงิน (TrueMoney / PromptPay)
- **พอยท์เข้าได้ทางเดียว: webhook ที่ลายเซ็นถูกต้อง** (HMAC-SHA256 + timestamp ≤ 5 นาที) — ห้ามเชื่อ "จ่ายแล้ว" จากฝั่งแอป/เบราว์เซอร์
- ระบบกันเติมซ้ำแล้ว (event id + unique index ต่อ payment) และตรวจยอดเงินต้องตรงแพ็กเกจ (ไม่ตรง → 409 ไม่เติม)
- โค้ด live adapter เป็น **โครงตามมาตรฐานทั่วไป** — ชื่อ endpoint/ฟิลด์/header ต้องเทียบกับเอกสารจริงของ TrueMoney ที่ได้ตอนเซ็นสัญญา และทดสอบกับ sandbox ของ TrueMoney ก่อน
- ไม่มีคีย์ = ตอบ 501 พร้อมรายชื่อตัวแปรที่ขาด **ไม่มีการแกล้งว่าสำเร็จ**
- webhook ต้องเป็น **HTTPS** และ URL สาธารณะ: `https://<โดเมน>/api/payments/truemoney/webhook`
- ไม่เก็บเลขบัตร/รหัส OTP ในระบบเราเลย (ให้ผู้ให้บริการจัดการ) → ไม่ต้องเข้าข่าย PCI DSS เต็มรูปแบบ — อย่าเพิ่มช่องกรอกบัตรเอง
- **พอยท์ในแอป ≠ เงิน**: ห้ามให้แลกพอยท์กลับเป็นเงินสด/โอนระหว่างผู้ใช้ มิฉะนั้นอาจเข้าข่ายเงินอิเล็กทรอนิกส์ (e-Money) ที่ต้องขออนุญาต ธปท.
- ตลาดซื้อขายด้วยเงินจริงระหว่างผู้ใช้ **ปิดไว้ (501) ในโหมด live** — ต้องใช้ escrow ที่มีใบอนุญาตก่อนเปิด
- ต้องมี **นโยบายคืนเงิน** ชัดเจน และวิธีหักพอยท์คืนเมื่อมีการ chargeback/refund (ตอนนี้ต้องทำด้วยมือ)
- เก็บหลักฐานธุรกรรม (`payments`, `payment_events`) ตามกฎหมายบัญชี/ภาษี

## 3. ตำแหน่ง GPS — ความเสี่ยงการสะกดรอย (stalking)
- API **ไม่ส่งพิกัดดิบของคนอื่น** ให้ใคร ส่งแค่ระยะ/ทิศ และเบลอ 200–500 ม. — ห้ามแก้ให้ส่งพิกัดจริงออกไป
- ระวังการ **หาตำแหน่งด้วยการวัดหลายจุด (trilateration)**: คนร้ายเดินวัดระยะจากหลายตำแหน่งแล้วคำนวณหาบ้านเหยื่อได้ → ควรปัดระยะเป็นช่วง, จำกัดความถี่ query, และไม่ให้ระยะละเอียดกับคนแปลกหน้า
- โหมด production ปิดตำแหน่งจำลอง (`ALLOW_MOCK_LOCATION=false`) แต่แอปปลอม GPS ยังทำได้ — อย่าใช้ระยะทางเป็นหลักฐานความปลอดภัย
- โหมดล่องหน/เฉพาะเพื่อน ต้องใช้ได้จริงและหาง่าย, ลบประวัติตำแหน่ง (`location_trail`) เป็นระยะ (แนะนำ ≤ 30 วัน)
- ความแม่นยำแผนที่: GPS ในเมือง/ในอาคารคลาด 10–100 ม. — ห้ามใช้ยืนยันตัวตน/นัดเจอในที่ลับ แนะนำผู้ใช้ให้นัดในที่สาธารณะ

## 4. ความปลอดภัยของผู้ใช้ เด็ก และสถานะ "โสด"
- ฟีเจอร์ "คนรอบตัว + สถานะโสด" ดึงดูดผู้ไม่หวังดี → **แนะนำจำกัดอายุ 18+** (หรือปิดตำแหน่ง/สถานะสำหรับผู้เยาว์) และยืนยันอายุตอนสมัคร
- ต้องมีปุ่ม **รายงาน / บล็อก** และคนตรวจสอบเรื่องร้องเรียนภายใน 24 ชม.
- ห้ามใช้สถานะความสัมพันธ์/เพศเพื่อจัดอันดับหรือกดดันผู้ใช้; ให้ซ่อนได้ทุกเมื่อ
- คนแปลกหน้าทักได้จำกัด (มีอยู่แล้ว) — อย่าปิดกฎนี้

## 5. ความปลอดภัยของระบบ (ทำแล้ว แต่ต้องดูแล)
- รหัสผ่าน bcrypt (cost 12), access token 15 นาที, refresh token หมุนทุกครั้ง — ถ้าเห็น refresh token เก่าถูกใช้ซ้ำ **ระบบตัดทุกเซสชันของผู้ใช้นั้น**
- Rate limit (login 10/นาที, จ่ายเงิน 10/นาที) เป็นแบบ in-memory — ถ้ามีหลายเครื่องให้ย้ายไป Redis
- CORS เฉพาะโดเมนที่ระบุ, security headers (CSP, HSTS, no-sniff, frame deny)
- อัปเดต dependency สม่ำเสมอ (`npm audit`), สำรอง DB ทุกวัน และ **ทดลองกู้คืนจริง**
- log ห้ามมีรหัสผ่าน, token, เบอร์โทรเต็ม, พิกัดละเอียด

## 6. App Store / Google Play (ถ้าห่อเป็นแอป)
- iOS `Info.plist`: `NSLocationWhenInUseUsageDescription` (เช่น "ใช้ตำแหน่งเพื่อแสดงเพื่อนและไข่ที่อยู่ใกล้คุณ ระบบไม่แชร์พิกัดจริงให้ผู้อื่น"), `NSMotionUsageDescription` ("ใช้นับก้าวเพื่อแลกพอยท์") — อย่าขอ "Always" ถ้าไม่จำเป็น
- Android: `ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION`, `ACTIVITY_RECOGNITION` และกรอก Data safety form ให้ตรงความจริง
- Apple กำหนด: ของดิจิทัลในแอป iOS (พอยท์) ส่วนใหญ่ **ต้องใช้ In-App Purchase** — การเติมผ่าน TrueMoney ในแอป iOS อาจถูกปฏิเสธ; Google Play ก็มีนโยบายคล้ายกัน ปรึกษาก่อนส่งรีวิว
- ต้องมีปุ่ม **ลบบัญชีในแอป** (Apple บังคับ)

## 7. กฎหมายไทย — PDPA
- ตำแหน่งและข้อมูลเพศ/สถานะความสัมพันธ์เป็นข้อมูลส่วนบุคคล (บางส่วนอ่อนไหว) → ต้องมี **นโยบายความเป็นส่วนตัว**, ขอความยินยอมชัดเจนก่อนเปิดตำแหน่ง, ให้ถอนความยินยอม/ลบ/ขอสำเนาข้อมูลได้
- กำหนดระยะเวลาเก็บข้อมูล, แต่งตั้งผู้รับผิดชอบ (DPO ถ้าเข้าเกณฑ์), แจ้ง สคส. ภายใน 72 ชม. เมื่อข้อมูลรั่ว
- ถ้าใช้เซิร์ฟเวอร์นอกประเทศ ต้องแจ้งผู้ใช้เรื่องการส่งข้อมูลข้ามประเทศ
- ไม่ใช่คำแนะนำทางกฎหมาย — ควรปรึกษานักกฎหมายก่อนเปิดจริง

---

## 🇬🇧 English (short)
- **Never commit secrets** (`.env*`, TrueMoney keys, `JWT_SECRET`, `*.db`). A leaked key is burned — rotate it. `VITE_*` values are public.
- **Points are credited only by a verified, signed webhook** (HMAC-SHA256, 5-minute window, exactly-once). Missing keys → 501, never a fake success. The live TrueMoney mapping is scaffolding: align it with the official merchant spec and test against TrueMoney's sandbox. Webhooks must be HTTPS. Don't handle card data yourself. Points must not be cashable/transferable (e-money licensing). P2P real-money market stays disabled until a licensed escrow is used. Publish a refund policy.
- **Location = stalking risk.** Raw coordinates are never returned; beware trilateration, keep coarse distances for strangers, purge location history, remind users to meet in public. GPS is only accurate to 10–100 m.
- **Safety:** 18+ recommended for nearby/"single" features, report & block with human moderation.
- **Ops:** bcrypt 12, 15-min access tokens, rotating refresh tokens with reuse detection, rate limits (in-memory → Redis when scaling), strict CORS, CSP/HSTS, daily tested backups, `npm audit`, no secrets/PII in logs.
- **Stores:** `NSLocationWhenInUseUsageDescription`, `NSMotionUsageDescription`, Android `ACTIVITY_RECOGNITION`; iOS digital goods usually require In-App Purchase; in-app account deletion.
- **Thailand PDPA:** privacy policy, explicit consent for location, data export/deletion, retention limits, 72-hour breach notification. Not legal advice.
