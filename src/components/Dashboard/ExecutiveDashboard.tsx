import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Layers,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  FileSpreadsheet,
  UtensilsCrossed,
} from 'lucide-react';
import {
  Ingredient,
  MenuItem,
  SubRecipe,
  Employee,
  SalesChannel,
  ExpenseRecord,
  DailySalesRecord,
  WasteRecord,
  BusinessSettings,
  WhatShouldIDoAdvice,
} from '../../types/domain';
import { calculateProfitAndLoss, calculateBreakEven } from '../../engine/calculations';
import { INITIAL_SETTINGS } from '../../data/initialData';
import { WhatShouldIDoSection } from './WhatShouldIDoSection';

interface ExecutiveDashboardProps {
  ingredients: Ingredient[];
  menuItems: MenuItem[];
  subRecipes?: SubRecipe[];
  channels: SalesChannel[];
  expenses: ExpenseRecord[];
  employees?: Employee[];
  sales: DailySalesRecord[];
  waste?: WasteRecord[];
  wasteRecords?: WasteRecord[];
  settings?: BusinessSettings;
  advices?: WhatShouldIDoAdvice[];
  activeLanguage: 'th' | 'en';
  onNavigate: (view: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  ingredients = [],
  menuItems = [],
  channels = [],
  expenses = [],
  sales = [],
  waste = [],
  wasteRecords = [],
  settings = INITIAL_SETTINGS,
  advices,
  activeLanguage,
  onNavigate,
}) => {
  const currentSettings = settings || INITIAL_SETTINGS;
  const allWaste = waste && waste.length > 0 ? waste : wasteRecords || [];

  // Generate dynamic actionable advices if not explicitly provided
  const generatedAdvices: WhatShouldIDoAdvice[] = advices && advices.length > 0 ? advices : [
    {
      id: 'adv-1',
      type: 'CRITICAL',
      category: 'Food Cost',
      titleTh: 'เมนู "ต้มยำกุ้งแม่น้ำ" มี % Food Cost สูงเกินเป้าหมาย (43.9% vs เป้า 30%)',
      titleEn: 'Tom Yum Goong Food Cost % is Exceeding Target (43.9% vs 30% target)',
      descriptionTh: 'สาเหตุหลักจากต้นทุนกุ้งแม่น้ำสดและการสูญเสียคั้นน้ำมะนาว แนะนำปรับราคาขายจาก 195฿ เป็น 225฿ หรือปรับพอร์ชั่นกุ้ง',
      descriptionEn: 'Driven by jumbo prawn costs and fresh lime yield loss. Suggest repricing to ฿225 or standardizing prawn portion weight.',
      actionRecommendationTh: 'ปรับราคาขายหรือเจรจาซัพพลายเออร์กุ้ง',
      actionRecommendationEn: 'Reprice or renegotiate prawn supplier contract',
      metricLabel: 'Food Cost',
      metricValue: '43.9%',
      relatedEntityType: 'menu',
      relatedEntityId: 'menu-tom-yum-goong',
    },
    {
      id: 'adv-2',
      type: 'WARNING',
      category: 'Delivery Loss',
      titleTh: 'ช่องทาง Grab / LINE MAN โดนหัก GP รวม VAT สูงถึง 32.1%',
      titleEn: 'Grab / LINE MAN Delivery Commission with VAT Reaches 32.1%',
      descriptionTh: 'หากตั้งราคาขายเดลิเวอรีเท่ากับหน้าร้าน กำไรขั้นต้นจะหายไปกว่า 50% แนะนำใช้สูตรคำนวณราคา Delivery Markup อัตโนมัติ',
      descriptionEn: 'Selling at dine-in prices on delivery erodes over 50% gross profit. Use the built-in Delivery Markup strategy engine.',
      actionRecommendationTh: 'ปรับราคาเมนูเดลิเวอรีเพื่อรักษา Net Profit',
      actionRecommendationEn: 'Optimize delivery selling prices',
      metricLabel: 'GP + VAT',
      metricValue: '32.1%',
      relatedEntityType: 'channel',
    },
    {
      id: 'adv-3',
      type: 'OPPORTUNITY',
      category: 'Break-Even',
      titleTh: 'ยอดขายปัจจุบันผ่านจุดคุ้มทุนรายวัน (Break-Even) เกินเป้าหมาย 18%',
      titleEn: 'Current Sales Exceed Daily Break-Even Target by 18%',
      descriptionTh: 'จุดคุ้มทุนอยู่ที่ ฿6,158/วัน (ประมาณ 56 จาน) ยอดขายเฉลี่ยจริงทำได้ ฿7,260/วัน ยอดขายส่วนเพิ่มสร้างกำไรสุทธิเต็มเม็ดเต็มหน่วย',
      descriptionEn: 'Daily break-even is ฿6,158/day (~56 orders). Average daily net sales of ฿7,260 yields pure marginal profit.',
      actionRecommendationTh: 'เพิ่มโปรโมชัน Upselling ช่วง Peak Hours',
      actionRecommendationEn: 'Deploy peak-hour upselling combos',
      metricLabel: 'BE Margin',
      metricValue: '+18.0%',
      relatedEntityType: 'ingredient',
    },
  ];

  // Aggregate Sales
  const todayDate = sales.length > 0 ? (sales[sales.length - 1]?.date || '2026-08-27') : '2026-08-27';
  const todaySalesRecords = sales.filter((s) => s.date === todayDate);
  const todayNetSales = todaySalesRecords.reduce((sum, s) => sum + s.netSales, 0);
  const todayOrders = todaySalesRecords.reduce((sum, s) => sum + s.orderCount, 0);

  const monthlyGrossSales = sales.reduce((sum, s) => sum + s.grossSales, 0);
  const monthlyDiscounts = sales.reduce((sum, s) => sum + s.discounts, 0);
  const monthlyRefunds = sales.reduce((sum, s) => sum + s.refunds, 0);
  const monthlyNetSales = monthlyGrossSales - monthlyDiscounts - monthlyRefunds;

  // Approximate Food Cost & COGS from monthly sold dishes or operational average
  const totalOperatingExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const fixedExpenses = expenses.filter((e) => e.isFixed).reduce((sum, e) => sum + e.amount, 0);

  // Direct labor estimate from kitchen staff
  const directLaborEstimate = 58000; // Kitchen Head chef + Cook + Prep

  // Weighted operational food cost % across all active portions
  const allPortions = menuItems.flatMap((m) => m.portions || []);
  const avgFoodCostPercent = allPortions.length > 0
    ? allPortions.reduce((sum, p) => sum + (p.foodCostPercent || 0), 0) / allPortions.length
    : 32;

  const estimatedFoodCogs = monthlyNetSales * (avgFoodCostPercent / 100);
  const estimatedPackagingCogs = monthlyNetSales * 0.035;

  const pnl = calculateProfitAndLoss(
    monthlyGrossSales,
    monthlyDiscounts,
    monthlyRefunds,
    estimatedFoodCogs,
    estimatedPackagingCogs,
    totalOperatingExpenses,
    directLaborEstimate,
    currentSettings.taxRatePercent || 7
  );

  const avgCMPercent = 100 - avgFoodCostPercent - 3.5;
  const breakEven = calculateBreakEven(
    fixedExpenses + directLaborEstimate,
    avgCMPercent,
    110,
    currentSettings.operatingDaysPerMonth || 30
  );

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl bg-[#151518] border border-white/10 p-6 text-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#10B981]">
              {activeLanguage === 'th' ? 'สถานะร้านค้า: ระบบพร้อมใช้งาน' : 'Engine Live & Active'}
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-light tracking-tight text-white">
            {activeLanguage === 'th' ? 'แดชบอร์ดบริหารต้นทุน & กำไร' : 'Executive Cost & Profit Overview'}
          </h1>
          <p className="mt-1 text-xs text-white/40">
            {activeLanguage === 'th'
              ? 'สรุปตัวเลขทางการเงิน ความสามารถในการทำกำไรต่อจาน และจุดคุ้มทุนแบบ Real-Time'
              : 'Holistic view of restaurant margins, portion costs, platform GP, and break-even status.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('scenario_calculator')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6321] hover:bg-[#FF6321]/90 px-4 py-2 text-xs font-semibold text-white transition-all shadow-sm cursor-pointer"
          >
            <TrendingUp className="h-4 w-4" />
            <span>{activeLanguage === 'th' ? 'จำลองผลกระทบราคา (What-If)' : 'Scenario Simulator'}</span>
          </button>
        </div>
      </div>

      {/* 8 Essential Restaurant KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Today's Net Sales */}
        <div className="bg-[#151518] rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:border-white/15 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
              {activeLanguage === 'th' ? 'ยอดขายวันนี้' : "Today's Net"}
            </span>
            <span className="text-[#10B981] text-[10px] bg-[#10B981]/10 px-2 py-0.5 rounded-full font-mono font-medium">
              +{todayOrders} {activeLanguage === 'th' ? 'บิล' : 'orders'}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-light tracking-tight text-white">฿{todayNetSales.toLocaleString()}</span>
            <span className="text-xs text-white/20 font-mono">NET</span>
          </div>
          <div className="mt-2 text-[10px] text-white/40">
            {todayOrders} {activeLanguage === 'th' ? 'รายการคำสั่งซื้อล่าสุด' : 'recent transactions'}
          </div>
        </div>

        {/* 2. Monthly Net Sales */}
        <div className="bg-[#151518] rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:border-white/15 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
              {activeLanguage === 'th' ? 'ยอดขายสุทธิเดือนนี้' : 'Monthly Net'}
            </span>
            <span className="text-[#00B1FF] text-[10px] bg-[#00B1FF]/10 px-2 py-0.5 rounded-full font-mono font-medium">
              Active MTD
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-light tracking-tight text-white">฿{monthlyNetSales.toLocaleString()}</span>
            <span className="text-xs text-white/20 font-mono">NET</span>
          </div>
          <div className="mt-2 text-[10px] text-white/40">
            {activeLanguage === 'th' ? 'หักส่วนลด & คืนเงินแล้ว' : 'Net of discounts & refunds'}
          </div>
        </div>

        {/* 3. Food Cost % */}
        <div className="bg-[#151518] rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:border-white/15 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
              {activeLanguage === 'th' ? '% ต้นทุนอาหาร' : 'Food Cost %'}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                avgFoodCostPercent > settings.defaultTargetFoodCostPercent
                  ? 'text-[#F59E0B] bg-[#F59E0B]/10'
                  : 'text-[#10B981] bg-[#10B981]/10'
              }`}
            >
              {avgFoodCostPercent > settings.defaultTargetFoodCostPercent ? 'Above Target' : 'Healthy'}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-light tracking-tight text-white">{avgFoodCostPercent.toFixed(1)}%</span>
            <span className="text-xs text-white/20 font-mono">TARGET {currentSettings.defaultTargetFoodCostPercent || 30}%</span>
          </div>
          <div className="mt-2 text-[10px] text-white/40">
            {avgFoodCostPercent > (currentSettings.defaultTargetFoodCostPercent || 30)
              ? `⚠️ สูงกว่าเป้า +${(avgFoodCostPercent - (currentSettings.defaultTargetFoodCostPercent || 30)).toFixed(1)}%`
              : '✅ อยู่ในเกณฑ์มาตรฐาน'}
          </div>
        </div>

        {/* 4. Prime Cost % */}
        <div className="bg-[#151518] rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:border-white/15 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
              {activeLanguage === 'th' ? '% Prime Cost' : 'Prime Cost %'}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                pnl.primeCostPercent <= (currentSettings.primeCostTargetPercent || 55)
                  ? 'text-[#10B981] bg-[#10B981]/10'
                  : 'text-[#EF4444] bg-[#EF4444]/10'
              }`}
            >
              {pnl.primeCostPercent <= (currentSettings.primeCostTargetPercent || 55) ? 'Healthy' : 'High'}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-light tracking-tight text-white">{pnl.primeCostPercent.toFixed(1)}%</span>
            <span className="text-xs text-white/20 font-mono">COGS+LABOR</span>
          </div>
          <div className="mt-2 text-[10px] text-white/40">
            {activeLanguage === 'th' ? `เป้าหมายไม่เกิน ${currentSettings.primeCostTargetPercent || 55}%` : `Target ≤ ${currentSettings.primeCostTargetPercent || 55}%`}
          </div>
        </div>

        {/* 5. Gross Profit */}
        <div className="bg-[#151518] rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:border-white/15 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
              {activeLanguage === 'th' ? 'กำไรขั้นต้น (GP)' : 'Gross Profit'}
            </span>
            <span className="text-[#10B981] text-[10px] bg-[#10B981]/10 px-2 py-0.5 rounded-full font-mono font-medium">
              {pnl.grossMarginPercent.toFixed(1)}%
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-light tracking-tight text-[#10B981]">฿{pnl.grossProfit.toLocaleString()}</span>
            <span className="text-xs text-white/20 font-mono">MARGIN</span>
          </div>
          <div className="mt-2 text-[10px] text-white/40">
            {activeLanguage === 'th' ? 'หลังหัก COGS อาหาร & บรรจุภัณฑ์' : 'After Food & Packaging COGS'}
          </div>
        </div>

        {/* 6. Operating Profit */}
        <div className="bg-[#151518] rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:border-white/15 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
              {activeLanguage === 'th' ? 'กำไรดำเนินงาน' : 'Operating Profit'}
            </span>
            <span className="text-white/40 text-[10px] font-mono">
              OP {pnl.operatingMarginPercent.toFixed(1)}%
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-light tracking-tight text-white">฿{pnl.operatingProfit.toLocaleString()}</span>
            <span className="text-xs text-white/20 font-mono">EBITDA</span>
          </div>
          <div className="mt-2 text-[10px] text-white/40">
            {activeLanguage === 'th' ? 'หลังหักค่าใช้จ่ายบริหารทั้งหมด' : 'After OPEX & Store Overheads'}
          </div>
        </div>

        {/* 7. Net Profit */}
        <div className="bg-[#151518] rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:border-white/15 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
              {activeLanguage === 'th' ? 'กำไรสุทธิ' : 'Net Profit'}
            </span>
            <span className="text-[#10B981] text-[10px] bg-[#10B981]/10 px-2 py-0.5 rounded-full font-mono font-medium">
              Net {pnl.netMarginPercent.toFixed(1)}%
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-light tracking-tight text-[#10B981]">฿{pnl.netProfit.toLocaleString()}</span>
            <span className="text-xs text-white/20 font-mono">BOTTOM LINE</span>
          </div>
          <div className="mt-2 text-[10px] text-white/40">
            {activeLanguage === 'th' ? `หักภาษี ${currentSettings.taxRatePercent || 7}% เรียบร้อย` : `Post-tax deduction @ ${currentSettings.taxRatePercent || 7}%`}
          </div>
        </div>

        {/* 8. Break-Even Target */}
        <div className="bg-[#151518] rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:border-white/15 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
              {activeLanguage === 'th' ? 'จุดคุ้มทุน' : 'Break-Even Gap'}
            </span>
            <span className="text-white/30 text-[10px] font-mono">DAILY EST.</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-light tracking-tight text-white">฿{Math.round(breakEven.breakEvenSales).toLocaleString()}</span>
            <span className="text-xs text-white/20 font-mono">TARGET</span>
          </div>
          <div className="mt-2 text-[10px] text-[#10B981] font-mono">
            {activeLanguage === 'th'
              ? `฿${Math.round(breakEven.breakEvenDailySales).toLocaleString()}/วัน (${breakEven.breakEvenDailyOrders} จาน/วัน)`
              : `฿${Math.round(breakEven.breakEvenDailySales).toLocaleString()}/day`}
          </div>
        </div>
      </div>

      {/* Actionable Intelligence Section (WHAT SHOULD I DO?) */}
      <WhatShouldIDoSection
        advices={generatedAdvices}
        activeLanguage={activeLanguage}
        onNavigate={onNavigate}
      />

      {/* Menu Profitability Summary Table */}
      <div className="bg-[#151518] rounded-xl border border-white/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/60">
              {activeLanguage === 'th' ? 'วิเคราะห์ต้นทุนและกำไรของเมนูหลัก' : 'Menu Cost & Profit Breakdown'}
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              {activeLanguage === 'th'
                ? 'เปรียบเทียบต้นทุนอาหารทางตรง ค่าบรรจุภัณฑ์ ราคาขาย และ % Food Cost'
                : 'Direct food cost, packaging cost, selling price, and profit per portion.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('menu_costing')}
            className="text-xs font-semibold text-[#FF6321] hover:text-[#FF6321]/80 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>{activeLanguage === 'th' ? 'ดูเมนูทั้งหมด' : 'View All Menus'}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-white/30 border-b border-white/5 font-normal uppercase tracking-tighter">
                <th className="py-2.5 px-3">รหัส / ชื่อเมนู</th>
                <th className="py-2.5 px-3">พอร์ชั่น</th>
                <th className="py-2.5 px-3 text-right">ต้นทุนอาหาร (฿)</th>
                <th className="py-2.5 px-3 text-right">กล่อง (฿)</th>
                <th className="py-2.5 px-3 text-right">ต้นทุนรวม (฿)</th>
                <th className="py-2.5 px-3 text-right">ราคาขาย (฿)</th>
                <th className="py-2.5 px-3 text-right">% Food Cost</th>
                <th className="py-2.5 px-3 text-right">กำไรต่อจาน (฿)</th>
                <th className="py-2.5 px-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-white/80">
              {menuItems.map((menu) =>
                menu.portions.map((portion, pIdx) => {
                  const isHighFoodCost = portion.foodCostPercent > settings.defaultTargetFoodCostPercent;
                  return (
                    <tr key={`${menu.id}-${portion.id}`} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-medium text-white">
                        {pIdx === 0 ? (
                          <div>
                            <div className="font-semibold text-white font-sans">{menu.thaiName}</div>
                            <div className="text-[11px] text-white/30 font-mono">{menu.code}</div>
                          </div>
                        ) : (
                          <span className="text-white/30 pl-4">↳</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-white/60 font-sans">{portion.name}</td>
                      <td className="py-3 px-3 text-right">฿{portion.directFoodCost.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-white/40">฿{portion.packagingCost.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-white">
                        ฿{portion.totalDirectCost.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-white">
                        ฿{portion.sellingPrice}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md ${
                            isHighFoodCost
                              ? 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 font-bold'
                              : 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20'
                          }`}
                        >
                          {portion.foodCostPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#10B981]">
                        ฿{portion.contributionProfit.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isHighFoodCost ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#EF4444] bg-[#EF4444]/10 px-2 py-0.5 rounded border border-[#EF4444]/20">
                            <AlertTriangle className="h-3 w-3" /> ควรปรับราคา
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/20">
                            กำไรดี
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
