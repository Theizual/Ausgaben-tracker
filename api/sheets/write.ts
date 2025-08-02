
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
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return auth;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { sheetId, categories, transactions } = req.body;

  if (!sheetId || !Array.isArray(categories) || !Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Sheet ID, categories, and transactions are required.' });
  }

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // Prepare data for upload
    const categoryHeader = ['id', 'name', 'color', 'icon'];
    const transactionHeader = ['id', 'amount', 'description', 'categoryId', 'date'];

    const categoryValues = [categoryHeader, ...categories.map((c: Category) => [c.id, c.name, c.color, c.icon])];
    const transactionValues = [transactionHeader, ...transactions.map((t: Transaction) => [t.id, String(t.amount).replace('.', ','), t.description, t.categoryId, t.date])];

    // Clear existing data
    await sheets.spreadsheets.values.batchClear({
      spreadsheetId: sheetId,
      requestBody: {
        ranges: ['Categories!A1:Z', 'Transactions!A1:Z'],
      },
    });

    // Write new data
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Categories!A1', values: categoryValues },
          { range: 'Transactions!A1', values: transactionValues },
        ],
      },
    });

    return res.status(200).json({ message: 'Data successfully written to sheet.' });

  } catch (error: any) {
    console.error('Error writing to Google Sheet:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'An unknown error occurred.';
    return res.status(500).json({ error: `Failed to write to sheet. Details: ${errorMessage}` });
  }
}
