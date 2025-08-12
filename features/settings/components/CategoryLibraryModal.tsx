import React, { useState, useMemo, FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import type { Category, Group } from '@/shared/types';
import { Button, iconMap, Trash2, Plus, DownloadCloud, Star, getIconComponent, Info } from '@/shared/ui';
import { FIXED_COSTS_GROUP_ID, DEFAULT_GROUP_ID, FIXED_COSTS_GROUP_NAME, DEFAULT_GROUP_NAME } from '@/constants';
import { CategoryEditModal, CategoryFormData } from './CategoryEditModal';
import { parseISO } from 'date-fns';
import { settingsContentAnimation } from '@/shared/lib/animations';

const MotionDiv = motion.div;

export const CategoryLibrarySettings: FC<{ onEditGroupDesign: (group: Group) => void }> = ({ onEditGroupDesign }) => {
    const { 
        categories, groups, upsertCategory, deleteCategory, addGroup, deleteGroup, 
        loadStandardConfiguration, unassignedCategories, favoriteIds, toggleFavorite, transactions, openReassignModal,
        currentUserId, updateCategoryColorOverride,
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
            // Case 1: Existing category, with "override color" toggled ON.
            // Save the color change only for the current user.
            updateCategoryColorOverride(currentUserId, data.id, data.color);
    
            // Save all other changes (name, icon, group, etc.) globally,
            // but explicitly keep the original global color.
            const originalCategory = categories.find(c => c.id === data.id);
            if (originalCategory) {
                const globalUpdates = { ...data, color: originalCategory.color };
                upsertCategory(globalUpdates);
                toast.success(`Änderungen für "${data.name}" gespeichert, Farbe personalisiert.`);
            } else {
                // Fallback: This should not happen if it's not a new category.
                upsertCategory(data);
                toast.error(`Original-Kategorie nicht gefunden. Alle Änderungen wurden global gespeichert.`);
            }
        } else {
            // Case 2: New category OR "override color" is OFF.
            // All changes are saved globally.
            
            // First, remove any existing personal color override for this user/category.
            if (currentUserId) {
                updateCategoryColorOverride(currentUserId, data.id, null);
            }
            // Then, save all data globally.
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
    
        setEditingCategory(null); // Close the edit modal first
    
        if (txCount === 0) {
            if (window.confirm(`Möchtest du die Kategorie "${category.name}" wirklich löschen? Es sind keine Transaktionen damit verknüpft.`)) {
                deleteCategory(category.id);
                toast.success(`Kategorie "${category.name}" gelöscht.`);
            }
        } else {
            // Open the new reassign modal
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

    const Separator = () => <div className="border-b border-slate-700/50"></div>;

    const renderCategoryButton = (category: Category, onClick: () => void) => {
        const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
        const isFavorite = favoriteIds.includes(category.id);
        return (
            <div key={category.id} className="relative">
                <button type="button" onClick={onClick} className="flex items-center gap-2 px-3 py-2 text-white font-medium rounded-lg transition-colors duration-200 border-2 bg-slate-800/50 hover:bg-slate-700/80" style={{ borderColor: category.color }} title={category.name}>
                    <Icon className="h-5 w-5 shrink-0" style={{ color: category.color }} />
                    <span className="text-sm">{category.name}</span>
                </button>
                 <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(category.id); }}
                    className="absolute -top-1 -right-1 z-10 p-1 bg-slate-700 rounded-full text-slate-400 hover:text-yellow-400"
                    aria-pressed={isFavorite}
                    title={isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
                >
                    <Star className={`h-3 w-3 transition-all ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'hover:fill-yellow-400/50'}`} />
                </button>
            </div>
        );
    }

    const renderUnassignedButton = (category: Category, onClick: () => void) => {
        const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
        const isFavorite = favoriteIds.includes(category.id);
         return (
             <div key={category.id} className="relative">
                <button type="button" onClick={onClick} className="flex items-center gap-2 px-3 py-2 text-white font-medium rounded-lg transition-colors duration-200 border-2 border-dashed border-slate-500 hover:border-slate-400 bg-slate-800/50 hover:bg-slate-700/80" title={`"${category.name}" hinzufügen`}>
                    <Icon className="h-5 w-5 shrink-0" style={{ color: category.color }} />
                    <span className="text-sm">{category.name}</span>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(category.id); }}
                    className="absolute -top-1 -right-1 z-10 p-1 bg-slate-700 rounded-full text-slate-400 hover:text-yellow-400"
                    aria-pressed={isFavorite}
                    title={isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
                >
                    <Star className={`h-3 w-3 transition-all ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'hover:fill-yellow-400/50'}`} />
                </button>
             </div>
        );
    }

    return (
        <>
            <MotionDiv variants={settingsContentAnimation} initial="initial" animate="animate" exit="exit" key="categories">
                <h3 className="text-lg font-semibold text-white mb-1">Kategorien-Bibliothek</h3>
                <p className="text-sm text-slate-400 mb-6">Verwalten Sie hier alle Ihre Kategoriegruppen und Kategorien. Fügen Sie neue hinzu, benennen Sie sie um oder laden Sie die Standardkonfiguration.</p>
                
                <div className="bg-sky-900/50 border border-sky-700/50 text-sky-300 text-sm rounded-lg p-4 flex items-start gap-3 mb-6">
                    <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                        Klicke auf den Stern ⭐ bei einer Kategorie, um sie als Favorit festzulegen. Favoriten erscheinen für einen schnelleren Zugriff direkt im "Schnell hinzufügen"-Formular.
                    </div>
                </div>

                <div className="space-y-6">
                    {/* 1. FLEXIBLE GROUPS */}
                    {flexibleGroupsData.map(group => {
                        const GroupIcon = getIconComponent(group.icon);
                        return (
                        <div key={group.id}>
                            <button onClick={() => onEditGroupDesign(group)} className="w-full text-left rounded p-1 -m-1" title="Gruppen-Design bearbeiten">
                                <div className="flex items-center gap-2 mb-3">
                                    <GroupIcon className="h-4 w-4 text-slate-500" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-white transition-colors">{group.name}</h4>
                                </div>
                            </button>
                            <div className="flex flex-wrap gap-2">
                                {group.categories.length > 0 ? (
                                    group.categories.map(category => renderCategoryButton(category, () => handleOpenEditor(category)))
                                ) : <p className="text-sm text-slate-500 italic ml-1">Keine Kategorien in dieser Gruppe.</p>}
                                <button onClick={() => handleOpenEditor({ groupId: group.id })} className="w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-200 border-2 border-dashed border-slate-500 hover:border-slate-400 bg-slate-800/50 hover:bg-slate-700/80" title="Neue Kategorie hinzufügen">
                                    <Plus className="h-6 w-6 text-slate-400" />
                                </button>
                                <button onClick={() => handleDeleteGroup(group)} className="w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-200 border-2 border-dashed border-red-500/50 hover:border-red-400 bg-slate-800/50 hover:bg-red-900/40" title="Gruppe löschen">
                                    <Trash2 className="h-5 w-5 text-red-500" />
                                </button>
                            </div>
                        </div>
                    )})}
                    
                    <Separator />

                    {/* 2. ADD NEW GROUP */}
                    <div className="flex gap-3">
                        <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Neue Gruppe hinzufügen" className="w-full max-w-xs bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500" />
                        <Button onClick={handleAddGroup}><Plus className="h-4 w-4"/> Gruppe erstellen</Button>
                    </div>
                    
                    <Separator />
                    
                    {/* 3. FIXED COSTS GROUP (Non-editable structure) */}
                    {fixedGroupData && (() => {
                        const FixedGroupIcon = getIconComponent(fixedGroupData.icon);
                        return (
                            <div>
                                <button onClick={() => onEditGroupDesign(fixedGroupData)} className="w-full text-left rounded p-1 -m-1" title="Gruppen-Design bearbeiten">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="h-4 w-4 text-slate-500">
                                            <FixedGroupIcon className="h-full w-full" />
                                        </div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-white transition-colors">{fixedGroupData.name}</h4>
                                    </div>
                                </button>
                                <div className="flex flex-wrap gap-2">
                                    {fixedGroupData.categories.map(category => renderCategoryButton(category, () => handleOpenEditor(category)))}
                                    <button onClick={() => handleOpenEditor({ groupId: fixedGroupData.id })} className="w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-200 border-2 border-dashed border-slate-500 hover:border-slate-400 bg-slate-800/50 hover:bg-slate-700/80" title="Neue Kategorie hinzufügen">
                                        <Plus className="h-6 w-6 text-slate-400" />
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                    
                    <Separator />

                    {/* 4. UNASSIGNED & STANDARD */}
                    <div>
                         <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 ml-1">Verfügbare Standard-Kategorien</h4>
                         <p className="text-sm text-slate-400 mb-4">Fügen Sie Kategorien aus der Standardbibliothek zu Ihren Gruppen hinzu oder laden Sie die komplette Standardkonfiguration.</p>
                         <div className="flex flex-wrap gap-2 mb-6">
                            {unassignedCategories.map(category => renderUnassignedButton(category, () => handleOpenEditor(category)))}
                         </div>
                         <Button onClick={loadStandardConfiguration} variant="secondary">
                            <DownloadCloud className="h-4 w-4" />
                            Standardkonfiguration laden
                        </Button>
                    </div>

                </div>
            </MotionDiv>

            <AnimatePresence>
                {editingCategory && (
                    <CategoryEditModal
                        isOpen={!!editingCategory}
                        onClose={() => setEditingCategory(null)}
                        categoryData={editingCategory}
                        onSave={handleSaveCategory}
                        onDelete={handleDeleteCategoryRequest}
                    />
                )}
            </AnimatePresence>
        </>
    );
};