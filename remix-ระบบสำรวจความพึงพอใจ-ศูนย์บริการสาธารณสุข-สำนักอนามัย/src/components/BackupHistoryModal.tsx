import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, History, RefreshCw, X, Download, AlertTriangle, CheckCircle2, Upload, FileCode } from 'lucide-react';

interface BackupItem {
  filename: string;
  size: number;
  createdAt: string;
}

interface BackupHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess: () => void;
}

export const BackupHistoryModal: React.FC<BackupHistoryModalProps> = ({
  isOpen,
  onClose,
  onRestoreSuccess,
}) => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/survey/backups?_t=${Date.now()}`);
      const json = await res.json();
      if (json && json.success && Array.isArray(json.backups)) {
        setBackups(json.backups);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBackups();
    }
  }, [isOpen]);

  const handleRestore = async (filename: string) => {
    const ok = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการกู้คืนข้อมูลจากไฟล์:\n${filename}\n\nระบบจะแทนที่ข้อมูลปัจจุบันด้วยสำเนาที่เลือกนี้`);
    if (!ok) return;

    setRestoringFile(filename);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/survey/restore-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      const json = await res.json();
      if (json && json.success) {
        setIsSuccess(true);
        setStatusMessage(`กู้คืนข้อมูลสำเร็จเรียบร้อย (${json.count} รายการ)!`);
        onRestoreSuccess();
        setTimeout(() => {
          setStatusMessage(null);
          onClose();
        }, 1500);
      } else {
        setIsSuccess(false);
        setStatusMessage(json.error || 'เกิดข้อผิดพลาดในการกู้คืน');
      }
    } catch (err: any) {
      setIsSuccess(false);
      setStatusMessage(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setRestoringFile(null);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        const items = Array.isArray(parsed) ? parsed : parsed.data || parsed.submissions;
        if (!Array.isArray(items) || items.length === 0) {
          setIsSuccess(false);
          setStatusMessage('ไฟล์ไม่มีรายการข้อมูลแบบสอบถามที่ถูกต้อง');
          return;
        }

        const res = await fetch('/api/survey/import-json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, merge: false }),
        });
        const json = await res.json();
        if (json && json.success) {
          setIsSuccess(true);
          setStatusMessage(`นำเข้าและกู้คืนข้อมูลสำเร็จ (${json.count} รายการ)!`);
          fetchBackups();
          onRestoreSuccess();
          setTimeout(() => {
            setStatusMessage(null);
            onClose();
          }, 1500);
        } else {
          setIsSuccess(false);
          setStatusMessage(json.error || 'นำเข้าข้อมูลไม่สำเร็จ');
        }
      } catch (err: any) {
        setIsSuccess(false);
        setStatusMessage('ไฟล์ JSON ไม่ถูกต้อง: ' + err.message);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleRunServerRecovery = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/survey/run-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateIfMissing: true }),
      });
      const json = await res.json();
      if (json && json.success) {
        setIsSuccess(true);
        setStatusMessage(`กู้คืนข้อมูลสำเร็จ: ตรวจสอบและดึงข้อมูลกลับมา ${json.currentCount} รายการ!`);
        fetchBackups();
        onRestoreSuccess();
        setTimeout(() => setStatusMessage(null), 3500);
      } else {
        setIsSuccess(false);
        setStatusMessage(json.error || 'การกู้คืนข้อมูลไม่สำเร็จ');
      }
    } catch (err: any) {
      setIsSuccess(false);
      setStatusMessage('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualBackup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/survey/create-backup', { method: 'POST' });
      const json = await res.json();
      if (json && json.success) {
        setIsSuccess(true);
        setStatusMessage('สร้างสำเนาสำรอง (Snapshot) เรียบร้อยแล้ว!');
        fetchBackups();
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err: any) {
      setIsSuccess(false);
      setStatusMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2.5 border border-emerald-200">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold font-heading text-slate-900">
            ประวัติการสำรองและกู้คืนข้อมูล (Backup & Recovery)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ระบบจัดเก็บประวัติสำรองอัตโนมัติ (Automated Snapshots + WAL Journal) ป้องกันข้อมูลสูญหาย 100%
          </p>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs flex items-center gap-2 border ${
              isSuccess
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span className="font-semibold">{statusMessage}</span>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-700">
            รายการสำรอง ({backups.length} ไฟล์):
          </span>
          <div className="flex items-center gap-1.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={handleRunServerRecovery}
              disabled={loading}
              className="px-2.5 py-1 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 border border-teal-700"
              title="สั่งการสแกนค้นหาและกู้คืนข้อมูลแบบสำรวจทั้งหมดทันที"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-300 ${loading ? 'animate-spin' : ''}`} />
              <span>กู้คืนข้อมูลระบบ</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border border-slate-200"
              title="นำเข้าไฟล์ข้อมูลสำรอง JSON จากเครื่อง"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>นำเข้า JSON</span>
            </button>
            <button
              onClick={handleManualBackup}
              disabled={loading}
              className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
              title="บันทึกสำเนาข้อมูลทันที"
            >
              <Download className="w-3.5 h-3.5" />
              <span>สร้างสำเนา</span>
            </button>
            <button
              onClick={fetchBackups}
              disabled={loading}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
              title="รีเฟรชรายการ"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Backup Files List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
          {loading && backups.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">กำลังโหลดรายการสำรอง...</div>
          ) : backups.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              ยังไม่มีไฟล์สำรองย้อนหลัง (ระบบจะเริ่มสร้างอัตโนมัติเมื่อมีคนบันทึกแบบสอบถาม)
            </div>
          ) : (
            backups.map((b) => (
              <div
                key={b.filename}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs transition-all"
              >
                <div className="truncate">
                  <div className="font-mono font-bold text-slate-800 truncate" title={b.filename}>
                    {b.filename}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(b.createdAt).toLocaleString('th-TH')} • {(b.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(b.filename)}
                  disabled={restoringFile === b.filename}
                  className="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 active:scale-95 text-white font-bold rounded-lg text-xs transition-all cursor-pointer flex-shrink-0 flex items-center gap-1 shadow-sm disabled:opacity-50"
                  title="กู้คืนข้อมูลจากไฟล์นี้"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${restoringFile === b.filename ? 'animate-spin' : ''}`}
                  />
                  <span>{restoringFile === b.filename ? 'กำลังกู้คืน...' : 'กู้คืนไฟล์นี้'}</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Protection Note Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 text-emerald-700 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ระบบสำรองข้อมูลอัตโนมัติป้องกันการสูญหายตลอด 24 ชั่วโมง
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
