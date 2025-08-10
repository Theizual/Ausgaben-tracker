
import React, { FC } from 'react';
import type { Category } from '@/shared/types';
import { Modal, CategoryButtons } from '@/shared/ui';
import { useApp } from '@/contexts/AppContext';

export const MoreCategoriesModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelectCategory: (categoryId: string) => void;
}> = ({ isOpen, onClose, onSelectCategory }) => {
    const { 
        categories, 
        groups, 
        favoriteIds, 
        toggleFavorite,
        categoryMap
    } = useApp();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Alle Kategorien auswählen"
            size="2xl"
        >
            <CategoryButtons
                categories={categories}
                groups={groups}
                selectedCategoryId={''} // No persistent selection needed inside the modal
                onSelectCategory={onSelectCategory}
                showGroups={true}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
            />
        </Modal>
    );
};
