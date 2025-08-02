
import React, { useState, useMemo } from 'react';
import type { FC } from 'react';
import { motion } from 'framer-motion';
import type { Transaction, Category } from '../types';
import {
    format, parseISO, startOfMonth, endOfMonth,
    eachDayOfInterval, getDay, isToday, getDaysInMonth,
    isSameMonth
} from '../utils/dateUtils';
import { de, addMonths, subMonths } from '../utils/dateUtils';
import { ChevronLeft, ChevronRight } from './Icons';
import { formatCurrency } from '../utils/dateUtils';

type StatisticsProps = {
    transactions: Transaction[];
    categories: Category[];
    categoryMap: Map<string, Category>;
};

const Statistics: FC<StatisticsProps> = (props) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const monthlyTransactions = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return props.transactions.filter(t => {
            if (!t.date || typeof t.date !== 'string') return false;
            try {
                const date = parseISO(t.date);
                if (isNaN(date.getTime())) return false; // Check for Invalid Date
                return date >= start && date <= end;
            } catch {
                return false;
            }
        });
    }, [props.transactions, currentMonth]);

    return (
        <div className="space-y-6">
            <CalendarView 
                transactions={props.transactions} 
                currentMonth={currentMonth}
                setCurrentMonth={setCurrentMonth}
            />
             <MonthlySummary 
                transactions={monthlyTransactions} 
                currentMonth={currentMonth} 
            />
            <TopCategories 
                transactions={monthlyTransactions} 
                categoryMap={props.categoryMap}
                currentMonth={currentMonth} 
            />
        </div>
    );
};

// Calendar Heatmap
const CalendarView: FC<{ 
    transactions: Transaction[], 
    currentMonth: Date, 
    setCurrentMonth: (date: Date) => void 
}> = ({ transactions, currentMonth, setCurrentMonth }) => {
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
            } catch (e) {
                // ignore transaction with bad date
            }
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
            } catch(e) {
                // ignore
            }
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
    const startOffset = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); // Monday is 1, Sunday is 0 -> needs to be 6 for offset

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
                    return (
                        <div key={day.toString()} className="relative group">
                            <div
                                className={`w-full aspect-square rounded-md transition-all ${dayIsToday ? 'ring-2 ring-rose-500' : ''}`}
                                style={{ backgroundColor: `rgba(225, 29, 72, ${intensity})` }}
                            />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-white font-semibold">
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

const MonthlySummary: FC<{transactions: Transaction[], currentMonth: Date}> = ({transactions, currentMonth}) => {
    const summary = useMemo(() => {
        if(transactions.length === 0) return { total: 0, average: 0, topDay: { label: 'N/A', value: 0 }};

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
            } catch(e) { /* ignore */ }
        });

        const findMax = (map: Map<string, number>) => {
            if(map.size === 0) return {label: 'N/A', value: 0};
            const [label, value] = [...map.entries()].reduce((max, entry) => entry[1] > max[1] ? entry : max);
            return {label, value};
        };
        const maxDay = findMax(daily);
        
        return {
            total,
            average,
            topDay: maxDay.label === 'N/A' ? maxDay : {label: format(parseISO(maxDay.label), 'd. MMM yyyy', {locale: de}), value: maxDay.value}
        };

    }, [transactions, currentMonth]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <HighlightCard title="Gesamtausgaben" label={format(currentMonth, 'MMMM yyyy', {locale: de})} value={summary.total} />
            <HighlightCard title="Tagesdurchschnitt" label={format(currentMonth, 'MMMM yyyy', {locale: de})} value={summary.average} />
            <HighlightCard title="Höchster Tageswert" label={summary.topDay.label} value={summary.topDay.value} />
        </div>
    );
};

const HighlightCard: FC<{title: string, label: string, value: number}> = ({title, label, value}) => (
     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.1}} className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
         <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
         <p className="text-2xl font-bold text-white mt-2">
            {formatCurrency(value)}
         </p>
         <p className="text-slate-500 text-xs mt-1">{label}</p>
     </motion.div>
);

const TopCategories: FC<{ transactions: Transaction[], categoryMap: Map<string, Category>, currentMonth: Date }> = ({ transactions, categoryMap, currentMonth }) => {
    const topCategories = useMemo(() => {
        const spending = new Map<string, number>();
        transactions.forEach(t => {
            spending.set(t.categoryId, (spending.get(t.categoryId) || 0) + t.amount);
        });

        const sorted = [...spending.entries()].sort((a,b) => b[1] - a[1]).slice(0, 5);
        const totalSpending = sorted.reduce((sum, [, amount]) => sum + amount, 0);
        
        return sorted.map(([id, amount]) => ({
            category: categoryMap.get(id)!,
            amount,
            percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0
        }));

    }, [transactions, categoryMap]);
    
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.2}} className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4">Top 5 Kategorien ({format(currentMonth, 'MMMM', { locale: de })})</h3>
            <div className="space-y-4">
                {topCategories.length > 0 ? topCategories.map(({category, amount, percentage}) => (
                    category && <div key={category.id}>
                        <div className="flex justify-between items-center text-sm mb-1">
                            <span className="font-medium text-slate-300">{category.name}</span>
                            <span className="font-bold text-white">{formatCurrency(amount)}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2.5">
                            <motion.div
                                className="h-2.5 rounded-full"
                                style={{ backgroundColor: category.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                        </div>
                    </div>
                )) : <p className="text-slate-500 text-center py-4">Keine Ausgaben in diesem Monat.</p>}
            </div>
        </motion.div>
    );
}

export default Statistics;