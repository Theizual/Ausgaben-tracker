

import React, { useState, useMemo, FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import type { Transaction, Category, ViewMode, CategoryId, Tag, Group } from '@/shared/types';
import { Plus, Coins, Button } from '@/shared/ui';
import { CategoryButtons, TagInput, AvailableTags } from '@/shared/ui';
import { MoreCategoriesModal } from './MoreCategoriesModal';
import { parseISO } from 'date-fns';

export const QuickAddForm: FC = () => {
    const { 
        addTransaction,
        addMultipleTransactions,
        flexibleCategories, 
        allAvailableTags, 
        transactions,
        favoriteIds,
        recentCategoryIds,
        addRecent,
        toggleFavorite,
    } = useApp();
    
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [isMoreCategoriesModalOpen, setIsMoreCategoriesModalOpen] = useState(false);


    const recentlyUsedTags = useMemo(() => {
        const sortedTransactions = [...transactions].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        const recentTagIds = new Set<string>();

        for (const transaction of sortedTransactions) {
            if (recentTagIds.size >= 10) break;
            if (transaction.tagIds) {
                for (const tagId of transaction.tagIds) {
                    if (recentTagIds.size >= 10) break;
                    recentTagIds.add(tagId);
                }
            }
        }
        
        const tagMap = new Map(allAvailableTags.map(t => [t.id, t]));
        return Array.from(recentTagIds).map(id => tagMap.get(id)).filter((t): t is Tag => !!t);
    }, [transactions, allAvailableTags]);

    const favoriteCategories = useMemo(() => 
        favoriteIds.map(id => flexibleCategories.find(c => c.id === id)).filter(Boolean) as Category[],
        [favoriteIds, flexibleCategories]
    );

    const recentCategories = useMemo(() => 
        recentCategoryIds.map(id => flexibleCategories.find(c => c.id === id)).filter(Boolean) as Category[],
        [recentCategoryIds, flexibleCategories]
    );

    const handleSelectCategory = (newCategoryId: string) => {
        setCategoryId(newCategoryId);
        addRecent(newCategoryId);
    };

    const handleSelectCategoryFromModal = (newCategoryId: string) => {
        handleSelectCategory(newCategoryId);
        setIsMoreCategoriesModalOpen(false);
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
            addMultipleTransactions(transactionsToCreate, { categoryId, tags });
        } else {
            addTransaction({ 
                amount: numAmount, 
                description, 
                categoryId, 
                tags,
            });
        }
        
        setAmount('');
        setDescription('');
        setTags([]);
        setCategoryId('');
    };

    const handleTagClick = (tag: string) => {
        setTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-bold text-white mb-4">Ausgabe hinzufügen</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="sm:w-48 flex-shrink-0">
                            <div className="flex items-center bg-slate-700 border border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-rose-500 px-3">
                                <Coins className="h-5 w-5 text-slate-400 shrink-0" />
                                <input
                                    id="amount"
                                    type="text"
                                    inputMode="decimal"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="Betrag"
                                    className="w-full bg-transparent border-none pl-2 pr-0 py-2.5 text-white placeholder-slate-500 focus:outline-none"
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
                                placeholder="Beschreibung..."
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                required
                            />
                             <p className="text-xs text-slate-400 mt-1.5 px-1">Tipp: Mehrere Artikel mit Komma trennen für eine Aufteilung.</p>
                        </div>
                    </div>
                    
                    <div className="pt-2 space-y-4">
                         <h4 className="text-sm font-semibold text-white mb-3">Kategorie wählen:</h4>
                        {favoriteCategories.length > 0 && (
                            <div>
                                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Favoriten</h5>
                                <CategoryButtons 
                                    categories={favoriteCategories}
                                    selectedCategoryId={categoryId}
                                    onSelectCategory={handleSelectCategory}
                                    showGroups={false}
                                    favoriteIds={favoriteIds}
                                    onToggleFavorite={toggleFavorite}
                                />
                            </div>
                        )}
                        {recentCategories.length > 0 && (
                             <div>
                                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Zuletzt verwendet</h5>
                                <CategoryButtons 
                                    categories={recentCategories}
                                    selectedCategoryId={categoryId}
                                    onSelectCategory={handleSelectCategory}
                                    showGroups={false}
                                    favoriteIds={favoriteIds}
                                    onToggleFavorite={toggleFavorite}
                                />
                            </div>
                        )}
                        {favoriteCategories.length === 0 && (
                            <p className="text-sm text-slate-500 p-2 bg-slate-700/50 rounded-lg">
                               Klicke auf den Stern ⭐ bei einer Kategorie, um sie als Favorit zu speichern.
                            </p>
                        )}
                        <div className="flex justify-end pt-2">
                             <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setIsMoreCategoriesModalOpen(true)}
                            >
                                Alle Kategorien...
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-700/50">
                        <TagInput 
                            tags={tags} 
                            setTags={setTags}
                            allAvailableTags={allAvailableTags}
                        />
                        <AvailableTags 
                            availableTags={recentlyUsedTags}
                            selectedTags={tags}
                            onTagClick={handleTagClick}
                        />
                    </div>
                    
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:opacity-90 transition-opacity"
                            aria-label="Ausgabe hinzufügen"
                        >
                            <Plus className="h-5 w-5" />
                            <span className="sm:inline">Hinzufügen</span>
                        </button>
                    </div>
                </form>
            </div>
            <AnimatePresence>
                {isMoreCategoriesModalOpen && (
                    <MoreCategoriesModal
                        isOpen={isMoreCategoriesModalOpen}
                        onClose={() => setIsMoreCategoriesModalOpen(false)}
                        onSelectCategory={handleSelectCategoryFromModal}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};