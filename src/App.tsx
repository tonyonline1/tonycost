import React, { useState, useEffect, useRef } from 'react';
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
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [isAutoMigrating, setIsAutoMigrating] = useState<boolean>(false);

  // Synchronous refs so handlers & rapid edits never read stale state closures
  const currentUserRef = useRef<FirebaseUser | null>(currentUser);
  const settingsRef = useRef<RestaurantSettings>(settings);
  const ingredientsRef = useRef<Ingredient[]>(ingredients);
  const saucesRef = useRef<Sauce[]>(sauces);
  const menusRef = useRef<MenuItem[]>(menus);
  const suppliersRef = useRef<Supplier[]>(suppliers);
  const inventoryRef = useRef<InventoryItem[]>(inventory);
  const inventoryTransactionsRef = useRef<InventoryTransaction[]>(inventoryTransactions);
  const purchasesRef = useRef<PurchaseRecord[]>(purchases);
  const priceHistoryRef = useRef<PriceHistoryRecord[]>(priceHistory);
  const expensesRef = useRef<ExpenseRecord[]>(expenses);
  const salesOrdersRef = useRef<SaleOrder[]>(salesOrders);
  const wasteLogRef = useRef<WasteRecord[]>(wasteLog);
  const employeesRef = useRef<DomainEmployee[]>(employees);
  const dailySalesRef = useRef<DailySalesRecord[]>(dailySales);

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { ingredientsRef.current = ingredients; }, [ingredients]);
  useEffect(() => { saucesRef.current = sauces; }, [sauces]);
  useEffect(() => { menusRef.current = menus; }, [menus]);
  useEffect(() => { suppliersRef.current = suppliers; }, [suppliers]);
  useEffect(() => { inventoryRef.current = inventory; }, [inventory]);
  useEffect(() => { inventoryTransactionsRef.current = inventoryTransactions; }, [inventoryTransactions]);
  useEffect(() => { purchasesRef.current = purchases; }, [purchases]);
  useEffect(() => { priceHistoryRef.current = priceHistory; }, [priceHistory]);
  useEffect(() => { expensesRef.current = expenses; }, [expenses]);
  useEffect(() => { salesOrdersRef.current = salesOrders; }, [salesOrders]);
  useEffect(() => { wasteLogRef.current = wasteLog; }, [wasteLog]);
  useEffect(() => { employeesRef.current = employees; }, [employees]);
  useEffect(() => { dailySalesRef.current = dailySales; }, [dailySales]);

  const getActiveUid = () => currentUserRef.current?.uid || auth.currentUser?.uid || null;

  const runCloudSync = (task: (uid: string) => Promise<void>, label: string) => {
    const uid = getActiveUid();
    if (!uid) return;
    setPendingSyncCount((c) => c + 1);
    task(uid)
      .then(() => {
        setCloudError(null);
      })
      .catch((err: any) => {
        console.error(`Firebase realtime sync failed [${label}]:`, err);
        setCloudError(err?.message || `ไม่สามารถซิงค์ข้อมูล (${label}) ขึ้น Firebase ได้`);
      })
      .finally(() => {
        setPendingSyncCount((c) => Math.max(0, c - 1));
      });
  };

  // Test Firestore connection on boot
  useEffect(() => {
    testConnection().catch(() => {});
  }, []);

  // Firebase Authentication & Real-Time Firestore Sync (Requirements 1, 2, 3)
  useEffect(() => {
    let unsubs: (() => void)[] = [];
    let activeRunId = 0;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      activeRunId++;
      const runId = activeRunId;

      // Clean up any existing subscriptions
      unsubs.forEach((u) => u());
      unsubs = [];

      currentUserRef.current = user;
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
        if (runId !== activeRunId) return;
        if (!hasData) {
          setIsAutoMigrating(true);
          const migRes = await FirebaseSyncService.migrateLocalDataToUser(user.uid);
          if (!migRes.success && migRes.error) {
            setCloudError(migRes.error);
          }
          if (runId !== activeRunId) return;
          setIsAutoMigrating(false);
        }
      } catch (err: any) {
        console.warn('Auto-migration error:', err);
        setIsAutoMigrating(false);
        setCloudError(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูลเริ่มต้น');
      }

      if (runId !== activeRunId) return;

      // Track first snapshot arrival to clear loading state accurately
      const pendingInitial = new Set(['settings', 'ingredients', 'sauces', 'menus', 'daily_sales', 'expenses']);
      const markCollectionLoaded = (name: string) => {
        if (pendingInitial.delete(name) && pendingInitial.size === 0) {
          setIsCloudLoading(false);
        }
      };
      const loadingFallbackTimer = setTimeout(() => {
        if (runId === activeRunId) {
          setIsCloudLoading(false);
        }
      }, 3000);
      unsubs.push(() => clearTimeout(loadingFallbackTimer));

      // 2. Real-Time onSnapshot subscriptions for user-scoped collections (Requirement 3)
      try {
        // Settings Doc
        unsubs.push(
          FirebaseSyncService.subscribeUserDoc<RestaurantSettings>(
            user.uid,
            COLLECTIONS.SETTINGS,
            'default',
            (cloudSettings) => {
              markCollectionLoaded('settings');
              if (cloudSettings) {
                settingsRef.current = cloudSettings;
                setSettings(cloudSettings);
                StorageService.saveSettings(cloudSettings);
              }
            },
            (err) => {
              markCollectionLoaded('settings');
              setCloudError(err.message || 'Error syncing settings');
            }
          )
        );

        // Ingredients
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<Ingredient>(
            user.uid,
            COLLECTIONS.INGREDIENTS,
            (cloudIngs) => {
              markCollectionLoaded('ingredients');
              ingredientsRef.current = cloudIngs;
              setIngredients(cloudIngs);
              StorageService.saveIngredients(cloudIngs);
            },
            (err) => {
              markCollectionLoaded('ingredients');
              setCloudError(err.message || 'Error syncing ingredients');
            }
          )
        );

        // Sauces
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<Sauce>(
            user.uid,
            COLLECTIONS.SAUCES,
            (cloudSauces) => {
              markCollectionLoaded('sauces');
              saucesRef.current = cloudSauces;
              setSauces(cloudSauces);
              StorageService.saveSauces(cloudSauces);
            },
            (err) => {
              markCollectionLoaded('sauces');
              setCloudError(err.message || 'Error syncing sauces');
            }
          )
        );

        // Menus
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<MenuItem>(
            user.uid,
            COLLECTIONS.MENUS,
            (cloudMenus) => {
              markCollectionLoaded('menus');
              menusRef.current = cloudMenus;
              setMenus(cloudMenus);
              StorageService.saveMenus(cloudMenus);
            },
            (err) => {
              markCollectionLoaded('menus');
              setCloudError(err.message || 'Error syncing menus');
            }
          )
        );

        // Daily Sales
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<DailySalesRecord>(
            user.uid,
            COLLECTIONS.DAILY_SALES,
            (cloudSales) => {
              markCollectionLoaded('daily_sales');
              dailySalesRef.current = cloudSales;
              setDailySales(cloudSales);
              StorageService.saveDailySales(cloudSales);
            },
            (err) => {
              markCollectionLoaded('daily_sales');
              setCloudError(err.message || 'Error syncing daily sales');
            }
          )
        );

        // Expenses
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<ExpenseRecord>(
            user.uid,
            COLLECTIONS.EXPENSES,
            (cloudExp) => {
              markCollectionLoaded('expenses');
              expensesRef.current = cloudExp;
              setExpenses(cloudExp);
              StorageService.saveExpenses(cloudExp);
            },
            (err) => {
              markCollectionLoaded('expenses');
              setCloudError(err.message || 'Error syncing expenses');
            }
          )
        );

        // Employees
        unsubs.push(
          FirebaseSyncService.subscribeUserCollection<DomainEmployee>(
            user.uid,
            COLLECTIONS.EMPLOYEES,
            (cloudEmp) => {
              employeesRef.current = cloudEmp;
              setEmployees(cloudEmp);
              StorageService.saveEmployees(cloudEmp as any);
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
              purchasesRef.current = cloudPurchases;
              setPurchases(cloudPurchases);
              StorageService.savePurchases(cloudPurchases);
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
              inventoryRef.current = cloudInv;
              setInventory(cloudInv);
              StorageService.saveInventory(cloudInv);
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
              wasteLogRef.current = cloudWaste;
              setWasteLog(cloudWaste);
              StorageService.saveWasteLog(cloudWaste);
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
              suppliersRef.current = cloudSuppliers;
              setSuppliers(cloudSuppliers);
              StorageService.saveSuppliers(cloudSuppliers);
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
              priceHistoryRef.current = cloudHistory;
              setPriceHistory(cloudHistory);
              StorageService.savePriceHistory(cloudHistory);
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
              salesOrdersRef.current = cloudOrders;
              setSalesOrders(cloudOrders);
              StorageService.saveSalesOrders(cloudOrders);
            },
            (err) => setCloudError(err.message || 'Error syncing sales orders')
          )
        );
      } catch (err: any) {
        setIsCloudLoading(false);
        setCloudError(err?.message || 'ไม่สามารถเริ่มซิงค์ข้อมูลเรียลไทม์ได้');
      }
    });

    return () => {
      activeRunId++;
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

  // 3. State Update Handlers (All mutations sync immediately to Firestore in real-time)
  const handleSaveIngredient = (ingredient: Ingredient) => {
    const prevIngredients = ingredientsRef.current;
    const existingIndex = prevIngredients.findIndex((i) => i.id === ingredient.id);
    let updated: Ingredient[];
    if (existingIndex >= 0) {
      updated = [...prevIngredients];
      updated[existingIndex] = ingredient;
    } else {
      updated = [ingredient, ...prevIngredients];
    }
    ingredientsRef.current = updated;
    setIngredients(updated);
    StorageService.saveIngredients(updated);

    runCloudSync(
      (uid) => FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.INGREDIENTS, ingredient.id, ingredient),
      'บันทึกวัตถุดิบ'
    );

    // Also update or add inventory item if missing
    const prevInventory = inventoryRef.current;
    const invIndex = prevInventory.findIndex((inv) => inv.ingredientId === ingredient.id);
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
      const nextInv = [...prevInventory, newInv];
      inventoryRef.current = nextInv;
      setInventory(nextInv);
      StorageService.saveInventory(nextInv);
      runCloudSync(
        (uid) => FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.INVENTORY, newInv.id!, newInv),
        'สร้างรายการสต็อกวัตถุดิบ'
      );
    }
  };

  const handleDeleteIngredient = (ingredientId: string) => {
    const updatedIngredients = ingredientsRef.current.filter((i) => i.id !== ingredientId);
    ingredientsRef.current = updatedIngredients;
    setIngredients(updatedIngredients);
    StorageService.saveIngredients(updatedIngredients);

    const invToDelete = inventoryRef.current.filter((inv) => inv.ingredientId === ingredientId);
    const updatedInventory = inventoryRef.current.filter((inv) => inv.ingredientId !== ingredientId);
    inventoryRef.current = updatedInventory;
    setInventory(updatedInventory);
    StorageService.saveInventory(updatedInventory);

    runCloudSync(async (uid) => {
      await FirebaseSyncService.deleteUserDoc(uid, COLLECTIONS.INGREDIENTS, ingredientId);
      for (const inv of invToDelete) {
        if (inv.id) {
          await FirebaseSyncService.deleteUserDoc(uid, COLLECTIONS.INVENTORY, inv.id);
        }
      }
    }, 'ลบวัตถุดิบ');
  };

  const handleReorderIngredients = (reordered: Ingredient[]) => {
    const withOrder = reordered.map((item, index) => ({ ...item, displayOrder: index }));
    ingredientsRef.current = withOrder;
    setIngredients(withOrder);
    StorageService.saveIngredients(withOrder);
    runCloudSync(
      (uid) => FirebaseSyncService.batchSaveUser(uid, COLLECTIONS.INGREDIENTS, withOrder),
      'จัดเรียงวัตถุดิบ'
    );
  };

  const handleRecordPriceChange = (record: PriceHistoryRecord) => {
    const next = [record, ...priceHistoryRef.current];
    priceHistoryRef.current = next;
    setPriceHistory(next);
    StorageService.savePriceHistory(next);
    runCloudSync(
      (uid) => FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.PRICE_HISTORY, record.id, record),
      'บันทึกประวัติราคาวัตถุดิบ'
    );
  };

  const handleSaveSauce = (sauce: Sauce) => {
    const prevSauces = saucesRef.current;
    const existingIndex = prevSauces.findIndex((s) => s.id === sauce.id);
    let updated: Sauce[];
    if (existingIndex >= 0) {
      updated = [...prevSauces];
      updated[existingIndex] = sauce;
    } else {
      updated = [...prevSauces, sauce];
    }
    saucesRef.current = updated;
    setSauces(updated);
    StorageService.saveSauces(updated);
    runCloudSync(
      (uid) => FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.SAUCES, sauce.id, sauce),
      'บันทึกสูตรซอส'
    );
  };

  const handleSaveMenu = (menu: MenuItem) => {
    const prevMenus = menusRef.current;
    const existingIndex = prevMenus.findIndex((m) => m.id === menu.id);
    let updated: MenuItem[];
    if (existingIndex >= 0) {
      updated = [...prevMenus];
      updated[existingIndex] = menu;
    } else {
      updated = [...prevMenus, menu];
    }
    menusRef.current = updated;
    setMenus(updated);
    StorageService.saveMenus(updated);
    runCloudSync(
      (uid) => FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.MENUS, menu.id, menu),
      'บันทึกเมนูอาหาร'
    );
  };

  const handleDeleteMenu = (menuId: string) => {
    const updated = menusRef.current.filter((m) => m.id !== menuId);
    menusRef.current = updated;
    setMenus(updated);
    StorageService.saveMenus(updated);
    runCloudSync(
      (uid) => FirebaseSyncService.deleteUserDoc(uid, COLLECTIONS.MENUS, menuId),
      'ลบเมนูอาหาร'
    );
  };

  const handleReorderMenus = (reordered: MenuItem[]) => {
    const withOrder = reordered.map((menu, index) => ({ ...menu, displayOrder: index }));
    menusRef.current = withOrder;
    setMenus(withOrder);
    StorageService.saveMenus(withOrder);
    runCloudSync(
      (uid) => FirebaseSyncService.batchSaveUser(uid, COLLECTIONS.MENUS, withOrder),
      'จัดเรียงเมนูอาหาร'
    );
  };

  const handleUpdateVariantPrice = (
    menuId: string,
    variantId: string,
    prices: { sellingPrice: number; takeawayPrice: number; deliveryPrice: number }
  ) => {
    let targetMenu: MenuItem | undefined;
    const updated = menusRef.current.map((m) => {
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
    menusRef.current = updated;
    setMenus(updated);
    StorageService.saveMenus(updated);
    if (targetMenu) {
      const menuToSync = targetMenu;
      runCloudSync(
        (uid) => FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.MENUS, menuToSync.id, menuToSync),
        'อัปเดตราคาขายเมนู'
      );
    }
  };

  const handleSaveVariantRecipe = (
    menuId: string,
    variantId: string,
    recipeItems: RecipeItem[]
  ) => {
    let targetMenu: MenuItem | undefined;
    const updated = menusRef.current.map((m) => {
      if (m.id !== menuId) return m;
      const updatedVariants = m.variants.map((v) => {
        if (v.id !== variantId) return v;
        return { ...v, recipeItems };
      });
      const mUpdated = { ...m, variants: updatedVariants };
      targetMenu = mUpdated;
      return mUpdated;
    });
    menusRef.current = updated;
    setMenus(updated);
    StorageService.saveMenus(updated);
    if (targetMenu) {
      const menuToSync = targetMenu;
      runCloudSync(
        (uid) => FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.MENUS, menuToSync.id, menuToSync),
        'บันทึกสูตรอาหาร'
      );
    }
  };

  const handleSavePurchase = (purchase: PurchaseRecord) => {
    const nextPurchases = [purchase, ...purchasesRef.current];
    purchasesRef.current = nextPurchases;
    setPurchases(nextPurchases);
    StorageService.savePurchases(nextPurchases);

    runCloudSync(
      (uid) => FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.PURCHASES, purchase.id, purchase),
      'บันทึกรายการจัดซื้อ'
    );

    // Update inventory quantity
    const prevInventory = inventoryRef.current;
    const item = prevInventory.find((i) => i.ingredientId === purchase.ingredientId);
    if (item) {
      const updatedStock = item.currentStock + purchase.quantity;
      const updatedInvItem: InventoryItem = {
        ...item,
        currentStock: updatedStock,
        lastUpdated: new Date().toISOString(),
      };
      const updated = prevInventory.map((inv) =>
        inv.id === item.id ? updatedInvItem : inv
      );
      inventoryRef.current = updated;
      setInventory(updated);
      StorageService.saveInventory(updated);

      const invDocId = updatedInvItem.id || updatedInvItem.ingredientId;
      if (invDocId) {
        runCloudSync(
          (uid) => FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.INVENTORY, invDocId, updatedInvItem),
          'อัปเดตสต็อกจากการจัดซื้อ'
        );
      }

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
      const nextTxns = [txn, ...inventoryTransactionsRef.current];
      inventoryTransactionsRef.current = nextTxns;
      setInventoryTransactions(nextTxns);
      StorageService.saveInventoryTransactions(nextTxns);
    }
  };

  const handleUpdateIngredientPriceOnly = (ingredientId: string, newPrice: number) => {
    let targetIng: Ingredient | undefined;
    const updated = ingredientsRef.current.map((ing) => {
      if (ing.id !== ingredientId) return ing;
      const updatedIng = { ...ing, purchasePrice: newPrice };
      const calc = calculateIngredientCost(updatedIng);
      const nextIng: Ingredient = {
        ...updatedIng,
        actualCost: calc.actualCost,
        costPerBaseUnit: calc.costPerBaseUnit,
        updatedAt: new Date().toISOString(),
      };
      targetIng = nextIng;
      return nextIng;
    });
    ingredientsRef.current = updated;
    setIngredients(updated);
    StorageService.saveIngredients(updated);
    if (targetIng) {
      const ingToSync = targetIng;
      runCloudSync(
        (uid) => FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.INGREDIENTS, ingToSync.id, ingToSync),
        'อัปเดตราคาวัตถุดิบ'
      );
    }
  };

  const handleSaveAdjustment = (txn: InventoryTransaction, waste?: WasteRecord) => {
    const nextTxns = [txn, ...inventoryTransactionsRef.current];
    inventoryTransactionsRef.current = nextTxns;
    setInventoryTransactions(nextTxns);
    StorageService.saveInventoryTransactions(nextTxns);

    if (waste) {
      const nextWaste = [waste, ...wasteLogRef.current];
      wasteLogRef.current = nextWaste;
      setWasteLog(nextWaste);
      StorageService.saveWasteLog(nextWaste);
      runCloudSync(
        (uid) => FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.WASTE_LOG, waste.id, waste),
        'บันทึกของเสีย'
      );
    }

    // Update currentStock in inventory
    const delta = (txn as any).quantityChange ?? txn.quantity ?? 0;
    const changedItems: InventoryItem[] = [];
    const updated = inventoryRef.current.map((item) => {
      const matchesById = (txn as any).inventoryItemId && item.id === (txn as any).inventoryItemId;
      const matchesByIng = txn.ingredientId && item.ingredientId === txn.ingredientId;
      if (!matchesById && !matchesByIng) return item;
      const newStock = Math.max(0, item.currentStock + delta);
      const nextItem = { ...item, currentStock: newStock, lastUpdated: new Date().toISOString() };
      changedItems.push(nextItem);
      return nextItem;
    });
    inventoryRef.current = updated;
    setInventory(updated);
    StorageService.saveInventory(updated);

    if (changedItems.length > 0) {
      runCloudSync(
        (uid) => FirebaseSyncService.batchSaveUser(uid, COLLECTIONS.INVENTORY, changedItems),
        'ปรับยอดสต็อก'
      );
    }
  };

  const handleSaveExpense = (expense: ExpenseRecord) => {
    const nextExpenses = [expense, ...expensesRef.current];
    expensesRef.current = nextExpenses;
    setExpenses(nextExpenses);
    StorageService.saveExpenses(nextExpenses);
    runCloudSync(
      (uid) => FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.EXPENSES, expense.id, expense),
      'บันทึกค่าใช้จ่าย'
    );
  };

  const handleDeleteExpense = (id: string) => {
    const nextExpenses = expensesRef.current.filter((e) => e.id !== id);
    expensesRef.current = nextExpenses;
    setExpenses(nextExpenses);
    StorageService.saveExpenses(nextExpenses);
    runCloudSync(
      (uid) => FirebaseSyncService.deleteUserDoc(uid, COLLECTIONS.EXPENSES, id),
      'ลบค่าใช้จ่าย'
    );
  };

  const handleUpdateExpense = (updatedExp: ExpenseRecord) => {
    const nextExpenses = expensesRef.current.map((e) => (e.id === updatedExp.id ? updatedExp : e));
    expensesRef.current = nextExpenses;
    setExpenses(nextExpenses);
    StorageService.saveExpenses(nextExpenses);
    runCloudSync(
      (uid) => FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.EXPENSES, updatedExp.id, updatedExp),
      'แก้ไขค่าใช้จ่าย'
    );
  };

  const handleSaveSaleOrder = (order: SaleOrder) => {
    const nextOrders = [order, ...salesOrdersRef.current];
    salesOrdersRef.current = nextOrders;
    setSalesOrders(nextOrders);
    StorageService.saveSalesOrders(nextOrders);
    runCloudSync(
      (uid) => FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.SALES_ORDERS, order.id, order),
      'บันทึกรายการขาย'
    );
  };

  const handleAddDailySalesRecord = (rec: DailySalesRecord) => {
    const prev = dailySalesRef.current;
    const next = upsertDailySalesRecord(prev, rec);
    const savedRecord =
      next.find(
        (r) => r.date === rec.date && (r.channelId === rec.channelId || !r.channelId || !rec.channelId)
      ) || rec;
    dailySalesRef.current = next;
    setDailySales(next);
    StorageService.saveDailySales(next);
    runCloudSync(
      (uid) => FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.DAILY_SALES, savedRecord.id, savedRecord),
      'บันทึกยอดขายรายวัน'
    );
  };

  const handleDeleteDailySalesRecord = (id: string) => {
    const next = dailySalesRef.current.filter((s) => s.id !== id);
    dailySalesRef.current = next;
    setDailySales(next);
    StorageService.saveDailySales(next);
    runCloudSync(
      (uid) => FirebaseSyncService.deleteUserDoc(uid, COLLECTIONS.DAILY_SALES, id),
      'ลบยอดขายรายวัน'
    );
  };

  const handleSalesUpdated = (updatedSales: DailySalesRecord[]) => {
    dailySalesRef.current = updatedSales;
    setDailySales(updatedSales);
    StorageService.saveDailySales(updatedSales);
    runCloudSync(
      (uid) => FirebaseSyncService.replaceUserCollection(uid, COLLECTIONS.DAILY_SALES, updatedSales),
      'ซิงค์ยอดขายจากคลาวด์'
    );
  };

  const handleAddEmployee = (newEmp: DomainEmployee) => {
    const next = [newEmp, ...employeesRef.current];
    employeesRef.current = next;
    setEmployees(next);
    StorageService.saveEmployees(next as any);
    runCloudSync(
      (uid) => FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.EMPLOYEES, newEmp.id, newEmp),
      'เพิ่มพนักงาน'
    );
  };

  const handleDeleteEmployee = (id: string) => {
    const next = employeesRef.current.filter((e) => e.id !== id);
    employeesRef.current = next;
    setEmployees(next);
    StorageService.saveEmployees(next as any);
    runCloudSync(
      (uid) => FirebaseSyncService.deleteUserDoc(uid, COLLECTIONS.EMPLOYEES, id),
      'ลบพนักงาน'
    );
  };

  const handleSaveSettings = (newSettings: RestaurantSettings) => {
    settingsRef.current = newSettings;
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
    runCloudSync(
      (uid) => FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.SETTINGS, 'default', newSettings),
      'บันทึกการตั้งค่าระบบ'
    );
  };

  const handleIngredientsImported = (newIngredients: Ingredient[]) => {
    const prevIngredients = ingredientsRef.current;
    const existingIds = new Set(prevIngredients.map((i) => i.id));
    const toAdd = newIngredients.filter((i) => !existingIds.has(i.id));
    const next = [...toAdd, ...prevIngredients];
    ingredientsRef.current = next;
    setIngredients(next);
    StorageService.saveIngredients(next);
    if (toAdd.length > 0) {
      runCloudSync(
        (uid) => FirebaseSyncService.batchSaveUser(uid, COLLECTIONS.INGREDIENTS, toAdd),
        'นำเข้าวัตถุดิบ'
      );
    }
  };

  const handleReloadAllData = () => {
    const nextSettings = StorageService.getSettings();
    const nextIngredients = StorageService.getIngredients();
    const nextSauces = StorageService.getSauces();
    const nextMenus = StorageService.getMenus();
    const nextSuppliers = StorageService.getSuppliers();
    const nextInventory = StorageService.getInventory();
    const nextTxns = StorageService.getInventoryTransactions();
    const nextPurchases = StorageService.getPurchases();
    const nextPriceHistory = StorageService.getPriceHistory();
    const nextExpenses = StorageService.getExpenses();
    const nextSalesOrders = StorageService.getSalesOrders();
    const nextWasteLog = StorageService.getWasteLog();
    const nextEmployees = StorageService.getEmployees();
    const nextDailySales = StorageService.getDailySales();

    settingsRef.current = nextSettings;
    ingredientsRef.current = nextIngredients;
    saucesRef.current = nextSauces;
    menusRef.current = nextMenus;
    suppliersRef.current = nextSuppliers;
    inventoryRef.current = nextInventory;
    inventoryTransactionsRef.current = nextTxns;
    purchasesRef.current = nextPurchases;
    priceHistoryRef.current = nextPriceHistory;
    expensesRef.current = nextExpenses;
    salesOrdersRef.current = nextSalesOrders;
    wasteLogRef.current = nextWasteLog;
    employeesRef.current = nextEmployees;
    dailySalesRef.current = nextDailySales;

    setSettings(nextSettings);
    setIngredients(nextIngredients);
    setSauces(nextSauces);
    setMenus(nextMenus);
    setSuppliers(nextSuppliers);
    setInventory(nextInventory);
    setInventoryTransactions(nextTxns);
    setPurchases(nextPurchases);
    setPriceHistory(nextPriceHistory);
    setExpenses(nextExpenses);
    setSalesOrders(nextSalesOrders);
    setWasteLog(nextWasteLog);
    setEmployees(nextEmployees);
    setDailySales(nextDailySales);
  };

  const syncAllCurrentDataToCloud = () => {
    runCloudSync(async (uid) => {
      await FirebaseSyncService.saveUserDoc(uid, COLLECTIONS.SETTINGS, 'default', settingsRef.current);
      await Promise.all([
        FirebaseSyncService.replaceUserCollection(uid, COLLECTIONS.INGREDIENTS, ingredientsRef.current),
        FirebaseSyncService.replaceUserCollection(uid, COLLECTIONS.SAUCES, saucesRef.current),
        FirebaseSyncService.replaceUserCollection(uid, COLLECTIONS.MENUS, menusRef.current),
        FirebaseSyncService.replaceUserCollection(uid, COLLECTIONS.DAILY_SALES, dailySalesRef.current),
        FirebaseSyncService.replaceUserCollection(uid, COLLECTIONS.EXPENSES, expensesRef.current),
        FirebaseSyncService.replaceUserCollection(uid, COLLECTIONS.EMPLOYEES, employeesRef.current),
        FirebaseSyncService.replaceUserCollection(uid, COLLECTIONS.INVENTORY, inventoryRef.current),
        FirebaseSyncService.replaceUserCollection(uid, COLLECTIONS.PURCHASES, purchasesRef.current),
        FirebaseSyncService.replaceUserCollection(uid, COLLECTIONS.WASTE_LOG, wasteLogRef.current),
        FirebaseSyncService.replaceUserCollection(uid, COLLECTIONS.SUPPLIERS, suppliersRef.current),
        FirebaseSyncService.replaceUserCollection(uid, COLLECTIONS.PRICE_HISTORY, priceHistoryRef.current),
        FirebaseSyncService.replaceUserCollection(uid, COLLECTIONS.SALES_ORDERS, salesOrdersRef.current),
      ]);
    }, 'ซิงค์ข้อมูลทั้งหมดขึ้น Cloud');
  };

  const handleResetDefaults = () => {
    StorageService.resetToDefaults();
    handleReloadAllData();
    syncAllCurrentDataToCloud();
    setCurrentTab('dashboard');
  };

  const handleRestoreBackupAndSync = () => {
    handleReloadAllData();
    syncAllCurrentDataToCloud();
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
        onUpdateRole={(role) => handleSaveSettings({ ...settingsRef.current, userRole: role })}
        reviewItemsCount={reviewRequiredCount}
        lowStockCount={0}
        onOpenMobileNav={() => setIsMobileNavOpen(true)}
        onNavigateToTab={(tabId) => setCurrentTab(tabId)}
        onOpenIconModal={() => setIsIconModalOpen(true)}
        onOpenFirebaseSync={() => setIsFirebaseModalOpen(true)}
        currentUser={currentUser}
        isCloudLoading={isCloudLoading || pendingSyncCount > 0}
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
          onReloadData={handleRestoreBackupAndSync}
          onOpenIconModal={() => setIsIconModalOpen(true)}
          onOpenFirebaseSync={() => setIsFirebaseModalOpen(true)}
          currentUser={currentUser}
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
              employees={employees as any}
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
              ingredients={ingredients as any}
              sales={dailySales}
              expenses={expenses as any}
              employees={employees as any}
              menuItems={menus as any}
              inventory={inventory as any}
              allWaste={wasteLog as any}
              channels={defaultSalesChannels}
              currentSettings={settings}
              activeLanguage="th"
              onNavigate={(tabId) => setCurrentTab(tabId)}
              onNavigateToTab={(tabId) => setCurrentTab(tabId)}
              onSalesUpdated={handleSalesUpdated}
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
              onSalesUpdated={handleSalesUpdated}
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
              onSaveAdjustment={handleSaveAdjustment}
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
              onUpdateIngredientPrice={handleUpdateIngredientPriceOnly}
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
              onIngredientsImported={handleIngredientsImported}
              onEditIngredient={(ing) => handleSaveIngredient(ing)}
              onResetDefaults={handleResetDefaults}
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
