import React from 'react';
import { FormSetId, SurveySubmissionPayload, CustomQuestionConfig } from '../types/survey';

interface TableRowData {
  no?: number;
  text: string;
  isCategoryHeader?: boolean;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
  isTextItem?: boolean;
  textValue?: string;
  counts: { 5: number; 4: number; 3: number; 2: number; 1: number };
  totalPersons: number;
  scoreWeights: { 5: number; 4: number; 3: number; 2: number; 1: number };
  totalScore: number;
  avgScore: number;
  avgPercent: number;
}

interface ExcelSummaryTableProps {
  formSetId: FormSetId;
  submissions: SurveySubmissionPayload[];
  customConfig?: CustomQuestionConfig;
}

export const ExcelSummaryTable: React.FC<ExcelSummaryTableProps> = ({
  formSetId,
  submissions,
  customConfig,
}) => {
  const filtered = submissions.filter((s) => s.form_set === formSetId);

  // Helper to calculate row stats
  const calcItemStats = (key: string, no: number, text: string): TableRowData => {
    const displayText = customConfig?.questionTexts?.[key] || text;
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    filtered.forEach((sub) => {
      // Check ratings or work_ratings or comm_ratings
      let val: any = undefined;
      if (sub.ratings && sub.ratings[key] !== undefined) val = sub.ratings[key];
      else if (sub.work_ratings && sub.work_ratings[key] !== undefined) val = sub.work_ratings[key];
      else if (sub.comm_ratings && sub.comm_ratings[key] !== undefined) val = sub.comm_ratings[key];

      if (val && counts[val as 1 | 2 | 3 | 4 | 5] !== undefined) {
        counts[val as 1 | 2 | 3 | 4 | 5]++;
      }
    });

    const totalPersons = counts[5] + counts[4] + counts[3] + counts[2] + counts[1];
    const scoreWeights = {
      5: counts[5] * 5,
      4: counts[4] * 4,
      3: counts[3] * 3,
      2: counts[2] * 2,
      1: counts[1] * 1,
    };
    const totalScore = scoreWeights[5] + scoreWeights[4] + scoreWeights[3] + scoreWeights[2] + scoreWeights[1];
    const avgScore = totalPersons > 0 ? Number((totalScore / totalPersons).toFixed(2)) : 0;
    const avgPercent = totalPersons > 0 ? Number(((avgScore / 5) * 100).toFixed(2)) : 0;

    return {
      no,
      text: displayText,
      counts,
      totalPersons,
      scoreWeights,
      totalScore,
      avgScore,
      avgPercent,
    };
  };

  // Helper to calculate category aggregate
  const calcCategoryStats = (title: string, itemRows: TableRowData[]): TableRowData => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalPersons = 0;
    let totalScore = 0;

    itemRows.forEach((r) => {
      counts[5] += r.counts[5];
      counts[4] += r.counts[4];
      counts[3] += r.counts[3];
      counts[2] += r.counts[2];
      counts[1] += r.counts[1];
      totalPersons += r.totalPersons;
      totalScore += r.totalScore;
    });

    const scoreWeights = {
      5: counts[5] * 5,
      4: counts[4] * 4,
      3: counts[3] * 3,
      2: counts[2] * 2,
      1: counts[1] * 1,
    };

    const avgScore = totalPersons > 0 ? Number((totalScore / totalPersons).toFixed(2)) : 0;
    const avgPercent = totalPersons > 0 ? Number(((avgScore / 5) * 100).toFixed(2)) : 0;

    const displayCategory = customConfig?.categoryTitles?.[title] || title;
    return {
      text: displayCategory,
      isCategoryHeader: true,
      counts,
      totalPersons,
      scoreWeights,
      totalScore,
      avgScore,
      avgPercent,
    };
  };

  // Render Table based on set
  return (
    <div className="overflow-x-auto shadow-md rounded-2xl border border-slate-300 bg-white">
      {/* ============================================================== */}
      {/* ตารางสรุป ชุดที่ 1: สำหรับผู้ให้บริการ */}
      {/* ============================================================== */}
      {formSetId === 1 && (
        <Set1Table 
          filtered={filtered} 
          calcItemStats={calcItemStats} 
          calcCategoryStats={calcCategoryStats} 
          customConfig={customConfig}
        />
      )}

      {/* ============================================================== */}
      {/* ตารางสรุป ชุดที่ 2: สำหรับผู้รับบริการที่บ้าน */}
      {/* ============================================================== */}
      {formSetId === 2 && (
        <Set2Table 
          filtered={filtered} 
          calcItemStats={calcItemStats} 
          calcCategoryStats={calcCategoryStats} 
          customConfig={customConfig}
        />
      )}

      {/* ============================================================== */}
      {/* ตารางสรุป ชุดที่ 3: สำหรับประชาชนในพื้นที่บริการ */}
      {/* ============================================================== */}
      {formSetId === 3 && (
        <Set3Table 
          filtered={filtered} 
          calcItemStats={calcItemStats} 
          calcCategoryStats={calcCategoryStats} 
          customConfig={customConfig}
        />
      )}

      {/* ============================================================== */}
      {/* ตารางสรุป ชุดที่ 4: สำหรับผู้รับบริการในศูนย์บริการสาธารณสุข */}
      {/* ============================================================== */}
      {formSetId === 4 && (
        <Set4Table 
          filtered={filtered} 
          calcItemStats={calcItemStats} 
          calcCategoryStats={calcCategoryStats} 
          customConfig={customConfig}
        />
      )}
    </div>
  );
};

// Component helper for Table Head
const ExcelTableHeader = ({ title, subTitle }: { title: string; subTitle: string }) => (
  <thead>
    <tr>
      <th colSpan={15} className="bg-rose-200 text-slate-900 text-center font-bold text-sm py-2 px-3 border border-slate-300">
        <span className="block font-bold">{title}</span>
        <span className="text-xs font-semibold">{subTitle}</span>
      </th>
    </tr>
    <tr className="bg-slate-100 text-slate-800 text-xs text-center border-b border-slate-300 font-semibold">
      <th rowSpan={2} className="p-2 border border-slate-300 min-w-[280px] text-center">
        รายการ
      </th>
      <th colSpan={6} className="p-1 border border-slate-300 bg-emerald-100/70 text-emerald-950 font-bold">
        จำนวนคนที่ตอบแบบสอบถาม
      </th>
      <th colSpan={5} className="p-1 border border-slate-300 bg-sky-100 text-sky-950 font-bold">
        คะแนนความพึงพอใจ
      </th>
      <th rowSpan={2} className="p-1.5 border border-slate-300 bg-yellow-200 text-slate-900 font-bold min-w-[65px]">
        %<br />ร้อยละเฉลี่ย
      </th>
      <th rowSpan={2} className="p-1.5 border border-slate-300 bg-rose-200 text-slate-900 font-bold min-w-[55px]">
        เฉลี่ย
      </th>
    </tr>
    <tr className="bg-slate-50 text-[11px] text-center border-b border-slate-300 font-medium">
      {/* จำนวนคนที่ตอบ */}
      <th className="p-1 border border-slate-300 bg-emerald-50 text-emerald-900 font-bold">มากที่สุด<br />5</th>
      <th className="p-1 border border-slate-300 bg-emerald-50 text-emerald-900 font-bold">มาก<br />4</th>
      <th className="p-1 border border-slate-300 bg-emerald-50 text-emerald-900 font-bold">ปานกลาง<br />3</th>
      <th className="p-1 border border-slate-300 bg-emerald-50 text-emerald-900 font-bold">น้อย<br />2</th>
      <th className="p-1 border border-slate-300 bg-emerald-50 text-emerald-900 font-bold">น้อยที่สุด<br />1</th>
      <th className="p-1 border border-slate-300 bg-emerald-100 text-emerald-950 font-bold">รวม<br />(คน)</th>
      {/* คะแนนความพึงพอใจ */}
      <th className="p-1 border border-slate-300 bg-sky-50 text-sky-900 font-bold">มากที่สุด<br />5</th>
      <th className="p-1 border border-slate-300 bg-sky-50 text-sky-900 font-bold">มาก<br />4</th>
      <th className="p-1 border border-slate-300 bg-sky-50 text-sky-900 font-bold">ปานกลาง<br />3</th>
      <th className="p-1 border border-slate-300 bg-sky-50 text-sky-900 font-bold">น้อย<br />2</th>
      <th className="p-1 border border-slate-300 bg-sky-50 text-sky-900 font-bold">น้อยที่สุด<br />1</th>
    </tr>
  </thead>
);

// Row renderer matching Excel styling
const ExcelRow = ({ data }: { data: TableRowData }) => {
  if (data.isCategoryHeader) {
    return (
      <tr className="bg-yellow-200 font-bold text-xs text-slate-900 border border-slate-300">
        <td className="p-2 border border-slate-300 pl-3">
          {data.text}
        </td>
        <td colSpan={6} className="p-1.5 border border-slate-300 bg-yellow-200 text-center"></td>
        <td colSpan={5} className="p-1.5 border border-slate-300 bg-sky-50/50 text-center"></td>
        <td className="p-1.5 border border-slate-300 bg-yellow-300 text-center text-xs font-bold">
          {data.totalPersons > 0 ? `${data.avgPercent.toFixed(2)}%` : '#DIV/0!'}
        </td>
        <td className="p-1.5 border border-slate-300 bg-rose-200 text-center text-xs font-bold">
          {data.totalPersons > 0 ? data.avgScore.toFixed(2) : '#DIV/0!'}
        </td>
      </tr>
    );
  }

  if (data.isSubtotal) {
    return (
      <tr className="bg-lime-200 font-bold text-xs text-slate-900 border border-slate-300">
        <td className="p-2 border border-slate-300 pl-3">{data.text}</td>
        <td colSpan={6} className="p-1.5 border border-slate-300 bg-lime-100 text-center"></td>
        <td colSpan={5} className="p-1.5 border border-slate-300 bg-lime-50 text-center"></td>
        <td className="p-1.5 border border-slate-300 bg-yellow-300 text-center text-xs font-bold">
          {data.totalPersons > 0 ? `${data.avgPercent.toFixed(2)}%` : '#DIV/0!'}
        </td>
        <td className="p-1.5 border border-slate-300 bg-rose-200 text-center text-xs font-bold">
          {data.totalPersons > 0 ? data.avgScore.toFixed(2) : '#DIV/0!'}
        </td>
      </tr>
    );
  }

  if (data.isGrandTotal) {
    return (
      <tr className="bg-emerald-300 font-bold text-xs text-slate-900 border-2 border-emerald-500">
        <td className="p-2 border border-slate-300 pl-3">{data.text}</td>
        <td colSpan={6} className="p-1.5 border border-slate-300 text-center"></td>
        <td colSpan={5} className="p-1.5 border border-slate-300 text-center"></td>
        <td className="p-1.5 border border-slate-300 bg-yellow-300 text-center text-xs font-bold">
          {data.totalPersons > 0 ? `${data.avgPercent.toFixed(2)}%` : '#DIV/0!'}
        </td>
        <td className="p-1.5 border border-slate-300 bg-rose-200 text-center text-xs font-bold">
          {data.totalPersons > 0 ? data.avgScore.toFixed(2) : '#DIV/0!'}
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50 text-xs border-b border-slate-200">
      <td className="p-2 border border-slate-300 text-slate-800">
        <div className="flex items-start gap-1.5">
          {data.no && <span className="font-bold flex-shrink-0 text-slate-700">{data.no}</span>}
          <span>{data.text}</span>
        </div>
      </td>
      {/* จำนวนคนที่ตอบ */}
      <td className="p-1.5 border border-slate-300 text-center text-slate-700">{data.counts[5]}</td>
      <td className="p-1.5 border border-slate-300 text-center text-slate-700">{data.counts[4]}</td>
      <td className="p-1.5 border border-slate-300 text-center text-slate-700">{data.counts[3]}</td>
      <td className="p-1.5 border border-slate-300 text-center text-slate-700">{data.counts[2]}</td>
      <td className="p-1.5 border border-slate-300 text-center text-slate-700">{data.counts[1]}</td>
      <td className="p-1.5 border border-slate-300 text-center font-bold bg-slate-50 text-slate-800">
        {data.totalPersons}
      </td>
      {/* คะแนนความพึงพอใจ */}
      <td className="p-1.5 border border-slate-300 text-center bg-sky-50/40 text-slate-700">{data.scoreWeights[5]}</td>
      <td className="p-1.5 border border-slate-300 text-center bg-sky-50/40 text-slate-700">{data.scoreWeights[4]}</td>
      <td className="p-1.5 border border-slate-300 text-center bg-sky-50/40 text-slate-700">{data.scoreWeights[3]}</td>
      <td className="p-1.5 border border-slate-300 text-center bg-sky-50/40 text-slate-700">{data.scoreWeights[2]}</td>
      <td className="p-1.5 border border-slate-300 text-center bg-sky-50/40 text-slate-700">{data.scoreWeights[1]}</td>
      {/* % ร้อยละเฉลี่ย & เฉลี่ย */}
      <td className="p-1.5 border border-slate-300 text-center font-bold bg-yellow-100 text-slate-900">
        {data.totalPersons > 0 ? `${data.avgPercent.toFixed(2)}%` : '#DIV/0!'}
      </td>
      <td className="p-1.5 border border-slate-300 text-center font-bold bg-rose-100 text-slate-900">
        {data.totalPersons > 0 ? data.avgScore.toFixed(2) : '#DIV/0!'}
      </td>
    </tr>
  );
};

// ==========================================
// ชุดที่ 1 TABLE COMPONENT
// ==========================================
const Set1Table = ({ filtered, calcItemStats, calcCategoryStats, customConfig }: any) => {
  // Core items
  const cat1 = [
    calcItemStats('s1_q1', 1, 'ความรวดเร็วในขั้นตอนการให้บริการ (ตั้งแต่ผู้ป่วยมารับบริการที่ศูนย์ฯถึงกลับบ้าน)'),
    calcItemStats('s1_q2', 2, 'ระบบคิวการให้บริการเป็นไปตามลำดับก่อนหลัง'),
    calcItemStats('s1_q3', 3, 'การให้บริการที่ห้องจ่ายยา สะดวกรวดเร็ว'),
  ];
  const cat1Header = calcCategoryStats('ความสะดวก รวดเร็ว (เฉลี่ยรวม)', cat1);

  const cat2 = [
    calcItemStats('s1_q4', 4, 'เครื่องมือ อุปกรณ์ทางการแพทย์เพียงพอ สะอาดและพร้อมใช้งาน'),
    calcItemStats('s1_q5', 5, 'เจ้าหน้าที่ของศูนย์ฯ มีความรู้ ความสามารถในการให้บริการ'),
    calcItemStats('s1_q6', 6, 'ความสามารถของแพทย์ในการตรวจรักษา'),
  ];
  const cat2Header = calcCategoryStats('คุณภาพการให้บริการ (เฉลี่ยรวม)', cat2);

  const cat3 = [
    calcItemStats('s1_q7', 7, 'เจ้าหน้าที่ยิ้มแย้มแจ่มใสในการให้บริการ'),
    calcItemStats('s1_q8', 8, 'เจ้าหน้าที่ให้ความสนใจและเอาใจใส่เป็นอย่างดี'),
    calcItemStats('s1_q9', 9, 'เจ้าหน้าที่มีกริยา และวาจาสุภาพในการให้บริการ'),
  ];
  const cat3Header = calcCategoryStats('อัธยาศัยและการเอาใจใส่ (เฉลี่ยรวม)', cat3);

  const cat4 = [
    calcItemStats('s1_q10', 10, 'ผู้ใช้บริการได้รับข้อมูลการเจ็บป่วยและการรักษาตรงกับความต้องการ'),
    calcItemStats('s1_q11', 11, 'ผู้ใช้บริการได้รับคำแนะนำวิธีการใช้ยาแต่ละชนิดชัดเจนจากเจ้าหน้าที่'),
    calcItemStats('s1_q12', 12, 'ศูนย์ฯ มีสื่อและเอกสารในการให้ความรู้ และข้อมูลเพียงพอกับความต้องการ'),
  ];
  const cat4Header = calcCategoryStats('การให้ข้อมูล/คำแนะนำด้านสุขภาพและบริการ (เฉลี่ยรวม)', cat4);

  const cat5 = [
    calcItemStats('s1_q13', 13, 'ค่ายาและค่าบริการของศูนย์ฯ เหมาะสม'),
    calcItemStats('s1_q14', 14, 'ถ้าเปรียบเทียบระหว่างบริการที่ได้รับกับค่าใช้จ่าย ท่านคิดว่าคุ้มค่า'),
  ];
  const cat5Header = calcCategoryStats('ค่ายา/ค่าบริการ (เฉลี่ยรวม)', cat5);

  const cat6 = [
    calcItemStats('s1_q15', 15, 'สถานที่ให้บริการเป็นสัดส่วน สะดวกต่อการใช้บริการ'),
    calcItemStats('s1_q16', 16, 'อาคารสถานที่ และสิ่งแวดล้อมในการให้บริการมีความปลอดภัย'),
    calcItemStats('s1_q17', 17, 'อาคารสถานที่ภายในและสิ่งแวดล้อมรอบ ๆ บริเวณศูนย์ฯ สะอาด เป็นระเบียบเรียบร้อย'),
    calcItemStats('s1_q18', 18, 'ศูนย์ฯ มีป้ายหรือเครื่องหมายแสดงหน่วยงานหรือทิศทาง ชัดเจน'),
  ];
  const cat6Header = calcCategoryStats('อาคารสถานที่และสิ่งอำนวยความสะดวก (เฉลี่ยรวม)', cat6);

  const allPart1 = [...cat1, ...cat2, ...cat3, ...cat4, ...cat5, ...cat6];
  const part1Total = calcCategoryStats('รวม (ส่วนที่ 1 บริการที่ให้)', allPart1);

  // Work satisfaction items (1-14)
  const workItems = [
    calcItemStats('work_1', 1, 'ความสำเร็จที่ได้รับจากการทำงาน'),
    calcItemStats('work_2', 2, 'การได้รับการยอมรับจากผู้ร่วมงานในการปฏิบัติงาน'),
    calcItemStats('work_3', 3, 'ลักษณะงานที่ปฏิบัติ'),
    calcItemStats('work_4', 4, 'สามารถตัดสินใจเกี่ยวกับการปฏิบัติงานด้วยตนเอง'),
    calcItemStats('work_5', 5, 'การได้รับการพัฒนาความรู้ และทักษะใหม่ ๆ ในการปฏิบัติงาน'),
    calcItemStats('work_6', 6, 'ค่าตอบแทนและสวัสดิการที่ได้รับ'),
    calcItemStats('work_7', 7, 'การบริหารจัดการของหน่วยงาน'),
    calcItemStats('work_8', 8, 'ความยุติธรรมที่ได้รับจากผู้บังคับบัญชา'),
    calcItemStats('work_9', 9, 'ความมั่นคงในหน้าที่การงาน'),
    calcItemStats('work_10', 10, 'ความสัมพันธ์ระหว่างเพื่อนร่วมงาน'),
    calcItemStats('work_11', 11, 'สภาพแวดล้อมทางกายภาพของสถานที่ทำงาน'),
    calcItemStats('work_12', 12, 'โอกาส ความก้าวหน้าในหน้าที่การงาน'),
    calcItemStats('work_13', 13, 'ตำแหน่งหน้าที่เป็นที่ยอมรับของสังคม'),
    calcItemStats('work_14', 14, 'งานที่ทำมีผลต่อการดำเนินชีวิต'),
  ];
  const workHeader = calcCategoryStats('ความพึงพอใจในการทำงาน (เฉลี่ยรวม)', workItems);
  const part2Total = calcCategoryStats('รวม (ส่วนที่ 2 การทำงาน)', workItems);

  // Grand total Set 1
  const grandTotal = calcCategoryStats('รวมชุดที่ 1', [...allPart1, ...workItems]);

  return (
    <table className="w-full border-collapse">
      <ExcelTableHeader
        title="ชุดที่ 1"
        subTitle={customConfig?.officialTitles?.[1] || "ความพึงพอใจในบริการที่ให้ของศูนย์บริการสาธารณสุข สำนักอนามัย: สำหรับผู้ให้บริการ"}
      />
      <tbody>
        <ExcelRow data={cat1Header} />
        {cat1.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat2Header} />
        {cat2.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat3Header} />
        {cat3.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat4Header} />
        {cat4.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat5Header} />
        {cat5.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat6Header} />
        {cat6.map((r) => <ExcelRow key={r.no} data={r} />)}

        <tr className="bg-slate-50 text-xs border border-slate-300">
          <td colSpan={15} className="p-2 font-semibold text-slate-700 pl-3">
            19. ข้อเสนอแนะอื่นๆ: (ดูรายละเอียดในหมวดข้อคิดเห็น)
          </td>
        </tr>

        <ExcelRow data={{ ...part1Total, isSubtotal: true }} />

        {/* ส่วนที่ 2: ความพึงพอใจในการทำงาน */}
        <ExcelRow data={workHeader} />
        {workItems.map((r) => <ExcelRow key={r.no} data={r} />)}

        <tr className="bg-slate-50 text-xs border border-slate-300">
          <td colSpan={15} className="p-2 text-rose-700 font-semibold pl-3">
            15. ความต้องการการช่วยเหลือสนับสนุนในการให้บริการ (ตอบแบบสั้น): (ดูรายละเอียดในหมวดข้อคิดเห็น)
          </td>
        </tr>
        <tr className="bg-slate-50 text-xs border border-slate-300">
          <td colSpan={15} className="p-2 text-slate-700 font-semibold pl-3">
            16. ข้อเสนอแนะ: (ดูรายละเอียดในหมวดข้อคิดเห็น)
          </td>
        </tr>

        <ExcelRow data={{ ...part2Total, isSubtotal: true }} />
        <ExcelRow data={{ ...grandTotal, isGrandTotal: true }} />
      </tbody>
    </table>
  );
};

// ==========================================
// ชุดที่ 2 TABLE COMPONENT: สำหรับผู้รับบริการที่บ้าน
// ==========================================
const Set2Table = ({ filtered, calcItemStats, calcCategoryStats, customConfig }: any) => {
  const cat1 = [
    calcItemStats('h1', 1, 'ท่านได้รับความสะดวกในการรับบริการที่บ้าน'),
    calcItemStats('h2', 2, 'ท่านได้รับบริการที่บ้านตรงตามความต้องการ'),
    calcItemStats('h3', 3, 'ท่านพอใจในการติดต่อประสานงานการส่งต่อผู้ป่วยเพื่อมารับบริการที่บ้าน'),
  ];
  const cat1Header = calcCategoryStats('ความสะดวก รวดเร็ว (เฉลี่ยรวม)', cat1);

  const cat2 = [
    calcItemStats('h4', 4, 'เครื่องมือ อุปกรณ์ในการบริการที่บ้านมีความเพียงพอ สะอาดและพร้อมใช้งาน'),
    calcItemStats('h5', 5, 'เจ้าหน้าที่ของศูนย์ฯ มีความรู้ ความสามารถในการให้บริการ'),
  ];
  const cat2Header = calcCategoryStats('คุณภาพการให้บริการ (เฉลี่ยรวม)', cat2);

  const cat3 = [
    calcItemStats('h6', 6, 'เจ้าหน้าที่ยิ้มแย้มแจ่มใสในการให้บริการ'),
    calcItemStats('h7', 7, 'เจ้าหน้าที่ให้ความสนใจและเอาใจใส่เป็นอย่างดี'),
    calcItemStats('h8', 8, 'เจ้าหน้าที่มีกริยา และวาจาสุภาพในการให้บริการ'),
  ];
  const cat3Header = calcCategoryStats('อัธยาศัยและการเอาใจใส่ (เฉลี่ยรวม)', cat3);

  const cat4 = [
    calcItemStats('h9', 9, 'ท่านได้รับข้อมูลการเจ็บป่วยและการรักษาตรงกับความต้องการ'),
    calcItemStats('h10', 10, 'ท่านได้รับคำแนะนำวิธีการดูแลผู้ป่วย/การปฏิบัติตัว ที่ชัดเจนจากเจ้าหน้าที่'),
    calcItemStats('h11', 11, 'ศูนย์ฯ มีสื่อและเอกสารในการให้ความรู้ และข้อมูลเพียงพอกับความต้องการ'),
  ];
  const cat4Header = calcCategoryStats('การให้ข้อมูล/คำแนะนำด้านสุขภาพและบริการ (เฉลี่ยรวม)', cat4);

  const cat5 = [
    calcItemStats('h12', 12, 'ท่านพอใจต่อบริการในการดูแลผู้ป่วยที่บ้านของศูนย์ฯ (ถ้าต้องเสียค่าบริการ ก็ยังคงใช้บริการ)'),
  ];
  const cat5Header = calcCategoryStats('ค่ายา/ค่าบริการ (เฉลี่ยรวม)', cat5);

  const allItems = [...cat1, ...cat2, ...cat3, ...cat4, ...cat5];
  const grandTotal = calcCategoryStats('รวมชุดที่ 2', allItems);

  return (
    <table className="w-full border-collapse">
      <ExcelTableHeader
        title="ชุดที่ 2"
        subTitle={customConfig?.officialTitles?.[2] || "ความพึงพอใจในการให้บริการที่ให้ของศูนย์บริการสาธารณสุข สำนักอนามัย: สำหรับผู้รับบริการที่บ้าน"}
      />
      <tbody>
        <ExcelRow data={cat1Header} />
        {cat1.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat2Header} />
        {cat2.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat3Header} />
        {cat3.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat4Header} />
        {cat4.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat5Header} />
        {cat5.map((r) => <ExcelRow key={r.no} data={r} />)}

        <tr className="bg-slate-50 text-xs border border-slate-300">
          <td colSpan={15} className="p-2 text-rose-700 font-semibold pl-3">
            13. ข้อเสนอแนะอื่นๆ: (ดูรายละเอียดในหมวดข้อคิดเห็น)
          </td>
        </tr>

        <ExcelRow data={{ ...grandTotal, isGrandTotal: true }} />
      </tbody>
    </table>
  );
};

// ==========================================
// ชุดที่ 3 TABLE COMPONENT: สำหรับประชาชนในพื้นที่บริการ
// ==========================================
const Set3Table = ({ filtered, calcItemStats, calcCategoryStats, customConfig }: any) => {
  const cat1 = [
    calcItemStats('q1', 1, 'ความรวดเร็วในขั้นตอนการมารับบริการ (ตั้งแต่มาศูนย์ฯ ถึงกลับบ้าน)'),
    calcItemStats('q2', 2, 'ระบบคิวการให้บริการเป็นไปตามลำดับก่อนหลัง'),
    calcItemStats('q3', 3, 'การรับบริการที่ห้องจ่ายยา สะดวกรวดเร็ว'),
  ];
  const cat1Header = calcCategoryStats('ความสะดวก รวดเร็ว (เฉลี่ยรวม)', cat1);

  const cat2 = [
    calcItemStats('q4', 4, 'เครื่องมือ อุปกรณ์ทางการแพทย์เพียงพอ สะอาดและพร้อมใช้งาน'),
    calcItemStats('q5', 5, 'เจ้าหน้าที่ของศูนย์ฯ มีความรู้ ความสามารถในการให้บริการ'),
    calcItemStats('q6', 6, 'ความสามารถของแพทย์ในการตรวจรักษา'),
  ];
  const cat2Header = calcCategoryStats('คุณภาพการให้บริการ (เฉลี่ยรวม)', cat2);

  const cat3 = [
    calcItemStats('q7', 7, 'เจ้าหน้าที่ยิ้มแย้มแจ่มใสในการให้บริการ'),
    calcItemStats('q8', 8, 'เจ้าหน้าที่ให้ความสนใจและเอาใจใส่เป็นอย่างดี'),
    calcItemStats('q9', 9, 'เจ้าหน้าที่มีกริยา และวาจาสุภาพในการให้บริการ'),
  ];
  const cat3Header = calcCategoryStats('อัธยาศัยและการเอาใจใส่ (เฉลี่ยรวม)', cat3);

  const cat4 = [
    calcItemStats('q10', 10, 'ท่านได้รับข้อมูลการเจ็บป่วยและการรักษาตรงกับความต้องการ'),
    calcItemStats('q11', 11, 'ท่านได้รับคำแนะนำวิธีการใช้ยาแต่ละชนิดชัดเจนจากเจ้าหน้าที่'),
    calcItemStats('q12', 12, 'ศูนย์ฯ มีสื่อและเอกสารในการให้ความรู้ และข้อมูลเพียงพอกับความต้องการ'),
  ];
  const cat4Header = calcCategoryStats('การให้ข้อมูล/คำแนะนำด้านสุขภาพและบริการ (เฉลี่ยรวม)', cat4);

  const cat5 = [
    calcItemStats('q13', 13, 'ท่านพอใจในค่ายาและค่าบริการของศูนย์ฯ'),
    calcItemStats('q14', 14, 'ถ้าเปรียบเทียบระหว่างบริการที่ได้รับกับค่าใช้จ่าย ท่านคิดว่าคุ้มค่า'),
  ];
  const cat5Header = calcCategoryStats('ค่ายา/ค่าบริการ (เฉลี่ยรวม)', cat5);

  const cat6 = [
    calcItemStats('q15', 15, 'สถานที่ให้บริการเป็นสัดส่วน สะดวกต่อการใช้บริการ'),
    calcItemStats('q16', 16, 'อาคารสถานที่ และสิ่งแวดล้อมในการให้บริการมีความปลอดภัย'),
    calcItemStats('q17', 17, 'อาคารสถานที่ภายในและสิ่งแวดล้อมรอบๆ บริเวณศูนย์ฯ สะอาด เป็นระเบียบเรียบร้อย'),
    calcItemStats('q18', 18, 'ศูนย์ฯ มีป้ายหรือเครื่องหมายแสดงหน่วยงานหรือทิศทาง ชัดเจน'),
  ];
  const cat6Header = calcCategoryStats('อาคารสถานที่และสิ่งอำนวยความสะดวก (เฉลี่ยรวม)', cat6);

  const part1Items = [...cat1, ...cat2, ...cat3, ...cat4, ...cat5, ...cat6];
  const part1Total = calcCategoryStats('รวม (ส่วนที่ 1 บริการที่ศูนย์ฯ)', part1Items);

  // บริการสาธารณสุขในชุมชน 15 ข้อ
  const commItems = [
    calcItemStats('comm_1', 1, 'การให้ความรู้ด้านสุขภาพในชุมชน'),
    calcItemStats('comm_2', 2, 'การดูแลอาหารให้เหมาะสมกับอายุและสุขภาพ'),
    calcItemStats('comm_3', 3, 'การชั่งน้ำหนัก ส่วนสูง เด็ก 0-5 ปี'),
    calcItemStats('comm_4', 4, 'การดูแลสุขภาพแม่และเด็ก และการวางแผนครอบครัว'),
    calcItemStats('comm_5', 5, 'การให้ภูมิคุ้มกันโรคในชุมชน (ให้วัคซีนในเด็กอายุ 0-5 ปี)'),
    calcItemStats('comm_6', 6, 'ป้องกันและควบคุมโรค (เช่น การฉีดยุงในชุมชน กำจัดลูกน้ำยุงลาย เป็นต้น)'),
    calcItemStats('comm_7', 7, 'การจัดหาน้ำสะอาด และการจัดขยะ'),
    calcItemStats('comm_8', 8, 'การรักษาพยาบาลเบื้องต้นที่บ้าน'),
    calcItemStats('comm_9', 9, 'การจัดหายามาประจำที่ศูนย์สุขภาพชุมชน'),
    calcItemStats('comm_10', 10, 'การดูแลปาก-ฟันในชุมชน'),
    calcItemStats('comm_11', 11, 'การตรวจสุขภาพจิตในชุมชน'),
    calcItemStats('comm_12', 12, 'การป้องกันอุบัติเหตุ อุบัติภัยและโรคไม่ติดต่อ'),
    calcItemStats('comm_13', 13, 'การคุ้มครองผู้บริโภคเกี่ยวกับอาหารและยา'),
    calcItemStats('comm_14', 14, 'การป้องกันโรคเอดส์'),
    calcItemStats('comm_15', 15, 'การป้องกันปัญหาสิ่งแวดล้อม มลภาวะต่าง ๆ ในชุมชน'),
  ];
  const commHeader = calcCategoryStats('ความพึงพอใจในบริการสาธารณสุขที่ได้รับในชุมชน (เฉลี่ยรวม)', commItems);
  const part2Total = calcCategoryStats('รวม (ส่วนที่ 2 บริการชุมชน)', commItems);

  const grandTotal = calcCategoryStats('รวมชุดที่ 3', [...part1Items, ...commItems]);

  return (
    <table className="w-full border-collapse">
      <ExcelTableHeader
        title="ชุดที่ 3"
        subTitle={customConfig?.officialTitles?.[3] || "ความพึงพอใจในบริการที่ให้ของศูนย์บริการสาธารณสุข สำนักอนามัย: สำหรับประชาชนในพื้นที่บริการ"}
      />
      <tbody>
        <ExcelRow data={cat1Header} />
        {cat1.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat2Header} />
        {cat2.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat3Header} />
        {cat3.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat4Header} />
        {cat4.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat5Header} />
        {cat5.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat6Header} />
        {cat6.map((r) => <ExcelRow key={r.no} data={r} />)}

        <tr className="bg-slate-50 text-xs border border-slate-300">
          <td colSpan={15} className="p-2 text-rose-700 font-semibold pl-3">
            19. ข้อเสนอแนะ อื่นๆ: (ดูรายละเอียดในหมวดข้อคิดเห็น)
          </td>
        </tr>

        <ExcelRow data={{ ...part1Total, isSubtotal: true }} />

        {/* ส่วนที่ 2: บริการสาธารณสุขในชุมชน */}
        <tr className="bg-rose-50 text-xs border border-rose-300 text-rose-700 font-bold">
          <td colSpan={15} className="p-2 pl-3">
            ** กรณี : ผู้ตอบแบบสอบถามไม่เคยรับบริการจาก ศบส. ไม่ต้องลงคะแนน **
          </td>
        </tr>
        <ExcelRow data={commHeader} />
        {commItems.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={{ ...part2Total, isSubtotal: true }} />
        <ExcelRow data={{ ...grandTotal, isGrandTotal: true }} />

        <tr className="bg-slate-50 text-xs border border-slate-300 text-rose-700">
          <td colSpan={15} className="p-2 pl-3 font-semibold">
            ** กรณี : ผู้ตอบแบบสอบถามไม่เคยรับบริการจาก ศบส. (คำตอบแบบสั้นข้อ 16-17)
            <br />
            16. ปัญหาอุปสรรคของท่านเมื่อมารับบริการที่ศูนย์บริการสาธารณสุข
            <br />
            17. ข้อเสนอแนะ อื่นๆ
            <br />
            <span className="text-slate-500 font-normal">
              **หมายเหตุ; จำนวนคนที่ตอบแบบสอบถามหมายถึงคนที่เคยใช้บริการศูนย์บริการสาธารณสุข
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

// ==========================================
// ชุดที่ 4 TABLE COMPONENT: สำหรับผู้รับบริการในศูนย์บริการสาธารณสุข
// ==========================================
const Set4Table = ({ filtered, calcItemStats, calcCategoryStats, customConfig }: any) => {
  const cat1 = [
    calcItemStats('q1', 1, 'ความรวดเร็วในขั้นตอนการมารับบริการ (ตั้งแต่มาศูนย์ฯ ถึงกลับบ้าน)'),
    calcItemStats('q2', 2, 'ระบบคิวการให้บริการเป็นไปตามลำดับก่อนหลัง'),
    calcItemStats('q3', 3, 'การรับบริการที่ห้องจ่ายยา สะดวกรวดเร็ว'),
  ];
  const cat1Header = calcCategoryStats('ความสะดวก รวดเร็ว (เฉลี่ยรวม)', cat1);

  const cat2 = [
    calcItemStats('q4', 4, 'เครื่องมือ อุปกรณ์ทางการแพทย์เพียงพอ สะอาดและพร้อมใช้งาน'),
    calcItemStats('q5', 5, 'เจ้าหน้าที่ของศูนย์ฯ มีความรู้ ความสามารถในการให้บริการ'),
    calcItemStats('q6', 6, 'ความสามารถของแพทย์ในการตรวจรักษา'),
  ];
  const cat2Header = calcCategoryStats('คุณภาพการให้บริการ (เฉลี่ยรวม)', cat2);

  const cat3 = [
    calcItemStats('q7', 7, 'เจ้าหน้าที่ยิ้มแย้มแจ่มใสในการให้บริการ'),
    calcItemStats('q8', 8, 'เจ้าหน้าที่ให้ความสนใจและเอาใจใส่เป็นอย่างดี'),
    calcItemStats('q9', 9, 'เจ้าหน้าที่มีกริยา และวาจาสุภาพในการให้บริการ'),
  ];
  const cat3Header = calcCategoryStats('อัธยาศัยและการเอาใจใส่ (เฉลี่ยรวม)', cat3);

  const cat4 = [
    calcItemStats('q10', 10, 'ท่านได้รับข้อมูลการเจ็บป่วยและการรักษาตรงกับความต้องการ'),
    calcItemStats('q11', 11, 'ท่านได้รับคำแนะนำวิธีการใช้ยาแต่ละชนิดชัดเจนจากเจ้าหน้าที่'),
    calcItemStats('q12', 12, 'ศูนย์ฯ มีสื่อและเอกสารในการให้ความรู้ และข้อมูลเพียงพอกับความต้องการ'),
  ];
  const cat4Header = calcCategoryStats('การให้ข้อมูล/คำแนะนำด้านสุขภาพและบริการ (เฉลี่ยรวม)', cat4);

  const cat5 = [
    calcItemStats('q13', 13, 'ท่านพอใจในค่ายาและค่าบริการของศูนย์ฯ'),
    calcItemStats('q14', 14, 'ถ้าเปรียบเทียบระหว่างบริการที่ได้รับกับค่าใช้จ่าย ท่านคิดว่าคุ้มค่า'),
  ];
  const cat5Header = calcCategoryStats('ค่ายา/ค่าบริการ (เฉลี่ยรวม)', cat5);

  const cat6 = [
    calcItemStats('q15', 15, 'สถานที่ให้บริการเป็นสัดส่วน สะดวกต่อการใช้บริการ'),
    calcItemStats('q16', 16, 'อาคารสถานที่ และสิ่งแวดล้อมในการให้บริการมีความปลอดภัย'),
    calcItemStats('q17', 17, 'อาคารสถานที่ภายในและสิ่งแวดล้อมรอบ ๆ บริเวณศูนย์ฯ สะอาด เป็นระเบียบเรียบร้อย'),
    calcItemStats('q18', 18, 'ศูนย์ฯ มีป้ายหรือเครื่องหมายแสดงหน่วยงานหรือทิศทาง ชัดเจน'),
  ];
  const cat6Header = calcCategoryStats('อาคารสถานที่และสิ่งอำนวยความสะดวก (เฉลี่ยรวม)', cat6);

  const allItems = [...cat1, ...cat2, ...cat3, ...cat4, ...cat5, ...cat6];
  const grandTotal = calcCategoryStats('รวมชุดที่ 4', allItems);

  return (
    <table className="w-full border-collapse">
      <ExcelTableHeader
        title="ชุดที่ 4"
        subTitle={customConfig?.officialTitles?.[4] || "ความพึงพอใจในบริการที่ให้ของศูนย์บริการสาธารณสุข สำนักอนามัย: ผู้รับบริการในศูนย์บริการสาธารณสุข"}
      />
      <tbody>
        <ExcelRow data={cat1Header} />
        {cat1.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat2Header} />
        {cat2.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat3Header} />
        {cat3.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat4Header} />
        {cat4.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat5Header} />
        {cat5.map((r) => <ExcelRow key={r.no} data={r} />)}

        <ExcelRow data={cat6Header} />
        {cat6.map((r) => <ExcelRow key={r.no} data={r} />)}

        <tr className="bg-slate-50 text-xs border border-slate-300">
          <td colSpan={15} className="p-2 text-rose-700 font-semibold pl-3">
            19. ข้อเสนอแนะอื่นๆ: (ดูรายละเอียดในหมวดข้อคิดเห็น)
          </td>
        </tr>

        <ExcelRow data={{ ...grandTotal, isGrandTotal: true }} />
      </tbody>
    </table>
  );
};
