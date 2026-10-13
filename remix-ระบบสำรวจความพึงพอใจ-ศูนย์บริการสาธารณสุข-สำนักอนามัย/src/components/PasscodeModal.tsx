import React, { useState } from 'react';
import { Lock, X, BarChart3, AlertCircle } from 'lucide-react';

interface PasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}

export const PasscodeModal: React.FC<PasscodeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'ระบบรายงานสถิติความพึงพอใจ',
  subtitle = 'กรุณากรอกรหัสผ่านเพื่อเปิดดูและจัดการหน้ารายงานสถิติ',
}) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = passcode.trim();
    if (trimmed === '13685' || trimmed === '13685hc40hc') {
      try {
        sessionStorage.setItem('health_survey_report_unlocked', 'true');
      } catch (e) {}
      setPasscode('');
      onSuccess();
      onClose();
      return;
    }

    setError('รหัสผ่านไม่ถูกต้อง กรุณากรอกรหัสผ่านให้ถูกต้อง');
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
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center mx-auto mb-2.5 border border-teal-200">
            <BarChart3 className="w-6 h-6 text-teal-700" />
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              รหัสผ่านสำหรับเข้าดูรายงานสถิติ:
            </label>
            <input
              type="password"
              inputMode="numeric"
              required
              autoFocus
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="กรอกรหัสผ่าน"
              className="w-full text-center text-xl tracking-widest font-mono font-bold border-2 border-slate-300 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-teal-800 hover:bg-teal-900 active:scale-98 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>ยืนยันรหัสผ่านเพื่อเข้าใช้งาน</span>
          </button>
        </form>
      </div>
    </div>
  );
};
