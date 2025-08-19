import React, { useState, useMemo, FC, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import type { Transaction, Category, ViewMode, CategoryId, Tag, Group } from '@/shared/types';
import { Plus, Coins, Button, Camera, Upload } from '@/shared/ui';
import { CategoryButtons, TagInput, AvailableTags } from '@/shared/ui';
import { parseISO } from 'date-fns';
import { FIXED_COSTS_GROUP_ID } from '@/constants';
import { MoreCategoriesModal } from './MoreCategoriesModal';
import { AnalyzeReceiptResult } from '@/contexts/AppContext';

export const QuickAddForm: FC = () => {
    const { 
        addTransaction,
        addMultipleTransactions,
        categories, 
        allAvailableTags, 
        transactions,
        favoriteIds,
        recentCategoryIds,
        addRecent,
        quickAddHideGroups,
        groups,
        openSettings,
        isAiEnabled,
        analyzeReceipt,
    } = useApp();
    
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInputValue, setTagInputValue] = useState('');
    const [isMoreCategoriesOpen, setIsMoreCategoriesOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const recentlyUsedTags = useMemo(() => {
        const sortedTransactions = [...transactions].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        const recentTagIds = new Set<string>();

        // Limit to 6 to reduce vertical space, usually fits in 2 lines
        for (const transaction of sortedTransactions) {
            if (recentTagIds.size >= 6) break;
            if (transaction.tagIds) {
                for (const tagId of transaction.tagIds) {
                    if (recentTagIds.size >= 6) break;
                    recentTagIds.add(tagId);
                }
            }
        }
        
        const tagMap = new Map(allAvailableTags.map(t => [t.id, t]));
        return Array.from(recentTagIds).map(id => tagMap.get(id)).filter((t): t is Tag => !!t);
    }, [transactions, allAvailableTags]);

    const favoriteCategories = useMemo(() => 
        favoriteIds.map(id => categories.find(c => c.id === id)).filter(Boolean) as Category[],
        [favoriteIds, categories]
    );

    const recentCategories = useMemo(() => 
        recentCategoryIds.map(id => categories.find(c => c.id === id)).filter(Boolean) as Category[],
        [recentCategoryIds, categories]
    );

    const handleSelectCategory = (newCategoryId: string) => {
        setCategoryId(newCategoryId);
        addRecent(newCategoryId);
        if (isMoreCategoriesOpen) {
            setIsMoreCategoriesOpen(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount.replace(',', '.'));
        if (!numAmount || numAmount <= 0 || !description || !categoryId) {
            if (!categoryId) {
                toast.error("Bitte wählen Sie eine Kategorie aus.");
            } else if (!description) {
                toast.error("Bitte geben Sie eine Beschreibung ein.");
            } else {
                 toast.error("Bitte geben Sie einen gültigen Betrag ein.");
            }
            return;
        }

        const finalTags = [...tags];
        const trimmedInput = tagInputValue.trim();
        if (trimmedInput && !finalTags.includes(trimmedInput)) {
            finalTags.push(trimmedInput);
        }
        
        const items = description.split(',').map(d => d.trim()).filter(Boolean);

        if (items.length > 1) {
            const totalCents = Math.round(numAmount * 100);
            const itemCount = items.length;
            const baseCents = Math.floor(totalCents / itemCount);
            let remainderCents = totalCents % itemCount;

            const transactionsToCreate = items.map(itemDesc => {
                let itemCents = baseCents;
                if (remainderCents > 0) {
                    itemCents++;
                    remainderCents--;
                }
                return {
                    description: itemDesc,
                    amount: itemCents / 100,
                };
            });
            addMultipleTransactions(transactionsToCreate, numAmount, { categoryId, tags: finalTags });
        } else {
            addTransaction({ 
                amount: numAmount, 
                description, 
                categoryId, 
                tags: finalTags,
            });
        }
        
        setAmount('');
        setDescription('');
        setTags([]);
        setTagInputValue('');
        setCategoryId('');
    };

    const handleTagClick = (tag: string) => {
        setTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            try {
                const result = await analyzeReceipt(base64String);
                if (result) {
                    setAmount(result.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                    setDescription(result.description);
                    if (result.categoryId) {
                        setCategoryId(result.categoryId);
                    }
                }
            } catch (error) {
                console.error("AI analysis failed:", error);
            }
        };
        reader.readAsDataURL(file);
        
        // Reset file input to allow selecting the same file again
        event.target.value = '';
    };

    const triggerFileInput = (useCamera: boolean) => {
        if (fileInputRef.current) {
            if (useCamera) {
                fileInputRef.current.setAttribute('capture', 'environment');
            } else {
                fileInputRef.current.removeAttribute('capture');
            }
            fileInputRef.current.click();
        }
    };

    const formAnimation = {
        initial: { opacity: 0, y: -10 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.1 }
    };

    return (
        <>
        <motion.div {...formAnimation}>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-bold text-white mb-4">Schnell hinzufügen</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                     <div className="flex flex-col sm:flex-row gap-3">
                        <div className="sm:w-40 flex-shrink-0">
                            <div className="flex items-center h-10 bg-slate-700 border border-slate-500 rounded-lg focus-within:ring-2 focus-within:ring-rose-500 px-4">
                                <Coins className="h-5 w-5 text-slate-400 shrink-0" />
                                <input
                                    id="amount"
                                    type="text"
                                    inputMode="decimal"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="Betrag"
                                    className="w-full bg-transparent border-none pl-3 pr-0 py-2 text-white placeholder-slate-400 focus:outline-none text-base"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex-grow">
                            <input
                                id="description"
                                type="text"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Beschreibung (mehrere mit Komma trennen)"
                                className="w-full h-10 bg-slate-700 border border-slate-500 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 text-base"
                                required
                            />
                        </div>
                    </div>
                    
                    {isAiEnabled && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelected} className="hidden" />
                            <Button type="button" variant="secondary" onClick={() => triggerFileInput(true)}>
                                <Camera className="h-4 w-4" /> Beleg scannen
                            </Button>
                            <Button type="button" variant="secondary" onClick={() => triggerFileInput(false)}>
                                <Upload className="h-4 w-4" /> Bild hochladen
                            </Button>
                        </div>
                    )}
                    
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1.5 ml-1 pt-1">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Kategorie wählen</h5>
                        </div>
                         
                        {quickAddHideGroups ? (
                             <div className="space-y-2">
                                {favoriteCategories.length > 0 && (
                                    <div>
                                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500/80 mb-1.5 ml-1">Favoriten</h5>
                                        <CategoryButtons 
                                            categories={favoriteCategories}
                                            selectedCategoryId={categoryId}
                                            onSelectCategory={handleSelectCategory}
                                            showGroups={false}
                                            favoriteIds={favoriteIds}
                                        />
                                    </div>
                                )}
                                {favoriteCategories.length === 0 && (
                                     <div className="text-center text-sm text-slate-400 p-2">
                                         Keine Favoriten festgelegt.
                                         <button 
                                            type="button" 
                                            onClick={() => openSettings('categories')} 
                                            className="ml-1 underline hover:text-white font-semibold"
                                            aria-label="Gehe zur Kategorienbibliothek, um Favoriten zu verwalten"
                                        >
                                             Favoriten verwalten
                                         </button>
                                     </div>
                                )}
                                {recentCategories.length > 0 && (
                                    <div>
                                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500/80 mb-1.5 ml-1">Zuletzt verwendet</h5>
                                        <CategoryButtons 
                                            categories={recentCategories}
                                            selectedCategoryId={categoryId}
                                            onSelectCategory={handleSelectCategory}
                                            showGroups={false}
                                            favoriteIds={favoriteIds}
                                        />
                                    </div>
                                )}
                                <div className="flex justify-end pt-1">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setIsMoreCategoriesOpen(true)}
                                    >
                                        Alle Gruppen anzeigen
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <CategoryButtons 
                                categories={categories}
                                groups={groups}
                                selectedCategoryId={categoryId}
                                onSelectCategory={handleSelectCategory}
                                showGroups={true}
                                favoriteIds={favoriteIds}
                            />
                        )}
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-700/50">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-2 mb-1 ml-1">Schnellauswahl Tags</h5>
                        <TagInput 
                            tags={tags} 
                            setTags={setTags}
                            inputValue={tagInputValue}
                            onInputChange={setTagInputValue}
                            allAvailableTags={allAvailableTags}
                        />
                        <AvailableTags 
                            availableTags={recentlyUsedTags}
                            selectedTags={tags}
                            onTagClick={handleTagClick}
                            size="sm"
                        />
                    </div>
                    
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold px-5 py-2 rounded-lg shadow-md hover:opacity-90 transition-opacity"
                            aria-label="Ausgabe hinzufügen"
                        >
                            <Plus className="h-5 w-5" />
                            <span className="sm:inline">Hinzufügen</span>
                        </button>
                    </div>
                </form>
            </div>
        </motion.div>
         <AnimatePresence>
            {isMoreCategoriesOpen && (
                 <MoreCategoriesModal
                    isOpen={isMoreCategoriesOpen}
                    onClose={() => setIsMoreCategoriesOpen(false)}
                    onSelectCategory={handleSelectCategory}
                />
            )}
        </AnimatePresence>
        </>
    );
};