import React, { useState } from 'react';
import { Plus, Receipt, Trash2, Calendar, DollarSign, Filter } from 'lucide-react';
import { ExpenseRecord, ExpenseCategory } from '../../types/domain';
import { NumericInput } from '../common/NumericInput';

interface ExpensesViewProps {
  expenses: ExpenseRecord[];
  onAddExpense: (expense: ExpenseRecord) => void;
  onDeleteExpense: (id: string) => void;
  activeLanguage: 'th' | 'en';
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
  activeLanguage,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [formData, setFormData] = useState<{
    date: string;
    category: ExpenseCategory;
    description: string;
    amount: number;
    isFixed: boolean;
    paymentMethod: 'Cash' | 'Bank Transfer' | 'Credit Card' | 'PromptPay';
    notes: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    category: 'Electricity',
    description: '',
    amount: 1000,
    isFixed: true,
    paymentMethod: 'Bank Transfer',
    notes: '',
  });

  const categories: ExpenseCategory[] = [
    'Rent',
    'Electricity',
    'Water',
    'Gas (LPG)',
    'Internet & Telephone',
    'Marketing & Ads',
    'Cleaning & Sanitation',
    'Repair & Maintenance',
    'POS & Software Subscriptions',
    'Licenses & Permits',
    'Insurance',
    'Other Operating Expenses',
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) return;

    const newExpense: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      date: formData.date,
      category: formData.category,
      description: formData.description,
      amount: formData.amount,
      isFixed: formData.isFixed,
      paymentMethod: formData.paymentMethod,
      recurring: formData.isFixed,
      notes: formData.notes,
    };

    onAddExpense(newExpense);
    setIsModalOpen(false);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const fixedTotal = expenses.filter((e) => e.isFixed).reduce((sum, e) => sum + e.amount, 0);
  const variableTotal = expenses.filter((e) => !e.isFixed).reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = selectedCategory === 'ALL'
    ? expenses
    : expenses.filter((e) => e.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>{activeLanguage === 'th' ? 'บันทึกค่าใช้จ่ายดำเนินงาน (Operating Expenses)' : 'Operating Expenses'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeLanguage === 'th'
              ? 'แยกประเภทต้นทุนคงที่ (Fixed Costs) และต้นทุนผันแปร (Variable Costs) เพื่อคำนวณจุดคุ้มทุนและงบ P&L'
              : 'Categorize fixed overheads vs variable operational expenses for break-even modeling.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>{activeLanguage === 'th' ? 'เพิ่มค่าใช้จ่าย' : 'Add Expense'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-slate-500 text-xs font-medium">ค่าใช้จ่ายรวมทั้งสิ้น</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 font-mono">
            ฿{totalExpenses.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{expenses.length} รายการ</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-slate-500 text-xs font-medium">ต้นทุนคงที่ (Fixed Costs)</div>
          <div className="mt-1 text-2xl font-bold text-slate-800 font-mono">
            ฿{fixedTotal.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">ค่าเช่า, ค่าซอฟต์แวร์ POS</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-slate-500 text-xs font-medium">ต้นทุนผันแปร (Variable Costs)</div>
          <div className="mt-1 text-2xl font-bold text-slate-800 font-mono">
            ฿{variableTotal.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">ค่าน้ำ, ค่าไฟ, ค่าแก๊ส</div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-slate-600" />
            <span>รายการค่าใช้จ่ายทั้งหมด</span>
          </h2>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs bg-white"
          >
            <option value="ALL">ทุกหมวดหมู่ (All Categories)</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">วันที่</th>
                <th className="py-2.5 px-3">หมวดหมู่</th>
                <th className="py-2.5 px-3">รายการ</th>
                <th className="py-2.5 px-3 text-center">ประเภท</th>
                <th className="py-2.5 px-3 text-right">จำนวนเงิน (฿)</th>
                <th className="py-2.5 px-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3 font-mono font-medium">{exp.date}</td>
                  <td className="py-2.5 px-3 text-slate-600">{exp.category}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{exp.description}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      exp.isFixed ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-800'
                    }`}>
                      {exp.isFixed ? 'Fixed Cost' : 'Variable Cost'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    ฿{exp.amount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(exp.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">เพิ่มค่าใช้จ่าย</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">หมวดหมู่</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อรายการค่าใช้จ่าย *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ค่าเช่าพื้นที่ประจำเดือน"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">จำนวนเงิน (฿) *</label>
                  <NumericInput
                    type="number"
                    step="any"
                    required
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ลักษณะต้นทุน</label>
                  <select
                    value={formData.isFixed ? 'fixed' : 'variable'}
                    onChange={(e) => setFormData({ ...formData, isFixed: e.target.value === 'fixed' })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white"
                  >
                    <option value="fixed">Fixed Cost (คงที่)</option>
                    <option value="variable">Variable Cost (ผันแปร)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white"
                >
                  บันทึกค่าใช้จ่าย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
