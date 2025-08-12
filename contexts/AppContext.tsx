import React, { createContext, useContext, useEffect, useMemo, useRef, useCallback, useState} from 'react';
import { toast } from 'react-hot-toast';
import { useTransactionData } from '@/shared/hooks/useTransactionData';
import { useUI } from '@/shared/hooks/useUI';
import { useSync } from '@/shared/hooks/useSync';
import { useUsers } from '@/shared/hooks/useUsers';
import { useUserSettings } from '@/shared/hooks/useUserSettings';
import { useCategories } from '@/shared/hooks/useCategories';
import { useCategoryPreferences } from '@/shared/hooks/useCategoryPreferences';
import useLocalStorage from '@/shared/hooks/useLocalStorage';
import type { User, Category, Group, RecurringTransaction, Transaction, Tag, UserSetting } from '@/shared/types';
import { FIXED_COSTS_GROUP_ID, DEFAULT_CATEGORY_ID } from '@/constants';
import { isWithinInterval, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import type { Locale } from 'date-fns';
import { de } from 'date-fns/locale';
import { Loader2 } from '@/shared/ui';
import { apiGet } from '@/shared/lib/http';

// Combine the return types of all hooks to define the shape of the context
type AppContextType = 
    ReturnType<typeof useTransactionData> &
    ReturnType<typeof useUI> &
    ReturnType<typeof useUsers> &
    Omit<ReturnType<typeof useUserSettings>, 'setQuickAddHideGroups'> &
    ReturnType<typeof useCategories> &
    ReturnType<typeof useCategoryPreferences> &
    { currentUser: User | null } &
    ReturnType<typeof useSync> &
    { 
        isDemoModeEnabled: boolean;
        isInitialSetupDone: boolean;
        setIsInitialSetupDone: React.Dispatch<React.SetStateAction<boolean>>;
        totalMonthlyBudget: number; // Flexible budget
        totalSpentThisMonth: number; // Flexible spending
        totalMonthlyFixedCosts: number;
        deLocale: Locale;
        resetAppData: () => void;
        visibleCategoryGroups: string[];
        handleReassignAndDeleteCategory: (sourceCategoryId: string, targetCategoryId: string) => void;
        quickAddHideGroups: boolean;
        setQuickAddHideGroups: (hide: boolean) => void;
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


// This component holds the actual app state, and is only rendered when the core state is stable.
const ReadyAppProvider: React.FC<{
    children: React.ReactNode;
    isDemoModeEnabled: boolean;
    isInitialSetupDone: boolean;
    setIsInitialSetupDone: React.Dispatch<React.SetStateAction<boolean>>;
    uiState: ReturnType<typeof useUI>;
    usersState: ReturnType<typeof useUsers>;
    appMode: 'demo' | 'standard';
}> = ({
    children,
    isDemoModeEnabled,
    isInitialSetupDone,
    setIsInitialSetupDone,
    uiState,
    usersState,
    appMode
}) => {
    // uiState and usersState are now stable and passed as props.
    // The currentUserId is guaranteed to be valid here.
    const deLocale = de;

    // This effect transitions the app from demo mode to production mode.
    useEffect(() => {
        if (!isInitialSetupDone) {
            const firstUser = usersState.users[0];
            if (firstUser && firstUser.name !== 'Benutzer') {
                setIsInitialSetupDone(true);
            }
        }
    }, [usersState.users, isInitialSetupDone, setIsInitialSetupDone]);

    // Now that uiState and usersState are stable, initialize the rest of the app's state.
    const userSettingsState = useUserSettings({ isDemoModeEnabled });
    const categoryState = useCategories({
        rawUserSettings: userSettingsState.rawUserSettings,
        updateCategoryConfigurationForUser: userSettingsState.updateCategoryConfigurationForUser,
        currentUserId: uiState.currentUserId,
        isDemoModeEnabled: isDemoModeEnabled,
    });

    // --- Create final groups with user color overrides applied ---
    const finalGroups = useMemo(() => {
        if (!uiState.currentUserId) return categoryState.groups;
        const customColors = userSettingsState.getGroupColorsForUser(uiState.currentUserId);
        return categoryState.groups.map(group => ({
            ...group,
            color: customColors[group.name] || group.color,
        }));
    }, [categoryState.groups, userSettingsState, uiState.currentUserId]);

    const finalGroupMap = useMemo(() => new Map(finalGroups.map(g => [g.id, g])), [finalGroups]);
    const finalGroupNames = useMemo(() => finalGroups.map(g => g.name), [finalGroups]);
    
    const finalCategoryMap = useMemo(() => {
        const newMap = new Map(categoryState.categoryMap);
        newMap.forEach((category, id) => {
            const group = finalGroupMap.get(category.groupId);
            // This is subtle: some category colors inherit from the group.
            // If the group color changed, we should reflect that if the category color was the same.
            const originalGroupColor = categoryState.groupMap.get(category.groupId)?.color;
            if (group && category.color === originalGroupColor) {
                newMap.set(id, { ...category, color: group.color as string });
            }
        });
        return newMap;
    }, [categoryState.categoryMap, categoryState.groupMap, finalGroupMap]);


    const categoryPreferencesState = useCategoryPreferences({
        userId: uiState.currentUserId,
        isDemoModeEnabled,
    });
    
    const fixedCategoryIds = useMemo(() => new Set(categoryState.fixedCategories.map(c => c.id)), [categoryState.fixedCategories]);
    
    const totalMonthlyBudget = useMemo(() => categoryState.flexibleCategories.reduce((sum, cat) => sum + (cat.budget || 0), 0), [categoryState.flexibleCategories]);
    
    const transactionDataState = useTransactionData({
        showConfirmation: uiState.showConfirmation,
        closeTransactionDetail: uiState.closeTransactionDetail,
        currentUserId: uiState.currentUserId,
        isDemoModeEnabled: isDemoModeEnabled,
        addRecentCategory: categoryPreferencesState.addRecent,
    });
    
    const enrichedTransactions = useMemo(() => {
        return transactionDataState.transactions.map(tx => {
            if (finalCategoryMap.has(tx.categoryId)) {
                return tx;
            }
            console.warn(`Transaction ${tx.id} has orphan categoryId ${tx.categoryId}. Re-assigning to 'Sonstiges'.`);
            return { ...tx, categoryId: DEFAULT_CATEGORY_ID };
        });
    }, [transactionDataState.transactions, finalCategoryMap]);

    const totalSpentThisMonth = useMemo(() => {
        const monthInterval = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
        return enrichedTransactions
            .filter(t => !fixedCategoryIds.has(t.categoryId) && isWithinInterval(parseISO(t.date), monthInterval))
            .reduce((sum, t) => sum + t.amount, 0);
    }, [enrichedTransactions, fixedCategoryIds]);
    
    const totalMonthlyFixedCosts = useMemo(() => {
        return transactionDataState.recurringTransactions
            .filter(rt => fixedCategoryIds.has(rt.categoryId))
            .reduce((sum, rt) => {
                if (rt.frequency === 'monthly') return sum + rt.amount;
                if (rt.frequency === 'yearly') return sum + (rt.amount / 12);
                return sum;
            }, 0);
    }, [transactionDataState.recurringTransactions, fixedCategoryIds]);

    const visibleCategoryGroups = useMemo(() => {
        if (!uiState.currentUserId) return [];
        
        const setting = userSettingsState.rawUserSettings.find(s => s.userId === uiState.currentUserId && s.key === 'visibleGroups' && !s.isDeleted);
        
        if (setting) {
            // Setting exists, use it (even if it's an empty array of groups)
            return userSettingsState.getVisibleGroupsForUser(uiState.currentUserId);
        }
        
        // No setting exists for this user, so default to all groups visible.
        return categoryState.groups.map(g => g.name);
    }, [uiState.currentUserId, userSettingsState, categoryState.groups]);

    const quickAddHideGroups = useMemo(() => {
        if (!uiState.currentUserId) return false; // Default to showing groups
        return userSettingsState.getQuickAddHideGroups(uiState.currentUserId);
    }, [uiState.currentUserId, userSettingsState]);

    const setQuickAddHideGroups = useCallback((hide: boolean) => {
        if (!uiState.currentUserId) return;
        userSettingsState.setQuickAddHideGroups(uiState.currentUserId, hide);
    }, [uiState.currentUserId, userSettingsState]);

    const syncState = useSync({
        rawCategories: categoryState.rawCategories,
        rawGroups: categoryState.rawGroups,
        rawTransactions: transactionDataState.rawTransactions,
        rawRecurringTransactions: transactionDataState.rawRecurringTransactions,
        rawAllAvailableTags: transactionDataState.rawAllAvailableTags,
        rawUsers: usersState.rawUsers,
        rawUserSettings: userSettingsState.rawUserSettings,
        setCategoriesAndGroups: categoryState.setCategoriesAndGroups,
        setTransactions: transactionDataState.setTransactions,
        setRecurringTransactions: transactionDataState.setRecurringTransactions,
        setAllAvailableTags: transactionDataState.setAllAvailableTags,
        setUsers: usersState.setUsers,
        setUserSettings: userSettingsState.setUserSettings,
        isInitialSetupDone: isInitialSetupDone,
        isDemoModeEnabled,
        setIsInitialSetupDone: setIsInitialSetupDone,
        currentUserId: uiState.currentUserId,
        appMode,
    });
    
     const { syncStatus, syncError } = syncState;
     useEffect(() => {
        if (syncStatus === 'syncing') toast.loading('Synchronisiere Daten...', { id: 'sync-toast' });
        if (syncStatus === 'loading') toast.loading('Lade Daten vom Server...', { id: 'sync-toast' });
        if (syncStatus === 'success' && toast.custom) { toast.success('Synchronisierung erfolgreich!', { id: 'sync-toast' });}
        if (syncStatus === 'error' && syncError) toast.error(`Fehler: ${syncError}`, { id: 'sync-toast' });
        if (syncStatus === 'conflict') toast.error('Konflikt! Daten wurden zusammengeführt.', { id: 'sync-toast', duration: 5000 });
     }, [syncStatus, syncError]);


    const currentUser = useMemo(() => {
        if (!uiState.currentUserId) return null;
        return usersState.users.find(u => u.id === uiState.currentUserId) || null;
    }, [usersState.users, uiState.currentUserId]);

    const syncStateRef = useRef(syncState);
    useEffect(() => { syncStateRef.current = syncState; });
    const suppressAutoSyncRef = useRef(false);
    useEffect(() => {
      if (syncStatus !== 'syncing' && syncStatus !== 'loading') {
        suppressAutoSyncRef.current = true;
        const t = setTimeout(() => { suppressAutoSyncRef.current = false; }, 2500);
        return () => clearTimeout(t);
      }
    }, [syncStatus]);
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
        categoryState.rawGroups,
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
            
            // Also clear favorites and recents for all users under the current mode
            usersState.users.forEach(user => {
                keysToClear.push(`${user.id}_favorite_categories`);
                keysToClear.push(`${user.id}_recent_categories`);
                keysToClear.push(`${user.id}_quickAddHideGroups`); // Clear the new setting too
            });

            keysToClear.forEach(key => window.localStorage.removeItem(`${prefix}${key}`));

            if (!isDemoModeEnabled) {
                window.localStorage.removeItem('initialSetupDone');
            }
            
            toast.success("Anwendungsdaten zurückgesetzt. App wird neu geladen.");
            setTimeout(() => window.location.reload(), 1500);
        }
    }, [isDemoModeEnabled, usersState.users]);

    const handleReassignAndDeleteCategory = useCallback((sourceCategoryId: string, targetCategoryId: string) => {
        const sourceCategoryName = categoryState.categoryMap.get(sourceCategoryId)?.name;
    
        // 1. Reassign transactions
        transactionDataState.reassignCategoryForTransactions(sourceCategoryId, targetCategoryId);
    
        // 2. "Delete" the category (soft delete)
        categoryState.deleteCategory(sourceCategoryId);
    
        // 3. Clean up preferences
        categoryPreferencesState.removeCategoryFromPreferences(sourceCategoryId);
        
        if (sourceCategoryName) {
            toast.success(`Kategorie "${sourceCategoryName}" gelöscht und Transaktionen neu zugeordnet.`);
        }
    
        // 4. Close the reassign modal - this is done in the component, but we can ensure it.
        uiState.closeReassignModal();
    
    }, [
        transactionDataState.reassignCategoryForTransactions, 
        categoryState.deleteCategory, 
        categoryState.categoryMap,
        categoryPreferencesState.removeCategoryFromPreferences, 
        uiState.closeReassignModal
    ]);

    const { setQuickAddHideGroups: _, ...restUserSettingsState } = userSettingsState;

    const value: AppContextType = {
        ...uiState,
        ...categoryState,
        groups: finalGroups, // Use the color-overridden groups
        groupMap: finalGroupMap,
        groupNames: finalGroupNames,
        categoryMap: finalCategoryMap,
        ...categoryPreferencesState,
        totalMonthlyBudget,
        ...transactionDataState,
        transactions: enrichedTransactions,
        totalSpentThisMonth,
        totalMonthlyFixedCosts,
        ...usersState,
        ...restUserSettingsState,
        currentUser,
        deleteMultipleTransactions: transactionDataState.deleteMultipleTransactions,
        addMultipleTransactions: transactionDataState.addMultipleTransactions,
        selectTotalSpentForMonth: transactionDataState.selectTotalSpentForMonth,
        ...syncState,
        isDemoModeEnabled,
        isInitialSetupDone,
        setIsInitialSetupDone,
        deLocale,
        resetAppData,
        visibleCategoryGroups,
        handleReassignAndDeleteCategory,
        quickAddHideGroups,
        setQuickAddHideGroups,
    };
    
    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

// This component is a "Gatekeeper". It ensures the core user state is stable before rendering the rest of the app.
const AppStateContainer: React.FC<{
    children: React.ReactNode;
    isDemoModeEnabled: boolean;
    isInitialSetupDone: boolean;
    setIsInitialSetupDone: React.Dispatch<React.SetStateAction<boolean>>;
    appMode: 'demo' | 'standard';
}> = (props) => {
    const { children, appMode, ...rest } = props;

    // These two hooks determine the core readiness of the app.
    const uiState = useUI({ isDemoModeEnabled: props.isDemoModeEnabled });
    const usersState = useUsers({ isDemoModeEnabled: props.isDemoModeEnabled });
    
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // This effect ensures we have a valid user selected before proceeding.
        if (usersState.users.length > 0) {
            const currentUserIsValid = uiState.currentUserId && usersState.users.some(u => u.id === uiState.currentUserId);
            
            if (!currentUserIsValid) {
                // If current user is not set or is invalid, set it to the first available user.
                // This triggers a re-render. We are not "ready" yet.
                uiState.setCurrentUserId(usersState.users[0].id);
                setIsReady(false);
            } else {
                // The current user ID is valid. We are ready to render the full app.
                setIsReady(true);
            }
        }
    }, [usersState.users, uiState.currentUserId, uiState.setCurrentUserId]);

    if (!isReady) {
        // Display a loading screen while the user state stabilizes.
        // This prevents downstream hooks from running with invalid state.
        return (
            <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
        );
    }
    
    // Once ready, render the full provider with the now-stable state.
    return (
        <ReadyAppProvider
            {...rest}
            appMode={appMode}
            uiState={uiState}
            usersState={usersState}
        >
            {children}
        </ReadyAppProvider>
    );
};

// The main provider now only manages the top-level mode switch.
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [appMode, setAppMode] = useState<'loading' | 'demo' | 'standard'>('loading');
    const [isInitialSetupDone, setIsInitialSetupDone] = useLocalStorage<boolean>('initialSetupDone', false);
    const [localAppMode, setLocalAppMode] = useLocalStorage<'demo' | 'standard'>('appMode', 'standard');

    useEffect(() => {
        const determineInitialMode = async () => {
            if (!isInitialSetupDone) {
                setAppMode('demo');
                setLocalAppMode('demo');
                return;
            }

            setAppMode(localAppMode); // Optimistic start

            try {
                const { userSettings }: { userSettings: UserSetting[] } = await apiGet('/api/sheets/read?ranges=UserSettings!A2:Z');
                
                const modeSetting = userSettings.find(s => s.userId === 'app_meta' && s.key === 'mode');
                const remoteMode = modeSetting?.value === 'demo' ? 'demo' : 'standard';

                if (remoteMode !== localAppMode) {
                    toast(`App-Modus wurde synchronisiert: ${remoteMode === 'demo' ? 'Demo' : 'Standard'}.`);
                    setAppMode(remoteMode);
                    setLocalAppMode(remoteMode);
                }
            } catch (error) {
                console.error("Konnte den App-Modus nicht vom Server abrufen. Fahre mit lokalem Modus fort.", error);
            }
        };

        determineInitialMode();
    }, [isInitialSetupDone, localAppMode, setLocalAppMode]);

    if (appMode === 'loading') {
        return (
            <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                    <p className="text-slate-400">Lade Konfiguration...</p>
                </div>
            </div>
        );
    }

    const isDemoModeEnabled = appMode === 'demo';

    return (
        <AppStateContainer
            key={appMode}
            isDemoModeEnabled={isDemoModeEnabled}
            isInitialSetupDone={isInitialSetupDone}
            setIsInitialSetupDone={setIsInitialSetupDone}
            appMode={appMode}
        >
            {children}
        </AppStateContainer>
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