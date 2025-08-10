

import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { isSameMonth, isSameDay, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar } from '@/shared/ui';
import { CalendarView } from './ui/CalendarView';
import { DayDetailPanel } from './ui/DayDetailPanel';
import { MonthlySummary } from './ui/MonthlySummary';
import { MonthlyCategoryBreakdown } from './ui/MonthlyCategoryBreakdown';
import { BudgetBurndownChart } from './ui/BudgetBurndownChart';

const CalendarPlaceholder = () => (
    <motion.div
        key="placeholder-panel"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="bg-slate-800 rounded-2xl border border-slate-700 h-full flex flex-col items-center justify-center text-center p-6"
    >
        <Calendar className="h-12 w-12 text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-300">Tagesdetails</h3>
        <p className="text-slate-500">Wählen Sie einen Tag im Kalender aus, um eine Aufschlüsselung der Ausgaben anzuzeigen.</p>
    </motion.div>
);

const StatisticsPage = () => {
    const { 
        transactions,
        statisticsCurrentMonth,
        setStatisticsCurrentMonth,
        statisticsSelectedDay,
        setStatisticsSelectedDay,
        categoryMap,
    } = useApp();

    const monthlyTransactions = useMemo(() => {
        const start = startOfMonth(statisticsCurrentMonth);
        const end = endOfMonth(statisticsCurrentMonth);
        return transactions.filter(t => {
            if (!t.date || typeof t.date !== 'string') return false;
            try {
                const date = parseISO(t.date);
                if (isNaN(date.getTime())) return false;
                return date >= start && date <= end;
            } catch {
                return false;
            }
        });
    }, [transactions, statisticsCurrentMonth]);

    const transactionsForSelectedDay = useMemo(() => {
        if (!statisticsSelectedDay) return [];
        return transactions.filter(t => {
            if (!t.date || typeof t.date !== 'string') return false;
            try {
                const date = parseISO(t.date);
                if (isNaN(date.getTime())) return false;
                return isSameDay(date, statisticsSelectedDay);
            } catch {
                return false;
            }
        }).sort((a,b) => b.amount - a.amount);
    }, [transactions, statisticsSelectedDay]);

    const handleMonthChange = (newMonth: Date) => {
        // Only trigger updates if the month is actually different
        if (!isSameMonth(newMonth, statisticsCurrentMonth)) {
            setStatisticsCurrentMonth(newMonth);
            // Resetting the selected day prevents layout jumps and keeps the UI consistent
            setStatisticsSelectedDay(null);
        }
    };

    return (
        <div className="space-y-6">
             <h1 className="text-3xl font-bold text-white">Statistiken</h1>
             <MonthlySummary
                transactions={monthlyTransactions}
                currentMonth={statisticsCurrentMonth}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <CalendarView
                    monthlyTransactions={monthlyTransactions}
                    currentMonth={statisticsCurrentMonth}
                    setCurrentMonth={handleMonthChange}
                    onDayClick={(day) => setStatisticsSelectedDay(prev => prev && isSameDay(prev, day) ? null : day)}
                    selectedDay={statisticsSelectedDay}
                />
                 <div className="relative h-full">
                    <AnimatePresence mode="wait">
                        {statisticsSelectedDay ? (
                            <DayDetailPanel 
                                key={statisticsSelectedDay.toISOString()}
                                isOpen={!!statisticsSelectedDay}
                                date={statisticsSelectedDay}
                                transactions={transactionsForSelectedDay}
                                onClose={() => setStatisticsSelectedDay(null)}
                            />
                        ) : (
                             <CalendarPlaceholder key="placeholder" />
                        )}
                    </AnimatePresence>
                </div>
            </div>
            <div className="lg:col-span-2">
                 <BudgetBurndownChart 
                    transactions={monthlyTransactions} 
                    categoryMap={categoryMap}
                    currentMonth={statisticsCurrentMonth}
                 />
            </div>
            <MonthlyCategoryBreakdown
                transactions={monthlyTransactions}
                currentMonth={statisticsCurrentMonth}
            />
        </div>
    );
};

export default StatisticsPage;
