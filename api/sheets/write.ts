import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { z } from 'zod';
import { withRetry, getLenientSchemas, parseSheetData } from './utils.js';
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
  };

  const schemas = getLenientSchemas();
  const WriteBodySchema = z.object({
      categories: z.array(schemas.CategorySchema).optional().default([]),
      transactions: z.array(schemas.TransactionSchema).optional().default([]),
      recurringTransactions: z.array(schemas.RecurringTransactionSchema).optional().default([]),
      allAvailableTags: z.array(schemas.TagSchema).optional().default([]),
  });

  const validationResult = WriteBodySchema.safeParse(normalizedBody);
  if (!validationResult.success) {
    console.error("Invalid write request body:", JSON.stringify(validationResult.error.flatten(), null, 2));
    return res.status(400).json({ error: "Invalid data structure.", details: validationResult.error.flatten() });
  }
  const clientData = validationResult.data;

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const readResponse = await withRetry(() => sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: ['Categories!A2:I', 'Transactions!A2:J', 'Recurring!A2:J', 'Tags!A2:E'],
    }));

    const serverValues = (readResponse as any).data.valueRanges || [];
    
    const serverCategories = parseSheetData({
      rows: serverValues.find((r: any) => r.range?.startsWith('Categories'))?.values || [],
      schema: z.array(schemas.CategorySchema),
      headers: ['id', 'name', 'color', 'icon', 'budget', 'group', 'lastModified', 'isDeleted', 'version'],
      entityName: 'Category',
    });
    const serverTransactions = parseSheetData({
      rows: serverValues.find((r: any) => r.range?.startsWith('Transactions'))?.values || [],
      schema: z.array(schemas.TransactionSchema),
      headers: ['id', 'amount', 'description', 'categoryId', 'date', 'tagIds', 'lastModified', 'isDeleted', 'recurringId', 'version'],
      entityName: 'Transaction',
    });
    const serverRecurring = parseSheetData({
      rows: serverValues.find((r: any) => r.range?.startsWith('Recurring'))?.values || [],
      schema: z.array(schemas.RecurringTransactionSchema),
      headers: ['id', 'amount', 'description', 'categoryId', 'frequency', 'startDate', 'lastProcessedDate', 'lastModified', 'isDeleted', 'version'],
      entityName: 'RecurringTransaction',
    });
    const serverTags = parseSheetData({
      rows: serverValues.find((r: any) => r.range?.startsWith('Tags'))?.values || [],
      schema: z.array(schemas.TagSchema),
      headers: ['id', 'name', 'lastModified', 'isDeleted', 'version'],
      entityName: 'Tag',
    });

    function findConflicts<T extends { id: string; version?: number }>(clientItems: T[], serverItems: T[]): T[] {
      const serverMap = new Map(serverItems.map(item => [item.id, item]));
      return clientItems.reduce((conflicts, clientItem) => {
        const serverItem = serverMap.get(clientItem.id);
        if (serverItem && (clientItem.version || 1) < (serverItem.version || 1)) {
          conflicts.push(serverItem);
        }
        return conflicts;
      }, [] as T[]);
    }
    
    const conflictCategories = findConflicts(clientData.categories, serverCategories);
    const conflictTransactions = findConflicts(clientData.transactions, serverTransactions);
    const conflictRecurring = findConflicts(clientData.recurringTransactions, serverRecurring);
    const conflictTags = findConflicts(clientData.allAvailableTags, serverTags);

    if (conflictCategories.length || conflictTransactions.length || conflictRecurring.length || conflictTags.length) {
      return res.status(409).json({
        error: 'Conflict: Newer versions of some items were found on the server.',
        conflicts: {
          categories: conflictCategories,
          transactions: conflictTransactions,
          recurring: conflictRecurring,
          tags: conflictTags,
        },
      });
    }

    function mergeData<T extends { id: string; version?: number }>(clientItems: T[], serverItems: T[]): T[] {
      const mergedMap = new Map<string, T>();
      [...serverItems, ...clientItems].forEach(item => {
        const existing = mergedMap.get(item.id);
        if (!existing || (item.version || 1) >= (existing.version || 1)) {
          mergedMap.set(item.id, item);
        }
      });
      return Array.from(mergedMap.values());
    }
    
    const mergedCategories = mergeData(clientData.categories, serverCategories);
    const mergedTransactions = mergeData(clientData.transactions, serverTransactions);
    const mergedRecurring = mergeData(clientData.recurringTransactions, serverRecurring);
    const mergedTags = mergeData(clientData.allAvailableTags, serverTags);

    const headers = {
      categories: ['id', 'name', 'color', 'icon', 'budget', 'group', 'lastModified', 'isDeleted', 'version'],
      transactions: ['id', 'amount', 'description', 'categoryId', 'date', 'tagIds', 'lastModified', 'isDeleted', 'recurringId', 'version'],
      recurring: ['id', 'amount', 'description', 'categoryId', 'frequency', 'startDate', 'lastProcessedDate', 'lastModified', 'isDeleted', 'version'],
      tags: ['id', 'name', 'lastModified', 'isDeleted', 'version'],
    };

    const categoryValues = [headers.categories, ...mergedCategories.map(c => [c.id, c.name, c.color, c.icon, c.budget != null ? String(c.budget) : '', c.group, c.lastModified, c.isDeleted ? 'TRUE' : 'FALSE', c.version])];
    const transactionValues = [headers.transactions, ...mergedTransactions.map(t => [t.id, String(t.amount), t.description, t.categoryId, t.date, t.tagIds?.join(',') || '', t.lastModified, t.isDeleted ? 'TRUE' : 'FALSE', t.recurringId || '', t.version])];
    const recurringValues = [headers.recurring, ...mergedRecurring.map(r => [r.id, String(r.amount), r.description, r.categoryId, r.frequency, r.startDate, r.lastProcessedDate || '', r.lastModified, r.isDeleted ? 'TRUE' : 'FALSE', r.version])];
    const tagValues = [headers.tags, ...mergedTags.map(tag => [tag.id, tag.name, tag.lastModified, tag.isDeleted ? 'TRUE' : 'FALSE', tag.version])];

    await withRetry(() => sheets.spreadsheets.values.batchClear({
      spreadsheetId: sheetId,
      requestBody: { ranges: ['Categories!A1:Z', 'Transactions!A1:Z', 'Recurring!A1:Z', 'Tags!A1:Z'] },
    }));

    await withRetry(() => sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Categories!A1', values: categoryValues },
          { range: 'Transactions!A1', values: transactionValues },
          { range: 'Recurring!A1', values: recurringValues },
          { range: 'Tags!A1', values: tagValues },
        ],
      },
    }));

    return res.status(200).json({ message: 'Data successfully written to sheet.' });
  } catch (error: any) {
    console.error('Error writing to Google Sheet:', error);
    const errorMessage = error?.response?.data?.error?.message || error?.message || 'An unknown error occurred.';
    return res.status(500).json({ error: `Failed to write to sheet. Details: ${errorMessage}` });
  }
}