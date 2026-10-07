import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  UtensilsCrossed,
  FlaskConical,
  Wheat,
  Plus,
  Trash2,
  Save,
  Search,
  CheckCircle2,
  Sparkles,
  SlidersHorizontal,
  Info,
  ChevronRight,
  Edit2,
  X,
  Package,
  Soup,
} from 'lucide-react';
import {
  MenuItem,
  MenuVariant,
  Ingredient,
  Sauce,
  RecipeItem,
  SauceRecipeItem,
  RestaurantSettings,
  PackagingLineItem,
  UnitType,
} from '../types';
import {
  calculateVariantCostBreakdown,
  calculateSauceCost,
} from '../services/calculationEngine';
import { NumericInput } from './common/NumericInput';

// Presets for Packaging & Side Dishes in Central Recipe Repository
interface PresetItem {
  id: string;
  name: string;
  type: 'PACKAGING' | 'PREPARED_ITEM' | 'INGREDIENT';
  unit: UnitType;
  defaultQty: number;
  unitCost: number;
}

const PACKAGING_PRESETS: PresetItem[] = [
  { id: 'pkg_kraft_box', name: 'กล่องกระดาษคราฟท์อาหารรักษ์โลก', type: 'PACKAGING', unit: 'ชิ้น', defaultQty: 1, unitCost: 2.50 },
  { id: 'pkg_pp_box', name: 'กล่องพลาสติก PP ไมโครเวฟพร้อมฝา', type: 'PACKAGING', unit: 'ชิ้น', defaultQty: 1, unitCost: 3.50 },
  { id: 'pkg_cutlery_set', name: 'ชุดช้อนส้อมพลาสติก + ทิชชู', type: 'PACKAGING', unit: 'ชุด', defaultQty: 1, unitCost: 1.20 },
  { id: 'pkg_sauce_cup', name: 'ถ้วยน้ำจิ้ม 2oz + ฝา', type: 'PACKAGING', unit: 'ชิ้น', defaultQty: 1, unitCost: 0.80 },
  { id: 'pkg_bag', name: 'ถุงหูหิ้วพลาสติกรักษ์โลก', type: 'PACKAGING', unit: 'ชิ้น', defaultQty: 1, unitCost: 0.70 },
  { id: 'pkg_soup_bowl', name: 'ถ้วยซุปกระดาษ 350ml + ฝา', type: 'PACKAGING', unit: 'ชิ้น', defaultQty: 1, unitCost: 2.80 },
];

const SIDE_DISH_PRESETS: PresetItem[] = [
  { id: 'side_chili_fish_sauce', name: 'พริกน้ำปลาแท้ (ถ้วยแยก)', type: 'PREPARED_ITEM', unit: 'ชุด', defaultQty: 1, unitCost: 1.50 },
  { id: 'side_cucumber', name: 'แตงกวาหั่นชิ้นเคียง (30g)', type: 'PREPARED_ITEM', unit: 'ชุด', defaultQty: 1, unitCost: 1.00 },
  { id: 'side_lime', name: 'มะนาวฝานซีก', type: 'PREPARED_ITEM', unit: 'ชิ้น', defaultQty: 1, unitCost: 1.20 },
  { id: 'side_cooked_rice', name: 'ข้าวสวยหอมมะลิ (200g)', type: 'PREPARED_ITEM', unit: 'จาน', defaultQty: 1, unitCost: 8.67 },
  { id: 'side_fried_egg', name: 'ไข่ดาวเป็ด/ไก่', type: 'PREPARED_ITEM', unit: 'ฟอง', defaultQty: 1, unitCost: 7.00 },
  { id: 'side_fresh_herb', name: 'ผักเคียง / ต้นหอมผักชี', type: 'PREPARED_ITEM', unit: 'ชุด', defaultQty: 1, unitCost: 0.80 },
];

interface RecipeBuilderViewProps {
  menus: MenuItem[];
  ingredients: Ingredient[];
  sauces: Sauce[];
  settings: RestaurantSettings;
  initialVariantId?: string;
  initialTab?: 'FOOD' | 'SAUCE' | 'RICE_NOODLES';
  onSaveVariantRecipe: (menuId: string, variantId: string, recipeItems: RecipeItem[]) => void;
  onSaveSauce?: (sauce: Sauce) => void;
  onSaveMenu?: (menu: MenuItem) => void;
}

export const RecipeBuilderView: React.FC<RecipeBuilderViewProps> = ({
  menus,
  ingredients,
  sauces,
  settings,
  initialVariantId,
  initialTab,
  onSaveVariantRecipe,
  onSaveSauce,
  onSaveMenu,
}) => {
  // 3 Primary Tabs
  const [activeTab, setActiveTab] = useState<'FOOD' | 'SAUCE' | 'RICE_NOODLES'>(initialTab || 'FOOD');

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Fast maps
  const ingredientsMap = useMemo(
    () => new Map<string, Ingredient>(ingredients.map((i) => [i.id, i])),
    [ingredients]
  );
  const saucesMap = useMemo(
    () => new Map<string, Sauce>(sauces.map((s) => [s.id, s])),
    [sauces]
  );

  // --- TAB 1: CENTRAL BASE RECIPES (คลังสูตรอาหารกลาง) ---
  const [selectedMenuId, setSelectedMenuId] = useState<string>(() => {
    if (initialVariantId) {
      const found = menus.find((m) => m.variants.some((v) => v.id === initialVariantId));
      if (found) return found.id;
    }
    return menus[0]?.id || '';
  });

  const currentMenu = useMemo(() => {
    return menus.find((m) => m.id === selectedMenuId) || menus[0];
  }, [menus, selectedMenuId]);

  const [localBaseItems, setLocalBaseItems] = useState<RecipeItem[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  useEffect(() => {
    if (initialVariantId) {
      const found = menus.find((m) => m.variants.some((v) => v.id === initialVariantId));
      if (found) {
        setSelectedMenuId(found.id);
        setActiveTab('FOOD');
      }
    }
  }, [initialVariantId, menus]);

  // Load base items whenever selectedMenuId changes
  useEffect(() => {
    if (currentMenu) {
      const firstVariant = currentMenu.variants[0];
      const items: RecipeItem[] = [];

      if (firstVariant && firstVariant.recipeItems && firstVariant.recipeItems.length > 0) {
        firstVariant.recipeItems.forEach((it) => {
          const lower = it.name.toLowerCase();
          const isMeat =
            it.proteinCategory === 'SHRIMP' ||
            it.proteinCategory === 'SQUID' ||
            it.proteinCategory === 'PORK' ||
            it.proteinCategory === 'CHICKEN' ||
            it.proteinCategory === 'BEEF' ||
            lower.includes('หมู') ||
            lower.includes('ไก่') ||
            lower.includes('เนื้อ') ||
            lower.includes('กุ้ง') ||
            lower.includes('หมึก') ||
            lower.includes('ไส้กรอก') ||
            lower.includes('ปลา');

          if (!isMeat) {
            items.push({ ...it });
          }
        });
      }

      // If packaging items exist on variant and not yet in items as PACKAGING:
      if (firstVariant?.packagingItems && firstVariant.packagingItems.length > 0) {
        firstVariant.packagingItems.forEach((pkg) => {
          if (!items.some((it) => it.name === pkg.name)) {
            items.push({
              id: `pkg_${pkg.id}`,
              type: 'PACKAGING',
              ingredientType: 'PACKAGING',
              ingredientId: pkg.id,
              name: pkg.name,
              quantity: 1,
              unit: 'ชิ้น',
              calculatedUnitCost: pkg.cost,
              calculatedLineCost: pkg.cost,
            });
          }
        });
      } else if (!items.some((it) => it.type === 'PACKAGING')) {
        items.push({
          id: `pkg_default_box`,
          type: 'PACKAGING',
          ingredientType: 'PACKAGING',
          ingredientId: 'pkg_kraft_box',
          name: 'กล่องกระดาษคราฟท์อาหารรักษ์โลก',
          quantity: 1,
          unit: 'ชิ้น',
          calculatedUnitCost: 2.50,
          calculatedLineCost: 2.50,
        });
      }

      setLocalBaseItems(items);
      setHasUnsavedChanges(false);
    }
  }, [selectedMenuId, menus]);

  // Calculate unit cost and line cost for each item
  const getItemCost = (item: RecipeItem) => {
    if (item.type === 'SAUCE') {
      const sauce = saucesMap.get(item.ingredientId || item.sauceId || '');
      if (sauce) {
        const c = calculateSauceCost(sauce, ingredientsMap);
        return { unitCost: c.costPerGram, lineCost: item.quantity * c.costPerGram };
      }
      return { unitCost: item.calculatedUnitCost || 0.05, lineCost: item.quantity * (item.calculatedUnitCost || 0.05) };
    }

    if (item.type === 'PACKAGING') {
      const preset = PACKAGING_PRESETS.find((p) => p.id === item.ingredientId || p.name === item.name);
      const ing = ingredientsMap.get(item.ingredientId);
      const unitCost = preset?.unitCost ?? (ing?.costPerBaseUnit ?? (item.calculatedUnitCost || 2.50));
      return { unitCost, lineCost: item.quantity * unitCost };
    }

    if (item.type === 'PREPARED_ITEM') {
      const preset = SIDE_DISH_PRESETS.find((p) => p.id === item.ingredientId || p.name === item.name);
      const ing = ingredientsMap.get(item.ingredientId);
      const unitCost = preset?.unitCost ?? (ing?.costPerBaseUnit ?? (item.calculatedUnitCost || 1.50));
      return { unitCost, lineCost: item.quantity * unitCost };
    }

    const ing = ingredientsMap.get(item.ingredientId);
    const unitCost = ing ? ing.costPerBaseUnit : (item.calculatedUnitCost || 0);
    return { unitCost, lineCost: item.quantity * unitCost };
  };

  const totalBaseIngredientsCost = useMemo(() => {
    return localBaseItems
      .filter((it) => it.type === 'INGREDIENT' || (!it.type && it.ingredientType !== 'SAUCE' && it.ingredientType !== 'PACKAGING' && it.ingredientType !== 'PREPARED_ITEM'))
      .reduce((sum, it) => sum + getItemCost(it).lineCost, 0);
  }, [localBaseItems, ingredientsMap, saucesMap]);

  const totalSauceCost = useMemo(() => {
    return localBaseItems
      .filter((it) => it.type === 'SAUCE' || it.ingredientType === 'SAUCE')
      .reduce((sum, it) => sum + getItemCost(it).lineCost, 0);
  }, [localBaseItems, ingredientsMap, saucesMap]);

  const totalSideDishCost = useMemo(() => {
    return localBaseItems
      .filter((it) => it.type === 'PREPARED_ITEM' || it.ingredientType === 'PREPARED_ITEM')
      .reduce((sum, it) => sum + getItemCost(it).lineCost, 0);
  }, [localBaseItems, ingredientsMap, saucesMap]);

  const totalPackagingCost = useMemo(() => {
    return localBaseItems
      .filter((it) => it.type === 'PACKAGING' || it.ingredientType === 'PACKAGING')
      .reduce((sum, it) => sum + getItemCost(it).lineCost, 0);
  }, [localBaseItems, ingredientsMap, saucesMap]);

  const totalBaseRecipeCost =
    totalBaseIngredientsCost + totalSauceCost + totalSideDishCost + totalPackagingCost;

  const handleAddBaseIngredient = () => {
    const candidate =
      ingredients.find(
        (i) =>
          !i.name.includes('หมู') &&
          !i.name.includes('ไก่') &&
          !i.name.includes('เนื้อ') &&
          !i.name.includes('กุ้ง') &&
          !i.name.includes('หมึก') &&
          i.category !== 'บรรจุภัณฑ์'
      ) || ingredients[0];
    if (!candidate) return;
    const newItem: RecipeItem = {
      id: `base_ing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'INGREDIENT',
      ingredientType: 'INGREDIENT',
      ingredientId: candidate.id,
      name: candidate.name,
      quantity: candidate.usageUnit === 'g' ? 10 : 1,
      unit: candidate.usageUnit,
      calculatedUnitCost: candidate.costPerBaseUnit,
      calculatedLineCost: (candidate.usageUnit === 'g' ? 10 : 1) * candidate.costPerBaseUnit,
    };
    setLocalBaseItems([...localBaseItems, newItem]);
    setHasUnsavedChanges(true);
  };

  const handleAddSauce = () => {
    const firstSauce = sauces[0];
    if (!firstSauce) return;
    const costInfo = calculateSauceCost(firstSauce, ingredientsMap);
    const newItem: RecipeItem = {
      id: `base_sauce_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'SAUCE',
      ingredientType: 'SAUCE',
      ingredientId: firstSauce.id,
      sauceId: firstSauce.id,
      name: firstSauce.name,
      quantity: 30,
      unit: 'g',
      calculatedUnitCost: costInfo.costPerGram,
      calculatedLineCost: 30 * costInfo.costPerGram,
    };
    setLocalBaseItems([...localBaseItems, newItem]);
    setHasUnsavedChanges(true);
  };

  const handleAddSideDish = () => {
    const defaultSide = SIDE_DISH_PRESETS[0];
    const newItem: RecipeItem = {
      id: `base_side_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'PREPARED_ITEM',
      ingredientType: 'PREPARED_ITEM',
      ingredientId: defaultSide.id,
      name: defaultSide.name,
      quantity: defaultSide.defaultQty,
      unit: defaultSide.unit,
      calculatedUnitCost: defaultSide.unitCost,
      calculatedLineCost: defaultSide.defaultQty * defaultSide.unitCost,
    };
    setLocalBaseItems([...localBaseItems, newItem]);
    setHasUnsavedChanges(true);
  };

  const handleAddPackaging = () => {
    const defaultPkg = PACKAGING_PRESETS[0];
    const newItem: RecipeItem = {
      id: `base_pkg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'PACKAGING',
      ingredientType: 'PACKAGING',
      ingredientId: defaultPkg.id,
      name: defaultPkg.name,
      quantity: defaultPkg.defaultQty,
      unit: defaultPkg.unit,
      calculatedUnitCost: defaultPkg.unitCost,
      calculatedLineCost: defaultPkg.defaultQty * defaultPkg.unitCost,
    };
    setLocalBaseItems([...localBaseItems, newItem]);
    setHasUnsavedChanges(true);
  };

  const handleRemoveBaseItem = (index: number) => {
    const updated = [...localBaseItems];
    updated.splice(index, 1);
    setLocalBaseItems(updated);
    setHasUnsavedChanges(true);
  };

  const handleUpdateBaseItemSource = (index: number, id: string) => {
    const updated = [...localBaseItems];
    const current = updated[index];
    if (current.type === 'SAUCE') {
      const s = saucesMap.get(id);
      if (s) {
        const cost = calculateSauceCost(s, ingredientsMap);
        current.ingredientId = s.id;
        current.sauceId = s.id;
        current.name = s.name;
        current.unit = 'g';
        current.calculatedUnitCost = cost.costPerGram;
        current.calculatedLineCost = current.quantity * cost.costPerGram;
      }
    } else if (current.type === 'PACKAGING') {
      const preset = PACKAGING_PRESETS.find((p) => p.id === id);
      if (preset) {
        current.ingredientId = preset.id;
        current.name = preset.name;
        current.unit = preset.unit;
        current.calculatedUnitCost = preset.unitCost;
        current.calculatedLineCost = current.quantity * preset.unitCost;
      } else {
        const ing = ingredientsMap.get(id);
        if (ing) {
          current.ingredientId = ing.id;
          current.name = ing.name;
          current.unit = ing.usageUnit;
          current.calculatedUnitCost = ing.costPerBaseUnit;
          current.calculatedLineCost = current.quantity * ing.costPerBaseUnit;
        }
      }
    } else if (current.type === 'PREPARED_ITEM') {
      const preset = SIDE_DISH_PRESETS.find((p) => p.id === id);
      if (preset) {
        current.ingredientId = preset.id;
        current.name = preset.name;
        current.unit = preset.unit;
        current.calculatedUnitCost = preset.unitCost;
        current.calculatedLineCost = current.quantity * preset.unitCost;
      } else {
        const ing = ingredientsMap.get(id);
        if (ing) {
          current.ingredientId = ing.id;
          current.name = ing.name;
          current.unit = ing.usageUnit;
          current.calculatedUnitCost = ing.costPerBaseUnit;
          current.calculatedLineCost = current.quantity * ing.costPerBaseUnit;
        }
      }
    } else {
      const ing = ingredientsMap.get(id);
      if (ing) {
        current.ingredientId = ing.id;
        current.name = ing.name;
        current.unit = ing.usageUnit;
        current.calculatedUnitCost = ing.costPerBaseUnit;
        current.calculatedLineCost = current.quantity * ing.costPerBaseUnit;
      }
    }
    setLocalBaseItems(updated);
    setHasUnsavedChanges(true);
  };

  const handleUpdateBaseItemQuantity = (index: number, qty: number) => {
    const updated = [...localBaseItems];
    updated[index].quantity = qty;
    const cost = getItemCost(updated[index]);
    updated[index].calculatedLineCost = cost.lineCost;
    setLocalBaseItems(updated);
    setHasUnsavedChanges(true);
  };

  const handleSaveBaseRecipe = () => {
    if (!currentMenu) return;

    const packagingCost = totalPackagingCost;
    const packagingItems: PackagingLineItem[] = localBaseItems
      .filter((it) => it.type === 'PACKAGING' || it.ingredientType === 'PACKAGING')
      .map((it) => ({
        id: it.id || `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: it.name,
        cost: getItemCost(it).lineCost,
      }));

    const enrichedBaseItems = localBaseItems.map((it) => {
      const c = getItemCost(it);
      return {
        ...it,
        calculatedUnitCost: c.unitCost,
        calculatedLineCost: c.lineCost,
      };
    });

    const updatedVariants = currentMenu.variants.map((v) => {
      // Keep protein item(s) from existing variant
      const proteinItems = (v.recipeItems || []).filter((it) => {
        const lower = it.name.toLowerCase();
        return (
          it.proteinCategory === 'SHRIMP' ||
          it.proteinCategory === 'SQUID' ||
          it.proteinCategory === 'PORK' ||
          it.proteinCategory === 'CHICKEN' ||
          it.proteinCategory === 'BEEF' ||
          lower.includes('หมู') ||
          lower.includes('ไก่') ||
          lower.includes('เนื้อ') ||
          lower.includes('กุ้ง') ||
          lower.includes('หมึก') ||
          lower.includes('ไส้กรอก') ||
          lower.includes('ปลา')
        );
      });

      const combinedRecipeItems = [...proteinItems, ...enrichedBaseItems];

      return {
        ...v,
        recipeItems: combinedRecipeItems,
        packagingCost: packagingCost > 0 ? packagingCost : v.packagingCost,
        packagingItems: packagingItems.length > 0 ? packagingItems : v.packagingItems,
      };
    });

    const updatedMenu: MenuItem = {
      ...currentMenu,
      variants: updatedVariants,
      updatedAt: new Date().toISOString(),
    };

    if (onSaveMenu) {
      onSaveMenu(updatedMenu);
    }

    updatedVariants.forEach((v) => {
      onSaveVariantRecipe(currentMenu.id, v.id, v.recipeItems);
    });

    setHasUnsavedChanges(false);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3500);
  };

  // --- TAB 2: MAIN SAUCES (ซอสหลัก) ---
  const [sauceSearch, setSauceSearch] = useState('');
  const [selectedSauce, setSelectedSauce] = useState<Sauce | null>(sauces[0] || null);
  const [isSauceModalOpen, setIsSauceModalOpen] = useState(false);
  const [editingSauce, setEditingSauce] = useState<Partial<Sauce> | null>(null);

  const filteredSauces = useMemo(() => {
    return sauces.filter((s) => s.name.toLowerCase().includes(sauceSearch.toLowerCase()));
  }, [sauces, sauceSearch]);

  const handleOpenAddSauce = () => {
    const newSauce: Partial<Sauce> = {
      id: `sauce_${Date.now()}`,
      name: '',
      category: 'ซอสปรุงรส',
      productionQuantity: 1000,
      productionUnit: 'g',
      yieldPercent: 100,
      actualQuantity: 1000,
      productionCost: 0,
      actualCost: 0,
      costPerGram: 0,
      items: [],
      active: true,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingSauce(newSauce);
    setIsSauceModalOpen(true);
  };

  const handleOpenEditSauce = (sauce: Sauce) => {
    setEditingSauce(JSON.parse(JSON.stringify(sauce)));
    setIsSauceModalOpen(true);
  };

  const handleSaveSauceModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSauce || !editingSauce.name) return;

    const calc = calculateSauceCost(editingSauce, ingredientsMap);
    const finalSauce: Sauce = {
      id: editingSauce.id || `sauce_${Date.now()}`,
      name: editingSauce.name.trim(),
      category: editingSauce.category || 'ซอสปรุงรส',
      productionQuantity: Number(editingSauce.productionQuantity) || 1000,
      productionUnit: editingSauce.productionUnit || 'g',
      yieldPercent: Number(editingSauce.yieldPercent) || 100,
      actualQuantity: Number(editingSauce.actualQuantity) || 1000,
      productionCost: calc.productionCost,
      actualCost: calc.actualCost,
      costPerGram: calc.costPerGram,
      items: editingSauce.items || [],
      active: editingSauce.active !== undefined ? editingSauce.active : true,
      notes: editingSauce.notes,
      createdAt: editingSauce.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onSaveSauce) {
      onSaveSauce(finalSauce);
    }
    setSelectedSauce(finalSauce);
    setIsSauceModalOpen(false);
  };

  // --- TAB 3: RICE & NOODLES (ข้าวและเส้น) ---
  const riceAndNoodleIngredients = useMemo(() => {
    return ingredients.filter(
      (ing) =>
        ing.category === 'ข้าวและเส้น' ||
        ing.name.includes('ข้าว') ||
        ing.name.includes('เส้น') ||
        ing.name.includes('มาม่า') ||
        ing.name.includes('วุ้นเส้น')
    );
  }, [ingredients]);

  // Standard portion mapping for Tony's Kitchen
  const standardPortions = [
    {
      id: 'portion_rice',
      name: 'ข้าวสวยหอมมะลิ (จานหลัก 200g)',
      type: 'ข้าว',
      rawIngredientName: 'ข้าวสารหอมมะลิ',
      rawPurchaseCost: '฿42 / กก.',
      cookingYield: '220% (ขยาย 2.2 เท่า)',
      portionGram: 200,
      costPerPortion: 8.67,
      dishesUsing: ['กะเพราทุกเมนู', 'หมูกระเทียม', 'ไก่ผัดพริกเผา'],
    },
    {
      id: 'portion_padthai',
      name: 'เส้นจันท์แช่น้ำ (ผัดไทย 150g)',
      type: 'เส้น',
      rawIngredientName: 'เส้นจันท์แห้ง',
      rawPurchaseCost: '฿55 / กก.',
      cookingYield: '100% (แช่น้ำพร้อมผัด)',
      portionGram: 150,
      costPerPortion: 8.25,
      dishesUsing: ['ผัดไทยกุ้งสด', 'ผัดไทยโบราณ', 'ผัดไทยทะเล'],
    },
    {
      id: 'portion_flat',
      name: 'เส้นใหญ่สด (ผัดซีอิ๊ว/คั่วไก่ 180g)',
      type: 'เส้น',
      rawIngredientName: 'เส้นใหญ่ตลาด',
      rawPurchaseCost: '฿35 / กก.',
      cookingYield: '100% (คลี่เส้นพร้อมผัด)',
      portionGram: 180,
      costPerPortion: 6.30,
      dishesUsing: ['ผัดซีอิ๊วหมู', 'ก๋วยเตี๋ยวคั่วไก่', 'ราดหน้า'],
    },
    {
      id: 'portion_mama',
      name: 'บะหมี่กึ่งสำเร็จรูป (มาม่า 1 ซอง 60g)',
      type: 'เส้น',
      rawIngredientName: 'มาม่าแพ็ค',
      rawPurchaseCost: '฿6.00 / ซอง',
      cookingYield: '100% (ลวกสุก)',
      portionGram: 60,
      costPerPortion: 6.00,
      dishesUsing: ['มาม่าผัดขี้เมา', 'ต้มยำมาม่าหม้อไฟ', 'ยำมาม่ารวมมิตร'],
    },
    {
      id: 'portion_glass',
      name: 'วุ้นเส้นสด (อบหม้อดิน/ผัด 100g)',
      type: 'เส้น',
      rawIngredientName: 'วุ้นเส้นสดเกรด A',
      rawPurchaseCost: '฿65 / กก.',
      cookingYield: '100% (แช่น้ำ)',
      portionGram: 100,
      costPerPortion: 6.50,
      dishesUsing: ['กุ้งอบวุ้นเส้น', 'ยำวุ้นเส้นโบราณ', 'ต้มจืดวุ้นเส้น'],
    },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* Header with 3 Tabs */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#F27D26]" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              สูตรอาหาร (Recipe Management)
            </h1>
          </div>
          <p className="text-xs text-white/60 mt-0.5">
            โครงสร้างสูตรอาหารแบ่งตาม 3 หมวดหมู่หลัก: เมนูอาหาร, ซอสหลัก, และข้าวและเส้น
          </p>
        </div>

        {/* 3 Primary Tabs Navigation */}
        <div className="flex bg-black/40 border border-white/15 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('FOOD')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'FOOD'
                ? 'bg-[#F27D26] text-black shadow-md shadow-[#F27D26]/20'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>ขั้นตอนที่ 4: คลังสูตรอาหารกลาง (Base Recipe Repository)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SAUCE')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'SAUCE'
                ? 'bg-[#F27D26] text-black shadow-md shadow-[#F27D26]/20'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>ขั้นตอนที่ 3: ซอสและสต็อก (Sauce Batches)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RICE_NOODLES')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'RICE_NOODLES'
                ? 'bg-[#F27D26] text-black shadow-md shadow-[#F27D26]/20'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Wheat className="w-3.5 h-3.5" />
            <span>ข้าวและเส้น (Yield & Portions)</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CENTRAL BASE RECIPES (คลังสูตรอาหารกลาง)              */}
      {/* ========================================================= */}
      {activeTab === 'FOOD' && (
        <div className="space-y-4">
          {/* Base Recipe Selector Bar */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              <span className="text-xs font-bold text-white/60 whitespace-nowrap">
                เลือกสูตรอาหารกลาง (Base Recipe):
              </span>
              <select
                value={selectedMenuId}
                onChange={(e) => setSelectedMenuId(e.target.value)}
                className="bg-black/50 border border-white/15 px-3 py-2 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[#F27D26] max-w-md cursor-pointer"
              >
                {menus.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#1a1a1a]">
                    สูตร {m.name} ({m.category}) — {m.variants.length} ตัวเลือกเนื้อสัตว์
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <span className="text-xs text-amber-400 font-semibold animate-pulse">
                  ● มีการแก้ไขที่ยังไม่ได้บันทึก
                </span>
              )}
              {saveSuccessNotice && (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>บันทึกสูตรกลางและซิงค์ตัวเลือกเนื้อสัตว์เรียบร้อยแล้ว</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveBaseRecipe}
                disabled={!hasUnsavedChanges}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  hasUnsavedChanges
                    ? 'bg-[#F27D26] hover:bg-[#d96817] text-black shadow-lg shadow-[#F27D26]/20'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึกสูตรอาหารกลาง (Sync ไปทุกเนื้อสัตว์)</span>
              </button>
            </div>
          </div>

          {/* Central Recipe Repository Info Card */}
          <div className="bg-[#F27D26]/10 border border-[#F27D26]/30 p-3.5 rounded-2xl flex items-start gap-3 text-xs text-white/80">
            <Sparkles className="w-4 h-4 text-[#F27D26] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">
                คลังสูตรอาหารกลาง: สูตร {currentMenu?.name} (กำหนดค่าครั้งเดียว ใช้ร่วมกันทุกเนื้อสัตว์)
              </span>
              <p className="text-[11px] text-white/70 mt-0.5">
                วัตถุดิบกลาง, ซอสปรุง, เครื่องเคียง, และแพ็คเกจจิ้งด้านล่างนี้ใช้ร่วมกันกับทุกประเภทเนื้อสัตว์ (หมูหมัก, หมูบด, ไก่, เนื้อ, กุ้ง, หมึก, ทะเล) โดยน้ำหนักและราคาต้นทุนของเนื้อสัตว์แต่ละชนิดสามารถปรับแต่งได้อิสระที่หน้ารายการเมนูอาหาร
              </p>
            </div>
          </div>

          {/* Main Grid: Recipe Builder Left, Live Breakdown Right */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: Central Recipe Items Builder (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-2">
                  <div>
                    <h3 className="font-bold text-white text-base">
                      รายการส่วนประกอบในสูตรกลาง ({localBaseItems.length} รายการ)
                    </h3>
                    <p className="text-[11px] text-white/50">
                      รวมวัตถุดิบกลาง, ซอสปรุง, เครื่องเคียง และบรรจุภัณฑ์ (แพ็คเกจจิ้ง)
                    </p>
                  </div>

                  {/* 4 Add buttons: วัตถุดิบ, ซอสปรุง, เครื่องเคียง, แพ็คเกจจิ้ง */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleAddBaseIngredient}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="เพิ่มวัตถุดิบกลาง เช่น พริก, กระเทียม, ใบกะเพรา, น้ำมัน"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ วัตถุดิบกลาง</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSauce}
                      className="px-2.5 py-1.5 rounded-xl bg-[#F27D26]/20 hover:bg-[#F27D26]/30 text-[#F27D26] text-xs font-bold flex items-center gap-1 cursor-pointer border border-[#F27D26]/30 transition-colors"
                      title="เพิ่มซอสปรุงรสที่เตรียมล่วงหน้าเป็น Batch"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ ซอสปรุง</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSideDish}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer border border-amber-500/30 transition-colors"
                      title="เพิ่มเครื่องเคียง เช่น พริกน้ำปลา, แตงกวาเคียง, ข้าวสวย, ไข่ดาว"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ เครื่องเคียง</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddPackaging}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1 cursor-pointer border border-purple-500/30 transition-colors"
                      title="เพิ่มบรรจุภัณฑ์ เช่น กล่องกระดาษคราฟท์, ช้อนส้อม, ถ้วยน้ำจิ้ม, ถุงหูหิ้ว"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ แพ็คเกจจิ้ง</span>
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-white/50 text-[10px] uppercase">
                        <th className="py-2.5 px-3">หมวดหมู่</th>
                        <th className="py-2.5 px-3">ชื่อรายการในสูตร</th>
                        <th className="py-2.5 px-3 text-right">ปริมาณ</th>
                        <th className="py-2.5 px-3">หน่วย</th>
                        <th className="py-2.5 px-3 text-right">ต้นทุน/หน่วย</th>
                        <th className="py-2.5 px-3 text-right">รวมเงิน (฿)</th>
                        <th className="py-2.5 px-2 text-center">ลบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {localBaseItems.map((item, index) => {
                        const costInfo = getItemCost(item);

                        return (
                          <tr key={item.id || index} className="hover:bg-white/5 transition-colors">
                            <td className="py-2.5 px-3 font-sans">
                              {item.type === 'SAUCE' ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30">
                                  🧪 ซอสปรุง
                                </span>
                              ) : item.type === 'PACKAGING' ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  📦 แพ็คเกจจิ้ง
                                </span>
                              ) : item.type === 'PREPARED_ITEM' ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  🥗 เครื่องเคียง
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  🌿 วัตถุดิบกลาง
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 font-sans font-medium text-white">
                              {item.type === 'SAUCE' ? (
                                <select
                                  value={item.ingredientId || item.sauceId}
                                  onChange={(e) => handleUpdateBaseItemSource(index, e.target.value)}
                                  className="bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-xs text-white cursor-pointer"
                                >
                                  {sauces.map((s) => (
                                    <option key={s.id} value={s.id} className="bg-[#1a1a1a]">
                                      {s.name}
                                    </option>
                                  ))}
                                </select>
                              ) : item.type === 'PACKAGING' ? (
                                <select
                                  value={item.ingredientId}
                                  onChange={(e) => handleUpdateBaseItemSource(index, e.target.value)}
                                  className="bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-xs text-white max-w-[220px] cursor-pointer"
                                >
                                  <optgroup label="รายการมาตรฐาน (Presets)" className="bg-[#1a1a1a]">
                                    {PACKAGING_PRESETS.map((pkg) => (
                                      <option key={pkg.id} value={pkg.id}>
                                        {pkg.name} (฿{pkg.unitCost})
                                      </option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="วัตถุดิบบรรจุภัณฑ์ในคลัง" className="bg-[#1a1a1a]">
                                    {ingredients
                                      .filter((i) => i.category === 'บรรจุภัณฑ์')
                                      .map((ing) => (
                                        <option key={ing.id} value={ing.id}>
                                          {ing.name} (฿{ing.costPerBaseUnit})
                                        </option>
                                      ))}
                                  </optgroup>
                                </select>
                              ) : item.type === 'PREPARED_ITEM' ? (
                                <select
                                  value={item.ingredientId}
                                  onChange={(e) => handleUpdateBaseItemSource(index, e.target.value)}
                                  className="bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-xs text-white max-w-[220px] cursor-pointer"
                                >
                                  <optgroup label="เครื่องเคียงมาตรฐาน (Presets)" className="bg-[#1a1a1a]">
                                    {SIDE_DISH_PRESETS.map((sd) => (
                                      <option key={sd.id} value={sd.id}>
                                        {sd.name} (฿{sd.unitCost})
                                      </option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="วัตถุดิบเสริมในคลัง" className="bg-[#1a1a1a]">
                                    {ingredients.map((ing) => (
                                      <option key={ing.id} value={ing.id}>
                                        {ing.name} ({ing.usageUnit})
                                      </option>
                                    ))}
                                  </optgroup>
                                </select>
                              ) : (
                                <select
                                  value={item.ingredientId}
                                  onChange={(e) => handleUpdateBaseItemSource(index, e.target.value)}
                                  className="bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-xs text-white max-w-[200px] cursor-pointer"
                                >
                                  {ingredients.map((ing) => (
                                    <option key={ing.id} value={ing.id} className="bg-[#1a1a1a]">
                                      {ing.name} ({ing.usageUnit})
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <NumericInput
                                type="number"
                                step="any"
                                min="0"
                                value={item.quantity ?? 0}
                                onChange={(e) =>
                                  handleUpdateBaseItemQuantity(index, parseFloat(e.target.value) || 0)
                                }
                                className="w-20 p-1 bg-black/40 border border-white/20 rounded-lg text-right text-white font-mono font-bold focus:border-[#F27D26]"
                              />
                            </td>

                            <td className="py-2.5 px-3 font-sans text-white/50 text-[11px]">
                              {item.unit}
                            </td>

                            <td className="py-2.5 px-3 text-right text-white/60">
                              ฿{costInfo.unitCost.toFixed(costInfo.unitCost < 1 ? 4 : 2)}
                            </td>

                            <td className="py-2.5 px-3 text-right font-bold text-white">
                              ฿{costInfo.lineCost.toFixed(2)}
                            </td>

                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveBaseItem(index)}
                                className="p-1 text-white/40 hover:text-rose-400 cursor-pointer transition-colors"
                                title="ลบรายการนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right: Central Recipe Costing Breakdown Card */}
            <div className="space-y-4">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    คลังสูตรอาหารกลาง (Base Recipe Cost)
                  </span>
                  <h3 className="font-bold text-white text-base mt-0.5">
                    สูตร {currentMenu?.name}
                  </h3>
                  <p className="text-[11px] text-white/50">
                    ต้นทุนคงที่สำหรับวัตถุดิบ ซอส เครื่องเคียง และกล่อง
                  </p>
                </div>

                {/* Breakdown per category */}
                <div className="space-y-2 text-xs font-mono bg-black/30 p-3 rounded-2xl border border-white/10">
                  <div className="flex justify-between text-white/70">
                    <span className="font-sans flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>วัตถุดิบกลาง:</span>
                    </span>
                    <span className="text-white font-bold">฿{totalBaseIngredientsCost.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-white/70">
                    <span className="font-sans flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#F27D26]" />
                      <span>ซอสปรุงรส:</span>
                    </span>
                    <span className="text-white font-bold">฿{totalSauceCost.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-white/70">
                    <span className="font-sans flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>เครื่องเคียง:</span>
                    </span>
                    <span className="text-white font-bold">฿{totalSideDishCost.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-white/70">
                    <span className="font-sans flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      <span>บรรจุภัณฑ์ (แพ็คเกจจิ้ง):</span>
                    </span>
                    <span className="text-white font-bold">฿{totalPackagingCost.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-sm">
                    <span className="font-sans text-white">รวมต้นทุนสูตรกลาง:</span>
                    <span className="text-[#FFC107]">฿{totalBaseRecipeCost.toFixed(2)} / จาน</span>
                  </div>
                </div>

                {/* Synced Variants List */}
                <div className="pt-2 border-t border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      ตัวเลือกเนื้อสัตว์ในสูตรนี้ ({currentMenu?.variants.length || 0} ตัวเลือก)
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
                    {currentMenu?.variants.map((v) => (
                      <div
                        key={v.id}
                        className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{v.proteinType || v.name}</span>
                          {v.proteinType === 'ทะเล' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                              กุ้ง + หมึก
                            </span>
                          )}
                        </div>
                        <span className="text-white/60 font-mono">฿{v.sellingPrice}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white/5 p-2.5 rounded-xl text-[10px] text-white/50 leading-relaxed">
                    💡 เมื่อกด <strong>บันทึกสูตรอาหารกลาง</strong> ระบบจะนำวัตถุดิบ ซอส เครื่องเคียง และแพ็คเกจจิ้งข้างต้นไปอัปเดตให้กับทุกตัวเลือกเนื้อสัตว์ทันที โดยยังคงพอร์ชั่นเนื้อสัตว์ของแต่ละตัวเลือกไว้
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MAIN SAUCES (ซอสหลัก)                                */}
      {/* ========================================================= */}
      {activeTab === 'SAUCE' && (
        <div className="space-y-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Search className="w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="ค้นหาซอสปรุงรส..."
                value={sauceSearch}
                onChange={(e) => setSauceSearch(e.target.value)}
                className="w-full bg-black/40 border border-white/15 px-3 py-2 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#F27D26]"
              />
            </div>

            <button
              type="button"
              onClick={handleOpenAddSauce}
              className="px-4 py-2.5 bg-[#F27D26] hover:bg-[#d96817] text-black font-bold rounded-xl text-xs shadow-lg shadow-[#F27D26]/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ สร้างสูตรซอสใหม่</span>
            </button>
          </div>

          {/* Sauces Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSauces.map((sauce) => {
              const calc = calculateSauceCost(sauce, ingredientsMap);
              return (
                <div
                  key={sauce.id}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 hover:border-white/20 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F27D26]/20 text-[#F27D26]">
                        {sauce.category || 'ซอสหลัก'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditSauce(sauce)}
                        className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 cursor-pointer"
                        title="แก้ไขสูตรซอส"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="font-bold text-white text-base">{sauce.name}</h3>
                    {sauce.notes && (
                      <p className="text-[11px] text-white/40 mt-1 line-clamp-2">{sauce.notes}</p>
                    )}

                    {/* Batch stats */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/10 text-xs font-mono">
                      <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] font-sans text-white/40 block">
                          ปริมาณผลิต (Batch)
                        </span>
                        <span className="font-bold text-white mt-0.5 block">
                          {sauce.productionQuantity} {sauce.productionUnit}
                        </span>
                        <span className="text-[9px] text-white/40">Yield: {sauce.yieldPercent}%</span>
                      </div>

                      <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] font-sans text-white/40 block">ต้นทุนต่อกรัม</span>
                        <span className="font-bold text-[#FFC107] mt-0.5 block">
                          ฿{calc.costPerGram.toFixed(4)}
                        </span>
                        <span className="text-[9px] text-white/40">
                          (฿{(calc.costPerGram * 30).toFixed(2)}/30g)
                        </span>
                      </div>
                    </div>

                    {/* Items preview */}
                    <div className="mt-3 space-y-1">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                        วัตถุดิบในซอส ({sauce.items.length})
                      </span>
                      <div className="text-[11px] text-white/70 space-y-0.5 max-h-24 overflow-y-auto pr-1">
                        {sauce.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between font-mono">
                            <span className="font-sans truncate">{item.ingredientName}</span>
                            <span>
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-xs font-mono">
                    <span className="font-sans text-white/50">ต้นทุนรวมทั้งสูตร:</span>
                    <span className="font-bold text-white">฿{calc.actualCost.toFixed(2)} บาท</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: RICE & NOODLES (ข้าวและเส้น)                         */}
      {/* ========================================================= */}
      {activeTab === 'RICE_NOODLES' && (
        <div className="space-y-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl">
            <div className="flex items-center gap-2 mb-2">
              <Wheat className="w-5 h-5 text-[#FFC107]" />
              <h2 className="text-lg font-bold text-white">
                การจัดการต้นทุน ข้าวและเส้น (Rice & Noodle Portioning)
              </h2>
            </div>
            <p className="text-xs text-white/60 max-w-3xl">
              ข้าวและเส้นเป็นต้นทุนคาร์โบไฮเดรตหลักของร้านอาหารตามสั่ง มีอัตราการขยายตัว (Cooking Yield)
              เช่น ข้าวสาร 1,000g เมื่อหุงแล้วจะได้ข้าวสุกประมาณ 2,200g (Yield 220%)
              ระบบคิดคำนวณต้นทุนต่อหนึ่งจานมาตรฐานอย่างแม่นยำ
            </p>
          </div>

          {/* Standard Portion Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {standardPortions.map((portion) => (
              <div
                key={portion.id}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFC107]/20 text-[#FFC107]">
                      {portion.type}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono">
                      ขนาดเสิร์ฟ: {portion.portionGram}g
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base">{portion.name}</h3>

                  {/* Details table */}
                  <div className="mt-3 p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="font-sans text-white/50">วัตถุดิบหลัก:</span>
                      <span className="text-white">{portion.rawIngredientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-white/50">ราคาตลาด:</span>
                      <span className="text-white">{portion.rawPurchaseCost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-white/50">Yield การหุง/ลวก:</span>
                      <span className="text-emerald-400 font-bold">{portion.cookingYield}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-white/10 font-bold text-sm">
                      <span className="font-sans text-white">ต้นทุนต่อจาน:</span>
                      <span className="text-[#FFC107]">฿{portion.costPerPortion.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Dishes using */}
                  <div className="mt-3">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">
                      เมนูที่ใช้ปริมาณนี้:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {portion.dishesUsing.map((dish, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg text-[10px] bg-white/5 text-white/70 border border-white/5"
                        >
                          {dish}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* SAUCE EDIT MODAL */}
      {isSauceModalOpen && editingSauce && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#1a1a1a]/95 backdrop-blur-2xl rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-white/20 text-white max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base">
                {editingSauce.id?.startsWith('sauce_') && !sauces.find((s) => s.id === editingSauce.id)
                  ? 'สร้างสูตรซอสใหม่'
                  : 'แก้ไขสูตรซอส'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSauceModalOpen(false)}
                className="p-1 rounded-xl text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSauceModal} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-white/70 mb-1 font-semibold">ชื่อสูตรซอส</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ซอสผัดกะเพราโบราณ, ซอสพริกไทยดำ"
                  value={editingSauce.name || ''}
                  onChange={(e) => setEditingSauce({ ...editingSauce, name: e.target.value })}
                  className="w-full p-2.5 bg-black/40 border border-white/15 rounded-xl text-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 mb-1 font-semibold">
                    ปริมาณผลิตต่อสูตร (g)
                  </label>
                  <NumericInput
                    type="number"
                    min="1"
                    required
                    value={editingSauce.productionQuantity || 1000}
                    onChange={(e) =>
                      setEditingSauce({
                        ...editingSauce,
                        productionQuantity: parseFloat(e.target.value) || 1,
                        actualQuantity: parseFloat(e.target.value) || 1,
                      })
                    }
                    className="w-full p-2.5 bg-black/40 border border-white/15 rounded-xl text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-white/70 mb-1 font-semibold">Yield % ของซอส</label>
                  <NumericInput
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={editingSauce.yieldPercent || 100}
                    onChange={(e) =>
                      setEditingSauce({
                        ...editingSauce,
                        yieldPercent: parseFloat(e.target.value) || 100,
                      })
                    }
                    className="w-full p-2.5 bg-black/40 border border-white/15 rounded-xl text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Items in Sauce */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-white/70 font-semibold">
                    วัตถุดิบและสัดส่วนในซอส ({(editingSauce.items || []).length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const firstIng = ingredients[0];
                      if (!firstIng) return;
                      const newItem: SauceRecipeItem = {
                        ingredientId: firstIng.id,
                        ingredientName: firstIng.name,
                        quantity: 100,
                        unit: 'g',
                        unitCost: firstIng.costPerBaseUnit,
                        lineCost: 100 * firstIng.costPerBaseUnit,
                      };
                      setEditingSauce({
                        ...editingSauce,
                        items: [...(editingSauce.items || []), newItem],
                      });
                    }}
                    className="text-[10px] text-[#F27D26] hover:underline font-bold"
                  >
                    + เพิ่มวัตถุดิบในซอส
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(editingSauce.items || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-black/30 border border-white/10 rounded-xl"
                    >
                      <select
                        value={item.ingredientId}
                        onChange={(e) => {
                          const ing = ingredientsMap.get(e.target.value);
                          const updated = [...(editingSauce.items || [])];
                          if (ing) {
                            updated[idx] = {
                              ...updated[idx],
                              ingredientId: ing.id,
                              ingredientName: ing.name,
                              unitCost: ing.costPerBaseUnit,
                              lineCost: (updated[idx].quantity || 0) * ing.costPerBaseUnit,
                            };
                            setEditingSauce({ ...editingSauce, items: updated });
                          }
                        }}
                        className="bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-xs text-white flex-1"
                      >
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id} className="bg-[#1a1a1a]">
                            {ing.name}
                          </option>
                        ))}
                      </select>

                      <NumericInput
                        type="number"
                        min="0"
                        step="any"
                        value={item.quantity ?? 0}
                        onChange={(e) => {
                          const q = parseFloat(e.target.value) || 0;
                          const updated = [...(editingSauce.items || [])];
                          updated[idx] = {
                            ...updated[idx],
                            quantity: q,
                            lineCost: q * (updated[idx].unitCost || 0),
                          };
                          setEditingSauce({ ...editingSauce, items: updated });
                        }}
                        className="w-16 p-1 bg-black/40 border border-white/20 rounded-lg text-right text-white font-mono font-bold"
                      />

                      <span className="text-[11px] text-white/50">{item.unit}</span>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...(editingSauce.items || [])];
                          updated.splice(idx, 1);
                          setEditingSauce({ ...editingSauce, items: updated });
                        }}
                        className="p-1 text-white/40 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white/70 mb-1 font-semibold">หมายเหตุ / วิธีเคี่ยว</label>
                <input
                  type="text"
                  placeholder="เช่น เคี่ยวไฟอ่อน 15 นาที, กวนจนละลาย"
                  value={editingSauce.notes || ''}
                  onChange={(e) => setEditingSauce({ ...editingSauce, notes: e.target.value })}
                  className="w-full p-2.5 bg-black/40 border border-white/15 rounded-xl text-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsSauceModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-xl text-white font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F27D26] hover:bg-[#d96817] text-black font-bold rounded-xl shadow-lg shadow-[#F27D26]/20 cursor-pointer"
                >
                  บันทึกสูตรซอส
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
