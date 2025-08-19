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
import type { User, Category, Group, RecurringTransaction, Transaction, Tag, UserSetting, TransactionGroup, Recipe } from '@/shared/types';
import { FIXED_COSTS_GROUP_ID, DEFAULT_CATEGORY_ID } from '@/constants';
import { isWithinInterval, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import type { Locale } from 'date-fns';
import { de } from 'date-fns/locale';
import { Loader2 } from '@/shared/ui';
import { apiGet, apiPost } from '@/shared/lib/http';
import { FirstUserSetup } from '@/features/onboarding';
import debounce from 'lodash.debounce';
import { generateUUID } from '@/shared/utils/uuid';
import { getMonthlyEquivalent } from '@/shared/utils/transactionUtils';

// --- TYPE DEFINITIONS ---
export interface AnalyzeReceiptResult {
    amount: number;
    description: string;
    categoryId: string | null;
}

// Combine the return types of all hooks to define the shape of the context
type AppContextType = 
    Omit<ReturnType<typeof useTransactionData>, 'reassignUserForTransactions' | 'addMultipleTransactions'> &
    Omit<ReturnType<typeof useUI>, 'openSettings' | 'setRecipes'> &
    Omit<ReturnType<typeof useUsers>, 'addUser' | 'isLoading' | 'updateUser' | 'deleteUser'> &
    Omit<ReturnType<typeof useUserSettings>, 'setQuickAddHideGroups' | 'updateGroupColor' | 'updateCategoryColorOverride' | 'updateVisibleGroups' | 'setIsAiEnabled'> &
    Omit<ReturnType<typeof useCategories>, 'upsertCategory' | 'upsertMultipleCategories' | 'deleteCategory' | 'addGroup' | 'renameGroup' | 'updateGroup' | 'deleteGroup' | 'reorderGroups' | 'reorderCategories'> &
    ReturnType<typeof useCategoryPreferences> &
    { currentUser: User | null } &
    ReturnType<typeof useSync> &
    { 
        // Wrapped functions for global persistence
        addUser: (name: string, color?: string) => User;
        updateUser: (id: string, updates: Partial<Omit<User, 'id' | 'version' | 'lastModified'>>) => void;
        deleteUser: (id: string, options?: { silent?: boolean }) => void;
        upsertCategory: (categoryData: Partial<Category> & { id: string; }) => void;
        upsertMultipleCategories: (categoriesData: (Partial<Category> & { id: string; })[]) => void;
        deleteCategory: (id: string) => void;
        addGroup: (groupName: string) => void;
        renameGroup: (id: string, newName: string) => void;
        updateGroup: (id: string, updates: Partial<Omit<Group, 'id'>>) => void;
        deleteGroup: (id: string) => void;
        reorderGroups: (orderedGroups: Group[]) => void;
        reorderCategories: (orderedCategories: Category[]) => void;
        updateGroupColor: (userId: string, groupName: string, color: string) => void;
        updateCategoryColorOverride: (userId: string, categoryId: string, color: string | null) => void;
        updateVisibleGroups: (userId: string, groups: string[]) => void;
        openSettings: (tab?: 'general' | 'categories' | 'users' | 'budget' | undefined) => void;
        addMultipleTransactions: (transactionsToCreate: Array<{amount: number, description: string}>, totalAmount: number, commonData: { categoryId: string, tags?: string[] }) => void;
        createTransactionGroup: (transactionIds: string[], sourceTransactionId: string) => void;
        updateGroupedTransaction: (options: { transactionId: string, newAmount?: number, resetCorrection?: boolean }) => void;
        removeTransactionFromGroup: (transactionId: string) => void;
        addTransactionsToGroup: (groupId: string, transactionIds: string[]) => void;
        setIsAiEnabled: (enabled: boolean) => void;
        analyzeReceipt: (base64Image: string) => Promise<AnalyzeReceiptResult | null>;
        mergeTransactionWithTarget: (sourceTxId: string, targetTxId: string) => void;
        updateGroupVerifiedStatus: (groupId: string, verified: boolean) => void;
        addRecipe: (recipe: Recipe) => void;
        updateRecipe: (recipe: Recipe) => void;
        deleteRecipe: (recipeId: string) => void;


        reassignUserForTransactions: (sourceUserId: string, targetUserId: string, onlyNonDemo?: boolean) => void;
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
        showDemoData: boolean;
        setShowDemoData: (value: boolean | ((prev: boolean) => boolean)) => void;
        isAiEnabled: boolean;
        recipeMap: Map<string, Recipe>;
    };

const AppContext = createContext<AppContextType | null>(null);

// This component holds the actual app state, and is only rendered when the core state is stable.
const ReadyAppProvider: React.FC<{
    children: React.ReactNode;
    isDemoModeEnabled: boolean;
    isInitialSetupDone: boolean;
    setIsInitialSetupDone: React.Dispatch<React.SetStateAction<boolean>>;
    uiState: ReturnType<typeof useUI>;
    usersState: Omit<ReturnType<typeof useUsers>, 'isLoading'>;
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

    // --- USER-SPECIFIC `showDemoData` STATE ---
    // This logic replaces the appMode-based useLocalStorage hook.
    // It's managed with useState + useEffect to react to user changes.
    const [showDemoData, setShowDemoDataInternal] = useState(() => {
        if (!uiState.currentUserId) return false;
        const item = window.localStorage.getItem(`${uiState.currentUserId}_showDemoData`);
        // Default to true for the specific demo user, otherwise false for new/real users.
        return item ? JSON.parse(item) : uiState.currentUserId === 'usr_demo';
    });

    // Update state from localStorage when the user changes.
    useEffect(() => {
        if (!uiState.currentUserId) return;
        const item = window.localStorage.getItem(`${uiState.currentUserId}_showDemoData`);
        setShowDemoDataInternal(item ? JSON.parse(item) : uiState.currentUserId === 'usr_demo');
    }, [uiState.currentUserId]);

    // Create a stable setter function that also writes to localStorage.
    const setShowDemoData = useCallback((valueOrFn: boolean | ((prev: boolean) => boolean)) => {
        if (!uiState.currentUserId) return;
        
        setShowDemoDataInternal(prev => {
            const newValue = typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn;
            window.localStorage.setItem(`${uiState.currentUserId}_showDemoData`, JSON.stringify(newValue));
            return newValue;
        });
    }, [uiState.currentUserId]);


    // This effect transitions the app from demo mode to production mode.
    useEffect(() => {
        if (!isInitialSetupDone) {
            const hasRealUsers = usersState.users.some(u => !u.isDemo);
            if(hasRealUsers) {
                setIsInitialSetupDone(true);
            }
        }
    }, [usersState.users, isInitialSetupDone, setIsInitialSetupDone]);

    // Now that uiState and usersState are stable, initialize the rest of the app's state.
    const userSettingsState = useUserSettings();
    
    const hiddenCategoryIds = useMemo(() => 
        uiState.currentUserId ? userSettingsState.getHiddenCategoryIds(uiState.currentUserId) : [],
    [userSettingsState, uiState.currentUserId]);

    const categoryState = useCategories({
        currentUserId: uiState.currentUserId,
        isDemoModeEnabled: isDemoModeEnabled,
        hiddenCategoryIds: hiddenCategoryIds,
        hideCategory: (catId) => uiState.currentUserId && userSettingsState.hideCategory(uiState.currentUserId, catId),
        unhideCategory: (catId) => uiState.currentUserId && userSettingsState.unhideCategory(uiState.currentUserId, catId),
        clearHiddenCategories: () => uiState.currentUserId && userSettingsState.clearHiddenCategories(uiState.currentUserId),
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
    
    // --- Create final categoryMap with user group AND category color overrides ---
    const finalCategoryMap = useMemo(() => {
        const newMap = new Map<string, Category>();
        if (!uiState.currentUserId) return categoryState.categoryMap;
        
        const customCategoryColors = userSettingsState.getCategoryColorOverrides(uiState.currentUserId);
        
        categoryState.categoryMap.forEach((category, id) => {
            let finalColor = category.color;

            // HIERARCHY 1: User-specific category color override (highest priority)
            if (customCategoryColors[id]) {
                finalColor = customCategoryColors[id];
            } else {
                // HIERARCHY 2 & 3: Inherited color from a user-specific group color override
                const group = finalGroupMap.get(category.groupId);
                const originalGroupColor = categoryState.groupMap.get(category.groupId)?.color;
                if (group && category.color === originalGroupColor) {
                    finalColor = group.color as string;
                }
            }

            newMap.set(id, { ...category, color: finalColor });
        });
        return newMap;
    }, [categoryState.categoryMap, userSettingsState, uiState.currentUserId, finalGroupMap, categoryState.groupMap]);


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
        showDemoData: showDemoData,
        flexibleCategories: categoryState.flexibleCategories,
    });
    
    // --- Orphaned Transaction Cleanup ---
    // This effect ensures that if a category is deleted (e.g., via sync from another user),
    // any transactions assigned to it are moved to the default category.
    // This prevents UI flickering and maintains data integrity.
    useEffect(() => {
        const transactionsToReassign = transactionDataState.rawTransactions
            .filter(tx => !tx.isDeleted && !categoryState.categoryMap.has(tx.categoryId) && tx.categoryId !== DEFAULT_CATEGORY_ID);
    
        if (transactionsToReassign.length > 0) {
            console.warn(`[Orphan Cleanup] Found ${transactionsToReassign.length} transactions to reassign.`);
            const now = new Date().toISOString();
            
            const updatedTransactions = transactionDataState.rawTransactions.map(t => {
                if (!t.isDeleted && !categoryState.categoryMap.has(t.categoryId) && t.categoryId !== DEFAULT_CATEGORY_ID) {
                    return {
                        ...t,
                        categoryId: DEFAULT_CATEGORY_ID,
                        lastModified: now,
                        version: (t.version || 0) + 1,
                    };
                }
                return t;
            });
            
            transactionDataState.setTransactions(updatedTransactions);
            toast(`${transactionsToReassign.length} Transaktion(en) wurde(n) neu zugeordnet, da die ursprüngliche Kategorie gelöscht wurde.`, { duration: 5000 });
        }
    }, [transactionDataState.rawTransactions, categoryState.categoryMap, transactionDataState.setTransactions]);


    const enrichedTransactions = useMemo(() => {
        return transactionDataState.transactions.map(tx => {
            if (finalCategoryMap.has(tx.categoryId)) {
                return tx;
            }
            // This might log briefly before the cleanup effect runs, which is acceptable.
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
            .reduce((sum, rt) => sum + getMonthlyEquivalent(rt), 0);
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
    
    const isAiEnabled = useMemo(() => {
        if (!uiState.currentUserId) return false;
        return userSettingsState.getIsAiEnabled(uiState.currentUserId);
    }, [uiState.currentUserId, userSettingsState]);

    const syncState = useSync({
        rawCategories: categoryState.rawCategories,
        rawGroups: categoryState.rawGroups,
        rawTransactions: transactionDataState.rawTransactions,
        rawRecurringTransactions: transactionDataState.rawRecurringTransactions,
        rawAllAvailableTags: transactionDataState.rawAllAvailableTags,
        rawUsers: usersState.rawUsers,
        rawUserSettings: userSettingsState.rawUserSettings,
        rawTransactionGroups: transactionDataState.rawTransactionGroups,
        rawRecipes: uiState.recipes,
        setCategoriesAndGroups: categoryState.setCategoriesAndGroups,
        setTransactions: transactionDataState.setTransactions,
        setRecurringTransactions: transactionDataState.setRecurringTransactions,
        setAllAvailableTags: transactionDataState.setAllAvailableTags,
        setUsers: usersState.setUsers,
        setUserSettings: userSettingsState.setUserSettings,
        setTransactionGroups: transactionDataState.setTransactionGroups,
        setRecipes: uiState.setRecipes,
        isInitialSetupDone: isInitialSetupDone,
        isDemoModeEnabled,
        setIsInitialSetupDone: setIsInitialSetupDone,
        currentUserId: uiState.currentUserId,
        appMode,
        openUserMergeModal: uiState.openUserMergeModal,
    });
    
    const { syncStatus, syncError } = syncState;
    useEffect(() => {
        if (syncStatus === 'syncing') {
            toast.loading('Synchronisiere Daten...', { id: 'sync-toast' });
        } else if (syncStatus === 'loading') {
            toast.loading('Lade Daten vom Server...', { id: 'sync-toast' });
        } else if (syncStatus === 'success') {
            toast.success('Synchronisierung erfolgreich!', { id: 'sync-toast' });
        } else if (syncStatus === 'error' && syncError) {
            toast.error(`Fehler: ${syncError}`, { id: 'sync-toast' });
        } else if (syncStatus === 'conflict') {
            toast.error('Konflikt! Daten wurden zusammengeführt.', { id: 'sync-toast', duration: 5000 });
        }
    }, [syncStatus, syncError]);


    const currentUser = useMemo(() => {
        if (!uiState.currentUserId) return null;
        return usersState.users.find(u => u.id === uiState.currentUserId) || null;
    }, [usersState.users, uiState.currentUserId]);

    const syncStateRef = useRef(syncState);
    useEffect(() => { syncStateRef.current = syncState; });
    
    // --- Immediate & Debounced Sync ---
    const debouncedSync = useMemo(() => debounce((options: { isAuto?: boolean } = {}) => {
        const { isAutoSyncEnabled, syncStatus: currentSyncStatus, syncData } = syncStateRef.current;
        if (options.isAuto) {
            // Auto-sync from useEffect respects the setting
            if (isAutoSyncEnabled && (currentSyncStatus === 'idle' || currentSyncStatus === 'error')) {
                syncData({ isAuto: true });
            }
        } else {
            // Manual trigger or wrapper-triggered syncs ignore the setting
            if (currentSyncStatus !== 'syncing' && currentSyncStatus !== 'loading') {
                syncData(options);
            }
        }
    }, 2000), []);
    
    // Auto-sync on data changes (respects user setting)
    const isInitialMount = useRef(true);
    const isSyncingData = useRef(false);

    useEffect(() => {
        isSyncingData.current = syncStatus === 'syncing' || syncStatus === 'loading';
    }, [syncStatus]);
    
    useEffect(() => {
        if (isInitialMount.current) { isInitialMount.current = false; return; }
        // Prevent sync from re-triggering itself after updating state
        if (isSyncingData.current) return;
        
        debouncedSync({ isAuto: true });
    }, [
        categoryState.rawCategories,
        categoryState.rawGroups,
        transactionDataState.rawTransactions, 
        transactionDataState.rawRecurringTransactions, 
        transactionDataState.rawAllAvailableTags,
        transactionDataState.rawTransactionGroups,
        usersState.rawUsers,
        userSettingsState.rawUserSettings,
        uiState.recipes, // Sync recipes too
    ]);

    // --- Global Persistence Wrappers ---
    // These functions wrap state dispatchers and trigger a debounced sync.
    const createPersistentWrapper = (action: (...args: any[]) => any) => {
        return (...args: any[]) => {
            const result = action(...args);
            // Trigger a debounced sync. This will fall into the "manual"
            // part of the debouncedSync logic, which syncs regardless of the
            // auto-sync setting. This ensures user actions are saved.
            debouncedSync();
            return result;
        };
    };
    
    const recipeMap = useMemo(() => new Map(uiState.recipes.filter(r => !r.isDeleted).map(r => [r.id, r])), [uiState.recipes]);

    const persistentActions = useMemo(() => ({
        // from useCategories
        upsertCategory: createPersistentWrapper(categoryState.upsertCategory),
        upsertMultipleCategories: createPersistentWrapper(categoryState.upsertMultipleCategories),
        deleteCategory: createPersistentWrapper(categoryState.deleteCategory),
        addGroup: createPersistentWrapper(categoryState.addGroup),
        renameGroup: createPersistentWrapper(categoryState.renameGroup),
        updateGroup: createPersistentWrapper(categoryState.updateGroup),
        deleteGroup: createPersistentWrapper(categoryState.deleteGroup),
        reorderGroups: createPersistentWrapper(categoryState.reorderGroups),
        reorderCategories: createPersistentWrapper(categoryState.reorderCategories),
        
        // from useUserSettings
        updateGroupColor: createPersistentWrapper(userSettingsState.updateGroupColor),
        updateCategoryColorOverride: createPersistentWrapper(userSettingsState.updateCategoryColorOverride),
        updateVisibleGroups: createPersistentWrapper(userSettingsState.updateVisibleGroups),
        setQuickAddHideGroups: createPersistentWrapper(userSettingsState.setQuickAddHideGroups),
        setIsAiEnabled: createPersistentWrapper(userSettingsState.setIsAiEnabled),

        // from useUsers
        addUser: createPersistentWrapper(usersState.addUser),
        updateUser: createPersistentWrapper(usersState.updateUser),
        deleteUser: createPersistentWrapper(usersState.deleteUser),
        
        // from useTransactionData
        createTransactionGroup: createPersistentWrapper(transactionDataState.createTransactionGroup),
        updateGroupedTransaction: createPersistentWrapper(transactionDataState.updateGroupedTransaction),
        removeTransactionFromGroup: createPersistentWrapper(transactionDataState.removeTransactionFromGroup),
        addMultipleTransactions: createPersistentWrapper(transactionDataState.addMultipleTransactions),
        addTransactionsToGroup: createPersistentWrapper(transactionDataState.addTransactionsToGroup),
        mergeTransactionWithTarget: createPersistentWrapper(transactionDataState.mergeTransactionWithTarget),
        updateGroupVerifiedStatus: createPersistentWrapper(transactionDataState.updateGroupVerifiedStatus),
        addRecurringTransaction: createPersistentWrapper(transactionDataState.addRecurringTransaction),
        updateRecurringTransaction: createPersistentWrapper(transactionDataState.updateRecurringTransaction),
        
        // From useUI (for recipes)
        addRecipe: createPersistentWrapper((recipe: Recipe) => uiState.setRecipes(prev => [...prev, recipe])),
        updateRecipe: createPersistentWrapper((recipe: Recipe) => uiState.setRecipes(prev => prev.map(r => r.id === recipe.id ? recipe : r))),
        deleteRecipe: createPersistentWrapper((recipeId: string) => {
            const now = new Date().toISOString();
            uiState.setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, isDeleted: true, lastModified: now, version: (r.version || 0) + 1 } : r));
        }),


    }), [categoryState, userSettingsState, usersState, transactionDataState, uiState.setRecipes, debouncedSync]);

    const setQuickAddHideGroupsForCurrentUser = useCallback((hide: boolean) => {
        if (uiState.currentUserId) {
            persistentActions.setQuickAddHideGroups(uiState.currentUserId, hide);
        }
    }, [uiState.currentUserId, persistentActions]);

    const setIsAiEnabledForCurrentUser = useCallback((enabled: boolean) => {
        if (!uiState.currentUserId) return;
    
        // Immediately update the state for a responsive UI
        persistentActions.setIsAiEnabled(uiState.currentUserId, enabled);
    
        if (enabled) {
            // Asynchronously request camera permission without blocking the UI update
            const requestPermission = async () => {
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                        // Immediately stop the stream once permission is granted to turn off camera light
                        stream.getTracks().forEach(track => track.stop());
                    } catch (err) {
                        console.error("Camera permission request failed:", err);
                        toast.error("Kamerazugriff wurde nicht erteilt. Scannen ist nicht möglich.");
                        // The feature remains enabled as file upload is still possible.
                    }
                } else {
                    toast.error("Dein Browser unterstützt den Kamerazugriff nicht.");
                }
            };
            requestPermission(); // Fire-and-forget
        }
    }, [uiState.currentUserId, persistentActions]);


    const isInitialSetupDoneRef = useRef(isInitialSetupDone);
    useEffect(() => {
        isInitialSetupDoneRef.current = isInitialSetupDone;
    }, [isInitialSetupDone]);


    const resetAppData = useCallback(() => {
        const mode = isDemoModeEnabled ? 'Demo' : 'Produktiv';
        if (window.confirm(`Möchten Sie wirklich alle Daten für den ${mode}-Modus unwiderruflich löschen?`)) {
            const prefix = isDemoModeEnabled ? 'demo_' : '';
            const keysToClear = [
                'transactions', 'allAvailableTags', 'recurringTransactions', 'transactionGroups',
                'users', 'userSettings', 'app-current-user-id', 'transactionViewMode',
                'lastSyncTimestamp', 'autoSyncEnabled', 'categories', 'groups', 'recipes'
            ];
            
            // Also clear favorites and recents for all users under the current mode
            usersState.users.forEach(user => {
                keysToClear.push(`${user.id}_favorite_categories`);
                keysToClear.push(`${user.id}_recent_categories`);
                keysToClear.push(`${user.id}_quickAddHideGroups`); // Clear the new setting too
                keysToClear.push(`${user.id}_showDemoData`); // Clear demo data visibility setting
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
    
        // 2. "Delete" the category (soft delete for custom, hide for standard)
        persistentActions.deleteCategory(sourceCategoryId);
    
        // 3. Clean up preferences
        categoryPreferencesState.removeCategoryFromPreferences(sourceCategoryId);
        
        if (sourceCategoryName) {
            toast.success(`Kategorie "${sourceCategoryName}" gelöscht und Transaktionen neu zugeordnet.`);
        }
    
        uiState.closeReassignModal();
    
    }, [
        transactionDataState.reassignCategoryForTransactions, 
        persistentActions, 
        categoryState.categoryMap,
        categoryPreferencesState.removeCategoryFromPreferences, 
        uiState.closeReassignModal
    ]);
    
    // --- Auto-create recurring transactions for fixed cost categories ---
    useEffect(() => {
        const recurringCatIds = new Set(transactionDataState.rawRecurringTransactions.map(rt => rt.categoryId));
        const missingRecurrings: Omit<RecurringTransaction, 'id' | 'lastModified' | 'version'>[] = [];

        categoryState.fixedCategories.forEach(cat => {
            if (!recurringCatIds.has(cat.id)) {
                missingRecurrings.push({
                    amount: cat.budget || 0,
                    description: cat.name,
                    categoryId: cat.id,
                    frequency: 'monthly',
                    dayOfMonth: 1,
                    startDate: new Date().toISOString(),
                    active: true,
                    notes: '',
                });
            }
        });
        
        if (missingRecurrings.length > 0) {
            const now = new Date().toISOString();
            const newRecs = missingRecurrings.map(rec => ({
                ...rec,
                id: generateUUID('rec'),
                lastModified: now,
                version: 1,
            } as RecurringTransaction));
            
            // This is not a persistent action, so the sync will be triggered
            // by the main data-watching useEffect.
            transactionDataState.setRecurringTransactions([...transactionDataState.rawRecurringTransactions, ...newRecs]);
        }
    }, [categoryState.fixedCategories, transactionDataState.rawRecurringTransactions, transactionDataState.setRecurringTransactions]);


    // --- AI Functionality ---
    const analyzeReceipt = useCallback(async (base64Image: string): Promise<AnalyzeReceiptResult | null> => {
        const toastId = toast.loading('Beleg wird analysiert...');
        try {
            // Kategorienamen an den Server geben, damit das Modell nur daraus wählt
            const categories = categoryState.flexibleCategories.map(c => c.name);

            // Serverroute ruft Gemini auf und gibt { amount, description, category } zurück
            const res = await apiPost('/api/ai/analyze-receipt', { base64Image, categories });
            if ((res as any)?.error) {
                throw new Error((res as any).error);
            }

            const { amount, description, category } = res as { amount: number; description: string; category: string };


            // Category-Name -> ID mappen
            let categoryId: string | null = null;
            if (category) {
                const lc = category.toLowerCase();
                const found = categoryState.flexibleCategories.find(c => c.name.toLowerCase() === lc);
                categoryId = found ? found.id : null;
            }

            toast.success('Analyse erfolgreich!', { id: toastId });
            return {
                amount: amount || 0,
                description: description || 'Unbekannter Beleg',
                categoryId,
            };
                } catch (error: any) {
                    console.error('Fehler bei der Beleg-Analyse (Gemini):', error);
                    toast.error(`Analyse fehlgeschlagen. ${error?.message ?? ''}`.trim(), { id: toastId });
                    return null;
                }
            }, [categoryState.flexibleCategories]);


    const { openSettings: _, setRecipes: __, ...restUiState } = uiState;
    const { setQuickAddHideGroups: ___, setIsAiEnabled: ____, ...restUserSettingsState } = userSettingsState;
    const { addUser: _____, updateUser: ______, deleteUser: _______, ...restUsersState } = usersState;
    const { reassignUserForTransactions: ________, addMultipleTransactions: _________, mergeTransactionWithTarget: __________, updateGroupVerifiedStatus: ___________, ...restTxState } = transactionDataState;
    const { upsertCategory: __1, upsertMultipleCategories: __2, deleteCategory: __3, addGroup: __4, renameGroup: __5, updateGroup: __6, deleteGroup: __7, reorderGroups: __8, reorderCategories: __9, ...restCategoryState} = categoryState;


    const value: AppContextType = {
        ...restUiState,
        openSettings: uiState.openSettings,
        ...restCategoryState,
        groups: finalGroups, // Use the color-overridden groups
        groupMap: finalGroupMap,
        groupNames: finalGroupNames,
        categoryMap: finalCategoryMap,
        ...categoryPreferencesState,
        totalMonthlyBudget,
        ...restTxState,
        transactions: enrichedTransactions,
        totalSpentThisMonth,
        totalMonthlyFixedCosts,
        ...restUsersState,
        ...restUserSettingsState,
        ...persistentActions,
        currentUser,
        deleteMultipleTransactions: transactionDataState.deleteMultipleTransactions,
        selectTotalSpentForMonth: transactionDataState.selectTotalSpentForMonth,
        ...syncState,
        isDemoModeEnabled,
        isInitialSetupDone,
        setIsInitialSetupDone,
        deLocale,
        resetAppData,
        visibleCategoryGroups,
        handleReassignAndDeleteCategory,
        reassignUserForTransactions: transactionDataState.reassignUserForTransactions,
        quickAddHideGroups,
        setQuickAddHideGroups: setQuickAddHideGroupsForCurrentUser,
        showDemoData,
        setShowDemoData,
        isAiEnabled,
        setIsAiEnabled: setIsAiEnabledForCurrentUser,
        analyzeReceipt,
        recipeMap,
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
    
    if (usersState.isLoading) {
        // Display a loading screen while the user state stabilizes.
        // This prevents downstream hooks from running with invalid state.
        return (
            <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
        );
    }
    
    // Once users are loaded, check if we need to show the initial setup screen.
    if (!props.isDemoModeEnabled && usersState.users.length === 0) {
        // We need to provide a limited context for the setup screen to function.
        const limitedContextValue = {
            addUser: usersState.addUser,
            setCurrentUserId: uiState.setCurrentUserId,
            setIsInitialSetupDone: rest.setIsInitialSetupDone,
            syncData: () => Promise.resolve(), // No-op sync initially
        };
        // This feels a bit like a hack. It's better to provide the full context.
        // The ReadyAppProvider will initialize everything. 
        // We can pass a flag to it or just render a different component here.
         return (
             <ReadyAppProvider
                {...rest}
                appMode={appMode}
                uiState={uiState}
                usersState={usersState}
            >
                <FirstUserSetup />
            </ReadyAppProvider>
        );
    }

    // This effect ensures we have a valid user selected before proceeding.
    if (usersState.users.length > 0) {
        const currentUserIsValid = uiState.currentUserId && usersState.users.some(u => u.id === uiState.currentUserId);
        if (!currentUserIsValid) {
            // If current user is not set or is invalid, set it to the first available user.
            // This triggers a re-render.
            uiState.setCurrentUserId(usersState.users[0].id);
            // Return loading screen for one frame to prevent rendering with invalid userId
            return (
                 <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                </div>
            );
        }
    }
    
    // Once ready, render the full provider with the now-stable state.
    const { isLoading: _isLoading, ...restUsersState } = usersState;
    return (
        <ReadyAppProvider
            {...rest}
            appMode={appMode}
            uiState={uiState}
            usersState={restUsersState}
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