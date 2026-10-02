import React, { useState } from 'react';
import {
  UtensilsCrossed,
  Search,
  Plus,
  Edit2,
  ChevronRight,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  X,
  TrendingUp,
  Boxes,
  Layers,
  ArrowUpRight,
  SlidersHorizontal,
  Package,
  Trash2,
} from 'lucide-react';
import {
  MenuItem,
  MenuVariant,
  Ingredient,
  Sauce,
  RestaurantSettings,
  RecipeCostBreakdown,
} from '../types';
import {
  calculateVariantCostBreakdown,
  calculateSuggestedPrices,
} from '../services/calculationEngine';
import { NumericInput } from './common/NumericInput';

interface FoodCostViewProps {
  menus: MenuItem[];
  ingredients: Ingredient[];
  sauces: Sauce[];
  settings: RestaurantSettings;
  onSaveMenu: (menu: MenuItem) => void;
  onUpdateVariantPrice: (
    menuId: string,
    variantId: string,
    prices: { sellingPrice: number; takeawayPrice: number; deliveryPrice: number }
  ) => void;
  onNavigateToRecipeBuilder: (variantId: string) => void;
}

export const FoodCostView: React.FC<FoodCostViewProps> = ({
  menus,
  ingredients,
  sauces,
  settings,
  onSaveMenu,
  onUpdateVariantPrice,
  onNavigateToRecipeBuilder,
}) => {
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeChannel, setActiveChannel] = useState<'DINE_IN' | 'GRAB' | 'LINEMAN'>('DINE_IN');
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);

  // Breakdown Modal state
  const [selectedBreakdown, setSelectedBreakdown] = useState<{
    menu: MenuItem;
    variant: MenuVariant;
    breakdown: RecipeCostBreakdown;
  } | null>(null);

  // Edit Menu Modal
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Partial<MenuItem> | null>(null);

  // Suggested Price custom sliders inside modal
  const [customTargetFcPercent, setCustomTargetFcPercent] = useState<number>(
    settings.targetFoodCostPercent || 35
  );

  // Fast maps
  const ingredientsMap = new Map<string, Ingredient>(ingredients.map((i) => [i.id, i]));
  const saucesMap = new Map<string, Sauce>(sauces.map((s) => [s.id, s]));

  const categories = ['ALL', ...Array.from(new Set(menus.map((m) => m.category)))];

  // Build rows of all variants
  const allRows: Array<{
    menu: MenuItem;
    variant: MenuVariant;
    breakdown: RecipeCostBreakdown;
  }> = [];

  menus.forEach((menu) => {
    menu.variants.forEach((variant) => {
      const breakdown = calculateVariantCostBreakdown(
        variant,
        menu.name,
        ingredientsMap,
        saucesMap,
        settings,
        activeChannel === 'LINEMAN' ? 'lineman' : 'grab'
      );
      allRows.push({ menu, variant, breakdown });
    });
  });

  // Filter & Search
  const filteredRows = allRows.filter(({ menu, variant }) => {
    const matchesCategory =
      selectedCategory === 'ALL' || menu.category === selectedCategory;
    const matchesSearch =
      menu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variant.proteinType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredMenus = menus.filter((m) => {
    const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.variants.some((v) => v.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Calculate high-level stats
  const totalVariantsCount = allRows.length;
  const avgFoodCostPercent =
    totalVariantsCount > 0
      ? allRows.reduce((acc, r) => acc + r.breakdown.restaurantFoodCostPercent, 0) / totalVariantsCount
      : 0;
  const warningCount = allRows.filter(
    (r) => r.breakdown.restaurantFoodCostPercent > 40 || r.breakdown.hasReviewIssue
  ).length;

  const handleOpenAddMenu = () => {
    const newMenu: Partial<MenuItem> = {
      id: `menu_${Date.now()}`,
      name: '',
      category: 'ผัดและกะเพรา',
      variants: [
        {
          id: `var_${Date.now()}_1`,
          menuId: `menu_${Date.now()}`,
          name: 'ธรรมดา',
          proteinType: 'หมูสับ',
          sellingPrice: 60,
          takeawayPrice: 65,
          deliveryPrice: 85,
          overheadCost: 6.0,
          recipeItems: [],
          active: true,
        },
      ],
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingMenu(newMenu);
    setIsMenuModalOpen(true);
  };

  const handleOpenEditMenu = (menu: MenuItem) => {
    setEditingMenu(JSON.parse(JSON.stringify(menu)));
    setIsMenuModalOpen(true);
  };

  const handleSaveMenuModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMenu || !editingMenu.name) return;

    const finalMenu: MenuItem = {
      id: editingMenu.id || `menu_${Date.now()}`,
      name: editingMenu.name.trim(),
      category: editingMenu.category || 'ผัดและกะเพรา',
      displayOrder: editingMenu.displayOrder || 1,
      variants: editingMenu.variants || [],
      active: editingMenu.active !== undefined ? editingMenu.active : true,
      description: editingMenu.description,
      createdAt: editingMenu.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveMenu(finalMenu);
    setIsMenuModalOpen(false);
  };

  // Packaging Line Items Management for Sub-Items
  const handleAddPackagingLine = () => {
    if (!selectedBreakdown) return;
    const { menu, variant } = selectedBreakdown;
    const currentItems = variant.packagingItems ? [...variant.packagingItems] : [];
    const newLine = {
      id: `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: 'กล่องข้าว',
      cost: 5.0,
    };
    const updatedItems = [...currentItems, newLine];
    const totalPkgCost = updatedItems.reduce((acc, it) => acc + (Number(it.cost) || 0), 0);

    const updatedVariant: MenuVariant = {
      ...variant,
      packagingItems: updatedItems,
      packagingCost: totalPkgCost,
    };

    const updatedMenu: MenuItem = {
      ...menu,
      variants: menu.variants.map((v) => (v.id === variant.id ? updatedVariant : v)),
      updatedAt: new Date().toISOString(),
    };

    const updatedBreakdown = calculateVariantCostBreakdown(
      updatedVariant,
      updatedMenu.name,
      ingredientsMap,
      saucesMap,
      settings,
      activeChannel === 'LINEMAN' ? 'lineman' : 'grab'
    );

    onSaveMenu(updatedMenu);
    setSelectedBreakdown({
      menu: updatedMenu,
      variant: updatedVariant,
      breakdown: updatedBreakdown,
    });
  };

  const handleUpdatePackagingLine = (index: number, field: 'name' | 'cost', value: any) => {
    if (!selectedBreakdown) return;
    const { menu, variant } = selectedBreakdown;
    const currentItems = variant.packagingItems ? [...variant.packagingItems] : [];
    if (!currentItems[index]) return;

    currentItems[index] = {
      ...currentItems[index],
      [field]: value,
    };
    const totalPkgCost = currentItems.reduce((acc, it) => acc + (Number(it.cost) || 0), 0);

    const updatedVariant: MenuVariant = {
      ...variant,
      packagingItems: currentItems,
      packagingCost: totalPkgCost,
    };

    const updatedMenu: MenuItem = {
      ...menu,
      variants: menu.variants.map((v) => (v.id === variant.id ? updatedVariant : v)),
      updatedAt: new Date().toISOString(),
    };

    const updatedBreakdown = calculateVariantCostBreakdown(
      updatedVariant,
      updatedMenu.name,
      ingredientsMap,
      saucesMap,
      settings,
      activeChannel === 'LINEMAN' ? 'lineman' : 'grab'
    );

    onSaveMenu(updatedMenu);
    setSelectedBreakdown({
      menu: updatedMenu,
      variant: updatedVariant,
      breakdown: updatedBreakdown,
    });
  };

  const handleDeletePackagingLine = (index: number) => {
    if (!selectedBreakdown) return;
    const { menu, variant } = selectedBreakdown;
    const currentItems = variant.packagingItems ? [...variant.packagingItems] : [];
    const updatedItems = currentItems.filter((_, i) => i !== index);
    const totalPkgCost = updatedItems.reduce((acc, it) => acc + (Number(it.cost) || 0), 0);

    const updatedVariant: MenuVariant = {
      ...variant,
      packagingItems: updatedItems,
      packagingCost: totalPkgCost,
    };

    const updatedMenu: MenuItem = {
      ...menu,
      variants: menu.variants.map((v) => (v.id === variant.id ? updatedVariant : v)),
      updatedAt: new Date().toISOString(),
    };

    const updatedBreakdown = calculateVariantCostBreakdown(
      updatedVariant,
      updatedMenu.name,
      ingredientsMap,
      saucesMap,
      settings,
      activeChannel === 'LINEMAN' ? 'lineman' : 'grab'
    );

    onSaveMenu(updatedMenu);
    setSelectedBreakdown({
      menu: updatedMenu,
      variant: updatedVariant,
      breakdown: updatedBreakdown,
    });
  };

  // Check if a breakdown has seafood
  const isSeafoodVariant = (breakdown: RecipeCostBreakdown) => {
    return breakdown.shrimpCost > 0 || breakdown.squidCost > 0 || breakdown.seafoodTotalCost > 0;
  };

  // Grab & LINE MAN commission calculations
  const grabCommissionPct = settings.grabFoodCommissionPercent ?? 30;
  const linemanCommissionPct = settings.lineManCommissionPercent ?? 25;

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-[#F27D26]" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              ต้นทุนอาหาร (Food Cost & Menu Management)
            </h1>
          </div>
          <p className="text-xs text-white/60 mt-0.5">
            รวมศูนย์จัดการเมนูอาหารและวิเคราะห์ต้นทุนวัตถุดิบ (Food Cost %), กำไรขั้นต้น (GP), และกฎคำนวณอาหารทะเล
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Toggle */}
          <div className="flex bg-black/40 border border-white/15 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'CARDS'
                  ? 'bg-[#F27D26] text-black shadow-md shadow-[#F27D26]/20'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              การ์ดเมนู (Menu Cards)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'bg-[#F27D26] text-black shadow-md shadow-[#F27D26]/20'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              ตารางวิเคราะห์ต้นทุน (Cost Table)
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenAddMenu}
            className="px-4 py-2.5 bg-[#F27D26] hover:bg-[#d96817] text-black font-bold rounded-xl text-xs shadow-lg shadow-[#F27D26]/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มเมนูใหม่</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl">
          <span className="text-xs font-bold text-white/50 uppercase block">จำนวนเมนูหลัก</span>
          <div className="text-2xl font-bold text-white mt-1 font-mono">{menus.length} เมนู</div>
          <span className="text-xs text-white/40 mt-1 block">ครอบคลุม {totalVariantsCount} ตัวเลือก</span>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl">
          <span className="text-xs font-bold text-white/50 uppercase block">Food Cost เฉลี่ยหน้าร้าน</span>
          <div className="text-2xl font-bold text-[#FFC107] mt-1 font-mono">
            {avgFoodCostPercent.toFixed(1)}%
          </div>
          <span className="text-xs text-white/40 mt-1 block">
            เป้าหมายร้าน: {settings.targetFoodCostPercent || 35}%
          </span>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl">
          <span className="text-xs font-bold text-white/50 uppercase block">เมนูต้นทุนสูง / ควรทบทวน</span>
          <div className="text-2xl font-bold text-rose-400 mt-1 font-mono">
            {warningCount} รายการ
          </div>
          <span className="text-xs text-white/40 mt-1 block">Food Cost &gt; 40% หรือสูตรไม่สมบูรณ์</span>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl">
          <span className="text-xs font-bold text-white/50 uppercase block">กฎอาหารทะเล (Seafood Rule)</span>
          <div className="text-sm font-bold text-emerald-400 mt-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>แยกกุ้ง (ตัว) & หมึก (g) อิสระ</span>
          </div>
          <span className="text-xs text-white/40 mt-1 block">ห้ามรวมเป็น 'ทะเล' รายการเดียว</span>
        </div>
      </div>

      {/* Filter and Channel selector */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search & Category */}
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="ค้นหาชื่อเมนู, วัตถุดิบ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#F27D26]"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === c
                    ? 'bg-[#F27D26] text-black'
                    : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
                }`}
              >
                {c === 'ALL' ? 'ทุกหมวดหมู่' : c}
              </button>
            ))}
          </div>
        </div>

        {/* Channel selector (หน้าร้าน / Grab / LINE MAN) */}
        <div className="flex items-center gap-1.5 bg-black/40 border border-white/15 p-1 rounded-2xl self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveChannel('DINE_IN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeChannel === 'DINE_IN'
                ? 'bg-[#F27D26] text-black font-bold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            หน้าร้าน
          </button>
          <button
            type="button"
            onClick={() => setActiveChannel('GRAB')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeChannel === 'GRAB'
                ? 'bg-[#00B14F] text-white font-bold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            GrabFood ({grabCommissionPct}%)
          </button>
          <button
            type="button"
            onClick={() => setActiveChannel('LINEMAN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeChannel === 'LINEMAN'
                ? 'bg-[#06C755] text-white font-bold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            LINE MAN ({linemanCommissionPct}%)
          </button>
        </div>
      </div>

      {/* VIEW 1: CLEAN MENU LIST + ON-DEMAND VARIANT DETAILS */}
      {viewMode === 'CARDS' && (
        <div className="space-y-4">
          {/* Menu names only — one per row */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">รายการเมนูอาหาร</h2>
                <p className="text-[10px] text-white/40 mt-0.5">เลือกเมนูเพื่อดูตัวเลือกเนื้อสัตว์และรายละเอียดต้นทุน</p>
              </div>
              <span className="text-[10px] font-mono text-white/35">{filteredMenus.length} เมนู</span>
            </div>

            <div className="divide-y divide-white/5">
              {filteredMenus.map((menu) => {
                const isSelected = selectedMenuId === menu.id;
                const menuRows = isSelected ? allRows.filter((r) => r.menu.id === menu.id) : [];

                return (
                  <React.Fragment key={menu.id}>
                    <div
                      className={`group flex items-center gap-3 px-5 py-4 transition-all ${
                        isSelected ? 'bg-[#F27D26]/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedMenuId(isSelected ? null : menu.id)}
                        className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer"
                      >
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-[#F27D26]/15 border-[#F27D26]/30 text-[#F27D26]'
                            : 'bg-white/5 border-white/10 text-white/45'
                        }`}>
                          <UtensilsCrossed className="w-4 h-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-white truncate">{menu.name}</span>
                        </span>
                        <ChevronRight className={`w-4 h-4 ml-auto shrink-0 transition-transform ${
                          isSelected ? 'rotate-90 text-[#F27D26]' : 'text-white/30'
                        }`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditMenu(menu)}
                        className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                        title="แก้ไขเมนู"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Inline accordion detail panel directly beneath this menu row */}
                    {isSelected && (
                      <div className="bg-black/30 border-t border-b border-white/10 overflow-hidden shadow-inner">
                        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between gap-3 bg-white/5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-white truncate">{menu.name}</h3>
                              <span className="text-[9px] px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/45 shrink-0">
                                {menuRows.length} ตัวเลือก
                              </span>
                            </div>
                            <p className="text-[10px] text-white/40 mt-0.5">ตารางวิเคราะห์ต้นทุนตัวเลือกเนื้อสัตว์ (คลิกที่แถวเพื่อเปิดดู/แก้ไขแพ็กเกจจิ้ง)</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedMenuId(null)}
                            className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                            title="ปิดรายละเอียด"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Compact Spreadsheet Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-white/5 border-b border-white/10 text-white/50 font-semibold text-[10px] uppercase tracking-wider">
                                <th className="py-2.5 px-4 font-sans">ชื่อเมนูย่อย / Sub-item</th>
                                <th className="py-2.5 px-3 text-right">ราคาขาย</th>
                                <th className="py-2.5 px-3 text-right">Food Cost</th>
                                <th className="py-2.5 px-3 text-right">FC %</th>
                                <th className="py-2.5 px-3 text-right">โสหุ้ย</th>
                                <th className="py-2.5 px-3 text-right text-[#00B1FF]">แพ็กเกจจิ้ง</th>
                                <th className="py-2.5 px-3 text-right">ต้นทุนรวม</th>
                                <th className="py-2.5 px-3 text-right">กำไร</th>
                                <th className="py-2.5 px-3 text-center w-8"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono text-xs">
                              {menuRows.map(({ variant, breakdown }, idx) => {
                                const profit = breakdown.restaurantProfit;
                                const foodCost = breakdown.totalIngredientCost;
                                const pkgCost = breakdown.packagingCost || 0;
                                const isHighCost = breakdown.restaurantFoodCostPercent > 40;
                                const isEven = idx % 2 === 0;

                                return (
                                  <tr
                                    key={variant.id}
                                    onClick={() => setSelectedBreakdown({ menu, variant, breakdown })}
                                    className={`cursor-pointer transition-colors group ${
                                      isEven ? 'bg-black/20' : 'bg-transparent'
                                    } hover:bg-[#F27D26]/15`}
                                  >
                                    <td className="py-2.5 px-4 font-sans font-medium text-white">
                                      <div className="flex items-center gap-1.5">
                                        <span className="truncate group-hover:text-[#F27D26] transition-colors font-medium">
                                          {variant.name || variant.proteinType}
                                        </span>
                                        {isSeafoodVariant(breakdown) && (
                                          <span className="text-[8px] px-1.5 py-0.2 rounded bg-[#F27D26]/20 text-[#F27D26] font-bold shrink-0">
                                            ทะเล
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-bold text-[#FFC107]">
                                      ฿{variant.sellingPrice.toLocaleString()}
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-white/80">
                                      ฿{foodCost.toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-bold">
                                      <span className={isHighCost ? 'text-rose-400' : 'text-emerald-400'}>
                                        {breakdown.restaurantFoodCostPercent.toFixed(1)}%
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-white/70">
                                      ฿{breakdown.overheadCost.toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-semibold text-[#00B1FF]">
                                      ฿{pkgCost.toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-bold text-white">
                                      ฿{breakdown.totalCost.toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-bold">
                                      <span className={profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                        ฿{profit.toFixed(2)}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center text-white/30 group-hover:text-white transition-colors">
                                      <ChevronRight className="w-3.5 h-3.5 inline-block group-hover:translate-x-0.5 transition-transform" />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="px-5 py-2.5 text-[10px] text-white/35 flex items-center justify-between border-t border-white/5 bg-black/20">
                          <span>💡 คลิกแถวเพื่อเปิดรายละเอียดการคำนวณและจัดการแพ็กเกจจิ้งของเมนูย่อย</span>
                          <span className="font-mono">{menuRows.length} รายการ</span>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: COMPREHENSIVE COSTING TABLE */}
      {viewMode === 'TABLE' && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-white/50 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">เมนูอาหาร / ตัวเลือก</th>
                  <th className="py-3.5 px-3">หมวดหมู่</th>
                  <th className="py-3.5 px-3 text-right">ราคาขาย</th>
                  <th className="py-3.5 px-3 text-right">ต้นทุนรวม (฿)</th>
                  <th className="py-3.5 px-3 text-right">Food Cost %</th>
                  <th className="py-3.5 px-3 text-right">กำไรขั้นต้น (GP)</th>
                  <th className="py-3.5 px-3 text-center">สถานะ</th>
                  <th className="py-3.5 px-4 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filteredRows.map(({ menu, variant, breakdown }) => {
                  // Determine price & profit based on activeChannel
                  let displayPrice = variant.sellingPrice;
                  let displayProfit = breakdown.restaurantProfit;
                  let displayFcPercent = breakdown.restaurantFoodCostPercent;

                  if (activeChannel === 'GRAB' || activeChannel === 'LINEMAN') {
                    displayPrice = variant.deliveryPrice;
                    displayProfit = breakdown.deliveryProfit;
                    displayFcPercent = breakdown.deliveryFoodCostPercent;
                  }

                  const isHighCost = displayFcPercent > 40;

                  return (
                    <tr key={variant.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-sans font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{menu.name}</span>
                          <span className="text-white/40">({variant.name})</span>
                          {isSeafoodVariant(breakdown) && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#F27D26]/20 text-[#F27D26] font-bold">
                              Seafood Rule
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-sans text-white/60">{menu.category}</td>

                      <td className="py-3.5 px-3 text-right font-bold text-[#FFC107] text-sm">
                        ฿{displayPrice.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-white">
                        ฿{breakdown.totalCost.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <span
                          className={`font-bold ${
                            isHighCost ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {displayFcPercent.toFixed(1)}%
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-white">
                        ฿{displayProfit.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        {isHighCost ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-900 border border-rose-500/30">
                            ต้นทุนสูง
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-900 border border-emerald-500/30">
                            ปกติ
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedBreakdown({ menu, variant, breakdown })}
                            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
                          >
                            ดูต้นทุน
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigateToRecipeBuilder(variant.id)}
                            className="p-1 rounded-xl text-[#F27D26] hover:bg-[#F27D26]/20 cursor-pointer"
                            title="แก้สูตร"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL COST BREAKDOWN MODAL (Includes Seafood Rule Breakdown) */}
      {selectedBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-[#FFFDF9] rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#EAE4D9] text-[#1C1917] max-h-[90vh] overflow-y-auto scrollbar-thin">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-lg">
                    {selectedBreakdown.menu.name} ({selectedBreakdown.variant.name})
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/70">
                    {selectedBreakdown.menu.category}
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-0.5">
                  รายละเอียดการคำนวณต้นทุนต่อจานอย่างละเอียด (Deterministic Costing)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBreakdown(null)}
                className="p-1 rounded-xl text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 mt-4 text-xs">
              {/* SEAFOOD RULE HIGHLIGHT CARD */}
              {isSeafoodVariant(selectedBreakdown.breakdown) && (
                <div className="bg-[#F27D26]/10 border border-[#F27D26]/30 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#F27D26] mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Seafood Rule: คำนวณกุ้งและปลาหมึกแยกจากกันเด็ดขาด</span>
                  </div>
                  <p className="text-[11px] text-white/70 mb-3">
                    ตามกฎความถูกต้องทางบัญชีของร้าน: กุ้งต้องคำนวณเป็น 'ตัว' และปลาหมึกต้องคำนวณเป็น 'กรัม'
                    (ห้ามรวมเป็น 'ทะเล' รายการเดียว หรือใช้การประมาณ)
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                    <div className="bg-black/40 p-3 rounded-xl border border-white/10">
                      <span className="text-[11px] font-sans text-white/60 block">🦐 กุ้งสด</span>
                      <span className="text-base font-bold text-white mt-1 block">
                        ฿{selectedBreakdown.breakdown.shrimpCost.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-white/40">คิดเป็นตัว (ไม่แปลงเป็นกรัม)</span>
                    </div>

                    <div className="bg-black/40 p-3 rounded-xl border border-white/10">
                      <span className="text-[11px] font-sans text-white/60 block">🦑 ปลาหมึกสด</span>
                      <span className="text-base font-bold text-white mt-1 block">
                        ฿{selectedBreakdown.breakdown.squidCost.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-white/40">
                        คิดเป็นกรัม (คำนวณ Yield ลอกหนัง 65%)
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-white/10 flex justify-between font-mono text-xs">
                    <span className="font-sans text-white/60">รวมต้นทุนอาหารทะเลทั้งจาน:</span>
                    <span className="font-bold text-[#FFC107]">
                      ฿{selectedBreakdown.breakdown.seafoodTotalCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Recipe Items Breakdown Table */}
              <div>
                <span className="font-bold text-white/80 block mb-2">
                  ส่วนประกอบและวัตถุดิบในจาน (Recipe Items)
                </span>
                <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-white/50 text-[10px] uppercase">
                        <th className="py-2.5 px-3">วัตถุดิบ / ส่วนประกอบ</th>
                        <th className="py-2.5 px-2">ประเภท</th>
                        <th className="py-2.5 px-2 text-right">ปริมาณ</th>
                        <th className="py-2.5 px-2 text-right">ต้นทุน/หน่วย</th>
                        <th className="py-2.5 px-3 text-right">รวมเงิน (฿)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {selectedBreakdown.breakdown.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="py-2 px-3 font-sans text-white font-medium">
                            {item.name}
                          </td>
                          <td className="py-2 px-2 font-sans text-white/50 text-[10px]">
                            {item.type === 'SAUCE' ? 'ซอส' : 'วัตถุดิบ'}
                          </td>
                          <td className="py-2 px-2 text-right text-white/80">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2 px-2 text-right text-white/60">
                            ฿{(item.calculatedUnitCost || 0).toFixed(4)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-white">
                            ฿{(item.calculatedLineCost || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Packaging Line Items Card (Scoped per sub-item) */}
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#00B1FF]" />
                    <span className="font-bold text-white text-xs">
                      ต้นทุนกล่อง & บรรจุภัณฑ์ (Packaging Items)
                    </span>
                    <span className="text-[10px] text-white/50">
                      (กำหนดเฉพาะตัวเลือกนี้)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPackagingLine}
                    className="px-2.5 py-1 bg-[#00B1FF]/20 hover:bg-[#00B1FF]/30 border border-[#00B1FF]/40 text-[#00B1FF] rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ เพิ่มแพ็กเกจจิ้ง</span>
                  </button>
                </div>

                {(!selectedBreakdown.variant.packagingItems || selectedBreakdown.variant.packagingItems.length === 0) ? (
                  <div className="p-3 text-center text-white/40 text-xs border border-dashed border-white/10 rounded-xl">
                    ยังไม่มีรายการแพ็กเกจจิ้ง (กดปุ่ม "+ เพิ่มแพ็กเกจจิ้ง" ด้านบนเพื่อระบุ เช่น กล่องข้าว, ถุงพลาสติก, ช้อนส้อม)
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedBreakdown.variant.packagingItems.map((pkg, pIdx) => (
                      <div key={pkg.id || pIdx} className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10">
                        {/* Packaging Name with common datalist */}
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            list={`pkg-common-${pIdx}`}
                            value={pkg.name}
                            placeholder="ชื่อแพ็กเกจจิ้ง เช่น กล่องข้าว, ถุงหิ้ว"
                            onChange={(e) => handleUpdatePackagingLine(pIdx, 'name', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-black/50 border border-white/15 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#00B1FF]"
                          />
                          <datalist id={`pkg-common-${pIdx}`}>
                            <option value="กล่องข้าว" />
                            <option value="กล่องกระดาษรักษ์โลก" />
                            <option value="ถุงพลาสติกหิ้ว" />
                            <option value="ถุงกระดาษ" />
                            <option value="ชุดช้อนส้อมพลาสติก" />
                            <option value="กระปุกน้ำจิ้ม / ถ้วยซอส" />
                            <option value="กระดาษทิชชู่ / สติกเกอร์" />
                          </datalist>
                        </div>

                        {/* Price */}
                        <div className="w-28 relative">
                          <NumericInput
                            type="number"
                            step="0.25"
                            min="0"
                            value={pkg.cost || ''}
                            placeholder="0.00"
                            onChange={(e) => handleUpdatePackagingLine(pIdx, 'cost', parseFloat(e.target.value) || 0)}
                            className="w-full pl-2 pr-6 py-1.5 bg-black/50 border border-white/15 rounded-lg text-xs font-mono font-bold text-white text-right focus:outline-none focus:border-[#00B1FF]"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/40 font-bold">
                            บาท
                          </span>
                        </div>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => handleDeletePackagingLine(pIdx)}
                          className="p-1.5 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <div className="flex justify-between items-center px-3 py-2 bg-[#00B1FF]/10 border border-[#00B1FF]/20 rounded-xl text-xs font-mono">
                      <span className="font-sans text-white/70 font-semibold">โสหุ้ยแพ็กเกจจิ้งรวม (Total packaging cost):</span>
                      <span className="font-bold text-[#00B1FF] text-sm">
                        ฿{(selectedBreakdown.breakdown.packagingCost || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Cost Summary Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 font-mono">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-sans text-white/50 block">ต้นทุนวัตถุดิบรวม</span>
                  <span className="text-base font-bold text-white block mt-1">
                    ฿{selectedBreakdown.breakdown.totalIngredientCost.toFixed(2)}
                  </span>
                </div>

                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-sans text-white/50 block">ค่าโสหุ้ยต่อจาน</span>
                  <span className="text-base font-bold text-white block mt-1">
                    ฿{selectedBreakdown.breakdown.overheadCost.toFixed(2)}
                  </span>
                </div>

                <div className="bg-white/5 p-3 rounded-2xl border border-[#00B1FF]/30">
                  <span className="text-[10px] font-sans text-[#00B1FF] block">แพ็กเกจจิ้งรวม</span>
                  <span className="text-base font-bold text-[#00B1FF] block mt-1">
                    ฿{(selectedBreakdown.breakdown.packagingCost || 0).toFixed(2)}
                  </span>
                </div>

                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-sans text-white/50 block">ต้นทุนรวมสุทธิ</span>
                  <span className="text-base font-bold text-[#FFC107] block mt-1">
                    ฿{selectedBreakdown.breakdown.totalCost.toFixed(2)}
                  </span>
                </div>

                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-sans text-white/50 block">Food Cost หน้าร้าน</span>
                  <span
                    className={`text-base font-bold block mt-1 ${
                      selectedBreakdown.breakdown.restaurantFoodCostPercent > 40
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {selectedBreakdown.breakdown.restaurantFoodCostPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Delivery Channel Split Details (GrabFood vs LINE MAN) */}
              {(() => {
                const pkgCostToUse =
                  (selectedBreakdown.breakdown.packagingCost || 0) > 0
                    ? selectedBreakdown.breakdown.packagingCost
                    : (settings.deliveryPackagingCost || 8);
                const baseCost =
                  selectedBreakdown.breakdown.totalIngredientCost +
                  selectedBreakdown.breakdown.overheadCost;
                const grabProfit =
                  selectedBreakdown.variant.deliveryPrice -
                  selectedBreakdown.variant.deliveryPrice * (grabCommissionPct / 100) -
                  baseCost -
                  pkgCostToUse;
                const linemanProfit =
                  selectedBreakdown.variant.deliveryPrice -
                  selectedBreakdown.variant.deliveryPrice * (linemanCommissionPct / 100) -
                  baseCost -
                  pkgCostToUse;

                return (
                  <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                    <span className="font-bold text-white/80 block mb-2 font-sans">
                      เปรียบเทียบกำไรสุทธิแยกตามช่องทาง Delivery
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                      {/* GrabFood Card */}
                      <div className="p-3 rounded-xl bg-white/5 border border-[#00B14F]/30">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-sans font-bold text-[#00B14F]">GrabFood</span>
                          <span className="text-[10px] text-white/50">GP {grabCommissionPct}%</span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="font-sans text-white/60">ราคาขาย:</span>
                            <span className="text-white font-bold">
                              ฿{selectedBreakdown.variant.deliveryPrice}
                            </span>
                          </div>
                          <div className="flex justify-between text-rose-400">
                            <span className="font-sans text-white/60">หัก GP ({grabCommissionPct}%):</span>
                            <span>
                              -฿
                              {(
                                selectedBreakdown.variant.deliveryPrice *
                                (grabCommissionPct / 100)
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-rose-400">
                            <span className="font-sans text-white/60">ค่ากล่อง Delivery:</span>
                            <span>-฿{pkgCostToUse.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-white/10 font-bold">
                            <span className="font-sans text-white/80">กำไรสุทธิหลัง GP:</span>
                            <span className="text-emerald-400">
                              ฿{grabProfit.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* LINE MAN Card */}
                      <div className="p-3 rounded-xl bg-white/5 border border-[#06C755]/30">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-sans font-bold text-[#06C755]">LINE MAN</span>
                          <span className="text-[10px] text-white/50">GP {linemanCommissionPct}%</span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="font-sans text-white/60">ราคาขาย:</span>
                            <span className="text-white font-bold">
                              ฿{selectedBreakdown.variant.deliveryPrice}
                            </span>
                          </div>
                          <div className="flex justify-between text-rose-400">
                            <span className="font-sans text-white/60">หัก GP ({linemanCommissionPct}%):</span>
                            <span>
                              -฿
                              {(
                                selectedBreakdown.variant.deliveryPrice *
                                (linemanCommissionPct / 100)
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-rose-400">
                            <span className="font-sans text-white/60">ค่ากล่อง Delivery:</span>
                            <span>-฿{pkgCostToUse.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-white/10 font-bold">
                            <span className="font-sans text-white/80">กำไรสุทธิหลัง GP:</span>
                            <span className="text-emerald-400">
                              ฿{linemanProfit.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Dynamic Suggested Price by Target Food Cost */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white/80 font-sans">
                    💡 เครื่องคำนวณราคาขายแนะนำ (Suggested Price Calculator)
                  </span>
                  <span className="font-mono text-[#FFC107] font-bold">
                    เป้าหมาย FC: {customTargetFcPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="55"
                  step="1"
                  value={customTargetFcPercent}
                  onChange={(e) => setCustomTargetFcPercent(Number(e.target.value))}
                  className="w-full accent-[#F27D26]"
                />
                <div className="mt-2 flex items-center justify-between text-xs font-mono">
                  <span className="font-sans text-white/60">
                    ราคาขายหน้าร้านที่แนะนำ (เพื่อให้ได้ FC {customTargetFcPercent}%):
                  </span>
                  <span className="text-base font-bold text-[#FFC107]">
                    ฿{(selectedBreakdown.breakdown.totalCost / (customTargetFcPercent / 100)).toFixed(0)} บาท
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    const variantId = selectedBreakdown.variant.id;
                    setSelectedBreakdown(null);
                    onNavigateToRecipeBuilder(variantId);
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>ไปที่หน้าปรับแต่งสูตรอาหาร</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedBreakdown(null)}
                  className="px-5 py-2 bg-[#F27D26] hover:bg-[#d96817] text-black font-bold rounded-xl cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MENU MODAL */}
      {isMenuModalOpen && editingMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-[#FFFDF9] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#EAE4D9] text-[#1C1917]">
            <div className="flex items-center justify-between border-b border-[#EAE4D9] pb-3">
              <h3 className="font-bold text-[#1C1917] text-base">
                {editingMenu.id?.startsWith('menu_') && !menus.find((m) => m.id === editingMenu.id)
                  ? 'เพิ่มเมนูใหม่'
                  : 'แก้ไขข้อมูลเมนู'}
              </h3>
              <button
                type="button"
                onClick={() => setIsMenuModalOpen(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMenuModal} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-stone-700 mb-1 font-semibold">ชื่อเมนูอาหาร</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ข้าวกะเพราโบราณ, ข้าวผัดพริกเผา"
                  value={editingMenu.name || ''}
                  onChange={(e) => setEditingMenu({ ...editingMenu, name: e.target.value })}
                  className="w-full p-2.5 bg-white border border-[#D6CEBE] rounded-xl text-stone-900 focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-stone-700 mb-1 font-semibold">หมวดหมู่อาหาร</label>
                <select
                  value={editingMenu.category || 'ผัดและกะเพรา'}
                  onChange={(e) => setEditingMenu({ ...editingMenu, category: e.target.value })}
                  className="w-full p-2.5 bg-white border border-[#D6CEBE] rounded-xl text-stone-900 focus:outline-none focus:border-[#F27D26]"
                >
                  <option value="ผัดและกะเพรา">ผัดและกะเพรา</option>
                  <option value="ทอดและกระเทียม">ทอดและกระเทียม</option>
                  <option value="ต้มยำและแกง">ต้มยำและแกง</option>
                  <option value="ข้าวผัดและเส้น">ข้าวผัดและเส้น</option>
                  <option value="ทานเล่นและเครื่องดื่ม">ทานเล่นและเครื่องดื่ม</option>
                </select>
              </div>

              {/* Variants Price editor */}
              <div>
                <label className="block text-stone-700 mb-1 font-semibold">
                  ตัวเลือกเมนูและราคาขาย
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(editingMenu.variants || []).map((v, idx) => (
                    <div
                      key={v.id || idx}
                      className="p-3 bg-[#FAF8F5] border border-[#EAE4D9] rounded-xl space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-stone-900">{v.name} ({v.proteinType})</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-stone-500 block font-medium">หน้าร้าน (฿)</label>
                          <NumericInput
                            type="number"
                            min="0"
                            value={v.sellingPrice}
                            onChange={(e) => {
                              const updated = [...(editingMenu.variants || [])];
                              updated[idx] = {
                                ...updated[idx],
                                sellingPrice: parseFloat(e.target.value) || 0,
                              };
                              setEditingMenu({ ...editingMenu, variants: updated });
                            }}
                            className="w-full p-1.5 bg-white border border-[#D6CEBE] rounded-lg text-stone-900 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-stone-500 block font-medium">กลับบ้าน (฿)</label>
                          <NumericInput
                            type="number"
                            min="0"
                            value={v.takeawayPrice}
                            onChange={(e) => {
                              const updated = [...(editingMenu.variants || [])];
                              updated[idx] = {
                                ...updated[idx],
                                takeawayPrice: parseFloat(e.target.value) || 0,
                              };
                              setEditingMenu({ ...editingMenu, variants: updated });
                            }}
                            className="w-full p-1.5 bg-white border border-[#D6CEBE] rounded-lg text-stone-900 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-stone-500 block font-medium">Delivery (฿)</label>
                          <NumericInput
                            type="number"
                            min="0"
                            value={v.deliveryPrice}
                            onChange={(e) => {
                              const updated = [...(editingMenu.variants || [])];
                              updated[idx] = {
                                ...updated[idx],
                                deliveryPrice: parseFloat(e.target.value) || 0,
                              };
                              setEditingMenu({ ...editingMenu, variants: updated });
                            }}
                            className="w-full p-1.5 bg-white border border-[#D6CEBE] rounded-lg text-stone-900 font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#EAE4D9]">
                <button
                  type="button"
                  onClick={() => setIsMenuModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-stone-700 font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F27D26] hover:bg-[#d96817] text-white font-bold rounded-xl shadow-lg shadow-[#F27D26]/20 cursor-pointer"
                >
                  บันทึกเมนู
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
