import React, { useState } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Tag, X } from './Icons';
import type { Tag as TagType } from '../types';

const TagInput: FC<{
    tags: string[];
    setTags: (tags: string[]) => void;
    allAvailableTags: TagType[];
}> = ({ tags, setTags, allAvailableTags }) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const suggestionTagNames = allAvailableTags.map(t => t.name);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);

        if (value.trim() && suggestionTagNames.length > 0) {
            const filteredSuggestions = suggestionTagNames
                .filter(tag => 
                    tag.toLowerCase().includes(value.toLowerCase()) && !tags.includes(tag)
                )
                .slice(0, 10);
            setSuggestions(filteredSuggestions);
        } else {
            setSuggestions([]);
        }
    };
    
    const addTag = (tag: string) => {
        const newTag = tag.trim().replace(/^#/, '');
        if (newTag && !tags.includes(newTag)) {
            setTags([...tags, newTag]);
        }
        setInputValue('');
        setSuggestions([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue) {
            e.preventDefault();
            setTags(tags.slice(0, -1));
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className="relative">
            <div className="flex flex-wrap items-center gap-2 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-rose-500">
                <Tag className="h-5 w-5 text-slate-400 shrink-0" />
                <AnimatePresence>
                    {tags.map(tag => (
                        <motion.span
                            layout
                            key={tag}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-1.5 bg-rose-500/20 text-rose-300 text-sm font-medium pl-2.5 pr-1 py-0.5 rounded-full"
                        >
                           #{tag}
                            <button type="button" onClick={() => removeTag(tag)} className="bg-rose-500/30 hover:bg-rose-500/50 rounded-full p-0.5">
                                <X className="h-3 w-3" />
                            </button>
                        </motion.span>
                    ))}
                </AnimatePresence>
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleInputChange}
                    onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                    placeholder={tags.length === 0 ? "Tags hinzufügen..." : ""}
                    className="bg-transparent text-white placeholder-slate-500 flex-grow focus:outline-none text-sm min-w-[100px]"
                />
            </div>
            <AnimatePresence>
                {suggestions.length > 0 && (
                    <motion.ul 
                        initial={{ opacity: 0, y: -5 }} 
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute z-20 top-full mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-y-auto max-h-48"
                    >
                        {suggestions.map(suggestion => (
                            <li 
                                key={suggestion} 
                                onMouseDown={(e) => { e.preventDefault(); addTag(suggestion); }}
                                className="px-4 py-2 text-sm text-white hover:bg-rose-500/20 cursor-pointer"
                            >
                                #{suggestion}
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TagInput;
