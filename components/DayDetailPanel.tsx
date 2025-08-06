import React, { FC, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import type { Transaction } from '../types';
import { format, parseISO } from '../utils/dateUtils';
import { formatCurrency, formatGermanDate } from '../utils/dateUtils';
import { iconMap, X, Edit, Trash2 } from './Icons';

const MotionDiv = motion('div');

interface DayDetailPanelProps {
    isOpen: boolean;
    date: Date | null;
    transactions: Transaction[];
    onClose: () => void;
}

const DayDetailPanel: FC<DayDetailPanelProps> = ({ isOpen, date, transactions, onClose }) => {
    const { categoryMap, handleTransactionClick, deleteTransaction } = useApp();
    const panelRef = useRef<HTMLDivElement>(null);

    const dailyTotal = useMemo(() => transactions.reduce((sum, t) => sum + t.amount, 0), [transactions]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        // Auto-focus the close button for accessibility
        const closeButton = panelRef.current?.querySelector('button[aria-label="Schliessen"]');
        if (closeButton instanceof HTMLElement) {
            closeButton.focus();
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);
    
    if (!isOpen || !date) {
        return null;
    }

    return (
        <MotionDiv
            ref={panelRef}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-slate-800 rounded-2xl border border-slate-700 flex flex-col h-full"
            role="region"
            aria-labelledby="day-detail-title"
            tabIndex={-1}
        >
            {/* Header */}
            <header className="p-6 border-b border-slate-700 flex-shrink-0">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 id="day-detail-title" className="text-xl font-bold text-white">{formatGermanDate(date)}</h2>
                        <p className="text-sm text-slate-400 mt-1">Tagesgesamtausgaben</p>
                        <p className="text-3xl font-bold text-white mt-1">{formatCurrency(dailyTotal)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 -m-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white" aria-label="Schliessen">
                        <X className="h-6 w-6" />
                    </button>
                </div>
            </header>

            {/* Transaction List */}
            <main className="flex-grow p-4 overflow-y-auto custom-scrollbar">
                {transactions.length > 0 ? (
                    <ul className="space-y-2">
                        {transactions.map(t => {
                            const category = categoryMap.get(t.categoryId);
                            if (!category) return null;
                            const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
                            return (
                                <li key={t.id} className="group bg-slate-800/50 rounded-lg p-3 flex items-center gap-3">
                                    <button onClick={() => handleTransactionClick(t, 'view')} className="flex items-center gap-4 flex-grow min-w-0 text-left">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: category.color }}>
                                            <Icon className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-white truncate">{t.description}</p>
                                            <p className="text-xs text-slate-400">{category.name} &middot; {format(parseISO(t.date), 'HH:mm')} Uhr</p>
                                        </div>
                                        <p className="font-semibold text-white text-lg flex-shrink-0 pl-2">{formatCurrency(t.amount)}</p>
                                    </button>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button onClick={() => handleTransactionClick(t, 'edit')} className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white" aria-label="Bearbeiten"><Edit className="h-4 w-4" /></button>
                                         <button onClick={() => { if(window.confirm(`Löschen: "${t.description}"?`)) deleteTransaction(t.id) }} className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-red-400" aria-label="Löschen"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-10">
                        <p>Keine Ausgaben an diesem Tag erfasst.</p>
                    </div>
                )}
            </main>
        </MotionDiv>
    );
};

export default DayDetailPanel;