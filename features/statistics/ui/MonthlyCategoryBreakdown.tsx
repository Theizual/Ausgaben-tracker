import React, { FC, useState, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { Transaction, Category, Group } from '@/shared/types';
import { format, parseISO, isSameMonth } from 'date-fns';
import { ChevronDown, getIconComponent, CheckCircle2, CalendarClock } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { StandardTransactionItem } from '@/shared/ui';
import { FIXED_COSTS_GROUP_ID } from '@/constants';
import { BudgetProgressBar } from '@/shared/ui/BudgetProgressBar';

export const MonthlyCategoryBreakdown: FC<{ transactions: Transaction[], currentMonth: Date }> = ({ transactions, currentMonth }) => {
    const { categoryMap, handleTransactionClick, deLocale, groupMap, groups, recurringTransactions } = useApp();
    const [expandedSupergroups, setExpandedSupergroups] = useState<string[]>(['Variable Kosten', 'Fixkosten']);
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

        const groupDataMap = new Map<string, { totalSpent: number; totalBudget: number; categories: Category[]; group: Group }>();
        
        // 1. Initialize map for each group
        groups.forEach(group => {
            groupDataMap.set(group.id, { 
                totalSpent: 0, 
                totalBudget: 0, 
                categories: [],
                group 
            });
        });

        // 2. Populate groups with ALL their categories from the main categoryMap
        categoryMap.forEach(category => {
            if (groupDataMap.has(category.groupId)) {
                const groupData = groupDataMap.get(category.groupId)!;
                groupData.categories.push(category);
            }
        });

        // 3. Calculate totals for each group and sort their categories by spending
        groupDataMap.forEach((data) => {
            data.totalSpent = data.categories.reduce((sum, cat) => sum + (spendingMap.get(cat.id) || 0), 0);
            data.totalBudget = data.categories.reduce((sum, cat) => sum + (cat.budget || 0), 0);
            data.categories.sort((a, b) => (spendingMap.get(b.id) || 0) - (spendingMap.get(a.id) || 0));
        });

        const allGroupData = Array.from(groupDataMap.values())
            .filter(data => data.categories.length > 0)
            .sort((a, b) => a.group.sortIndex - b.group.sortIndex);

        const fixedCostsData = allGroupData.filter(data => data.group.id === FIXED_COSTS_GROUP_ID);
        const variableCostsData = allGroupData.filter(data => data.group.id !== FIXED_COSTS_GROUP_ID);

        const fixedTotal = fixedCostsData.reduce((sum, group) => sum + group.totalSpent, 0);
        const variableTotal = variableCostsData.reduce((sum, group) => sum + group.totalSpent, 0);

        const supergrouped = [];
        if (variableCostsData.length > 0) {
            supergrouped.push({
                name: 'Variable Kosten',
                total: variableTotal,
                groups: variableCostsData
            });
        }
        if (fixedCostsData.length > 0) {
            supergrouped.push({
                name: 'Fixkosten',
                total: fixedTotal,
                groups: fixedCostsData
            });
        }

        return { supergroupedData: supergrouped, spendingByCategory: spendingMap };
    }, [transactions, categoryMap, groups]);

    useEffect(() => {
        if (!defaultExpandedSet.current && supergroupedData.length > 0 && supergroupedData[0].groups.length > 0) {
            setExpandedGroups([supergroupedData[0].groups[0].group.id]);
            defaultExpandedSet.current = true;
        }
    }, [supergroupedData]);

    const dataToRender = supergroupedData;
    
    const toggleSupergroup = (name: string) => setExpandedSupergroups(p => p.includes(name) ? p.filter(i => i !== name) : [...p, name]);
    const toggleGroup = (id: string) => setExpandedGroups(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
    
    const transactionDetailsAnimation = {
        initial: { opacity: 0, height: 0, marginTop: 0 },
        animate: { opacity: 1, height: 'auto', marginTop: '0.5rem' },
        exit: { opacity: 0, height: 0, marginTop: 0 },
    };
    
    const groupAnimationProps = {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: 'auto' },
        exit: { opacity: 0, height: 0 },
    };

    if (transactions.length === 0) {
        return (
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 text-center">
                <h3 className="text-lg font-bold text-white">Monatsübersicht nach Kategorien</h3>
                <p className="text-slate-500 mt-4">Keine Ausgaben in diesem Monat erfasst.</p>
            </div>
        );
    }
    
    return (
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <h3 className="text-lg font-bold text-white">Monatsübersicht nach Kategorien</h3>
            </div>
            {dataToRender.map(supergroup => (
                 <div key={supergroup.name} className="bg-slate-700/30 p-2.5 rounded-lg">
                     <button onClick={() => toggleSupergroup(supergroup.name)} className="w-full flex justify-between items-center text-left p-1">
                         <div className="flex items-center gap-2">
                             <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${expandedSupergroups.includes(supergroup.name) ? 'rotate-180' : ''}`} />
                             <h4 className="font-bold text-white">{supergroup.name}</h4>
                         </div>
                         <span className="font-bold text-white">{formatCurrency(supergroup.total)}</span>
                     </button>
                     <AnimatePresence>
                         {expandedSupergroups.includes(supergroup.name) && (
                             <motion.div {...groupAnimationProps} className="overflow-hidden">
                                 <div className="mt-3 pt-3 border-t border-slate-600/50 space-y-2">
                                     {supergroup.name === 'Fixkosten' ? (
                                         supergroup.groups.map(({ group, categories }) => (
                                            <div key={group.id} className="relative bg-slate-700/30 p-2 rounded-lg overflow-hidden">
                                                <div className="pl-4 space-y-1">
                                                    {categories.map(category => {
                                                        const rec = recurringTransactions.find(rt => rt.categoryId === category.id && !rt.isDeleted);
                                                        const budgetAmount = rec?.amount || 0;
                                                        const isPostedThisMonth = rec ? transactions.some(t => t.recurringId === rec.id && isSameMonth(parseISO(t.date), currentMonth)) : false;
                                                        const Icon = getIconComponent(category.icon);

                                                        return (
                                                            <div key={category.id} className="flex justify-between items-center text-sm py-1">
                                                                <div className="flex items-center gap-3 truncate">
                                                                    <Icon className="h-4 w-4 flex-shrink-0" style={{ color: category.color }} />
                                                                    <span className="font-medium text-white truncate">{category.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="font-semibold text-white text-sm flex-shrink-0">{formatCurrency(budgetAmount)} / Monat</span>
                                                                    {isPostedThisMonth ? (
                                                                        <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full font-semibold" title="Buchung für diesen Monat erfolgt">
                                                                            <CheckCircle2 className="h-3 w-3" /> Gebucht
                                                                        </span>
                                                                    ) : (
                                                                        <span className="flex items-center gap-1 text-xs bg-slate-600/50 text-slate-400 px-2 py-1 rounded-full font-semibold" title="Buchung für diesen Monat offen">
                                                                            <CalendarClock className="h-3 w-3" /> Offen
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                     ) : (
                                        supergroup.groups.map(({ group, categories, totalSpent, totalBudget }) => {
                                            const GroupIcon = getIconComponent(group.icon);
                                            const isExpanded = expandedGroups.includes(group.id);
                                            return (
                                                <div key={group.id} className="relative bg-slate-700/30 p-2 rounded-lg overflow-hidden">
                                                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: group.color || '#64748b', opacity: 0.07 }}></div>
                                                    <button onClick={() => toggleGroup(group.id)} className="relative w-full flex justify-between items-center text-left p-1">
                                                        <div className="flex items-center gap-2">
                                                            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                            <GroupIcon className="h-4 w-4" style={{ color: group.color }} />
                                                            <h5 className="font-semibold text-white text-sm">{group.name}</h5>
                                                        </div>
                                                        <span className="font-semibold text-white text-sm">{formatCurrency(totalSpent)}</span>
                                                    </button>
                                                    {totalBudget > 0 && <div className="relative mt-1.5 mx-1"><BudgetProgressBar percentage={totalSpent / totalBudget * 100} color={group.color} /></div>}
                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <motion.div {...transactionDetailsAnimation} className="overflow-hidden relative">
                                                                <div className="ml-4 pl-4 border-l border-slate-600/50 space-y-1">
                                                                    {categories.map(category => {
                                                                        const spent = spendingByCategory.get(category.id) || 0;
                                                                        const isCatExpanded = expandedCategoryId === category.id;
                                                                        return (
                                                                            <div key={category.id}>
                                                                                <StandardTransactionItem
                                                                                    transaction={{ id: category.id, amount: spent, description: category.name, categoryId: category.id, date: '', createdAt: '', iconOverride: category.icon, lastModified: '', version: 0 }}
                                                                                    onClick={() => setExpandedCategoryId(isCatExpanded ? null : category.id)}
                                                                                    density="compact"
                                                                                />
                                                                                <AnimatePresence>
                                                                                    {isCatExpanded && (
                                                                                        <motion.div {...transactionDetailsAnimation}>
                                                                                            <div className="ml-4 pl-4 border-l border-slate-700/50 space-y-1">
                                                                                                {transactions.filter(t => t.categoryId === category.id).map(t => (
                                                                                                    <StandardTransactionItem key={t.id} transaction={t} onClick={() => handleTransactionClick(t)} density="compact" showSublineInList="date" />
                                                                                                ))}
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
                                        })
                                    )}
                                 </div>
                             </motion.div>
                         )}
                     </AnimatePresence>
                 </div>
            ))}
        </div>
    );
};
