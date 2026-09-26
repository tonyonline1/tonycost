import React from 'react';
import {
  ShieldCheck,
  Menu as MenuIcon,
  Database,
  LayoutDashboard,
  Calculator,
  Activity,
  BarChart3,
  Settings,
  ChevronDown,
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
}

interface ContextNavItem {
  id: string;
  label: string;
}

const MAIN_NAV: MainNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'cost-control', label: 'Cost Control', icon: Calculator },
  { id: 'daily-operations', label: 'Operations', icon: Activity },
  { id: 'management', label: 'Management', icon: BarChart3 },
];

const CONTEXT_NAV: Record<string, ContextNavItem[]> = {
  'cost-control': [
    { id: 'food_cost', label: 'ต้นทุนอาหาร' },
    { id: 'ingredients', label: 'วัตถุดิบ & Yield Lab (ขั้นตอน 2)' },
    { id: 'sauces', label: 'ซอส & สต็อก (ขั้นตอน 3)' },
    { id: 'recipes', label: 'สูตรอาหาร (ขั้นตอน 4)' },
  ],
  'daily-operations': [
    { id: 'sales', label: 'รายรับ' },
    { id: 'expenses', label: 'ค่าใช้จ่าย' },
  ],
  management: [
    { id: 'pnl', label: 'กำไร/ขาดทุน' },
    { id: 'reports', label: 'รายงาน' },
  ],
};

const getMainSection = (tab: string): string => {
  if (tab === 'dashboard') return 'dashboard';
  if (tab === 'ingredients' || tab === 'food_cost' || tab === 'menus' || tab === 'menu_costing' || tab === 'recipes' || tab === 'sauces') return 'cost-control';
  if (tab === 'sales' || tab === 'expenses') return 'daily-operations';
  if (tab === 'pnl' || tab === 'reports') return 'management';
  return 'system';
};

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  currentTab,
  onUpdateRole,
  reviewItemsCount,
  lowStockCount,
  onOpenMobileNav,
  onNavigateToTab,
}) => {
  const activeSection = getMainSection(currentTab);
  const contextItems = CONTEXT_NAV[activeSection] || [];

  const navigate = (tabId: string) => onNavigateToTab(tabId);

  return (
    <header className="sticky top-0 z-30 text-white">
      {/* Primary navigation */}
      <div className="border-b border-white/10 bg-black/35 backdrop-blur-xl">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenMobileNav}
              className="md:hidden p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
              aria-label="Open menu"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group text-left"
            >
              <div className="w-9 h-9 bg-[#F27D26] rounded-xl flex items-center justify-center font-bold text-lg text-black shadow-lg shadow-[#F27D26]/20 group-hover:scale-105 transition-transform">
                T
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-bold leading-none tracking-tight text-white">Tony's Kitchen</h1>
                <p className="text-[9px] uppercase tracking-[0.18em] text-[#FFC107] font-semibold mt-1">Cost Control System</p>
              </div>
            </button>
          </div>

          {/* Main module navigation */}
          <nav className="hidden md:flex items-center gap-1 flex-1 min-w-0" aria-label="Main navigation">
            {MAIN_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id === 'dashboard' ? 'dashboard' : (CONTEXT_NAV[item.id]?.[0]?.id || 'dashboard'))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#F27D26] text-black shadow-md shadow-[#F27D26]/15'
                      : 'text-white/65 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right-side system controls */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
            {reviewItemsCount > 0 && (
              <button
                type="button"
                onClick={() => navigate('reports')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 transition-all text-[11px] font-semibold"
                title="มีข้อมูลวัตถุดิบรอการตรวจสอบ"
              >
                <Database className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden lg:inline">รอตรวจทาน</span> ({reviewItemsCount})
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('reports')}
              className="hidden xl:flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-xl text-[11px] text-white/90 transition-colors"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span>Database Live</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('settings')}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-colors text-[11px] ${
                currentTab === 'settings'
                  ? 'bg-[#F27D26] text-black border-[#F27D26]'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
              }`}
              aria-label="ตั้งค่า"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">ตั้งค่า</span>
            </button>

            <div className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10 backdrop-blur-md transition-colors">
              <ShieldCheck className="w-3.5 h-3.5 text-[#F27D26]" />
              <select
                aria-label="สิทธิ์ผู้ใช้งาน"
                value={settings.userRole}
                onChange={(e) => onUpdateRole(e.target.value as 'OWNER' | 'MANAGER' | 'STAFF')}
                className="bg-transparent text-[11px] font-semibold text-white/90 focus:outline-none cursor-pointer max-w-[145px] pr-0.5"
              >
                <option value="OWNER" className="bg-[#1a1a1a] text-white">Owner (เจ้าของร้าน)</option>
                <option value="MANAGER" className="bg-[#1a1a1a] text-white">Manager (ผู้จัดการ)</option>
                <option value="STAFF" className="bg-[#1a1a1a] text-white">Staff (พนักงานหน้าร้าน)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Context navigation: only the active module's pages */}
      {contextItems.length > 0 && (
        <div className="border-b border-white/10 bg-black/20 backdrop-blur-lg">
          <div className="w-full px-4 sm:px-6 lg:px-8 h-11 flex items-center gap-1 overflow-x-auto scrollbar-thin">
            <span className="hidden sm:inline text-[9px] uppercase tracking-wider text-white/30 font-bold mr-2 shrink-0">
              {activeSection === 'cost-control' ? 'COST CONTROL' : activeSection === 'daily-operations' ? 'DAILY OPERATIONS' : 'MANAGEMENT'}
            </span>
            {contextItems.map((item) => {
              const isActive = currentTab === item.id || (item.id === 'food_cost' && (currentTab === 'menus' || currentTab === 'menu_costing')) || (item.id === 'recipes' && currentTab === 'sauces');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white/12 text-[#FFC107] border border-[#F27D26]/30'
                      : 'text-white/55 hover:text-white hover:bg-white/7 border border-transparent'
                  }`}
                >
                  {item.label}
                  {item.id === 'ingredients' && reviewItemsCount > 0 && (
                    <span className="ml-1.5 inline-flex min-w-4 h-4 px-1 items-center justify-center rounded-md bg-rose-500/80 text-white text-[9px] font-bold">
                      {reviewItemsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Settings context strip */}
      {activeSection === 'system' && currentTab === 'settings' && (
        <div className="border-b border-white/10 bg-black/20 backdrop-blur-lg">
          <div className="w-full px-4 sm:px-6 lg:px-8 h-11 flex items-center">
            <span className="text-[9px] uppercase tracking-wider text-[#F27D26] font-bold mr-3">SYSTEM</span>
            <button
              type="button"
              onClick={() => navigate('settings')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/12 text-[#FFC107] border border-[#F27D26]/30"
            >
              ตั้งค่า
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
