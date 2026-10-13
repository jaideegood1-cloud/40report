export type FormSetId = 1 | 2 | 3 | 4;

export interface LikertOption {
  value: number;
  label: string;
  scoreLabel: string;
}

export const LIKERT_OPTIONS: LikertOption[] = [
  { value: 5, label: 'มากที่สุด', scoreLabel: '(5)' },
  { value: 4, label: 'มาก', scoreLabel: '(4)' },
  { value: 3, label: 'ปานกลาง', scoreLabel: '(3)' },
  { value: 2, label: 'น้อย', scoreLabel: '(2)' },
  { value: 1, label: 'น้อยที่สุด', scoreLabel: '(1)' }
];

export interface FormSetDefinition {
  id: FormSetId;
  name: string;
  officialTitle: string;
  targetGroup: string;
  shortDescription: string;
  badgeColor: string;
}

export interface QuestionItem {
  id: string;
  no: number;
  text: string;
}

export interface QuestionSection {
  category: string;
  items: QuestionItem[];
}

// ข้อมูลสำรวจและข้อมูลส่วนบุคคลตามต้นฉบับ
export interface SurveyHeaderInfo {
  survey_no?: string;        // สำรวจครั้งที่
  survey_month?: string;     // เดือน
  survey_year?: string;      // ปี (พ.ศ.) เช่น 2569, 2570 อัตโนมัติ
  health_center_no?: string; // ศูนย์ฯ
  community_name?: string;   // ชุมชน (ชุดที่ 3)
}

export interface PersonalInfo {
  gender: 'ชาย' | 'หญิง' | '';
  age: string;
  education: string;
  occupation: string;
  position?: string; // ตำแหน่ง (ชุดที่ 1)
  treatment_right?: string;
  treatment_right_other?: string;
  
  // ชุดที่ 1 ข้อมูลงานที่ปฏิบัติ
  staff_duties?: string[];
  staff_clinic_special_detail?: string;
  staff_duties_other?: string;

  // ชุดที่ 2 ข้อมูลโรคประจำตัว
  chronic_disease?: string;
  chronic_duration?: string;
  chronic_hospital?: string;

  // ชุดที่ 2 สำหรับเจ้าหน้าที่
  home_reporter?: string;        // 1. ผู้ให้ข้อมูล: ผู้ป่วย, ญาติ, ผู้ดูแล
  home_referral_type?: string;   // 2. ประเภทผู้รับบริการ: ส่งต่อจากศูนย์ฯ, ส่งต่อจาก ร.พ., พบเอง
  home_patient_category?: string;// 3. ประเภทของผู้ป่วยที่ดูแลที่บ้าน
  home_self_care?: string;       // 4. การดูแลตนเองที่บ้าน
}

export interface CommunityPlacesExperience {
  health_center_know: 'ไม่รู้จัก' | 'รู้จัก' | '';
  health_center_used?: 'เคยรับบริการ' | 'ไม่เคยรับบริการ' | '';
  elderly_club_know: 'ไม่รู้จัก' | 'รู้จัก' | '';
  elderly_club_used?: 'เคยรับบริการ' | 'ไม่เคยรับบริการ' | '';
  medicine_box_know: 'ไม่รู้จัก' | 'รู้จัก' | '';
  medicine_box_used?: 'เคยรับบริการ' | 'ไม่เคยรับบริการ' | '';
}

export interface SurveySubmissionPayload {
  id?: string;
  timestamp: string;
  form_set: FormSetId;
  form_set_name: string;

  // Header & Personal Info
  header_info: SurveyHeaderInfo;
  personal_info: PersonalInfo;

  // Core Likert Ratings (1 - 18)
  ratings: { [key: string]: number };

  // Common feedback (ข้อ 19 หรือ 13 หรือ 17)
  other_suggestions?: string;

  // ชุดที่ 1: ความพึงพอใจในการทำงาน (1-14) + ข้อ 15 ช่วยเหลือสนับสนุน + ข้อ 16 ข้อเสนอแนะอื่นๆ
  work_ratings?: { [key: string]: number };
  work_support_needed?: string;
  work_suggestions_other?: string;

  // ชุดที่ 3: สถานที่ในชุมชน + เคยไปรับบริการที่ศูนย์ฯ หรือไม่
  has_visited_center?: 'เคย' | 'ไม่เคย' | '';
  not_visited_reason?: string;
  comm_places?: CommunityPlacesExperience;
  comm_has_received_service?: 'ไม่เคยรับบริการ' | 'เคยรับบริการ' | '';
  comm_item_experienced?: { [key: string]: 'เคย' | 'ไม่เคย' };
  comm_ratings?: { [key: string]: number };
  comm_obstacles?: string;
  comm_other_suggestions?: string;
  is_demo?: boolean;
}

export interface CustomQuestionConfig {
  setNames?: { [key: number]: string };
  officialTitles?: { [key: number]: string };
  categoryTitles?: { [key: string]: string };
  questionTexts?: { [key: string]: string };
}

export interface AppSettings {
  healthCenterName: string;
  departmentName: string;
  gasWebhookUrl: string;
  forwardToGas: boolean;
  publicAppUrl?: string;
}
