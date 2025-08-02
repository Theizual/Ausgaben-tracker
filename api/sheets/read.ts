
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import type { Category, Transaction } from '../../types';

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

  const { sheetId } = req.body;

  if (!sheetId || typeof sheetId !== 'string') {
    return res.status(400).json({ error: 'Sheet ID is required.' });
  }

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: ['Categories!A2:D', 'Transactions!A2:E'],
    });

    const valueRanges = response.data.valueRanges || [];

    const categoryValues = valueRanges.find(r => r.range?.startsWith('Categories'))?.values || [];
    const categories: Category[] = categoryValues.map((row: string[]) => ({
      id: row[0], name: row[1], color: row[2], icon: row[3],
    })).filter(c => c.id && c.name && c.color && c.icon);

    const transactionValues = valueRanges.find(r => r.range?.startsWith('Transactions'))?.values || [];
    const transactions: Transaction[] = transactionValues.map((row: string[]) => ({
      id: row[0],
      amount: parseFloat(row[1]?.replace(',', '.')) || 0,
      description: row[2],
      categoryId: row[3],
      date: row[4],
    })).filter(t => t.id && t.amount > 0 && t.categoryId && t.date);

    return res.status(200).json({ categories, transactions });

  } catch (error: any) {
    console.error('Error reading from Google Sheet:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'An unknown error occurred.';
    return res.status(500).json({ error: `Failed to read from sheet. Details: ${errorMessage}` });
  }
}
