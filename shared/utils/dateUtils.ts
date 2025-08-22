import { format, parseISO, subDays, isValid, isWithinInterval, addMonths, addDays, differenceInDays, startOfDay, isBefore } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Locale } from 'date-fns';

/**
 * Formats a date object into a long German date string (e.g., "Montag, 1. Januar 2024").
 * @param date The date to format.
 * @param locale The date-fns locale object.
 * @returns The formatted date string.
 */
export const formatGermanDate = (date: Date, locale: Locale): string => {
    return format(date, "EEEE, d. MMMM yyyy", { locale });
};

/**
 * Formats a number into a German currency string (e.g., "1.234,56 €").
 * @param value The number to format.
 * @returns The formatted currency string.
 */
export const formatCurrency = (value: number): string => {
    return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
};

// Re-exporting from date-fns for consistent usage across the app
export {
    format,
    isValid,
    parseISO,
    subDays,
    de,
    isWithinInterval,
    addMonths,
    addDays,
    differenceInDays,
    startOfDay,
    isBefore,
};