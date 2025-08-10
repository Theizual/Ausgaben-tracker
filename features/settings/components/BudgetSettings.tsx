







import React, { useState, useMemo, useCallback, useEffect, FC, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import type { Category, RecurringTransaction } from '@/shared/types';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { getIconComponent, Plus, Trash2, Edit, ChevronDown, ProgressBar, Button } from '@/shared/ui';
import { FIXED_COSTS_GROUP_ID } from '@/constants';
import { generateUUID } from '@/shared/utils/uuid';
import { BudgetGroup } from './BudgetGroup';

const MotionDiv = motion.div;

const BASE_INPUT_CLASSES = "w-full bg-theme-input border border-theme-border rounded-md px-3 py-2 text-white placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-ring";

export const BudgetSettings: FC = () => {
    const {
        flexibleCategories,
        upsertCategory,
        groupNames,
        totalMonthlyBudget, // flex budget
        totalMonthlyFixedCosts,
        fixedCategories,
        recurringTransactions,
        addRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
        categories,
        groupMap,
    } = useApp();

    // --- State for Flexible Budgets ---
    const [flexExpandedGroups, setFlexExpandedGroups] = useState<string[]>(() => {
        const initialGroups = groupNames.filter(g => groupMap.get(g) !== FIXED_COSTS_GROUP_ID);
        return initialGroups.length > 0 ? [initialGroups[0]] : [];
    });
    const [groupBudgetInputs, setGroupBudgetInputs] = useState<Record<string, string>>({});
    const [categoryBudgetInputs, setCategoryBudgetInputs] = useState<Record<string, string>>({});
    const focusedInputRef = useRef<string | null>(null);

    // --- State for Fixed & Other Recurring ---
    const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);
    
    // --- State for Main Accordions ---
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);


    // --- Memos & Calculations ---
    const totalOverallBudget = totalMonthlyBudget + totalMonthlyFixedCosts;
    const flexPercentage = totalOverallBudget > 0 ? (totalMonthlyBudget / totalOverallBudget) * 100 : 0;
    const fixedPercentage = totalOverallBudget > 0 ? (totalMonthlyFixedCosts / totalOverallBudget) * 100 : 0;
    const flexColor = '#0ea5e9'; // sky-500
    const fixedColor = '#e11d48'; // theme-primary rose-600
    
    const recurringMapByCatId = useMemo(() => {
        const map = new Map<string, RecurringTransaction>();
        recurringTransactions.forEach(rt => map.set(rt.categoryId, rt));
        return map;
    }, [recurringTransactions]);

    const nonFixedRecurring = useMemo(() => {
        const fixedCatIds = new Set(fixedCategories.map(c => c.id));
        return recurringTransactions.filter(rt => !fixedCatIds.has(rt.categoryId));
    }, [recurringTransactions, fixedCategories]);


    // --- Handlers for Flexible Budgets ---
    const toggleFlexGroup = useCallback((groupName: string) => {
        setFlexExpandedGroups(prev =>
            prev.includes(groupName)
                ? prev.filter(g => g !== groupName)
                : [...prev, groupName]
        );
    }, []);

    const handleIndividualBudgetChange = useCallback((category: Category, value: string) => {
        setCategoryBudgetInputs(prev => ({ ...prev, [category.id]: value }));
        
        const trimmedValue = value.trim();
        const budgetValue = Number(trimmedValue.replace(',', '.'));
        const newBudget = !isNaN(budgetValue) && budgetValue >= 0 ? budgetValue : undefined;
        
        if (newBudget !== category.budget) {
            upsertCategory({ ...category, budget: newBudget });
        }
    }, [upsertCategory]);

    const handleGroupBudgetChange = useCallback((groupName: string, newTotalStr: string) => {
        setGroupBudgetInputs(prev => ({ ...prev, [groupName]: newTotalStr }));
        const newTotal = parseFloat(newTotalStr.replace(',', '.'));
        if (isNaN(newTotal) || newTotal < 0) return;

        const groupId = Array.from(groupMap.entries()).find(([, name]) => name === groupName)?.[0];
        if (!groupId) return;

        const groupCategories = flexibleCategories.filter(c => c.groupId === groupId);
        if (groupCategories.length === 0) return;

        const currentTotal = groupCategories.reduce((sum, cat) => sum + (cat.budget || 0), 0);
        const newTotalInCents = Math.round(newTotal * 100);

        let updatedCategoriesData: Partial<Category>[] = [];
        if (currentTotal > 0) {
            const ratio = newTotalInCents / (currentTotal * 100);
            let runningTotalCents = 0;
            updatedCategoriesData = groupCategories.map((cat, index) => {
                const isLast = index === groupCategories.length - 1;
                let newBudgetCents;
                if(isLast) {
                    newBudgetCents = newTotalInCents - runningTotalCents;
                } else {
                    newBudgetCents = Math.round((cat.budget || 0) * 100 * ratio);
                    runningTotalCents += newBudgetCents;
                }
                return { ...cat, budget: newBudgetCents / 100 };
            });
        } else if (newTotal > 0) {
            const numCategories = groupCategories.length;
            const baseAmountCents = Math.floor(newTotalInCents / numCategories);
            let remainderCents = newTotalInCents % numCategories;
            updatedCategoriesData = groupCategories.map(cat => {
                let itemCents = baseAmountCents;
                if(remainderCents > 0){ itemCents++; remainderCents--; }
                return { ...cat, budget: itemCents / 100 };
            });
        } else {
             updatedCategoriesData = groupCategories.map(cat => ({ ...cat, budget: 0 }));
        }
        
        updatedCategoriesData.forEach(catData => { if (catData.id) upsertCategory(catData as Category) });
    }, [flexibleCategories, upsertCategory, groupMap]);
    
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


    // --- Data for Rendering ---
    const groupedBudgetData = useMemo(() => {
        const groupsToBudget = groupNames.filter(gName => groupMap.get(Array.from(groupMap.keys()).find(key => groupMap.get(key) === gName) || '') !== FIXED_COSTS_GROUP_ID);

        return groupsToBudget
            .map(groupName => {
                const groupId = Array.from(groupMap.keys()).find(key => groupMap.get(key) === groupName);
                if (!groupId) return null;
                const groupCategories = flexibleCategories.filter(c => c.groupId === groupId);

                const sortedCategories = [...groupCategories].sort((a, b) => (b.budget || 0) - (a.budget || 0));
                const groupTotalBudget = groupCategories.reduce((sum, cat) => sum + (cat.budget || 0), 0);
                return { groupName, categories: sortedCategories, groupTotalBudget };
            })
            .filter((g): g is NonNullable<typeof g> => g !== null && g.categories.length > 0);
    }, [flexibleCategories, groupNames, groupMap]);
    
    // Effect to update non-focused inputs
    useEffect(() => {
        const newGroupInputs: Record<string, string> = {};
        const newCatInputs: Record<string, string> = {};

        groupedBudgetData.forEach(group => {
            if (focusedInputRef.current !== `group-${group.groupName}`) {
                newGroupInputs[group.groupName] = group.groupTotalBudget > 0 ? group.groupTotalBudget.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
            }
            group.categories.forEach(category => {
                if (focusedInputRef.current !== `cat-${category.id}`) {
                    newCatInputs[category.id] = category.budget ? category.budget.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
                }
            });
        });
        setGroupBudgetInputs(prev => ({ ...prev, ...newGroupInputs }));
        setCategoryBudgetInputs(prev => ({ ...prev, ...newCatInputs }));
    }, [groupedBudgetData, totalMonthlyBudget]);

     const handleGroupBudgetBlur = (groupName: string) => {
        focusedInputRef.current = null;
        setGroupBudgetInputs(p => ({
            ...p,
            [groupName]: (parseFloat((p[groupName] || '0').replace(',', '.')) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        }));
    };

    const handleIndividualBudgetBlur = (categoryId: string) => {
        focusedInputRef.current = null;
        setCategoryBudgetInputs(p => ({
            ...p,
            [categoryId]: (parseFloat((p[categoryId] || '0').replace(',', '.')) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        }));
    };

    return (
        <MotionDiv key="budget" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            <h3 className="text-lg font-semibold text-white mb-1">Budgetverwaltung</h3>
            <p className="text-sm text-slate-400 mb-6">Verwalten Sie hier Ihr gesamtes monatliches Budget, aufgeteilt in flexible Ausgaben und Fixkosten.</p>
            
            <div className="mb-6 bg-slate-800/50 p-3 rounded-lg border border-slate-700 space-y-2">
                 <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold text-white">Gesamtbudget-Verteilung</h4>
                    <p className="font-bold text-lg text-white">{formatCurrency(totalOverallBudget)}</p>
                </div>
                <div className="flex justify-between items-baseline">
                    <div className="text-left">
                        <p className="text-xs text-slate-300">Flexibles Budget</p>
                        <p className="text-white text-md">{formatCurrency(totalMonthlyBudget)}</p>
                    </div>
                     <div className="text-right">
                        <p className="text-xs text-slate-300">Monatliche Fixkosten</p>
                        <p className="text-white text-md">{formatCurrency(totalMonthlyFixedCosts)}</p>
                    </div>
                </div>
                {totalOverallBudget > 0 && (
                    <div className="w-full flex h-1.5 rounded-full overflow-hidden bg-slate-900/50">
                        <motion.div style={{ backgroundColor: flexColor }} className="h-full" title={`Flexible Budgets: ${flexPercentage.toFixed(0)}%`} initial={{ width: '0%' }} animate={{ width: `${flexPercentage}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
                        <motion.div style={{ backgroundColor: fixedColor }} className="h-full" title={`Fixkosten: ${fixedPercentage.toFixed(0)}%`} initial={{ width: '0%' }} animate={{ width: `${fixedPercentage}%` }} transition={{ duration: 0.8, ease: "easeOut" }}/>
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
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="p-3 border-t border-slate-600/50 space-y-3">
                                <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Flexibles Budget</h5>
                                {groupedBudgetData.map(group => (
                                    <BudgetGroup
                                        key={group.groupName}
                                        groupName={group.groupName}
                                        categories={group.categories}
                                        groupTotalBudget={group.groupTotalBudget}
                                        groupBudgetInputs={groupBudgetInputs}
                                        categoryBudgetInputs={categoryBudgetInputs}
                                        onGroupBudgetChange={handleGroupBudgetChange}
                                        onIndividualBudgetChange={handleIndividualBudgetChange}
                                        onGroupBudgetBlur={handleGroupBudgetBlur}
                                        onIndividualBudgetBlur={handleIndividualBudgetBlur}
                                        isExpanded={flexExpandedGroups.includes(group.groupName)}
                                        onToggle={() => toggleFlexGroup(group.groupName)}
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
                                                <div key={category.id}><div className="flex items-center gap-3"><Icon className="h-5 w-5 flex-shrink-0" style={{color: category.color}} /><span className="flex-1 font-medium text-white truncate">{category.name}</span><div className="relative w-28 flex-shrink-0 ml-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span><input type="text" inputMode="decimal" defaultValue={rec?.amount ? rec.amount.toString().replace('.', ',') : ''} onBlur={e => handleFixedAmountUpdate(category.id, e.currentTarget.value)} onKeyDown={e => {if (e.key === 'Enter') (e.target as HTMLInputElement).blur()}} placeholder="Betrag" className="w-full bg-theme-input border border-theme-border rounded-md pl-7 pr-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-theme-ring"/></div></div><div className="pl-8 mt-1.5"><ProgressBar percentage={(rec?.amount || 0) / (totalMonthlyFixedCosts || 1) * 100} color={category.color} className="h-1.5" /></div></div>
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
                                <select value={item.categoryId} onChange={e => handleUpdateNonFixed(item.id, {categoryId: e.currentTarget.value})} className={BASE_INPUT_CLASSES}>
                                    {categories.filter(c => c.groupId !== FIXED_COSTS_GROUP_ID).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <input type="date" value={format(parseISO(item.startDate), 'yyyy-MM-dd')} onChange={e => handleUpdateNonFixed(item.id, {startDate: e.currentTarget.value})} className={BASE_INPUT_CLASSES}/>
                                <select value={item.frequency} onChange={e => { const val = e.currentTarget.value; if(val === 'monthly' || val === 'yearly') handleUpdateNonFixed(item.id, {frequency: val}); }} className={BASE_INPUT_CLASSES}>
                                    <option value="monthly">Monatlich</option><option value="yearly">Jährlich</option>
                                </select>
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
        </MotionDiv>
    );
};