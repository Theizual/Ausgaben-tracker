import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { withRetry } from '../../shared/lib/retry.js';
import { rowsToObjects } from './utils.js';
import { getEnv } from './env.js';

function getAuth() {
  const email = getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const key = getEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');
  return new JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

const RANGES = [
  'Groups!A2:Z',
  'Categories!A2:Z',
  'Transactions!A2:Z',
  'Recurring!A2:Z',
  'Tags!A2:Z',
  'Users!A2:Z',
  'UserSettings!A2:Z',
  'Counters!A2:Z',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sheetId = getEnv('GOOGLE_SHEET_ID');
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const resp = await withRetry(() =>
      sheets.spreadsheets.values.batchGet({
        spreadsheetId: sheetId,
        ranges: RANGES,
        majorDimension: 'ROWS',
      })
    );

    const data = (resp as any).data.valueRanges || [];

    const out = {
      groups:        rowsToObjects('Groups',       data[0]?.values || []),
      categories:    rowsToObjects('Categories',   data[1]?.values || []),
      transactions:  rowsToObjects('Transactions', data[2]?.values || []),
      recurring:     rowsToObjects('Recurring',    data[3]?.values || []),
      tags:          rowsToObjects('Tags',         data[4]?.values || []),
      users:         rowsToObjects('Users',        data[5]?.values || []),
      userSettings:  rowsToObjects('UserSettings', data[6]?.values || []),
      counters:      rowsToObjects('Counters',     data[7]?.values || []),
    };

    return res.status(200).json(out);
  } catch (e: any) {
    const msg = e?.message || String(e);
    const code = e?.code || e?.response?.status;
    console.error('Sheets READ error:', { msg, code, stack: e?.stack });
    return res.status(500).json({ error: 'Failed to read', message: msg, code });
  }
}