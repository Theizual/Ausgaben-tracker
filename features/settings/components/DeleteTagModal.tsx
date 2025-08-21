import React, { useState, FC, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { Tag } from '@/shared/types';
import { Modal, Button, TagInput, AvailableTags } from '@/shared/ui';
import { toast } from 'react-hot-toast';

interface DeleteTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    tag: Tag;
    transactionCount: number;
}

export const DeleteTagModal: FC<DeleteTagModalProps> = ({ isOpen, onClose, tag, transactionCount }) => {
    const { handleReassignAndDeleteTag, handleDeleteTag, allAvailableTags, transactions } = useApp();
    const [targetTags, setTargetTags] = useState<string[]>([]);
    const [tagInputValue, setTagInputValue] = useState('');

     const recentlyUsedTags = useMemo(() => {
        const sortedTransactions = [...transactions].sort((a, b) => (b.date > a.date ? 1 : -1));
        const recentTagIds = new Set<string>();

        for (const transaction of sortedTransactions) {
            if (recentTagIds.size >= 6) break;
            if (transaction.tagIds) {
                for (const tagId of transaction.tagIds) {
                    if (tagId !== tag.id) {
                         if (recentTagIds.size >= 6) break;
                        recentTagIds.add(tagId);
                    }
                }
            }
        }
        
        const tagMap = new Map(allAvailableTags.map(t => [t.id, t]));
        return Array.from(recentTagIds).map(id => tagMap.get(id)).filter((t): t is Tag => !!t);
    }, [transactions, allAvailableTags, tag.id]);


    const handleReassign = () => {
        const finalTags = [...targetTags];
        const trimmedInput = tagInputValue.trim();
        if (trimmedInput && !finalTags.includes(trimmedInput)) {
            finalTags.push(trimmedInput);
        }
        if (finalTags.length === 0) {
            toast.error('Bitte geben Sie mindestens einen neuen Tag an oder wählen Sie "Nur Tag entfernen".');
            return;
        }
        handleReassignAndDeleteTag(tag.id, finalTags);
        onClose();
    };

    const handleDeleteOnly = () => {
        handleDeleteTag(tag.id);
        onClose();
    };
    
    const handleTagClick = (tagName: string) => {
        setTargetTags(prev => 
            prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
        );
    };

    const footer = (
        <div className="flex justify-between items-center w-full">
            <Button variant="destructive-ghost" onClick={handleDeleteOnly}>
                Nur Tag entfernen
            </Button>
            <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
                <Button variant="destructive" onClick={handleReassign}>
                    Löschen & Zuweisen
                </Button>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Tag "${tag.name}" löschen`}
            footer={footer}
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-300">
                    Es gibt <span className="font-bold text-white">{transactionCount}</span> Transaktion(en) mit diesem Tag.
                    Sie können diese Einträge einem oder mehreren neuen/bestehenden Tags zuordnen.
                </p>
                
                <div>
                    <label htmlFor="target-tag" className="text-xs text-slate-400 mb-1 block">Neuer Tag/Tags</label>
                    <TagInput
                        tags={targetTags}
                        setTags={setTargetTags}
                        inputValue={tagInputValue}
                        onInputChange={setTagInputValue}
                        allAvailableTags={allAvailableTags.filter(t => t.id !== tag.id)}
                    />
                     <div className="mt-2">
                        <AvailableTags 
                            availableTags={recentlyUsedTags}
                            selectedTags={targetTags}
                            onTagClick={handleTagClick}
                            size="sm"
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
};
