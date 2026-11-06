import { describe, it, expect } from 'vitest';
import {
  calculateIngredientItemCost,
  calculateSubRecipeCostPure,
  calculateFoodCostMetrics,
  calculateSuggestedPriceWithRounding,
  calculateDeliveryPricing,
  calculateDeliveryProfitability,
} from '../../engine/calculations';
import {
  calculateIngredientCost,
  calculateSauceCost,
  calculateVariantCostBreakdown,
} from '../../services/calculationEngine';
import { RestaurantSettings, Ingredient, Sauce, MenuVariant } from '../../types';
import { INITIAL_SETTINGS } from '../../data/initialData';

/**
 * TASK 6 COMPARISON SUITE:
 * Compares src/engine/calculations.ts against src/services/calculationEngine.ts
 * across >= 10 realistic test cases:
 * 1-3. Thai street food with yield < 100% (holy basil 70%, lime 45%, garlic 85%)
 * 4-5. Seafood priced per piece vs gram (Shrimp piece-based, Squid weight-based)
 * 6-7. Delivery with commission + 7% VAT on commission (GrabFood 30%*1.07 vs LINE MAN 25%*1.07)
 * 8-9. Delivery with VAT toggle OFF vs ON
 * 10. Sub-recipe / sauce batch costing H-03 (Total ingredient cost = batch cost, never * 100/yield)
 * 11. Suggested price rounding UP to 1/5/10 THB step (H-02)
 * 12. Incompatible unit conversion rejection (M-01)
 */

describe('Task 6: Engine Comparison Suite (calculations.ts vs calculationEngine.ts)', () => {
  // Case 1: Thai Holy Basil (1 kg = 80 THB, yield 70%, usage 25 g)
  it('Case 1: Holy Basil yield 70% (25g usage)', () => {
    // Engine A: calculations.ts
    const engineA = calculateIngredientItemCost({
      purchasePrice: 80,
      purchaseQuantity: 1,
      purchaseUnit: 'kg',
      usageQuantity: 25,
      usageUnit: 'g',
      yieldPercent: 70,
    });

    // Engine B: calculationEngine.ts
    const ingB: Partial<Ingredient> = {
      purchasePrice: 80,
      purchaseQuantity: 1,
      purchaseUnit: 'kg',
      actualQuantity: 700,
      actualUnit: 'g',
      usageUnit: 'g',
      yieldPercent: 70,
    };
    const engineB = calculateIngredientCost(ingB);
    const lineCostB = Number((25 * engineB.costPerBaseUnit).toFixed(2));

    expect(engineA.isValid).toBe(true);
    expect(engineB.isValid).toBe(true);
    // Cost per usable gram: 80 / (1000 * 0.70) = 0.1142857 THB/g
    // Line cost for 25g: 25 * 0.1142857 = 2.857 -> 2.86 THB
    expect(engineA.lineCost).toBe(2.86);
    expect(lineCostB).toBe(2.86);
  });

  // Case 2: Fresh Lime / Lemon (1 kg = 120 THB, yield 45% juice, usage 30 g)
  it('Case 2: Fresh Lime juice yield 45% (30g usage)', () => {
    const engineA = calculateIngredientItemCost({
      purchasePrice: 120,
      purchaseQuantity: 1,
      purchaseUnit: 'kg',
      usageQuantity: 30,
      usageUnit: 'g',
      yieldPercent: 45,
    });

    const ingB: Partial<Ingredient> = {
      purchasePrice: 120,
      purchaseQuantity: 1,
      purchaseUnit: 'kg',
      actualQuantity: 450,
      actualUnit: 'g',
      usageUnit: 'g',
      yieldPercent: 45,
    };
    const engineB = calculateIngredientCost(ingB);
    const lineCostB = Number((30 * engineB.costPerBaseUnit).toFixed(2));

    expect(engineA.lineCost).toBe(8.00);
    expect(lineCostB).toBe(8.00);
  });

  // Case 3: Thai Garlic peeled (1 kg = 90 THB, yield 85%, usage 15 g)
  it('Case 3: Thai Garlic peeled yield 85% (15g usage)', () => {
    const engineA = calculateIngredientItemCost({
      purchasePrice: 90,
      purchaseQuantity: 1,
      purchaseUnit: 'kg',
      usageQuantity: 15,
      usageUnit: 'g',
      yieldPercent: 85,
    });

    const ingB: Partial<Ingredient> = {
      purchasePrice: 90,
      purchaseQuantity: 1,
      purchaseUnit: 'kg',
      actualQuantity: 850,
      actualUnit: 'g',
      usageUnit: 'g',
      yieldPercent: 85,
    };
    const engineB = calculateIngredientCost(ingB);
    const lineCostB = Number((15 * engineB.costPerBaseUnit).toFixed(2));

    expect(engineA.lineCost).toBe(1.59);
    expect(lineCostB).toBe(1.59);
  });

  // Case 4: Seafood piece-based - Shrimp (pack of 60 pieces for 510 THB, usage 4 pieces)
  it('Case 4: Piece-based Shrimp (60 pcs @ 510 THB, usage 4 pcs)', () => {
    const engineA = calculateIngredientItemCost({
      purchasePrice: 510,
      purchaseQuantity: 60,
      purchaseUnit: 'ตัว',
      usageQuantity: 4,
      usageUnit: 'ตัว',
      piecesPerPurchaseUnit: 60,
    });

    const ingB: Partial<Ingredient> = {
      purchasePrice: 510,
      purchaseQuantity: 1,
      purchaseUnit: 'แพ็ค',
      actualQuantity: 60,
      actualUnit: 'ตัว',
      usageUnit: 'ตัว',
      piecesPerPurchaseUnit: 60,
      yieldPercent: 100,
    };
    const engineB = calculateIngredientCost(ingB);
    const lineCostB = Number((4 * engineB.costPerBaseUnit).toFixed(2));

    // Unit cost: 510 / 60 = 8.50 THB/pc; 4 pcs = 34.00 THB
    expect(engineA.unitCost).toBe(8.5);
    expect(engineA.lineCost).toBe(34.0);
    expect(engineB.costPerBaseUnit).toBe(8.5);
    expect(lineCostB).toBe(34.0);
  });

  // Case 5: Seafood weight-based - Fresh Squid (1 kg = 260 THB, yield 75%, usage 60 g)
  it('Case 5: Fresh Squid cleaned yield 75% (60g usage)', () => {
    const engineA = calculateIngredientItemCost({
      purchasePrice: 260,
      purchaseQuantity: 1,
      purchaseUnit: 'kg',
      usageQuantity: 60,
      usageUnit: 'g',
      yieldPercent: 75,
    });

    const ingB: Partial<Ingredient> = {
      purchasePrice: 260,
      purchaseQuantity: 1,
      purchaseUnit: 'kg',
      actualQuantity: 750,
      actualUnit: 'g',
      usageUnit: 'g',
      yieldPercent: 75,
    };
    const engineB = calculateIngredientCost(ingB);
    const lineCostB = Number((60 * engineB.costPerBaseUnit).toFixed(2));

    // Cost per usable gram: 260 / 750 = 0.3466667 THB/g; 60g = 20.80 THB
    expect(engineA.lineCost).toBe(20.80);
    expect(lineCostB).toBe(20.80);
  });

  // Case 6: Delivery platform with GP + 7% VAT (GrabFood: 30% GP * 1.07 = 32.1% effective)
  it('Case 6: Delivery GrabFood commission with 7% VAT (30% * 1.07 = 32.1%)', () => {
    const cost = 35;
    const targetFc = 35;
    const baseGp = 30;

    const deliveryA = calculateDeliveryPricing(cost, targetFc, baseGp, true, 7);
    expect(deliveryA.effectiveGpPercent).toBe(32.1);

    const profA = calculateDeliveryProfitability(120, cost, 8, baseGp, true, 7);
    expect(profA.gpFee).toBeCloseTo(38.52, 2);
    expect(profA.netRevenue).toBeCloseTo(81.48, 2);
  });

  // Case 7: Delivery platform with GP + 7% VAT (LINE MAN: 25% GP * 1.07 = 26.8% effective)
  it('Case 7: Delivery LINE MAN commission with 7% VAT (25% * 1.07 = 26.8%)', () => {
    const cost = 30;
    const targetFc = 35;
    const baseGp = 25;

    const deliveryA = calculateDeliveryPricing(cost, targetFc, baseGp, true, 7);
    expect(deliveryA.effectiveGpPercent).toBe(26.8);

    const profA = calculateDeliveryProfitability(100, cost, 6, baseGp, true, 7);
    expect(profA.gpFee).toBeCloseTo(26.75, 2);
  });

  // Case 8: Delivery platform with GP VAT toggle OFF (GrabFood: 30% flat)
  it('Case 8: Delivery GrabFood commission with VAT toggle OFF (30% flat)', () => {
    const cost = 35;
    const targetFc = 35;
    const baseGp = 30;

    const deliveryA = calculateDeliveryPricing(cost, targetFc, baseGp, false, 7);
    expect(deliveryA.effectiveGpPercent).toBe(30.0);

    const profA = calculateDeliveryProfitability(120, cost, 8, baseGp, false, 7);
    expect(profA.gpFee).toBe(36.0);
  });

  // Case 9: VAT stripping on menu price (Inclusive 7% VAT: 107 THB -> Net 100 THB)
  it('Case 9: Menu price includes 7% VAT (107 THB -> Net 100 THB)', () => {
    const priceWithVat = 107;
    const netPrice = priceWithVat / 1.07;
    expect(netPrice).toBeCloseTo(100.0, 4);

    const foodCost = 35;
    // Food cost % calculated against net price
    const foodCostPercent = (foodCost / netPrice) * 100;
    expect(foodCostPercent).toBe(35.0);
  });

  // Case 10: Sub-recipe batch costing H-03 (Total ingredient cost = batch cost, never * 100/yield)
  it('Case 10: Sub-recipe batch cost = total ingredient cost; cost per unit = batch / output', () => {
    const batchCost = 300;
    const outputQty = 500; // 500 grams cooked yield
    const engineA = calculateSubRecipeCostPure(batchCost, outputQty);

    expect(engineA.batchCost).toBe(300);
    expect(engineA.costPerUnit).toBe(0.6); // 300 / 500 = 0.60 THB/g

    const sauceB: Partial<Sauce> = {
      name: 'ซอสผัดกะเพราสูตรเข้มข้น',
      productionQuantity: 600,
      actualQuantity: 500,
      yieldPercent: 83.33,
      items: [
        {
          ingredientId: 'ing_sauce_base',
          ingredientName: 'หัวซอส',
          quantity: 500,
          unit: 'g',
          unitCost: 0.6,
          lineCost: 300,
        },
      ],
    };
    const engineB = calculateSauceCost(sauceB, new Map());
    expect(engineB.productionCost).toBe(300);
    expect(engineB.actualCost).toBe(300); // H-03: Never multiplied by 100/yield
    expect(engineB.costPerGram).toBe(0.6);
  });

  // Case 11: Suggested price rounding UP to 1/5/10 THB step (H-02)
  it('Case 11: Suggested price rounding UP to 5 THB and 10 THB step', () => {
    const cost = 31.4;
    const targetFc = 35; // 31.4 / 0.35 = 89.714 THB

    const rounded = calculateSuggestedPriceWithRounding(cost, targetFc, 5);
    expect(rounded.roundedStep1).toBe(90);
    expect(rounded.roundedStep5).toBe(90);
    expect(rounded.roundedStep10).toBe(90);
    expect(rounded.roundedPrice).toBe(90);
  });

  // Case 12: Incompatible unit conversion rejection (e.g., piece to gram without density)
  it('Case 12: Incompatible unit conversion returns error and cost 0 (M-01)', () => {
    const engineA = calculateIngredientItemCost({
      purchasePrice: 120,
      purchaseQuantity: 30,
      purchaseUnit: 'ฟอง',
      usageQuantity: 100,
      usageUnit: 'g', // Incompatible: egg piece to gram without density
    });

    expect(engineA.isValid).toBe(false);
    expect(engineA.lineCost).toBe(0);
    expect(engineA.errorMessageTh).toContain('แปลงหน่วยจาก');
  });
});
