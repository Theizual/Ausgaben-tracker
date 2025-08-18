import React, { FC, useMemo } from 'react';
import { MealDay } from '@/shared/types';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { ShieldCheck, RefreshCw, Beef, Fish, Carrot, Sprout, Salad, UtensilsCrossed } from '@/shared/ui';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import type { Recipe } from '../data/recipes';

interface MealDayCardProps {
    mealDay: MealDay;
    recipe: Recipe | undefined;
    onOpenPicker: () => void;
    onOpenDetail: () => void;
    onToggleConfirm: () => void;
}

const tagToIconMap: { [key: string]: { icon: FC<any>, color: string, title: string } } = {
    'Fleisch': { icon: Beef, color: 'text-red-500', title: 'Fleisch' }, 
    'Fisch': { icon: Fish, color: 'text-sky-400', title: 'Fisch' }, 
    'Vegetarisch': { icon: Carrot, color: 'text-green-500', title: 'Vegetarisch' },
    'Vegan': { icon: Sprout, color: 'text-green-500', title: 'Vegan' },
    'Salat': { icon: Salad, color: 'text-lime-400', title: 'Salat' },
};
const iconPriority = ['Fleisch', 'Fisch', 'Vegan', 'Vegetarisch', 'Salat'];

const StatusIcon: FC<{ recipe: Recipe }> = ({ recipe }) => {
    const iconTag = iconPriority.find(tag => recipe.tags.includes(tag));
    if (!iconTag) return null;

    const { icon: Icon, color, title } = tagToIconMap[iconTag];
    return <Icon className={`h-4 w-4 ${color}`} title={title} />;
};

const BaseBadge: FC<{ base: Recipe['base'] }> = ({ base }) => {
    const baseText = { nudeln: 'N', reis: 'R', kartoffeln: 'K', mix: 'M' }[base];
    const baseTitle = { nudeln: 'Nudeln', reis: 'Reis', kartoffeln: 'Kartoffeln', mix: 'Mix' }[base];
    const baseColorClass = {
        nudeln: 'bg-amber-500/50 text-amber-100',
        reis: 'bg-slate-500/50 text-slate-100',
        kartoffeln: 'bg-yellow-800/50 text-yellow-200',
        mix: 'bg-indigo-500/50 text-indigo-100'
    }[base];

    return (
        <div title={baseTitle} className={clsx("text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center", baseColorClass)}>
            {baseText}
        </div>
    )
}


export const MealDayCard: FC<MealDayCardProps> = ({ mealDay, recipe, onOpenPicker, onOpenDetail, onToggleConfirm }) => {

    const toggleConfirm = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleConfirm();
    };
    
    const handleOpenPicker = (e: React.MouseEvent) => {
        e.stopPropagation();
        onOpenPicker();
    }
    
    const displayPrice = mealDay.priceOverride ?? mealDay.estimatedPrice;
    
    const borderColorClass = mealDay.isConfirmed ? 'border-green-500' : 'border-slate-700';

    return (
        <button 
            onClick={onOpenDetail} 
            className={clsx(
                "relative aspect-square p-2 rounded-2xl border-2 flex flex-col justify-between items-center text-center",
                "bg-slate-800/50 hover:bg-slate-700/50 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-500 group",
                borderColorClass
            )}
        >
            {/* Header: Day, Confirm */}
            <div className="w-full flex justify-between items-start">
                <div className="text-left">
                    <h4 className="font-bold text-white text-sm">{mealDay.day.substring(0,2)}</h4>
                    <p className="text-xs text-slate-400">{format(parseISO(mealDay.dateISO), 'dd.MM.')}</p>
                </div>
                <button onClick={toggleConfirm} className="p-1 rounded-full hover:bg-slate-600/50 transition-colors z-10" title={mealDay.isConfirmed ? 'Bestätigung aufheben' : 'Gericht bestätigen'}>
                    {mealDay.isConfirmed ? <ShieldCheck className="h-4 w-4 text-green-400" /> : <ShieldCheck className="h-4 w-4 text-slate-500 opacity-50 group-hover:opacity-100" />}
                </button>
            </div>
            
            {/* Content: Title & Badges */}
            <div className="flex-grow flex flex-col items-center justify-center w-full px-1 py-1">
                 <p className="text-sm font-bold text-rose-300 leading-tight line-clamp-3 text-center">{mealDay.title}</p>
                 <div className="flex items-center gap-1.5 mt-2">
                    {recipe && <BaseBadge base={recipe.base} />}
                    {recipe && <StatusIcon recipe={recipe} />}
                </div>
            </div>

            {/* Footer: Price & Reroll */}
            <div className="w-full flex justify-between items-center h-7">
                <button onClick={handleOpenPicker} className="p-1.5 rounded-full hover:bg-slate-600/50 transition-colors z-10 disabled:opacity-30" title="Anderes Gericht auswählen" disabled={mealDay.isConfirmed}>
                    <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                </button>
                <span className="font-bold text-white text-sm">{formatCurrency(displayPrice)}</span>
            </div>
        </button>
    );
};