import React, { useState } from 'react';
import { Lock, X, LogIn, AlertCircle, KeyRound, ShieldCheck, QrCode } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  onOpenQrModal?: () => void;
  title?: string;
  subtitle?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onOpenQrModal,
  title = 'ระบบจัดการสำหรับผู้ดูแลระบบ (Administrator)',
  subtitle = 'เข้าสู่ระบบด้วยชื่อผู้ใช้งาน b12 เพื่อจัดการระบบ Google Sheets, สำรอง/กู้คืนข้อมูล และลบข้อมูล',
}) => {
  const [username, setUsername] = useState('b12');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const userTrimmed = username.trim();
    const passTrimmed = password.trim();

    // Check credentials (User: b12, Pass: 13685hc40hc)
    if (userTrimmed === 'b12' && (passTrimmed === '13685hc40hc' || passTrimmed === '13685')) {
      try {
        localStorage.setItem('health_survey_admin_token', 'authenticated_admin_b12');
        localStorage.setItem('health_survey_report_unlocked', '13685');
      } catch (e) {}
      onLoginSuccess();
      setPassword('');
      onClose();
      return;
    }

    setError('ชื่อผู้ใช้งานหรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto mb-2.5 border border-emerald-200">
            <ShieldCheck className="w-6 h-6 text-emerald-700" />
          </div>
          <h3 className="text-base sm:text-lg font-bold font-heading text-slate-900">
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="b12"
              className="w-full text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              รหัสผ่าน (Password)
            </label>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="กรอกรหัสผ่าน"
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-teal-800 hover:bg-teal-900 active:scale-98 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <Lock className="w-4 h-4" />
            <span>เข้าสู่ระบบผู้ดูแลระบบ</span>
          </button>
        </form>

        {/* Quick QR Code Button if user just needs the QR code without full login */}
        {onOpenQrModal && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenQrModal();
              }}
              className="text-xs text-teal-800 hover:text-teal-950 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-teal-700" />
              <span>เปิดป้าย QR Code สำหรับจุดบริการ</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
