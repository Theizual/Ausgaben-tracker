

import React, { useState, useMemo } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Transaction, Category } from '../types';
import {
    format, parseISO, startOfMonth, endOfMonth,
    eachDayOfInterval, getDay, isToday, getDaysInMonth,
    isSameMonth, isSameDay
} from '../utils/dateUtils';
import { de, addMonths, subMonths } from '../utils/dateUtils';
import { ChevronLeft, ChevronRight, X, iconMap, ChevronDown } from './Icons';
import { formatCurrency, formatGermanDate } from '../utils/dateUtils';

type StatisticsProps = {
    transactions: Transaction[];
    categories: Category[];
    categoryMap: Map<string, Category>;
};

const Statistics: FC<StatisticsProps> = (props) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

    const monthlyTransactions = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return props.transactions.filter(t => {
            if (!t.date || typeof t.date !== 'string') return false;
            try {
                const date = parseISO(t.date);
                if (isNaN(date.getTime())) return false;
                return date >= start && date <= end;
            } catch {
                return false;
            }
        });
    }, [props.transactions, currentMonth]);

    const transactionsForSelectedDay = useMemo(() => {
        if (!selectedDay) return [];
        return props.transactions.filter(t => {
            if (!t.date || typeof t.date !== 'string') return false;
            try {
                const date = parseISO(t.date);
                if (isNaN(date.getTime())) return false;
                return isSameDay(date, selectedDay);
            } catch {
                return false;
            }
        });
    }, [props.transactions, selectedDay]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <CalendarView
                    transactions={props.transactions}
                    currentMonth={currentMonth}
                    setCurrentMonth={setCurrentMonth}
                    onDayClick={(day) => setSelectedDay(prev => prev && isSameDay(prev, day) ? null : day)}
                    selectedDay={selectedDay}
                />
                <AnimatePresence>
                    {selectedDay && transactionsForSelectedDay.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <DailyBreakdownView
                                date={selectedDay}
                                transactions={transactionsForSelectedDay}
                                categoryMap={props.categoryMap}
                                onClose={() => setSelectedDay(null)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <MonthlySummary
                transactions={monthlyTransactions}
                currentMonth={currentMonth}
            />
            <MonthlyCategoryBreakdown
                transactions={monthlyTransactions}
                categoryMap={props.categoryMap}
                currentMonth={currentMonth}
            />
        </div>
    );
};

// Daily Breakdown View
const DailyBreakdownView: FC<{
    date: Date;
    transactions: Transaction[];
    categoryMap: Map<string, Category>;
    onClose: () => void;
}> = ({ date, transactions, categoryMap, onClose }) => {
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
                                <motion.div
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
                                <div key={t.id} className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-md">
                                     <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: category.color }}>
                                         <Icon className="h-5 w-5 text-white" />
                                     </div>
                                     <div className="flex-1 text-sm">
                                         <p className="font-medium text-white truncate">{t.description}</p>
                                         <p className="text-xs text-slate-400">{category.name}</p>
                                     </div>
                                     <p className="font-semibold text-white text-sm">{formatCurrency(t.amount)}</p>
                                 </div>
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
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
        </motion.div>
    );
};


const MonthlySummary: FC<{ transactions: Transaction[], currentMonth: Date }> = ({ transactions, currentMonth }) => {
    const summary = useMemo(() => {
        if (transactions.length === 0) return { total: 0, average: 0, topDay: { label: 'N/A', value: 0 } };

        const total = transactions.reduce((acc, t) => acc + t.amount, 0);

        const daysInSelectedMonth = getDaysInMonth(currentMonth);
        const isCurrentMonthView = isSameMonth(new Date(), currentMonth);
        const daysForAverage = isCurrentMonthView ? new Date().getDate() : daysInSelectedMonth;
        const average = daysForAverage > 0 ? total / daysForAverage : 0;

        const daily = new Map<string, number>();
        transactions.forEach(t => {
            if (!t.date || typeof t.date !== 'string') return;
            try {
                const date = parseISO(t.date);
                if (isNaN(date.getTime())) return;
                const dayKey = format(date, 'yyyy-MM-dd');
                daily.set(dayKey, (daily.get(dayKey) || 0) + t.amount);
            } catch (e) { /* ignore */ }
        });

        const findMax = (map: Map<string, number>) => {
            if (map.size === 0) return { label: 'N/A', value: 0 };
            const [label, value] = [...map.entries()].reduce((max, entry) => entry[1] > max[1] ? entry : max);
            return { label, value };
        };
        const maxDay = findMax(daily);

        return {
            total,
            average,
            topDay: maxDay.label === 'N/A' ? maxDay : { label: format(parseISO(maxDay.label), 'd. MMM yyyy', { locale: de }), value: maxDay.value }
        };

    }, [transactions, currentMonth]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <HighlightCard title="Gesamtausgaben" label={format(currentMonth, 'MMMM yyyy', { locale: de })} value={summary.total} />
            <HighlightCard title="Tagesdurchschnitt" label={format(currentMonth, 'MMMM yyyy', { locale: de })} value={summary.average} />
            <HighlightCard title="Höchster Tageswert" label={summary.topDay.label} value={summary.topDay.value} />
        </div>
    );
};

const HighlightCard: FC<{ title: string, label: string, value: number }> = ({ title, label, value }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-white mt-2">
            {formatCurrency(value)}
        </p>
        <p className="text-slate-500 text-xs mt-1">{label}</p>
    </motion.div>
);

const MonthlyCategoryBreakdown: FC<{ transactions: Transaction[], categoryMap: Map<string, Category>, currentMonth: Date }> = ({ transactions, categoryMap, currentMonth }) => {
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
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
                                    <motion.div
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
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="ml-4 pl-4 border-l-2 border-slate-600/50 space-y-2">
                                        {transactions.filter(t => t.categoryId === category.id)
                                            .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                                            .map(t => (
                                                <div key={t.id} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-slate-700/50">
                                                    <div>
                                                        <p className="text-slate-300">{t.description}</p>
                                                        <p className="text-xs text-slate-500">{format(parseISO(t.date), 'dd.MM, HH:mm')} Uhr</p>
                                                    </div>
                                                    <p className="font-semibold text-slate-200">{formatCurrency(t.amount)}</p>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )) : <p className="text-slate-500 text-center py-4">Keine Ausgaben in diesem Monat.</p>}
            </div>
        </motion.div>
    );
}

export default Statistics;