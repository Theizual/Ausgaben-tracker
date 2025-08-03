import React from 'react';
import type { FC } from 'react';

const AvailableTags: FC<{
    availableTags: string[];
    selectedTags: string[];
    onTagClick: (tag: string) => void;
}> = ({ availableTags, selectedTags, onTagClick }) => {
    if (availableTags.length === 0) return null;

    return (
        <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Schnellauswahl Tags</h5>
            <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => onTagClick(tag)}
                            className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                                isSelected 
                                    ? 'bg-rose-500 text-white' 
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                        >
                            #{tag}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}

export default AvailableTags;
