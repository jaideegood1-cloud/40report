import { SurveySubmissionPayload } from '../types/survey';
import { buildSurveyWorkbookData } from '../utils/export';

export interface ExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  excelDownloadUrl: string;
  pdfDownloadUrl: string;
  title: string;
  folderId?: string;
  folderName?: string;
  timestamp: string;
}

export interface DriveFolderItem {
  id: string;
  name: string;
  modifiedTime?: string;
}

/**
 * List folders in user's Google Drive so user can choose their authorized Drive folder
 */
export async function listUserDriveFolders(token: string): Promise<DriveFolderItem[]> {
  try {
    const q = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&pageSize=50&orderBy=folder,name`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `HTTP ${res.status} when listing Drive folders`);
    }
    const data = await res.json();
    return (data.files || []) as DriveFolderItem[];
  } catch (err: any) {
    console.warn('Could not list drive folders:', err);
    return [];
  }
}

/**
 * Create a dedicated folder in user's Google Drive if requested
 */
export async function createDriveFolder(
  token: string,
  folderName: string,
  parentFolderId?: string
): Promise<DriveFolderItem> {
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson?.error?.message || `ไม่สามารถสร้างโฟลเดอร์ใน Google Drive ได้ (${res.status})`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name || folderName,
  };
}

/**
 * Create a new Google Spreadsheet with all 5 survey tabs matching the Excel export
 */
export async function createSurveySpreadsheet(
  token: string,
  title: string,
  targetFolderId?: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const sheetTitles = [
    'ชุดที่ 1 - ผู้ให้บริการ',
    'ชุดที่ 2 - บริการที่บ้าน',
    'ชุดที่ 3 - ประชาชนในพื้นที่',
    'ชุดที่ 4 - ในศูนย์บริการ',
    'ผลสรุปรายงานสถิติ',
  ];

  const payload = {
    properties: {
      title,
    },
    sheets: sheetTitles.map((st, idx) => ({
      properties: {
        sheetId: idx,
        title: st,
        gridProperties: {
          frozenRowCount: 1,
        },
      },
    })),
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson?.error?.message || `สร้าง Google Sheet ไม่สำเร็จ (${res.status})`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Move to target folder if specified
  if (targetFolderId && targetFolderId !== 'root') {
    try {
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${targetFolderId}&fields=id,parents`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (moveErr) {
      console.warn('Could not move sheet into folder, created in root Drive instead:', moveErr);
    }
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Populate all 5 sheets with exact rows from buildSurveyWorkbookData
 */
export async function populateSurveySpreadsheet(
  token: string,
  spreadsheetId: string,
  submissions: SurveySubmissionPayload[]
): Promise<void> {
  const workbookData = buildSurveyWorkbookData(submissions);

  const dataRanges = workbookData.sheets.map((sheet) => ({
    range: `'${sheet.title}'!A1`,
    values: sheet.rows.map((row) =>
      row.map((cell) => (cell === undefined || cell === null ? '' : cell))
    ),
  }));

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataRanges,
      }),
    }
  );

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson?.error?.message || `บันทึกข้อมูลลง Google Sheet ไม่สำเร็จ (${res.status})`);
  }
}

/**
 * High-level function: Creates Google Spreadsheet in user's authorized Drive folder
 * and fills with the full survey dataset and statistics summary.
 */
export async function exportSurveysToGoogleSheets(
  token: string,
  submissions: SurveySubmissionPayload[],
  options?: {
    customTitle?: string;
    folderId?: string;
    folderName?: string;
  }
): Promise<ExportResult> {
  const now = new Date();
  const dateStr = `${now.getFullYear() + 543}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const title =
    options?.customTitle ||
    `รายงานสถิติความพึงพอใจ_ศบส40บางแค_${dateStr}`;

  // 1. Create spreadsheet with all 5 tabs
  const { spreadsheetId, spreadsheetUrl } = await createSurveySpreadsheet(
    token,
    title,
    options?.folderId
  );

  // 2. Populate data into all tabs
  await populateSurveySpreadsheet(token, spreadsheetId, submissions);

  // 3. Return links allowing opening and downloading directly
  return {
    spreadsheetId,
    spreadsheetUrl,
    excelDownloadUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`,
    pdfDownloadUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=pdf`,
    title,
    folderId: options?.folderId,
    folderName: options?.folderName,
    timestamp: now.toLocaleString('th-TH'),
  };
}
