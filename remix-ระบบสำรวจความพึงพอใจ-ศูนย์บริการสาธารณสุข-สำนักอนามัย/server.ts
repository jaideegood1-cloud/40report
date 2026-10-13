import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { runServerRecovery } from './server-recovery';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'surveys.json');
const ARCHIVE_FILE = path.join(DATA_DIR, 'surveys_archive.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const WAL_FILE = path.join(DATA_DIR, 'surveys_wal.jsonl');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const SERVER_BUILD_VERSION = '2026.10.13.v7-resilient-append-only';

app.use(express.json({ limit: '10mb' }));

// Aggressive cache prevention for all clients (Mobile Safari, Chrome, LINE browser)
app.use((_req: Request, res: Response, next) => {
  const origSetHeader = res.setHeader.bind(res);
  res.setHeader = (key: string, val: any) => {
    if (key.toLowerCase() === 'cache-control') {
      return origSetHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
    }
    return origSetHeader(key, val);
  };
  origSetHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
  origSetHeader('Pragma', 'no-cache');
  origSetHeader('Expires', '0');
  origSetHeader('Surrogate-Control', 'no-store');
  next();
});

// Ensure data and backup directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// In-memory fallback / cache
interface SurveyItem {
  id: string;
  timestamp: string;
  form_set: number;
  form_set_name?: string;
  header_info?: {
    survey_no?: string;
    survey_month?: string;
    survey_year?: string;
    health_center_no?: string;
    community_name?: string;
  };
  personal_info?: any;
  ratings?: { [key: string]: number };
  other_suggestions?: string;
  work_ratings?: { [key: string]: number };
  work_support_needed?: string;
  work_suggestions_other?: string;
  comm_ratings?: { [key: string]: number };
  is_demo?: boolean;
  [key: string]: any;
}

interface AppSettings {
  healthCenterName: string;
  departmentName: string;
  gasWebhookUrl: string;
  forwardToGas: boolean;
  publicAppUrl?: string;
}

interface GasSyncLogItem {
  id: string;
  submissionId: string;
  formSet: number;
  timestamp: string;
  status: 'success' | 'failed' | 'skipped';
  httpStatus?: number;
  message?: string;
}

let surveysCache: SurveyItem[] = [];
let lastClearedAt: number | null = null;
let gasSyncLogs: GasSyncLogItem[] = [];
let settingsCache: AppSettings = {
  healthCenterName: 'ศูนย์บริการสาธารณสุข 40 บางแค',
  departmentName: 'สำนักอนามัย กรุงเทพมหานคร',
  gasWebhookUrl: '',
  forwardToGas: true,
  publicAppUrl: '',
};
let customConfigCache: any = {};

// SSE Connected Clients for Real-Time Sync
const sseClients: Set<Response> = new Set();

function broadcastEvent(event: { type: string; data?: any }) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Multi-Tier Archive Sync (Mirrors current active database)
function syncToArchive(items: SurveyItem[]) {
  try {
    fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to sync to archive:', err);
  }
}

// Sync current items to WAL journal
function syncWAL(items: SurveyItem[]) {
  try {
    const content = items.map((item) => JSON.stringify(item)).join('\n') + (items.length > 0 ? '\n' : '');
    fs.writeFileSync(WAL_FILE, content, 'utf-8');
  } catch (err) {
    console.warn('Failed to sync WAL:', err);
  }
}

// Self-healing recovery engine: recovers from archive, backup vaults, or WAL only when database file is corrupted/missing
function trySelfHealSurveys(): number {
  if (surveysCache.length > 0) return surveysCache.length;

  // 1. Try reading active DATA_FILE
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        surveysCache = parsed;
        return surveysCache.length;
      }
    }
  } catch {}

  // 2. Try immutable ARCHIVE_FILE
  try {
    if (fs.existsSync(ARCHIVE_FILE)) {
      const raw = fs.readFileSync(ARCHIVE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        surveysCache = parsed;
        persistSurveys();
        console.log(`[Auto-Recovery] Self-healed ${surveysCache.length} records from immutable archive.`);
        return surveysCache.length;
      }
    }
  } catch {}

  // 3. Try latest backup snapshots
  try {
    if (fs.existsSync(BACKUP_DIR)) {
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('surveys_') && f.endsWith('.json'))
        .sort()
        .reverse();
      for (const f of files) {
        try {
          const raw = fs.readFileSync(path.join(BACKUP_DIR, f), 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            surveysCache = parsed;
            persistSurveys();
            syncToArchive(surveysCache);
            console.log(`[Auto-Recovery] Self-healed ${surveysCache.length} records from backup snapshot: ${f}.`);
            return surveysCache.length;
          }
        } catch {}
      }
    }
  } catch {}

  return surveysCache.length;
}

// Load initial data from disk
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      surveysCache = parsed;
    }
  } else {
    trySelfHealSurveys();
  }
} catch (e) {
  console.warn('Could not read surveys file:', e);
  trySelfHealSurveys();
}

// Check WAL file and merge any uncompacted submissions if database was unexpectedly missing
try {
  if (fs.existsSync(WAL_FILE) && surveysCache.length === 0) {
    const lines = fs.readFileSync(WAL_FILE, 'utf-8').split('\n').filter(Boolean);
    const existingIds = new Set(surveysCache.map(s => s.id));
    let recoveredCount = 0;
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        const item = (parsed.item || parsed) as SurveyItem;
        if (item && item.id && !existingIds.has(item.id)) {
          surveysCache.push(item);
          existingIds.add(item.id);
          recoveredCount++;
        }
      } catch {}
    }
    if (recoveredCount > 0) {
      console.log(`[WAL Recovery] Recovered ${recoveredCount} submissions from WAL journal.`);
      persistSurveys();
    }
  }
} catch (e) {
  console.warn('Error checking WAL file:', e);
}

try {
  if (fs.existsSync(SETTINGS_FILE)) {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    settingsCache = { ...settingsCache, ...JSON.parse(raw) };
  }
} catch (e) {
  console.warn('Could not read settings file:', e);
}

try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    customConfigCache = JSON.parse(raw);
  }
} catch (e) {
  console.warn('Could not read config file:', e);
}

// Append a real survey item immediately to WAL journal
function appendToWAL(item: SurveyItem) {
  try {
    fs.appendFileSync(WAL_FILE, JSON.stringify(item) + '\n', 'utf-8');
  } catch (err) {
    console.warn('Failed to append to WAL:', err);
  }
}

// Create a timestamped backup snapshot before any action or after submissions
function createBackupSnapshot(reason: string = 'snapshot') {
  try {
    if (surveysCache.length === 0) return;
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `surveys_${dateStr}_${reason}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(surveysCache, null, 2), 'utf-8');

    // Keep up to 50 latest snapshots
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('surveys_') && f.endsWith('.json'))
      .sort();
    if (files.length > 50) {
      for (let i = 0; i < files.length - 50; i++) {
        try { fs.unlinkSync(path.join(BACKUP_DIR, files[i])); } catch {}
      }
    }
  } catch (err) {
    console.warn('Failed to create backup snapshot:', err);
  }
}

function persistSurveys() {
  try {
    const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(surveysCache, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
    // Also guarantee archive is updated
    syncToArchive(surveysCache);
  } catch (err) {
    console.warn('Failed to persist surveys atomically, fallback to direct write:', err);
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(surveysCache, null, 2), 'utf-8');
      syncToArchive(surveysCache);
    } catch (innerErr) {
      console.error('Critical failure writing surveys:', innerErr);
    }
  }
}

function persistSettings() {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsCache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to persist settings:', err);
  }
}

function persistConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(customConfigCache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to persist config:', err);
  }
}

// Real-Time Server-Sent Events Endpoint
app.get('/api/survey/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Send initial event
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', count: surveysCache.length })}\n\n`);
  sseClients.add(res);

  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeatTimer);
      sseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    sseClients.delete(res);
  });
});

// Custom Question Configuration Endpoints (syncs across PC & mobile)
app.get('/api/survey/config', (_req: Request, res: Response) => {
  res.json(customConfigCache);
});

app.post('/api/survey/config', (req: Request, res: Response) => {
  customConfigCache = req.body || {};
  persistConfig();
  broadcastEvent({ type: 'CONFIG_UPDATED', data: customConfigCache });
  res.json({ success: true, config: customConfigCache });
});

// Settings Endpoints
app.get('/api/survey/settings', (_req: Request, res: Response) => {
  res.json(settingsCache);
});

app.post('/api/survey/settings', (req: Request, res: Response) => {
  const { healthCenterName, departmentName, gasWebhookUrl, forwardToGas, publicAppUrl } = req.body;
  if (healthCenterName !== undefined) settingsCache.healthCenterName = healthCenterName;
  if (departmentName !== undefined) settingsCache.departmentName = departmentName;
  if (gasWebhookUrl !== undefined) settingsCache.gasWebhookUrl = gasWebhookUrl;
  if (forwardToGas !== undefined) settingsCache.forwardToGas = forwardToGas;
  if (publicAppUrl !== undefined) settingsCache.publicAppUrl = publicAppUrl;
  persistSettings();
  broadcastEvent({ type: 'SETTINGS_UPDATED', data: settingsCache });

  // If a new Webhook URL is supplied and user has not performed explicit clear, auto-check restore
  if (gasWebhookUrl?.trim() && !lastClearedAt) {
    restoreFromGoogleSheets(gasWebhookUrl).catch((err) => {
      console.warn('Background restore check failed:', err);
    });
  }

  res.json({ success: true, settings: settingsCache });
});

// Network information endpoint for mobile QR Code generation & LAN detection
app.get('/api/survey/network-info', (_req: Request, res: Response) => {
  const networkInterfaces = os.networkInterfaces();
  const lanUrls: string[] = [];
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        lanUrls.push(`http://${net.address}:${PORT}`);
      }
    }
  }
  res.json({
    success: true,
    appUrl: process.env.APP_URL || '',
    publicAppUrl: settingsCache.publicAppUrl || process.env.APP_URL || '',
    lanUrls,
    port: PORT,
  });
});

// System version and health status endpoint
app.get('/api/survey/version', (_req: Request, res: Response) => {
  const realCount = surveysCache.filter(s => !s.is_demo && !s.id?.startsWith('DEMO-')).length;
  const demoCount = surveysCache.filter(s => s.is_demo || s.id?.startsWith('DEMO-')).length;
  res.json({
    version: SERVER_BUILD_VERSION,
    timestamp: Date.now(),
    lastClearedAt,
    total: surveysCache.length,
    realCount,
    demoCount,
    activeSseClients: sseClients.size,
  });
});

// Responses Endpoints
app.get('/api/survey/responses', (req: Request, res: Response) => {
  const { form_set } = req.query;
  let result = surveysCache;
  if (form_set && form_set !== 'all') {
    const setNum = parseInt(form_set as string, 10);
    result = result.filter(s => s.form_set === setNum);
  }
  const realCount = result.filter(s => !s.is_demo && !s.id?.startsWith('DEMO-')).length;
  const demoCount = result.filter(s => s.is_demo || s.id?.startsWith('DEMO-')).length;
  res.json({
    success: true,
    version: SERVER_BUILD_VERSION,
    lastClearedAt,
    count: result.length,
    realCount,
    demoCount,
    data: result
  });
});

// Google Sheets Auto-Restore Functionality
async function restoreFromGoogleSheets(webhookUrl?: string): Promise<{ restored: number; total: number }> {
  const targetUrl = (webhookUrl || settingsCache.gasWebhookUrl || '').trim();
  if (!targetUrl) return { restored: 0, total: surveysCache.length };
  try {
    const url = targetUrl.includes('?') 
      ? `${targetUrl}&action=load_all&_t=${Date.now()}` 
      : `${targetUrl}?action=load_all&_t=${Date.now()}`;
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resp.ok) return { restored: 0, total: surveysCache.length };
    const json: any = await resp.json().catch(() => null);
    if (!json) return { restored: 0, total: surveysCache.length };
    const records: any[] = json.records || json.items || [];
    if (!Array.isArray(records)) return { restored: 0, total: surveysCache.length };

    let restoredCount = 0;
    const existingIds = new Set(surveysCache.map((s) => s.id));
    for (const rec of records) {
      let item: SurveyItem | null = null;
      if (rec._raw_json) {
        try {
          item = JSON.parse(rec._raw_json);
        } catch {}
      } else if (rec.id && rec.form_set) {
        item = rec;
      }
      if (item && item.id && !existingIds.has(item.id)) {
        if (!item.is_demo && !item.id.startsWith('DEMO-') && !item.id.startsWith('SRV-TEST')) {
          surveysCache.push(item);
          existingIds.add(item.id);
          restoredCount++;
        }
      }
    }

    if (restoredCount > 0) {
      persistSurveys();
      syncWAL(surveysCache);
      broadcastEvent({ type: 'SURVEYS_UPDATED', data: surveysCache });
      console.log(`[Google Sheets Auto-Restore] Successfully restored ${restoredCount} records from Google Sheets.`);
    }
    return { restored: restoredCount, total: surveysCache.length };
  } catch (err) {
    console.warn('Auto restore from Google Sheets encountered an error:', err);
    return { restored: 0, total: surveysCache.length };
  }
}

// Endpoint to manually or automatically restore from Google Sheets
app.post('/api/survey/restore-from-gas', async (req: Request, res: Response) => {
  try {
    const { webhookUrl } = req.body || {};
    const result = await restoreFromGoogleSheets(webhookUrl);
    res.json({ success: true, count: result.restored, total: result.total });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to calculate category average score from given question keys
function calculateCategoryAvg(ratings: Record<string, number | undefined>, keys: string[]): number | string {
  const vals = keys.map(k => ratings[k]).filter((v): v is number => typeof v === 'number');
  if (vals.length === 0) return '';
  return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
}

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

// Question Thai title mapping matching the official evaluation table
const QUESTION_THAI_TITLES: Record<number, string> = {
  1: 'ความรวดเร็วในขั้นตอนการรับบริการ',
  2: 'ระบบคิวการให้บริการตามลำดับ',
  3: 'การรับบริการที่ห้องจ่ายยาสะดวกรวดเร็ว',
  4: 'เครื่องมืออุปกรณ์เพียงพอสะอาดพร้อมใช้',
  5: 'เจ้าหน้าที่มีความรู้ความสามารถ',
  6: 'ความสามารถของแพทย์ในการตรวจรักษา',
  7: 'เจ้าหน้าที่ยิ้มแย้มแจ่มใส',
  8: 'เจ้าหน้าที่ให้ความสนใจเอาใจใส่',
  9: 'เจ้าหน้าที่มีกริยาวาจาสุภาพ',
  10: 'ได้รับข้อมูลการรักษาตรงความต้องการ',
  11: 'ได้รับคำแนะนำวิธีการใช้ยาชัดเจน',
  12: 'ศูนย์มีสื่อเอกสารให้ความรู้เพียงพอ',
  13: 'พอใจในค่ายาและค่าบริการ',
  14: 'บริการคุ้มค่ากับค่าใช้จ่าย',
  15: 'สถานที่ให้บริการเป็นสัดส่วนสะดวก',
  16: 'อาคารสถานที่สิ่งแวดล้อมปลอดภัย',
  17: 'อาคารสถานที่สะอาดเป็นระเบียบ',
  18: 'มีป้ายหรือเครื่องหมายแสดงทิศทางชัดเจน'
};

const WORK_THAI_TITLES: Record<number, string> = {
  1: 'ความสำเร็จที่ได้รับจากการทำงาน',
  2: 'การได้รับการยอมรับจากผู้ร่วมงาน',
  3: 'ลักษณะงานที่ปฏิบัติ',
  4: 'สามารถตัดสินใจเกี่ยวกับการปฏิบัติงานด้วยตนเอง',
  5: 'ได้รับการพัฒนาความรู้และทักษะใหม่',
  6: 'ค่าตอบแทนและสวัสดิการที่ได้รับ',
  7: 'การบริหารจัดการของหน่วยงาน',
  8: 'ความยุติธรรมที่ได้รับจากผู้บังคับบัญชา',
  9: 'ความมั่นคงในหน้าที่การงาน',
  10: 'ความสัมพันธ์ระหว่างเพื่อนร่วมงาน',
  11: 'สภาพแวดล้อมทางกายภาพของสถานที่ทำงาน',
  12: 'โอกาสความก้าวหน้าในหน้าที่การงาน',
  13: 'ตำแหน่งหน้าที่เป็นที่ยอมรับของสังคม',
  14: 'งานที่ทำมีผลต่อการดำเนินชีวิต'
};

const HOME_THAI_TITLES: Record<number, string> = {
  1: 'ความสะดวกในการรับบริการที่บ้าน',
  2: 'ได้รับบริการที่บ้านตรงตามความต้องการ',
  3: 'พอใจการประสานงานส่งต่อผู้ป่วย',
  4: 'เครื่องมืออุปกรณ์บริการที่บ้านเพียงพอสะอาด',
  5: 'เจ้าหน้าที่มีความรู้ความสามารถ',
  6: 'เจ้าหน้าที่ยิ้มแย้มแจ่มใส',
  7: 'เจ้าหน้าที่ให้ความสนใจเอาใจใส่',
  8: 'เจ้าหน้าที่มีกริยาวาจาสุภาพ',
  9: 'ได้รับข้อมูลการรักษาตรงความต้องการ',
  10: 'ได้รับคำแนะนำการดูแลผู้ป่วยชัดเจน',
  11: 'ศูนย์มีสื่อเอกสารให้ความรู้เพียงพอ',
  12: 'พอใจต่อบริการดูแลผู้ป่วยที่บ้าน'
};

const COMM_THAI_TITLES: Record<number, string> = {
  1: 'การให้ความรู้ด้านสุขภาพในชุมชน',
  2: 'การดูแลอาหารให้เหมาะสมกับวัย',
  3: 'การชั่งน้ำหนักส่วนสูงเด็ก',
  4: 'การดูแลสุขภาพแม่และเด็กวางแผนครอบครัว',
  5: 'การให้วัคซีนภูมิคุ้มกันโรคในชุมชน',
  6: 'ป้องกันและควบคุมโรคกำจัดลูกน้ำยุงลาย',
  7: 'การจัดหาน้ำสะอาดและการจัดการขยะ',
  8: 'การรักษาพยาบาลเบื้องต้นที่บ้าน',
  9: 'การจัดหายามาประจำศูนย์สุขภาพชุมชน',
  10: 'การดูแลทันตกรรมช่องปากในชุมชน',
  11: 'การตรวจสุขภาพจิตในชุมชน',
  12: 'การป้องกันอุบัติเหตุและโรคไม่ติดต่อ',
  13: 'การคุ้มครองผู้บริโภคอาหารและยา',
  14: 'การป้องกันโรคติดต่อและเอดส์',
  15: 'การป้องกันปัญหาสิ่งแวดล้อมมลภาวะ'
};

// Helper to flatten survey payload into clean Thai columns for Google Sheets (strictly isolated per set, zero foreign columns)
function formatPayloadForGoogleSheets(payload: SurveyItem): Record<string, any> {
  const p = payload.personal_info || {};
  const h = payload.header_info || {};
  const r = payload.ratings || {};
  const wr = payload.work_ratings || {};
  const cr = payload.comm_ratings || {};

  const allRatings: number[] = [
    ...Object.values(r),
    ...Object.values(wr),
    ...Object.values(cr),
  ].filter((v): v is number => typeof v === 'number');

  const mean = allRatings.length > 0
    ? Number((allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(2))
    : 0;
  const level = mean >= 4.5 ? 'มากที่สุด' : mean >= 3.5 ? 'มาก' : mean >= 2.5 ? 'ปานกลาง' : mean > 0 ? 'น้อย' : '-';
  const percent = mean > 0 ? Number(((mean / 5) * 100).toFixed(1)) : 0;

  // Base identifiers common to all forms
  const base: Record<string, any> = {
    'รหัสแบบสอบถาม': payload.id || '',
    'วันเวลาที่บันทึก': payload.timestamp || '',
    'ชุดที่': payload.form_set,
    'ชื่อชุดแบบสำรวจ': payload.form_set_name || `ชุดที่ ${payload.form_set}`,
    'สำรวจครั้งที่': h.survey_no || '',
    'เดือน': h.survey_month || '',
    'ปี_พศ': h.survey_year || '',
    'ศูนย์บริการสาธารณสุข': h.health_center_no ? `ศบส. ${h.health_center_no}` : 'ศบส. 40 บางแค',
    '_raw_json': JSON.stringify(payload),
  };

  // Build specific payload per set matching the exact Excel export tabs
  if (payload.form_set === 1) {
    // ชุดที่ 1: สำหรับผู้ให้บริการ (ไม่มีฟิลด์โรคประจำตัว ผู้ป่วย ส่งต่อศูนย์ การดูแลตนเอง เด็ดขาด)
    const c1 = calculateCategoryAvg(r, ['s1_q1', 's1_q2', 's1_q3']);
    const c2 = calculateCategoryAvg(r, ['s1_q4', 's1_q5', 's1_q6']);
    const c3 = calculateCategoryAvg(r, ['s1_q7', 's1_q8', 's1_q9']);
    const c4 = calculateCategoryAvg(r, ['s1_q10', 's1_q11', 's1_q12']);
    const c5 = calculateCategoryAvg(r, ['s1_q13', 's1_q14']);
    const c6 = calculateCategoryAvg(r, ['s1_q15', 's1_q16', 's1_q17', 's1_q18']);

    const duties = formatStaffDutiesThai(p.staff_duties, p.staff_clinic_special_detail, p.staff_duties_other);

    const out: Record<string, any> = {
      ...base,
      'เพศ': p.gender || '',
      'อายุ': p.age || '',
      'ตำแหน่ง': p.position || '',
      'ระดับการศึกษา': p.education || '',
      'งานที่ปฏิบัติ': duties,
      'c1': c1,
      'c2': c2,
      'c3': c3,
      'c4': c4,
      'c5': c5,
      'c6': c6,
      'หมวด 1_ความสะดวก รวดเร็ว': c1,
      'หมวด 2_คุณภาพการให้บริการ': c2,
      'หมวด 3_อัธยาศัยและการเอาใจใส่': c3,
      'หมวด 4_การให้ข้อมูลคำแนะนำ': c4,
      'หมวด 5_ค่ายาค่าบริการ': c5,
      'หมวด 6_อาคารสถานที่สิ่งอำนวยความสะดวก': c6,
      'คะแนนเฉลี่ยรวม': mean > 0 ? mean : '',
      'ร้อยละความพึงพอใจ': percent > 0 ? percent : '',
      'ระดับความพึงพอใจ': level,
      'ข้อเสนอแนะด้านการบริการ (ตอนที่ 1)': payload.other_suggestions || '',
      'ข้อ 15 ความต้องการการสนับสนุน': payload.work_support_needed || '',
      'ข้อ 16 ข้อเสนอแนะอื่นๆ': payload.work_suggestions_other || '',
    };

    for (let i = 1; i <= 18; i++) {
      const val = r[`s1_q${i}`] ?? r[`q${i}`];
      if (typeof val === 'number') {
        const title = QUESTION_THAI_TITLES[i] || '';
        out[`ข้อ ${i}_${title}`] = val;
        out[`ข้อ_${i}`] = val;
        out[`q${i}`] = val;
      }
    }

    for (let i = 1; i <= 14; i++) {
      const val = wr[`work_${i}`];
      if (typeof val === 'number') {
        const title = WORK_THAI_TITLES[i] || '';
        out[`งาน ${i}_${title}`] = val;
        out[`งาน_${i}`] = val;
        out[`work_${i}`] = val;
      }
    }

    out['id'] = payload.id || '';
    out['timestamp'] = payload.timestamp || '';
    out['form_set'] = payload.form_set;
    return out;

  } else if (payload.form_set === 2) {
    // ชุดที่ 2: บริการที่บ้าน (มีข้อมูลเฉพาะผู้ป่วย ส่งต่อ การดูแลตนเอง โรคประจำตัว)
    const c1 = calculateCategoryAvg(r, ['h1', 'h2', 'h3']);
    const c2 = calculateCategoryAvg(r, ['h4', 'h5']);
    const c3 = calculateCategoryAvg(r, ['h6', 'h7', 'h8']);
    const c4 = calculateCategoryAvg(r, ['h9', 'h10', 'h11']);
    const c5 = calculateCategoryAvg(r, ['h12']);

    const out: Record<string, any> = {
      ...base,
      'เพศ': p.gender || '',
      'อายุ': p.age || '',
      'ระดับการศึกษา': p.education || '',
      'อาชีพ': p.occupation || '',
      'สิทธิการรักษา': formatTreatmentRight(p.treatment_right, p.treatment_right_other),
      'โรคประจำตัว': p.chronic_disease || '',
      'ระยะเวลาที่เป็นโรค': p.chronic_duration || '',
      'สถานที่รักษาประจำ': p.chronic_hospital || '',
      'ผู้ให้ข้อมูล': p.home_reporter || '',
      'ประเภทการส่งต่อ': p.home_referral_type || '',
      'ประเภทผู้ป่วย': p.home_patient_category || '',
      'การดูแลตนเอง': p.home_self_care || '',
      'c1': c1,
      'c2': c2,
      'c3': c3,
      'c4': c4,
      'c5': c5,
      'หมวด 1_ความสะดวก รวดเร็ว': c1,
      'หมวด 2_คุณภาพการให้บริการ': c2,
      'หมวด 3_อัธยาศัยและการเอาใจใส่': c3,
      'หมวด 4_การให้ข้อมูลคำแนะนำ': c4,
      'หมวด 5_ค่ายาค่าบริการ': c5,
      'คะแนนเฉลี่ยรวม': mean > 0 ? mean : '',
      'ร้อยละความพึงพอใจ': percent > 0 ? percent : '',
      'ระดับความพึงพอใจ': level,
      'ข้อเสนอแนะอื่นๆ': payload.other_suggestions || '',
    };

    for (let i = 1; i <= 12; i++) {
      const val = r[`h${i}`];
      if (typeof val === 'number') {
        const title = HOME_THAI_TITLES[i] || '';
        out[`บริการที่บ้าน ${i}_${title}`] = val;
        out[`h${i}`] = val;
      }
    }

    out['id'] = payload.id || '';
    out['timestamp'] = payload.timestamp || '';
    out['form_set'] = payload.form_set;
    return out;

  } else if (payload.form_set === 3) {
    // ชุดที่ 3: ประชาชนในพื้นที่บริการ
    const c1 = calculateCategoryAvg(r, ['q1', 'q2', 'q3']);
    const c2 = calculateCategoryAvg(r, ['q4', 'q5', 'q6']);
    const c3 = calculateCategoryAvg(r, ['q7', 'q8', 'q9']);
    const c4 = calculateCategoryAvg(r, ['q10', 'q11', 'q12']);
    const c5 = calculateCategoryAvg(r, ['q13', 'q14']);
    const c6 = calculateCategoryAvg(r, ['q15', 'q16', 'q17', 'q18']);

    const out: Record<string, any> = {
      ...base,
      'ชื่อชุมชน': h.community_name || '',
      'เพศ': p.gender || '',
      'อายุ': p.age || '',
      'ระดับการศึกษา': p.education || '',
      'อาชีพ': p.occupation || '',
      'สิทธิการรักษา': formatTreatmentRight(p.treatment_right, p.treatment_right_other),
      'เคยรับบริการที่ศูนย์': payload.has_visited_center || '',
      'เหตุผลที่ไม่เคยรับบริการ': payload.not_visited_reason || '',
      'เคยรับบริการในชุมชน': payload.comm_has_received_service || '',
      'c1': c1,
      'c2': c2,
      'c3': c3,
      'c4': c4,
      'c5': c5,
      'c6': c6,
      'หมวด 1_ความสะดวก รวดเร็ว': c1,
      'หมวด 2_คุณภาพการให้บริการ': c2,
      'หมวด 3_อัธยาศัยและการเอาใจใส่': c3,
      'หมวด 4_การให้ข้อมูลคำแนะนำ': c4,
      'หมวด 5_ค่ายาค่าบริการ': c5,
      'หมวด 6_อาคารสถานที่สิ่งอำนวยความสะดวก': c6,
      'คะแนนเฉลี่ยรวม': mean > 0 ? mean : '',
      'ร้อยละความพึงพอใจ': percent > 0 ? percent : '',
      'ระดับความพึงพอใจ': level,
      'ข้อเสนอแนะการบริการที่ศูนย์ฯ (ตอนที่ 1)': payload.other_suggestions || '',
      'ข้อ 16 ปัญหาอุปสรรค': payload.comm_obstacles || '',
      'ข้อ 17 ข้อเสนอแนะ': payload.comm_other_suggestions || '',
    };

    for (let i = 1; i <= 18; i++) {
      const val = r[`q${i}`];
      if (typeof val === 'number') {
        const title = QUESTION_THAI_TITLES[i] || '';
        out[`ข้อ ${i}_${title}`] = val;
        out[`ข้อ_${i}`] = val;
        out[`q${i}`] = val;
      }
    }

    for (let i = 1; i <= 15; i++) {
      const val = cr[`comm_${i}`];
      if (typeof val === 'number') {
        const title = COMM_THAI_TITLES[i] || '';
        out[`บริการชุมชน ${i}_${title}`] = val;
        out[`comm_${i}`] = val;
      }
    }

    out['id'] = payload.id || '';
    out['timestamp'] = payload.timestamp || '';
    out['form_set'] = payload.form_set;
    return out;

  } else {
    // ชุดที่ 4: ผู้รับบริการในศูนย์บริการสาธารณสุข
    const c1 = calculateCategoryAvg(r, ['q1', 'q2', 'q3']);
    const c2 = calculateCategoryAvg(r, ['q4', 'q5', 'q6']);
    const c3 = calculateCategoryAvg(r, ['q7', 'q8', 'q9']);
    const c4 = calculateCategoryAvg(r, ['q10', 'q11', 'q12']);
    const c5 = calculateCategoryAvg(r, ['q13', 'q14']);
    const c6 = calculateCategoryAvg(r, ['q15', 'q16', 'q17', 'q18']);

    const out: Record<string, any> = {
      ...base,
      'เพศ': p.gender || '',
      'อายุ': p.age || '',
      'ระดับการศึกษา': p.education || '',
      'อาชีพ': p.occupation || '',
      'สิทธิการรักษา': formatTreatmentRight(p.treatment_right, p.treatment_right_other),
      'c1': c1,
      'c2': c2,
      'c3': c3,
      'c4': c4,
      'c5': c5,
      'c6': c6,
      'หมวด 1_ความสะดวก รวดเร็ว': c1,
      'หมวด 2_คุณภาพการให้บริการ': c2,
      'หมวด 3_อัธยาศัยและการเอาใจใส่': c3,
      'หมวด 4_การให้ข้อมูลคำแนะนำ': c4,
      'หมวด 5_ค่ายาค่าบริการ': c5,
      'หมวด 6_อาคารสถานที่สิ่งอำนวยความสะดวก': c6,
      'คะแนนเฉลี่ยรวม': mean > 0 ? mean : '',
      'ร้อยละความพึงพอใจ': percent > 0 ? percent : '',
      'ระดับความพึงพอใจ': level,
      'ข้อเสนอแนะอื่นๆ': payload.other_suggestions || '',
    };

    for (let i = 1; i <= 18; i++) {
      const val = r[`q${i}`];
      if (typeof val === 'number') {
        const title = QUESTION_THAI_TITLES[i] || '';
        out[`ข้อ ${i}_${title}`] = val;
        out[`ข้อ_${i}`] = val;
        out[`q${i}`] = val;
      }
    }

    out['id'] = payload.id || '';
    out['timestamp'] = payload.timestamp || '';
    out['form_set'] = payload.form_set;
    return out;
  }
}

// Submit a survey response (Real-time save and broadcast to all devices)
app.post('/api/survey/submit', async (req: Request, res: Response) => {
  try {
    const payload = (req.body?.payload || req.body) as SurveyItem;
    if (!payload.form_set) {
      res.status(400).json({ success: false, error: 'กรุณาระบุชุดแบบสอบถาม' });
      return;
    }

    if (!payload.id) {
      payload.id = `SRV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // Check for duplicate IDs to prevent duplicate entries from multiple submissions
    const alreadyExists = surveysCache.some((s) => s.id === payload.id);
    if (alreadyExists) {
      res.json({ success: true, duplicate: true, data: payload, total: surveysCache.length });
      return;
    }

    if (!payload.timestamp) {
      payload.timestamp = new Date().toLocaleString('th-TH');
    }

    // 1. Log to WAL Journal
    appendToWAL(payload);

    // 2. Insert into in-memory cache and atomic persist
    surveysCache.unshift(payload);
    persistSurveys();

    // 3. Take periodic snapshot every 3 submissions (or always for real users)
    createBackupSnapshot('submit');

    // Broadcast immediately to all connected devices (PC, mobile, tablet)
    broadcastEvent({ type: 'SURVEYS_UPDATED', data: surveysCache });

    // Forward to GAS if configured (single reliable server-side sender with clean Thai structure)
    if (settingsCache.forwardToGas && settingsCache.gasWebhookUrl?.trim()) {
      try {
        const gasPayload = formatPayloadForGoogleSheets(payload);
        fetch(settingsCache.gasWebhookUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gasPayload)
        })
          .then((response) => {
            const isOk = response.ok || response.status < 400;
            gasSyncLogs.unshift({
              id: `LOG-${Date.now()}`,
              submissionId: payload.id,
              formSet: payload.form_set,
              timestamp: new Date().toLocaleString('th-TH'),
              status: isOk ? 'success' : 'failed',
              httpStatus: response.status,
              message: isOk ? 'ต่อแถวสำเร็จ (Auto-Appended)' : `HTTP Error ${response.status}`,
            });
            if (gasSyncLogs.length > 50) gasSyncLogs.pop();
          })
          .catch((err) => {
            gasSyncLogs.unshift({
              id: `LOG-${Date.now()}`,
              submissionId: payload.id,
              formSet: payload.form_set,
              timestamp: new Date().toLocaleString('th-TH'),
              status: 'failed',
              message: err.message || 'Connection error',
            });
            if (gasSyncLogs.length > 50) gasSyncLogs.pop();
            console.warn('Background GAS webhook error:', err);
          });
      } catch (err: any) {
        gasSyncLogs.unshift({
          id: `LOG-${Date.now()}`,
          submissionId: payload.id,
          formSet: payload.form_set,
          timestamp: new Date().toLocaleString('th-TH'),
          status: 'failed',
          message: err.message,
        });
        console.warn('Could not forward to GAS:', err);
      }
    }

    res.json({ success: true, data: payload, total: surveysCache.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Google Sheets Sync Logs for Administrator
app.get('/api/survey/gas-logs', (_req: Request, res: Response) => {
  res.json({
    success: true,
    logs: gasSyncLogs,
    configured: !!(settingsCache.forwardToGas && settingsCache.gasWebhookUrl?.trim()),
    forwardToGas: settingsCache.forwardToGas,
    gasWebhookUrl: settingsCache.gasWebhookUrl,
    totalSurveys: surveysCache.length,
  });
});

// Batch Sync All Survey Submissions to Google Sheets (ordered chronologically, pure flat structure)
app.post('/api/survey/sync-gas-all', async (req: Request, res: Response) => {
  try {
    const { webhookUrl } = req.body;
    const targetUrl = (webhookUrl || settingsCache.gasWebhookUrl || '').trim();
    if (!targetUrl) {
      res.status(400).json({ success: false, error: 'กรุณาระบุ Web App URL ก่อนเริ่มซิงค์ข้อมูล' });
      return;
    }

    // Sync oldest first so rows appear in chronological order in Google Sheets
    const itemsToSync = surveysCache.slice().reverse();
    let successCount = 0;
    let failCount = 0;

    for (const item of itemsToSync) {
      try {
        const gasPayload = formatPayloadForGoogleSheets(item);
        const resp = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gasPayload)
        });
        if (resp.ok || resp.status < 400) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (e) {
        failCount++;
      }
    }

    res.json({
      success: true,
      total: itemsToSync.length,
      synced: successCount,
      failed: failCount,
      message: `ซิงค์ข้อมูลเข้า Google Sheets สำเร็จ ${successCount} จากทั้งหมด ${itemsToSync.length} รายการ`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Seed demo data
app.post('/api/survey/seed', (req: Request, res: Response) => {
  const { items } = req.body;
  if (Array.isArray(items) && items.length > 0) {
    surveysCache = [...items, ...surveysCache];
    persistSurveys();
    syncWAL(surveysCache);
    broadcastEvent({ type: 'SURVEYS_UPDATED', data: surveysCache });
    res.json({ success: true, count: surveysCache.length });
    return;
  }
  res.status(400).json({ success: false, error: 'No items provided' });
});

// Delete specific set (Snapshot created before deletion)
app.post('/api/survey/delete-set', (req: Request, res: Response) => {
  const { form_set } = req.body;
  const setNum = parseInt(form_set, 10);
  if (surveysCache.length > 0) {
    createBackupSnapshot(`before_delete_set_${setNum}`);
  }
  lastClearedAt = Date.now();
  const beforeCount = surveysCache.length;
  surveysCache = surveysCache.filter(s => s.form_set !== setNum);
  persistSurveys();
  syncWAL(surveysCache);
  broadcastEvent({ type: 'SURVEYS_UPDATED', data: surveysCache });
  res.json({ 
    success: true, 
    removed: beforeCount - surveysCache.length,
    remaining: surveysCache.length,
    message: `ลบข้อมูลชุดที่ ${setNum} สำเร็จ`
  });
});

// Delete ONLY demo data
app.post('/api/survey/delete-demo', (_req: Request, res: Response) => {
  const beforeCount = surveysCache.length;
  surveysCache = surveysCache.filter(s => !s.is_demo && !s.id?.startsWith('DEMO-') && !s.id?.startsWith('SRV-TEST'));
  persistSurveys();
  syncWAL(surveysCache);
  broadcastEvent({ type: 'SURVEYS_UPDATED', data: surveysCache });
  res.json({ success: true, removed: beforeCount - surveysCache.length, remaining: surveysCache.length });
});

// Clear endpoint (Snapshot created before deletion)
app.post('/api/survey/clear', (_req: Request, res: Response) => {
  if (surveysCache.length > 0) {
    createBackupSnapshot('before_clear_all');
  }
  lastClearedAt = Date.now();
  const beforeCount = surveysCache.length;
  surveysCache = [];
  persistSurveys();
  syncWAL(surveysCache);
  broadcastEvent({ type: 'SURVEYS_UPDATED', data: surveysCache });
  res.json({ 
    success: true, 
    removed: beforeCount,
    remaining: 0,
    message: 'ลบข้อมูลแบบสำรวจทั้งหมดเรียบร้อยแล้ว'
  });
});

// Force recover endpoint (scans disk, archive, and backups to restore any unindexed surveys)
app.post('/api/survey/force-recover', (_req: Request, res: Response) => {
  const recovered = trySelfHealSurveys();
  res.json({ success: true, count: recovered });
});

// Backup & Recovery Endpoints for Admin
app.get('/api/survey/backups', (_req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('surveys_') && f.endsWith('.json'))
      .map(name => {
        const filePath = path.join(BACKUP_DIR, name);
        const stats = fs.statSync(filePath);
        return {
          filename: name,
          size: stats.size,
          createdAt: stats.mtime.toISOString(),
        };
      })
      .reverse();
    res.json({ success: true, backups: files });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Restore from a specific backup snapshot
app.post('/api/survey/restore-backup', (req: Request, res: Response) => {
  const { filename } = req.body;
  if (!filename) {
    res.status(400).json({ success: false, error: 'กรุณาระบุชื่อไฟล์สำรอง' });
    return;
  }
  const safeFilename = path.basename(filename);
  const targetPath = path.join(BACKUP_DIR, safeFilename);
  if (!fs.existsSync(targetPath)) {
    res.status(404).json({ success: false, error: 'ไม่พบไฟล์สำรองที่ระบุ' });
    return;
  }
  try {
    const raw = fs.readFileSync(targetPath, 'utf-8');
    const restored = JSON.parse(raw);
    if (Array.isArray(restored)) {
      surveysCache = restored;
      persistSurveys();
      broadcastEvent({ type: 'SURVEYS_UPDATED', data: surveysCache });
      res.json({ success: true, count: surveysCache.length });
      return;
    }
    res.status(400).json({ success: false, error: 'รูปแบบไฟล์ไม่ถูกต้อง' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manual backup snapshot endpoint
app.post('/api/survey/create-backup', (_req: Request, res: Response) => {
  try {
    createBackupSnapshot('manual');
    res.json({ success: true, count: surveysCache.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Import/Restore external JSON file or pasted data
app.post('/api/survey/import-json', (req: Request, res: Response) => {
  try {
    const { items, merge } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'ไม่พบรายการข้อมูลแบบสอบถามที่ถูกต้อง' });
      return;
    }

    if (surveysCache.length > 0) {
      createBackupSnapshot('before_import');
    }

    if (merge) {
      const existingIds = new Set(surveysCache.map(s => s.id));
      let added = 0;
      for (const item of items) {
        if (!item.id) item.id = `SRV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
        if (!existingIds.has(item.id)) {
          surveysCache.unshift(item);
          existingIds.add(item.id);
          added++;
        }
      }
    } else {
      surveysCache = items;
    }

    persistSurveys();
    broadcastEvent({ type: 'SURVEYS_UPDATED', data: surveysCache });
    res.json({ success: true, count: surveysCache.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Server Recovery Endpoint
app.post('/api/survey/run-recovery', (req: Request, res: Response) => {
  try {
    const { generateIfMissing = true } = req.body || {};
    const report = runServerRecovery(generateIfMissing);

    // Reload cache from newly recovered surveys.json
    if (fs.existsSync(DATA_FILE)) {
      surveysCache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
    broadcastEvent({ type: 'SURVEYS_UPDATED', data: surveysCache });

    res.json({ success: true, report, currentCount: surveysCache.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Survey App running at http://0.0.0.0:${PORT}`);

    // Auto-recover from Google Sheets on container startup if Webhook URL is configured
    if (settingsCache.gasWebhookUrl?.trim() && !lastClearedAt) {
      console.log('[Server Startup] Checking Google Sheets for backup sync...');
      restoreFromGoogleSheets(settingsCache.gasWebhookUrl).catch((err) => {
        console.warn('[Server Startup] Google Sheets auto-restore check failed:', err);
      });
    }
  });
}

startServer();
