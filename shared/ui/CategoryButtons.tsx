





import React, { useMemo } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Category, CategoryId, Group } from '@/shared/types';
import { iconMap, Plus, Star, getIconComponent } from '@/shared/ui';

const CategoryTile: FC<{
    category: Category;
    isSelected: boolean;
    onSelect: (id: string) => void;
    isFavorite: boolean;
    onToggleFavorite?: (id: string) => void;
}> = ({ category, isSelected, onSelect, isFavorite, onToggleFavorite }) => {
    const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;

    return (
        <div className="relative" key={category.id}>
            <motion.button
                type="button"
                onClick={() => onSelect(category.id)}
                layout
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                style={{
                    backgroundColor: isSelected ? category.color : undefined,
                    borderColor: category.color,
                }}
                className={`flex items-center justify-center rounded-lg transition-colors duration-200 border-2
                    ${isSelected 
                        ? 'gap-2 px-4 py-3 text-white font-semibold shadow-lg' 
                        : 'w-12 h-12 bg-slate-800/50 hover:bg-slate-700/80'
                    }`
                }
                title={category.name}
            >
                <Icon className="h-6 w-6 shrink-0" style={{ color: isSelected ? 'white' : category.color }} />
                <AnimatePresence>
                    {isSelected && (
                        <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.15, ease: 'linear' }}
                            className="whitespace-nowrap overflow-hidden text-sm"
                        >
                            {category.name}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>
            {onToggleFavorite && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(category.id);
                    }}
                    className="absolute -top-1 -right-1 z-10 p-1 bg-slate-700 rounded-full text-slate-400 hover:text-yellow-400"
                    aria-pressed={isFavorite}
                    title={isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
                >
                    <Star className={`h-3 w-3 transition-all ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'hover:fill-yellow-400/50'}`} />
                </button>
            )}
        </div>
    );
};

export const CategoryButtons: FC<{
    categories: Category[];
    groups?: Group[];
    selectedCategoryId: CategoryId;
    onSelectCategory: (id: CategoryId) => void;
    onShowMoreClick?: () => void;
    showGroups?: boolean;
    favoriteIds?: string[];
    onToggleFavorite?: (id: CategoryId) => void;
}> = ({ 
    categories, 
    groups = [], 
    selectedCategoryId, 
    onSelectCategory, 
    onShowMoreClick, 
    showGroups = true,
    favoriteIds = [],
    onToggleFavorite,
}) => {
    
    const tileProps = (category: Category) => ({
        category: category,
        isSelected: selectedCategoryId === category.id,
        onSelect: onSelectCategory,
        isFavorite: favoriteIds.includes(category.id),
        onToggleFavorite: onToggleFavorite,
    });

    if (!showGroups) {
        return (
             <div className="flex flex-wrap gap-2">
                {categories.map(category => <CategoryTile key={category.id} {...tileProps(category)} />)}
            </div>
        )
    }

    const groupedCategories = useMemo(() => {
        return groups.map(group => ({
            ...group,
            categories: categories.filter(category => category.groupId === group.id)
        })).filter(group => group.categories.length > 0);
    }, [categories, groups]);

    return (
        <div className="space-y-4">
            {groupedCategories.map((group, groupIndex) => {
                const GroupIcon = getIconComponent(group.icon);
                return (
                    <div key={group.name}>
                        <div className="flex items-center gap-2">
                            <GroupIcon className="h-4 w-4" style={{color: group.color}}/>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{group.name}</h4>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {group.categories.map(category => <CategoryTile key={category.id} {...tileProps(category)} />)}
                            {onShowMoreClick && groupIndex === groupedCategories.length - 1 && (
                                <motion.button
                                    type="button"
                                    onClick={onShowMoreClick}
                                    layout
                                    className="w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-200 border-2 border-dashed border-slate-500 hover:border-slate-400 bg-slate-800/50 hover:bg-slate-700/80"
                                    title="Weitere Kategorien"
                                >
                                    <Plus className="h-6 w-6 text-slate-400" />
                                </motion.button>
                            )}
                        </div>
                    </div>
                );
            })}
            {groupedCategories.length === 0 && onShowMoreClick && (
                <motion.button
                    type="button"
                    onClick={onShowMoreClick}
                    layout
                    className="w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-200 border-2 border-dashed border-slate-500 hover:border-slate-400 bg-slate-800/50 hover:bg-slate-700/80"
                    title="Weitere Kategorien"
                >
                    <Plus className="h-6 w-6 text-slate-400" />
                </motion.button>
            )}
        </div>
    );
};

export default CategoryButtons;