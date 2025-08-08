import React, { createContext, useContext, useEffect, useMemo, useRef, useReducer, useCallback, useState} from 'react';
import { toast, Toast } from 'react-hot-toast';
import { useTransactionData } from '../hooks/useTransactionData';
import { useUI } from '../hooks/useUI';
import { useSync, type SyncProps } from '../hooks/useSync';
import { useUsers } from '../hooks/useUsers';
import { useUserSettings } from '../hooks/useUserSettings';
import type { User, Category, UserSetting, RecurringTransaction, ViewMode } from '@/shared/types';
import { INITIAL_CATEGORIES, INITIAL_GROUPS, FIXED_COSTS_GROUP_NAME } from '@/constants';
import { isWithinInterval, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import type { Locale } from 'date-fns';
import { de } from 'date-fns/locale';
import { Loader2 } from '@/shared/ui';

type CategoryConfigState = {
    categories: Category[];
    groups: string[];
};

type CategoryAction =
    | { type: 'SET_CONFIG', payload: CategoryConfigState }
    | { type: 'UPDATE_CATEGORY', payload: { id: string, data: Partial<Omit<Category, 'id'>> } }
    | { type: 'UPSERT_CATEGORY', payload: { categoryData: Omit<Category, 'lastModified' | 'version'> & { id: string } } }
    | { type: 'RENAME_GROUP', payload: { oldGroupName: string, newGroupName: string } }
    | { type: 'ADD_GROUP', payload: { groupName: string } }
    | { type: 'DELETE_GROUP', payload: { groupName: string } };

const categoryConfigReducer = (state: CategoryConfigState, action: CategoryAction): CategoryConfigState => {
    const now = new Date().toISOString();
    switch (action.type) {
        case 'SET_CONFIG':
            return action.payload;

        case 'UPDATE_CATEGORY': {
            return {
                ...state,
                categories: state.categories.map(cat =>
                    cat.id === action.payload.id
                        ? { ...cat, ...cat, ...action.payload.data, lastModified: now, version: (cat.version || 0) + 1 }
                        : cat
                )
            };
        }
        
        case 'UPSERT_CATEGORY': {
            const { categoryData } = action.payload;
            const existingCategoryIndex = state.categories.findIndex(c => c.id === categoryData.id);

            let updatedCategories: Category[];
            
            if (existingCategoryIndex > -1) {
                const existingCategory = state.categories[existingCategoryIndex];
                updatedCategories = [...state.categories];
                updatedCategories[existingCategoryIndex] = { ...existingCategory, ...categoryData, isDeleted: false, lastModified: now, version: (existingCategory.version || 0) + 1 };
            } else {
                updatedCategories = [...state.categories, { ...categoryData, lastModified: now, version: 1 }];
            }
            
            const updatedGroups = state.groups.includes(categoryData.group) ? state.groups : [...state.groups, categoryData.group];
            return { ...state, categories: updatedCategories, groups: updatedGroups };
        }

        case 'RENAME_GROUP': {
            const { oldGroupName, newGroupName } = action.payload;
            const trimmedNewName = newGroupName.trim();
            if (oldGroupName === trimmedNewName || !trimmedNewName) return state;
            if (state.groups.includes(trimmedNewName)) {
                toast.error(`Die Gruppe "${trimmedNewName}" existiert bereits.`);
                return state;
            }
            return {
                ...state,
                groups: state.groups.map(g => (g === oldGroupName ? trimmedNewName : g)),
                categories: state.categories.map(c => c.group === oldGroupName ? { ...c, group: trimmedNewName, lastModified: now, version: (c.version || 0) + 1 } : c)
            };
        }

        case 'ADD_GROUP': {
            const { groupName } = action.payload;
            const trimmedName = groupName.trim();
            if (!trimmedName) { toast.error('Gruppenname darf nicht leer sein.'); return state; }
            if (state.groups.some(g => g.toLowerCase() === trimmedName.toLowerCase())) { toast.error(`Gruppe "${trimmedName}" existiert bereits.`); return state; }
            const newGroups = [...state.groups];
            const insertionIndex = newGroups.length > 0 ? newGroups.length - 1 : 0;
            newGroups.splice(insertionIndex, 0, trimmedName);
            toast.success(`Gruppe "${trimmedName}" hinzugefügt.`);
            return { ...state, groups: newGroups };
        }
            
        case 'DELETE_GROUP': {
            const { groupName } = action.payload;
            const DEFAULT_GROUP = 'Sonstiges';
            if (groupName === FIXED_COSTS_GROUP_NAME) { toast.error(`Die Gruppe "${FIXED_COSTS_GROUP_NAME}" kann nicht gelöscht werden.`); return state; }
            if (groupName === DEFAULT_GROUP) { toast.error(`Die Gruppe "${DEFAULT_GROUP}" kann nicht gelöscht werden.`); return state; }
            const categoriesToMove = state.categories.filter(c => c.group === groupName && !c.isDeleted);
            const updatedGroups = state.groups.filter(g => g !== groupName);
            const updatedCategories = state.categories.map(c => c.group === groupName ? { ...c, group: DEFAULT_GROUP, lastModified: now, version: (c.version || 0) + 1 } : c);
            if (!updatedGroups.includes(DEFAULT_GROUP) && updatedCategories.some(c => c.group === DEFAULT_GROUP)) updatedGroups.push(DEFAULT_GROUP);
            let toastMessage = `Gruppe "${groupName}" wurde gelöscht.`;
            if (categoriesToMove.length > 0) {
                const pluralText = categoriesToMove.length === 1 ? 'Kategorie wurde' : 'Kategorien wurden';
                toastMessage = `Gruppe "${groupName}" gelöscht und ${categoriesToMove.length} ${pluralText} nach "${DEFAULT_GROUP}" verschoben.`;
            }
            toast.success(toastMessage);
            return { ...state, groups: updatedGroups, categories: updatedCategories };
        }
        default:
            return state;
    }
};

// Combine the return types of all hooks to define the shape of the context
type AppContextType = 
    ReturnType<typeof useTransactionData> &
    ReturnType<typeof useUI> &
    ReturnType<typeof useUsers> &
    ReturnType<typeof useUserSettings> &
    { currentUser: User | null } &
    ReturnType<typeof useSync> &
    { 
        isDemoModeEnabled: boolean;
        categories: Category[];
        flexibleCategories: Category[];
        fixedCategories: Category[];
        unassignedCategories: Category[];
        categoryGroups: string[];
        categoryMap: Map<string, Category>;
        totalMonthlyBudget: number; // Flexible budget
        totalSpentThisMonth: number; // Flexible spending
        totalMonthlyFixedCosts: number;
        visibleCategoryGroups: string[];
        groupColors: Record<string, string>;
        loadStandardConfiguration: () => void;
        upsertCategory: (categoryData: Omit<Category, 'lastModified' | 'version'> & { id: string }) => void;
        deleteCategory: (id: string) => void;
        renameGroup: (oldName: string, newName: string) => void;
        addGroup: (groupName: string) => void;
        deleteGroup: (groupName: string) => void;
        deLocale: Locale;
    };

const AppContext = createContext<AppContextType | null>(null);

// Debounce helper function
function debounce(func: (...args: any[]) => void, delay: number) {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const deLocale = de;
    
    // Instantiate hooks in an order that resolves dependencies.
    const uiState = useUI();
    const usersState = useUsers();
    const userSettingsState = useUserSettings();

    const userSettingsStateRef = useRef(userSettingsState);
    useEffect(() => {
        userSettingsStateRef.current = userSettingsState;
    });
    
    // --- Demo Mode Logic ---
    const { isInitialSetupDone, setIsInitialSetupDone } = uiState;
    useEffect(() => {
        if (!isInitialSetupDone) {
            const firstUser = usersState.users[0];
            if (firstUser && firstUser.name !== 'Benutzer') setIsInitialSetupDone(true);
        }
    }, [usersState.users, isInitialSetupDone, setIsInitialSetupDone]);
    const isDemoModeEnabled = !isInitialSetupDone;

    // --- User-specific Category Configuration ---
    const [categoryConfig, dispatchCategoryConfig] = useReducer(categoryConfigReducer, { categories: [], groups: [] });
    const isInitialUserLoad = useRef(true);

    useEffect(() => {
        if (uiState.currentUserId) {
            isInitialUserLoad.current = true;
            const config = userSettingsStateRef.current.getCategoryConfigurationForUser(uiState.currentUserId);
            
            const initialConfig = config || { categories: INITIAL_CATEGORIES, groups: INITIAL_GROUPS };
            dispatchCategoryConfig({ type: 'SET_CONFIG', payload: initialConfig });

            // If it's the first time for this user (no config yet)
            if (!config) {
                // Set the category configuration
                userSettingsStateRef.current.updateCategoryConfigurationForUser(uiState.currentUserId, initialConfig);
                
                // Also set the initial group colors based on the first category in each group
                const initialGroupColors: Record<string, string> = {};
                initialConfig.groups.forEach(groupName => {
                    const firstCategoryInGroup = initialConfig.categories.find(c => c.group === groupName);
                    if (firstCategoryInGroup) {
                        initialGroupColors[groupName] = firstCategoryInGroup.color;
                    }
                });
                userSettingsStateRef.current.setGroupColorsForUser(uiState.currentUserId, initialGroupColors);
            }
            
            const timer = setTimeout(() => { isInitialUserLoad.current = false; }, 50);
            return () => clearTimeout(timer);
        }
    }, [uiState.currentUserId]);

    useEffect(() => {
        if (uiState.currentUserId && !isInitialUserLoad.current) {
            userSettingsStateRef.current.updateCategoryConfigurationForUser(uiState.currentUserId, categoryConfig);
        }
    }, [categoryConfig, uiState.currentUserId]);
    
    // Derived state from user-specific category config
    const categories = useMemo(() => categoryConfig.categories.filter(c => !c.isDeleted), [categoryConfig.categories]);
    const categoryGroups = useMemo(() => categoryConfig.groups, [categoryConfig.groups]);
    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
    
    const flexibleCategories = useMemo(() => categories.filter(c => c.group !== FIXED_COSTS_GROUP_NAME), [categories]);
    const fixedCategories = useMemo(() => categories.filter(c => c.group === FIXED_COSTS_GROUP_NAME), [categories]);
    const fixedCategoryIds = useMemo(() => new Set(fixedCategories.map(c => c.id)), [fixedCategories]);
    
    const unassignedCategories = useMemo(() => {
        const existingCategoryMap = new Map(categoryConfig.categories.map(c => [c.id, c]));
        return INITIAL_CATEGORIES.filter(cat => !existingCategoryMap.has(cat.id));
    }, [categoryConfig.categories]);

    const totalMonthlyBudget = useMemo(() => flexibleCategories.reduce((sum, cat) => sum + (cat.budget || 0), 0), [flexibleCategories]);
    
    const transactionDataState = useTransactionData({
        showConfirmation: uiState.showConfirmation,
        closeTransactionDetail: uiState.closeTransactionDetail,
        currentUserId: uiState.currentUserId,
        isDemoModeEnabled: isDemoModeEnabled,
    });
    
    const totalSpentThisMonth = useMemo(() => {
        const monthInterval = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
        return transactionDataState.transactions
            .filter(t => !fixedCategoryIds.has(t.categoryId) && isWithinInterval(parseISO(t.date), monthInterval))
            .reduce((sum, t) => sum + t.amount, 0);
    }, [transactionDataState.transactions, fixedCategoryIds]);
    
    const totalMonthlyFixedCosts = useMemo(() => {
        return transactionDataState.recurringTransactions
            .filter(rt => fixedCategoryIds.has(rt.categoryId))
            .reduce((sum, rt) => {
                if (rt.frequency === 'monthly') return sum + rt.amount;
                if (rt.frequency === 'yearly') return sum + (rt.amount / 12);
                return sum;
            }, 0);
    }, [transactionDataState.recurringTransactions, fixedCategoryIds]);

    // Category management functions
    const loadStandardConfiguration = useCallback(() => {
        if (window.confirm("Möchten Sie die aktuelle Konfiguration überschreiben und die Standard-Kategorien laden? Alle Ihre Anpassungen gehen verloren.") && uiState.currentUserId) {
            const standardConfig = { categories: INITIAL_CATEGORIES, groups: INITIAL_GROUPS };
            dispatchCategoryConfig({ type: 'SET_CONFIG', payload: standardConfig });
            
            const initialGroupColors: Record<string, string> = {};
            standardConfig.groups.forEach(groupName => {
                const firstCategoryInGroup = standardConfig.categories.find(c => c.group === groupName);
                if (firstCategoryInGroup) {
                    initialGroupColors[groupName] = firstCategoryInGroup.color;
                }
            });
            userSettingsState.setGroupColorsForUser(uiState.currentUserId, initialGroupColors);

            toast.success("Standardkonfiguration wurde geladen.");
        }
    }, [uiState.currentUserId, userSettingsState]);
    const upsertCategory = useCallback((categoryData: Omit<Category, 'lastModified' | 'version'> & { id: string }) => {
        dispatchCategoryConfig({ type: 'UPSERT_CATEGORY', payload: { categoryData } });
    }, []);
    const deleteCategory = useCallback((id: string) => {
        const categoryToDelete = categoryConfig.categories.find(c => c.id === id);
        if (categoryToDelete) {
            dispatchCategoryConfig({ type: 'UPDATE_CATEGORY', payload: { id, data: { isDeleted: true } } });
            toast.success(`Kategorie "${categoryToDelete.name}" entfernt.`);
        }
    }, [categoryConfig.categories]);
    const renameGroup = useCallback((oldName: string, newName: string) => dispatchCategoryConfig({ type: 'RENAME_GROUP', payload: { oldGroupName: oldName, newGroupName: newName } }), []);
    const addGroup = useCallback((groupName: string) => dispatchCategoryConfig({ type: 'ADD_GROUP', payload: { groupName } }), []);
    const deleteGroup = useCallback((groupName: string) => dispatchCategoryConfig({ type: 'DELETE_GROUP', payload: { groupName } }), []);
    
    // Sync needs data and setters from all other domains.
    const syncState = useSync({
        rawTransactions: transactionDataState.rawTransactions,
        rawRecurringTransactions: transactionDataState.rawRecurringTransactions,
        rawAllAvailableTags: transactionDataState.rawAllAvailableTags,
        rawUsers: usersState.rawUsers,
        rawUserSettings: userSettingsState.rawUserSettings,
        setTransactions: transactionDataState.setTransactions,
        setRecurringTransactions: transactionDataState.setRecurringTransactions,
        setAllAvailableTags: transactionDataState.setAllAvailableTags,
        setUsers: usersState.setUsers,
        setUserSettings: userSettingsState.setUserSettings,
    });
    
     // Side-effects for sync status
     const { syncStatus, syncError } = syncState;
     useEffect(() => {
        if (syncStatus === 'syncing') toast.loading('Synchronisiere Daten...', { id: 'sync-toast' });
        if (syncStatus === 'success' && toast.custom) { toast.success('Synchronisierung erfolgreich!', { id: 'sync-toast' });}
        if (syncStatus === 'error' && syncError) toast.error(`Fehler: ${syncError}`, { id: 'sync-toast' });
        if (syncStatus === 'conflict') toast.error('Konflikt! Daten wurden zusammengeführt.', { id: 'sync-toast', duration: 5000 });
     }, [syncStatus, syncError]);


    const currentUser = useMemo(() => {
        if (!uiState.currentUserId) return null;
        return usersState.users.find(u => u.id === uiState.currentUserId) || null;
    }, [usersState.users, uiState.currentUserId]);

    // This effect ensures a user is always selected if users exist
    useEffect(() => {
        if (usersState.users.length > 0 && (!uiState.currentUserId || !usersState.users.some(u => u.id === uiState.currentUserId))) {
            uiState.setCurrentUserId(usersState.users[0].id);
        }
    }, [usersState.users, uiState.currentUserId, uiState.setCurrentUserId]);

    // Filter category groups based on the current user's settings
    const visibleCategoryGroups = useMemo(() => {
        if (!uiState.currentUserId) return categoryGroups; // No user selected, show all as fallback
        return userSettingsState.getVisibleGroupsForUser(uiState.currentUserId, categoryGroups);
    }, [uiState.currentUserId, categoryGroups, userSettingsState]);

    const groupColors = useMemo(() => {
        if (!uiState.currentUserId) return {};
        return userSettingsState.getGroupColorsForUser(uiState.currentUserId);
    }, [uiState.currentUserId, userSettingsState]);


    // --- Auto-sync logic with stale closure fix ---
    const syncStateRef = useRef(syncState);
    useEffect(() => { syncStateRef.current = syncState; });
    const suppressAutoSyncRef = useRef(false);
    useEffect(() => {
      if (syncState.syncStatus !== 'syncing' && syncState.syncStatus !== 'loading') {
        suppressAutoSyncRef.current = true;
        // The debounce delay for auto-sync is 2000ms. This timeout must be longer
        // to prevent a sync-triggered state update from immediately queuing another sync.
        const t = setTimeout(() => { suppressAutoSyncRef.current = false; }, 2500);
        return () => clearTimeout(t);
      }
    }, [syncState.syncStatus]);
    const debouncedSync = useMemo(() => debounce(() => {
        if (suppressAutoSyncRef.current) return;
        const { isAutoSyncEnabled, syncStatus, syncData } = syncStateRef.current;
        if (isAutoSyncEnabled && (syncStatus === 'idle' || syncStatus === 'success' || syncStatus === 'error')) syncData({ isAuto: true });
    }, 2000), []);
    const isInitialMount = useRef(true);
    useEffect(() => {
        if (isInitialMount.current) { isInitialMount.current = false; return; }
        debouncedSync();
    }, [
        categoryConfig,
        transactionDataState.rawTransactions, 
        transactionDataState.rawRecurringTransactions, 
        transactionDataState.rawAllAvailableTags,
        usersState.rawUsers,
        userSettingsState.rawUserSettings,
        debouncedSync
    ]);

    const value: AppContextType = {
        ...uiState,
        categories,
        flexibleCategories,
        fixedCategories,
        unassignedCategories,
        categoryGroups,
        categoryMap,
        totalMonthlyBudget,
        totalSpentThisMonth,
        totalMonthlyFixedCosts,
        loadStandardConfiguration,
        upsertCategory,
        deleteCategory,
        renameGroup,
        addGroup,
        deleteGroup,
        ...transactionDataState,
        ...usersState,
        ...userSettingsState,
        visibleCategoryGroups,
        groupColors,
        currentUser,
        deleteMultipleTransactions: transactionDataState.deleteMultipleTransactions,
        addMultipleTransactions: transactionDataState.addMultipleTransactions,
        selectTotalSpentForMonth: transactionDataState.selectTotalSpentForMonth,
        ...syncState,
        isDemoModeEnabled,
        deLocale,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

// Custom hook to easily consume the context in components
export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};