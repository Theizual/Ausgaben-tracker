import React, { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Category, Group } from '@/shared/types';
import { getIconComponent, ChevronDown, ProgressBar } from '@/shared/ui';

interface BudgetGroupProps {
    group: Group;
    categories: Category[];
    groupTotalBudget: number;
    groupBudgetInputs: Record<string, string>;
    categoryBudgetInputs: Record<string, string>;
    onGroupBudgetChange: (value: string) => void;
    onIndividualBudgetChange: (category: Category, value: string) => void;
    onCommitGroup: () => void;
    onCommitCategory: (categoryId: string) => void;
    isExpanded: boolean;
    onToggle: () => void;
    focusedInputRef: React.MutableRefObject<string | null>;
}

export const BudgetGroup: FC<BudgetGroupProps> = React.memo(({
    group,
    categories,
    groupTotalBudget,
    groupBudgetInputs,
    categoryBudgetInputs,
    onGroupBudgetChange,
    onIndividualBudgetChange,
    onCommitGroup,
    onCommitCategory,
    isExpanded,
    onToggle,
    focusedInputRef
}) => {
    const GroupIcon = getIconComponent(group.icon);
    
    return (
        <div className="bg-slate-700/30 p-2 rounded-lg">
            <div className="flex justify-between items-center gap-2">
                <button onClick={onToggle} className="flex items-center gap-3 text-left flex-grow rounded-md -m-2 p-2 min-w-0">
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                    <GroupIcon className="h-5 w-5 flex-shrink-0" style={{ color: group.color }} />
                    <h4 className="text-sm font-semibold text-white truncate">{group.name}</h4>
                </button>
                <div className="w-full sm:w-36 flex-shrink-0 flex items-center bg-slate-700 border border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-rose-500 px-3" onClick={e => e.stopPropagation()}>
                    <span className="text-slate-400 text-sm">€</span>
                    <input
                        id={`group-${group.id}`}
                        type="text"
                        inputMode="decimal"
                        value={groupBudgetInputs[group.id] || ''}
                        onChange={e => onGroupBudgetChange(e.currentTarget.value)}
                        onFocus={() => focusedInputRef.current = `group-${group.id}`}
                        onBlur={onCommitGroup}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        placeholder="Gesamt"
                        className="w-full bg-transparent border-none pl-2 py-1.5 text-right text-white text-sm font-semibold placeholder-slate-500 focus:outline-none"
                    />
                </div>
            </div>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: '0.75rem' }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-2 border-t border-slate-600/50 space-y-1.5">
                            {categories.map(category => {
                                const Icon = getIconComponent(category.icon);
                                return (
                                    <div key={category.id} className="flex flex-col">
                                        <div className="flex justify-between items-center text-sm mb-0.5">
                                            <div className="flex items-center gap-3 truncate">
                                                <Icon className="h-4 w-4 flex-shrink-0" style={{ color: category.color }} />
                                                <span className="font-medium text-white truncate">{category.name}</span>
                                            </div>
                                            <div className="w-28 flex-shrink-0 ml-2 flex items-center bg-slate-700 border border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-rose-500 px-3">
                                                 <span className="text-slate-400 text-sm">€</span>
                                                <input
                                                    id={`cat-${category.id}`}
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={categoryBudgetInputs[category.id] ?? ''}
                                                    onChange={e => onIndividualBudgetChange(category, e.target.value)}
                                                    onFocus={() => focusedInputRef.current = `cat-${category.id}`}
                                                    onBlur={() => onCommitCategory(category.id)}
                                                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                                                    placeholder="Budget"
                                                     className="w-full bg-transparent border-none pl-2 py-1.5 text-right text-white text-sm placeholder-slate-500 focus:outline-none"
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
});
