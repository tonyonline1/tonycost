# Tony's Kitchen — Food Cost & Management

A restaurant management system organized as **1 system + 3 business modules**, using the existing application structure and shared data/calculation services.

## Architecture

- **Dashboard** — single business overview across all modules.
- **Module A · Cost Control** — ต้นทุนอาหาร, วัตถุดิบ, สูตรอาหาร.
- **Module B · Daily Operations** — รายรับ, ค่าใช้จ่าย.
- **Module C · Management** — กำไร/ขาดทุน, รายงาน.
- **System Settings** — shared configuration for GP, packaging, overhead, roles, and other system-wide settings.

The navigation is grouped by module, but the application remains one React/Vite application. Existing route IDs and legacy components are preserved for backward compatibility; Stock & Purchase screens are not exposed in the main navigation.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. If the project uses Gemini features, set `GEMINI_API_KEY` in `.env.local` as required by the environment.
3. Run the app:
   `npm run dev`
4. Build for production:
   `npm run build`

## Deployment to GitHub Pages (วิธี Deploy บน GitHub)

เพื่อให้หน้าแอปแสดงผลได้อย่างถูกต้องบน GitHub Pages:

1. นำโค้ดขึ้น GitHub repository (สาขา `main` หรือ `master`)
2. ไปที่หน้า GitHub Repository ของคุณ -> คลิกแถบ **Settings** ด้านบน
3. ที่เมนูด้านซ้าย เลือกหัวข้อ **Pages**
4. ในส่วน **Build and deployment**:
   - **Source**: ให้เปลี่ยนจาก `Deploy from a branch` เป็น **`GitHub Actions`** (สำคัญมาก)
5. ตัว GitHub Actions workflow (`.github/workflows/deploy.yml`) จะทำการ Build และ Deploy แอพขึ้น GitHub Pages โดยอัตโนมัติ
6. เมื่อ Deploy เสร็จสิ้น ระบบจะแสดงลิงก์ URL (เช่น `https://<username>.github.io/<repo-name>/`) สามารถคลิกเปิดใช้งานแอปได้ทันทีโดยไม่มีปัญหาหน้าขาว (Blank page)

## Data and calculation principles

- One shared data layer is used across all modules.
- Food Cost, GP, packaging, pricing, and profitability calculations remain centralized in `src/services/calculationEngine.ts`.
- Existing data structures and functions are retained while the UI is reorganized into the three-module architecture.
- Seafood ingredients remain independently costed (for example, shrimp by piece and squid by gram) and are never collapsed into one generic seafood ingredient.
