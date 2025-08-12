



import React, { FC, useMemo } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { Transaction } from '@/shared/types';
import { format, isSameMonth, getDaysInMonth } from 'date-fns';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { Home, Wallet, Scale } from '@/shared/ui';

export const MonthlySummary: FC<{ transactions: Transaction[], currentMonth: Date }> = ({ transactions, currentMonth }) => {
    const { deLocale, totalMonthlyFixedCosts } = useApp();
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
    
    const summaryAnimationVariants = {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
    };

    return (
        <motion.div
            variants={summaryAnimationVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.1 }}
            className="bg-slate-800 p-3 rounded-2xl border border-slate-700"
        >
             <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-0 md:divide-x md:divide-slate-700/50">
                {/* Total Expenses */}
                <div className="text-center md:px-2">
                    <h3 className="text-slate-400 text-sm font-medium flex justify-center items-center gap-2">
                        <Wallet className="h-4 w-4 text-amber-700" />
                        Gesamtausgaben
                    </h3>
                    <p className="text-2xl font-bold text-white mt-2 truncate" title={formatCurrency(summary.total)}>
                        {formatCurrency(summary.total)}
                    </p>
                    <p className="text-slate-500 text-xs mt-1 truncate" title={periodLabel}>
                        {periodLabel}
                    </p>
                </div>

                {/* Daily Average */}
                <div className="text-center md:px-2">
                     <h3 className="text-slate-400 text-sm font-medium flex justify-center items-center gap-2">
                        <Scale className="h-4 w-4 text-indigo-400" />
                        Tagesdurchschnitt
                    </h3>
                    <p className="text-2xl font-bold text-white mt-2 truncate" title={formatCurrency(summary.average)}>
                        {formatCurrency(summary.average)}
                    </p>
                    <p className="text-slate-500 text-xs mt-1 truncate" title={periodLabel}>
                        {periodLabel}
                    </p>
                </div>
                
                 {/* Monthly Fixed Costs */}
                <div className="text-center md:px-2">
                    <h3 className="text-slate-400 text-sm font-medium flex justify-center items-center gap-2">
                        <Home className="h-4 w-4 text-sky-400" />
                        Monatliche Fixkosten
                    </h3>
                    <p className="text-2xl font-bold text-white mt-2 truncate" title={formatCurrency(totalMonthlyFixedCosts)}>
                        {formatCurrency(totalMonthlyFixedCosts)}
                    </p>
                     <p className="text-slate-500 text-xs mt-1 truncate" title={periodLabel}>
                        {periodLabel}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};
