
import React, { FC, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../../../contexts/AppContext';
import type { Transaction } from '../../../types';
import { format, parseISO } from 'date-fns';
import { ChevronDown, Home } from '../../../components/ui';
import { formatCurrency } from '../../../utils/dateUtils';
import StandardTransactionItem from '../../../components/StandardTransactionItem';
import { FIXED_COSTS_GROUP_NAME } from '../../../constants';

export const MonthlyCategoryBreakdown: FC<{ transactions: Transaction[], currentMonth: Date }> = ({ transactions, currentMonth }) => {
    const { categoryMap, handleTransactionClick, visibleCategoryGroups, deLocale } = useApp();
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
    const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

    const { fixedCostsBreakdown, flexibleGroupedBreakdown } = useMemo(() => {
        const spendingByCategory = new Map<string, number>();
        transactions.forEach(t => {
            if (t.categoryId) {
                spendingByCategory.set(t.categoryId, (spendingByCategory.get(t.categoryId) || 0) + t.amount);
            }
        });
        const totalMonthlySpending = transactions.reduce((sum, t) => sum + t.amount, 0);

        const spendingByGroup = new Map<string, { total: number; categories: any[] }>();
        visibleCategoryGroups.forEach(groupName => {
            spendingByGroup.set(groupName, { total: 0, categories: [] });
        });

        spendingByCategory.forEach((amount, categoryId) => {
            const category = categoryMap.get(categoryId);
            if (category && spendingByGroup.has(category.group)) {
                const groupData = spendingByGroup.get(category.group)!;
                groupData.total += amount;
                groupData.categories.push({
                    category,
                    amount,
                    percentage: totalMonthlySpending > 0 ? (amount / totalMonthlySpending) * 100 : 0
                });
            }
        });

        const allGroupsData = Array.from(spendingByGroup.entries())
            .map(([groupName, data]) => ({
                groupName,
                totalAmount: data.total,
                categories: data.categories.sort((a, b) => b.amount - a.amount)
            }))
            .filter(group => group.totalAmount > 0);

        const fixedData = allGroupsData.find(g => g.groupName === FIXED_COSTS_GROUP_NAME);
        const flexibleData = allGroupsData
            .filter(g => g.groupName !== FIXED_COSTS_GROUP_NAME)
            .sort((a, b) => b.totalAmount - a.totalAmount);

        return { fixedCostsBreakdown: fixedData, flexibleGroupedBreakdown: flexibleData };
    }, [transactions, categoryMap, visibleCategoryGroups]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }} 
            className="bg-slate-800 p-6 rounded-2xl border border-slate-700"
        >
            <h3 className="text-lg font-bold text-white mb-4">Kategorienübersicht ({format(currentMonth, 'MMMM', { locale: deLocale })})</h3>
            <div className="space-y-3">
                 {fixedCostsBreakdown && (
                    <div className="bg-slate-800/50 rounded-lg overflow-hidden p-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-white truncate pr-4 flex items-center gap-2">
                                <Home className="h-5 w-5 text-sky-400" /> {fixedCostsBreakdown.groupName}
                            </h4>
                            <span className="font-bold text-white">{formatCurrency(fixedCostsBreakdown.totalAmount)}</span>
                        </div>
                        
                        <div className="pt-4 mt-4 border-t border-slate-700 space-y-2">
                             {fixedCostsBreakdown.categories.map(({ category, amount }) => (
                                <div key={category.id} className="bg-slate-700/50 rounded-lg p-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium text-slate-300 truncate">{category.name}</span>
                                        <span className="font-bold text-white flex-shrink-0 pl-2">{formatCurrency(amount)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {flexibleGroupedBreakdown.length > 0 ? flexibleGroupedBreakdown.map(group => (
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
                )) : (!fixedCostsBreakdown && <p className="text-slate-500 text-center py-4">Keine Ausgaben in diesem Monat.</p>)}
            </div>
        </motion.div>
    );
}
