import React, { FC, useState, useMemo, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { MealDay, WeeklyPlan } from '@/shared/types';
import type { Recipe } from '../data/recipes';
import { recipes as baseRecipes } from '../data/recipes';
import { Modal, Button, RefreshCw } from '@/shared/ui';
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
const TEXTAREA_CLASSES = `${BASE_INPUT_CLASSES} min-h-[100px] text-sm`;

export const MealDetailModal: FC<MealDetailModalProps> = ({ isOpen, onClose, mealDay, dayIndex, onReroll }) => {
    const { customRecipes, weeklyMealPlans, setWeeklyMealPlans } = useApp();
    const allRecipes = useMemo(() => [...baseRecipes, ...customRecipes], [customRecipes]);
    const recipe = useMemo(() => mealDay ? allRecipes.find(r => r.id === mealDay.recipeId) : null, [allRecipes, mealDay]);

    const [price, setPrice] = useState('');
    const [note, setNote] = useState('');
    
    // State for recipe editing
    const [ingredients, setIngredients] = useState('');
    const [instructions, setInstructions] = useState('');
    
    useEffect(() => {
        if (mealDay && recipe) {
            setPrice(mealDay.priceOverride?.toLocaleString('de-DE') || '');
            setNote(mealDay.note || '');
            setIngredients(
                mealDay.ingredients
                    ? mealDay.ingredients.join('\n')
                    : recipe.ingredients.map(i => i.name).join('\n')
            );
            setInstructions(
                mealDay.instructions !== undefined
                    ? mealDay.instructions
                    : (recipe.instructions || []).join('\n')
            );
        }
    }, [mealDay, recipe]);

    const handleSave = () => {
        if (!mealDay) return;

        const finalIngredients = ingredients.split('\n').filter(Boolean);
        const finalInstructions = instructions.trim();
        if (finalIngredients.length === 0 && finalInstructions.length === 0) {
            toast.error("Bitte geben Sie mindestens eine Zutat oder einen Anleitungsschritt ein.");
            return;
        }
        
        const planKey = Object.keys(weeklyMealPlans).find(k => weeklyMealPlans[k].days.some(d => d.dateISO === mealDay.dateISO));
        const plan = planKey ? weeklyMealPlans[planKey] : null;
        if (!plan) return;

        const numPrice = parseFloat(price.replace(',', '.'));
        
        const updatedDay: MealDay = {
            ...mealDay,
            priceOverride: !isNaN(numPrice) && numPrice > 0 ? numPrice : undefined,
            note: note.trim() || undefined,
            ingredients: finalIngredients,
            instructions: finalInstructions,
        };

        const updatedDays = plan.days.map((d, i) => i === dayIndex ? updatedDay : d);
        
        const updatedPlan: WeeklyPlan = {
            ...plan,
            days: updatedDays,
        };
        updatedPlan.totalEstimate = updatedPlan.days.reduce((sum, day) => sum + day.estimatedPrice, 0);
        updatedPlan.totalOverride = updatedPlan.days.reduce((sum, day) => sum + (day.priceOverride ?? day.estimatedPrice), 0);

        setWeeklyMealPlans(prev => ({ ...prev, [planKey]: updatedPlan }));
        
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
        <Modal isOpen={isOpen} onClose={onClose} title={`Gericht bearbeiten: ${recipe.title}`} footer={footer} size="2xl">
            <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar -mr-4 pr-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-4">
                        <div>
                            <h3 className="font-semibold text-rose-300 mb-2">Zutaten</h3>
                            <textarea value={ingredients} onChange={e => setIngredients(e.target.value)} placeholder="Eine Zutat pro Zeile" className={TEXTAREA_CLASSES} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-rose-300 mb-2">Anleitung</h3>
                            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Ein Schritt pro Zeile" className={TEXTAREA_CLASSES} />
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
