
import { useMemo } from 'react';
import useLocalStorage from './useLocalStorage';
import { INITIAL_CATEGORIES, INITIAL_GROUPS } from '../constants';
import type { Category } from '../types';

export const useCategories = () => {
    const [categories, setCategories] = useLocalStorage<Category[]>('categories', INITIAL_CATEGORIES);
    const [categoryGroups, setCategoryGroups] = useLocalStorage<string[]>('categoryGroups', INITIAL_GROUPS);

    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
    
    const totalMonthlyBudget = useMemo(() => 
        categories.reduce((sum, cat) => sum + (cat.budget || 0), 0), 
    [categories]);

    return {
        categories,
        setCategories,
        categoryGroups,
        setCategoryGroups,
        categoryMap,
        totalMonthlyBudget,
    };
};
