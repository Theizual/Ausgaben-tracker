
import React, { FC, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { Transaction } from '@/shared/types';
import { format, isSameMonth, getDaysInMonth } from 'date-fns';
import { formatCurrency } from '@/shared/utils/dateUtils';

export const MonthlySummary: FC<{ transactions: Transaction[], currentMonth: Date }> = ({ transactions, currentMonth }) => {
    const { deLocale } = useApp();
    const summary = useMemo(() => {
        if (transactions.length === 0) return { total: 0, average: 0 };

        const total = transactions.reduce((acc, t) => acc + t.amount, 0);

        const daysInSelectedMonth = getDaysInMonth(currentMonth);
        const isCurrentMonthView = isSameMonth(new Date(), currentMonth);
        const daysForAverage = isCurrentMonthView ? new Date().getDate() : daysInSelectedMonth;
        const average = daysForAverage > 0 ? total / daysForAverage : 0;

        return {
            total,
            average,
        };

    }, [transactions, currentMonth]);

    const periodLabel = format(currentMonth, 'MMMM yyyy', { locale: deLocale });

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800 p-4 rounded-2xl border border-slate-700"
        >
             <div className="flex flex-row justify-around items-stretch">
                {/* Total Expenses */}
                <div className="text-center flex-1">
                    <h3 className="text-slate-400 text-sm font-medium">Gesamtausgaben</h3>
                    <p className="text-2xl font-bold text-white mt-2 truncate" title={formatCurrency(summary.total)}>
                        {formatCurrency(summary.total)}
                    </p>
                    <p className="text-slate-500 text-xs mt-1 truncate" title={periodLabel}>
                        {periodLabel}
                    </p>
                </div>

                {/* Divider */}
                <div className="w-px bg-slate-700/50 mx-4"></div>

                {/* Daily Average */}
                <div className="text-center flex-1">
                    <h3 className="text-slate-400 text-sm font-medium">Tagesdurchschnitt</h3>
                    <p className="text-2xl font-bold text-white mt-2 truncate" title={formatCurrency(summary.average)}>
                        {formatCurrency(summary.average)}
                    </p>
                    <p className="text-slate-500 text-xs mt-1 truncate" title={periodLabel}>
                        {periodLabel}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};
