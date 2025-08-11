

import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion, MotionProps } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { Transaction, ViewMode, Category } from '@/shared/types';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { Wallet, getIconComponent, Calendar, CalendarDays } from '@/shared/ui';
import { FIXED_COSTS_GROUP_ID } from '@/constants';
import { StandardTransactionItem } from '@/shared/ui';
import { CategoryPieChart } from './ui/CategoryPieChart';
import { QuickAddForm } from './ui/QuickAddForm';
import { MoreCategoriesModal } from './ui/MoreCategoriesModal';
import { ViewTabs } from './ui/ViewTabs';
import { BudgetProgressBar } from '@/shared/ui/BudgetProgressBar';

const DashboardPage = () => {
    const {
        transactions,
        categories,
        flexibleCategories,
        totalMonthlyBudget,
        totalSpentThisMonth,
        handleTransactionClick,
        dashboardViewMode,
        setDashboardViewMode,
        deLocale,
        groupMap,
        groups,
    } = useApp();

    const [expandedBudgetId, setExpandedBudgetId] = useState<string | null>(null);
    
    const { filteredTransactions, totalExpenses, todaysExpenses, totalExpensesLabel, todaysExpensesLabel, monthlyTransactions } = useMemo(() => {
        const now = new Date();
        const weekInterval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
        const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) };
    
        const allMonthlyTransactions = transactions.filter(t => {
            try { return isWithinInterval(parseISO(t.date), monthInterval); } catch { return false; }
        });
    
        const interval = dashboardViewMode === 'woche' ? weekInterval : monthInterval;
        
        let totalExpensesLabel: string;
        if (dashboardViewMode === 'woche') {
            const range = `${format(interval.start, 'd. MMM', { locale: deLocale })} - ${format(interval.end, 'd. MMM', { locale: deLocale })}`;
            totalExpensesLabel = `Diese Woche (${range})`;
        } else {
            const range = format(interval.start, 'MMMM yyyy', { locale: deLocale });
            totalExpensesLabel = `Dieser Monat (${range})`;
        }
    
        const filteredTransactions = transactions.filter(t => {
            if (!t.date || typeof t.date !== 'string') return false;
            try {
                const date = parseISO(t.date);
                return !isNaN(date.getTime()) && isWithinInterval(date, interval);
            } catch {
                return false;
            }
        });
    
        const totalExpenses = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

        const todaysTransactions = transactions.filter(t => {
            if (!t.date || typeof t.date !== 'string') return false;
            try {
                const date = parseISO(t.date);
                return !isNaN(date.getTime()) && isSameDay(date, now);
            } catch {
                return false;
            }
        });
        const todaysExpenses = todaysTransactions.reduce((sum, t) => sum + t.amount, 0);
        const todaysExpensesLabel = `Heute, ${format(now, 'd. MMMM', { locale: deLocale })}`;
        
        return { 
            filteredTransactions, 
            totalExpenses, 
            todaysExpenses, 
            totalExpensesLabel,
            todaysExpensesLabel, 
            monthlyTransactions: allMonthlyTransactions 
        };
    }, [transactions, dashboardViewMode, deLocale]);

    const { groupedBudgetedCategories, spendingByCategory } = useMemo(() => {
        const spendingMap = new Map<string, number>();
        monthlyTransactions.forEach(t => {
            spendingMap.set(t.categoryId, (spendingMap.get(t.categoryId) || 0) + t.amount);
        });
        
        const spendingByGroup = new Map<string, { totalSpent: number, totalBudget: number, categories: any[], group: any }>();
        groups
            .filter(g => g.id !== FIXED_COSTS_GROUP_ID)
            .forEach(group => {
                spendingByGroup.set(group.id, { totalSpent: 0, totalBudget: 0, categories: [], group });
            });

        flexibleCategories.forEach(category => {
            if (typeof category.budget === 'number') {
                const groupData = spendingByGroup.get(category.groupId);
                if (groupData) {
                    const spent = spendingMap.get(category.id) || 0;
                    groupData.totalSpent += spent;
                    groupData.totalBudget += category.budget;
                    groupData.categories.push(category);
                }
            }
        });
        
        const result = Array.from(spendingByGroup.values())
            .map(data => ({
                ...data,
                categories: data.categories.sort((a,b) => (b.budget || 0) - (a.budget || 0)),
            }))
            .filter(group => group.categories.length > 0)
            .sort((a,b) => a.group.sortIndex - b.group.sortIndex);

        return { groupedBudgetedCategories: result, spendingByCategory: spendingMap };
    }, [monthlyTransactions, flexibleCategories, groups]);

    const totalBudgetPercentage = totalMonthlyBudget > 0 ? (totalSpentThisMonth / totalMonthlyBudget) * 100 : 0;
    
    const hasAnyBudgetedCategories = groupedBudgetedCategories.length > 0;
    
    const flexibleTransactionsInPeriod = useMemo(() => 
        filteredTransactions.filter(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            return cat?.groupId !== FIXED_COSTS_GROUP_ID;
        }),
    [filteredTransactions, categories]);
    
    const TotalExpensesIcon = dashboardViewMode === 'woche' ? Calendar : CalendarDays;
    const totalExpensesIconClassName = 'h-5 w-5 mr-2 flex-shrink-0 text-green-400';
    
    const cardAnimation: MotionProps = {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
    };
    
    const summaryCardAnimation: MotionProps = { ...cardAnimation, transition: { delay: 0.1 } };

    const transactionDetailsAnimation: MotionProps = {
        initial: { opacity: 0, height: 0, marginTop: 0 },
        animate: { opacity: 1, height: 'auto', marginTop: '1rem' },
        exit: { opacity: 0, height: 0, marginTop: 0 },
    };


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Übersicht</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                
                {/* Left Column */}
                <div className="space-y-6">
                    <QuickAddForm />
                </div>
                
                {/* Right Column */}
                <div className="space-y-6">
                    <motion.div
                        {...summaryCardAnimation}
                        className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white">Zusammenfassung</h3>
                            <ViewTabs viewMode={dashboardViewMode} setViewMode={setDashboardViewMode} />
                        </div>
                        <div className="space-y-4">
                             <div className="flex justify-between items-start">
                                 <div className="w-[calc(50%-1rem)]">
                                    <div className="flex items-center text-slate-400 mb-1">
                                        <Wallet className="h-5 w-5 mr-2 flex-shrink-0 text-amber-700" />
                                        <p className="font-medium text-sm">Tagesausgaben</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-white truncate" title={formatCurrency(todaysExpenses)}>{formatCurrency(todaysExpenses)}</p>
                                        <p className="text-xs text-slate-500 truncate mt-0.5" title={todaysExpensesLabel}>{todaysExpensesLabel}</p>
                                    </div>
                                </div>
                                
                                <div className="w-px bg-slate-700/50 self-stretch mx-4"></div>
                                
                                <div className="w-[calc(50%-1rem)]">
                                    <div className="flex items-center text-slate-400 mb-1">
                                        <TotalExpensesIcon className={totalExpensesIconClassName} />
                                        <p className="font-medium text-sm">Gesamtausgaben</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-white truncate" title={formatCurrency(totalExpenses)}>{formatCurrency(totalExpenses)}</p>
                                        <p className="text-xs text-slate-500 truncate mt-0.5" title={totalExpensesLabel}>{totalExpensesLabel}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div
                        {...cardAnimation}
                        className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white">Analyse flexibler Ausgaben</h3>
                        </div>
                        <div className="h-[300px] sm:h-[250px]">
                            <CategoryPieChart transactions={flexibleTransactionsInPeriod} />
                        </div>
                        {totalMonthlyBudget > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-700/50">
                                <h4 className="text-sm font-semibold text-slate-300 mb-3">Flexibles Monatsbudget</h4>
                                <div className="flex justify-between items-baseline text-sm mb-1">
                                    <p className="text-slate-300">
                                        <span className="font-semibold text-white">{formatCurrency(totalSpentThisMonth)}</span>
                                        <span className="text-slate-500"> / {formatCurrency(totalMonthlyBudget)}</span>
                                    </p>
                                    <p className="font-semibold">{totalBudgetPercentage.toFixed(0)}%</p>
                                </div>
                                <BudgetProgressBar percentage={totalBudgetPercentage} color="#22c55e" />
                            </div>
                        )}
                    </motion.div>

                    {hasAnyBudgetedCategories && (
                        <motion.div
                            {...cardAnimation}
                            className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50"
                        >
                            <h4 className="text-sm font-semibold text-slate-300">Kategorienbudgets (Flexibel)</h4>
                            <div className="space-y-3 mt-4">
                                {groupedBudgetedCategories.map(({group, ...data}) => {
                                    const groupPercentage = data.totalBudget > 0 ? (data.totalSpent / data.totalBudget) * 100 : (data.totalSpent > 0 ? 101 : 0);
                                    const GroupIcon = getIconComponent(group.icon);
                                    
                                    return (
                                        <div key={group.id} className="bg-slate-700/30 p-3 rounded-lg space-y-3">
                                            <div className="flex flex-col">
                                                <div className="flex justify-between items-center text-sm mb-1.5">
                                                    <div className="flex items-center gap-3 truncate">
                                                        <GroupIcon className="h-5 w-5 flex-shrink-0" style={{ color: group.color }} />
                                                        <span className="font-bold text-white truncate">{group.name}</span>
                                                    </div>
                                                    <div className="font-semibold text-white flex-shrink-0 pl-2">
                                                        {formatCurrency(data.totalSpent)}
                                                        <span className="text-slate-500 text-xs"> / {formatCurrency(data.totalBudget)}</span>
                                                    </div>
                                                </div>
                                                <BudgetProgressBar percentage={groupPercentage} color={group.color} />
                                            </div>

                                            <div className="space-y-4 pt-3 ml-4 pl-4 border-l-2 border-slate-600/50">
                                                {data.categories.map((category: Category) => {
                                                    const spent = spendingByCategory.get(category.id) || 0;
                                                    const budget = category.budget!;
                                                    const percentage = budget > 0 ? (spent / budget) * 100 : (spent > 0 ? 101 : 0);
                                                    const Icon = getIconComponent(category.icon);
                                                    const isExpanded = expandedBudgetId === category.id;
                                                    
                                                    return (
                                                        <div key={category.id}>
                                                            <div
                                                                className="flex flex-col cursor-pointer"
                                                                onClick={() => setExpandedBudgetId(isExpanded ? null : category.id)}
                                                            >
                                                                <div className="flex justify-between items-center text-sm mb-1.5">
                                                                    <div className="flex items-center gap-3 truncate">
                                                                        <Icon className="h-4 w-4 flex-shrink-0" style={{ color: category.color }} />
                                                                        <span className="font-medium text-white truncate">{category.name}</span>
                                                                        {/* ChevronDown should be imported from ui */}
                                                                    </div>
                                                                    <div className="font-semibold text-white flex-shrink-0 pl-2">
                                                                        {formatCurrency(spent)}
                                                                        <span className="text-slate-500 text-xs"> / {formatCurrency(budget)}</span>
                                                                    </div>
                                                                </div>
                                                                <BudgetProgressBar percentage={percentage} color={category.color} />
                                                            </div>
                                                            <AnimatePresence>
                                                                {isExpanded && (
                                                                    <motion.div
                                                                        {...transactionDetailsAnimation}
                                                                        className="overflow-hidden"
                                                                    >
                                                                        <div className="ml-4 pl-4 border-l-2 border-slate-600/50 space-y-1">
                                                                            {monthlyTransactions.filter(t => t.categoryId === category.id)
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
                                                                            {monthlyTransactions.filter(t => t.categoryId === category.id).length === 0 && (
                                                                                <p className="text-slate-500 text-sm p-2">Keine Ausgaben diesen Monat.</p>
                                                                            )}
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;