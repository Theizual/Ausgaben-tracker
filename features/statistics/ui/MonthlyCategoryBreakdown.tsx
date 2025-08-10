

import React, { FC, useState, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence, motion, MotionProps } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { Transaction, Category, Group } from '@/shared/types';
import { format, parseISO } from 'date-fns';
import { ChevronDown, getIconComponent } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { StandardTransactionItem } from '@/shared/ui';
import { FIXED_COSTS_GROUP_ID, FIXED_COSTS_GROUP_NAME } from '@/constants';
import { BudgetProgressBar } from '@/shared/ui/BudgetProgressBar';

export const MonthlyCategoryBreakdown: FC<{ transactions: Transaction[], currentMonth: Date }> = ({ transactions, currentMonth }) => {
    const { categoryMap, handleTransactionClick, deLocale, groupMap, groups } = useApp();
    const [expandedSupergroups, setExpandedSupergroups] = useState<string[]>(['Fixkosten', 'Variable Kosten']); // Default open
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
    const defaultExpandedSet = useRef(false);

    const { supergroupedData, spendingByCategory } = useMemo(() => {
        const spendingMap = new Map<string, number>();
        transactions.forEach(t => {
            if (t.categoryId) {
                spendingMap.set(t.categoryId, (spendingMap.get(t.categoryId) || 0) + t.amount);
            }
        });

        const categoriesWithSpending = Array.from(spendingMap.keys()).map(id => categoryMap.get(id)).filter((c): c is Category => !!c);

        const groupDataMap = new Map<string, { totalSpent: number; totalBudget: number; categories: Category[]; group: Group }>();
        
        groups.forEach(group => {
            groupDataMap.set(group.id, { totalSpent: 0, totalBudget: 0, categories: [], group });
        });

        categoriesWithSpending.forEach(category => {
            if (groupDataMap.has(category.groupId)) {
                const groupData = groupDataMap.get(category.groupId)!;
                groupData.totalSpent += spendingMap.get(category.id) || 0;
                groupData.categories.push(category);
            }
        });

        groupDataMap.forEach((data, groupId) => {
            const allCategoriesInGroup = Array.from(categoryMap.values()).filter(c => c.groupId === groupId && c.budget);
            data.totalBudget = allCategoriesInGroup.reduce((sum, cat) => sum + (cat.budget || 0), 0);
            data.categories.sort((a, b) => (spendingMap.get(b.id) || 0) - (spendingMap.get(a.id) || 0));
        });

        const allGroupData = Array.from(groupDataMap.values())
            .filter(group => group.totalSpent > 0);

        const supergroupMap = new Map<string, { totalSpent: number; totalBudget: number; groups: typeof allGroupData }>([
            ['Fixkosten', { totalSpent: 0, totalBudget: 0, groups: [] }],
            ['Variable Kosten', { totalSpent: 0, totalBudget: 0, groups: [] }],
        ]);

        allGroupData.forEach(groupData => {
            const supergroupName = groupData.group.id === FIXED_COSTS_GROUP_ID ? 'Fixkosten' : 'Variable Kosten';
            const supergroup = supergroupMap.get(supergroupName)!;
            if (supergroup) {
                supergroup.totalSpent += groupData.totalSpent;
                supergroup.totalBudget += groupData.totalBudget;
                supergroup.groups.push(groupData);
            }
        });

        const result = Array.from(supergroupMap.entries())
            .map(([supergroupName, data]) => ({ supergroupName, ...data }))
            .filter(sg => sg.totalSpent > 0);

        return { supergroupedData: result, spendingByCategory: spendingMap };
    }, [transactions, categoryMap, groupMap, groups]);

    useEffect(() => {
        if (supergroupedData.length > 0 && !defaultExpandedSet.current) {
            const allGroupIds = supergroupedData.flatMap(sg => sg.groups.map(g => g.group.id));
            setExpandedGroups(allGroupIds);
            defaultExpandedSet.current = true;
        }
    }, [supergroupedData]);

    const toggleSupergroup = (name: string) => {
        setExpandedSupergroups(prev => prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name]);
    };
    
    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId]);
    };

    const breakdownAnimation: MotionProps = {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.2 },
    };
    
    const expandAnimation: MotionProps = {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: 'auto' },
        exit: { opacity: 0, height: 0 },
    };

    const groupExpandAnimation: MotionProps = {
        ...expandAnimation,
        transition: { duration: 0.3 }
    };

    const categoryExpandAnimation: MotionProps = {
        initial: { opacity: 0, height: 0, marginTop: 0 },
        animate: { opacity: 1, height: 'auto', marginTop: '1rem' },
        exit: { opacity: 0, height: 0, marginTop: 0 },
    };

    return (
        <motion.div
            {...breakdownAnimation}
            className="bg-slate-800 p-6 rounded-2xl border border-slate-700"
        >
            <h3 className="text-lg font-bold text-white mb-4">Kategorienübersicht ({format(currentMonth, 'MMMM', { locale: deLocale })})</h3>
            <div className="space-y-4">
                {supergroupedData.length > 0 ? supergroupedData.map(supergroup => {
                    const isSupergroupExpanded = expandedSupergroups.includes(supergroup.supergroupName);
                    return (
                        <div key={supergroup.supergroupName} className="bg-slate-900/30 rounded-lg">
                            <button
                                onClick={() => toggleSupergroup(supergroup.supergroupName)}
                                className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-700/20"
                            >
                                <div className="flex items-center gap-3">
                                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isSupergroupExpanded ? 'rotate-180' : ''}`} />
                                    <h4 className="font-bold text-lg text-white">{supergroup.supergroupName}</h4>
                                </div>
                                <span className="font-bold text-white">{formatCurrency(supergroup.totalSpent)}</span>
                            </button>
                            
                            <AnimatePresence>
                                {isSupergroupExpanded && (
                                    <motion.div
                                        {...expandAnimation}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-4 border-t border-slate-700/50 space-y-3">
                                            {supergroup.groups.map(groupData => {
                                                const isGroupExpanded = expandedGroups.includes(groupData.group.id);
                                                const groupHasBudget = groupData.totalBudget > 0;
                                                const groupPercentage = groupHasBudget ? (groupData.totalSpent / groupData.totalBudget) * 100 : 0;
                                                const GroupIcon = getIconComponent(groupData.group.icon);

                                                return (
                                                    <div key={groupData.group.id} className="bg-slate-700/30 p-3 rounded-lg space-y-3">
                                                        <div
                                                            className="flex flex-col cursor-pointer"
                                                            onClick={() => toggleGroup(groupData.group.id)}
                                                        >
                                                            <div className="flex justify-between items-center text-sm mb-1.5">
                                                                <div className="flex items-center gap-3 truncate">
                                                                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isGroupExpanded ? 'rotate-180' : ''}`} />
                                                                    <GroupIcon className="h-5 w-5 flex-shrink-0" style={{ color: groupData.group.color }} />
                                                                    <span className="font-bold text-white truncate">{groupData.group.name}</span>
                                                                </div>
                                                                <div className="font-semibold text-white flex-shrink-0 pl-2">
                                                                    {formatCurrency(groupData.totalSpent)}
                                                                    {groupHasBudget && <span className="text-slate-500 text-xs"> / {formatCurrency(groupData.totalBudget)}</span>}
                                                                </div>
                                                            </div>
                                                            {groupHasBudget && <BudgetProgressBar percentage={groupPercentage} color={groupData.group.color} />}
                                                        </div>

                                                        <AnimatePresence>
                                                            {isGroupExpanded && (
                                                                <motion.div
                                                                    {...groupExpandAnimation}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="space-y-4 pt-3 ml-4 pl-4 border-l-2 border-slate-600/50">
                                                                        {groupData.categories.map((category: Category) => {
                                                                            const spent = spendingByCategory.get(category.id) || 0;
                                                                            const budget = category.budget;
                                                                            const hasBudget = budget !== undefined && budget > 0;
                                                                            const percentage = hasBudget ? (spent / budget) * 100 : 0;
                                                                            const Icon = getIconComponent(category.icon);
                                                                            const isCategoryExpanded = expandedCategoryId === category.id;
                                                                            
                                                                            return (
                                                                                <div key={category.id}>
                                                                                    <div
                                                                                        className="flex flex-col cursor-pointer"
                                                                                        onClick={() => setExpandedCategoryId(isCategoryExpanded ? null : category.id)}
                                                                                    >
                                                                                        <div className="flex justify-between items-center text-sm mb-1.5">
                                                                                            <div className="flex items-center gap-3 truncate">
                                                                                                <Icon className="h-4 w-4 flex-shrink-0" style={{ color: category.color }} />
                                                                                                <span className="font-medium text-white truncate">{category.name}</span>
                                                                                                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isCategoryExpanded ? 'rotate-180' : ''}`} />
                                                                                            </div>
                                                                                            <div className="font-semibold text-white flex-shrink-0 pl-2">
                                                                                                {formatCurrency(spent)}
                                                                                                {hasBudget && <span className="text-slate-500 text-xs"> / {formatCurrency(budget)}</span>}
                                                                                            </div>
                                                                                        </div>
                                                                                        {hasBudget && <BudgetProgressBar percentage={percentage} color={category.color} />}
                                                                                    </div>
                                                                                    <AnimatePresence>
                                                                                        {isCategoryExpanded && (
                                                                                            <motion.div
                                                                                                {...categoryExpandAnimation}
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
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                }) : <p className="text-slate-500 text-center py-4">Keine Ausgaben in diesem Monat.</p>}
            </div>
        </motion.div>
    );
};