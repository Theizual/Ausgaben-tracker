
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { withRetry, createSchemas, parseSheetData } from './utils';

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
