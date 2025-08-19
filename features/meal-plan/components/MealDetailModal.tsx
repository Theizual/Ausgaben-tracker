import React, { FC, useState, useMemo, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { MealDay, WeeklyPlan, Recipe } from '@/shared/types';
import { Modal, Button, RefreshCw, ChevronDown, Edit } from '@/shared/ui';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { AnimatePresence, motion } from 'framer-motion';

const MotionDiv = motion.div;

interface MealDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    mealDay: MealDay | null;
    dayIndex: number;
    onOpenPicker: (dayIndex: number) => void;
}

const BASE_INPUT_CLASSES = "w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500";
const TEXTAREA_CLASSES = `${BASE_INPUT_CLASSES} min-h-[100px] text-sm`;

export const MealDetailModal: FC<MealDetailModalProps> = ({ isOpen, onClose, mealDay, dayIndex, onOpenPicker }) => {
    const { recipeMap, weeklyMealPlans, setWeeklyMealPlans } = useApp();
    const recipe = useMemo(() => mealDay ? recipeMap.get(mealDay.recipeId) : null, [recipeMap, mealDay]);

    const [price, setPrice] = useState('');
    const [note, setNote] = useState('');
    
    // State for recipe editing
    const [isEditingRecipe, setIsEditingRecipe] = useState(false);
    const [ingredients, setIngredients] = useState('');
    const [instructions, setInstructions] = useState('');
    
    useEffect(() => {
        if (mealDay && recipe) {
            setPrice(mealDay.priceOverride?.toLocaleString('de-DE') || '');
            setNote(mealDay.note || '');
            setIngredients(
                mealDay.ingredients
                    ? mealDay.ingredients.map(i => i.name).join('\n')
                    : recipe.ingredients.map(i => i.name).join('\n')
            );
            setInstructions(
                mealDay.instructions !== undefined
                    ? mealDay.instructions
                    : recipe.instructions
            );
            setIsEditingRecipe(false); // Reset edit mode when modal opens
        }
    }, [mealDay, recipe]);

    const handleSave = () => {
        if (!mealDay) return;

        const finalIngredients = ingredients.split('\n').filter(Boolean).map(name => ({ name, category: 'Sonstiges' }));
        const finalInstructions = instructions.trim();
        
        const planKey = Object.keys(weeklyMealPlans).find(k => weeklyMealPlans[k].days.some(d => d.dateISO === mealDay.dateISO));
        const plan = planKey ? weeklyMealPlans[planKey] : null;
        if (!plan) return;

        const numPrice = parseFloat(price.replace(',', '.'));
        
        const updatedDay: MealDay = {
            ...mealDay,
            priceOverride: !isNaN(numPrice) && numPrice > 0 ? numPrice : undefined,
            note: note.trim() || undefined,
            ingredients: finalIngredients.length > 0 ? finalIngredients : undefined,
            instructions: finalInstructions.length > 0 ? finalInstructions : undefined,
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
    
    const handleCancelEdit = () => {
        if (mealDay && recipe) {
            setIngredients(mealDay.ingredients ? mealDay.ingredients.map(i => i.name).join('\n') : recipe.ingredients.map(i => i.name).join('\n'));
            setInstructions(mealDay.instructions !== undefined ? mealDay.instructions : recipe.instructions);
        }
        setIsEditingRecipe(false);
    };

    const footer = (
        <div className="flex justify-between items-center w-full">
            <Button variant="destructive-ghost" onClick={() => onOpenPicker(dayIndex)} disabled={mealDay?.isConfirmed}>
                <RefreshCw className="h-4 w-4 mr-2" /> Anderes Rezept
            </Button>
            <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
                <Button onClick={handleSave}>Speichern</Button>
            </div>
        </div>
    );
    
    if (!isOpen || !mealDay || !recipe) return null;
    
    const ingredientsList = ingredients.split('\n').filter(Boolean);
    const instructionsList = instructions.split('\n').filter(Boolean);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Gericht anpassen: ${recipe.name}`} footer={footer} size="2xl">
            <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar -mr-4 pr-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-4">
                        <div className="bg-slate-700/30 p-3 rounded-lg">
                            <AnimatePresence mode="wait">
                            {isEditingRecipe ? (
                                <MotionDiv key="edit" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
                                    <div className="space-y-3">
                                        <div>
                                            <h4 className="font-semibold text-white text-sm mb-1">Zutaten</h4>
                                            <textarea value={ingredients} onChange={e => setIngredients(e.target.value)} placeholder="Eine Zutat pro Zeile" className={TEXTAREA_CLASSES} />
                                        </div>
                                        <div>
                                             <h4 className="font-semibold text-white text-sm mb-1">Anleitung</h4>
                                            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Ein Schritt pro Zeile" className={TEXTAREA_CLASSES} />
                                        </div>
                                         <div className="flex justify-end gap-2 pt-2">
                                            <Button variant="secondary" size="sm" onClick={handleCancelEdit}>Abbrechen</Button>
                                            <Button size="sm" onClick={() => setIsEditingRecipe(false)}>Übernehmen</Button>
                                        </div>
                                    </div>
                                </MotionDiv>
                            ) : (
                                <MotionDiv key="read" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
                                    <div className="space-y-3">
                                        <div>
                                            <h3 className="font-semibold text-rose-300">Zutaten</h3>
                                            {ingredientsList.length > 0 ? (
                                                <ul className="list-disc list-inside text-sm text-slate-300 space-y-1 mt-1">
                                                    {ingredientsList.map((item, i) => <li key={i}>{item}</li>)}
                                                </ul>
                                            ) : <p className="text-sm text-slate-500 italic mt-1">Keine Zutaten angegeben.</p>}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-rose-300">Anleitung</h3>
                                            {instructionsList.length > 0 ? (
                                                <ol className="list-decimal list-inside text-sm text-slate-300 space-y-1 mt-1">
                                                    {instructionsList.map((item, i) => <li key={i}>{item}</li>)}
                                                </ol>
                                            ) : <p className="text-sm text-slate-500 italic mt-1">Keine Anleitung angegeben.</p>}
                                        </div>
                                        <div className="text-right pt-2">
                                            <Button variant="secondary" size="sm" onClick={() => setIsEditingRecipe(true)}>
                                                <Edit className="h-4 w-4 mr-2" /> Bearbeiten
                                            </Button>
                                        </div>
                                    </div>
                                </MotionDiv>
                            )}
                            </AnimatePresence>
                        </div>
                    </div>
                    <div className="w-full sm:w-64 flex-shrink-0 space-y-4">
                         <a href={recipe.link || `https://www.chefkoch.de/rs/s0/${encodeURIComponent(recipe.name)}/Rezepte.html`} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-orange-600/20 text-orange-400 font-semibold p-3 rounded-lg hover:bg-orange-600/40">
                           Rezept suchen
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
                    </div>
                </div>
            </div>
        </Modal>
    );
};