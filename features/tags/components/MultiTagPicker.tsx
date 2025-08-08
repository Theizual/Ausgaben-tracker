
import React, { useState, useMemo, FC } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Tag } from '@/shared/types';
import { Plus, TagPill } from '../../../components/ui';
import { AllTagsModal } from './AllTagsModal';

export const MultiTagPicker: FC<{
    allTags: Tag[];
    recentTags: Tag[];
    selectedTagIds: string[];
    onSelectionChange: (ids: string[]) => void;
}> = ({ allTags, recentTags, selectedTagIds, onSelectionChange }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleTagClick = (tagId: string) => {
        const newSelection = selectedTagIds.includes(tagId)
            ? selectedTagIds.filter(id => id !== tagId)
            : [...selectedTagIds, tagId];
        onSelectionChange(newSelection);
    };

    const otherTags = useMemo(() => {
        const recentTagIds = new Set(recentTags.map(t => t.id));
        return allTags.filter(tag => !recentTagIds.has(tag.id));
    }, [allTags, recentTags]);

    return (
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                Tags zur Analyse auswählen
            </h4>
            <div className="flex flex-wrap gap-2">
                {recentTags.map(tag => (
                    <TagPill
                        key={tag.id}
                        tagName={tag.name}
                        selected={selectedTagIds.includes(tag.id)}
                        onClick={() => handleTagClick(tag.id)}
                        size="md"
                    />
                ))}
                {otherTags.length > 0 && (
                     <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-3 py-1.5 text-sm font-semibold rounded-full transition-colors bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center gap-1.5"
                    >
                        <Plus className="h-4 w-4" />
                        Weitere
                    </button>
                )}
            </div>
            
            <AnimatePresence>
                {isModalOpen && (
                    <AllTagsModal
                        allTags={otherTags}
                        selectedTagIds={selectedTagIds}
                        onTagClick={handleTagClick}
                        onClose={() => setIsModalOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
