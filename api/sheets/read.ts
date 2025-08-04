import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { withRetry, createSchemas, parseSheetData } from './utils.js';

// Debug-Funktion für Rohdaten
function debugRawData(name: string, rows: any[][], headers: string[]) {
  console.log(`\n=== DEBUG ${name} ===`);
  console.log(`Rows count: ${rows.length}`);
  console.log(`Headers: ${JSON.stringify(headers)}`);
  
  // Zeige die ersten 2 Zeilen
  rows.slice(0, 2).forEach((row, index) => {
    console.log(`Row ${index}:`, row);
    
    // Überprüfe jede Zelle auf problematische Werte
    row.forEach((cell, cellIndex) => {
      const headerName = headers[cellIndex] || `col_${cellIndex}`;
      if (cell === '' || cell === null || cell === undefined) {
        console.log(`  ${headerName}: EMPTY`);
      } else if (headerName.includes('amount') || headerName.includes('budget') || headerName.includes('version')) {
        // Für Zahlenfelder
        const parsed = parseFloat(cell);
        if (isNaN(parsed)) {
          console.log(`  ${headerName}: "${cell}" -> NaN (PROBLEM!)`);
        } else {
          console.log(`  ${headerName}: "${cell}" -> ${parsed} (OK)`);
        }
      } else {
        console.log(`  ${headerName}: "${cell}" (${typeof cell})`);
      }
    });
  });
  console.log(`=== END DEBUG ${name} ===\n`);
}

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
  
  // User-Agent für Debugging
  const userAgent = req.headers['user-agent'] || 'unknown';
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
  console.log(`\n🔍 REQUEST DEBUG:`);
  console.log(`Device: ${isMobile ? 'MOBILE' : 'DESKTOP'}`);
  console.log(`User-Agent: ${userAgent}`);
  
  const now = new Date().toISOString();
  const sheetId = process.env.GOOGLE_SHEET_ID;
  
  if (!sheetId || typeof sheetId !== 'string') {
    return res.status(500).json({ error: 'Die Google Sheet ID ist auf dem Server nicht konfiguriert.' });
  }

  try {
    console.log('📡 Getting auth client...');
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log('📊 Fetching data from Google Sheets...');
    const response = await withRetry(() => sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: ['Categories!A2:I', 'Transactions!A2:J', 'Recurring!A2:J', 'Tags!A2:E'],
    }));

    const valueRanges = (response as any).data.valueRanges || [];
    console.log(`📋 Received ${valueRanges.length} ranges from Google Sheets`);

    // Rohdaten extrahieren
    const categoryRows = valueRanges.find((r: any) => r.range?.includes('Categories'))?.values || [];
    const transactionRows = valueRanges.find((r: any) => r.range?.includes('Transactions'))?.values || [];
    const recurringRows = valueRanges.find((r: any) => r.range?.includes('Recurring'))?.values || [];
    const tagRows = valueRanges.find((r: any) => r.range?.includes('Tags'))?.values || [];

    // DEBUG: Analysiere die Rohdaten
    debugRawData('CATEGORIES', categoryRows, ['id', 'name', 'color', 'icon', 'budget', 'group', 'lastModified', 'isDeleted', 'version']);
    debugRawData('TRANSACTIONS', transactionRows, ['id', 'amount', 'description', 'categoryId', 'date', 'tagIds', 'lastModified', 'isDeleted', 'recurringId', 'version']);
    debugRawData('RECURRING', recurringRows, ['id', 'amount', 'description', 'categoryId', 'frequency', 'startDate', 'lastProcessedDate', 'lastModified', 'isDeleted', 'version']);
    debugRawData('TAGS', tagRows, ['id', 'name', 'lastModified', 'isDeleted', 'version']);

    // Schemas erstellen
    console.log('🏗️  Creating schemas...');
    const { categorySchema, transactionSchema, recurringTransactionSchema, tagSchema } = createSchemas(now);

    // Daten parsen mit erweiterten Error-Handling
    console.log('🔄 Parsing data...');
    let categories, transactions, recurringTransactions, allAvailableTags;
    
    try {
      categories = parseSheetData({
        rows: categoryRows,
        schema: categorySchema,
        headers: ['id', 'name', 'color', 'icon', 'budget', 'group', 'lastModified', 'isDeleted', 'version'],
        entityName: 'Category',
      });
      console.log(`✅ Categories parsed: ${categories.length} items`);
    } catch (error) {
      console.error('❌ Categories parsing failed:', error);
      throw new Error(`Categories parsing failed: ${error.message}`);
    }
    
    try {
      transactions = parseSheetData({
        rows: transactionRows,
        schema: transactionSchema,
        headers: ['id', 'amount', 'description', 'categoryId', 'date', 'tagIds', 'lastModified', 'isDeleted', 'recurringId', 'version'],
        entityName: 'Transaction',
      });
      console.log(`✅ Transactions parsed: ${transactions.length} items`);
    } catch (error) {
      console.error('❌ Transactions parsing failed:', error);
      throw new Error(`Transactions parsing failed: ${error.message}`);
    }
    
    try {
      recurringTransactions = parseSheetData({
        rows: recurringRows,
        schema: recurringTransactionSchema,
        headers: ['id', 'amount', 'description', 'categoryId', 'frequency', 'startDate', 'lastProcessedDate', 'lastModified', 'isDeleted', 'version'],
        entityName: 'RecurringTransaction',
      });
      console.log(`✅ Recurring transactions parsed: ${recurringTransactions.length} items`);
    } catch (error) {
      console.error('❌ Recurring transactions parsing failed:', error);
      throw new Error(`Recurring transactions parsing failed: ${error.message}`);
    }
    
    try {
      allAvailableTags = parseSheetData({
        rows: tagRows,
        schema: tagSchema,
        headers: ['id', 'name', 'lastModified', 'isDeleted', 'version'],
        entityName: 'Tag',
      });
      console.log(`✅ Tags parsed: ${allAvailableTags.length} items`);
    } catch (error) {
      console.error('❌ Tags parsing failed:', error);
      throw new Error(`Tags parsing failed: ${error.message}`);
    }

    // Erfolgreiche Antwort
    const responseData = {
      categories,
      transactions,
      recurringTransactions,
      allAvailableTags,
      // Debug-Infos für Development
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          isMobile,
          userAgent,
          rawRowCounts: {
            categories: categoryRows.length,
            transactions: transactionRows.length,
            recurring: recurringRows.length,
            tags: tagRows.length
          }
        }
      })
    };

    console.log('✅ Sending successful response');
    return res.status(200).json(responseData);

  } catch (error: unknown) {
    console.error('💥 API Error:', error);
    
    let errorMessage = 'An unknown error occurred.';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Error stack:', error.stack);
    } else if ((error as any)?.response?.data?.error?.message) {
      errorMessage = (error as any).response.data.error.message;
    }

    return res.status(statusCode).json({ 
      error: `Failed to read from sheet: ${errorMessage}`,
      isMobile,
      timestamp: new Date().toISOString(),
      userAgent
    });
  }
}