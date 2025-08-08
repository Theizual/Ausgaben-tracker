import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { z } from 'zod';
import { withRetry, getLenientSchemas } from './utils.js';
import { Buffer } from 'buffer';

async function getAuthClient() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/\\n/g, '\n');

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Google service account credentials are not set in environment variables.');
  }

  const auth = new JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return auth;
}

type Category = z.infer<ReturnType<typeof getLenientSchemas>['CategorySchema']>;
type Transaction = z.infer<ReturnType<typeof getLenientSchemas>['TransactionSchema']>;
type RecurringTransaction = z.infer<ReturnType<typeof getLenientSchemas>['RecurringTransactionSchema']>;
type Tag = z.infer<ReturnType<typeof getLenientSchemas>['TagSchema']>;
type User = z.infer<ReturnType<typeof getLenientSchemas>['UserSchema']>;
type UserSetting = z.infer<ReturnType<typeof getLenientSchemas>['UserSettingSchema']>;


function normalizeArray(input: any): any[] {
  if (!Array.isArray(input)) return [];
  const out: any[] = [];
  for (const item of input) {
    if (item == null) continue;
    if (typeof item === 'string') {
      try {
        const parsed = JSON.parse(item);
        if (parsed && typeof parsed === 'object') { out.push(parsed); }
      } catch { /* ignore */ }
    } else if (typeof item === 'object' && Object.keys(item).length > 0) {
      out.push(item);
    }
  }
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    return res.status(500).json({ error: 'Die Google Sheet ID ist auf dem Server nicht konfiguriert.' });
  }

  let parsedBody: any;
  try {
    if (typeof req.body === 'string') parsedBody = JSON.parse(req.body);
    else if (req.body instanceof Buffer) parsedBody = JSON.parse(req.body.toString('utf8'));
    else parsedBody = req.body || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const normalizedBody = {
    categories: normalizeArray(parsedBody.categories),
    transactions: normalizeArray(parsedBody.transactions),
    recurringTransactions: normalizeArray(parsedBody.recurringTransactions),
    allAvailableTags: normalizeArray(parsedBody.allAvailableTags),
    users: normalizeArray(parsedBody.users),
    userSettings: normalizeArray(parsedBody.userSettings),
  };

  const schemas = getLenientSchemas();
  const WriteBodySchema = z.object({
      categories: z.array(schemas.CategorySchema).optional().default([]),
      transactions: z.array(schemas.TransactionSchema).optional().default([]),
      recurringTransactions: z.array(schemas.RecurringTransactionSchema).optional().default([]),
      allAvailableTags: z.array(schemas.TagSchema).optional().default([]),
      users: z.array(schemas.UserSchema).optional().default([]),
      userSettings: z.array(schemas.UserSettingSchema).optional().default([]),
  });

  const validationResult = WriteBodySchema.safeParse(normalizedBody);
  if (!validationResult.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: validationResult.error.flatten(),
    });
  }
  
  const { data } = validationResult;

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Convert validated data back to arrays for sheet update
    const dataToWrite = [
        {
            range: 'Categories!A2',
            values: data.categories.map(c => [c.id, c.name, c.color, c.icon, c.budget ?? '', c.group, c.lastModified, c.isDeleted ?? false, c.version])
        },
        {
            range: 'Transactions!A2',
            values: data.transactions.map(t => [t.id, t.amount, t.description, t.categoryId, t.date, (t.tagIds ?? []).join(','), t.lastModified, t.isDeleted ?? false, t.recurringId ?? '', t.version, t.createdBy ?? ''])
        },
        {
            range: 'Recurring!A2',
            values: data.recurringTransactions.map(r => [r.id, r.amount, r.description, r.categoryId, r.frequency, r.startDate, r.lastProcessedDate ?? '', r.lastModified, r.isDeleted ?? false, r.version])
        },
        {
            range: 'Tags!A2',
            values: data.allAvailableTags.map(t => [t.id, t.name, t.lastModified, t.isDeleted ?? false, t.version])
        },
        {
            range: 'Users!A2',
            values: data.users.map(u => [u.id, u.name, u.color, u.lastModified, u.isDeleted ?? false, u.version])
        },
        {
            range: 'UserSettings!A2',
            values: data.userSettings.map(s => [s.userId, s.settingKey, s.settingValue, s.lastModified, s.isDeleted ?? false, s.version])
        },
    ];

    await withRetry(() => sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: dataToWrite,
        }
    }));
    
    return res.status(200).json({ success: true, message: 'Data written successfully' });

  } catch (e: unknown) {
     const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred while writing to the sheet.';
     return res.status(500).json({ error: 'Failed to write to sheet', details: errorMessage });
  }
}