import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { withRetry } from '../../shared/lib/retry.js';
import { rowsToObjects } from './utils.js';
import { getEnv } from './env';

function getAuth() {
  const email = getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const key = getEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');
  return new JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const spreadsheetId = (req.query.sheetId as string) || getEnv('GOOGLE_SHEET_ID');
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const ranges = ['Categories!A2:I','Transactions!A2:K','Recurring!A2:L','Tags!A2:F','Users!A2:F','UserSettings!A2:E'];
    const resp: any = await withRetry(() => sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges }));

    // Defensive check to prevent crashes on unexpected API responses
    if (!resp || !resp.data || !Array.isArray(resp.data.valueRanges)) {
        console.warn('Google Sheets API returned an unexpected response structure. Returning empty data.');
        const emptyOut = { categories: [], transactions: [], recurring: [], tags: [], users: [], userSettings: [] };
        return res.status(200).json(emptyOut);
    }
    
    const data = resp.data.valueRanges;

    const out = {
      categories: rowsToObjects('Categories', data[0]?.values),
      transactions: rowsToObjects('Transactions', data[1]?.values),
      recurring: rowsToObjects('Recurring', data[2]?.values),
      tags: rowsToObjects('Tags', data[3]?.values),
      users: rowsToObjects('Users', data[4]?.values),
      userSettings: rowsToObjects('UserSettings', data[5]?.values)
    };
    return res.status(200).json(out);
  } catch (e: any) {
    return res.status(500).json({ error: `Failed to read: ${e?.message || e}` });
  }
}