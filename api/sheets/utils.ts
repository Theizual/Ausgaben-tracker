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
    z.number({ required_error: "Amount is required" }).positive()
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
  
  const arrayWrapper = <T extends z.ZodTypeAny>(schema: T) => z.array(schema);

  return { 
      categorySchema: arrayWrapper(categorySchema), 
      transactionSchema: arrayWrapper(transactionSchema), 
      recurringTransactionSchema: arrayWrapper(recurringTransactionSchema), 
      tagSchema: arrayWrapper(tagSchema)
  };
};

export function parseSheetData<T_Schema extends z.ZodType<any[], any, any>>({
    rows,
    schema,
    headers,
    entityName,
}: {
    rows: any[][];
    schema: T_Schema;
    headers: string[];
    entityName: string;
}): z.infer<T_Schema> {
    if (!rows || rows.length === 0) {
        return [] as z.infer<T_Schema>;
    }

    const objects = rows.map(row => {
        // Skip rows that are completely empty
        if (row.every(cell => cell === null || cell === undefined || cell === '')) {
            return null;
        }
        return headers.reduce((obj, header, i) => {
            obj[header] = row[i];
            return obj;
        }, {} as { [key: string]: any });
    }).filter((item): item is NonNullable<typeof item> => item !== null);
    
    const result = schema.safeParse(objects);

    if (result.success) {
        return result.data;
    } else {
        // Log a summary error for the whole array
        console.warn(`[Sheet Read] Could not parse ${entityName} data.`, result.error.flatten());
        // For array validation errors, you might want to inspect specific item errors if available
        // This provides a general failure notice.
        return [] as z.infer<T_Schema>; // Return empty array on failure
    }
}
