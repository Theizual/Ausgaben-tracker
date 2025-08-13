import React, { useState, useMemo, FC, useEffect } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import type { Category, Group } from '@/shared/types';
import { Button, Trash2, Plus, DownloadCloud, Star, getIconComponent, Info, GripVertical } from '@/shared/ui';
import { FIXED_COSTS_GROUP_ID, DEFAULT_GROUP_ID, DEFAULT_GROUP_NAME } from '@/constants';
import { CategoryEditModal, CategoryFormData } from './CategoryEditModal';
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-lg">
                <div
                    onPointerDown={(e) => dragControls.start(e)}
                    className="p-2 cursor-grab active:cursor-grabbing text-slate-500 hover:text-white touch-none"
                    aria-label={`Kategorie ${category.name} verschieben`}
                >
                    <GripVertical className="h-4 w-4" />
                </div>
                 <button
                    type="button"
                    onClick={() => onEdit(category)}
                    className="flex items-center gap-2 pl-1 pr-3 py-1 text-white font-medium transition-colors duration-200 flex-1 rounded-md hover:bg-slate-700/50"
                    title={category.name}
                >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center border-2 flex-shrink-0" style={{ borderColor: category.color }}>
                        <Icon className="h-4 w-4" style={{ color: category.color }} />
                    </div>
                    <span className="text-sm truncate">{category.name}</span>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(category.id); }}
                    className="p-2 text-slate-400 hover:text-yellow-400"
                    aria-pressed={isFavorite}
                    title={isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
                >
                    <Star className={`h-4 w-4 transition-all ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'hover:fill-yellow-400/50'}`} />
                </button>
            </div>
        </Reorder.Item>
    );
};

const GroupItem: FC<{
    group: Group;
    categories: Category[];
    onEditGroupDesign: (group: Group) => void;
    onDeleteGroup: (group: Group) => void;
    onRenameGroup: (id: string, newName: string) => void;
    onEditCategory: (category: CategoryFormData) => void;
}> = ({ group, categories, onEditGroupDesign, onDeleteGroup, onRenameGroup, onEditCategory }) => {
    const { reorderCategories, favoriteIds, toggleFavorite } = useApp();
    const [localCategories, setLocalCategories] = useState(categories);
    const [isEditing, setIsEditing] = useState(false);
    const [nameValue, setNameValue] = useState(group.name);
    const dragControls = useDragControls();
    
    useEffect(() => { setLocalCategories(categories); }, [categories]);

    const handleReorder = (newOrder: Category[]) => {
        setLocalCategories(newOrder);
        reorderCategories(newOrder);
    };

    const handleRename = () => {
        if (nameValue.trim() && nameValue.trim() !== group.name) {
            onRenameGroup(group.id, nameValue.trim());
        }
        setIsEditing(false);
    };

    const GroupIcon = getIconComponent(group.icon);
    const isProtected = group.id === DEFAULT_GROUP_ID || group.id === FIXED_COSTS_GROUP_ID;

    return (
         <div className="bg-slate-700/30 p-3 rounded-lg">
            <div className="flex items-center justify-between gap-2">
                <div
                    onPointerDown={(e) => { e.preventDefault(); dragControls.start(e); }}
                    className="p-2 -ml-2 text-slate-500 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
                    aria-label={`Gruppe ${group.name} verschieben`}
                >
                    <GripVertical className="h-5 w-5" />
                </div>
                <button 
                    onClick={() => onEditGroupDesign(group)}
                    className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-transparent border-2 hover:bg-slate-700/50 transition-colors"
                    style={{ borderColor: group.color }}
                    title="Design ändern"
                >
                    <GroupIcon className="h-4 w-4" style={{ color: group.color }} />
                </button>
                 <div className="flex-grow min-w-0">
                    {isEditing ? (
                        <input type="text" value={nameValue} onChange={(e) => setNameValue(e.target.value)} onBlur={handleRename} onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsEditing(false); }} className="font-semibold text-white bg-slate-600/50 rounded px-2 py-1 w-full focus:ring-2 focus:ring-rose-500 focus:outline-none" autoFocus />
                    ) : (
                        <button onClick={() => !isProtected && setIsEditing(true)} className="w-full text-left p-1 -m-1" disabled={isProtected} title={isProtected ? "Diese Gruppe kann nicht umbenannt werden" : "Gruppenname bearbeiten"}>
                            <h4 className="font-semibold text-white truncate">{group.name}</h4>
                        </button>
                    )}
                </div>
                 {!isProtected && ( <Button variant="destructive-ghost" size="icon-auto" onClick={() => onDeleteGroup(group)} title="Gruppe löschen"><Trash2 className="h-5 w-5" /></Button> )}
            </div>
             <div className="pl-10 mt-3 pt-3 border-t border-slate-700/50">
                 <Reorder.Group axis="y" values={localCategories} onReorder={handleReorder} className="space-y-1">
                     {localCategories.map(cat => ( <CategoryReorderItem key={cat.id} category={cat} onEdit={onEditCategory} onToggleFavorite={toggleFavorite} isFavorite={favoriteIds.includes(cat.id)} /> ))}
                 </Reorder.Group>
                <button onClick={() => onEditCategory({ groupId: group.id } as CategoryFormData)} className="mt-2 w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700/50 transition-colors"><Plus className="h-4 w-4" /> Neue Kategorie</button>
            </div>
        </div>
    );
};


export const CategoryLibrarySettings: FC<{ onEditGroupDesign: (group: Group) => void }> = ({ onEditGroupDesign }) => {
    const { 
        categories, groups, upsertCategory, addGroup, deleteGroup, renameGroup, reorderGroups,
        loadStandardConfiguration, unassignedCategories, transactions, openReassignModal,
        currentUserId, updateCategoryColorOverride
    } = useApp();
    
    const [orderedGroups, setOrderedGroups] = useState(groups);
    const [editingCategory, setEditingCategory] = useState<CategoryFormData | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    
    useEffect(() => { setOrderedGroups(groups); }, [groups]);

    const groupedCategories = useMemo(() => {
        const map = new Map<string, Category[]>();
        categories.forEach(category => {
            const list = map.get(category.groupId) || [];
            list.push(category);
            map.set(category.groupId, list);
        });
        return map;
    }, [categories]);

    const handleReorderGroups = (newOrder: Group[]) => {
        setOrderedGroups(newOrder);
        reorderGroups(newOrder);
    };

    const handleOpenEditor = (category: Partial<Category> & { groupId: string }) => {
        const existingCategory = categories.find(c => c.id === category.id);
        const categoryToEdit = existingCategory ? { ...existingCategory } : { ...category, id: category.id || `new_${Date.now()}`, name: category.name || '', icon: category.icon || 'MoreHorizontal', color: category.color || '#808080', budget: category.budget || 0 };
        setEditingCategory(categoryToEdit as CategoryFormData);
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
            }
        } else {
            if (currentUserId) updateCategoryColorOverride(currentUserId, data.id, null);
            upsertCategory(data);
            toast.success(`Kategorie "${data.name}" gespeichert.`);
        }
        setEditingCategory(null);
    };

    const handleDeleteCategoryRequest = (category: CategoryFormData) => {
        const associatedTransactions = transactions.filter(t => t.categoryId === category.id && !t.isDeleted).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        const txCount = associatedTransactions.length;
        setEditingCategory(null);
        if (txCount > 0) {
            openReassignModal(category, txCount, associatedTransactions);
        } else if (window.confirm(`Möchtest du die Kategorie "${category.name}" wirklich löschen?`)) {
            upsertCategory({ ...category, isDeleted: true });
            toast.success(`Kategorie "${category.name}" gelöscht.`);
        }
    };

    const handleAddGroup = () => {
        if (newGroupName.trim()) {
            addGroup(newGroupName.trim());
            setNewGroupName('');
        }
    };
    
    const handleDeleteGroup = (group: Group) => {
        if (window.confirm(`Gruppe "${group.name}" wirklich löschen? Zugehörige Kategorien werden automatisch in "${DEFAULT_GROUP_NAME}" verschoben.`)) {
            deleteGroup(group.id);
        }
    };

    const Separator = () => <div className="border-b border-slate-700/50 my-6"></div>;

    return (
        <>
            <MotionDiv variants={settingsContentAnimation} initial="initial" animate="animate" exit="exit" key="categories">
                <h3 className="text-lg font-semibold text-white mb-1">Gruppen & Kategorien</h3>
                <p className="text-sm text-slate-400 mb-6">Verwalten Sie hier Ihre Ausgabenstruktur. Sortieren Sie Gruppen und Kategorien per Drag & Drop.</p>
                
                <div className="bg-sky-900/50 border border-sky-700/50 text-sky-300 text-sm rounded-lg p-4 flex items-start gap-3 mb-6">
                    <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                        Fassen Sie eine Gruppe oder Kategorie am Griff-Symbol <GripVertical className="inline h-4 w-4 -mt-1" /> an, um sie zu verschieben und neu anzuordnen.
                    </div>
                </div>

                <Reorder.Group axis="y" values={orderedGroups} onReorder={handleReorderGroups} className="space-y-3">
                    {orderedGroups.map(group => (
                        <Reorder.Item key={group.id} value={group}>
                             <GroupItem
                                group={group}
                                categories={groupedCategories.get(group.id) || []}
                                onEditGroupDesign={onEditGroupDesign}
                                onDeleteGroup={handleDeleteGroup}
                                onRenameGroup={renameGroup}
                                onEditCategory={handleOpenEditor}
                            />
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
                
                <Separator />
                
                <div className="flex gap-3">
                    <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()} placeholder="Neue Gruppe hinzufügen" className="w-full max-w-xs bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500" />
                    <Button onClick={handleAddGroup}><Plus className="h-4 w-4"/> Gruppe erstellen</Button>
                </div>
                
                <Separator />
                
                <div>
                     <h4 className="text-md font-semibold text-white mb-3">Standard-Kategorien</h4>
                     <p className="text-sm text-slate-400 mb-4">Fügen Sie Kategorien aus der Standardbibliothek zu Ihren Gruppen hinzu oder laden Sie die komplette Konfiguration neu.</p>
                     <div className="flex flex-wrap gap-2 mb-6">
                        {unassignedCategories.map(category => (
                            <button key={category.id} type="button" onClick={() => handleOpenEditor(category)} className="flex items-center gap-2 px-3 py-2 text-white font-medium rounded-lg transition-colors duration-200 border-2 border-dashed border-slate-500 hover:border-slate-400 bg-slate-800/50 hover:bg-slate-700/80" title={`"${category.name}" hinzufügen`}>
                                <Plus className="h-4 w-4 text-slate-400"/>
                                <span className="text-sm">{category.name}</span>
                            </button>
                        ))}
                     </div>
                     <Button onClick={loadStandardConfiguration} variant="secondary">
                        <DownloadCloud className="h-4 w-4" />
                        Standardkonfiguration laden
                    </Button>
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