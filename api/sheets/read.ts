import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { withRetry } from '../../shared/lib/retry';
import { rowsToObjects } from './utils';
import { getEnv } from './env';

function getAuth() {
  const email = getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const key = getEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');
  return new JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

const ALL_RANGES = [
  'Groups!A2:Z',
  'Categories!A2:Z',
  'Transactions!A2:Z',
  'Recurring!A2:Z',
  'Tags!A2:Z',
  'Users!A2:Z',
  'UserSettings!A2:Z',
];

const rangeNameToKeyMap: { [key: string]: string } = {
  'Groups': 'groups',
  'Categories': 'categories',
  'Transactions': 'transactions',
  'Recurring': 'recurring',
  'Tags': 'tags',
  'Users': 'users',
  'UserSettings': 'userSettings',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sheetId = getEnv('GOOGLE_SHEET_ID');
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const { ranges } = req.query;
    const isPartial = typeof ranges === 'string' && ranges.length > 0;
    const rangesToFetch = isPartial ? ranges.split(',') : ALL_RANGES;


    const resp = await withRetry(() =>
      sheets.spreadsheets.values.batchGet({
        spreadsheetId: sheetId,
        ranges: rangesToFetch,
        majorDimension: 'ROWS',
      })
    );

    const valueRanges = (resp as any).data.valueRanges || [];
    
    const out: { [key: string]: any } = {};

    valueRanges.forEach((rangeData: any, index: number) => {
        const rangeName = rangesToFetch[index].split('!')[0];
        const key = rangeNameToKeyMap[rangeName];
        if (key) {
            out[key] = rowsToObjects(rangeName as any, rangeData?.values || []);
        }
    });

    if (isPartial) {
        // Partial requests return the flat object of results
        return res.status(200).json(out);
    }

    return res.status(200).json({ data: out });
  } catch (e: any) {
    const msg = e?.message || String(e);
    const code = e?.code || e?.response?.status;
    console.error('Sheets READ error:', e); // Log full error object for better debugging
    return res.status(500).json({ error: 'Failed to read', message: msg, code });
  }
}