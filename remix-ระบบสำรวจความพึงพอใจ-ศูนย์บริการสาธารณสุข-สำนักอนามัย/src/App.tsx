import React, { useState, useEffect } from 'react';
import { FormSetId, SurveySubmissionPayload, AppSettings, CustomQuestionConfig } from './types/survey';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { SurveyForm } from './components/SurveyForm';
import { SuccessPage } from './components/SuccessPage';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';
import { GoogleAppsScriptGuide } from './components/GoogleAppsScriptGuide';
import { GoogleSheetsExportModal } from './components/GoogleSheetsExportModal';
import { QrCodeModal } from './components/QrCodeModal';
import { LoginModal } from './components/LoginModal';
import { PasscodeModal } from './components/PasscodeModal';

export const APP_SYSTEM_VERSION = 'v2026.10.13.v8-direct-sync-protected';

export default function App() {
  const [currentView, setCurrentView] = useState<'survey' | 'dashboard' | 'admin' | 'gasGuide'>('survey');
  const [selectedFormSet, setSelectedFormSet] = useState<FormSetId | null>(null);
  const [lastSubmission, setLastSubmission] = useState<SurveySubmissionPayload | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState<boolean>(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Statistics report access: Strictly password-protected popup
  const [isReportUnlocked, setIsReportUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('health_survey_report_unlocked') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Administrator authentication: Exclusively for User: b12, Password: 13685hc40hc
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      const token = localStorage.getItem('health_survey_admin_token');
      return token === 'authenticated_admin_b12';
    } catch (e) {
      return false;
    }
  });

  // Custom question headers configuration state
  const [customConfig, setCustomConfig] = useState<CustomQuestionConfig>(() => {
    try {
      const saved = localStorage.getItem('health_survey_custom_questions');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  // Submissions state: Single source of truth is the SERVER DATABASE.
  const [submissions, setSubmissions] = useState<SurveySubmissionPayload[]>([]);

  // Settings state (Center 40 Bang Khae)
  const [settings, setSettings] = useState<AppSettings>({
    healthCenterName: 'ศูนย์บริการสาธารณสุข 40 บางแค',
    departmentName: 'สำนักอนามัย กรุงเทพมหานคร',
    gasWebhookUrl: '',
    forwardToGas: true,
  });

  // Function to refresh authoritative data from server with aggressive cache busting
  const refreshDataFromServer = async (showToast = false) => {
    setIsRefreshing(true);
    try {
      // Purge any stale legacy responses from localStorage
      try {
        localStorage.removeItem('health_survey_responses');
        localStorage.removeItem('health_survey_responses_v2');
        localStorage.removeItem('health_survey_responses_v3');
        localStorage.removeItem('health_survey_cache_version');
      } catch (e) {}

      const timestamp = Date.now();
      const res = await fetch(`/api/survey/responses?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        setSubmissions(json.data);
        setLastSyncTime(new Date());
        if (showToast) {
          setSyncNotice(`ซิงค์ข้อมูลล่าสุดแล้ว: ทั้งหมด ${json.data.length} รายการ`);
          setTimeout(() => setSyncNotice(null), 3500);
        }
      }
    } catch (err) {
      console.warn('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Real-time synchronization across devices (PC, Mobile, Tablet)
  useEffect(() => {
    // 0. Enforce total purge of stale responses and broken ais-pre- from local storage
    try {
      localStorage.removeItem('health_survey_responses');
      localStorage.removeItem('health_survey_responses_v2');
      localStorage.removeItem('health_survey_responses_v3');
      localStorage.removeItem('health_survey_cache_version');
      const savedUrl = localStorage.getItem('health_survey_public_url');
      if (savedUrl && savedUrl.includes('ais-pre-')) {
        localStorage.removeItem('health_survey_public_url');
      }
    } catch (e) {}

    // 1. Check URL parameters for direct survey set links (e.g. ?set=3)
    const params = new URLSearchParams(window.location.search);
    const setParam = params.get('set');
    if (setParam) {
      const parsedSet = parseInt(setParam, 10) as FormSetId;
      if ([1, 2, 3, 4].includes(parsedSet)) {
        setSelectedFormSet(parsedSet);
        setCurrentView('survey');
      }
    }

    // 2. Load custom question configurations from server
    fetch(`/api/survey/config?_t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setCustomConfig(data);
          try {
            localStorage.setItem('health_survey_custom_questions', JSON.stringify(data));
          } catch (e) {}
        }
      })
      .catch(() => {});

    // 3. Load settings from server
    fetch(`/api/survey/settings?_t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data) setSettings((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});

    // 4. Initial load authoritative responses from database
    refreshDataFromServer();

    // 5. Connect to Server-Sent Events (SSE) for zero-latency real-time updates
    let eventSource: EventSource | null = null;
    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/survey/events');
        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'SURVEYS_UPDATED' && Array.isArray(payload.data)) {
              setSubmissions(payload.data);
              setLastSyncTime(new Date());
            } else if (payload.type === 'CONFIG_UPDATED' && payload.data) {
              setCustomConfig(payload.data);
              try {
                localStorage.setItem('health_survey_custom_questions', JSON.stringify(payload.data));
              } catch (e) {}
            } else if (payload.type === 'SETTINGS_UPDATED' && payload.data) {
              setSettings((prev) => ({ ...prev, ...payload.data }));
            }
          } catch (err) {}
        };

        eventSource.onerror = () => {
          eventSource?.close();
          setTimeout(connectSSE, 4000);
        };
      } catch (e) {
        console.warn('SSE connection warning:', e);
      }
    };

    connectSSE();

    // 6. Mobile lifecycle events (Safari bfcache, screen unlock, tab switch)
    const handleReSync = () => {
      refreshDataFromServer();
    };

    window.addEventListener('focus', handleReSync);
    window.addEventListener('pageshow', handleReSync);
    window.addEventListener('online', handleReSync);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleReSync();
      }
    });

    // 7. Automated background sync interval (Continuous zero-click live updates)
    const autoSyncInterval = setInterval(() => {
      refreshDataFromServer(false);
    }, 5000);

    return () => {
      eventSource?.close();
      clearInterval(autoSyncInterval);
      window.removeEventListener('focus', handleReSync);
      window.removeEventListener('pageshow', handleReSync);
      window.removeEventListener('online', handleReSync);
    };
  }, []);

  // Handle survey submission success (Direct Save + Auto Sync to Google Sheets)
  const handleSubmissionSuccess = (payload: SurveySubmissionPayload) => {
    setSubmissions((prev) => {
      const exists = prev.some((p) => p.id === payload.id);
      if (exists) return prev;
      return [payload, ...prev];
    });
    setLastSubmission(payload);
    refreshDataFromServer();
  };

  // Handle logout
  const handleLogout = () => {
    try {
      localStorage.removeItem('health_survey_admin_token');
      sessionStorage.removeItem('health_survey_report_unlocked');
    } catch (e) {}
    setIsAdminAuthenticated(false);
    setIsReportUnlocked(false);
    setCurrentView('survey');
  };

  // Handle locking report page
  const handleLockReport = () => {
    try {
      sessionStorage.removeItem('health_survey_report_unlocked');
    } catch (e) {}
    setIsReportUnlocked(false);
    setCurrentView('survey');
  };

  // Handle saving custom questions configuration
  const handleSaveCustomConfig = async (cfg: CustomQuestionConfig) => {
    setCustomConfig(cfg);
    try {
      localStorage.setItem('health_survey_custom_questions', JSON.stringify(cfg));
      await fetch('/api/survey/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
    } catch (e) {}
  };

  // Handle saving GAS settings
  const handleSaveGasSettings = async (url: string, enabled: boolean) => {
    const updated = { ...settings, gasWebhookUrl: url, forwardToGas: enabled };
    setSettings(updated);
    try {
      await fetch('/api/survey/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (e) {}
  };

  // Delete data by target set or all (Admin confirmed only)
  const handleDeleteTarget = async (target: 'all' | FormSetId) => {
    if (target === 'all') {
      try {
        await fetch('/api/survey/clear', { method: 'POST' });
        await refreshDataFromServer(true);
      } catch (e) {
        setSubmissions([]);
      }
    } else {
      try {
        await fetch('/api/survey/delete-set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ form_set: target }),
        });
        await refreshDataFromServer(true);
      } catch (e) {
        setSubmissions((prev) => prev.filter((s) => s.form_set !== target));
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-teal-600 selection:text-white">
      {/* Navigation Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'survey') {
            setCurrentView('survey');
            setLastSubmission(null);
          } else if (view === 'dashboard') {
            if (isReportUnlocked || isAdminAuthenticated) {
              refreshDataFromServer();
              setCurrentView('dashboard');
            } else {
              setIsPasscodeModalOpen(true);
            }
          } else if (view === 'admin') {
            if (isAdminAuthenticated) {
              refreshDataFromServer();
              setCurrentView('admin');
            } else {
              setIsLoginModalOpen(true);
            }
          }
        }}
        selectedFormSet={selectedFormSet}
        onResetToLanding={() => {
          setSelectedFormSet(null);
          setLastSubmission(null);
          setCurrentView('survey');
        }}
        totalResponsesCount={submissions.length}
        onOpenPasscodeModal={() => setIsPasscodeModalOpen(true)}
        healthCenterName={settings.healthCenterName}
        isAdminAuthenticated={isAdminAuthenticated}
        isReportUnlocked={isReportUnlocked}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        onLogout={handleLogout}
        isRefreshing={isRefreshing}
        lastSyncTime={lastSyncTime}
      />

      {/* Real-time Status Bar (Continuous Zero-Click Live Auto-Sync) */}
      <div className="bg-teal-950 text-white text-[11px] sm:text-xs py-1.5 px-3 sm:px-6 flex items-center justify-between no-print border-b border-teal-800 shadow-inner">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="flex h-2 w-2 relative flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-medium text-emerald-200 truncate">
            ฐานข้อมูลเรียลไทม์ (Live DB): บันทึกแล้ว <strong className="text-white">{submissions.length}</strong> ราย | ซิงค์อัตโนมัติเข้า Google Sheets ทุกครั้งที่ส่งแบบสอบถาม (ไม่ต้องกดปุ่ม)
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 text-emerald-300 text-[10px] sm:text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>ซิงค์อัตโนมัติทำงาน</span>
        </div>
      </div>

      {/* Sync Toast Feedback */}
      {syncNotice && (
        <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900/95 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-2">
          <span className="text-emerald-400 text-base">✅</span>
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {/* VIEW 1: SURVEY FLOW */}
        {currentView === 'survey' && (
          <>
            {lastSubmission ? (
              <SuccessPage
                submission={lastSubmission}
                onReset={() => {
                  setLastSubmission(null);
                  setSelectedFormSet(null);
                }}
                onViewDashboard={() => {
                  if (isReportUnlocked || isAdminAuthenticated) {
                    refreshDataFromServer();
                    setLastSubmission(null);
                    setCurrentView('dashboard');
                  } else {
                    setIsPasscodeModalOpen(true);
                  }
                }}
                healthCenterName={settings.healthCenterName}
              />
            ) : selectedFormSet ? (
              <SurveyForm
                formSetId={selectedFormSet}
                onBack={() => setSelectedFormSet(null)}
                onSubmitSuccess={handleSubmissionSuccess}
                gasWebhookUrl={settings.gasWebhookUrl}
                forwardToGas={settings.forwardToGas}
                defaultHealthCenter={settings.healthCenterName}
                customConfig={customConfig}
              />
            ) : (
              <LandingPage
                onSelectSet={(setId) => setSelectedFormSet(setId)}
                onViewDashboard={() => {
                  if (isReportUnlocked || isAdminAuthenticated) {
                    refreshDataFromServer();
                    setCurrentView('dashboard');
                  } else {
                    setIsPasscodeModalOpen(true);
                  }
                }}
                healthCenterName={settings.healthCenterName}
                isAdminAuthenticated={isAdminAuthenticated}
                isReportUnlocked={isReportUnlocked}
                onOpenPasscodeModal={() => setIsPasscodeModalOpen(true)}
                onOpenLoginModal={() => setIsLoginModalOpen(true)}
              />
            )}
          </>
        )}

        {/* VIEW 2: DASHBOARD (Accessible with Passcode or Admin) */}
        {currentView === 'dashboard' && (isReportUnlocked || isAdminAuthenticated) && (
          <Dashboard
            submissions={submissions}
            healthCenterName={settings.healthCenterName}
            customConfig={customConfig}
            onSaveCustomConfig={handleSaveCustomConfig}
            lastSyncTime={lastSyncTime}
            onNavigateToAdmin={() => {
              if (isAdminAuthenticated) {
                setCurrentView('admin');
              } else {
                setIsLoginModalOpen(true);
              }
            }}
            onLockReport={handleLockReport}
          />
        )}

        {/* VIEW 3: ADMINISTRATOR PAGE (Exclusively for User: b12, Pass: 13685hc40hc) */}
        {currentView === 'admin' && isAdminAuthenticated && (
          <AdminPanel
            submissions={submissions}
            settings={settings}
            onSaveSettings={handleSaveGasSettings}
            onSaveFullSettings={(updated) => setSettings((prev) => ({ ...prev, ...updated }))}
            onDeleteTarget={handleDeleteTarget}
            onRefreshData={() => refreshDataFromServer(false)}
            onOpenGoogleSheetsModal={() => setIsGoogleSheetsModalOpen(true)}
            onBackToDashboard={() => setCurrentView('dashboard')}
            onLogout={handleLogout}
            onOpenQrModal={() => setIsQrModalOpen(true)}
          />
        )}

        {/* VIEW 4: GOOGLE APPS SCRIPT GUIDE & SETTINGS (Requires Admin Login) */}
        {currentView === 'gasGuide' && isAdminAuthenticated && (
          <GoogleAppsScriptGuide
            gasWebhookUrl={settings.gasWebhookUrl}
            forwardToGas={settings.forwardToGas}
            onSaveSettings={handleSaveGasSettings}
          />
        )}
      </main>

      {/* Footer: "โปรแกรมนี้จัดทำโดย ไอที ศูนย์บริการสาธารณสุข 40 บางแค" */}
      <footer className="bg-slate-900 text-slate-300 text-xs py-5 border-t border-slate-800 text-center no-print">
        <div className="max-w-6xl mx-auto px-4">
          <p className="font-semibold text-sm sm:text-base text-slate-200 tracking-wide">
            โปรแกรมนี้จัดทำโดย ไอที ศูนย์บริการสาธารณสุข 40 บางแค
          </p>
        </div>
      </footer>

      {/* QR Code Modal */}
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        healthCenterName={settings.healthCenterName}
        publicAppUrl={settings.publicAppUrl}
        onSavePublicUrl={(url) => {
          setSettings((prev) => ({ ...prev, publicAppUrl: url }));
          fetch('/api/survey/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicAppUrl: url }),
          }).catch(() => {});
        }}
      />

      {/* Passcode Modal for Statistics Report Access (Code: 13685) */}
      <PasscodeModal
        isOpen={isPasscodeModalOpen}
        onClose={() => setIsPasscodeModalOpen(false)}
        onSuccess={() => {
          setIsReportUnlocked(true);
          refreshDataFromServer();
          setCurrentView('dashboard');
        }}
      />

      {/* Admin Login Modal (user: b12, pass: 13685hc40hc) */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={() => {
          setIsAdminAuthenticated(true);
          setIsReportUnlocked(true);
          refreshDataFromServer(false);
          setCurrentView('admin');
        }}
        onOpenQrModal={() => setIsQrModalOpen(true)}
      />

      {/* Google Sheets / Drive Export Modal for Administrator */}
      <GoogleSheetsExportModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        submissions={submissions}
        healthCenterName={settings.healthCenterName}
      />
    </div>
  );
}
