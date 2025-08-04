
import { z } from 'zod';
import type { Category, Transaction, RecurringTransaction, Tag } from '../../types';


const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

/**
 * A utility function to wrap Google API calls with an exponential backoff retry mechanism.
 * @param apiCall The async function to call.
 * @returns The result of the successful API call.
 * @throws An error if the API call fails after all retries or with a non-retryable status code.
 */
export async function withRetry<T>(apiCall: () => Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await apiCall();
    } catch (error: any) {
      attempt++;
      const status = error?.response?.status || error?.code;
      const isRetryable = typeof status === 'number' && RETRYABLE_STATUS_CODES.includes(status);
      
      if (isRetryable && attempt < MAX_RETRIES) {
        const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        const jitter = backoffTime * 0.2 * Math.random();
        const waitTime = backoffTime + jitter;
        
        console.warn(`[API Retry] Attempt ${attempt} failed with status ${status}. Retrying in ${waitTime.toFixed(0)}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // Non-retryable error or max retries reached, re-throw the error.
        console.error(`[API Retry] Final attempt ${attempt} failed with status ${status}. Throwing error.`, error);
        throw error;
      }
    }
  }
}

// --- ZOD SCHEMAS & PARSING ---

// A function to create the schemas, so `now` is not stale.
export const createSchemas = (now: string) => {
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

export function parseSheetData<T_Schema extends z.ZodType<any, any, any>>({
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
// Fügen Sie diese Funktionen zu Ihrer utils.js hinzu

// Robuste Zahlenkonvertierung für verschiedene Locales
function parseNumberSafely(value, fieldName = 'unknown') {
  // Null/undefined/empty string handling
  if (value === null || value === undefined || value === '') {
    console.log(`${fieldName}: Empty value, defaulting to 0`);
    return 0;
  }
  
  // Bereits eine Zahl
  if (typeof value === 'number') {
    if (isNaN(value)) {
      console.warn(`${fieldName}: Number is NaN, defaulting to 0`);
      return 0;
    }
    return value;
  }
  
  // String-Konvertierung
  let stringValue = String(value).trim();
  
  // Deutsche Zahlenformate handhaben (Komma als Dezimaltrennzeichen)
  // z.B. "1.234,56" -> "1234.56" oder "12,50" -> "12.50"
  if (stringValue.includes(',')) {
    // Prüfe ob es deutsche Formatierung ist (1.234,56)
    const lastCommaIndex = stringValue.lastIndexOf(',');
    const lastDotIndex = stringValue.lastIndexOf('.');
    
    if (lastCommaIndex > lastDotIndex) {
      // Deutsche Formatierung: ersetze alle Punkte (Tausendertrennzeichen) und Komma durch Punkt
      stringValue = stringValue.replace(/\./g, '').replace(',', '.');
    }
  }
  
  // Entferne alle nicht-numerischen Zeichen außer Punkt und Minus
  stringValue = stringValue.replace(/[^\d.-]/g, '');
  
  // Fallback: Versuche verschiedene Parsing-Methoden
  let result;
  
  // Methode 1: Standard parseFloat
  result = parseFloat(stringValue);
  if (!isNaN(result)) {
    console.log(`${fieldName}: "${value}" -> ${result} (standard)`);
    return result;
  }
  
  // Methode 2: Number constructor
  result = Number(stringValue);
  if (!isNaN(result)) {
    console.log(`${fieldName}: "${value}" -> ${result} (Number constructor)`);
    return result;
  }
  
  // Methode 3: Manual parsing für Edge Cases
  if (stringValue.match(/^-?\d+(\.\d+)?$/)) {
    result = parseFloat(stringValue);
    if (!isNaN(result)) {
      console.log(`${fieldName}: "${value}" -> ${result} (regex match)`);
      return result;
    }
  }
  
  // Wenn alles fehlschlägt
  console.warn(`${fieldName}: Could not parse "${value}" as number, defaulting to 0`);
  return 0;
}

// Verbesserte parseSheetData Funktion
function parseSheetDataRobust({ rows, schema, headers, entityName }) {
  console.log(`\n🔄 Parsing ${entityName} data...`);
  console.log(`Input rows: ${rows.length}`);
  console.log(`Headers: ${JSON.stringify(headers)}`);
  
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log(`${entityName} has no data, returning empty array`);
    return [];
  }

  const results = [];
  const errors = [];

  rows.forEach((row, rowIndex) => {
    try {
      // Konvertiere Array zu Objekt basierend auf Headers
      const rawObject = {};
      headers.forEach((header, colIndex) => {
        rawObject[header] = row[colIndex] || '';
      });

      // Spezielle Behandlung für bekannte Zahlenfelder
      const numberFields = ['amount', 'budget', 'version'];
      numberFields.forEach(field => {
        if (rawObject[field] !== undefined) {
          const originalValue = rawObject[field];
          rawObject[field] = parseNumberSafely(originalValue, `${entityName}[${rowIndex}].${field}`);
        }
      });

      // Boolean-Felder behandeln
      if (rawObject.isDeleted !== undefined) {
        const original = rawObject.isDeleted;
        rawObject.isDeleted = original === 'true' || original === true || original === '1';
        console.log(`${entityName}[${rowIndex}].isDeleted: "${original}" -> ${rawObject.isDeleted}`);
      }

      // Schema-Validierung mit detailliertem Error-Handling
      const parseResult = schema.safeParse(rawObject);
      
      if (!parseResult.success) {
        console.error(`❌ ${entityName} row ${rowIndex} validation failed:`);
        console.error(`Raw data:`, rawObject);
        console.error(`Validation errors:`, parseResult.error.errors);
        
        // Sammle Fehler statt sofort zu werfen
        errors.push({
          row: rowIndex,
          data: rawObject,
          errors: parseResult.error.errors
        });
      } else {
        results.push(parseResult.data);
        console.log(`✅ ${entityName} row ${rowIndex} parsed successfully`);
      }
      
    } catch (error) {
      console.error(`💥 ${entityName} row ${rowIndex} parsing error:`, error);
      errors.push({
        row: rowIndex,
        data: row,
        error: error.message
      });
    }
  });

  if (errors.length > 0) {
    console.error(`\n❌ ${entityName} parsing summary:`);
    console.error(`Successful: ${results.length}`);
    console.error(`Failed: ${errors.length}`);
    console.error(`Error details:`, errors);
    
    // Entscheide ob du einen Fehler werfen oder teilweise Ergebnisse zurückgeben willst
    if (results.length === 0) {
      throw new Error(`All ${entityName} rows failed validation. First error: ${JSON.stringify(errors[0], null, 2)}`);
    } else {
      console.warn(`⚠️  ${entityName}: ${errors.length} rows failed, continuing with ${results.length} valid rows`);
    }
  }

  console.log(`✅ ${entityName} parsing completed: ${results.length} items`);
  return results;
}

// Export für die utils.js
module.exports = {
  parseNumberSafely,
  parseSheetDataRobust,
  // ... andere bestehende Exports
};