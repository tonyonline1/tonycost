import React from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Beef,
  BookOpen,
  Receipt,
  TrendingUp,
  PieChart,
  FileSpreadsheet,
  Settings,
  X,
  Sparkles,
  Calculator,
  Activity,
  BarChart3,
  FlaskConical,
} from 'lucide-react';

export interface NavItem {
  id: string;
  name: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
  roleRequired?: 'OWNER' | 'MANAGER' | 'STAFF';
}

interface NavGroup {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  items: NavItem[];
}

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  reviewCount: number;
  lowStockCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  reviewCount,
}) => {
  // One system + 3 business modules.
  // Existing route IDs are intentionally preserved for backward compatibility.
  const moduleGroups: NavGroup[] = [
    {
      id: 'cost-control',
      label: 'MODULE A · COST CONTROL',
      subtitle: 'ควบคุมต้นทุนและกำหนดราคา',
      icon: Calculator,
      items: [
        { id: 'food_cost', name: 'ต้นทุนอาหาร', icon: UtensilsCrossed },
        {
          id: 'ingredients',
          name: 'วัตถุดิบ & แลบ Yield (ขั้นตอน 2)',
          icon: Beef,
          badge: reviewCount > 0 ? reviewCount : undefined,
          badgeColor: 'bg-rose-500/80 text-white',
        },
        { id: 'sauces', name: 'ซอส & สต็อก (ขั้นตอน 3)', icon: FlaskConical },
        { id: 'recipes', name: 'สูตรอาหาร (ขั้นตอน 4)', icon: BookOpen },
      ],
    },
    {
      id: 'daily-operations',
      label: 'MODULE B · DAILY OPERATIONS',
      subtitle: 'บันทึกยอดขายและค่าใช้จ่าย',
      icon: Activity,
      items: [
        { id: 'sales', name: 'รายรับ', icon: TrendingUp },
        { id: 'expenses', name: 'ค่าใช้จ่าย', icon: Receipt },
      ],
    },
    {
      id: 'management',
      label: 'MODULE C · MANAGEMENT',
      subtitle: 'วิเคราะห์กำไรและรายงานบริหาร',
      icon: BarChart3,
      items: [
        { id: 'pnl', name: 'กำไร/ขาดทุน', icon: PieChart },
        { id: 'reports', name: 'รายงาน', icon: FileSpreadsheet },
      ],
    },
  ];

  const isTabActive = (id: string) =>
    currentTab === id ||
    (id === 'food_cost' && (currentTab === 'menus' || currentTab === 'menu_costing'));

  const content = (
    <div className="flex flex-col h-full bg-white backdrop-blur-xl text-slate-900 select-none p-4 border-r border-slate-200 shadow-xl">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
        <div>
          <span className="font-bold text-slate-900 text-base">ระบบบริหารร้าน</span>
          <p className="text-[10px] text-slate-500 mt-0.5">1 System · 3 Modules</p>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          aria-label="ปิดเมนู"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Dashboard / Home */}
      <button
        type="button"
        onClick={() => {
          onSelectTab('dashboard');
          onCloseMobile();
        }}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer mb-4 ${
          currentTab === 'dashboard'
            ? 'bg-[#F27D26] text-black font-bold shadow-md shadow-[#F27D26]/20'
            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200'
        }`}
      >
        <LayoutDashboard className={`w-4 h-4 shrink-0 ${currentTab === 'dashboard' ? 'text-black' : 'text-slate-500'}`} />
        <span>Dashboard</span>
      </button>

      {/* Three Business Modules */}
      <div className="flex-1 overflow-y-auto space-y-5 scrollbar-thin pr-1">
        {moduleGroups.map((group) => {
          const GroupIcon = group.icon;
          const groupActive = group.items.some((item) => isTabActive(item.id));

          return (
            <section key={group.id}>
              <div className="px-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <GroupIcon className={`w-3.5 h-3.5 ${groupActive ? 'text-[#F27D26]' : 'text-slate-400'}`} />
                  <span className={`text-[10px] font-extrabold tracking-wider ${groupActive ? 'text-[#F27D26]' : 'text-slate-500'}`}>
                    {group.label}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 ml-5">{group.subtitle}</p>
              </div>

              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isTabActive(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#F27D26] text-black font-bold shadow-md shadow-[#F27D26]/20'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-black' : 'text-slate-500'}`} />
                        <span className="truncate">{item.name}</span>
                      </div>

                      {item.badge !== undefined && (
                        <span
                          className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                            item.badgeColor || 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* System Settings - kept outside business modules */}
        <section>
          <div className="px-2 mb-2">
            <span className="text-[10px] font-extrabold tracking-wider text-slate-400">SYSTEM</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectTab('settings');
              onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              currentTab === 'settings'
                ? 'bg-[#F27D26] text-black font-bold shadow-md shadow-[#F27D26]/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Settings className={`w-4 h-4 shrink-0 ${currentTab === 'settings' ? 'text-black' : 'text-slate-500'}`} />
            <span>ตั้งค่า</span>
          </button>
        </section>
      </div>

      {/* System Architecture Footer */}
      <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#F27D26] uppercase font-bold tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Tony's Kitchen</span>
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <p className="text-xs font-semibold text-slate-800">Restaurant Management System</p>
        <p className="text-[10px] text-slate-500 mt-0.5">1 System · 3 Modules · Shared Data</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative z-50 w-72 max-w-[85vw] h-full shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
