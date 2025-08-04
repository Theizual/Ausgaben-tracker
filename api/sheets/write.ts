import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { z } from 'zod';
import { withRetry, createSchemas, parseSheetData } from './utils.js';
import type { Category, Transaction, RecurringTransaction, Tag } from '../../types';

async function getAuthClient() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

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

// --- ZOD SCHEMA FOR REQUEST BODY ---
const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  budget: z.number().optional(),
  group: z.string(),
  lastModified: z.string().datetime(),
  isDeleted: z.boolean().optional(),
  version: z.number().int().positive(),
});
const TransactionSchema = z.object({
  id: z.string(),
  amount: z.number().positive(),
  description: z.string(),
  categoryId: z.string(),
  date: z.string().datetime(),
  tagIds: z.array(z.string()).optional(),
  recurringId: z.string().optional(),
  lastModified: z.string().datetime(),
  isDeleted: z.boolean().optional(),
  version: z.number().int().positive(),
});
const RecurringTransactionSchema = z.object({
  id: z.string(),
  amount: z.number().positive(),
  description: z.string(),
  categoryId: z.string(),
  frequency: z.enum(['monthly', 'yearly']),
  startDate: z.string().datetime(),
  lastProcessedDate: z.string().datetime().optional(),
  lastModified: z.string().datetime(),
  isDeleted: z.boolean().optional(),
  version: z.number().int().positive(),
});
const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  lastModified: z.string().datetime(),
  isDeleted: z.boolean().optional(),
  version: z.number().int().positive(),
});

const WriteBodySchema = z.object({
    categories: z.array(CategorySchema),
    transactions: z.array(TransactionSchema),
    recurringTransactions: z.array(RecurringTransactionSchema),
    allAvailableTags: z.array(TagSchema),
});

type Mergeable = Category | Transaction | RecurringTransaction | Tag;

// This constraint ensures that TypeScript preserves all properties during spread operations.
type FullObjectWithVersion = { id: string; version: number; [key: string]: any };

function findConflicts<T extends FullObjectWithVersion>(clientItems: T[], serverItems: T[]): T[] {
    const serverMap = new Map(serverItems.map(item => [item.id, item]));
    const conflicts: T[] = [];

    for(const clientItem of clientItems) {
        const serverItem = serverMap.get(clientItem.id);
        if(serverItem && clientItem.version < serverItem.version) {
            // Server is newer, this is a conflict. Send server version back.
            conflicts.push(serverItem);
        }
    }
    return conflicts;
}

function mergeData<T extends FullObjectWithVersion>(clientItems: T[], serverItems: T[]): T[] {
    const allItems = new Map<string, T>();
    
    [...serverItems, ...clientItems].forEach(item => {
        const existing = allItems.get(item.id);
        if(!existing || item.version > existing.version) {
            allItems.set(item.id, item);
        }
    });

    return Array.from(allItems.values());
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

  // 0. Robustly parse JSON body (handles cases where req.body is a string or Buffer)
const contentType = (req.headers['content-type'] || '').toString().toLowerCase();
let parsedBody: any = (req as any).body;

try {
  if (typeof parsedBody === 'string') {
    parsedBody = JSON.parse(parsedBody);
  } else if (parsedBody && typeof parsedBody === 'object') {
    // already parsed
  } else if (parsedBody instanceof Buffer) {
    parsedBody = JSON.parse(parsedBody.toString('utf8'));
  }
} catch (e) {
  return res.status(400).json({ error: 'Invalid JSON body (parse failed)' });
}

if (!parsedBody || typeof parsedBody !== 'object') {
  return res.status(400).json({ error: 'Invalid JSON body', contentType });
}

// 1. Validate incoming data
const validationResult = WriteBodySchema.safeParse(parsedBody);
if (!validationResult.success) {
    console.error("Invalid write request body:", JSON.stringify(validationResult.error.flatten(), null, 2));
    return res.status(400).json(validationResult.error.flatten());
}
const clientData = validationResult.data;

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // 2. Read current server state
    const readResponse = await withRetry(() => sheets.spreadsheets.values.batchGet({
        spreadsheetId: sheetId,
        ranges: ['Categories!A2:I', 'Transactions!A2:J', 'Recurring!A2:J', 'Tags!A2:E'],
    }));

    const now = new Date().toISOString();
    const { 
        categorySchema, 
        transactionSchema, 
        recurringTransactionSchema, 
        tagSchema 
    } = createSchemas(now);

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


    // 3. Detect conflicts
    const conflictCategories = findConflicts(clientData.categories, serverCategories);
    const conflictTransactions = findConflicts(clientData.transactions, serverTransactions);
    const conflictRecurring = findConflicts(clientData.recurringTransactions, serverRecurring);
    const conflictTags = findConflicts(clientData.allAvailableTags, serverTags);
    
    const allConflicts = [
        ...conflictCategories, ...conflictTransactions, ...conflictRecurring, ...conflictTags
    ];

    if (allConflicts.length > 0) {
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

    // 4. No conflicts, merge data and write
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

    const categoryValues = [headers.categories, ...mergedCategories.map((c: Category) => [c.id, c.name, c.color, c.icon, c.budget ? String(c.budget).replace('.', ',') : '', c.group, c.lastModified, c.isDeleted ? 'TRUE' : 'FALSE', c.version])];
    const transactionValues = [headers.transactions, ...mergedTransactions.map((t: Transaction) => [t.id, String(t.amount).replace('.', ','), t.description, t.categoryId, t.date, t.tagIds?.join(',') || '', t.lastModified, t.isDeleted ? 'TRUE' : 'FALSE', t.recurringId || '', t.version])];
    const recurringValues = [headers.recurring, ...mergedRecurring.map((r: RecurringTransaction) => [r.id, String(r.amount).replace('.',','), r.description, r.categoryId, r.frequency, r.startDate, r.lastProcessedDate || '', r.lastModified, r.isDeleted ? 'TRUE' : 'FALSE', r.version])];
    const tagValues = [headers.tags, ...mergedTags.map((tag: Tag) => [tag.id, tag.name, tag.lastModified, tag.isDeleted ? 'TRUE' : 'FALSE', tag.version])];

    // 5. Clear ALL sheets and then write. This is simpler than calculating diffs.
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

  } catch (error: unknown) {
    console.error('Error writing to Google Sheet:', error);
    const errorMessage = (error as any)?.response?.data?.error?.message || (error as Error)?.message || 'An unknown error occurred.';
    return res.status(500).json({ error: `Failed to write to sheet. Details: ${errorMessage}` });
  }
}
