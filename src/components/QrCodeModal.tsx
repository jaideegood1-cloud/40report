import React, { useState } from 'react';
import { X, Printer, QrCode, Copy, Check, ExternalLink, Sparkles, Globe, Edit3 } from 'lucide-react';
import { FormSetId } from '../types/survey';
import { FORM_SETS } from '../data/surveyQuestions';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  healthCenterName: string;
  publicAppUrl?: string;
  onSavePublicUrl?: (url: string) => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  healthCenterName,
  publicAppUrl,
  onSavePublicUrl,
}) => {
  const [selectedSet, setSelectedSet] = useState<FormSetId | 'all'>('all');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showUrlEdit, setShowUrlEdit] = useState<boolean>(false);
  const [customUrl, setCustomUrl] = useState<string>(() => {
    return (publicAppUrl && publicAppUrl.trim()) || '';
  });

  if (!isOpen) return null;

  // Resolve base URL: customUrl if provided, otherwise active browser origin
  const originUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://example.com';
  const activeBaseUrl = (customUrl && customUrl.trim()) ? customUrl.trim().replace(/\/+$/, '') : originUrl.replace(/\/+$/, '');

  const targetUrl = selectedSet === 'all' 
    ? activeBaseUrl 
    : `${activeBaseUrl}?set=${selectedSet}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveUrl = () => {
    if (onSavePublicUrl && customUrl.trim()) {
      onSavePublicUrl(customUrl.trim());
    }
    setShowUrlEdit(false);
  };

  const handleResetToCurrentOrigin = () => {
    setCustomUrl('');
    if (onSavePublicUrl) {
      onSavePublicUrl('');
    }
    setShowUrlEdit(false);
  };

  // High-reliability QR Code Generator API
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
    targetUrl
  )}&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer no-print"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5 no-print flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-2.5 border border-teal-200">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold font-heading text-slate-900">
            ป้าย QR Code สำหรับจุดบริการ
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            พิมพ์ตั้งไว้ที่เคาน์เตอร์บริการ หรือแจกผู้รับบริการเพื่อสแกนผ่านโทรศัพท์มือถือ
          </p>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Set Selector Tabs */}
          <div className="flex flex-wrap gap-1.5 justify-center no-print">
            <button
              onClick={() => setSelectedSet('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedSet === 'all'
                  ? 'bg-teal-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              หน้าหลัก (เลือกชุดเอง)
            </button>
            {FORM_SETS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSet(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedSet === s.id
                    ? 'bg-teal-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ชุดที่ {s.id}
              </button>
            ))}
          </div>

          {/* Printable Card Area */}
          <div className="bg-gradient-to-b from-teal-50/60 to-emerald-50/40 p-6 rounded-2xl border-2 border-teal-200 text-center shadow-inner print-area">
            <div className="text-xs font-semibold text-teal-800 tracking-wider uppercase mb-1">
              สำนักอนามัย กรุงเทพมหานคร
            </div>
            <h4 className="text-base sm:text-lg font-bold font-heading text-slate-900 leading-tight mb-1">
              แบบประเมินความพึงพอใจ
            </h4>
            <p className="text-xs text-slate-600 font-medium mb-4">
              {healthCenterName}
            </p>

            {/* QR Code Container */}
            <div className="w-48 h-48 sm:w-56 sm:h-56 mx-auto bg-white p-3 rounded-2xl shadow-md border border-slate-200 mb-4 flex items-center justify-center">
              <img
                src={qrImageUrl}
                alt="QR Code สำหรับแบบสอบถาม"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-800 text-white text-xs font-semibold mb-2 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>
                {selectedSet === 'all'
                  ? 'สแกนเพื่อเริ่มประเมินความพึงพอใจ'
                  : `แบบประเมินชุดที่ ${selectedSet}: ${FORM_SETS.find((s) => s.id === selectedSet)?.name || ''}`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              เปิดกล้องมือถือหรือแอปพลิเคชัน LINE เพื่อสแกน
            </p>

            {/* URL preview */}
            <div className="mt-3 pt-2 border-t border-teal-100 flex items-center justify-center gap-2">
              <span className="text-[11px] text-slate-500 font-mono truncate max-w-xs block">
                {targetUrl}
              </span>
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-700 hover:text-teal-900 text-[11px] inline-flex items-center gap-0.5 no-print"
                title="ทดสอบเปิดลิงก์"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Optional Domain Customizer (Collapsible) */}
          <div className="no-print text-center">
            {!showUrlEdit ? (
              <button
                type="button"
                onClick={() => setShowUrlEdit(true)}
                className="text-[11px] text-slate-400 hover:text-teal-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                <span>เปลี่ยนโดเมน/URL ปลายทางของ QR Code (สำหรับขึ้นเซิร์ฟเวอร์จริง)</span>
              </button>
            ) : (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-teal-600" />
                    <span>ระบุ URL เว็บไซต์จริง (เช่น https://yourdomain.com):</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleResetToCurrentOrigin}
                    className="text-[10px] text-teal-700 hover:underline cursor-pointer"
                  >
                    ใช้ URL ปัจจุบัน
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-teal-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveUrl}
                    className="px-3 py-1.5 bg-teal-800 text-white rounded-lg text-xs font-bold hover:bg-teal-900 cursor-pointer"
                  >
                    บันทึก
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUrlEdit(false)}
                    className="px-2 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs cursor-pointer"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 mt-4 pt-3 border-t border-slate-100 flex-shrink-0 no-print">
          <button
            onClick={handleCopyLink}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-3 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-semibold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ป้าย QR Code</span>
          </button>
        </div>
      </div>
    </div>
  );
};
