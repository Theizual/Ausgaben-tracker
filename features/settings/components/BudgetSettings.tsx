import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import type { Category, RecurringTransaction, Group } from '@/shared/types';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { getIconComponent, Plus, Trash2, Edit, ChevronDown, ProgressBar, Button, Wallet, Home } from '@/shared/ui';
import { FIXED_COSTS_GROUP_ID, COLOR_FLEX_BUDGET, COLOR_FIXED_BUDGET } from '@/constants';
import { generateUUID } from '@/shared/utils/uuid';
import { BudgetGroup } from './BudgetGroup';
import { settingsContentAnimation } from '@/shared/lib/animations';

const BASE_INPUT_CLASSES = "w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500";

export const BudgetSettings = () => {
    const {
        flexibleCategories,
        upsertCategory,
        upsertMultipleCategories,
        groups,
        totalMonthlyBudget, // flex budget
        totalMonthlyFixedCosts,
        fixedCategories,
        recurringTransactions,
        addRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
        categories,
    } = useApp();

    // --- State for Flexible Budgets ---
    const [flexExpandedGroups, setFlexExpandedGroups] = useState<string[]>(() => {
        const initialGroups = groups.filter(g => g.id !== FIXED_COSTS_GROUP_ID);
        return initialGroups.length > 0 ? [initialGroups[0].id] : [];
    });
    const [localGroupBudgets, setLocalGroupBudgets] = useState<Record<string, string>>({});
    const [localCategoryBudgets, setLocalCategoryBudgets] = useState<Record<string, string>>({});
    const focusedInputRef = useRef<string | null>(null);

    // --- State for Fixed & Other Recurring ---
    const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);
    
    // --- State for Main Accordions ---
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);


    // --- Memos & Calculations ---
    const totalOverallBudget = totalMonthlyBudget + totalMonthlyFixedCosts;
    const flexPercentage = totalOverallBudget > 0 ? (totalMonthlyBudget / totalOverallBudget) * 100 : 0;
    const fixedPercentage = totalOverallBudget > 0 ? (totalMonthlyFixedCosts / totalOverallBudget) * 100 : 0;
    const flexBarColor = COLOR_FLEX_BUDGET;
    const fixedBarColor = COLOR_FIXED_BUDGET;
    
    const fixedGroup = useMemo(() => groups.find(g => g.id === FIXED_COSTS_GROUP_ID), [groups]);
    const fixedIconColor = fixedGroup?.color || fixedBarColor; 
    const FixedIcon = getIconComponent(fixedGroup?.icon || 'Home');
    
    const recurringMapByCatId = useMemo(() => {
        const map = new Map<string, RecurringTransaction>();
        recurringTransactions.forEach(rt => map.set(rt.categoryId, rt));
        return map;
    }, [recurringTransactions]);

    const nonFixedRecurring = useMemo(() => {
        const fixedCatIds = new Set(fixedCategories.map(c => c.id));
        return recurringTransactions.filter(rt => !fixedCatIds.has(rt.categoryId));
    }, [recurringTransactions, fixedCategories]);

    const groupedBudgetData = useMemo(() => {
        return groups
            .filter(g => g.id !== FIXED_COSTS_GROUP_ID)
            .map(group => {
                const groupCategories = flexibleCategories.filter(c => c.groupId === group.id);
                if (groupCategories.length === 0) return null;
                const sortedCategories = [...groupCategories].sort((a, b) => (b.budget || 0) - (a.budget || 0));
                const groupTotalBudget = groupCategories.reduce((sum, cat) => sum + (cat.budget || 0), 0);
                return { group, categories: sortedCategories, groupTotalBudget };
            })
            .filter((g): g is NonNullable<typeof g> => g !== null);
    }, [flexibleCategories, groups]);

    // --- Sync props to local state ---
    useEffect(() => {
        const newGroupInputs = { ...localGroupBudgets };
        const newCatInputs = { ...localCategoryBudgets };

        groupedBudgetData.forEach(({ group, categories, groupTotalBudget }) => {
            if (focusedInputRef.current !== `group-${group.id}`) {
                const formatted = groupTotalBudget > 0 ? groupTotalBudget.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
                newGroupInputs[group.id] = formatted;
            }
            categories.forEach(category => {
                if (focusedInputRef.current !== `cat-${category.id}`) {
                    const budgetVal = category.budget || 0;
                    const formatted = budgetVal > 0 ? budgetVal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
                    newCatInputs[category.id] = formatted;
                }
            });
        });
        setLocalGroupBudgets(newGroupInputs);
        setLocalCategoryBudgets(newCatInputs);
    }, [flexibleCategories, groups, groupedBudgetData]); // Rerun when global state changes

    // --- Handlers for Flexible Budgets ---
    const handleLocalGroupBudgetChange = useCallback((groupId: string, value: string) => {
        setLocalGroupBudgets(prev => ({ ...prev, [groupId]: value }));
    }, []);
    
    const handleCommitGroupBudget = useCallback((groupId: string) => {
        focusedInputRef.current = null;
        const value = localGroupBudgets[groupId];
        if (value === undefined) return;

        const newTotal = parseFloat(value.replace(/\./g, '').replace(',', '.'));
        if (isNaN(newTotal) || newTotal < 0) return;

        const groupCategories = flexibleCategories.filter(c => c.groupId === groupId);
        if (groupCategories.length === 0) return;

        const currentTotalInCents = groupCategories.reduce((sum, cat) => sum + Math.round((cat.budget || 0) * 100), 0);
        const newTotalInCents = Math.round(newTotal * 100);

        if (newTotalInCents === currentTotalInCents) return;

        let updatedCategoriesData: { id: string, budget: number }[] = [];

        if (newTotalInCents === 0) {
            updatedCategoriesData = groupCategories.map(cat => ({ id: cat.id, budget: 0 }));
        } else if (currentTotalInCents === 0) {
            const baseAmountCents = Math.floor(newTotalInCents / groupCategories.length);
            let remainderCents = newTotalInCents % groupCategories.length;
            updatedCategoriesData = groupCategories.map(cat => {
                let itemCents = baseAmountCents;
                if (remainderCents > 0) { itemCents++; remainderCents--; }
                return { id: cat.id, budget: itemCents / 100 };
            });
        } else {
            const rawBudgets = groupCategories.map(cat => {
                const catBudgetCents = Math.round((cat.budget || 0) * 100);
                const rawNewCents = (catBudgetCents / currentTotalInCents) * newTotalInCents;
                return { id: cat.id, raw: rawNewCents, floor: Math.floor(rawNewCents), remainder: rawNewCents - Math.floor(rawNewCents) };
            });
            rawBudgets.sort((a, b) => b.remainder - a.remainder);
            const totalFlooredCents = rawBudgets.reduce((sum, b) => sum + b.floor, 0);
            let remainderToDistribute = newTotalInCents - totalFlooredCents;
            updatedCategoriesData = rawBudgets.map(b => {
                let centsToAdd = 0;
                if (remainderToDistribute > 0) { centsToAdd = 1; remainderToDistribute--; }
                return { id: b.id, budget: (b.floor + centsToAdd) / 100 };
            });
        }

        if (updatedCategoriesData.length > 0) {
            upsertMultipleCategories(updatedCategoriesData);
        }
    }, [localGroupBudgets, flexibleCategories, upsertMultipleCategories]);

    const handleLocalIndividualBudgetChange = useCallback((categoryId: string, value: string) => {
        setLocalCategoryBudgets(prev => ({ ...prev, [categoryId]: value }));
    }, []);

    const handleCommitIndividualBudget = useCallback((categoryId: string) => {
        focusedInputRef.current = null;
        const value = localCategoryBudgets[categoryId];
        if(value === undefined) return;

        const category = flexibleCategories.find(c => c.id === categoryId);
        if (!category) return;

        const newBudgetNum = parseFloat(value.replace(/\./g, '').replace(',', '.'));
        const newBudget = isNaN(newBudgetNum) || newBudgetNum < 0 ? 0 : newBudgetNum;

        const newBudgetCents = Math.round(newBudget * 100);
        const currentBudgetCents = Math.round((category.budget || 0) * 100);

        if (newBudgetCents !== currentBudgetCents) {
            upsertCategory({ id: categoryId, budget: newBudget });
        }
    }, [localCategoryBudgets, flexibleCategories, upsertCategory]);

    const toggleFlexGroup = useCallback((groupId: string) => {
        setFlexExpandedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(g => g !== groupId)
                : [...prev, groupId]
        );
    }, []);
    
    // --- Handlers for Fixed & Recurring Costs ---
    const handleFixedAmountUpdate = (categoryId: string, amountStr: string) => {
        const amount = parseFloat(amountStr.replace(',', '.'));
        if (isNaN(amount) || amount < 0) return;

        const existingRec = recurringMapByCatId.get(categoryId);
        if (existingRec) {
            if (existingRec.amount !== amount) {
                updateRecurringTransaction({ ...existingRec, amount });
                toast.success("Fixkostenbetrag aktualisiert.");
            }
        } else {
            const newId = generateUUID();
            addRecurringTransaction({
                amount,
                description: fixedCategories.find(c => c.id === categoryId)?.name || 'Fixkosten',
                categoryId,
                frequency: 'monthly',
                startDate: new Date().toISOString().split('T')[0]
            }, newId);
            toast.success("Fixkostenbetrag hinzugefügt.");
        }
    };
    
    const handleAddNonFixed = useCallback(() => {
        const newId = generateUUID();
        const firstFlexCategory = categories.find(c => c.groupId !== FIXED_COSTS_GROUP_ID);
        addRecurringTransaction({ amount: 0, description: 'Neue Ausgabe', categoryId: firstFlexCategory?.id || '', frequency: 'monthly', startDate: new Date().toISOString().split('T')[0] }, newId);
        setEditingRecurringId(newId);
    }, [categories, addRecurringTransaction]);

    const handleUpdateNonFixed = useCallback((id: string, updates: Partial<RecurringTransaction>) => {
        const itemToUpdate = nonFixedRecurring.find(r => r.id === id);
        if (itemToUpdate) updateRecurringTransaction({ ...itemToUpdate, ...updates });
    }, [nonFixedRecurring, updateRecurringTransaction]);

    const flexBarAnimation = {
        initial: { width: '0%' },
        animate: { width: `${flexPercentage}%` },
        transition: { duration: 0.8, ease: "easeOut" as const }
    };

    const fixedBarAnimation = {
        initial: { width: '0%' },
        animate: { width: `${fixedPercentage}%` },
        transition: { duration: 0.8, ease: "easeOut" as const }
    };
    
    const detailsAnimation = {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: 'auto' },
        exit: { opacity: 0, height: 0 }
    };

    return (
        <motion.div initial={settingsContentAnimation.initial} animate={settingsContentAnimation.animate} exit={settingsContentAnimation.exit} key="budget">
            <h3 className="text-lg font-semibold text-white mb-1">Budgetverwaltung</h3>
            <p className="text-sm text-slate-400 mb-6">Verwalten Sie hier Ihr gesamtes monatliches Budget, aufgeteilt in flexible Ausgaben und Fixkosten.</p>
            
            <div className="mb-6 bg-slate-800/50 p-3 rounded-lg border border-slate-700 space-y-2">
                 <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold text-white">Gesamtbudget-Verteilung</h4>
                    <p className="font-bold text-lg text-white">{formatCurrency(totalOverallBudget)}</p>
                </div>
                <div className="flex justify-between items-baseline">
                    <div className="text-left">
                        <p className="text-xs text-slate-300 flex items-center gap-1.5"><Wallet className="h-3 w-3" style={{ color: flexBarColor }} />Flexibles Budget</p>
                        <p className="text-white text-md font-semibold">{formatCurrency(totalMonthlyBudget)}</p>
                    </div>
                     <div className="text-right">
                        <p className="text-xs text-slate-300 flex items-center gap-1.5 justify-end">Monatliche Fixkosten<FixedIcon className="h-3 w-3" style={{ color: fixedIconColor }} /></p>
                        <p className="text-white text-md font-semibold">{formatCurrency(totalMonthlyFixedCosts)}</p>
                    </div>
                </div>
                {totalOverallBudget > 0 ? (
                    <div className="w-full relative h-6 rounded-full overflow-hidden bg-slate-900/50 flex" aria-label="Gesamtbudgetverteilung: Flexibles Budget vs. Fixkosten">
                        {/* Layered approach for sharp dividing line */}
                        <motion.div
                            className="h-full flex items-center justify-center"
                            style={{ backgroundColor: flexBarColor }}
                            initial={flexBarAnimation.initial} animate={flexBarAnimation.animate} transition={flexBarAnimation.transition}
                            title={`Flexible Budgets: ${flexPercentage.toFixed(0)}%`}
                        >
                            {flexPercentage >= 10 && (
                                <span className="text-white text-xs font-bold drop-shadow-sm">{flexPercentage.toFixed(0)}%</span>
                            )}
                        </motion.div>
                        <motion.div
                            className="h-full flex items-center justify-center"
                            style={{ backgroundColor: fixedBarColor }}
                            initial={fixedBarAnimation.initial} animate={fixedBarAnimation.animate} transition={fixedBarAnimation.transition}
                            title={`Fixkosten: ${fixedPercentage.toFixed(0)}%`}
                        >
                            {fixedPercentage >= 10 && (
                                <span className="text-white text-xs font-bold drop-shadow-sm">{fixedPercentage.toFixed(0)}%</span>
                            )}
                        </motion.div>
                    </div>
                ) : (
                    <div className="w-full relative flex h-6 rounded-full overflow-hidden bg-slate-900/50" aria-label="Gesamtbudgetverteilung: Flexibles Budget vs. Fixkosten">
                        <div className="h-full flex-grow flex items-center justify-center">
                            <span className="text-slate-400 text-xs font-bold">0% / 0%</span>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="bg-slate-700/30 rounded-lg overflow-hidden mb-4">
                <button onClick={() => setIsDetailsExpanded(p => !p)} className="w-full flex justify-between items-center p-3 text-left hover:bg-slate-700/30">
                    <div className="flex items-center gap-3">
                         <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isDetailsExpanded ? 'rotate-180' : ''}`} />
                         <h4 className="font-bold text-white">Budget-Aufschlüsselung</h4>
                    </div>
                    <span className="font-bold text-white">{formatCurrency(totalMonthlyBudget)}</span>
                </button>
                <AnimatePresence>
                    {isDetailsExpanded && (
                        <motion.div initial={detailsAnimation.initial} animate={detailsAnimation.animate} exit={detailsAnimation.exit} className="overflow-hidden">
                            <div className="p-3 border-t border-slate-600/50 space-y-3">
                                <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Flexibles Budget</h5>
                                {groupedBudgetData.map(({ group, categories, groupTotalBudget }) => (
                                    <BudgetGroup
                                        key={group.id}
                                        group={group}
                                        categories={categories}
                                        groupTotalBudget={groupTotalBudget}
                                        groupBudgetInputs={localGroupBudgets}
                                        categoryBudgetInputs={localCategoryBudgets}
                                        onGroupBudgetChange={(value) => handleLocalGroupBudgetChange(group.id, value)}
                                        onIndividualBudgetChange={(catId, value) => handleLocalIndividualBudgetChange(catId, value)}
                                        onCommitGroup={() => handleCommitGroupBudget(group.id)}
                                        onCommitCategory={(catId) => handleCommitIndividualBudget(catId)}
                                        isExpanded={flexExpandedGroups.includes(group.id)}
                                        onToggle={() => toggleFlexGroup(group.id)}
                                        focusedInputRef={focusedInputRef}
                                    />
                                ))}
                                
                                <div className="pt-3 mt-3 border-t border-slate-700/50">
                                    <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Monatliche Fixkosten</h5>
                                    <div className="space-y-2">
                                        {fixedCategories.map(category => {
                                            const rec = recurringMapByCatId.get(category.id);
                                            const Icon = getIconComponent(category.icon);
                                            return (
                                                <div key={category.id}>
                                                    <div className="flex items-center gap-3">
                                                        <Icon className="h-5 w-5 flex-shrink-0" style={{color: category.color}} />
                                                        <span className="flex-1 font-medium text-white truncate">{category.name}</span>
                                                        <div className="flex items-center bg-slate-700 border border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-rose-500 w-24 flex-shrink-0 ml-2 px-3">
                                                          <span className="text-slate-400 text-sm">€</span>
                                                          <input type="text" inputMode="decimal" defaultValue={rec?.amount ? rec.amount.toString().replace('.', ',') : ''} onBlur={e => handleFixedAmountUpdate(category.id, e.currentTarget.value)} onKeyDown={e => {if (e.key === 'Enter') (e.target as HTMLInputElement).blur()}} placeholder="Betrag" className="w-full bg-transparent border-none pl-2 py-1.5 text-right text-white text-sm placeholder-slate-500 focus:outline-none"/>
                                                        </div>
                                                    </div>
                                                    <div className="pl-8 mt-1.5"><ProgressBar percentage={(rec?.amount || 0) / (totalMonthlyFixedCosts || 1) * 100} color={category.color} className="h-1.5" /></div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Other Recurring Transactions Section */}
            <div className="mt-8 pt-6 border-t border-slate-700/50">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Andere wiederkehrende Ausgaben</h3>
                    <Button onClick={handleAddNonFixed} variant="secondary" size="sm"><Plus className="h-4 w-4"/>Neue Ausgabe</Button>
                </div>
                <div className="space-y-3">
                    {nonFixedRecurring.map(item => {
                        const isEditing = editingRecurringId === item.id;
                        const category = categories.find(c => c.id === item.categoryId);
                        const Icon = getIconComponent(category?.icon);

                        return isEditing ? (
                            <div key={item.id} className="bg-slate-700/80 p-4 rounded-lg space-y-4 ring-2 ring-rose-500">
                               <input type="text" value={item.description} onChange={e => handleUpdateNonFixed(item.id, {description: e.currentTarget.value})} placeholder="Beschreibung" className={BASE_INPUT_CLASSES}/>
                               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <input type="number" value={item.amount} onChange={e => handleUpdateNonFixed(item.id, {amount: Number(e.currentTarget.value.replace(',', '.')) || 0})} placeholder="Betrag" className={BASE_INPUT_CLASSES}/>
                                <div className="relative">
                                    <select value={item.categoryId} onChange={e => handleUpdateNonFixed(item.id, {categoryId: e.currentTarget.value})} className={`${BASE_INPUT_CLASSES} appearance-none pr-10`}>
                                        {categories.filter(c => c.groupId !== FIXED_COSTS_GROUP_ID).map(c => <option key={c.id} value={c.id} className="bg-slate-800 text-white">{c.name}</option>)}
                                    </select>
                                     <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                                </div>
                                <input type="date" value={format(parseISO(item.startDate), 'yyyy-MM-dd')} onChange={e => handleUpdateNonFixed(item.id, {startDate: e.currentTarget.value})} className={BASE_INPUT_CLASSES}/>
                                <div className="relative">
                                    <select value={item.frequency} onChange={e => { const val = e.currentTarget.value; if(val === 'monthly' || val === 'yearly') handleUpdateNonFixed(item.id, {frequency: val}); }} className={`${BASE_INPUT_CLASSES} appearance-none pr-10`}>
                                        <option value="monthly" className="bg-slate-800 text-white">Monatlich</option><option value="yearly" className="bg-slate-800 text-white">Jährlich</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                                </div>
                               </div>
                               <div className="flex justify-end gap-2"><Button variant="link" onClick={() => setEditingRecurringId(null)} className="px-3 py-1">Fertig</Button></div>
                            </div>
                        ) : (
                            <div key={item.id} className="flex items-center gap-4 bg-slate-700/50 p-3 rounded-lg">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: category?.color || '#64748b' }}><Icon className="h-5 w-5 text-white" /></div>
                                <div className="flex-1"><p className="font-semibold text-white">{item.description}</p><p className="text-sm text-slate-400">{category?.name} &bull; {item.frequency === 'monthly' ? 'Monatlich' : 'Jährlich'} ab {format(parseISO(item.startDate), 'dd.MM.yyyy')}</p></div>
                                <div className="font-bold text-white text-lg">{formatCurrency(item.amount)}</div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon-auto" onClick={() => setEditingRecurringId(item.id)}><Edit className="h-4 w-4 text-slate-400"/></Button>
                                    <Button variant="destructive-ghost" size="icon-auto" onClick={() => {if(window.confirm('Diese wiederkehrende Ausgabe löschen?')) deleteRecurringTransaction(item.id)}}><Trash2 className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
};