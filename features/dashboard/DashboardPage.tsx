import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { Transaction, ViewMode, Category } from '@/shared/types';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { Wallet, getIconComponent, Calendar, CalendarDays, ChevronDown } from '@/shared/ui';
import { FIXED_COSTS_GROUP_ID, COLOR_SUCCESS } from '@/constants';
import { StandardTransactionItem } from '@/shared/ui';
import { CategoryPieChart } from './ui/CategoryPieChart';
import { QuickAddForm } from './ui/QuickAddForm';
import { MoreCategoriesModal } from './ui/MoreCategoriesModal';
import { ViewTabs } from './ui/ViewTabs';
import { BudgetProgressBar } from '@/shared/ui/BudgetProgressBar';
import useLocalStorage from '@/shared/hooks/useLocalStorage';
import { pageContentAnimation, collapsibleAnimation, transactionDetailsAnimation } from '@/shared/lib/animations';

const MotionDiv = motion.div;

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
    const [expandedBudgetGroupIds, setExpandedBudgetGroupIds] = useLocalStorage<string[] | null>('dashboard-budget-groups-expanded', null);
    
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

    useEffect(() => {
        // On first load when there's no stored preference, expand all groups by default.
        if (expandedBudgetGroupIds === null && groupedBudgetedCategories.length > 0) {
            setExpandedBudgetGroupIds(groupedBudgetedCategories.map(g => g.group.id));
        }
    }, [groupedBudgetedCategories, expandedBudgetGroupIds, setExpandedBudgetGroupIds]);

    const toggleBudgetGroup = (groupId: string) => {
        if (expandedBudgetGroupIds === null) return;
        setExpandedBudgetGroupIds(prev =>
            prev && prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...(prev || []), groupId]
        );
    };

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
                    <MotionDiv
                        initial={pageContentAnimation.initial}
                        animate={pageContentAnimation.animate}
                        exit={pageContentAnimation.exit}
                        transition={{ delay: 0.1, duration: 0.3 }}
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
                    </MotionDiv>
                    <MotionDiv
                        className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col"
                        initial={pageContentAnimation.initial}
                        animate={pageContentAnimation.animate}
                        exit={pageContentAnimation.exit}
                        transition={{ delay: 0.2, duration: 0.3 }}
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
                                <BudgetProgressBar percentage={totalBudgetPercentage} color={COLOR_SUCCESS} />
                            </div>
                        )}
                    </MotionDiv>

                    {hasAnyBudgetedCategories && (
                        <MotionDiv
                            className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50"
                            initial={pageContentAnimation.initial}
                            animate={pageContentAnimation.animate}
                            exit={pageContentAnimation.exit}
                            transition={{ delay: 0.3, duration: 0.3 }}
                        >
                            <h4 className="text-sm font-semibold text-slate-300">Kategorienbudgets (Flexibel)</h4>
                            <div className="space-y-3 mt-4">
                                {groupedBudgetedCategories.map(({group, ...data}) => {
                                    const groupPercentage = data.totalBudget > 0 ? (data.totalSpent / data.totalBudget) * 100 : (data.totalSpent > 0 ? 101 : 0);
                                    const GroupIcon = getIconComponent(group.icon);
                                    const isGroupExpanded = expandedBudgetGroupIds?.includes(group.id) ?? true;
                                    
                                    return (
                                        <div key={group.id} className="relative bg-slate-700/30 p-3 rounded-lg overflow-hidden">
                                            <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: group.color || '#64748b', opacity: 0.07 }}></div>
                                            <div className="relative flex flex-col">
                                                <button onClick={() => toggleBudgetGroup(group.id)} className="w-full flex justify-between items-center text-sm mb-1.5 text-left" aria-expanded={isGroupExpanded}>
                                                    <div className="flex items-center gap-3 truncate">
                                                         <ChevronDown className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${isGroupExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                                                        <GroupIcon className="h-5 w-5 flex-shrink-0" style={{ color: group.color }} />
                                                        <span className="font-bold text-white truncate">{group.name}</span>
                                                    </div>
                                                    <div className="font-semibold text-white flex-shrink-0 pl-2">
                                                        {formatCurrency(data.totalSpent)}
                                                        <span className="text-slate-500 text-xs"> / {formatCurrency(data.totalBudget)}</span>
                                                    </div>
                                                </button>
                                                <BudgetProgressBar percentage={groupPercentage} color={group.color} />
                                            </div>
                                            <AnimatePresence>
                                                {isGroupExpanded && (
                                                    <MotionDiv
                                                        variants={collapsibleAnimation}
                                                        initial="initial"
                                                        animate="animate"
                                                        exit="exit"
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="relative space-y-4 pt-3 ml-4 pl-4 border-l-2 border-slate-600/50">
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
                                                                                <MotionDiv
                                                                                    variants={transactionDetailsAnimation}
                                                                                    initial="initial"
                                                                                    animate="animate"
                                                                                    exit="exit"
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
                                                                                </MotionDiv>
                                                                            )}
                                                                        </AnimatePresence>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </MotionDiv>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        </MotionDiv>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;