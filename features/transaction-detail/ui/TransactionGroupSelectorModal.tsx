import React, { FC, useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Modal, Button, StandardTransactionItem, Search } from '@/shared/ui';
import { subDays, parseISO } from 'date-fns';

interface TransactionGroupSelectorModalProps {
    activeTransaction: { id: string };
    initialSelection?: string[];
    onClose: () => void;
    onSave: (selectedIds: string[]) => void;
}

export const TransactionGroupSelectorModal: FC<TransactionGroupSelectorModalProps> = ({
    activeTransaction,
    initialSelection = [],
    onClose,
    onSave,
}) => {
    const { transactions: allTransactions, handleTransactionClick } = useApp();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(initialSelection.filter(id => id !== activeTransaction.id)));
    const [searchTerm, setSearchTerm] = useState('');

    const candidateTransactions = useMemo(() => {
        const thirtyDaysAgo = subDays(new Date(), 30);
        return allTransactions
            .filter(t => 
                !t.isDeleted &&
                (t.id === activeTransaction.id || !t.transactionGroupId) &&
                parseISO(t.date) > thirtyDaysAgo &&
                t.description.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }, [allTransactions, activeTransaction.id, searchTerm]);

    const handleToggle = (id: string) => {
        if (id === activeTransaction.id) return; // Cannot deselect the active transaction
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

    const handleSave = () => {
        onSave(Array.from(selectedIds));
    };

    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
            <Button onClick={handleSave}>Speichern ({selectedIds.size + 1})</Button>
        </div>
    );
    
    return (
        <Modal
            isOpen
            onClose={onClose}
            title="Transaktionen gruppieren"
            footer={footer}
            size="2xl"
        >
            <div className="space-y-4">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Transaktionen durchsuchen..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md pl-8 pr-3 py-1.5 text-white placeholder-slate-500 text-sm"
                    />
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar -mr-3 pr-3 space-y-1">
                    {candidateTransactions.map(t => {
                        const isSelected = t.id === activeTransaction.id || selectedIds.has(t.id);
                        return (
                            <div key={t.id} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggle(t.id)}
                                    disabled={t.id === activeTransaction.id}
                                    className="w-5 h-5 rounded text-rose-500 bg-slate-600 border-slate-500 focus:ring-rose-500 shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <div className="flex-grow">
                                    <StandardTransactionItem
                                        transaction={t}
                                        onClick={handleTransactionClick}
                                        density="compact"
                                        showSublineInList="date"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
};
