
import React, { FC, useState } from 'react';
import { Modal, Button, TagInput, Loader2 } from '@/shared/ui';
import type { Recipe } from '../data/recipes';
import { useApp } from '@/contexts/AppContext';
import { generateUUID } from '@/shared/utils/uuid';
import { toast } from 'react-hot-toast';
import { apiPost } from '@/shared/lib/http';

interface AddRecipeModalProps {
    onClose: () => void;
}

const BASE_INPUT_CLASSES = "w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50";
const TEXTAREA_CLASSES = `${BASE_INPUT_CLASSES} min-h-[120px] text-sm`;

export const AddRecipeModal: FC<AddRecipeModalProps> = ({ onClose }) => {
    const { customRecipes, setCustomRecipes } = useApp();
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [base, setBase] = useState<'nudeln' | 'reis' | 'kartoffeln' | 'mix'>('mix');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInputValue, setTagInputValue] = useState('');
    const [link, setLink] = useState('');
    const [isPremium, setIsPremium] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [ingredients, setIngredients] = useState('');
    const [instructions, setInstructions] = useState('');


    const handleParseUrl = async () => {
        if (!link.trim() || !link.startsWith('http')) {
            toast.error('Bitte geben Sie eine gültige URL ein.');
            return;
        }
        setIsParsing(true);
        try {
            const result = await apiPost('/api/ai/parse-recipe', { url: link });
            if (result) {
                setTitle(result.title || '');
                setTags(result.tags || []);
                setBase(result.base || 'mix');
                setPrice(result.estimatedPricePerServing?.toLocaleString('de-DE') || '');
                setIngredients((result.ingredients || []).join('\n'));
                setInstructions((result.instructions || []).join('\n'));
                toast.success('Rezept erfolgreich ausgelesen!');
            }
        } catch (error: any) {
            toast.error(`Fehler beim Auslesen: ${error.message}`);
        } finally {
            setIsParsing(false);
        }
    };


    const handleSave = () => {
        if (!title.trim()) {
            toast.error("Bitte gib einen Titel ein.");
            return;
        }

        const numPrice = parseFloat(price.replace(',', '.'));
        const estimatedPricePerServing = !isNaN(numPrice) && numPrice > 0 ? numPrice : 2.5; // Default price
        
        const finalTags = [...tags];
        const trimmedInput = tagInputValue.trim();
        if (trimmedInput && !finalTags.includes(trimmedInput)) {
            finalTags.push(trimmedInput);
        }

        const newRecipe: Recipe = {
            id: generateUUID('recipe_custom'),
            title: title.trim(),
            base,
            tags: finalTags,
            estimatedPricePerServing,
            link: link.trim() || undefined,
            isPremium,
            ingredients: ingredients.split('\n').filter(Boolean).map(name => ({ name, category: 'Sonstiges' })),
            instructions: instructions.split('\n').filter(Boolean),
        };
        
        setCustomRecipes([...customRecipes, newRecipe]);
        toast.success(`Rezept "${newRecipe.title}" hinzugefügt.`);
        onClose();
    };

    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
            <Button onClick={handleSave}>Rezept speichern</Button>
        </div>
    );

    return (
        <Modal isOpen={true} onClose={onClose} title="Eigenes Rezept hinzufügen" footer={footer} size="2xl">
            <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-4 -mr-6">
                 <div>
                    <label htmlFor="link" className="block text-sm font-medium text-slate-300 mb-1">Rezept von URL importieren (optional)</label>
                    <div className="flex gap-2">
                        <input type="text" id="link" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." className={BASE_INPUT_CLASSES} disabled={isParsing} />
                        <Button variant="secondary" onClick={handleParseUrl} disabled={isParsing} className="w-32">
                            {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Auslesen'}
                        </Button>
                    </div>
                </div>

                <div className="relative pt-2">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-700" /></div>
                    <div className="relative flex justify-center"><span className="bg-slate-800 px-2 text-sm text-slate-400">Oder manuell</span></div>
                </div>
                
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1">Titel</label>
                    <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} className={BASE_INPUT_CLASSES} disabled={isParsing} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-slate-300 mb-1">Geschätzter Preis pro Portion</label>
                        <input type="text" inputMode="decimal" id="price" value={price} onChange={e => setPrice(e.target.value)} placeholder="z.B. 2,50" className={BASE_INPUT_CLASSES} disabled={isParsing} />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-1">Sättigungsbeilage</h3>
                        <div className="bg-slate-700/50 p-1 rounded-lg grid grid-cols-4 gap-1">
                            {(['mix', 'nudeln', 'reis', 'kartoffeln'] as const).map(b => <button key={b} onClick={() => setBase(b)} className={`px-2 py-1 text-xs font-semibold rounded-md ${base === b ? 'bg-rose-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`} disabled={isParsing}>{{mix: 'Mix', nudeln: 'Nudeln', reis: 'Reis', kartoffeln: 'Kartoffeln'}[b]}</button>)}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="ingredients" className="block text-sm font-medium text-slate-300 mb-1">Zutaten (eine pro Zeile)</label>
                        <textarea id="ingredients" value={ingredients} onChange={e => setIngredients(e.target.value)} className={TEXTAREA_CLASSES} disabled={isParsing} />
                    </div>
                    <div>
                        <label htmlFor="instructions" className="block text-sm font-medium text-slate-300 mb-1">Anleitung (ein Schritt pro Zeile)</label>
                        <textarea id="instructions" value={instructions} onChange={e => setInstructions(e.target.value)} className={TEXTAREA_CLASSES} disabled={isParsing} />
                    </div>
                </div>
                 
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Tags (z.B. Vegetarisch, Schnell, Günstig)</label>
                     <div className={isParsing ? 'opacity-50' : ''}>
                        <TagInput tags={tags} setTags={setTags} inputValue={tagInputValue} onInputChange={setTagInputValue} allAvailableTags={[]} />
                    </div>
                </div>
                 <label className="flex items-center gap-2 pt-2">
                    <input type="checkbox" checked={isPremium} onChange={e => setIsPremium(e.target.checked)} className="w-4 h-4 rounded text-rose-500 bg-slate-600 border-slate-500" disabled={isParsing} /> Premium-Gericht (fürs Wochenende)
                </label>
            </div>
        </Modal>
    );
};