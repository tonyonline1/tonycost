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
  // Clean and well-structured modules
  const moduleGroups: NavGroup[] = [
    {
      id: 'cost-pricing',
      label: 'คำนวณต้นทุน & ราคาขาย',
      subtitle: '',
      icon: Calculator,
      items: [
        { id: 'food_cost', name: 'ต้นทุนอาหาร ราดข้าว', icon: UtensilsCrossed },
        { id: 'food_cost_alacarte', name: 'ต้นทุนอาหาร กับข้าว', icon: Soup },
        { id: 'quick_calculator', name: 'เครื่องคิดเลขต้นทุนด่วน', icon: Sparkles },
      ],
    },
    {
      id: 'recipes-group',
      label: 'สูตรอาหาร & ซอสสต็อก',
      subtitle: '',
      icon: BookOpen,
      items: [
        { id: 'recipes', name: 'คลังสูตรอาหารกลาง (Base)', icon: BookOpen },
        { id: 'sauces', name: 'ซอส & สต็อก Batch', icon: FlaskConical },
      ],
    },
    {
      id: 'master-data-group',
      label: 'วัตถุดิบ & การตั้งค่า',
      subtitle: '',
      icon: Database,
      items: [
        {
          id: 'ingredients',
          name: 'วัตถุดิบ & Yield Lab',
          icon: Beef,
          badge: reviewCount > 0 ? reviewCount : undefined,
          badgeColor: 'bg-rose-500 text-white',
        },
        { id: 'settings', name: 'เกณฑ์ต้นทุน & ตั้งค่าระบบ', icon: Settings },
      ],
    },
  ];

  const isTabActive = (id: string) =>
    currentTab === id ||
    (id === 'food_cost' && (currentTab === 'menus' || currentTab === 'menu_costing'));

  const content = (
    <div className="flex flex-col h-full bg-[#FAF8F5] text-stone-900 select-none p-4 sm:p-5 border-r border-[#EAE4D9] shadow-2xl">
      {/* Drawer Header - Clean & Elegant */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#EAE4D9]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F27D26] text-white flex items-center justify-center shadow-xs shadow-[#F27D26]/20">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-stone-900 text-sm leading-tight">Tony's Kitchen</div>
            <div className="text-[11px] text-stone-500 font-medium">เมนูนำทางระบบต้นทุน</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="p-1.5 rounded-xl text-stone-400 hover:text-stone-800 hover:bg-stone-200/60 transition-colors cursor-pointer"
          aria-label="ปิดเมนู"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Structured Navigation Groups */}
      <div className="flex-1 overflow-y-auto pt-3.5 pb-2 space-y-4.5 scrollbar-thin pr-0.5">
        {moduleGroups.map((group) => {
          const GroupIcon = group.icon;
          const groupActive = group.items.some((item) => isTabActive(item.id));

          return (
            <section key={group.id} className="space-y-1.5">
              {/* Clean Category Label */}
              <div className="px-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase">
                <GroupIcon className={`w-3.5 h-3.5 ${groupActive ? 'text-[#F27D26]' : 'text-stone-400'}`} />
                <span className={groupActive ? 'text-[#F27D26]' : 'text-stone-500'}>
                  {group.label}
                </span>
              </div>

              {/* Group Nav Items */}
              <div className="space-y-1">
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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#F27D26] text-white shadow-xs shadow-[#F27D26]/25'
                          : 'bg-white hover:bg-stone-100/70 text-stone-700 hover:text-stone-900 border border-[#EAE4D9]/80 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                        <span className="truncate">{item.name}</span>
                      </div>

                      {item.badge !== undefined ? (
                        <span
                          className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            item.badgeColor || 'bg-stone-200 text-stone-800'
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : isActive ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-white/90 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Data Management - Compact & Comfortable */}
        <section className="pt-3 border-t border-[#EAE4D9] space-y-2">
          <div className="px-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase text-stone-500">
            <Database className="w-3.5 h-3.5 text-stone-400" />
            <span>จัดการข้อมูล (Data)</span>
          </div>

          {/* Hidden File Input for Restore */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelected}
          />

          <div className="grid grid-cols-2 gap-2">
            {/* Backup Button */}
            <button
              type="button"
              onClick={handleBackupData}
              disabled={isExporting}
              title="ดาวน์โหลดไฟล์สำรองข้อมูล JSON ทั้งหมด"
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium bg-white hover:bg-stone-100/80 active:scale-[0.98] text-stone-700 hover:text-stone-900 border border-[#EAE4D9] shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F27D26]" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#F27D26]" />
              )}
              <span>สำรองข้อมูล</span>
            </button>

            {/* Restore Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              title="นำเข้าและกู้คืนข้อมูลจากไฟล์ JSON"
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium bg-white hover:bg-stone-100/80 active:scale-[0.98] text-stone-700 hover:text-stone-900 border border-[#EAE4D9] shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isImporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-blue-600" />
              )}
              <span>กู้คืนข้อมูล</span>
            </button>
          </div>

          {/* Feedback Message */}
          {backupMessage && (
            <div
              className={`p-2 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
                backupMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {backupMessage.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              )}
              <span className="text-[11px] font-medium leading-tight truncate">{backupMessage.text}</span>
            </div>
          )}
        </section>
      </div>

      {/* Clean & Minimal Footer */}
      <div className="pt-2.5 border-t border-[#EAE4D9] flex items-center justify-between text-[11px] text-stone-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-medium text-stone-600">พร้อมใช้งาน</span>
        </div>
        <span className="font-mono text-[10px] text-stone-400">v1.2 (Standard FC)</span>
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
