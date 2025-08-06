import { z } from 'zod';

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

// --- Sanitization Helpers ---

// For Money values that must exist (e.g., transaction.amount)
const SanitizeRequiredMoney = z.preprocess(
  (val) => {
    // Default to 0 if empty/null/undefined
    if (val === null || val === undefined || val === '') return 0;
    // Handle German comma format and parse as float
    const num = parseFloat(String(val).replace(',', '.'));
    // Default to 0 if parsing fails
    return isNaN(num) ? 0 : num;
  },
  z.number() // Allows decimals and 0
);

// For Money values that are optional (e.g., category.budget)
const SanitizeOptionalMoney = z.preprocess(
  (val) => {
    // Default to undefined if empty/null/undefined
    if (val === null || val === undefined || val === '') return undefined;
    // Handle German comma format and parse as float
    const num = parseFloat(String(val).replace(',', '.'));
    // Default to undefined if parsing fails
    return isNaN(num) ? undefined : num;
  },
  z.number().optional() // Allows decimals and 0, and is optional
);

// For version numbers (must be a positive integer, defaults to 1)
const SanitizeVersion = z.preprocess(
  (val) => {
    if (val === null || val === undefined || val === '') return 1;
    // Version must be an integer
    const num = parseInt(String(val), 10);
    // Default to 1 if parsing fails or is less than 1
    return isNaN(num) || num < 1 ? 1 : num;
  },
  z.number().int().positive() // Enforce positive integer
);


// --- Lenient Schemas ---
export const getLenientSchemas = (now: string = new Date().toISOString()) => {
  const DateString = z.string().datetime({ message: 'Invalid datetime string' }).or(z.literal('')).transform(val => val || now);
  const OptionalDateString = z.string().datetime().optional().or(z.literal('')).transform(val => val || undefined);

  const CategorySchema = z.object({
    id: z.string().min(1),
    name: z.string().default(''),
    color: z.string().default('#808080'),
    icon: z.string().default('MoreHorizontal'),
    budget: SanitizeOptionalMoney,
    group: z.string().default('Sonstiges'),
    lastModified: DateString,
    isDeleted: z.preprocess((val) => String(val).toUpperCase() === 'TRUE', z.boolean()).optional().default(false),
    version: SanitizeVersion,
  });

  const TransactionSchema = z.object({
    id: z.string().min(1),
    amount: SanitizeRequiredMoney,
    description: z.string().default(''),
    categoryId: z.string().min(1),
    date: DateString,
    tagIds: z.preprocess((val) => String(val || '').split(',').map(tag => tag.trim()).filter(Boolean), z.array(z.string())).optional().default([]),
    recurringId: z.string().optional().transform(val => val || undefined),
    lastModified: DateString,
    isDeleted: z.preprocess((val) => String(val).toUpperCase() === 'TRUE', z.boolean()).optional().default(false),
    version: SanitizeVersion,
    createdBy: z.string().optional().transform(val => val || undefined),
  });
  
  const RecurringTransactionSchema = z.object({
    id: z.string().min(1),
    amount: SanitizeRequiredMoney,
    description: z.string().default(''),
    categoryId: z.string().min(1),
    frequency: z.enum(['monthly', 'yearly']),
    startDate: DateString,
    lastProcessedDate: OptionalDateString,
    lastModified: DateString,
    isDeleted: z.preprocess((val) => String(val).toUpperCase() === 'TRUE', z.boolean()).optional().default(false),
    version: SanitizeVersion,
  });

  const TagSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    lastModified: DateString,
    isDeleted: z.preprocess((val) => String(val).toUpperCase() === 'TRUE', z.boolean()).optional().default(false),
    version: SanitizeVersion,
  });

  return {
    CategorySchema,
    TransactionSchema,
    RecurringTransactionSchema,
    TagSchema,
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
        if (row.every(cell => cell === null || cell === undefined || cell === '')) {
            return null;
        }
        return headers.reduce((obj, header, i) => {
            obj[header] = row[i] !== undefined && row[i] !== null ? row[i] : '';
            return obj;
        }, {} as { [key: string]: any });
    }).filter((item): item is NonNullable<typeof item> => item !== null);
    
    const result = schema.safeParse(objects);

    if (result.success) {
        return result.data;
    } else {
        console.warn(`[Sheet Read] Could not parse ${entityName} data.`, result.error.flatten());
        return [] as z.infer<T_Schema>; // Return empty array on failure
    }
}