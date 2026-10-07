import React from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Soup,
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
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { StorageService } from '../services/storageService';

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
  onReloadData?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  reviewCount,
  onReloadData,
}) => {
  // Backup & Restore states
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [backupMessage, setBackupMessage] = React.useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleBackupData = () => {
    try {
      setIsExporting(true);
      StorageService.downloadBackupFile();
      setBackupMessage({ text: 'สำรองข้อมูลสำเร็จ (ดาวน์โหลดไฟล์แล้ว)', type: 'success' });
      setTimeout(() => setBackupMessage(null), 4000);
    } catch (err: any) {
      setBackupMessage({ text: `สำรองข้อมูลไม่สำเร็จ: ${err.message}`, type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const result = await StorageService.importBackupFile(file);
      if (result.success) {
        if (onReloadData) {
          onReloadData();
        }
        setBackupMessage({ text: 'กู้คืนข้อมูลสำเร็จเรียบร้อย', type: 'success' });
        setTimeout(() => setBackupMessage(null), 4000);
      } else {
        setBackupMessage({ text: result.message || 'ไม่สามารถกู้ข้อมูลได้', type: 'error' });
      }
    } catch (err: any) {
      setBackupMessage({ text: `เกิดข้อผิดพลาด: ${err.message}`, type: 'error' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Close drawer on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenMobile, onCloseMobile]);
  // Pure Food Cost System Modules
  const moduleGroups: NavGroup[] = [
    {
      id: 'cost-pricing',
      label: 'วิเคราะห์ต้นทุน & ตั้งราคา',
      subtitle: 'Food Cost Analysis & Pricing',
      icon: Calculator,
      items: [
        { id: 'food_cost', name: '🍚 ต้นทุนอาหาร ราดข้าว', icon: UtensilsCrossed },
        { id: 'food_cost_alacarte', name: '🍲 ต้นทุนอาหาร กับข้าว', icon: Soup },
        { id: 'quick_calculator', name: 'เครื่องคิดเลขต้นทุนด่วน', icon: Sparkles },
      ],
    },
    {
      id: 'recipes-group',
      label: 'สูตรอาหารมาตรฐาน',
      subtitle: 'Standard Recipe Cost Cards',
      icon: BookOpen,
      items: [
        { id: 'recipes', name: 'คลังสูตรอาหารกลาง (Base Recipes)', icon: BookOpen },
        { id: 'sauces', name: 'ซอส & สูตรเตรียม Batch', icon: FlaskConical },
      ],
    },
    {
      id: 'ingredients-group',
      label: 'วัตถุดิบ & Yield Lab',
      subtitle: 'AP Cost, EP Cost & Yield %',
      icon: Beef,
      items: [
        {
          id: 'ingredients',
          name: 'วัตถุดิบ & Yield Lab',
          icon: Beef,
          badge: reviewCount > 0 ? reviewCount : undefined,
          badgeColor: 'bg-rose-500/80 text-white',
        },
      ],
    },
    {
      id: 'settings-group',
      label: 'เกณฑ์ต้นทุนสากล',
      subtitle: 'Target FC% & Buffers',
      icon: Settings,
      items: [
        { id: 'settings', name: 'เกณฑ์ต้นทุน & ตั้งค่า', icon: Settings },
      ],
    },
  ];

  const isTabActive = (id: string) =>
    currentTab === id ||
    (id === 'food_cost' && (currentTab === 'menus' || currentTab === 'menu_costing'));

  const content = (
    <div className="flex flex-col h-full bg-[#FAF8F5] backdrop-blur-xl text-stone-900 select-none p-4 border-r border-[#EAE4D9] shadow-xl">
      {/* Drawer Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#EAE4D9] mb-3">
        <div>
          <span className="font-bold text-stone-900 text-base">ระบบคำนวณต้นทุนอาหาร</span>
          <p className="text-[10px] text-[#B45309] font-bold mt-0.5">International Food Cost System</p>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="p-1.5 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
          aria-label="ปิดเมนู"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Home */}
      <button
        type="button"
        onClick={() => {
          onSelectTab('food_cost');
          onCloseMobile();
        }}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer mb-4 ${
          currentTab === 'food_cost' || currentTab === 'dashboard'
            ? 'bg-[#F27D26] text-white font-bold shadow-md shadow-[#F27D26]/20'
            : 'bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 border border-[#EAE4D9]'
        }`}
      >
        <UtensilsCrossed className="w-4 h-4 shrink-0" />
        <span>ต้นทุนอาหาร & ราคาขาย (หลัก)</span>
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

        {/* Backup & Restore Data Management in Hamburger Menu */}
        <section className="pt-2 border-t border-[#EAE4D9]">
          <div className="px-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#F27D26]" />
              <span className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">
                สำรอง & กู้คืนข้อมูล (DATA BACKUP)
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 ml-5">Export & Restore System Database</p>
          </div>

          <div className="space-y-2">
            {/* Hidden File Input for Restore */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileSelected}
            />

            {/* Backup Button */}
            <button
              type="button"
              onClick={handleBackupData}
              disabled={isExporting}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold bg-white hover:bg-stone-50 active:scale-[0.99] text-stone-700 hover:text-stone-900 border border-[#EAE4D9] shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-xl bg-amber-50 text-[#F27D26] flex items-center justify-center shrink-0 border border-amber-200">
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#F27D26]" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </div>
                <div className="text-left">
                  <div className="font-bold text-stone-800">สำรองข้อมูล (Backup)</div>
                  <div className="text-[10px] text-stone-500 font-normal">ดาวน์โหลดไฟล์สำรองข้อมูล JSON</div>
                </div>
              </div>
            </button>

            {/* Restore Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold bg-white hover:bg-stone-50 active:scale-[0.99] text-stone-700 hover:text-stone-900 border border-[#EAE4D9] shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </div>
                <div className="text-left">
                  <div className="font-bold text-stone-800">กู้คืนข้อมูล (Restore)</div>
                  <div className="text-[10px] text-stone-500 font-normal">นำเข้าและกู้คืนจากไฟล์ JSON</div>
                </div>
              </div>
            </button>

            {/* Feedback Message */}
            {backupMessage && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
                  backupMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {backupMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="text-[11px] font-medium leading-tight">{backupMessage.text}</span>
              </div>
            )}
          </div>
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

      {/* Navigation Drawer / Slide-over Menu */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-50 w-72 sm:w-80 max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
