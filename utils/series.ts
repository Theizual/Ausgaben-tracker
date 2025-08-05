import {
    eachDayOfInterval,
    endOfDay,
    format,
    isSameDay,
    isSameMonth,
    isSameWeek,
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
    if (transactions.length === 0) return [];

    const dateMap = new Map<string, number>();
    const { from, to } = dateRange;

    // 1. Sum up transactions for each period
    transactions.forEach(t => {
        const tDate = parseISO(t.date);
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
    });

    // 2. Create a continuous date interval and fill gaps
    const results: AggregatedPoint[] = [];
    let currentDate = startOfDay(from);
    const endDate = endOfDay(to);

    while (currentDate <= endDate) {
        let key: string;
        let nextDate: Date;

        switch (aggregation) {
            case 'week':
                key = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                nextDate = startOfWeek(new Date(currentDate.setDate(currentDate.getDate() + 7)), { weekStartsOn: 1 });
                break;
            case 'month':
                key = format(startOfMonth(currentDate), 'yyyy-MM-dd');
                nextDate = startOfMonth(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
                 break;
            default: // 'day'
                key = format(currentDate, 'yyyy-MM-dd');
                nextDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
        }

        // Avoid adding duplicate keys for week/month aggregation
        if (!results.some(r => r.date === key)) {
            results.push({
                date: key,
                sum: dateMap.get(key) || 0,
            });
        }
        
        currentDate = nextDate;
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
