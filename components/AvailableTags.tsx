import React from 'react';
import type { FC } from 'react';
import type { Tag } from '../types';

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
                {availableTags.map(tag => {
                    const isSelected = selectedTags.includes(tag.name);
                    return (
                        <button
                            key={tag.id}
                            type="button"
                            onClick={() => onTagClick(tag.name)}
                            className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                                isSelected 
                                    ? 'bg-rose-500 text-white' 
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                        >
                            #{tag.name}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}

export default AvailableTags;