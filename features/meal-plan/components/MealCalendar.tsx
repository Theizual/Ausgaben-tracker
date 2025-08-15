import React, { FC } from 'react';
import { WeeklyPlan } from '@/shared/types';
import { MealDayCard } from './MealDayCard';

interface MealCalendarProps {
    plan: WeeklyPlan | null;
}

export const MealCalendar: FC<MealCalendarProps> = ({ plan }) => {
    if (!plan) {
        return (
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 h-96 flex items-center justify-center">
                <p className="text-slate-500">Mahlzeitenplan wird geladen...</p>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {plan.days.map((day) => (
                <MealDayCard key={day.day} mealDay={day} />
            ))}
             {/* Placeholder for the 7th day on xl screens to align grid */}
            <div className="hidden xl:block"></div>
        </div>
    );
};