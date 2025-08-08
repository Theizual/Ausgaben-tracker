import { useReducer, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import type { UserSetting, Category } from '@/shared/types';

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
            const existing = state.settings.find(s => s.userId === newSetting.userId && s.settingKey === newSetting.settingKey);
            if (existing) {
                return { ...state, settings: state.settings.map(s => (s.userId === newSetting.userId && s.settingKey === newSetting.settingKey) ? newSetting : s) };
            }
            return { ...state, settings: [...state.settings, newSetting] };
        }
        default:
            return state;
    }
};

const initializer = (): UserSettingsState => {
    try {
        const stored = JSON.parse(window.localStorage.getItem('userSettings') || '[]');
        if (Array.isArray(stored)) {
            return { settings: stored };
        }
    } catch { /* ignore */ }
    return { settings: [] };
};

export const useUserSettings = () => {
    const [state, dispatch] = useReducer(settingsReducer, undefined, initializer);

    useEffect(() => {
        window.localStorage.setItem('userSettings', JSON.stringify(state.settings));
    }, [state.settings]);

    const setUserSettings = useCallback((settings: UserSetting[]) => {
        dispatch({ type: 'SET_SETTINGS', payload: settings });
    }, []);

    const rawUserSettings = useMemo(() => state.settings, [state.settings]);
    const liveUserSettings = useMemo(() => state.settings.filter(s => !s.isDeleted), [state.settings]);

    const getVisibleGroupsForUser = useCallback((userId: string, allGroups: string[]): string[] => {
        const setting = liveUserSettings.find(s => s.userId === userId && s.settingKey === 'visibleGroups');
        if (!setting || !setting.settingValue) {
            return allGroups; // Default: show all
        }
        const visibleFromSettings = setting.settingValue.split(',');
        
        // Ensure the returned groups actually exist in allGroups and maintain the order of allGroups
        return allGroups.filter(g => visibleFromSettings.includes(g));
    }, [liveUserSettings]);

    const updateVisibleGroups = useCallback((userId: string, visibleGroups: string[]) => {
        const now = new Date().toISOString();
        const existingSetting = rawUserSettings.find(s => s.userId === userId && s.settingKey === 'visibleGroups');
        const newSetting: UserSetting = {
            userId,
            settingKey: 'visibleGroups',
            settingValue: visibleGroups.join(','),
            lastModified: now,
            version: (existingSetting?.version || 0) + 1,
            isDeleted: false,
        };
        dispatch({ type: 'UPDATE_SETTING', payload: newSetting });
        toast.success("Anzeigeeinstellungen gespeichert.");
    }, [rawUserSettings]);

    const getGroupColorsForUser = useCallback((userId: string): Record<string, string> => {
        const setting = liveUserSettings.find(s => s.userId === userId && s.settingKey === 'groupColors');
        if (setting && setting.settingValue) {
            try {
                return JSON.parse(setting.settingValue);
            } catch (e) {
                console.error("Failed to parse groupColors setting:", e);
                return {};
            }
        }
        return {};
    }, [liveUserSettings]);

    const setGroupColorsForUser = useCallback((userId: string, colors: Record<string, string>) => {
        const now = new Date().toISOString();
        const existingSetting = rawUserSettings.find(s => s.userId === userId && s.settingKey === 'groupColors');

        const newSetting: UserSetting = {
            userId,
            settingKey: 'groupColors',
            settingValue: JSON.stringify(colors),
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
    
    const getCategoryConfigurationForUser = useCallback((userId: string): { categories: Category[], groups: string[] } | null => {
        const setting = liveUserSettings.find(s => s.userId === userId && s.settingKey === 'categoryConfiguration');
        if (setting && setting.settingValue) {
            try {
                const config = JSON.parse(setting.settingValue);
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

    const updateCategoryConfigurationForUser = useCallback((userId: string, config: { categories: Category[], groups: string[] }) => {
        const now = new Date().toISOString();
        const existingSetting = rawUserSettings.find(s => s.userId === userId && s.settingKey === 'categoryConfiguration');
        const newSetting: UserSetting = {
            userId,
            settingKey: 'categoryConfiguration',
            settingValue: JSON.stringify(config),
            lastModified: now,
            version: (existingSetting?.version || 0) + 1,
            isDeleted: false,
        };
        dispatch({ type: 'UPDATE_SETTING', payload: newSetting });
    }, [rawUserSettings]);


    return {
        rawUserSettings,
        setUserSettings,
        getVisibleGroupsForUser,
        updateVisibleGroups,
        getGroupColorsForUser,
        updateGroupColor,
        setGroupColorsForUser,
        getCategoryConfigurationForUser,
        updateCategoryConfigurationForUser,
    };
};