import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  X,
  Sparkles,
  Scale,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  Ingredient,
  IngredientCategory,
  UnitType,
  PriceHistoryRecord,
  Sauce,
  MenuVariant,
  RestaurantSettings,
} from '../types';
import {
  calculateIngredientCost,
  analyzePriceChangeImpact,
} from '../services/calculationEngine';
import { NumericInput } from './common/NumericInput';

interface IngredientsViewProps {
  ingredients: Ingredient[];
  sauces: Sauce[];
  variants: MenuVariant[];
  menuNamesMap: Map<string, string>;
  settings: RestaurantSettings;
  priceHistory: PriceHistoryRecord[];
  onSaveIngredient: (ingredient: Ingredient) => void;
  onRecordPriceChange: (record: PriceHistoryRecord) => void;
}

export const IngredientsView: React.FC<IngredientsViewProps> = ({
  ingredients,
  sauces,
  variants,
  menuNamesMap,
  settings,
  priceHistory,
  onSaveIngredient,
  onRecordPriceChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Partial<Ingredient> | null>(null);

  // Price Simulation Modal state
  const [isImpactModalOpen, setIsImpactModalOpen] = useState(false);
  const [simulatingIngredient, setSimulatingIngredient] = useState<Ingredient | null>(null);
  const [simulatedNewPrice, setSimulatedNewPrice] = useState<number>(0);
  const [priceChangeReason, setPriceChangeReason] = useState<string>('');

  // Sub-view: LIST or YIELD_LAB (ขั้นตอนที่ 2: แลบทดสอบ Yield)
  const [activeSubTab, setActiveSubTab] = useState<'LIST' | 'YIELD_LAB'>('LIST');

  // Yield Lab State (ขั้นตอนที่ 2)
  const [selectedYieldIngId, setSelectedYieldIngId] = useState<string>(ingredients[0]?.id || '');
  const [rawWeight, setRawWeight] = useState<number>(1000);
  const [usableWeight, setUsableWeight] = useState<number>(920);
  const [rawPrice, setRawPrice] = useState<number>(ingredients[0]?.purchasePrice || 100);
  const [yieldNotice, setYieldNotice] = useState<string | null>(null);

  const selectedYieldIng = ingredients.find((i) => i.id === selectedYieldIngId) || ingredients[0];

  // Calculated Yield
  const testYieldPercent = rawWeight > 0 ? (usableWeight / rawWeight) * 100 : 100;
  const isAbsorption = testYieldPercent > 100;
  const testEffectiveCostPerKg = usableWeight > 0 ? (rawPrice / usableWeight) * 1000 : 0;

  const handleSelectYieldIng = (id: string) => {
    setSelectedYieldIngId(id);
    const ing = ingredients.find((i) => i.id === id);
    if (ing) {
      setRawPrice(ing.purchasePrice);
      const isKg = ing.purchaseUnit === 'kg';
      setRawWeight(isKg ? ing.purchaseQuantity * 1000 : ing.purchaseQuantity);
      setUsableWeight(isKg ? ing.actualQuantity * 1000 : ing.actualQuantity);
    }
  };

  const handleApplyYieldTest = () => {
    if (!selectedYieldIng) return;
    const finalYield = Number(testYieldPercent.toFixed(1));
    const isKg = selectedYieldIng.purchaseUnit === 'kg';
    const finalUsable = isKg ? usableWeight / 1000 : usableWeight;

    // Recalculate cost with updated yield
    const calc = calculateIngredientCost({
      ...selectedYieldIng,
      yieldPercent: finalYield,
      actualQuantity: finalUsable,
    });

    const updatedIng: Ingredient = {
      ...selectedYieldIng,
      yieldPercent: finalYield,
      actualQuantity: finalUsable,
      actualCost: calc.actualCost,
      costPerBaseUnit: calc.costPerBaseUnit,
      updatedAt: new Date().toISOString(),
    };

    onSaveIngredient(updatedIng);
    setYieldNotice(`อัปเดต Yield ${finalYield}% ลงใน "${selectedYieldIng.name}" สำเร็จ`);
    setTimeout(() => setYieldNotice(null), 4000);
  };

  const categories: Array<IngredientCategory | 'ALL'> = [
    'ALL',
    'เนื้อสัตว์และอาหารทะเล',
    'ผักและสมุนไพร',
    'เครื่องปรุงและซอส',
    'ข้าวและเส้น',
    'ไข่และเต้าหู้',
    'ของแห้งและเบ็ดเตล็ด',
    'บรรจุภัณฑ์',
  ];

  // Filtered ingredients
  const filteredIngredients = ingredients.filter((ing) => {
    const matchesSearch =
      ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ing.notes && ing.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'ALL' || ing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAdd = () => {
    const newIng: Partial<Ingredient> = {
      id: `ing_${Date.now()}`,
      name: '',
      category: 'เนื้อสัตว์และอาหารทะเล',
      purchaseQuantity: 1000,
      purchaseUnit: 'g',
      purchasePrice: 100,
      actualQuantity: 1000,
      actualUnit: 'g',
      yieldPercent: 100,
      actualCost: 100,
      baseUnit: 'g',
      costPerBaseUnit: 0.1,
      usageUnit: 'g',
      active: true,
      createdAt: new Date().toISOString(),
    };
    setEditingIngredient(newIng);
    setIsEditingModalOpen(true);
  };

  const handleOpenEdit = (ing: Ingredient) => {
    const pQty = Number(ing.purchaseQuantity) || 1000;
    const yPct = Number(ing.yieldPercent) || 100;
    const computedActual = ing.actualQuantity !== undefined && ing.actualQuantity !== null
      ? ing.actualQuantity
      : Number(((pQty * yPct) / 100).toFixed(1));
    setEditingIngredient({
      ...ing,
      actualQuantity: computedActual,
      actualUnit: ing.actualUnit || ing.purchaseUnit || 'g',
    });
    setIsEditingModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIngredient || !editingIngredient.name) return;

    const calc = calculateIngredientCost(editingIngredient);
    const completeIngredient: Ingredient = {
      id: editingIngredient.id || `ing_${Date.now()}`,
      name: editingIngredient.name,
      category: editingIngredient.category || 'เนื้อสัตว์และอาหารทะเล',
      purchaseQuantity: Number(editingIngredient.purchaseQuantity) || 1,
      purchaseUnit: editingIngredient.purchaseUnit || 'g',
      purchasePrice: Number(editingIngredient.purchasePrice) || 0,
      actualQuantity: Number(editingIngredient.actualQuantity) || Number(editingIngredient.purchaseQuantity) || 1,
      actualUnit: editingIngredient.actualUnit || editingIngredient.purchaseUnit || 'g',
      yieldPercent: Number(editingIngredient.yieldPercent) || 100,
      actualCost: calc.actualCost,
      baseUnit: editingIngredient.baseUnit || editingIngredient.actualUnit || editingIngredient.purchaseUnit || 'g',
      costPerBaseUnit: calc.costPerBaseUnit,
      usageUnit: editingIngredient.usageUnit || 'g',
      piecesPerPurchaseUnit: editingIngredient.piecesPerPurchaseUnit,
      notes: editingIngredient.notes,
      isReviewRequired: editingIngredient.isReviewRequired || false,
      reviewReason: editingIngredient.reviewReason,
      active: editingIngredient.active !== undefined ? editingIngredient.active : true,
      createdAt: editingIngredient.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveIngredient(completeIngredient);
    setIsEditingModalOpen(false);
    setEditingIngredient(null);
  };

  const handleOpenSimulate = (ing: Ingredient) => {
    setSimulatingIngredient(ing);
    setSimulatedNewPrice(ing.purchasePrice);
    setPriceChangeReason('');
    setIsImpactModalOpen(true);
  };

  const handleApplySimulatedPrice = () => {
    if (!simulatingIngredient) return;

    const oldPrice = simulatingIngredient.purchasePrice;
    const newPrice = simulatedNewPrice;

    // Recalculate ingredient with new price
    const calc = calculateIngredientCost({
      ...simulatingIngredient,
      purchasePrice: newPrice,
    });

    const updatedIng: Ingredient = {
      ...simulatingIngredient,
      purchasePrice: newPrice,
      actualCost: calc.actualCost,
      costPerBaseUnit: calc.costPerBaseUnit,
      updatedAt: new Date().toISOString(),
    };

    // Record price history
    const historyRecord: PriceHistoryRecord = {
      id: `hist_${Date.now()}`,
      ingredientId: simulatingIngredient.id,
      ingredientName: simulatingIngredient.name,
      oldPrice,
      newPrice,
      oldCostPerUnit: simulatingIngredient.costPerBaseUnit,
      newCostPerUnit: calc.costPerBaseUnit,
      unit: simulatingIngredient.usageUnit,
      date: new Date().toISOString().slice(0, 10),
      reason: priceChangeReason || 'ปรับราคาจากโปรแกรมจำลองผลกระทบ',
      user: `${settings.userRole} (Tony)`,
    };

    onRecordPriceChange(historyRecord);
    onSaveIngredient(updatedIng);
    setIsImpactModalOpen(false);
  };

  // Run impact analysis for simulation modal
  const impactAnalysis = simulatingIngredient
    ? analyzePriceChangeImpact(
        simulatingIngredient.id,
        simulatedNewPrice,
        simulatingIngredient.yieldPercent,
        ingredients,
        sauces,
        variants,
        menuNamesMap,
        settings
      )
    : null;

  return (
    <div className="space-y-4 pb-8">
      {/* Title & Actions */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            ฐานข้อมูลวัตถุดิบและต้นทุน Yield
          </h1>
          <p className="text-xs text-white/60 mt-0.5">
            กำหนดราคาซื้อ, ปริมาณสูญเสีย (Yield %), และต้นทุนต่อหน่วยใช้งานจริงตามสูตรบัญชี
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher Tabs */}
          <div className="flex bg-black/40 border border-white/15 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveSubTab('LIST')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'LIST'
                  ? 'bg-[#F27D26] text-black shadow-md shadow-[#F27D26]/20'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ทะเบียนวัตถุดิบ</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('YIELD_LAB')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'YIELD_LAB'
                  ? 'bg-[#10B981] text-black shadow-md shadow-[#10B981]/20'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>🧪 ขั้นตอนที่ 2: แลบทดสอบ Yield</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#F27D26] hover:bg-[#d96817] text-black font-bold rounded-xl text-xs shadow-lg shadow-[#F27D26]/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มวัตถุดิบใหม่</span>
          </button>
        </div>
      </div>

      {/* Yield Success Notice */}
      {yieldNotice && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{yieldNotice}</span>
        </div>
      )}

      {activeSubTab === 'YIELD_LAB' ? (
        /* STEP 2: YIELD TEST LAB */
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-white space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-[#10B981]" />
                  <h2 className="text-lg font-bold text-white">
                    ขั้นตอนที่ 2: ห้องแลบทดสอบ Yield & การสูญเสียในการเตรียม
                  </h2>
                </div>
                <p className="text-xs text-white/50 mt-1">
                  คำนวณ Yield จริงจากการชั่งน้ำหนักก่อน/หลังเตรียม (ตัดแต่งสูญเสีย ≤100% หรือต้ม/ดูดซึมน้ำขยายตัว &gt;100%)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/60">เลือกวัตถุดิบ:</span>
                <select
                  value={selectedYieldIngId}
                  onChange={(e) => handleSelectYieldIng(e.target.value)}
                  className="rounded-xl border border-white/15 py-2 px-3 text-xs bg-black/50 font-bold text-white focus:border-[#10B981] focus:outline-none cursor-pointer"
                >
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id} className="bg-[#1c1c1e]">
                      {ing.name} (Yield: {ing.yieldPercent}%, ฿{ing.purchasePrice}/{ing.purchaseUnit})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3 Step Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/30 p-4 rounded-xl border border-white/10">
                <label className="block text-xs font-semibold text-white/70 mb-1">
                  1. น้ำหนักวัตถุดิบก่อนเตรียม (Raw Weight)
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <NumericInput
                    type="number"
                    step="any"
                    min="1"
                    value={rawWeight}
                    onChange={(e) => setRawWeight(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-white/10 bg-[#0F0F11] px-3 py-2 text-sm font-mono font-bold text-white focus:border-[#10B981] focus:outline-none"
                  />
                  <span className="text-xs font-medium text-white/40">กรัม (g)</span>
                </div>
                <p className="text-[11px] text-white/40 mt-1.5">เช่น หมูดิบ, อกไก่, หรือข้าวสารดิบ</p>
              </div>

              <div className="bg-black/30 p-4 rounded-xl border border-white/10">
                <label className="block text-xs font-semibold text-white/70 mb-1">
                  2. น้ำหนักหลังตัดแต่ง/ปรุงเสร็จ (Usable Weight)
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <NumericInput
                    type="number"
                    step="any"
                    min="1"
                    value={usableWeight}
                    onChange={(e) => setUsableWeight(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-white/10 bg-[#0F0F11] px-3 py-2 text-sm font-mono font-bold text-white focus:border-[#10B981] focus:outline-none"
                  />
                  <span className="text-xs font-medium text-white/40">กรัม (g)</span>
                </div>
                <p className="text-[11px] text-white/40 mt-1.5">หลังลอกเอ็น/หั่นแต่ง หรือหลังหุงข้าวสุก</p>
              </div>

              <div className="bg-black/30 p-4 rounded-xl border border-white/10">
                <label className="block text-xs font-semibold text-white/70 mb-1">
                  3. ราคาซื้อล็อตนี้ (Raw Cost ฿)
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <NumericInput
                    type="number"
                    step="any"
                    min="0"
                    value={rawPrice}
                    onChange={(e) => setRawPrice(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-white/10 bg-[#0F0F11] px-3 py-2 text-sm font-mono font-bold text-white focus:border-[#10B981] focus:outline-none"
                  />
                  <span className="text-xs font-medium text-white/40">บาท (฿)</span>
                </div>
                <p className="text-[11px] text-white/40 mt-1.5">ราคาตามใบเสร็จรับเงินหรือใบส่งของ</p>
              </div>
            </div>

            {/* Results Banner */}
            <div className="p-5 rounded-xl bg-black/40 border border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/70 flex items-center gap-1.5 justify-center sm:justify-start">
                  <Percent className="h-4 w-4 text-[#10B981]" />
                  <span>ผลลัพธ์การทดสอบ Yield จริง</span>
                </div>
                <div className="text-3xl font-bold text-[#10B981] font-mono">
                  {testYieldPercent.toFixed(1)}%
                </div>
                <div className="text-xs text-white/60">
                  {isAbsorption
                    ? '⚡ การดูดซึมน้ำ/การขยายตัว (>100%): น้ำหนักเพิ่มขึ้นจากการต้ม, หุง, หรือแช่น้ำ'
                    : `🔪 การสูญเสียจากการตัดแต่ง ${(100 - testYieldPercent).toFixed(1)}% (Yield คงเหลือ ${testYieldPercent.toFixed(1)}%)`}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[11px] text-white/50">ต้นทุนจริงหลังคิด Yield</div>
                  <div className="text-xl font-bold text-white font-mono">
                    ฿{testEffectiveCostPerKg.toFixed(2)} <span className="text-xs font-normal text-white/50">/ กก.</span>
                  </div>
                  <div className="text-[10px] text-white/40 font-mono">
                    (฿{(testEffectiveCostPerKg / 1000).toFixed(4)} / กรัม)
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyYieldTest}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#10B981] hover:bg-[#0ea372] px-5 py-3 text-xs font-bold text-black transition-all shadow-lg shadow-[#10B981]/20 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>อัปเดตลงในทะเบียนวัตถุดิบ</span>
                </button>
              </div>
            </div>
          </div>

          {/* All Ingredients Yield Comparison Table */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 text-white">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#10B981]" />
              <span>ตารางสรุป Yield และต้นทุนจริงของวัตถุดิบทั้งหมดในร้าน</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-white/50 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">วัตถุดิบ</th>
                    <th className="py-2.5 px-3">หมวดหมู่</th>
                    <th className="py-2.5 px-3 text-right">Yield %</th>
                    <th className="py-2.5 px-3 text-right">ประเภท Yield</th>
                    <th className="py-2.5 px-3 text-right">ราคาซื้อ</th>
                    <th className="py-2.5 px-3 text-right">ต้นทุนจริงต่อหน่วยใช้งาน</th>
                    <th className="py-2.5 px-3 text-center">ทดสอบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/70">
                  {ingredients.map((ing) => (
                    <tr key={ing.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white">{ing.name}</td>
                      <td className="py-2.5 px-3 text-white/50">{ing.category}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            ing.yieldPercent > 100
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : ing.yieldPercent >= 80
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {ing.yieldPercent}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-white/50">
                        {ing.yieldPercent > 100 ? 'ขยายตัว/ดูดซึมน้ำ (>100%)' : 'สูญเสียตัดแต่ง (≤100%)'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-white/60">
                        ฿{ing.purchasePrice.toLocaleString()} /{ing.purchaseUnit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#FFC107]">
                        ฿{ing.costPerBaseUnit.toFixed(4)} /{ing.usageUnit}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectYieldIng(ing.id)}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          เลือกคำนวณ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* STEP 1: MASTER INGREDIENTS LIST */
        <>
          {/* Filters & Search */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="ค้นหาวัตถุดิบ (เช่น หมู, กุ้ง, ซอส)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#F27D26]"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <Filter className="w-4 h-4 text-white/40 shrink-0 hidden sm:block mr-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#F27D26] text-black font-bold shadow-md shadow-[#F27D26]/20'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              {cat === 'ALL' ? 'ทั้งหมด' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* INGREDIENTS TABLE */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-white/50 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">วัตถุดิบ</th>
                <th className="py-3 px-3">หมวดหมู่</th>
                <th className="py-3 px-3">ราคาซื้อ</th>
                <th className="py-3 px-3">Yield (%)</th>
                <th className="py-3 px-3">น้ำหนักสุทธิ</th>
                <th className="py-3 px-3">ต้นทุนจริงหลัง Yield</th>
                <th className="py-3 px-3">ต้นทุนต่อหน่วยใช้งาน</th>
                <th className="py-3 px-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredIngredients.map((ing) => {
                const isShrimp = ing.usageUnit === 'ตัว';
                return (
                  <tr
                    key={ing.id}
                    className={`hover:bg-white/10 transition-colors ${
                      ing.isReviewRequired ? 'bg-red-500/10' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span>{ing.name}</span>
                        {ing.isReviewRequired && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30"
                            title={ing.reviewReason}
                          >
                            รอตรวจทาน
                          </span>
                        )}
                        {!ing.active && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/40">
                            ระงับ
                          </span>
                        )}
                      </div>
                      {ing.notes && (
                        <div className="text-[11px] text-white/50 font-normal truncate max-w-xs mt-0.5">
                          {ing.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-white/70">{ing.category}</td>
                    <td className="py-3.5 px-3 font-mono text-white font-bold">
                      ฿{ing.purchasePrice.toLocaleString()} / {ing.purchaseQuantity} {ing.purchaseUnit}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold font-mono text-[11px] ${
                          ing.yieldPercent >= 100
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : ing.yieldPercent >= 75
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {ing.yieldPercent}%
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-white/70 font-mono">
                      {ing.actualQuantity} {ing.actualUnit}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-semibold text-white/80">
                      ฿{ing.actualCost.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-mono font-bold text-[#FFC107] text-xs">
                        ฿{ing.costPerBaseUnit.toFixed(4)} / {ing.usageUnit}
                      </div>
                      {isShrimp && ing.piecesPerPurchaseUnit && (
                        <div className="text-[10px] text-white/40 font-normal">
                          ({ing.piecesPerPurchaseUnit} ตัว/กล่อง)
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Price Impact Simulator button */}
                      <button
                        type="button"
                        onClick={() => handleOpenSimulate(ing)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#F27D26]/20 hover:bg-[#F27D26]/30 border border-[#F27D26]/30 text-[#F27D26] font-bold text-xs transition-colors cursor-pointer"
                        title="จำลองผลกระทบหากราคาเปลี่ยน"
                      >
                        <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                        จำลองราคา
                      </button>
                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(ing)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                        title="แก้ไขวัตถุดิบ"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* EDIT / ADD INGREDIENT MODAL */}
      {isEditingModalOpen && editingIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-[#1a1a1a]/95 backdrop-blur-2xl rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-white/20 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-white">
                {editingIngredient.id ? 'แก้ไขข้อมูลวัตถุดิบ' : 'เพิ่มวัตถุดิบใหม่'}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="p-1 text-white/50 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4 mt-4 text-xs">
              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    ชื่อวัตถุดิบ <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingIngredient.name || ''}
                    onChange={(e) =>
                      setEditingIngredient({ ...editingIngredient, name: e.target.value })
                    }
                    className="w-full p-2.5 bg-black/40 border border-white/15 rounded-xl text-white font-medium focus:border-[#F27D26] focus:outline-none"
                    placeholder="เช่น หมูหมัก, กุ้งสด XL"
                  />
                </div>

                <div>
                  <label className="block font-bold text-white/80 mb-1">หมวดหมู่</label>
                  <select
                    value={editingIngredient.category || 'เนื้อสัตว์และอาหารทะเล'}
                    onChange={(e) =>
                      setEditingIngredient({
                        ...editingIngredient,
                        category: e.target.value as IngredientCategory,
                      })
                    }
                    className="w-full p-2.5 bg-black/40 border border-white/15 rounded-xl text-white font-medium focus:border-[#F27D26] focus:outline-none cursor-pointer"
                  >
                    {categories
                      .filter((c) => c !== 'ALL')
                      .map((cat) => (
                        <option key={cat} value={cat} className="bg-[#1a1a1a] text-white">
                          {cat}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Purchase Details */}
              <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                <div className="font-bold text-[#F27D26] text-xs uppercase tracking-wider">
                  ข้อมูลการซื้อ (Purchase Specs)
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-white/60 mb-1">ปริมาณที่ซื้อ</label>
                    <NumericInput
                      type="number"
                      step="any"
                      required
                      value={editingIngredient.purchaseQuantity ?? ''}
                      onChange={(e) => {
                        const newPQty = parseFloat(e.target.value) || 0;
                        const currentActual = editingIngredient.actualQuantity;
                        const newYield =
                          newPQty > 0 && currentActual !== undefined && currentActual > 0
                            ? Number(((currentActual / newPQty) * 100).toFixed(1))
                            : (editingIngredient.yieldPercent ?? 100);
                        setEditingIngredient({
                          ...editingIngredient,
                          purchaseQuantity: newPQty,
                          yieldPercent: newYield,
                        });
                      }}
                      className="w-full p-2 bg-black/40 border border-white/15 rounded-xl font-mono text-white"
                      placeholder="เช่น 1000"
                    />
                  </div>

                  <div>
                    <label className="block text-white/60 mb-1">หน่วยซื้อ</label>
                    <select
                      value={editingIngredient.purchaseUnit || 'g'}
                      onChange={(e) => {
                        const newUnit = e.target.value as UnitType;
                        setEditingIngredient({
                          ...editingIngredient,
                          purchaseUnit: newUnit,
                          actualUnit: newUnit,
                          baseUnit: newUnit,
                        });
                      }}
                      className="w-full p-2 bg-black/40 border border-white/15 rounded-xl text-white cursor-pointer"
                    >
                      <option value="g" className="bg-[#1a1a1a]">g (กรัม)</option>
                      <option value="kg" className="bg-[#1a1a1a]">kg (กิโลกรัม)</option>
                      <option value="ml" className="bg-[#1a1a1a]">ml (มิลลิลิตร)</option>
                      <option value="L" className="bg-[#1a1a1a]">L (ลิตร)</option>
                      <option value="ชิ้น" className="bg-[#1a1a1a]">ชิ้น</option>
                      <option value="กล่อง" className="bg-[#1a1a1a]">กล่อง</option>
                      <option value="ถุง" className="bg-[#1a1a1a]">ถุง</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/60 mb-1">ราคาซื้อ (บาท)</label>
                    <NumericInput
                      type="number"
                      step="any"
                      required
                      value={editingIngredient.purchasePrice ?? ''}
                      onChange={(e) =>
                        setEditingIngredient({
                          ...editingIngredient,
                          purchasePrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full p-2 bg-black/40 border border-white/15 rounded-xl font-mono font-bold text-[#FFC107]"
                    />
                  </div>
                </div>

                {/* Row 2: Actual Quantity after trimming & Yield Auto-calculation comparison */}
                <div className="grid grid-cols-3 gap-3 pt-2.5 border-t border-white/10">
                  <div>
                    <label className="block text-emerald-400 font-bold mb-1">
                      ปริมาณที่ได้จริง(หลังตัดแต่ง)
                    </label>
                    <NumericInput
                      type="number"
                      step="any"
                      required
                      value={editingIngredient.actualQuantity ?? ''}
                      onChange={(e) => {
                        const newActual = parseFloat(e.target.value) || 0;
                        const pQty = Number(editingIngredient.purchaseQuantity) || 0;
                        const newYield = pQty > 0 ? Number(((newActual / pQty) * 100).toFixed(1)) : 100;
                        setEditingIngredient({
                          ...editingIngredient,
                          actualQuantity: newActual,
                          yieldPercent: newYield,
                        });
                      }}
                      className="w-full p-2 bg-black/40 border border-emerald-500/40 focus:border-emerald-400 rounded-xl font-mono font-bold text-emerald-300"
                      placeholder="เช่น 950"
                    />
                  </div>

                  <div>
                    <label className="block text-white/60 mb-1">หน่วยที่ได้จริง</label>
                    <div className="w-full p-2 bg-black/20 border border-white/10 rounded-xl text-white/80 font-mono text-sm flex items-center justify-between">
                      <span>{editingIngredient.actualUnit || editingIngredient.purchaseUnit || 'g'}</span>
                      <span className="text-[10px] text-white/40">พร้อมปรุง</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/60 mb-1">Yield (%) คำนวณอัตโนมัติ</label>
                    <div className="w-full p-2 bg-black/40 border border-emerald-500/30 rounded-xl font-mono flex items-center justify-between">
                      <span className="font-bold text-emerald-400 text-sm">
                        {editingIngredient.yieldPercent ?? 100}%
                      </span>
                      {editingIngredient.purchaseQuantity && editingIngredient.actualQuantity !== undefined && (
                        <span className="text-[10px] text-rose-300">
                          {Number(editingIngredient.purchaseQuantity) > Number(editingIngredient.actualQuantity)
                            ? `สูญเสีย -${(Number(editingIngredient.purchaseQuantity) - Number(editingIngredient.actualQuantity)).toFixed(1)} ${editingIngredient.purchaseUnit || 'g'}`
                            : 'Yield 100%'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Yield & Preparation Specs */}
              <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                <div className="font-bold text-[#FFC107] text-xs uppercase tracking-wider">
                  การเตรียมและ Yield (Preparation & Yield %)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/60 mb-1">Yield (%) หลังตัดแต่ง</label>
                    <NumericInput
                      type="number"
                      step="any"
                      min="1"
                      max="200"
                      value={editingIngredient.yieldPercent ?? 100}
                      onChange={(e) => {
                        const newYield = parseFloat(e.target.value) || 100;
                        const pQty = Number(editingIngredient.purchaseQuantity) || 0;
                        const newActual = pQty > 0 ? Number(((pQty * newYield) / 100).toFixed(1)) : (editingIngredient.actualQuantity || 0);
                        setEditingIngredient({
                          ...editingIngredient,
                          yieldPercent: newYield,
                          actualQuantity: newActual,
                        });
                      }}
                      className="w-full p-2 bg-black/40 border border-white/15 rounded-xl font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-white/60 mb-1">หน่วยใช้งานในสูตร</label>
                    <select
                      value={editingIngredient.usageUnit || 'g'}
                      onChange={(e) =>
                        setEditingIngredient({
                          ...editingIngredient,
                          usageUnit: e.target.value as UnitType,
                        })
                      }
                      className="w-full p-2 bg-black/40 border border-white/15 rounded-xl text-white cursor-pointer"
                    >
                      <option value="g" className="bg-[#1a1a1a]">g (กรัม)</option>
                      <option value="ตัว" className="bg-[#1a1a1a]">ตัว (คิดเป็นตัว เช่น กุ้ง)</option>
                      <option value="ฟอง" className="bg-[#1a1a1a]">ฟอง (ไข่ไก่)</option>
                      <option value="ml" className="bg-[#1a1a1a]">ml (มิลลิลิตร)</option>
                      <option value="ชิ้น" className="bg-[#1a1a1a]">ชิ้น</option>
                      <option value="จาน" className="bg-[#1a1a1a]">จาน</option>
                    </select>
                  </div>
                </div>

                {/* Shrimp pieces definition */}
                {editingIngredient.usageUnit === 'ตัว' && (
                  <div className="mt-2 p-2.5 bg-[#FFC107]/10 rounded-xl border border-[#FFC107]/30 text-[11px] text-white/90">
                    <span className="font-bold text-[#FFC107]">กุ้ง / ของคิดเป็นตัว:</span> ระบุจำนวนตัวต่อรอบซื้อ
                    (เช่น 60 ตัว = 510 บาท ต้นทุน 8.50 บาท/ตัว)
                    <div className="mt-1 flex items-center gap-2">
                      <span>จำนวนตัวที่ใช้ได้:</span>
                      <NumericInput
                        type="number"
                        value={editingIngredient.piecesPerPurchaseUnit || ''}
                        onChange={(e) =>
                          setEditingIngredient({
                            ...editingIngredient,
                            piecesPerPurchaseUnit: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-24 p-1 bg-black/40 border border-white/20 rounded font-bold text-white"
                        placeholder="เช่น 60"
                      />
                      <span>ตัว</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Calculated preview */}
              {(() => {
                const previewCalc = calculateIngredientCost(editingIngredient);
                return (
                  <div className="p-3 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-between font-mono">
                    <div>
                      <div className="text-[10px] text-white/40">ต้นทุนจริงหลังหัก Yield</div>
                      <div className="font-bold text-sm text-white">฿{previewCalc.actualCost.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#F27D26]">ต้นทุนต่อหน่วยใช้งาน ({editingIngredient.usageUnit})</div>
                      <div className="font-bold text-base text-[#FFC107]">
                        ฿{previewCalc.costPerBaseUnit.toFixed(6)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F27D26] hover:bg-[#d96817] text-black rounded-xl font-bold transition-colors cursor-pointer"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRICE CHANGE IMPACT SIMULATION MODAL */}
      {isImpactModalOpen && simulatingIngredient && impactAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-[#1a1a1a]/95 backdrop-blur-2xl rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-white/20 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#F27D26] uppercase">
                  <Sparkles className="w-4 h-4" />
                  <span>โปรแกรมจำลองผลกระทบการปรับราคา (Impact Engine)</span>
                </div>
                <h2 className="text-xl font-bold text-white mt-1">
                  {simulatingIngredient.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsImpactModalOpen(false)}
                className="p-1 text-white/50 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              {/* Price inputs */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                <div>
                  <span className="text-white/50 font-medium">ราคาซื้อเดิม:</span>
                  <div className="text-base font-bold text-white font-mono mt-0.5">
                    ฿{simulatingIngredient.purchasePrice.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-white/50">
                    (฿{simulatingIngredient.costPerBaseUnit.toFixed(4)} / {simulatingIngredient.usageUnit})
                  </div>
                </div>

                <div>
                  <span className="text-[#F27D26] font-bold">ราคาซื้อใหม่ที่จำลอง:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-white/70">฿</span>
                    <NumericInput
                      type="number"
                      step="0.5"
                      value={simulatedNewPrice}
                      onChange={(e) => setSimulatedNewPrice(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-black/40 border-2 border-[#F27D26] rounded-xl font-mono text-base font-bold text-[#F27D26] focus:outline-none"
                    />
                  </div>
                  <div className="text-[11px] text-[#FFC107] font-semibold mt-0.5">
                    (฿{impactAnalysis.newCostPerBaseUnit.toFixed(4)} / {simulatingIngredient.usageUnit})
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-white/80 mb-1">เหตุผลในการปรับราคา:</label>
                <input
                  type="text"
                  value={priceChangeReason}
                  onChange={(e) => setPriceChangeReason(e.target.value)}
                  className="w-full p-2 bg-black/40 border border-white/15 rounded-xl text-white font-medium focus:border-[#F27D26] focus:outline-none"
                  placeholder="เช่น ราคาหน้าฟาร์มขยับขึ้น, น้ำมันแพง..."
                />
              </div>

              {/* Affected Sauces */}
              {impactAnalysis.affectedSauces.length > 0 && (
                <div className="p-3.5 bg-[#FFC107]/10 border border-[#FFC107]/20 rounded-2xl space-y-2">
                  <div className="font-bold text-[#FFC107] text-[11px] uppercase">
                    ซอสที่ได้รับผลกระทบ ({impactAnalysis.affectedSauces.length} รายการ)
                  </div>
                  <div className="space-y-1.5">
                    {impactAnalysis.affectedSauces.map((s) => (
                      <div
                        key={s.sauceId}
                        className="flex items-center justify-between bg-black/30 p-2.5 rounded-xl border border-white/5 font-mono text-xs"
                      >
                        <span className="font-bold text-white">{s.sauceName}</span>
                        <div className="text-right">
                          <span className="text-white/50">฿{s.oldCostPerGram.toFixed(4)}</span>
                          <span className="mx-1.5 text-white/40">→</span>
                          <span className="font-bold text-[#FFC107]">฿{s.newCostPerGram.toFixed(4)}/g</span>
                          <span className="ml-1 text-[10px] text-red-400">
                            (+{s.percentChange.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Affected Menu Variants */}
              <div className="space-y-2">
                <div className="font-bold text-white text-sm">
                  เมนูที่ได้รับผลกระทบ (Affected Menus) ({impactAnalysis.affectedVariants.length} เมนู)
                </div>
                {impactAnalysis.affectedVariants.length === 0 ? (
                  <div className="p-4 text-center text-white/50 bg-white/5 rounded-xl">
                    ไม่มีเมนูใดในระบบที่ใช้หรืออิงวัตถุดิบชิ้นนี้
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {impactAnalysis.affectedVariants.map((v) => (
                      <div
                        key={v.variantId}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">
                            {v.menuName} - {v.variantName}
                          </span>
                          <span className="font-mono font-bold text-white/80">
                            ราคาขาย ฿{v.sellingPrice}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1 border-t border-white/10">
                          <div>
                            <span className="text-white/50">ต้นทุนรวมใหม่:</span>
                            <div className="font-bold text-[#FFC107]">
                              ฿{v.newTotalCost.toFixed(2)}{' '}
                              <span className="text-[10px] text-red-400">
                                (+฿{v.costDiff.toFixed(2)})
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-white/50">กำไรสุทธิใหม่:</span>
                            <div className="font-bold text-green-400">
                              ฿{v.newProfit.toFixed(2)}{' '}
                              <span className="text-[10px] text-red-400">
                                ({v.profitDiff < 0 ? '' : '+'}฿{v.profitDiff.toFixed(2)})
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-white/50">ราคาแนะนำใหม่:</span>
                            <div className="font-bold text-blue-400">
                              ฿{v.newSuggestedPrice.toFixed(0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsImpactModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>

                <button
                  type="button"
                  onClick={handleApplySimulatedPrice}
                  className="px-5 py-2.5 bg-[#F27D26] hover:bg-[#d96817] text-black rounded-xl font-bold shadow-md shadow-[#F27D26]/20 transition-colors cursor-pointer"
                >
                  อนุมัติและปรับใช้ราคาใหม่นี้ (฿{simulatedNewPrice})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
