

import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { generateUUID } from '@/shared/utils/uuid';
import { INITIAL_CATEGORIES, INITIAL_GROUPS, FIXED_COSTS_GROUP_NAME, DEFAULT_GROUP } from '@/constants';
import type { Category, UserSetting } from '@/shared/types';

interface UseCategoriesProps {
    rawUserSettings: UserSetting[];
    updateCategoryConfigurationForUser: (userId: string, config: { categories: Category[], groups: string[] }) => void;
    currentUserId: string | null;
}

export const useCategories = ({ rawUserSettings, updateCategoryConfigurationForUser, currentUserId }: UseCategoriesProps) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryGroups, setCategoryGroups] = useState<string[]>([]);

    // This effect handles loading category configuration.
    // It prioritizes loading from the current user's settings.
    // If no settings are found (e.g., for a new user), it loads the initial default configuration.
    useEffect(() => {
        if (currentUserId) {
            const setting = rawUserSettings.find(s => s.userId === currentUserId && s.key === 'categoryConfiguration' && !s.isDeleted);
            if (setting && setting.value) {
                try {
                    const config = JSON.parse(setting.value);
                    if (Array.isArray(config.categories) && Array.isArray(config.groups)) {
                        setCategories(config.categories);
                        setCategoryGroups(config.groups);
                        return; // Successfully loaded from settings
                    }
                } catch (e) { console.error("Failed to parse category configuration", e); }
            }
        }
        
        // Fallback for new users or if no user is selected.
        // It's safe to load initial categories here because any subsequent user changes will be persisted
        // and loaded correctly by the logic above on the next render.
        setCategories(INITIAL_CATEGORIES);
        setCategoryGroups(INITIAL_GROUPS);
    }, [currentUserId, rawUserSettings]);

    // This function persists changes to the user's settings in localStorage via the userSettings hook.
    // It is now independent of `isInitialSetupDone` to ensure even the default user's changes are saved locally.
    const persistChanges = useCallback((newCategories: Category[], newGroups: string[]) => {
        if (currentUserId) {
            updateCategoryConfigurationForUser(currentUserId, { categories: newCategories, groups: newGroups });
        }
        setCategories(newCategories);
        setCategoryGroups(newGroups);
    }, [currentUserId, updateCategoryConfigurationForUser]);

    const liveCategories = useMemo(() => categories.filter(c => !c.isDeleted), [categories]);
    const categoryMap = useMemo(() => new Map(liveCategories.map(c => [c.id, c])), [liveCategories]);

    const upsertCategory = useCallback((categoryData: Partial<Category> & { id: string }) => {
        const now = new Date().toISOString();
        let newCategories: Category[];
        const existing = categories.find(c => c.id === categoryData.id);
        
        if (existing) {
            newCategories = categories.map(c => c.id === categoryData.id ? { ...c, ...categoryData, lastModified: now, version: (c.version || 0) + 1 } : c);
        } else {
            const newCategory: Category = {
                id: categoryData.id.startsWith('new_') ? generateUUID() : categoryData.id,
                name: categoryData.name || 'Neue Kategorie',
                color: categoryData.color || '#808080',
                icon: categoryData.icon || 'MoreHorizontal',
                group: categoryData.group || DEFAULT_GROUP,
                budget: categoryData.budget || 0,
                lastModified: now,
                version: 1,
            };
            newCategories = [...categories, newCategory];
        }
        persistChanges(newCategories, categoryGroups);
    }, [categories, categoryGroups, persistChanges]);

    const deleteCategory = useCallback((id: string) => {
        const now = new Date().toISOString();
        const newCategories = categories.map(c => c.id === id ? { ...c, isDeleted: true, lastModified: now, version: (c.version || 0) + 1 } : c);
        persistChanges(newCategories, categoryGroups);
        toast.success("Kategorie gelöscht.");
    }, [categories, categoryGroups, persistChanges]);

    const addGroup = useCallback((groupName: string) => {
        if (categoryGroups.includes(groupName)) {
            toast.error(`Gruppe "${groupName}" existiert bereits.`);
            return;
        }
        if (!categoryGroups.includes(DEFAULT_GROUP)) {
            // Ensure the default group exists before adding others
             const newGroups = [...categoryGroups, DEFAULT_GROUP, groupName];
             persistChanges(categories, newGroups);
        } else {
            const newGroups = [...categoryGroups, groupName];
            persistChanges(categories, newGroups);
        }
        toast.success(`Gruppe "${groupName}" hinzugefügt.`);
    }, [categories, categoryGroups, persistChanges]);

    const renameGroup = useCallback((oldName: string, newName: string) => {
        const newCategories = categories.map(c => c.group === oldName ? { ...c, group: newName } : c);
        const newGroups = categoryGroups.map(g => g === oldName ? newName : g);
        persistChanges(newCategories, newGroups);
        toast.success(`Gruppe umbenannt in "${newName}".`);
    }, [categories, categoryGroups, persistChanges]);

    const deleteGroup = useCallback((groupName: string) => {
        const newCategories = categories.map(c => c.group === groupName ? { ...c, group: DEFAULT_GROUP } : c);
        const newGroups = categoryGroups.filter(g => g !== groupName);
        persistChanges(newCategories, newGroups);
        toast.success(`Gruppe "${groupName}" gelöscht.`);
    }, [categories, categoryGroups, persistChanges]);

    const unassignedCategories = useMemo(() => {
        const existingIds = new Set(liveCategories.map(c => c.id));
        return INITIAL_CATEGORIES.filter(c => !existingIds.has(c.id));
    }, [liveCategories]);

    const loadStandardConfiguration = useCallback(() => {
        persistChanges(INITIAL_CATEGORIES, INITIAL_GROUPS);
        toast.success("Standardkonfiguration geladen.");
    }, [persistChanges]);

    return {
        rawCategories: categories,
        categories: liveCategories,
        categoryMap,
        categoryGroups,
        upsertCategory,
        deleteCategory,
        addGroup,
        renameGroup,
        deleteGroup,
        unassignedCategories,
        loadStandardConfiguration,
    };
};