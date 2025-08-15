import React, { FC } from 'react';
import { MealDay } from '@/shared/types';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { Button } from '@/shared/ui';

interface MealDayCardProps {
    mealDay: MealDay;
}

const getServingsText = (servings: { adults: number; kids: number }) => {
    const parts = [];
    if (servings.adults > 0) parts.push(`${servings.adults} Erw.`);
    if (servings.kids > 0) parts.push(`${servings.kids} Kind(er)`);
    return parts.join(', ');
};

export const MealDayCard: FC<MealDayCardProps> = ({ mealDay }) => {
    return (
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col h-full">
            <h4 className="font-bold text-white">{mealDay.day}</h4>
            <div className="mt-2 flex-grow">
                <p className="text-lg font-semibold text-rose-300">{mealDay.title}</p>
                {mealDay.side && <p className="text-sm text-slate-400">+ {mealDay.side}</p>}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-700/50 space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-400">Personen:</span>
                    <span className="font-medium text-white">{getServingsText(mealDay.servings)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">Geschätzter Preis:</span>
                    <span className="font-bold text-white">{formatCurrency(mealDay.priceEstimate)}</span>
                </div>
                <div className="pt-2">
                    <a href={mealDay.link} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button variant="secondary" size="sm" className="w-full">Zum Rezept</Button>
                    </a>
                </div>
            </div>
        </div>
    );
};