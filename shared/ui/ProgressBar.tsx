


import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { clsx } from 'clsx';

export const ProgressBar = ({ percentage, color = '#22c55e', className = '' }: { percentage: number; color?: string; className?: string }) => {
    const barAnimation: MotionProps = {
        initial: { width: 0 },
        animate: { width: `${Math.min(100, Math.max(0, percentage))}%` },
        transition: { duration: 0.8, ease: "easeOut" },
    };
    
    return (
        <div className={clsx('w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden', className)}>
            <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                {...barAnimation}
            />
        </div>
    );
};