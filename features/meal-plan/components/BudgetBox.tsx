import React, { FC, useMemo, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { WeeklyPlan } from '@/shared/types';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { Wallet } from '@/shared/ui';
import { isWithinInterval, parseISO, startOfMonth, endOfMonth } from 'date-fns';

interface BudgetBoxProps {
    plan: WeeklyPlan | null;
    onBudgetStatusChange: (isTight: boolean) => void;
}

export const BudgetBox: FC<BudgetBoxProps> = ({ plan, onBudgetStatusChange }) => {
    const { transactions, categoryMap, groupMap, flexibleCategories } = useApp();

    const { foodBudget, foodSpending } = useMemo(() => {
        const foodGroup = Array.from(groupMap.values()).find(g => g.name === 'Haushalt & Lebensmittel');
        const gastroCategory = Array.from(categoryMap.values()).find(c => c.name.startsWith('Gastronomie'));
        
        if (!foodGroup) return { foodBudget: 0, foodSpending: 0 };
        
        const foodCategoryIds = new Set(
            Array.from(categoryMap.values())
            .filter(c => c.groupId === foodGroup.id)
            .map(c => c.id)
        );
        if (gastroCategory) {
            foodCategoryIds.add(gastroCategory.id);
        }

        const budget = flexibleCategories
            .filter(c => foodCategoryIds.has(c.id))
            .reduce((sum, c) => sum + (c.budget || 0), 0);

        const monthInterval = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
        const spending = transactions
            .filter(t => foodCategoryIds.has(t.categoryId) && isWithinInterval(parseISO(t.date), monthInterval))
            .reduce((sum, t) => sum + t.amount, 0);

        return { foodBudget: budget, foodSpending: spending };
    }, [categoryMap, groupMap, flexibleCategories, transactions]);

    const totalEstimate = plan?.totalEstimate || 0;
    const remainingBudget = foodBudget - foodSpending;
    const budgetAfterPlan = remainingBudget - totalEstimate;
    const percentageUsed = foodBudget > 0 ? (foodSpending / foodBudget) * 100 : 0;
    const percentageAfterPlan = foodBudget > 0 ? ((foodSpending + totalEstimate) / foodBudget) * 100 : (totalEstimate > 0 ? 101 : 0);

    const getStatus = (percentage: number): { color: string; text: string; isTight: boolean } => {
        if (percentage > 100) return { color: 'bg-red-500', text: 'Budget überschritten', isTight: true };
        if (percentage > 85) return { color: 'bg-amber-500', text: 'Budget fast aufgebraucht', isTight: true };
        return { color: 'bg-green-500', text: 'Im Budget', isTight: false };
    };

    const status = getStatus(percentageAfterPlan);
    
    useEffect(() => {
        onBudgetStatusChange(status.isTight);
    }, [status.isTight, onBudgetStatusChange]);

    return (
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 space-y-4">
            <div className="flex items-center gap-3">
                <Wallet className="h-6 w-6 text-rose-400" />
                <h3 className="text-lg font-bold text-white">Budget-Check</h3>
            </div>

            <div className="flex justify-between items-baseline">
                <span className="text-slate-400">Prognose für diese Woche:</span>
                <span className="text-xl font-bold text-white">{formatCurrency(totalEstimate)}</span>
            </div>

            <div className="pt-4 border-t border-slate-700/50 space-y-3">
                <div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-300">Monatsbudget (Lebensmittel):</span>
                        <span className="font-semibold text-white">{formatCurrency(foodBudget)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-300">Bisher ausgegeben:</span>
                        <span className="font-semibold text-white">{formatCurrency(foodSpending)}</span>
                    </div>
                </div>

                <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div className="bg-rose-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, percentageUsed)}%` }} />
                </div>
                
                <div className="flex justify-between items-center text-sm pt-2">
                    <span className="text-slate-300 font-semibold">Status nach Plan:</span>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${status.color}`} />
                        <span className="font-bold text-white">{status.text}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};