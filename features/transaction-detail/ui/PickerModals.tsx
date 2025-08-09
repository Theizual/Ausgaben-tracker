import React, { FC, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { User, Transaction } from '@/shared/types';
import { useApp } from '@/contexts/AppContext';
import { Modal, CheckSquare, CategoryButtons } from '@/shared/ui';
import { TagEditorModal } from './TagEditorModal';

export const PickerModals: FC<{
    isPickingCategory: boolean;
    setIsPickingCategory: (value: boolean) => void;
    handleCategoryUpdate: (id: string) => void;
    isPickingUser: boolean;
    setIsPickingUser: (value: boolean) => void;
    handleUserUpdate: (id: string | null) => void;
    isEditingTags: boolean;
    setIsEditingTags: (value: boolean) => void;
    handleTagsUpdate: (tags: string[]) => void;
    currentTransaction: Transaction;
}> = ({
    isPickingCategory, setIsPickingCategory, handleCategoryUpdate,
    isPickingUser, setIsPickingUser, handleUserUpdate,
    isEditingTags, setIsEditingTags, handleTagsUpdate,
    currentTransaction,
}) => {
    const { categories, categoryGroups, users, allAvailableTags, tagMap } = useApp();
    const currentTagNames = useMemo(() => (currentTransaction.tagIds || []).map((id:string) => tagMap.get(id)).filter(Boolean) as string[], [currentTransaction.tagIds, tagMap]);

    return (
        <>
            <AnimatePresence>
                {isPickingCategory && (
                     <Modal isOpen={isPickingCategory} onClose={() => setIsPickingCategory(false)} title="Kategorie ändern">
                        <CategoryButtons 
                            categories={categories}
                            categoryGroups={categoryGroups}
                            selectedCategoryId={currentTransaction.categoryId}
                            onSelectCategory={handleCategoryUpdate}
                        />
                     </Modal>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isPickingUser && (
                     <Modal isOpen={isPickingUser} onClose={() => setIsPickingUser(false)} title="Benutzer ändern">
                        <div className="space-y-2">
                         {users.map((user: User) => (
                            <button
                                key={user.id}
                                onClick={() => handleUserUpdate(user.id)}
                                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-slate-700/50 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{backgroundColor: user.color}}>
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-white">{user.name}</span>
                                {currentTransaction.createdBy === user.id && <CheckSquare className="h-5 w-5 text-rose-400 ml-auto" />}
                            </button>
                         ))}
                        </div>
                     </Modal>
                )}
            </AnimatePresence>
             <AnimatePresence>
                {isEditingTags && (
                     <TagEditorModal
                        initialTagNames={currentTagNames}
                        onSave={handleTagsUpdate}
                        onClose={() => setIsEditingTags(false)}
                     />
                )}
            </AnimatePresence>
        </>
    );
};
