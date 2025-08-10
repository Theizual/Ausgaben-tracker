import { useMemo, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { generateUUID } from '@/shared/utils/uuid';
import { INITIAL_CATEGORIES, INITIAL_GROUPS, DEFAULT_GROUP_ID, DEFAULT_GROUP_NAME } from '@/constants';
import type { Category, UserSetting, Group } from '@/shared/types';

interface UseCategoriesProps {
    rawUserSettings: UserSetting[];
    updateCategoryConfigurationForUser: (userId: string, config: { categories: Category[], groups: Group[] }) => void;
    currentUserId: string | null;
    isDemoModeEnabled: boolean;
}

const migrateLegacyCategories = (categories: any[], groups: Group[]): { migrated: boolean, categories: Category[] } => {
    let wasMigrated = false;
    const groupNameMap = new Map(groups.map(g => [g.name.toLowerCase(), g.id]));
    const defaultGroupId = groups.find(g => g.name === DEFAULT_GROUP_NAME)?.id || DEFAULT_GROUP_ID;

    const migratedCategories = categories.map(c => {
        // If groupId is a string like "Fixkosten", it's legacy data.
        if (c.groupId && !c.groupId.startsWith('grpid_')) {
            wasMigrated = true;
            const newGroupId = groupNameMap.get(c.groupId.toLowerCase()) || defaultGroupId;
            return { ...c, groupId: newGroupId, group: undefined }; // Remove old 'group' field
        }
        return c;
    });

    return { migrated: wasMigrated, categories: migratedCategories };
};


// Helper to load configuration synchronously from settings
const loadConfiguration = (userId: string | null, userSettings: UserSetting[], isDemoModeEnabled: boolean): { categories: Category[], groups: Group[] } => {
    // In demo mode, always use the fresh initial constants.
    if (isDemoModeEnabled) {
        return { categories: INITIAL_CATEGORIES, groups: INITIAL_GROUPS };
    }

    if (userId) {
        const setting = userSettings.find(s => s.userId === userId && s.key === 'categoryConfiguration' && !s.isDeleted);
        if (setting && setting.value) {
            try {
                const config = JSON.parse(setting.value);
                
                // Ensure groups exist, fallback to initial if not.
                const groups = (Array.isArray(config.groups) && config.groups.length > 0) ? config.groups : INITIAL_GROUPS;

                if (Array.isArray(config.categories)) {
                    // Migrate legacy data if necessary
                    const { migrated, categories: migratedCategories } = migrateLegacyCategories(config.categories, groups);
                    
                    const validatedCategories = migratedCategories.map((c: any) => ({
                        ...c,
                        lastModified: c.lastModified || new Date().toISOString(),
                        version: c.version || 1,
                    }));
                    const validatedGroups = groups.map((g: any) => ({
                        ...g,
                        lastModified: g.lastModified || new Date().toISOString(),
                        version: g.version || 1,
                    }));

                    // If a migration happened, the caller should persist this change.
                    if (migrated) {
                        return { categories: validatedCategories, groups: validatedGroups, needsPersistence: true } as any;
                    }

                    return { categories: validatedCategories, groups: validatedGroups };
                }
            } catch (e) {
                console.error("Failed to parse category configuration, falling back to default.", e);
            }
        }
    }
    // Fallback to initial default configuration for new users or errors.
    return { categories: INITIAL_CATEGORIES, groups: INITIAL_GROUPS };
};

export const useCategories = ({ rawUserSettings, updateCategoryConfigurationForUser, currentUserId, isDemoModeEnabled }: UseCategoriesProps) => {
    // Derive config directly from props. This ensures the hook is reactive to changes in user or settings.
    const config = useMemo(() => loadConfiguration(currentUserId, rawUserSettings, isDemoModeEnabled), [currentUserId, rawUserSettings, isDemoModeEnabled]);
    
    const { categories, groups } = config;

    // Persist changes if migration occurred on load.
    useEffect(() => {
        if ((config as any).needsPersistence && currentUserId) {
            console.log("Persisting migrated category configuration...");
            updateCategoryConfigurationForUser(currentUserId, { categories, groups });
        }
    }, [config, currentUserId, updateCategoryConfigurationForUser, categories, groups]);


    const persistChanges = useCallback((newCategories: Category[], newGroups: Group[]) => {
        if (currentUserId && !isDemoModeEnabled) {
            updateCategoryConfigurationForUser(currentUserId, { categories: newCategories, groups: newGroups });
        } else if (isDemoModeEnabled) {
            // In demo mode, changes are ephemeral and not persisted via this hook.
            // The state will be managed locally by the reducer in AppContext, if any.
        } else {
            toast.error("Änderungen konnten nicht gespeichert werden: Kein Benutzer ausgewählt.");
        }
    }, [currentUserId, updateCategoryConfigurationForUser, isDemoModeEnabled]);

    const liveCategories = useMemo(() => categories.filter(c => !c.isDeleted), [categories]);
    const categoryMap = useMemo(() => new Map(liveCategories.map(c => [c.id, c])), [liveCategories]);

    const liveGroups = useMemo(() => groups.filter(g => !g.isDeleted).sort((a,b) => a.sortIndex - b.sortIndex), [groups]);
    const groupMap = useMemo(() => new Map(liveGroups.map(g => [g.id, g])), [liveGroups]);
    const groupNames = useMemo(() => liveGroups.map(g => g.name), [liveGroups]);
    
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
                groupId: categoryData.groupId || DEFAULT_GROUP_ID,
                budget: categoryData.budget || 0,
                lastModified: now,
                version: 1,
            };
            newCategories = [...categories, newCategory];
        }
        persistChanges(newCategories, groups);
    }, [categories, groups, persistChanges]);

    const deleteCategory = useCallback((id: string) => {
        const now = new Date().toISOString();
        const newCategories = categories.map(c => c.id === id ? { ...c, isDeleted: true, lastModified: now, version: (c.version || 0) + 1 } : c);
        persistChanges(newCategories, groups);
        toast.success("Kategorie gelöscht.");
    }, [categories, groups, persistChanges]);

    const addGroup = useCallback((groupName: string) => {
        const trimmedName = groupName.trim();
        if (groups.some(g => g.name.toLowerCase() === trimmedName.toLowerCase() && !g.isDeleted)) {
            toast.error(`Gruppe "${trimmedName}" existiert bereits.`);
            return;
        }
        const newGroup: Group = {
            id: generateUUID(),
            name: trimmedName,
            sortIndex: (Math.max(...groups.map(g => g.sortIndex)) || 0) + 1,
            lastModified: new Date().toISOString(),
            version: 1,
        }
        const newGroups = [...groups, newGroup];
        persistChanges(categories, newGroups);
        toast.success(`Gruppe "${trimmedName}" hinzugefügt.`);
    }, [categories, groups, persistChanges]);

    const renameGroup = useCallback((id: string, newName: string) => {
        const trimmedNewName = newName.trim();
        const existingGroup = groups.find(g => g.id === id);
        if (!existingGroup || existingGroup.name.toLowerCase() === trimmedNewName.toLowerCase()) return;
        
        if (groups.some(g => g.name.toLowerCase() === trimmedNewName.toLowerCase() && g.id !== id && !g.isDeleted)) {
            toast.error(`Gruppe "${trimmedNewName}" existiert bereits.`);
            return;
        }

        const newGroups = groups.map(g => g.id === id ? { ...g, name: trimmedNewName, lastModified: new Date().toISOString(), version: (g.version || 0) + 1 } : g);
        persistChanges(categories, newGroups);
        toast.success(`Gruppe umbenannt in "${trimmedNewName}".`);
    }, [categories, groups, persistChanges]);

    const deleteGroup = useCallback((id: string) => {
        const now = new Date().toISOString();
        const newCategories = categories.map(c => c.groupId === id ? { ...c, groupId: DEFAULT_GROUP_ID, lastModified: now, version: (c.version || 0) + 1 } : c);
        const newGroups = groups.map(g => g.id === id ? { ...g, isDeleted: true, lastModified: now, version: (g.version || 0) + 1 } : g);
        const groupToDelete = groups.find(g => g.id === id);
        persistChanges(newCategories, newGroups);
        if(groupToDelete) toast.success(`Gruppe "${groupToDelete.name}" gelöscht.`);
    }, [categories, groups, persistChanges]);
    
    const unassignedCategories = useMemo(() => {
        const existingIds = new Set(liveCategories.map(c => c.id));
        return INITIAL_CATEGORIES.filter(c => !existingIds.has(c.id));
    }, [liveCategories]);

    const loadStandardConfiguration = useCallback(() => {
        persistChanges(INITIAL_CATEGORIES, INITIAL_GROUPS);
        toast.success("Standardkonfiguration geladen.");
    }, [persistChanges]);
    
    const setCategoriesAndGroups = useCallback((newCategories: Category[], newGroups: Group[]) => {
        persistChanges(newCategories, newGroups);
    }, [persistChanges]);

    return {
        rawCategories: categories,
        categories: liveCategories,
        categoryMap,
        rawGroups: groups,
        groups: liveGroups,
        groupMap,
        groupNames,
        upsertCategory,
        deleteCategory,
        addGroup,
        renameGroup,
        deleteGroup,
        unassignedCategories,
        loadStandardConfiguration,
        setCategoriesAndGroups,
    };
};