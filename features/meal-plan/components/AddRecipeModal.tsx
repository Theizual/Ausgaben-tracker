import React, { FC, useState } from 'react';
import { Modal, Button, Loader2, Search } from '@/shared/ui';
import type { Recipe } from '@/shared/types';
import { useApp } from '@/contexts/AppContext';
import { generateUUID } from '@/shared/utils/uuid';
import { toast } from 'react-hot-toast';
import { apiPost } from '@/shared/lib/http';

const BASE_INPUT_CLASSES = "w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50";
const TEXTAREA_CLASSES = `${BASE_INPUT_CLASSES} min-h-[120px] text-sm`;

export const AddRecipeModal: FC<{ onClose: () => void }> = ({ onClose }) => {
    const { addRecipe, isAiEnabled } = useApp();
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [base, setBase] = useState<'nudeln' | 'reis' | 'kartoffeln' | 'mix'>('mix');
    const [link, setLink] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [sideSuggestion, setSideSuggestion] = useState('');
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

        const numPrice = parseFloat(price.replace(/\./g, '').replace(',', '.'));
        const estimatedPricePerServing = !isNaN(numPrice) && numPrice > 0 ? numPrice : undefined;

        const newRecipe: Recipe = {
            id: generateUUID('recipe_custom'),
            name: title.trim(),
            base,
            price: estimatedPricePerServing,
            link: link.trim() || undefined,
            ingredients: ingredients.split('\n').filter(Boolean).map(name => ({ name, category: 'Sonstiges' })),
            sideSuggestion: sideSuggestion.trim() || undefined,
            instructions: instructions,
            lastModified: new Date().toISOString(),
            version: 1,
            tags: [],
        };
        
        addRecipe(newRecipe);
        toast.success(`Rezept "${newRecipe.name}" hinzugefügt.`);
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
            <div className="space-y-4">
                 {isAiEnabled && (
                    <>
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
                    </>
                 )}
                
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1">Titel</label>
                    <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} className={BASE_INPUT_CLASSES} disabled={isParsing} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-4">
                        <div>
                            <label htmlFor="ingredients" className="block text-sm font-medium text-slate-300 mb-1">Zutaten (eine pro Zeile)</label>
                            <textarea id="ingredients" value={ingredients} onChange={e => setIngredients(e.target.value)} className={TEXTAREA_CLASSES} disabled={isParsing} />
                        </div>
                    </div>
                     <div className="space-y-4">
                        <div>
                            <label htmlFor="instructions" className="block text-sm font-medium text-slate-300 mb-1">Anleitung</label>
                            <textarea id="instructions" value={instructions} onChange={e => setInstructions(e.target.value)} className={TEXTAREA_CLASSES} disabled={isParsing} />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
                     <div>
                        <label htmlFor="price" className="block text-sm font-medium text-slate-300 mb-1">Preis (optional)</label>
                        <input type="text" inputMode="decimal" id="price" value={price} onChange={e => setPrice(e.target.value)} placeholder="z.B. 2,50" className={BASE_INPUT_CLASSES} disabled={isParsing} />
                    </div>
                     <div>
                        <label htmlFor="side-suggestion" className="block text-sm font-medium text-slate-300 mb-1">Sättigungsbeilage</label>
                        <input type="text" id="side-suggestion" value={sideSuggestion} onChange={e => setSideSuggestion(e.target.value)} placeholder="z.B. Salat" className={BASE_INPUT_CLASSES} disabled={isParsing} />
                    </div>
                </div>
                 <div className="pt-4">
                     <Button variant="secondary" onClick={() => window.open(`https://www.chefkoch.de/rs/s0/${encodeURIComponent(title)}/Rezepte.html`, '_blank')} disabled={!title.trim()}>
                        <Search className="h-4 w-4 mr-2" />
                        Rezept auf Chefkoch suchen
                    </Button>
                </div>
            </div>
        </Modal>
    );
};