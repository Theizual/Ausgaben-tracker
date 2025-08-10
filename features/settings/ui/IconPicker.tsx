

import React, { useState, useMemo, FC } from 'react';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { iconMap, Search } from '@/shared/ui';

export const IconPicker: FC<{ onSelect: (iconName: string) => void; onClose: () => void; }> = ({ onSelect, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const availableIcons = useMemo(() => Object.keys(iconMap).sort(), []);
    const filteredIcons = useMemo(() => availableIcons.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase())), [availableIcons, searchTerm]);

    useEscapeKey(onClose);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[70] p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-700 flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-700 flex-shrink-0">
                     <div className="flex items-center bg-slate-700 border border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-rose-500 px-3">
                        <Search className="h-4 w-4 text-slate-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Icon suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent border-none pl-2 py-2 text-white placeholder-slate-500 focus:outline-none"
                            autoFocus
                        />
                    </div>
                </header>
                <main className="p-4 overflow-y-auto custom-scrollbar grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-2">
                    {filteredIcons.map(iconName => {
                        const IconComponent = iconMap[iconName];
                        return (
                            <button key={iconName} onClick={() => onSelect(iconName)} className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-slate-700 aspect-square" title={iconName}>
                                <IconComponent className="h-6 w-6 text-slate-300" />
                                <span className="text-xs text-slate-500 truncate w-full text-center">{iconName}</span>
                            </button>
                        );
                    })}
                </main>
            </div>
        </div>
    );
};