
import React, { FC } from 'react';
import type { Category } from '../../../types';
import { Modal, iconMap } from '../../../components/ui';
import { FIXED_COSTS_GROUP_NAME } from '../../../constants';

export const MoreCategoriesModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelectCategory: (categoryId: string) => void;
    fixedCategories: Category[];
    unassignedCategories: Category[];
}> = ({ isOpen, onClose, onSelectCategory, fixedCategories, unassignedCategories }) => {
    
    const unassignedGroup = {
        name: 'Nicht zugewiesene Kategorien',
        categories: unassignedCategories,
    };
    
    const fixedGroup = {
        name: FIXED_COSTS_GROUP_NAME,
        categories: fixedCategories,
    };
    
    const groupsToDisplay = [fixedGroup, unassignedGroup].filter(g => g.categories.length > 0);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Weitere Kategorien auswählen"
            size="2xl"
        >
            <div className="space-y-4">
                {groupsToDisplay.map(group => (
                    <div key={group.name}>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">{group.name}</h4>
                        <div className="flex flex-wrap gap-2">
                            {group.categories.map(category => {
                                const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
                                return (
                                    <button
                                        key={category.id}
                                        type="button"
                                        onClick={() => onSelectCategory(category.id)}
                                        className="flex items-center gap-2 px-3 py-2 text-white font-medium rounded-lg transition-colors duration-200 border-2 bg-theme-card hover:bg-theme-input"
                                        style={{ borderColor: category.color }}
                                        title={category.name}
                                    >
                                        <Icon className="h-5 w-5 shrink-0" style={{ color: category.color }} />
                                        <span className="text-sm">{category.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </Modal>
    );
};
