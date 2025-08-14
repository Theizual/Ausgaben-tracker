import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Modal, Button, StandardTransactionItem, Search, CheckSquare } from '@/shared/ui';
import type { Transaction } from '@/shared/types';
import { AnimatePresence, motion } from 'framer-motion';
import { parseISO } from 'date-fns';

interface TransactionGroupPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedIds: string[]) => void;
    sourceTransactionId: string;
    existingGroupId?: string;
}

export const TransactionGroupPickerModal: React.FC<TransactionGroupPickerModalProps> = ({ isOpen, onClose, onConfirm, sourceTransactionId, existingGroupId }) => {
    const { transactions } = useApp();
    const [selectedIds, setSelectedIds] = useState(new Set<string>());
    const [searchTerm, setSearchTerm] = useState('');

    const isAddingMode = !!existingGroupId;

    const eligibleTransactions = useMemo(() => {
        return transactions
            .filter(t => 
                !t.transactionGroupId && 
                t.id !== sourceTransactionId &&
                t.description.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a,b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()) // Sort by creation time desc
            .slice(0, 50); // Limit to recent 50 for performance
    }, [transactions, sourceTransactionId, searchTerm]);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleConfirm = () => {
        onConfirm(Array.from(selectedIds));
    };

    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
            <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
                {isAddingMode ? `Hinzufügen (${selectedIds.size})` : `Gruppe erstellen (${selectedIds.size + 1})`}
            </Button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isAddingMode ? "Transaktionen hinzufügen" : "Transaktionen zuordnen"} footer={footer}>
            <div className="space-y-4">
                 <div className="flex items-center bg-slate-700 border border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-rose-500 px-3">
                    <Search className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Transaktion suchen..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent border-none pl-2 py-2 text-white placeholder-slate-500 focus:outline-none"
                    />
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-1">
                    <AnimatePresence>
                        {eligibleTransactions.map(t => {
                            const isSelected = selectedIds.has(t.id);
                            return (
                                <motion.div
                                    key={t.id}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <button 
                                        onClick={() => toggleSelection(t.id)} 
                                        className={`w-full flex items-center gap-3 p-1 rounded-lg transition-colors ${isSelected ? 'bg-slate-600/50' : 'hover:bg-slate-700/50'}`}
                                    >
                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 flex-shrink-0 ${isSelected ? 'bg-rose-500 border-rose-400' : 'bg-slate-700 border-slate-600'}`}>
                                            {isSelected && <CheckSquare className="h-4 w-4 text-white" />}
                                        </div>
                                        <div className="flex-grow">
                                             <StandardTransactionItem
                                                transaction={t}
                                                onClick={() => {}} // No-op, parent button handles it
                                                density="compact"
                                                showSublineInList="date"
                                            />
                                        </div>
                                    </button>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                     {eligibleTransactions.length === 0 && (
                        <p className="text-center text-slate-500 py-4">Keine passenden Transaktionen gefunden.</p>
                     )}
                </div>
            </div>
        </Modal>
    )
};