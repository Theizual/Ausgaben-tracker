
import React, { useState, useMemo, FC } from 'react';
import type { Tag } from '@/shared/types';
import { Modal, Search, Button, TagPill } from '../../../components/ui';

export const AllTagsModal: FC<{
    allTags: Tag[];
    selectedTagIds: string[];
    onTagClick: (tagId: string) => void;
    onClose: () => void;
}> = ({ allTags, selectedTagIds, onTagClick, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredTags = useMemo(() => 
        allTags
            .filter(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a,b) => a.name.localeCompare(b.name)),
        [allTags, searchTerm]
    );

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Weitere Tags auswählen"
            size="md"
            footer={
                <div className="text-right">
                    <Button onClick={onClose}>Schließen</Button>
                </div>
            }
        >
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Tags suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md pl-8 pr-3 py-1.5 text-white placeholder-slate-500 text-sm"
                    autoFocus
                />
            </div>
            <div className="flex flex-wrap gap-2">
                 {filteredTags.map(tag => (
                     <TagPill
                        key={tag.id}
                        tagName={tag.name}
                        selected={selectedTagIds.includes(tag.id)}
                        onClick={() => onTagClick(tag.id)}
                    />
                ))}
                {filteredTags.length === 0 && <p className="text-slate-500 text-center w-full">Keine passenden Tags gefunden.</p>}
            </div>
        </Modal>
    );
};
