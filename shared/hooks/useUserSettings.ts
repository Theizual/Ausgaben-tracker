
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
    
    const getCategoryConfigurationForUser = useCallback((userId: string): { categories: Category[], groups: Group[] } | null => {
        const setting = liveUserSettings.find(s => s.userId === userId && s.key === 'categoryConfiguration');
        if (setting && setting.value) {
            try {
                const config = JSON.parse(setting.value);
                if (Array.isArray(config.categories) && Array.isArray(config.groups)) {
                    return config;
                }
            } catch (e) {
                console.error("Failed to parse categoryConfiguration:", e);
                return null;
            }
        }
        return null;
    }, [liveUserSettings]);

    const updateCategoryConfigurationForUser = useCallback((userId: string, config: { categories: Category[], groups: Group[] }) => {
        const now = new Date().toISOString();
        const existingSetting = rawUserSettings.find(s => s.userId === userId && s.key === 'categoryConfiguration');
        const newSetting: UserSetting = {
            userId,
            key: 'categoryConfiguration',
            value: JSON.stringify(config),
            lastModified: now,
            version: (existingSetting?.version || 0) + 1,
            isDeleted: false,
        };
        dispatch({ type: 'UPDATE_SETTING', payload: newSetting });
    }, [rawUserSettings]);

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


    return {
        rawUserSettings,
        setUserSettings,
        getGroupColorsForUser,
        updateGroupColor,
        setGroupColorsForUser,
        getCategoryConfigurationForUser,
        updateCategoryConfigurationForUser,
        getVisibleGroupsForUser,
        updateVisibleGroups,
        getQuickAddHideGroups,
        setQuickAddHideGroups,
    };
};