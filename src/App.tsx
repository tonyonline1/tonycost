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
import { AlertTriangle, Cloud, CheckCircle2, RefreshCw, X, LogIn, Database } from 'lucide-react';
import { ExpensesView } from './components/Financials/ExpensesView';
import { SalesEntryView } from './components/Financials/SalesEntryView';
import { ProfitAndLossView } from './components/Financials/ProfitAndLossView';
import { ExecutiveDashboard } from './components/Dashboard/ExecutiveDashboard';
import { LaborView } from './components/Financials/LaborView';
import { InventoryView } from './components/InventoryView';
import { PurchasesView } from './components/PurchasesView';
import { ReportsView } from './components/ReportsView';
import { DailySalesRecord, SalesChannel, Employee as DomainEmployee } from './types/domain';
import { upsertDailySalesRecord } from './engine/calculations';
import { AppIconModal } from './components/common/AppIconModal';
import { AppIconService } from './services/appIconService';
import { FirebaseSyncModal } from './components/common/FirebaseSyncModal';
import { auth, loginWithGoogle, testConnection } from './services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { FirebaseSyncService, COLLECTIONS } from './services/firebaseSyncService';

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

  const [employees, setEmployees] = useState<DomainEmployee[]>(() =>
    StorageService.getEmployees()
  );
  const [dailySales, setDailySales] = useState<DailySalesRecord[]>(() =>
    StorageService.getDailySales()
  );

  // Navigation & UI state: focused purely on Food Cost System
  const [currentTab, setCurrentTab] = useState<string>('food_cost');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [targetRecipeVariantId, setTargetRecipeVariantId] = useState<string>('');
  const [backupStatus, setBackupStatus] = useState(() => StorageService.isBackupOverdue(7));
  const [isIconModalOpen, setIsIconModalOpen] = useState<boolean>(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState<boolean>(false);

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isCloudLoading, setIsCloudLoading] = useState<boolean>(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [isAutoMigrating, setIsAutoMigrating] = useState<boolean>(false);

  // Test Firestore connection on boot
  useEffect(() => {
    testConnection().catch(() => {});
  }, []);

  // Firebase Authentication & Real-Time Firestore Sync (Requirements 1, 2, 3)
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // Clean up any existing subscriptions
      unsubs.forEach((u) => u());
      unsubs = [];

      setCurrentUser(user);

      if (!user) {
        setIsCloudLoading(false);
        return;
      }

      setIsCloudLoading(true);
      setCloudError(null);

      // 1. Initial check & auto-migration if cloud collections are brand new
      try {
        const hasData = await FirebaseSyncService.hasUserData(user.uid);
        if (!hasData) {
          setIsAutoMigrating(true);
          await FirebaseSyncService.migrateLocalDataToUser(user.uid);
          setIsAutoMigrating(false);
        }
      } catch (err: any) {
        console.warn('Auto-migration error:', err);
        setIsAutoMigrating(false);
      }

      // 2. Real-Time onSnapshot subscriptions for user-scoped collections (Requirement 3)
      try {
        // Settings Doc
        unsubs.push(
          FirebaseSyncService.subscribeUserDoc<RestaurantSettings>(
            user.uid,
            COLLECTIONS.SETTINGS,
            'default',
            (cloudSettings) => {
              if (cloudSettings) {
                setSettings(cloudSettings);
                StorageService.saveSettings(cloudSettings);
              }
            },
            (err) => setCloudError(err.message || 'Error syncing settings')
          )
        );

        // Ingredients
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<Ingredient>(
            user.uid,
            COLLECTIONS.INGREDIENTS,
            (cloudIngs) => {
              if (cloudIngs && cloudIngs.length > 0) {
                setIngredients(cloudIngs);
                StorageService.saveIngredients(cloudIngs);
              }
            },
            (err) => setCloudError(err.message || 'Error syncing ingredients')
          )
        );

        // Sauces
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<Sauce>(
            user.uid,
            COLLECTIONS.SAUCES,
            (cloudSauces) => {
              if (cloudSauces && cloudSauces.length > 0) {
                setSauces(cloudSauces);
                StorageService.saveSauces(cloudSauces);
              }
            },
            (err) => setCloudError(err.message || 'Error syncing sauces')
          )
        );

        // Menus
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<MenuItem>(
            user.uid,
            COLLECTIONS.MENUS,
            (cloudMenus) => {
              if (cloudMenus && cloudMenus.length > 0) {
                setMenus(cloudMenus);
                StorageService.saveMenus(cloudMenus);
              }
            },
            (err) => setCloudError(err.message || 'Error syncing menus')
          )
        );

        // Daily Sales
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<DailySalesRecord>(
            user.uid,
            COLLECTIONS.DAILY_SALES,
            (cloudSales) => {
              if (cloudSales && cloudSales.length > 0) {
                setDailySales(cloudSales);
                StorageService.saveDailySales(cloudSales);
              }
            },
            (err) => setCloudError(err.message || 'Error syncing daily sales')
          )
        );

        // Expenses
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<ExpenseRecord>(
            user.uid,
            COLLECTIONS.EXPENSES,
            (cloudExp) => {
              if (cloudExp && cloudExp.length > 0) {
                setExpenses(cloudExp);
                StorageService.saveExpenses(cloudExp);
              }
            },
            (err) => setCloudError(err.message || 'Error syncing expenses')
          )
        );

        // Employees
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<DomainEmployee>(
            user.uid,
            COLLECTIONS.EMPLOYEES,
            (cloudEmp) => {
              if (cloudEmp && cloudEmp.length > 0) {
                setEmployees(cloudEmp);
                StorageService.saveEmployees(cloudEmp as any);
              }
            },
            (err) => setCloudError(err.message || 'Error syncing employees')
          )
        );

        // Purchases
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<PurchaseRecord>(
            user.uid,
            COLLECTIONS.PURCHASES,
            (cloudPurchases) => {
              if (cloudPurchases && cloudPurchases.length > 0) {
                setPurchases(cloudPurchases);
                StorageService.savePurchases(cloudPurchases);
              }
            },
            (err) => setCloudError(err.message || 'Error syncing purchases')
          )
        );

        // Inventory
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<InventoryItem>(
            user.uid,
            COLLECTIONS.INVENTORY,
            (cloudInv) => {
              if (cloudInv && cloudInv.length > 0) {
                setInventory(cloudInv);
                StorageService.saveInventory(cloudInv);
              }
            },
            (err) => setCloudError(err.message || 'Error syncing inventory')
          )
        );

        // Waste Log
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<WasteRecord>(
            user.uid,
            COLLECTIONS.WASTE_LOG,
            (cloudWaste) => {
              if (cloudWaste && cloudWaste.length > 0) {
                setWasteLog(cloudWaste);
                StorageService.saveWasteLog(cloudWaste);
              }
            },
            (err) => setCloudError(err.message || 'Error syncing waste log')
          )
        );

        // Suppliers
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<Supplier>(
            user.uid,
            COLLECTIONS.SUPPLIERS,
            (cloudSuppliers) => {
              if (cloudSuppliers && cloudSuppliers.length > 0) {
                setSuppliers(cloudSuppliers);
                StorageService.saveSuppliers(cloudSuppliers);
              }
            },
            (err) => setCloudError(err.message || 'Error syncing suppliers')
          )
        );

        // Price History
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<PriceHistoryRecord>(
            user.uid,
            COLLECTIONS.PRICE_HISTORY,
            (cloudHistory) => {
              if (cloudHistory && cloudHistory.length > 0) {
                setPriceHistory(cloudHistory);
                StorageService.savePriceHistory(cloudHistory);
              }
            },
            (err) => setCloudError(err.message || 'Error syncing price history')
          )
        );

        // Sales Orders
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<SaleOrder>(
            user.uid,
            COLLECTIONS.SALES_ORDERS,
            (cloudOrders) => {
              if (cloudOrders && cloudOrders.length > 0) {
                setSalesOrders(cloudOrders);
                StorageService.saveSalesOrders(cloudOrders);
              }
            },
            (err) => setCloudError(err.message || 'Error syncing sales orders')
          )
        );
      } finally {
        setIsCloudLoading(false);
      }
    });

    return () => {
      unsubAuth();
      unsubs.forEach((u) => u());
    };
  }, []);


  // Sync active custom icon to document head on load
  useEffect(() => {
    AppIconService.applyIconToDocument(
      AppIconService.getCurrentIcon(),
      AppIconService.getCurrentThemeColor()
    );
  }, []);

  // Redirect away from inventory stock tab to food cost view
  useEffect(() => {
    if (currentTab === 'inventory') {
      setCurrentTab('food_cost');
    }
  }, [currentTab]);

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

  useEffect(() => {
    StorageService.saveEmployees(employees as any);
  }, [employees]);

  useEffect(() => {
    StorageService.saveDailySales(dailySales);
  }, [dailySales]);

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
    StorageService.saveIngredients(updated);

    if (currentUser) {
      FirebaseSyncService.saveUserDoc(currentUser.uid, COLLECTIONS.INGREDIENTS, ingredient.id, ingredient);
    }

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
    setIngredients((prev) => {
      const updated = prev.filter((i) => i.id !== ingredientId);
      StorageService.saveIngredients(updated);
      return updated;
    });
    setInventory((prev) => {
      const updated = prev.filter((inv) => inv.ingredientId !== ingredientId);
      StorageService.saveInventory(updated);
      return updated;
    });
    if (currentUser) {
      FirebaseSyncService.deleteUserDoc(currentUser.uid, COLLECTIONS.INGREDIENTS, ingredientId);
    }
  };

  const handleReorderIngredients = (reordered: Ingredient[]) => {
    setIngredients(reordered);
    StorageService.saveIngredients(reordered);
    if (currentUser) {
      FirebaseSyncService.batchSaveUser(currentUser.uid, COLLECTIONS.INGREDIENTS, reordered);
    }
  };

  const handleRecordPriceChange = (record: PriceHistoryRecord) => {
    setPriceHistory([record, ...priceHistory]);
    StorageService.savePriceHistory([record, ...priceHistory]);
    if (currentUser) {
      FirebaseSyncService.saveUserDoc(currentUser.uid, COLLECTIONS.PRICE_HISTORY, record.id, record);
    }
  };

  const handleSaveSauce = (sauce: Sauce) => {
    const existingIndex = sauces.findIndex((s) => s.id === sauce.id);
    let updated: Sauce[];
    if (existingIndex >= 0) {
      updated = [...sauces];
      updated[existingIndex] = sauce;
    } else {
      updated = [...sauces, sauce];
    }
    setSauces(updated);
    StorageService.saveSauces(updated);
    if (currentUser) {
      FirebaseSyncService.saveUserDoc(currentUser.uid, COLLECTIONS.SAUCES, sauce.id, sauce);
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
    if (currentUser) {
      FirebaseSyncService.saveUserDoc(currentUser.uid, COLLECTIONS.MENUS, menu.id, menu);
    }
  };

  const handleDeleteMenu = (menuId: string) => {
    setMenus((prevMenus) => {
      const updated = prevMenus.filter((m) => m.id !== menuId);
      StorageService.saveMenus(updated);
      return updated;
    });
    if (currentUser) {
      FirebaseSyncService.deleteUserDoc(currentUser.uid, COLLECTIONS.MENUS, menuId);
    }
  };

  const handleReorderMenus = (reordered: MenuItem[]) => {
    setMenus(reordered);
    StorageService.saveMenus(reordered);
    if (currentUser) {
      FirebaseSyncService.batchSaveUser(currentUser.uid, COLLECTIONS.MENUS, reordered);
    }
  };

  const handleUpdateVariantPrice = (
    menuId: string,
    variantId: string,
    prices: { sellingPrice: number; takeawayPrice: number; deliveryPrice: number }
  ) => {
    let targetMenu: MenuItem | undefined;
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
        const mUpdated = { ...m, variants: updatedVariants };
        targetMenu = mUpdated;
        return mUpdated;
      });
      StorageService.saveMenus(updated);
      return updated;
    });
    if (currentUser && targetMenu) {
      FirebaseSyncService.saveUserDoc(currentUser.uid, COLLECTIONS.MENUS, (targetMenu as MenuItem).id, targetMenu);
    }
  };

  const handleSaveVariantRecipe = (
    menuId: string,
    variantId: string,
    recipeItems: RecipeItem[]
  ) => {
    let targetMenu: MenuItem | undefined;
    setMenus((prevMenus) => {
      const updated = prevMenus.map((m) => {
        if (m.id !== menuId) return m;
        const updatedVariants = m.variants.map((v) => {
          if (v.id !== variantId) return v;
          return { ...v, recipeItems };
        });
        const mUpdated = { ...m, variants: updatedVariants };
        targetMenu = mUpdated;
        return mUpdated;
      });
      StorageService.saveMenus(updated);
      return updated;
    });
    if (currentUser && targetMenu) {
      FirebaseSyncService.saveUserDoc(currentUser.uid, COLLECTIONS.MENUS, (targetMenu as MenuItem).id, targetMenu);
    }
  };

  const handleSavePurchase = (purchase: PurchaseRecord) => {
    setPurchases((prev) => {
      const updated = [purchase, ...prev];
      StorageService.savePurchases(updated);
      return updated;
    });

    if (currentUser) {
      FirebaseSyncService.saveUserDoc(currentUser.uid, COLLECTIONS.PURCHASES, purchase.id, purchase);
    }

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
      StorageService.saveInventory(updated);

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
      StorageService.saveInventoryTransactions([txn, ...inventoryTransactions]);
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
    const nextExpenses = [expense, ...expenses];
    setExpenses(nextExpenses);
    StorageService.saveExpenses(nextExpenses);
    if (currentUser) {
      FirebaseSyncService.saveUserDoc(currentUser.uid, COLLECTIONS.EXPENSES, expense.id, expense);
    }
  };

  const handleDeleteExpense = (id: string) => {
    const nextExpenses = expenses.filter((e) => e.id !== id);
    setExpenses(nextExpenses);
    StorageService.saveExpenses(nextExpenses);
    if (currentUser) {
      FirebaseSyncService.deleteUserDoc(currentUser.uid, COLLECTIONS.EXPENSES, id);
    }
  };

  const handleUpdateExpense = (updatedExp: ExpenseRecord) => {
    const nextExpenses = expenses.map((e) => (e.id === updatedExp.id ? updatedExp : e));
    setExpenses(nextExpenses);
    StorageService.saveExpenses(nextExpenses);
    if (currentUser) {
      FirebaseSyncService.saveUserDoc(currentUser.uid, COLLECTIONS.EXPENSES, updatedExp.id, updatedExp);
    }
  };

  const handleSaveSaleOrder = (order: SaleOrder) => {
    const nextOrders = [order, ...salesOrders];
    setSalesOrders(nextOrders);
    StorageService.saveSalesOrders(nextOrders);
    if (currentUser) {
      FirebaseSyncService.saveUserDoc(currentUser.uid, COLLECTIONS.SALES_ORDERS, order.id, order);
    }
  };

  const handleAddDailySalesRecord = (rec: DailySalesRecord) => {
    setDailySales((prev) => {
      const next = upsertDailySalesRecord(prev, rec);
      StorageService.saveDailySales(next);
      return next;
    });
    if (currentUser) {
      FirebaseSyncService.saveUserDoc(currentUser.uid, COLLECTIONS.DAILY_SALES, rec.id, rec);
    }
  };

  const handleDeleteDailySalesRecord = (id: string) => {
    setDailySales((prev) => {
      const next = prev.filter((s) => s.id !== id);
      StorageService.saveDailySales(next);
      return next;
    });
    if (currentUser) {
      FirebaseSyncService.deleteUserDoc(currentUser.uid, COLLECTIONS.DAILY_SALES, id);
    }
  };

  const handleAddEmployee = (newEmp: DomainEmployee) => {
    setEmployees((prev) => {
      const next = [newEmp, ...prev];
      StorageService.saveEmployees(next as any);
      return next;
    });
    if (currentUser) {
      FirebaseSyncService.saveUserDoc(currentUser.uid, COLLECTIONS.EMPLOYEES, newEmp.id, newEmp);
    }
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees((prev) => {
      const next = prev.filter((e) => e.id !== id);
      StorageService.saveEmployees(next as any);
      return next;
    });
    if (currentUser) {
      FirebaseSyncService.deleteUserDoc(currentUser.uid, COLLECTIONS.EMPLOYEES, id);
    }
  };

  const handleSaveSettings = (newSettings: RestaurantSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
    if (currentUser) {
      FirebaseSyncService.saveUserDoc(currentUser.uid, COLLECTIONS.SETTINGS, 'default', newSettings);
    }
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
    setEmployees(StorageService.getEmployees());
    setDailySales(StorageService.getDailySales());
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
        onOpenFirebaseSync={() => setIsFirebaseModalOpen(true)}
        currentUser={currentUser}
        isCloudLoading={isCloudLoading}
      />

      {/* Cloud Sync Status / Notifications Banner (Requirement 3: Loading states & Clear error messages in UI) */}
      {isCloudLoading && (
        <div className="bg-sky-50 border-b border-sky-200 px-4 sm:px-6 py-2 text-sky-800 text-xs sm:text-sm flex items-center justify-between gap-3 relative z-20">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-sky-600 animate-spin shrink-0" />
            <span>
              {isAutoMigrating
                ? 'กำลังเชื่อมต่อและคัดลอกข้อมูลขึ้น Cloud Firestore ครั้งแรก...'
                : 'กำลังซิงค์ข้อมูลกับ Cloud Firestore แบบ Real-time...'}
            </span>
          </div>
          <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded font-mono font-medium">Real-time sync</span>
        </div>
      )}

      {cloudError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 sm:px-6 py-2 text-rose-800 text-xs sm:text-sm flex items-center justify-between gap-3 relative z-20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>เกิดข้อผิดพลาดในการเชื่อมต่อคลาวด์: {cloudError} (ระบบทำงานในโหมด Offline สำรองข้อมูลในเครื่องอัตโนมัติ)</span>
          </div>
          <button
            onClick={() => setCloudError(null)}
            className="text-rose-600 hover:text-rose-900 text-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
          onOpenFirebaseSync={() => setIsFirebaseModalOpen(true)}
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
              onAddExpense={handleSaveExpense}
              onDeleteExpense={handleDeleteExpense}
              onUpdateExpense={handleUpdateExpense}
              operatingDays={settings.operatingDaysPerMonth || 26}
              activeLanguage="th"
            />
          )}

          {/* TAB 4.7: DAILY SALES ENTRY */}
          {currentTab === 'sales_entry' && (
            <SalesEntryView
              sales={dailySales}
              channels={defaultSalesChannels}
              onAddSalesRecord={handleAddDailySalesRecord}
              onDeleteSalesRecord={handleDeleteDailySalesRecord}
              defaultVatRate={typeof settings.vatRatePercent === 'number' && Number.isFinite(settings.vatRatePercent) ? settings.vatRatePercent : 7}
              activeLanguage="th"
            />
          )}

          {/* TAB: EXECUTIVE DASHBOARD */}
          {currentTab === 'executive_dashboard' && (
            <ExecutiveDashboard
              sales={dailySales}
              expenses={expenses as any}
              employees={employees as any}
              menuItems={menus as any}
              inventory={inventory as any}
              allWaste={wasteLog as any}
              channels={defaultSalesChannels}
              currentSettings={settings}
              activeLanguage="th"
              onNavigateToTab={(tabId) => setCurrentTab(tabId)}
              onSalesUpdated={(updatedSales) => setDailySales(updatedSales)}
            />
          )}

          {/* TAB: PROFIT & LOSS STATEMENT (P&L) */}
          {currentTab === 'pnl' && (
            <ProfitAndLossView
              sales={dailySales}
              expenses={expenses as any}
              employees={employees as any}
              settings={settings}
              activeLanguage="th"
              onSalesUpdated={(updatedSales) => setDailySales(updatedSales)}
            />
          )}

          {/* TAB: LABOR MANAGEMENT */}
          {currentTab === 'labor' && (
            <LaborView
              employees={employees as any}
              monthlyNetSales={dailySales.reduce((sum, s) => sum + s.netSales, 0)}
              onAddEmployee={handleAddEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              activeLanguage="th"
            />
          )}

          {/* TAB: INVENTORY & WASTE LOG */}
          {currentTab === 'inventory' && (
            <InventoryView
              inventory={inventory}
              ingredients={ingredients}
              transactions={inventoryTransactions}
              wasteLog={wasteLog}
              onSaveAdjustment={(txn, waste) => {
                const nextTxns = [txn, ...inventoryTransactions];
                setInventoryTransactions(nextTxns);
                const nextInv = inventory.map((item) =>
                  item.id === txn.inventoryItemId
                    ? { ...item, currentStock: Math.max(0, item.currentStock + txn.quantityChange), lastUpdated: new Date().toISOString() }
                    : item
                );
                setInventory(nextInv);
                if (waste) {
                  const nextWaste = [waste, ...wasteLog];
                  setWasteLog(nextWaste);
                }
              }}
            />
          )}

          {/* TAB: PURCHASES & PRICE HISTORY */}
          {currentTab === 'purchases' && (
            <PurchasesView
              ingredients={ingredients}
              suppliers={suppliers}
              purchases={purchases}
              priceHistory={priceHistory}
              settings={settings}
              onSavePurchase={handleSavePurchase}
              onUpdateIngredientPrice={(id, price) =>
                setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, purchasePrice: price } : i)))
              }
              onRecordPriceChange={handleRecordPriceChange}
            />
          )}

          {/* TAB: REPORTS & EXCEL IMPORT/EXPORT */}
          {currentTab === 'reports' && (
            <ReportsView
              ingredients={ingredients}
              sauces={sauces}
              menus={menus}
              expenses={expenses}
              salesOrders={salesOrders}
              settings={settings}
              onIngredientsImported={(newIngredients) => setIngredients(newIngredients)}
              onEditIngredient={(ing) => handleSaveIngredient(ing)}
              onResetDefaults={handleReloadAllData}
            />
          )}

          {/* TAB 5: FOOD COST BENCHMARKS & SETTINGS */}
          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={handleSaveSettings}
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

      {/* Firebase Cloud Sync Modal */}
      <FirebaseSyncModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        onDataSynced={handleReloadAllData}
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
