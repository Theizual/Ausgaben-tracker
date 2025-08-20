
import React, { FC, useState, useMemo, useEffect } from 'react';
import { Modal, Button, Search, CheckSquare, Undo2, UtensilsCrossed, X } from '@/shared/ui';
import type { Recipe } from '@/shared/types';
import { useApp } from '@/contexts/AppContext';
import { clsx } from 'clsx';

interface RecipePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectRecipe: (recipeId: string) => void;
    onSelectSpecial: (type: 'leftovers' | 'eating_out' | 'no_meal') => void;
    currentRecipeId?: string;
}

const RecipeCard: FC<{recipe: Recipe, isSelected: boolean, onSelect: () => void}> = ({ recipe, isSelected, onSelect }) => {
    return (
        <button
            onClick={onSelect}
            className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${isSelected ? 'bg-rose-500/20' : 'hover:bg-slate-700/50'}`}
        >
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{recipe.name}</p>
                <p className="text-xs text-slate-400 truncate">{recipe.tags.join(', ')}</p>
            </div>
            {isSelected && <CheckSquare className="h-5 w-5 text-rose-400 flex-shrink-0" />}
        </button>
    )
};

export const RecipePickerModal: FC<RecipePickerModalProps> = ({ isOpen, onClose, onSelectRecipe, onSelectSpecial, currentRecipeId }) => {
    const { recipeMap } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const allRecipes = useMemo(() => Array.from(recipeMap.values()), [recipeMap]);

    const TABS: { key: Recipe['base']; label: string }[] = [
        { key: 'nudeln', label: 'Nudeln' },
        { key: 'reis', label: 'Reis' },
        { key: 'kartoffeln', label: 'Kartoffeln' },
        { key: 'mix', label: 'Sonstiges' },
    ];
    
    const SPECIAL_MEALS = [
        { type: 'leftovers', label: 'Resteverwertung', icon: Undo2 },
        { type: 'eating_out', label: 'Auswärts essen', icon: UtensilsCrossed },
        { type: 'no_meal', label: 'Kein Essen', icon: X },
    ];

    const filteredRecipesByBase = useMemo(() => {
        const filtered = allRecipes.filter(r =>
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        const groups: Record<Recipe['base'], Recipe[]> = { 'nudeln': [], 'reis': [], 'kartoffeln': [], 'mix': [] };
        
        filtered.forEach(r => {
            if (groups[r.base]) {
                groups[r.base].push(r);
            }
        });

        return groups;
    }, [allRecipes, searchTerm]);
    
    const visibleTabs = useMemo(() => TABS.filter(tab => filteredRecipesByBase[tab.key].length > 0), [filteredRecipesByBase]);
    
    const [activeTab, setActiveTab] = useState<Recipe['base']>(TABS[0].key);

    useEffect(() => {
        if (visibleTabs.length > 0 && !visibleTabs.some(tab => tab.key === activeTab)) {
            setActiveTab(visibleTabs[0].key);
        } else if (visibleTabs.length === 0 && searchTerm === '') {
            setActiveTab(TABS[0].key);
        }
    }, [visibleTabs, activeTab, searchTerm]);

    const recipesForActiveTab = useMemo(() => {
        return filteredRecipesByBase[activeTab]?.sort((a,b) => a.name.localeCompare(b.name)) || [];
    }, [filteredRecipesByBase, activeTab]);

    const footer = <Button variant="secondary" onClick={onClose}>Schließen</Button>;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gericht auswählen" footer={footer} size="lg">
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                    {SPECIAL_MEALS.map(({ type, label, icon: Icon }) => (
                        <Button key={type} variant="secondary" onClick={() => onSelectSpecial(type as any)}>
                            <Icon className="h-4 w-4 mr-2" />
                            {label}
                        </Button>
                    ))}
                </div>

                <div className="relative pt-2">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-700" /></div>
                    <div className="relative flex justify-center"><span className="bg-slate-800 px-2 text-sm text-slate-400">Oder wähle ein Rezept</span></div>
                </div>

                <div className="flex items-center bg-slate-700 border border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-rose-500 px-3">
                    <Search className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Rezept suchen..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent border-none pl-2 py-2 text-white placeholder-slate-500 focus:outline-none"
                        autoFocus
                    />
                </div>
                
                <div className="border-b border-slate-700">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        {visibleTabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={clsx(
                                    'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
                                    activeTab === tab.key
                                        ? 'border-rose-500 text-rose-400'
                                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
                                )}
                            >
                                {tab.label} ({filteredRecipesByBase[tab.key].length})
                            </button>
                        ))}
                    </nav>
                </div>
                
                <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-2 -mr-4 space-y-1">
                    {recipesForActiveTab.length > 0 ? (
                        recipesForActiveTab.map(recipe => (
                            <RecipeCard 
                                key={recipe.id}
                                recipe={recipe}
                                isSelected={recipe.id === currentRecipeId}
                                onSelect={() => onSelectRecipe(recipe.id)}
                            />
                        ))
                    ) : (
                        <p className="text-slate-500 text-center py-8">Keine Rezepte in dieser Kategorie gefunden.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};
