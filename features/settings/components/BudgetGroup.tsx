import React, { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Category } from '@/shared/types';
import { getIconComponent, ChevronDown, ProgressBar } from '@/shared/ui';

interface BudgetGroupProps {
    groupName: string;
    categories: Category[];
    groupTotalBudget: number;
    groupBudgetInputs: Record<string, string>;
    categoryBudgetInputs: Record<string, string>;
    onGroupBudgetChange: (groupName: string, value: string) => void;
    onIndividualBudgetChange: (category: Category, value: string) => void;
    onGroupBudgetBlur: (groupName: string) => void;
    onIndividualBudgetBlur: (categoryId: string) => void;
    isExpanded: boolean;
    onToggle: () => void;
    focusedInputRef: React.MutableRefObject<string | null>;
}

export const BudgetGroup: FC<BudgetGroupProps> = ({
    groupName,
    categories,
    groupTotalBudget,
    groupBudgetInputs,
    categoryBudgetInputs,
    onGroupBudgetChange,
    onIndividualBudgetChange,
    onGroupBudgetBlur,
    onIndividualBudgetBlur,
    isExpanded,
    onToggle,
    focusedInputRef
}) => {
    return (
        <div className="bg-slate-700/30 p-2.5 rounded-lg">
            <button onClick={onToggle} className="w-full flex justify-between items-center gap-2 text-left">
                <h4 className="text-sm font-semibold text-white truncate">{groupName}</h4>
                <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-36 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={groupBudgetInputs[groupName] || ''}
                            onChange={e => onGroupBudgetChange(groupName, e.currentTarget.value)}
                            onFocus={() => focusedInputRef.current = `group-${groupName}`}
                            onBlur={() => onGroupBudgetBlur(groupName)}
                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                            placeholder="Gesamt"
                            className="w-full bg-theme-input border border-theme-border rounded-md pl-7 pr-2 py-0.5 text-white text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-theme-ring"
                        />
                    </div>
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: '0.75rem' }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-2 border-t border-slate-600/50 space-y-2">
                            {categories.map(category => {
                                const Icon = getIconComponent(category.icon);
                                return (
                                    <div key={category.id} className="flex flex-col">
                                        <div className="flex justify-between items-center text-sm mb-1">
                                            <div className="flex items-center gap-3 truncate">
                                                <Icon className="h-4 w-4 flex-shrink-0" style={{ color: category.color }} />
                                                <span className="font-medium text-white truncate">{category.name}</span>
                                            </div>
                                            <div className="relative w-28 flex-shrink-0 ml-2">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={categoryBudgetInputs[category.id] ?? ''}
                                                    onChange={e => onIndividualBudgetChange(category, e.target.value)}
                                                    onFocus={() => focusedInputRef.current = `cat-${category.id}`}
                                                    onBlur={() => onIndividualBudgetBlur(category.id)}
                                                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                                                    placeholder="Budget"
                                                    className="w-full bg-theme-input border border-theme-border rounded-md pl-7 pr-2 py-0.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-theme-ring"
                                                />
                                            </div>
                                        </div>
                                        <ProgressBar percentage={(category.budget || 0) / (groupTotalBudget || 1) * 100} color={category.color} className="h-1.5" />
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
