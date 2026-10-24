import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { IngredientsView } from './components/IngredientsView';
import { SaucesView } from './components/SaucesView';
import { FoodCostView } from './components/FoodCostView';
import { MenusView } from './components/MenusView';
import { MenuCostingView } from './components/MenuCostingView';
import { RecipeBuilderView } from './components/RecipeBuilderView';
import { QuickCostCalculatorView } from './components/QuickCostCalculatorView';
import { SettingsView } from './components/SettingsView';
import { BreakEvenView } from './components/Financials/BreakEvenView';
import { AlertTriangle } from 'lucide-react';
import { ExpensesView } from './components/Financials/ExpensesView';
import { SalesEntryView } from './components/Financials/SalesEntryView';
import { DailySalesRecord, SalesChannel, Employee as DomainEmployee } from './types/domain';
import { upsertDailySalesRecord } from './engine/calculations';
import { AppIconModal } from './components/common/AppIconModal';
import { AppIconService } from './services/appIconService';

import {
  RestaurantSettings,
  Ingredient,
  Sauce,
  MenuItem,
  Supplier,
  InventoryItem,
  InventoryTransaction,
  PurchaseRecord,
  PriceHistoryRecord,
  ExpenseRecord,
  SaleOrder,
  WasteRecord,
  RecipeItem,
} from './types';
import { StorageService } from './services/storageService';
import { calculateIngredientCost } from './services/calculationEngine';

export default function App() {
  // 1. Persistent State loaded via StorageService
  const [settings, setSettings] = useState<RestaurantSettings>(() =>
    StorageService.getSettings()
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>(() =>
    StorageService.getIngredients()
  );
  const [sauces, setSauces] = useState<Sauce[]>(() => StorageService.getSauces());
  const [menus, setMenus] = useState<MenuItem[]>(() => StorageService.getMenus());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
    StorageService.getSuppliers()
  );
  const [inventory, setInventory] = useState<InventoryItem[]>(() =>
    StorageService.getInventory()
  );
  const [inventoryTransactions, setInventoryTransactions] = useState<
    InventoryTransaction[]
  >(() => StorageService.getInventoryTransactions());
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() =>
    StorageService.getPurchases()
  );
  const [priceHistory, setPriceHistory] = useState<PriceHistoryRecord[]>(() =>
    StorageService.getPriceHistory()
  );
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() =>
    StorageService.getExpenses()
  );
  const [salesOrders, setSalesOrders] = useState<SaleOrder[]>(() =>
    StorageService.getSalesOrders()
  );
  const [wasteLog, setWasteLog] = useState<WasteRecord[]>(() =>
    StorageService.getWasteLog()
  );

  const defaultSalesChannels: SalesChannel[] = [
    { id: 'dine-in', code: 'DINE_IN', name: 'หน้าร้าน (Dine-in)', commissionPercent: 0, paymentFeePercent: 0, fixedFeePerOrder: 0, packagingFeeSurcharge: 0, taxOnCommissionPercent: 7, active: true },
    { id: 'takeaway', code: 'TAKEAWAY', name: 'สั่งกลับบ้าน (Takeaway)', commissionPercent: 0, paymentFeePercent: 0, fixedFeePerOrder: 0, packagingFeeSurcharge: 0, taxOnCommissionPercent: 7, active: true },
    { id: 'grab', code: 'GRAB', name: 'GrabFood', commissionPercent: 30, paymentFeePercent: 0, fixedFeePerOrder: 0, packagingFeeSurcharge: 0, taxOnCommissionPercent: 7, active: true },
    { id: 'lineman', code: 'LINEMAN', name: 'LINE MAN', commissionPercent: 25, paymentFeePercent: 0, fixedFeePerOrder: 0, packagingFeeSurcharge: 0, taxOnCommissionPercent: 7, active: true },
  ];

  const [dailySales, setDailySales] = useState<DailySalesRecord[]>(() => [
    {
      id: 'sales-init-1',
      date: new Date().toISOString().split('T')[0],
      channelId: 'dine-in',
      channelName: 'หน้าร้าน (Dine-in)',
      orderCount: 45,
      grossSales: 16000,
      discounts: 500,
      refunds: 0,
      netSales: 15500,
      platformFees: 0,
      actualPayout: 15500,
    },
    {
      id: 'sales-init-2',
      date: new Date().toISOString().split('T')[0],
      channelId: 'grab',
      channelName: 'GrabFood',
      orderCount: 20,
      grossSales: 8500,
      discounts: 300,
      refunds: 0,
      netSales: 8200,
      platformFees: 2632,
      actualPayout: 5568,
    },
  ]);

  // Navigation & UI state: focused purely on Food Cost System
  const [currentTab, setCurrentTab] = useState<string>('food_cost');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [targetRecipeVariantId, setTargetRecipeVariantId] = useState<string>('');
  const [backupStatus, setBackupStatus] = useState(() => StorageService.isBackupOverdue(7));
  const [isIconModalOpen, setIsIconModalOpen] = useState<boolean>(false);

  // Sync active custom icon to document head on load
  useEffect(() => {
    AppIconService.applyIconToDocument(
      AppIconService.getCurrentIcon(),
      AppIconService.getCurrentThemeColor()
    );
  }, []);

  const handleDownloadBackup = () => {
    StorageService.downloadBackupFile();
    setBackupStatus(StorageService.isBackupOverdue(7));
  };

  // 2. State persistence effects
  useEffect(() => {
    StorageService.saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    StorageService.saveIngredients(ingredients);
  }, [ingredients]);

  useEffect(() => {
    StorageService.saveSauces(sauces);
  }, [sauces]);

  useEffect(() => {
    StorageService.saveMenus(menus);
  }, [menus]);

  useEffect(() => {
    StorageService.saveSuppliers(suppliers);
  }, [suppliers]);

  useEffect(() => {
    StorageService.saveInventory(inventory);
  }, [inventory]);

  useEffect(() => {
    StorageService.saveInventoryTransactions(inventoryTransactions);
  }, [inventoryTransactions]);

  useEffect(() => {
    StorageService.savePurchases(purchases);
  }, [purchases]);

  useEffect(() => {
    StorageService.savePriceHistory(priceHistory);
  }, [priceHistory]);

  useEffect(() => {
    StorageService.saveExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    StorageService.saveSalesOrders(salesOrders);
  }, [salesOrders]);

  useEffect(() => {
    StorageService.saveWasteLog(wasteLog);
  }, [wasteLog]);

  // Derived metrics for Badges
  const reviewRequiredCount = ingredients.filter((i) => i.isReviewRequired).length;

  // Menu names map for fast lookup
  const menuNamesMap = new Map<string, string>();
  menus.forEach((m) => {
    m.variants.forEach((v) => {
      menuNamesMap.set(v.id, m.name);
    });
  });

  const allVariants = menus.flatMap((m) => m.variants);

  // 3. State Update Handlers
  const handleSaveIngredient = (ingredient: Ingredient) => {
    const existingIndex = ingredients.findIndex((i) => i.id === ingredient.id);
    let updated: Ingredient[];
    if (existingIndex >= 0) {
      updated = [...ingredients];
      updated[existingIndex] = ingredient;
    } else {
      updated = [ingredient, ...ingredients];
    }
    setIngredients(updated);

    // Also update or add inventory item if missing
    const invIndex = inventory.findIndex((inv) => inv.ingredientId === ingredient.id);
    if (invIndex === -1) {
      const newInv: InventoryItem = {
        id: `inv_${Date.now()}`,
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        currentStock: ingredient.purchaseQuantity,
        unit: ingredient.usageUnit,
        minStock: Math.round(ingredient.purchaseQuantity * 0.2),
        maxStock: ingredient.purchaseQuantity * 2,
        costPerUnit: ingredient.costPerBaseUnit,
        lastUpdated: new Date().toISOString(),
      };
      setInventory([...inventory, newInv]);
    }
  };

  const handleDeleteIngredient = (ingredientId: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== ingredientId));
    setInventory((prev) => prev.filter((inv) => inv.ingredientId !== ingredientId));
  };

  const handleReorderIngredients = (reordered: Ingredient[]) => {
    setIngredients(reordered);
  };

  const handleRecordPriceChange = (record: PriceHistoryRecord) => {
    setPriceHistory([record, ...priceHistory]);
  };

  const handleSaveSauce = (sauce: Sauce) => {
    const existingIndex = sauces.findIndex((s) => s.id === sauce.id);
    if (existingIndex >= 0) {
      const updated = [...sauces];
      updated[existingIndex] = sauce;
      setSauces(updated);
    } else {
      setSauces([...sauces, sauce]);
    }
  };

  const handleSaveMenu = (menu: MenuItem) => {
    setMenus((prevMenus) => {
      const existingIndex = prevMenus.findIndex((m) => m.id === menu.id);
      let updated: MenuItem[];
      if (existingIndex >= 0) {
        updated = [...prevMenus];
        updated[existingIndex] = menu;
      } else {
        updated = [...prevMenus, menu];
      }
      StorageService.saveMenus(updated);
      return updated;
    });
  };

  const handleDeleteMenu = (menuId: string) => {
    setMenus((prevMenus) => {
      const updated = prevMenus.filter((m) => m.id !== menuId);
      StorageService.saveMenus(updated);
      return updated;
    });
  };

  const handleReorderMenus = (reordered: MenuItem[]) => {
    setMenus(reordered);
    StorageService.saveMenus(reordered);
  };

  const handleUpdateVariantPrice = (
    menuId: string,
    variantId: string,
    prices: { sellingPrice: number; takeawayPrice: number; deliveryPrice: number }
  ) => {
    setMenus((prevMenus) => {
      const updated = prevMenus.map((m) => {
        if (m.id !== menuId) return m;
        const updatedVariants = m.variants.map((v) => {
          if (v.id !== variantId) return v;
          return {
            ...v,
            sellingPrice: prices.sellingPrice,
            takeawayPrice: prices.takeawayPrice,
            deliveryPrice: prices.deliveryPrice,
          };
        });
        return { ...m, variants: updatedVariants };
      });
      StorageService.saveMenus(updated);
      return updated;
    });
  };

  const handleSaveVariantRecipe = (
    menuId: string,
    variantId: string,
    recipeItems: RecipeItem[]
  ) => {
    setMenus((prevMenus) => {
      const updated = prevMenus.map((m) => {
        if (m.id !== menuId) return m;
        const updatedVariants = m.variants.map((v) => {
          if (v.id !== variantId) return v;
          return { ...v, recipeItems };
        });
        return { ...m, variants: updatedVariants };
      });
      StorageService.saveMenus(updated);
      return updated;
    });
  };

  const handleSavePurchase = (purchase: PurchaseRecord) => {
    setPurchases([purchase, ...purchases]);

    // Update inventory quantity
    const item = inventory.find((i) => i.ingredientId === purchase.ingredientId);
    if (item) {
      const updatedStock = item.currentStock + purchase.quantity;
      const updated = inventory.map((inv) =>
        inv.id === item.id
          ? { ...inv, currentStock: updatedStock, lastUpdated: new Date().toISOString() }
          : inv
      );
      setInventory(updated);

      // Record transaction
      const txn: InventoryTransaction = {
        id: `txn_${Date.now()}`,
        ingredientId: purchase.ingredientId,
        ingredientName: purchase.ingredientName,
        type: 'PURCHASE',
        quantity: purchase.quantity,
        unit: purchase.unit,
        date: purchase.date,
        reason: `บิลซื้อเลขที่ ${purchase.invoiceNumber || '-'}`,
        user: 'Tony (Owner)',
        cost: purchase.totalPrice,
      };
      setInventoryTransactions([txn, ...inventoryTransactions]);
    }
  };

  const handleUpdateIngredientPriceOnly = (ingredientId: string, newPrice: number) => {
    const updated = ingredients.map((ing) => {
      if (ing.id !== ingredientId) return ing;
      const updatedIng = { ...ing, purchasePrice: newPrice };
      const calc = calculateIngredientCost(updatedIng);
      return {
        ...updatedIng,
        actualCost: calc.actualCost,
        costPerBaseUnit: calc.costPerBaseUnit,
        updatedAt: new Date().toISOString(),
      };
    });
    setIngredients(updated);
  };

  const handleSaveAdjustment = (txn: InventoryTransaction, waste?: WasteRecord) => {
    setInventoryTransactions([txn, ...inventoryTransactions]);

    if (waste) {
      setWasteLog([waste, ...wasteLog]);
    }

    // Update currentStock in inventory
    const updated = inventory.map((item) => {
      if (item.ingredientId !== txn.ingredientId) return item;
      const newStock = Math.max(0, item.currentStock + txn.quantity);
      return { ...item, currentStock: newStock, lastUpdated: new Date().toISOString() };
    });
    setInventory(updated);
  };

  const handleSaveExpense = (expense: ExpenseRecord) => {
    setExpenses([expense, ...expenses]);
  };

  const handleSaveSaleOrder = (order: SaleOrder) => {
    setSalesOrders([order, ...salesOrders]);
  };

  const handleIngredientsImported = (newIngredients: Ingredient[]) => {
    // Merge or prepend imported ingredients
    const existingIds = new Set(ingredients.map((i) => i.id));
    const toAdd = newIngredients.filter((i) => !existingIds.has(i.id));
    setIngredients([...toAdd, ...ingredients]);
  };

  const handleResetDefaults = () => {
    StorageService.resetToDefaults();
    setSettings(StorageService.getSettings());
    setIngredients(StorageService.getIngredients());
    setSauces(StorageService.getSauces());
    setMenus(StorageService.getMenus());
    setSuppliers(StorageService.getSuppliers());
    setInventory(StorageService.getInventory());
    setInventoryTransactions([]);
    setPurchases([]);
    setPriceHistory([]);
    setExpenses(StorageService.getExpenses());
    setSalesOrders(StorageService.getSalesOrders());
    setWasteLog(StorageService.getWasteLog());
    setCurrentTab('dashboard');
  };

  const handleReloadAllData = () => {
    setSettings(StorageService.getSettings());
    setIngredients(StorageService.getIngredients());
    setSauces(StorageService.getSauces());
    setMenus(StorageService.getMenus());
    setSuppliers(StorageService.getSuppliers());
    setInventory(StorageService.getInventory());
    setInventoryTransactions(StorageService.getInventoryTransactions());
    setPurchases(StorageService.getPurchases());
    setPriceHistory(StorageService.getPriceHistory());
    setExpenses(StorageService.getExpenses());
    setSalesOrders(StorageService.getSalesOrders());
    setWasteLog(StorageService.getWasteLog());
  };

  const handleNavigateToRecipeBuilder = (variantId: string) => {
    setTargetRecipeVariantId(variantId);
    setCurrentTab('recipes');
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917] flex flex-col font-sans relative overflow-x-hidden selection:bg-[#F27D26] selection:text-white">
      {/* Soft Ambient Background Orbs: Orange, Gold, and Yellow */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-25 overflow-hidden">
        <div className="absolute top-[-15%] left-[-15%] w-[55vw] h-[55vw] max-w-[650px] max-h-[650px] rounded-full bg-[#F27D26] blur-[150px] opacity-20" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[60vw] h-[60vw] max-w-[750px] max-h-[750px] rounded-full bg-[#FFC107] blur-[160px] opacity-25" />
        <div className="absolute top-[35%] right-[5%] w-[40vw] h-[40vw] max-w-[450px] max-h-[450px] rounded-full bg-[#F59E0B] blur-[160px] opacity-15" />
      </div>

      {/* Top Navigation Bar */}
      <Navbar
        settings={settings}
        currentTab={currentTab}
        onUpdateRole={(role) => setSettings({ ...settings, userRole: role })}
        reviewItemsCount={reviewRequiredCount}
        lowStockCount={0}
        onOpenMobileNav={() => setIsMobileNavOpen(true)}
        onNavigateToTab={(tabId) => setCurrentTab(tabId)}
        onOpenIconModal={() => setIsIconModalOpen(true)}
      />

      {/* E6: Yellow banner when last backup is older than 7 days or never */}
      {backupStatus.isOverdue && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 sm:px-6 py-2.5 text-amber-900 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3 shadow-xs relative z-20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {backupStatus.lastBackupTime
                ? `คำเตือน: ยังไม่ได้สำรองข้อมูลเกิน 7 วัน (สำรองล่าสุดเมื่อ: ${new Date(backupStatus.lastBackupTime).toLocaleDateString('th-TH')}) แนะนำให้ดาวน์โหลดไฟล์สำรองข้อมูลเพื่อความปลอดภัย`
                : 'คำเตือน: ยังไม่เคยสำรองข้อมูลระบบ แนะนำให้ดาวน์โหลดไฟล์สำรองข้อมูล (JSON) เพื่อป้องกันข้อมูลสูญหาย'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadBackup}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium text-xs cursor-pointer transition-colors shadow-xs"
            >
              สำรองข้อมูลเดี๋ยวนี้ (Backup Now)
            </button>
            <button
              onClick={() => setBackupStatus({ isOverdue: false, lastBackupTime: backupStatus.lastBackupTime })}
              className="text-amber-800 hover:text-amber-950 text-xs underline cursor-pointer ml-1"
            >
              ซ่อน
            </button>
          </div>
        </div>
      )}

      {/* Full-width application content. Desktop navigation is now in the top bar; the legacy Sidebar remains available only as the mobile drawer. */}
      <div className="relative z-10 flex-1 w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tabId) => setCurrentTab(tabId)}
          isOpenMobile={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
          reviewCount={reviewRequiredCount}
          lowStockCount={0}
          onReloadData={handleReloadAllData}
          onOpenIconModal={() => setIsIconModalOpen(true)}
        />

        <main className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-6 lg:py-8 min-w-0 overflow-x-hidden">
          {/* TAB 1: FOOD COST & PRICING ANALYSIS - ON RICE (อาหารราดข้าว) */}
          {(currentTab === 'food_cost' || currentTab === 'dashboard' || currentTab === 'menus' || currentTab === 'menu_costing') && (
            <FoodCostView
              menus={menus}
              ingredients={ingredients}
              sauces={sauces}
              settings={settings}
              initialServingMode="ON_RICE"
              onSaveMenu={handleSaveMenu}
              onDeleteMenu={handleDeleteMenu}
              onReorderMenus={handleReorderMenus}
              onUpdateVariantPrice={handleUpdateVariantPrice}
              onNavigateToRecipeBuilder={handleNavigateToRecipeBuilder}
            />
          )}

          {/* TAB 1.5: FOOD COST - A LA CARTE (อาหารกับข้าว) */}
          {currentTab === 'food_cost_alacarte' && (
            <FoodCostView
              menus={menus}
              ingredients={ingredients}
              sauces={sauces}
              settings={settings}
              initialServingMode="A_LA_CARTE"
              onSaveMenu={handleSaveMenu}
              onDeleteMenu={handleDeleteMenu}
              onReorderMenus={handleReorderMenus}
              onUpdateVariantPrice={handleUpdateVariantPrice}
              onNavigateToRecipeBuilder={handleNavigateToRecipeBuilder}
            />
          )}

          {/* TAB 2: QUICK FOOD COST CALCULATOR (Interactive Recipe & Pricing Simulator) */}
          {currentTab === 'quick_calculator' && (
            <QuickCostCalculatorView
              ingredients={ingredients}
              sauces={sauces}
              settings={settings}
              onSaveNewMenu={handleSaveMenu}
              onNavigateToTab={(tabId) => setCurrentTab(tabId)}
            />
          )}

          {/* TAB 3: STANDARDIZED RECIPE BUILDER & RECIPE CARDS */}
          {(currentTab === 'recipes' || currentTab === 'sauces') && (
            <RecipeBuilderView
              menus={menus}
              ingredients={ingredients}
              sauces={sauces}
              settings={settings}
              initialVariantId={targetRecipeVariantId}
              initialTab={currentTab === 'sauces' ? 'SAUCE' : 'FOOD'}
              onSaveVariantRecipe={handleSaveVariantRecipe}
              onSaveSauce={handleSaveSauce}
              onSaveMenu={handleSaveMenu}
            />
          )}

          {/* TAB 4: RAW INGREDIENTS & YIELD LAB (AP, EP & Yield %) */}
          {currentTab === 'ingredients' && (
            <IngredientsView
              ingredients={ingredients}
              sauces={sauces}
              variants={allVariants}
              menuNamesMap={menuNamesMap}
              settings={settings}
              priceHistory={priceHistory}
              onSaveIngredient={handleSaveIngredient}
              onDeleteIngredient={handleDeleteIngredient}
              onReorderIngredients={handleReorderIngredients}
              onRecordPriceChange={handleRecordPriceChange}
            />
          )}

          {/* TAB 4.5: OVERHEAD & BREAK-EVEN ANALYSIS */}
          {currentTab === 'overhead_breakeven' && (
            <BreakEvenView
              expenses={expenses as any}
              employees={StorageService.getEmployees() as any}
              sales={dailySales}
              settings={settings as any}
              activeLanguage="th"
            />
          )}

          {/* TAB 4.6: OPERATING EXPENSES */}
          {currentTab === 'expenses' && (
            <ExpensesView
              expenses={expenses as any}
              onAddExpense={(newExp) => {
                const next = [newExp, ...expenses];
                setExpenses(next);
                StorageService.saveExpenses(next);
              }}
              onDeleteExpense={(id) => {
                const next = expenses.filter((e) => e.id !== id);
                setExpenses(next);
                StorageService.saveExpenses(next);
              }}
              onUpdateExpense={(updatedExp) => {
                const next = expenses.map((e) => (e.id === updatedExp.id ? updatedExp : e));
                setExpenses(next);
                StorageService.saveExpenses(next);
              }}
              operatingDays={settings.operatingDaysPerMonth || 26}
              activeLanguage="th"
            />
          )}

          {/* TAB 4.7: DAILY SALES ENTRY */}
          {currentTab === 'sales_entry' && (
            <SalesEntryView
              sales={dailySales}
              channels={defaultSalesChannels}
              onAddSalesRecord={(rec) => setDailySales((prev) => upsertDailySalesRecord(prev, rec))}
              onDeleteSalesRecord={(id) => setDailySales((prev) => prev.filter((s) => s.id !== id))}
              defaultVatRate={settings.taxRatePercent || 7}
              activeLanguage="th"
            />
          )}

          {/* TAB 5: FOOD COST BENCHMARKS & SETTINGS */}
          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={(newSettings) => setSettings(newSettings)}
              onOpenIconModal={() => setIsIconModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* App Icon Customizer Modal */}
      <AppIconModal
        isOpen={isIconModalOpen}
        onClose={() => setIsIconModalOpen(false)}
      />

      {/* Light Theme Footer */}
      <footer className="relative z-10 px-6 sm:px-8 py-3.5 bg-white/90 backdrop-blur-md border-t border-[#EAE4D9] text-xs text-stone-500 flex flex-col sm:flex-row justify-between items-center gap-2 shadow-xs">
        <div className="flex items-center gap-4">
          <span className="font-medium text-stone-700">ระบบคำนวณต้นทุนอาหารมาตรฐานสากล (International Food Cost System)</span>
          <span className="hidden sm:inline text-stone-300">|</span>
          <span>AP Price · Usable Yield % · EP Cost · Q-Factor Buffer (2-5%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-stone-600 font-mono font-medium">Deterministic Culinary Engine V1.0.4</span>
        </div>
      </footer>
    </div>
  );
}
