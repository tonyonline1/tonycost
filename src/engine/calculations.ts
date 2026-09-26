/**
 * Pure Restaurant Cost & Profit Calculation Engine
 * Separated into pure, reusable, side-effect free mathematical functions.
 */

import { convertUnit } from './units';
import {
  UnitType,
  RecipeItem,
  SubRecipeItem,
  MenuItem,
  PortionVariant,
  SalesChannel,
} from '../types/domain';

/**
 * 1. Calculate Usable Quantity from Purchase Quantity & Yield %
 * Formula: Usable Quantity = Purchase Quantity * (Yield % / 100)
 */
export function calculateUsableQuantity(purchaseQuantity: number, yieldPercent: number): number {
  if (purchaseQuantity <= 0 || yieldPercent <= 0) return 0;
  return purchaseQuantity * (yieldPercent / 100);
}

/**
 * 2. Calculate Effective Cost per Usable Unit
 * Formula: Effective Cost = Purchase Price / Usable Quantity
 */
export function calculateEffectiveCost(purchasePrice: number, usableQuantity: number): number {
  if (usableQuantity <= 0 || purchasePrice <= 0) return 0;
  return purchasePrice / usableQuantity;
}

/**
 * 3. Calculate Yield Percentage from Raw and Usable Quantity
 * Formula: Yield % = (Usable Quantity / Raw Quantity) * 100
 */
export function calculateYieldPercent(rawQuantity: number, usableQuantity: number): number {
  if (rawQuantity <= 0) return 0;
  return (usableQuantity / rawQuantity) * 100;
}

/**
 * 4. Calculate Cost for an Ingredient usage in recipe
 */
export function calculateItemCost(
  quantityUsed: number,
  recipeUnit: UnitType,
  purchaseUnit: UnitType,
  costPerUsablePurchaseUnit: number,
  density: number = 1.0
): { cost: number; error?: string } {
  if (quantityUsed <= 0 || costPerUsablePurchaseUnit <= 0) {
    return { cost: 0 };
  }

  // Convert recipeUnit to purchaseUnit
  const conv = convertUnit(quantityUsed, recipeUnit, purchaseUnit, density);
  if (!conv.success) {
    return {
      cost: 0,
      error: conv.errorMessageTh || 'หน่วยไม่ตรงกัน',
    };
  }

  const cost = conv.convertedQuantity * costPerUsablePurchaseUnit;
  return { cost };
}

/**
 * 5. Calculate Sub-recipe / Sauce Batch Cost & Cost Per Final Unit
 */
export function calculateSubRecipeBatch(
  items: SubRecipeItem[],
  batchQuantity: number,
  preparationYieldPercent: number
): {
  batchCost: number;
  finalBatchQuantity: number;
  costPerFinalUnit: number;
} {
  const batchCost = items.reduce((sum, item) => sum + (item.extendedCost || 0), 0);
  const finalBatchQuantity = batchQuantity * (preparationYieldPercent / 100);
  const costPerFinalUnit = finalBatchQuantity > 0 ? batchCost / finalBatchQuantity : 0;

  return {
    batchCost,
    finalBatchQuantity,
    costPerFinalUnit,
  };
}

/**
 * 6. Calculate Recipe Direct Cost (SUM of all line items)
 */
export function calculateRecipeDirectCost(items: RecipeItem[]): number {
  return items.reduce((sum, item) => sum + (item.extendedCost || 0), 0);
}

/**
 * 7. Calculate Portion Direct Cost with multiplier or custom overrides
 */
export function calculatePortionCost(
  baseRecipeCost: number,
  portionMultiplier: number = 1.0,
  packagingCost: number = 0,
  customItems?: RecipeItem[]
): {
  directFoodCost: number;
  packagingCost: number;
  totalDirectCost: number;
} {
  const directFoodCost = customItems && customItems.length > 0
    ? calculateRecipeDirectCost(customItems)
    : baseRecipeCost * portionMultiplier;

  const totalDirectCost = directFoodCost + packagingCost;

  return {
    directFoodCost,
    packagingCost,
    totalDirectCost,
  };
}

/**
 * 8. Calculate Food Cost Percentage
 * Formula: (Food Cost / Selling Price) * 100
 */
export function calculateFoodCostPercent(foodCost: number, sellingPrice: number): number {
  if (sellingPrice <= 0) return 0;
  return (foodCost / sellingPrice) * 100;
}

/**
 * 9. Calculate Suggested Selling Price
 * Method A (Food Cost %): Food Cost / (Target Food Cost % / 100)
 * Method B (Gross Margin %): Total Direct Cost / (1 - (Target Gross Margin % / 100))
 */
export function calculateSuggestedPrice(
  directCost: number,
  targetPercent: number,
  method: 'food_cost_target' | 'gross_margin_target' = 'food_cost_target'
): {
  minimumPrice: number;
  recommendedPrice: number;
  targetPrice: number;
  premiumPrice: number;
} {
  if (directCost <= 0 || targetPercent <= 0) {
    return { minimumPrice: 0, recommendedPrice: 0, targetPrice: 0, premiumPrice: 0 };
  }

  let baseTargetPrice = 0;
  if (method === 'food_cost_target') {
    // e.g. target 30% -> Direct Cost / 0.30
    baseTargetPrice = directCost / (targetPercent / 100);
  } else {
    // e.g. target 70% margin -> Direct Cost / (1 - 0.70)
    const marginRatio = 1 - targetPercent / 100;
    baseTargetPrice = marginRatio > 0 ? directCost / marginRatio : directCost * 3;
  }

  // Common pricing tiers
  const minimumPrice = Math.ceil(directCost / 0.40); // 40% maximum allowable food cost
  const recommendedPrice = Math.ceil(baseTargetPrice);
  const targetPrice = Math.ceil(baseTargetPrice * 1.05);
  const premiumPrice = Math.ceil(baseTargetPrice * 1.25);

  return {
    minimumPrice,
    recommendedPrice,
    targetPrice,
    premiumPrice,
  };
}

/**
 * 10. Calculate Sales Channel Platform Fees & Net Revenue
 * Includes Commission %, Payment fee %, Fixed fee, and 7% VAT on commission
 */
export function calculatePlatformFee(
  sellingPrice: number,
  channel: SalesChannel,
  discount: number = 0
): {
  commissionFee: number;
  commissionTax: number;
  paymentFee: number;
  fixedFee: number;
  totalPlatformFee: number;
  effectivePrice: number;
} {
  const effectivePrice = Math.max(0, sellingPrice - discount);
  const commissionFee = effectivePrice * (channel.commissionPercent / 100);
  const commissionTax = commissionFee * (channel.taxOnCommissionPercent / 100);
  const paymentFee = effectivePrice * (channel.paymentFeePercent / 100);
  const fixedFee = channel.fixedFeePerOrder || 0;

  const totalPlatformFee = commissionFee + commissionTax + paymentFee + fixedFee;

  return {
    commissionFee,
    commissionTax,
    paymentFee,
    fixedFee,
    totalPlatformFee,
    effectivePrice,
  };
}

/**
 * 11. Calculate Net Revenue after discounts and platform fees
 */
export function calculateNetRevenue(
  sellingPrice: number,
  totalPlatformFee: number,
  discount: number = 0,
  packagingSurcharge: number = 0
): number {
  const gross = Math.max(0, sellingPrice - discount) + packagingSurcharge;
  return Math.max(0, gross - totalPlatformFee);
}

/**
 * 12. Calculate Contribution Profit & Contribution Margin %
 * Contribution Profit = Net Revenue - Total Variable/Direct Cost
 * Contribution Margin % = (Contribution Profit / Net Revenue) * 100
 */
export function calculateContributionMetrics(
  netRevenue: number,
  totalDirectCost: number
): {
  contributionProfit: number;
  contributionMarginPercent: number;
} {
  const contributionProfit = netRevenue - totalDirectCost;
  const contributionMarginPercent = netRevenue > 0 ? (contributionProfit / netRevenue) * 100 : 0;

  return {
    contributionProfit,
    contributionMarginPercent,
  };
}

/**
 * 13. Calculate Inventory COGS (Mode B: Accounting)
 * Formula: COGS = Beginning Inventory + Purchases - Waste - Ending Inventory
 */
export function calculateInventoryCOGS(
  beginningInventory: number,
  purchases: number,
  endingInventory: number,
  waste: number = 0
): number {
  return Math.max(0, beginningInventory + purchases - waste - endingInventory);
}

/**
 * 14. Calculate Prime Cost & Prime Cost %
 * Formula: Prime Cost = COGS + Direct Labor
 * Prime Cost % = (Prime Cost / Net Sales) * 100
 */
export function calculatePrimeCostMetrics(
  cogs: number,
  directLaborCost: number,
  netSales: number
): {
  primeCost: number;
  primeCostPercent: number;
} {
  const primeCost = cogs + directLaborCost;
  const primeCostPercent = netSales > 0 ? (primeCost / netSales) * 100 : 0;

  return {
    primeCost,
    primeCostPercent,
  };
}

/**
 * 15. Calculate Profit & Loss Metrics
 */
export function calculateProfitAndLoss(
  grossSales: number,
  discounts: number,
  refunds: number,
  foodCogs: number,
  packagingCogs: number,
  operatingExpenses: number,
  directLabor: number,
  taxRatePercent: number = 7
): {
  netSales: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  primeCost: number;
  primeCostPercent: number;
  operatingProfit: number;
  operatingMarginPercent: number;
  taxAmount: number;
  netProfit: number;
  netMarginPercent: number;
} {
  const netSales = Math.max(0, grossSales - discounts - refunds);
  const totalCogs = foodCogs + packagingCogs;
  const grossProfit = netSales - totalCogs;
  const grossMarginPercent = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  const primeCost = totalCogs + directLabor;
  const primeCostPercent = netSales > 0 ? (primeCost / netSales) * 100 : 0;

  const operatingProfit = grossProfit - operatingExpenses;
  const operatingMarginPercent = netSales > 0 ? (operatingProfit / netSales) * 100 : 0;

  // Tax on positive operating profit
  const taxAmount = operatingProfit > 0 ? operatingProfit * (taxRatePercent / 100) : 0;
  const netProfit = operatingProfit - taxAmount;
  const netMarginPercent = netSales > 0 ? (netProfit / netSales) * 100 : 0;

  return {
    netSales,
    totalCogs,
    grossProfit,
    grossMarginPercent,
    primeCost,
    primeCostPercent,
    operatingProfit,
    operatingMarginPercent,
    taxAmount,
    netProfit,
    netMarginPercent,
  };
}

/**
 * 16. Calculate Break-Even Analysis
 * Formula: Break-Even Sales = Fixed Costs / (Weighted Contribution Margin % / 100)
 */
export function calculateBreakEven(
  fixedCosts: number,
  contributionMarginPercent: number,
  averageSellingPrice: number = 100,
  operatingDaysPerMonth: number = 30
): {
  breakEvenSales: number;
  breakEvenDailySales: number;
  breakEvenOrders: number;
  breakEvenDailyOrders: number;
  safetyMarginPercent: number;
} {
  if (contributionMarginPercent <= 0 || fixedCosts <= 0) {
    return {
      breakEvenSales: 0,
      breakEvenDailySales: 0,
      breakEvenOrders: 0,
      breakEvenDailyOrders: 0,
      safetyMarginPercent: 0,
    };
  }

  const cmRatio = contributionMarginPercent / 100;
  const breakEvenSales = fixedCosts / cmRatio;
  const breakEvenDailySales = breakEvenSales / operatingDaysPerMonth;

  const breakEvenOrders = averageSellingPrice > 0 ? Math.ceil(breakEvenSales / averageSellingPrice) : 0;
  const breakEvenDailyOrders = operatingDaysPerMonth > 0 ? Math.ceil(breakEvenOrders / operatingDaysPerMonth) : 0;

  return {
    breakEvenSales,
    breakEvenDailySales,
    breakEvenOrders,
    breakEvenDailyOrders,
    safetyMarginPercent: 0,
  };
}

/**
 * 17. Menu Engineering Matrix (Kasavana & Smith Matrix)
 * Classifies items into STAR, PLOWHORSE, PUZZLE, DOG based on:
 * - Sales Volume (High/Low compared to average)
 * - Contribution Margin (High/Low compared to average)
 */
export type MenuEngineeringCategory = 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG';

export interface MenuEngineeringItem {
  id: string;
  name: string;
  salesVolume: number;
  sellingPrice: number;
  totalDirectCost: number;
  contributionMargin: number; // Selling Price - Direct Cost
  category: MenuEngineeringCategory;
  recommendationTh: string;
  recommendationEn: string;
  actionTh: string;
}

export function calculateMenuEngineering(
  items: {
    id: string;
    name: string;
    salesVolume: number;
    sellingPrice: number;
    totalDirectCost: number;
  }[]
): {
  classifiedItems: MenuEngineeringItem[];
  averageVolume: number;
  averageMargin: number;
  totalVolume: number;
  totalProfit: number;
} {
  if (!items || items.length === 0) {
    return {
      classifiedItems: [],
      averageVolume: 0,
      averageMargin: 0,
      totalVolume: 0,
      totalProfit: 0,
    };
  }

  const totalVolume = items.reduce((sum, item) => sum + (item.salesVolume || 0), 0);
  const averageVolume = totalVolume / items.length;

  const margins = items.map((item) => item.sellingPrice - item.totalDirectCost);
  const totalMarginSum = margins.reduce((sum, m) => sum + m, 0);
  const averageMargin = totalMarginSum / items.length;

  const totalProfit = items.reduce(
    (sum, item) => sum + (item.sellingPrice - item.totalDirectCost) * (item.salesVolume || 0),
    0
  );

  const classifiedItems: MenuEngineeringItem[] = items.map((item) => {
    const margin = item.sellingPrice - item.totalDirectCost;
    const isHighVolume = item.salesVolume >= averageVolume;
    const isHighMargin = margin >= averageMargin;

    let category: MenuEngineeringCategory = 'DOG';
    let recommendationTh = '';
    let recommendationEn = '';
    let actionTh = '';

    if (isHighVolume && isHighMargin) {
      category = 'STAR';
      recommendationTh = 'เมนูทำเงินยอดนิยม รักษามาตรฐานและคุณภาพ ไม่ควรเปลี่ยนสูตรเด็ดขาด วางในจุดเด่นของเมนู';
      recommendationEn = 'High popularity & high profit. Maintain quality and promote visibility.';
      actionTh = 'รักษาคุณภาพ & โปรโมทต่อเนื่อง';
    } else if (isHighVolume && !isHighMargin) {
      category = 'PLOWHORSE';
      recommendationTh = 'ขายดีมากแต่กำไรบาง ควรปรับขึ้นราคาเล็กน้อย หรือปรับสัดส่วนวัตถุดิบต้นทุนสูงลง 5-10%';
      recommendationEn = 'High popularity but low margin. Reprice slightly or optimize portion/recipe cost.';
      actionTh = 'ปรับลดต้นทุน หรือ ปรับขึ้นราคา';
    } else if (!isHighVolume && isHighMargin) {
      category = 'PUZZLE';
      recommendationTh = 'กำไรต่อจานสูงแต่ยอดขายต่ำ ควรทำโปรโมชั่น แนะนำโดยพนักงาน หรือปรับภาพถ่ายให้ดึงดูด';
      recommendationEn = 'High profit but low sales. Promote actively, improve photos, or train staff to upsell.';
      actionTh = 'จัดโปรโมชั่น & แนะนำลูกค้า';
    } else {
      category = 'DOG';
      recommendationTh = 'ขายได้น้อยและกำไรต่ำ พิจารณาตัดออกจากเมนูเพื่อลดสต็อกของสด หรือปรับสูตรและราคาใหม่';
      recommendationEn = 'Low popularity & low margin. Consider removing from menu or reinventing.';
      actionTh = 'พิจารณาตัดทิ้ง หรือ รีแบรนด์สูตร';
    }

    return {
      id: item.id,
      name: item.name,
      salesVolume: item.salesVolume,
      sellingPrice: item.sellingPrice,
      totalDirectCost: item.totalDirectCost,
      contributionMargin: margin,
      category,
      recommendationTh,
      recommendationEn,
      actionTh,
    };
  });

  return {
    classifiedItems,
    averageVolume,
    averageMargin,
    totalVolume,
    totalProfit,
  };
}

/**
 * 19. Calculate Variance between Actual and Theoretical COGS
 */
export function calculateVariance(
  actualCOGS: number,
  theoreticalCOGS: number
): {
  varianceAmount: number;
  variancePercent: number;
  varianceStatus: 'OVER_BUDGET' | 'ON_TRACK' | 'SAVINGS';
} {
  const varianceAmount = actualCOGS - theoreticalCOGS;
  const variancePercent = theoreticalCOGS > 0 ? (varianceAmount / theoreticalCOGS) * 100 : 0;
  const varianceStatus = varianceAmount > 500 ? 'OVER_BUDGET' : varianceAmount < -500 ? 'SAVINGS' : 'ON_TRACK';

  return {
    varianceAmount,
    variancePercent,
    varianceStatus,
  };
}

/**
 * 20. Calculate Target Price from Direct Cost
 */
export function calculateTargetPriceFromCost(
  directCost: number,
  targetFoodCostPercent: number = 30
): number {
  if (directCost <= 0 || targetFoodCostPercent <= 0) return 0;
  return Math.ceil(directCost / (targetFoodCostPercent / 100));
}

/**
 * 21. Calculate Delivery Gross Price to achieve same net revenue after GP and VAT
 */
export function calculateDeliveryGrossPrice(
  dineInPrice: number,
  gpPercent: number = 30,
  vatOnGpPercent: number = 7
): number {
  if (dineInPrice <= 0) return 0;
  const effectiveDeductionRatio = (gpPercent / 100) * (1 + vatOnGpPercent / 100);
  const payoutRatio = 1 - effectiveDeductionRatio;
  return payoutRatio > 0 ? Math.ceil(dineInPrice / payoutRatio) : Math.ceil(dineInPrice * 1.45);
}

/**
 * 22. Calculate Sub-recipe Batch Cost Alias
 */
export const calculateSubRecipeBatchCost = calculateSubRecipeBatch;

/**
 * 23. Calculate Channel Net Revenue
 */
export function calculateChannelNetRevenue(
  orderAmount: number,
  commissionPercent: number = 30,
  taxOnCommissionPercent: number = 7,
  paymentFeePercent: number = 0,
  fixedFeePerOrder: number = 0
): {
  orderAmount: number;
  commissionAmount: number;
  paymentFeeAmount: number;
  fixedFee: number;
  netPayout: number;
  effectiveDeductionPercent: number;
} {
  const commission = orderAmount * (commissionPercent / 100);
  const commissionTax = commission * (taxOnCommissionPercent / 100);
  const totalCommissionWithTax = commission + commissionTax;
  const paymentFee = orderAmount * (paymentFeePercent / 100);
  const fixedFee = fixedFeePerOrder;

  const totalDeductions = totalCommissionWithTax + paymentFee + fixedFee;
  const netPayout = Math.max(0, orderAmount - totalDeductions);
  const effectiveDeductionPercent = orderAmount > 0 ? (totalDeductions / orderAmount) * 100 : 0;

  return {
    orderAmount,
    commissionAmount: totalCommissionWithTax,
    paymentFeeAmount: paymentFee,
    fixedFee,
    netPayout,
    effectiveDeductionPercent,
  };
}

/**
 * 24. Calculate Scenario Impact
 */
export function calculateScenarioImpact(
  currentPrice: number,
  increasePercent: number,
  monthlyUsageQty: number,
  baseMonthlyNetProfit: number = 60000
): {
  newCostPerUnit: number;
  costIncreasePerUnit: number;
  totalMonthlyCostIncrease: number;
  newMonthlyNetProfit: number;
  profitErosionPercent: number;
} {
  const costIncreasePerUnit = currentPrice * (increasePercent / 100);
  const newCostPerUnit = currentPrice + costIncreasePerUnit;
  const totalMonthlyCostIncrease = costIncreasePerUnit * monthlyUsageQty;
  const newMonthlyNetProfit = Math.max(0, baseMonthlyNetProfit - totalMonthlyCostIncrease);
  const profitErosionPercent = baseMonthlyNetProfit > 0 ? (totalMonthlyCostIncrease / baseMonthlyNetProfit) * 100 : 0;

  return {
    newCostPerUnit,
    costIncreasePerUnit,
    totalMonthlyCostIncrease,
    newMonthlyNetProfit,
    profitErosionPercent,
  };
}

export function calculateIngredientPriceImpact(
  ingredientId: string,
  currentPrice: number,
  newPrice: number,
  affectedMenuItems: {
    menuId: string;
    menuName: string;
    currentSellingPrice: number;
    currentFoodCost: number;
    ingredientQuantityUsedInRecipe: number; // in purchase unit
    monthlyVolume: number;
  }[]
): {
  priceChangePercent: number;
  costDeltaPerPurchaseUnit: number;
  totalMonthlyImpactThb: number;
  menuImpacts: {
    menuId: string;
    menuName: string;
    currentSellingPrice: number;
    oldFoodCost: number;
    newFoodCost: number;
    foodCostDiff: number;
    oldFoodCostPercent: number;
    newFoodCostPercent: number;
    suggestedNewPriceToMaintainMargin: number;
    monthlyProfitChange: number;
  }[];
} {
  const priceChangePercent = currentPrice > 0 ? ((newPrice - currentPrice) / currentPrice) * 100 : 0;
  const costDeltaPerPurchaseUnit = newPrice - currentPrice;

  let totalMonthlyImpactThb = 0;

  const menuImpacts = affectedMenuItems.map((menu) => {
    const costAddition = costDeltaPerPurchaseUnit * menu.ingredientQuantityUsedInRecipe;
    const oldFoodCost = menu.currentFoodCost;
    const newFoodCost = oldFoodCost + costAddition;

    const oldFoodCostPercent = menu.currentSellingPrice > 0 ? (oldFoodCost / menu.currentSellingPrice) * 100 : 0;
    const newFoodCostPercent = menu.currentSellingPrice > 0 ? (newFoodCost / menu.currentSellingPrice) * 100 : 0;

    // To maintain old food cost %
    const targetRatio = oldFoodCostPercent > 0 ? oldFoodCostPercent / 100 : 0.30;
    const suggestedNewPriceToMaintainMargin = targetRatio > 0 ? Math.ceil(newFoodCost / targetRatio) : menu.currentSellingPrice;

    const monthlyProfitChange = -(costAddition * (menu.monthlyVolume || 0));
    totalMonthlyImpactThb += costAddition * (menu.monthlyVolume || 0);

    return {
      menuId: menu.menuId,
      menuName: menu.menuName,
      currentSellingPrice: menu.currentSellingPrice,
      oldFoodCost,
      newFoodCost,
      foodCostDiff: costAddition,
      oldFoodCostPercent,
      newFoodCostPercent,
      suggestedNewPriceToMaintainMargin,
      monthlyProfitChange,
    };
  });

  return {
    priceChangePercent,
    costDeltaPerPurchaseUnit,
    totalMonthlyImpactThb,
    menuImpacts,
  };
}
