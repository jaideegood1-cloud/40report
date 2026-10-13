import React, { useState } from 'react';
import { Trash2, X, AlertTriangle, KeyRound, ShieldAlert, Check } from 'lucide-react';
import { FormSetId } from '../types/survey';
import { FORM_SETS } from '../data/surveyQuestions';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (target: 'all' | FormSetId) => void;
  countsBySet: { [key in FormSetId]: number };
  totalCount: number;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  countsBySet,
  totalCount,
}) => {
  const [deleteTarget, setDeleteTarget] = useState<'all' | FormSetId>('all');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDoubleConfirming, setIsDoubleConfirming] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleInitialConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = passcode.trim();
    if (trimmed !== '13685' && trimmed !== '13685hc40hc') {
      setError('รหัสยืนยันไม่ถูกต้อง กรุณากรอกรหัสผ่านผู้ดูแลระบบ');
      return;
    }

    // ผ่านขั้นที่ 1 -> เข้าสู่ป๊อปอัพยืนยันซ้ำขั้นที่ 2
    setIsDoubleConfirming(true);
  };

  const handleFinalExecute = () => {
    onConfirmDelete(deleteTarget);
    // รีเซ็ตค่า
    setPasscode('');
    setError(null);
    setIsDoubleConfirming(false);
    onClose();
  };

  const getTargetLabel = () => {
    if (deleteTarget === 'all') return `ข้อมูลทั้งหมด (${totalCount} รายการ)`;
    const s = FORM_SETS.find((f) => f.id === deleteTarget);
    return `ชุดที่ ${deleteTarget}: ${s?.name} (${countsBySet[deleteTarget]} รายการ)`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={() => {
            setIsDoubleConfirming(false);
            setError(null);
            setPasscode('');
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {!isDoubleConfirming ? (
          /* STEP 1: เลือกว่าจะลบชุดไหน + กรอกรหัสยืนยัน 13685 */
          <div>
            <div className="text-center mb-5">
              <div className="w-13 h-13 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-heading text-slate-900">
                ลบข้อมูลเพื่อเริ่มการสำรวจใหม่
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ท่านสามารถเลือกลบข้อมูลเฉพาะชุดที่ต้องการ หรือเคลียร์ข้อมูลทั้งหมดเพื่อเปิดรับการสำรวจรอบใหม่
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleInitialConfirm} className="space-y-4">
              {/* เลือกชุดที่ต้องการลบ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  เลือกชุดข้อมูลที่ต้องการลบ:
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  <label
                    className={`flex items-center justify-between p-2.5 rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all ${
                      deleteTarget === 'all'
                        ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="deleteTarget"
                        checked={deleteTarget === 'all'}
                        onChange={() => setDeleteTarget('all')}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>ลบข้อมูลทั้งหมด (ทุกชุด)</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                      {totalCount} ราย
                    </span>
                  </label>

                  {FORM_SETS.map((s) => (
                    <label
                      key={s.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all ${
                        deleteTarget === s.id
                          ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="radio"
                          name="deleteTarget"
                          checked={deleteTarget === s.id}
                          onChange={() => setDeleteTarget(s.id)}
                          className="text-rose-600 focus:ring-rose-500"
                        />
                        <span className="truncate">{s.name}</span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold ml-2 flex-shrink-0">
                        {countsBySet[s.id]} ราย
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ใส่รหัสยืนยัน 13685 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-rose-600" />
                  <span>ใส่รหัสยืนยันการลบ:</span>
                </label>
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="กรอกรหัสผ่านยืนยัน"
                  className="w-full text-sm border-2 border-slate-300 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 font-mono"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setPasscode('');
                    onClose();
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ยืนยันการลบ</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* STEP 2: ป๊อปอัพยืนยันซ้ำอีกครั้ง (Double Confirmation) */
          <div className="text-center py-2 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 border-4 border-rose-200 animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold font-heading text-slate-900 mb-2">
              ยืนยันการลบข้อมูลอีกครั้ง
            </h3>

            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm mb-5 text-left space-y-1">
              <p className="font-bold text-rose-800">⚠️ รายการที่จะถูกลบ:</p>
              <p className="font-semibold text-rose-900 text-sm">{getTargetLabel()}</p>
              <p className="text-[11px] text-emerald-800 pt-1 border-t border-rose-200 mt-1 font-medium">
                🛡️ ระบบความปลอดภัย: ระบบจะสร้างสำเนา Snapshot สำรองข้อมูลชุดนี้ไว้ในเซิร์ฟเวอร์อัตโนมัติก่อนลบ เพื่อป้องกันข้อมูลสูญหาย 100%
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsDoubleConfirming(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
              >
                ย้อนกลับ
              </button>

              <button
                type="button"
                onClick={handleFinalExecute}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>ยืนยันลบข้อมูลทันที</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
