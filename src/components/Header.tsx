import React from 'react';
import { 
  ClipboardList, 
  BarChart3, 
  ShieldCheck, 
  LogOut, 
  Lock,
  Building2,
  KeyRound,
  QrCode
} from 'lucide-react';
import { FormSetId } from '../types/survey';

interface HeaderProps {
  currentView: 'survey' | 'dashboard' | 'admin' | 'gasGuide';
  onNavigate: (view: 'survey' | 'dashboard' | 'admin') => void;
  selectedFormSet: FormSetId | null;
  onResetToLanding: () => void;
  totalResponsesCount: number;
  onOpenPasscodeModal: () => void;
  healthCenterName: string;
  isAdminAuthenticated: boolean;
  isReportUnlocked: boolean;
  onOpenLoginModal: () => void;
  onOpenQrModal: () => void;
  onLogout: () => void;
  isRefreshing?: boolean;
  lastSyncTime?: Date;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  selectedFormSet,
  onResetToLanding,
  totalResponsesCount,
  onOpenPasscodeModal,
  healthCenterName,
  isAdminAuthenticated,
  isReportUnlocked,
  onOpenLoginModal,
  onOpenQrModal,
  onLogout,
}) => {
  const handleReportClick = () => {
    if (isReportUnlocked || isAdminAuthenticated) {
      onNavigate('dashboard');
    } else {
      onOpenPasscodeModal();
    }
  };

  const handleAdminClick = () => {
    if (isAdminAuthenticated) {
      onNavigate('admin');
    } else {
      onOpenLoginModal();
    }
  };

  return (
    <header className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 text-white shadow-lg sticky top-0 z-40 border-b border-teal-700/50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Brand Identity */}
          <div 
            onClick={onResetToLanding}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none min-w-0"
            title="กลับสู่หน้าหลักแบบสอบถาม"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-sm group-hover:bg-white/20 transition-all flex-shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-xs sm:text-base font-heading tracking-tight truncate leading-tight text-white group-hover:text-emerald-200 transition-colors">
                  {healthCenterName}
                </h1>
                {selectedFormSet && currentView === 'survey' && (
                  <span className="hidden md:inline-flex items-center text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    ชุดที่ {selectedFormSet}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-teal-200/80 truncate leading-tight">
                สำนักอนามัย กรุงเทพมหานคร • บันทึกแล้ว {totalResponsesCount} รายการ
              </p>
            </div>
          </div>

          {/* Navigation Items (Consolidated single Admin button) */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* 1. แบบสอบถาม */}
            <button
              onClick={() => onNavigate('survey')}
              className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                currentView === 'survey'
                  ? 'bg-white text-teal-900 shadow-md'
                  : 'text-teal-100 hover:bg-white/10'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>แบบสอบถาม</span>
            </button>

            {/* 2. รายงานสถิติ (ต้องใส่รหัสผ่านเพื่อเข้าใช้งาน) */}
            <button
              onClick={handleReportClick}
              className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-white text-teal-900 shadow-md'
                  : 'text-teal-100 hover:bg-white/10'
              }`}
              title="รายงานสถิติ (ต้องใช้รหัสผ่าน)"
            >
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />
              <span className="hidden sm:inline">รายงานสถิติ</span>
              <span className="sm:hidden">สถิติ</span>
              {!isReportUnlocked && !isAdminAuthenticated && (
                <Lock className="w-3 h-3 text-emerald-300/80 ml-0.5" />
              )}
            </button>

            {/* 3. ปุ่ม QR Code สำหรับจุดบริการ (เปิดดู/พิมพ์ป้ายได้ทันที) */}
            <button
              onClick={onOpenQrModal}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-teal-100 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              title="พิมพ์ป้าย QR Code สำหรับจุดบริการ"
            >
              <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />
              <span className="hidden sm:inline">QR Code</span>
            </button>

            {/* 4. Administrator Button */}
            {isAdminAuthenticated ? (
              <div className="flex items-center gap-1 pl-1 border-l border-teal-700/60">
                <button
                  onClick={handleAdminClick}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    currentView === 'admin'
                      ? 'bg-white text-teal-900 shadow-md'
                      : 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-400/30'
                  }`}
                  title="ระบบจัดการสำหรับผู้ดูแลระบบ (Admin: b12)"
                >
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />
                  <span>Admin: b12</span>
                </button>
                <button
                  onClick={onLogout}
                  className="p-1.5 sm:p-2 text-rose-300 hover:text-rose-100 hover:bg-rose-900/40 rounded-xl transition-colors text-xs flex items-center cursor-pointer"
                  title="ออกจากระบบผู้ดูแลระบบ"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAdminClick}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  currentView === 'admin'
                    ? 'bg-white text-teal-900 shadow-md'
                    : 'bg-teal-950/60 hover:bg-teal-950 text-teal-200 hover:text-white border border-teal-700/50'
                }`}
                title="ระบบจัดการผู้ดูแลระบบและ QR Code (Administrator)"
              >
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                <span className="hidden sm:inline">ผู้ดูแลระบบ</span>
                <span className="sm:hidden">Admin</span>
                <Lock className="w-3 h-3 text-teal-300 ml-0.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
