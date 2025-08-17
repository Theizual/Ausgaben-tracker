import React, { FC, useState, useMemo } from 'react';
import { WeeklyPlan, MealDay } from '@/shared/types';
import { MealDayCard } from './MealDayCard';
import { AnimatePresence } from 'framer-motion';
import { ShoppingListCard } from './ShoppingListCard';
import { RecipePickerModal } from './RecipePickerModal';
import { useApp } from '@/contexts/AppContext';
import { recipes as baseRecipes } from '../data/recipes';
import { toast } from 'react-hot-toast';

interface MealCalendarProps {
    plan: WeeklyPlan | null;
    onShoppingListClick: () => void;
    onOpenDetail: (dayIndex: number) => void;
    onOpenPicker: (dayIndex: number) => void;
}

export const MealCalendar: FC<MealCalendarProps> = ({ plan, onShoppingListClick, onOpenDetail, onOpenPicker }) => {
    const { setWeeklyMealPlans, customRecipes } = useApp();
    const [pickerDayIndex, setPickerDayIndex] = useState<number | null>(null);

    const allRecipes = useMemo(() => [...baseRecipes, ...customRecipes], [customRecipes]);
    const recipeMap = useMemo(() => new Map(allRecipes.map(r => [r.id, r])), [allRecipes]);

    if (!plan) {
        return (
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 h-96 flex items-center justify-center">
                <p className="text-slate-500">Mahlzeitenplan wird geladen...</p>
            </div>
        );
    }

    const handleSelectRecipe = (recipeId: string) => {
        if (pickerDayIndex === null) return;

        const recipe = recipeMap.get(recipeId);
        if (!recipe) {
            toast.error("Rezept nicht gefunden.");
            return;
        }

        const originalDay = plan.days[pickerDayIndex];
        const totalServings = originalDay.servings.adults + originalDay.servings.kids * 0.7;

        const newMealDay: MealDay = {
            ...originalDay,
            recipeId: recipe.id,
            title: recipe.title,
            side: recipe.sideSuggestion,
            estimatedPrice: recipe.estimatedPricePerServing * totalServings,
            link: recipe.link,
            priceOverride: undefined, // Reset override when recipe changes
            note: undefined, // Reset note
        };

        const updatedDays = [...plan.days];
        updatedDays[pickerDayIndex] = newMealDay;

        const updatedPlan = { ...plan, days: updatedDays };
        updatedPlan.totalEstimate = updatedPlan.days.reduce((sum, day) => sum + (day.priceOverride ?? day.estimatedPrice), 0);

        setWeeklyMealPlans(prev => ({ ...prev, [plan.weekKey]: updatedPlan }));
        setPickerDayIndex(null);
    };
    
    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-4">
                {plan.days.map((day, index) => (
                    <MealDayCard 
                        key={day.dateISO} 
                        mealDay={day} 
                        onOpenPicker={() => onOpenPicker(index)}
                        onOpenDetail={() => onOpenDetail(index)}
                    />
                ))}
                <ShoppingListCard plan={plan} onClick={onShoppingListClick} />
            </div>
             <AnimatePresence>
                {pickerDayIndex !== null && (
                    <RecipePickerModal
                        isOpen={pickerDayIndex !== null}
                        onClose={() => setPickerDayIndex(null)}
                        onSelectRecipe={handleSelectRecipe}
                        currentRecipeId={plan.days[pickerDayIndex].recipeId}
                    />
                )}
            </AnimatePresence>
        </>
    );
};