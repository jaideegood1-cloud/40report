import React, { useState, useMemo } from 'react';
import { 
  Download, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  Table, 
  PieChart as PieIcon, 
  MessageSquare, 
  Users, 
  Star, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Filter, 
  Check,
  Stethoscope,
  Home,
  Building2,
  Calendar,
  X,
  FileSpreadsheet,
  Settings,
  Lock
} from 'lucide-react';
import { FormSetId, SurveySubmissionPayload, CustomQuestionConfig } from '../types/survey';
import { FORM_SETS } from '../data/surveyQuestions';
import { computeSurveyStats } from '../utils/statistics';
import { exportToMultiSheetExcel } from '../utils/export';
import { PieChart, PieChartSegment } from './PieChart';
import { ExcelSummaryTable } from './ExcelSummaryTable';
import { QuestionEditorModal } from './QuestionEditorModal';
import { GoogleSheetsExportModal } from './GoogleSheetsExportModal';

interface DashboardProps {
  submissions: SurveySubmissionPayload[];
  onDeleteTarget?: (target: 'all' | FormSetId) => void;
  healthCenterName: string;
  customConfig: CustomQuestionConfig;
  onSaveCustomConfig: (cfg: CustomQuestionConfig) => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  lastSyncTime?: Date;
  onNavigateToAdmin?: () => void;
  onLockReport?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  submissions,
  onDeleteTarget,
  healthCenterName,
  customConfig,
  onSaveCustomConfig,
  onRefreshData,
  isRefreshing = false,
  lastSyncTime,
  onNavigateToAdmin,
  onLockReport,
}) => {
  // Main view mode: 'tables' | 'charts' | 'responses'
  const [mainView, setMainView] = useState<'tables' | 'charts' | 'responses'>('charts');
  // Selected set for summary table (1, 2, 3, 4)
  const [selectedTableSet, setSelectedTableSet] = useState<FormSetId>(4);
  // Selected set filter for feedback list ('all' | 1 | 2 | 3 | 4)
  const [feedbackSetFilter, setFeedbackSetFilter] = useState<'all' | FormSetId>('all');
  // Secondary feedback filter: 'all' | 'has_comment'
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState<'all' | 'has_comment'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected filter for Charts view: 'all' | 1 | 2 | 3 | 4
  const [chartSetFilter, setChartSetFilter] = useState<'all' | FormSetId>('all');

  // Modals state
  const [isEditorModalOpen, setIsEditorModalOpen] = useState<boolean>(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const stats = useMemo(() => {
    return computeSurveyStats(submissions, 'all');
  }, [submissions]);

  // Submissions filtered for charts
  const chartSubmissions = useMemo(() => {
    if (chartSetFilter === 'all') return submissions;
    return submissions.filter((s) => s.form_set === chartSetFilter);
  }, [submissions, chartSetFilter]);

  // High-contrast Public Health Department color tokens
  const phColors = {
    tealPrimary: '#0f766e',     // Teal 700
    tealDark: '#115e59',        // Teal 800
    emerald: '#059669',         // Emerald 600
    cyan: '#0284c7',            // Sky 600
    amber: '#d97706',           // Amber 600
    indigo: '#4338ca',          // Indigo 700
    purple: '#7e22ce',          // Purple 700
    rose: '#be123c',            // Rose 700
    blue: '#1d4ed8',            // Blue 700
  };

  // Helper to extract rich metrics & high-contrast score distribution for a form set
  const getSetCardAnalytics = (setId: FormSetId) => {
    const setSubs = submissions.filter((s) => s.form_set === setId);
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalScore = 0;
    let totalAnswers = 0;

    setSubs.forEach((sub) => {
      const allVals = [
        ...Object.values(sub.ratings || {}),
        ...Object.values(sub.work_ratings || {}),
        ...Object.values(sub.comm_ratings || {}),
      ];
      allVals.forEach((v) => {
        const num = Number(v);
        if (num >= 1 && num <= 5 && counts[num as 1 | 2 | 3 | 4 | 5] !== undefined) {
          counts[num as 1 | 2 | 3 | 4 | 5]++;
          totalScore += num;
          totalAnswers++;
        }
      });
    });

    const mean = totalAnswers > 0 ? totalScore / totalAnswers : 0;
    const favorableCount = counts[5] + counts[4];
    const favorablePct = totalAnswers > 0 ? Number(((favorableCount / totalAnswers) * 100).toFixed(1)) : 0;
    const count = setSubs.length;
    const pctOfTotal = submissions.length > 0 ? Number(((count / submissions.length) * 100).toFixed(1)) : 0;

    // High-contrast Public Health Department rating palette
    const data: PieChartSegment[] = [
      { label: 'มากที่สุด (5)', value: counts[5], color: '#047857' }, // Deep Forest Emerald
      { label: 'มาก (4)', value: counts[4], color: '#0284c7' },       // Medical Sky Blue
      { label: 'ปานกลาง (3)', value: counts[3], color: '#d97706' },   // Golden Amber
      { label: 'น้อย (2)', value: counts[2], color: '#ea580c' },       // Safety Orange
      { label: 'น้อยที่สุด (1)', value: counts[1], color: '#dc2626' }, // Warning Crimson
    ];

    const levelLabel = mean >= 4.5 ? 'มากที่สุด' : mean >= 3.5 ? 'มาก' : mean >= 2.5 ? 'ปานกลาง' : mean > 0 ? 'น้อย' : '-';

    return {
      setId,
      count,
      pctOfTotal,
      mean,
      favorablePct,
      levelLabel,
      totalAnswers,
      data,
    };
  };

  const set1Analytics = useMemo(() => getSetCardAnalytics(1), [submissions]);
  const set2Analytics = useMemo(() => getSetCardAnalytics(2), [submissions]);
  const set3Analytics = useMemo(() => getSetCardAnalytics(3), [submissions]);
  const set4Analytics = useMemo(() => getSetCardAnalytics(4), [submissions]);

  // Overall Sets Distribution with Public Health high-contrast palette
  const setDistributionData: PieChartSegment[] = useMemo(() => {
    return [
      { label: 'ชุด 1: ผู้ให้บริการ (บุคลากร)', value: stats.byFormSet[1] || 0, color: '#1d4ed8' },     // Medical Blue
      { label: 'ชุด 2: บริการที่บ้าน (Home Care)', value: stats.byFormSet[2] || 0, color: '#047857' },    // Deep Emerald
      { label: 'ชุด 3: ประชาชนในพื้นที่ (ชุมชน)', value: stats.byFormSet[3] || 0, color: '#7c3aed' },   // Royal Purple
      { label: 'ชุด 4: ผู้รับบริการในศูนย์ (OPD)', value: stats.byFormSet[4] || 0, color: '#0f766e' },  // Deep Teal
    ];
  }, [stats]);

  // Compute form set with the most responses dynamically
  const mostAnsweredSet = useMemo(() => {
    if (stats.totalCount === 0) return null;
    const setIds: FormSetId[] = [1, 2, 3, 4];
    let maxId: FormSetId = 1;
    let maxCount = -1;
    setIds.forEach((id) => {
      const count = stats.byFormSet[id] || 0;
      if (count > maxCount) {
        maxCount = count;
        maxId = id;
      }
    });
    const setNames: Record<FormSetId, string> = {
      1: 'ชุดที่ 1 (ผู้ให้บริการ)',
      2: 'ชุดที่ 2 (บริการที่บ้าน)',
      3: 'ชุดที่ 3 (ประชาชนในพื้นที่)',
      4: 'ชุดที่ 4 (ในศูนย์ฯ)',
    };
    return {
      id: maxId,
      name: setNames[maxId],
      count: maxCount,
      percent: stats.totalCount > 0 ? ((maxCount / stats.totalCount) * 100).toFixed(0) : '0',
    };
  }, [stats]);

  // Feedback list filtered by set, type, and search
  const filteredFeedbacks = useMemo(() => {
    return submissions.filter((sub) => {
      // 1. Filter by set
      if (feedbackSetFilter !== 'all' && sub.form_set !== feedbackSetFilter) return false;

      // 2. Filter by type
      if (feedbackTypeFilter === 'has_comment') {
        const hasText = !!(
          sub.other_suggestions ||
          sub.work_support_needed ||
          sub.work_suggestions_other ||
          sub.comm_obstacles ||
          sub.comm_other_suggestions
        );
        if (!hasText) return false;
      }

      // 3. Search query
      if (!searchTerm.trim()) return true;
      const text = `${sub.id || ''} ${sub.form_set_name || ''} ${sub.personal_info?.occupation || ''} ${sub.personal_info?.position || ''} ${sub.other_suggestions || ''} ${sub.work_support_needed || ''} ${sub.work_suggestions_other || ''} ${sub.comm_obstacles || ''} ${sub.comm_other_suggestions || ''}`;
      return text.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [submissions, feedbackSetFilter, feedbackTypeFilter, searchTerm]);

  // Icon getter for set
  const getSetIcon = (id: FormSetId) => {
    switch (id) {
      case 1:
        return <Stethoscope className="w-5 h-5 text-blue-700" />;
      case 2:
        return <Home className="w-5 h-5 text-emerald-700" />;
      case 3:
        return <Users className="w-5 h-5 text-purple-700" />;
      case 4:
        return <Building2 className="w-5 h-5 text-amber-700" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-emerald-800 text-white shadow-xl flex items-center gap-3 border border-emerald-600 animate-slideIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{notification}</span>
        </div>
      )}

      {/* Header: สถิติความพึงพอใจ ศูนย์บริการสาธารณสุข 40 บางแค */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-bold text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              ระบบรายงานสำหรับเจ้าหน้าที่
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              ฐานข้อมูลเรียลไทม์ (Live Sync)
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
              <span>จำนวนผู้ตอบ:</span>
              <strong className="text-teal-900">{submissions.length}</strong>
              <span>ราย</span>
            </span>
            <span className="text-xs text-slate-500">• {healthCenterName}</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-heading text-slate-900">
            สถิติความพึงพอใจ {healthCenterName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {healthCenterName} สำนักอนามัย — สรุปรายงานสถิติความพึงพอใจแยกตามชุด (ชุดที่ 1 ถึง 4)
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2 no-print">
          {/* Multi-sheet Excel export */}
          <button
            onClick={() => exportToMultiSheetExcel(submissions)}
            disabled={submissions.length === 0}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="ส่งออกไฟล์ Excel แยกชีต 1-4 และหน้าผลสรุปรวมในไฟล์เดียว"
          >
            <Download className="w-4 h-4" />
            <span>ส่งออก Excel</span>
          </button>

          {/* Google Sheets in Drive export */}
          <button
            onClick={() => setIsGoogleSheetsModalOpen(true)}
            disabled={submissions.length === 0}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="บันทึกไฟล์สเปรดชีตไปยัง Google Sheets ใน Google Drive โดยตรง พร้อมดาวน์โหลด"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>บันทึกไปยัง Google Sheets</span>
          </button>

          {/* Edit Questionnaire Header Button */}
          <button
            onClick={() => setIsEditorModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            title="แก้ไขหัวข้อและคำถามในแบบสอบถาม"
          >
            <Edit3 className="w-4 h-4 text-teal-700" />
            <span>แก้ไขแบบสอบถาม</span>
          </button>

          {/* Administrator Page Navigation */}
          {onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="เข้าสู่ระบบจัดการสำหรับผู้ดูแลระบบ (Admin: b12)"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ผู้ดูแลระบบ (Admin)</span>
            </button>
          )}

          {/* Lock Report Button */}
          {onLockReport && (
            <button
              onClick={onLockReport}
              className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-300 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              title="ล็อกหน้ารายงานสถิติและกลับหน้าหลัก"
            >
              <Lock className="w-4 h-4 text-slate-500" />
              <span>ล็อกหน้ารายงาน</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ผู้ตอบแบบสอบถาม</p>
            <h3 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 mt-1">
              {stats.totalCount} <span className="text-xs font-normal text-slate-500">ราย</span>
            </h3>
            <p className="text-[11px] text-teal-700 font-medium mt-1">รวมครบทั้ง 4 ชุด</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">คะแนนเฉลี่ยรวม (x̄)</p>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="text-2xl sm:text-3xl font-bold font-heading text-teal-800">
                {stats.overallMean > 0 ? stats.overallMean.toFixed(2) : '-'}
              </h3>
              <span className="text-xs text-slate-400">/ 5.00</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {stats.overallMean >= 4.5
                ? 'ระดับ: มากที่สุด'
                : stats.overallMean >= 3.5
                ? 'ระดับ: มาก'
                : stats.overallMean >= 2.5
                ? 'ระดับ: ปานกลาง'
                : stats.overallMean > 0
                ? 'ระดับ: น้อย'
                : '-'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Star className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ร้อยละความพึงพอใจ</p>
            <h3 className="text-2xl sm:text-3xl font-bold font-heading text-emerald-700 mt-1">
              {stats.overallFavorablePercent > 0 ? `${stats.overallFavorablePercent}%` : '-'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">เกณฑ์ระดับมาก-มากที่สุด (4-5)</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ชุดที่มีผู้ตอบมากที่สุด</p>
            <h3 className="text-sm sm:text-base font-bold font-heading text-slate-800 mt-1 line-clamp-1">
              {mostAnsweredSet ? mostAnsweredSet.name : '-'}
            </h3>
            <p className="text-[11px] text-teal-700 font-semibold mt-1">
              {mostAnsweredSet ? `${mostAnsweredSet.count} คน (${mostAnsweredSet.percent}%)` : '0 คน (0%)'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CLEAN MAIN TABS NAVIGATION (3 โหมดหลัก ชัดเจน ไม่เรียงเป็นแนวยาว) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm mb-6 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => setMainView('tables')}
            className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mainView === 'tables'
                ? 'bg-teal-800 text-white shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>แบบฟอร์มสรุปรายงาน (แยกชุด)</span>
          </button>

          <button
            onClick={() => setMainView('charts')}
            className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mainView === 'charts'
                ? 'bg-teal-800 text-white shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <PieIcon className="w-4 h-4" />
            <span>กราฟวงกลมแสดงสัดส่วน</span>
          </button>

          <button
            onClick={() => setMainView('responses')}
            className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mainView === 'responses'
                ? 'bg-teal-800 text-white shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>รายชื่อ & ข้อคิดเห็น ({submissions.length})</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: SUMMARY TABLES (ตารางผลสรุปตามชุดที่ 1-4) */}
      {/* ======================================================== */}
      {mainView === 'tables' && (
        <div className="space-y-5">
          {/* Set Selector Cards Grid (จัดเป็นกล่องการ์ดสวยงาม ไม่เรียงยาวจนรก) */}
          <div className="no-print">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                เลือกดูแบบฟอร์มสรุปตามชุด:
              </h3>
              <span className="text-[11px] text-slate-500">
                คลิกเลือกชุดเพื่อแสดงตารางสถิติตามแบบฟอร์มต้นฉบับ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {FORM_SETS.map((set) => {
                const isSelected = selectedTableSet === set.id;
                const count = stats.byFormSet[set.id] || 0;
                return (
                  <button
                    key={set.id}
                    onClick={() => setSelectedTableSet(set.id)}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg -translate-y-0.5'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-white/10' : 'bg-slate-100'
                        }`}>
                          {getSetIcon(set.id)}
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {count} ราย
                        </span>
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm leading-snug">
                        ชุดที่ {set.id}
                      </h4>
                      <p className={`text-[11px] leading-snug mt-0.5 line-clamp-1 ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}>
                        {set.name.replace(`ชุดที่ ${set.id}: `, '')}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100/20 text-[10px] flex items-center justify-between">
                      <span className={isSelected ? 'text-teal-300' : 'text-slate-400'}>
                        {isSelected ? 'กำลังแสดงผล' : 'คลิกเพื่อดูผลสรุป'}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-teal-300" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Set Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-100/80 p-3.5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-900">
                {FORM_SETS.find((s) => s.id === selectedTableSet)?.name}
              </span>
              <span className="text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full font-bold border border-teal-200">
                {customConfig?.officialTitles?.[selectedTableSet] ? 'มีปรับแต่งหัวข้อ' : 'ต้นฉบับ 100%'}
              </span>
            </div>
            <span className="text-xs text-slate-600">
              จำนวนผู้ตอบในชุดนี้: <strong className="text-slate-900 text-sm">{stats.byFormSet[selectedTableSet] || 0}</strong> ราย
            </span>
          </div>

          {/* Table Container */}
          <ExcelSummaryTable
            formSetId={selectedTableSet}
            submissions={submissions}
            customConfig={customConfig}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: PIE CHARTS (กราฟวงกลมแสดงสัดส่วน มาตรฐานสำนักอนามัย) */}
      {/* ======================================================== */}
      {mainView === 'charts' && (
        <div className="space-y-6">
          {/* Chart Filter bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-teal-700" />
              <span className="text-xs font-bold text-slate-800">
                เลือกมุมมองกราฟวงกลม:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setChartSetFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartSetFilter === 'all'
                    ? 'bg-teal-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>ภาพรวมทั้งหมด (ครบ 4 ชุด)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  chartSetFilter === 'all' ? 'bg-teal-950 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {submissions.length}
                </span>
              </button>
              {FORM_SETS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setChartSetFilter(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    chartSetFilter === s.id
                      ? 'bg-teal-800 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>ชุดที่ {s.id}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    chartSetFilter === s.id ? 'bg-teal-950 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {stats.byFormSet[s.id] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Overall Set Breakdown Header Banner */}
          <div className="bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-teal-700/40 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/40 text-[11px] font-bold">
                  สำนักอนามัย กรุงเทพมหานคร
                </span>
                <span className="text-xs text-teal-200/90">
                  ศูนย์บริการสาธารณสุข 40 บางแค • รายงานสถิติความพึงพอใจ 4 ชุดบริการ
                </span>
              </div>
              <h3 className="text-lg sm:text-2xl font-bold font-heading text-white">
                แผนภาพวิเคราะห์ความพึงพอใจ 4 ชุดบริการ
              </h3>
              <p className="text-xs sm:text-sm text-teal-100/80 mt-1 max-w-2xl leading-relaxed">
                สรุปสัดส่วนระดับคะแนนความพึงพอใจ 5 ระดับ (มากที่สุด ถึง น้อยที่สุด) ด้วยชุดสีมาตรฐานความคมชัดสูงของสำนักอนามัย
              </p>
            </div>

            {/* Quick KPI Badges */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15">
              <div className="px-3 py-1.5 text-center border-r border-white/15">
                <div className="text-[10px] text-teal-200 font-medium">ผู้ตอบทั้งหมด</div>
                <div className="text-lg sm:text-xl font-bold text-white font-heading">{submissions.length} <span className="text-xs font-normal">ราย</span></div>
              </div>
              <div className="px-3 py-1.5 text-center border-r border-white/15">
                <div className="text-[10px] text-teal-200 font-medium">คะแนนเฉลี่ยรวม</div>
                <div className="text-lg sm:text-xl font-bold text-emerald-300 font-heading">{stats.overallMean > 0 ? stats.overallMean.toFixed(2) : '-'} <span className="text-xs text-teal-200 font-normal">/ 5</span></div>
              </div>
              <div className="px-3 py-1.5 text-center">
                <div className="text-[10px] text-teal-200 font-medium">พึงพอใจ (4-5)</div>
                <div className="text-lg sm:text-xl font-bold text-teal-300 font-heading">{stats.overallFavorablePercent}%</div>
              </div>
            </div>
          </div>

          {/* Charts for Survey Sets 1-4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CELL 1: Survey Set 1 - ผู้ให้บริการ */}
            {(chartSetFilter === 'all' || chartSetFilter === 1) && (
              <div className="bg-white rounded-3xl border-2 border-blue-200/90 hover:border-blue-400 shadow-sm transition-all overflow-hidden flex flex-col justify-between ring-1 ring-blue-100">
                {/* Header */}
                <div className="px-5 pt-4 pb-3 border-b border-blue-100 bg-gradient-to-r from-blue-50/80 to-blue-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200 flex-shrink-0">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                          แบบสอบถามชุดที่ 1
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        <span className="text-[11px] font-semibold text-blue-700">บุคลากร/ผู้ให้บริการ</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">เจ้าหน้าที่ศูนย์บริการสาธารณสุข 40</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    {set1Analytics.count} ราย ({set1Analytics.pctOfTotal}%)
                  </span>
                </div>

                {/* Metrics ribbon */}
                <div className="grid grid-cols-3 gap-2 px-5 py-2.5 bg-blue-50/30 border-b border-blue-100/60 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">ผู้ตอบชุดนี้</span>
                    <strong className="text-slate-800 text-sm">{set1Analytics.count}</strong> <span className="text-[10px] text-slate-400">ราย</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">คะแนนเฉลี่ย (x̄)</span>
                    <strong className="text-blue-800 text-sm">{set1Analytics.mean > 0 ? set1Analytics.mean.toFixed(2) : '-'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">พึงพอใจมาก (4-5)</span>
                    <strong className="text-emerald-700 text-sm">{set1Analytics.favorablePct}%</strong>
                  </div>
                </div>

                {/* Pie Chart Body */}
                <div className="p-4 sm:p-5 flex-1">
                  <PieChart
                    title=""
                    subtitle=""
                    data={set1Analytics.data}
                    totalLabel="คะแนนชุด 1"
                    plainCard={true}
                  />
                </div>

                {/* Footer Action */}
                <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">ระดับความพึงพอใจ: <strong className="text-blue-900 font-semibold">{set1Analytics.levelLabel}</strong></span>
                  <button
                    onClick={() => { setSelectedTableSet(1); setMainView('tables'); }}
                    className="font-bold text-blue-700 hover:text-blue-900 transition-colors cursor-pointer text-xs"
                  >
                    ดูตารางสถิติคำถามชุดที่ 1 →
                  </button>
                </div>
              </div>
            )}

            {/* CELL 2: Survey Set 2 - ผู้รับบริการที่บ้าน */}
            {(chartSetFilter === 'all' || chartSetFilter === 2) && (
              <div className="bg-white rounded-3xl border-2 border-emerald-200/90 hover:border-emerald-400 shadow-sm transition-all overflow-hidden flex flex-col justify-between ring-1 ring-emerald-100">
                {/* Header */}
                <div className="px-5 pt-4 pb-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-emerald-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 flex-shrink-0">
                      <Home className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                          แบบสอบถามชุดที่ 2
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        <span className="text-[11px] font-semibold text-emerald-700">บริการตรวจเยี่ยมที่บ้าน</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">ผู้ป่วย ผู้ดูแล และญาติ (Home Health Care)</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {set2Analytics.count} ราย ({set2Analytics.pctOfTotal}%)
                  </span>
                </div>

                {/* Metrics ribbon */}
                <div className="grid grid-cols-3 gap-2 px-5 py-2.5 bg-emerald-50/30 border-b border-emerald-100/60 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">ผู้ตอบชุดนี้</span>
                    <strong className="text-slate-800 text-sm">{set2Analytics.count}</strong> <span className="text-[10px] text-slate-400">ราย</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">คะแนนเฉลี่ย (x̄)</span>
                    <strong className="text-emerald-800 text-sm">{set2Analytics.mean > 0 ? set2Analytics.mean.toFixed(2) : '-'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">พึงพอใจมาก (4-5)</span>
                    <strong className="text-emerald-700 text-sm">{set2Analytics.favorablePct}%</strong>
                  </div>
                </div>

                {/* Pie Chart Body */}
                <div className="p-4 sm:p-5 flex-1">
                  <PieChart
                    title=""
                    subtitle=""
                    data={set2Analytics.data}
                    totalLabel="คะแนนชุด 2"
                    plainCard={true}
                  />
                </div>

                {/* Footer Action */}
                <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">ระดับความพึงพอใจ: <strong className="text-emerald-900 font-semibold">{set2Analytics.levelLabel}</strong></span>
                  <button
                    onClick={() => { setSelectedTableSet(2); setMainView('tables'); }}
                    className="font-bold text-emerald-700 hover:text-emerald-900 transition-colors cursor-pointer text-xs"
                  >
                    ดูตารางสถิติคำถามชุดที่ 2 →
                  </button>
                </div>
              </div>
            )}

            {/* CELL 3: Survey Set 3 - ประชาชนในพื้นที่บริการ */}
            {(chartSetFilter === 'all' || chartSetFilter === 3) && (
              <div className="bg-white rounded-3xl border-2 border-purple-200/90 hover:border-purple-400 shadow-sm transition-all overflow-hidden flex flex-col justify-between ring-1 ring-purple-100">
                {/* Header */}
                <div className="px-5 pt-4 pb-3 border-b border-purple-100 bg-gradient-to-r from-purple-50/80 to-purple-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200 flex-shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                          แบบสอบถามชุดที่ 3
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                        <span className="text-[11px] font-semibold text-purple-700">ประชาชนในพื้นที่</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">ผู้อยู่อาศัยในเขตพื้นที่บริการบางแค</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    {set3Analytics.count} ราย ({set3Analytics.pctOfTotal}%)
                  </span>
                </div>

                {/* Metrics ribbon */}
                <div className="grid grid-cols-3 gap-2 px-5 py-2.5 bg-purple-50/30 border-b border-purple-100/60 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">ผู้ตอบชุดนี้</span>
                    <strong className="text-slate-800 text-sm">{set3Analytics.count}</strong> <span className="text-[10px] text-slate-400">ราย</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">คะแนนเฉลี่ย (x̄)</span>
                    <strong className="text-purple-800 text-sm">{set3Analytics.mean > 0 ? set3Analytics.mean.toFixed(2) : '-'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">พึงพอใจมาก (4-5)</span>
                    <strong className="text-emerald-700 text-sm">{set3Analytics.favorablePct}%</strong>
                  </div>
                </div>

                {/* Pie Chart Body */}
                <div className="p-4 sm:p-5 flex-1">
                  <PieChart
                    title=""
                    subtitle=""
                    data={set3Analytics.data}
                    totalLabel="คะแนนชุด 3"
                    plainCard={true}
                  />
                </div>

                {/* Footer Action */}
                <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">ระดับความพึงพอใจ: <strong className="text-purple-900 font-semibold">{set3Analytics.levelLabel}</strong></span>
                  <button
                    onClick={() => { setSelectedTableSet(3); setMainView('tables'); }}
                    className="font-bold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer text-xs"
                  >
                    ดูตารางสถิติคำถามชุดที่ 3 →
                  </button>
                </div>
              </div>
            )}

            {/* CELL 4: Survey Set 4 - ผู้รับบริการในศูนย์บริการสาธารณสุข */}
            {(chartSetFilter === 'all' || chartSetFilter === 4) && (
              <div className="bg-white rounded-3xl border-2 border-teal-200/90 hover:border-teal-400 shadow-sm transition-all overflow-hidden flex flex-col justify-between ring-1 ring-teal-100">
                {/* Header */}
                <div className="px-5 pt-4 pb-3 border-b border-teal-100 bg-gradient-to-r from-teal-50/80 to-teal-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center border border-teal-200 flex-shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                          แบบสอบถามชุดที่ 4
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                        <span className="text-[11px] font-semibold text-teal-700">ผู้รับบริการในศูนย์ฯ (OPD)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">ผู้ป่วยและประชาชนรับบริการ ณ ศูนย์บริการสาธารณสุข 40</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                    {set4Analytics.count} ราย ({set4Analytics.pctOfTotal}%)
                  </span>
                </div>

                {/* Metrics ribbon */}
                <div className="grid grid-cols-3 gap-2 px-5 py-2.5 bg-teal-50/30 border-b border-teal-100/60 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">ผู้ตอบชุดนี้</span>
                    <strong className="text-slate-800 text-sm">{set4Analytics.count}</strong> <span className="text-[10px] text-slate-400">ราย</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">คะแนนเฉลี่ย (x̄)</span>
                    <strong className="text-teal-800 text-sm">{set4Analytics.mean > 0 ? set4Analytics.mean.toFixed(2) : '-'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">พึงพอใจมาก (4-5)</span>
                    <strong className="text-emerald-700 text-sm">{set4Analytics.favorablePct}%</strong>
                  </div>
                </div>

                {/* Pie Chart Body */}
                <div className="p-4 sm:p-5 flex-1">
                  <PieChart
                    title=""
                    subtitle=""
                    data={set4Analytics.data}
                    totalLabel="คะแนนชุด 4"
                    plainCard={true}
                  />
                </div>

                {/* Footer Action */}
                <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">ระดับความพึงพอใจ: <strong className="text-teal-900 font-semibold">{set4Analytics.levelLabel}</strong></span>
                  <button
                    onClick={() => { setSelectedTableSet(4); setMainView('tables'); }}
                    className="font-bold text-teal-700 hover:text-teal-900 transition-colors cursor-pointer text-xs"
                  >
                    ดูตารางสถิติคำถามชุดที่ 4 →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* High-Contrast Public Health Palette Legend Guide */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                เกณฑ์มาตรฐานสีความคมชัดสูง (Public Health Department High-Contrast Palette):
              </span>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-[#047857]"></span>
                  <span className="text-slate-700 font-medium">มากที่สุด (5)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-[#0284c7]"></span>
                  <span className="text-slate-700 font-medium">มาก (4)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-[#d97706]"></span>
                  <span className="text-slate-700 font-medium">ปานกลาง (3)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-[#ea580c]"></span>
                  <span className="text-slate-700 font-medium">น้อย (2)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-[#dc2626]"></span>
                  <span className="text-slate-700 font-medium">น้อยที่สุด (1)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Complementary Overall Distribution Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm">
            <PieChart
              title="สัดส่วนจำนวนผู้ตอบแบบสอบถามรวมทั้ง 4 ชุด (Total Volume Breakdown)"
              subtitle="การกระจายตัวของจำนวนผู้ตอบจริงทั้ง 4 กลุ่มเป้าหมายของศูนย์บริการสาธารณสุข 40 บางแค"
              data={setDistributionData}
              totalLabel="ผู้ตอบทั้งหมด"
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: RESPONSES & FEEDBACK (แยกดูเป็นชุด หรือ รวมทุกชุด) */}
      {/* ======================================================== */}
      {mainView === 'responses' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          {/* Header & Filter Controls */}
          <div className="flex flex-col gap-3 pb-3 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900">
                  รายชื่อผู้ตอบแบบสอบถาม & ข้อคิดเห็น
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  เลือกดูแยกตามชุด หรือเลือกรวมทุกชุด เพื่อความสะดวกของผู้ดูแลระบบ
                </p>
              </div>

              {/* Counter badge */}
              <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full self-start sm:self-auto">
                แสดงผล {filteredFeedbacks.length} จาก {submissions.length} รายการ
              </span>
            </div>

            {/* Set Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs font-bold text-slate-500 mr-1">เลือกชุด:</span>
              <button
                onClick={() => setFeedbackSetFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  feedbackSetFilter === 'all'
                    ? 'bg-teal-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                รวมทุกชุด ({submissions.length})
              </button>
              {FORM_SETS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFeedbackSetFilter(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    feedbackSetFilter === s.id
                      ? 'bg-teal-800 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>ชุดที่ {s.id}: {s.targetGroup.split(' ')[0]}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    feedbackSetFilter === s.id ? 'bg-teal-950 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {stats.byFormSet[s.id] || 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Type Filters: All / Has Comment */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="font-bold text-slate-500 mr-1">ประเภท:</span>
              {[
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'has_comment', label: '💬 เฉพาะที่มีข้อคิดเห็น' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFeedbackTypeFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    feedbackTypeFilter === f.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="ค้นหารหัสแบบสอบถาม, อาชีพ, ตำแหน่ง หรือข้อความในข้อคิดเห็น..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs sm:text-sm pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* List of responses */}
          {filteredFeedbacks.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>
              <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนการค้นหาหรือเลือกดูแบบรวมทุกชุด</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredFeedbacks.map((sub: SurveySubmissionPayload) => (
                <div key={sub.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                        {sub.id}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        ชุดที่ {sub.form_set}
                      </span>
                      <span className="text-slate-600 font-medium">
                        {sub.personal_info?.gender || '-'}, อายุ {sub.personal_info?.age || '-'} ปี
                        {sub.personal_info?.position && ` • ตำแหน่ง: ${sub.personal_info.position}`}
                        {sub.personal_info?.occupation && ` • อาชีพ: ${sub.personal_info.occupation}`}
                        {sub.personal_info?.staff_duties && sub.personal_info.staff_duties.length > 0 && (
                          ` • งาน: ${sub.personal_info.staff_duties.map((d: string) => {
                            if (d === 'clinic_general') return 'คลินิกตรวจโรคทั่วไป';
                            if (d === 'clinic_special' || d === 'คลินิกพิเศษ') {
                              return sub.personal_info?.staff_clinic_special_detail ? `คลินิกพิเศษ (${sub.personal_info.staff_clinic_special_detail})` : 'คลินิกพิเศษ';
                            }
                            if (d === 'service_other' || d === 'อื่นๆ' || d === 'อื่นๆ (ระบุ)') {
                              return sub.personal_info?.staff_duties_other ? `อื่นๆ (${sub.personal_info.staff_duties_other})` : 'อื่นๆ';
                            }
                            return d;
                          }).join(', ')}`
                        )}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px]">{sub.timestamp}</span>
                  </div>

                  {sub.other_suggestions && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-800">
                      <span className="font-bold text-teal-900 block mb-0.5">💭 ข้อเสนอแนะการบริการ (ตอนที่ 1):</span>
                      "{sub.other_suggestions}"
                    </div>
                  )}

                  {sub.work_support_needed && (
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-900">
                      <span className="font-bold text-blue-900 block mb-0.5">🛠️ ความต้องการการสนับสนุน (เจ้าหน้าที่):</span>
                      "{sub.work_support_needed}"
                    </div>
                  )}

                  {sub.work_suggestions_other && (
                    <div className="bg-sky-50 p-3 rounded-xl border border-sky-100 text-xs text-sky-950">
                      <span className="font-bold text-sky-900 block mb-0.5">💡 ข้อเสนอแนะอื่นๆ ในการทำงาน (เจ้าหน้าที่):</span>
                      "{sub.work_suggestions_other}"
                    </div>
                  )}

                  {sub.comm_obstacles && (
                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-xs text-purple-900">
                      <span className="font-bold text-purple-900 block mb-0.5">⚠️ ปัญหาอุปสรรคการเข้าถึงบริการ (ชุมชน):</span>
                      "{sub.comm_obstacles}"
                    </div>
                  )}

                  {sub.comm_other_suggestions && (
                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-xs text-indigo-950">
                      <span className="font-bold text-indigo-900 block mb-0.5">💡 ข้อเสนอแนะการบริการในชุมชน (ชุมชน):</span>
                      "{sub.comm_other_suggestions}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Question / Header Editor Modal */}
      <QuestionEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        config={customConfig}
        onSaveConfig={onSaveCustomConfig}
      />

      {/* Google Sheets / Drive Export Modal */}
      <GoogleSheetsExportModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        submissions={submissions}
        healthCenterName={healthCenterName}
      />
    </div>
  );
};
