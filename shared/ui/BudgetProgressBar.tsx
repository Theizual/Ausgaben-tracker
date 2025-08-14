

import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { COLOR_DANGER, COLOR_SUCCESS, COLOR_WARNING } from '@/constants';

export const getBudgetBarColor = (percentage: number, defaultColor = COLOR_SUCCESS): string => {
    if (percentage > 100) return COLOR_DANGER;
    if (percentage > 85) return COLOR_WARNING;
    return defaultColor;
};

export const BudgetProgressBar: FC<{ percentage: number; color?: string; className?: string }> = ({ percentage, color, className = '' }) => {
    const barColor = getBudgetBarColor(percentage, color);
    const warningText = percentage > 100 ? "Budget aufgebraucht" : percentage > 85 ? `Budget zu ${Math.round(percentage)}% verbraucht` : null;
    const barWidth = Math.min(100, Math.max(0, percentage));

    const barAnimation = {
        initial: { width: 0 },
        animate: { width: `${barWidth}%` },
        transition: { duration: 0.8, ease: "easeOut" as const },
    };

    const textAnimation = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { delay: 0.5, duration: 0.5 },
    };

    return (
        <div className={clsx('relative w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden', className)}>
            <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: barColor }}
                {...barAnimation}
            />
            {warningText && barWidth > 40 && ( // Only show text if there is enough space
                <motion.div
                    className="absolute inset-0 flex items-center justify-center px-2"
                    {...textAnimation}
                >
                    <span className="text-white text-[8px] font-bold truncate drop-shadow-sm">{warningText}</span>
                </motion.div>
            )}
        </div>
    );
};