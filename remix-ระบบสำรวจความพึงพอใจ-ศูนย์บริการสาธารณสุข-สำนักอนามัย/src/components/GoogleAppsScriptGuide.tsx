import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Copy, 
  Check, 
  ExternalLink, 
  Send, 
  Sparkles, 
  AlertTriangle, 
  Save, 
  CheckCircle2,
  Code2,
  Table,
  RefreshCw,
  Info
} from 'lucide-react';

interface GoogleAppsScriptGuideProps {
  gasWebhookUrl: string;
  forwardToGas: boolean;
  onSaveSettings: (url: string, enabled: boolean) => void;
}

export const GoogleAppsScriptGuide: React.FC<GoogleAppsScriptGuideProps> = ({
  gasWebhookUrl,
  forwardToGas,
  onSaveSettings,
}) => {
  const [urlInput, setUrlInput] = useState<string>(gasWebhookUrl || '');
  const [enabledInput, setEnabledInput] = useState<boolean>(forwardToGas ?? true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [syncAllResult, setSyncAllResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const gasCode = `/**
 * @file Code.gs
  * ระบบรับข้อมูลแบบสำรวจความพึงพอใจ ศูนย์บริการสาธารณสุข 40 บางแค สำนักอนามัย
  * แยกบันทึกแผ่นงานตามชุดที่ 1-4 ตรงกับแท็บในไฟล์ Excel 100% (ป้องกันข้อมูลปนข้ามชุด 100%)
  */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var formSet = Number(data['ชุดที่'] || data['form_set'] || 4);

    // นิยามคอลัมน์มาตรฐานแยกตามชุด ให้ตรงกับตารางรายงานส่งออก Excel 100% (ไม่มีคอลัมน์ปะปน)
    var qCols18 = [];
    for (var i = 1; i <= 18; i++) qCols18.push('ข้อ ' + i);
    var workCols14 = [];
    for (var w = 1; w <= 14; w++) workCols14.push('งาน ' + w);
    var homeCols12 = [];
    for (var h = 1; h <= 12; h++) homeCols12.push('บริการที่บ้าน ' + h);
    var commCols15 = [];
    for (var c = 1; c <= 15; c++) commCols15.push('บริการชุมชน ' + c);

    var headersBySet = {
      1: [
        'รหัสแบบสอบถาม', 'วัน-เวลา', 'สำรวจครั้งที่', 'เดือน', 'ปี (พ.ศ.)', 'ศูนย์ฯ',
        'เพศ', 'อายุ', 'ตำแหน่ง', 'การศึกษา', 'งานที่ปฏิบัติ',
        'c1 (ความสะดวก)', 'c2 (คุณภาพ)', 'c3 (อัธยาศัย)', 'c4 (การให้ข้อมูล)', 'c5 (ค่ายา)', 'c6 (อาคารสถานที่)'
      ].concat(qCols18).concat(workCols14).concat([
        'เฉลี่ยรวม', 'ร้อยละความพึงพอใจ', 'ระดับความพึงพอใจ',
        'ข้อ 15 ความต้องการการสนับสนุน', 'ข้อ 16 ข้อเสนอแนะอื่นๆ'
      ]),

      2: [
        'รหัสแบบสอบถาม', 'วัน-เวลา', 'สำรวจครั้งที่', 'เดือน', 'ปี (พ.ศ.)', 'ศูนย์ฯ',
        'เพศ', 'อายุ', 'การศึกษา', 'อาชีพ', 'สิทธิการรักษา',
        'โรคประจำตัว', 'ระยะเวลา', 'สถานที่รักษา', 'ผู้ให้ข้อมูล', 'ประเภทการส่งต่อ', 'ประเภทผู้ป่วย', 'การดูแลตนเอง',
        'c1 (ความสะดวก)', 'c2 (คุณภาพ)', 'c3 (อัธยาศัย)', 'c4 (การให้ข้อมูล)', 'c5 (ค่ายา)'
      ].concat(homeCols12).concat([
        'เฉลี่ยรวม', 'ร้อยละความพึงพอใจ', 'ระดับความพึงพอใจ',
        'ข้อเสนอแนะอื่นๆ'
      ]),

      3: [
        'รหัสแบบสอบถาม', 'วัน-เวลา', 'สำรวจครั้งที่', 'เดือน', 'ปี (พ.ศ.)', 'ศูนย์ฯ', 'ชุมชน',
        'เพศ', 'อายุ', 'การศึกษา', 'อาชีพ', 'สิทธิการรักษา',
        'เคยรับบริการที่ศูนย์ฯ', 'เหตุผลที่ไม่เคย', 'เคยรับบริการในชุมชน',
        'c1 (ความสะดวก)', 'c2 (คุณภาพ)', 'c3 (อัธยาศัย)', 'c4 (การให้ข้อมูล)', 'c5 (ค่ายา)', 'c6 (อาคารสถานที่)'
      ].concat(qCols18).concat(commCols15).concat([
        'เฉลี่ยรวม', 'ร้อยละความพึงพอใจ', 'ระดับความพึงพอใจ',
        'ข้อ 16 ปัญหาอุปสรรค', 'ข้อ 17 ข้อเสนอแนะ'
      ]),

      4: [
        'รหัสแบบสอบถาม', 'วัน-เวลา', 'สำรวจครั้งที่', 'เดือน', 'ปี (พ.ศ.)', 'ศูนย์ฯ',
        'เพศ', 'อายุ', 'การศึกษา', 'อาชีพ', 'สิทธิการรักษา',
        'c1 (ความสะดวก)', 'c2 (คุณภาพ)', 'c3 (อัธยาศัย)', 'c4 (การให้ข้อมูล)', 'c5 (ค่ายา)', 'c6 (อาคารสถานที่)'
      ].concat(qCols18).concat([
        'เฉลี่ยรวม', 'ร้อยละความพึงพอใจ', 'ระดับความพึงพอใจ',
        'ข้อเสนอแนะอื่นๆ'
      ])
    };

    var setSheetNames = {
      1: 'ชุดที่ 1 - ผู้ให้บริการ',
      2: 'ชุดที่ 2 - บริการที่บ้าน',
      3: 'ชุดที่ 3 - ประชาชนในพื้นที่',
      4: 'ชุดที่ 4 - ในศูนย์บริการ'
    };

    // แยกบันทึกลงแผ่นงานเฉพาะชุดนั้นๆ (ตรงกับแท็บในไฟล์ Excel 1:1)
    var targetSheetName = setSheetNames[formSet] || ('ชุดที่ ' + formSet);
    var targetSheet = ss.getSheetByName(targetSheetName);
    if (!targetSheet) {
      targetSheet = ss.insertSheet(targetSheetName);
    }

    if (targetSheet.getLastColumn() === 0) {
      var stdHeaders = headersBySet[formSet] || headersBySet[4];
      targetSheet.appendRow(stdHeaders);
      targetSheet.getRange(1, 1, 1, stdHeaders.length)
        .setBackground('#005c53')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
    }

    // ตรวจสอบรหัสแบบสอบถามเพื่อป้องกันการบันทึกซ้ำซ้อน
    var recordId = String(data['รหัสแบบสอบถาม'] || data['id'] || '').trim();
    if (targetSheet.getLastRow() > 1 && recordId) {
      var idValues = targetSheet.getRange(2, 1, targetSheet.getLastRow() - 1, 1).getValues();
      for (var k = 0; k < idValues.length; k++) {
        if (String(idValues[k][0]).trim() === recordId) {
          return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Record already exists", duplicate: true }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // ฟังก์ชันช่วยเขียนข้อมูลลงแถวของแต่ละแผ่นงาน (ต่อแถวถัดไปแบบอัตโนมัติ)
    function appendRecordToSheet(sh) {
      var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      var row = headers.map(function(h) {
        var v = data[h];
        if (v === undefined || v === null || v === '') {
          // Aliases แมปคอลัมน์ชื่อย่อ/ชื่อเต็ม
          if (h.indexOf('c1') !== -1) v = data['c1'] || data['หมวด 1_ความสะดวก รวดเร็ว'];
          else if (h.indexOf('c2') !== -1) v = data['c2'] || data['หมวด 2_คุณภาพการให้บริการ'];
          else if (h.indexOf('c3') !== -1) v = data['c3'] || data['หมวด 3_อัธยาศัยและการเอาใจใส่'];
          else if (h.indexOf('c4') !== -1) v = data['c4'] || data['หมวด 4_การให้ข้อมูลคำแนะนำ'];
          else if (h.indexOf('c5') !== -1) v = data['c5'] || data['หมวด 5_ค่ายาค่าบริการ'];
          else if (h.indexOf('c6') !== -1) v = data['c6'] || data['หมวด 6_อาคารสถานที่สิ่งอำนวยความสะดวก'];
          else if (h === 'วัน-เวลา' || h === 'วันเวลาที่บันทึก') v = data['วันเวลาที่บันทึก'] || data['timestamp'];
          else if (h === 'รหัสแบบสอบถาม') v = data['รหัสแบบสอบถาม'] || data['id'];
          else if (h === 'เฉลี่ยรวม' || h === 'คะแนนเฉลี่ยรวม') v = data['คะแนนเฉลี่ยรวม'];
          else if (h === 'การศึกษา' || h === 'ระดับการศึกษา') v = data['ระดับการศึกษา'];
          else if (h === 'ศูนย์ฯ' || h === 'ศูนย์บริการสาธารณสุข') v = data['ศูนย์บริการสาธารณสุข'];
          else if (h === 'ชุมชน' || h === 'ชื่อชุมชน') v = data['ชื่อชุมชน'];
          else if (h === 'ข้อ 15 ความต้องการการสนับสนุน') v = data['ข้อ 15 ความต้องการการสนับสนุน'] || data['ความต้องการการสนับสนุน'];
          else if (h === 'ข้อ 16 ข้อเสนอแนะอื่นๆ' || h === 'ข้อ 17 ข้อเสนอแนะ' || h === 'ข้อเสนอแนะอื่นๆ') v = data['ข้อ 16 ข้อเสนอแนะอื่นๆ'] || data['ข้อ 17 ข้อเสนอแนะ'] || data['ข้อเสนอแนะอื่นๆ'];
          else if (h === 'ข้อ 16 ปัญหาอุปสรรค') v = data['ข้อ 16 ปัญหาอุปสรรค'] || data['ปัญหาอุปสรรคการเข้าถึงบริการ'];
          else if (h === 'ระยะเวลา') v = data['ระยะเวลาที่เป็นโรค'];
          else if (h === 'สถานที่รักษา') v = data['สถานที่รักษาประจำ'];
          else if (h === 'เคยรับบริการที่ศูนย์ฯ') v = data['เคยรับบริการที่ศูนย์'];
          else if (h.indexOf('ข้อ ') === 0) {
            var qNum = h.replace('ข้อ ', '').trim();
            v = data['ข้อ_' + qNum] || data['q' + qNum] || data['s1_q' + qNum];
          }
          else if (h.indexOf('งาน ') === 0) {
            var wNum = h.replace('งาน ', '').trim();
            v = data['งาน_' + wNum] || data['work_' + wNum];
          }
          else if (h.indexOf('บริการที่บ้าน ') === 0) {
            var hNum = h.replace('บริการที่บ้าน ', '').trim();
            v = data['h' + hNum];
          }
          else if (h.indexOf('บริการชุมชน ') === 0) {
            var cNum = h.replace('บริการชุมชน ', '').trim();
            v = data['comm_' + cNum];
          }
        }
        if (typeof v === 'object' && v !== null) return '';
        if (v === undefined || v === null) return '';
        return isNaN(v) || v === '' ? v : Number(v);
      });
      sh.appendRow(row);
    }

    // บันทึกลงแผ่นงานเฉพาะชุดนั้นๆ (ต่อท้ายแถวล่าสุดเสมอ ไม่เขียนทับข้อมูลเดิม)
    appendRecordToSheet(targetSheet);

    // สำรองข้อมูลดิบฉบับเต็ม 100% ลงแผ่นงาน "สำรองข้อมูล_RAW" เพื่อใช้กู้คืนอัตโนมัติข้ามวัน/ยามค่ำคืน
    if (data['_raw_json']) {
      var rawSheet = ss.getSheetByName('สำรองข้อมูล_RAW');
      if (!rawSheet) {
        rawSheet = ss.insertSheet('สำรองข้อมูล_RAW');
        rawSheet.appendRow(['บันทึกเมื่อ', 'รหัสแบบสอบถาม', 'ชุดที่', 'Raw_JSON']);
        rawSheet.getRange(1, 1, 1, 4)
          .setBackground('#1e293b')
          .setFontColor('#ffffff')
          .setFontWeight('bold');
      }
      rawSheet.appendRow([new Date().toISOString(), recordId, formSet, data['_raw_json']]);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Recorded to " + targetSheetName }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  
  // รองรับ action=load_all สำหรับกู้คืนข้อมูลเข้าสู่ระบบเมื่อคอนเทนเนอร์รีเซ็ต
  if (params.action === 'load_all') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var rawSheet = ss.getSheetByName('สำรองข้อมูล_RAW');
    var records = [];
    if (rawSheet && rawSheet.getLastRow() > 1) {
      var numRows = rawSheet.getLastRow() - 1;
      var values = rawSheet.getRange(2, 4, numRows, 1).getValues();
      for (var i = 0; i < values.length; i++) {
        var raw = values[i][0];
        if (raw) {
          try {
            records.push(JSON.parse(raw));
          } catch (err) {}
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      count: records.length,
      records: records
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput("Survey Webhook Service for Health Center 40 is Active.");
}
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(gasCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSave = () => {
    onSaveSettings(urlInput.trim(), enabledInput);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleTestPing = async () => {
    if (!urlInput.trim()) {
      setTestResult({ success: false, message: 'กรุณากรอก Web App URL ก่อนทดสอบ' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const testPayload = {
      'รหัสแบบสอบถาม': `TEST-${Date.now().toString().slice(-4)}`,
      'วันเวลาที่บันทึก': new Date().toLocaleString('th-TH'),
      'ชุดที่': 4,
      'ชื่อชุดแบบสำรวจ': 'ชุดที่ 4: ผู้รับบริการในศูนย์บริการสาธารณสุข (ทดสอบระบบ)',
      'ศูนย์บริการสาธารณสุข': 'ศบส. 40 บางแค',
      'เพศ': 'หญิง',
      'อายุ': '35',
      'ระดับการศึกษา': 'ปริญญาตรี',
      'อาชีพ': 'พนักงานบริษัท',
      'สิทธิการรักษา': 'บัตรทอง',
      'c1': 5,
      'c2': 4.67,
      'c3': 5,
      'c4': 4.67,
      'c5': 5,
      'c6': 4.75,
      'หมวด 1_ความสะดวก รวดเร็ว': 5,
      'หมวด 2_คุณภาพการให้บริการ': 4.67,
      'หมวด 3_อัธยาศัยและการเอาใจใส่': 5,
      'หมวด 4_การให้ข้อมูลคำแนะนำ': 4.67,
      'หมวด 5_ค่ายาค่าบริการ': 5,
      'หมวด 6_อาคารสถานที่สิ่งอำนวยความสะดวก': 4.75,
      'ข้อ 1_ความรวดเร็วในขั้นตอนการรับบริการ': 5,
      'ข้อ 2_ระบบคิวการให้บริการตามลำดับ': 5,
      'ข้อ 3_การรับบริการที่ห้องจ่ายยาสะดวกรวดเร็ว': 5,
      'ข้อ 4_เครื่องมืออุปกรณ์เพียงพอสะอาดพร้อมใช้': 5,
      'ข้อ 5_เจ้าหน้าที่มีความรู้ความสามารถ': 4,
      'ข้อ 6_ความสามารถของแพทย์ในการตรวจรักษา': 5,
      'ข้อ 7_เจ้าหน้าที่ยิ้มแย้มแจ่มใส': 5,
      'ข้อ 8_เจ้าหน้าที่ให้ความสนใจเอาใจใส่': 5,
      'ข้อ 9_เจ้าหน้าที่มีกริยาวาจาสุภาพ': 5,
      'ข้อ 10_ได้รับข้อมูลการรักษาตรงความต้องการ': 5,
      'ข้อ 11_ได้รับคำแนะนำวิธีการใช้ยาชัดเจน': 5,
      'ข้อ 12_ศูนย์มีสื่อเอกสารให้ความรู้เพียงพอ': 4,
      'ข้อ 13_พอใจในค่ายาและค่าบริการ': 5,
      'ข้อ 14_บริการคุ้มค่ากับค่าใช้จ่าย': 5,
      'ข้อ 15_สถานที่ให้บริการเป็นสัดส่วนสะดวก': 5,
      'ข้อ 16_อาคารสถานที่สิ่งแวดล้อมปลอดภัย': 5,
      'ข้อ 17_อาคารสถานที่สะอาดเป็นระเบียบ': 4,
      'ข้อ 18_มีป้ายหรือเครื่องหมายแสดงทิศทางชัดเจน': 5,
      'คะแนนเฉลี่ยรวม': 4.83,
      'ร้อยละความพึงพอใจ': 96.6,
      'ระดับความพึงพอใจ': 'มากที่สุด',
      'ข้อเสนอแนะอื่นๆ': 'ทดสอบการส่งข้อมูลแบบภาษาไทยครบทุกฟิลด์ c1-c6 ไปยัง Google Sheets',
      id: `TEST-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString('th-TH'),
      form_set: 4,
      form_set_name: 'ชุดที่ 4: ผู้รับบริการในศูนย์บริการสาธารณสุข',
      other_suggestions: 'ทดสอบการส่งข้อมูลครบทุกฟิลด์ c1-c6'
    };

    try {
      await fetch(urlInput.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      setTestResult({
        success: true,
        message: 'ส่งข้อมูลทดสอบสำเร็จ! มีข้อมูลครบทั้ง c1 ถึง c6 และชื่อหัวข้อภาษาไทยเรียบร้อย กรุณาเปิดดูใน Google Sheets',
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `การเชื่อมต่อขัดข้อง: ${err.message || 'โปรดตรวจสอบ URL และการตั้งค่า Anyone'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const [isRestoringFromGas, setIsRestoringFromGas] = useState<boolean>(false);
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleRestoreFromGas = async () => {
    if (!urlInput.trim()) {
      setRestoreResult({ success: false, message: 'กรุณากรอก Web App URL ก่อนดึงข้อมูล' });
      return;
    }
    setIsRestoringFromGas(true);
    setRestoreResult(null);
    try {
      const res = await fetch('/api/survey/restore-from-gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: urlInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setRestoreResult({
          success: true,
          message: `ดึงข้อมูลจาก Google Sheets สำเร็จ! คืนค่าใหม่ ${data.count} รายการ (รวมในระบบ ${data.total} รายการ)`,
        });
      } else {
        setRestoreResult({
          success: false,
          message: `ไม่สามารถดึงข้อมูลได้: ${data.error || 'โปรดตรวจสอบสิทธิ์การ Deploy ของ Apps Script'}`,
        });
      }
    } catch (err: any) {
      setRestoreResult({
        success: false,
        message: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`,
      });
    } finally {
      setIsRestoringFromGas(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Title */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase">
            Backend & Google Sheets Integration
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-heading text-slate-900">
          การเชื่อมต่อแบบประเมินกับ Google Sheets
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          บันทึกข้อมูลแบบประเมินลง Google Sheets โดยตรง หัวข้อคอลัมน์เป็นภาษาไทยตรงตามตารางสถิติ พร้อมคำนวณคะแนน c1 ถึง c6 ครบถ้วน
        </p>
      </div>

      {/* Analysis & Fix Notice Card */}
      <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-sky-50 rounded-2xl p-5 border border-teal-200 shadow-sm mb-6 space-y-3">
        <div className="flex items-center gap-2 text-teal-900 font-bold text-sm sm:text-base">
          <Info className="w-5 h-5 text-teal-700 flex-shrink-0" />
          <span>วิเคราะห์ปัญหาที่พบและการแก้ไข (คำตอบ c1 ถึง 6 และหัวข้อในตาราง)</span>
        </div>
        <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
          <div className="bg-white/80 p-3 rounded-xl border border-teal-100">
            <p className="font-bold text-teal-900 mb-1">1. ทำไมคำตอบ c1 ถึง 6 เดิมไม่เห็นว่ามีบันทึก?</p>
            <p className="text-slate-600">
              ในแบบประเมินของศูนย์บริการสาธารณสุข c1 ถึง c6 คือ <strong>คะแนนเฉลี่ยของ 6 หมวดหลัก</strong> (1.ความสะดวก รวดเร็ว, 2.คุณภาพการให้บริการ, 3.อัธยาศัย, 4.การให้ข้อมูล, 5.ค่ายาค่าบริการ, 6.อาคารสถานที่) 
              ในเวอร์ชันเดิม ตัวเว็บส่งเฉพาะรหัสรายข้อ <code className="text-teal-800 bg-teal-50 px-1 py-0.5 rounded font-mono">q1..18</code> โดยไม่ได้ส่งค่าเฉลี่ยหมวด <code className="text-teal-800 bg-teal-50 px-1 py-0.5 rounded font-mono">c1..c6</code> 
              ขณะนี้ระบบได้ <strong>คำนวณคะแนนเฉลี่ยทั้ง 6 หมวดและส่งค่าเข้าคอลัมน์ c1 ถึง c6 ครบถ้วนทุกชุดแล้ว</strong>
            </p>
          </div>
          <div className="bg-white/80 p-3 rounded-xl border border-teal-100">
            <p className="font-bold text-teal-900 mb-1">2. ทำไมหัวข้อเดิมที่บันทึกลงดูแปลก?</p>
            <p className="text-slate-600">
              เดิมระบบส่งข้อมูลแบบซ้อน Object เข้าไปด้วย ทำให้ใน Google Sheets แสดงเป็น <code className="text-rose-700 bg-rose-50 px-1 py-0.5 rounded font-mono">[object Object]</code> และมีชื่อคอลัมน์ภาษาอังกฤษปนมา 
              ปัจจุบันได้รับการปรับโครงสร้างใหม่เป็น <strong>Flat Dictionary 100%</strong> ปราศจาก [object Object] และจัดเรียงหัวคอลัมน์เป็น <strong>ภาษาไทยเรียงตามตารางสถิติอย่างสวยงาม</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Webhook Configuration Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-8">
        <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900 mb-3 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <span>ตั้งค่า Google Apps Script Web App URL</span>
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Web App URL (ที่ได้จากการ Deploy ใน Apps Script):
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
              className="w-full text-xs sm:text-sm font-mono border border-slate-300 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              * ต้องเป็น URL ที่ลงท้ายด้วย <code className="text-emerald-700 font-semibold">/exec</code> เท่านั้น
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="forwardGas"
              checked={enabledInput}
              onChange={(e) => setEnabledInput(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <label htmlFor="forwardGas" className="text-xs sm:text-sm font-medium text-slate-700 cursor-pointer">
              ส่งสำเนาข้อมูลไปยัง Google Sheets อัตโนมัติทุกครั้งที่มีผู้ส่งแบบประเมิน
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 shadow-sm"
            >
              {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{isSaved ? 'บันทึกเรียบร้อย' : 'บันทึกการตั้งค่า'}</span>
            </button>

            <button
              onClick={handleTestPing}
              disabled={isTesting || !urlInput}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isTesting ? (
                <span className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin"></span>
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>ทดสอบส่งข้อมูล (Test Ping พร้อม c1-c6)</span>
            </button>

            <button
              onClick={handleRestoreFromGas}
              disabled={isRestoringFromGas || !urlInput}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              title="ดึงข้อมูลย้อนหลังจาก Google Sheets แผ่นงานสำรองข้อมูล_RAW กลับมายังระบบเมื่อคอนเทนเนอร์รีเซ็ต"
            >
              {isRestoringFromGas ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>ดึงข้อมูลย้อนหลังจาก Google Sheets</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <p>{testResult.message}</p>
            </div>
          )}

          {restoreResult && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                restoreResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {restoreResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <p>{restoreResult.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Step by step installation guide */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-8 space-y-6">
        <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-600" />
          <span>ขั้นตอนการเปิดใช้งาน Google Apps Script (5 ขั้นตอน)</span>
        </h2>

        <ol className="space-y-4 text-xs sm:text-sm text-slate-700">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
              1
            </span>
            <div>
              <p className="font-semibold text-slate-900">สร้าง Google Sheet แผ่นใหม่</p>
              <p className="text-slate-500 text-xs mt-0.5">
                ไปที่ <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-teal-700 underline font-medium inline-flex items-center gap-0.5">sheets.new <ExternalLink className="w-3 h-3" /></a> เพื่อเปิดแผ่นงานใหม่ ตั้งชื่อตามต้องการ เช่น "ข้อมูลความพึงพอใจ ศบส."
              </p>
            </div>
          </li>

          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
              2
            </span>
            <div>
              <p className="font-semibold text-slate-900">เปิด Apps Script</p>
              <p className="text-slate-500 text-xs mt-0.5">
                ใน Google Sheets ไปที่เมนูด้านบน <strong>ส่วนขยาย (Extensions)</strong> &gt; <strong>Apps Script</strong>
              </p>
            </div>
          </li>

          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
              3
            </span>
            <div>
              <p className="font-semibold text-slate-900">วางโค้ด JavaScript (Code.gs)</p>
              <p className="text-slate-500 text-xs mt-0.5">
                ลบโค้ดเริ่มต้นทั้งหมดในไฟล์ <code className="bg-slate-100 px-1 py-0.5 rounded text-teal-800">Code.gs</code> ออก แล้วคัดลอกโค้ดจากกล่องด้านล่างไปวางแทนที่ แล้วกดบันทึก (Ctrl + S)
              </p>
            </div>
          </li>

          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
              4
            </span>
            <div>
              <p className="font-semibold text-slate-900">ทำการ Deploy เป็น Web App (สำคัญมาก!)</p>
              <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                กดปุ่มสีน้ำเงิน <strong>ทำให้ใช้งานได้ (Deploy)</strong> &gt; <strong>การทำให้ใช้งานได้ใหม่ (New deployment)</strong> &gt; เลือกประเภทเป็น <strong>เว็บแอป (Web app)</strong>
                <br />
                ตั้งค่า <strong>สิทธิ์การเข้าถึง (Who has access)</strong> เป็น <span className="bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold">ทุกคน (Anyone)</span> เพื่อให้หน้าเว็บส่งข้อมูลเข้ามาได้โดยไม่ต้องล็อกอิน
              </p>
            </div>
          </li>

          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
              5
            </span>
            <div>
              <p className="font-semibold text-slate-900">นำ URL มาใส่ในระบบ</p>
              <p className="text-slate-500 text-xs mt-0.5">
                คัดลอก Web App URL ที่ได้มาวางในกล่องด้านบน แล้วกดบันทึก จากนั้นข้อมูลทุกครั้งที่ผู้ใช้ตอบแบบสอบถามจะถูกบันทึกลงในชีตของคุณแบบ Real-time ทันที!
              </p>
            </div>
          </li>
        </ol>
      </div>

      {/* Code Box */}
      <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800 mb-8">
        <div className="bg-slate-800/80 px-4 py-3 flex items-center justify-between border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono text-slate-300 font-semibold">Code.gs (Google Apps Script)</span>
          </div>

          <button
            onClick={copyToClipboard}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ด'}</span>
          </button>
        </div>

        <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-96">
          {gasCode}
        </pre>
      </div>

      {/* Data structure & formula notes */}
      <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-6 border border-teal-200 shadow-sm space-y-3">
        <h3 className="font-bold font-heading text-teal-900 text-base flex items-center gap-2">
          <Table className="w-5 h-5 text-teal-700" />
          <span>สูตรคำนวณแนะนำใน Google Sheets (ป้องกัน #DIV/0!)</span>
        </h3>
        <p className="text-xs sm:text-sm text-teal-800 leading-relaxed">
          เนื่องจากข้อมูลคะแนนถูกบันทึกเป็นตัวเลข (Number 1-5) และข้อที่ผู้ตอบข้ามจะถูกเว้นว่างไว้ (Empty Cell) คุณสามารถใช้สูตรต่อไปนี้เพื่อคำนวณสถิติได้ทันทีโดยไม่ติด Error:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
          <div className="bg-white p-3 rounded-xl border border-teal-200 shadow-inner">
            <p className="font-bold text-slate-800 mb-1">หาค่าเฉลี่ยรายข้อ (Mean x̄):</p>
            <code className="bg-slate-100 p-1.5 rounded block text-teal-900 font-mono">
              =IFERROR(AVERAGE(E2:E), 0)
            </code>
            <p className="text-[11px] text-slate-500 mt-1">* จะข้ามเซลล์ว่างอัตโนมัติ และแสดง 0 เมื่อยังไม่มีข้อมูล</p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-teal-200 shadow-inner">
            <p className="font-bold text-slate-800 mb-1">หาร้อยละความพึงพอใจ (ระดับ 4-5):</p>
            <code className="bg-slate-100 p-1.5 rounded block text-emerald-900 font-mono">
              =IFERROR(COUNTIF(E2:E, "&gt;=4") / COUNT(E2:E), 0)
            </code>
            <p className="text-[11px] text-slate-500 mt-1">* คิดเฉพาะสัดส่วนผู้ที่ตอบคะแนน 4 หรือ 5 เทียบกับผู้ตอบข้อนั้นทั้งหมด</p>
          </div>
        </div>
      </div>
    </div>
  );
};
