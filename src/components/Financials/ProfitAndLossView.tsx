import React, { useState } from 'react';
import { DollarSign, Percent, TrendingUp, Layers, Calendar, ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react';
import { ExpenseRecord, DailySalesRecord, Employee, BusinessSettings } from '../../types/domain';
import { calculateProfitAndLoss } from '../../engine/calculations';

interface ProfitAndLossViewProps {
  sales: DailySalesRecord[];
  expenses: ExpenseRecord[];
  employees: Employee[];
  settings: BusinessSettings;
  activeLanguage: 'th' | 'en';
}

export const ProfitAndLossView: React.FC<ProfitAndLossViewProps> = ({
  sales,
  expenses,
  employees,
  settings,
  activeLanguage,
}) => {
  // Aggregate monthly revenues
  const grossSales = sales.reduce((sum, s) => sum + s.grossSales, 0);
  const discounts = sales.reduce((sum, s) => sum + s.discounts, 0);
  const refunds = sales.reduce((sum, s) => sum + s.refunds, 0);
  const netSales = grossSales - discounts - refunds;

  // Operating Expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Direct Kitchen Labor vs FOH / Management Labor
  const directKitchenLabor = employees
    .filter((e) => e.roleCategory === 'direct_kitchen')
    .reduce((sum, e) => sum + (e.wageRate + (e.benefitsMonthly || 0)), 0);
  const nonKitchenLabor = employees
    .filter((e) => e.roleCategory !== 'direct_kitchen')
    .reduce((sum, e) => sum + (e.wageRate + (e.benefitsMonthly || 0)), 0);

  // Estimated COGS based on restaurant operational weighted average (31.5% food + 3.5% packaging)
  const [foodCostRate, setFoodCostRate] = useState<number>(31.5);
  const [packagingRate, setPackagingRate] = useState<number>(3.5);

  const foodCogs = netSales * (foodCostRate / 100);
  const packagingCogs = netSales * (packagingRate / 100);
  const operatingExpenses = totalExpenses + nonKitchenLabor;
  const foodCostPercent = netSales > 0 ? (foodCogs / netSales) * 100 : 0;
  const packagingCostPercent = netSales > 0 ? (packagingCogs / netSales) * 100 : 0;
  const operatingExpensePercent = netSales > 0 ? (operatingExpenses / netSales) * 100 : 0;

  const pnl = calculateProfitAndLoss(
    grossSales,
    discounts,
    refunds,
    foodCogs,
    packagingCogs,
    operatingExpenses,
    directKitchenLabor,
    settings.taxRatePercent
  );


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl bg-[#151518] border border-white/10 p-6 text-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#10B981]">
              Financial Statements
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-light tracking-tight text-white flex items-center gap-2">
            <span>{activeLanguage === 'th' ? 'งบกำไรขาดทุนบริหาร (Managerial Profit & Loss P&L)' : 'Monthly Profit & Loss (P&L)'}</span>
          </h1>
          <p className="mt-1 text-xs text-white/40">
            {activeLanguage === 'th'
              ? 'งบการเงินมาตรฐานร้านอาหาร คำนวณยอดขายสุทธิ ต้นทุนอาหาร Prime Cost กำไรดำเนินงาน และกำไรสุทธิ'
              : 'Standard restaurant financial statement showing Net Sales, COGS, Prime Cost, EBITDA, and Net Margin.'}
          </p>
        </div>
      </div>

      {/* Top 4 Summary Margin Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#151518] rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:border-white/15 transition-colors">
          <div className="text-white/40 text-[10px] uppercase font-bold tracking-wider">ยอดขายสุทธิ (Net Revenue)</div>
          <div className="mt-3 text-2xl font-light tracking-tight text-white font-mono">
            ฿{pnl.netSales.toLocaleString()}
          </div>
          <div className="text-[10px] text-white/30 font-mono mt-1">100.0% BASE</div>
        </div>

        <div className="bg-[#151518] rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:border-white/15 transition-colors">
          <div className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Prime Cost % (COGS + Kitchen)</div>
          <div className="mt-3 text-2xl font-light font-mono flex items-baseline gap-1.5 text-purple-400">
            <span>{pnl.primeCostPercent.toFixed(1)}%</span>
            <span className="text-xs text-white/30 font-mono font-normal">(เป้า {settings.primeCostTargetPercent}%)</span>
          </div>
          <div className="text-[10px] text-white/40 font-mono mt-1">฿{pnl.primeCost.toLocaleString()}</div>
        </div>

        <div className="bg-[#151518] rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:border-white/15 transition-colors">
          <div className="text-white/40 text-[10px] uppercase font-bold tracking-wider">กำไรขั้นต้น (Gross Profit)</div>
          <div className="mt-3 text-2xl font-light text-[#10B981] font-mono">
            ฿{pnl.grossProfit.toLocaleString()}
          </div>
          <div className="text-[10px] text-white/40 font-mono mt-1">Margin {pnl.grossMarginPercent.toFixed(1)}%</div>
        </div>

        <div className="bg-[#151518] rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:border-white/15 transition-colors">
          <div className="text-white/40 text-[10px] uppercase font-bold tracking-wider">กำไรสุทธิ (Net Profit)</div>
          <div className="mt-3 text-2xl font-light text-[#10B981] font-mono">
            ฿{pnl.netProfit.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#10B981] font-mono mt-1">
            Net Margin {pnl.netMarginPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Full Formal P&L Statement Table */}
      <div className="rounded-xl border border-white/5 bg-[#151518] p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-5 pb-3 border-b border-white/5 flex items-center justify-between">
          <span>ตารางแจกแจงงบกำไรขาดทุนรายเดือน (Statement of Comprehensive Income)</span>
          <span className="text-xs font-mono font-normal text-white/30">สกุลเงิน: บาท (THB)</span>
        </h2>

        <div className="space-y-4 text-xs font-mono">
          {/* 1. REVENUE SECTION */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold font-sans text-white/70 uppercase tracking-wider bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
              1. รายได้จากการขาย (Revenue)
            </div>
            <div className="flex justify-between px-3 py-1 text-white/70">
              <span className="font-sans">ยอดขายรวมก่อนหักส่วนลด (Gross Sales)</span>
              <span>฿{grossSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between px-3 py-1 text-[#F59E0B]">
              <span className="font-sans">หัก: ส่วนลดและโปรโมชั่นที่ร้านออกเอง (Discounts)</span>
              <span>-฿{discounts.toLocaleString()}</span>
            </div>
            {refunds > 0 && (
              <div className="flex justify-between px-3 py-1 text-[#EF4444]">
                <span className="font-sans">หัก: รายการคืนเงินและยกเลิกบิล (Refunds)</span>
                <span>-฿{refunds.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between px-3 py-2 font-bold text-white bg-white/[0.04] rounded-lg text-sm border border-white/5">
              <span className="font-sans">ยอดขายสุทธิที่แท้จริง (Net Sales)</span>
              <div className="flex items-center gap-4">
                <span className="text-white/40">100.0%</span>
                <span>฿{pnl.netSales.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 2. COST OF GOODS SOLD (COGS) */}
          <div className="space-y-1.5 pt-2">
            <div className="text-[11px] font-bold font-sans text-white/70 uppercase tracking-wider bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
              2. ต้นทุนขาย (Cost of Goods Sold - COGS)
            </div>
            <div className="flex justify-between px-3 py-1 text-white/70">
              <span className="font-sans">ต้นทุนวัตถุดิบและอาหาร (Food Cost)</span>
              <div className="flex items-center gap-4">
                <span className="text-white/40 font-sans">{foodCostPercent.toFixed(1)}%</span>
                <span>฿{Math.round(foodCogs).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between px-3 py-1 text-white/70">
              <span className="font-sans">ต้นทุนกล่องและบรรจุภัณฑ์ (Packaging Cost)</span>
              <div className="flex items-center gap-4">
                <span className="text-white/40 font-sans">{packagingCostPercent.toFixed(1)}%</span>
                <span>฿{Math.round(packagingCogs).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between px-3 py-2 font-bold text-white bg-white/[0.04] rounded-lg border border-white/5">
              <span className="font-sans">รวมต้นทุนขายทั้งสิ้น (Total COGS)</span>
              <div className="flex items-center gap-4">
                <span className="text-white/40">{(foodCostPercent + packagingCostPercent).toFixed(1)}%</span>
                <span>฿{Math.round(pnl.totalCogs).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 3. GROSS PROFIT */}
          <div className="flex justify-between px-3 py-2.5 font-bold text-[#10B981] bg-[#10B981]/10 rounded-xl text-sm border border-[#10B981]/20">
            <span className="font-sans">กำไรขั้นต้น (Gross Profit)</span>
            <div className="flex items-center gap-4">
              <span>{pnl.grossMarginPercent.toFixed(1)}%</span>
              <span>฿{Math.round(pnl.grossProfit).toLocaleString()}</span>
            </div>
          </div>

          {/* 4. PRIME COST HIGHLIGHT */}
          <div className="space-y-1.5 pt-2">
            <div className="text-[11px] font-bold font-sans text-purple-300 uppercase tracking-wider bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20 flex justify-between">
              <span>3. การวิเคราะห์ PRIME COST (COGS + Direct Kitchen Labor)</span>
              <span className="font-mono font-bold text-purple-300">{pnl.primeCostPercent.toFixed(1)}% of Net Sales</span>
            </div>
            <div className="flex justify-between px-3 py-1 text-white/70">
              <span className="font-sans">ค่าแรงทีมงานครัวทางตรง (Kitchen Direct Labor)</span>
              <div className="flex items-center gap-4">
                <span className="text-white/40 font-sans">{pnl.netSales > 0 ? ((directKitchenLabor / pnl.netSales) * 100).toFixed(1) : '0.0'}%</span>
                <span>฿{directKitchenLabor.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between px-3 py-1.5 font-bold text-purple-900 bg-purple-500/10 rounded-lg">
              <span className="font-sans">ยอดรวม PRIME COST ทั้งหมด</span>
              <span>฿{Math.round(pnl.primeCost).toLocaleString()}</span>
            </div>
          </div>

          {/* 5. OPERATING EXPENSES */}
          <div className="space-y-1.5 pt-2">
            <div className="text-[11px] font-bold font-sans text-white/70 uppercase tracking-wider bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
              4. ค่าใช้จ่ายดำเนินงานอื่นๆ (Operating Expenses / Overheads)
            </div>
            <div className="flex justify-between px-3 py-1 text-white/70">
              <span className="font-sans">ค่าเช่าพื้นที่ (Rent)</span>
              <span>฿{expenses.filter(e => e.category === 'Rent').reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between px-3 py-1 text-white/70">
              <span className="font-sans">สาธารณูปโภค (ค่าน้ำ ค่าไฟ ค่าแก๊ส)</span>
              <span>฿{expenses.filter(e => ['Electricity', 'Water', 'Gas (LPG)'].includes(e.category)).reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between px-3 py-1 text-white/70">
              <span className="font-sans">ค่าแรงหน้าร้านและบริหาร (FOH & Admin Staff)</span>
              <span>฿{nonKitchenLabor.toLocaleString()}</span>
            </div>
            <div className="flex justify-between px-3 py-1 text-white/70">
              <span className="font-sans">ค่าการตลาด ซอฟต์แวร์ และอื่นๆ</span>
              <span>฿{expenses.filter(e => !['Rent', 'Electricity', 'Water', 'Gas (LPG)'].includes(e.category)).reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between px-3 py-2 font-bold text-white bg-white/[0.04] rounded-lg border border-white/5">
              <span className="font-sans">รวมค่าใช้จ่ายดำเนินงาน (Total OPEX)</span>
              <div className="flex items-center gap-4">
                <span className="text-white/40">{operatingExpensePercent.toFixed(1)}%</span>
                <span>฿{Math.round(operatingExpenses).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 6. OPERATING PROFIT (EBITDA) */}
          <div className="flex justify-between px-3 py-2.5 font-bold text-white bg-white/5 rounded-xl text-sm border border-white/10">
            <span className="font-sans">กำไรจากการดำเนินงาน (Operating Profit / EBITDA)</span>
            <div className="flex items-center gap-4">
              <span>{pnl.operatingMarginPercent.toFixed(1)}%</span>
              <span>฿{Math.round(pnl.operatingProfit).toLocaleString()}</span>
            </div>
          </div>

          {/* 7. NET PROFIT */}
          <div className="flex justify-between px-4 py-3.5 font-bold text-[#10B981] bg-[#10B981]/15 rounded-xl text-base border border-[#10B981]/30">
            <span className="font-sans">กำไรสุทธิหลังหักภาษี (Net Profit)</span>
            <div className="flex items-center gap-6">
              <span className="text-[#10B981] font-normal">{pnl.netMarginPercent.toFixed(1)}%</span>
              <span className="text-xl">฿{Math.round(pnl.netProfit).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
