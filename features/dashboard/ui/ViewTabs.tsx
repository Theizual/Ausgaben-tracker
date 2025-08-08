
import React, { FC } from 'react';
import type { ViewMode } from '@/shared/types';

export const ViewTabs: FC<{ viewMode: ViewMode; setViewMode: (mode: ViewMode) => void; }> = ({ viewMode, setViewMode }) => {
    const tabs: { id: ViewMode; label: string }[] = [{ id: 'woche', label: 'Woche' }, { id: 'monat', label: 'Monat' }];

    return (
        <div className="bg-slate-800 p-1 rounded-full flex items-center">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setViewMode(tab.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors duration-300 ${
                        viewMode === tab.id
                            ? 'bg-red-600 text-white'
                            : 'text-slate-300 hover:bg-slate-700/50'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};
