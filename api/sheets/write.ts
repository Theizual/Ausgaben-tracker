
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
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return auth;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { categories, transactions, recurringTransactions, allAvailableTags } = req.body;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheetId || typeof sheetId !== 'string') {
    return res.status(500).json({ error: 'Die Google Sheet ID ist auf dem Server nicht konfiguriert.' });
  }

  if (!Array.isArray(categories) || !Array.isArray(transactions) || !Array.isArray(recurringTransactions) || !Array.isArray(allAvailableTags)) {
    return res.status(400).json({ error: 'Categories, transactions, recurring transactions, and tags are required.' });
  }

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // Ensure all required sheets exist, create them if they don't
    const requiredSheetTitles = ['Categories', 'Transactions', 'Recurring', 'Tags'];
    const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
        fields: 'sheets.properties.title',
    });

    const existingSheetTitles = spreadsheet.data.sheets?.map(s => s.properties?.title || '') || [];
    const missingSheets = requiredSheetTitles.filter(title => !existingSheetTitles.includes(title));

    if (missingSheets.length > 0) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
                requests: missingSheets.map(title => ({
                    addSheet: { properties: { title } }
                }))
            }
        });
    }

    // Prepare data for upload
    const categoryHeader = ['id', 'name', 'color', 'icon', 'budget', 'group', 'lastModified', 'isDeleted'];
    const transactionHeader = ['id', 'amount', 'description', 'categoryId', 'date', 'tagIds', 'lastModified', 'isDeleted'];
    const recurringHeader = ['id', 'amount', 'description', 'categoryId', 'frequency', 'startDate', 'lastProcessedDate', 'lastModified', 'isDeleted'];
    const tagHeader = ['id', 'name', 'lastModified', 'isDeleted'];

    const categoryValues = [categoryHeader, ...categories.map((c: Category) => [c.id, c.name, c.color, c.icon, c.budget ? String(c.budget).replace('.', ',') : '', c.group, c.lastModified, c.isDeleted ? 'TRUE' : 'FALSE'])];
    const transactionValues = [transactionHeader, ...transactions.map((t: Transaction) => [
        String(t.id), 
        String(t.amount).replace('.', ','), 
        t.description, 
        t.categoryId, 
        t.date,
        t.tagIds?.join(',') || '',
        t.lastModified,
        t.isDeleted ? 'TRUE' : 'FALSE',
    ])];
    const recurringValues = [recurringHeader, ...recurringTransactions.map((r: RecurringTransaction) => [r.id, String(r.amount).replace('.',','), r.description, r.categoryId, r.frequency, r.startDate, r.lastProcessedDate || '', r.lastModified, r.isDeleted ? 'TRUE' : 'FALSE'])];
    const tagValues = [tagHeader, ...allAvailableTags.map((tag: Tag) => [tag.id, tag.name, tag.lastModified, tag.isDeleted ? 'TRUE' : 'FALSE'])];

    // Clear existing data
    await sheets.spreadsheets.values.batchClear({
      spreadsheetId: sheetId,
      requestBody: {
        ranges: ['Categories!A1:Z', 'Transactions!A1:Z', 'Recurring!A1:Z', 'Tags!A1:Z'],
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
          { range: 'Recurring!A1', values: recurringValues },
          { range: 'Tags!A1', values: tagValues },
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