import type { MealPrefs, WeeklyPlan, MealDay } from '@/shared/types';
import type { Recipe } from '../data/recipes';
import { getWeek, startOfWeek, format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';

const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const getMeatCount = (rate: MealPrefs['meatRate'], totalDays: number = 7): number => {
    switch(rate) {
        case 'none': return 0;
        case '1-2': return Math.ceil(Math.random() * 2) + 1; // 2 or 3
        case '3-5': return Math.ceil(Math.random() * 3) + 2; // 3, 4, or 5
        case 'daily': return totalDays;
        default: return 3;
    }
};

export const generatePlan = (prefs: MealPrefs, allRecipes: readonly Recipe[], forceCheap: boolean): WeeklyPlan => {
    const weekKey = `${new Date().getFullYear()}-W${getWeek(new Date(), { weekStartsOn: 1 })}`;
    
    // 1. Filter recipes based on preferences
    let filtered = allRecipes.filter(r => {
        if (prefs.diet.vegetarian && r.tags.includes('meat')) return false;
        if (prefs.diet.glutenFree && r.tags.includes('glutenFree') === false) return false;
        if (prefs.diet.lactoseFree && r.tags.includes('lactoseFree') === false) return false;
        if (prefs.base !== 'mix' && r.base !== prefs.base) return false;
        return true;
    });

    if (forceCheap) {
        filtered = filtered.filter(r => r.tags.includes('cheap'));
    }

    // 2. Separate meat/fish and vegetarian recipes
    const meatRecipes = shuffleArray(filtered.filter(r => r.tags.includes('meat') || r.tags.includes('fish')));
    const vegRecipes = shuffleArray(filtered.filter(r => !r.tags.includes('meat') && !r.tags.includes('fish')));

    // 3. Select recipes for the week
    const meatCount = getMeatCount(prefs.meatRate);
    const vegCount = 7 - meatCount;
    
    let weeklyRecipes = [
        ...meatRecipes.slice(0, meatCount),
        ...vegRecipes.slice(0, vegCount),
    ];
    
    // Fill up if not enough recipes were found
    while (weeklyRecipes.length < 7 && filtered.length > 0) {
        weeklyRecipes.push(filtered[Math.floor(Math.random() * filtered.length)]);
    }
    weeklyRecipes = shuffleArray(weeklyRecipes);
    
    // 4. Create day-by-day plan
    const totalServings = prefs.people.adults + prefs.people.kids * 0.6;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

    const days: MealDay[] = [];
    let totalEstimate = 0;

    for (let i = 0; i < 7; i++) {
        const recipe = weeklyRecipes[i] || weeklyRecipes[0]; // Fallback to first recipe
        const dayDate = addDays(weekStart, i);
        const dayName = format(dayDate, 'EEEE', { locale: de });

        const priceEstimate = (recipe.gramsPerServing / 100) * recipe.pricePer100g * totalServings;
        totalEstimate += priceEstimate;
        
        days.push({
            day: dayName,
            recipeId: recipe.id,
            title: recipe.title,
            link: recipe.link,
            side: recipe.sideSuggestion,
            servings: prefs.people,
            gramsPerServing: recipe.gramsPerServing,
            priceEstimate: priceEstimate
        });
    }

    return {
        weekKey,
        days,
        totalEstimate,
    };
};