import { z } from 'zod';
import { withRetry } from '../../shared/lib/retry.js';

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

  const UserSchema = z.object({
    id: z.string().min(1),
    name: z.string().default(''),
    color: z.string().default('#808080'),
    lastModified: DateString,
    isDeleted: z.preprocess((val) => String(val).toUpperCase() === 'TRUE', z.boolean()).optional().default(false),
    version: SanitizeVersion,
  });
  
  const UserSettingSchema = z.object({
    userId: z.string().min(1),
    settingKey: z.enum(['visibleGroups', 'groupColors', 'categoryConfiguration']),
    settingValue: z.string().default(''),
    lastModified: DateString,
    isDeleted: z.preprocess((val) => String(val).toUpperCase() === 'TRUE', z.boolean()).optional().default(false),
    version: SanitizeVersion,
  });

  return {
    CategorySchema,
    TransactionSchema,
    RecurringTransactionSchema,
    TagSchema,
    UserSchema,
    UserSettingSchema,
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
        // Silently fail but log for server-side debugging if needed.
        // In this refactoring, we remove the client-facing console logs.
        return [] as z.infer<T_Schema>; // Return empty array on failure
    }
}

export { withRetry };