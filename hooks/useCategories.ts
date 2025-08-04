
import { useMemo } from 'react';
import useLocalStorage from './useLocalStorage';
import { INITIAL_CATEGORIES, INITIAL_GROUPS } from '../constants';
import type { Category } from '../types';

export const useCategories = () => {
    const [rawCategories, setRawCategories] = useLocalStorage<Category[]>('categories', INITIAL_CATEGORIES);
    const [categoryGroups, setCategoryGroups] = useLocalStorage<string[]>('categoryGroups', INITIAL_GROUPS);
    
    // Live categories are filtered to exclude soft-deleted ones
    const categories = useMemo(() => rawCategories.filter(c => !c.isDeleted), [rawCategories]);

    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
    
    const totalMonthlyBudget = useMemo(() => 
        categories.reduce((sum, cat) => sum + (cat.budget || 0), 0), 
    [categories]);

    return {
        categories, // Live, filtered data for UI
        rawCategories, // Unfiltered data for sync
        setCategories: setRawCategories,
        categoryGroups,
        setCategoryGroups,
        categoryMap,
        totalMonthlyBudget,
    };
};