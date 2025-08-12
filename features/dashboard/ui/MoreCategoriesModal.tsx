
import React, { FC, useState, useEffect } from 'react';
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
    } = useApp();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setExpandedId(null);
        }
    }, [isOpen]);

    const handleCategoryClick = (categoryId: string) => {
        if (expandedId === categoryId) {
            // Second click: confirm selection
            onSelectCategory(categoryId);
        } else {
            // First click: expand
            setExpandedId(categoryId);
        }
    };

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
                selectedCategoryId={expandedId || ''}
                onSelectCategory={handleCategoryClick}
                showGroups={true}
                favoriteIds={favoriteIds}
            />
        </Modal>
    );
};
