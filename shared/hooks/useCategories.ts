import { useMemo, useCallback, useEffect, useReducer } from 'react';
import { toast } from 'react-hot-toast';
import { generateUUID } from '@/shared/utils/uuid';
import { DEFAULT_GROUP_ID, DEFAULT_GROUP_NAME, FIXED_COSTS_GROUP_ID, FIXED_COSTS_GROUP_NAME } from '@/constants';
import { getCategories as getBaseCategories, getGroups as getBaseGroups } from '@/shared/config/taxonomy';
import type { Category, UserSetting, Group } from '@/shared/types';

interface UseCategoriesProps {
    rawUserSettings: UserSetting[];
    updateCategoryConfigurationForUser: (userId: string, config: { categories: Category[], groups: Group[] }) => void;
    currentUserId: string | null;
    isDemoModeEnabled: boolean;
}

type CategoriesState = {
    categories: Category[];
    groups: Group[];
};

type Action =
    | { type: 'SET_CONFIG'; payload: { categories: Category[]; groups: Group[] } }
    | { type: 'UPSERT_MULTIPLE_CATEGORIES'; payload: (Partial<Category> & { id: string })[] }
    | { type: 'DELETE_CATEGORY'; payload: string }
    | { type: 'ADD_GROUP'; payload: Group }
    | { type: 'UPDATE_GROUP'; payload: { id: string, updates: Partial<Omit<Group, 'id'>> } }
    | { type: 'DELETE_GROUP'; payload: string };

const categoriesReducer = (state: CategoriesState, action: Action): CategoriesState => {
    const now = new Date().toISOString();
    switch (action.type) {
        case 'SET_CONFIG':
            return action.payload;

        case 'UPSERT_MULTIPLE_CATEGORIES': {
            const categoryUpdates = new Map(action.payload.map(c => [c.id, c]));
            const categoriesMap = new Map(state.categories.map(c => [c.id, c]));

            categoryUpdates.forEach((update, id) => {
                const existing = categoriesMap.get(id);
                if (existing) {
                    categoriesMap.set(id, { ...existing, ...update, lastModified: now, version: (existing.version || 0) + 1 });
                } else {
                    const baseCategory = getBaseCategories().find(c => c.id === id);
                    const newCategory: Category = {
                        id: id.startsWith('new_') ? generateUUID('cat') : id,
                        name: update.name || 'Neue Kategorie',
                        color: update.color || '#808080',
                        icon: update.icon || baseCategory?.icon || 'MoreHorizontal',
                        groupId: update.groupId || DEFAULT_GROUP_ID,
                        budget: update.budget === undefined ? 0 : update.budget,
                        lastModified: now,
                        version: 1,
                    };
                    categoriesMap.set(id, newCategory);
                }
            });
            return { ...state, categories: Array.from(categoriesMap.values()) };
        }

        case 'DELETE_CATEGORY': {
            const newCategories = state.categories.map(c => c.id === action.payload ? { ...c, isDeleted: true, lastModified: now, version: (c.version || 0) + 1 } : c);
            return { ...state, categories: newCategories };
        }
        
        case 'ADD_GROUP': {
            return { ...state, groups: [...state.groups, action.payload] };
        }

        case 'UPDATE_GROUP': {
            const { id, updates } = action.payload;
            const newGroups = state.groups.map(g =>
                g.id === id
                ? { ...g, ...updates, lastModified: now, version: (g.version || 0) + 1 }
                : g
            );
             // Ensure sortIndex is a number
            newGroups.forEach(g => { if (typeof g.sortIndex !== 'number') g.sortIndex = 0; });
            return { ...state, groups: newGroups };
        }

        case 'DELETE_GROUP': {
            const newCategories = state.categories.map(c => c.groupId === action.payload ? { ...c, groupId: DEFAULT_GROUP_ID, lastModified: now, version: (c.version || 0) + 1 } : c);
            const newGroups = state.groups.map(g => g.id === action.payload ? { ...g, isDeleted: true, lastModified: now, version: (g.version || 0) + 1 } : g);
            return { categories: newCategories, groups: newGroups };
        }

        default:
            return state;
    }
};

const loadConfiguration = (userId: string | null, userSettings: UserSetting[], isDemoModeEnabled: boolean): { categories: Category[], groups: Group[] } => {
    const baseConfig = { categories: getBaseCategories(), groups: getBaseGroups() };

    if (isDemoModeEnabled) {
        return baseConfig;
    }

    if (userId) {
        const setting = userSettings.find(s => s.userId === userId && s.key === 'categoryConfiguration' && !s.isDeleted);
        if (setting && setting.value) {
            try {
                const stored = JSON.parse(setting.value);
                if (Array.isArray(stored.categories) && Array.isArray(stored.groups)) {
                    const groupNameToIdMap = new Map((stored.groups as Group[]).map(g => [g.name.toLowerCase(), g.id]));
                    const groupMap = new Map((stored.groups as Group[]).map(g => [g.id, g]));

                    const normalizedCategories = (stored.categories as Category[]).map(cat => {
                        if (cat.groupId && groupMap.has(cat.groupId)) return cat;
                        const legacyGroupName = (cat as any).group;
                        if (legacyGroupName && typeof legacyGroupName === 'string') {
                            const resolvedGroupId = groupNameToIdMap.get(legacyGroupName.toLowerCase());
                            if (resolvedGroupId) {
                                const newCat: Category = { ...cat, groupId: resolvedGroupId };
                                delete (newCat as any).group;
                                return newCat;
                            }
                        }
                        const newCat: Category = { ...cat, groupId: DEFAULT_GROUP_ID };
                        delete (newCat as any).group;
                        return newCat;
                    });
                    
                    stored.categories = normalizedCategories;

                    const baseCategoryMap = new Map(baseConfig.categories.map(c => [c.id, c]));
                    const finalGroups = [...baseConfig.groups];
                    const finalCategories = [...baseConfig.categories];
                    const finalGroupMap = new Map(finalGroups.map(g => [g.id, g]));
                    const finalCategoryMap = new Map(finalCategories.map(c => [c.id, c]));

                    for (const storedGroup of stored.groups as Group[]) {
                        if (finalGroupMap.has(storedGroup.id)) {
                             finalGroupMap.set(storedGroup.id, { ...finalGroupMap.get(storedGroup.id)!, ...storedGroup });
                        } else {
                            finalGroupMap.set(storedGroup.id, storedGroup);
                        }
                    }

                    for (const storedCat of stored.categories as Category[]) {
                        if (finalCategoryMap.has(storedCat.id)) {
                             finalCategoryMap.set(storedCat.id, { ...finalCategoryMap.get(storedCat.id)!, ...storedCat });
                        } else {
                            finalCategoryMap.set(storedCat.id, storedCat);
                        }
                    }
                    
                    return { categories: Array.from(finalCategoryMap.values()), groups: Array.from(finalGroupMap.values()) };
                }
            } catch (e) {
                console.error("Failed to parse category configuration, falling back to default.", e);
            }
        }
    }
    return baseConfig;
};

export const useCategories = ({ rawUserSettings, updateCategoryConfigurationForUser, currentUserId, isDemoModeEnabled }: UseCategoriesProps) => {
    
    const initializer = useMemo(() => {
        return loadConfiguration(currentUserId, rawUserSettings, isDemoModeEnabled);
    }, [currentUserId, rawUserSettings, isDemoModeEnabled]);

    const [state, dispatch] = useReducer(categoriesReducer, initializer);

    // Re-initialize state when user changes
    useEffect(() => {
        dispatch({ type: 'SET_CONFIG', payload: initializer });
    }, [initializer]);

    // Persist changes to userSettings
    useEffect(() => {
        if (currentUserId && !isDemoModeEnabled) {
            updateCategoryConfigurationForUser(currentUserId, state);
        }
    }, [state, currentUserId, isDemoModeEnabled, updateCategoryConfigurationForUser]);


    const setCategoriesAndGroups = useCallback((newCategories: Category[], newGroups: Group[]) => {
        dispatch({ type: 'SET_CONFIG', payload: { categories: newCategories, groups: newGroups } });
    }, []);
    
    const upsertMultipleCategories = useCallback((categoriesData: (Partial<Category> & { id: string })[]) => {
        dispatch({ type: 'UPSERT_MULTIPLE_CATEGORIES', payload: categoriesData });
    }, []);

    const upsertCategory = useCallback((categoryData: Partial<Category> & { id: string }) => {
        upsertMultipleCategories([categoryData]);
    }, [upsertMultipleCategories]);

    const deleteCategory = useCallback((id: string) => {
        dispatch({ type: 'DELETE_CATEGORY', payload: id });
    }, []);

    const updateGroup = useCallback((id: string, updates: Partial<Omit<Group, 'id'>>) => {
        const groupToUpdate = state.groups.find(g => g.id === id);
        if(groupToUpdate) {
            dispatch({ type: 'UPDATE_GROUP', payload: { id, updates } });
        }
    }, [state.groups]);
    
    const addGroup = useCallback((groupName: string) => {
        const trimmedName = groupName.trim();
        if (state.groups.some(g => g.name.toLowerCase() === trimmedName.toLowerCase() && !g.isDeleted)) {
            toast.error(`Gruppe "${trimmedName}" existiert bereits.`);
            return;
        }
        const newGroup: Group = {
            id: generateUUID('grp'),
            name: trimmedName,
            color: '#64748b',
            icon: 'Package',
            sortIndex: (Math.max(...state.groups.map(g => g.sortIndex)) || 0) + 1,
            lastModified: new Date().toISOString(),
            version: 1,
        }
        dispatch({ type: 'ADD_GROUP', payload: newGroup });
        toast.success(`Gruppe "${trimmedName}" hinzugefügt.`);
    }, [state.groups]);

    const renameGroup = useCallback((id: string, newName: string) => {
        const trimmedNewName = newName.trim();
        const existingGroup = state.groups.find(g => g.id === id);
        if (!existingGroup || (existingGroup.name.toLowerCase() === trimmedNewName.toLowerCase() && !existingGroup.isDeleted)) return;
        
        if (state.groups.some(g => g.name.toLowerCase() === trimmedNewName.toLowerCase() && g.id !== id && !g.isDeleted)) {
            toast.error(`Gruppe "${trimmedNewName}" existiert bereits.`);
            return;
        }

        updateGroup(id, { name: trimmedNewName });
        toast.success(`Gruppe umbenannt in "${trimmedNewName}".`);
    }, [state.groups, updateGroup]);

    const deleteGroup = useCallback((id: string) => {
        const groupToDelete = state.groups.find(g => g.id === id);
        if (groupToDelete) {
            dispatch({ type: 'DELETE_GROUP', payload: id });
            toast.success(`Gruppe "${groupToDelete.name}" gelöscht.`);
        }
    }, [state.groups]);
    
    const unassignedCategories = useMemo(() => {
        const baseCats = getBaseCategories();
        const existingIds = new Set(state.categories.filter(c => !c.isDeleted).map(c => c.id));
        return baseCats.filter(c => !existingIds.has(c.id));
    }, [state.categories]);

    const loadStandardConfiguration = useCallback(() => {
        dispatch({ type: 'SET_CONFIG', payload: { categories: getBaseCategories(), groups: getBaseGroups() } });
        toast.success("Standardkonfiguration geladen.");
    }, []);
    
    const liveGroups = useMemo(() => state.groups.filter(g => !g.isDeleted).sort((a,b) => a.sortIndex - b.sortIndex), [state.groups]);
    const liveCategories = useMemo(() => {
        const liveGroupsMap = new Map(liveGroups.map(g => [g.id, g]));
        return state.categories.filter(c => !c.isDeleted).map(cat => {
            if (liveGroupsMap.has(cat.groupId)) {
                return cat;
            }
            console.warn(`Category ${cat.name} (${cat.id}) has orphan groupId ${cat.groupId}. Re-assigning to 'Sonstiges' group.`);
            return { ...cat, groupId: DEFAULT_GROUP_ID };
        });
    }, [state.categories, liveGroups]);

    const categoryMap = useMemo(() => new Map(liveCategories.map(c => [c.id, c])), [liveCategories]);
    const groupMap = useMemo(() => new Map(liveGroups.map(g => [g.id, g])), [liveGroups]);
    const groupNames = useMemo(() => liveGroups.map(g => g.name), [liveGroups]);

    const fixedGroupIds = useMemo(() => {
        const ids = new Set<string>();
        liveGroups.forEach(g => {
            if (g.id === FIXED_COSTS_GROUP_ID || g.name === FIXED_COSTS_GROUP_NAME) {
                ids.add(g.id);
            }
        });
        if (ids.size === 0) {
            ids.add(FIXED_COSTS_GROUP_ID); // Fallback
        }
        return ids;
    }, [liveGroups]);

    const flexibleCategories = useMemo(() => liveCategories.filter(c => !fixedGroupIds.has(c.groupId)), [liveCategories, fixedGroupIds]);
    const fixedCategories = useMemo(() => liveCategories.filter(c => fixedGroupIds.has(c.groupId)), [liveCategories, fixedGroupIds]);

    return {
        rawCategories: state.categories,
        categories: liveCategories,
        categoryMap,
        rawGroups: state.groups,
        groups: liveGroups,
        groupMap,
        groupNames,
        upsertCategory,
        upsertMultipleCategories,
        deleteCategory,
        addGroup,
        renameGroup,
        updateGroup,
        deleteGroup,
        unassignedCategories,
        loadStandardConfiguration,
        setCategoriesAndGroups,
        flexibleCategories,
        fixedCategories,
    };
};