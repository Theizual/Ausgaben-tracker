import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getWeek } from 'date-fns';
import { MealSetup } from './components/MealSetup';
import { MealCalendar } from './components/MealCalendar';
import { BudgetBox } from './components/BudgetBox';
import { TipsCard } from './components/TipsCard';
import { Toolbar } from './components/Toolbar';
import { generatePlan } from './lib/planGenerator';
import { recipes } from './data/recipes';
import type { WeeklyPlan } from '@/shared/types';
import { motion, AnimatePresence } from 'framer-motion';

const MealPlanPage = () => {
    const { 
        mealPlanPrefs, 
        setMealPlanPrefs, 
        weeklyMealPlans, 
        setWeeklyMealPlans,
        currentMealPlanWeek,
        setCurrentMealPlanWeek
    } = useApp();

    const [isBudgetTight, setIsBudgetTight] = useState(false);
    
    const weekKey = useMemo(() => {
        const year = currentMealPlanWeek.getFullYear();
        const week = getWeek(currentMealPlanWeek, { weekStartsOn: 1 });
        return `${year}-W${String(week).padStart(2, '0')}`;
    }, [currentMealPlanWeek]);
    
    const currentPlan = useMemo(() => weeklyMealPlans[weekKey], [weeklyMealPlans, weekKey]);

    const createAndSavePlan = useCallback((forceCheap: boolean) => {
        if (!mealPlanPrefs) return;
        const newPlan = generatePlan(mealPlanPrefs, recipes, forceCheap);
        const newPlans = { ...weeklyMealPlans, [weekKey]: newPlan };
        setWeeklyMealPlans(newPlans);
    }, [mealPlanPrefs, weeklyMealPlans, weekKey, setWeeklyMealPlans]);

    useEffect(() => {
        // Generate a new plan if one doesn't exist for the current week
        if (mealPlanPrefs && !currentPlan) {
            createAndSavePlan(isBudgetTight);
        }
    }, [mealPlanPrefs, currentPlan, createAndSavePlan, isBudgetTight]);
    
    const handleReroll = () => {
        createAndSavePlan(isBudgetTight);
    };
    
    if (!mealPlanPrefs) {
        return <MealSetup onSave={setMealPlanPrefs} />;
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
        <motion.div variants={pageAnimation} initial="initial" animate="animate" className="space-y-6">
            <motion.h1 variants={itemAnimation} className="text-3xl font-bold text-white">Essensplanung</motion.h1>
            
            <motion.div variants={itemAnimation}>
                <Toolbar 
                    currentWeek={currentMealPlanWeek}
                    setCurrentWeek={setCurrentMealPlanWeek}
                    onReroll={handleReroll}
                    onEditPrefs={() => setMealPlanPrefs(null)}
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
                            <MealCalendar plan={currentPlan} />
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
    );
};

export default MealPlanPage;