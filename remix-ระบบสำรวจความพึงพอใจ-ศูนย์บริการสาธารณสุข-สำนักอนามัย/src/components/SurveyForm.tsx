import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Send, 
  AlertCircle, 
  User, 
  FileText, 
  HelpCircle,
  Stethoscope,
  Building2,
  Home,
  CheckCircle2
} from 'lucide-react';
import { 
  FormSetId, 
  SurveySubmissionPayload, 
  SurveyHeaderInfo, 
  PersonalInfo, 
  CommunityPlacesExperience,
  LIKERT_OPTIONS,
  CustomQuestionConfig
} from '../types/survey';
import { 
  FORM_SETS, 
  TREATMENT_RIGHTS_OPTIONS, 
  STAFF_DUTIES_OPTIONS,
  SET4_QUESTIONS,
  SET1_SERVICE_QUESTIONS,
  SET1_WORK_SATISFACTION_QUESTIONS,
  SET2_HOME_QUESTIONS,
  SET3_COMMUNITY_SERVICES
} from '../data/surveyQuestions';

interface SurveyFormProps {
  formSetId: FormSetId;
  onBack: () => void;
  onSubmitSuccess: (data: SurveySubmissionPayload) => void;
  gasWebhookUrl?: string;
  forwardToGas?: boolean;
  defaultHealthCenter?: string;
  customConfig?: CustomQuestionConfig;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const SurveyForm: React.FC<SurveyFormProps> = ({
  formSetId,
  onBack,
  onSubmitSuccess,
  gasWebhookUrl,
  forwardToGas,
  defaultHealthCenter = 'ศูนย์บริการสาธารณสุข 40 บางแค',
  customConfig,
}) => {
  const currentSet = FORM_SETS.find((s) => s.id === formSetId) || FORM_SETS[0];

  // Dynamic Buddhist Year calculation (e.g., 2026 -> 2569, 2027 -> 2570 automatically)
  const currentBuddhistYear = new Date().getFullYear() + 543;
  const YEAR_OPTIONS = [
    currentBuddhistYear - 2,
    currentBuddhistYear - 1,
    currentBuddhistYear,
    currentBuddhistYear + 1,
    currentBuddhistYear + 2,
  ].map(String);

  // Default month in Thai
  const currentMonthName = new Date().toLocaleDateString('th-TH', { month: 'long' }) || 'มีนาคม';

  // Header info (ศูนย์ฯ ว่างไว้ให้ระบุกรอกเอง, เดือนมีแถบเลื่อน, ปีคำนวณอัตโนมัติ)
  const [headerInfo, setHeaderInfo] = useState<SurveyHeaderInfo>({
    survey_no: '1',
    survey_month: currentMonthName,
    survey_year: String(currentBuddhistYear),
    health_center_no: '', // ว่างไว้ให้ระบุกรอกเองตามคำขอของผู้ใช้
    community_name: '',
  });

  // Personal info (default empty - no cross-set data pollution)
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    gender: '',
    age: '',
    education: '',
    occupation: '',
    position: '',
    treatment_right: '',
    treatment_right_other: '',
    staff_duties: [],
    staff_clinic_special_detail: '',
    staff_duties_other: '',
    chronic_disease: '',
    chronic_duration: '',
    chronic_hospital: '',
    home_reporter: '',
    home_referral_type: '',
    home_patient_category: '',
    home_self_care: '',
  });

  // ชุดที่ 3 คัดกรองหน้า 1
  const [hasVisitedCenter, setHasVisitedCenter] = useState<'เคย' | 'ไม่เคย' | ''>('เคย');
  const [notVisitedReason, setNotVisitedReason] = useState<string>('');

  // ชุดที่ 3 หน้า 2 สถานที่ในชุมชน
  const [commPlaces, setCommPlaces] = useState<CommunityPlacesExperience>({
    health_center_know: 'รู้จัก',
    health_center_used: 'เคยรับบริการ',
    elderly_club_know: 'รู้จัก',
    elderly_club_used: 'ไม่เคยรับบริการ',
    medicine_box_know: 'รู้จัก',
    medicine_box_used: 'ไม่เคยรับบริการ',
  });
  const [commHasReceivedService, setCommHasReceivedService] = useState<'เคยรับบริการ' | 'ไม่เคยรับบริการ' | ''>('เคยรับบริการ');
  const [commItemExperienced, setCommItemExperienced] = useState<{ [key: string]: 'เคย' | 'ไม่เคย' }>({});
  const [commRatings, setCommRatings] = useState<{ [key: string]: number }>({});
  const [commObstacles, setCommObstacles] = useState<string>('');
  const [commOtherSuggestions, setCommOtherSuggestions] = useState<string>('');

  // Core Likert Ratings (1 to 18 for Sets 1,3,4 or 1 to 12 for Set 2)
  const [ratings, setRatings] = useState<{ [key: string]: number }>({});
  const [otherSuggestions, setOtherSuggestions] = useState<string>('');

  // ชุดที่ 1 ความพึงพอใจการทำงาน (1-14) + ข้อ 15 + ข้อ 16
  const [workRatings, setWorkRatings] = useState<{ [key: string]: number }>({});
  const [workSupportNeeded, setWorkSupportNeeded] = useState<string>('');
  const [workSuggestionsOther, setWorkSuggestionsOther] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Helper toggle staff duties
  const toggleStaffDuty = (dutyId: string) => {
    const list = personalInfo.staff_duties || [];
    if (list.includes(dutyId)) {
      setPersonalInfo({ ...personalInfo, staff_duties: list.filter((d) => d !== dutyId) });
    } else {
      setPersonalInfo({ ...personalInfo, staff_duties: [...list, dutyId] });
    }
  };

  // Helper for setting Likert
  const handleRatingChange = (id: string, val: number) => {
    setRatings((prev) => ({ ...prev, [id]: val }));
    if (validationError) setValidationError(null);
  };

  const handleWorkRatingChange = (id: string, val: number) => {
    setWorkRatings((prev) => ({ ...prev, [id]: val }));
    if (validationError) setValidationError(null);
  };

  const handleCommRatingChange = (id: string, val: number) => {
    setCommRatings((prev) => ({ ...prev, [id]: val }));
    if (validationError) setValidationError(null);
  };

  // Determine sections based on formSetId
  const getCoreSections = () => {
    if (formSetId === 1) return SET1_SERVICE_QUESTIONS;
    if (formSetId === 2) return SET2_HOME_QUESTIONS;
    return SET4_QUESTIONS; // Set 3 and Set 4 share 18 questions
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 1. Validation ข้อมูลส่วนบุคคล
    if (!personalInfo.gender) {
      setValidationError('กรุณาระบุข้อมูลส่วนบุคคล: เพศ');
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return;
    }
    if (!personalInfo.age.trim()) {
      setValidationError('กรุณาระบุข้อมูลส่วนบุคคล: อายุ');
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return;
    }

    // 2. Validate Core Questions
    const coreSections = getCoreSections();
    // ถ้าชุด 3 และเลือก "ไม่เคย" ให้ข้ามการประเมิน 18 ข้อของหน้า 1
    const shouldSkipCoreForSet3 = formSetId === 3 && hasVisitedCenter === 'ไม่เคย';

    if (!shouldSkipCoreForSet3) {
      for (const sec of coreSections) {
        for (const item of sec.items) {
          if (!ratings[item.id]) {
            setValidationError(`กรุณาประเมินข้อ ${item.no}: "${item.text}"`);
            return;
          }
        }
      }
    }

    // 3. Validate Set 1 (Work satisfaction 1-14)
    if (formSetId === 1) {
      for (const item of SET1_WORK_SATISFACTION_QUESTIONS) {
        if (!workRatings[item.id]) {
          setValidationError(`กรุณาประเมินความพึงพอใจในการทำงาน ข้อ ${item.no}: "${item.text}"`);
          return;
        }
      }
    }

    // 4. Validate Set 3 หน้า 2 (ถ้าเคยรับบริการในชุมชน)
    if (formSetId === 3 && commHasReceivedService === 'เคยรับบริการ') {
      for (const item of SET3_COMMUNITY_SERVICES) {
        const exp = commItemExperienced[item.id];
        // Only require rating if user marked 'เคย' (or hasn't marked 'ไม่เคย')
        if (exp !== 'ไม่เคย' && !commRatings[item.id]) {
          setValidationError(`กรุณาประเมินบริการสาธารณสุขชุมชน ข้อ ${item.no}: "${item.text}" (หรือเลือก "ไม่เคย" หากไม่เคยรับบริการนี้)`);
          return;
        }
      }
    }

    const submissionId = `SRV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const nowIso = new Date().toLocaleString('th-TH');

    // กรองเฉพาะฟิลด์ส่วนบุคคลที่ตรงกับชุดแบบสอบถามนั้นๆ เท่านั้น (ป้องกันข้อมูลชุดอื่นติดไปด้วย)
    const sanitizedPersonalInfo: PersonalInfo = {
      gender: personalInfo.gender,
      age: personalInfo.age,
      education: personalInfo.education,
      occupation: formSetId === 1 ? '' : personalInfo.occupation,
      treatment_right: formSetId === 1 ? '' : personalInfo.treatment_right,
      treatment_right_other: formSetId === 1 ? '' : personalInfo.treatment_right_other,
    };

    if (formSetId === 1) {
      sanitizedPersonalInfo.position = personalInfo.position;
      sanitizedPersonalInfo.staff_duties = (personalInfo.staff_duties || []).map((dutyId) => {
        const found = STAFF_DUTIES_OPTIONS.find((d) => d.id === dutyId || d.label === dutyId || d.label.replace(' (ระบุ)', '') === dutyId);
        return found ? found.label.replace(' (ระบุ)', '') : dutyId;
      });
      sanitizedPersonalInfo.staff_clinic_special_detail = personalInfo.staff_clinic_special_detail;
      sanitizedPersonalInfo.staff_duties_other = personalInfo.staff_duties_other;
    } else if (formSetId === 2) {
      sanitizedPersonalInfo.chronic_disease = personalInfo.chronic_disease;
      sanitizedPersonalInfo.chronic_duration = personalInfo.chronic_duration;
      sanitizedPersonalInfo.chronic_hospital = personalInfo.chronic_hospital;
      sanitizedPersonalInfo.home_reporter = personalInfo.home_reporter;
      sanitizedPersonalInfo.home_referral_type = personalInfo.home_referral_type;
      sanitizedPersonalInfo.home_patient_category = personalInfo.home_patient_category;
      sanitizedPersonalInfo.home_self_care = personalInfo.home_self_care;
    }

    // Filter ratings for Set 3 if respondent never visited health center
    const finalRatings = (formSetId === 3 && hasVisitedCenter === 'ไม่เคย') ? {} : ratings;

    const payload: SurveySubmissionPayload = {
      id: submissionId,
      timestamp: nowIso,
      form_set: formSetId,
      form_set_name: currentSet.name,
      header_info: headerInfo,
      personal_info: sanitizedPersonalInfo,
      ratings: finalRatings,
      other_suggestions: otherSuggestions.trim() || undefined,
    };

    if (formSetId === 1) {
      payload.work_ratings = workRatings;
      payload.work_support_needed = workSupportNeeded.trim() || undefined;
      payload.work_suggestions_other = workSuggestionsOther.trim() || undefined;
    }

    if (formSetId === 3) {
      payload.has_visited_center = hasVisitedCenter;
      payload.not_visited_reason = notVisitedReason.trim() || undefined;
      payload.comm_places = commPlaces;
      payload.comm_has_received_service = commHasReceivedService;
      payload.comm_item_experienced = commItemExperienced;
      if (commHasReceivedService === 'เคยรับบริการ') {
        const cleanedCommRatings: { [key: string]: number } = {};
        Object.entries(commRatings).forEach(([k, v]) => {
          if (commItemExperienced[k] !== 'ไม่เคย') {
            cleanedCommRatings[k] = v;
          }
        });
        payload.comm_ratings = cleanedCommRatings;
      } else {
        payload.comm_ratings = {};
      }
      payload.comm_obstacles = commObstacles.trim() || undefined;
      payload.comm_other_suggestions = commOtherSuggestions.trim() || undefined;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }

      onSubmitSuccess(payload);
    } catch (err: any) {
      console.error('Submit error:', err);
      setValidationError(err.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง');
      window.scrollTo({ top: 150, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const coreSections = getCoreSections();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Top Bar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>เปลี่ยนชุดแบบสอบถาม</span>
        </button>

        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${currentSet.badgeColor}`}>
          ชุดที่ {currentSet.id}
        </span>
      </div>

      {/* Official Form Header Banner */}
      <div className="bg-white rounded-2xl p-6 border-2 border-teal-800 shadow-sm mb-6 text-center">
        <div className="text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1">
          สำนักอนามัย กรุงเทพมหานคร
        </div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-heading text-slate-900 leading-snug">
          {customConfig?.officialTitles?.[formSetId] || currentSet.officialTitle}
        </h1>

        {/* Survey Header Fields (เหมือนกันทุกชุด: สำรวจครั้งที่, ปี พ.ศ. อัตโนมัติ, ศูนย์ฯ ให้กรอกเอง, กลุ่มเป้าหมาย, แถบเลื่อนเดือน) */}
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 text-left">
          {/* Top Row: สำรวจครั้งที่, ปี พ.ศ., ศูนย์ฯ, กลุ่มเป้าหมาย */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* 1. สำรวจครั้งที่ */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-slate-700 font-bold mb-1">สำรวจครั้งที่:</label>
              <input
                type="text"
                value={headerInfo.survey_no}
                onChange={(e) => setHeaderInfo({ ...headerInfo, survey_no: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                placeholder="เช่น 1"
              />
            </div>

            {/* 2. ปี พ.ศ. (อัตโนมัติตามปีปัจจุบัน 2569 และเปลี่ยนเป็น 2570 เองในปีถัดไป) */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">ปี (พ.ศ.):</label>
                <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">
                  อัตโนมัติ
                </span>
              </div>
              <select
                value={headerInfo.survey_year || String(currentBuddhistYear)}
                onChange={(e) => setHeaderInfo({ ...headerInfo, survey_year: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    พ.ศ. {y} {y === String(currentBuddhistYear) ? '(ปีปัจจุบัน)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. ศูนย์ฯ (ไม่ต้องใส่ข้อความ ให้ระบุกรอกเองตามคำขอ) */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-slate-700 font-bold mb-1">ศูนย์ฯ:</label>
              <input
                type="text"
                value={headerInfo.health_center_no}
                onChange={(e) => setHeaderInfo({ ...headerInfo, health_center_no: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                placeholder="ระบุศูนย์ฯ เช่น ศูนย์บริการสาธารณสุข 40 บางแค"
              />
            </div>

            {/* 4. กลุ่มเป้าหมาย (เหมือนกันทุกชุด) */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
              <label className="block text-slate-700 font-bold mb-1">กลุ่มเป้าหมาย:</label>
              <div className="flex items-center justify-center p-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-bold text-center">
                ชุดที่ {formSetId}: {currentSet.name.replace(`ชุดที่ ${formSetId}: `, '')}
              </div>
            </div>
          </div>

          {/* Special for Set 3: ชุมชน */}
          {formSetId === 3 && (
            <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200 text-xs">
              <label className="block text-purple-900 font-bold mb-1">
                ชุมชน (สำหรับชุดที่ 3 ประชาชนในพื้นที่บริการ):
              </label>
              <input
                type="text"
                value={headerInfo.community_name}
                onChange={(e) => setHeaderInfo({ ...headerInfo, community_name: e.target.value })}
                className="w-full bg-white border border-purple-300 rounded-lg p-2 font-semibold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="ระบุชื่อชุมชน เช่น ชุมชนพัฒนาบางแค"
              />
            </div>
          )}

          {/* Row 2: เดือน (แถบเลื่อน / สโครบาร์แบบเลื่อนได้เอง มีเดือนให้เลือกไม่ต้องพิมพ์) */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-xs">เดือนที่ทำการสำรวจ:</span>
                <span className="text-[11px] font-bold text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-300">
                  เลือกอยู่: {headerInfo.survey_month || 'ยังไม่ได้เลือก'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                เลื่อนแถบสโครบาร์ด้านล่างเพื่อเลือกเดือน หรือเลือกจากกล่อง
              </span>
            </div>

            {/* Horizontal Scrollbar Month Slider */}
            <div className="overflow-x-auto pb-2 pt-1 flex items-center gap-1.5 scrollbar-thin scrollbar-thumb-teal-600 scrollbar-track-slate-100">
              {THAI_MONTHS.map((month) => {
                const isSelected = headerInfo.survey_month === month;
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => setHeaderInfo({ ...headerInfo, survey_month: month })}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-700 text-white shadow-md ring-2 ring-teal-400 font-bold scale-105'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-teal-50 hover:text-teal-900'
                    }`}
                  >
                    {month}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {validationError && (
          <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-800 flex items-start gap-3 shadow-sm animate-shake">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">กรุณาตรวจสอบข้อมูลที่ยังไม่ครบถ้วน</p>
              <p className="text-xs sm:text-sm mt-0.5">{validationError}</p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ส่วนที่ 1: ข้อมูลส่วนบุคคล (ตรงตามต้นฉบับ 100%) */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-5 h-5 text-teal-800" />
            <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900">
              ข้อมูลส่วนบุคคล
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. เพศ */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                ① เพศ <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                {['ชาย', 'หญิง'].map((g) => (
                  <label
                    key={g}
                    className={`flex-1 flex items-center justify-center py-2 px-3 rounded-xl border-2 font-semibold text-xs cursor-pointer transition-all ${
                      personalInfo.gender === g
                        ? 'bg-teal-800 text-white border-teal-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={personalInfo.gender === g}
                      onChange={() => setPersonalInfo({ ...personalInfo, gender: g as any })}
                      className="sr-only"
                    />
                    <span>{g === 'ชาย' ? '1. ชาย' : '2. หญิง'}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 2. อายุ */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                ② อายุ (ปี) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={personalInfo.age}
                onChange={(e) => setPersonalInfo({ ...personalInfo, age: e.target.value })}
                placeholder="ระบุอายุเป็นตัวเลข"
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            {/* 3. การศึกษาสูงสุด หรือ ตำแหน่ง (ชุด 1) */}
            {formSetId === 1 ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  ③ ตำแหน่ง <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={personalInfo.position}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, position: e.target.value })}
                  placeholder="เช่น พยาบาลวิชาชีพ, นักวิชาการสาธารณสุข"
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  ③ การศึกษาสูงสุด
                </label>
                <input
                  type="text"
                  value={personalInfo.education}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, education: e.target.value })}
                  placeholder="เช่น ประถมศึกษา, มัธยมศึกษา, ปริญญาตรี"
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            )}

            {/* 4. อาชีพ (ชุด 2,3,4) หรือ การศึกษาสูงสุด (ชุด 1) */}
            {formSetId === 1 ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  ④ การศึกษาสูงสุด
                </label>
                <input
                  type="text"
                  value={personalInfo.education}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, education: e.target.value })}
                  placeholder="เช่น ปริญญาตรี, ปริญญาโท"
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  ④ อาชีพ
                </label>
                <input
                  type="text"
                  value={personalInfo.occupation}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, occupation: e.target.value })}
                  placeholder="เช่น ค้าขาย, ข้าราชการ, รับจ้าง, แม่บ้าน"
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            )}
          </div>

          {/* ข้อ 5: สิทธิการรักษาพยาบาล (ชุดที่ 2, 3, 4) */}
          {formSetId !== 1 && (
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-800 mb-2">
                ⑤ สิทธิการรักษาพยาบาลที่ใช้ในครั้งนี้
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {TREATMENT_RIGHTS_OPTIONS.map((opt, idx) => {
                  const isChecked = personalInfo.treatment_right === opt;
                  return (
                    <label
                      key={opt}
                      className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-teal-50 border-teal-600 text-teal-900 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="treatment_right"
                        value={opt}
                        checked={isChecked}
                        onChange={() => setPersonalInfo({ ...personalInfo, treatment_right: opt })}
                        className="mt-0.5"
                      />
                      <span>{idx + 1}. {opt}</span>
                    </label>
                  );
                })}
              </div>
              {personalInfo.treatment_right === 'อื่นๆ' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={personalInfo.treatment_right_other}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, treatment_right_other: e.target.value })}
                    placeholder="ระบุสิทธิการรักษาพยาบาลอื่นๆ..."
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-slate-50"
                  />
                </div>
              )}
            </div>
          )}

          {/* ข้อ 5 (ชุดที่ 1): งานที่ท่านปฏิบัติในศูนย์ฯ (ตอบได้มากกว่า 1 ข้อ) */}
          {formSetId === 1 && (
            <div className="pt-2 bg-blue-50/50 p-4 rounded-xl border border-blue-200">
              <label className="block text-xs font-bold text-blue-900 mb-2">
                ⑤ งานที่ท่านปฏิบัติในศูนย์ฯ (ตอบได้มากกว่า 1 ข้อ)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {STAFF_DUTIES_OPTIONS.map((duty) => {
                  const isChecked = (personalInfo.staff_duties || []).includes(duty.id);
                  return (
                    <label
                      key={duty.id}
                      className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStaffDuty(duty.id)}
                        className="mt-0.5"
                      />
                      <span>{duty.label}</span>
                    </label>
                  );
                })}
              </div>
              {personalInfo.staff_duties?.includes('clinic_special') && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={personalInfo.staff_clinic_special_detail || ''}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, staff_clinic_special_detail: e.target.value })}
                    placeholder="ระบุคลินิกพิเศษ..."
                    className="w-full text-xs p-2 border border-blue-200 rounded-lg bg-white"
                  />
                </div>
              )}
              {(personalInfo.staff_duties?.includes('service_other') || personalInfo.staff_duties?.some(d => d.includes('อื่นๆ'))) && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={personalInfo.staff_duties_other || ''}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, staff_duties_other: e.target.value })}
                    placeholder="ระบุงานอื่นๆ ที่ท่านปฏิบัติ..."
                    className="w-full text-xs p-2 border border-blue-200 rounded-lg bg-white"
                  />
                </div>
              )}
            </div>
          )}

          {/* ข้อ 6 (ชุดที่ 2): โรคประจำตัวที่คุณเป็นอยู่ */}
          {formSetId === 2 && (
            <div className="pt-2 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
              <label className="block text-xs font-bold text-emerald-900 mb-2">
                ⑥ โรคประจำตัวที่คุณเป็นอยู่
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">ระบุโรค:</label>
                  <input
                    type="text"
                    value={personalInfo.chronic_disease}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, chronic_disease: e.target.value })}
                    placeholder="เช่น ความดัน, เบาหวาน, อัมพฤกษ์"
                    className="w-full text-xs p-2 border border-emerald-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">ระยะเวลาที่เป็น:</label>
                  <input
                    type="text"
                    value={personalInfo.chronic_duration}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, chronic_duration: e.target.value })}
                    placeholder="เช่น 3 ปี, 6 เดือน"
                    className="w-full text-xs p-2 border border-emerald-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">สถานที่รักษา:</label>
                  <input
                    type="text"
                    value={personalInfo.chronic_hospital}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, chronic_hospital: e.target.value })}
                    placeholder="เช่น รพ.จุฬาฯ, ศูนย์ฯ 4"
                    className="w-full text-xs p-2 border border-emerald-200 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ข้อ 6 (ชุดที่ 3): ท่านเคยไปรับบริการที่ศูนย์ ฯ หรือไม่ */}
          {formSetId === 3 && (
            <div className="pt-2 bg-purple-50/70 p-4 rounded-xl border-2 border-purple-200">
              <label className="block text-xs sm:text-sm font-bold text-purple-900 mb-2">
                ⑥ ท่านเคยไปรับบริการที่ศูนย์ ฯ หรือไม่ <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className={`flex-1 p-3 rounded-xl border-2 cursor-pointer font-semibold text-xs flex items-center justify-between ${
                  hasVisitedCenter === 'เคย' ? 'bg-purple-800 text-white border-purple-800 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="has_visited_center"
                      value="เคย"
                      checked={hasVisitedCenter === 'เคย'}
                      onChange={() => setHasVisitedCenter('เคย')}
                    />
                    <span>1. เคย (ตอบคำถามความพึงพอใจด้านล่าง)</span>
                  </div>
                </label>

                <label className={`flex-1 p-3 rounded-xl border-2 cursor-pointer font-semibold text-xs flex items-center justify-between ${
                  hasVisitedCenter === 'ไม่เคย' ? 'bg-purple-800 text-white border-purple-800 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="has_visited_center"
                      value="ไม่เคย"
                      checked={hasVisitedCenter === 'ไม่เคย'}
                      onChange={() => {
                        setHasVisitedCenter('ไม่เคย');
                        setRatings({});
                      }}
                    />
                    <span>2. ไม่เคย ("ไม่เคย" ข้ามไปตอบด้านหลัง)</span>
                  </div>
                </label>
              </div>

              {hasVisitedCenter === 'ไม่เคย' && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-purple-900 mb-1">
                    ระบุเหตุผลที่ไม่เคยไปรับบริการ:
                  </label>
                  <input
                    type="text"
                    value={notVisitedReason}
                    onChange={(e) => setNotVisitedReason(e.target.value)}
                    placeholder="เช่น ไม่ทราบสถานที่, เดินทางไม่สะดวก, ใช้สิทธิที่โรงพยาบาลอื่น"
                    className="w-full text-xs p-2.5 border border-purple-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  <p className="text-[11px] text-purple-700 mt-1 font-medium">
                    * ระบบจะข้ามคำถามความพึงพอใจการรับบริการที่ศูนย์ฯ 18 ข้อให้ท่านโดยอัตโนมัติ เพื่อไปตอบแบบประเมินบริการชุมชนด้านหลัง
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* ส่วนที่ 2: แบบสอบถามความพึงพอใจในการเข้ารับบริการ */}
        {/* ======================================================== */}
        {!(formSetId === 3 && hasVisitedCenter === 'ไม่เคย') && (
          <div className="space-y-6">
            <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold font-heading text-teal-900">
                  คำชี้แจง: กรุณาทำเครื่องหมายเลือกระดับความคิดเห็น
                </h2>
                <p className="text-xs text-teal-700">
                  (5) มากที่สุด | (4) มาก | (3) ปานกลาง | (2) น้อย | (1) น้อยที่สุด
                </p>
              </div>
            </div>

            {coreSections.map((sec) => (
              <div key={sec.category} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm sm:text-base font-bold font-heading text-teal-800 pb-2 border-b border-slate-100">
                  หมวด: {sec.category}
                </h3>

                <div className="space-y-4">
                  {sec.items.map((item) => (
                    <div key={item.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="w-5 h-5 rounded-md bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {item.no}
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                          {customConfig?.questionTexts?.[item.id] || item.text} <span className="text-rose-500">*</span>
                        </p>
                      </div>

                      {/* 5-Point Likert Radio pills */}
                      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-1">
                        {LIKERT_OPTIONS.map((opt) => {
                          const isSelected = ratings[item.id] === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleRatingChange(item.id, opt.value)}
                              className={`py-2 px-1 rounded-lg border-2 text-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-teal-800 text-white border-teal-800 font-bold shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <span className="block text-sm font-bold leading-none mb-0.5">
                                {opt.value}
                              </span>
                              <span className="block text-[10px] leading-tight truncate">
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* ข้อ 19 (หรือข้อ 13 ของชุด 2): ข้อเสนอแนะอื่นๆ */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <label className="block text-slate-900 font-bold text-sm sm:text-base mb-1">
                {formSetId === 2 ? '13. ข้อเสนอแนะ อื่นๆ' : '19. ข้อเสนอแนะ อื่นๆ'}
              </label>
              <textarea
                value={otherSuggestions}
                onChange={(e) => setOtherSuggestions(e.target.value)}
                rows={3}
                placeholder="ระบุข้อเสนอแนะเพิ่มเติม..."
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* สำหรับเจ้าหน้าที่ (ชุดที่ 2) */}
        {/* ======================================================== */}
        {formSetId === 2 && (
          <div className="bg-emerald-50 rounded-2xl p-6 border-2 border-emerald-300 shadow-sm space-y-4">
            <h3 className="text-sm sm:text-base font-bold font-heading text-emerald-900 pb-2 border-b border-emerald-200">
              สำหรับเจ้าหน้าที่ (ส่วนบันทึกข้อมูลการเยี่ยมบ้าน)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">1. ผู้ให้ข้อมูล</label>
                <select
                  value={personalInfo.home_reporter}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, home_reporter: e.target.value })}
                  className="w-full p-2 border border-emerald-200 rounded-lg bg-white"
                >
                  <option value="">-- กรุณาเลือก --</option>
                  <option value="ผู้ป่วย">1. ผู้ป่วย</option>
                  <option value="ญาติ">2. ญาติ</option>
                  <option value="ผู้ดูแล">3. ผู้ดูแล</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">2. ประเภทผู้รับบริการ</label>
                <select
                  value={personalInfo.home_referral_type}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, home_referral_type: e.target.value })}
                  className="w-full p-2 border border-emerald-200 rounded-lg bg-white"
                >
                  <option value="">-- กรุณาเลือก --</option>
                  <option value="ส่งต่อจากศูนย์ฯ">1. ส่งต่อจากศูนย์ฯ</option>
                  <option value="ส่งต่อจาก ร.พ.">2. ส่งต่อจาก ร.พ.</option>
                  <option value="พบเอง">3. พบเอง</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">3. ประเภทของผู้ป่วยที่ดูแลที่บ้าน</label>
                <select
                  value={personalInfo.home_patient_category}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, home_patient_category: e.target.value })}
                  className="w-full p-2 border border-emerald-200 rounded-lg bg-white"
                >
                  <option value="">-- กรุณาเลือก --</option>
                  <option value="ผู้ป่วยที่ต้องการดูแลระยะสั้น (Curable/Recover)">1. ผู้ป่วยที่ต้องการดูแลระยะสั้น (Curable/Recover)</option>
                  <option value="ผู้ป่วยเรื้อรัง (Long-term Chronic)">2. ผู้ป่วยเรื้อรัง (Long-term Chronic)</option>
                  <option value="ผู้ป่วยที่มีปัญหากระทบต่อคุณภาพชีวิต (Long-term with mild Disability)">3. ผู้ป่วยที่มีปัญหากระทบต่อคุณภาพชีวิต (Long-term with mild Disability)</option>
                  <option value="ผู้ป่วยที่ต้องการดูแลซับซ้อน (Long-term with extreme Disability)">4. ผู้ป่วยที่ต้องการดูแลซับซ้อน (Long-term with extreme Disability)</option>
                  <option value="ผู้ป่วยระยะสุดท้าย (Terminal ill)">5. ผู้ป่วยระยะสุดท้าย (Terminal ill)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">4. การดูแลตนเองที่บ้าน</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['ดูแลตนเองได้ดี', 'ดูแลตนเองได้บางส่วน', 'ดูแลตนเองไม่ได้', 'ไม่รู้สึกตัว'].map((care, idx) => (
                    <button
                      key={care}
                      type="button"
                      onClick={() => setPersonalInfo({ ...personalInfo, home_self_care: care })}
                      className={`p-2 rounded-lg border text-xs text-center font-semibold ${
                        personalInfo.home_self_care === care
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50'
                      }`}
                    >
                      {idx + 1}. {care}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* หน้า 2 ของชุดที่ 1: ความพึงพอใจในการทำงานของผู้ให้บริการ (14 ข้อ) */}
        {/* ======================================================== */}
        {formSetId === 1 && (
          <div className="bg-white rounded-2xl p-6 border border-blue-200 shadow-sm space-y-4">
            <div className="border-b border-blue-100 pb-3">
              <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full uppercase">
                ชุดที่ 1 (พลิกด้านหลัง)
              </span>
              <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900 mt-1">
                ความพึงพอใจในการทำงานของผู้ให้บริการของศูนย์บริการสาธารณสุข
              </h2>
            </div>

            <div className="space-y-4">
              {SET1_WORK_SATISFACTION_QUESTIONS.map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="w-5 h-5 rounded-md bg-blue-200 text-blue-900 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {item.no}
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                      {customConfig?.questionTexts?.[item.id] || item.text} <span className="text-rose-500">*</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-1">
                    {LIKERT_OPTIONS.map((opt) => {
                      const isSelected = workRatings[item.id] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleWorkRatingChange(item.id, opt.value)}
                          className={`py-2 px-1 rounded-lg border-2 text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-700 text-white border-blue-700 font-bold shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="block text-sm font-bold leading-none mb-0.5">
                            {opt.value}
                          </span>
                          <span className="block text-[10px] leading-tight truncate">
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* ข้อ 15 & 16 */}
            <div className="pt-4 space-y-4">
              <div>
                <label className="block text-slate-900 font-bold text-xs sm:text-sm mb-1">
                  15. ความต้องการการช่วยเหลือสนับสนุนในการให้บริการ
                </label>
                <textarea
                  value={workSupportNeeded}
                  onChange={(e) => setWorkSupportNeeded(e.target.value)}
                  rows={3}
                  placeholder="ระบุความต้องการการสนับสนุน เช่น อุปกรณ์ กำลังคน การอบรม หรืออื่นๆ..."
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-900 font-bold text-xs sm:text-sm mb-1">
                  16. ข้อเสนอแนะอื่น ๆ
                </label>
                <textarea
                  value={workSuggestionsOther}
                  onChange={(e) => setWorkSuggestionsOther(e.target.value)}
                  rows={3}
                  placeholder="ระบุข้อเสนอแนะอื่นๆ..."
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* หน้า 2 ของชุดที่ 3: บริการสาธารณสุขที่ได้รับจากชุมชน */}
        {/* ======================================================== */}
        {formSetId === 3 && (
          <div className="bg-white rounded-2xl p-6 border border-purple-200 shadow-sm space-y-6">
            <div className="border-b border-purple-100 pb-3">
              <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full uppercase">
                ชุดที่ 3 (พลิกด้านหลัง)
              </span>
              <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900 mt-1">
                ความพึงพอใจในบริการสาธารณสุขที่ได้รับจากชุมชน
              </h2>
            </div>

            {/* ส่วนสถานที่ในชุมชน 3 แห่ง */}
            <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200 space-y-3 text-xs">
              <p className="font-bold text-purple-900">
                สถานที่ที่ให้บริการสุขภาพในชุมชนที่ท่านเคยรับบริการในชุมชน (ตอบได้มากกว่า 1 ข้อ)
              </p>
              {[
                { key: 'health_center', name: '1. ศูนย์สุขภาพชุมชน' },
                { key: 'elderly_club', name: '2. ชมรมผู้สูงอายุ' },
                { key: 'medicine_box', name: '3. ตู้ยาชุมชน' }
              ].map((place) => {
                const knowKey = `${place.key}_know` as keyof CommunityPlacesExperience;
                const usedKey = `${place.key}_used` as keyof CommunityPlacesExperience;
                const knowVal = commPlaces[knowKey];
                const usedVal = commPlaces[usedKey];

                return (
                  <div key={place.key} className="p-2.5 bg-white rounded-lg border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">{place.name}</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`know_${place.key}`}
                            checked={knowVal === 'ไม่รู้จัก'}
                            onChange={() => setCommPlaces({ ...commPlaces, [knowKey]: 'ไม่รู้จัก', [usedKey]: 'ไม่เคยรับบริการ' })}
                          />
                          <span>1. ไม่รู้จัก</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`know_${place.key}`}
                            checked={knowVal === 'รู้จัก'}
                            onChange={() => setCommPlaces({ ...commPlaces, [knowKey]: 'รู้จัก' })}
                          />
                          <span>2. รู้จัก</span>
                        </label>
                      </div>

                      {knowVal === 'รู้จัก' && (
                        <div className="flex items-center gap-2 pl-2 border-l border-purple-200">
                          <label className="flex items-center gap-1 cursor-pointer text-emerald-800">
                            <input
                              type="radio"
                              name={`used_${place.key}`}
                              checked={usedVal === 'เคยรับบริการ'}
                              onChange={() => setCommPlaces({ ...commPlaces, [usedKey]: 'เคยรับบริการ' })}
                            />
                            <span>เคยรับบริการ</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer text-slate-600">
                            <input
                              type="radio"
                              name={`used_${place.key}`}
                              checked={usedVal === 'ไม่เคยรับบริการ'}
                              onChange={() => setCommPlaces({ ...commPlaces, [usedKey]: 'ไม่เคยรับบริการ' })}
                            />
                            <span>ไม่เคยรับบริการ</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* คำถามคัดกรองรับบริการสาธารณสุขของศูนย์ฯ */}
            <div className="p-4 rounded-xl border-2 border-purple-300 bg-purple-50">
              <p className="font-bold text-slate-900 text-xs sm:text-sm mb-3">
                ท่านเคยได้รับบริการสาธารณสุขของศูนย์บริการสาธารณสุข หรือไม่ <span className="text-rose-500">*</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className={`flex-1 p-3 rounded-xl border cursor-pointer font-semibold text-xs flex items-center gap-2 ${
                  commHasReceivedService === 'ไม่เคยรับบริการ'
                    ? 'bg-purple-800 text-white border-purple-800'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}>
                  <input
                    type="radio"
                    name="comm_has_received"
                    value="ไม่เคยรับบริการ"
                    checked={commHasReceivedService === 'ไม่เคยรับบริการ'}
                    onChange={() => {
                      setCommHasReceivedService('ไม่เคยรับบริการ');
                      setCommRatings({});
                    }}
                  />
                  <span>ไม่เคยรับบริการ (ให้ข้ามไปตอบในข้อ 16 และ ข้อ 17)</span>
                </label>

                <label className={`flex-1 p-3 rounded-xl border cursor-pointer font-semibold text-xs flex items-center gap-2 ${
                  commHasReceivedService === 'เคยรับบริการ'
                    ? 'bg-purple-800 text-white border-purple-800'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}>
                  <input
                    type="radio"
                    name="comm_has_received"
                    value="เคยรับบริการ"
                    checked={commHasReceivedService === 'เคยรับบริการ'}
                    onChange={() => setCommHasReceivedService('เคยรับบริการ')}
                  />
                  <span>เคยรับบริการ (ประเมินความพึงพอใจ 15 ข้อด้านล่าง)</span>
                </label>
              </div>
            </div>

            {/* ข้อ 1 - 15 (ถ้าเคยรับบริการ) */}
            {commHasReceivedService === 'เคยรับบริการ' && (
              <div className="space-y-4">
                <p className="text-xs text-purple-900 font-semibold">
                  ความพึงพอใจในบริการสาธารณสุขที่ เคย ได้รับในชุมชน (5 = มากที่สุด, 1 = น้อยที่สุด)
                </p>

                {SET3_COMMUNITY_SERVICES.map((item) => (
                  <div key={item.id} className="p-3.5 rounded-xl bg-purple-50/30 border border-purple-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-md bg-purple-200 text-purple-900 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {item.no}
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                          {customConfig?.questionTexts?.[item.id] || item.text} <span className="text-rose-500">*</span>
                        </p>
                      </div>

                      {/* ไม่เคย / เคย ติ๊กย่อยในแต่ละข้อตามต้นฉบับ */}
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setCommItemExperienced((prev) => ({ ...prev, [item.id]: 'ไม่เคย' }));
                            setCommRatings((prev) => {
                              const copy = { ...prev };
                              delete copy[item.id];
                              return copy;
                            });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-all ${
                            commItemExperienced[item.id] === 'ไม่เคย'
                              ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          ไม่เคย
                        </button>
                        <button
                          type="button"
                          onClick={() => setCommItemExperienced((prev) => ({ ...prev, [item.id]: 'เคย' }))}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-all ${
                            commItemExperienced[item.id] === 'เคย'
                              ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                              : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                          }`}
                        >
                          เคย
                        </button>
                      </div>
                    </div>

                    {commItemExperienced[item.id] === 'ไม่เคย' ? (
                      <div className="py-2 px-3 rounded-lg bg-slate-100 text-slate-500 text-xs text-center border border-slate-200 font-medium">
                        ระบุว่า "ไม่เคยรับบริการนี้" (ไม่ต้องให้คะแนน หรือคลิกเลือกระดับคะแนนด้านล่างหากต้องการเปลี่ยนเป็น "เคย")
                      </div>
                    ) : null}

                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-1">
                      {LIKERT_OPTIONS.map((opt) => {
                        const isSelected = commRatings[item.id] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setCommItemExperienced((prev) => ({ ...prev, [item.id]: 'เคย' }));
                              handleCommRatingChange(item.id, opt.value);
                            }}
                            className={`py-2 px-1 rounded-lg border-2 text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-800 text-white border-purple-800 font-bold shadow-sm'
                                : commItemExperienced[item.id] === 'ไม่เคย'
                                ? 'bg-slate-50 border-slate-200 text-slate-400 hover:border-purple-300'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <span className="block text-sm font-bold leading-none mb-0.5">
                              {opt.value}
                            </span>
                            <span className="block text-[10px] leading-tight truncate">
                              {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ข้อ 16 & 17 */}
            <div className="pt-4 space-y-4">
              <div>
                <label className="block text-slate-900 font-bold text-xs sm:text-sm mb-1">
                  16. ปัญหาอุปสรรคของท่านเมื่อมารับบริการที่ศูนย์บริการสาธารณสุข
                </label>
                <textarea
                  value={commObstacles}
                  onChange={(e) => setCommObstacles(e.target.value)}
                  rows={3}
                  placeholder="ระบุปัญหาอุปสรรค เช่น ระยะทาง, การรอคอย, การประชาสัมพันธ์..."
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-slate-900 font-bold text-xs sm:text-sm mb-1">
                  17. ข้อเสนอแนะอื่นๆ
                </label>
                <textarea
                  value={commOtherSuggestions}
                  onChange={(e) => setCommOtherSuggestions(e.target.value)}
                  rows={3}
                  placeholder="ระบุข้อเสนอแนะอื่นๆ สำหรับบริการชุมชน..."
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Action Bar */}
        <div className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-20">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-5 py-3 text-slate-600 hover:text-slate-900 bg-slate-100 font-semibold rounded-xl text-xs sm:text-sm transition-all"
          >
            ย้อนกลับ
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto flex-1 max-w-md px-6 py-3.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>ส่งแบบสอบถามความพึงพอใจ</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
