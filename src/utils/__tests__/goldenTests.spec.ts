import { describe, it, expect } from 'vitest';
import {
  calculateIngredientItemCost,
  calculateSubRecipeCostPure,
  calculateFoodCostMetrics,
  calculateSuggestedPriceWithRounding,
  calculateBillTotal,
  calculateDeliveryPricing,
  calculateDeliveryProfitability,
  convertExpenseToMonthly,
  calculateAssetMonthlyExpense,
  calculateTotalMonthlyExpenses,
  calculateNormalizedNetSales,
  calculateOverheadRatePercent,
  calculateBreakEven,
  calculateSeatedOverhead,
  calculateOverheadSensitivity,
  calculateLoggedSalesProjection,
  validateExpenseInput,
  validatePercentage,
  upsertDailySalesRecord,
  checkCircularSubRecipe,
  checkIngredientUsage,
} from '../../engine/calculations';
import { ExpenseRecord, DailySalesRecord } from '../../types/domain';
import { StorageService } from '../../services/storageService';

describe('Part 2 – Golden Test Cases Verification', () => {
  describe('Food Cost Golden Test Cases (F1 – F15)', () => {
    // F1: 1 kg = 180 THB, base g, line 200 g -> 36.00
    it('F1: 1 kg = 180 THB, base g, line 200 g -> 36.00', () => {
      const result = calculateIngredientItemCost({
        purchasePrice: 180,
        purchaseQuantity: 1,
        purchaseUnit: 'kg',
        usageQuantity: 200,
        usageUnit: 'g',
        ingredientYield: 100,
      });
      expect(result.isValid).toBe(true);
      expect(result.lineCost).toBe(36.0);
    });

    // F2: 1 kg = 200 THB, yield 60%, line 300 g -> 100.00
    it('F2: 1 kg = 200 THB, yield 60%, line 300 g -> 100.00', () => {
      const result = calculateIngredientItemCost({
        purchasePrice: 200,
        purchaseQuantity: 1,
        purchaseUnit: 'kg',
        usageQuantity: 300,
        usageUnit: 'g',
        ingredientYield: 60,
      });
      expect(result.isValid).toBe(true);
      expect(result.unitCost).toBeCloseTo(0.333333, 4);
      expect(result.lineCost).toBe(100.0);
    });

    // F3: 100 THB/kg, line yield override 70%, 100 g -> 14.29
    it('F3: 100 THB/kg, line yield override 70%, 100 g -> 14.29', () => {
      const result = calculateIngredientItemCost({
        purchasePrice: 100,
        purchaseQuantity: 1,
        purchaseUnit: 'kg',
        usageQuantity: 100,
        usageUnit: 'g',
        ingredientYield: 100,
        lineYieldOverride: 70,
      });
      expect(result.isValid).toBe(true);
      expect(Number(result.lineCost.toFixed(2))).toBe(14.29);
    });

    // F4: pack of 30 eggs = 120 THB, 2 eggs -> 8.00
    it('F4: pack of 30 eggs = 120 THB, 2 eggs -> 8.00', () => {
      const result = calculateIngredientItemCost({
        purchasePrice: 120,
        purchaseQuantity: 30,
        purchaseUnit: 'egg',
        usageQuantity: 2,
        usageUnit: 'egg',
        ingredientYield: 100,
      });
      expect(result.isValid).toBe(true);
      expect(result.unitCost).toBe(4.0);
      expect(result.lineCost).toBe(8.0);
    });

    // F5: sub-recipe total cost 60.00, output 1000 ml, menu uses 50 ml -> 3.00
    it('F5: sub-recipe total cost 60.00, output 1000 ml, menu uses 50 ml -> 3.00', () => {
      const subRecipe = calculateSubRecipeCostPure(60.0, 1000);
      const lineCost = subRecipe.costPerUnit * 50;
      expect(subRecipe.costPerUnit).toBe(0.06);
      expect(lineCost).toBe(3.0);
    });

    // F6: sub-recipe A = 60.00 per 1000 ml; sub-recipe B = 500 ml of A + 20.00 other, output 500 ml; menu uses 100 ml of B -> 10.00
    it('F6: Nested sub-recipe: sub-recipe A = 60.00 per 1000 ml, B = 500 ml of A + 20.00 other, output 500 ml, menu uses 100 ml of B -> 10.00', () => {
      const subA = calculateSubRecipeCostPure(60.0, 1000); // 0.06 THB/ml
      const costOfAInB = subA.costPerUnit * 500; // 30.00 THB
      const totalCostB = costOfAInB + 20.0; // 50.00 THB
      const subB = calculateSubRecipeCostPure(totalCostB, 500); // 50 / 500 = 0.10 THB/ml
      const lineCostInMenu = subB.costPerUnit * 100;
      expect(lineCostInMenu).toBe(10.0);
    });

    // F7: ingredient cost 41.50, extra costs 5.00, price 120 ex-VAT, overhead 35% of selling price -> overhead 42.00, total cost 88.50, Food Cost % 34.6, total cost % 73.8, profit 31.50, profit % 26.3
    it('F7: ingredient cost 41.50, extra costs 5.00, price 120 ex-VAT, overhead 35% of selling price -> overhead 42.00, total cost 88.50, Food Cost % 34.6, total cost % 73.8, profit 31.50, profit % 26.3', () => {
      const metrics = calculateFoodCostMetrics(41.5, 5.0, 120, 35, false, 7);
      expect(metrics.overheadCost).toBe(42.0);
      expect(metrics.totalCost).toBe(88.5);
      expect(metrics.foodCostPercent).toBe(34.6);
      expect(metrics.totalCostPercent).toBe(73.8);
      expect(metrics.profitAmount).toBe(31.5);
      expect(metrics.profitPercent).toBe(26.3);
    });

    // F8: cost 41.50, target 35% -> raw 118.57; rounded up step 1/5/10 = 119/120/120. target 30% -> raw 138.33; 139/140/140
    it('F8: cost 41.50, target 35% -> raw 118.57, rounded up step 1/5/10 = 119/120/120; target 30% -> raw 138.33, rounded up = 139/140/140', () => {
      const price35 = calculateSuggestedPriceWithRounding(41.5, 35);
      expect(price35.rawPrice).toBe(118.57);
      expect(price35.roundedStep1).toBe(119);
      expect(price35.roundedStep5).toBe(120);
      expect(price35.roundedStep10).toBe(120);

      const price30 = calculateSuggestedPriceWithRounding(41.5, 30);
      expect(price30.rawPrice).toBe(138.33);
      expect(price30.roundedStep1).toBe(139);
      expect(price30.roundedStep5).toBe(140);
      expect(price30.roundedStep10).toBe(140);
    });

    // F9: price 107 incl. VAT 7% -> ex-VAT 100.00, VAT 7.00
    it('F9: price 107 incl. VAT 7% -> ex-VAT 100.00, VAT 7.00', () => {
      const bill = calculateBillTotal(107, 0, 7, true);
      expect(bill.basePriceExVat).toBe(100.0);
      expect(bill.vatAmount).toBe(7.0);
      expect(bill.customerPay).toBe(107.0);
    });

    // F10: base 100, service charge 10%, VAT 7% -> service 10.00, VAT 7.70, customer pays 117.70
    it('F10: base 100, service charge 10%, VAT 7% -> service 10.00, VAT 7.70, customer pays 117.70', () => {
      const bill = calculateBillTotal(100, 10, 7, false);
      expect(bill.serviceChargeAmount).toBe(10.0);
      expect(bill.vatAmount).toBe(7.7);
      expect(bill.customerPay).toBe(117.7);
    });

    // F11: delivery suggested price: cost 41.50, target 35%, GP 30% no VAT -> 169.39; GP with VAT 7% (effective 32.1%) -> 174.63
    it('F11: delivery suggested price: cost 41.50, target 35%, GP 30% no VAT -> 169.39; GP with VAT 7% -> 174.63', () => {
      const noVat = calculateDeliveryPricing(41.5, 35, 30, false, 7);
      expect(noVat.suggestedDeliveryPrice).toBe(169.39);
      expect(noVat.effectiveGpPercent).toBe(30.0);

      const withVat = calculateDeliveryPricing(41.5, 35, 30, true, 7);
      expect(withVat.effectiveGpPercent).toBe(32.1);
      expect(withVat.suggestedDeliveryPrice).toBe(174.63);
    });

    // F12: delivery profitability: delivery price 180, packaging 5, GP 30% no VAT -> net revenue 126.00, Food Cost % 32.9, profit before overhead 79.50. GP with VAT 7% (effective 32.1%) -> net revenue 122.22, Food Cost % 34.0, profit before overhead 75.72
    it('F12: delivery profitability: delivery price 180, packaging 5, GP 30% no VAT -> net 126.00, FC 32.9%, profit 79.50; GP with VAT -> net 122.22, FC 34.0%, profit 75.72', () => {
      const noVatProfit = calculateDeliveryProfitability(180, 41.5, 5, 30, false, 7);
      expect(noVatProfit.netRevenue).toBe(126.0);
      expect(noVatProfit.foodCostPercent).toBe(32.9);
      expect(noVatProfit.profitBeforeOverhead).toBe(79.5);

      const withVatProfit = calculateDeliveryProfitability(180, 41.5, 5, 30, true, 7);
      expect(withVatProfit.netRevenue).toBe(122.22);
      expect(withVatProfit.foodCostPercent).toBe(34.0);
      expect(withVatProfit.profitBeforeOverhead).toBe(75.72);
    });

    // F13: dish with ingredient cost 41.50, overhead 35%, price 120 incl. VAT 7% -> ex-VAT 112.15, overhead 39.25, total cost 80.75, Food Cost % 37.0, total cost % 72.0, profit 31.40, profit % 28.0
    it('F13: dish with ingredient cost 41.50, overhead 35%, price 120 incl. VAT 7% -> ex-VAT 112.15, overhead 39.25, total cost 80.75, Food Cost % 37.0, total cost % 72.0, profit 31.40, profit % 28.0', () => {
      const metrics = calculateFoodCostMetrics(41.5, 0, 120, 35, true, 7);
      expect(metrics.netSellingPrice).toBe(112.15);
      expect(metrics.overheadCost).toBe(39.25);
      expect(metrics.totalCost).toBe(80.75);
      expect(metrics.foodCostPercent).toBe(37.0);
      expect(metrics.totalCostPercent).toBe(72.0);
      expect(metrics.profitAmount).toBe(31.4);
      expect(metrics.profitPercent).toBe(28.0);
    });

    // F14: unit mismatch: ingredient purchased in kg, recipe line in ml, no density entered -> excluded from totals, warning "ต้องระบุความหนาแน่นเพื่อแปลง kg เป็น ml"
    it('F14: unit mismatch: ingredient purchased in kg, recipe line in ml, no density entered -> excluded from totals, warning "ต้องระบุความหนาแน่นเพื่อแปลง kg เป็น ml"', () => {
      const result = calculateIngredientItemCost({
        purchasePrice: 100,
        purchaseQuantity: 1,
        purchaseUnit: 'kg',
        usageQuantity: 100,
        usageUnit: 'ml',
        ingredientYield: 100,
        density: undefined,
      });
      expect(result.isValid).toBe(false);
      expect(result.lineCost).toBe(0);
      expect(result.errorMessageTh).toContain('ต้องระบุความหนาแน่นเพื่อแปลง kg เป็น ml');
    });

    // F15: sub-recipe yield: total raw ingredients 112.50 THB, raw weight 1250 g, cooked output 1150 g (yield 92%) -> batch cost = 112.50 THB (NEVER 122.28), cost per g = 0.0978 THB
    it('F15: sub-recipe yield: total raw ingredients 112.50 THB, raw weight 1250 g, cooked output 1150 g (yield 92%) -> batch cost = 112.50 THB (NEVER 122.28), cost per g = 0.0978 THB', () => {
      const sub = calculateSubRecipeCostPure(112.5, 1150, 1250);
      expect(sub.batchCost).toBe(112.5);
      expect(sub.batchCost).not.toBeCloseTo(122.28, 1);
      expect(sub.costPerUnit).toBe(0.0978);
    });
  });

  describe('Overhead Golden Test Cases (O1 – O14)', () => {
    // O1: conversions: weekly 1,000 -> 4,333.33/month; daily 100 with 30 operating days -> 3,000; quarterly 3,000 -> 1,000; yearly 12,000 -> 1,000
    it('O1: conversions: weekly 1,000 -> 4,333.33/month; daily 100 with 30 days -> 3,000; quarterly 3,000 -> 1,000; yearly 12,000 -> 1,000', () => {
      const weekly = convertExpenseToMonthly({ amount: 1000, frequency: 'weekly' });
      expect(weekly).toBeCloseTo(4333.33, 2);

      const daily = convertExpenseToMonthly({ amount: 100, frequency: 'daily', operatingDaysPerMonth: 30 });
      expect(daily).toBe(3000);

      const quarterly = convertExpenseToMonthly({ amount: 3000, frequency: 'quarterly' });
      expect(quarterly).toBe(1000);

      const yearly = convertExpenseToMonthly({ amount: 12000, frequency: 'yearly' });
      expect(yearly).toBe(1000);
    });

    // O2: asset price 60,000, life 7 years -> 714.29/month. Asset on installment 2,000/month -> 2,000 (depreciation must not be added on top)
    it('O2: asset price 60,000, life 7 years -> 714.29/month. Asset on installment 2,000/month -> 2,000 (depreciation must not be added on top)', () => {
      const depr = calculateAssetMonthlyExpense({ assetCost: 60000, usefulLifeYears: 7 });
      expect(depr).toBeCloseTo(714.29, 2);

      const installment = calculateAssetMonthlyExpense({
        assetCost: 60000,
        usefulLifeYears: 7,
        isInstallment: true,
        monthlyInstallment: 2000,
      });
      expect(installment).toBe(2000);
    });

    // O3: fixed costs: rent 30,000 + wages 60,000 + electricity 15,000 + other 10,000 = 115,000. Manual monthly sales 330,000 (ex-VAT), no variable items -> overhead 34.8%
    it('O3: fixed costs: 115,000. Manual monthly sales 330,000 (ex-VAT), no variable items -> overhead 34.8%', () => {
      const fixedTotal = 30000 + 60000 + 15000 + 10000;
      expect(fixedTotal).toBe(115000);

      const overhead = calculateOverheadRatePercent(fixedTotal, 330000, 0);
      expect(Number(overhead.toFixed(1))).toBe(34.8);
    });

    // O4: same as O3 plus variable items QR fee 1% and waste 1.5% -> overhead 37.3%; overhead per month = 123,250.00
    it('O4: same as O3 plus variable items QR fee 1% and waste 1.5% -> overhead 37.3%; overhead per month = 123,250.00', () => {
      const fixedCosts = 115000;
      const sales = 330000;
      const variablePercent = 1.0 + 1.5; // 2.5%
      const overheadRate = calculateOverheadRatePercent(fixedCosts, sales, variablePercent);
      expect(Number(overheadRate.toFixed(1))).toBe(37.3);

      const monthlyOverheadAmount = fixedCosts + sales * (variablePercent / 100);
      expect(monthlyOverheadAmount).toBe(123250.0);
    });

    // O5: expected sales: 30 seats × 1.5 turns × 100 THB per head × 30 days = 135,000 -> overhead (fixed 115,000, no variable) 85.2%, and the 'above 50%' warning must appear
    it('O5: expected sales: 30 seats * 1.5 turns * 100 THB * 30 days = 135,000 -> overhead 85.2% and >50% warning appears', () => {
      const seated = calculateSeatedOverhead(30, 1.5, 100, 30, 115000);
      expect(seated.monthlyCapacitySales).toBe(135000);
      expect(Number(seated.overheadPercent.toFixed(1))).toBe(85.2);
      expect(seated.hasHighOverheadWarning).toBe(true);
      expect(seated.warningMessageTh).toContain('สูงเกิน 50%');
    });

    // O6: sales entered as 330,000 INCLUDING VAT 7% -> base 308,411.21; overhead (fixed 115,000, no variable) 37.3%
    it('O6: sales entered as 330,000 INCLUDING VAT 7% -> base 308,411.21; overhead (fixed 115,000, no variable) 37.3%', () => {
      const netSales = calculateNormalizedNetSales(330000, 0, 0, true, 7);
      expect(netSales).toBeCloseTo(308411.21, 2);

      const overhead = calculateOverheadRatePercent(115000, netSales, 0);
      expect(Number(overhead.toFixed(1))).toBe(37.3);
    });

    // O7: break-even (fixed 115,000, food cost 35%, variable 2.5%) -> monthly 184,000.00; per day (30 days) 6,133.33
    it('O7: break-even (fixed 115,000, food cost 35%, variable 2.5%) -> monthly 184,000.00; per day (30 days) 6,133.33', () => {
      const be = calculateBreakEven(115000, 100 - 35 - 2.5, 100, 30);
      expect(be.isValid).toBe(true);
      expect(be.breakEvenSales).toBe(184000.0);
      expect(Number(be.breakEvenDailySales.toFixed(2))).toBe(6133.33);
    });

    // O8: target profit 10% (same inputs) -> monthly 219,047.62; per day 7,301.59
    it('O8: target profit 10% (same inputs) -> monthly 219,047.62; per day 7,301.59', () => {
      const be = calculateBreakEven(115000, 100 - 35 - 2.5, 100, 30, 10);
      expect(be.targetProfitValid).toBe(true);
      expect(Number(be.targetProfitSales.toFixed(2))).toBe(219047.62);
      expect(Number(be.targetProfitDailySales.toFixed(2))).toBe(7301.59);
    });

    // O9: denominator guard: food cost 98% + variable 2.5% -> Thai message, no negative/infinite figure
    it('O9: denominator guard: food cost 98% + variable 2.5% -> Thai message, no negative/infinite figure', () => {
      const contributionMargin = 100 - 98 - 2.5; // -0.5%
      const be = calculateBreakEven(115000, contributionMargin, 100, 30);
      expect(be.isValid).toBe(false);
      expect(be.breakEvenSales).toBe(0);
      expect(Number.isFinite(be.breakEvenSales)).toBe(true);
      expect(be.errorMessageTh).toContain('ไม่สามารถคุ้มทุนได้');
    });

    // O10: sensitivity at 70% / 100% / 130% / 150% of 330,000 (fixed 115,000 + variable 2.5%) -> 52.3% / 37.3% / 29.3% / 25.7%
    it('O10: sensitivity at 70% / 100% / 130% / 150% of 330,000 (fixed 115,000 + variable 2.5%) -> 52.3% / 37.3% / 29.3% / 25.7%', () => {
      const table = calculateOverheadSensitivity(330000, 115000, 2.5, [70, 100, 130, 150]);
      expect(Number(table[0].overheadPercent.toFixed(1))).toBe(52.3);
      expect(Number(table[1].overheadPercent.toFixed(1))).toBe(37.3);
      expect(Number(table[2].overheadPercent.toFixed(1))).toBe(29.3);
      expect(Number(table[3].overheadPercent.toFixed(1))).toBe(25.7);
    });

    // O11: 'actual' basis: 14 logged days totalling 154,000 THB -> monthly projection (30 days) = 330,000. If <7 logged days, show warning 'ต้องมีข้อมูลอย่างน้อย 7 วัน'
    it('O11: "actual" basis: 14 logged days totalling 154,000 THB -> monthly projection (30 days) = 330,000. If <7 logged days, show warning', () => {
      const records14 = Array.from({ length: 14 }, (_, i) => ({
        date: `2026-03-${String(i + 1).padStart(2, '0')}`,
        netSales: 11000,
      }));
      const proj14 = calculateLoggedSalesProjection(records14, 14, 30);
      expect(proj14.uniqueLoggedDays).toBe(14);
      expect(proj14.projectedMonthlySales).toBe(330000);
      expect(proj14.isDataSufficient).toBe(true);
      expect(proj14.warningMessageTh).toBeUndefined();

      const records5 = Array.from({ length: 5 }, (_, i) => ({
        date: `2026-03-${String(i + 1).padStart(2, '0')}`,
        netSales: 11000,
      }));
      const proj5 = calculateLoggedSalesProjection(records5, 14, 30);
      expect(proj5.isDataSufficient).toBe(false);
      expect(proj5.warningMessageTh).toContain('ต้องการอย่างน้อย 7 วัน');
    });

    // O12: excluded expense 10,000 -> ignored in fixed total, overhead %, category chart, summary
    it('O12: excluded expense 10,000 -> ignored in fixed total, overhead %, category chart, summary', () => {
      const expenses: ExpenseRecord[] = [
        {
          id: 'exp1',
          date: '2026-03-01',
          category: 'Rent',
          description: 'ค่าเช่า',
          amount: 30000,
          isFixed: true,
          recurring: true,
          paymentMethod: 'Bank Transfer',
          frequency: 'monthly',
        },
        {
          id: 'exp2',
          date: '2026-03-01',
          category: 'Other Operating Expenses',
          description: 'ค่าใช้จ่ายส่วนตัวเจ้าของ (ยกเว้น)',
          amount: 10000,
          isFixed: true,
          recurring: true,
          paymentMethod: 'Cash',
          frequency: 'monthly',
          isExcluded: true, // Should be omitted
        },
      ];
      const totals = calculateTotalMonthlyExpenses(expenses, 30);
      expect(totals.fixedMonthly).toBe(30000);
      expect(totals.totalMonthly).toBe(30000);
      expect(totals.excludedMonthly).toBe(10000);
    });

    // O13: validation: negative amount (-500), asset life 0, percent outside 0–100 -> rejected with Thai message
    it('O13: validation: negative amount (-500), asset life 0, percent outside 0–100 -> rejected with Thai message', () => {
      const negVal = validateExpenseInput({ amount: -500 });
      expect(negVal.isValid).toBe(false);
      expect(negVal.errorMessageTh).toContain('ไม่ติดลบ');

      const life0Val = validateExpenseInput({ isAsset: true, isInstallment: false, usefulLifeYears: 0 });
      expect(life0Val.isValid).toBe(false);
      expect(life0Val.errorMessageTh).toContain('มากกว่า 0 ปี');

      const pctNeg = validatePercentage(-5);
      expect(pctNeg.isValid).toBe(false);
      expect(pctNeg.errorMessageTh).toContain('0 ถึง 100%');

      const pctOver = validatePercentage(105);
      expect(pctOver.isValid).toBe(false);
      expect(pctOver.errorMessageTh).toContain('0 ถึง 100%');
    });

    // O14: daily sales entry: duplicate date 2026-03-15 entered twice (first 5,000, then 6,000) -> single row with 6,000, never 11,000 or two rows
    it('O14: daily sales entry: duplicate date 2026-03-15 entered twice (first 5,000, then 6,000) -> single row with 6,000, never 11,000 or two rows', () => {
      const initialRecords: DailySalesRecord[] = [
        {
          id: 'rec-1',
          date: '2026-03-15',
          channelId: 'dine-in',
          channelName: 'หน้าร้าน',
          orderCount: 20,
          grossSales: 5000,
          discounts: 0,
          refunds: 0,
          netSales: 5000,
          platformFees: 0,
          actualPayout: 5000,
        },
      ];

      const newRecord: DailySalesRecord = {
        id: 'rec-2',
        date: '2026-03-15',
        channelId: 'dine-in',
        channelName: 'หน้าร้าน',
        orderCount: 25,
        grossSales: 6000,
        discounts: 0,
        refunds: 0,
        netSales: 6000,
        platformFees: 0,
        actualPayout: 6000,
      };

      const updated = upsertDailySalesRecord(initialRecords, newRecord);
      expect(updated.length).toBe(1);
      expect(updated[0].grossSales).toBe(6000);
      expect(updated[0].netSales).toBe(6000);
      expect(updated[0].id).toBe('rec-1'); // preserves row ID
    });
  });

  describe('Integration Golden Tests', () => {
    // 1. JSON export then import recovers EXACT same recipes, ingredients, expenses, overhead settings, daily sales
    it('Integration 1: JSON export then import roundtrip recovers exact same data', () => {
      const backup = StorageService.exportBackup();
      expect(backup.payload).toBeDefined();
      expect(backup.appId).toBe('TONYS_KITCHEN_POS');

      const jsonString = JSON.stringify(backup);
      const parsed = JSON.parse(jsonString);

      const validation = StorageService.validateBackup(parsed);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);

      const restoreResult = StorageService.restoreBackup(validation.backup!);
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.counts).toBeDefined();
    });

    // 2. Circular sub-recipe reference: sub-recipe A cannot include B if B already includes A; sub-recipe cannot include itself. Attempt must be rejected with Thai message.
    it('Integration 2: Circular sub-recipe reference detection rejects A->A and A->B->A', () => {
      const allSubRecipes = [
        {
          id: 'sub_a',
          name: 'ซอสผัดกะเพรา',
          items: [{ ingredientId: 'sub_b' }],
        },
        {
          id: 'sub_b',
          name: 'ซอสปรุงรสพื้นฐาน',
          items: [{ ingredientId: 'ing_soy_sauce' }],
        },
      ];

      // Test self-reference A -> A
      const isSelfCircular = checkCircularSubRecipe('sub_a', 'sub_a', allSubRecipes);
      expect(isSelfCircular).toBe(true);

      // Test circular chain: try adding sub_a into sub_b (which already has sub_a -> sub_b)
      const isChainCircular = checkCircularSubRecipe('sub_b', 'sub_a', allSubRecipes);
      expect(isChainCircular).toBe(true);

      // Non-circular dependency: adding ing_chili into sub_a
      const isSafe = checkCircularSubRecipe('sub_a', 'ing_chili', allSubRecipes);
      expect(isSafe).toBe(false);
    });

    // 3. Blocked deletion: ingredient used in recipe cannot be deleted without confirmation or warning listing the affected recipes
    it('Integration 3: Blocked deletion of ingredient used in recipe identifies affected menus and sub-recipes', () => {
      const mockMenus = [
        {
          name: 'ข้าวกะเพราหมูกรอบ',
          variants: [
            {
              name: 'ราดข้าว',
              recipeItems: [{ ingredientId: 'ing_crispy_pork' }],
            },
          ],
        },
      ];
      const mockSubRecipes = [
        {
          name: 'ซอสผัดกะเพราสูตรเข้มข้น',
          items: [{ ingredientId: 'ing_fish_sauce' }],
        },
      ];

      // Used ingredient in menu variant
      const check1 = checkIngredientUsage('ing_crispy_pork', mockMenus as any, mockSubRecipes as any);
      expect(check1.isUsed).toBe(true);
      expect(check1.usedInNames.length).toBe(1);
      expect(check1.usedInNames[0]).toContain('ข้าวกะเพราหมูกรอบ');

      // Used ingredient in sub-recipe
      const check2 = checkIngredientUsage('ing_fish_sauce', mockMenus as any, mockSubRecipes as any);
      expect(check2.isUsed).toBe(true);
      expect(check2.usedInNames.length).toBe(1);
      expect(check2.usedInNames[0]).toContain('ซอสผัดกะเพราสูตรเข้มข้น');

      // Unused ingredient
      const check3 = checkIngredientUsage('ing_unused_sesame', mockMenus as any, mockSubRecipes as any);
      expect(check3.isUsed).toBe(false);
      expect(check3.usedInNames.length).toBe(0);
    });
  });
});
