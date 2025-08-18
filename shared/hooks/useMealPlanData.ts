import { useState, useEffect, useMemo } from 'react';
import useLocalStorage from './useLocalStorage';
import type { MealPrefs, WeeklyPlan, ShoppingListState } from '@/shared/types';
import type { Recipe } from '@/features/meal-plan/data/recipes';

interface UseMealPlanDataProps {
    currentUserId: string | null;
    initialData: {
        prefs: MealPrefs | null;
        plans: Record<string, WeeklyPlan> | null;
        customRecipes: Recipe[] | null;
        shoppingLists: Record<string, ShoppingListState> | null;
        recentRecipeIds: string[] | null;
    };
}

const DEFAULT_PREFS: MealPrefs = {
    people: { adults: 2, kids: 1 },
    diet: {},
    base: 'mix',
    meatRate: '1-2',
    sides: [],
    tipsEnabled: true,
    excludeTags: [],
    favoriteRecipeIds: [],
};

export const useMealPlanData = ({ currentUserId, initialData }: UseMealPlanDataProps) => {
    const key = (base: string) => (currentUserId ? `${currentUserId}_${base}` : base);

    const [mealPlanPrefs, setMealPlanPrefs] = useLocalStorage<MealPrefs | null>(key('mealPlanPrefs'), initialData.prefs || null);
    const [weeklyMealPlans, setWeeklyMealPlans] = useLocalStorage<Record<string, WeeklyPlan>>(key('weeklyMealPlans'), initialData.plans || {});
    const [shoppingLists, setShoppingLists] = useLocalStorage<Record<string, ShoppingListState>>(key('shoppingLists'), initialData.shoppingLists || {});
    const [customRecipes, setCustomRecipes] = useLocalStorage<Recipe[]>(key('customMealRecipes'), initialData.customRecipes || []);
    const [recentRecipeIds, setRecentRecipeIds] = useLocalStorage<string[]>(key('recentRecipeIds'), initialData.recentRecipeIds || []);

    useEffect(() => {
        if (initialData.prefs) setMealPlanPrefs(initialData.prefs);
    }, [initialData.prefs, setMealPlanPrefs]);

    useEffect(() => {
        if (initialData.plans) setWeeklyMealPlans(initialData.plans);
    }, [initialData.plans, setWeeklyMealPlans]);

    useEffect(() => {
        if (initialData.customRecipes) setCustomRecipes(initialData.customRecipes);
    }, [initialData.customRecipes, setCustomRecipes]);
    
    useEffect(() => {
        if (initialData.shoppingLists) setShoppingLists(initialData.shoppingLists);
    }, [initialData.shoppingLists, setShoppingLists]);

    useEffect(() => {
        if (initialData.recentRecipeIds) setRecentRecipeIds(initialData.recentRecipeIds);
    }, [initialData.recentRecipeIds, setRecentRecipeIds]);

    return {
        mealPlanPrefs,
        setMealPlanPrefs,
        weeklyMealPlans,
        setWeeklyMealPlans,
        shoppingLists,
        setShoppingLists,
        customRecipes,
        setCustomRecipes,
        recentRecipeIds,
        setRecentRecipeIds,
    };
};
