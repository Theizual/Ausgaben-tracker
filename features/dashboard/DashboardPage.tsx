
import React, { useState, useMemo, useEffect, FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../../contexts/AppContext';
import type { Transaction, ViewMode } from '../../types';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { formatCurrency } from '../../utils/dateUtils';
import { BarChart2, Coins, Home, getIconComponent } from '../../components/ui';
import { FIXED_COSTS_GROUP_NAME } from '../../constants';
import StandardTransactionItem from '../../components/StandardTransactionItem';
import { CategoryPieChart } from './components/CategoryPieChart';
import { QuickAddForm } from './components/QuickAddForm';
import { MoreCategoriesModal } from './components/MoreCategoriesModal';
import { ViewTabs } from './components/ViewTabs';
import { ProgressBar } from '../../components/ui';

const DashboardPage: FC = () => {
    const {
        transactions,
        categories,
        flexibleCategories,
        visibleCategoryGroups,
        totalMonthlyBudget,
        totalSpentThisMonth,
        totalMonthlyFixedCosts,
        handleTransactionClick,
        dashboardViewMode,
        setDashboardViewMode,
        groupColors,
        deLocale,
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
        
        const spendingByGroup = new Map<string, { totalSpent: number, totalBudget: number, categories: any[] }>();
        visibleCategoryGroups
            .filter(groupName => groupName !== FIXED_COSTS_GROUP_NAME)
            .forEach(groupName => {
                spendingByGroup.set(groupName, { totalSpent: 0, totalBudget: 0, categories: [] });
            });

        flexibleCategories.forEach(category => {
            if (category.budget && category.budget > 0) {
                const groupData = spendingByGroup.get(category.group);
                if (groupData) {
                    const spent = spendingMap.get(category.id) || 0;
                    groupData.totalSpent += spent;
                    groupData.totalBudget += category.budget!;
                    groupData.categories.push(category);
                }
            }
        });
        
        const result = Array.from(spendingByGroup.entries())
            .map(([groupName, data]) => ({
                groupName,
                ...data,
                categories: data.categories.sort((a,b) => (b.budget || 0) - (a.budget || 0)),
            }))
            .filter(group => group.categories.length > 0);

        return { groupedBudgetedCategories: result, spendingByCategory: spendingMap };
    }, [monthlyTransactions, flexibleCategories, visibleCategoryGroups]);

    const totalBudgetPercentage = totalMonthlyBudget > 0 ? (totalSpentThisMonth / totalMonthlyBudget) * 100 : 0;
    
    const getTotalBarColor = () => {
        if (totalBudgetPercentage > 100) return '#ef4444'; // red-500
        if (totalBudgetPercentage > 85) return '#f97316'; // orange-500
        return '#22c55e'; // green-500
    };

    const getCategoryBarColor = (percentage: number, categoryColor: string) => {
        if (percentage > 100) return '#ef4444'; // red-500
        if (percentage > 85) return '#f97316'; // orange-500
        return categoryColor;
    };
    
    const hasAnyBudgetedCategories = groupedBudgetedCategories.length > 0;
    
    const flexibleTransactionsInPeriod = useMemo(() => 
        filteredTransactions.filter(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            return cat?.group !== FIXED_COSTS_GROUP_NAME;
        }),
    [filteredTransactions, categories]);

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
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
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
                                        <BarChart2 className="h-5 w-5 mr-2 flex-shrink-0" />
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
                                        <Coins className="h-5 w-5 mr-2 flex-shrink-0" />
                                        <p className="font-medium text-sm">Gesamtausgaben</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-white truncate" title={formatCurrency(totalExpenses)}>{formatCurrency(totalExpenses)}</p>
                                        <p className="text-xs text-slate-500 truncate mt-0.5" title={totalExpensesLabel}>{totalExpensesLabel}</p>
                                    </div>
                                </div>
                            </div>
                            {totalMonthlyFixedCosts > 0 && (
                                <div className="pt-4 border-t border-slate-700/50">
                                    <div className="flex items-center text-slate-400 mb-1">
                                        <Home className="h-5 w-5 mr-2 flex-shrink-0 text-sky-400"/>
                                        <p className="font-medium text-sm">Monatliche Fixkosten</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-white">{formatCurrency(totalMonthlyFixedCosts)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
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
                                    <p className="font-semibold" style={{color: getTotalBarColor()}}>{totalBudgetPercentage.toFixed(0)}%</p>
                                </div>
                                <ProgressBar percentage={totalBudgetPercentage} color={getTotalBarColor()} className="h-2" />
                            </div>
                        )}
                         {hasAnyBudgetedCategories && (
                            <div className="mt-6 pt-6 border-t border-slate-700/50">
                                <h4 className="text-sm font-semibold text-slate-300">Kategorienbudgets (Flexibel)</h4>
                                <div className="space-y-3 mt-4">
                                    {groupedBudgetedCategories.map(group => {
                                        const groupPercentage = group.totalBudget > 0 ? (group.totalSpent / group.totalBudget) * 100 : 0;
                                        const groupColor = getCategoryBarColor(groupPercentage, groupColors[group.groupName] || '#a855f7');

                                        return (
                                            <div key={group.groupName} className="bg-slate-700/30 p-3 rounded-lg space-y-3">
                                                <div className="flex flex-col">
                                                    <div className="flex justify-between items-center text-sm mb-1.5">
                                                        <div className="flex items-center gap-3 truncate">
                                                            <span className="font-bold text-white truncate">{group.groupName}</span>
                                                        </div>
                                                        <div className="font-semibold text-white flex-shrink-0 pl-2">
                                                            {formatCurrency(group.totalSpent)}
                                                            <span className="text-slate-500 text-xs"> / {formatCurrency(group.totalBudget)}</span>
                                                        </div>
                                                    </div>
                                                    <ProgressBar percentage={groupPercentage} color={groupColor} className="h-2" />
                                                </div>

                                                <div className="space-y-4 pt-3 ml-4 pl-4 border-l-2 border-slate-600/50">
                                                    {group.categories.map(category => {
                                                        const spent = spendingByCategory.get(category.id) || 0;
                                                        const budget = category.budget!;
                                                        const percentage = (spent / budget) * 100;
                                                        const Icon = category.icon ? getIconComponent(category.icon) : getIconComponent();
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
                                                                    <ProgressBar percentage={percentage} color={getCategoryBarColor(percentage, category.color)} className="h-2" />
                                                                </div>
                                                                <AnimatePresence>
                                                                    {isExpanded && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                                            animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
                                                                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
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
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;