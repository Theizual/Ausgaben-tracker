import React, { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { useApp } from '@/contexts/AppContext';
import { X } from '@/shared/ui';

interface LockedTooltipProps {
    payload: any | null;
    colors: Record<string, string>;
    onClose: () => void;
    groupByMonth: boolean;
}

export const LockedTooltip: FC<LockedTooltipProps> = ({ payload, colors, onClose, groupByMonth }) => {
    const { tagMap, deLocale } = useApp();

    const animation = {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: { duration: 0.2 },
    };

    if (!payload) return <AnimatePresence />;

    const formattedLabel = payload.date ? (
        format(new Date(payload.date), groupByMonth ? 'MMMM yyyy' : 'eeee, d. MMM yyyy', { locale: deLocale })
    ) : '';

    const entries = Object.entries(payload)
        .filter(([key]) => key !== 'date' && tagMap.has(key) && (payload[key] as number) > 0)
        .map(([key, value]) => ({
            name: tagMap.get(key),
            value: value as number,
            color: colors[key]
        }))
        .sort((a, b) => b.value - a.value);

    return (
        <AnimatePresence>
            <motion.div {...animation} className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="bg-slate-700/50 p-3 rounded-lg relative">
                    <button onClick={onClose} className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-slate-600/50" aria-label="Fixierten Tooltip schließen">
                        <X className="h-4 w-4 text-slate-400" />
                    </button>
                    <h4 className="font-bold text-white mb-2">{formattedLabel}</h4>
                    <div className="space-y-1.5">
                        {entries.map((entry) => (
                            <div key={entry.name} className="flex justify-between items-center text-sm gap-4">
                                <div className="flex items-center gap-2 truncate">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                    <span className="text-slate-300 truncate" style={{ color: entry.color }}>{entry.name}</span>
                                </div>
                                <span className="font-mono text-white font-semibold flex-shrink-0">
                                    {formatCurrency(entry.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
