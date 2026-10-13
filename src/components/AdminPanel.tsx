import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  FileSpreadsheet,
  History,
  Trash2,
  Settings,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Download,
  Database,
  RefreshCw,
  LogOut,
  FolderOpen,
  ArrowLeft,
  KeyRound,
  Check,
  Save,
  Globe,
  Server,
  QrCode
} from 'lucide-react';
import { FormSetId, SurveySubmissionPayload, AppSettings } from '../types/survey';
import { FORM_SETS } from '../data/surveyQuestions';
import { GoogleAppsScriptGuide } from './GoogleAppsScriptGuide';
import { DeleteModal } from './DeleteModal';
import { BackupHistoryModal } from './BackupHistoryModal';

interface AdminPanelProps {
  submissions: SurveySubmissionPayload[];
  settings: AppSettings;
  onSaveSettings: (url: string, enabled: boolean) => void;
  onSaveFullSettings?: (updated: Partial<AppSettings>) => void;
  onDeleteTarget: (target: 'all' | FormSetId) => void;
  onRefreshData: () => void;
  onOpenGoogleSheetsModal: () => void;
  onBackToDashboard: () => void;
  onLogout: () => void;
  onOpenQrModal?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  submissions,
  settings,
  onSaveSettings,
  onSaveFullSettings,
  onDeleteTarget,
  onRefreshData,
  onOpenGoogleSheetsModal,
  onBackToDashboard,
  onLogout,
  onOpenQrModal,
}) => {
  const [activeTab, setActiveTab] = useState<'gas' | 'backup' | 'delete' | 'settings'>('gas');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // System settings state
  const [centerNameInput, setCenterNameInput] = useState<string>(settings.healthCenterName);
  const [publicUrlInput, setPublicUrlInput] = useState<string>(settings.publicAppUrl || '');
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);

  // Network info state
  const [networkInfo, setNetworkInfo] = useState<{
    appUrl?: string;
    publicAppUrl?: string;
    lanUrls?: string[];
  } | null>(null);

  // Gas Sync Logs state
  const [gasLogs, setGasLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  const fetchGasLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch(`/api/survey/gas-logs?_t=${Date.now()}`);
      const data = await res.json();
      if (data && data.success && Array.isArray(data.logs)) {
        setGasLogs(data.logs);
      }
    } catch (e) {
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetch('/api/survey/network-info')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setNetworkInfo(d);
      })
      .catch(() => {});

    fetchGasLogs();
  }, []);

  useEffect(() => {
    if (activeTab === 'gas') {
      fetchGasLogs();
    }
  }, [activeTab]);

  const countsBySet: { [key in FormSetId]: number } = {
    1: submissions.filter((s) => s.form_set === 1).length,
    2: submissions.filter((s) => s.form_set === 2).length,
    3: submissions.filter((s) => s.form_set === 3).length,
    4: submissions.filter((s) => s.form_set === 4).length,
  };

  const handleSaveSystemConfig = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/survey/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          healthCenterName: centerNameInput.trim(),
          publicAppUrl: publicUrlInput.trim(),
        }),
      });
      if (res.ok) {
        onSaveFullSettings?.({
          healthCenterName: centerNameInput.trim(),
          publicAppUrl: publicUrlInput.trim(),
        });
        localStorage.setItem('health_survey_public_url', publicUrlInput.trim());
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2000);
      }
    } catch (e) {
      console.warn('Save settings failed:', e);
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Banner & Identity */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ผู้ดูแลระบบที่ได้รับอนุญาต: b12</span>
            </span>
            <span className="text-xs text-slate-400">• จุดเข้าถึงเฉพาะผู้ดูแลระบบ</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-white">
            ระบบจัดการสำหรับผู้ดูแลระบบ (Administrator)
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            จัดการระบบเชื่อมต่อ Google Sheets, ประวัติการสำรอง/กู้คืนข้อมูล และระบบลบข้อมูลที่ได้รับอนุญาต
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {onOpenQrModal && (
            <button
              onClick={onOpenQrModal}
              className="px-3.5 py-2 bg-teal-800 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-teal-600/40 shadow-sm"
              title="เปิดและพิมพ์ป้าย QR Code สำหรับจุดบริการ"
            >
              <QrCode className="w-4 h-4 text-emerald-300" />
              <span>ป้าย QR Code</span>
            </button>
          )}
          <button
            onClick={onBackToDashboard}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-white/15"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้ารายงานสถิติ</span>
          </button>
          <button
            onClick={onLogout}
            className="px-3 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            title="ออกจากระบบผู้ดูแลระบบ"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveTab('gas')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'gas'
              ? 'bg-teal-800 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>การเชื่อมต่อ Google Sheets</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-teal-800 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <History className="w-4 h-4" />
          <span>ประวัติสำรอง & กู้คืนข้อมูล</span>
        </button>

        <button
          onClick={() => setActiveTab('delete')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'delete'
              ? 'bg-rose-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>ระบบลบข้อมูล (เฉพาะ Admin)</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-teal-800 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>ตั้งค่าระบบ & เครือข่าย</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: GOOGLE SHEETS LOGGING & AUTO-SYNC */}
      {/* ======================================================== */}
      {activeTab === 'gas' && (
        <div className="space-y-6">
          {/* Status Alert */}
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 text-xs sm:text-sm">
              <h3 className="font-bold text-slate-900">
                ระบบบันทึกข้อมูลอัตโนมัติ (Auto-Append) ทำงานตลอดเวลา
              </h3>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                ทุกครั้งที่มีผู้ส่งแบบสอบถามเข้ามา ระบบจะต่อแถวถัดไปใน Google Sheets อัตโนมัติทันทีโดยไม่เขียนทับข้อมูลเดิม และไม่ต้องกดปุ่มซิงค์ข้อมูลด้วยตนเอง
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onOpenGoogleSheetsModal}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>บันทึกไฟล์รายงานสเปรดชีต (Drive & Sheets OAuth)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Auto-Sync Activity Log */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-bold font-heading text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>บันทึกประวัติการส่งข้อมูลเข้า Google Sheets (Live Sync Log)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  แสดงรายการแบบสอบถามที่ถูกส่งต่อแถวอัตโนมัติ (Append-Only) เข้าสู่สเปรดชีตทันทีที่มีการส่ง
                </p>
              </div>
              <button
                type="button"
                onClick={fetchGasLogs}
                disabled={isLoadingLogs}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                title="กดเพื่อรีเฟรชประวัติการซิงค์"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                <span>รีเฟรช Log</span>
              </button>
            </div>

            {gasLogs.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                <p className="font-semibold text-slate-700">ระบบ Auto-Sync สแตนด์บายพร้อมทำงาน</p>
                <p className="text-[11px] text-slate-400">
                  {settings.gasWebhookUrl?.trim()
                    ? 'เชื่อมต่อ Webhook URL แล้ว: เมื่อมีผู้ส่งแบบสอบถาม ระบบจะส่งข้อมูลไปต่อแถวใน Google Sheets อัตโนมัติทันที'
                    : 'กรุณาระบุ Google Apps Script Web App URL ด้านล่างเพื่อเริ่มการต่อแถวอัตโนมัติ'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 font-semibold">วัน-เวลา</th>
                      <th className="py-2 px-3 font-semibold">รหัสแบบสอบถาม</th>
                      <th className="py-2 px-3 font-semibold">ชุดที่</th>
                      <th className="py-2 px-3 font-semibold">สถานะการต่อแถว</th>
                      <th className="py-2 px-3 font-semibold">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gasLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 text-slate-600">{log.timestamp}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-teal-800">{log.submissionId}</td>
                        <td className="py-2 px-3 font-semibold">ชุดที่ {log.formSet}</td>
                        <td className="py-2 px-3">
                          {log.status === 'success' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ต่อแถวสำเร็จ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              ขัดข้อง
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">{log.message || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Embedded Full Guide */}
          <GoogleAppsScriptGuide
            gasWebhookUrl={settings.gasWebhookUrl}
            forwardToGas={settings.forwardToGas}
            onSaveSettings={onSaveSettings}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: BACKUP & RESTORE HISTORY */}
      {/* ======================================================== */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                <span>ประวัติการสำรองข้อมูลอัตโนมัติและการกู้คืน</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ระบบจะสร้างสแนปช็อตสำรองข้อมูลอัตโนมัติก่อนการแก้ไข/ลบ และระหว่างการส่งแบบสอบถาม
              </p>
            </div>

            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              <span>เปิดประวัติสแนปช็อตทั้งหมด ({submissions.length} รายการปัจจุบัน)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-700 block">ข้อมูลในระบบปัจจุบัน:</span>
              <p className="text-xl font-bold text-teal-800">{submissions.length} รายการ</p>
              <p className="text-slate-500 text-[11px]">บันทึกในแคช RAM, WAL Journal และไฟล์ surveys.json</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-700 block">การกู้คืนอัตโนมัติ (Self-Healing):</span>
              <p className="text-emerald-700 font-semibold text-xs mt-1">✓ เปิดใช้งานอยู่</p>
              <p className="text-slate-500 text-[11px]">กู้คืนอัตโนมัติจากไฟล์คลังถาวรเมื่อเซิร์ฟเวอร์เริ่มต้นใหม่</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-700 block">กู้คืนจาก Google Sheets:</span>
              <p className="text-slate-600 font-semibold text-xs mt-1">แผ่นงานสำรองข้อมูล_RAW</p>
              <p className="text-slate-500 text-[11px]">รองรับการกู้คืนข้อมูล 100% ข้ามวัน/ยามค่ำคืน</p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: DATA DELETION SYSTEM (ADMIN RESTRICTED) */}
      {/* ======================================================== */}
      {activeTab === 'delete' && (
        <div className="bg-white rounded-2xl p-6 border-2 border-rose-200 shadow-sm space-y-6">
          <div className="pb-4 border-b border-rose-100 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900">
                  ระบบลบข้อมูลแบบสำรวจ (เข้าถึงได้เฉพาะผู้ดูแลระบบ)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                ปุ่มลบข้อมูลถูกนำออกจากหน้าหลักแล้ว ท่านสามารถเลือกลบเฉพาะชุด หรือล้างข้อมูลทั้งหมดเพื่อเริ่มรอบสำรวจใหม่ได้จากหน้านี้เท่านั้น
              </p>
            </div>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer flex-shrink-0"
            >
              <KeyRound className="w-4 h-4" />
              <span>เปิดระบบยืนยันการลบข้อมูล</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {FORM_SETS.map((s) => (
              <div
                key={s.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800 block">ชุดที่ {s.id}</span>
                  <span className="text-[11px] text-slate-500 line-clamp-1">{s.name}</span>
                  <p className="text-lg font-bold text-slate-900 mt-2">
                    {countsBySet[s.id]} <span className="text-xs font-normal text-slate-500">คน</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="w-full py-1.5 text-center bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  ลบชุดที่ {s.id}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SYSTEM & NETWORK SETTINGS */}
      {/* ======================================================== */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-teal-700" />
              <span>ตั้งค่าระบบและเครือข่ายสำหรับ QR Code</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              กำหนดชื่อศูนย์บริการและ Public URL สำหรับสร้าง QR Code ให้โทรศัพท์มือถือเข้าถึงได้ถูกต้อง
            </p>
          </div>

          <div className="space-y-4 max-w-xl text-xs sm:text-sm">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                ชื่อศูนย์บริการสาธารณสุข:
              </label>
              <input
                type="text"
                value={centerNameInput}
                onChange={(e) => setCenterNameInput(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs sm:text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Public URL ของระบบ (ใช้สำหรับสร้าง QR Code ให้มือถือสแกน):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={publicUrlInput}
                  onChange={(e) => setPublicUrlInput(e.target.value)}
                  placeholder="ปล่อยว่างเพื่อใช้ลิงก์หลักอัตโนมัติ หรือใส่โดเมนของท่าน"
                  className="flex-1 p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 font-mono text-xs"
                />
                {onOpenQrModal && (
                  <button
                    type="button"
                    onClick={onOpenQrModal}
                    className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                    title="เปิดป้าย QR Code"
                  >
                    <QrCode className="w-4 h-4 text-emerald-300" />
                    <span>ดูป้าย QR</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                * ค่าเริ่มต้นจะใช้ลิงก์ระบบหลัก (Direct Live) ซึ่งออนไลน์ตลอดเวลาและไม่ติดปัญหา 404 Page not found
              </p>
            </div>

            {networkInfo?.lanUrls && networkInfo.lanUrls.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-700 text-xs flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 text-slate-500" />
                  <span>LAN IP (สำหรับอุปกรณ์ในวง Wi-Fi เดียวกัน):</span>
                </span>
                <p className="font-mono text-xs text-teal-800">{networkInfo.lanUrls.join(', ')}</p>
              </div>
            )}

            <button
              onClick={handleSaveSystemConfig}
              disabled={isSavingSettings}
              className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {settingsSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{settingsSaved ? 'บันทึกสำเร็จแล้ว' : 'บันทึกการตั้งค่าระบบ'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirmDelete={(target) => {
          onDeleteTarget(target);
          setIsDeleteModalOpen(false);
          setNotification('ดำเนินการลบข้อมูลเรียบร้อยแล้ว');
          setTimeout(() => setNotification(null), 4000);
        }}
        countsBySet={countsBySet}
        totalCount={submissions.length}
      />

      {/* Backup History Modal */}
      <BackupHistoryModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onRestoreSuccess={() => {
          onRefreshData();
          setNotification('กู้คืนข้อมูลแบบสำรวจสำเร็จเรียบร้อยแล้ว');
          setTimeout(() => setNotification(null), 4000);
        }}
      />
    </div>
  );
};
