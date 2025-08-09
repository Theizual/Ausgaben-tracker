

import React, { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { PeriodType } from '@/shared/types';
import { format, addMonths, addYears } from 'date-fns';
import { ChevronLeft, ChevronRight } from '@/shared/ui';

export const PeriodNavigator: FC<{
    periodType: PeriodType;
    setPeriodType: (type: PeriodType) => void;
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    customDateRange: { start: string, end: string };
    setCustomDateRange: (range: { start: string, end: string }) => void;
}> = ({ periodType, setPeriodType, currentDate, setCurrentDate, customDateRange, setCustomDateRange }) => {
    const { deLocale } = useApp();
    
    const periodButtons: { id: PeriodType, label: string }[] = [
        { id: 'last3Months', label: 'Letzte 3 Monate' },
        { id: 'month', label: 'Monat' },
        { id: 'year', label: 'Jahr' },
        { id: 'custom', label: 'Zeitraum' },
    ];
    
    const changeDate = (direction: 'prev' | 'next') => {
        if (periodType !== 'month' && periodType !== 'year') return;
        const amount = direction === 'prev' ? -1 : 1;
        if (periodType === 'month') {
            setCurrentDate(addMonths(currentDate, amount));
        } else {
            setCurrentDate(addYears(currentDate, amount));
        }
    };

    const getPeriodLabel = () => {
        switch(periodType) {
            case 'last3Months': return 'Letzte 3 Monate';
            case 'month': return format(currentDate, 'MMMM yyyy', { locale: deLocale });
            case 'year': return format(currentDate, 'yyyy', { locale: deLocale });
            case 'custom': return 'Benutzerdefiniert';
        }
    };

    const isNavDisabled = periodType === 'last3Months' || periodType === 'custom';

    return (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
            <div className="bg-slate-800 p-1 rounded-full flex items-center self-start sm:self-center flex-wrap">
                {periodButtons.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setPeriodType(p.id)}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors duration-300 whitespace-nowrap ${
                            periodType === p.id
                                ? 'bg-rose-600 text-white'
                                : 'text-slate-300 hover:bg-slate-700/50'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>
            
            <AnimatePresence mode="wait">
                {periodType === 'custom' ? (
                    <motion.div 
                        key="custom"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-2 overflow-hidden"
                    >
                        <input
                            type="date"
                            value={customDateRange.start}
                            onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                            className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-white text-sm"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                            type="date"
                            value={customDateRange.end}
                            onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                            className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-white text-sm"
                        />
                    </motion.div>
                ) : (
                    <motion.div 
                        key="nav"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-4"
                    >
                        <button onClick={() => changeDate('prev')} disabled={isNavDisabled} className="p-2 rounded-full hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="h-5 w-5" /></button>
                        <span className="font-bold text-white w-40 text-center">{getPeriodLabel()}</span>
                        <button onClick={() => changeDate('next')} disabled={isNavDisabled} className="p-2 rounded-full hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="h-5 w-5" /></button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
