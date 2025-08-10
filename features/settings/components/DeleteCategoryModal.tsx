import React, { useState, useMemo, FC } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { Category } from '@/shared/types';
import { Modal, Button, ChevronDown } from '@/shared/ui';
import { toast } from 'react-hot-toast';
import type { CategoryFormData } from './CategoryEditModal';

interface DeleteCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    category: CategoryFormData;
    transactionCount: number;
}

export const DeleteCategoryModal: FC<DeleteCategoryModalProps> = ({ isOpen, onClose, category, transactionCount }) => {
    const { categories, groups, handleReassignAndDeleteCategory } = useApp();
    const [targetCategoryId, setTargetCategoryId] = useState<string>('');

    const selectableCategories = useMemo(() => {
        return categories
            .filter(c => c.id !== category.id)
            .sort((a, b) => {
                // Prioritize categories from the same group
                if (a.groupId === category.groupId && b.groupId !== category.groupId) return -1;
                if (a.groupId !== category.groupId && b.groupId === category.groupId) return 1;
                // Then sort by group, then by name
                const groupA = groups.find(g => g.id === a.groupId)?.name || '';
                const groupB = groups.find(g => g.id === b.groupId)?.name || '';
                if (groupA < groupB) return -1;
                if (groupA > groupB) return 1;
                return a.name.localeCompare(b.name);
            });
    }, [categories, category.id, category.groupId, groups]);
    
    const handleConfirm = () => {
        if (!targetCategoryId) {
            toast.error('Bitte wählen Sie eine Ziel-Kategorie aus.');
            return;
        }
        handleReassignAndDeleteCategory(category.id, targetCategoryId);
        onClose();
    };

    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={!targetCategoryId}>
                Löschen & Zuordnen
            </Button>
        </div>
    );
    
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Kategorie "${category.name}" löschen`}
            footer={footer}
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-300">
                    Es gibt <span className="font-bold text-white">{transactionCount}</span> Transaktion(en) in dieser Kategorie.
                    Bitte wählen Sie eine neue Kategorie aus, der diese Einträge zugeordnet werden sollen.
                </p>
                <div>
                    <label htmlFor="target-category" className="text-xs text-slate-400">Neue Kategorie</label>
                    <div className="relative">
                        <select 
                            id="target-category" 
                            value={targetCategoryId} 
                            onChange={e => setTargetCategoryId(e.target.value)} 
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 appearance-none pr-10"
                        >
                            <option value="" disabled>Bitte wählen...</option>
                            {selectableCategories.map(c => (
                                <option key={c.id} value={c.id} className="bg-slate-800 text-white">
                                    {groups.find(g => g.id === c.groupId)?.name} / {c.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>
        </Modal>
    );
};