
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
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
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  return auth;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheetId || typeof sheetId !== 'string') {
    return res.status(500).json({ error: 'Die Google Sheet ID ist auf dem Server nicht konfiguriert.' });
  }

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: ['Categories!A2:F', 'Transactions!A2:F', 'Recurring!A2:G', 'Tags!A2:B'],
    });

    const valueRanges = response.data.valueRanges || [];

    const categoryValues = valueRanges.find(r => r.range?.startsWith('Categories'))?.values || [];
    const categories: Category[] = categoryValues.map((row: string[]) => {
      const budget = row[4] ? parseFloat(row[4].replace(',', '.')) : undefined;
      return {
        id: row[0],
        name: row[1],
        color: row[2],
        icon: row[3],
        budget: budget && !isNaN(budget) && budget > 0 ? budget : undefined,
        group: row[5] || 'Sonstiges',
      };
    }).filter(c => c.id && c.name && c.color && c.icon);

    const transactionValues = valueRanges.find(r => r.range?.startsWith('Transactions'))?.values || [];
    const transactions: Transaction[] = transactionValues.map((row: string[]) => ({
      id: row[0],
      amount: parseFloat(row[1]?.replace(',', '.')) || 0,
      description: row[2],
      categoryId: row[3],
      date: row[4],
      tagIds: row[5] ? row[5].split(',').map(tagId => tagId.trim()).filter(Boolean) : [],
    })).filter(t => t.id && t.amount > 0 && t.categoryId && t.date);

    const recurringValues = valueRanges.find(r => r.range?.startsWith('Recurring'))?.values || [];
    const recurringTransactions: RecurringTransaction[] = recurringValues.map((row: string[]) => ({
        id: row[0],
        amount: parseFloat(row[1]?.replace(',', '.')) || 0,
        description: row[2],
        categoryId: row[3],
        frequency: row[4] as 'monthly' | 'yearly',
        startDate: row[5],
        lastProcessedDate: row[6],
    })).filter(r => r.id && r.amount > 0 && r.categoryId && r.frequency && r.startDate);

    const tagValues = valueRanges.find(r => r.range?.startsWith('Tags'))?.values || [];
    const allAvailableTags: Tag[] = tagValues.map((row: string[]) => ({
        id: row[0],
        name: row[1],
    })).filter(t => t.id && t.name);

    return res.status(200).json({ categories, transactions, recurringTransactions, allAvailableTags });

  } catch (error: any) {
    console.error('Error reading from Google Sheet:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'An unknown error occurred.';
    return res.status(500).json({ error: `Failed to read from sheet. Details: ${errorMessage}` });
  }
}