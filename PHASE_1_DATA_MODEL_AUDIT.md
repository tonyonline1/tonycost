# PHASE 1A — DATA MODEL AUDIT & CANONICAL ARCHITECTURE SPECIFICATION
**Restaurant Management & POS System — Local-First Architecture**
**Auditor / Architect:** Senior Software Architect & Database / Data Model Engineer
**Date:** 2026-09-19
**Status:** Audit Complete — Phase 1A Baseline Established

---

## 1. CURRENT ARCHITECTURE OVERVIEW

### 1.1 Architectural State Discovery
The repository currently exhibits a **Dual-Architecture Split** where two parallel sets of data models, calculations, and UI components coexist:

1. **Subsystem A (Active Live Production Path):**
   - **Primary Entry:** `src/App.tsx`
   - **Type Definition Source:** `src/types/index.ts`
   - **Persistence Service:** `src/services/storageService.ts` (LocalStorage-backed)
   - **Calculation Engine:** `src/services/calculationEngine.ts`
   - **Seed & Default Data:** `src/data/initialData.ts`
   - **Active Views:** Flat components mounted directly in `src/components/` (`Dashboard.tsx`, `IngredientsView.tsx`, `SaucesView.tsx`, `FoodCostView.tsx`, `MenusView.tsx`, `MenuCostingView.tsx`, `RecipeBuilderView.tsx`, `PurchasesView.tsx`, `InventoryView.tsx`, `ExpensesView.tsx`, `SalesView.tsx`, `ProfitLossView.tsx`, `ReportsView.tsx`, `SettingsView.tsx`, `Navbar.tsx`, `Sidebar.tsx`).
   - **Characteristics:** Tailored for Thai restaurant workflow ("Tony's Kitchen"), supports Thai units (`ตัว`, `ฟอง`, `ชิ้น`, `จาน`), 3-module cost control hierarchy (Ingredient -> Sauce -> Variant/Menu), delivery commission modeling (Grab 30%, LINE MAN 25%), and direct LocalStorage persistence.

2. **Subsystem B (Secondary / Unmounted Domain Model Path):**
   - **Type Definition Source:** `src/types/domain.ts`
   - **Calculation Engine:** `src/engine/calculations.ts`, `src/engine/advisory.ts`, `src/engine/units.ts`, `src/engine/unitTests.ts`
   - **Data Mapper:** `src/data/excelMapper.ts`
   - **Nested Components:** Categorized subdirectories under `src/components/` (`Channels/`, `Dashboard/`, `Financials/`, `Ingredients/`, `Inventory/`, `Recipes/`, `Tools/`).
   - **Characteristics:** Formulated using English domain terms (`PortionVariant`, `SubRecipe`, `SubRecipeItem`, `PackagingItem`, `WhatShouldIDoAdvice`, `Employee`, `DailySalesRecord`). **None of these components are mounted by `App.tsx`**.

### 1.2 Architectural Directive
In accordance with user instructions, **`src/types/index.ts` is designated as the CANONICAL DATA MODEL**. Subsystem B must not be deleted abruptly; instead, its high-value mathematical and domain constructs will be systematically migrated into the canonical model, after which legacy artifacts will be deprecated and safely retired.

---

## 2. CANONICAL DATA MODEL DEFINITION

The Canonical Data Model is anchored in `src/types/index.ts` with explicit type safety, standardized typing conventions, deterministic calculations, and zero external cloud dependencies.

### Core Canonical Entity Registry:
1. `Ingredient`: Master raw material purchasing, yield % after trimming, and cost-per-base-unit.
2. `Sauce`: Sub-recipe/prepared batch item comprising multiple ingredients, yielding batch cost and cost-per-gram.
3. `RecipeItem`: Unified recipe constituent pointing to either an `Ingredient` or a `Sauce` with specified usage quantity and unit.
4. `MenuVariant`: Sellable portion/preparation of a dish (e.g. กะเพราหมูสับ, กะเพรากุ้ง) containing recipe items, prices per channel, and overhead allocation.
5. `MenuItem`: Parent menu categorization grouping variants (e.g. ผัดกะเพรา).
6. `InventoryItem`: Current on-hand stock balance per ingredient with min/max stock thresholds.
7. `InventoryTransaction`: Immutable stock movement audit log (`PURCHASE`, `USAGE`, `WASTE`, `ADJUSTMENT`, `STOCK_COUNT`).
8. `PurchaseRecord`: Supplier invoice line recording purchase volume, unit price, and batch yield.
9. `SaleOrderItem`: Order line snapshotting price, sold quantity, food cost per unit, and total food cost.
10. `SaleOrder`: Order transaction recording receipt number, date, time, channel, gross sales, GP fee, packaging cost, COGS, and profit.
11. `ExpenseRecord`: Operating expense voucher categorized for P&L reporting.
12. `WasteRecord`: Spoilage/loss incident logging responsible party, reason, quantity, and cost leakage.
13. `Supplier`: Vendor directory for purchase orders.
14. `RestaurantSettings`: Store profile, operational targets (Food Cost %, Prime Cost %), platform commissions, and default overheads.

---

## 3. TASK 1 — INVENTORY OF ALL TYPES

| Entity / Type Name | File Origin | Current Usage | Functional Role | Entity Relations | Retention Recommendation | Canonical Authority / Duplicate Resolution |
|---|---|---|---|---|---|---|
| `UnitType` | `index.ts` | Active Views, Calculation Engine | Units of measurement (g, kg, ml, l, ตัว, ฟอง, ชิ้น, แพ็ค, ขวด, จาน, ถ้วย, มัด) | Ingredient, Sauce, RecipeItem, Inventory | **KEEP (CANONICAL)** | Canonical. Merge standard units from `domain.ts` (`tsp`, `tbsp`, `cup`) into canonical union. |
| `UnitType` | `domain.ts` | `engine/*`, Nested Views | English units (g, kg, piece, pack, bottle, etc.) | SubRecipe, PortionVariant | **DEPRECATE** | Superseded by canonical `UnitType` in `index.ts`. |
| `IngredientCategory` | `index.ts` | Active Views | Thai categories (เนื้อสัตว์, ผัก, เครื่องปรุง, etc.) | Ingredient | **KEEP (CANONICAL)** | Canonical. |
| `IngredientCategory` | `domain.ts` | Nested Views | English categories (Meat & Poultry, etc.) | `domain.Ingredient` | **DEPRECATE** | Superseded by canonical. |
| `Ingredient` | `index.ts` | Active live app, `App.tsx`, Storage | Raw ingredient master entity | Supplier, Inventory, RecipeItem, Sauce | **KEEP (CANONICAL)** | Primary Master. Enrich with `code`, `currentStock`, `minimumStock` from `domain.ts`. |
| `Ingredient` | `domain.ts` | `engine/*`, Nested Views | Alternative ingredient model | `PriceHistoryRecord`, `YieldTestRecord` | **DEPRECATE** | Duplicate. Migrate useful fields (`code`, `yieldType`) to canonical. |
| `Sauce` | `index.ts` | Active live app, Recipe Builder | Sub-recipe / sauce batch master | Ingredient, RecipeItem | **KEEP (CANONICAL)** | Primary Master for prepared sauces and sub-recipes. |
| `SubRecipe` | `domain.ts` | `engine/*`, `SubRecipeSauceView` | Alternative sub-recipe model | `SubRecipeItem`, `MenuItem` | **DEPRECATE** | Duplicate of `Sauce`. Retire after verifying sauce cost parity. |
| `SauceRecipeItem` | `index.ts` | Active Views, Storage | Ingredient usage line inside Sauce | Ingredient, Sauce | **KEEP (CANONICAL)** | Primary line item model. |
| `SubRecipeItem` | `domain.ts` | `engine/*` | Ingredient usage line in SubRecipe | Ingredient, SubRecipe | **DEPRECATE** | Duplicate of `SauceRecipeItem`. |
| `RecipeItem` | `index.ts` | Active Views, Recipe Builder | Dish recipe constituent | Ingredient, Sauce, MenuVariant | **KEEP (CANONICAL)** | Canonical dish recipe line item. |
| `RecipeItem` | `domain.ts` | `engine/*`, Nested Views | Alternative recipe item | `domain.MenuItem` | **DEPRECATE** | Duplicate. |
| `MenuItem` | `index.ts` | Active Views, Storage | Parent dish classification | `MenuVariant` | **KEEP (CANONICAL)** | Canonical menu group. |
| `MenuItem` | `domain.ts` | `engine/*`, Nested Views | Standalone menu item with `portions[]` | `PortionVariant`, `SalesChannel` | **DEPRECATE** | Duplicate. `MenuVariant` in `index.ts` already fulfills portion/variant role. |
| `MenuVariant` | `index.ts` | Active live app, Sales, Menu Costing | Sellable dish variant with recipe and channel prices | MenuItem, RecipeItem, SaleOrderItem | **KEEP (CANONICAL)** | Canonical sellable product unit. Equivalent to POS SKU. |
| `PortionVariant` | `domain.ts` | `engine/*`, Nested Views | Multi-portion variant model | `domain.MenuItem` | **DEPRECATE** | Duplicate of `MenuVariant`. |
| `RecipeCostBreakdown` | `index.ts` | MenuCostingView, FoodCostView | Full calculated financial breakdown per variant | MenuVariant, Settings | **KEEP (CANONICAL)** | Vital diagnostic report model for margin/cost analysis. |
| `RestaurantSettings` | `index.ts` | App, SettingsView, Storage | Store parameters, overhead, commissions | All views | **KEEP (CANONICAL)** | Canonical configuration model. |
| `BusinessSettings` | `domain.ts` | `engine/*`, Nested Views | Alternative settings model | `engine/calculations` | **DEPRECATE** | Duplicate of `RestaurantSettings`. |
| `ChannelSettings` | `index.ts` | SettingsView | Channel commission & packaging rules | RestaurantSettings | **KEEP (CANONICAL)** | Canonical channel settings. |
| `SalesChannel` | `domain.ts` | Nested Channels view | Sales channel entity | `domain.MenuItem` | **MIGRATE** | Harmonize into `ChannelSettings` in `index.ts`. |
| `InventoryItem` | `index.ts` | InventoryView, Storage | Warehouse on-hand stock record | Ingredient | **KEEP (CANONICAL)** | Canonical stock ledger state. |
| `InventoryRecord` | `domain.ts` | Not used in UI | Periodic monthly inventory ledger | Ingredient | **UNUSED** | Theoretical monthly roll-forward model. |
| `InventoryTransaction` | `index.ts` | InventoryView, Storage | Stock movement audit trail | Ingredient, User | **KEEP (CANONICAL)** | Canonical stock movement ledger. |
| `PurchaseRecord` | `index.ts` | PurchasesView, Storage | Inward purchase invoice line | Ingredient, Supplier | **KEEP (CANONICAL)** | Canonical procurement record. |
| `PriceHistoryRecord` | `index.ts` | PurchasesView, IngredientsView | Ingredient price fluctuation log | Ingredient, User | **KEEP (CANONICAL)** | Canonical cost trend record. |
| `PriceHistoryRecord` | `domain.ts` | Nested Views | Alternative price history | `domain.Ingredient` | **DEPRECATE** | Duplicate. |
| `SaleOrder` | `index.ts` | SalesView, Dashboard, P&L | Completed customer sale order | SaleOrderItem, Channel | **KEEP (CANONICAL)** | Primary transactional order entity. POS ready with additions. |
| `SaleOrderItem` | `index.ts` | SalesView, P&L | Line item inside customer order | MenuVariant, SaleOrder | **KEEP (CANONICAL)** | Snapshot line item. |
| `DailySalesRecord` | `domain.ts` | `Financials/*`, `Dashboard/*` | Aggregated daily sales report | SalesChannel | **REPORTING** | Useful for day-end rollup; compute from `SaleOrder[]`. |
| `ExpenseRecord` | `index.ts` | ExpensesView, P&L, Storage | Expense voucher record | P&L | **KEEP (CANONICAL)** | Canonical operating expense record. |
| `ExpenseRecord` | `domain.ts` | `Financials/ExpensesView` | Alternative expense record | `domain.ExpenseCategory` | **DEPRECATE** | Duplicate. Canonical version in `index.ts` is in active use. |
| `WasteRecord` | `index.ts` | InventoryView, P&L, Storage | Spoilage / waste transaction | Ingredient, Inventory | **KEEP (CANONICAL)** | Canonical loss tracking model. |
| `WasteRecord` | `domain.ts` | `WasteTrackingView` | Alternative waste record | `WasteReason` | **DEPRECATE** | Duplicate. |
| `Supplier` | `index.ts` | PurchasesView, Storage | Vendor contact directory | PurchaseRecord | **KEEP (CANONICAL)** | Canonical vendor entity. |
| `DailyPnL` | `index.ts` | P&L View calculations | Daily P&L computed report summary | SaleOrder, Expense, Waste | **KEEP (REPORTING)** | Canonical financial summary model. |
| `WhatShouldIDoAdvice` | `domain.ts` | `WhatShouldIDoSection` | AI/Rule-based management advisory | Entity insights | **MIGRATE** | High business value; migrate to canonical reporting. |
| `YieldTestRecord` | `domain.ts` | `YieldManagementView` | Raw lab measurement test log | Ingredient | **MIGRATE** | High culinary value; integrate into Ingredient Yield Lab. |
| `Employee` | `domain.ts` | `LaborView` | Payroll and labor scheduling | Labor costing | **MIGRATE** | Required for future Shift / Cashier / Labor module. |
| `PackagingItem` | `domain.ts` | `PackagingManagementView` | Separate packaging inventory entity | Channel, Menu | **MIGRATE** | Useful for detailed packaging stock deduction. |

---

## 4. TASK 2 — FIELD-BY-FIELD AUDIT OF KEY ENTITIES

### 4.1 `Ingredient`
```typescript
interface Ingredient {
  id: string;                      // [Required] Unique ID (Currently ing_${Date.now()})
  name: string;                    // [Required] Thai display name
  category: IngredientCategory;    // [Required] Enum category
  purchaseQuantity: number;        // [Required] Purchase volume per batch (e.g. 1000)
  purchaseUnit: UnitType;          // [Required] Purchasing unit (e.g. 'g', 'kg')
  purchasePrice: number;           // [Required] Price paid in THB
  actualQuantity: number;          // [Required] Edible portion weight after trimming
  actualUnit: UnitType;            // [Required] Should match baseUnit
  yieldPercent: number;            // [Required] (actualQuantity / purchaseQuantity) * 100
  actualCost: number;              // [Required] Effective cost: purchasePrice * (100 / yieldPercent)
  baseUnit: UnitType;              // [Required] Internal standard unit ('g', 'ml', 'ชิ้น')
  costPerBaseUnit: number;         // [Required] Crucial: actualCost / actualQuantity
  usageUnit: UnitType;             // [Required] Recipe unit ('g', 'ตัว', 'ml', 'ฟอง')
  piecesPerPurchaseUnit?: number;  // [Optional] For count items (e.g. 60 shrimp/pack)
  active: boolean;                 // [Required] Active status
  notes?: string;                  // [Optional] Prep instructions
  isReviewRequired?: boolean;      // [Optional] Flag for missing/abnormal cost
  reviewReason?: string;           // [Optional] Warning message
  supplierId?: string;             // [Optional] Vendor link
  createdAt: string;               // [Required] ISO date
  updatedAt: string;               // [Required] ISO date
}
```
- **Audit Findings:**
  1. `actualQuantity` vs `purchaseQuantity`: Highly accurate calculation in `calculationEngine.ts`.
  2. `piecesPerPurchaseUnit`: Well-designed for seafood (e.g. 60 shrimp per 510 THB = 8.50 THB/piece).
  3. **Identified Missing Fields for POS & Inventory:** `code` (SKU/barcode), `minimumStock`, `currentStock` (redundantly mirrored in `InventoryItem` but missing on master).

### 4.2 `MenuItem` & `MenuVariant`
```typescript
interface MenuItem {
  id: string;                      // [Required] Menu category group ID
  name: string;                    // [Required] Dish group name (e.g. "กะเพรา")
  category: string;                // [Required] Classification (e.g. "อาหารจานเดียว")
  description?: string;            // [Optional] Menu notes
  active: boolean;                 // [Required] Visibility
  displayOrder?: number;           // [Optional] Sorting
  variants: MenuVariant[];         // [Required] Array of child variants
  createdAt?: string;
  updatedAt?: string;
}

interface MenuVariant {
  id: string;                      // [Required] Variant ID (e.g. "var_kaprow_pork_ground")
  menuId?: string;                 // [Optional] Parent backlink
  name: string;                    // [Required] Variant name (e.g. "กะเพราหมูบด ราดข้าว")
  proteinType: string;             // [Required] Protein tag ("หมูบด", "กุ้ง", etc.)
  sellingPrice: number;            // [Required] Dine-in selling price
  takeawayPrice: number;           // [Required] Takeaway price (+packaging)
  deliveryPrice: number;           // [Required] Delivery price (+GP markup)
  recipeItems: RecipeItem[];       // [Required] Bill of materials
  overheadCost: number;            // [Required] Allocated fixed overhead per dish
  active: boolean;                 // [Required] Active selling status
  isReviewRequired?: boolean;      // [Optional] Integrity check
}
```
- **Audit Findings:**
  1. This structure matches restaurant reality where one menu item has multiple protein choices or portion sizes.
  2. Selling prices are explicitly segregated across channels (`sellingPrice`, `takeawayPrice`, `deliveryPrice`), avoiding arbitrary runtime percentage guesses.
  3. **POS Gap:** Lacks `barcode`, `kitchenStation` (e.g. 'WOK', 'FRY', 'DRINK'), and `taxType` (inclusive/exclusive VAT).

### 4.3 `RecipeItem` & `Sauce`
```typescript
interface RecipeItem {
  id?: string;                     // [Optional] Line item ID
  type?: RecipeItemType;           // [Optional] 'INGREDIENT' | 'SAUCE' | 'PREPARED_ITEM'
  ingredientType?: RecipeItemType; // [Redundant duplicate of type]
  ingredientId: string;            // [Required] ID of Ingredient or Sauce
  sauceId?: string;                // [Ambiguous backlink]
  name: string;                    // [Required] Snapshot name
  quantity: number;                // [Required] Quantity used
  unit: UnitType;                  // [Required] Usage unit
  isSeafoodSpecialty?: boolean;    // [Optional] Direct seafood tracking
  proteinCategory?: 'SHRIMP' | 'SQUID' | 'PORK' | 'CHICKEN' | 'BEEF' | 'OTHER';
  calculatedUnitCost?: number;     // [Calculated runtime snapshot]
  calculatedLineCost?: number;     // [Calculated runtime snapshot]
  isReviewRequired?: boolean;      // [Data review required flag]
}
```
- **Audit Findings:**
  1. `ingredientType` vs `type`: Redundant naming collision. Should standardize on `type: 'INGREDIENT' | 'SAUCE'`.
  2. `ingredientId` is used to store both ingredient IDs and sauce IDs when `type === 'SAUCE'`. This works in the engine, but adding an explicit `targetType` makes relation traversal unambiguous.
  3. `calculatedUnitCost` and `calculatedLineCost` are volatile in the variant recipe, but MUST be frozen when copied into `SaleOrderItem`.

### 4.4 `SaleOrder` & `SaleOrderItem`
```typescript
interface SaleOrderItem {
  menuId?: string;                 // [Optional]
  variantId: string;               // [Required] Sellable SKU
  menuName: string;                // [Required] Snapshot parent name
  variantName: string;             // [Required] Snapshot variant name
  quantity: number;                // [Required] Quantity ordered
  unitPrice: number;               // [Required] Price per unit charged
  foodCostPerUnit: number;         // [Required] SNAPSHOT of food cost at sale time
  totalPrice: number;              // [Required] quantity * unitPrice
  totalFoodCost: number;           // [Required] quantity * foodCostPerUnit
}

interface SaleOrder {
  id: string;                      // [Required] Order ID (Currently ord_${Date.now()})
  orderNumber: string;             // [Required] Human readable number (e.g. ORD-123456)
  date: string;                    // [Required] YYYY-MM-DD
  time: string;                    // [Required] HH:mm
  channel: string;                 // [Required] 'DINE_IN' | 'TAKEAWAY' | 'GRABFOOD' | 'LINE MAN'
  items: SaleOrderItem[];          // [Required] Order items
  grossSales: number;              // [Required] Gross revenue
  commissionFee: number;           // [Required] Platform GP deduction
  commissionPercent?: number;      // [Optional] Platform rate applied
  packagingCost: number;           // [Required] Packaging material cost
  totalFoodCost: number;           // [Required] Sum of items totalFoodCost
  grossProfit: number;             // [Required] grossSales - commissionFee - packagingCost - totalFoodCost
  netRevenue?: number;             // [Optional] grossSales - commissionFee
  notes?: string;                  // [Optional] Order notes
  createdAt?: string;              // [Optional] ISO timestamp
}
```
- **Audit Findings:**
  1. **Cost Snapshot Capability:** `SaleOrderItem` ALREADY snapshots `foodCostPerUnit` and `totalFoodCost` upon order creation in `SalesView.tsx`. This is an exceptional architectural foundation!
  2. **Gaps for Full POS Operation:**
     - Missing `discountAmount`, `taxAmount` (VAT 7%), `serviceChargeAmount`.
     - Missing `paymentStatus`: (`'PAID' | 'PENDING' | 'REFUNDED' | 'VOID'`).
     - Missing `paymentMethod`: (`'CASH' | 'PROMPTPAY' | 'CREDIT_CARD' | 'DELIVERY_TRANSFER'`).
     - Missing `tableNumber`, `guestCount`, `cashierShiftId`.
     - Missing order life-cycle status: `orderStatus` (`'OPEN' | 'COMPLETED' | 'CANCELLED'`).

### 4.5 `InventoryItem` & `InventoryTransaction`
```typescript
interface InventoryItem {
  id?: string;                     // [Optional] Internal item ID
  ingredientId: string;            // [Required] Foreign key to Ingredient
  ingredientName: string;          // [Required] Denormalized name
  currentStock?: number;           // [Optional] Field name 1
  currentQuantity?: number;        // [Optional] Field name 2 (Duplicate semantic!)
  unit: UnitType;                  // [Required] Storage unit
  minStock?: number;               // [Optional] Field name 1
  minimumStock?: number;           // [Optional] Field name 2 (Duplicate semantic!)
  maxStock?: number;               // [Optional] Field name 1
  maximumStock?: number;           // [Optional] Field name 2 (Duplicate semantic!)
  costPerUnit?: number;            // [Optional] Average cost per unit
  lastUpdated: string;             // [Required] ISO date
}
```
- **Audit Findings:**
  1. Semantic duplication in fields: `currentStock` vs `currentQuantity`, `minStock` vs `minimumStock`, `maxStock` vs `maximumStock`.
  2. Code in `App.tsx` and `InventoryView.tsx` uses `currentStock` and `minStock`. Standardize strictly on `currentStock`, `minStock`, `maxStock`.

### 4.6 `WasteRecord`
```typescript
interface WasteRecord {
  id: string;                      // [Required] waste_${Date.now()}
  date: string;                    // [Required] YYYY-MM-DD
  ingredientId: string;            // [Required] Foreign key
  ingredientName: string;          // [Required] Denormalized name
  quantity: number;                // [Required] Lost quantity
  unit: UnitType;                  // [Required] Measurement unit
  cost?: number;                   // [Optional] Total cost in some views
  totalCost?: number;              // [Optional] Total cost in initialData! (CRITICAL MISMATCH)
  unitCost?: number;               // [Optional] Unit cost
  reason?: string;                 // [Optional] Reason code
  reasonText?: string;             // [Optional] Explanation
  notes?: string;                  // [Optional] Notes
  user: string;                    // [Required] Responsible staff
}
```
- **CRITICAL AUDIT FINDING:**
  In `INITIAL_WASTE_LOG` (`initialData.ts`), the cost is stored as `totalCost: 24.49`, while `ProfitLossView.tsx` (line 49) previously calculated `w.cost`, causing potential `NaN` when `w.cost` was undefined.
  **Standardization required:** `totalCost: number` (Required) and `unitCost: number` (Required), with backward-compatible getter fallback `cost = totalCost`.

---

## 5. TASK 3 — DATA RELATIONSHIP ARCHITECTURE

The canonical database graph connects operational sales, inventory deductions, food costing, and profit reporting through immutable links:

```
[Supplier]
    │
    ▼ (supplies)
[PurchaseRecord] ───(triggers)───► [InventoryTransaction (PURCHASE)]
    │                                              │
    ▼ (updates cost & stock)                       ▼ (increments)
[Ingredient] ◄────────────────────────────── [InventoryItem]
    │                                              ▲
    ├──► [SauceRecipeItem] ──► [Sauce]            │ (decrements)
    │                             │                │
    ▼                             ▼                │
[RecipeItem] ◄────────────────────┘                │
    │                                              │
    ▼ (defines BOM)                                │
[MenuVariant] ◄─── (grouped in) ─── [MenuItem]    │
    │                                              │
    ▼ (selected in POS)                            │
[SaleOrderItem] ───(deducts BOM ingredients)───────┘
    │              (creates 'USAGE' InventoryTransaction)
    ▼
[SaleOrder]
    │
    ├──► Gross Sales (Revenue)
    │         │
    │         ├── ( - ) Total Food Cost (COGS Snapshot)
    │         ├── ( - ) Delivery Commission Fee (GP)
    │         └── ( - ) Packaging Cost
    │         │
    │         ▼
    ├──► Gross Profit
    │         │
    │         └── ( - ) [ExpenseRecord] (Rent, Utilities, Labor, Overhead)
    │         └── ( - ) [WasteRecord] (Spoilage leakage)
    │         │
    │         ▼
    └──► Net Profit (Bottom-line Cash Earnings)
```

### Complete Relationship Specifications:
1. **Menu & Product Cascade:**
   `MenuItem (1)` ─── `hasMany` ───► `MenuVariant (N)`
   `MenuVariant (1)` ─── `hasMany` ───► `RecipeItem (N)`
   `RecipeItem (N)` ─── `references` ───► `Ingredient (1)` OR `Sauce (1)`
   `Sauce (1)` ─── `hasMany` ───► `SauceRecipeItem (N)` ─── `references` ───► `Ingredient (1)`

2. **Sales & Order Snapshot Cascade:**
   `SaleOrder (1)` ─── `hasMany` ───► `SaleOrderItem (N)`
   `SaleOrderItem (N)` ─── `snapshots` ───► `MenuVariant (1)` (Price, Food Cost, Recipe snapshot)

3. **Inventory & Depletion Cascade (To be connected in Phase 2):**
   `SaleOrder (1)` ─── `onComplete` ───► `InventoryTransaction (N, type: 'USAGE')`
   `InventoryTransaction (N)` ─── `updates` ───► `InventoryItem.currentStock`

4. **Accounting & P&L Cascade:**
   `Gross Sales` = $\sum \text{SaleOrder.grossSales}$
   $\text{COGS}$ = $\sum \text{SaleOrder.totalFoodCost} + \sum \text{WasteRecord.totalCost}$
   $\text{Gross Margin}$ = $\text{Gross Sales} - \text{COGS} - \text{Platform GP} - \text{Packaging}$
   $\text{Operating Expenses (OPEX)}$ = $\sum \text{ExpenseRecord.amount}$
   $\text{Net Profit}$ = $\text{Gross Margin} - \text{OPEX}$

---

## 6. TASK 4 — TRANSACTION MODEL AUDIT & POS READINESS

### Evaluation of `SaleOrder`:
| POS Requirement | Exists in Current Model? | Current Field Name | Evaluation & Recommendation |
|---|---|---|---|
| Order Number | Yes | `orderNumber` | Currently `ORD-${Date.now().toString().slice(-6)}`. Functional, but should transition to daily sequence `ORD-YYYYMMDD-XXXX`. |
| Order Date | Yes | `date` | `YYYY-MM-DD` string. Correct and indexed. |
| Order Time | Yes | `time` | `HH:mm` string. Correct. |
| Channel | Yes | `channel` | `'DINE_IN' \| 'TAKEAWAY' \| 'GRABFOOD' \| 'LINE MAN'`. |
| Items List | Yes | `items: SaleOrderItem[]` | Populated with line items. |
| Subtotal | Partially | Derived from sum | Recommended explicit field: `subtotal: number`. |
| Discount | Missing | None | Recommended optional field: `discountAmount: number`, `discountReason?: string`. |
| Tax / VAT | Missing | None | Recommended optional field: `taxAmount: number` (7% VAT when applicable). |
| Packaging Cost | Yes | `packagingCost` | Computed and persisted correctly per order. |
| Commission Fee | Yes | `commissionFee` | GP fee deducted based on channel percentage. |
| Total Food Cost | Yes | `totalFoodCost` | Summed from item snapshots. |
| Gross Profit | Yes | `grossProfit` | Computed and persisted. |
| Payment Status | Missing | None | Needed for POS: `'PAID' \| 'PENDING' \| 'VOID' \| 'REFUNDED'`. |
| Payment Method | Missing | None | Needed for POS: `'CASH' \| 'PROMPTPAY' \| 'CREDIT_CARD' \| 'DELIVERY'`. |
| Order Status | Missing | None | Needed for POS: `'DRAFT' \| 'SUBMITTED' \| 'COMPLETED' \| 'CANCELLED'`. |
| Table / Guest | Missing | None | Needed for Table POS: `tableNumber?: string`, `guestCount?: number`. |
| Timestamps | Partially | `createdAt` | Add `updatedAt: string`. |

**Verdict:** `SaleOrder` is **70% POS-Ready**. It already supports all financial and cost computations. Adding the proposed non-breaking optional fields will make it 100% POS-ready without disturbing existing reports or views.

---

## 7. TASK 5 — COST SNAPSHOT MECHANISM

### Detailed Analysis of Current State:
In `src/components/SalesView.tsx` (lines 148–158), when an order is created:
```typescript
finalItems.push({
  menuId: match.menu.id,
  menuName: match.menu.name,
  variantId: match.variant.id,
  variantName: `${match.variant.name} (${match.variant.proteinType})`,
  quantity: oi.quantity,
  unitPrice: price,
  totalPrice: itemTotal,
  foodCostPerUnit: bd.totalFoodCost,  // <--- SNAPSHOTTED!
  totalFoodCost: itemFoodCost,        // <--- SNAPSHOTTED!
});
```
### Confirmation:
- **Historical Orders are Immune to Price Inflation:** If pork increases from 120 to 180 THB tomorrow, existing orders in `salesOrders` maintain their historical `foodCostPerUnit` and `totalFoodCost`.
- **Gaps in Current Snapshot:**
  While the *total* food cost is snapshotted, the *ingredient recipe breakdown* (how many grams of pork, shrimp, sauce were used in that specific order) is not currently stored in `SaleOrderItem`.
  **Recommendation:** Add an optional `recipeSnapshot?: Array<{ ingredientId: string; name: string; quantity: number; unit: string; unitCost: number; lineCost: number }>` to `SaleOrderItem`. This will enable retroactive ingredient consumption verification and precision inventory rollbacks.

---

## 8. TASK 6 — LOCAL STORAGE AUDIT

### 8.1 Inventory of Storage Keys in `src/services/storageService.ts`
| Logical Scope | Current Key Name | Data Type | Default Seed Source | Status / Risk |
|---|---|---|---|---|
| Settings | `tonys_settings_v1` | `RestaurantSettings` | `INITIAL_SETTINGS` | Correctly scoped |
| Ingredients | `tonys_ingredients_v1` | `Ingredient[]` | `INITIAL_INGREDIENTS` | Correctly scoped |
| Sauces | `tonys_sauces_v1` | `Sauce[]` | `INITIAL_SAUCES` | Correctly scoped |
| Menus | `tonys_menus_v1` | `MenuItem[]` | `INITIAL_MENUS` | Correctly scoped |
| Suppliers | `tonys_suppliers_v1` | `Supplier[]` | `INITIAL_SUPPLIERS` | Correctly scoped |
| Inventory | `tonys_inventory_v1` | `InventoryItem[]` | `INITIAL_INVENTORY` | Correctly scoped |
| Inventory Txns | `tonys_inventory_txns_v1` | `InventoryTransaction[]` | `[]` | Correctly scoped |
| Purchases | `tonys_purchases_v1` | `PurchaseRecord[]` | `[]` | Correctly scoped |
| Price History | `tonys_price_history_v1` | `PriceHistoryRecord[]` | `[]` | Correctly scoped |
| Expenses | `tonys_expenses_v1` | `ExpenseRecord[]` | `INITIAL_EXPENSES` | Correctly scoped |
| Sales Orders | `tonys_sales_v1` | `SaleOrder[]` | `INITIAL_SALES_ORDERS` | Correctly scoped |
| Waste Log | `tonys_waste_v1` | `WasteRecord[]` | `INITIAL_WASTE_LOG` | Correctly scoped |

### 8.2 CRITICAL SECURITY / DATA INTEGRITY FINDING: `localStorage.clear()`
Line 157 in `src/services/storageService.ts`:
```typescript
resetToDefaults(): void {
  localStorage.clear(); // <--- VIOLATION OF RULE & DANGEROUS!
  safeSave(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  ...
}
```
**Risk:** `localStorage.clear()` obliterates the entire browser domain storage, destroying tokens, keys, and data belonging to any other app on the host.
**Mandatory Fix:** Replace `localStorage.clear()` with scoped deletion:
```typescript
resetToDefaults(): void {
  // Only remove keys belonging to Tony's Restaurant System
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
  // Repopulate defaults
  safeSave(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  safeSave(STORAGE_KEYS.INGREDIENTS, INITIAL_INGREDIENTS);
  ...
}
```

---

## 9. TASK 7 — DATA PROTECTION (BACKUP & RESTORE ARCHITECTURE)

### 9.1 Local-First Full Backup Specification (JSON Schema)
To ensure complete resilience against browser cache purges or device migration, the system requires a standardized JSON export package:

```typescript
export interface AppBackupPackage {
  schemaVersion: '1.0.0';
  appId: 'TONYS_KITCHEN_POS';
  exportedAt: string;         // ISO 8601 string: 2026-09-19T10:30:00.000Z
  appName: string;
  storeName: string;
  checksum: string;           // SHA-256 or CRC32 hash of payload
  payload: {
    settings: RestaurantSettings;
    ingredients: Ingredient[];
    sauces: Sauce[];
    menus: MenuItem[];
    suppliers: Supplier[];
    inventory: InventoryItem[];
    inventoryTransactions: InventoryTransaction[];
    purchases: PurchaseRecord[];
    priceHistory: PriceHistoryRecord[];
    expenses: ExpenseRecord[];
    salesOrders: SaleOrder[];
    wasteLog: WasteRecord[];
  };
}
```

### 9.2 File Naming Standard
`TONYS_BACKUP_YYYY-MM-DD_HHmm.json` (e.g. `TONYS_BACKUP_2026-09-19_1030.json`).

### 9.3 Validation & Integrity Guard Plan
1. **Schema Check:** Confirm `schemaVersion === '1.0.0'` and `appId === 'TONYS_KITCHEN_POS'`.
2. **Array Validation:** Check that `ingredients`, `menus`, `salesOrders`, and `inventory` are valid arrays.
3. **Foreign Key Health Check:** Ensure that variant recipe items reference valid ingredient or sauce IDs.
4. **Safety Confirmation:** User must explicitly confirm before restore overwrites active storage.

---

## 10. TASK 8 — ID GENERATION SYSTEM AUDIT

### Current Implementations:
- `ing_${Date.now()}`
- `ord_${Date.now()}`
- `txn_${Date.now()}`
- `waste_${Date.now()}`
- `inv_${Date.now()}`
- `ORD-${Date.now().toString().slice(-6)}`

### Analysis & Risks:
1. **Clock Collision Risk:** When multiple items or batch transactions are generated in the same millisecond loop (e.g. bulk importing or rapid POS order entry), `Date.now()` produces duplicate IDs.
2. **Human Readability:** Kitchen and cashier staff cannot easily read `ord_1726742400000`.

### Canonical ID Architecture:
1. **Internal Technical IDs (Surrogate Key):**
   Use standard UUIDv4 or collision-resistant timestamp + random:
   ```typescript
   export function generateId(prefix: string): string {
     if (typeof crypto !== 'undefined' && crypto.randomUUID) {
       return `${prefix}_${crypto.randomUUID()}`;
     }
     return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
   }
   ```
2. **Human-Readable Business Numbers (Order Number):**
   Format: `ORD-YYYYMMDD-XXXX` (e.g. `ORD-20260919-0001`), where `XXXX` is a daily sequential counter reset each morning at 00:00 or at cashier shift opening.

---

## 11. TASK 9 — LEGACY CODE CLASSIFICATION & MIGRATION STRATEGY

| File / Component Path | Status | Dependency Analysis | Action Plan |
|---|---|---|---|
| `src/types/index.ts` | **KEEP** | Used by `App.tsx` and all active views | **Canonical Base**. Enrich with necessary optional fields. |
| `src/types/domain.ts` | **MIGRATE** | Used by `src/engine/*`, `data/excelMapper.ts`, and unmounted views | Extract `WhatShouldIDoAdvice`, `YieldTestRecord`, `Employee` into `src/types/index.ts`. Retain as deprecated until Subsystem B is phased out. |
| `src/services/storageService.ts` | **KEEP** | Core active data layer in `App.tsx` | Fix `localStorage.clear()` vulnerability. Add backup export/import helpers. |
| `src/services/calculationEngine.ts` | **KEEP** | Core calculations in `App.tsx`, `FoodCostView`, `MenuCostingView`, `SalesView` | Verified 100% deterministic and aligned with Thai restaurant pricing guidelines. |
| `src/engine/calculations.ts` | **MIGRATE** | Used by unmounted subfolder components | Compare mathematical functions; incorporate missing utility functions (e.g. `convertUnit` for density) into `calculationEngine.ts`. |
| `src/engine/units.ts` | **MIGRATE** | Used by `src/engine/calculations.ts` | Unit conversion helper; harmonize with Thai units. |
| `src/engine/advisory.ts` | **MIGRATE** | Provides rules for "What Should I Do" advice | Bridge to canonical models for the POS dashboard. |
| `src/engine/unitTests.ts` | **KEEP** | Comprehensive mathematical assertions | Retain for continuous calculation verification. |
| `src/data/initialData.ts` | **KEEP** | Master seed data for Tony's Kitchen | Maintain as canonical seed data. |
| `src/data/excelMapper.ts` | **MIGRATE** | Used by `ExcelImportModal.tsx` | Bridge to import directly into canonical `Ingredient` and `MenuItem`. |
| `src/components/*` (Root flat views) | **KEEP** | All 15 root views actively mounted in `App.tsx` | Active application views. |
| `src/components/Channels/*` | **DEPRECATE** | Unmounted duplicates of `SettingsView` channel tabs | Review features, merge unique options into `SettingsView.tsx`, then retire. |
| `src/components/Financials/*` | **DEPRECATE** | Unmounted duplicates of `ProfitLossView` & `ExpensesView` | `ProfitLossView.tsx` already delivers active financial statements. |
| `src/components/Ingredients/*` | **DEPRECATE** | Unmounted views | `IngredientsView.tsx` with Step 2 Yield Lab already covers this workflow. |
| `src/components/Inventory/*` | **DEPRECATE** | Unmounted views | `InventoryView.tsx` covers stock & waste. |
| `src/components/Recipes/*` | **DEPRECATE** | Unmounted views | `RecipeBuilderView.tsx` & `FoodCostView.tsx` provide active live editing. |
| `src/components/Tools/*` | **DEPRECATE** | Unmounted views | Reconcile any useful test runner modals into `ReportsView.tsx`. |

---

## 12. TASK 10 — CALCULATION ENGINE AUDIT

### Detailed Mathematical Verification:

| Business Metric | Implementation in `calculationEngine.ts` | Formula Verified | Evaluation Status |
|---|---|---|---|
| **Ingredient Actual Cost** | `calculateIngredientCost` | $\text{purchasePrice} \times \frac{100}{\text{yieldPercent}}$ | **CORRECT** (Deterministic, verified against Excel). |
| **Cost per Base Unit** | `calculateIngredientCost` | $\frac{\text{actualCost}}{\text{actualQuantity}}$ (or $\frac{\text{purchasePrice}}{\text{pieces}}$ for piece items) | **CORRECT** (Handles weight and piece overrides). |
| **Sauce Batch Cost** | `calculateSauceCost` | $\sum (\text{item.quantity} \times \text{unitCost}) \times \frac{100}{\text{yieldPercent}}$ | **CORRECT** (Recalculates sub-ingredients via lookup map). |
| **Dish Food Cost** | `calculateVariantCostBreakdown` | $\sum \text{Seafood} + \sum \text{Meat} + \sum \text{Sauces} + \sum \text{Central}$ | **CORRECT** (Separates protein, seafood, sauces). |
| **Overhead Allocation** | `calculateVariantCostBreakdown` | `variant.overheadCost ?? settings.defaultOverheadCostPerDish` | **CORRECT** (Supports dish override or store default). |
| **Dine-In Food Cost %** | `calculateVariantCostBreakdown` | $\frac{\text{totalIngredientCost}}{\text{sellingPrice}} \times 100$ | **CORRECT** (Overhead not mixed into pure food cost %). |
| **Takeaway Profit** | `calculateVariantCostBreakdown` | $\text{takeawayPrice} - \text{totalCost} - \text{takeawayPackagingCost}$ | **CORRECT** (Proper packaging cost deduction). |
| **Delivery GP & Net** | `calculateOrderFinancials` | $\text{Gross} - (\text{Gross} \times \frac{\text{GP}\%}{100}) - \text{Packaging} - \text{FoodCost}$ | **CORRECT** (Grab 30% / LINE MAN 25% properly deducted). |
| **Pricing Advisor** | `calculateSuggestedPrices` | $\frac{\text{FoodCost}}{\text{TargetFC}\%}$ and $\frac{\text{NetNeeded}}{1 - \text{GP}\%}$ | **CORRECT** (Provides mathematically sound selling prices). |
| **Inventory Stock Depletion** | Missing in `handleSaveSaleOrder` | $\text{Stock}_{\text{new}} = \text{Stock}_{\text{old}} - (\text{SoldQty} \times \text{BOMQty})$ | **MISSING IN ACTIVE SALES FLOW** (Identified for Phase 2). |
| **Waste Leakage in P&L** | `ProfitLossView.tsx` | $\text{Total COGS} = \text{Menu Food Cost} + \text{Waste Cost}$ | **NEEDS REVIEW** (Fix `w.cost` vs `w.totalCost` fallback). |

---

## 13. SUMMARY OF CRITICAL PROBLEMS & ARCHITECTURAL GAPS

1. **`localStorage.clear()` Vulnerability:** In `storageService.ts` line 157, `resetToDefaults()` calls `localStorage.clear()`. This must be scoped strictly to `tonys_*` keys.
2. **Disconnected POS-to-Inventory Chain:** `handleSaveSaleOrder` in `App.tsx` saves the order but does not automatically create `InventoryTransaction (USAGE)` or reduce `currentStock` in `inventory`.
3. **Field Naming Collision in `InventoryItem`:** `currentStock` vs `currentQuantity`, `minStock` vs `minimumStock`.
4. **Waste Record Cost Property Discrepancy:** `w.cost` vs `w.totalCost` in `WasteRecord` and `ProfitLossView.tsx`.
5. **Two Parallel Subsystems:** Legacy unmounted components in `src/components/*/*` and `src/types/domain.ts` create developer confusion and potential typing divergence.

---

## 14. SAFE CHANGES (To execute without disrupting live code)
1. Safely replace `localStorage.clear()` in `storageService.ts` with scoped key iteration.
2. Fix `w.totalCost || w.cost || 0` fallback in `ProfitLossView.tsx`.
3. Enrich `src/types/index.ts` with optional POS fields (`paymentStatus`, `paymentMethod`, `orderStatus`, `discountAmount`, `taxAmount`, `tableNumber`).
4. Add `generateId()` with collision-proof fallback to replace standalone `Date.now()`.

---

## 15. CHANGES THAT MUST NOT BE MADE
1. **DO NOT** delete `src/types/domain.ts` or `src/engine/` until the migration plan is executed.
2. **DO NOT** introduce Firebase, Supabase, Cloud DB, or external HTTP backend services.
3. **DO NOT** alter the calculation formulas in `calculationEngine.ts` which are 100% verified.
4. **DO NOT** rename or move any `.png` image assets.
5. **DO NOT** begin building the POS user interface during Phase 1.

---

## 16. MIGRATION PLAN TO UNIFIED LOCAL-FIRST POS

```
Phase 1A: Data Model Audit & Canonical Specification (COMPLETED)
    │
    ▼
Phase 1B: Safe Model Harmonization (Next Step)
    ├── Enrich `src/types/index.ts` with POS & Inventory fields (non-breaking)
    ├── Scope `storageService.ts` reset logic (eliminate `localStorage.clear()`)
    └── Create full JSON Backup / Restore engine (file I/O only, no UI yet)
    │
    ▼
Phase 2: Operational Engine Integration
    ├── Connect POS Sale -> Recipe Explosion -> Inventory Usage Deduction
    ├── Implement Shift / Cashier / Table state data models
    └── Deprecate Subsystem B (`domain.ts`) after confirming all types are covered
    │
    ▼
Phase 3: POS UI & Web Ordering
    ├── Fast-Touch POS Grid View
    ├── Real-time Receipt & Kitchen Order Ticket (KOT)
    └── Table / QR Ordering local sync
```

---

## 17. FINAL RECOMMENDED ARCHITECTURE SPECIFICATION

The unified Local-First Restaurant System architecture:
- **Client Storage:** HTML5 LocalStorage with `tonys_*` namespaces.
- **Model Engine:** Single source of truth in `src/types/index.ts`.
- **Computation:** Pure, synchronous, deterministic engine in `src/services/calculationEngine.ts`.
- **Auditability:** Every stock change backed by an immutable `InventoryTransaction`.
- **Financial Accuracy:** Historical order margins frozen via snapshot on `SaleOrderItem`.
- **Disaster Recovery:** Native full-state JSON backup and restore with schema validation.
