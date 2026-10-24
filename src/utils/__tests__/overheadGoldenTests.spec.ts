import { describe, it, expect } from 'vitest';
import {
  convertExpenseToMonthly,
  calculateAssetMonthlyExpense,
  calculateTotalMonthlyExpenses,
  calculateNormalizedNetSales,
  calculateOverheadRatePercent,
  calculateOverheadCostPerDish,
  calculateBreakEven,
} from '../../engine/calculations';
import { ExpenseRecord } from '../../types/domain';

describe('Overhead Calculator Golden Tests (O1 – O15)', () => {
  // O1: Frequency conversion - Weekly to Monthly
  it('O1: Weekly frequency converts to monthly with weekly * 52 / 12', () => {
    // 3,000 THB/week -> 3,000 * 52 / 12 = 13,000 THB
    const monthly = convertExpenseToMonthly({
      amount: 3000,
      frequency: 'weekly',
    });
    expect(monthly).toBeCloseTo(13000, 2);
  });

  // O2: Frequency conversion - Daily to Monthly with operating days
  it('O2: Daily frequency converts with daily * operatingDays', () => {
    // 500 THB/day, 26 operating days -> 500 * 26 = 13,000 THB
    const monthly26 = convertExpenseToMonthly({
      amount: 500,
      frequency: 'daily',
      operatingDaysPerMonth: 26,
    });
    expect(monthly26).toBe(13000);

    // 500 THB/day, 30 operating days -> 500 * 30 = 15,000 THB
    const monthly30 = convertExpenseToMonthly({
      amount: 500,
      frequency: 'daily',
      operatingDaysPerMonth: 30,
    });
    expect(monthly30).toBe(15000);
  });

  // O3: Frequency conversion - Quarterly to Monthly
  it('O3: Quarterly frequency converts with quarterly / 3', () => {
    // 18,000 THB/quarter -> 18,000 / 3 = 6,000 THB
    const monthly = convertExpenseToMonthly({
      amount: 18000,
      frequency: 'quarterly',
    });
    expect(monthly).toBe(6000);
  });

  // O4: Frequency conversion - Yearly to Monthly
  it('O4: Yearly frequency converts with yearly / 12', () => {
    // 120,000 THB/year -> 120,000 / 12 = 10,000 THB
    const monthly = convertExpenseToMonthly({
      amount: 120000,
      frequency: 'yearly',
    });
    expect(monthly).toBe(10000);
  });

  // O5: Straight-line depreciation per month (No installment)
  it('O5: Straight-line depreciation = price / life in years / 12', () => {
    // 120,000 THB, 5 years -> 120,000 / (5 * 12) = 2,000 THB/month
    const monthlyDepr = calculateAssetMonthlyExpense({
      assetCost: 120000,
      usefulLifeYears: 5,
    });
    expect(monthlyDepr).toBe(2000);
  });

  // O6: Asset on installment vs depreciation exclusivity
  it('O6: Asset on installment uses monthly installment INSTEAD of depreciation', () => {
    // Asset cost 120,000, 5 years, installment 3,500 THB/month
    const expense = calculateAssetMonthlyExpense({
      assetCost: 120000,
      usefulLifeYears: 5,
      isInstallment: true,
      monthlyInstallment: 3500,
    });
    // Must be 3,500, NOT 3,500 + 2,000
    expect(expense).toBe(3500);

    const converted = convertExpenseToMonthly({
      amount: 0,
      assetCost: 120000,
      usefulLifeYears: 5,
      isInstallment: true,
      monthlyInstallment: 3500,
    });
    expect(converted).toBe(3500);
  });

  // O7: Excluded expense flag
  it('O7: Excluded expenses return 0 and are omitted from totals', () => {
    const expenses: ExpenseRecord[] = [
      {
        id: '1',
        date: '2026-03-01',
        category: 'Rent',
        description: 'ค่าเช่า',
        amount: 20000,
        isFixed: true,
        recurring: true,
        paymentMethod: 'Bank Transfer',
        frequency: 'monthly',
      },
      {
        id: '2',
        date: '2026-03-01',
        category: 'Electricity',
        description: 'ค่าไฟ',
        amount: 5000,
        isFixed: false,
        recurring: false,
        paymentMethod: 'Bank Transfer',
        frequency: 'monthly',
      },
      {
        id: '3',
        date: '2026-03-01',
        category: 'Other Operating Expenses',
        description: 'ค่าใช้จ่ายส่วนตัว (ยกเว้น)',
        amount: 10000,
        isFixed: true,
        recurring: true,
        paymentMethod: 'Cash',
        frequency: 'monthly',
        isExcluded: true, // Should be ignored!
      },
    ];

    const result = calculateTotalMonthlyExpenses(expenses);
    expect(result.fixedMonthly).toBe(20000);
    expect(result.variableMonthly).toBe(5000);
    expect(result.totalMonthly).toBe(25000);
    expect(result.excludedMonthly).toBe(10000);
  });

  // O8: VAT-inclusive sales normalization to ex-VAT
  it('O8: VAT-inclusive sales are normalized by dividing by (1 + vatRate / 100)', () => {
    // 107,000 THB inclusive of 7% VAT -> 107,000 / 1.07 = 100,000 THB
    const exVatSales = calculateNormalizedNetSales(107000, 0, 0, true, 7);
    expect(exVatSales).toBeCloseTo(100000, 2);
  });

  // O9: Net sales with discounts and refunds (ex-VAT)
  it('O9: Net sales discounts & refunds applied before VAT normalization', () => {
    // Gross: 120,000, Discounts: 10,000, Refunds: 3,000 -> 107,000 / 1.07 = 100,000
    const netSales = calculateNormalizedNetSales(120000, 10000, 3000, true, 7);
    expect(netSales).toBeCloseTo(100000, 2);

    // If already ex-VAT: 120,000 - 10,000 - 3,000 = 107,000
    const rawNet = calculateNormalizedNetSales(120000, 10000, 3000, false);
    expect(rawNet).toBe(107000);
  });

  // O10: Overhead % of selling price
  it('O10: Overhead % = (total monthly fixed / net sales ex-VAT * 100) + variable %', () => {
    // Fixed: 30,000 THB, Net Sales ex-VAT: 200,000 THB, Variable %: 5%
    // (30,000 / 200,000 * 100) + 5 = 15% + 5% = 20%
    const overheadRate = calculateOverheadRatePercent(30000, 200000, 5);
    expect(overheadRate).toBe(20);
  });

  // O11: Break-even monthly sales
  it('O11: Break-even monthly sales = fixed costs / (1 - food cost % - variable %)', () => {
    // Fixed: 60,000 THB, Contribution Margin: 50%
    // 60,000 / 0.50 = 120,000 THB
    const result = calculateBreakEven(60000, 50, 100, 30);
    expect(result.isValid).toBe(true);
    expect(result.breakEvenSales).toBe(120000);
  });

  // O12: Target-profit monthly sales
  it('O12: Target-profit sales = fixed costs / (1 - food cost % - variable % - target profit %)', () => {
    // Fixed: 60,000 THB, Contribution Margin: 50%, Target Profit: 10%
    // Denominator = 0.50 - 0.10 = 0.40
    // Target sales = 60,000 / 0.40 = 150,000 THB
    const result = calculateBreakEven(60000, 50, 100, 30, 10);
    expect(result.targetProfitValid).toBe(true);
    expect(result.targetProfitSales).toBe(150000);
  });

  // O13: Break-even / Target profit with denominator <= 0 shows Thai message and no Infinity/negative
  it('O13: Denominator <= 0 returns isValid: false with Thai message, no negative or Infinity', () => {
    // Contribution margin <= 0
    const beInvalid = calculateBreakEven(60000, -5, 100, 30);
    expect(beInvalid.isValid).toBe(false);
    expect(beInvalid.breakEvenSales).toBe(0);
    expect(Number.isFinite(beInvalid.breakEvenSales)).toBe(true);
    expect(beInvalid.errorMessageTh).toContain('ไม่สามารถคุ้มทุนได้');

    // Target profit denominator <= 0 (CM 50% - Target 55% = -5%)
    const tpInvalid = calculateBreakEven(60000, 50, 100, 30, 55);
    expect(tpInvalid.targetProfitValid).toBe(false);
    expect(tpInvalid.targetProfitSales).toBe(0);
    expect(Number.isFinite(tpInvalid.targetProfitSales)).toBe(true);
    expect(tpInvalid.targetProfitErrorMessageTh).toContain('ไม่สามารถทำกำไรตามเป้าหมายได้');
  });

  // O14: Overhead cost per dish calculation based on Selling Price ex-VAT
  it('O14: Overhead cost per dish = net selling price (ex-VAT) * overhead %', () => {
    // Selling price: 80 THB ex-VAT, Overhead rate: 15%
    // 80 * 0.15 = 12.00 THB
    const overheadPerDish = calculateOverheadCostPerDish(80, 15);
    expect(overheadPerDish).toBe(12);
  });

  // O15: Break-even daily orders & sales volume
  it('O15: Break-even daily orders and sales correctly derived from operating days & ticket size', () => {
    // Break-even sales: 120,000 THB, operating days: 25, average ticket: 100 THB
    // Daily sales = 120,000 / 25 = 4,800 THB
    // Total orders = ceil(120,000 / 100) = 1,200 orders
    // Daily orders = ceil(1,200 / 25) = 48 orders/day
    const result = calculateBreakEven(60000, 50, 100, 25);
    expect(result.breakEvenSales).toBe(120000);
    expect(result.breakEvenDailySales).toBe(4800);
    expect(result.breakEvenOrders).toBe(1200);
    expect(result.breakEvenDailyOrders).toBe(48);
  });
});
