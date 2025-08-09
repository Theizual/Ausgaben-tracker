import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { withRetry } from '../../shared/lib/retry.js';
import { HEADERS, objectsToRows, rowsToObjects } from './utils.js';
import { getEnv } from './env.js';

function getAuth() {
  const email = getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const key = getEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');
  return new JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
}

type Payload = {
  categories?: any[]; transactions?: any[]; recurring?: any[];
  tags?: any[]; users?: any[]; userSettings?: any[];
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const spreadsheetId = (req.query.sheetId as string) || getEnv('GOOGLE_SHEET_ID');
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const body = (req.body || {}) as Payload;
    const items = {
      categories: body.categories ?? [],
      transactions: body.transactions ?? [],
      recurring: body.recurring ?? [],
      tags: body.tags ?? [],
      users: body.users ?? [],
      userSettings: body.userSettings ?? []
    };

    const dataToWrite = [
      { range: 'Categories!A1:I', values: [HEADERS.Categories, ...objectsToRows('Categories', items.categories)] },
      { range: 'Transactions!A1:K', values: [HEADERS.Transactions, ...objectsToRows('Transactions', items.transactions)] },
      { range: 'Recurring!A1:M', values: [HEADERS.Recurring, ...objectsToRows('Recurring', items.recurring)] },
      { range: 'Tags!A1:F', values: [HEADERS.Tags, ...objectsToRows('Tags', items.tags)] },
      { range: 'Users!A1:F', values: [HEADERS.Users, ...objectsToRows('Users', items.users)] },
      { range: 'UserSettings!A1:E', values: [HEADERS.UserSettings, ...objectsToRows('UserSettings', items.userSettings)] }
    ];

    await withRetry(() => sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: 'RAW', data: dataToWrite.map(d => ({ range: d.range, majorDimension: 'ROWS', values: d.values })) }
    }));
    
    // After writing, re-read all data and send it back to the client
    const rangesToRead = ['Categories!A2:I','Transactions!A2:K','Recurring!A2:M','Tags!A2:F','Users!A2:F','UserSettings!A2:E'];
    const readResp: any = await withRetry(() => sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges: rangesToRead }));

    if (!readResp || !readResp.data || !Array.isArray(readResp.data.valueRanges)) {
        console.error('Failed to re-read data after write. Returning empty.');
        const emptyOut = { categories: [], transactions: [], recurring: [], tags: [], users: [], userSettings: [] };
        return res.status(200).json(emptyOut);
    }
    
    const valueRanges = readResp.data.valueRanges;
    const out = {
      categories: rowsToObjects('Categories', valueRanges[0]?.values),
      transactions: rowsToObjects('Transactions', valueRanges[1]?.values),
      recurring: rowsToObjects('Recurring', valueRanges[2]?.values),
      tags: rowsToObjects('Tags', valueRanges[3]?.values),
      users: rowsToObjects('Users', valueRanges[4]?.values),
      userSettings: rowsToObjects('UserSettings', valueRanges[5]?.values)
    };

    return res.status(200).json(out);
  } catch (e: any) {
    const msg = e?.message || String(e);
    const code = e?.code || e?.response?.status;
    console.error('Sheets API write error:', { msg, code, stack: e?.stack });
    return res.status(500).json({ error: 'Failed to write to sheet.', message: msg, code });
  }
}
