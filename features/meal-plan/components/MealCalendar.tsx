import React, { FC, useMemo } from 'react';
import { WeeklyPlan } from '@/shared/types';
import { MealDayCard } from './MealDayCard';
import { ShoppingListCard } from './ShoppingListCard';
import type { Recipe } from '../data/recipes';

interface MealCalendarProps {
    plan: WeeklyPlan | null;
    allRecipes: Recipe[];
    onShoppingListClick: () => void;
    onOpenDetail: (dayIndex: number) => void;
    onOpenPicker: (dayIndex: number) => void;
    onToggleConfirm: (dayIndex: number) => void;
}

export const MealCalendar: FC<MealCalendarProps> = ({ plan, allRecipes, onShoppingListClick, onOpenDetail, onOpenPicker, onToggleConfirm }) => {
    if (!plan) {
        return (
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 h-96 flex items-center justify-center">
                <p className="text-slate-500">Mahlzeitenplan wird geladen...</p>
            </div>
        );
    }

    const recipeMap = useMemo(() => new Map(allRecipes.map(r => [r.id, r])), [allRecipes]);
    
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2 sm:gap-4">
            {plan.days.map((day, index) => (
                <MealDayCard 
                    key={day.dateISO} 
                    mealDay={day} 
                    recipe={recipeMap.get(day.recipeId)}
                    onOpenPicker={() => onOpenPicker(index)}
                    onOpenDetail={() => onOpenDetail(index)}
                    onToggleConfirm={() => onToggleConfirm(index)}
                />
            ))}
            <ShoppingListCard plan={plan} onClick={onShoppingListClick} />
        </div>
    );
};