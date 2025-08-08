
import React, { useState, useMemo, FC } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '../../../contexts/AppContext';
import type { Category } from '../../../types';
import { useEscapeKey } from '../../../hooks/useEscapeKey';
import { Modal, Button, iconMap, X, Trash2, Plus, DownloadCloud } from '../../../components/ui';
import { FIXED_COSTS_GROUP_NAME, INITIAL_CATEGORIES } from '../../../constants';
import { CategoryEditModal, CategoryFormData } from './CategoryEditModal';

export const CategoryLibraryModal: FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { 
        categories, categoryGroups, upsertCategory, deleteCategory, renameGroup, addGroup, deleteGroup, 
        loadStandardConfiguration, unassignedCategories
    } = useApp();

    const [editingCategory, setEditingCategory] = useState<CategoryFormData | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [editingGroup, setEditingGroup] = useState<string | null>(null);
    const [groupNameValue, setGroupNameValue] = useState('');
    
    const { flexibleGroupsData, fixedGroupData } = useMemo(() => {
        const groupMap = new Map<string, Category[]>();
        categories.forEach(category => {
            const group = category.group;
            if (!groupMap.has(group)) groupMap.set(group, []);
            groupMap.get(group)!.push(category);
        });
        
        const allGroupsData = categoryGroups.map(groupName => ({
            name: groupName,
            categories: groupMap.get(groupName) || []
        }));

        const flexible = allGroupsData.filter(g => g.name !== FIXED_COSTS_GROUP_NAME);
        const fixed = allGroupsData.find(g => g.name === FIXED_COSTS_GROUP_NAME);
        
        return { flexibleGroupsData: flexible, fixedGroupData: fixed };
    }, [categories, categoryGroups]);

    const handleOpenEditor = (libraryCategory: Omit<Category, 'lastModified' | 'version'> | Category) => {
        const existingCategory = categories.find(c => c.id === libraryCategory.id);
        const categoryToEdit = existingCategory ? { ...existingCategory } : { ...libraryCategory, budget: libraryCategory.budget || 0 };
        setEditingCategory(categoryToEdit);
    };
    
    const handleSaveCategory = (data: CategoryFormData) => {
        upsertCategory(data);
        toast.success(`Kategorie "${data.name}" gespeichert.`);
        setEditingCategory(null);
    };

    const handleRenameGroup = (oldName: string) => {
        if (!oldName || !groupNameValue.trim() || oldName === groupNameValue.trim()) {
            setEditingGroup(null);
            return;
        }
        renameGroup(oldName, groupNameValue.trim());
        setEditingGroup(null);
    };

    const handleAddGroup = () => {
        if (newGroupName.trim()) {
            addGroup(newGroupName.trim());
            setNewGroupName('');
        }
    };
    
    const handleDeleteGroup = (groupName: string) => {
        if (groupName === 'Sonstiges' || groupName === FIXED_COSTS_GROUP_NAME) {
            toast.error(`Die Gruppe "${groupName}" kann nicht gelöscht werden.`);
            return;
        }
        if (window.confirm(`Gruppe "${groupName}" wirklich löschen? Zugehörige Kategorien werden automatisch in "Sonstiges" verschoben.`)) {
            deleteGroup(groupName);
        }
    };

    useEscapeKey(() => { editingCategory ? setEditingCategory(null) : onClose(); });

    const Separator = () => <div className="border-b border-slate-700/50"></div>;
    
    const footer = (
        <div className="text-right">
            <Button onClick={onClose}>Fertig</Button>
        </div>
    );

    return (
        <>
            <Modal 
                isOpen={isOpen} 
                onClose={onClose} 
                title="Kategorien-Bibliothek" 
                size="3xl"
                footer={footer}
            >
                <div className="space-y-6">
                    {/* 1. FLEXIBLE GROUPS */}
                    {flexibleGroupsData.map(group => (
                        <div key={group.name}>
                            {editingGroup === group.name ? (
                                <div className="flex items-center gap-2 mb-3">
                                    <input type="text" value={groupNameValue} onChange={(e) => setGroupNameValue(e.target.value)} onBlur={() => handleRenameGroup(group.name)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRenameGroup(group.name); } if (e.key === 'Escape') { e.preventDefault(); setEditingGroup(null); }}} className="text-xs font-bold uppercase tracking-wider text-white bg-theme-input rounded p-1 ml-1 w-full max-w-xs focus:ring-2 focus:ring-theme-ring focus:outline-none" autoFocus />
                                </div>
                            ) : (
                                <button onClick={() => { setEditingGroup(group.name); setGroupNameValue(group.name); }} className="w-full text-left rounded" title="Gruppenname bearbeiten">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 ml-1 hover:text-white transition-colors">{group.name}</h4>
                                </button>
                            )}
                            <div className="flex flex-wrap gap-2">
                                {group.categories.length > 0 ? (
                                    group.categories.map(category => {
                                        const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
                                        return (
                                            <button key={category.id} type="button" onClick={() => handleOpenEditor(category)} className="w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-200 border-2 bg-slate-700/50 opacity-80 hover:opacity-100 relative" style={{ borderColor: category.color }} title={`${category.name} (Bearbeiten)`}>
                                                <Icon className="h-6 w-6" style={{ color: category.color }} />
                                                <button onClick={(e) => { e.stopPropagation(); deleteCategory(category.id);}} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-slate-900 hover:bg-red-400 transition-colors" title={`${category.name} entfernen`}><X className="h-3 w-3" /></button>
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="flex items-center w-full">
                                        <p className="text-sm text-slate-500 italic px-2">In dieser Gruppe befindet sich keine Kategorie.</p>
                                        {group.name !== 'Sonstiges' && (
                                            <Button variant="destructive-ghost" size="icon-auto" onClick={() => handleDeleteGroup(group.name)} title={`Leere Gruppe "${group.name}" löschen`}><Trash2 className="h-4 w-4" /></Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    <Separator />

                    {/* 2. FIXED GROUP */}
                    {fixedGroupData && (
                        <div key={fixedGroupData.name}>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 ml-1">{fixedGroupData.name}</h4>
                            <div className="flex flex-wrap gap-2">
                                {fixedGroupData.categories.map(category => {
                                    const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
                                    return (
                                        <button key={category.id} type="button" onClick={() => handleOpenEditor(category)} className="w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-200 border-2 bg-slate-700/50 opacity-80 hover:opacity-100 relative" style={{ borderColor: category.color }} title={`${category.name} (Bearbeiten)`}>
                                            <Icon className="h-6 w-6" style={{ color: category.color }} />
                                            <button onClick={(e) => { e.stopPropagation(); deleteCategory(category.id);}} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-slate-900 hover:bg-red-400 transition-colors" title={`${category.name} entfernen`}><X className="h-3 w-3" /></button>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <Separator />

                    {/* 3. UNASSIGNED CATEGORIES */}
                    {unassignedCategories.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 ml-1">Nicht zugeordnete Kategorien</h4>
                            <div className="flex flex-wrap gap-2">
                                {unassignedCategories.map(category => {
                                    const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
                                    return (
                                        <button key={category.id} type="button" onClick={() => handleOpenEditor(category)} className="w-12 h-12 flex items-center justify-center rounded-lg bg-slate-700/80 hover:bg-slate-700 border-2 transition-colors duration-200" style={{ borderColor: category.color }} title={`${category.name} (Hinzufügen)`}>
                                            <Icon className="h-6 w-6" style={{ color: category.color }} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                     <Separator />

                    {/* 4. NEW GROUP INPUT */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 ml-1">Neue Kategoriegruppe</h4>
                        <div className="flex items-center gap-3">
                            <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddGroup(); }} placeholder="Name der neuen Gruppe" className={`flex-grow w-full bg-theme-input border border-theme-border rounded-md px-3 py-2 text-white placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-ring`} />
                            <Button onClick={handleAddGroup} variant="primary" size="icon" title="Neue Gruppe hinzufügen"><Plus className="h-5 w-5" /></Button>
                        </div>
                    </div>
                    
                    <Separator />

                    {/* 5. PRESETS */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 ml-1">Voreinstellungen</h4>
                        <Button onClick={loadStandardConfiguration} variant="secondary" className="w-full justify-center">
                            <DownloadCloud className="h-4 w-4 mr-2" />
                            Standardkonfiguration laden
                        </Button>
                    </div>

                </div>
            </Modal>
            <AnimatePresence>
            {editingCategory && (
                <CategoryEditModal isOpen={!!editingCategory} onClose={() => setEditingCategory(null)} categoryData={editingCategory} onSave={handleSaveCategory} />
            )}
            </AnimatePresence>
        </>
    );
};
