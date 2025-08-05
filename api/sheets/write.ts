import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { z } from 'zod';
import { withRetry, createSchemas, parseSheetData } from './utils.js';
import type { Category, Transaction, RecurringTransaction, Tag } from '../../types';
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

// --- SANITIZATION HELPERS ---
// Helper for robust number parsing, handling German locale and empty/null values.
const numberSanitizer = (fallback: number | undefined) => (val: unknown): number | undefined => {
    if (val === null || val === undefined) {
        return fallback;
    }
    if (typeof val === 'number') {
        return isNaN(val) ? fallback : val;
    }
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed === '') return fallback;
        // Replace comma with dot for German decimal format, then parse.
        const num = parseFloat(trimmed.replace(',', '.'));
        return isNaN(num) ? fallback : num;
    }
    // For other types, return the fallback.
    return fallback;
};

// Zod preprocessor for required numeric fields. Invalid/empty values become 0.
const SanitizeRequiredNumber = z.preprocess(numberSanitizer(0), z.number());
// Zod preprocessor for optional numeric fields. Invalid/empty values become undefined.
const SanitizeOptionalNumber = z.preprocess(numberSanitizer(undefined), z.number().optional());


// --- STRICT BASE SCHEMAS ---
const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  budget: z.number().optional(),
  group: z.string(),
  lastModified: z.string(),
  isDeleted: z.boolean().optional(),
  version: z.number(),
});
const TransactionSchema = z.object({
  id: z.string(),
  amount: z.number(),
  description: z.string(),
  categoryId: z.string(),
  date: z.string(),
  tagIds: z.array(z.string()).optional(),
  recurringId: z.string().optional(),
  lastModified: z.string(),
  isDeleted: z.boolean().optional(),
  version: z.number(),
});
const RecurringTransactionSchema = z.object({
  id: z.string(),
  amount: z.number(),
  description: z.string(),
  categoryId: z.string(),
  frequency: z.enum(['monthly', 'yearly']),
  startDate: z.string(),
  lastProcessedDate: z.string().optional(),
  lastModified: z.string(),
  isDeleted: z.boolean().optional(),
  version: z.number(),
});
const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  lastModified: z.string(),
  isDeleted: z.boolean().optional(),
  version: z.number(),
});

// --- LENIENT WRAPPER SCHEMAS WITH SANITIZATION ---
const DateString = z.string().refine(v => !Number.isNaN(Date.parse(v)), 'Invalid datetime');

const CategorySchema2 = CategorySchema.extend({
    budget: SanitizeOptionalNumber,
    lastModified: DateString,
    version: SanitizeRequiredNumber
});
const TransactionSchema2 = TransactionSchema.extend({
    amount: SanitizeRequiredNumber,
    date: DateString,
    lastModified: DateString,
    version: SanitizeRequiredNumber
});
const RecurringTransactionSchema2 = RecurringTransactionSchema.extend({
    amount: SanitizeRequiredNumber,
    startDate: DateString,
    lastProcessedDate: DateString.optional(),
    lastModified: DateString,
    version: SanitizeRequiredNumber
});
const TagSchema2 = TagSchema.extend({
    lastModified: DateString,
    version: SanitizeRequiredNumber
});

const WriteBodySchema2 = z.object({
  categories: z.array(CategorySchema2).optional().default([]),
  transactions: z.array(TransactionSchema2).optional().default([]),
  recurringTransactions: z.array(RecurringTransactionSchema2).optional().default([]),
  allAvailableTags: z.array(TagSchema2).optional().default([]),
});

function normalizeArray(input: any): any[] {
  if (!Array.isArray(input)) return [];
  const out: any[] = [];
  for (const item of input) {
    if (item == null) continue;
    if (typeof item === 'string') {
      try {
        const parsed = JSON.parse(item);
        if (parsed && typeof parsed === 'object') { out.push(parsed); continue; }
        else continue;
      } catch { continue; }
    }
    if (typeof item === 'object') {
      // filter out empty objects like {} (no id)
      if (Object.keys(item).length === 0) continue;
      out.push(item);
      continue;
    }
    // ignore other primitive types
  }
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    return res.status(500).json({ error: 'Die Google Sheet ID ist auf dem Server nicht konfiguriert.' });
  }

  // CORS (optional; harmless if same origin)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 0) Robustly parse JSON
  let parsedBody: any = (req as any).body;
  try {
    if (typeof parsedBody === 'string') parsedBody = JSON.parse(parsedBody);
    else if (parsedBody instanceof Buffer) parsedBody = JSON.parse(parsedBody.toString('utf8'));
    else if (!parsedBody || typeof parsedBody !== 'object') parsedBody = {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body (parse failed)' });
  }

  // 1) Normalize possibly weird arrays from some mobile stacks
  parsedBody = {
    categories: normalizeArray(parsedBody.categories),
    transactions: normalizeArray(parsedBody.transactions),
    recurringTransactions: normalizeArray(parsedBody.recurringTransactions),
    allAvailableTags: normalizeArray(parsedBody.allAvailableTags),
  };

  // 2) Validate with lenient schema
  const validationResult = WriteBodySchema2.safeParse(parsedBody);
  if (!validationResult.success) {
    console.error("Invalid write request body:", JSON.stringify(validationResult.error.flatten(), null, 2));
    return res.status(400).json(validationResult.error.flatten());
  }
  const clientData = validationResult.data;

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // Read server state
    const readResponse = await withRetry(() => sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: ['Categories!A2:I', 'Transactions!A2:J', 'Recurring!A2:J', 'Tags!A2:E'],
    }));

    const now = new Date().toISOString();
    const { categorySchema, transactionSchema, recurringTransactionSchema, tagSchema } = createSchemas(now);

    const serverValues = (readResponse as any).data.valueRanges || [];
    const serverCategories = parseSheetData({
      rows: serverValues.find((r: any) => r.range?.startsWith('Categories'))?.values || [],
      schema: categorySchema,
      headers: ['id', 'name', 'color', 'icon', 'budget', 'group', 'lastModified', 'isDeleted', 'version'],
      entityName: 'Category',
    });
    const serverTransactions = parseSheetData({
      rows: serverValues.find((r: any) => r.range?.startsWith('Transactions'))?.values || [],
      schema: transactionSchema,
      headers: ['id', 'amount', 'description', 'categoryId', 'date', 'tagIds', 'lastModified', 'isDeleted', 'recurringId', 'version'],
      entityName: 'Transaction',
    });
    const serverRecurring = parseSheetData({
      rows: serverValues.find((r: any) => r.range?.startsWith('Recurring'))?.values || [],
      schema: recurringTransactionSchema,
      headers: ['id', 'amount', 'description', 'categoryId', 'frequency', 'startDate', 'lastProcessedDate', 'lastModified', 'isDeleted', 'version'],
      entityName: 'RecurringTransaction',
    });
    const serverTags = parseSheetData({
      rows: serverValues.find((r: any) => r.range?.startsWith('Tags'))?.values || [],
      schema: tagSchema,
      headers: ['id', 'name', 'lastModified', 'isDeleted', 'version'],
      entityName: 'Tag',
    });

    // Conflicts
    function findConflicts(itemsA: any[], itemsB: any[]) {
      const mapB = new Map(itemsB.map(x => [x.id, x]));
      const conflicts: any[] = [];
      for (const a of itemsA) {
        const b = mapB.get(a.id);
        if (b && Number(a.version) < Number(b.version)) conflicts.push(b);
      }
      return conflicts;
    }
    const conflictCategories = findConflicts(clientData.categories, serverCategories);
    const conflictTransactions = findConflicts(clientData.transactions, serverTransactions);
    const conflictRecurring = findConflicts(clientData.recurringTransactions, serverRecurring);
    const conflictTags = findConflicts(clientData.allAvailableTags, serverTags);

    const anyConflicts = conflictCategories.length + conflictTransactions.length + conflictRecurring.length + conflictTags.length > 0;
    if (anyConflicts) {
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

    // Merge (favor higher version)
    function mergeData(a: any[], b: any[]) {
      const m = new Map<string, any>();
      for (const it of [...b, ...a]) {
        const ex = m.get(it.id);
        if (!ex || Number(it.version) > Number(ex.version)) m.set(it.id, it);
      }
      return Array.from(m.values());
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

    const categoryValues = [headers.categories, ...mergedCategories.map((c: any) => [c.id, c.name, c.color, c.icon, c.budget != null ? String(c.budget).replace('.', ',') : '', c.group, c.lastModified, c.isDeleted ? 'TRUE' : 'FALSE', c.version])];
    const transactionValues = [headers.transactions, ...mergedTransactions.map((t: any) => [t.id, String(t.amount).replace('.', ','), t.description, t.categoryId, t.date, Array.isArray(t.tagIds) ? t.tagIds.join(',') : '', t.lastModified, t.isDeleted ? 'TRUE' : 'FALSE', t.recurringId || '', t.version])];
    const recurringValues = [headers.recurring, ...mergedRecurring.map((r: any) => [r.id, String(r.amount).replace('.',','), r.description, r.categoryId, r.frequency, r.startDate, r.lastProcessedDate || '', r.lastModified, r.isDeleted ? 'TRUE' : 'FALSE', r.version])];
    const tagValues = [headers.tags, ...mergedTags.map((tag: any) => [tag.id, tag.name, tag.lastModified, tag.isDeleted ? 'TRUE' : 'FALSE', tag.version])];

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