import {
    addDays,
    addMonths,
    eachDayOfInterval,
    endOfDay,
    format,
    isWithinInterval,
    parseISO,
    startOfDay,
    startOfMonth,
    startOfWeek
} from 'date-fns';
import type { Transaction } from '../types';

export type AggregationType = 'day' | 'week' | 'month';

export interface TimeSeriesDataPoint {
    date: string;
    sum: number;
    cumulative: number;
    rollingMean7?: number;
    rollingMean30?: number;
}

interface AggregatedPoint {
    date: string;
    sum: number;
}

/**
 * Aggregates transactions based on the specified aggregation type.
 * Ensures that the timeline is continuous by filling gaps with zero-value points.
 */
export function aggregateTransactions(
    transactions: Transaction[],
    aggregation: AggregationType,
    dateRange: { from: Date; to: Date }
): AggregatedPoint[] {
    const dateMap = new Map<string, number>();
    const { from, to } = dateRange;

    // 1. Filter and sum up transactions for each period
    transactions.forEach(t => {
        try {
            const tDate = parseISO(t.date);
            if (!isWithinInterval(tDate, { start: from, end: to })) {
                return; // Skip transactions outside the range
            }

            let key: string;

            switch (aggregation) {
                case 'week':
                    key = format(startOfWeek(tDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                    break;
                case 'month':
                    key = format(startOfMonth(tDate), 'yyyy-MM-dd');
                    break;
                default: // 'day'
                    key = format(startOfDay(tDate), 'yyyy-MM-dd');
            }
            dateMap.set(key, (dateMap.get(key) || 0) + t.amount);
        } catch (e) {
            // Ignore transactions with invalid dates
        }
    });

    // 2. Create a continuous date interval and fill gaps
    const results: AggregatedPoint[] = [];
    const endDate = endOfDay(to);

    if (aggregation === 'day') {
        const days = eachDayOfInterval({ start: startOfDay(from), end: endDate });
        days.forEach(day => {
            const key = format(day, 'yyyy-MM-dd');
            results.push({ date: key, sum: dateMap.get(key) || 0 });
        });
    } else if (aggregation === 'week') {
        let currentWeekStart = startOfWeek(from, { weekStartsOn: 1 });
        while (currentWeekStart <= endDate) {
            const key = format(currentWeekStart, 'yyyy-MM-dd');
            results.push({ date: key, sum: dateMap.get(key) || 0 });
            currentWeekStart = addDays(currentWeekStart, 7);
        }
    } else if (aggregation === 'month') {
        let currentMonthStart = startOfMonth(from);
        while (currentMonthStart <= endDate) {
            const key = format(currentMonthStart, 'yyyy-MM-dd');
            results.push({ date: key, sum: dateMap.get(key) || 0 });
            currentMonthStart = addMonths(currentMonthStart, 1);
        }
    }

    return results;
}

/**
 * Calculates derived series like cumulative sum and rolling means from aggregated data.
 */
export function calculateDerivedSeries(aggregatedData: AggregatedPoint[]): TimeSeriesDataPoint[] {
    if (aggregatedData.length === 0) return [];
    
    let cumulativeSum = 0;
    
    return aggregatedData.map((point, index, allPoints) => {
        cumulativeSum += point.sum;

        // Calculate 7-day rolling mean
        let rollingMean7: number | undefined;
        if (index >= 6) {
            const sum7 = allPoints.slice(index - 6, index + 1).reduce((acc, p) => acc + p.sum, 0);
            rollingMean7 = sum7 / 7;
        }

        // Calculate 30-day rolling mean
        let rollingMean30: number | undefined;
        if (index >= 29) {
            const sum30 = allPoints.slice(index - 29, index + 1).reduce((acc, p) => acc + p.sum, 0);
            rollingMean30 = sum30 / 30;
        }

        return {
            date: point.date,
            sum: point.sum,
            cumulative: cumulativeSum,
            rollingMean7,
            rollingMean30,
        };
    });
}