
import React, { FC } from 'react';
import { Button, ChevronLeft, ChevronRight, RefreshCw, Settings, Plus, Undo2, User, Users } from '@/shared/ui';
import { format, addDays, getWeek, startOfWeek } from 'date-fns';
import { useApp } from '@/contexts/AppContext';

interface ToolbarProps {
    currentWeek: Date;
    setCurrentWeek: (date: Date) => void;
    onReroll: () => void;
    onEditPrefs: () => void;
    onAddRecipe: () => void;
    people: { adults: number; kids: number };
    hasUndo: boolean;
    onUndo: () => void;
}

export const Toolbar: FC<ToolbarProps> = ({ currentWeek, setCurrentWeek, onReroll, onEditPrefs, onAddRecipe, people, hasUndo, onUndo }) => {
    const { deLocale } = useApp();

    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const end = addDays(start, 6);

    const weekLabel = `KW ${getWeek(currentWeek, { weekStartsOn: 1, locale: deLocale })}`;
    const dateLabel = `${format(start, 'd.')} - ${format(end, 'd. MMM', { locale: deLocale })}`;
    
    return (
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-center bg-slate-800/50 p-2 rounded-2xl border border-slate-700/50">
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => setCurrentWeek(addDays(currentWeek, -7))}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="text-center">
                    <span className="font-semibold text-white text-sm w-36 text-center">{weekLabel}</span>
                    <p className="text-xs text-slate-400">{dateLabel}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setCurrentWeek(addDays(currentWeek, 7))}>
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>
            
             <div className="flex items-center gap-2 text-sm text-slate-300">
                <Users className="h-4 w-4" />
                <span>{people.adults} Erw.</span>
                <span>&bull;</span>
                <span>{people.kids} Kind(er)</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center">
                {hasUndo && (
                    <Button variant="secondary" size="sm" onClick={onUndo}>
                        <Undo2 className="h-4 w-4" /> Rückgängig
                    </Button>
                )}
                <Button variant="secondary" size="sm" onClick={onReroll}>
                    <RefreshCw className="h-4 w-4" /> Woche würfeln
                </Button>
                 <Button variant="secondary" size="sm" onClick={onAddRecipe}>
                    <Plus className="h-4 w-4" /> Rezept
                </Button>
                 <Button variant="secondary" size="sm" onClick={onEditPrefs}>
                    <Settings className="h-4 w-4" /> Präferenzen
                </Button>
            </div>
        </div>
    );
};
