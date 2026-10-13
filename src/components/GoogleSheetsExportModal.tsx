import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  X,
  ExternalLink,
  Download,
  Folder,
  FolderPlus,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  LogOut,
  ShieldCheck,
  FileText,
  Sparkles,
  ChevronDown,
  Info
} from 'lucide-react';
import { User } from 'firebase/auth';
import { SurveySubmissionPayload } from '../types/survey';
import {
  googleSignIn,
  logoutGoogle,
  getAccessToken,
  getCurrentUser,
  initAuth
} from '../services/googleAuth';
import {
  exportSurveysToGoogleSheets,
  listUserDriveFolders,
  createDriveFolder,
  ExportResult,
  DriveFolderItem
} from '../services/googleSheetsDrive';

interface GoogleSheetsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: SurveySubmissionPayload[];
  healthCenterName?: string;
}

export const GoogleSheetsExportModal: React.FC<GoogleSheetsExportModalProps> = ({
  isOpen,
  onClose,
  submissions,
  healthCenterName = 'ศูนย์บริการสาธารณสุข 40 บางแค',
}) => {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [token, setToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Folder management
  const [folders, setFolders] = useState<DriveFolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
  const [isLoadingFolders, setIsLoadingFolders] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('รายงานสถิติ ศบส. 40 บางแค');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [showFolderSelector, setShowFolderSelector] = useState<boolean>(false);

  // File naming
  const defaultTitle = `รายงานสถิติความพึงพอใจ_${healthCenterName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}`;
  const [customTitle, setCustomTitle] = useState<string>(defaultTitle);

  // Auto-sync preference
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('gs_auto_sync_enabled') === 'true';
  });

  // Init auth listener on open
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initAuth(
      (authUser, authToken) => {
        setUser(authUser);
        if (authToken) {
          setToken(authToken);
          loadFolders(authToken);
        }
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );

    // If already have access token in memory
    getAccessToken().then((t) => {
      if (t) {
        setToken(t);
        loadFolders(t);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isOpen]);

  const loadFolders = async (authToken: string) => {
    setIsLoadingFolders(true);
    try {
      const fList = await listUserDriveFolders(authToken);
      setFolders(fList);
    } catch (e) {
      console.warn('Load folders failed:', e);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        await loadFolders(res.accessToken);
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      setError(err?.message || 'การเข้าสู่ระบบ Google เพื่อเชื่อมต่อ Drive ไม่สำเร็จ');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutGoogle();
      setUser(null);
      setToken(null);
      setExportResult(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleCreateNewFolder = async () => {
    if (!token || !newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      const created = await createDriveFolder(token, newFolderName.trim());
      setFolders((prev) => [created, ...prev]);
      setSelectedFolderId(created.id);
      setIsCreatingFolder(false);
      setShowFolderSelector(false);
    } catch (err: any) {
      setError(err?.message || 'ไม่สามารถสร้างโฟลเดอร์ใหม่ใน Google Drive ได้');
      setIsCreatingFolder(false);
    }
  };

  const handleConfirmExport = async () => {
    if (!token) {
      setError('กรุณาลงชื่อเข้าใช้ด้วย Google บัญชีที่ต้องการก่อนเริ่มบันทึก');
      return;
    }
    if (submissions.length === 0) {
      setError('ยังไม่มีข้อมูลแบบสอบถามสำหรับส่งออก');
      return;
    }

    setIsExporting(true);
    setError(null);
    setExportProgress('กำลังเตรียมข้อมูล 5 ชีต (ชุดที่ 1-4 และตารางสรุปผล)...');

    try {
      setExportProgress('กำลังสร้างไฟล์ Google Spreadsheet ใน Google Drive...');
      const targetFolder = folders.find((f) => f.id === selectedFolderId);

      const result = await exportSurveysToGoogleSheets(token, submissions, {
        customTitle: customTitle.trim() || defaultTitle,
        folderId: selectedFolderId === 'root' ? undefined : selectedFolderId,
        folderName: selectedFolderId === 'root' ? 'Google Drive (หน้าแรก)' : targetFolder?.name,
      });

      setExportProgress('บันทึกข้อมูลและรายงานสถิติสำเร็จเรียบร้อย!');
      setExportResult(result);

      // Save preference if autoSync is toggled
      if (autoSyncEnabled) {
        localStorage.setItem('gs_auto_sync_enabled', 'true');
        localStorage.setItem('gs_last_exported_sheet_id', result.spreadsheetId);
        localStorage.setItem('gs_last_exported_sheet_url', result.spreadsheetUrl);
      }
    } catch (err: any) {
      console.error('Export to Google Sheets error:', err);
      setError(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลไปยัง Google Sheets');
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const selectedFolderName =
    selectedFolderId === 'root'
      ? 'Google Drive (หน้าแรกของฉัน)'
      : folders.find((f) => f.id === selectedFolderId)?.name || 'โฟลเดอร์ที่เลือก';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-sm flex-shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-heading text-slate-900">
                  บันทึกไปยัง Google Sheets ใน Google Drive
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  OAuth Drive & Sheets
                </span>
              </div>
              <p className="text-xs text-slate-500">
                สร้างสเปรดชีต 5 ชีตแยกตามชุดแบบสอบถามและผลสรุปสถิติ บันทึกตรงใน Google Drive ของคุณ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs sm:text-sm">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 text-xs">
                <p className="font-bold">เกิดข้อผิดพลาด</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* 1. Account Section */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>บัญชี Google ที่ได้รับสิทธิ์เข้าถึง:</span>
              </span>
              {user && (
                <button
                  onClick={handleSignOut}
                  className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ออกจากระบบ</span>
                </button>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google User'}
                    className="w-10 h-10 rounded-full border border-slate-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                    {(user.displayName || user.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 text-xs truncate">
                    {user.displayName || 'Google Account'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 font-medium flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>เชื่อมต่อแล้ว</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 text-center">
                <p className="text-xs text-slate-600">
                  เพื่อบันทึกไฟล์สเปรดชีตไปยัง Google Drive และ Google Sheets ของท่าน กรุณาลงชื่อเข้าใช้ด้วย Google
                </p>

                {/* Official GSI Button Style as mandated by skill */}
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="inline-flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-medium text-xs sm:text-sm px-4 py-2.5 rounded-full border border-slate-300 shadow-sm transition-all hover:shadow cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>
                    {isSigningIn ? 'กำลังเชื่อมต่อบัญชี Google...' : 'ลงชื่อเข้าใช้ด้วย Google เพื่ออนุญาตสิทธิ์ Drive'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* 2. File and Target Drive Folder Configuration */}
          {user && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3.5">
              <div>
                <label className="block font-bold text-slate-800 text-xs mb-1">
                  ชื่อไฟล์ Google Sheet:
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  placeholder="ระบุชื่อไฟล์..."
                />
              </div>

              {/* Folder Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-800 text-xs">
                    โฟลเดอร์ปลายทางใน Google Drive:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowFolderSelector(!showFolderSelector)}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showFolderSelector ? 'ซ่อนรายการโฟลเดอร์' : 'เลือกหรือสร้างโฟลเดอร์'}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${showFolderSelector ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 flex-1 truncate">
                    {selectedFolderName}
                  </span>
                  {selectedFolderId !== 'root' && (
                    <button
                      type="button"
                      onClick={() => setSelectedFolderId('root')}
                      className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      (เปลี่ยนเป็นหน้าแรก)
                    </button>
                  )}
                </div>

                {showFolderSelector && (
                  <div className="mt-2 p-3 bg-white rounded-xl border border-slate-200 space-y-2.5 animate-fadeIn">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="ชื่อโฟลเดอร์ใหม่..."
                        className="flex-1 text-xs p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={handleCreateNewFolder}
                        disabled={isCreatingFolder || !newFolderName.trim()}
                        className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>สร้าง</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 font-medium">หรือเลือกโฟลเดอร์ที่มีอยู่:</p>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFolderId('root');
                          setShowFolderSelector(false);
                        }}
                        className={`w-full text-left p-1.5 rounded-lg text-xs flex items-center gap-2 cursor-pointer ${
                          selectedFolderId === 'root'
                            ? 'bg-emerald-50 text-emerald-800 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5 text-slate-400" />
                        <span>Google Drive (หน้าแรกของฉัน)</span>
                      </button>

                      {isLoadingFolders && (
                        <p className="text-xs text-slate-400 p-2 text-center">กำลังโหลดโฟลเดอร์...</p>
                      )}

                      {folders.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setSelectedFolderId(f.id);
                            setShowFolderSelector(false);
                          }}
                          className={`w-full text-left p-1.5 rounded-lg text-xs flex items-center gap-2 cursor-pointer ${
                            selectedFolderId === f.id
                              ? 'bg-emerald-50 text-emerald-800 font-bold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <Folder className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="truncate">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Data Summary */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                <span className="text-emerald-900 font-medium">
                  ข้อมูลที่จะบันทึก: <strong>{submissions.length} รายการ</strong> (ครบทั้ง 5 ชีต)
                </span>
                <span className="text-emerald-700 text-[11px]">
                  ชุด 1-4 + ผลสรุปสถิติ
                </span>
              </div>
            </div>
          )}

          {/* 3. Success State with Direct Links & Download Options */}
          {exportResult && (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 space-y-3 animate-fadeIn">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                    บันทึกลง Google Sheet สำเร็จเรียบร้อย!
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    ไฟล์: <strong className="text-slate-800">{exportResult.title}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    บันทึกเมื่อ: {exportResult.timestamp} {exportResult.folderName ? `• ใน: ${exportResult.folderName}` : ''}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Open & Download */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <a
                  href={exportResult.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>เปิดใน Google Sheets</span>
                </a>

                <a
                  href={exportResult.excelDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
                  title="ดาวน์โหลดไฟล์สเปรดชีตนี้ในรูปแบบ Excel (.xlsx) จาก Google Sheet"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>โหลดเป็น Excel (.xlsx)</span>
                </a>

                <a
                  href={exportResult.pdfDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
                  title="ดาวน์โหลดรายงานสรุปในรูปแบบ PDF จาก Google Sheet"
                >
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>โหลดเป็น PDF</span>
                </a>
              </div>
            </div>
          )}

          {/* User Confirmation Note (MANDATORY per skill) */}
          <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-500 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-700">การเข้าถึง Google Workspace ด้วยความยินยอม:</p>
              <p>
                ระบบจะสร้างไฟล์สเปรดชีตใหม่ภายในโฟลเดอร์ Google Drive ของบัญชีที่ท่านอนุญาตเท่านั้น โดยไม่กระทบหรือเขียนทับไฟล์งานอื่นๆ
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {exportResult ? 'ปิดหน้าต่าง' : 'ยกเลิก'}
          </button>

          {user && (
            <button
              type="button"
              onClick={handleConfirmExport}
              disabled={isExporting || submissions.length === 0}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>{exportProgress || 'กำลังบันทึกลง Google Sheets...'}</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>ยืนยันบันทึกข้อมูลไปยัง Google Sheets</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
