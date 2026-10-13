import * as XLSX from 'xlsx';
import { SurveySubmissionPayload } from '../types/survey';

/**
 * Helper to compute row stats for summary sheet
 */
function getSummaryRow(
  filtered: SurveySubmissionPayload[],
  key: string,
  no: number | string,
  text: string
) {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  filtered.forEach((sub) => {
    let val: any = undefined;
    if (sub.ratings && sub.ratings[key] !== undefined) val = sub.ratings[key];
    else if (sub.work_ratings && sub.work_ratings[key] !== undefined) val = sub.work_ratings[key];
    else if (sub.comm_ratings && sub.comm_ratings[key] !== undefined) val = sub.comm_ratings[key];

    if (val && counts[val as 1 | 2 | 3 | 4 | 5] !== undefined) {
      counts[val as 1 | 2 | 3 | 4 | 5]++;
    }
  });

  const totalPersons = counts[5] + counts[4] + counts[3] + counts[2] + counts[1];
  const score5 = counts[5] * 5;
  const score4 = counts[4] * 4;
  const score3 = counts[3] * 3;
  const score2 = counts[2] * 2;
  const score1 = counts[1] * 1;
  const totalScore = score5 + score4 + score3 + score2 + score1;
  const avg = totalPersons > 0 ? (totalScore / totalPersons).toFixed(2) : '-';
  const percent = totalPersons > 0 ? `${((Number(avg) / 5) * 100).toFixed(2)}%` : '-';

  return [
    typeof no === 'number' ? `${no}. ${text}` : text,
    counts[5], counts[4], counts[3], counts[2], counts[1], totalPersons,
    score5, score4, score3, score2, score1,
    percent,
    avg
  ];
}

/**
 * Export full multi-sheet Excel workbook (.xlsx)
 * Sheets:
 * 1. "ชุดที่ 1 - ผู้ให้บริการ"
 * 2. "ชุดที่ 2 - บริการที่บ้าน"
 * 3. "ชุดที่ 3 - ประชาชนในพื้นที่"
 * 4. "ชุดที่ 4 - ในศูนย์บริการ"
 * 5. "ผลสรุปรายงานสถิติ" (ตารางสรุปผลของทุกชุดรวมกันในหน้าเดียว)
 */
// Helper to format staff duties into clean Thai
function formatStaffDutiesThai(duties?: string[], special?: string, other?: string): string {
  if (!duties || !Array.isArray(duties) || duties.length === 0) return '';
  const dutyMap: Record<string, string> = {
    clinic_general: 'คลินิกตรวจโรคทั่วไป',
    clinic_special: special ? `คลินิกพิเศษ (${special})` : 'คลินิกพิเศษ',
    'คลินิกพิเศษ': special ? `คลินิกพิเศษ (${special})` : 'คลินิกพิเศษ',
    clinic_dental: 'คลินิกทันตกรรม',
    clinic_vet: 'คลินิกสัตวแพทย์',
    clinic_health_anc: 'คลินิกส่งเสริมสุขภาพ: คลินิกฝากครรภ์',
    clinic_health_fp: 'คลินิกส่งเสริมสุขภาพ: คลินิกวางแผนครอบครัว',
    clinic_health_wcc: 'คลินิกส่งเสริมสุขภาพ: คลินิกสุขภาพเด็กดี',
    clinic_health_menopause: 'คลินิกส่งเสริมสุขภาพ: คลินิกวัยทอง',
    clinic_health_women: 'คลินิกส่งเสริมสุขภาพ: คลินิกส่งเสริมสุขภาพสตรี',
    service_community: 'บริการในชุมชน',
    service_school: 'บริการในโรงเรียน',
    service_other: other ? `อื่นๆ (${other})` : 'อื่นๆ',
    'อื่นๆ': other ? `อื่นๆ (${other})` : 'อื่นๆ',
  };
  return duties.map(d => {
    if (d === 'clinic_special' || d.startsWith('คลินิกพิเศษ')) {
      return special ? `คลินิกพิเศษ (${special})` : 'คลินิกพิเศษ';
    }
    if (d === 'service_other' || d === 'อื่นๆ' || d.startsWith('อื่นๆ')) {
      return other ? `อื่นๆ (${other})` : 'อื่นๆ';
    }
    return dutyMap[d] || d;
  }).join(', ');
}

// Helper to format treatment right including other text
function formatTreatmentRight(right?: string, other?: string): string {
  if (!right) return '';
  if (right === 'อื่นๆ' || right.startsWith('อื่นๆ') || right === 'สิทธิอื่นๆ') {
    return other ? `อื่นๆ (${other})` : 'อื่นๆ';
  }
  return right;
}

// Helper to calculate category average score from given question keys
function calcCatAvg(ratings: Record<string, number | undefined> | undefined, keys: string[]): string {
  if (!ratings) return '';
  const vals = keys.map(k => ratings[k]).filter((v): v is number => typeof v === 'number');
  if (vals.length === 0) return '';
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
}

export interface SurveySheetData {
  title: string;
  rows: (string | number)[][];
}

export interface SurveyWorkbookData {
  sheets: SurveySheetData[];
}

export function buildSurveyWorkbookData(submissions: SurveySubmissionPayload[]): SurveyWorkbookData {
  // ==========================================
  // SHEET 1: ชุดที่ 1 - ผู้ให้บริการ (ครบทุกคอลัมน์ c1-c6, ข้อ 1-18, งาน 1-14)
  // ==========================================
  const set1Subs = submissions.filter((s) => s.form_set === 1);
  const qCols1 = Array.from({ length: 18 }, (_, i) => `ข้อ ${i + 1}`);
  const workCols1 = Array.from({ length: 14 }, (_, i) => `งาน ${i + 1}`);
  const rowsSet1: any[][] = [
    [
      'รหัสแบบสอบถาม', 'วัน-เวลา', 'สำรวจครั้งที่', 'เดือน', 'ปี (พ.ศ.)', 'ศูนย์ฯ',
      'เพศ', 'อายุ', 'ตำแหน่ง', 'การศึกษา', 'งานที่ปฏิบัติ',
      'c1 (ความสะดวก)', 'c2 (คุณภาพ)', 'c3 (อัธยาศัย)', 'c4 (การให้ข้อมูล)', 'c5 (ค่ายา)', 'c6 (อาคารสถานที่)',
      ...qCols1,
      ...workCols1,
      'เฉลี่ยรวม', 'ร้อยละความพึงพอใจ', 'ระดับความพึงพอใจ',
      'ข้อเสนอแนะด้านการบริการ (ตอนที่ 1)', 'ข้อ 15 ความต้องการการสนับสนุน', 'ข้อ 16 ข้อเสนอแนะอื่นๆ'
    ]
  ];
  set1Subs.forEach((s) => {
    const scores = Object.values(s.ratings || {}).filter((v): v is number => typeof v === 'number');
    const workScores = Object.values(s.work_ratings || {}).filter((v): v is number => typeof v === 'number');
    const allScores = [...scores, ...workScores];
    const mean = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
    const avg = mean > 0 ? mean.toFixed(2) : '-';
    const pct = mean > 0 ? `${((mean / 5) * 100).toFixed(1)}%` : '-';
    const level = mean >= 4.5 ? 'มากที่สุด' : mean >= 3.5 ? 'มาก' : mean >= 2.5 ? 'ปานกลาง' : mean > 0 ? 'น้อย' : '-';

    const r = s.ratings || {};
    const wr = s.work_ratings || {};

    const c1 = calcCatAvg(r, ['s1_q1', 's1_q2', 's1_q3']);
    const c2 = calcCatAvg(r, ['s1_q4', 's1_q5', 's1_q6']);
    const c3 = calcCatAvg(r, ['s1_q7', 's1_q8', 's1_q9']);
    const c4 = calcCatAvg(r, ['s1_q10', 's1_q11', 's1_q12']);
    const c5 = calcCatAvg(r, ['s1_q13', 's1_q14']);
    const c6 = calcCatAvg(r, ['s1_q15', 's1_q16', 's1_q17', 's1_q18']);

    const qVals = Array.from({ length: 18 }, (_, i) => r[`s1_q${i + 1}`] ?? r[`q${i + 1}`] ?? '');
    const workVals = Array.from({ length: 14 }, (_, i) => wr[`work_${i + 1}`] ?? '');

    const dutiesThai = formatStaffDutiesThai(
      s.personal_info?.staff_duties,
      s.personal_info?.staff_clinic_special_detail,
      s.personal_info?.staff_duties_other
    );

    rowsSet1.push([
      s.id || '',
      s.timestamp,
      s.header_info?.survey_no || '',
      s.header_info?.survey_month || '',
      s.header_info?.survey_year || '',
      s.header_info?.health_center_no ? `ศบส. ${s.header_info.health_center_no}` : 'ศบส. 40 บางแค',
      s.personal_info?.gender || '',
      s.personal_info?.age || '',
      s.personal_info?.position || '',
      s.personal_info?.education || '',
      dutiesThai,
      c1, c2, c3, c4, c5, c6,
      ...qVals,
      ...workVals,
      avg, pct, level,
      s.other_suggestions || '',
      s.work_support_needed || '',
      s.work_suggestions_other || ''
    ]);
  });

  // ==========================================
  // SHEET 2: ชุดที่ 2 - บริการที่บ้าน (ครบทุกคอลัมน์ c1-c5, บริการที่บ้าน 1-12)
  // ==========================================
  const set2Subs = submissions.filter((s) => s.form_set === 2);
  const homeCols2 = Array.from({ length: 12 }, (_, i) => `บริการที่บ้าน ${i + 1}`);
  const rowsSet2: any[][] = [
    [
      'รหัสแบบสอบถาม', 'วัน-เวลา', 'สำรวจครั้งที่', 'เดือน', 'ปี (พ.ศ.)', 'ศูนย์ฯ',
      'เพศ', 'อายุ', 'การศึกษา', 'อาชีพ', 'สิทธิการรักษา',
      'โรคประจำตัว', 'ระยะเวลา', 'สถานที่รักษา', 'ผู้ให้ข้อมูล', 'ประเภทการส่งต่อ', 'ประเภทผู้ป่วย', 'การดูแลตนเอง',
      'c1 (ความสะดวก)', 'c2 (คุณภาพ)', 'c3 (อัธยาศัย)', 'c4 (การให้ข้อมูล)', 'c5 (ค่ายา)',
      ...homeCols2,
      'เฉลี่ยรวม', 'ร้อยละความพึงพอใจ', 'ระดับความพึงพอใจ',
      'ข้อเสนอแนะอื่นๆ'
    ]
  ];
  set2Subs.forEach((s) => {
    const scores = Object.values(s.ratings || {}).filter((v): v is number => typeof v === 'number');
    const mean = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const avg = mean > 0 ? mean.toFixed(2) : '-';
    const pct = mean > 0 ? `${((mean / 5) * 100).toFixed(1)}%` : '-';
    const level = mean >= 4.5 ? 'มากที่สุด' : mean >= 3.5 ? 'มาก' : mean >= 2.5 ? 'ปานกลาง' : mean > 0 ? 'น้อย' : '-';

    const r = s.ratings || {};
    const c1 = calcCatAvg(r, ['h1', 'h2', 'h3']);
    const c2 = calcCatAvg(r, ['h4', 'h5']);
    const c3 = calcCatAvg(r, ['h6', 'h7', 'h8']);
    const c4 = calcCatAvg(r, ['h9', 'h10', 'h11']);
    const c5 = calcCatAvg(r, ['h12']);

    const homeVals = Array.from({ length: 12 }, (_, i) => r[`h${i + 1}`] ?? '');

    rowsSet2.push([
      s.id || '',
      s.timestamp,
      s.header_info?.survey_no || '',
      s.header_info?.survey_month || '',
      s.header_info?.survey_year || '',
      s.header_info?.health_center_no ? `ศบส. ${s.header_info.health_center_no}` : 'ศบส. 40 บางแค',
      s.personal_info?.gender || '',
      s.personal_info?.age || '',
      s.personal_info?.education || '',
      s.personal_info?.occupation || '',
      formatTreatmentRight(s.personal_info?.treatment_right, s.personal_info?.treatment_right_other),
      s.personal_info?.chronic_disease || '',
      s.personal_info?.chronic_duration || '',
      s.personal_info?.chronic_hospital || '',
      s.personal_info?.home_reporter || '',
      s.personal_info?.home_referral_type || '',
      s.personal_info?.home_patient_category || '',
      s.personal_info?.home_self_care || '',
      c1, c2, c3, c4, c5,
      ...homeVals,
      avg, pct, level,
      s.other_suggestions || ''
    ]);
  });

  // ==========================================
  // SHEET 3: ชุดที่ 3 - ประชาชนในพื้นที่ (ครบทุกคอลัมน์ c1-c6, ข้อ 1-18, บริการชุมชน 1-15)
  // ==========================================
  const set3Subs = submissions.filter((s) => s.form_set === 3);
  const qCols3 = Array.from({ length: 18 }, (_, i) => `ข้อ ${i + 1}`);
  const commCols3 = Array.from({ length: 15 }, (_, i) => `บริการชุมชน ${i + 1}`);
  const rowsSet3: any[][] = [
    [
      'รหัสแบบสอบถาม', 'วัน-เวลา', 'สำรวจครั้งที่', 'เดือน', 'ปี (พ.ศ.)', 'ศูนย์ฯ', 'ชุมชน',
      'เพศ', 'อายุ', 'การศึกษา', 'อาชีพ', 'สิทธิการรักษา',
      'เคยรับบริการที่ศูนย์ฯ', 'เหตุผลที่ไม่เคย', 'เคยรับบริการในชุมชน',
      'c1 (ความสะดวก)', 'c2 (คุณภาพ)', 'c3 (อัธยาศัย)', 'c4 (การให้ข้อมูล)', 'c5 (ค่ายา)', 'c6 (อาคารสถานที่)',
      ...qCols3,
      ...commCols3,
      'เฉลี่ยรวม', 'ร้อยละความพึงพอใจ', 'ระดับความพึงพอใจ',
      'ข้อเสนอแนะการบริการที่ศูนย์ฯ (ตอนที่ 1)', 'ข้อ 16 ปัญหาอุปสรรค', 'ข้อ 17 ข้อเสนอแนะ'
    ]
  ];
  set3Subs.forEach((s) => {
    const scores = Object.values(s.ratings || {}).filter((v): v is number => typeof v === 'number');
    const commScores = Object.values(s.comm_ratings || {}).filter((v): v is number => typeof v === 'number');
    const allScores = [...scores, ...commScores];
    const mean = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
    const avg = mean > 0 ? mean.toFixed(2) : '-';
    const pct = mean > 0 ? `${((mean / 5) * 100).toFixed(1)}%` : '-';
    const level = mean >= 4.5 ? 'มากที่สุด' : mean >= 3.5 ? 'มาก' : mean >= 2.5 ? 'ปานกลาง' : mean > 0 ? 'น้อย' : '-';

    const r = s.ratings || {};
    const cr = s.comm_ratings || {};

    const c1 = calcCatAvg(r, ['q1', 'q2', 'q3']);
    const c2 = calcCatAvg(r, ['q4', 'q5', 'q6']);
    const c3 = calcCatAvg(r, ['q7', 'q8', 'q9']);
    const c4 = calcCatAvg(r, ['q10', 'q11', 'q12']);
    const c5 = calcCatAvg(r, ['q13', 'q14']);
    const c6 = calcCatAvg(r, ['q15', 'q16', 'q17', 'q18']);

    const qVals = Array.from({ length: 18 }, (_, i) => r[`q${i + 1}`] ?? '');
    const commVals = Array.from({ length: 15 }, (_, i) => cr[`comm_${i + 1}`] ?? '');

    rowsSet3.push([
      s.id || '',
      s.timestamp,
      s.header_info?.survey_no || '',
      s.header_info?.survey_month || '',
      s.header_info?.survey_year || '',
      s.header_info?.health_center_no ? `ศบส. ${s.header_info.health_center_no}` : 'ศบส. 40 บางแค',
      s.header_info?.community_name || '',
      s.personal_info?.gender || '',
      s.personal_info?.age || '',
      s.personal_info?.education || '',
      s.personal_info?.occupation || '',
      formatTreatmentRight(s.personal_info?.treatment_right, s.personal_info?.treatment_right_other),
      s.has_visited_center || '',
      s.not_visited_reason || '',
      s.comm_has_received_service || '',
      c1, c2, c3, c4, c5, c6,
      ...qVals,
      ...commVals,
      avg, pct, level,
      s.other_suggestions || '',
      s.comm_obstacles || '',
      s.comm_other_suggestions || ''
    ]);
  });

  // ==========================================
  // SHEET 4: ชุดที่ 4 - ในศูนย์บริการ (ครบทุกคอลัมน์ c1-c6, ข้อ 1-18)
  // ==========================================
  const set4Subs = submissions.filter((s) => s.form_set === 4);
  const qCols4 = Array.from({ length: 18 }, (_, i) => `ข้อ ${i + 1}`);
  const rowsSet4: any[][] = [
    [
      'รหัสแบบสอบถาม', 'วัน-เวลา', 'สำรวจครั้งที่', 'เดือน', 'ปี (พ.ศ.)', 'ศูนย์ฯ',
      'เพศ', 'อายุ', 'การศึกษา', 'อาชีพ', 'สิทธิการรักษา',
      'c1 (ความสะดวก)', 'c2 (คุณภาพ)', 'c3 (อัธยาศัย)', 'c4 (การให้ข้อมูล)', 'c5 (ค่ายา)', 'c6 (อาคารสถานที่)',
      ...qCols4,
      'เฉลี่ยรวม', 'ร้อยละความพึงพอใจ', 'ระดับความพึงพอใจ',
      'ข้อเสนอแนะอื่นๆ'
    ]
  ];
  set4Subs.forEach((s) => {
    const scores = Object.values(s.ratings || {}).filter((v): v is number => typeof v === 'number');
    const mean = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const avg = mean > 0 ? mean.toFixed(2) : '-';
    const pct = mean > 0 ? `${((mean / 5) * 100).toFixed(1)}%` : '-';
    const level = mean >= 4.5 ? 'มากที่สุด' : mean >= 3.5 ? 'มาก' : mean >= 2.5 ? 'ปานกลาง' : mean > 0 ? 'น้อย' : '-';

    const r = s.ratings || {};
    const c1 = calcCatAvg(r, ['q1', 'q2', 'q3']);
    const c2 = calcCatAvg(r, ['q4', 'q5', 'q6']);
    const c3 = calcCatAvg(r, ['q7', 'q8', 'q9']);
    const c4 = calcCatAvg(r, ['q10', 'q11', 'q12']);
    const c5 = calcCatAvg(r, ['q13', 'q14']);
    const c6 = calcCatAvg(r, ['q15', 'q16', 'q17', 'q18']);

    const qVals = Array.from({ length: 18 }, (_, i) => r[`q${i + 1}`] ?? '');

    rowsSet4.push([
      s.id || '',
      s.timestamp,
      s.header_info?.survey_no || '',
      s.header_info?.survey_month || '',
      s.header_info?.survey_year || '',
      s.header_info?.health_center_no ? `ศบส. ${s.header_info.health_center_no}` : 'ศบส. 40 บางแค',
      s.personal_info?.gender || '',
      s.personal_info?.age || '',
      s.personal_info?.education || '',
      s.personal_info?.occupation || '',
      formatTreatmentRight(s.personal_info?.treatment_right, s.personal_info?.treatment_right_other),
      c1, c2, c3, c4, c5, c6,
      ...qVals,
      avg, pct, level,
      s.other_suggestions || ''
    ]);
  });

  // ==========================================
  // SHEET 5: ผลสรุปรายงานสถิติ (ทุกชุดในหน้าเดียว)
  // ==========================================
  const summaryHeaderCols = [
    'รายการ',
    'มากที่สุด (5)', 'มาก (4)', 'ปานกลาง (3)', 'น้อย (2)', 'น้อยที่สุด (1)', 'รวม (คน)',
    'คะแนน 5', 'คะแนน 4', 'คะแนน 3', 'คะแนน 2', 'คะแนน 1',
    '% ร้อยละเฉลี่ย',
    'เฉลี่ย (x̄)'
  ];

  const summaryRows: any[][] = [
    ['รายงานสรุปสถิติความพึงพอใจ ศูนย์บริการสาธารณสุข 40 บางแค สำนักอนามัย'],
    ['รวบรวมข้อมูลผลการประเมินแยกตามชุดที่ 1, 2, 3, 4'],
    [],
    // --- สรุป ชุดที่ 1 ---
    ['*** แบบฟอร์มผลสรุป ชุดที่ 1: สำหรับผู้ให้บริการ ***'],
    summaryHeaderCols,
    getSummaryRow(set1Subs, 's1_q1', 1, 'ความรวดเร็วในขั้นตอนการให้บริการ(ตั้งแต่ผู้ป่วยมารับบริการที่ศูนย์ฯถึงกลับบ้าน)'),
    getSummaryRow(set1Subs, 's1_q2', 2, 'ระบบคิวการให้บริการเป็นไปตามลำดับก่อนหลัง'),
    getSummaryRow(set1Subs, 's1_q3', 3, 'การให้บริการที่ห้องจ่ายยา สะดวกรวดเร็ว'),
    getSummaryRow(set1Subs, 's1_q4', 4, 'เครื่องมือ อุปกรณ์ทางการแพทย์เพียงพอ สะอาดและพร้อมใช้งาน'),
    getSummaryRow(set1Subs, 's1_q5', 5, 'เจ้าหน้าที่ของศูนย์ฯ มีความรู้ ความสามารถในการให้บริการ'),
    getSummaryRow(set1Subs, 's1_q6', 6, 'ความสามารถของแพทย์ในการตรวจรักษา'),
    getSummaryRow(set1Subs, 's1_q7', 7, 'เจ้าหน้าที่ยิ้มแย้มแจ่มใสในการให้บริการ'),
    getSummaryRow(set1Subs, 's1_q8', 8, 'เจ้าหน้าที่ให้ความสนใจและเอาใจใส่เป็นอย่างดี'),
    getSummaryRow(set1Subs, 's1_q9', 9, 'เจ้าหน้าที่มีกริยา และวาจาสุภาพในการให้บริการ'),
    getSummaryRow(set1Subs, 's1_q10', 10, 'ผู้ใช้บริการได้รับข้อมูลการเจ็บป่วยและการรักษาตรงกับความต้องการ'),
    getSummaryRow(set1Subs, 's1_q11', 11, 'ผู้ใช้บริการได้รับคำแนะนำวิธีการใช้ยาแต่ละชนิดชัดเจนจากเจ้าหน้าที่'),
    getSummaryRow(set1Subs, 's1_q12', 12, 'ศูนย์ฯ มีสื่อและเอกสารในการให้ความรู้ และข้อมูลเพียงพอกับความต้องการ'),
    getSummaryRow(set1Subs, 's1_q13', 13, 'ค่ายา และค่าบริการของศูนย์ฯ เหมาะสม'),
    getSummaryRow(set1Subs, 's1_q14', 14, 'ถ้าเปรียบเทียบระหว่างบริการที่ได้รับกับค่าใช้จ่าย ท่านคิดว่าคุ้มค่า'),
    getSummaryRow(set1Subs, 's1_q15', 15, 'สถานที่ให้บริการเป็นสัดส่วน สะดวกต่อการใช้บริการ'),
    getSummaryRow(set1Subs, 's1_q16', 16, 'อาคารสถานที่ และสิ่งแวดล้อมในการให้บริการมีความปลอดภัย'),
    getSummaryRow(set1Subs, 's1_q17', 17, 'อาคารสถานที่ภายในและสิ่งแวดล้อมรอบๆบริเวณศูนย์ฯ สะอาดเป็นระเบียบเรียบร้อย'),
    getSummaryRow(set1Subs, 's1_q18', 18, 'ศูนย์ฯ มีป้ายหรือเครื่องหมายแสดงหน่วยงานหรือทิศทาง ชัดเจน'),
    // Work items 1-14
    ['-- ส่วนที่ 2: ความพึงพอใจในการทำงาน --'],
    getSummaryRow(set1Subs, 'work_1', 1, 'ความสำเร็จที่ได้รับจากการทำงาน'),
    getSummaryRow(set1Subs, 'work_2', 2, 'การได้รับการยอมรับจากผู้ร่วมงานในการปฏิบัติงาน'),
    getSummaryRow(set1Subs, 'work_3', 3, 'ลักษณะงานที่ปฏิบัติ'),
    getSummaryRow(set1Subs, 'work_4', 4, 'สามารถตัดสินใจเกี่ยวกับการปฏิบัติงานด้วยตนเอง'),
    getSummaryRow(set1Subs, 'work_5', 5, 'การได้รับการพัฒนาความรู้ และทักษะใหม่ ๆ ในการปฏิบัติงาน'),
    getSummaryRow(set1Subs, 'work_6', 6, 'ค่าตอบแทนและสวัสดิการที่ได้รับ'),
    getSummaryRow(set1Subs, 'work_7', 7, 'การบริหารจัดการของหน่วยงาน'),
    getSummaryRow(set1Subs, 'work_8', 8, 'ความยุติธรรมที่ได้รับจากผู้บังคับบัญชา'),
    getSummaryRow(set1Subs, 'work_9', 9, 'ความมั่นคงในหน้าที่การงาน'),
    getSummaryRow(set1Subs, 'work_10', 10, 'ความสัมพันธ์ระหว่างเพื่อนร่วมงาน'),
    getSummaryRow(set1Subs, 'work_11', 11, 'สภาพแวดล้อมทางกายภาพของสถานที่ทำงาน'),
    getSummaryRow(set1Subs, 'work_12', 12, 'โอกาส ความก้าวหน้าในหน้าที่การงาน'),
    getSummaryRow(set1Subs, 'work_13', 13, 'ตำแหน่งหน้าที่เป็นที่ยอมรับของสังคม'),
    getSummaryRow(set1Subs, 'work_14', 14, 'งานที่ทำมีผลต่อการดำเนินชีวิต'),
    [],

    // --- สรุป ชุดที่ 2 ---
    ['*** แบบฟอร์มผลสรุป ชุดที่ 2: สำหรับผู้รับบริการที่บ้าน ***'],
    summaryHeaderCols,
    getSummaryRow(set2Subs, 'h1', 1, 'ท่านได้รับความสะดวกในการรับบริการที่บ้าน'),
    getSummaryRow(set2Subs, 'h2', 2, 'ท่านได้รับบริการที่บ้านตรงตามความต้องการ'),
    getSummaryRow(set2Subs, 'h3', 3, 'ท่านพอใจในการติดต่อประสานงานการส่งต่อผู้ป่วยเพื่อมารับบริการที่บ้าน'),
    getSummaryRow(set2Subs, 'h4', 4, 'เครื่องมือ อุปกรณ์ในการบริการที่บ้านมีความเพียงพอ สะอาดและพร้อมใช้งาน'),
    getSummaryRow(set2Subs, 'h5', 5, 'เจ้าหน้าที่ของศูนย์ฯ มีความรู้ ความสามารถในการให้บริการ'),
    getSummaryRow(set2Subs, 'h6', 6, 'เจ้าหน้าที่ยิ้มแย้มแจ่มใสในการให้บริการ'),
    getSummaryRow(set2Subs, 'h7', 7, 'เจ้าหน้าที่ให้ความสนใจและเอาใจใส่เป็นอย่างดี'),
    getSummaryRow(set2Subs, 'h8', 8, 'เจ้าหน้าที่มีกริยา และวาจาสุภาพในการให้บริการ'),
    getSummaryRow(set2Subs, 'h9', 9, 'ท่านได้รับข้อมูลการเจ็บป่วยและการรักษาตรงกับความต้องการ'),
    getSummaryRow(set2Subs, 'h10', 10, 'ท่านได้รับคำแนะนำวิธีการดูแลผู้ป่วย/การปฏิบัติตัว ที่ชัดเจนจากเจ้าหน้าที่'),
    getSummaryRow(set2Subs, 'h11', 11, 'ศูนย์ฯ มีสื่อและเอกสารในการให้ความรู้ และข้อมูลเพียงพอกับความต้องการ'),
    getSummaryRow(set2Subs, 'h12', 12, 'ท่านพอใจต่อบริการในการดูแลผู้ป่วยที่บ้านของศูนย์ฯ'),
    [],

    // --- สรุป ชุดที่ 3 ---
    ['*** แบบฟอร์มผลสรุป ชุดที่ 3: สำหรับประชาชนในพื้นที่บริการ ***'],
    summaryHeaderCols,
    getSummaryRow(set3Subs, 'q1', 1, 'ความรวดเร็วในขั้นตอนการมารับบริการ (ตั้งแต่มาศูนย์ฯ ถึงกลับบ้าน)'),
    getSummaryRow(set3Subs, 'q2', 2, 'ระบบคิวการให้บริการเป็นไปตามลำดับก่อนหลัง'),
    getSummaryRow(set3Subs, 'q3', 3, 'การรับบริการที่ห้องจ่ายยา สะดวกรวดเร็ว'),
    getSummaryRow(set3Subs, 'q4', 4, 'เครื่องมือ อุปกรณ์ทางการแพทย์เพียงพอ สะอาดและพร้อมใช้งาน'),
    getSummaryRow(set3Subs, 'q5', 5, 'เจ้าหน้าที่ของศูนย์ฯ มีความรู้ ความสามารถในการให้บริการ'),
    getSummaryRow(set3Subs, 'q6', 6, 'ความสามารถของแพทย์ในการตรวจรักษา'),
    getSummaryRow(set3Subs, 'q7', 7, 'เจ้าหน้าที่ยิ้มแย้มแจ่มใสในการให้บริการ'),
    getSummaryRow(set3Subs, 'q8', 8, 'เจ้าหน้าที่ให้ความสนใจและเอาใจใส่เป็นอย่างดี'),
    getSummaryRow(set3Subs, 'q9', 9, 'เจ้าหน้าที่มีกริยา และวาจาสุภาพในการให้บริการ'),
    getSummaryRow(set3Subs, 'q10', 10, 'ท่านได้รับข้อมูลการเจ็บป่วยและการรักษาตรงกับความต้องการ'),
    getSummaryRow(set3Subs, 'q11', 11, 'ท่านได้รับคำแนะนำวิธีการใช้ยาแต่ละชนิดชัดเจนจากเจ้าหน้าที่'),
    getSummaryRow(set3Subs, 'q12', 12, 'ศูนย์ฯ มีสื่อและเอกสารในการให้ความรู้ และข้อมูลเพียงพอกับความต้องการ'),
    getSummaryRow(set3Subs, 'q13', 13, 'ท่านพอใจในค่ายาและค่าบริการของศูนย์ฯ'),
    getSummaryRow(set3Subs, 'q14', 14, 'ถ้าเปรียบเทียบระหว่างบริการที่ได้รับกับค่าใช้จ่าย ท่านคิดว่าคุ้มค่า'),
    getSummaryRow(set3Subs, 'q15', 15, 'สถานที่ให้บริการเป็นสัดส่วน สะดวกต่อการใช้บริการ'),
    getSummaryRow(set3Subs, 'q16', 16, 'อาคารสถานที่ และสิ่งแวดล้อมในการให้บริการมีความปลอดภัย'),
    getSummaryRow(set3Subs, 'q17', 17, 'อาคารสถานที่ภายในและสิ่งแวดล้อมรอบๆบริเวณศูนย์ฯ สะอาดเป็นระเบียบเรียบร้อย'),
    getSummaryRow(set3Subs, 'q18', 18, 'ศูนย์ฯ มีป้ายหรือเครื่องหมายแสดงหน่วยงานหรือทิศทาง ชัดเจน'),
    // Comm items 1-15
    ['-- ส่วนที่ 2: บริการสาธารณสุขในชุมชน 15 ข้อ --'],
    getSummaryRow(set3Subs, 'comm_1', 1, 'การให้ความรู้ด้านสุขภาพในชุมชน'),
    getSummaryRow(set3Subs, 'comm_2', 2, 'การดูแลอาหารให้เหมาะสมกับอายุและสุขภาพ'),
    getSummaryRow(set3Subs, 'comm_3', 3, 'การชั่งน้ำหนัก ส่วนสูง เด็ก 0-5 ปี'),
    getSummaryRow(set3Subs, 'comm_4', 4, 'การดูแลสุขภาพแม่และเด็ก และการวางแผนครอบครัว'),
    getSummaryRow(set3Subs, 'comm_5', 5, 'การให้ภูมิคุ้มกันโรคในชุมชน (ให้วัคซีนในเด็กอายุ 0-5 ปี)'),
    getSummaryRow(set3Subs, 'comm_6', 6, 'ป้องกันและควบคุมโรค (เช่น การฉีดยุงในชุมชน กำจัดลูกน้ำยุงลาย เป็นต้น)'),
    getSummaryRow(set3Subs, 'comm_7', 7, 'การจัดหาน้ำสะอาด และการจัดขยะ'),
    getSummaryRow(set3Subs, 'comm_8', 8, 'การรักษาพยาบาลเบื้องต้นที่บ้าน'),
    getSummaryRow(set3Subs, 'comm_9', 9, 'การจัดหายามาประจำที่ศูนย์สุขภาพชุมชน'),
    getSummaryRow(set3Subs, 'comm_10', 10, 'การดูแลปาก-ฟันในชุมชน'),
    getSummaryRow(set3Subs, 'comm_11', 11, 'การตรวจสุขภาพจิตในชุมชน'),
    getSummaryRow(set3Subs, 'comm_12', 12, 'การป้องกันอุบัติเหตุ อุบัติภัยและโรคไม่ติดต่อ'),
    getSummaryRow(set3Subs, 'comm_13', 13, 'การคุ้มครองผู้บริโภคเกี่ยวกับอาหารและยา'),
    getSummaryRow(set3Subs, 'comm_14', 14, 'การป้องกันโรคเอดส์'),
    getSummaryRow(set3Subs, 'comm_15', 15, 'การป้องกันปัญหาสิ่งแวดล้อม มลภาวะต่าง ๆ ในชุมชน'),
    [],

    // --- สรุป ชุดที่ 4 ---
    ['*** แบบฟอร์มผลสรุป ชุดที่ 4: ผู้รับบริการในศูนย์บริการสาธารณสุข ***'],
    summaryHeaderCols,
    getSummaryRow(set4Subs, 'q1', 1, 'ความรวดเร็วในขั้นตอนการมารับบริการ (ตั้งแต่มาศูนย์ฯ ถึงกลับบ้าน)'),
    getSummaryRow(set4Subs, 'q2', 2, 'ระบบคิวการให้บริการเป็นไปตามลำดับก่อนหลัง'),
    getSummaryRow(set4Subs, 'q3', 3, 'การรับบริการที่ห้องจ่ายยา สะดวกรวดเร็ว'),
    getSummaryRow(set4Subs, 'q4', 4, 'เครื่องมือ อุปกรณ์ทางการแพทย์เพียงพอ สะอาดและพร้อมใช้งาน'),
    getSummaryRow(set4Subs, 'q5', 5, 'เจ้าหน้าที่ของศูนย์ฯ มีความรู้ ความสามารถในการให้บริการ'),
    getSummaryRow(set4Subs, 'q6', 6, 'ความสามารถของแพทย์ในการตรวจรักษา'),
    getSummaryRow(set4Subs, 'q7', 7, 'เจ้าหน้าที่ยิ้มแย้มแจ่มใสในการให้บริการ'),
    getSummaryRow(set4Subs, 'q8', 8, 'เจ้าหน้าที่ให้ความสนใจและเอาใจใส่เป็นอย่างดี'),
    getSummaryRow(set4Subs, 'q9', 9, 'เจ้าหน้าที่มีกริยา และวาจาสุภาพในการให้บริการ'),
    getSummaryRow(set4Subs, 'q10', 10, 'ท่านได้รับข้อมูลการเจ็บป่วยและการรักษาตรงกับความต้องการ'),
    getSummaryRow(set4Subs, 'q11', 11, 'ท่านได้รับคำแนะนำวิธีการใช้ยาแต่ละชนิดชัดเจนจากเจ้าหน้าที่'),
    getSummaryRow(set4Subs, 'q12', 12, 'ศูนย์ฯ มีสื่อและเอกสารในการให้ความรู้ และข้อมูลเพียงพอกับความต้องการ'),
    getSummaryRow(set4Subs, 'q13', 13, 'ท่านพอใจในค่ายาและค่าบริการของศูนย์ฯ'),
    getSummaryRow(set4Subs, 'q14', 14, 'ถ้าเปรียบเทียบระหว่างบริการที่ได้รับกับค่าใช้จ่าย ท่านคิดว่าคุ้มค่า'),
    getSummaryRow(set4Subs, 'q15', 15, 'สถานที่ให้บริการเป็นสัดส่วน สะดวกต่อการใช้บริการ'),
    getSummaryRow(set4Subs, 'q16', 16, 'อาคารสถานที่ และสิ่งแวดล้อมในการให้บริการมีความปลอดภัย'),
    getSummaryRow(set4Subs, 'q17', 17, 'อาคารสถานที่ภายในและสิ่งแวดล้อมรอบๆบริเวณศูนย์ฯ สะอาดเป็นระเบียบเรียบร้อย'),
    getSummaryRow(set4Subs, 'q18', 18, 'ศูนย์ฯ มีป้ายหรือเครื่องหมายแสดงหน่วยงานหรือทิศทาง ชัดเจน'),
  ];

  return {
    sheets: [
      { title: 'ชุดที่ 1 - ผู้ให้บริการ', rows: rowsSet1 },
      { title: 'ชุดที่ 2 - บริการที่บ้าน', rows: rowsSet2 },
      { title: 'ชุดที่ 3 - ประชาชนในพื้นที่', rows: rowsSet3 },
      { title: 'ชุดที่ 4 - ในศูนย์บริการ', rows: rowsSet4 },
      { title: 'ผลสรุปรายงานสถิติ', rows: summaryRows },
    ],
  };
}

export function exportToMultiSheetExcel(
  submissions: SurveySubmissionPayload[],
  filename = 'รายงานสถิติ_ศบส40บางแค.xlsx'
) {
  const wb = XLSX.utils.book_new();
  const workbookData = buildSurveyWorkbookData(submissions);

  workbookData.sheets.forEach((sheet) => {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.title);
  });

  // Trigger download
  XLSX.writeFile(wb, filename);
}
