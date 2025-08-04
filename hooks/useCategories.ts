

import { useMemo, useReducer, useEffect, useCallback } from 'react';
import { INITIAL_CATEGORIES, INITIAL_GROUPS } from '../constants';
import type { Category } from '../types';

// --- STATE & ACTIONS ---
type CategoriesState = {
    categories: Category[];
    groups: string[];
};

type Action =
    | { type: 'SET_ALL_CATEGORIES_DATA', payload: { categories: Category[], groups: string[] } }
    | { type: 'ADD_CATEGORY', payload: { groupName: string } }
    | { type: 'UPDATE_CATEGORY', payload: { id: string, data: Partial<Omit<Category, 'id'>> } }
    | { type: 'DELETE_CATEGORY', payload: { id: string } }
    | { type: 'ADD_GROUP' }
    | { type: 'UPDATE_GROUP_NAME', payload: { oldName: string, newName: string } }
    | { type: 'REORDER_GROUPS', payload: { newGroups: string[] } }
    | { type: 'DELETE_GROUP', payload: { groupName: string } };

const categoriesReducer = (state: CategoriesState, action: Action): CategoriesState => {
    const now = new Date().toISOString();
    switch (action.type) {
        case 'SET_ALL_CATEGORIES_DATA':
            return { ...state, ...action.payload };
            
        case 'ADD_CATEGORY': {
            const newCategory: Category = {
                id: crypto.randomUUID(),
                name: "Neue Kategorie",
                color: "#8b5cf6",
                icon: "Plus",
                group: action.payload.groupName,
                lastModified: now,
                version: 1
            };
            return { ...state, categories: [...state.categories, newCategory] };
        }
            
        case 'UPDATE_CATEGORY': {
            return {
                ...state,
                categories: state.categories.map(cat =>
                    cat.id === action.payload.id
                        ? { ...cat, ...action.payload.data, lastModified: now, version: (cat.version || 0) + 1 }
                        : cat
                )
            };
        }

        case 'DELETE_CATEGORY': {
            return {
                ...state,
                categories: state.categories.map(cat =>
                    cat.id === action.payload.id
                        ? { ...cat, isDeleted: true, lastModified: now, version: (cat.version || 0) + 1 }
                        : cat
                )
            };
        }
            
        case 'ADD_GROUP': {
            const newGroupName = `Neue Gruppe ${state.groups.length + 1}`;
            if (state.groups.includes(newGroupName)) return state;
            return { ...state, groups: [...state.groups, newGroupName] };
        }
            
        case 'UPDATE_GROUP_NAME': {
            const { oldName, newName } = action.payload;
            const trimmedNewName = newName.trim();
            if (oldName === trimmedNewName || !trimmedNewName) return state;
            
            return {
                ...state,
                groups: state.groups.map(g => g === oldName ? trimmedNewName : g),
                categories: state.categories.map(cat =>
                    cat.group === oldName
                        ? { ...cat, group: trimmedNewName, lastModified: now, version: (cat.version || 0) + 1 }
                        : cat
                )
            };
        }
            
        case 'REORDER_GROUPS':
            return { ...state, groups: action.payload.newGroups };
            
        case 'DELETE_GROUP': {
            if (state.groups.length <= 1) return state; // Can't delete the last group
            
            const fallbackGroup = state.groups.find(g => g !== action.payload.groupName) || '';
            
            return {
                ...state,
                groups: state.groups.filter(g => g !== action.payload.groupName),
                categories: state.categories.map(cat =>
                    cat.group === action.payload.groupName
                        ? { ...cat, group: fallbackGroup, lastModified: now, version: (cat.version || 0) + 1 }
                        : cat
                )
            };
        }
            
        default:
            return state;
    }
};

const initializer = (): CategoriesState => {
    try {
        const storedCategories = JSON.parse(window.localStorage.getItem('categories') || 'null');
        const storedGroups = JSON.parse(window.localStorage.getItem('categoryGroups') || 'null');

        return {
            categories: Array.isArray(storedCategories) ? storedCategories : INITIAL_CATEGORIES,
            groups: Array.isArray(storedGroups) ? storedGroups : INITIAL_GROUPS
        };
    } catch {
        return { categories: INITIAL_CATEGORIES, groups: INITIAL_GROUPS };
    }
};

export const useCategories = () => {
    const [state, dispatch] = useReducer(categoriesReducer, undefined, initializer);

    useEffect(() => {
        window.localStorage.setItem('categories', JSON.stringify(state.categories));
    }, [state.categories]);

    useEffect(() => {
        window.localStorage.setItem('categoryGroups', JSON.stringify(state.groups));
    }, [state.groups]);
    
    // Live categories are filtered to exclude soft-deleted ones
    const categories = useMemo(() => state.categories.filter(c => !c.isDeleted), [state.categories]);

    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
    
    const totalMonthlyBudget = useMemo(() => 
        categories.reduce((sum, cat) => sum + (cat.budget || 0), 0), 
    [categories]);

    // Action wrappers
    const setAllCategoriesData = useCallback((payload: { categories: Category[], groups: string[] }) => {
        dispatch({ type: 'SET_ALL_CATEGORIES_DATA', payload });
    }, []);
    const updateCategory = useCallback((id: string, data: Partial<Omit<Category, 'id'>>) => {
        dispatch({ type: 'UPDATE_CATEGORY', payload: { id, data } });
    }, []);
    const addCategory = useCallback((groupName: string) => {
        dispatch({ type: 'ADD_CATEGORY', payload: { groupName } });
    }, []);
    const deleteCategory = useCallback((id: string) => {
        dispatch({ type: 'DELETE_CATEGORY', payload: { id } });
    }, []);
    const addGroup = useCallback(() => {
        dispatch({ type: 'ADD_GROUP' });
    }, []);
    const updateGroupName = useCallback((oldName: string, newName: string) => {
        dispatch({ type: 'UPDATE_GROUP_NAME', payload: { oldName, newName } });
    }, []);
    const reorderGroups = useCallback((newGroups: string[]) => {
        dispatch({ type: 'REORDER_GROUPS', payload: { newGroups } });
    }, []);
     const deleteGroup = useCallback((groupName: string) => {
        dispatch({ type: 'DELETE_GROUP', payload: { groupName } });
    }, []);
    
    // Legacy setters for sync hook compatibility. TODO: Refactor sync hook to use actions
    const setCategories = useCallback((data: Category[]) => {
         setAllCategoriesData({ categories: data, groups: state.groups });
    }, [state.groups, setAllCategoriesData]);
    const setCategoryGroups = useCallback((data: string[]) => {
        setAllCategoriesData({ categories: state.categories, groups: data });
    }, [state.categories, setAllCategoriesData]);


    return {
        categories, // Live, filtered data for UI
        rawCategories: state.categories, // Unfiltered data for sync
        setCategories,
        categoryGroups: state.groups,
        setCategoryGroups,
        categoryMap,
        totalMonthlyBudget,

        // New actions
        updateCategory,
        addCategory,
        deleteCategory,
        addGroup,
        updateGroupName,
        reorderGroups,
        deleteGroup,
    };
};