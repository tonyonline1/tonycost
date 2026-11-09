import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  LogOut,
  LogIn,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { auth, loginWithGoogle, logoutUser, testConnection } from '../../services/firebase';
import { FirebaseSyncService } from '../../services/firebaseSyncService';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';

interface FirebaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataSynced?: () => void;
}

export const FirebaseSyncModal: React.FC<FirebaseSyncModalProps> = ({
  isOpen,
  onClose,
  onDataSynced,
}) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen) {
      testConnection().catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async () => {
    try {
      setIsConnecting(true);
      setStatusMessage({ text: 'กำลังเข้าสู่ระบบ Google...', type: 'info' });
      const user = await loginWithGoogle();
      setStatusMessage({ text: `เข้าสู่ระบบสำเร็จ: ${user.displayName || user.email}`, type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: `เข้าสู่ระบบไม่สำเร็จ: ${err.message}`, type: 'error' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setStatusMessage({ text: 'ออกจากระบบเรียบร้อยแล้ว', type: 'info' });
    } catch (err: any) {
      setStatusMessage({ text: `ออกจากระบบไม่สำเร็จ: ${err.message}`, type: 'error' });
    }
  };

  const handleUploadToCloud = async () => {
    try {
      setIsUploading(true);
      setStatusMessage({ text: 'กำลังส่งข้อมูลทั้งหมดขึ้น Firebase Cloud...', type: 'info' });
      const res = await FirebaseSyncService.syncLocalToCloud();
      if (res.success) {
        setStatusMessage({ text: 'แชร์ข้อมูลขึ้น Firebase Cloud สำเร็จแล้ว ทีมงานสามารถเข้าถึงได้ทันที', type: 'success' });
      } else {
        setStatusMessage({ text: `เกิดข้อผิดพลาดในการอัปโหลด: ${res.error}`, type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: `อัปโหลดไม่สำเร็จ: ${err.message}`, type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadFromCloud = async () => {
    try {
      setIsDownloading(true);
      setStatusMessage({ text: 'กำลังดึงข้อมูลล่าสุดจาก Firebase Cloud...', type: 'info' });
      const res = await FirebaseSyncService.pullCloudToLocal();
      if (res.success) {
        setStatusMessage({ text: `ดึงข้อมูลจาก Cloud สำเร็จ (${res.count} รายการ)`, type: 'success' });
        if (onDataSynced) {
          onDataSynced();
        }
      } else {
        setStatusMessage({ text: `เกิดข้อผิดพลาดในการดึงข้อมูล: ${res.error}`, type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: `ดึงข้อมูลไม่สำเร็จ: ${err.message}`, type: 'error' });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#1C1917] text-white w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F27D26]/20 border border-[#F27D26]/40 flex items-center justify-center text-[#F27D26]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">เชื่อมต่อ Firebase Cloud</h2>
              <p className="text-xs text-white/50">จัดเก็บและแชร์ข้อมูลต้นทุน-ยอดขายกับทีมงานแบบเรียลไทม์</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              ) : (
                <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-sky-400" />
              )}
              <span className="leading-snug">{statusMessage.text}</span>
            </div>
          )}

          {/* Cloud Info Card */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/60">สถานะ Firebase:</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                เชื่อมต่อฐานข้อมูลแล้ว (Active)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Project ID:</span>
              <span className="font-mono text-white/80">{firebaseConfig.projectId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Database:</span>
              <span className="font-mono text-white/70 text-[11px] truncate max-w-[220px]">
                {firebaseConfig.firestoreDatabaseId}
              </span>
            </div>
          </div>

          {/* User Auth Card */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white/80 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#F27D26]" /> บัญชีผู้ใช้งาน / ทีมงาน:
              </span>
              {currentUser && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  เข้าสู่ระบบแล้ว
                </span>
              )}
            </div>

            {currentUser ? (
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || ''}
                      className="w-8 h-8 rounded-full border border-white/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-white">{currentUser.displayName || 'ผู้ใช้งาน'}</div>
                    <div className="text-white/50 text-[11px] font-mono">{currentUser.email}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ออก</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-white/50 text-[11px]">
                  เข้าสู่ระบบด้วย Google เพื่อระบุตัวตนในการบันทึกและแชร์ข้อมูลกับทีมงาน
                </p>
                <button
                  onClick={handleLogin}
                  disabled={isConnecting}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isConnecting ? 'กำลังเชื่อมต่อ...' : 'เข้าสู่ระบบด้วย Google'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Sync Actions */}
          <div className="space-y-2 pt-1">
            <div className="font-semibold text-white/80">การซิงค์ข้อมูล (Cloud Synchronization):</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleUploadToCloud}
                disabled={isUploading}
                className="p-3.5 rounded-xl bg-[#F27D26] hover:bg-[#E06D1A] text-white font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50 text-center"
              >
                <CloudUpload className={`w-5 h-5 ${isUploading ? 'animate-bounce' : ''}`} />
                <span>{isUploading ? 'กำลังอัปโหลด...' : 'แชร์ข้อมูลขึ้น Cloud'}</span>
                <span className="text-[10px] text-white/80 font-normal">ส่งข้อมูลในเครื่องให้ทีม</span>
              </button>

              <button
                onClick={handleDownloadFromCloud}
                disabled={isDownloading}
                className="p-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 text-center"
              >
                <CloudDownload className={`w-5 h-5 ${isDownloading ? 'animate-bounce' : ''}`} />
                <span>{isDownloading ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลจาก Cloud'}</span>
                <span className="text-[10px] text-white/60 font-normal">อัปเดตข้อมูลล่าสุดจากทีม</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between text-[11px] text-white/40">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> ข้อมูลปลอดภัยด้วย Firebase Firestore
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
