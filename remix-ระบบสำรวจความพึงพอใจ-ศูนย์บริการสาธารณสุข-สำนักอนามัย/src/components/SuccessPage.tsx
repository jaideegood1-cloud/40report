import React from 'react';
import { CheckCircle2, Home, RotateCcw, BarChart3, HeartHandshake } from 'lucide-react';
import { SurveySubmissionPayload } from '../types/survey';

interface SuccessPageProps {
  submission: SurveySubmissionPayload;
  onReset: () => void;
  onViewDashboard: () => void;
  healthCenterName: string;
}

export const SuccessPage: React.FC<SuccessPageProps> = ({
  submission,
  onReset,
  onViewDashboard,
  healthCenterName,
}) => {
  return (
    <div className="max-w-xl mx-auto px-4 py-12 sm:py-20 text-center">
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-100 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-teal-100 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-emerald-50">
            <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold mb-3 border border-teal-200">
            {submission.form_set_name || `ชุดที่ ${submission.form_set}`}
          </span>

          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 mb-2">
            บันทึกข้อมูลเรียบร้อยแล้ว
          </h2>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-md mx-auto mb-6">
            ขอบพระคุณเป็นอย่างยิ่งที่ท่านได้สละเวลาให้ข้อมูลและข้อเสนอแนะอันมีค่า 
            ศูนย์บริการสาธารณสุขจะนำเสียงสะท้อนนี้ไปพัฒนาการให้บริการเพื่อสุขภาพที่ดีของประชาชนต่อไป
          </p>

          {/* Submission Info Box */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left text-xs sm:text-sm space-y-2 mb-8">
            <div className="flex justify-between text-slate-500">
              <span>รหัสอ้างอิงการประเมิน:</span>
              <span className="font-mono font-semibold text-slate-800">{submission.id || 'SRV-REC'}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>วัน-เวลาที่บันทึก:</span>
              <span className="font-medium text-slate-800">{submission.timestamp}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>หน่วยบริการ:</span>
              <span className="font-medium text-slate-800">{healthCenterName}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onReset}
              className="flex-1 px-5 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm transition-all shadow-md shadow-teal-700/20 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>ทำแบบประเมินอีกครั้ง</span>
            </button>

            <button
              onClick={onViewDashboard}
              className="flex-1 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all border border-slate-200 flex items-center justify-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span>ดูสรุปภาพรวมสถิติ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
