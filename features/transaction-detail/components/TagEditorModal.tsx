import React, { useState, useMemo, FC } from 'react';
import type { Tag } from '@/shared/types';
import { useApp } from '@/contexts/AppContext';
import { Modal, Button } from '@/shared/ui';
import TagInput from '@/shared/ui/TagInput';
import AvailableTags from '@/shared/ui/AvailableTags';

export const TagEditorModal: FC<{
    initialTagNames: string[];
    onSave: (newTagNames: string[]) => void;
    onClose: () => void;
}> = ({ initialTagNames, onSave, onClose }) => {
    const { allAvailableTags } = useApp();
    const [currentTags, setCurrentTags] = useState<string[]>(initialTagNames);
    const [tagInputValue, setTagInputValue] = useState('');

    const handleSave = () => {
        const finalTags = [...currentTags];
        const trimmedInput = tagInputValue.trim();
        if (trimmedInput && !finalTags.includes(trimmedInput)) {
            finalTags.push(trimmedInput);
        }
        onSave(finalTags);
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
                    inputValue={tagInputValue}
                    onInputChange={setTagInputValue}
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
