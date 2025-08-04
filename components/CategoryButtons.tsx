import React, { useMemo } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Category, CategoryId } from '../types';
import { iconMap } from './Icons';

const CategoryButtons: FC<{
    categories: Category[];
    categoryGroups: string[];
    selectedCategoryId: CategoryId;
    onSelectCategory: (id: CategoryId) => void;
}> = ({ categories, categoryGroups, selectedCategoryId, onSelectCategory }) => {
    
    const groupedCategories = useMemo(() => {
        const groupMap = new Map<string, Category[]>();
        categories.forEach(category => {
            if (!groupMap.has(category.group)) {
                groupMap.set(category.group, []);
            }
            groupMap.get(category.group)!.push(category);
        });

        return categoryGroups.map(groupName => ({
            name: groupName,
            categories: groupMap.get(groupName) || []
        })).filter(group => group.categories.length > 0);

    }, [categories, categoryGroups]);

    return (
        <div className="space-y-4">
            {groupedCategories.map(group => (
                <div key={group.name}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">{group.name}</h4>
                    <div className="flex flex-wrap gap-2">
                        {group.categories.map(category => {
                            const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
                            const isSelected = selectedCategoryId === category.id;
                            return (
                                <motion.button
                                    key={category.id}
                                    type="button"
                                    onClick={() => onSelectCategory(category.id)}
                                    layout
                                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                    style={{
                                        backgroundColor: isSelected ? category.color : undefined,
                                        borderColor: category.color,
                                    }}
                                    className={`flex items-center justify-center rounded-lg transition-colors duration-200 border
                                        ${isSelected 
                                            ? 'gap-2 px-4 py-3 text-white font-semibold shadow-lg' 
                                            : 'w-12 h-12 bg-slate-700/80 hover:bg-slate-700'
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
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CategoryButtons;
