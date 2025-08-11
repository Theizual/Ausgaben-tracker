
import React, { useMemo, useState, FC } from 'react';
import { AnimatePresence, motion, MotionProps } from 'framer-motion';
import type { Category, CategoryId, Group } from '@/shared/types';
import { iconMap, Plus, Star, getIconComponent, CheckSquare } from '@/shared/ui';

const CategoryTile: FC<{
    category: Category;
    isVisuallyExpanded: boolean;
    onTileClick: (id: string) => void;
    isFavorite: boolean;
    onToggleFavorite?: (id: string) => void;
}> = ({ category, isVisuallyExpanded, onTileClick, isFavorite, onToggleFavorite }) => {
    const Icon = getIconComponent(category.icon);

    const buttonAnimation: MotionProps = {
        layout: true,
        transition: { type: 'spring', damping: 20, stiffness: 300 },
    };
    
    const contentAnimation: MotionProps = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
    };

    return (
        <div className="relative" key={category.id}>
            <motion.button
                type="button"
                onClick={() => onTileClick(category.id)}
                aria-expanded={isVisuallyExpanded}
                {...buttonAnimation}
                style={{
                    backgroundColor: isVisuallyExpanded ? category.color : undefined,
                    borderColor: category.color,
                }}
                className={`flex items-center rounded-lg transition-colors duration-200 border-2
                    ${isVisuallyExpanded 
                        ? 'gap-2 px-3 py-2 text-white font-semibold shadow-lg justify-between' 
                        : 'w-12 h-12 bg-slate-800/50 hover:bg-slate-700/80 justify-center'
                    }`
                }
                title={category.name}
            >
                <div className="flex items-center gap-2">
                    <Icon className="h-6 w-6 shrink-0" style={{ color: isVisuallyExpanded ? 'white' : category.color }} />
                    <AnimatePresence>
                        {isVisuallyExpanded && (
                            <motion.span
                                {...contentAnimation}
                                className="whitespace-nowrap overflow-hidden text-sm"
                            >
                                {category.name}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
                 <AnimatePresence>
                    {isVisuallyExpanded && (
                        <motion.div
                            {...contentAnimation}
                            className="pl-2 ml-2 border-l border-white/20"
                            aria-hidden="true"
                        >
                            <CheckSquare className="h-5 w-5" />
                        </motion.div>
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

const CategoryButtons: FC<{
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
    const [expandedId, setExpandedId] = useState<CategoryId | null>(null);

    const handleTileClick = (categoryId: CategoryId) => {
        // If the clicked tile is already expanded, it's a selection action.
        if (expandedId === categoryId) {
            onSelectCategory(categoryId);
            setExpandedId(null);
        } else {
            // Otherwise, it's an expansion action.
            setExpandedId(categoryId);
        }
    };
    
    const tileProps = (category: Category) => ({
        category: category,
        isVisuallyExpanded: expandedId === category.id || selectedCategoryId === category.id,
        onTileClick: handleTileClick,
        isFavorite: favoriteIds.includes(category.id),
        onToggleFavorite: onToggleFavorite,
    });

    const groupedCategories = useMemo(() => {
        if (!showGroups) return null;
        const groupMap = new Map<string, Category[]>();
        categories.forEach(category => {
            const group = category.groupId;
            if (!groupMap.has(group)) groupMap.set(group, []);
            groupMap.get(group)!.push(category);
        });

        return groups
            .map(group => ({
                ...group,
                categories: groupMap.get(group.id) || []
            }))
            .filter(group => group.categories.length > 0);
    }, [categories, groups, showGroups]);

    if (!showGroups) {
        return (
            <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                    <CategoryTile key={category.id} {...tileProps(category)} />
                ))}
                {onShowMoreClick && (
                    <button
                        type="button"
                        onClick={onShowMoreClick}
                        className="w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-200 border-2 border-dashed border-slate-500 hover:border-slate-400 bg-slate-800/50 hover:bg-slate-700/80"
                        title="Weitere Kategorien"
                    >
                        <Plus className="h-6 w-6 text-slate-400" />
                    </button>
                )}
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {groupedCategories?.map(group => {
                const GroupIcon = getIconComponent(group.icon);
                return (
                    <div key={group.id}>
                        <div className="flex items-center gap-2 mb-2">
                            <GroupIcon className="h-4 w-4 text-slate-500" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{group.name}</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {group.categories.map(category => (
                                <CategoryTile key={category.id} {...tileProps(category)} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CategoryButtons;
