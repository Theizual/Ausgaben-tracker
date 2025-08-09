import React, { useState, useMemo, FC } from 'react';
import type { Tag } from '@/shared/types';
import { useApp } from '@/contexts/AppContext';
import { Modal, Button, TagInput, AvailableTags } from '@/shared/ui';

export const TagEditorModal: FC<{
    initialTagNames: string[];
    onSave: (newTagNames: string[]) => void;
    onClose: () => void;
}> = ({ initialTagNames, onSave, onClose }) => {
    const { allAvailableTags } = useApp();
    const [currentTags, setCurrentTags] = useState<string[]>(initialTagNames);

    const handleSave = () => {
        onSave(currentTags);
    };

    const recentlyUsedTags = useMemo(() => {
        // A simple sort by name might be good here
        return [...allAvailableTags].sort((a,b) => a.name.localeCompare(b.name)).slice(0, 15);
    }, [allAvailableTags]);

    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
            <Button onClick={handleSave}>Speichern</Button>
        </div>
    );
    
    const handleTagClick = (tag: string) => {
        setCurrentTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    return (
        <Modal 
            isOpen={true} 
            onClose={onClose} 
            title="Tags bearbeiten" 
            footer={footer}
        >
           <div className="space-y-4">
                <TagInput
                    tags={currentTags}
                    setTags={setCurrentTags}
                    allAvailableTags={allAvailableTags}
                />
                <AvailableTags
                    availableTags={recentlyUsedTags}
                    selectedTags={currentTags}
                    onTagClick={handleTagClick}
                />
            </div>
        </Modal>
    );
};
