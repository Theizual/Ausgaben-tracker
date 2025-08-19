import type { RecurringTransaction } from '@/shared/types';

export const getMonthlyEquivalent = (rec: RecurringTransaction): number => {
    if (!rec) return 0;
    switch (rec.frequency) {
        case 'monthly': return rec.amount;
        case 'bimonthly': return rec.amount / 2;
        case 'quarterly': return rec.amount / 3;
        case 'semiannually': return rec.amount / 6;
        case 'yearly': return rec.amount / 12;
        default: return rec.amount; // Fallback, should not happen with TS
    }
};
