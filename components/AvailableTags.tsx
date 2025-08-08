

import React from 'react';
import type { FC } from 'react';
import type { Tag } from '@/shared/types';
import { TagPill } from '@/shared/ui';

const AvailableTags: FC<{
    availableTags: Tag[];
    selectedTags: string[];
    onTagClick: (tag: string) => void;
}> = ({ availableTags, selectedTags, onTagClick }) => {
    if (availableTags.length === 0) return null;

    return (
        <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Schnellauswahl Tags</h5>
            <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                    <TagPill
                        key={tag.id}
                        tagName={tag.name}
                        selected={selectedTags.includes(tag.name)}
                        onClick={() => onTagClick(tag.name)}
                    />
                ))}
            </div>
        </div>
    );
}

export default AvailableTags;