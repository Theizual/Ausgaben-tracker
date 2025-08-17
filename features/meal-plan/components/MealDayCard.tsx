import React, { FC, useMemo } from 'react';
import { MealDay } from '@/shared/types';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { ShieldCheck, RefreshCw, Beef, Fish, Soup, Salad, Pizza, Award, Zap, HandCoins, Flame, UtensilsCrossed, Carrot, Sprout, Utensils } from '@/shared/ui';
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

const tagToIconMap: { [key: string]: FC<any> } = {
    'Fleisch': Beef, 'Fisch': Fish, 'Suppe': Soup, 'Eintopf': Soup, 'Salat': Salad, 'Pizza': Pizza, 'Italienisch': Pizza, 'Asiatisch': Utensils, 'Vegetarisch': Carrot, 'Vegan': Sprout, 'Ofengericht': Flame, 'Schnell': Zap, 'Klassiker': Award, 'Günstig': HandCoins,
};
const iconPriority = ['Fleisch', 'Fisch', 'Suppe', 'Eintopf', 'Salat', 'Pizza', 'Italienisch', 'Asiatisch', 'Vegetarisch', 'Vegan', 'Ofengericht', 'Schnell', 'Klassiker', 'Günstig'];

const baseToColorClass: Record<string, string> = {
    nudeln: 'border-yellow-400',
    reis: 'border-slate-300',
    kartoffeln: 'border-orange-500',
    mix: 'border-slate-500',
};

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

    const MainIcon = useMemo(() => {
        if (!recipe) return UtensilsCrossed;
        for (const tag of iconPriority) {
            if (recipe.tags.includes(tag)) {
                return tagToIconMap[tag];
            }
        }
        return UtensilsCrossed;
    }, [recipe]);

    const borderColorClass = mealDay.isConfirmed ? 'border-green-500' : (recipe ? baseToColorClass[recipe.base] : 'border-slate-700');

    return (
        <button 
            onClick={onOpenDetail} 
            className={clsx(
                "relative aspect-square p-2 rounded-2xl border-2 flex flex-col justify-between items-center text-center",
                "bg-slate-800/50 hover:bg-slate-700/50 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-500 group",
                borderColorClass
            )}
        >
            {/* Header: Day, Icon, Confirm */}
            <div className="w-full flex justify-between items-start">
                <div className="text-left">
                    <h4 className="font-bold text-white text-sm">{mealDay.day.substring(0,2)}</h4>
                    <p className="text-xs text-slate-400">{format(parseISO(mealDay.dateISO), 'dd.MM.')}</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <MainIcon className="h-5 w-5 text-slate-300" />
                    <button onClick={toggleConfirm} className="p-1 rounded-full hover:bg-slate-600/50 transition-colors z-10" title={mealDay.isConfirmed ? 'Bestätigung aufheben' : 'Gericht bestätigen'}>
                        {mealDay.isConfirmed ? <ShieldCheck className="h-4 w-4 text-green-400" /> : <ShieldCheck className="h-4 w-4 text-slate-500 opacity-50 group-hover:opacity-100" />}
                    </button>
                </div>
            </div>
            
            {/* Content: Title */}
            <div className="flex-grow flex items-center justify-center w-full px-1">
                 <p className="text-sm font-bold text-rose-300 leading-tight line-clamp-3">{mealDay.title}</p>
            </div>

            {/* Footer: Price & Reroll */}
            <div className="w-full flex justify-between items-center h-7">
                <button onClick={handleOpenPicker} className="p-1.5 rounded-full hover:bg-slate-600/50 transition-colors z-10 opacity-0 group-hover:opacity-100 disabled:opacity-0" title="Anderes Gericht auswählen" disabled={mealDay.isConfirmed}>
                    <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                </button>
                <span className="font-bold text-white text-sm">{formatCurrency(displayPrice)}</span>
            </div>
        </button>
    );
};