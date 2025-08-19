import { addMonths, addYears, getDaysInMonth, parseISO } from 'date-fns';
import type { RecurringTransaction } from '@/shared/types';

export const calculateNextDates = (recurring: RecurringTransaction, count: number): Date[] => {
    if (!recurring) return [];

    const dates: Date[] = [];
    let lastDate = new Date(); // Start from today to find future dates

    for (let i = 0; i < count; i++) {
        let potentialNextDate: Date;
        
        switch (recurring.frequency) {
            case 'bimonthly': potentialNextDate = addMonths(lastDate, 2); break;
            case 'quarterly': potentialNextDate = addMonths(lastDate, 3); break;
            case 'semiannually': potentialNextDate = addMonths(lastDate, 6); break;
            case 'yearly': potentialNextDate = addYears(lastDate, 1); break;
            case 'monthly': default: potentialNextDate = addMonths(lastDate, 1); break;
        }

        if (recurring.dayOfMonth) {
            // Set to the first of the month to avoid month-end issues, then set day
            potentialNextDate.setDate(1); 
            const daysInMonth = getDaysInMonth(potentialNextDate);
            potentialNextDate.setDate(Math.min(recurring.dayOfMonth, daysInMonth));
        }
        
        // If the calculated date is in the past relative to the last one, advance the month/year
        if (potentialNextDate <= lastDate) {
             switch (recurring.frequency) {
                case 'yearly': potentialNextDate = addYears(potentialNextDate, 1); break;
                default: potentialNextDate = addMonths(potentialNextDate, 1); break;
            }
        }

        if (recurring.endDate && potentialNextDate > parseISO(recurring.endDate)) {
            break; // Stop if we go past the end date
        }

        dates.push(potentialNextDate);
        lastDate = potentialNextDate;
    }

    return dates;
};