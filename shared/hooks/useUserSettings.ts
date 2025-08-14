import { useReducer, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import type { UserSetting, Category, Group } from '@/shared/types';

type UserSettingsState = {
    settings: UserSetting[];
};

type Action =
    | { type: 'SET_SETTINGS'; payload: UserSetting[] }
    | { type: 'UPDATE_SETTING'; payload: UserSetting };

const settingsReducer = (state: UserSettingsState, action: Action): UserSettingsState => {
    switch (action.type) {
        case 'SET_SETTINGS':
            return { ...state, settings: action.payload };
        case 'UPDATE_SETTING': {
            const newSetting = action.payload;
            const existing = state.settings.find(s => s.userId === newSetting.userId && s.key === newSetting.key);
            if (existing) {
                return { ...state, settings: state.settings.map(s => (s.userId === newSetting.userId && s.key === newSetting.key) ? newSetting : s) };
            }
            return { ...state, settings: [...state.settings, newSetting] };
        }
        default:
            return state;
    }
};

const makeInitializer = (isDemoMode: boolean): (() => UserSettingsState) => () => {
    const prefix = isDemoMode ? 'demo_' : '';
    const SETTINGS_KEY = `${prefix}userSettings`;
    try {
        const stored = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '[]');
        if (Array.isArray(stored)) {
            return { settings: stored };
        }
    } catch { /* ignore */ }
    return { settings: [] };
};

export const useUserSettings = ({ isDemoModeEnabled }: { isDemoModeEnabled: boolean }) => {
    const prefix = isDemoModeEnabled ? 'demo_' : '';
    const SETTINGS_KEY = `${prefix}userSettings`;
    
    const initializer = useMemo(() => makeInitializer(isDemoModeEnabled), [isDemoModeEnabled]);
    const [state, dispatch] = useReducer(settingsReducer, undefined, initializer);

    useEffect(() => {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    }, [state.settings, SETTINGS_KEY]);

    const setUserSettings = useCallback((settings: UserSetting[]) => {
        dispatch({ type: 'SET_SETTINGS', payload: settings });
    }, []);

    const rawUserSettings = useMemo(() => state.settings, [state.settings]);
    const liveUserSettings = useMemo(() => state.settings.filter(s => !s.isDeleted), [state.settings]);

    const getVisibleGroupsForUser = useCallback((userId: string): string[] => {
        const setting = liveUserSettings.find(s => s.userId === userId && s.key === 'visibleGroups');
        if (setting && setting.value) {
            return setting.value.split(',').filter(Boolean);
        }
        return [];
    }, [liveUserSettings]);
    
    const updateVisibleGroups = useCallback((userId: string, groups: string[]) => {
        const now = new Date().toISOString();
        const existingSetting = rawUserSettings.find(s => s.userId === userId && s.key === 'visibleGroups');

        const newSetting: UserSetting = {
            userId,
            key: 'visibleGroups',
            value: groups.join(','),
            lastModified: now,
            version: (existingSetting?.version || 0) + 1,
            isDeleted: false,
        };
        dispatch({ type: 'UPDATE_SETTING', payload: newSetting });
    }, [rawUserSettings]);

    const getGroupColorsForUser = useCallback((userId: string): Record<string, string> => {
        const setting = liveUserSettings.find(s => s.userId === userId && s.key === 'groupColors');
        if (setting && setting.value) {
            try {
                return JSON.parse(setting.value);
            } catch (e) {
                console.error("Failed to parse groupColors setting:", e);
                return {};
            }
        }
        return {};
    }, [liveUserSettings]);

    const setGroupColorsForUser = useCallback((userId: string, colors: Record<string, string>) => {
        const now = new Date().toISOString();
        const existingSetting = rawUserSettings.find(s => s.userId === userId && s.key === 'groupColors');

        const newSetting: UserSetting = {
            userId,
            key: 'groupColors',
            value: JSON.stringify(colors),
            lastModified: now,
            version: (existingSetting?.version || 0) + 1,
            isDeleted: false,
        };
        dispatch({ type: 'UPDATE_SETTING', payload: newSetting });
    }, [rawUserSettings]);

    const updateGroupColor = useCallback((userId: string, groupName: string, color: string) => {
        const currentColors = getGroupColorsForUser(userId);
        const newColors = { ...currentColors, [groupName]: color };
        setGroupColorsForUser(userId, newColors);
    }, [getGroupColorsForUser, setGroupColorsForUser]);

    const getQuickAddHideGroups = useCallback((userId: string): boolean => {
        const setting = liveUserSettings.find(s => s.userId === userId && s.key === 'quickAddHideGroups');
        return setting?.value === 'true'; // Default to false
    }, [liveUserSettings]);

    const setQuickAddHideGroups = useCallback((userId: string, hide: boolean) => {
        const now = new Date().toISOString();
        const existingSetting = rawUserSettings.find(s => s.userId === userId && s.key === 'quickAddHideGroups');
        const newSetting: UserSetting = {
            userId,
            key: 'quickAddHideGroups',
            value: String(hide),
            lastModified: now,
            version: (existingSetting?.version || 0) + 1,
            isDeleted: false,
        };
        dispatch({ type: 'UPDATE_SETTING', payload: newSetting });
    }, [rawUserSettings]);

    // --- NEW: AI Features ---
    const getIsAiEnabled = useCallback((userId: string): boolean => {
        const setting = liveUserSettings.find(s => s.userId === userId && s.key === 'aiFeaturesEnabled');
        return setting?.value === 'true'; // Default to false
    }, [liveUserSettings]);

    const setIsAiEnabled = useCallback((userId: string, enabled: boolean) => {
        const now = new Date().toISOString();
        const existingSetting = rawUserSettings.find(s => s.userId === userId && s.key === 'aiFeaturesEnabled');
        const newSetting: UserSetting = {
            userId,
            key: 'aiFeaturesEnabled',
            value: String(enabled),
            lastModified: now,
            version: (existingSetting?.version || 0) + 1,
            isDeleted: false,
        };
        dispatch({ type: 'UPDATE_SETTING', payload: newSetting });
    }, [rawUserSettings]);

    // --- NEW: Category Color Overrides ---
    const getCategoryColorOverrides = useCallback((userId: string): Record<string, string> => {
        const setting = liveUserSettings.find(s => s.userId === userId && s.key === 'categoryColorOverrides');
        if (setting && setting.value) {
            try {
                return JSON.parse(setting.value);
            } catch (e) {
                console.error("Failed to parse categoryColorOverrides setting:", e);
                return {};
            }
        }
        return {};
    }, [liveUserSettings]);
    
    const setCategoryColorOverrides = useCallback((userId: string, overrides: Record<string, string>) => {
        const now = new Date().toISOString();
        const existingSetting = rawUserSettings.find(s => s.userId === userId && s.key === 'categoryColorOverrides');
        const value = JSON.stringify(overrides);

        // If the map is empty, we can mark the setting as "deleted" to save space
        const isDeleted = Object.keys(overrides).length === 0;

        const newSetting: UserSetting = {
            userId,
            key: 'categoryColorOverrides',
            value,
            lastModified: now,
            version: (existingSetting?.version || 0) + 1,
            isDeleted,
        };
        dispatch({ type: 'UPDATE_SETTING', payload: newSetting });
    }, [rawUserSettings]);

    const updateCategoryColorOverride = useCallback((userId: string, categoryId: string, color: string | null) => {
        const currentOverrides = getCategoryColorOverrides(userId);
        const hasChanged = color ? currentOverrides[categoryId] !== color : currentOverrides.hasOwnProperty(categoryId);
        
        if (!hasChanged) return;

        if (color) {
            currentOverrides[categoryId] = color;
        } else {
            delete currentOverrides[categoryId];
        }
        setCategoryColorOverrides(userId, currentOverrides);
    }, [getCategoryColorOverrides, setCategoryColorOverrides]);
    
    const getHiddenCategoryIds = useCallback((userId: string): string[] => {
        if (!userId) return [];
        const setting = liveUserSettings.find(s => s.userId === userId && s.key === 'hiddenCategories');
        if (setting && setting.value) {
            try {
                const parsed = JSON.parse(setting.value);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    }, [liveUserSettings]);

    const setHiddenCategoryIds = useCallback((userId: string, hiddenIds: string[]) => {
        if (!userId) return;
        const now = new Date().toISOString();
        const existingSetting = rawUserSettings.find(s => s.userId === userId && s.key === 'hiddenCategories');
        const newSetting: UserSetting = {
            userId,
            key: 'hiddenCategories',
            value: JSON.stringify(hiddenIds),
            lastModified: now,
            version: (existingSetting?.version || 0) + 1,
            isDeleted: hiddenIds.length === 0,
        };
        dispatch({ type: 'UPDATE_SETTING', payload: newSetting });
    }, [rawUserSettings]);

    const hideCategory = useCallback((userId: string, categoryId: string) => {
        const currentHidden = getHiddenCategoryIds(userId);
        if (!currentHidden.includes(categoryId)) {
            setHiddenCategoryIds(userId, [...currentHidden, categoryId]);
        }
    }, [getHiddenCategoryIds, setHiddenCategoryIds]);

    const unhideCategory = useCallback((userId: string, categoryId: string) => {
        const currentHidden = getHiddenCategoryIds(userId);
        if (currentHidden.includes(categoryId)) {
            setHiddenCategoryIds(userId, currentHidden.filter(id => id !== categoryId));
        }
    }, [getHiddenCategoryIds, setHiddenCategoryIds]);

    const clearHiddenCategories = useCallback((userId: string) => {
        if (!userId) return;
        setHiddenCategoryIds(userId, []);
    }, [setHiddenCategoryIds]);


    return {
        rawUserSettings,
        setUserSettings,
        getGroupColorsForUser,
        updateGroupColor,
        setGroupColorsForUser,
        getVisibleGroupsForUser,
        updateVisibleGroups,
        getQuickAddHideGroups,
        setQuickAddHideGroups,
        getCategoryColorOverrides,
        updateCategoryColorOverride,
        getHiddenCategoryIds,
        hideCategory,
        unhideCategory,
        clearHiddenCategories,
        getIsAiEnabled,
        setIsAiEnabled,
    };
};