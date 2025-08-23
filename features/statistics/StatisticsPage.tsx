import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDataContext, useUIContext, useTaxonomyContext } from '@/contexts/AppContext';
import { isSameMonth, isSameDay, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import type { Tag as TagType } from '@/shared/types';
import { Calendar, Tag } from '@/shared/ui';
import { CalendarView } from './ui/CalendarView';
import { MonthlySummary } from './ui/MonthlySummary';
import { MonthlyCategoryBreakdown } from './ui/MonthlyCategoryBreakdown';
import { BudgetBurndownChart } from './ui/BudgetBurndownChart';
import { PeriodNavigator } from '@/features/tags/ui/PeriodNavigator';
import { MultiTagPicker } from '@/features/tags/ui/MultiTagPicker';
import { TagDetailView } from '@/features/tags/ui/TagDetailView';

const pageContentAnimation = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 },
};

const MonthlyAnalysisView = () => {
    const { transactions } = useDataContext();
    const { 
        statisticsCurrentMonth,
        setStatisticsCurrentMonth,
        statisticsSelectedDay,
        setStatisticsSelectedDay,
    } = useUIContext();
    const breakdownRef = useRef<HTMLDivElement>(null);

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

    const handleMonthChange = (newMonth: Date) => {
        if (!isSameMonth(newMonth, statisticsCurrentMonth)) {
            setStatisticsCurrentMonth(newMonth);
            setStatisticsSelectedDay(null);
        }
    };
    
    useEffect(() => {
        if (statisticsSelectedDay && breakdownRef.current) {
            // A small delay allows the element to render before scrolling, improving reliability.
            setTimeout(() => {
                breakdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [statisticsSelectedDay]);

    return (
        <div className="space-y-6">
             <MonthlySummary
                transactions={monthlyTransactions}
                currentMonth={statisticsCurrentMonth}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <CalendarView
                    monthlyTransactions={monthlyTransactions}
                    currentMonth={statisticsCurrentMonth}
                    setCurrentMonth={handleMonthChange}
                    onDayClick={(day) => setStatisticsSelectedDay(prev => prev && isSameDay(prev, day) ? null : day)}
                    selectedDay={statisticsSelectedDay}
                />
                 <BudgetBurndownChart 
                    transactions={monthlyTransactions}
                    currentMonth={statisticsCurrentMonth}
                 />
            </div>
            
            {/* This container will hold the conditionally rendered daily breakdown */}
            <div ref={breakdownRef}>
                <AnimatePresence>
                    {statisticsSelectedDay && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            <MonthlyCategoryBreakdown
                                transactions={monthlyTransactions}
                                currentMonth={statisticsCurrentMonth}
                                selectedDay={statisticsSelectedDay}
                                onClearSelectedDay={() => setStatisticsSelectedDay(null)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            {/* The monthly breakdown is now always below the (potential) daily one */}
            <MonthlyCategoryBreakdown
                transactions={monthlyTransactions}
                currentMonth={statisticsCurrentMonth}
                selectedDay={null}
                onClearSelectedDay={() => {}}
            />
        </div>
    );
};

const TagAnalysisView = () => {
    const { allAvailableTags, transactions } = useDataContext();
    const {
        selectedTagIdsForAnalysis,
        handleSelectTagForAnalysis,
        tagsPeriodType,
        setTagsPeriodType,
        tagsCurrentDate,
        setTagsCurrentDate,
        tagsCustomDateRange,
        setTagsCustomDateRange,
    } = useUIContext();

    const recentlyUsedTags = useMemo(() => {
        const sortedTransactions = [...transactions].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        const recentTagIds = new Set<string>();

        for (const transaction of sortedTransactions) {
            if (recentTagIds.size >= 20) break;
            if (transaction.tagIds) {
                for (const tagId of transaction.tagIds) {
                    if (recentTagIds.size >= 20) break;
                    recentTagIds.add(tagId);
                }
            }
        }
        
        const tagMap = new Map(allAvailableTags.map(t => [t.id, t]));
        return Array.from(recentTagIds).map(id => tagMap.get(id)).filter((t): t is TagType => !!t);
    }, [transactions, allAvailableTags]);


    if (allAvailableTags.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <p className="text-slate-500">Keine Tags vorhanden. Fügen Sie bei einer Transaktion einen neuen Tag hinzu.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <MultiTagPicker 
                allTags={allAvailableTags}
                recentTags={recentlyUsedTags}
                selectedTagIds={selectedTagIdsForAnalysis}
                onSelectionChange={handleSelectTagForAnalysis}
            />
            <PeriodNavigator
                periodType={tagsPeriodType}
                setPeriodType={setTagsPeriodType}
                currentDate={tagsCurrentDate}
                setCurrentDate={setTagsCurrentDate}
                customDateRange={tagsCustomDateRange}
                setCustomDateRange={setTagsCustomDateRange}
            />
            <AnimatePresence mode="wait">
                {selectedTagIdsForAnalysis.length > 0 ? (
                    <motion.div
                        key={selectedTagIdsForAnalysis.join('-')}
                        variants={pageContentAnimation}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <TagDetailView
                            tagIds={selectedTagIdsForAnalysis}
                            periodType={tagsPeriodType}
                            currentDate={tagsCurrentDate}
                            customDateRange={tagsCustomDateRange}
                        />
                    </motion.div>
                ) : (
                     <div className="flex flex-col items-center justify-center h-96 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-center">
                         <Tag className="text-slate-600 h-12 w-12 mb-4" />
                         <h2 className="text-xl font-bold text-white">Wählen Sie Tags zur Analyse aus</h2>
                         <p className="text-slate-400">Klicken Sie oben auf einen Tag, um zu beginnen.</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const AnalysisPage = () => {
    const { analysisView, setAnalysisView } = useUIContext();

    const TABS = [
        { id: 'monthly', label: 'Monatsübersicht', icon: Calendar },
        { id: 'tags', label: 'Tag-Analyse', icon: Tag },
    ];
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Analyse</h1>
            
            <div className="bg-slate-800/50 p-1 rounded-full flex items-center self-start border border-slate-700/50">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setAnalysisView(tab.id as 'monthly' | 'tags')}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors duration-300 w-full sm:w-auto flex items-center justify-center gap-2 ${
                            analysisView === tab.id
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                        }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={analysisView}
                    variants={pageContentAnimation}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    {analysisView === 'monthly' ? <MonthlyAnalysisView /> : <TagAnalysisView />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default AnalysisPage;