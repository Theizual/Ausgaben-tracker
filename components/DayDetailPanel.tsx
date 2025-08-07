import React, { FC, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import type { Transaction } from '../types';
import { format, parseISO } from '../utils/dateUtils';
import { formatCurrency, formatGermanDate } from '../utils/dateUtils';
import { X } from './Icons';
import StandardTransactionItem from './StandardTransactionItem';

const MotionDiv = motion('div');

interface DayDetailPanelProps {
    isOpen: boolean;
    date: Date | null;
    transactions: Transaction[];
    onClose: () => void;
}

const DayDetailPanel: FC<DayDetailPanelProps> = ({ isOpen, date, transactions, onClose }) => {
    const { handleTransactionClick } = useApp();
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
                    <div className="space-y-1">
                        {transactions.map(t => (
                            <StandardTransactionItem
                                key={t.id}
                                transaction={t}
                                onClick={() => handleTransactionClick(t)}
                                showSublineInList="category"
                            />
                        ))}
                    </div>
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