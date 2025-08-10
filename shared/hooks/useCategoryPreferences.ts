import useLocalStorage from './useLocalStorage';
import { useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';

const MAX_FAVORITES = 10;
const MAX_RECENTS = 5;

export const useCategoryPreferences = ({ userId, isDemoModeEnabled }: { userId: string | null, isDemoModeEnabled: boolean }) => {
    const prefix = isDemoModeEnabled ? 'demo_' : '';
    const favKey = useMemo(() => userId ? `${prefix}${userId}_favorite_categories` : '', [prefix, userId]);
    const recentKey = useMemo(() => userId ? `${prefix}${userId}_recent_categories` : '', [prefix, userId]);

    const [favoriteIds, setFavoriteIds] = useLocalStorage<string[]>(favKey, []);
    const [recentIds, setRecentIds] = useLocalStorage<string[]>(recentKey, []);
    
    const addFavorite = useCallback((categoryId: string) => {
        if (!userId) return;
        setFavoriteIds(prev => {
            if (prev.includes(categoryId)) return prev;
            if (prev.length >= MAX_FAVORITES) {
                toast.error(`Du kannst maximal ${MAX_FAVORITES} Favoriten haben.`);
                return prev;
            }
            toast.success('Favorit hinzugefügt!');
            return [...prev, categoryId];
        });
        // Also remove from recents if it becomes a favorite
        setRecentIds(prev => prev.filter(id => id !== categoryId));
    }, [userId, setFavoriteIds, setRecentIds]);

    const removeFavorite = useCallback((categoryId: string) => {
        if (!userId) return;
        setFavoriteIds(prev => prev.filter(id => id !== categoryId));
        toast.success('Favorit entfernt.');
    }, [userId, setFavoriteIds]);

    const addRecent = useCallback((categoryId: string) => {
        if (!userId) return;
        // Don't add if it's already a favorite
        if (favoriteIds.includes(categoryId)) return;

        setRecentIds(prev => {
            const filtered = prev.filter(id => id !== categoryId);
            const newRecents = [categoryId, ...filtered];
            return newRecents.slice(0, MAX_RECENTS);
        });
    }, [userId, favoriteIds, setRecentIds]);

    const toggleFavorite = useCallback((categoryId: string) => {
        if (!userId) {
            toast.error("Bitte wähle zuerst einen Benutzer aus.");
            return;
        };
        if (favoriteIds.includes(categoryId)) {
            removeFavorite(categoryId);
        } else {
            addFavorite(categoryId);
        }
    }, [userId, favoriteIds, addFavorite, removeFavorite]);

    // This is the cleaned list of recent IDs that are not in favorites.
    const recentCategoryIds = useMemo(() => 
        recentIds.filter(id => !favoriteIds.includes(id)),
        [recentIds, favoriteIds]
    );

    return {
        favoriteIds,
        recentCategoryIds,
        addRecent,
        toggleFavorite,
    };
};