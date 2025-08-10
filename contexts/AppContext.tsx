import React, { createContext, useContext, useEffect, useMemo, useRef, useCallback, useState} from 'react';
import { toast } from 'react-hot-toast';
import { useTransactionData } from '@/shared/hooks/useTransactionData';
import { useUI } from '@/shared/hooks/useUI';
import { useSync } from '@/shared/hooks/useSync';
import { useUsers } from '@/shared/hooks/useUsers';
import { useUserSettings } from '@/shared/hooks/useUserSettings';
import { useCategories } from '@/shared/hooks/useCategories';
import useLocalStorage from '@/shared/hooks/useLocalStorage';
import type { User, Category, Group, RecurringTransaction } from '@/shared/types';
import { FIXED_COSTS_GROUP_ID } from '@/constants';
import { isWithinInterval, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import type { Locale } from 'date-fns';
import { de } from 'date-fns/locale';
import { Loader2 } from '@/shared/ui';

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
        isInitialSetupDone: boolean;
        setIsInitialSetupDone: React.Dispatch<React.SetStateAction<boolean>>;
        flexibleCategories: Category[];
        fixedCategories: Category[];
        totalMonthlyBudget: number; // Flexible budget
        totalSpentThisMonth: number; // Flexible spending
        totalMonthlyFixedCosts: number;
        visibleCategoryGroups: string[]; // Names of groups
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

// This component holds the actual app state, and is only rendered when the core state is stable.
const ReadyAppProvider: React.FC<{
    children: React.ReactNode;
    isDemoModeEnabled: boolean;
    isInitialSetupDone: boolean;
    setIsInitialSetupDone: React.Dispatch<React.SetStateAction<boolean>>;
    uiState: ReturnType<typeof useUI>;
    usersState: ReturnType<typeof useUsers>;
}> = ({
    children,
    isDemoModeEnabled,
    isInitialSetupDone,
    setIsInitialSetupDone,
    uiState,
    usersState
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
    });

    const flexibleCategories = useMemo(() => categoryState.categories.filter(c => c.groupId !== FIXED_COSTS_GROUP_ID), [categoryState.categories]);
    const fixedCategories = useMemo(() => categoryState.categories.filter(c => c.groupId === FIXED_COSTS_GROUP_ID), [categoryState.categories]);
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
    });
    
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

    const visibleCategoryGroups = useMemo(() => {
        if (!uiState.currentUserId) return categoryState.groupNames;
        return userSettingsState.getVisibleGroupsForUser(uiState.currentUserId, categoryState.groupNames);
    }, [uiState.currentUserId, categoryState.groupNames, userSettingsState]);

    const groupColors = useMemo(() => {
        if (!uiState.currentUserId) return {};
        return userSettingsState.getGroupColorsForUser(uiState.currentUserId);
    }, [uiState.currentUserId, userSettingsState]);

    const syncStateRef = useRef(syncState);
    useEffect(() => { syncStateRef.current = syncState; });
    const suppressAutoSyncRef = useRef(false);
    useEffect(() => {
      if (syncState.syncStatus !== 'syncing' && syncState.syncStatus !== 'loading') {
        suppressAutoSyncRef.current = true;
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
            
            keysToClear.forEach(key => window.localStorage.removeItem(`${prefix}${key}`));

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
        isInitialSetupDone,
        setIsInitialSetupDone,
        deLocale,
        resetAppData,
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
}> = (props) => {
    const { children, ...rest } = props;

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
            uiState={uiState}
            usersState={usersState}
        >
            {children}
        </ReadyAppProvider>
    );
};

// The main provider now only manages the top-level mode switch.
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isInitialSetupDone, setIsInitialSetupDone] = useLocalStorage<boolean>('initialSetupDone', false);
    const isDemoModeEnabled = !isInitialSetupDone;

    return (
        <AppStateContainer
            key={isDemoModeEnabled ? 'demo' : 'prod'}
            isDemoModeEnabled={isDemoModeEnabled}
            isInitialSetupDone={isInitialSetupDone}
            setIsInitialSetupDone={setIsInitialSetupDone}
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