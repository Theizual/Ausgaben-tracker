import React, { useState, useMemo } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import type { Transaction, Category } from '../types';
import {
    format, parseISO, startOfMonth, endOfMonth,
    eachDayOfInterval, getDay, isToday, getDaysInMonth,
    isSameMonth, isSameDay
} from '../utils/dateUtils';
import { de, addMonths, subMonths } from '../utils/dateUtils';
import { ChevronLeft, ChevronRight, X, iconMap, ChevronDown } from './Icons';
import { formatCurrency, formatGermanDate } from '../utils/dateUtils';
import SpendingTimeSeries from './SpendingTimeSeries';

const MotionDiv = motion('div');

const Statistics: FC = () => {
    const { 
        transactions,
        statisticsCurrentMonth,
        setStatisticsCurrentMonth,
        statisticsSelectedDay,
        setStatisticsSelectedDay
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
        });
    }, [transactions, statisticsSelectedDay]);

    return (
        <div className="space-y-6">
             <h1 className="text-3xl font-bold text-white">Statistiken</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <CalendarView
                    transactions={transactions}
                    currentMonth={statisticsCurrentMonth}
                    setCurrentMonth={setStatisticsCurrentMonth}
                    onDayClick={(day) => setStatisticsSelectedDay(prev => prev && isSameDay(prev, day) ? null : day)}
                    selectedDay={statisticsSelectedDay}
                />
                <AnimatePresence>
                    {statisticsSelectedDay && transactionsForSelectedDay.length > 0 && (
                        <MotionDiv
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <DailyBreakdownView
                                date={statisticsSelectedDay}
                                transactions={transactionsForSelectedDay}
                                onClose={() => setStatisticsSelectedDay(null)}
                            />
                        </MotionDiv>
                    )}
                </AnimatePresence>
            </div>
            <div className="lg:col-span-2">
                 <SpendingTimeSeries transactions={transactions} defaultAggregation="week" defaultRangeInDays={90} />
            </div>
            <MonthlySummary
                transactions={monthlyTransactions}
                currentMonth={statisticsCurrentMonth}
            />
            <MonthlyCategoryBreakdown
                transactions={monthlyTransactions}
                currentMonth={statisticsCurrentMonth}
            />
        </div>
    );
};

// Daily Breakdown View
const DailyBreakdownView: FC<{
    date: Date;
    transactions: Transaction[];
    onClose: () => void;
}> = ({ date, transactions, onClose }) => {
    const { categoryMap, handleTransactionClick } = useApp();
    const dailyTotal = useMemo(() => transactions.reduce((sum, t) => sum + t.amount, 0), [transactions]);

    const categoryBreakdown = useMemo(() => {
        const spending = new Map<string, { amount: number; category: Category }>();
        transactions.forEach(t => {
            const category = categoryMap.get(t.categoryId);
            if (category) {
                const current = spending.get(t.categoryId) || { amount: 0, category };
                current.amount += t.amount;
                spending.set(t.categoryId, current);
            }
        });
        return Array.from(spending.values()).sort((a, b) => b.amount - a.amount);
    }, [transactions, categoryMap]);

    return (
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">{formatGermanDate(date)}</h3>
                <button onClick={onClose} className="p-2 -mr-2 -mt-2 rounded-full hover:bg-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="mb-4">
                <p className="text-sm text-slate-400">Gesamtausgaben an diesem Tag</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(dailyTotal)}</p>
            </div>
            {categoryBreakdown.length > 0 && (
                 <div className="space-y-4">
                    <div>
                        <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-700 my-2">
                             {categoryBreakdown.map(({ category, amount }) => (
                                <MotionDiv
                                    key={category.id}
                                    className="h-full"
                                    style={{ backgroundColor: category.color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(amount / dailyTotal) * 100}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    title={`${category.name}: ${formatCurrency(amount)}`}
                                />
                            ))}
                        </div>
                    </div>
                     <div className="space-y-3 max-h-80 overflow-y-auto pr-2 -mr-2">
                        {transactions.sort((a,b) => b.amount - a.amount).map(t => {
                             const category = categoryMap.get(t.categoryId);
                             if (!category) return null;
                             const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
                             return (
                                <button
                                    key={t.id}
                                    onClick={() => handleTransactionClick(t, 'view')}
                                    className="w-full flex items-center gap-3 bg-slate-800/50 p-2 rounded-md hover:bg-slate-700/50 text-left"
                                >
                                     <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: category.color }}>
                                         <Icon className="h-5 w-5 text-white" />
                                     </div>
                                     <div className="flex-1 text-sm min-w-0">
                                         <p className="font-medium text-white truncate">{t.description}</p>
                                         <p className="text-xs text-slate-400">{category.name}</p>
                                     </div>
                                     <p className="font-semibold text-white text-sm flex-shrink-0 pl-2">{formatCurrency(t.amount)}</p>
                                 </button>
                             )
                         })}
                     </div>
                 </div>
            )}
        </div>
    );
}

// Calendar Heatmap
const CalendarView: FC<{
    transactions: Transaction[],
    currentMonth: Date,
    setCurrentMonth: (date: Date) => void,
    onDayClick: (date: Date) => void,
    selectedDay: Date | null
}> = ({ transactions, currentMonth, setCurrentMonth, onDayClick, selectedDay }) => {
    const daysInMonth = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const dailySpending = useMemo(() => {
        const map = new Map<string, number>();
        transactions.forEach(t => {
            if (!t.date || typeof t.date !== 'string') return;
            try {
                const date = parseISO(t.date);
                if (isNaN(date.getTime())) return;
                const day = format(date, 'yyyy-MM-dd');
                map.set(day, (map.get(day) || 0) + t.amount);
            } catch (e) { /* ignore */ }
        });
        return map;
    }, [transactions]);

    const maxSpendingInView = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const monthlyMap = new Map<string, number>();
        transactions.forEach(t => {
            if (!t.date || typeof t.date !== 'string') return;
            try {
                const date = parseISO(t.date);
                if (isNaN(date.getTime())) return;
                if (date >= start && date <= end) {
                    const day = format(date, 'yyyy-MM-dd');
                    monthlyMap.set(day, (monthlyMap.get(day) || 0) + t.amount);
                }
            } catch (e) { /* ignore */ }
        });
        return Math.max(0, ...Array.from(monthlyMap.values()));
    }, [transactions, currentMonth]);

    const getSpendingForDay = (day: Date) => dailySpending.get(format(day, 'yyyy-MM-dd')) || 0;
    const getIntensity = (day: Date) => {
        const spending = getSpendingForDay(day);
        if (spending === 0 || maxSpendingInView === 0) return 0;
        return Math.min(1, Math.max(0.1, spending / maxSpendingInView));
    };

    const firstDayOfMonth = getDay(startOfMonth(currentMonth));
    const startOffset = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1);

    return (
        <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">{format(currentMonth, 'MMMM yyyy', { locale: de })}</h3>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-full hover:bg-slate-700"><ChevronLeft className="h-5 w-5" /></button>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-full hover:bg-slate-700"><ChevronRight className="h-5 w-5" /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 mb-2">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} />)}
                {daysInMonth.map(day => {
                    const intensity = getIntensity(day);
                    const spending = getSpendingForDay(day);
                    const dayIsToday = isToday(day);
                    const isSelected = selectedDay && isSameDay(day, selectedDay);
                    return (
                        <div key={day.toString()} className="relative group" onClick={() => onDayClick(day)}>
                            <div
                                className={`w-full aspect-square rounded-md transition-all ${isSelected ? 'ring-2 ring-rose-400' : dayIsToday ? 'ring-2 ring-rose-500' : ''} ${spending > 0 ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
                                style={{ backgroundColor: `rgba(225, 29, 72, ${intensity})` }}
                            />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-white font-semibold pointer-events-none">
                                {format(day, 'd')}
                            </div>
                            {spending > 0 && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 bg-slate-900 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                    {formatCurrency(spending)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </MotionDiv>
    );
};


const MonthlySummary: FC<{ transactions: Transaction[], currentMonth: Date }> = ({ transactions, currentMonth }) => {
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

    const periodLabel = format(currentMonth, 'MMMM yyyy', { locale: de });

    return (
        <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800 p-6 rounded-2xl border border-slate-700"
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
        </MotionDiv>
    );
};

const MonthlyCategoryBreakdown: FC<{ transactions: Transaction[], currentMonth: Date }> = ({ transactions, currentMonth }) => {
    const { categoryMap, handleTransactionClick } = useApp();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const categoryBreakdown = useMemo(() => {
        const spending = new Map<string, number>();
        transactions.forEach(t => {
            if (t.categoryId) { // Ensure categoryId exists
                spending.set(t.categoryId, (spending.get(t.categoryId) || 0) + t.amount);
            }
        });

        const sorted = [...spending.entries()].sort((a, b) => b[1] - a[1]);
        const totalMonthlySpending = transactions.reduce((sum, t) => sum + t.amount, 0);

        return sorted.map(([id, amount]) => {
            const category = categoryMap.get(id);
            // Gracefully handle cases where a category might have been deleted
            if (!category) return null;

            return {
                category,
                amount,
                percentage: totalMonthlySpending > 0 ? (amount / totalMonthlySpending) * 100 : 0
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null); // Filter out nulls and ensure type safety

    }, [transactions, categoryMap]);

    return (
        <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4">Kategorienübersicht ({format(currentMonth, 'MMMM', { locale: de })})</h3>
            <div className="space-y-2">
                {categoryBreakdown.length > 0 ? categoryBreakdown.map(({ category, amount, percentage }) => (
                    <div key={category.id} className="bg-slate-800/50 rounded-lg p-3">
                        <div 
                            className="flex justify-between items-center cursor-pointer"
                            onClick={() => setExpandedId(expandedId === category.id ? null : category.id)}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center text-sm mb-1">
                                    <div className="flex items-center gap-3">
                                        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${expandedId === category.id ? 'rotate-180' : ''}`} />
                                        <span className="font-medium text-slate-300 truncate">{category.name}</span>
                                    </div>
                                    <span className="font-bold text-white flex-shrink-0 pl-2">{formatCurrency(amount)}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2.5 ml-7">
                                    <MotionDiv
                                        className="h-2.5 rounded-full"
                                        style={{ backgroundColor: category.color }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                    />
                                </div>
                            </div>
                        </div>

                        <AnimatePresence>
                            {expandedId === category.id && (
                                <MotionDiv
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="ml-4 pl-4 border-l-2 border-slate-600/50 space-y-2">
                                        {transactions.filter(t => t.categoryId === category.id)
                                            .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                                            .map(t => {
                                                const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
                                                return (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => handleTransactionClick(t, 'view')}
                                                        className="w-full flex items-center gap-3 text-sm p-2 rounded-md hover:bg-slate-700/50 text-left"
                                                    >
                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: category.color }}>
                                                            <Icon className="h-5 w-5 text-white" />
                                                        </div>
                                                        <div className="flex-1 flex justify-between items-center min-w-0">
                                                            <div className="min-w-0">
                                                                <p className="text-slate-300 truncate">{t.description}</p>
                                                                <p className="text-xs text-slate-500">{format(parseISO(t.date), 'dd.MM, HH:mm')} Uhr</p>
                                                            </div>
                                                            <p className="font-semibold text-slate-200 flex-shrink-0 pl-2">{formatCurrency(t.amount)}</p>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        }
                                    </div>
                                </MotionDiv>
                            )}
                        </AnimatePresence>
                    </div>
                )) : <p className="text-slate-500 text-center py-4">Keine Ausgaben in diesem Monat.</p>}
            </div>
        </MotionDiv>
    );
}

export default Statistics;