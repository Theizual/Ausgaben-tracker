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

const isLegacyId = (id: string, prefix: string) => id && !id.startsWith(prefix);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sheetId = getEnv('GOOGLE_SHEET_ID');
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const body = (req.body || {}) as Payload;

    // --- ID Migration Logic ---
    const countersResp = await withRetry(() => sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Counters!A2:Z' }));
    const counterRows = (countersResp as any).data.values || [];
    const counters = new Map<string, number>(counterRows.map(row => [row[0], parseInt(row[1], 10) || 1]));

    const getNextId = (entity: string, prefix: string, pad: number) => {
        const nextIdNum = counters.get(entity) || 1;
        counters.set(entity, nextIdNum + 1);
        return `${prefix}_${String(nextIdNum).padStart(pad, '0')}`;
    };

    const idMigrationMap = new Map<string, string>();
    let countersChanged = false;

    const migrate = (items: any[], entity: string, idPrefix: string, pad: number) => {
        return items.map(item => {
            if (item.id && isLegacyId(item.id, idPrefix)) {
                const newId = getNextId(entity, idPrefix, pad);
                idMigrationMap.set(item.id, newId);
                countersChanged = true;
                return { ...item, legacyId: item.id, id: newId };
            }
            return item;
        });
    };
    
    const migratedItems = {
      groups:       migrate(body.groups ?? [], 'Group', 'grpId', 5),
      categories:   migrate(body.categories ?? [], 'Category', 'catId', 5),
      transactions: migrate(body.transactions ?? [], 'Transaction', 'txId', 7),
      recurring:    migrate(body.recurring ?? [], 'Recurring', 'recId', 5),
      tags:         migrate(body.tags ?? [], 'Tag', 'tagId', 5),
      users:        migrate(body.users ?? [], 'User', 'usrId', 4),
      userSettings: body.userSettings ?? [],
    };

    // Update references
    migratedItems.categories.forEach(cat => {
        if (cat.groupId && idMigrationMap.has(cat.groupId)) {
            cat.groupLegacyId = cat.groupId;
            cat.groupId = idMigrationMap.get(cat.groupId)!;
        }
    });
    migratedItems.transactions.forEach(tx => {
        if (tx.categoryId && idMigrationMap.has(tx.categoryId)) {
            tx.categoryLegacyId = tx.categoryId;
            tx.categoryId = idMigrationMap.get(tx.categoryId)!;
        }
        if (tx.recurringId && idMigrationMap.has(tx.recurringId)) {
            tx.recurringLegacyId = tx.recurringId;
            tx.recurringId = idMigrationMap.get(tx.recurringId)!;
        }
        if (tx.tagIds && Array.isArray(tx.tagIds)) {
            tx.tagLegacyIds = tx.tagIds.filter(id => idMigrationMap.has(id)).join(',');
            tx.tagIds = tx.tagIds.map(id => idMigrationMap.get(id) || id);
        }
    });
    migratedItems.recurring.forEach(rec => {
        if (rec.categoryId && idMigrationMap.has(rec.categoryId)) {
            rec.categoryLegacyId = rec.categoryId;
            rec.categoryId = idMigrationMap.get(rec.categoryId)!;
        }
    });

    const sheetsSpec = [
      ['Groups',       migratedItems.groups]       as const,
      ['Categories',   migratedItems.categories]   as const,
      ['Transactions', migratedItems.transactions] as const,
      ['Recurring',    migratedItems.recurring]    as const,
      ['Tags',         migratedItems.tags]         as const,
      ['Users',        migratedItems.users]        as const,
      ['UserSettings', migratedItems.userSettings] as const,
    ];

    const dataToWrite = sheetsSpec.map(([name, arr]) => {
      const headers = HEADERS[name as keyof typeof HEADERS];
      const rows = objectsToRows(name as any, arr);
      const lastCol = colLetter(headers.length);
      return { range: `${name}!A1:${lastCol}`, values: [headers, ...rows], majorDimension: 'ROWS' as const };
    });

    if (countersChanged) {
        dataToWrite.push({
            range: 'Counters!A2:Z',
            values: Array.from(counters.entries()),
            majorDimension: 'ROWS' as const,
        });
    }

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

    return res.status(200).json(out);
  } catch (e: any) {
    const msg = e?.message || String(e);
    const code = e?.code || e?.response?.status;
    console.error('Sheets WRITE error:', { msg, code, stack: e?.stack });
    return res.status(500).json({ error: 'Failed to write', message: msg, code });
  }
}