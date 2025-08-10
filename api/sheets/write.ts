import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { withRetry } from '../../shared/lib/retry.js';
import { HEADERS, objectsToRows, rowsToObjects } from './utils.js';
import { getEnv } from './env.js';

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
    const body = (req.body || {}) as Payload;

    // Eingehende Daten normalisieren
    const items = {
      groups:       body.groups       ?? [],
      categories:   body.categories   ?? [],
      transactions: body.transactions ?? [],
      recurring:    body.recurring    ?? [],
      tags:         body.tags         ?? [],
      users:        body.users        ?? [],
      userSettings: body.userSettings ?? [],
    };

    // Zu schreibende Werte vorbereiten (Header + Rows)
    const sheetsSpec = [
      ['Groups',       items.groups]       as const,
      ['Categories',   items.categories]   as const,
      ['Transactions', items.transactions] as const,
      ['Recurring',    items.recurring]    as const,
      ['Tags',         items.tags]         as const,
      ['Users',        items.users]        as const,
      ['UserSettings', items.userSettings] as const,
    ];

    const dataToWrite = sheetsSpec.map(([name, arr]) => {
      const headers = HEADERS[name as keyof typeof HEADERS];
      const rows = objectsToRows(name as any, arr);
      const lastCol = colLetter(headers.length);
      return {
        range: `${name}!A1:${lastCol}`,
        values: [headers, ...rows],
        majorDimension: 'ROWS' as const,
      };
    });

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Schreiben (Header + Daten)
    await withRetry(() =>
      sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: dataToWrite,
        },
      })
    );

    // Direkt danach erneut lesen (A2:Z), um den konsolidierten Stand zurückzugeben
    const rangesToRead = [
      'Groups!A2:Z',
      'Categories!A2:Z',
      'Transactions!A2:Z',
      'Recurring!A2:Z',
      'Tags!A2:Z',
      'Users!A2:Z',
      'UserSettings!A2:Z',
    ];

    const readResp = await withRetry(() =>
      sheets.spreadsheets.values.batchGet({
        spreadsheetId: sheetId,
        ranges: rangesToRead,
        majorDimension: 'ROWS',
      })
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

    return res.status(200).json(out);
  } catch (e: any) {
    const msg = e?.message || String(e);
    const code = e?.code || e?.response?.status;
    console.error('Sheets WRITE error:', { msg, code, stack: e?.stack });
    return res.status(500).json({ error: 'Failed to write', message: msg, code });
  }
}