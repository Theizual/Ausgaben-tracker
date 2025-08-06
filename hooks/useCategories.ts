

import { useMemo, useReducer, useEffect, useCallback } from 'react';
import { INITIAL_CATEGORIES, INITIAL_GROUPS } from '../constants';
import type { Category } from '../types';
import { generateUUID } from '../utils/uuid';
import { toast } from 'react-hot-toast';

// --- STATE & ACTIONS ---
type CategoriesState = {
    categories: Category[];
    groups: string[];
};

type Action =
    | { type: 'SET_ALL_CATEGORIES_DATA', payload: { categories: Category[], groups: string[] } }
    | { type: 'ADD_CATEGORY', payload: { groupName: string, id: string } }
    | { type: 'UPDATE_CATEGORY', payload: { id: string, data: Partial<Omit<Category, 'id'>> } }
    | { type: 'DELETE_CATEGORY', payload: { id: string } }
    | { type: 'ADD_GROUP' }
    | { type: 'UPDATE_GROUP_NAME', payload: { oldName: string, newName: string } }
    | { type: 'DELETE_GROUP', payload: { groupName: string } }
    | { type: 'MOVE_GROUP', payload: { groupName: string, direction: 'up' | 'down' } }
    | { type: 'MOVE_CATEGORY', payload: { categoryId: string, direction: 'up' | 'down' } }
    | { type: 'ADD_FROM_LIBRARY', payload: { category: Omit<Category, 'lastModified' | 'version'> } };

const categoriesReducer = (state: CategoriesState, action: Action): CategoriesState => {
    const now = new Date().toISOString();
    switch (action.type) {
        case 'SET_ALL_CATEGORIES_DATA':
            return { ...state, ...action.payload };
            
        case 'ADD_CATEGORY': {
            const newCategory: Category = {
                id: action.payload.id, // Use provided ID
                name: "Neue Kategorie",
                color: "#8b5cf6",
                icon: "Plus",
                group: action.payload.groupName,
                lastModified: now,
                version: 1
            };
            return { ...state, categories: [...state.categories, newCategory] };
        }

        case 'ADD_FROM_LIBRARY': {
            const { category } = action.payload;
            const existingCategory = state.categories.find(c => c.id === category.id);

            let updatedCategories: Category[];
            if (existingCategory) {
                // If it exists but is deleted, undelete it
                if (existingCategory.isDeleted) {
                    updatedCategories = state.categories.map(c =>
                        c.id === category.id
                            ? { ...category, id: c.id, lastModified: now, version: (c.version || 0) + 1, isDeleted: false }
                            : c
                    );
                } else {
                    // Already exists and is not deleted, do nothing
                    toast.error(`Kategorie "${category.name}" ist bereits vorhanden.`);
                    return state;
                }
            } else {
                // Doesn't exist, add it
                const newCategory: Category = {
                    ...category,
                    lastModified: now,
                    version: 1,
                };
                updatedCategories = [...state.categories, newCategory];
            }

            // Ensure the group exists
            const updatedGroups = state.groups.includes(category.group)
                ? state.groups
                : [...state.groups, category.group];

            return { ...state, categories: updatedCategories, groups: updatedGroups };
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
            
        case 'MOVE_GROUP': {
            const { groupName, direction } = action.payload;
            const index = state.groups.findIndex(g => g === groupName);
            if (index === -1) return state;

            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= state.groups.length) return state;

            const newGroups = [...state.groups];
            [newGroups[index], newGroups[newIndex]] = [newGroups[newIndex], newGroups[index]]; // Swap
            return { ...state, groups: newGroups };
        }

        case 'MOVE_CATEGORY': {
            const { categoryId, direction } = action.payload;
            const categoryToMove = state.categories.find(c => c.id === categoryId);
            if (!categoryToMove) return state;

            const groupName = categoryToMove.group;
            const categoriesInGroup = state.categories.filter(c => c.group === groupName);
            const otherCategories = state.categories.filter(c => c.group !== groupName);
            
            const index = categoriesInGroup.findIndex(c => c.id === categoryId);
            if (index === -1) return state;

            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= categoriesInGroup.length) return state;
            
            const reorderedCategoriesInGroup = [...categoriesInGroup];
            [reorderedCategoriesInGroup[index], reorderedCategoriesInGroup[newIndex]] = [reorderedCategoriesInGroup[newIndex], reorderedCategoriesInGroup[index]]; // Swap

            return {
                ...state,
                categories: [...otherCategories, ...reorderedCategoriesInGroup]
            };
        }
            
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

    useEffect(() => { window.localStorage.setItem('categories', JSON.stringify(state.categories)); }, [state.categories]);
    useEffect(() => { window.localStorage.setItem('categoryGroups', JSON.stringify(state.groups)); }, [state.groups]);
    
    const categories = useMemo(() => state.categories.filter(c => !c.isDeleted), [state.categories]);
    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
    const totalMonthlyBudget = useMemo(() => categories.reduce((sum, cat) => sum + (cat.budget || 0), 0), [categories]);

    const setAllCategoriesData = useCallback((payload: { categories: Category[], groups: string[] }) => dispatch({ type: 'SET_ALL_CATEGORIES_DATA', payload }), []);
    const updateCategory = useCallback((id: string, data: Partial<Omit<Category, 'id'>>) => dispatch({ type: 'UPDATE_CATEGORY', payload: { id, data } }), []);
    const addCategory = useCallback((groupName: string) => dispatch({ type: 'ADD_CATEGORY', payload: { groupName, id: generateUUID() } }), []);
    const addCategoryFromLibrary = useCallback((category: Omit<Category, 'lastModified' | 'version'>) => dispatch({ type: 'ADD_FROM_LIBRARY', payload: { category } }), []);
    const deleteCategory = useCallback((id: string) => dispatch({ type: 'DELETE_CATEGORY', payload: { id } }), []);
    const addGroup = useCallback(() => dispatch({ type: 'ADD_GROUP' }), []);
    const updateGroupName = useCallback((oldName: string, newName: string) => dispatch({ type: 'UPDATE_GROUP_NAME', payload: { oldName, newName } }), []);
    const deleteGroup = useCallback((groupName: string) => dispatch({ type: 'DELETE_GROUP', payload: { groupName } }), []);
    
    // Arrow-based sorting functions
    const moveGroup = useCallback((groupName: string, direction: 'up' | 'down') => dispatch({ type: 'MOVE_GROUP', payload: { groupName, direction } }), []);
    const moveCategory = useCallback((categoryId: string, direction: 'up' | 'down') => dispatch({ type: 'MOVE_CATEGORY', payload: { categoryId, direction } }), []);
    
    // Legacy setters for sync hook compatibility
    const setCategories = useCallback((data: Category[]) => setAllCategoriesData({ categories: data, groups: state.groups }), [state.groups, setAllCategoriesData]);
    const setCategoryGroups = useCallback((data: string[]) => setAllCategoriesData({ categories: state.categories, groups: data }), [state.categories, setAllCategoriesData]);

    return {
        categories, rawCategories: state.categories, setCategories,
        categoryGroups: state.groups, setCategoryGroups, categoryMap, totalMonthlyBudget,
        updateCategory, addCategory, deleteCategory, addGroup, updateGroupName,
        deleteGroup, moveGroup, moveCategory, addCategoryFromLibrary,
    };
};