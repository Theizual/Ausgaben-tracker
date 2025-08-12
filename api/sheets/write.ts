import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { withRetry } from '../../shared/lib/retry';
import { HEADERS, objectsToRows, rowsToObjects } from './utils';
import { getEnv } from './env';

// Hilfsfunktion: Spaltenindex -> Excel-Buchstabe (1 -> A, 26 -> Z, 27 -> AA, ...)
function colLetter(n: number): string {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function getAuth() {
  const email = getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const key = getEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');
  return new JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

type Payload = {
  groups?: any[]; categories?: any[]; transactions?: any[]; recurring?: any[];
  tags?: any[]; users?: any[]; userSettings?: any[];
};


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sheetId = getEnv('GOOGLE_SHEET_ID');
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const body = (req.body || {}) as Payload;

    const sheetsSpec = [
      ['Groups',       body.groups]       as const,
      ['Categories',   body.categories]   as const,
      ['Transactions', body.transactions] as const,
      ['Recurring',    body.recurring]    as const,
      ['Tags',         body.tags]         as const,
      ['Users',        body.users]        as const,
      ['UserSettings', body.userSettings] as const,
    ];

    const dataToWrite = sheetsSpec.map(([name, arr]) => {
      const headers = HEADERS[name as keyof typeof HEADERS];
      const rows = objectsToRows(name as any, arr);
      const lastCol = colLetter(headers.length);
      return { range: `${name}!A1:${lastCol}`, values: [[...headers], ...rows], majorDimension: 'ROWS' as const };
    });

    await withRetry(() =>
      sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { valueInputOption: 'RAW', data: dataToWrite },
      })
    );

    const rangesToRead = sheetsSpec.map(([name]) => `${name}!A2:Z`);
    const readResp = await withRetry(() =>
      sheets.spreadsheets.values.batchGet({ spreadsheetId: sheetId, ranges: rangesToRead, majorDimension: 'ROWS' })
    );

    const valueRanges = (readResp as any).data.valueRanges || [];
    const out = {
      groups:        rowsToObjects('Groups',       valueRanges[0]?.values || []),
      categories:    rowsToObjects('Categories',   valueRanges[1]?.values || []),
      transactions:  rowsToObjects('Transactions', valueRanges[2]?.values || []),
      recurring:     rowsToObjects('Recurring',    valueRanges[3]?.values || []),
      tags:          rowsToObjects('Tags',         valueRanges[4]?.values || []),
      users:         rowsToObjects('Users',        valueRanges[5]?.values || []),
      userSettings:  rowsToObjects('UserSettings', valueRanges[6]?.values || []),
    };

    return res.status(200).json({ data: out, migrationMap: {} });
  } catch (e: any) {
    const msg = e?.message || String(e);
    const code = e?.code || e?.response?.status;
    console.error('Sheets WRITE error:', e); // Log full error object for better debugging
    return res.status(500).json({ error: 'Failed to write', message: msg, code });
  }
}