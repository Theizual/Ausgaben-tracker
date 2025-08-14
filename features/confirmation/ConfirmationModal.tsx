




import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { Transaction } from '@/shared/types';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { isWithinInterval, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { iconMap, CheckCircle2, getIconComponent } from '@/shared/ui';
import { modalBackdropAnimation, modalSlideDownAnimation, barAnimation } from '@/shared/lib/animations';
import { COLOR_DANGER, COLOR_SUCCESS, COLOR_WARNING } from '@/constants';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    totalSpentBefore: number;
}

const ConfirmationModal = ({
    isOpen,
    onClose,
    transactions: newTransactions,
    totalSpentBefore,
}: ConfirmationModalProps) => {
    const { 
        categoryMap, 
        totalMonthlyBudget, 
        totalSpentThisMonth,
        transactions: allTransactions 
    } = useApp();

    useEffect(() => {
        if (!isOpen) return;

        document.body.classList.add('modal-open');
        const timer = setTimeout(() => {
            onClose();
        }, 8000); // Auto-close after 8 seconds

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.classList.remove('modal-open');
            clearTimeout(timer);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    const firstTransaction = newTransactions.length > 0 ? newTransactions[0] : null;
    const category = firstTransaction ? categoryMap.get(firstTransaction.categoryId) : null;
    const hasCategoryBudget = !!(category?.budget && category.budget > 0);

    const categoryBudgetStats = useMemo(() => {
        if (!hasCategoryBudget || !category) return null;

        const monthInterval = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
        
        const allCategoryTransactionsInMonth = allTransactions
            .filter(t => t.categoryId === category.id && isWithinInterval(parseISO(t.date), monthInterval));
            
        const categorySpentAfter = allCategoryTransactionsInMonth.reduce((sum, t) => sum + t.amount, 0);
        const newAmountInThisConfirmation = newTransactions.reduce((sum, t) => sum + t.amount, 0);
        const categorySpentBefore = categorySpentAfter - newAmountInThisConfirmation;

        const percentageAfter = (categorySpentAfter / category.budget!) * 100;
        const percentageBefore = (categorySpentBefore / category.budget!) * 100;

        return {
            budget: category.budget!,
            spentAfter: categorySpentAfter,
            percentageAfter,
            percentageBefore,
            color: category.color,
            name: category.name,
        };
    }, [hasCategoryBudget, category, allTransactions, newTransactions]);

    if (!isOpen || newTransactions.length === 0) return null;
    
    const totalPercentageBefore = totalMonthlyBudget > 0 ? (totalSpentBefore / totalMonthlyBudget) * 100 : 0;
    const totalPercentageAfter = totalMonthlyBudget > 0 ? (totalSpentThisMonth / totalMonthlyBudget) * 100 : 0;

    const getBarColor = (percentage: number, defaultColor = COLOR_SUCCESS) => {
        if (percentage > 100) return COLOR_DANGER;
        if (percentage > 85) return COLOR_WARNING;
        return defaultColor;
    };
    
    const checkAnimation = {
        initial: { scale: 0 },
        animate: { scale: 1 },
        transition: { delay: 0.2, type: 'spring' as const, stiffness: 260, damping: 20 },
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end md:items-center z-50 p-4"
            onClick={onClose}
            variants={modalBackdropAnimation}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <motion.div
                className="bg-slate-800 rounded-t-2xl md:rounded-2xl w-full max-w-md shadow-2xl border-t md:border border-slate-700 flex flex-col items-center text-center p-8"
                onClick={e => e.stopPropagation()}
                variants={modalSlideDownAnimation}
            >
                <motion.div
                    {...checkAnimation}
                >
                    <CheckCircle2 className="h-16 w-16 text-green-400 mb-4" />
                </motion.div>
                
                 <h2 className="text-2xl font-bold text-white mb-2">
                    {newTransactions.length > 1 ? `${newTransactions.length} Ausgaben hinzugefügt!` : 'Ausgabe hinzugefügt!'}
                </h2>
                
                <div className="bg-slate-700/50 p-4 rounded-lg my-6 w-full max-h-48 overflow-y-auto space-y-3">
                    {newTransactions.map(transaction => {
                        const currentCategory = categoryMap.get(transaction.categoryId);
                        const Icon = getIconComponent(transaction.iconOverride || currentCategory?.icon);
                        const color = currentCategory ? currentCategory.color : '#64748b';
                        
                        return (
                            <div key={transaction.id} className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
                                    <Icon className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <p className="font-medium text-white truncate">{transaction.description}</p>
                                    <p className="text-sm text-slate-400">{currentCategory?.name}</p>
                                </div>
                                <p className="font-bold text-white text-lg">{formatCurrency(transaction.amount)}</p>
                            </div>
                        );
                    })}
                </div>
                
                <div className="w-full space-y-4">
                    {/* Category Budget Section */}
                    {hasCategoryBudget && categoryBudgetStats && (
                        <div>
                            <h3 className="text-sm font-semibold text-slate-300 text-left mb-2">
                                Budget: <span style={{ color: categoryBudgetStats.color }}>{categoryBudgetStats.name}</span>
                            </h3>
                            <div className="flex justify-between items-baseline text-sm mb-1">
                                <p className="text-slate-300">
                                    <span className="font-semibold text-white">{formatCurrency(categoryBudgetStats.spentAfter)}</span>
                                    <span className="text-slate-500"> / {formatCurrency(categoryBudgetStats.budget)}</span>
                                </p>
                                <p className="font-semibold" style={{color: getBarColor(categoryBudgetStats.percentageAfter, categoryBudgetStats.color)}}>
                                    {categoryBudgetStats.percentageAfter.toFixed(0)}%
                                </p>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                <motion.div
                                    className="h-2.5 rounded-full"
                                    style={{ backgroundColor: getBarColor(categoryBudgetStats.percentageAfter, categoryBudgetStats.color) }}
                                    variants={barAnimation(categoryBudgetStats.percentageBefore, categoryBudgetStats.percentageAfter)}
                                    initial="initial"
                                    animate="animate"
                                />
                            </div>
                        </div>
                    )}
                    
                    {/* Total Budget Section */}
                    {totalMonthlyBudget > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-slate-300 text-left mb-2">Gesamtbudget</h3>
                            <div className="flex justify-between items-baseline text-sm mb-1">
                                <p className="text-slate-300">
                                    <span className="font-semibold text-white">{formatCurrency(totalSpentThisMonth)}</span>
                                    <span className="text-slate-500"> / {formatCurrency(totalMonthlyBudget)}</span>
                                </p>
                                <p className="font-semibold" style={{color: getBarColor(totalPercentageAfter)}}>{totalPercentageAfter.toFixed(0)}%</p>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                <motion.div
                                    className="h-2.5 rounded-full"
                                    style={{ backgroundColor: getBarColor(totalPercentageAfter) }}
                                    variants={barAnimation(totalPercentageBefore, totalPercentageAfter)}
                                    initial="initial"
                                    animate="animate"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ConfirmationModal;