
import React, { useState, useMemo, FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import type { Category } from '@/shared/types';
import { Button, iconMap, Plus, DownloadCloud, Star, getIconComponent } from '@/shared/ui';
import { FIXED_COSTS_GROUP_ID } from '@/constants';
import { CategoryEditModal, CategoryFormData } from './CategoryEditModal';

const MotionDiv = motion.div;

export const CategoryLibrarySettings: FC = () => {
    const { 
        categories, groups, upsertCategory,
        loadStandardConfiguration, unassignedCategories, favoriteIds, toggleFavorite
    } = useApp();

    const [editingCategory, setEditingCategory] = useState<CategoryFormData | null>(null);
    
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
    
    const handleSaveCategory = (data: CategoryFormData) => {
        upsertCategory(data);
        toast.success(`Kategorie "${data.name}" gespeichert.`);
        setEditingCategory(null);
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
            <MotionDiv key="categories" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <h3 className="text-lg font-semibold text-white mb-1">Kategorien-Bibliothek</h3>
                <p className="text-sm text-slate-400 mb-6">Verwalten Sie hier alle Ihre Kategorien. Fügen Sie neue hinzu, passen Sie bestehende an oder laden Sie die Standardkonfiguration.</p>
                <div className="space-y-6">
                    {/* 1. FLEXIBLE GROUPS */}
                    {flexibleGroupsData.map(group => {
                        const GroupIcon = getIconComponent(group.icon);
                        return (
                        <div key={group.id}>
                             <div className="flex items-center gap-2 mb-3">
                                <GroupIcon className="h-4 w-4 text-slate-500" />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{group.name}</h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {group.categories.length > 0 ? (
                                    group.categories.map(category => renderCategoryButton(category, () => handleOpenEditor(category)))
                                ) : <p className="text-sm text-slate-500 italic ml-1">Keine Kategorien in dieser Gruppe.</p>}
                                <button onClick={() => handleOpenEditor({ groupId: group.id })} className="w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-200 border-2 border-dashed border-slate-500 hover:border-slate-400 bg-slate-800/50 hover:bg-slate-700/80" title="Neue Kategorie hinzufügen">
                                    <Plus className="h-6 w-6 text-slate-400" />
                                </button>
                            </div>
                        </div>
                    )})}
                    
                    <Separator />
                    
                    {/* 2. FIXED COSTS GROUP (Non-editable structure) */}
                    {fixedGroupData && (() => {
                        const FixedGroupIcon = getIconComponent(fixedGroupData.icon);
                        return (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-4 w-4 text-slate-500">
                                        <FixedGroupIcon className="h-full w-full" />
                                    </div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{fixedGroupData.name}</h4>
                                </div>
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

                    {/* 3. UNASSIGNED & STANDARD */}
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
                    />
                )}
            </AnimatePresence>
        </>
    );
};
