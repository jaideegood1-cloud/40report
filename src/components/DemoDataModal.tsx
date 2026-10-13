import React, { useState } from 'react';
import { Sparkles, Trash2, X, PlusCircle, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { SurveySubmissionPayload } from '../types/survey';

interface DemoDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDemoData: () => void;
  onDeleteDemoOnly: () => void;
  submissions: SurveySubmissionPayload[];
}

export const DemoDataModal: React.FC<DemoDataModalProps> = ({
  isOpen,
  onClose,
  onAddDemoData,
  onDeleteDemoOnly,
  submissions,
}) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const demoCount = submissions.filter((s) => s.is_demo || s.id?.startsWith('DEMO-')).length;
  const realCount = submissions.length - demoCount;

  const handleAdd = () => {
    onAddDemoData();
    setSuccessMessage('เพิ่มข้อมูลตัวอย่าง (Demo) สำเร็จแล้ว!');
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  const handleDeleteDemo = () => {
    if (demoCount === 0) {
      alert('ขณะนี้ไม่มีข้อมูลตัวอย่างในระบบ');
      return;
    }
    onDeleteDemoOnly();
    setSuccessMessage(`ลบเฉพาะข้อมูลตัวอย่าง ${demoCount} รายการเรียบร้อยแล้ว (ข้อมูลคนจริง ${realCount} รายการยังคงอยู่ครบถ้วน)`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-3 border border-teal-200">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold font-heading text-slate-900">
            จัดการข้อมูลตัวอย่าง (Demo Data)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            ท่านสามารถเลือกเพิ่มข้อมูลตัวอย่างเพื่อทดสอบ หรือลบเฉพาะข้อมูลตัวอย่างทิ้งได้
          </p>
        </div>

        {/* Current Data Breakdown Box */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 mb-5 flex items-center justify-around text-xs text-center">
          <div>
            <span className="block text-slate-400 font-medium">ข้อมูลของคนจริง</span>
            <span className="text-lg font-bold text-emerald-700 font-heading">{realCount}</span>
            <span className="text-[10px] text-slate-400"> ราย</span>
          </div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div>
            <span className="block text-slate-400 font-medium">ข้อมูลตัวอย่าง (Demo)</span>
            <span className="text-lg font-bold text-amber-600 font-heading">{demoCount}</span>
            <span className="text-[10px] text-slate-400"> ราย</span>
          </div>
        </div>

        {successMessage ? (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Option 1: Add Demo */}
            <button
              onClick={handleAdd}
              className="w-full p-4 rounded-2xl border-2 border-teal-600 bg-teal-50 hover:bg-teal-100/70 text-teal-900 font-semibold text-xs sm:text-sm text-left transition-all flex items-center justify-between group cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-bold text-slate-900">ใส่ข้อมูลตัวอย่าง (เพิ่ม Demo)</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    ใส่ตัวอย่างคำตอบชุดที่ 1-4 เพื่อดูรายงานและกราฟิก
                  </span>
                </div>
              </div>
            </button>

            {/* Option 2: Delete ONLY Demo */}
            <button
              onClick={handleDeleteDemo}
              disabled={demoCount === 0}
              className="w-full p-4 rounded-2xl border-2 border-rose-300 bg-rose-50 hover:bg-rose-100/70 text-rose-900 font-semibold text-xs sm:text-sm text-left transition-all flex items-center justify-between group cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="block font-bold text-rose-900">ลบเฉพาะข้อมูลตัวอย่าง</span>
                    <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.2 rounded-full font-bold">
                      ห้ามลบคนจริง
                    </span>
                  </div>
                  <span className="text-[11px] text-rose-700 font-normal">
                    ล้างเฉพาะชุดข้อมูล Demo โดยข้อมูลคนจริง {realCount} รายจะปลอดภัย 100%
                  </span>
                </div>
              </div>
            </button>

            <div className="pt-2 text-center">
              <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                ระบบแยกแยะข้อมูลจริงและตัวอย่างด้วย Demo Tag
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
