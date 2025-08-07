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
    | { type: 'UPDATE_CATEGORY', payload: { id: string, data: Partial<Omit<Category, 'id'>> } }
    | { type: 'ADD_FROM_LIBRARY', payload: { category: Omit<Category, 'lastModified' | 'version'> } }
    | { type: 'UPSERT_CATEGORY', payload: { categoryData: Omit<Category, 'lastModified' | 'version'> & { id: string } } }
    | { type: 'RENAME_GROUP', payload: { oldGroupName: string, newGroupName: string } }
    | { type: 'ADD_GROUP', payload: { groupName: string } }
    | { type: 'DELETE_GROUP', payload: { groupName: string } };


const categoriesReducer = (state: CategoriesState, action: Action): CategoriesState => {
    const now = new Date().toISOString();
    switch (action.type) {
        case 'SET_ALL_CATEGORIES_DATA':
            return { ...state, ...action.payload };

        case 'ADD_FROM_LIBRARY': {
            const { category } = action.payload;
            const existingCategory = state.categories.find(c => c.id === category.id);

            let updatedCategories: Category[];
            if (existingCategory) {
                // If it exists but is deleted, undelete it
                if (existingCategory.isDeleted) {
                    updatedCategories = state.categories.map(c =>
                        c.id === category.id
                            ? { ...existingCategory, ...category, isDeleted: false, lastModified: now, version: (c.version || 0) + 1 }
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
        
        case 'RENAME_GROUP': {
            const { oldGroupName, newGroupName } = action.payload;
            const trimmedNewName = newGroupName.trim();
    
            if (oldGroupName === trimmedNewName || !trimmedNewName) {
                return state; // No change or empty name
            }
            if (state.groups.includes(trimmedNewName)) {
                toast.error(`Die Gruppe "${trimmedNewName}" existiert bereits.`);
                return state;
            }
    
            return {
                ...state,
                groups: state.groups.map(g => (g === oldGroupName ? trimmedNewName : g)),
                categories: state.categories.map(c =>
                    c.group === oldGroupName
                        ? { ...c, group: trimmedNewName, lastModified: now, version: (c.version || 0) + 1 }
                        : c
                )
            };
        }

        case 'UPSERT_CATEGORY': {
            const { categoryData } = action.payload;
            const existingCategoryIndex = state.categories.findIndex(c => c.id === categoryData.id);

            let updatedCategories: Category[];
            
            if (existingCategoryIndex > -1) {
                // Update existing category
                const existingCategory = state.categories[existingCategoryIndex];
                updatedCategories = [...state.categories];
                updatedCategories[existingCategoryIndex] = {
                    ...existingCategory,
                    ...categoryData,
                    isDeleted: false, // Ensure it's not deleted
                    lastModified: now,
                    version: (existingCategory.version || 0) + 1
                };
            } else {
                // Add new category from library
                const newCategory: Category = {
                    ...categoryData,
                    lastModified: now,
                    version: 1,
                };
                updatedCategories = [...state.categories, newCategory];
            }
            
            // Ensure the group for the upserted category exists
            const updatedGroups = state.groups.includes(categoryData.group)
                ? state.groups
                : [...state.groups, categoryData.group];
                
            return { ...state, categories: updatedCategories, groups: updatedGroups };
        }

        case 'ADD_GROUP': {
            const { groupName } = action.payload;
            const trimmedName = groupName.trim();
            if (!trimmedName) {
                toast.error('Gruppenname darf nicht leer sein.');
                return state;
            }
            if (state.groups.some(g => g.toLowerCase() === trimmedName.toLowerCase())) {
                toast.error(`Gruppe "${trimmedName}" existiert bereits.`);
                return state;
            }

            const newGroups = [...state.groups];
            // Insert before the last element if possible, otherwise at the end.
            const insertionIndex = newGroups.length > 0 ? newGroups.length - 1 : 0;
            newGroups.splice(insertionIndex, 0, trimmedName);
            
            toast.success(`Gruppe "${trimmedName}" hinzugefügt.`);
            return { ...state, groups: newGroups };
        }
            
        case 'DELETE_GROUP': {
            const { groupName } = action.payload;
            const now = new Date().toISOString();
            const DEFAULT_GROUP = 'Sonstiges';
        
            if (groupName === DEFAULT_GROUP) {
                toast.error(`Die Gruppe "${DEFAULT_GROUP}" kann nicht gelöscht werden.`);
                return state;
            }
        
            // Important: check against raw state to correctly identify categories to move
            const categoriesToMove = state.categories.filter(c => c.group === groupName && !c.isDeleted);
        
            // Filter out the group to be deleted
            const updatedGroups = state.groups.filter(g => g !== groupName);
            
            // Re-assign categories from the deleted group to the default group
            const updatedCategories = state.categories.map(c => {
                if (c.group === groupName) {
                    return {
                        ...c,
                        group: DEFAULT_GROUP,
                        lastModified: now,
                        version: (c.version || 0) + 1,
                    };
                }
                return c;
            });
            
            // Ensure the default group exists if it was accidentally removed before
            if (!updatedGroups.includes(DEFAULT_GROUP) && updatedCategories.some(c => c.group === DEFAULT_GROUP)) {
                 updatedGroups.push(DEFAULT_GROUP);
            }
        
            // A more precise success message
            let toastMessage = `Gruppe "${groupName}" wurde gelöscht.`;
            if (categoriesToMove.length > 0) {
                const pluralText = categoriesToMove.length === 1 ? 'Kategorie wurde' : 'Kategorien wurden';
                toastMessage = `Gruppe "${groupName}" gelöscht und ${categoriesToMove.length} ${pluralText} nach "${DEFAULT_GROUP}" verschoben.`;
            }
            toast.success(toastMessage);
        
            return {
                ...state,
                groups: updatedGroups,
                categories: updatedCategories,
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
    const addCategoryFromLibrary = useCallback((category: Omit<Category, 'lastModified' | 'version'>) => dispatch({ type: 'ADD_FROM_LIBRARY', payload: { category } }), []);
    const upsertCategory = useCallback((categoryData: Omit<Category, 'lastModified' | 'version'> & { id: string }) => dispatch({ type: 'UPSERT_CATEGORY', payload: { categoryData } }), []);
    
    const deleteCategory = useCallback((id: string) => {
        const categoryToDelete = state.categories.find(c => c.id === id);
        if (categoryToDelete) {
            dispatch({ type: 'UPDATE_CATEGORY', payload: { id, data: { isDeleted: true } } });
            toast.success(`Kategorie "${categoryToDelete.name}" entfernt.`);
        }
    }, [state.categories]);

    const renameGroup = useCallback((oldGroupName: string, newGroupName: string) => {
        dispatch({ type: 'RENAME_GROUP', payload: { oldGroupName, newGroupName } });
    }, []);

    const addGroup = useCallback((groupName: string) => {
        dispatch({ type: 'ADD_GROUP', payload: { groupName } });
    }, []);

    const deleteGroup = useCallback((groupName: string) => {
        dispatch({ type: 'DELETE_GROUP', payload: { groupName } });
    }, []);
    
    // Legacy setters for sync hook compatibility
    const setCategories = useCallback((data: Category[]) => setAllCategoriesData({ categories: data, groups: state.groups }), [state.groups, setAllCategoriesData]);
    const setCategoryGroups = useCallback((data: string[]) => setAllCategoriesData({ categories: state.categories, groups: data }), [state.categories, setAllCategoriesData]);

    return {
        categories, rawCategories: state.categories, setCategories,
        categoryGroups: state.groups, setCategoryGroups, categoryMap, totalMonthlyBudget,
        updateCategory, addCategoryFromLibrary, upsertCategory, deleteCategory, renameGroup, addGroup, deleteGroup
    };
};