import React, { FC, useState, useMemo, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { MealDay, WeeklyPlan } from '@/shared/types';
import type { Recipe, Ingredient } from '../data/recipes';
import { recipes as baseRecipes } from '../data/recipes';
import { Modal, Button, Trash2, RefreshCw, UserAvatar } from '@/shared/ui';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '@/shared/utils/dateUtils';

interface MealDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    mealDay: MealDay | null;
    dayIndex: number;
    onReroll: (dayIndex: number) => void;
}

const BASE_INPUT_CLASSES = "w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500";
const TEXTAREA_CLASSES = `${BASE_INPUT_CLASSES} min-h-[100px]`;

export const MealDetailModal: FC<MealDetailModalProps> = ({ isOpen, onClose, mealDay, dayIndex, onReroll }) => {
    const { customRecipes, setCustomRecipes, weeklyMealPlans, setWeeklyMealPlans } = useApp();
    const allRecipes = useMemo(() => [...baseRecipes, ...customRecipes], [customRecipes]);
    const recipe = useMemo(() => mealDay ? allRecipes.find(r => r.id === mealDay.recipeId) : null, [allRecipes, mealDay]);

    const [price, setPrice] = useState('');
    const [note, setNote] = useState('');
    
    // State for custom recipe editing
    const [ingredients, setIngredients] = useState('');
    const [instructions, setInstructions] = useState('');
    
    const isCustom = useMemo(() => recipe?.id.startsWith('recipe_custom'), [recipe]);
    
    useEffect(() => {
        if (mealDay) {
            setPrice(mealDay.priceOverride?.toLocaleString('de-DE') || '');
            setNote(mealDay.note || '');
        }
        if (isCustom && recipe) {
            setIngredients(recipe.ingredients.map(i => i.name).join('\n'));
            setInstructions((recipe.instructions || []).join('\n'));
        }
    }, [mealDay, recipe, isCustom]);

    const handleSave = () => {
        if (!mealDay) return;
        
        const planKey = Object.keys(weeklyMealPlans).find(k => weeklyMealPlans[k].days.some(d => d.dateISO === mealDay.dateISO));
        const plan = planKey ? weeklyMealPlans[planKey] : null;
        if (!plan) return;

        const numPrice = parseFloat(price.replace(',', '.'));
        
        const updatedDay: MealDay = {
            ...mealDay,
            priceOverride: !isNaN(numPrice) && numPrice > 0 ? numPrice : undefined,
            note: note.trim() || undefined,
        };

        const updatedDays = plan.days.map((d, i) => i === dayIndex ? updatedDay : d);
        
        const updatedPlan: WeeklyPlan = {
            ...plan,
            days: updatedDays,
        };
        updatedPlan.totalEstimate = updatedPlan.days.reduce((sum, day) => sum + day.estimatedPrice, 0);
        updatedPlan.totalOverride = updatedPlan.days.reduce((sum, day) => sum + (day.priceOverride ?? day.estimatedPrice), 0);

        setWeeklyMealPlans(prev => ({ ...prev, [planKey]: updatedPlan }));

        if (isCustom && recipe) {
             const updatedRecipe: Recipe = {
                ...recipe,
                ingredients: ingredients.split('\n').filter(Boolean).map(name => ({ name, category: 'Sonstiges' })),
                instructions: instructions.split('\n').filter(Boolean)
             };
             setCustomRecipes(prev => prev.map(r => r.id === recipe.id ? updatedRecipe : r));
        }
        
        toast.success('Änderungen gespeichert.');
        onClose();
    };
    
    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
            <Button onClick={handleSave}>Speichern</Button>
        </div>
    );
    
    if (!isOpen || !mealDay || !recipe) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={recipe.title} footer={footer} size="2xl">
            <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar -mr-4 pr-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-4">
                        <div>
                            <h3 className="font-semibold text-rose-300 mb-2">Zutaten</h3>
                            {isCustom ? (
                                <textarea value={ingredients} onChange={e => setIngredients(e.target.value)} placeholder="Eine Zutat pro Zeile" className={TEXTAREA_CLASSES} />
                            ) : (
                                <ul className="list-disc list-inside text-slate-300 text-sm bg-slate-800/50 p-3 rounded-lg">
                                    {recipe.ingredients.length > 0 ? recipe.ingredients.map((ing, i) => <li key={i}>{ing.name}</li>) : <li>Keine Zutaten angegeben.</li>}
                                </ul>
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-rose-300 mb-2">Anleitung</h3>
                            {isCustom ? (
                                <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Ein Schritt pro Zeile" className={TEXTAREA_CLASSES} />
                            ) : (
                                <ol className="list-decimal list-inside text-slate-300 text-sm space-y-1 bg-slate-800/50 p-3 rounded-lg">
                                    {(recipe.instructions || []).length > 0 ? (recipe.instructions || []).map((step, i) => <li key={i}>{step}</li>) : <li>Keine Anleitung angegeben.</li>}
                                </ol>
                            )}
                        </div>
                    </div>
                    <div className="w-full sm:w-64 flex-shrink-0 space-y-4">
                         <a href={`https://www.chefkoch.de/rs/s0/${encodeURIComponent(recipe.title)}/Rezepte.html`} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-orange-600/20 text-orange-400 font-semibold p-3 rounded-lg hover:bg-orange-600/40">
                           Bei Chefkoch suchen
                        </a>
                         <div className="bg-slate-800/50 p-3 rounded-lg space-y-3">
                             <div>
                                <label htmlFor="price-override" className="block text-xs text-slate-400 mb-1">Preis überschreiben</label>
                                <input id="price-override" type="text" value={price} onChange={e => setPrice(e.target.value)} placeholder={formatCurrency(mealDay.estimatedPrice)} className={BASE_INPUT_CLASSES} />
                            </div>
                            <div>
                                <label htmlFor="note" className="block text-xs text-slate-400 mb-1">Notiz</label>
                                <textarea id="note" value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="z.B. doppelte Menge..." className={BASE_INPUT_CLASSES} />
                            </div>
                         </div>
                         <Button variant="secondary" onClick={() => onReroll(dayIndex)} className="w-full" disabled={mealDay.isConfirmed}>
                            <RefreshCw className="h-4 w-4" /> Anderes Rezept
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};