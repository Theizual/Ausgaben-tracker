import React, { useState, useMemo, FC, useEffect } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import type { Category, Group } from '@/shared/types';
import { Button, iconMap, Trash2, Plus, DownloadCloud, Star, getIconComponent, Info, GripVertical } from '@/shared/ui';
import { FIXED_COSTS_GROUP_ID, DEFAULT_GROUP_ID, FIXED_COSTS_GROUP_NAME, DEFAULT_GROUP_NAME } from '@/constants';
import { CategoryEditModal } from './CategoryEditModal';
import type { CategoryFormData } from './CategoryLibrarySettings';
import { parseISO } from 'date-fns';
import { settingsContentAnimation } from '@/shared/lib/animations';

const MotionDiv = motion.div;

const CategoryReorderItem: FC<{
    category: Category;
    onEdit: (category: Category) => void;
    onToggleFavorite: (id: string) => void;
    isFavorite: boolean;
}> = ({ category, onEdit, onToggleFavorite, isFavorite }) => {
    const dragControls = useDragControls();
    const Icon = getIconComponent(category.icon);

    return (
        <Reorder.Item
            value={category}
            dragListener={false}
            dragControls={dragControls}
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
        >
            <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg border-2" style={{ borderColor: category.color }}>
                <div
                    onPointerDown={(e) => dragControls.start(e)}
                    className="p-3 cursor-grab active:cursor-grabbing text-slate-500 hover:text-white touch-none"
                    aria-label="Kategorie verschieben"
                >
                    <GripVertical className="h-4 w-4" />
                </div>
                <button
                    type="button"
                    onClick={() => onEdit(category)}
                    className="flex items-center gap-2 pr-4 py-2 text-white font-medium transition-colors duration-200"
                    title={category.name}
                >
                    <Icon className="h-5 w-5 shrink-0" style={{ color: category.color }} />
                    <span className="text-sm">{category.name}</span>
                </button>
            </div>
             <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(category.id); }}
                className="absolute -top-1.5 -right-1.5 z-10 p-1 bg-slate-700 rounded-full text-slate-400 hover:text-yellow-400"
                aria-pressed={isFavorite}
                title={isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
            >
                <Star className={`h-3.5 w-3.5 transition-all ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'hover:fill-yellow-400/50'}`} />
            </button>
        </Reorder.Item>
    );
};


export const CategoryLibrarySettings: FC<{ onEditGroupDesign: (group: Group) => void }> = ({ onEditGroupDesign }) => {
    const { 
        categories, groups, upsertCategory, deleteCategory, addGroup, deleteGroup, 
        loadStandardConfiguration, unassignedCategories, favoriteIds, toggleFavorite, transactions, openReassignModal,
        currentUserId, updateCategoryColorOverride, reorderCategories
    } = useApp();

    const [editingCategory, setEditingCategory] = useState<CategoryFormData | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    
    const { flexibleGroupsData, fixedGroupData } = useMemo(() => {
        const groupMap = new Map<string, Category[]>();
        categories.forEach(category => {
            const group = category.groupId;
            if (!groupMap.has(group)) groupMap.set(group, []);
            groupMap.get(group)!.push(category);
        });
        
        const allGroupsData = groups.map(group => ({
            ...group,
            categories: groupMap.get(group.id) || []
        }));

        const flexible = allGroupsData.filter(g => g.id !== FIXED_COSTS_GROUP_ID);
        const fixed = allGroupsData.find(g => g.id === FIXED_COSTS_GROUP_ID);
        
        return { flexibleGroupsData: flexible, fixedGroupData: fixed };
    }, [categories, groups]);

    const handleOpenEditor = (libraryCategory: Partial<Category> & { groupId: string }) => {
        const existingCategory = categories.find(c => c.id === libraryCategory.id);
        const categoryToEdit = existingCategory ? { ...existingCategory } : { ...libraryCategory, id: libraryCategory.id || `new_${Date.now()}`, name: libraryCategory.name || '', icon: libraryCategory.icon || 'MoreHorizontal', color: libraryCategory.color || '#808080', budget: libraryCategory.budget || 0 };
        setEditingCategory(categoryToEdit);
    };
    
    const handleSaveCategory = (data: CategoryFormData, isColorOverride: boolean) => {
        const isNewCategory = data.id.startsWith('new_');
    
        if (isColorOverride && currentUserId && !isNewCategory) {
            updateCategoryColorOverride(currentUserId, data.id, data.color);
    
            const originalCategory = categories.find(c => c.id === data.id);
            if (originalCategory) {
                const globalUpdates = { ...data, color: originalCategory.color };
                upsertCategory(globalUpdates);
                toast.success(`Änderungen für "${data.name}" gespeichert, Farbe personalisiert.`);
            } else {
                upsertCategory(data);
                toast.error(`Original-Kategorie nicht gefunden. Alle Änderungen wurden global gespeichert.`);
            }
        } else {
            if (currentUserId) {
                updateCategoryColorOverride(currentUserId, data.id, null);
            }
            upsertCategory(data);
            toast.success(`Kategorie "${data.name}" gespeichert.`);
        }
    
        setEditingCategory(null);
    };

    const handleDeleteCategoryRequest = (category: CategoryFormData) => {
        const associatedTransactions = transactions
            .filter(t => t.categoryId === category.id && !t.isDeleted)
            .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        const txCount = associatedTransactions.length;
    
        setEditingCategory(null);
    
        if (txCount === 0) {
            if (window.confirm(`Möchtest du die Kategorie "${category.name}" wirklich löschen? Es sind keine Transaktionen damit verknüpft.`)) {
                deleteCategory(category.id);
                toast.success(`Kategorie "${category.name}" gelöscht.`);
            }
        } else {
            openReassignModal(category, txCount, associatedTransactions);
        }
    };

    const handleAddGroup = () => {
        if (newGroupName.trim()) {
            addGroup(newGroupName.trim());
            setNewGroupName('');
        }
    };
    
    const handleDeleteGroup = (group: Group) => {
        if (group.id === DEFAULT_GROUP_ID || group.id === FIXED_COSTS_GROUP_ID) {
            toast.error(`Die Gruppe "${group.name}" kann nicht gelöscht werden.`);
            return;
        }
        if (window.confirm(`Gruppe "${group.name}" wirklich löschen? Zugehörige Kategorien werden automatisch in die Gruppe "${DEFAULT_GROUP_NAME}" verschoben.`)) {
            deleteGroup(group.id);
        }
    };

    const Separator = () => <div className="border-b border-slate-