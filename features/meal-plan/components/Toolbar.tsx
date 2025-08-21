import React, { FC, useState, useRef, useEffect } from 'react';
import { Button, ChevronLeft, ChevronRight, RefreshCw, Plus, Undo2, Users, Edit, Minus } from '@/shared/ui';
import { format, addDays, getWeek, startOfWeek } from 'date-fns';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { MealPrefs } from '@/shared/types';
import { toast } from 'react-hot-toast';

// New Popover Component for editing people count
const PeopleEditorPopover: FC<{
    prefs: MealPrefs;
    onSave: (newPrefs: MealPrefs) => void;
    onClose: () => void;
}> = ({ prefs, onSave, onClose }) => {
    const [adults, setAdults] = useState(prefs.people.adults);
    const [kids, setKids] = useState(prefs.people.kids);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                handleSave();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    const handleSave = () => {
        if (adults + kids <= 0) {
            toast.error("Mindestens eine Person muss angegeben werden.");
            return;
        }
        onSave({ ...prefs, people: { adults, kids } });
        onClose();
    };

    const changeCount = (type: 'adults' | 'kids', amount: number) => {
        if (type === 'adults') {
            setAdults(prev => Math.max(0, prev + amount));
        } else {
            setKids(prev => Math.max(0, prev + amount));
        }
    };
    
    return (
        <motion.div
            ref={popoverRef}
            {...{
                initial: { opacity: 0, y: 5 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: 5 },
            }}
            className="absolute z-20 top-full right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-4"
        >
            <div className="space-y-3">
                <div>
                    <label className="text-sm font-medium text-slate-300">Erwachsene</label>
                    <div className="flex items-center gap-2 mt-1">
                        <Button variant="secondary" size="icon-xs" onClick={() => changeCount('adults', -1)}><Minus className="h-4 w-4" /></Button>
                        <input type="number" value={adults} onChange={e => setAdults(parseInt(e.target.value, 10) || 0)} className="w-full text-center bg-slate-800 border border-slate-600 rounded-md p-1" />
                        <Button variant="secondary" size="icon-xs" onClick={() => changeCount('adults', 1)}><Plus className="h-4 w-4" /></Button>
                    </div>
                </div>
                 <div>
                    <label className="text-sm font-medium text-slate-300">Kinder</label>
                    <div className="flex items-center gap-2 mt-1">
                         <Button variant="secondary" size="icon-xs" onClick={() => changeCount('kids', -1)}><Minus className="h-4 w-4" /></Button>
                        <input type="number" value={kids} onChange={e => setKids(parseInt(e.target.value, 10) || 0)} className="w-full text-center bg-slate-800 border border-slate-600 rounded-md p-1" />
                        <Button variant="secondary" size="icon-xs" onClick={() => changeCount('kids', 1)}><Plus className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>
            <Button onClick={handleSave} size="sm" className="w-full mt-4">Anwenden</Button>
        </motion.div>
    );
};


interface ToolbarProps {
    currentWeek: Date;
    setCurrentWeek: (date: Date) => void;
    onReroll: () => void;
    onAddRecipe: () => void;
    hasUndo: boolean;
    onUndo: () => void;
}

export const Toolbar: FC<ToolbarProps> = ({ currentWeek, setCurrentWeek, onReroll, onAddRecipe, hasUndo, onUndo }) => {
    const { deLocale, mealPlanPrefs, setMealPlanPrefs } = useApp();
    const [isPeopleEditorOpen, setIsPeopleEditorOpen] = useState(false);

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
            
             <div className="relative">
                <button 
                    onClick={() => setIsPeopleEditorOpen(p => !p)} 
                    className="flex items-center gap-2 text-sm text-slate-300 hover:bg-slate-700/50 p-2 rounded-lg"
                >
                    <Users className="h-5 w-5" />
                    <span>{mealPlanPrefs?.people.adults} Erw. · {mealPlanPrefs?.people.kids} Kind(er)</span>
                    <Edit className="h-3 w-3 text-slate-500" />
                </button>
                 <AnimatePresence>
                    {isPeopleEditorOpen && mealPlanPrefs && (
                        <PeopleEditorPopover 
                            prefs={mealPlanPrefs}
                            onSave={setMealPlanPrefs}
                            onClose={() => setIsPeopleEditorOpen(false)}
                        />
                    )}
                </AnimatePresence>
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
            </div>
        </div>
    );
};
