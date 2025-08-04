
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { z } from 'zod';
import type { Category, Transaction, RecurringTransaction, Tag } from '../../types';
import { withRetry } from './utils';

async function getAuthClient() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Google service account credentials are not set in environment variables.');
  }

  const auth = new JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  return auth;
}

// --- ZOD SCHEMAS & PARSING ---

// A function to create the schemas, so `now` is not stale.
const createSchemas = (now: string) => {
  // Common Preprocessors & Transformers
  const stringToPositiveFloatOptional = z.preprocess(
    (val) => (val && typeof val === 'string' && val.trim() !== '') ? parseFloat(val.replace(',', '.')) : undefined,
    z.number().positive().optional()
  );

  const stringToPositiveFloatRequired = z.preprocess(
    (val) => (val && typeof val === 'string' && val.trim() !== '') ? parseFloat(val.replace(',', '.')) : undefined,
    z.number().positive()
  );

  const stringToBoolean = z.preprocess((val) => String(val).toUpperCase() === 'TRUE', z.boolean());

  const stringToOptionalDatetime = z.string().datetime().optional().transform(val => val || undefined);
  
  const lastModifiedTransformer = z.string().datetime().or(z.literal('')).transform(val => val || now);
  
  const versionTransformer = z.preprocess(v => parseInt(String(v), 10) || 1, z.number().int().positive());

  // Schemas for row objects
  const categorySchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    color: z.string().min(1),
    icon: z.string().min(1),
    budget: stringToPositiveFloatOptional,
    group: z.string().default('Sonstiges'),
    lastModified: lastModifiedTransformer,
    isDeleted: stringToBoolean,
    version: versionTransformer,
  });

  const transactionSchema = z.object({
    id: z.string().min(1),
    amount: stringToPositiveFloatRequired,
    description: z.string().default(''),
    categoryId: z.string().min(1),
    date: z.string().datetime(),
    tagIds: z.preprocess((val) => String(val || '').split(',').map(tag => tag.trim()).filter(Boolean), z.array(z.string())),
    lastModified: lastModifiedTransformer,
    isDeleted: stringToBoolean,
    recurringId: z.string().optional().transform(val => val || undefined),
    version: versionTransformer,
  });

  const recurringTransactionSchema = z.object({
    id: z.string().min(1),
    amount: stringToPositiveFloatRequired,
    description: z.string().default(''),
    categoryId: z.string().min(1),
    frequency: z.enum(['monthly', 'yearly']),
    startDate: z.string().datetime(),
    lastProcessedDate: stringToOptionalDatetime,
    lastModified: lastModifiedTransformer,
    isDeleted: stringToBoolean,
    version: versionTransformer,
  });

  const tagSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    lastModified: lastModifiedTransformer,
    isDeleted: stringToBoolean,
    version: versionTransformer,
  });

  return { categorySchema, transactionSchema, recurringTransactionSchema, tagSchema };
};

function parseSheetData<T_Schema extends z.ZodType<any, any, any>>({
    rows,
    schema,
    headers,
    entityName,
}: {
    rows: any[][];
    schema: T_Schema;
    headers: string[];
    entityName: string;
}): z.infer<T_Schema>[] {
    const parsedData: z.infer<T_Schema>[] = [];
    if (!rows || rows.length === 0) {
        return parsedData;
    }

    rows.forEach((row, index) => {
        if (row.every(cell => cell === '')) {
            return;
        }

        const rowObject = headers.reduce((obj, header, i) => {
            obj[header] = row[i];
            return obj;
        }, {} as { [key: string]: any });

        const result = schema.safeParse(rowObject);

        if (result.success) {
            parsedData.push(result.data);
        } else {
            const simplifiedErrors = result.error.issues
                .map(issue => `Field '${issue.path.join('.')}': ${issue.message}`)
                .join('; ');
            console.warn(`[Sheet Read] Skipping invalid ${entityName} at row ${index + 2}: ${simplifiedErrors}`);
        }
    });

    return parsedData;
}


// --- API HANDLER ---

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }
  
  const now = new Date().toISOString();
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheetId || typeof sheetId !== 'string') {
    return res.status(500).json({ error: 'Die Google Sheet ID ist auf dem Server nicht konfiguriert.' });
  }

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await withRetry(() => sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: ['Categories!A2:I', 'Transactions!A2:J', 'Recurring!A2:J', 'Tags!A2:E'],
    }));

    const valueRanges = (response as any).data.valueRanges || [];
    const { categorySchema, transactionSchema, recurringTransactionSchema, tagSchema } = createSchemas(now);

    const categoryRows = valueRanges.find(r => r.range?.startsWith('Categories'))?.values || [];
    const transactionRows = valueRanges.find(r => r.range?.startsWith('Transactions'))?.values || [];
    const recurringRows = valueRanges.find(r => r.range?.startsWith('Recurring'))?.values || [];
    const tagRows = valueRanges.find(r => r.range?.startsWith('Tags'))?.values || [];

    const categories = parseSheetData({
        rows: categoryRows,
        schema: categorySchema,
        headers: ['id', 'name', 'color', 'icon', 'budget', 'group', 'lastModified', 'isDeleted', 'version'],
        entityName: 'Category',
    });

    const transactions = parseSheetData({
        rows: transactionRows,
        schema: transactionSchema,
        headers: ['id', 'amount', 'description', 'categoryId', 'date', 'tagIds', 'lastModified', 'isDeleted', 'recurringId', 'version'],
        entityName: 'Transaction',
    });

    const recurringTransactions = parseSheetData({
        rows: recurringRows,
        schema: recurringTransactionSchema,
        headers: ['id', 'amount', 'description', 'categoryId', 'frequency', 'startDate', 'lastProcessedDate', 'lastModified', 'isDeleted', 'version'],
        entityName: 'RecurringTransaction',
    });

    const allAvailableTags = parseSheetData({
        rows: tagRows,
        schema: tagSchema,
        headers: ['id', 'name', 'lastModified', 'isDeleted', 'version'],
        entityName: 'Tag',
    });

    return res.status(200).json({ categories, transactions, recurringTransactions, allAvailableTags });

  } catch (error: unknown) {
    console.error('Error reading from Google Sheet:', error);
    const errorMessage = (error as any)?.response?.data?.error?.message || (error as Error)?.message || 'An unknown error occurred.';
    return res.status(500).json({ error: `Failed to read from sheet. Details: ${errorMessage}` });
  }
}
