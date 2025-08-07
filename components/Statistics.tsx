import React, { useState, useMemo, FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import type { Transaction, Category } from '../types';
import {
    format, parseISO, startOfMonth, endOfMonth,
    eachDayOfInterval, getDay, isToday, getDaysInMonth,
    isSameMonth, isSameDay, formatGermanDate
} from '../utils/dateUtils';
import { de, addMonths, subMonths } from '../utils/dateUtils';
import { ChevronLeft, ChevronRight, X, iconMap, ChevronDown } from './Icons';
import { formatCurrency } from '../utils/dateUtils';
import DayDetailPanel from './DayDetailPanel';
import StandardTransactionItem from './StandardTransactionItem';
import BudgetBurndownChart from './BudgetBurndownChart';

const Statistics: FC = () => {
    const { 
        transactions,
        statisticsCurrentMonth,
        setStatisticsCurrentMonth,
        statisticsSelectedDay,
        setStatisticsSelectedDay,
        handleTransactionClick,
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <CalendarView
                    transactions={transactions}
                    currentMonth={statisticsCurrentMonth}
                    setCurrentMonth={handleMonthChange}
                    onDayClick={(day) => setStatisticsSelectedDay(prev => prev && isSameDay(prev, day) ? null : day)}
                    selectedDay={statisticsSelectedDay}
                />
                 <AnimatePresence>
                    {statisticsSelectedDay && (
                        <DayDetailPanel 
                            isOpen={!!statisticsSelectedDay}
                            date={statisticsSelectedDay}
                            transactions={transactionsForSelectedDay}
                            onClose={() => setStatisticsSelectedDay(null)}
                        />
                    )}
                </AnimatePresence>
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
        <motion.div 
            layout
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className={`bg-slate-800 p-6 rounded-2xl border border-slate-700 ${!selectedDay ? 'lg:col-span-2' : ''}`}
        >
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
                        <div key={day.toString()} className="flex items-center justify-center">
                             <button
                                onClick={() => onDayClick(day)}
                                className={`relative group w-full aspect-square rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-rose-500
                                ${isSelected ? 'ring-2 ring-rose-400' : ''} 
                                ${!isSelected && dayIsToday ? 'ring-1 ring-slate-400' : ''} 
                                ${spending > 0 ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
                                style={{ backgroundColor: `rgba(225, 29, 72, ${intensity})` }}
                                aria-label={`Datum ${format(day, 'd. MMMM')}, Ausgaben: ${formatCurrency(spending)}`}
                            >
                                <span className="absolute inset-0 flex items-center justify-center text-sm text-white font-semibold pointer-events-none">
                                    {format(day, 'd')}
                                </span>
                                {spending > 0 && (
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 bg-slate-900 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                        {formatCurrency(spending)}
                                    </div>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </motion.div>
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
        <motion.div
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
        </motion.div>
    );
};

const MonthlyCategoryBreakdown: FC<{ transactions: Transaction[], currentMonth: Date }> = ({ transactions, currentMonth }) => {
    const { categoryMap, handleTransactionClick, categoryGroups } = useApp();
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
    const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

    const groupedBreakdown = useMemo(() => {
        const spendingByCategory = new Map<string, number>();
        transactions.forEach(t => {
            if (t.categoryId) {
                spendingByCategory.set(t.categoryId, (spendingByCategory.get(t.categoryId) || 0) + t.amount);
            }
        });

        const totalMonthlySpending = transactions.reduce((sum, t) => sum + t.amount, 0);

        const spendingByGroup = new Map<string, { total: number; categories: any[] }>();

        // Initialize groups from categoryGroups to maintain order
        categoryGroups.forEach(groupName => {
            spendingByGroup.set(groupName, { total: 0, categories: [] });
        });

        // Populate with data
        spendingByCategory.forEach((amount, categoryId) => {
            const category = categoryMap.get(categoryId);
            if (category) {
                // Ensure group exists even if it's not in the main list (e.g., 'Sonstiges')
                if (!spendingByGroup.has(category.group)) {
                    spendingByGroup.set(category.group, { total: 0, categories: [] });
                }
                
                const groupData = spendingByGroup.get(category.group)!;
                groupData.total += amount;
                groupData.categories.push({
                    category,
                    amount,
                    percentage: totalMonthlySpending > 0 ? (amount / totalMonthlySpending) * 100 : 0
                });
            }
        });

        // Filter out empty groups and sort
        return Array.from(spendingByGroup.entries())
            .map(([groupName, data]) => ({
                groupName,
                totalAmount: data.total,
                categories: data.categories.sort((a, b) => b.amount - a.amount)
            }))
            .filter(group => group.totalAmount > 0)
            .sort((a, b) => b.totalAmount - a.totalAmount);

    }, [transactions, categoryMap, categoryGroups]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }} 
            className="bg-slate-800 p-6 rounded-2xl border border-slate-700"
        >
            <h3 className="text-lg font-bold text-white mb-4">Kategorienübersicht ({format(currentMonth, 'MMMM', { locale: de })})</h3>
            <div className="space-y-3">
                {groupedBreakdown.length > 0 ? groupedBreakdown.map(group => (
                    <div key={group.groupName} className="bg-slate-800/50 rounded-lg overflow-hidden">
                        <div 
                            className="flex justify-between items-center cursor-pointer p-4 hover:bg-slate-700/30"
                            onClick={() => setExpandedGroupId(expandedGroupId === group.groupName ? null : group.groupName)}
                        >
                             <h4 className="font-bold text-white truncate pr-4">{group.groupName}</h4>
                             <div className="flex items-center gap-4 flex-shrink-0">
                                <span className="font-bold text-white">{formatCurrency(group.totalAmount)}</span>
                                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${expandedGroupId === group.groupName ? 'rotate-180' : ''}`} />
                             </div>
                        </div>

                        <AnimatePresence>
                            {expandedGroupId === group.groupName && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-2 pb-3 px-3 space-y-2">
                                        {group.categories.map(({ category, amount, percentage }) => (
                                            <div key={category.id} className="bg-slate-700/50 rounded-lg p-3">
                                                <div 
                                                    className="flex justify-between items-center cursor-pointer"
                                                    onClick={() => setExpandedCategoryId(expandedCategoryId === category.id ? null : category.id)}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-center text-sm mb-1">
                                                            <div className="flex items-center gap-3">
                                                                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${expandedCategoryId === category.id ? 'rotate-180' : ''}`} />
                                                                <span className="font-medium text-slate-300 truncate">{category.name}</span>
                                                            </div>
                                                            <span className="font-bold text-white flex-shrink-0 pl-2">{formatCurrency(amount)}</span>
                                                        </div>
                                                        <div className="pl-7">
                                                            <div className="w-full bg-slate-600 rounded-full h-2.5">
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
                                                </div>

                                                <AnimatePresence>
                                                    {expandedCategoryId === category.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                            animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
                                                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="ml-4 pl-4 border-l-2 border-slate-600/50 space-y-1">
                                                                {transactions.filter(t => t.categoryId === category.id)
                                                                    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                                                                    .map(t => (
                                                                        <StandardTransactionItem
                                                                            key={t.id}
                                                                            transaction={t}
                                                                            onClick={() => handleTransactionClick(t)}
                                                                            showSublineInList="date"
                                                                        />
                                                                    ))
                                                                }
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ))}
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