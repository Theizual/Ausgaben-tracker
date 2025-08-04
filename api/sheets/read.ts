import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { withRetry, createSchemas, parseSheetData } from './utils.js';

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

// Verbesserte Retry-Logik speziell für mobile Geräte
async function withMobileRetry<T>(
  operation: () => Promise<T>, 
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}`);
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      // Auf mobilen Geräten länger warten
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Validierung der geladenen Daten
function validateSheetData(data: any, entityName: string): boolean {
  if (!Array.isArray(data)) {
    console.error(`${entityName} is not an array:`, data);
    return false;
  }
  
  if (data.length === 0) {
    console.warn(`${entityName} array is empty`);
    return true; // Leere Arrays sind OK
  }
  
  // Prüfe ob mindestens ein Element gültige IDs hat
  const hasValidItems = data.some(item => item && typeof item.id === 'string' && item.id.length > 0);
  if (!hasValidItems) {
    console.error(`${entityName} contains no valid items with IDs`);
    return false;
  }
  
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }
  
  // User-Agent für Debugging loggen
  const userAgent = req.headers['user-agent'] || 'unknown';
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
  console.log(`Request from ${isMobile ? 'mobile' : 'desktop'} device:`, userAgent);
  
  const now = new Date().toISOString();
  const sheetId = process.env.GOOGLE_SHEET_ID;
  
  if (!sheetId || typeof sheetId !== 'string') {
    return res.status(500).json({ error: 'Die Google Sheet ID ist auf dem Server nicht konfiguriert.' });
  }

  try {
    console.log('Getting auth client...');
    const auth = await getAuthClient();
    
    console.log('Creating sheets client...');
    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log('Fetching data from sheets...');
    // Für mobile Geräte längere Timeouts und mehr Retries
    const response = await withMobileRetry(
      () => sheets.spreadsheets.values.batchGet({
        spreadsheetId: sheetId,
        ranges: ['Categories!A2:I', 'Transactions!A2:J', 'Recurring!A2:J', 'Tags!A2:E'],
      }),
      isMobile ? 5 : 3, // Mehr Retries für mobile
      isMobile ? 2000 : 1000 // Längere Delays für mobile
    );

    console.log('Processing response...');
    const valueRanges = (response as any).data.valueRanges || [];
    
    // Debugging: Logge die Anzahl der erhaltenen Ranges
    console.log(`Received ${valueRanges.length} value ranges`);
    valueRanges.forEach((range: any, index: number) => {
      console.log(`Range ${index}: ${range.range}, rows: ${range.values?.length || 0}`);
    });

    const { categorySchema, transactionSchema, recurringTransactionSchema, tagSchema } = createSchemas(now);

    // Sicherere Extraktion der Daten
    const categoryRows = valueRanges.find((r: any) => r.range?.includes('Categories'))?.values || [];
    const transactionRows = valueRanges.find((r: any) => r.range?.includes('Transactions'))?.values || [];
    const recurringRows = valueRanges.find((r: any) => r.range?.includes('Recurring'))?.values || [];
    const tagRows = valueRanges.find((r: any) => r.range?.includes('Tags'))?.values || [];

    console.log('Row counts:', {
      categories: categoryRows.length,
      transactions: transactionRows.length,
      recurring: recurringRows.length,
      tags: tagRows.length
    });

    // Parse data with error handling
    let categories, transactions, recurringTransactions, allAvailableTags;
    
    try {
      categories = parseSheetData({
        rows: categoryRows,
        schema: categorySchema,
        headers: ['id', 'name', 'color', 'icon', 'budget', 'group', 'lastModified', 'isDeleted', 'version'],
        entityName: 'Category',
      });
      
      transactions = parseSheetData({
        rows: transactionRows,
        schema: transactionSchema,
        headers: ['id', 'amount', 'description', 'categoryId', 'date', 'tagIds', 'lastModified', 'isDeleted', 'recurringId', 'version'],
        entityName: 'Transaction',
      });
      
      recurringTransactions = parseSheetData({
        rows: recurringRows,
        schema: recurringTransactionSchema,
        headers: ['id', 'amount', 'description', 'categoryId', 'frequency', 'startDate', 'lastProcessedDate', 'lastModified', 'isDeleted', 'version'],
        entityName: 'RecurringTransaction',
      });
      
      allAvailableTags = parseSheetData({
        rows: tagRows,
        schema: tagSchema,
        headers: ['id', 'name', 'lastModified', 'isDeleted', 'version'],
        entityName: 'Tag',
      });
    } catch (parseError) {
      console.error('Error parsing sheet data:', parseError);
      throw new Error(`Data parsing failed: ${(parseError as Error).message}`);
    }

    // Validiere die geparsten Daten
    const validationResults = {
      categories: validateSheetData(categories, 'Categories'),
      transactions: validateSheetData(transactions, 'Transactions'),
      recurringTransactions: validateSheetData(recurringTransactions, 'RecurringTransactions'),
      allAvailableTags: validateSheetData(allAvailableTags, 'AllAvailableTags')
    };

    console.log('Validation results:', validationResults);

    // Wenn kritische Daten fehlen, Fehler werfen
    if (!validationResults.categories) {
      throw new Error('Categories data is invalid or missing');
    }

    // Erfolgreiche Antwort mit zusätzlichen Debug-Infos
    const responseData = {
      categories,
      transactions,
      recurringTransactions,
      allAvailableTags,
      // Debug-Infos (nur in Development)
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          isMobile,
          userAgent,
          rowCounts: {
            categories: categoryRows.length,
            transactions: transactionRows.length,
            recurring: recurringRows.length,
            tags: tagRows.length
          },
          validationResults
        }
      })
    };

    console.log('Sending successful response');
    return res.status(200).json(responseData);

  } catch (error: unknown) {
    console.error('Error reading from Google Sheet:', error);
    
    // Detailliertere Fehlerbehandlung
    let errorMessage = 'An unknown error occurred.';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Spezielle Behandlung für verschiedene Fehlertypen
      if (error.message.includes('timeout')) {
        statusCode = 408;
        errorMessage = 'Request timeout - please try again';
      } else if (error.message.includes('network')) {
        statusCode = 503;
        errorMessage = 'Network error - please check your connection';
      } else if (error.message.includes('auth')) {
        statusCode = 401;
        errorMessage = 'Authentication failed';
      }
    } else if ((error as any)?.response?.data?.error?.message) {
      errorMessage = (error as any).response.data.error.message;
    }

    return res.status(statusCode).json({ 
      error: `Failed to read from sheet: ${errorMessage}`,
      isMobile,
      timestamp: new Date().toISOString()
    });
  }
}