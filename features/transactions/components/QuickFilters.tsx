
import React, { FC } from 'react';
import type { QuickFilterId } from '../../../types';

const quickFilterButtons: { id: QuickFilterId; label: string }[] = [
    { id: 'current', label: 'Aktuell' },
    { id: 'month', label: 'Monat' },
    { id: 'all', label: 'Gesamt' },
];

export const QuickFilters: FC<{
    activeQuickFilter: QuickFilterId | null;
    onQuickFilter: (filter: QuickFilterId) => void;
}> = ({ activeQuickFilter, onQuickFilter }) => {
    return (
        <div className="flex items-center space-x-1 bg-slate-700/80 p-1 rounded-full self-start">
            {quickFilterButtons.map(btn => (
                <button
                    key={btn.id}
                    onClick={() => onQuickFilter(btn.id)}
                    className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors duration-300 whitespace-nowrap ${
                        activeQuickFilter === btn.id
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'text-slate-300 hover:bg-slate-600/50'
                    }`}
                >
                    {btn.label}
                </button>
            ))}
        </div>
    );
};
