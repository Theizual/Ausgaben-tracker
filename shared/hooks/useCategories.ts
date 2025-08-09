import { useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { generateUUID } from '@/shared/utils/uuid';
import { INITIAL_CATEGORIES, INITIAL_GROUPS, DEFAULT_GROUP } from '@/constants';
import type { Category, UserSetting } from '@/shared/types';

interface UseCategoriesProps {
    rawUserSettings: UserSetting[];
    updateCategoryConfigurationForUser: (userId: string, config: { categories: Category[], groups: string[] }) => void;
    currentUserId: string | null;
}

// Helper to load configuration synchronously from settings
const loadConfiguration = (userId: string | null, userSettings: UserSetting[]): { categories: Category[], groups: string[] } => {
    if (userId) {
        const setting = userSettings.find(s => s.userId === userId && s.key === 'categoryConfiguration' && !s.isDeleted);
        if (setting && setting.value) {
            try {
                const config = JSON.parse(setting.value);
                if (Array.isArray(config.categories) && Array.isArray(config.groups)) {
                    // Ensure all categories have a valid lastModified and version
                    const validatedCategories = config.categories.map((c: any) => ({
                        ...c,
                        lastModified: c.lastModified || new Date().toISOString(),
                        version: c.version || 1,
                    }));
                    return { categories: validatedCategories, groups: config.groups };
                }
            } catch (e) {
                console.error("Failed to parse category configuration, falling back to default.", e);
            }
        }
    }
    // Fallback to initial default configuration
    return { categories: INITIAL_CATEGORIES, groups: INITIAL_GROUPS };
};

export const useCategories = ({ rawUserSettings, updateCategoryConfigurationForUser, currentUserId }: UseCategoriesProps) => {
    // Derive config directly from props. This ensures the hook is reactive to changes in user or settings.
    const config = useMemo(() => loadConfiguration(currentUserId, rawUserSettings), [currentUserId, rawUserSettings]);
    
    const { categories, groups: categoryGroups } = config;

    const persistChanges = useCallback((newCategories: Category[], newGroups: string[]) => {
        if (currentUserId) {
            updateCategoryConfigurationForUser(currentUserId, { categories: newCategories, groups: newGroups });
        } else {
             // This case should ideally not be hit in a normal user flow.
            toast.error("Änderungen konnten nicht gespeichert werden: Kein Benutzer ausgewählt.");
        }
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
        const trimmedName = groupName.trim();
        if (categoryGroups.some(g => g.toLowerCase() === trimmedName.toLowerCase())) {
            toast.error(`Gruppe "${trimmedName}" existiert bereits.`);
            return;
        }
        const newGroups = [...categoryGroups, trimmedName];
        persistChanges(categories, newGroups);
        toast.success(`Gruppe "${trimmedName}" hinzugefügt.`);
    }, [categories, categoryGroups, persistChanges]);

    const renameGroup = useCallback((oldName: string, newName: string) => {
        const trimmedNewName = newName.trim();
        if (oldName.toLowerCase() === trimmedNewName.toLowerCase()) return;
        if (categoryGroups.some(g => g.toLowerCase() === trimmedNewName.toLowerCase() && g.toLowerCase() !== oldName.toLowerCase())) {
            toast.error(`Gruppe "${trimmedNewName}" existiert bereits.`);
            return;
        }
        const newCategories = categories.map(c => c.group === oldName ? { ...c, group: trimmedNewName } : c);
        const newGroups = categoryGroups.map(g => g === oldName ? trimmedNewName : g);
        persistChanges(newCategories, newGroups);
        toast.success(`Gruppe umbenannt in "${trimmedNewName}".`);
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