import React, { FC } from 'react';
import { Button, ChevronLeft, ChevronRight, RefreshCw, Settings } from '@/shared/ui';
import { format, addDays } from 'date-fns';
import { useApp } from '@/contexts/AppContext';

interface ToolbarProps {
    currentWeek: Date;
    setCurrentWeek: (date: Date) => void;
    onReroll: () => void;
    onEditPrefs: () => void;
}

export const Toolbar: FC<ToolbarProps> = ({ currentWeek, setCurrentWeek, onReroll, onEditPrefs }) => {
    const { deLocale } = useApp();
    const weekLabel = `KW ${format(currentWeek, 'ww', { weekStartsOn: 1, locale: deLocale })}: ${format(currentWeek, 'd. MMM', { locale: deLocale })}`;

    return (
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-center bg-slate-800/50 p-2 rounded-2xl border border-slate-700/50">
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => setCurrentWeek(addDays(currentWeek, -7))}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="font-semibold text-white text-sm w-36 text-center">{weekLabel}</span>
                <Button variant="ghost" size="icon-sm" onClick={() => setCurrentWeek(addDays(currentWeek, 7))}>
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={onReroll}>
                    <RefreshCw className="h-4 w-4" /> Plan neu würfeln
                </Button>
                 <Button variant="secondary" size="sm" onClick={onEditPrefs}>
                    <Settings className="h-4 w-4" /> Präferenzen
                </Button>
            </div>
        </div>
    );
};