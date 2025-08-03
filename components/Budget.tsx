
import React, { useMemo } from 'react';
import type { FC } from 'react';
import { motion } from 'framer-motion';
import type { Transaction, Category, CategoryId } from '../types';
import { formatCurrency, parseISO, startOfMonth, endOfMonth, isWithinInterval } from '../utils/dateUtils';
import { iconMap } from './Icons';

interface BudgetProps {
    transactions: Transaction[];
    categories: Category[];
    setCategories: (cats: Category[] | ((prev: Category[]) => Category[])) => void;
}

const ProgressBar: FC<{ percentage: number; color: string; }> = ({ percentage, color }) => (
    <div className="w-full bg-slate-700 rounded-full h-2.5">
        <motion.div
            className="h-2.5 rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
        />
    </div>
);

const Budget: FC<BudgetProps> = ({ transactions, categories, setCategories }) => {
    
    const { spendingByCategory } = useMemo(() => {
        const now = new Date();
        const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) };

        const monthlyTransactions = transactions.filter(t => {
            if (!t.date || typeof t.date !== 'string') return false;
            try {
                const date = parseISO(t.date);
                if (isNaN(date.getTime())) return false;
                return isWithinInterval(date, monthInterval);
            } catch { return false; }
        });

        const spendingMap = new Map<CategoryId, number>();
        monthlyTransactions.forEach(t => {
            spendingMap.set(t.categoryId, (spendingMap.get(t.categoryId) || 0) + t.amount);
        });

        return { spendingByCategory: spendingMap };
    }, [transactions]);
    
    const handleCategoryBudgetChange = (id: string, value: string) => {
        setCategories(currentCategories =>
            currentCategories.map(cat => {
                if (cat.id === id) {
                    const budgetValue = parseFloat(value.replace(',', '.'));
                    return { ...cat, budget: isNaN(budgetValue) || budgetValue <= 0 ? undefined : budgetValue };
                }
                return cat;
            })
        );
    };

    const getCategoryBarColor = (percentage: number, categoryColor: string) => {
        if (percentage > 100) return '#ef4444'; // red-500
        if (percentage > 85) return '#f97316'; // orange-500
        return categoryColor;
    };
    
    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-white">Budgetplanung</h1>
            </div>
            
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-bold text-white mb-4">Kategorienbudgets</h3>
                <div className="space-y-5">
                    {categories.map(category => {
                        const spent = spendingByCategory.get(category.id) || 0;
                        const budget = category.budget;
                        const percentage = budget && budget > 0 ? (spent / budget) * 100 : 0;
                        const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
                        
                        return (
                            <div key={category.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                <div className="md:col-span-1 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: category.color }}>
                                        <Icon className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-medium text-white">{category.name}</p>
                                        <div className="relative w-32 mt-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={category.budget?.toString().replace('.', ',') || ''}
                                                onChange={e => handleCategoryBudgetChange(category.id, e.target.value)}
                                                placeholder="Budget"
                                                className="bg-slate-700 border border-slate-600 rounded-md py-1.5 pl-7 pr-2 text-white placeholder-slate-400 w-full focus:outline-none focus:ring-2 focus:ring-rose-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                {budget && budget > 0 ? (
                                    <div className="md:col-span-2 space-y-1">
                                         <div className="flex justify-between items-baseline text-sm">
                                             <p className="text-slate-300">
                                                 <span className="font-semibold text-white">{formatCurrency(spent)}</span>
                                                 <span className="text-slate-500"> / {formatCurrency(budget)}</span>
                                             </p>
                                             <p className="font-semibold text-white">{percentage.toFixed(0)}%</p>
                                         </div>
                                         <ProgressBar percentage={percentage} color={getCategoryBarColor(percentage, category.color)} />
                                    </div>
                                ) : (
                                    <div className="md:col-span-2 text-center md:text-left text-sm text-slate-500">
                                        Kein Budget festgelegt.
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </motion.div>

        </div>
    );
};

export default Budget;
