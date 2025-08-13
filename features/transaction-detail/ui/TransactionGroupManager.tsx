import React, { FC, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { Transaction } from '@/shared/types';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { Button, Users, getIconComponent, RefreshCw, Edit, Badge } from '@/shared/ui';
import { TransactionGroupSelectorModal } from './TransactionGroupSelectorModal';

interface TransactionGroupManagerProps {
    transaction: Transaction;
    onNavigate: (transaction: Transaction) => void;
}

export const TransactionGroupManager: FC<TransactionGroupManagerProps> = ({ transaction, onNavigate }) => {
    const {
        transactions: allTransactions,
        transactionGroups,
        categoryMap,
        createTransactionGroup,
        addTransactionsToGroup,
        removeTransactionFromGroup,
        resetCorrectionInGroup,
    } = useApp();

    const [isSelectorOpen, setSelectorOpen] = useState(false);

    const { group, members } = useMemo(() => {
        if (!transaction.transactionGroupId) {
            return { group: null, members: [] };
        }
        const group = transactionGroups.find(g => g.id === transaction.transactionGroupId);
        const members = allTransactions.filter(t => t.transactionGroupId === transaction.transactionGroupId);
        return { group, members };
    }, [transaction.transactionGroupId, transactionGroups, allTransactions]);

    if (!group) {
        return (
            <div className="w-full max-w-sm mt-4 pt-4 border-t border-slate-700/50">
                <Button variant="secondary" size="sm" onClick={() => setSelectorOpen(true)}>
                    <Users className="h-4 w-4" />
                    Transaktion gruppieren
                </Button>
                <AnimatePresence>
                    {isSelectorOpen && (
                        <TransactionGroupSelectorModal
                            activeTransaction={transaction}
                            onClose={() => setSelectorOpen(false)}
                            onSave={(selectedIds) => {
                                createTransactionGroup([transaction.id, ...selectedIds]);
                                setSelectorOpen(false);
                            }}
                        />
                    )}
                </AnimatePresence>
            </div>
        );
    }

    const handleSaveSelection = (selectedIds: string[]) => {
        const initialMemberIds = new Set(members.map(m => m.id));
        const finalMemberIds = new Set([transaction.id, ...selectedIds]);

        const toAdd = [...finalMemberIds].filter(id => !initialMemberIds.has(id));
        const toRemove = [...initialMemberIds].filter(id => !finalMemberIds.has(id));

        if (toAdd.length > 0) {
            addTransactionsToGroup(group.id, toAdd);
        }
        toRemove.forEach(id => removeTransactionFromGroup(id));

        setSelectorOpen(false);
    };

    const totalAmount = members.reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="w-full max-w-sm mt-4 pt-4 border-t border-slate-700/50">
            <div className="flex justify-between items-baseline mb-3">
                <div className='flex items-center gap-2'>
                    <h3 className="text-sm font-semibold text-white">Transaktionsgruppe ({members.length})</h3>
                    <Button variant="ghost" size="icon-xs" onClick={() => setSelectorOpen(true)}>
                        <Edit className="h-3 w-3" />
                    </Button>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-white" title={`Aktuelle Summe: ${formatCurrency(totalAmount)}`}>{formatCurrency(group.targetAmount)}</p>
                    <p className="text-xs text-slate-400">Soll-Betrag</p>
                </div>
            </div>
            <div className="space-y-2">
                {members.map(t => {
                    const cat = categoryMap.get(t.categoryId);
                    const isCurrent = t.id === transaction.id;
                    const TIcon = getIconComponent(t.iconOverride || cat?.icon);
                    const tColor = cat ? cat.color : '#64748b';

                    return (
                        <button
                            key={t.id}
                            onClick={() => !isCurrent && onNavigate(t)}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${isCurrent ? 'bg-slate-700/50 cursor-default' : 'hover:bg-slate-700'}`}
                        >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tColor }}>
                                <TIcon className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-sm text-white truncate">{t.description}</p>
                                {t.isCorrected && <Badge color="amber">Korrigiert</Badge>}
                            </div>
                            <div className='flex items-center gap-2'>
                                {t.isCorrected && (
                                    <Button variant="ghost" size="icon-xs" onClick={() => resetCorrectionInGroup(t.id)} title="Korrektur zurücksetzen">
                                        <RefreshCw className="h-3 w-3" />
                                    </Button>
                                )}
                                <p className="font-semibold text-sm text-white w-20 text-right">{formatCurrency(t.amount)}</p>
                            </div>
                        </button>
                    );
                })}
            </div>
             <AnimatePresence>
                {isSelectorOpen && (
                    <TransactionGroupSelectorModal
                        activeTransaction={transaction}
                        initialSelection={members.map(m => m.id)}
                        onClose={() => setSelectorOpen(false)}
                        onSave={handleSaveSelection}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
