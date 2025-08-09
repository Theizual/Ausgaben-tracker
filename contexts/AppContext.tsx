import React, { createContext, useContext, useEffect, useMemo, useRef, useCallback, useState} from 'react';
import { toast } from 'react-hot-toast';
import { useTransactionData } from '@/shared/hooks/useTransactionData';
import { useUI } from '@/shared/hooks/useUI';
import { useSync } from '@/shared/hooks/useSync';
import { useUsers } from '@/shared/hooks/useUsers';
import { useUserSettings } from '@/shared/hooks/useUserSettings';
import { useCategories } from '@/shared/hooks/useCategories';
import type { User, Category, RecurringTransaction } from '@/shared/types';
import { FIXED_COSTS_GROUP_NAME } from '@/constants';
import { isWithinInterval, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import type { Locale } from 'date-fns';
import { de } from 'date-fns/locale';

// Combine the return types of all hooks to define the shape of the context
type AppContextType = 
    ReturnType<typeof useTransactionData> &
    ReturnType<typeof useUI> &
    ReturnType<typeof useUsers> &
    ReturnType<typeof useUserSettings> &
    ReturnType<typeof useCategories> &
    { currentUser: User | null } &
    ReturnType<typeof useSync> &
    { 
        isDemoModeEnabled: boolean;
        flexibleCategories: Category[];
        fixedCategories: Category[];
        totalMonthlyBudget: number; // Flexible budget
        totalSpentThisMonth: number; // Flexible spending
        totalMonthlyFixedCosts: number;
        visibleCategoryGroups: string[];
        groupColors: Record<string, string>;
        deLocale: Locale;
        resetAppData: () => void;
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
    // The `isDemoModeEnabled` flag is crucial for namespacing localStorage.
    const [isInitialSetupDone, setIsInitialSetupDone] = useUI().isInitialSetupState;
    const isDemoModeEnabled = !isInitialSetupDone;

    const uiState = useUI({ isDemoModeEnabled });
    const usersState = useUsers({ isDemoModeEnabled });
    const userSettingsState = useUserSettings({ isDemoModeEnabled });
    
    useEffect(() => {
        if (!isInitialSetupDone) {
            const firstUser = usersState.users[0];
            if (firstUser && firstUser.name !== 'Benutzer') setIsInitialSetupDone(true);
        }
    }, [usersState.users, isInitialSetupDone, setIsInitialSetupDone]);

    const categoryState = useCategories({
        rawUserSettings: userSettingsState.rawUserSettings,
        updateCategoryConfigurationForUser: userSettingsState.updateCategoryConfigurationForUser,
        currentUserId: uiState.currentUserId,
    });

    const flexibleCategories = useMemo(() => categoryState.categories.filter(c => c.group !== FIXED_COSTS_GROUP_NAME), [categoryState.categories]);
    const fixedCategories = useMemo(() => categoryState.categories.filter(c => c.group === FIXED_COSTS_GROUP_NAME), [categoryState.categories]);
    const fixedCategoryIds = useMemo(() => new Set(fixedCategories.map(c => c.id)), [fixedCategories]);
    
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
        isInitialSetupDone: isInitialSetupDone,
        isDemoModeEnabled,
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
        if (!uiState.currentUserId) return categoryState.categoryGroups; // No user selected, show all as fallback
        return userSettingsState.getVisibleGroupsForUser(uiState.currentUserId, categoryState.categoryGroups);
    }, [uiState.currentUserId, categoryState.categoryGroups, userSettingsState]);

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
        categoryState.rawCategories,
        transactionDataState.rawTransactions, 
        transactionDataState.rawRecurringTransactions, 
        transactionDataState.rawAllAvailableTags,
        usersState.rawUsers,
        userSettingsState.rawUserSettings,
        debouncedSync
    ]);

    const resetAppData = useCallback(() => {
        const mode = isDemoModeEnabled ? 'Demo' : 'Produktiv';
        if (window.confirm(`Möchten Sie wirklich alle Daten für den ${mode}-Modus unwiderruflich löschen?`)) {
            const prefix = isDemoModeEnabled ? 'demo_' : '';
            const keysToClear = [
                'transactions', 'allAvailableTags', 'recurringTransactions',
                'users', 'userSettings', 'app-current-user-id', 'transactionViewMode',
                'lastSyncTimestamp', 'autoSyncEnabled'
            ];
            
            keysToClear.forEach(key => window.localStorage.removeItem(`${prefix}${key}`));

            // Also clear non-prefixed keys if resetting production data
            if (!isDemoModeEnabled) {
                window.localStorage.removeItem('initialSetupDone');
            }
            
            toast.success("Anwendungsdaten zurückgesetzt. App wird neu geladen.");
            setTimeout(() => window.location.reload(), 1500);
        }
    }, [isDemoModeEnabled]);

    const value: AppContextType = {
        ...uiState,
        ...categoryState,
        flexibleCategories,
        fixedCategories,
        totalMonthlyBudget,
        totalSpentThisMonth,
        totalMonthlyFixedCosts,
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
        resetAppData,
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