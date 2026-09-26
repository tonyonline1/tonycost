# รายงานผลการดำเนินงาน PHASE 1B: SAFE DATA MODEL RECONCILIATION
**โครงการ:** Tony's Kitchen — Restaurant Management & POS System  
**สถาปัตยกรรม:** LOCAL-FIRST 100% (No Cloud, No Server, No External DB, LocalStorage-backed)  
**วันที่ตรวจสอบและปรับปรุง:** 19 กันยายน 2026  
**สถานะ:** COMPLETED & VERIFIED

---

## 1. บทสรุปผู้บริหาร (Executive Summary)

การดำเนินงานใน **Phase 1B (Safe Data Model Reconciliation)** ได้ดำเนินการประสานและจัดระเบียบโครงสร้างข้อมูล (Data Model) ของระบบให้พร้อมสำหรับการต่อยอดเป็นระบบ **Restaurant POS** เต็มรูปแบบ โดยยึดหลักการความปลอดภัยสูงสุด:
1. **รักษาฟังก์ชันและหน้าจอเดิมไว้ 100%**: ไม่มีการลบหน้าจอ ไม่มีการรื้อ Business Logic เดิม
2. **รักษาความปลอดภัยของข้อมูล LocalStorage**: ยึด Namespace `tonys_*` อย่างเคร่งครัด พร้อมขจัดความเสี่ยงการล้างข้อมูลเบราว์เซอร์
3. **Single Source of Truth**: กำหนดให้ `src/types/index.ts` เป็น Canonical Data Model ชุดเดียวของระบบ และไม่สร้างชุดโมเดลที่สาม
4. **Backward Compatibility**: รองรับการอ่านและเขียนข้อมูลเดิม ทั้งฟิลด์สต็อกสินค้า (`currentStock` / `currentQuantity`, `minStock` / `minimumStock`) และฟิลด์บันทึกของเสีย (`cost` / `totalCost`)
5. **POS Readiness**: เพิ่มฟิลด์รองรับระบบ POS (บิล, สถานะชำระเงิน, โต๊ะ, รอบแคชเชียร์, ส่วนลด, ภาษี) แบบ Optional โดยไม่กระทบโครงสร้างคำนวณเดิม
6. **Cost Snapshot Protection**: ปกป้องฟิลด์ `foodCostPerUnit` และ `totalFoodCost` ในระดับรายการขาย เพื่อบันทึกต้นทุนประวัติศาสตร์ ณ เวลาที่เกิดออร์เดอร์จริง
7. **Local-First Backup & Restore**: พัฒนาระบบสำรองและกู้คืนฐานข้อมูลผ่าน JSON File ภายในเครื่องของผู้ใช้โดยตรง

---

## 2. การปรับปรุง Canonical Data Model (`src/types/index.ts`)

`src/types/index.ts` ได้รับการรับรองและขยายขีดความสามารถให้ครอบคลุมการทำงานทุกส่วน:

| Entity | Canonical Fields ที่ปรับปรุง | คุณสมบัติ Backward Compatibility |
| :--- | :--- | :--- |
| **`Ingredient`** | เพิ่ม `code?` (บาร์โค้ด/SKU), `supplierName?`, `preparationMethod?`, `yieldType?` | ใช้งานร่วมกับข้อมูลเดิมได้ทันที ไม่บังคับกรอก |
| **`Sauce`** | เพิ่ม `code?`, `thaiName?`, `englishName?`, `description?` | รองรับการอ้างอิงรหัสซอสสำหรับสูตรอาหาร |
| **`RecipeItem`** | เพิ่ม `type?: RecipeItemType`, `calculatedLineCost?` | รองรับทั้ง `INGREDIENT`, `SAUCE`, `PREPARED_ITEM`, `PACKAGING` |
| **`MenuVariant`** | เพิ่ม `code?`, `barcode?`, `directFoodCost?`, `kitchenStation?`, `taxType?` | รองรับการสแกนบาร์โค้ดที่ POS และแยกสเตชันครัว |
| **`InventoryItem`** | กำหนด `currentStock: number` และ `minStock: number` เป็นค่าหลัก | รองรับ `currentQuantity?`, `minimumStock?`, `maximumStock?` แบบคู่ขนาน |
| **`InventoryTransaction`**| เพิ่ม `referenceId?` สำหรับผูกโยงกับ orderId, purchaseId หรือ wasteId | บันทึกประวัติการปรับปรุงสต็อกย้อนหลังได้แม่นยำ |
| **`SaleOrderItem`** | รับประกัน `foodCostPerUnit`, `totalFoodCost` และเพิ่ม `recipeSnapshot?`, `notes?` | บันทึก Cost Snapshot ตรึงกำไรประวัติศาสตร์ |
| **`SaleOrder`** | เพิ่มฟิลด์ POS: `subtotal?`, `discountAmount?`, `taxAmount?`, `paymentStatus?`, `paymentMethod?`, `orderStatus?`, `tableNumber?`, `guestCount?`, `cashierShiftId?` | ออร์เดอร์เดิมยังคงอ่านและคำนวณ P&L ได้เหมือนเดิมทุกประการ |
| **`WasteRecord`** | รองรับทั้ง `cost?` และ `totalCost?` เป็นตัวเลขสมบูรณ์ | แก้ปัญหา NaN ที่เคยเกิดขึ้นในหน้ารายงาน P&L |

---

## 3. กลยุทธ์การปรับปรุงสต็อก (Inventory Migration & Compatibility)

ใน Phase 1A พบความไม่สอดคล้องระหว่าง `currentStock` / `minStock` (ที่ใช้ใน `InventoryView.tsx`) กับ `currentQuantity` / `minimumStock` (ที่ใช้ใน `INITIAL_INVENTORY`):

### แนวทางแก้ไขที่ปลอดภัย:
1. **ใน `src/types/index.ts`:**
   ```typescript
   export interface InventoryItem {
     id?: string;
     ingredientId: string;
     ingredientName: string;
     currentStock: number;       // Canonical field
     currentQuantity?: number;   // Backward-compatible alias
     unit: UnitType;
     minStock: number;           // Canonical field
     minimumStock?: number;      // Backward-compatible alias
     maxStock?: number;          // Canonical field
     maximumStock?: number;      // Backward-compatible alias
     costPerUnit?: number;
     lastUpdated: string;
   }
   ```
2. **ใน `StorageService.getInventory()`:**
   เพิ่มขั้นตอน Auto-Normalization โดยตรวจจับค่าเดิม หากมี `currentQuantity` แต่ไม่มี `currentStock` จะนำค่านั้นมาแปลงเป็น `currentStock` ทันที และซิงค์ทั้งสองฟิลด์ให้เท่ากัน ป้องกันข้อผิดพลาด `undefined`
3. **ใน `StorageService.saveInventory()`:**
   เมื่อบันทึกข้อมูล จะบันทึกทั้งคู่ขนานกัน (`currentStock` และ `currentQuantity`) ส่งผลให้คอมโพเนนต์เก่าหรือสคริปต์เสริมสามารถอ่านค่าได้ไม่สะดุด

---

## 4. กลยุทธ์การสร้าง ID และ Order Number (`src/utils/id.ts`)

ได้สร้าง Centralized Utility ใน `src/utils/id.ts` (และ Export ผ่าน `StorageService`):

1. **Internal Entity ID (`generateId`):**
   - รูปแบบ: `<prefix>_<uuid>` (หรือ Timestamp + Random Entropy หากระบบเบราว์เซอร์ไม่รองรับ Web Crypto)
   - ป้องกัน ID ซ้ำซ้อนได้อย่างสมบูรณ์ (Collision-Resistant)
   - **กฎเหล็ก:** **ไม่ทำ Mass Replacement** ของ ID ข้อมูลเดิมในระบบ ข้อมูลและประวัติทั้งหมดคงเดิม
2. **Human-Readable Order Number (`generateOrderNumber`):**
   - รูปแบบ: `ORD-YYYYMMDD-XXXX` (เช่น `ORD-20260919-0001`)
   - แยกออกจาก Internal Entity ID ชัดเจน เพื่อความสะดวกในการพิมพ์ใบเสร็จและการสื่อสารระหว่างแคชเชียร์กับลูกค้า

---

## 5. การเตรียมโครงสร้าง SaleOrder สำหรับ POS (POS Readiness)

เพื่อรองรับการพัฒนา POS ใน Phase 2/3 โดยไม่ต้องรื้อแก้ Schema ใหม่ ได้เตรียมฟิลด์ดังต่อไปนี้ใน `SaleOrder`:

```typescript
export interface SaleOrder {
  // Existing Core Fields (รักษาไว้ 100%)
  id: string;
  orderNumber: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  channel: string; // 'ร้าน' | 'GrabFood' | 'LINE MAN' | 'Takeaway' | 'DINE_IN' | 'DELIVERY'
  items: SaleOrderItem[];
  grossSales: number;
  commissionFee: number;
  commissionPercent?: number;
  packagingCost: number;
  totalFoodCost: number;
  grossProfit: number;
  netRevenue?: number;
  notes?: string;
  createdAt?: string;

  // POS Readiness Extensions (Non-breaking, Optional)
  subtotal?: number;
  discountAmount?: number;
  discountReason?: string;
  taxAmount?: number;
  paymentStatus?: 'PAID' | 'PENDING' | 'VOID' | 'REFUNDED';
  paymentMethod?: 'CASH' | 'PROMPTPAY' | 'CREDIT_CARD' | 'DELIVERY' | 'OTHER' | string;
  orderStatus?: 'OPEN' | 'COMPLETED' | 'CANCELLED';
  tableNumber?: string;
  guestCount?: number;
  cashierShiftId?: string;
  updatedAt?: string;
}
```
*หมายเหตุ: ใน Phase 1B นี้ ยังไม่มีการสร้าง POS UI ตามข้อกำหนดอย่างเคร่งครัด*

---

## 6. การรักษาและปกป้อง Cost Snapshot

ระบบให้ความสำคัญสูงสุดกับความถูกต้องของบัญชีต้นทุน:
- `SaleOrderItem` บันทึก `foodCostPerUnit` และ `totalFoodCost` ทันทีที่มีการบันทึกรายการขาย
- เมื่อราคาวัตถุดิบในตลาดเปลี่ยนแปลงในอนาคต **ยอดกำไรขั้นต้น (Gross Profit) ของบิลในอดีตจะไม่ถูกเปลี่ยนแปลงย้อนหลัง**
- ใน `StorageService.getSalesOrders()` ได้เพิ่ม Fallback Sanitize เพื่อป้องกันกรณีที่ข้อมูลออร์เดอร์บางรายการไม่มีค่าต้นทุน ให้มีค่าเริ่มต้นเป็น `0` เสมอ ไม่ให้เกิด `NaN` ในรายงาน P&L

---

## 7. ความปลอดภัยของ LocalStorage

1. **Namespace Partitioning:**
   ข้อมูลทั้งหมดถูกจัดเก็บภายใต้ Key เฉพาะ:
   - `tonys_settings_v1`
   - `tonys_ingredients_v1`
   - `tonys_sauces_v1`
   - `tonys_menus_v1`
   - `tonys_suppliers_v1`
   - `tonys_inventory_v1`
   - `tonys_inventory_txns_v1`
   - `tonys_purchases_v1`
   - `tonys_price_history_v1`
   - `tonys_expenses_v1`
   - `tonys_sales_v1`
   - `tonys_waste_v1`
   - `tonys_yield_tests_v1`
   - `tonys_employees_v1`
   - `tonys_packaging_v1`
2. **Zero `localStorage.clear()`:**
   ฟังก์ชัน `resetToDefaults()` ถูกตีกรอบให้ลบเฉพาะ Key ที่ขึ้นต้นด้วย `tonys_` เท่านั้น ป้องกันการทำลายข้อมูลเว็บไซต์อื่นในเบราว์เซอร์เดียวกัน

---

## 8. ระบบสำรองและกู้คืนข้อมูล (Local-First JSON Backup & Restore)

ได้เพิ่มฟังก์ชันจัดการชุดข้อมูลระดับ Service ใน `StorageService`:

1. **`exportBackup(): AppBackupPackage`**  
   รวบรวมข้อมูลทุกตารางออกมาเป็น JSON Object พร้อม Metadata (`schemaVersion: '1.0.0'`, `appId: 'TONYS_KITCHEN_POS'`, `exportedAt: ISOString`)
2. **`downloadBackupFile(): void`**  
   ดาวน์โหลดไฟล์สำรอง `.json` ลงในเครื่องของผู้ใช้โดยตรงแบบ Local-First ไม่มีการส่งผ่านเซิร์ฟเวอร์
3. **`validateBackup(data: unknown)`**  
   ตรวจสอบความถูกต้องของโครงสร้างไฟล์ กรองความเสียหาย และยืนยันความเข้ากันได้ของข้อมูลก่อนกู้คืน
4. **`restoreBackup(backup: AppBackupPackage)`**  
   เขียนข้อมูลลง LocalStorage พร้อมทำการ Normalization ข้อมูลโดยอัตโนมัติ
5. **`importBackupFile(file: File)`**  
   อ่านไฟล์ JSON จากเครื่องผู้ใช้ผ่าน FileReader และสั่งกู้คืนอย่างปลอดภัย

---

## 9. การย้ายโมเดลที่เป็นประโยชน์จาก Subsystem B (`domain.ts`)

ได้คัดเลือกเฉพาะ 4 โมเดลหลักที่มีประโยชน์ต่อการดำเนินงานร้านอาหาร เข้ามาบรรจุใน `src/types/index.ts`:

1. **`YieldTestRecord`**: บันทึกการทดสอบการสูญเสียน้ำหนักจากการหั่น/ปอก/ต้ม (Butchery & Cooking Yield Testing)
2. **`Employee`**: โครงสร้างพนักงาน ค่าแรงรายวัน/รายเดือน เพื่อรองรับการคำนวณ Labor Cost ในระบบบัญชี
3. **`PackagingItem`**: บันทึกต้นทุนและสต็อกบรรจุภัณฑ์ (กล่อง ถุง ช้อนส้อม) สำหรับเดลิเวอรีและสั่งกลับบ้าน
4. **`WhatShouldIDoAdvice`**: โครงสร้างข้อเสนอแนะเชิงกลยุทธ์ (เช่น เตือนเมื่อ Food Cost ทะลุเกณฑ์ หรือแนะนำการปรับราคา)

---

## 10. การตรวจสอบเครื่องมือคำนวณ (Calculation Engine Integrity)

- ไฟล์ `src/services/calculationEngine.ts` ไม่มีการแก้ไขหรือรื้อระบบ
- สูตรคำนวณ `calculateIngredientCost`, `calculateSauceCost`, `calculateMenuCost`, `calculateDailyPnL` ยังคงให้ผลลัพธ์ที่ตรงตามสเปกบัญชีร้านอาหารทุกประการ

---

## 11. สถานะโค้ดเดิม (Legacy Preservation)

- โค้ดใน `src/types/domain.ts`, `src/engine/` และ Nested Component โครงสร้างเดิมทั้งหมดยังคงอยู่ครบถ้วนตามหลักการ **KEEP -> MIGRATE -> VERIFY -> REMOVE LATER**
- ไม่มีการลบไฟล์ใดๆ ที่อาจมีผลต่อ Dependency ภายนอก

---

## 12. ผลการทดสอบและการตรวจสอบ (Verification Results)

1. **TypeScript Compilation:**
   ```bash
   npm run lint  # tsc --noEmit: Passed with 0 errors
   ```
2. **Vite Production Build:**
   ```bash
   npm run build # Build succeeded: 0 errors
   ```
3. **P&L Safe Calculation:**
   แก้ไขจุดเสี่ยง `w.cost` ใน `ProfitLossView.tsx` เป็น `w.totalCost ?? w.cost ?? 0` ป้องกันปัญหา `NaN` สำเร็จ

---

## 13. ความพร้อมสำหรับ Phase ถัดไป (Phase 2 & Phase 3)

ระบบมีความพร้อม 100% สำหรับการต่อยอด:
- **Phase 2 (POS Cashier & Ordering UI)**: สถาปัตยกรรมข้อมูลรองรับทั้งการสั่งอาหารหน้าร้าน, การตัดสต็อก, การคิดเงิน, ส่วนลด, ภาษี, ค่า GP เดลิเวอรี และบันทึก Cost Snapshot อัตโนมัติ
- **Phase 3 (Inventory Deduction & End-of-Day Reconciliation)**: รองรับการผูก Recipe Items เพื่อตัดสต็อกวัตถุดิบอัตโนมัติตามบิลขาย
