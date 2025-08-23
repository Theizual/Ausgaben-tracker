import { useMemo, useCallback, useEffect, useReducer } from 'react';
import { toast } from 'react-hot-toast';
import { generateUUID } from '@/shared/utils/uuid';
import { DEFAULT_GROUP_ID, DEFAULT_GROUP_NAME, FIXED_COSTS_GROUP_ID, FIXED_COSTS_GROUP_NAME } from '@/constants';
import { getCategories as getBaseCategories, getGroups as getBaseGroups } from '@/shared/config/taxonomy';
import type { Category, UserSetting, Group } from '@/shared/types';

interface UseCategoriesProps {
    currentUserId: string | null;
    isDemoModeEnabled: boolean;
    hiddenCategoryIds: string[];
    hideCategory: (categoryId: string) => void;
    unhideCategory: (categoryId: string) => void;
    clearHiddenCategories: () => void;
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
    | { type: 'DELETE_GROUP'; payload: string }
    | { type: 'REORDER_GROUPS'; payload: Group[] }
    | { type: 'REORDER_CATEGORIES'; payload: Category[] };

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
                    categoriesMap.set(id, {
                        ...existing,
                        ...update,
                        // An upsert should make a category active unless isDeleted is explicitly passed.
                        // This fixes re-adding a deleted category and respects explicit deletions.
                        isDeleted: 'isDeleted' in update ? !!update.isDeleted : false,
                        lastModified: now,
                        version: (existing.version || 0) + 1
                    });
                } else {
                    const baseCategory = getBaseCategories().find(c => c.id === id);
                    const newCategory: Category = {
                        id: id.startsWith('new_') ? generateUUID('cat') : id,
                        name: update.name || 'Neue Kategorie',
                        color: update.color || '#808080',
                        icon: update.icon || baseCategory?.icon || 'MoreHorizontal',
                        groupId: update.groupId || DEFAULT_GROUP_ID,
                        sortIndex: update.sortIndex ?? (state.categories.filter(c => c.groupId === (update.groupId || DEFAULT_GROUP_ID)).length),
                        budget: update.budget === undefined ? 0 : update.budget,
                        lastModified: now,
                        version: 1,
                        isDeleted: false,
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
        
        case 'REORDER_GROUPS': {
            const now = new Date().toISOString();
            const groupUpdates = new Map<string, Partial<Group>>();

            action.payload.forEach((group, index) => {
                const currentStateGroup = state.groups.find(g => g.id === group.id);
                if (currentStateGroup && currentStateGroup.sortIndex !== index) {
                    groupUpdates.set(group.id, {
                        sortIndex: index,
                        lastModified: now,
                        version: (currentStateGroup.version || 0) + 1,
                    });
                }
            });

            if (groupUpdates.size === 0) return state;

            const updatedGroups = state.groups.map(g =>
                groupUpdates.has(g.id) ? { ...g, ...groupUpdates.get(g.id) } : g
            );

            return { ...state, groups: updatedGroups };
        }

        case 'REORDER_CATEGORIES': {
            if (action.payload.length === 0) return state;

            const groupId = action.payload[0].groupId;
            const reorderedIds = new Set(action.payload.map(c => c.id));
            
            const updatedCategoriesInGroup = action.payload.map((cat, index) => {
                 const existingCat = state.categories.find(c => c.id === cat.id);
                 return { ...cat, sortIndex: index, lastModified: now, version: (existingCat?.version || 0) + 1 };
            });

            const otherCategories = state.categories.filter(c => c.groupId !== groupId || !reorderedIds.has(c.id));

            return { ...state, categories: [...otherCategories, ...updatedCategoriesInGroup] };
        }

        default:
            return state;
    }
};

const makeInitializer = (isDemoMode: boolean): (() => CategoriesState) => () => {
    const prefix = isDemoMode ? 'demo_' : '';
    // These keys are intentionally different from sync/user-settings to avoid conflicts.
    // This is a global cache for the app's category structure.
    const CAT_KEY = `${prefix}categories`;
    const GRP_KEY = `${prefix}groups`;
    
    try {
        const storedCats = window.localStorage.getItem(CAT_KEY);
        const storedGrps = window.localStorage.getItem(GRP_KEY);
        if (storedCats && storedGrps) {
            return { categories: JSON.parse(storedCats), groups: JSON.parse(storedGrps) };
        }
    } catch {}

    // Fallback to base taxonomy for a fresh start.
    return { categories: getBaseCategories(), groups: getBaseGroups() };
};

export const useCategories = ({ currentUserId, isDemoModeEnabled, hiddenCategoryIds, hideCategory, unhideCategory, clearHiddenCategories }: UseCategoriesProps) => {
    
    const prefix = isDemoModeEnabled ? 'demo_' : '';
    const CAT_KEY = `${prefix}categories`;
    const GRP_KEY = `${prefix}groups`;
    
    const initializer = useMemo(() => makeInitializer(isDemoModeEnabled), [isDemoModeEnabled]);
    const [state, dispatch] = useReducer(categoriesReducer, undefined, initializer);
    
    // Persist to localStorage
    useEffect(() => {
        window.localStorage.setItem(CAT_KEY, JSON.stringify(state.categories));
        window.localStorage.setItem(GRP_KEY, JSON.stringify(state.groups));
    }, [state.categories, state.groups, CAT_KEY, GRP_KEY]);

    const standardCategoryIds = useMemo(() => new Set(getBaseCategories().map(c => c.id)), []);
    const isStandardCategory = useCallback((id: string) => standardCategoryIds.has(id), [standardCategoryIds]);

    const setCategoriesAndGroups = useCallback((newCategories: Category[], newGroups: Group[]) => {
        dispatch({ type: 'SET_CONFIG', payload: { categories: newCategories, groups: newGroups } });
    }, []);
    
    const upsertMultipleCategories = useCallback((categoriesData: (Partial<Category> & { id: string })[]) => {
        dispatch({ type: 'UPSERT_MULTIPLE_CATEGORIES', payload: categoriesData });
    }, []);

    const upsertCategory = useCallback((categoryData: Partial<Category> & { id: string }) => {
        if (isStandardCategory(categoryData.id) && currentUserId && !categoryData.isDeleted) {
            unhideCategory(categoryData.id);
        }
        upsertMultipleCategories([categoryData]);
    }, [upsertMultipleCategories, isStandardCategory, currentUserId, unhideCategory]);

    const deleteCategory = useCallback((id: string) => {
        if (isStandardCategory(id) && currentUserId) {
            hideCategory(id);
            toast.success("Standard-Kategorie ausgeblendet.");
        } else {
            // This is a custom category, do a global soft delete
            dispatch({ type: 'DELETE_CATEGORY', payload: id });
        }
    }, [isStandardCategory, currentUserId, hideCategory]);

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
        if (id === DEFAULT_GROUP_ID || id === FIXED_COSTS_GROUP_ID) {
            toast.error(`Systemgruppen können nicht umbenannt werden.`);
            return;
        }
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
        if (id === DEFAULT_GROUP_ID || id === FIXED_COSTS_GROUP_ID) {
            toast.error(`Die Gruppe "${groupToDelete?.name || 'Diese Gruppe'}" kann nicht gelöscht werden.`);
            return;
        }
        if (groupToDelete) {
            dispatch({ type: 'DELETE_GROUP', payload: id });
            toast.success(`Gruppe "${groupToDelete.name}" gelöscht.`);
        }
    }, [state.groups]);

    const reorderGroups = useCallback((orderedGroups: Group[]) => {
        dispatch({ type: 'REORDER_GROUPS', payload: orderedGroups });
    }, []);

    const reorderCategories = useCallback((orderedCategories: Category[]) => {
        dispatch({ type: 'REORDER_CATEGORIES', payload: orderedCategories });
    }, []);
    
    const liveGroups = useMemo(() => state.groups.filter(g => !g.isDeleted).sort((a,b) => a.sortIndex - b.sortIndex), [state.groups]);
    const liveCategories = useMemo(() => {
        const liveGroupsMap = new Map(liveGroups.map(g => [g.id, g]));
        return state.categories
            .filter(c => !c.isDeleted && !hiddenCategoryIds.includes(c.id))
            .map(cat => {
                if (liveGroupsMap.has(cat.groupId)) {
                    return cat;
                }
                return { ...cat, groupId: DEFAULT_GROUP_ID };
            }).sort((a, b) => (a.sortIndex || 0) - (b.sortIndex || 0));
    }, [state.categories, liveGroups, hiddenCategoryIds]);

    const unassignedCategories = useMemo(() => {
        const baseCats = getBaseCategories();
        const currentIds = new Set(state.categories.filter(c => !c.isDeleted).map(c => c.id));
        return baseCats.filter(c => !currentIds.has(c.id) || hiddenCategoryIds.includes(c.id));
    }, [state.categories, hiddenCategoryIds]);

    const loadStandardConfiguration = useCallback(() => {
        if (currentUserId) {
            clearHiddenCategories();
        }
        dispatch({ type: 'SET_CONFIG', payload: { categories: getBaseCategories(), groups: getBaseGroups() } });
        toast.success("Standardkonfiguration geladen.");
    }, [currentUserId, clearHiddenCategories]);
    
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
        reorderGroups,
        reorderCategories,
        unassignedCategories,
        loadStandardConfiguration,
        setCategoriesAndGroups,
        flexibleCategories,
        fixedCategories,
    };
};
