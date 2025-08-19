import React, { FC, useState, useEffect, FormEvent, useMemo } from 'react';
import { Modal, Button, Trash2, Plus } from '@/shared/ui';
import { WeeklyPlan, CustomShoppingListItem, Recipe, Ingredient } from '@/shared/types';
import { toast } from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import { getWeek, startOfWeek, parseISO } from 'date-fns';
import { generateUUID } from '@/shared/utils/uuid';
import { clsx } from 'clsx';


interface ShoppingListModalProps {
    plan: WeeklyPlan;
    allRecipes: Recipe[];
    onClose: () => void;
}

interface ShoppingListItem {
    name: string;
    checked: boolean;
    isCustom?: boolean;
    id?: string;
}

interface CategorizedList {
    category: string;
    items: ShoppingListItem[];
}

const CATEGORY_ORDER = ['Obst & Gemüse', 'Fleisch & Fisch', 'Milchprodukte & Eier', 'Backwaren', 'Trockenwaren & Konserven', 'Gewürze & Öle', 'Sonstiges'];


export const ShoppingListModal: FC<ShoppingListModalProps> = ({ plan, allRecipes, onClose }) => {
    const { shoppingLists, setShoppingLists } = useApp();
    const [activeTab, setActiveTab] = useState<'shopping' | 'owned'>('shopping');

    const weekKey = useMemo(() => {
        if (!plan) return '';
        const start = startOfWeek(parseISO(plan.days[0].dateISO), { weekStartsOn: 1 });
        const year = start.getFullYear();
        const week = getWeek(start, { weekStartsOn: 1 });
        return `${year}-W${String(week).padStart(2, '0')}`;
    }, [plan]);

    const [list, setList] = useState<CategorizedList[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('Sonstiges');
    
    const persistChanges = (newList: CategorizedList[]) => {
        const checkedItems: string[] = [];
        const customItems: CustomShoppingListItem[] = [];

        newList.forEach(cat => {
            cat.items.forEach(item => {
                if (item.isCustom && item.id) {
                    customItems.push({ id: item.id, name: item.name, category: cat.category, checked: item.checked });
                } else if (!item.isCustom && item.checked) {
                    checkedItems.push(item.name);
                }
            });
        });

        setShoppingLists(prev => {
            const existing = prev[weekKey];
            return {
                ...prev,
                [weekKey]: {
                    weekKey,
                    checkedItems,
                    customItems,
                    lastModified: new Date().toISOString(),
                    version: (existing?.version || 0) + 1,
                }
            };
        });
    };

    useEffect(() => {
        const recipeMap = new Map(allRecipes.map(r => [r.id, r]));
        
        const allIngredients: Ingredient[] = [];
        plan.days
            .filter(meal => meal.isConfirmed) // Nur bestätigte Rezepte berücksichtigen
            .forEach(meal => {
                const recipe = recipeMap.get(meal.recipeId);
                if (recipe?.ingredients) {
                    allIngredients.push(...recipe.ingredients);
                }
            });
        
        const categorized = allIngredients.reduce((acc: Record<string, Set<string>>, ingredient) => {
            if (!acc[ingredient.category]) {
                acc[ingredient.category] = new Set();
            }
            acc[ingredient.category].add(ingredient.name);
            return acc;
        }, {} as Record<string, Set<string>>);
        
        const savedState = shoppingLists[weekKey] || { checkedItems: [], customItems: [] };
        const checkedSet = new Set(savedState.checkedItems);
        
        let generatedList: CategorizedList[] = Object.entries(categorized)
            .map(([category, itemsSet]) => ({
                category,
                items: [...itemsSet].sort().map(name => ({ name: name, checked: checkedSet.has(name) }))
            }))
            .sort((a,b) => {
                const indexA = CATEGORY_ORDER.indexOf(a.category);
                const indexB = CATEGORY_ORDER.indexOf(b.category);
                if(indexA === -1) return 1;
                if(indexB === -1) return -1;
                return indexA - indexB;
            });

        // Add custom items
        savedState.customItems.forEach(customItem => {
            let categoryGroup = generatedList.find(c => c.category === customItem.category);
            if (!categoryGroup) {
                categoryGroup = { category: customItem.category, items: [] };
                generatedList.push(categoryGroup);
            }
            categoryGroup.items.push({ name: customItem.name, checked: customItem.checked, isCustom: true, id: customItem.id });
        });
        
        setList(generatedList.filter(c => c.items.length > 0));

    }, [plan, allRecipes, shoppingLists, weekKey]);

    const handleToggleItem = (catIndex: number, itemIndex: number) => {
        const newList = [...list];
        newList[catIndex].items[itemIndex].checked = !newList[catIndex].items[itemIndex].checked;
        setList(newList);
        persistChanges(newList);
    };

    const handleDeleteItem = (catIndex: number, itemIndex: number) => {
        const newList = [...list];
        newList[catIndex].items.splice(itemIndex, 1);
        const filteredList = newList.filter(c => c.items.length > 0)
        setList(filteredList);
        persistChanges(filteredList);
    };

    const handleAddItem = (e: FormEvent) => {
        e.preventDefault();
        const trimmedName = newItemName.trim();
        if (!trimmedName) return;

        const newList = [...list];
        let categoryGroup = newList.find(c => c.category === newItemCategory);
        if (!categoryGroup) {
            categoryGroup = { category: newItemCategory, items: [] };
            newList.push(categoryGroup);
        }

        if (categoryGroup.items.some(item => item.name.toLowerCase() === trimmedName.toLowerCase())) {
            toast.error("Dieser Artikel ist bereits in der Liste.");
            return;
        }

        categoryGroup.items.push({ name: trimmedName, checked: false, isCustom: true, id: generateUUID('sli') });
        setList(newList);
        persistChanges(newList);
        setNewItemName('');
    };
    
    const hasVisibleItems = useMemo(() => {
        return list.some(cat => cat.items.some(item =>
            activeTab === 'shopping' ? !item.checked : item.checked
        ));
    }, [list, activeTab]);

    const EmptyState = () => (
        <div className="h-40 flex flex-col items-center justify-center text-center">
            <p className="text-slate-400">
                {activeTab === 'shopping'
                    ? (list.length > 0 ? 'Alle Artikel bereits eingekauft!' : 'Deine Einkaufsliste ist leer.')
                    : 'Du hast noch keine Artikel als vorhanden markiert.'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
                {activeTab === 'shopping' && list.length === 0
                    ? 'Bestätige Gerichte im Plan oder füge Artikel manuell hinzu.'
                    : 'Hake Artikel in der Einkaufsliste ab, um sie hier anzuzeigen.'}
            </p>
        </div>
    );

    const footer = <Button onClick={onClose}>Schließen</Button>;

    return (
        <Modal isOpen={true} onClose={onClose} title="Wocheneinkauf" footer={footer} size="md">
            <div className="border-b border-slate-700 mb-4">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('shopping')}
                        className={clsx(
                            'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
                            activeTab === 'shopping'
                                ? 'border-rose-500 text-rose-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
                        )}
                    >
                        Einkaufsliste
                    </button>
                    <button
                        onClick={() => setActiveTab('owned')}
                        className={clsx(
                            'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
                            activeTab === 'owned'
                                ? 'border-rose-500 text-rose-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
                        )}
                    >
                        Bereits vorhanden
                    </button>
                </nav>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 -mr-4">
                {!hasVisibleItems ? <EmptyState /> : list.map((categoryItem, catIndex) => {
                    const visibleItems = categoryItem.items.filter(item =>
                        activeTab === 'shopping' ? !item.checked : item.checked
                    );
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={categoryItem.category}>
                            <h3 className="font-bold text-rose-300 mb-2">{categoryItem.category}</h3>
                            <ul className="space-y-1.5">
                                {visibleItems.map(item => {
                                    const originalItemIndex = categoryItem.items.findIndex(i => (i.id || i.name) === (item.id || item.name));
                                    return (
                                        <li key={item.id || item.name} className="flex items-center gap-3 group">
                                            <input id={`item-${catIndex}-${originalItemIndex}`} type="checkbox" checked={item.checked} onChange={() => handleToggleItem(catIndex, originalItemIndex)} className="h-4 w-4 rounded text-rose-500 bg-slate-700 border-slate-600 focus:ring-rose-500 cursor-pointer" />
                                            <label htmlFor={`item-${catIndex}-${originalItemIndex}`} className={`flex-1 text-slate-200 cursor-pointer transition-colors ${item.checked ? 'line-through text-slate-500' : ''}`}>{item.name}</label>
                                            <button onClick={() => handleDeleteItem(catIndex, originalItemIndex)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )
                })}
                {activeTab === 'shopping' &&
                    <form onSubmit={handleAddItem} className="pt-4 mt-4 border-t border-slate-700/50 space-y-2">
                        <h4 className="text-sm font-semibold text-white">Artikel hinzufügen</h4>
                        <div className="flex gap-2">
                            <input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="z.B. Milch" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white" />
                            <select value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white">
                                {CATEGORY_ORDER.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <Button type="submit" variant="secondary" size="icon-sm"><Plus className="h-4 w-4"/></Button>
                        </div>
                    </form>
                }
            </div>
        </Modal>
    );
};