





import React, { FC, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { Transaction } from '@/shared/types';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils/dateUtils';

export const CalendarView: FC<{
    monthlyTransactions: Transaction[],
    currentMonth: Date,
    setCurrentMonth: (date: Date) => void,
    onDayClick: (date: Date) => void,
    selectedDay: Date | null
}> = ({ monthlyTransactions, currentMonth, setCurrentMonth, onDayClick, selectedDay }) => {
    const { deLocale } = useApp();

    const daysInMonth = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const { dailySpending, maxSpendingInView } = useMemo(() => {
        const map = new Map<string, number>();
        let max = 0;
        monthlyTransactions.forEach(t => {
            if (!t.date || typeof t.date !== 'string') return;
            try {
                const day = format(parseISO(t.date), 'yyyy-MM-dd');
                const newTotal = (map.get(day) || 0) + t.amount;
                map.set(day, newTotal);
                if (newTotal > max) {
                    max = newTotal;
                }
            } catch (e) { /* ignore */ }
        });
        return { dailySpending: map, maxSpendingInView: max };
    }, [monthlyTransactions]);

    const getSpendingForDay = (day: Date) => dailySpending.get(format(day, 'yyyy-MM-dd')) || 0;
    
    const getIntensity = (day: Date) => {
        const spending = getSpendingForDay(day);
        if (spending === 0 || maxSpendingInView === 0) return 0;
        // Use a non-linear scale (sqrt) to make smaller amounts more visible
        const ratio = spending / maxSpendingInView;
        return Math.min(1, Math.sqrt(ratio) * 0.9 + 0.1);
    };

    const firstDayOfMonth = getDay(startOfMonth(currentMonth));
    const startOffset = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1);

    const calendarAnimation = {
        layout: true,
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
    };

    return (
        <motion.div 
            {...calendarAnimation}
            className="bg-slate-800 p-6 rounded-2xl border border-slate-700"
        >
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">{format(currentMonth, 'MMMM yyyy', { locale: deLocale })}</h3>
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