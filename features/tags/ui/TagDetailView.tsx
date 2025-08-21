import React, { FC, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { PeriodType } from '@/shared/types';
import { format, parseISO, isWithinInterval, addMonths, subMonths, addYears, subYears, addDays, differenceInDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Hash, Wallet, BarChart2, StandardTransactionItem } from '@/shared/ui';
import { StatCard } from './StatCard';
import { TagAnalysisChart } from './TagAnalysisChart';

export const TagDetailView: FC<{
    tagIds: string[],
    periodType: PeriodType,
    currentDate: Date,
    customDateRange: { start: string, end: string },
}> = ({ tagIds, periodType, currentDate, customDateRange }) => {
    const { transactions, tagMap, handleTransactionClick, deLocale } = useApp();
    const formattedTagNames = tagIds.map(id => `#${tagMap.get(id) || 'Unbekannt'}`).join(', ');

    const { filteredTransactions, interval } = useMemo(() => {
        let start: Date, end: Date;
        const now = new Date();

        switch (periodType) {
            case 'last3Months':
                start = startOfMonth(subMonths(now, 2));
                end = endOfDay(now);
                break;
            case 'month':
                start = startOfMonth(currentDate);
                end = endOfMonth(currentDate);
                break;
            case 'year':
                start = startOfYear(currentDate);
                end = endOfYear(currentDate);
                break;
            case 'custom':
                try {
                    start = startOfDay(parseISO(customDateRange.start));
                    end = endOfDay(parseISO(customDateRange.end));
                } catch {
                    start = new Date(); end = new Date(); // fallback
                }
                break;
        }
        
        const filtered = transactions
            .filter(t => t.tagIds?.some(tagId => tagIds.includes(tagId)) && isWithinInterval(parseISO(t.date), {start, end}))
            .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

        return { filteredTransactions: filtered, interval: { start, end } };
    }, [tagIds, transactions, periodType, currentDate, customDateRange]);

    
    const stats = useMemo(() => {
        const total = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
        return { total, count: filteredTransactions.length };
    }, [filteredTransactions]);
    
    const animationVariants = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
    };
    
    const motionProps = {
        variants: animationVariants,
        initial: "initial",
        animate: "animate",
        exit: "exit",
    };

    if (filteredTransactions.length === 0) {
        return (
             <motion.div {...motionProps} className="flex flex-col items-center justify-center h-96 bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 text-center">
                 <Hash className="text-slate-600 h-12 w-12 mb-4" />
                 <h2 className="text-xl font-bold text-white">Keine Daten für {formattedTagNames}</h2>
                 <p className="text-slate-400">Für den gewählten Zeitraum gibt es keine Transaktionen mit diesen Tags.</p>
            </motion.div>
        )
    }

    return (
        <motion.div {...motionProps} className="space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
                {formattedTagNames}
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard icon={Wallet} title="Gesamtausgaben" value={new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(stats.total)} iconClassName="text-amber-700" />
                <StatCard icon={BarChart2} title="Transaktionen" value={stats.count.toString()} />
            </div>

            <TagAnalysisChart 
                transactions={filteredTransactions}
                tagIds={tagIds}
                interval={interval}
                periodType={periodType}
            />

            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <h3 className="font-bold text-white mb-4">Transaktionen ({filteredTransactions.length})</h3>
                <div className="max-h-96 overflow-y-auto space-y-1 pr-2">
                    {filteredTransactions.map(t => (
                        <StandardTransactionItem
                            key={t.id}
                            transaction={t}
                            onClick={() => handleTransactionClick(t)}
                            showSublineInList="date"
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    )
};
