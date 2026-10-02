import React from 'react';
import {
  Menu as MenuIcon,
  Calculator,
  UtensilsCrossed,
  BookOpen,
  FlaskConical,
  Beef,
  Sparkles,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { RestaurantSettings } from '../types';

interface NavbarProps {
  settings: RestaurantSettings;
  currentTab: string;
  onUpdateRole: (role: 'OWNER' | 'MANAGER' | 'STAFF') => void;
  reviewItemsCount: number;
  lowStockCount: number;
  onOpenMobileNav: () => void;
  onNavigateToTab: (tabId: string) => void;
}

interface MainNavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  currentTab,
  reviewItemsCount,
  onOpenMobileNav,
  onNavigateToTab,
}) => {
  const navigate = (tabId: string) => onNavigateToTab(tabId);

  const FOOD_COST_NAV: MainNavItem[] = [
    { id: 'food_cost', label: 'ต้นทุนอาหาร & ราคาขาย', icon: UtensilsCrossed },
    { id: 'quick_calculator', label: 'เครื่องคิดเลขต้นทุนด่วน', icon: Sparkles },
    { id: 'recipes', label: 'สูตรอาหาร (Recipe Cards)', icon: BookOpen },
    { id: 'sauces', label: 'ซอส & สูตรเตรียม Batch', icon: FlaskConical },
    {
      id: 'ingredients',
      label: 'วัตถุดิบ & Yield Lab',
      icon: Beef,
      badge: reviewItemsCount > 0 ? reviewItemsCount : undefined,
    },
    { id: 'settings', label: 'เกณฑ์ต้นทุน & ตั้งค่า', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-30 text-stone-900">
      {/* Primary navigation bar */}
      <div className="border-b border-[#EAE4D9] bg-[#FAF8F5]/95 backdrop-blur-xl shadow-xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-4 justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenMobileNav}
              className="lg:hidden p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors focus:outline-none cursor-pointer"
              aria-label="Open menu"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate('food_cost')}
              className="flex items-center gap-2.5 cursor-pointer group text-left"
            >
              <div className="w-9 h-9 bg-[#F27D26] rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-md shadow-[#F27D26]/20 group-hover:scale-105 transition-transform">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-none tracking-tight text-stone-900">Tony's Kitchen</h1>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#B45309] font-bold mt-1">Food Cost System (หลักสากล)</p>
              </div>
            </button>
          </div>

          {/* Main Food Cost navigation */}
          <nav className="hidden lg:flex items-center gap-1.5 flex-1 min-w-0 max-w-4xl justify-center" aria-label="Main navigation">
            {FOOD_COST_NAV.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentTab === item.id ||
                (item.id === 'food_cost' && (currentTab === 'menus' || currentTab === 'menu_costing' || currentTab === 'dashboard'));

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#F27D26] text-white shadow-md shadow-[#F27D26]/20 font-bold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-[#F7F3EB]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="ml-1 inline-flex px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Target Food Cost Indicator Pill */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#FFFDF9] border border-[#EAE4D9] rounded-xl text-xs shadow-xs">
              <span className="text-[10px] uppercase font-bold text-stone-500">Target FC%:</span>
              <span className="font-mono font-bold text-[#F27D26] text-xs">
                ≤ {settings.targetFoodCostPercent || 32}%
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('settings')}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                currentTab === 'settings'
                  ? 'bg-[#F27D26] text-white border-[#F27D26]'
                  : 'bg-white hover:bg-stone-50 border-[#EAE4D9] text-stone-600 hover:text-stone-900 shadow-xs'
              }`}
              title="ตั้งค่าเกณฑ์ต้นทุนอาหาร"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

