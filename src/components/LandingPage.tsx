import React from 'react';
import { 
  Stethoscope, 
  Home, 
  Users, 
  Building2, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  Star, 
  Sparkles,
  Lock,
  BarChart3
} from 'lucide-react';
import { FormSetId } from '../types/survey';
import { FORM_SETS } from '../data/surveyQuestions';

interface LandingPageProps {
  onSelectSet: (setId: FormSetId) => void;
  onViewDashboard: () => void;
  healthCenterName: string;
  isAdminAuthenticated: boolean;
  isReportUnlocked: boolean;
  onOpenPasscodeModal: () => void;
  onOpenLoginModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSelectSet,
  onViewDashboard,
  healthCenterName,
  isAdminAuthenticated,
  isReportUnlocked,
  onOpenPasscodeModal,
  onOpenLoginModal,
}) => {
  const getIcon = (id: FormSetId) => {
    switch (id) {
      case 1:
        return <Stethoscope className="w-6 h-6 text-blue-700" />;
      case 2:
        return <Home className="w-6 h-6 text-emerald-700" />;
      case 3:
        return <Users className="w-6 h-6 text-purple-700" />;
      case 4:
        return <Building2 className="w-6 h-6 text-amber-700" />;
    }
  };

  const getCardAccent = (id: FormSetId) => {
    switch (id) {
      case 1:
        return 'from-blue-50/60 to-white hover:border-blue-500';
      case 2:
        return 'from-emerald-50/60 to-white hover:border-emerald-500';
      case 3:
        return 'from-purple-50/60 to-white hover:border-purple-500';
      case 4:
        return 'from-amber-50/60 to-white hover:border-amber-500';
    }
  };

  const handleReportClick = () => {
    if (isReportUnlocked || isAdminAuthenticated) {
      onViewDashboard();
    } else {
      onOpenPasscodeModal();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Banner */}
      <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden mb-8 sm:mb-10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>แบบสอบถามความพึงพอใจ สำนักอนามัย กทม. (ตรงตามต้นฉบับ 100%)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading text-white leading-tight mb-3">
            แบบสอบถามความพึงพอใจ<br />
            <span className="text-emerald-300">{healthCenterName}</span>
          </h1>

          <p className="text-teal-100 text-xs sm:text-sm leading-relaxed mb-6">
            ขอความร่วมมือท่านโปรดตอบแบบสอบถามตามความเป็นจริง เพื่อนำผลการประเมินไปพัฒนาและยกระดับมาตรฐานการให้บริการสาธารณสุขให้ดียิ่งขึ้น
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-teal-200">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
              <Clock className="w-3.5 h-3.5 text-emerald-300" />
              <span>ใช้เวลา 2-3 นาที</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>ข้อมูลการประเมินปลอดภัย</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
              <Star className="w-3.5 h-3.5 text-amber-300" />
              <span>เกณฑ์ระดับ 1 ถึง 5</span>
            </div>
          </div>
        </div>
      </div>

      {/* Target Group Selector */}
      <div className="mb-6">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-slate-900">
            กรุณาเลือกแบบสอบถามตามกลุ่มของท่าน
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            เมื่อเลือกแล้ว ระบบจะให้กรอกข้อมูลส่วนบุคคลตามแบบฟอร์มต้นฉบับก่อนเริ่มทำแบบประเมิน
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {FORM_SETS.map((set) => (
            <div
              key={set.id}
              onClick={() => onSelectSet(set.id)}
              className={`group bg-gradient-to-br ${getCardAccent(
                set.id
              )} rounded-2xl p-6 border-2 border-slate-200 shadow-sm cursor-pointer transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-white shadow-sm border border-slate-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {getIcon(set.id)}
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${set.badgeColor}`}>
                    ชุดที่ {set.id}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold font-heading text-slate-900 group-hover:text-teal-800 transition-colors mb-1.5">
                  {set.name}
                </h3>

                <p className="text-xs text-slate-600 font-medium mb-2 leading-relaxed">
                  🎯 <strong>กลุ่มเป้าหมาย:</strong> {set.targetGroup}
                </p>

                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  {set.officialTitle}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-2">
                <span className="text-[11px] text-slate-400 font-medium">
                  กรอกข้อมูลส่วนบุคคล &gt; ประเมิน 5 ระดับ
                </span>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 group-hover:translate-x-1 transition-transform">
                  เริ่มตอบแบบสอบถาม
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff & Admin Access Bar */}
      <div className="mt-8 p-4 sm:p-5 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center flex-shrink-0 border border-teal-200">
            <BarChart3 className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">สำหรับเจ้าหน้าที่ศูนย์บริการสาธารณสุข 40 บางแค</p>
            <p className="text-[11px] text-slate-500">
              เข้าดูรายงานสรุปสถิติความพึงพอใจ หรือเข้าสู่ระบบผู้ดูแลระบบ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Quick Statistics Report Access */}
          <button
            onClick={handleReportClick}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-emerald-300" />
            <span>{isReportUnlocked || isAdminAuthenticated ? 'เปิดหน้ารายงานสถิติ' : 'ดูรายงานสถิติ'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Administrator Login (b12) */}
          <button
            onClick={onOpenLoginModal}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
            title="เข้าสู่ระบบจัดการผู้ดูแลระบบ (Admin: b12)"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
};
