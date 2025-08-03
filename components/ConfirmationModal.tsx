
import React, { useEffect } from 'react';
import type { FC } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import type { Transaction, Category } from '../types';
import { formatCurrency } from '../utils/dateUtils';
import { iconMap, CheckCircle2 } from './Icons';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction;
    totalSpentBefore: number;
}

const ConfirmationModal: FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    transaction,
    totalSpentBefore,
}) => {
    const { categoryMap, totalMonthlyBudget, totalSpentThisMonth } = useApp();

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000); // Auto-close after 5 seconds

            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    onClose();
                }
            };
            window.addEventListener('keydown', handleKeyDown);

            return () => {
                clearTimeout(timer);
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;
    
    const category = categoryMap.get(transaction.categoryId);
    const Icon = category ? iconMap[category.icon] || iconMap.MoreHorizontal : iconMap.MoreHorizontal;
    const color = category ? category.color : '#64748b';

    const percentageBefore = totalMonthlyBudget > 0 ? (totalSpentBefore / totalMonthlyBudget) * 100 : 0;
    const percentageAfter = totalMonthlyBudget > 0 ? (totalSpentThisMonth / totalMonthlyBudget) * 100 : 0;

    const getTotalBarColor = (percentage: number) => {
        if (percentage > 100) return '#ef4444'; // red-500
        if (percentage > 85) return '#f97316'; // orange-500
        return '#22c55e'; // green-500
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end md:items-center z-50 p-4"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="bg-slate-800 rounded-t-2xl md:rounded-2xl w-full max-w-md shadow-2xl border-t md:border border-slate-700 flex flex-col items-center text-center p-8"
                onClick={e => e.stopPropagation()}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: 'spring', bounce: 0.4, duration: 0.5 }}
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
                >
                    <CheckCircle2 className="h-16 w-16 text-green-400 mb-4" />
                </motion.div>
                
                <h2 className="text-2xl font-bold text-white mb-2">Ausgabe hinzugefügt!</h2>
                
                <div className="bg-slate-700/50 p-4 rounded-lg my-6 w-full flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
                        <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-white truncate">{transaction.description}</p>
                        <p className="text-sm text-slate-400">{category?.name}</p>
                    </div>
                    <p className="font-bold text-white text-lg">{formatCurrency(transaction.amount)}</p>
                </div>
                
                {totalMonthlyBudget > 0 && (
                    <div className="w-full space-y-3">
                        <h3 className="text-sm font-semibold text-slate-300">Budget-Auswirkung</h3>
                        <div className="flex justify-between items-baseline text-sm">
                             <p className="text-slate-300">
                                <span className="font-semibold text-white">{formatCurrency(totalSpentThisMonth)}</span>
                                <span className="text-slate-500"> / {formatCurrency(totalMonthlyBudget)}</span>
                            </p>
                            <p className="font-semibold" style={{color: getTotalBarColor(percentageAfter)}}>{percentageAfter.toFixed(0)}%</p>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                             <motion.div
                                className="h-2.5 rounded-full"
                                style={{ backgroundColor: getTotalBarColor(percentageAfter) }}
                                initial={{ width: `${Math.min(percentageBefore, 100)}%` }}
                                animate={{ width: `${Math.min(percentageAfter, 100)}%` }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                            />
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

export default ConfirmationModal;
