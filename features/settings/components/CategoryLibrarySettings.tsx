import React, { useState, useMemo, FC, useEffect, useRef } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp, useUIContext } from '@/contexts/AppContext';
import type { Category, Group } from '@/shared/types';
import { Button, Trash2, Plus, DownloadCloud, Star, getIconComponent, Info, GripVertical, ChevronDown, ArrowUpDown, Edit, Eye, EyeOff, ToggleSwitch } from '@/shared/ui';
import { FIXED_COSTS_GROUP_ID, DEFAULT_GROUP_ID, DEFAULT_GROUP_NAME } from '@/constants';
import { CategoryEditModal } from './CategoryEditModal';
import { parseISO } from 'date-fns';
import { settingsContentAnimation, collapsibleAnimation } from '@/shared/lib/animations';
import useLocalStorage from '@/shared/hooks/useLocalStorage';
import { clsx } from 'clsx';

export type CategoryFormData = {
    id: string;
    name: string;
    icon: string;
    groupId: string;
    color: string;
    budget?: number;
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

const CategoryReorderItem: FC<{
    category: Category;
    onEdit: (category: Partial<Category> & { groupId?: string }) => void;
    onToggleFavorite: (id: string) => void;
    isFavorite: boolean;
    isDnDEnabled: boolean;
}> = ({ category, onEdit, onToggleFavorite, isFavorite, isDnDEnabled }) => {
    const { upsertCategory } = useApp();
    const dragControls = useDragControls();
    const Icon = getIconComponent(category.icon);

    const [isNameEditing, setIsNameEditing] = useState(false);
    const [nameValue, setNameValue] = useState(category.name);

    useEffect(() => { setNameValue(category.name); }, [category.name]);

    const handleNameUpdate = () => {
        const trimmed = nameValue.trim();
        if (trimmed && trimmed !== category.name) {
            upsertCategory({ ...category, name: trimmed });
            toast.success("Kategoriename aktualisiert.");
        } else {
            setNameValue(category.name); // Revert if empty or unchanged
        }
        setIsNameEditing(false);
    };

    return (
        <Reorder.Item
            value={category}
            dragListener={false}
            dragControls={dragControls}
            drag={isDnDEnabled}
            className="relative pr-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg group">
                {isDnDEnabled && (
                    <div
                        onPointerDown={(e) => dragControls.start(e) }
                        className="p-2 cursor-grab active:cursor-grabbing text-slate-500 hover:text-white touch-none"
                        aria-label={`Kategorie ${category.name} verschieben`}
                    >
                        <GripVertical className="h-4 w-4" />
                    </div>
                )}
                <div className={clsx("flex items-center gap-2 pl-1 pr-3 py-1 flex-1 rounded-md min-w-0", !isDnDEnabled && "pl-3")}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center border-2 flex-shrink-0" style={{ borderColor: category.color }}>
                        <Icon className="h-4 w-4" style={{ color: category.color }} />
                    </div>
                     {isNameEditing ? (
                        <input type="text" value={nameValue} onChange={e => setNameValue(e.target.value)} onBlur={handleNameUpdate} onKeyDown={e => {if(e.key === 'Enter') handleNameUpdate(); if(e.key==='Escape') {setIsNameEditing(false); setNameValue(category.name);}}} className="text-sm bg-slate-600/50 rounded px-2 py-1 w-full focus:ring-2 focus:ring-rose-500 focus:outline-none" autoFocus />
                    ) : (
                        <button onClick={() => setIsNameEditing(true)} className="text-sm text-white truncate p-1 -m-1" title="Kategoriename bearbeiten">
                            {category.name}
                        </button>
                    )}
                </div>
                <button
                    onClick={() => onEdit(category)}
                    className="p-2 text-slate-400 hover:text-white opacity-100 focus-within:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    title="Kategorie bearbeiten"
                >
                    <Edit className="h-4 w-4" />
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

export const CategoryLibrarySettings: FC<{ onEditGroupDesign: (group: Group) => void }> = ({ onEditGroupDesign }) => {
    const { 
        categories, groups, upsertCategory, addGroup, deleteGroup, reorderGroups, reorderCategories,
        loadStandardConfiguration, unassignedCategories, transactions, openReassignModal,
        currentUserId, updateCategoryColorOverride,
        quickAddShowFavorites, setQuickAddShowFavorites, quickAddShowRecents, setQuickAddShowRecents
    } = useApp();
    const { isGroupDnDEnabled, setIsGroupDnDEnabled } = useUIContext();
    
    const [orderedGroups, setOrderedGroups] = useState(groups);
    const [editingCategory, setEditingCategory] = useState<CategoryFormData | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [expandedGroupIds, setExpandedGroupIds] = useLocalStorage<string[]>('settings-expanded-groups', []);
    const expandedStateBeforeDrag = useRef<string[]>([]);
    
    useEffect(() => { setOrderedGroups(groups); }, [groups]);

    const groupedCategories = useMemo(() => {
        const map = new Map<string, Category[]>();
        categories.forEach(category => {
            const list = map.get(category.groupId) || [];
            list.push(category);
            map.set(category.groupId, list);
        });
        map.forEach((cats, groupId) => {
            map.set(groupId, cats.sort((a,b) => a.sortIndex - b.sortIndex));
        });
        return map;
    }, [categories]);

    const handleReorderGroups = (newOrder: Group[]) => {
        setOrderedGroups(newOrder);
        reorderGroups(newOrder);
    };

    const handleGroupDragStart = () => {
        expandedStateBeforeDrag.current = expandedGroupIds;
        requestAnimationFrame(() => {
            setExpandedGroupIds([]);
        });
    };

    const handleGroupDragEnd = () => {
        setExpandedGroupIds(expandedStateBeforeDrag.current);
    };
    

    const handleOpenEditor = (category: Partial<Category> & { groupId: string }) => {
        const existingCategory = categories.find(c => c.id === category.id);
        const categoryToEdit = existingCategory ? { ...existingCategory } : { ...category, id: category.id || `new_${Date.now()}`, name: category.name || '', icon: category.icon || 'MoreHorizontal', color: category.color || '#808080', budget: category.budget || 0 };
        setEditingCategory(categoryToEdit as CategoryFormData);
    };
    
     const handleSaveCategory = (data: CategoryFormData, changeColorForAll: boolean) => {
        const isNewCategory = data.id.startsWith('new_');
        
        if (!isNewCategory && !changeColorForAll && currentUserId) {
            updateCategoryColorOverride(currentUserId, data.id, data.color);
            const originalCategory = categories.find(c => c.id === data.id);
            if (originalCategory) {
                const globalUpdates = { ...data, color: originalCategory.color };
                upsertCategory(globalUpdates);
            } else {
                 upsertCategory(data);
            }
            toast.success(`Änderungen für "${data.name}" gespeichert, Farbe personalisiert.`);
        } else {
            if (!isNewCategory && currentUserId) {
                updateCategoryColorOverride(currentUserId, data.id, null);
            }
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
    
    const toggleGroupExpand = (groupId: string) => {
        setExpandedGroupIds(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
    };

    const allGroupsExpanded = useMemo(() => {
        if (orderedGroups.length === 0) return false;
        return expandedGroupIds.length >= orderedGroups.length;
    }, [expandedGroupIds.length, orderedGroups.length]);

    const toggleAllGroups = () => {
        if (allGroupsExpanded) {
            setExpandedGroupIds([]);
        } else {
            setExpandedGroupIds(orderedGroups.map(g => g.id));
        }
    };

    const Separator = () => <div className="border-b border-slate-700/50 my-6"></div>;

    return (
        <>
            <motion.div 
                key="categories"
                {...{
                    variants: settingsContentAnimation,
                    initial: "initial",
                    animate: "animate",
                    exit: "exit",
                }}
            >
                <h3 className="text-lg font-semibold text-white mb-1">Gruppen & Kategorien</h3>
                <p className="text-sm text-slate-400 mb-6">Verwalten Sie hier Ihre Ausgabenstruktur. Sortieren Sie Gruppen und Kategorien per Drag & Drop.</p>
                
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg flex-grow">
                        <label htmlFor="dnd-toggle" className="block text-sm font-medium text-slate-300">Verschieben aktivieren</label>
                        <ToggleSwitch id="dnd-toggle" enabled={isGroupDnDEnabled} setEnabled={setIsGroupDnDEnabled} />
                    </div>
                    <Button variant="secondary" size="sm" onClick={toggleAllGroups} className="flex-shrink-0">
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        {allGroupsExpanded ? 'Alle einklappen' : 'Alle ausklappen'}
                    </Button>
                </div>

                <Reorder.Group axis="y" values={orderedGroups} onReorder={handleReorderGroups} className="space-y-2">
                    {orderedGroups.map(group => (
                        <GroupReorderWrapper
                            key={group.id}
                            group={group}
                            onDragStart={handleGroupDragStart}
                            onDragEnd={handleGroupDragEnd}
                            categories={groupedCategories.get(group.id) || []}
                            isExpanded={expandedGroupIds.includes(group.id)}
                            onToggleExpand={() => toggleGroupExpand(group.id)}
                            onEditGroupDesign={onEditGroupDesign}
                            onDeleteGroup={handleDeleteGroup}
                            onEditCategory={handleOpenEditor}
                            isDnDEnabled={isGroupDnDEnabled}
                        />
                    ))}
                </Reorder.Group>
                
                <Separator />
                
                <div className="flex gap-3">
                    <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()} placeholder="Neue Gruppe hinzufügen" className="w-full max-w-xs bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500" />
                    <Button onClick={handleAddGroup}><Plus className="h-4 w-4"/> Gruppe erstellen</Button>
                </div>
                
                <Separator />

                <div className="mb-6 p-4 bg-slate-700/30 rounded-lg space-y-4 border border-slate-700/50">
                    <h4 className="text-md font-semibold text-white">Schnelleingabe-Anzeige</h4>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-600/50">
                        <div>
                            <label htmlFor="fav-toggle" className="block text-sm font-medium text-slate-300">Favoriten anzeigen</label>
                            <p className="text-xs text-slate-400 mt-1">Zeigt deine als Favorit markierten Kategorien oben an.</p>
                        </div>
                        <ToggleSwitch id="fav-toggle" enabled={quickAddShowFavorites} setEnabled={setQuickAddShowFavorites} />
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-600/50">
                        <div>
                            <label htmlFor="recent-toggle" className="block text-sm font-medium text-slate-300">Zuletzt verwendete anzeigen</label>
                            <p className="text-xs text-slate-400 mt-1">Zeigt eine Liste deiner zuletzt genutzten Kategorien an.</p>
                        </div>
                        <ToggleSwitch id="recent-toggle" enabled={quickAddShowRecents} setEnabled={setQuickAddShowRecents} />
                    </div>
                </div>
                
                <div>
                     <h4 className="text-md font-semibold text-white mb-3">Standard-Kategorien</h4>
                     <p className="text-sm text-slate-400 mb-4">Fügen Sie Kategorien aus der Standardbibliothek zu Ihren Gruppen hinzu oder laden Sie die komplette Konfiguration neu.</p>
                     <div className="flex flex-wrap gap-2 mb-6">
                        {unassignedCategories.map(category => {
                            const Icon = getIconComponent(category.icon);
                            return (
                                <button key={category.id} type="button" onClick={() => handleOpenEditor(category)} className="flex items-center gap-2 px-3 py-2 text-white font-medium rounded-lg transition-colors duration-200 border-2 border-dashed border-slate-500 hover:border-slate-400 bg-slate-800/50 hover:bg-slate-700/80" title={`"${category.name}" hinzufügen`}>
                                    <Icon className="h-5 w-5 shrink-0" style={{ color: category.color }} />
                                    <span className="text-sm">{category.name}</span>
                                </button>
                            );
                        })}
                     </div>
                     <Button onClick={loadStandardConfiguration} variant="secondary">
                        <DownloadCloud className="h-4 w-4" />
                        Standardkonfiguration laden
                    </Button>
                </div>
            </motion.div>

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


interface GroupItemProps {
    group: Group;
    dragControls: ReturnType<typeof useDragControls>;
    categories: Category[];
    isExpanded: boolean;
    onToggleExpand: () => void;
    onEditGroupDesign: (group: Group) => void;
    onDeleteGroup: (group: Group) => void;
    onEditCategory: (category: Partial<Category> & { groupId: string }) => void;
    isDnDEnabled: boolean;
}

const GroupItem: FC<GroupItemProps> = ({ group, dragControls, categories, isExpanded, onToggleExpand, onEditGroupDesign, onDeleteGroup, onEditCategory, isDnDEnabled }) => {
    const { reorderCategories, favoriteIds, toggleFavorite, updateGroup } = useApp();
    const [localCategories, setLocalCategories] = useState(categories);
    
    useEffect(() => { setLocalCategories(categories); }, [categories]);

    const handleReorderCategories = (newOrder: Category[]) => {
        setLocalCategories(newOrder);
        reorderCategories(newOrder);
    };

    const GroupIcon = getIconComponent(group.icon);
    const isProtected = group.id === DEFAULT_GROUP_ID || group.id === FIXED_COSTS_GROUP_ID;
    const isFixedCosts = group.id === FIXED_COSTS_GROUP_ID;
    const groupRgb = hexToRgb(group.color);

    return (
         <div 
            className="relative group-gradient p-2 rounded-lg overflow-hidden"
            style={{ '--group-rgb': groupRgb } as React.CSSProperties}
        >
            <div className="relative">
                <div className="flex items-center gap-2">
                    {isDnDEnabled && (
                        <div
                            onPointerDown={(e) => dragControls.start(e)}
                            className="p-2 -ml-2 text-slate-500 cursor-grab active:cursor-grabbing touch-none"
                            aria-label={`Gruppe ${group.name} verschieben`}
                        >
                            <GripVertical className="h-5 w-5" />
                        </div>
                    )}
                     <button onClick={onToggleExpand} className={clsx("p-2 rounded-full hover:bg-slate-700/50", !isDnDEnabled && "-ml-2")} aria-expanded={isExpanded} aria-label={isExpanded ? "Gruppe einklappen" : "Gruppe ausklappen"}>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    <div className="flex-grow min-w-0 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 border-2" style={{ borderColor: group.color }}>
                            <GroupIcon className="h-4 w-4" style={{ color: group.color }} />
                        </div>
                         <div className="w-full text-left p-1 -m-1">
                            <h4 className="font-semibold text-white truncate">{group.name}</h4>
                        </div>
                    </div>
                     <div className="flex items-center gap-1 flex-shrink-0">
                        {!isFixedCosts && (
                            <Button variant="ghost" size="icon-auto" onClick={(e) => { e.stopPropagation(); updateGroup(group.id, { isHiddenInQuickAdd: !group.isHiddenInQuickAdd })}} title={group.isHiddenInQuickAdd ? "In Schnelleingabe anzeigen" : "In Schnelleingabe ausblenden"}>
                                {group.isHiddenInQuickAdd ? <EyeOff className="h-4 w-4 text-slate-500" /> : <Eye className="h-4 w-4 text-slate-400" />}
                            </Button>
                        )}
                        <Button variant="ghost" size="icon-auto" onClick={(e) => { e.stopPropagation(); onEditGroupDesign(group) }} title="Design und Name bearbeiten">
                            <Edit className="h-4 w-4 text-slate-400" />
                        </Button>
                        {!isProtected && ( <Button variant="destructive-ghost" size="icon-auto" onClick={(e) => { e.stopPropagation(); onDeleteGroup(group) }} title="Gruppe löschen"><Trash2 className="h-5 w-5" /></Button> )}
                    </div>
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div 
                            {...{
                                variants: collapsibleAnimation,
                                initial: "initial",
                                animate: "animate",
                                exit: "exit",
                            }}
                            className="overflow-hidden"
                        >
                            <div className="pl-10 mt-3 pt-3 border-t border-slate-700/50">
                                <Reorder.Group axis="y" values={localCategories} onReorder={handleReorderCategories} className="space-y-1">
                                    {localCategories.map(cat => ( <CategoryReorderItem key={cat.id} category={cat} onEdit={onEditCategory} onToggleFavorite={toggleFavorite} isFavorite={favoriteIds.includes(cat.id)} isDnDEnabled={isDnDEnabled} /> ))}
                                </Reorder.Group>
                                <button onClick={() => onEditCategory({ groupId: group.id })} className="mt-2 w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700/50 transition-colors"><Plus className="h-4 w-4" /> Neue Kategorie</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

interface GroupReorderWrapperProps extends Omit<GroupItemProps, 'dragControls'> {
    onDragStart: () => void;
    onDragEnd: () => void;
}

const GroupReorderWrapper: FC<GroupReorderWrapperProps> = ({ group, onDragStart, onDragEnd, isDnDEnabled, ...rest }) => {
    const dragControls = useDragControls();
    return (
        <Reorder.Item
            key={group.id}
            value={group}
            dragListener={false}
            dragControls={dragControls}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={onDragEnd}
            drag={isDnDEnabled}
            className={!isDnDEnabled ? "cursor-auto" : ""}
        >
            <GroupItem
                group={group}
                dragControls={dragControls}
                isDnDEnabled={isDnDEnabled}
                {...rest}
            />
        </Reorder.Item>
    );
};
