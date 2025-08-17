import React, { FC, useState, useEffect, FormEvent } from 'react';
import { Modal, Button, Trash2, Plus } from '@/shared/ui';
import { WeeklyPlan } from '@/shared/types';
import type { Recipe, Ingredient } from '../data/recipes';
import { toast } from 'react-hot-toast';

interface ShoppingListModalProps {
    plan: WeeklyPlan;
    allRecipes: Recipe[];
    onClose: () => void;
}

interface ShoppingListItem {
    name: string;
    checked: boolean;
}

interface CategorizedList {
    category: string;
    items: ShoppingListItem[];
}

const CATEGORY_ORDER = ['Obst & Gemüse', 'Fleisch & Fisch', 'Milchprodukte & Eier', 'Backwaren', 'Trockenwaren & Konserven', 'Gewürze & Öle', 'Sonstiges'];


export const ShoppingListModal: FC<ShoppingListModalProps> = ({ plan, allRecipes, onClose }) => {
    const [list, setList] = useState<CategorizedList[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('Sonstiges');

    useEffect(() => {
        const confirmedMeals = plan.days.filter(d => d.isConfirmed);
        if (confirmedMeals.length === 0) {
            setList([]);
            return;
        }

        const recipeMap = new Map(allRecipes.map(r => [r.id, r]));
        
        const allIngredients: Ingredient[] = [];
        confirmedMeals.forEach(meal => {
            const recipe = recipeMap.get(meal.recipeId);
            if (recipe?.ingredients) {
                allIngredients.push(...recipe.ingredients);
            }
        });
        
        const categorized = allIngredients.reduce((acc, ingredient) => {
            if (!acc[ingredient.category]) {
                acc[ingredient.category] = new Set();
            }
            acc[ingredient.category].add(ingredient.name);
            return acc;
        }, {} as Record<string, Set<string>>);
        
        const finalList: CategorizedList[] = Object.entries(categorized)
            .map(([category, itemsSet]) => ({
                category,
                items: Array.from(itemsSet).sort().map(name => ({ name, checked: false }))
            }))
            .sort((a,b) => {
                const indexA = CATEGORY_ORDER.indexOf(a.category);
                const indexB = CATEGORY_ORDER.indexOf(b.category);
                if(indexA === -1) return 1;
                if(indexB === -1) return -1;
                return indexA - indexB;
            });
        
        setList(finalList);
    }, [plan, allRecipes]);

    const handleToggleItem = (catIndex: number, itemIndex: number) => {
        const newList = [...list];
        newList[catIndex].items[itemIndex].checked = !newList[catIndex].items[itemIndex].checked;
        setList(newList);
    };

    const handleDeleteItem = (catIndex: number, itemIndex: number) => {
        const newList = [...list];
        newList[catIndex].items.splice(itemIndex, 1);
        // Remove category if it becomes empty
        setList(newList.filter(c => c.items.length > 0));
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

        categoryGroup.items.push({ name: trimmedName, checked: false });
        setList(newList);
        setNewItemName('');
    };

    const footer = <Button onClick={onClose}>Schließen</Button>;

    return (
        <Modal isOpen={true} onClose={onClose} title="Wocheneinkauf" footer={footer} size="md">
            {plan.days.filter(d => d.isConfirmed).length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center">
                    <p className="text-slate-400">Bestätige zuerst Gerichte im Plan, um eine Einkaufsliste zu erstellen.</p>
                </div>
            ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 -mr-4">
                    {list.map((categoryItem, catIndex) => (
                        <div key={catIndex}>
                            <h3 className="font-bold text-rose-300 mb-2">{categoryItem.category}</h3>
                            <ul className="space-y-1.5">
                                {categoryItem.items.map((item, itemIndex) => (
                                    <li key={itemIndex} className="flex items-center gap-3 group">
                                        <input id={`item-${catIndex}-${itemIndex}`} type="checkbox" checked={item.checked} onChange={() => handleToggleItem(catIndex, itemIndex)} className="h-4 w-4 rounded text-rose-500 bg-slate-700 border-slate-600 focus:ring-rose-500 cursor-pointer" />
                                        <label htmlFor={`item-${catIndex}-${itemIndex}`} className={`flex-1 text-slate-200 cursor-pointer transition-colors ${item.checked ? 'line-through text-slate-500' : ''}`}>{item.name}</label>
                                        <button onClick={() => handleDeleteItem(catIndex, itemIndex)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
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
                </div>
            )}
        </Modal>
    );
};