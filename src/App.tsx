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

  // Navigation & UI state: focused purely on Food Cost System
  const [currentTab, setCurrentTab] = useState<string>('food_cost');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [targetRecipeVariantId, setTargetRecipeVariantId] = useState<string>('');

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
    const existingIndex = menus.findIndex((m) => m.id === menu.id);
    if (existingIndex >= 0) {
      const updated = [...menus];
      updated[existingIndex] = menu;
      setMenus(updated);
    } else {
      setMenus([...menus, menu]);
    }
  };

  const handleUpdateVariantPrice = (
    menuId: string,
    variantId: string,
    prices: { sellingPrice: number; takeawayPrice: number; deliveryPrice: number }
  ) => {
    const updatedMenus = menus.map((m) => {
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
    setMenus(updatedMenus);
  };

  const handleSaveVariantRecipe = (
    menuId: string,
    variantId: string,
    recipeItems: RecipeItem[]
  ) => {
    const updatedMenus = menus.map((m) => {
      if (m.id !== menuId) return m;
      const updatedVariants = m.variants.map((v) => {
        if (v.id !== variantId) return v;
        return { ...v, recipeItems };
      });
      return { ...m, variants: updatedVariants };
    });
    setMenus(updatedMenus);
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
      />

      {/* Full-width application content. Desktop navigation is now in the top bar; the legacy Sidebar remains available only as the mobile drawer. */}
      <div className="relative z-10 flex-1 w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tabId) => setCurrentTab(tabId)}
          isOpenMobile={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
          reviewCount={reviewRequiredCount}
          lowStockCount={0}
        />

        <main className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-6 lg:py-8 min-w-0 overflow-x-hidden">
          {/* TAB 1: FOOD COST & PRICING ANALYSIS (Primary View) */}
          {(currentTab === 'food_cost' || currentTab === 'dashboard' || currentTab === 'menus' || currentTab === 'menu_costing') && (
            <FoodCostView
              menus={menus}
              ingredients={ingredients}
              sauces={sauces}
              settings={settings}
              onSaveMenu={handleSaveMenu}
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
              onRecordPriceChange={handleRecordPriceChange}
            />
          )}

          {/* TAB 5: FOOD COST BENCHMARKS & SETTINGS */}
          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={(newSettings) => setSettings(newSettings)}
            />
          )}
        </main>
      </div>

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
