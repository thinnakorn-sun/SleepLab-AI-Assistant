# Render Deployment Guide (Single Service, 6 LINE OA)

คู่มือนี้ใช้สำหรับ deploy ปิดงานจริงบน Render โดยให้ backend ตัวเดียวรองรับ LINE OA ทั้ง 6 บัญชี

## 1) สิ่งที่ต้องเตรียมก่อนเริ่ม

- GitHub repo ล่าสุด (branch `main`)
- Render account
- LINE Developers ของ OA ทั้ง 6 บัญชี
- Neon PostgreSQL `DATABASE_URL`
- Gemini/OpenAI keys ตามที่ระบบใช้อยู่
- Google Sheets credentials (ถ้าใช้บันทึก screening)

## 2) เตรียม Environment Variables ให้ครบ

ตั้งค่าทุกตัวใน Render > Service > Environment

### 2.1 Core

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY` (ถ้ายังใช้งานอยู่)
- `RAG_DEBUG=false`
- `FAQ_USE_FLEX=true`
- `DEFAULT_CENTER_NAME=<ชื่อศูนย์หลัก>`

### 2.2 OA หลัก (default)

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `LINE_OA_ID=<ชื่อ OA หลักหรือ default>`

### 2.3 OA เพิ่มเติม (#2 ถึง #6)

รูปแบบต้องตรงกันทุกชุด:

- `LINE_OA_ID_<KEY>`
- `LINE_CHANNEL_ACCESS_TOKEN_<KEY>`
- `LINE_CHANNEL_SECRET_<KEY>`

ตัวอย่าง:

```env
LINE_OA_ID_BPH_SLEEP_LAB=BPH Sleep Lab
LINE_CHANNEL_ACCESS_TOKEN_BPH_SLEEP_LAB=...
LINE_CHANNEL_SECRET_BPH_SLEEP_LAB=...
```

หมายเหตุ:

- `<KEY>` ใช้ตัวพิมพ์ใหญ่ + underscore เพื่อลดผิดพลาด
- ต้องมีครบทั้ง 3 ค่าใน suffix เดียวกัน ไม่เช่นนั้นระบบจะข้าม OA ชุดนั้น

### 2.4 TEST whitelist

- ช่วง UAT: ใส่ `TEST_LINE_USER_IDS=Uxxx,Uyyy`
- Go-live: ตั้งเป็นค่าว่าง หรือถอดตัวแปรนี้ออก

### 2.5 Google Sheets (ถ้าเปิดใช้งาน)

- `GOOGLE_SHEETS_CREDENTIALS_PATH`
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- เตรียม secret file/JSON ตาม policy ทีม

## 3) สร้าง Render Web Service

- New + > Web Service
- Connect repo นี้
- Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start:prod`
- Region: ใกล้ผู้ใช้งาน
- Auto Deploy: ปิดไว้ก่อนจนกว่าจะผ่าน validation

## 4) Health Check

ระบบรองรับแล้ว:

- `GET /health` -> `{\"ok\": true}`
- `GET /` -> service status

แนะนำตั้ง Render Health Check Path เป็น:

- `/health`

## 5) ตั้ง Webhook ใน LINE Developers (ทุก OA)

ทำซ้ำทีละบัญชี OA ทั้ง 6:

1. Messaging API > Webhook settings
2. ใส่ URL:
   - `https://<your-render-domain>/webhook`
3. กด Update
4. เปิด `Use webhook`
5. กด Verify ให้ผ่าน

ถ้า Verify ไม่ผ่าน:

- เช็กว่า service ขึ้นแล้ว
- เช็ก env OA นั้นครบ 3 ค่า (ID/TOKEN/SECRET)
- เช็กว่า URL ถูกต้องและลงท้าย `/webhook`

## 6) Validation หลัง Deploy (บังคับทำ)

### 6.1 Smoke check

- Render logs ต้องเห็น app start สำเร็จ
- ต้องเห็น log แนว `OA clients ready: <n>`

### 6.2 Functional check ต่อ OA (ครบ 6 บัญชี)

ส่งข้อความทดสอบอย่างน้อย OA ละ 1 ครั้ง:

- ทัก `สวัสดี`
- กด B
- กด C
- กด D
- ถาม FAQ 1 คำถาม
- ทดสอบ screening flow 1 รอบ

ต้องได้ผล:

- webhook เข้า
- มี reply ออก (`Reply sent`)
- ไม่มี 5xx

### 6.3 Sheets check

ถ้าเปิด logging screening:

- ทำ screening 1 เคส
- ตรวจว่าแถวใหม่เข้า Google Sheets

## 7) Rollback Plan

เมื่อเกิด incident หลัง deploy:

1. Render > Deploys > เลือก previous healthy deploy > Rollback
2. ยืนยัน webhook ยังชี้ endpoint เดิม
3. ตรวจ logs ว่ากลับมาส่ง reply ปกติ

## 8) Go-live Checklist

- [ ] Env ครบทุก OA ทั้ง 6
- [ ] `TEST_LINE_USER_IDS` ปิด/ว่างแล้ว
- [ ] Webhook verify ผ่านครบ 6 OA
- [ ] Smoke + Functional + Sheets ผ่าน
- [ ] บันทึก mapping OA name ↔ env suffix ไว้ในเอกสารทีม
- [ ] เปิด Auto Deploy (ถ้าทีมอนุมัติ)

## 9) OA Credential Matrix (กรอกก่อนส่งงาน)

| OA # | OA Name | Env Suffix Key | Webhook Verify | Test Result |
| ---- | ------- | -------------- | -------------- | ----------- |
| 1    |         | default        |                |             |
| 2    |         |                |                |             |
| 3    |         |                |                |             |
| 4    |         |                |                |             |
| 5    |         |                |                |             |
| 6    |         |                |                |             |
