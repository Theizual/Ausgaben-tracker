import React, { useState, useMemo, FC, useEffect } from 'react';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { iconMap, Search } from '@/shared/ui';
import { iconGroups } from '@/shared/config/icon-groups';
import { clsx } from 'clsx';

const TABS = Object.keys(iconGroups);

export const IconPicker: FC<{ onSelect: (iconName: string) => void; onClose: () => void; }> = ({ onSelect, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState(TABS[0]);
    
    const availableIcons = useMemo(() => Object.keys(iconMap).sort(), []);
    
    const filteredIcons = useMemo(() => 
        availableIcons.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase())), 
        [availableIcons, searchTerm]
    );
    
    const iconsForTab = useMemo(() => 
        (iconGroups[activeTab as keyof typeof iconGroups] || []).sort(),
        [activeTab]
    );

    useEscapeKey(onClose);

    useEffect(() => {
        document.body.classList.add('modal-open');
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, []);

    const renderGrid = (icons: string[]) => {
        if (icons.length === 0) {
            return <p className="col-span-full text-center text-slate-500 py-8">Keine Icons gefunden.</p>;
        }
        return icons.map(iconName => {
            const IconComponent = iconMap[iconName];
            return (
                <button key={iconName} onClick={() => onSelect(iconName)} className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-slate-700 aspect-square" title={iconName}>
                    <IconComponent className="h-6 w-6 text-slate-300" />
                    <span className="text-xs text-slate-500 truncate w-full text-center">{iconName}</span>
                </button>
            );
        });
    };

    const hasSearchTerm = searchTerm.trim().length > 0;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[70] p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-700 flex-shrink-0">
                     <div className="flex items-center bg-slate-700 border border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-rose-500 px-3">
                        <Search className="h-4 w-4 text-slate-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Alle Icons durchsuchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent border-none pl-2 py-2 text-white placeholder-slate-500 focus:outline-none"
                            autoFocus
                        />
                    </div>
                </header>
                {!hasSearchTerm && (
                    <nav className="flex-shrink-0 border-b border-slate-700 overflow-x-auto custom-scrollbar">
                        <div className="flex space-x-2 p-2">
                            {TABS.map(tab => (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={clsx(
                                        'px-3 py-1.5 text-sm font-semibold rounded-full transition-colors whitespace-nowrap',
                                        activeTab === tab ? 'bg-rose-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'
                                    )}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </nav>
                )}
                <main className="p-4 overflow-y-auto custom-scrollbar grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2">
                    {hasSearchTerm ? renderGrid(filteredIcons) : renderGrid(iconsForTab)}
                </main>
            </div>
        </div>
    );
};
