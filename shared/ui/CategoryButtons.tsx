import React, { useMemo } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion, type MotionProps } from 'framer-motion';
import type { Category, CategoryId, Group } from '@/shared/types';
import { iconMap, Plus, Star, getIconComponent } from '@/shared/ui';

const hexToRgba = (hex: string = '#64748b', alpha: number): string => {
    let r = 0, g = 0, b = 0;
    const localHex = hex || '#64748b'; // handle null/undefined just in case
    if (localHex.length === 4) {
        r = parseInt(localHex[1] + localHex[1], 16);
        g = parseInt(localHex[2] + localHex[2], 16);
        b = parseInt(localHex[3] + localHex[3], 16);
    } else if (localHex.length === 7) {
        r = parseInt(localHex.substring(1, 3), 16);
        g = parseInt(localHex.substring(3, 5), 16);
        b = parseInt(localHex.substring(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const hexToRgb = (hex?: string): string => {
    let r = 0, g = 0, b = 0;
    const localHex = hex || '#64748b'; // default color
    if (localHex.length === 4) {
        r = parseInt(localHex[1] + localHex[1], 16);
        g = parseInt(localHex[2] + localHex[2], 16);
        b = parseInt(localHex[3] + localHex[3], 16);
    } else if (localHex.length === 7) {
        r = parseInt(localHex.substring(1, 3), 16);
        g = parseInt(localHex.substring(3, 5), 16);
        b = parseInt(localHex.substring(5, 7), 16);
    }
    return `${r}, ${g}, ${b}`;
};

const CategoryTile: FC<{
    category: Category;
    isSelected: boolean;
    onSelect: (id: string) => void;
    isFavorite: boolean;
    onToggleFavorite?: (id: string) => void;
}> = ({ category, isSelected, onSelect, isFavorite, onToggleFavorite }) => {
    const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;

    const buttonAnimation = {
        transition: { type: 'spring' as const, damping: 20, stiffness: 300 },
    };
    
    const labelAnimation = {
        initial: { opacity: 0, width: 0 },
        animate: { opacity: 1, width: 'auto' },
        exit: { opacity: 0, width: 0 },
        transition: { duration: 0.15, ease: 'linear' as const },
    };

    return (
        <div className="relative" key={category.id}>
            <motion.button
                type="button"
                onClick={() => onSelect(category.id)}
                {...buttonAnimation}
                style={{
                    backgroundColor: isSelected ? category.color : undefined,
                    borderColor: category.color,
                }}
                className={`flex items-center justify-center rounded-lg transition-colors duration-200 border-2
                    ${isSelected 
                        ? 'gap-2 px-4 py-3 text-white font-semibold shadow-lg' 
                        : 'w-12 h-12 bg-transparent hover:bg-slate-700/50'
                    }`
                }
                title={category.name}
            >
                <Icon className="h-6 w-6 shrink-0" style={{ color: isSelected ? 'white' : category.color }} />
                <AnimatePresence>
                    {isSelected && (
                        <motion.span
                            {...labelAnimation}
                            className="whitespace-nowrap overflow-hidden text-sm"
                        >
                            {category.name}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>
            {onToggleFavorite ? (
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
            ) : isFavorite ? (
                <div
                    className="absolute -top-1 -right-1 z-10 p-1 bg-slate-700 rounded-full text-yellow-400 pointer-events-none"
                    title="Favoriten in der Kategorienbibliothek verwalten"
                    aria-hidden="true"
                >
                    <Star className="h-3 w-3 fill-yellow-400" />
                </div>
            ) : null}
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
    
    const tileProps = (category: Category) => ({
        category: category,
        isSelected: selectedCategoryId === category.id,
        onSelect: onSelectCategory,
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
        <div className="grid grid-cols-2 gap-3">
            {groupedCategories?.map(group => {
                const GroupIcon = getIconComponent(group.icon);
                const groupColor = group.color || '#64748b';
                const groupRgb = hexToRgb(groupColor);

                return (
                    <div 
                        key={group.id} 
                        className="relative p-1.5 rounded-xl overflow-hidden border border-slate-700/50 flex flex-col group-gradient bg-slate-800/20"
                        style={{'--group-rgb': groupRgb} as React.CSSProperties}
                    >
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-1.5 px-1 pt-0 pb-1">
                                <GroupIcon className="h-4 w-4" style={{ color: groupColor }} />
                                <h4 className="text-sm font-bold text-slate-300">{group.name}</h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {group.categories.map(category => (
                                    <CategoryTile key={category.id} {...tileProps(category)} />
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CategoryButtons;