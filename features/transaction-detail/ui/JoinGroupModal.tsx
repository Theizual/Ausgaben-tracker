import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Modal, Button, Link, PlusCircle } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils/dateUtils';

interface JoinGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onJoinGroup: (groupId: string) => void;
    onCreateGroup: () => void;
    sourceTransactionId: string;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({ isOpen, onClose, onJoinGroup, onCreateGroup, sourceTransactionId }) => {
    const { transactionGroups, transactions } = useApp();

    const handleCreateClick = () => {
        onClose();
        onCreateGroup();
    };

    const handleJoinClick = (groupId: string) => {
        onClose();
        onJoinGroup(groupId);
    };
    
    const sourceTx = transactions.find(t => t.id === sourceTransactionId);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Transaktion verknüpfen"
            footer={
                <div className="flex justify-between items-center w-full">
                    <Button variant="secondary" onClick={handleCreateClick}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Neue Gruppe erstellen...
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                        Schließen
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-300">
                    Möchtest du "{sourceTx?.description}" einer bestehenden Gruppe hinzufügen oder eine neue Gruppe erstellen?
                </p>

                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Bestehende Gruppen</h4>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-2 -mr-2">
                        {transactionGroups.length > 0 ? transactionGroups.map(group => {
                            const txsInGroup = transactions.filter(t => t.transactionGroupId === group.id);
                            if (txsInGroup.length === 0) return null;
                            const firstTx = txsInGroup.sort((a,b) => a.createdAt.localeCompare(b.createdAt))[0];
                            return (
                                <button
                                    key={group.id}
                                    onClick={() => handleJoinClick(group.id)}
                                    className="w-full flex items-center gap-3 p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-left"
                                >
                                    <Link className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-white truncate">Gruppe von "{firstTx.description}"</p>
                                        <p className="text-xs text-slate-400">{txsInGroup.length} Einträge</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-bold text-white text-sm">{formatCurrency(group.targetAmount)}</p>
                                    </div>
                                </button>
                            );
                        }) : (
                            <p className="text-sm text-slate-500 text-center py-4">Keine bestehenden Gruppen gefunden.</p>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
