import React, { useState } from 'react';
import { Scale, TrendingUp, DollarSign, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ExpenseRecord, Employee, DailySalesRecord, BusinessSettings } from '../../types/domain';
import { calculateBreakEven } from '../../engine/calculations';
import { NumericInput } from '../common/NumericInput';

interface BreakEvenViewProps {
  expenses: ExpenseRecord[];
  employees: Employee[];
  sales: DailySalesRecord[];
  settings: BusinessSettings;
  activeLanguage: 'th' | 'en';
}

export const BreakEvenView: React.FC<BreakEvenViewProps> = ({
  expenses,
  employees,
  sales,
  settings,
  activeLanguage,
}) => {
  // Fixed costs from expenses & full time employee salaries
  const fixedExpenses = expenses.filter((e) => e.isFixed).reduce((sum, e) => sum + e.amount, 0);
  const fixedSalaries = employees.filter((e) => e.employmentType === 'full_time').reduce((sum, e) => sum + e.monthlyCost, 0);
  const defaultTotalFixed = fixedExpenses + fixedSalaries;

  // Custom adjustable parameters
  const [fixedCosts, setFixedCosts] = useState<number>(defaultTotalFixed);
  const [contributionMarginPercent, setContributionMarginPercent] = useState<number>(65);
  const [averageTicket, setAverageTicket] = useState<number>(140);
  const [operatingDays, setOperatingDays] = useState<number>(settings.operatingDaysPerMonth || 26);

  const monthlyNetSales = sales.reduce((sum, s) => sum + s.netSales, 0);

  const breakEven = calculateBreakEven(
    fixedCosts,
    contributionMarginPercent,
    averageTicket,
    operatingDays
  );

  const isProfitable = monthlyNetSales >= breakEven.breakEvenSales;
  const safetyMarginRevenue = monthlyNetSales - breakEven.breakEvenSales;
  const safetyMarginPercent = monthlyNetSales > 0 ? (safetyMarginRevenue / monthlyNetSales) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Scale className="h-5 w-5 text-emerald-600" />
          <span>{activeLanguage === 'th' ? 'การวิเคราะห์จุดคุ้มทุน (Break-Even Analysis)' : 'Break-Even Analysis'}</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {activeLanguage === 'th'
            ? 'คำนวณยอดขายขั้นต่ำและจำนวนจานที่ต้องขายต่อวัน เพื่อให้ครอบคลุมค่าใช้จ่ายคงที่ทั้งหมดของร้าน'
            : 'Minimum sales and daily order volume required to cover fixed overheads.'}
        </p>
      </div>

      {/* Break-Even Key Metrics Banner */}
      <div className={`p-6 rounded-2xl border ${
        isProfitable ? 'bg-emerald-50/80 border-emerald-200' : 'bg-rose-50/80 border-rose-200'
      } flex flex-col md:flex-row items-center justify-between gap-6`}>
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            {isProfitable ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600" />
            )}
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isProfitable ? 'text-emerald-800' : 'text-rose-800'
            }`}>
              {isProfitable ? 'สถานะปัจจุบัน: เกินจุดคุ้มทุน (กำไรแล้ว)' : 'สถานะปัจจุบัน: ยังไม่ถึงจุดคุ้มทุน'}
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">
            ฿{Math.round(breakEven.breakEvenSales).toLocaleString()}{' '}
            <span className="text-sm font-sans font-normal text-slate-500">/ เดือน</span>
          </div>
          <p className="text-xs text-slate-600">
            {activeLanguage === 'th'
              ? `ยอดขายปัจจุบัน ฿${monthlyNetSales.toLocaleString()} (${safetyMarginPercent > 0 ? `ส่วนปลอดภัย +${safetyMarginPercent.toFixed(1)}%` : `ขาดอีก ฿${Math.abs(safetyMarginRevenue).toLocaleString()}`})`
              : `Current Net Sales: ฿${monthlyNetSales.toLocaleString()} (${safetyMarginPercent.toFixed(1)}% safety margin)`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center font-mono">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[10px] text-slate-400 font-sans">ยอดขายขั้นต่ำต่อวัน</div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              ฿{Math.round(breakEven.breakEvenDailySales).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 font-sans mt-0.5">{operatingDays} วันทำการ/เดือน</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[10px] text-slate-400 font-sans">จำนวนออเดอร์ขั้นต่ำต่อวัน</div>
            <div className="text-xl font-bold text-emerald-700 mt-1">
              {breakEven.breakEvenDailyOrders}{' '}
              <span className="text-xs text-slate-400 font-sans">จาน/วัน</span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans mt-0.5">บิลเฉลี่ย ฿{averageTicket}</div>
          </div>
        </div>
      </div>

      {/* Interactive Parameter Sliders */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          ปรับแต่งตัวแปรเพื่อทดสอบจุดคุ้มทุน (Sensitivity Parameters)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              1. ต้นทุนคงที่รายเดือน (Fixed Costs ฿)
            </label>
            <NumericInput
              type="number"
              min="0"
              step="1000"
              value={fixedCosts}
              onChange={(e) => setFixedCosts(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold"
            />
            <p className="text-[10px] text-slate-400 mt-1">ค่าเช่า + เงินเดือนประจำ</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              2. % Contribution Margin (%)
            </label>
            <NumericInput
              type="number"
              min="1"
              max="99"
              value={contributionMarginPercent}
              onChange={(e) => setContributionMarginPercent(parseFloat(e.target.value) || 65)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold"
            />
            <p className="text-[10px] text-slate-400 mt-1">100% - Food Cost % - Packaging %</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              3. ราคาบิลเฉลี่ยต่อจาน/โต๊ะ (฿)
            </label>
            <NumericInput
              type="number"
              min="1"
              value={averageTicket}
              onChange={(e) => setAverageTicket(parseFloat(e.target.value) || 120)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold"
            />
            <p className="text-[10px] text-slate-400 mt-1">Average Ticket Size</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              4. วันเปิดทำการต่อเดือน (วัน)
            </label>
            <NumericInput
              type="number"
              min="1"
              max="31"
              value={operatingDays}
              onChange={(e) => setOperatingDays(parseInt(e.target.value) || 26)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold"
            />
            <p className="text-[10px] text-slate-400 mt-1">Operating Days / Month</p>
          </div>
        </div>
      </div>
    </div>
  );
};
