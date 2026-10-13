import React, { useState, useEffect } from 'react';
import { Edit3, X, Save, RotateCcw, Check, Sparkles } from 'lucide-react';
import { CustomQuestionConfig, FormSetId } from '../types/survey';
import { 
  FORM_SETS, 
  SET4_QUESTIONS, 
  SET1_SERVICE_QUESTIONS,
  SET1_WORK_SATISFACTION_QUESTIONS, 
  SET2_HOME_QUESTIONS,
  SET3_COMMUNITY_SERVICES 
} from '../data/surveyQuestions';

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CustomQuestionConfig;
  onSaveConfig: (updated: CustomQuestionConfig) => void;
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [activeSetTab, setActiveSetTab] = useState<FormSetId>(4);
  const [draftConfig, setDraftConfig] = useState<CustomQuestionConfig>(config || {});
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    setDraftConfig(config || {});
  }, [config]);

  if (!isOpen) return null;

  const handleTitleChange = (setId: number, value: string) => {
    setDraftConfig({
      ...draftConfig,
      officialTitles: { ...(draftConfig.officialTitles || {}), [setId]: value },
    });
  };

  const handleCategoryChange = (key: string, value: string) => {
    setDraftConfig({
      ...draftConfig,
      categoryTitles: { ...(draftConfig.categoryTitles || {}), [key]: value },
    });
  };

  const handleQuestionTextChange = (qId: string, value: string) => {
    setDraftConfig({
      ...draftConfig,
      questionTexts: { ...(draftConfig.questionTexts || {}), [qId]: value },
    });
  };

  const handleSave = () => {
    onSaveConfig(draftConfig);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  const handleResetToDefault = () => {
    if (window.confirm('คุณต้องการรีเซ็ตหัวข้อและคำถามทั้งหมดกลับเป็นค่าเริ่มต้นตามต้นฉบับใช่หรือไม่?')) {
      const emptyConfig: CustomQuestionConfig = {
        setNames: {},
        officialTitles: {},
        categoryTitles: {},
        questionTexts: {},
      };
      setDraftConfig(emptyConfig);
      onSaveConfig(emptyConfig);
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 1000);
    }
  };

  const currentSetDef = FORM_SETS.find((s) => s.id === activeSetTab) || FORM_SETS[3];
  const currentTitle = draftConfig.officialTitles?.[activeSetTab] || currentSetDef.officialTitle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center border border-teal-200">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-heading text-slate-900">
                แก้ไขระบบแบบสอบถาม & ปรับแต่งหัวข้อ
              </h3>
              <p className="text-xs text-slate-500">
                แก้ไขหัวข้อและคำถาม โดยระบบจะเชื่อมต่ออัปเดตผลลัพธ์ในหน้าแบบสรุปฟอร์มอัตโนมัติ
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

        {/* Set Selector Tabs */}
        <div className="flex gap-2 pt-3 pb-2 border-b border-slate-100 overflow-x-auto min-w-max">
          {FORM_SETS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSetTab(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSetTab === s.id
                  ? 'bg-teal-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ชุดที่ {s.id}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1 text-xs">
          {/* 1. Official Title Editor */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="block font-bold text-slate-800 mb-1.5">
              ชื่อทางการของแบบสอบถาม (แสดงบนหัวแบบฟอร์มและรายงานสรุป):
            </label>
            <input
              type="text"
              value={currentTitle}
              onChange={(e) => handleTitleChange(activeSetTab, e.target.value)}
              className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* 2. Category Headers Editor */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">
                แก้ไขชื่อหมวดหมู่หลัก (แสดงในตารางสรุปรายงาน):
              </label>
              <span className="text-[11px] text-slate-400">อัปเดตผลลัพธ์ในตารางสรุปรายงานอัตโนมัติ</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                'ความสะดวก รวดเร็ว (เฉลี่ยรวม)',
                'คุณภาพการให้บริการ (เฉลี่ยรวม)',
                'อัธยาศัยและการเอาใจใส่ (เฉลี่ยรวม)',
                'การให้ข้อมูล/คำแนะนำด้านสุขภาพและบริการ (เฉลี่ยรวม)',
                'ค่ายา/ค่าบริการ (เฉลี่ยรวม)',
                'อาคารสถานที่และสิ่งอำนวยความสะดวก (เฉลี่ยรวม)',
              ].map((catKey) => (
                <div key={catKey} className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block mb-1 font-semibold">{catKey}</span>
                  <input
                    type="text"
                    value={draftConfig.categoryTitles?.[catKey] ?? catKey}
                    onChange={(e) => handleCategoryChange(catKey, e.target.value)}
                    className="w-full text-xs p-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 3. Questions List for Active Set */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>รายการคำถามในชุดที่ {activeSetTab} (สามารถแก้ไขข้อความได้):</span>
            </h4>

            {activeSetTab === 4 && (
              <div className="space-y-3">
                {SET4_QUESTIONS.map((sec) => (
                  <div key={sec.category} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <span className="font-bold text-teal-800 block">{sec.category}</span>
                    {sec.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <span className="w-6 text-slate-400 font-bold">{item.no}.</span>
                        <input
                          type="text"
                          value={draftConfig.questionTexts?.[item.id] ?? item.text}
                          onChange={(e) => handleQuestionTextChange(item.id, e.target.value)}
                          className="flex-1 p-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {activeSetTab === 1 && (
              <div className="space-y-4">
                <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-3">
                  <span className="font-bold text-blue-900 block text-xs">ส่วนที่ 1: การให้บริการ 18 ข้อ</span>
                  {SET1_SERVICE_QUESTIONS.map((sec) => (
                    <div key={sec.category} className="p-2.5 bg-white rounded-lg border border-blue-100 space-y-2">
                      <span className="font-bold text-blue-800 text-[11px] block">{sec.category}</span>
                      {sec.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <span className="w-6 text-slate-400 font-bold">{item.no}.</span>
                          <input
                            type="text"
                            value={draftConfig.questionTexts?.[item.id] ?? item.text}
                            onChange={(e) => handleQuestionTextChange(item.id, e.target.value)}
                            className="flex-1 p-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200">
                  <span className="font-bold text-blue-900 block mb-2 text-xs">ส่วนที่ 2: ความพึงพอใจในการทำงาน 14 ข้อ</span>
                  <div className="p-2.5 bg-white rounded-lg border border-blue-100 space-y-2">
                    {SET1_WORK_SATISFACTION_QUESTIONS.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <span className="w-6 text-blue-700 font-bold">{item.no}.</span>
                        <input
                          type="text"
                          value={draftConfig.questionTexts?.[item.id] ?? item.text}
                          onChange={(e) => handleQuestionTextChange(item.id, e.target.value)}
                          className="flex-1 p-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSetTab === 2 && (
              <div className="space-y-3">
                {SET2_HOME_QUESTIONS.map((sec) => (
                  <div key={sec.category} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <span className="font-bold text-emerald-800 block">{sec.category}</span>
                    {sec.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <span className="w-6 text-slate-400 font-bold">{item.no}.</span>
                        <input
                          type="text"
                          value={draftConfig.questionTexts?.[item.id] ?? item.text}
                          onChange={(e) => handleQuestionTextChange(item.id, e.target.value)}
                          className="flex-1 p-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {activeSetTab === 3 && (
              <div className="space-y-4">
                <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200 space-y-3">
                  <span className="font-bold text-purple-900 block text-xs">ส่วนที่ 1: การประเมินการบริการ ณ ศูนย์บริการสาธารณสุข 18 ข้อ</span>
                  {SET4_QUESTIONS.map((sec) => (
                    <div key={sec.category} className="p-2.5 bg-white rounded-lg border border-purple-100 space-y-2">
                      <span className="font-bold text-purple-800 text-[11px] block">{sec.category}</span>
                      {sec.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <span className="w-6 text-slate-400 font-bold">{item.no}.</span>
                          <input
                            type="text"
                            value={draftConfig.questionTexts?.[item.id] ?? item.text}
                            onChange={(e) => handleQuestionTextChange(item.id, e.target.value)}
                            className="flex-1 p-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200">
                  <span className="font-bold text-purple-900 block mb-2 text-xs">ส่วนที่ 2: บริการสาธารณสุขในชุมชน 15 ข้อ</span>
                  <div className="p-2.5 bg-white rounded-lg border border-purple-100 space-y-2">
                    {SET3_COMMUNITY_SERVICES.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <span className="w-6 text-purple-700 font-bold">{item.no}.</span>
                        <input
                          type="text"
                          value={draftConfig.questionTexts?.[item.id] ?? item.text}
                          onChange={(e) => handleQuestionTextChange(item.id, e.target.value)}
                          className="flex-1 p-2 bg-slate-50 hover:bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-2 text-rose-700 hover:bg-rose-50 rounded-xl font-semibold text-xs border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่าเริ่มต้น</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{isSaved ? 'บันทึกเรียบร้อย' : 'บันทึกการแก้ไข'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
