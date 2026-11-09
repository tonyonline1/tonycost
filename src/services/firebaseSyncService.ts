import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { StorageService } from './storageService';
import {
  Ingredient,
  Sauce,
  MenuItem,
  RestaurantSettings,
  Supplier,
  ExpenseRecord,
  SaleOrder,
  InventoryItem,
  InventoryTransaction,
  WasteRecord,
  PurchaseRecord,
  PriceHistoryRecord,
  Employee,
} from '../types';
import { DailySalesRecord } from '../types/domain';

export const COLLECTIONS = {
  SETTINGS: 'settings',
  INGREDIENTS: 'ingredients',
  SAUCES: 'sauces',
  MENUS: 'menus',
  DAILY_SALES: 'daily_sales',
  EXPENSES: 'expenses',
  EMPLOYEES: 'employees',
  INVENTORY: 'inventory',
  PURCHASES: 'purchases',
  WASTE_LOG: 'waste_log',
  SUPPLIERS: 'suppliers',
  PRICE_HISTORY: 'price_history',
} as const;

export interface CloudSyncState {
  isSyncing: boolean;
  isConnected: boolean;
  lastSyncedAt: string | null;
  error: string | null;
}

export const FirebaseSyncService = {
  /**
   * Save a single entity to Firestore
   */
  async saveDoc<T extends Record<string, any>>(collectionName: string, docId: string, data: T): Promise<void> {
    try {
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${docId}`);
    }
  },

  /**
   * Delete a document from Firestore
   */
  async deleteDoc(collectionName: string, docId: string): Promise<void> {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${docId}`);
    }
  },

  /**
   * Batch upload multiple entities to Firestore
   */
  async batchSave<T extends { id: string }>(collectionName: string, items: T[]): Promise<void> {
    if (!items || items.length === 0) return;
    try {
      // Firestore batch max 500 ops
      const chunkSize = 400;
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          const docRef = doc(db, collectionName, item.id);
          batch.set(docRef, { ...item, updatedAt: new Date().toISOString() }, { merge: true });
        });
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, collectionName);
    }
  },

  /**
   * Realtime listener for a collection
   */
  subscribeToCollection<T>(collectionName: string, onUpdate: (items: T[]) => void): () => void {
    const colRef = collection(db, collectionName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => docSnap.data() as T);
        onUpdate(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, collectionName);
      }
    );
  },

  /**
   * Upload all current local restaurant data to Firestore cloud
   */
  async syncLocalToCloud(): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = StorageService.getSettings();
      const ingredients = StorageService.getIngredients();
      const sauces = StorageService.getSauces();
      const menus = StorageService.getMenus();
      const dailySales = StorageService.getDailySales();
      const expenses = StorageService.getExpenses();
      const employees = StorageService.getEmployees();
      const inventory = StorageService.getInventory();
      const purchases = StorageService.getPurchases();
      const wasteLog = StorageService.getWasteLog();
      const suppliers = StorageService.getSuppliers();
      const priceHistory = StorageService.getPriceHistory();

      // Save Settings doc
      await this.saveDoc(COLLECTIONS.SETTINGS, 'default', settings);

      // Save arrays in parallel
      await Promise.all([
        this.batchSave(COLLECTIONS.INGREDIENTS, ingredients),
        this.batchSave(COLLECTIONS.SAUCES, sauces),
        this.batchSave(COLLECTIONS.MENUS, menus),
        this.batchSave(COLLECTIONS.DAILY_SALES, dailySales),
        this.batchSave(COLLECTIONS.EXPENSES, expenses),
        this.batchSave(COLLECTIONS.EMPLOYEES, employees),
        this.batchSave(COLLECTIONS.INVENTORY, inventory),
        this.batchSave(COLLECTIONS.PURCHASES, purchases),
        this.batchSave(COLLECTIONS.WASTE_LOG, wasteLog),
        this.batchSave(COLLECTIONS.SUPPLIERS, suppliers),
        this.batchSave(COLLECTIONS.PRICE_HISTORY, priceHistory),
      ]);

      return { success: true };
    } catch (err: any) {
      console.error('Failed to sync to cloud:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Fetch all data from cloud and replace/merge into local storage
   */
  async pullCloudToLocal(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      let count = 0;

      // Settings
      const settingsSnap = await getDocs(collection(db, COLLECTIONS.SETTINGS));
      if (!settingsSnap.empty) {
        const cloudSettings = settingsSnap.docs[0].data() as RestaurantSettings;
        StorageService.saveSettings(cloudSettings);
        count++;
      }

      // Ingredients
      const ingSnap = await getDocs(collection(db, COLLECTIONS.INGREDIENTS));
      if (!ingSnap.empty) {
        const cloudIngs = ingSnap.docs.map((d) => d.data() as Ingredient);
        StorageService.saveIngredients(cloudIngs);
        count += cloudIngs.length;
      }

      // Sauces
      const sauceSnap = await getDocs(collection(db, COLLECTIONS.SAUCES));
      if (!sauceSnap.empty) {
        const cloudSauces = sauceSnap.docs.map((d) => d.data() as Sauce);
        StorageService.saveSauces(cloudSauces);
        count += cloudSauces.length;
      }

      // Menus
      const menuSnap = await getDocs(collection(db, COLLECTIONS.MENUS));
      if (!menuSnap.empty) {
        const cloudMenus = menuSnap.docs.map((d) => d.data() as MenuItem);
        StorageService.saveMenus(cloudMenus);
        count += cloudMenus.length;
      }

      // Daily Sales
      const salesSnap = await getDocs(collection(db, COLLECTIONS.DAILY_SALES));
      if (!salesSnap.empty) {
        const cloudSales = salesSnap.docs.map((d) => d.data() as DailySalesRecord);
        StorageService.saveDailySales(cloudSales);
        count += cloudSales.length;
      }

      // Expenses
      const expSnap = await getDocs(collection(db, COLLECTIONS.EXPENSES));
      if (!expSnap.empty) {
        const cloudExp = expSnap.docs.map((d) => d.data() as ExpenseRecord);
        StorageService.saveExpenses(cloudExp);
        count += cloudExp.length;
      }

      // Employees
      const empSnap = await getDocs(collection(db, COLLECTIONS.EMPLOYEES));
      if (!empSnap.empty) {
        const cloudEmp = empSnap.docs.map((d) => d.data() as Employee);
        StorageService.saveEmployees(cloudEmp);
        count += cloudEmp.length;
      }

      // Inventory
      const invSnap = await getDocs(collection(db, COLLECTIONS.INVENTORY));
      if (!invSnap.empty) {
        const cloudInv = invSnap.docs.map((d) => d.data() as InventoryItem);
        StorageService.saveInventory(cloudInv);
        count += cloudInv.length;
      }

      // Purchases
      const purSnap = await getDocs(collection(db, COLLECTIONS.PURCHASES));
      if (!purSnap.empty) {
        const cloudPur = purSnap.docs.map((d) => d.data() as PurchaseRecord);
        StorageService.savePurchases(cloudPur);
        count += cloudPur.length;
      }

      // Waste
      const wasteSnap = await getDocs(collection(db, COLLECTIONS.WASTE_LOG));
      if (!wasteSnap.empty) {
        const cloudWaste = wasteSnap.docs.map((d) => d.data() as WasteRecord);
        StorageService.saveWasteLog(cloudWaste);
        count += cloudWaste.length;
      }

      return { success: true, count };
    } catch (err: any) {
      console.error('Failed to pull from cloud:', err);
      return { success: false, count: 0, error: err.message };
    }
  },

  /**
   * Pull only daily sales from Firestore cloud (for Live POS Sync)
   */
  async pullDailySales(): Promise<{ success: boolean; data: DailySalesRecord[]; error?: string }> {
    try {
      const salesSnap = await getDocs(collection(db, COLLECTIONS.DAILY_SALES));
      if (!salesSnap.empty) {
        const cloudSales = salesSnap.docs.map((d) => d.data() as DailySalesRecord);
        StorageService.saveDailySales(cloudSales);
        return { success: true, data: cloudSales };
      }
      return { success: true, data: StorageService.getDailySales() };
    } catch (err: any) {
      console.error('Failed to pull daily sales:', err);
      return { success: false, data: StorageService.getDailySales(), error: err.message };
    }
  },
};
