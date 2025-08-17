import React, { FC, useState, useMemo } from 'react';
import { Modal, Button, Search, CheckSquare } from '@/shared/ui';
import type { Recipe } from '../data/recipes';
import { useApp } from '@/contexts/AppContext';
import { recipes as baseRecipes } from '../data/recipes';

interface RecipePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectRecipe: (recipeId: string) => void;
    currentRecipeId: string;
}

const RecipeCard: FC<{recipe: Recipe, isSelected: boolean, onSelect: () => void}> = ({ recipe, isSelected, onSelect }) => {
    return (
        <button 
            onClick={onSelect}
            className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${isSelected ? 'bg-rose-500/20' : 'hover:bg-slate-700/50'}`}
        >
            <div className="flex-1">
                <p className="font-semibold text-white">{recipe.title}</p>
                <p className="text-xs text-slate-400">{recipe.tags.join(', ')}</p>
            </div>
            {isSelected && <CheckSquare className="h-5 w-5 text-rose-400 flex-shrink-0" />}
        </button>
    )
};

export const RecipePickerModal: FC<RecipePickerModalProps> = ({ isOpen, onClose, onSelectRecipe, currentRecipeId }) => {
    const { customRecipes } = useApp();
    const [searchTerm, setSearchTerm] = useState('');

    const allRecipes = useMemo(() => [...baseRecipes, ...customRecipes], [customRecipes]);
    
    const filteredAndGroupedRecipes = useMemo(() => {
        const filtered = allRecipes.filter(r => 
            r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        const groups: Record<string, Recipe[]> = { 'nudeln': [], 'reis': [], 'kartoffeln': [], 'mix': [] };
        
        filtered.forEach(r => {
            groups[r.base].push(r);
        });

        return [
            { name: 'Nudeln', recipes: groups.nudeln },
            { name: 'Reis', recipes: groups.reis },
            { name: 'Kartoffeln', recipes: groups.kartoffeln },
            { name: 'Sonstiges', recipes: groups.mix },
        ].filter(g => g.recipes.length > 0);

    }, [allRecipes, searchTerm]);

    const footer = <Button variant="secondary" onClick={onClose}>Schließen</Button>;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gericht auswählen" footer={footer} size="lg">
            <div className="space-y-4">
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
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 -mr-4 space-y-4">
                    {filteredAndGroupedRecipes.map(group => (
                        <div key={group.name}>
                            <h3 className="font-bold text-rose-300 mb-2">{group.name}</h3>
                            <div className="space-y-1">
                                {group.recipes.map(recipe => (
                                    <RecipeCard 
                                        key={recipe.id}
                                        recipe={recipe}
                                        isSelected={recipe.id === currentRecipeId}
                                        onSelect={() => onSelectRecipe(recipe.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};