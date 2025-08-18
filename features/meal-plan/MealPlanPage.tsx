import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getWeek, startOfWeek } from 'date-fns';
import { MealCalendar } from './components/MealCalendar';
import { BudgetBox } from './components/BudgetBox';
import { TipsCard } from './components/TipsCard';
import { Toolbar } from './components/Toolbar';
import { generatePlan } from './lib/planGenerator';
import { recipes as baseRecipes } from './data/recipes';
import type { WeeklyPlan, MealDay, MealPrefs } from '@/shared/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { AddRecipeModal } from './components/AddRecipeModal';
import { ShoppingListModal } from './components/ShoppingListModal';
import { MealDetailModal } from './components/MealDetailModal';
import { RecipePickerModal } from './components/RecipePickerModal';
import type { Recipe } from './data/recipes';
import { Loader2 } from '@/shared/ui';

const MealPlanPage = () => {
    const { 
        mealPlanPrefs, 
        setMealPlanPrefs, 
        weeklyMealPlans, 
        setWeeklyMealPlans,
        currentMealPlanWeek,
        setCurrentMealPlanWeek,
        customRecipes,
        recentRecipeIds,
        setRecentRecipeIds,
    } = useApp();

    const [isBudgetTight, setIsBudgetTight] = useState(false);
    const [isAddRecipeModalOpen, setIsAddRecipeModalOpen] = useState(false);
    const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
    const [detailDayIndex, setDetailDayIndex] = useState<number | null>(null);
    const [pickerDayIndex, setPickerDayIndex] = useState<number | null>(null);

    const [undoState, setUndoState] = useState<{ dayIndex: number, mealDay: MealDay} | null>(null);
    
    const weekKey = useMemo(() => {
        const year = currentMealPlanWeek.getFullYear();
        const week = getWeek(currentMealPlanWeek, { weekStartsOn: 1 });
        return `${year}-W${String(week).padStart(2, '0')}`;
    }, [currentMealPlanWeek]);
    
    const currentPlan = useMemo(() => (weeklyMealPlans || {})[weekKey], [weeklyMealPlans, weekKey]);
    const allRecipes = useMemo(() => [...baseRecipes, ...(customRecipes || [])], [customRecipes]);
    const recipeMap = useMemo(() => new Map(allRecipes.map(r => [r.id, r])), [allRecipes]);

    useEffect(() => {
        // Automatically set default preferences if they don't exist
        if (!mealPlanPrefs || !mealPlanPrefs.people) {
            const defaultPrefs: MealPrefs = {
                people: { adults: 2, kids: 1 },
                diet: {},
                base: 'mix',
                meatRate: '1-2',
                sides: [],
                tipsEnabled: true,
                excludeTags: [],
                favoriteRecipeIds: [],
            };
            setMealPlanPrefs(defaultPrefs);
        }
    }, [mealPlanPrefs, setMealPlanPrefs]);

    const createAndSavePlan = useCallback((forceCheap: boolean, forDate: Date) => {
        if (!mealPlanPrefs) return;
        const newPlan = generatePlan({
            prefs: mealPlanPrefs, 
            allRecipes,
            recentRecipeIds: recentRecipeIds || [],
            forceCheap,
            targetDate: forDate
        });
        const newPlans = { ...(weeklyMealPlans || {}), [newPlan.weekKey]: newPlan };
        setWeeklyMealPlans(newPlans);
        
        const newRecentIds = [...newPlan.days.map(d => d.recipeId), ...(recentRecipeIds || [])];
        setRecentRecipeIds(Array.from(new Set(newRecentIds)).slice(0, 50));

    }, [mealPlanPrefs, allRecipes, weeklyMealPlans, recentRecipeIds, setWeeklyMealPlans, setRecentRecipeIds]);

    useEffect(() => {
        if (mealPlanPrefs && !currentPlan) {
            createAndSavePlan(isBudgetTight, currentMealPlanWeek);
        }
    }, [mealPlanPrefs, currentPlan, createAndSavePlan, isBudgetTight, currentMealPlanWeek]);
    
    const handleReroll = (dayIndex?: number) => {
        if (!mealPlanPrefs || !currentPlan) return;

        const planToUpdate = { ...currentPlan };
        
        if(dayIndex !== undefined) {
            const dayToReroll = planToUpdate.days[dayIndex];
            if(dayToReroll.isConfirmed) {
                toast.error("Bestätigte Tage können nicht neu gewürfelt werden.");
                return;
            }
             // Save for undo
            setUndoState({ dayIndex, mealDay: dayToReroll });
        } else {
            setUndoState(null); // Clear undo on full reroll
        }
        
        const newPlan = generatePlan({
            prefs: mealPlanPrefs, 
            allRecipes, 
            recentRecipeIds: recentRecipeIds || [],
            forceCheap: isBudgetTight, 
            targetDate: currentMealPlanWeek,
            existingPlan: planToUpdate,
            dayToReroll: dayIndex
        });

        const newPlans = { ...(weeklyMealPlans || {}), [weekKey]: newPlan };
        setWeeklyMealPlans(newPlans);

        const newRecentIds = [...newPlan.days.map(d => d.recipeId), ...(recentRecipeIds || [])];
        setRecentRecipeIds(Array.from(new Set(newRecentIds)).slice(0, 50));
    };
    
    const handleSelectRecipe = (recipeId: string) => {
        if (pickerDayIndex === null || !currentPlan) return;

        const recipe = recipeMap.get(recipeId);
        if (!recipe) {
            toast.error("Rezept nicht gefunden.");
            return;
        }

        const originalDay = currentPlan.days[pickerDayIndex];
        const totalServings = originalDay.servings.adults + originalDay.servings.kids * 0.7;

        const newMealDay: MealDay = {
            ...originalDay,
            recipeId: recipe.id,
            title: recipe.title,
            side: recipe.sideSuggestion,
            estimatedPrice: recipe.estimatedPricePerServing * totalServings,
            link: recipe.link,
            priceOverride: undefined,
            note: undefined,
            ingredients: recipe.ingredients.map(i => i.name),
            instructions: recipe.instructions?.join('\n'),
        };

        const updatedDays = [...currentPlan.days];
        updatedDays[pickerDayIndex] = newMealDay;

        const updatedPlan: WeeklyPlan = { ...currentPlan, days: updatedDays };
        updatedPlan.totalEstimate = updatedPlan.days.reduce((sum, day) => sum + (day.priceOverride ?? day.estimatedPrice), 0);
        updatedPlan.totalOverride = updatedPlan.totalEstimate;


        setWeeklyMealPlans(prev => ({ ...(prev || {}), [currentPlan.weekKey]: updatedPlan }));
        setPickerDayIndex(null);
    };

    const handleUndoReroll = () => {
        if (!undoState || !currentPlan) return;
        const updatedDays = [...currentPlan.days];
        updatedDays[undoState.dayIndex] = undoState.mealDay;
        
        const updatedPlan: WeeklyPlan = {
            ...currentPlan,
            days: updatedDays,
        };
        // Recalculate total
        updatedPlan.totalEstimate = updatedPlan.days.reduce((sum, day) => sum + day.estimatedPrice, 0);
        updatedPlan.totalOverride = updatedPlan.days.reduce((sum, day) => sum + (day.priceOverride ?? day.estimatedPrice), 0);
        
        setWeeklyMealPlans(prev => ({...(prev || {}), [weekKey]: updatedPlan}));
        setUndoState(null);
    };

    const handleToggleConfirm = useCallback((dayIndex: number) => {
        if (!currentPlan) return;
        
        const updatedDays = currentPlan.days.map((d, i) => 
            i === dayIndex ? { ...d, isConfirmed: !d.isConfirmed } : d
        );
        
        const updatedPlan = { ...currentPlan, days: updatedDays };
        setWeeklyMealPlans(prev => ({ ...(prev || {}), [weekKey]: updatedPlan }));
    }, [currentPlan, setWeeklyMealPlans, weekKey]);

    const handleOpenPickerFromDetail = (dayIndex: number) => {
        setDetailDayIndex(null);
        // Use a short timeout to allow the detail modal to close before the picker opens, preventing modal-on-modal animation glitches.
        setTimeout(() => {
            setPickerDayIndex(dayIndex);
        }, 100);
    };
    
    if (!mealPlanPrefs || !mealPlanPrefs.people) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
        );
    }

    const pageAnimation = {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const itemAnimation = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
    };

    return (
        <>
            <motion.div variants={pageAnimation} initial="initial" animate="animate" className="space-y-6">
                <motion.h1 variants={itemAnimation} className="text-3xl font-bold text-white">Essensplanung</motion.h1>
                
                <motion.div variants={itemAnimation}>
                    <Toolbar 
                        currentWeek={currentMealPlanWeek}
                        setCurrentWeek={setCurrentMealPlanWeek}
                        onReroll={() => handleReroll()}
                        onAddRecipe={() => setIsAddRecipeModalOpen(true)}
                        hasUndo={!!undoState}
                        onUndo={handleUndoReroll}
                    />
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 space-y-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                 key={weekKey}
                                 initial={{ opacity: 0, x: -20 }}
                                 animate={{ opacity: 1, x: 0 }}
                                 exit={{ opacity: 0, x: 20 }}
                                 transition={{ duration: 0.3 }}
                            >
                                <MealCalendar 
                                    plan={currentPlan} 
                                    allRecipes={allRecipes}
                                    onShoppingListClick={() => setIsShoppingListOpen(true)}
                                    onOpenDetail={setDetailDayIndex}
                                    onOpenPicker={setPickerDayIndex}
                                    onToggleConfirm={handleToggleConfirm}
                                />
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="space-y-6">
                        <motion.div variants={itemAnimation}>
                            <BudgetBox 
                                plan={currentPlan} 
                                onBudgetStatusChange={setIsBudgetTight}
                            />
                        </motion.div>
                        <motion.div variants={itemAnimation}>
                            <TipsCard isVisible={isBudgetTight && mealPlanPrefs.tipsEnabled} />
                        </motion.div>
                    </div>
                </div>
            </motion.div>
            <AnimatePresence>
                {isAddRecipeModalOpen && <AddRecipeModal onClose={() => setIsAddRecipeModalOpen(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {isShoppingListOpen && currentPlan && <ShoppingListModal plan={currentPlan} allRecipes={allRecipes} onClose={() => setIsShoppingListOpen(false)} />}
            </AnimatePresence>
             <AnimatePresence>
                {detailDayIndex !== null && currentPlan && (
                    <MealDetailModal
                        isOpen={detailDayIndex !== null}
                        onClose={() => setDetailDayIndex(null)}
                        mealDay={currentPlan.days[detailDayIndex]}
                        dayIndex={detailDayIndex}
                        onOpenPicker={handleOpenPickerFromDetail}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {pickerDayIndex !== null && currentPlan && (
                    <RecipePickerModal
                        isOpen={pickerDayIndex !== null}
                        onClose={() => setPickerDayIndex(null)}
                        onSelectRecipe={handleSelectRecipe}
                        currentRecipeId={currentPlan.days[pickerDayIndex].recipeId}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default MealPlanPage;