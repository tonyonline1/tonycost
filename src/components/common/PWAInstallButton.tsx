import React, { useState } from 'react';
import { Download, Smartphone, Tablet, Share, PlusSquare, Check, Sparkles, Image as ImageIcon, X } from 'lucide-react';
import { usePWAInstall } from '../../utils/usePWAInstall';

interface PWAInstallButtonProps {
  onOpenIconModal?: () => void;
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onOpenIconModal,
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, isMobileOrTablet, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already running standalone, display a subtle "App Installed" or icon customize option
  if (isInstalled) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold ${className}`}>
        <Check className="w-3.5 h-3.5 text-emerald-600" />
        <span>ติดตั้งในอุปกรณ์แล้ว</span>
        {onOpenIconModal && (
          <button
            type="button"
            onClick={onOpenIconModal}
            className="ml-1 text-[11px] underline text-emerald-700 hover:text-emerald-900 cursor-pointer flex items-center gap-1"
            title="ปรับแต่งไอคอนแอป"
          >
            <ImageIcon className="w-3 h-3" />
            เปลี่ยนไอคอน
          </button>
        )}
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setJustInstalled(true);
        setTimeout(() => setJustInstalled(false), 5000);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Ambient or unsupported browser prompt: provide friendly guidance
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-2 px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-[#F27D26] to-[#EA580C] text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow-md hover:from-[#EA580C] hover:to-[#D97706] active:scale-95 transition-all cursor-pointer ${className}`}
          title="ติดตั้งสมาชิกลงบนมือถือหรือแท็บเล็ต"
        >
          <Smartphone className="w-4 h-4 shrink-0 animate-bounce" />
          <span className="hidden sm:inline">โหลดลงมือถือ / แท็บเล็ต</span>
          <span className="sm:hidden">ติดตั้งแอป</span>
        </button>

        {onOpenIconModal && (
          <button
            type="button"
            onClick={onOpenIconModal}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-[#EAE4D9] text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            title="เปลี่ยนรูปไอคอนแอปตามต้องการ"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#F27D26]" />
            <span className="hidden md:inline">เปลี่ยนไอคอน</span>
          </button>
        )}
      </div>

      {/* Guided Modal for iOS / Safari / Manual Add to Home Screen */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F27D26] text-white flex items-center justify-center font-bold shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base leading-tight">
                    วิธีโหลดแอปเพื่อเปิดบนหน้าจอมือถือ & แท็บเล็ต
                  </h3>
                  <p className="text-xs text-stone-500">เปิดใช้งานได้แบบแอปจริง ไม่ต้องเข้าเบราว์เซอร์</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs sm:text-sm text-stone-700">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-amber-950">
                    สำหรับ iPhone & iPad (Safari)
                  </p>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    แตะที่ปุ่ม <strong className="inline-flex items-center gap-1 font-semibold text-stone-900 bg-white px-1.5 py-0.5 rounded border border-amber-300"><Share className="w-3 h-3 text-blue-600" /> แชร์ (Share)</strong> ที่แถบด้านล่างหรือด้านบนของ Safari
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-bold text-amber-950">เลือก "เพิ่มไปยังหน้าจอโฮม"</p>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    เลื่อนลงมาแล้วกดเมนู <strong className="inline-flex items-center gap-1 font-semibold text-stone-900 bg-white px-1.5 py-0.5 rounded border border-amber-300"><PlusSquare className="w-3 h-3 text-emerald-600" /> เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)</strong>
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-bold text-amber-950">สำหรับ Android & แท็บเล็ต (Chrome)</p>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    หากใช้ Chrome หรือเบราว์เซอร์อื่น แตะที่เมนู <strong>จุดสามจุด (⋮)</strong> มุมบนขวา แล้วเลือก <strong>"ติดตั้งแอป" (Install App)</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
              {onOpenIconModal && (
                <button
                  type="button"
                  onClick={() => {
                    setShowIOSModal(false);
                    onOpenIconModal();
                  }}
                  className="px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#F27D26]" />
                  <span>เปลี่ยนรูปไอคอน</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="ml-auto px-4 py-2 bg-[#F27D26] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                เข้าใจแล้ว (ปิดหน้าต่าง)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
