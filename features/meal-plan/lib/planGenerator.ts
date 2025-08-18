import type { MealPrefs, WeeklyPlan, MealDay, Recipe } from '@/shared/types';
import { getWeek, startOfWeek, format, addDays, getDay } from 'date-fns';
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

interface GeneratePlanArgs {
    prefs: MealPrefs;
    allRecipes: readonly Recipe[];
    recentRecipeIds: string[];
    forceCheap: boolean;
    targetDate: Date;
    existingPlan?: WeeklyPlan;
    dayToReroll?: number;
}

export const generatePlan = ({ prefs, allRecipes, recentRecipeIds, forceCheap, targetDate, existingPlan, dayToReroll }: GeneratePlanArgs): WeeklyPlan => {
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekKey = `${weekStart.getFullYear()}-W${getWeek(weekStart, { weekStartsOn: 1 })}`;
    
    // 1. Initial Filter Pipeline
    let filtered = allRecipes.filter(r => {
        if (prefs.excludeTags.some(tag => r.tags.includes(tag))) return false;
        if (prefs.diet.vegetarian && r.tags.includes('Fleisch')) return false;
        if (prefs.base !== 'mix' && r.base !== prefs.base) return false;
        return true;
    });

    if (forceCheap) {
        filtered = filtered.filter(r => r.tags.includes('Günstig'));
    }

    // 2. Prepare for selection
    const favoriteIds = new Set(prefs.favoriteRecipeIds);
    const recentIds = new Set(recentRecipeIds);
    const planRecipeIds = new Set(existingPlan?.days.map(d => d.recipeId));

    const days: MealDay[] = [];
    
    const CHILD_FACTOR = 0.6;
    const round2 = (num: number) => Math.round(num * 100) / 100;
    const servings = (prefs.people.adults || 1) + (prefs.people.kids || 0) * CHILD_FACTOR;

    for (let i = 0; i < 7; i++) {
        const dayDate = addDays(weekStart, i);
        const dayOfWeek = getDay(dayDate); // Sunday is 0, Saturday is 6
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        const existingDay = existingPlan?.days[i];

        // Keep day if it's confirmed, unless we are explicitly rerolling this specific day
        if (existingDay?.isConfirmed && dayToReroll !== i) {
            days.push(existingDay);
            continue;
        }

        // Keep day if we are rerolling a *different* single day
        if (dayToReroll !== undefined && dayToReroll !== i) {
            days.push(existingDay!); // We know existingDay is defined here
            continue;
        }
        
        // De-duping logic
        let candidatePool = filtered.filter(r => 
            !planRecipeIds.has(r.id) || r.id === existingDay?.recipeId
        );
        candidatePool = candidatePool.filter(r => 
            favoriteIds.has(r.id) || !recentIds.has(r.id)
        );

        // Premium logic for weekends
        const premiumPool = candidatePool.filter(r => r.isPremium);
        const regularPool = candidatePool.filter(r => !r.isPremium);

        let selectedRecipe: Recipe | undefined;
        if (isWeekend && premiumPool.length > 0 && Math.random() > 0.3) { // 70% chance for premium on weekend
            selectedRecipe = shuffleArray(premiumPool)[0];
        } else if (regularPool.length > 0) {
            selectedRecipe = shuffleArray(regularPool)[0];
        } else if (candidatePool.length > 0) { // Fallback to any candidate
            selectedRecipe = shuffleArray(candidatePool)[0];
        } else { // Ultimate fallback
            selectedRecipe = shuffleArray([...allRecipes])[0];
        }
        
        planRecipeIds.add(selectedRecipe.id);
        if (existingDay?.recipeId) {
            planRecipeIds.delete(existingDay.recipeId);
        }

        const price = round2((selectedRecipe.price || 2.5) * servings);
        
        days.push({
            day: format(dayDate, 'EEEE', { locale: de }),
            dateISO: dayDate.toISOString(),
            recipeId: selectedRecipe.id,
            title: selectedRecipe.name,
            side: selectedRecipe.sideSuggestion,
            servings: prefs.people,
            estimatedPrice: price,
            link: selectedRecipe.link,
            isConfirmed: existingDay?.isConfirmed || false,
        });
    }

    const finalTotal = days.reduce((sum, day) => {
        const basePrice = day.priceOverride ?? allRecipes.find(r => r.id === day.recipeId)?.price ?? 2.5;
        return sum + round2(basePrice * servings);
    }, 0);

    return {
        weekKey,
        days,
        totalEstimate: finalTotal,
        totalOverride: finalTotal, // totalOverride is now implicitly handled by priceOverride
    };
};