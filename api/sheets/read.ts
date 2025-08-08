import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { withRetry, getLenientSchemas, parseSheetData } from './utils.js';
import { z } from 'zod';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }
  
  const userAgent = req.headers['user-agent'] || 'unknown';
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
  
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
      ranges: ['Categories!A2:I', 'Transactions!A2:K', 'Recurring!A2:J', 'Tags!A2:E', 'Users!A2:F', 'UserSettings!A2:F'],
    }));

    const valueRanges = (response as any).data.valueRanges || [];

    const categoryRows = valueRanges.find((r: any) => r.range?.includes('Categories'))?.values || [];
    const transactionRows = valueRanges.find((r: any) => r.range?.includes('Transactions'))?.values || [];
    const recurringRows = valueRanges.find((r: any) => r.range?.includes('Recurring'))?.values || [];
    const tagRows = valueRanges.find((r: any) => r.range?.includes('Tags'))?.values || [];
    const userRows = valueRanges.find((r: any) => r.range?.includes('Users'))?.values || [];
    const userSettingRows = valueRanges.find((r: any) => r.range?.includes('UserSettings'))?.values || [];

    const schemas = getLenientSchemas(now);
    
    const categories = parseSheetData({
      rows: categoryRows,
      schema: z.array(schemas.CategorySchema),
      headers: ['id', 'name', 'color', 'icon', 'budget', 'group', 'lastModified', 'isDeleted', 'version'],
      entityName: 'Category',
    });
    
    const transactions = parseSheetData({
      rows: transactionRows,
      schema: z.array(schemas.TransactionSchema),
      headers: ['id', 'amount', 'description', 'categoryId', 'date', 'tagIds', 'lastModified', 'isDeleted', 'recurringId', 'version', 'createdBy'],
      entityName: 'Transaction',
    });
    
    const recurringTransactions = parseSheetData({
      rows: recurringRows,
      schema: z.array(schemas.RecurringTransactionSchema),
      headers: ['id', 'amount', 'description', 'categoryId', 'frequency', 'startDate', 'lastProcessedDate', 'lastModified', 'isDeleted', 'version'],
      entityName: 'RecurringTransaction',
    });
    
    const allAvailableTags = parseSheetData({
      rows: tagRows,
      schema: z.array(schemas.TagSchema),
      headers: ['id', 'name', 'lastModified', 'isDeleted', 'version'],
      entityName: 'Tag',
    });

    const users = parseSheetData({
      rows: userRows,
      schema: z.array(schemas.UserSchema),
      headers: ['id', 'name', 'color', 'lastModified', 'isDeleted', 'version'],
      entityName: 'User',
    });

    const userSettings = parseSheetData({
      rows: userSettingRows,
      schema: z.array(schemas.UserSettingSchema),
      headers: ['userId', 'settingKey', 'settingValue', 'lastModified', 'isDeleted', 'version'],
      entityName: 'UserSetting',
    });

    return res.status(200).json({
      categories,
      transactions,
      recurringTransactions,
      allAvailableTags,
      users,
      userSettings,
    });

  } catch (error: unknown) {
    let errorMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(500).json({ 
      error: `Failed to read from sheet: ${errorMessage}`,
    });
  }
}