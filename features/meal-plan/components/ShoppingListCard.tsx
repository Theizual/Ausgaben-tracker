import React, { FC } from 'react';
import { WeeklyPlan } from '@/shared/types';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { ShoppingBasket, List } from '@/shared/ui';
import { clsx } from 'clsx';
import { Button } from '@/shared/ui';

interface ShoppingListCardProps {
    plan: WeeklyPlan;
    onClick: () => void;
}

export const ShoppingListCard: FC<ShoppingListCardProps> = ({ plan, onClick }) => {
    const total = plan.days.reduce((sum, day) => sum + (day.priceOverride ?? day.estimatedPrice), 0);

    return (
        <div 
            className={clsx(
                "relative aspect-square p-2 rounded-2xl border-2 flex flex-col justify-between items-center text-center",
                "border-dashed border-slate-600 bg-slate-800/30"
            )}
        >
            {/* Header */}
            <div className="w-full flex justify-between items-start">
                <div className="text-left">
                    <h4 className="font-bold text-white text-sm">Einkauf</h4>
                    <p className="text-xs text-slate-400">Woche</p>
                </div>
            </div>
            
            {/* Content: Icon & Title */}
            <div className="flex flex-col items-center">
                <ShoppingBasket className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-white leading-tight">
                    {formatCurrency(total)}
                </p>
                 <p className="text-xs text-slate-400">geschätzt</p>
            </div>

            {/* Footer: Button */}
            <div className="w-full">
                <Button variant="secondary" size="sm" onClick={onClick} className="w-full">
                    <List className="h-4 w-4" /> Liste anzeigen
                </Button>
            </div>
        </div>
    );
};
