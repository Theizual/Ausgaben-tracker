import {
    format,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    isWithinInterval,
    parseISO,
    eachDayOfInterval,
    startOfDay,
    addMonths,
    subMonths,
    startOfYear,
    endOfYear,
    getWeek,
    getMonth,
    getYear,
    differenceInDays,
    isSameDay,
    endOfDay,
    getDay,
    isSameMonth,
    isToday,
    getDaysInMonth,
    addYears,
    subYears,
} from 'date-fns';
import { de } from 'date-fns/locale';
import type { Transaction } from '../types';

export const formatGermanDate = (date: Date): string => {
    return format(date, "EEEE, d. MMMM yyyy", { locale: de });
};

export const formatCurrency = (value: number): string => {
    return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
};

export const getWeekInterval = (date: Date) => {
    return {
        start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(date, { weekStartsOn: 1 }),
    };
};

export const getMonthInterval = (date: Date) => {
    return {
        start: startOfMonth(date),
        end: endOfMonth(date),
    };
};

export const getYearInterval = (date: Date) => {
    return {
        start: startOfYear(date),
        end: endOfYear(date),
    };
};

export const filterTransactionsByInterval = (transactions: Transaction[], interval: { start: Date, end: Date }): Transaction[] => {
    return transactions.filter(t => isWithinInterval(parseISO(t.date), interval));
};

export {
    format,
    parseISO,
    eachDayOfInterval,
    startOfDay,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    startOfYear,
    endOfYear,
    getWeek,
    getMonth,
    getYear,
    differenceInDays,
    isSameDay,
    de,
    endOfDay,
    getDay,
    isSameMonth,
    isToday,
    getDaysInMonth,
    isWithinInterval,
    addYears,
    subYears,
};