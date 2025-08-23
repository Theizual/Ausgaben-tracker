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
import type { User, Category, Group, RecurringTransaction, Transaction, Tag, UserSetting, TransactionGroup, Recipe, WeeklyPlan, ShoppingListState } from '@/shared/types';
import { DEFAULT_CATEGORY_ID } from '@/constants';
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

type UIContextType = Omit<ReturnType<typeof useUI>, 'setCurrentUserId' | 'openSettings'> & {
    openSettings: (tab?: 'general' | 'categories' | 'users' | 'budget' | 'tags' | undefined) => void;
    deLocale: Locale;
    isGroupDnDEnabled: boolean;
    setIsGroupDnDEnabled: React.Dispatch<React.SetStateAction<boolean>>;
};
type UserContextType = Omit<ReturnType<typeof useUsers>, 'setUsers' | 'isLoading'> & 
    Omit<ReturnType<typeof useUserSettings>, 'setQuickAddShowFavorites' | 'setQuickAddShowRecents' | 'setIsAiEnabled' | 'setIsMealPlanEnabled'> & 
    ReturnType<typeof useCategoryPreferences> & {
    currentUser: User | null;
    currentUserId: string | null;
    setCurrentUserId: (id: string | null) => void;
    isDemoModeEnabled: boolean;
    showDemoData: boolean;
    setShowDemoData: (value: boolean | ((prev: boolean) => boolean)) => void;
    quickAddShowFavorites: boolean;
    quickAddShowRecents: boolean;
    isAiEnabled: boolean;
    isMealPlanEnabled: boolean;
    setQuickAddShowFavorites: (show: boolean) => void;
    setQuickAddShowRecents: (show: boolean) => void;
    setIsAiEnabled: (enabled: boolean) => void;
    setIsMealPlanEnabled: (enabled: boolean) => void;
};
type TaxonomyContextType = Omit<ReturnType<typeof useCategories>, 'setCategoriesAndGroups'> & {
    handleReassignAndDeleteCategory: (sourceCategoryId: string, targetCategoryId: string) => void;
    visibleCategoryGroups: string[];
};
type DataContextType = Omit<ReturnType<typeof useTransactionData>, 'setTransactions' | 'setAllAvailableTags' | 'setRecurringTransactions' | 'setTransactionGroups'> & {
    analyzeReceipt: (base64Image: string) => Promise<AnalyzeReceiptResult | null>;
    addRecipe: (recipe: Recipe) => void;
    updateRecipe: (recipe: Recipe) => void;
    deleteRecipe: (recipeId: string) => void;
    totalMonthlyBudget: number;
    totalSpentThisMonth: number;
    totalMonthlyFixedCosts: number;
    handleReassignAndDeleteTag: (sourceTagId: string, newTagNames: string[]) => void;
    recipeMap: Map<string, Recipe>;
    addTransactionToGroup: (groupId: string, newTxData: { description: string; amount: number }) => void;
    updateGroupTargetAmount: (groupId: string, newTargetAmount: number) => void;
};
type SyncContextType = Omit<ReturnType<typeof useSync>, 'isSyncing'> & {
    resetAppData: () => void;
};

// --- CONTEXT CREATION ---
const UIContext = createContext<UIContextType | null>(null);
const UserContext = createContext<UserContextType | null>(null);
const TaxonomyContext = createContext<TaxonomyContextType | null>(null);
const DataContext = createContext<DataContextType | null>(null);
const SyncContext = createContext<SyncContextType | null>(null);


// --- PROVIDERS ---

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
    const deLocale = de;
    const [isGroupDnDEnabled, setIsGroupDnDEnabled] = useLocalStorage<boolean>('settings-groupDnDEnabled', false);

    const [showDemoData, setShowDemoDataInternal] = useState(() => {
        if (!uiState.currentUserId) return false;
        const item = window.localStorage.getItem(`${uiState.currentUserId}_showDemoData`);
        return item ? JSON.parse(item) : uiState.currentUserId === 'usr_demo';
    });

    useEffect(() => {
        if (!uiState.currentUserId) return;
        const item = window.localStorage.getItem(`${uiState.currentUserId}_showDemoData`);
        setShowDemoDataInternal(item ? JSON.parse(item) : uiState.currentUserId === 'usr_demo');
    }, [uiState.currentUserId]);

    const setShowDemoData = useCallback((valueOrFn: boolean | ((prev: boolean) => boolean)) => {
        if (!uiState.currentUserId) return;
        setShowDemoDataInternal(prev => {
            const newValue = typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn;
            window.localStorage.setItem(`${uiState.currentUserId}_showDemoData`, JSON.stringify(newValue));
            return newValue;
        });
    }, [uiState.currentUserId]);

    useEffect(() => {
        if (!isInitialSetupDone) {
            const hasRealUsers = usersState.users.some(u => !u.isDemo);
            if(hasRealUsers) setIsInitialSetupDone(true);
        }
    }, [usersState.users, isInitialSetupDone, setIsInitialSetupDone]);

    // --- HOOKS INITIALIZATION (DEPENDENCY ORDER: User -> Taxonomy -> Data) ---

    // 1. User-related hooks
    const userSettingsState = useUserSettings();
    const categoryPreferencesState = useCategoryPreferences({ userId: uiState.currentUserId, isDemoModeEnabled });
    const currentUser = useMemo(() => uiState.currentUserId ? usersState.users.find(u => u.id === uiState.currentUserId) || null : null, [usersState.users, uiState.currentUserId]);

    // 2. Taxonomy-related hooks (depends on user settings)
    const hiddenCategoryIds = useMemo(() => uiState.currentUserId ? userSettingsState.getHiddenCategoryIds(uiState.currentUserId) : [], [userSettingsState, uiState.currentUserId]);
    const categoryState = useCategories({
        currentUserId: uiState.currentUserId,
        isDemoModeEnabled: isDemoModeEnabled,
        hiddenCategoryIds: hiddenCategoryIds,
        hideCategory: (catId) => uiState.currentUserId && userSettingsState.hideCategory(uiState.currentUserId, catId),
        unhideCategory: (catId) => uiState.currentUserId && userSettingsState.unhideCategory(uiState.currentUserId, catId),
        clearHiddenCategories: () => uiState.currentUserId && userSettingsState.clearHiddenCategories(uiState.currentUserId),
    });

    // 3. Data-related hooks (depends on taxonomy and user preferences)
    const transactionDataState = useTransactionData({
        showConfirmation: uiState.showConfirmation,
        closeTransactionDetail: uiState.closeTransactionDetail,
        currentUserId: uiState.currentUserId,
        isDemoModeEnabled: isDemoModeEnabled,
        addRecentCategory: categoryPreferencesState.addRecent,
        showDemoData: showDemoData,
        flexibleCategories: categoryState.flexibleCategories,
    });

    const recipeMap = useMemo(() => {
        const map = new Map<string, Recipe>();
        (uiState.recipes || []).filter(r => !r.isDeleted).forEach(r => map.set(r.id, r));
        return map;
    }, [uiState.recipes]);
    
    // --- DERIVED STATE & COMPOSITION ---

    const finalGroups = useMemo(() => {
        if (!uiState.currentUserId) return categoryState.groups;
        const customColors = userSettingsState.getGroupColorsForUser(uiState.currentUserId);
        return categoryState.groups.map(group => ({ ...group, color: customColors[group.name] || group.color }));
    }, [categoryState.groups, userSettingsState, uiState.currentUserId]);
    const finalGroupMap = useMemo(() => new Map(finalGroups.map(g => [g.id, g])), [finalGroups]);

    const finalCategoryMap = useMemo(() => {
        const newMap = new Map<string, Category>();
        if (!uiState.currentUserId) return categoryState.categoryMap;
        const customCategoryColors = userSettingsState.getCategoryColorOverrides(uiState.currentUserId);
        categoryState.categoryMap.forEach((category, id) => {
            let finalColor = category.color;
            if (customCategoryColors[id]) {
                finalColor = customCategoryColors[id];
            } else {
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

    const enrichedTransactions = useMemo(() => {
        return transactionDataState.transactions.map(tx => 
            finalCategoryMap.has(tx.categoryId) ? tx : { ...tx, categoryId: DEFAULT_CATEGORY_ID }
        );
    }, [transactionDataState.transactions, finalCategoryMap]);

    const fixedCategoryIds = useMemo(() => new Set(categoryState.fixedCategories.map(c => c.id)), [categoryState.fixedCategories]);
    const totalMonthlyBudget = useMemo(() => categoryState.flexibleCategories.reduce((sum, cat) => sum + (cat.budget || 0), 0), [categoryState.flexibleCategories]);
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

    const rawWeeklyPlans = useMemo(() => Object.values(uiState.weeklyMealPlans || {}), [uiState.weeklyMealPlans]);
    const rawShoppingLists = useMemo(() => Object.values(uiState.shoppingLists || {}), [uiState.shoppingLists]);

    // --- SYNC & PERSISTENCE ---

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
        rawWeeklyPlans,
        rawShoppingLists,
        setCategoriesAndGroups: categoryState.setCategoriesAndGroups,
        setTransactions: transactionDataState.setTransactions,
        setRecurringTransactions: transactionDataState.setRecurringTransactions,
        setAllAvailableTags: transactionDataState.setAllAvailableTags,
        setUsers: usersState.setUsers,
        setUserSettings: userSettingsState.setUserSettings,
        setTransactionGroups: transactionDataState.setTransactionGroups,
        setRecipes: uiState.setRecipes,
        setWeeklyPlans: (plans: WeeklyPlan[]) => uiState.setWeeklyMealPlans(plans.reduce((acc, p) => ({...acc, [p.weekKey]: p}), {})),
        setShoppingLists: (lists: ShoppingListState[]) => uiState.setShoppingLists(lists.reduce((acc, l) => ({...acc, [l.weekKey]: l}), {})),
        isInitialSetupDone,
        isDemoModeEnabled,
        setIsInitialSetupDone,
        currentUserId: uiState.currentUserId,
        appMode,
        openUserMergeModal: uiState.openUserMergeModal,
    });
    
    useEffect(() => {
        if (syncState.syncStatus === 'syncing') toast.loading('Synchronisiere Daten...', { id: 'sync-toast' });
        else if (syncState.syncStatus === 'loading') toast.loading('Lade Daten...', { id: 'sync-toast' });
        else if (syncState.syncStatus === 'success') toast.success('Synchronisierung erfolgreich!', { id: 'sync-toast' });
        else if (syncState.syncStatus === 'error' && syncState.syncError) toast.error(`Fehler: ${syncState.syncError}`, { id: 'sync-toast' });
        else if (syncState.syncStatus === 'conflict') toast.error('Konflikt! Daten wurden zusammengeführt.', { id: 'sync-toast', duration: 5000 });
    }, [syncState.syncStatus, syncState.syncError]);

    const syncStateRef = useRef(syncState);
    useEffect(() => { syncStateRef.current = syncState; });
    
    const debouncedSync = useMemo(() => debounce((options: { isAuto?: boolean } = {}) => {
        const { isAutoSyncEnabled, syncStatus: currentSyncStatus, syncData } = syncStateRef.current;
        if (options.isAuto) {
            if (isAutoSyncEnabled && (currentSyncStatus === 'idle' || currentSyncStatus === 'error')) syncData({ isAuto: true });
        } else {
            if (currentSyncStatus !== 'syncing' && currentSyncStatus !== 'loading') syncData(options);
        }
    }, 2000), []);
    
    const isInitialMount = useRef(true);
    useEffect(() => {
        if (isInitialMount.current) { isInitialMount.current = false; return; }
        if (syncState.syncStatus === 'syncing' || syncState.syncStatus === 'loading') return;
        debouncedSync({ isAuto: true });
    }, [
        categoryState.rawCategories, categoryState.rawGroups, transactionDataState.rawTransactions, 
        transactionDataState.rawRecurringTransactions, transactionDataState.rawAllAvailableTags, transactionDataState.rawTransactionGroups,
        usersState.rawUsers, userSettingsState.rawUserSettings, uiState.recipes, rawWeeklyPlans, rawShoppingLists, debouncedSync, syncState.syncStatus
    ]);

    const createPersistentWrapper = (action: (...args: any[]) => any) => (...args: any[]) => {
        const result = action(...args);
        debouncedSync();
        return result;
    };
    
    // --- COMPOSED ACTIONS ---
    const handleReassignAndDeleteCategory = useCallback((sourceCategoryId: string, targetCategoryId: string) => {
        const sourceCategoryName = categoryState.categoryMap.get(sourceCategoryId)?.name;
        transactionDataState.reassignCategoryForTransactions(sourceCategoryId, targetCategoryId);
        categoryState.deleteCategory(sourceCategoryId);
        categoryPreferencesState.removeCategoryFromPreferences(sourceCategoryId);
        if (sourceCategoryName) toast.success(`Kategorie "${sourceCategoryName}" gelöscht & Transaktionen neu zugeordnet.`);
        uiState.closeReassignModal();
    }, [transactionDataState, categoryState, categoryPreferencesState, uiState]);
    
    const analyzeReceipt = useCallback(async (base64Image: string): Promise<AnalyzeReceiptResult | null> => {
        const toastId = toast.loading('Beleg wird analysiert...');
        try {
            const categories = categoryState.flexibleCategories.map(c => c.name);
            const res = await apiPost('/api/ai/analyze-receipt', { base64Image, categories });
            if ((res as any)?.error) throw new Error((res as any).error);

            const { amount, description, category } = res as { amount: number; description: string; category: string };
            let categoryId: string | null = category ? (categoryState.flexibleCategories.find(c => c.name.toLowerCase() === category.toLowerCase())?.id || null) : null;
            toast.success('Analyse erfolgreich!', { id: toastId });
            return { amount: amount || 0, description: description || 'Unbekannter Beleg', categoryId };
        } catch (error: any) {
            toast.error(`Analyse fehlgeschlagen. ${error?.message ?? ''}`.trim(), { id: toastId });
            return null;
        }
    }, [categoryState.flexibleCategories]);

    const resetAppData = useCallback(() => {
        const mode = isDemoModeEnabled ? 'Demo' : 'Produktiv';
        if (window.confirm(`Möchten Sie wirklich alle Daten für den ${mode}-Modus unwiderruflich löschen?`)) {
            const prefix = isDemoModeEnabled ? 'demo_' : '';
            const keysToClear = ['transactions', 'allAvailableTags', 'recurringTransactions', 'transactionGroups', 'users', 'userSettings', 'app-current-user-id', 'transactionViewMode', 'lastSyncTimestamp', 'autoSyncEnabled', 'categories', 'groups', 'recipes', 'settings-groupDnDEnabled'];
            usersState.users.forEach(user => { keysToClear.push(`${user.id}_favorite_categories`, `${user.id}_recent_categories`, `${user.id}_showDemoData`); });
            keysToClear.forEach(key => window.localStorage.removeItem(`${prefix}${key}`));
            window.localStorage.removeItem('settings-groupDnDEnabled');
            if (!isDemoModeEnabled) window.localStorage.removeItem('initialSetupDone');
            toast.success("Anwendungsdaten zurückgesetzt. App wird neu geladen.");
            setTimeout(() => window.location.reload(), 1500);
        }
    }, [isDemoModeEnabled, usersState.users]);

    // --- CONTEXT VALUE CREATION (MEMOIZED) ---
    const uiValue = useMemo<UIContextType>(() => ({ ...uiState, isGroupDnDEnabled, setIsGroupDnDEnabled, deLocale }), [uiState, isGroupDnDEnabled, setIsGroupDnDEnabled, deLocale]);
    
    const userValue = useMemo<UserContextType>(() => ({
        ...usersState, ...userSettingsState, ...categoryPreferencesState,
        currentUser, currentUserId: uiState.currentUserId, setCurrentUserId: uiState.setCurrentUserId, isDemoModeEnabled, showDemoData, setShowDemoData,
        addUser: createPersistentWrapper(usersState.addUser),
        updateUser: createPersistentWrapper(usersState.updateUser),
        deleteUser: createPersistentWrapper(usersState.deleteUser),
        updateGroupColor: createPersistentWrapper(userSettingsState.updateGroupColor),
        updateCategoryColorOverride: createPersistentWrapper(userSettingsState.updateCategoryColorOverride),
        updateVisibleGroups: createPersistentWrapper(userSettingsState.updateVisibleGroups),
        setQuickAddShowFavorites: (show) => uiState.currentUserId && createPersistentWrapper(userSettingsState.setQuickAddShowFavorites)(uiState.currentUserId, show),
        setQuickAddShowRecents: (show) => uiState.currentUserId && createPersistentWrapper(userSettingsState.setQuickAddShowRecents)(uiState.currentUserId, show),
        setIsAiEnabled: (enabled) => uiState.currentUserId && createPersistentWrapper(userSettingsState.setIsAiEnabled)(uiState.currentUserId, enabled),
        setIsMealPlanEnabled: (enabled) => uiState.currentUserId && createPersistentWrapper(userSettingsState.setIsMealPlanEnabled)(uiState.currentUserId, enabled),
        quickAddShowFavorites: uiState.currentUserId ? userSettingsState.getQuickAddShowFavorites(uiState.currentUserId) : true,
        quickAddShowRecents: uiState.currentUserId ? userSettingsState.getQuickAddShowRecents(uiState.currentUserId) : true,
        isAiEnabled: uiState.currentUserId ? userSettingsState.getIsAiEnabled(uiState.currentUserId) : false,
        isMealPlanEnabled: uiState.currentUserId ? userSettingsState.getIsMealPlanEnabled(uiState.currentUserId) : true,
    }), [usersState, userSettingsState, categoryPreferencesState, currentUser, uiState.currentUserId, uiState.setCurrentUserId, isDemoModeEnabled, showDemoData, setShowDemoData, createPersistentWrapper]);
    
    const taxonomyValue = useMemo<TaxonomyContextType>(() => ({
        ...categoryState,
        groups: finalGroups,
        groupMap: finalGroupMap,
        categoryMap: finalCategoryMap,
        upsertCategory: createPersistentWrapper(categoryState.upsertCategory),
        upsertMultipleCategories: createPersistentWrapper(categoryState.upsertMultipleCategories),
        deleteCategory: createPersistentWrapper(categoryState.deleteCategory),
        addGroup: createPersistentWrapper(categoryState.addGroup),
        renameGroup: createPersistentWrapper(categoryState.renameGroup),
        updateGroup: createPersistentWrapper(categoryState.updateGroup),
        deleteGroup: createPersistentWrapper(categoryState.deleteGroup),
        reorderGroups: createPersistentWrapper(categoryState.reorderGroups),
        reorderCategories: createPersistentWrapper(categoryState.reorderCategories),
        handleReassignAndDeleteCategory: createPersistentWrapper(handleReassignAndDeleteCategory),
        visibleCategoryGroups: uiState.currentUserId ? userSettingsState.getVisibleGroupsForUser(uiState.currentUserId) : finalGroups.map(g => g.name),
    }), [categoryState, finalGroups, finalGroupMap, finalCategoryMap, handleReassignAndDeleteCategory, uiState.currentUserId, userSettingsState, createPersistentWrapper]);

    const dataValue = useMemo<DataContextType>(() => ({
        ...transactionDataState,
        transactions: enrichedTransactions,
        totalMonthlyBudget, totalSpentThisMonth, totalMonthlyFixedCosts,
        addTransaction: createPersistentWrapper(transactionDataState.addTransaction),
        addMultipleTransactions: createPersistentWrapper(transactionDataState.addMultipleTransactions),
        updateTransaction: createPersistentWrapper(transactionDataState.updateTransaction),
        deleteTransaction: createPersistentWrapper(transactionDataState.deleteTransaction),
        deleteMultipleTransactions: createPersistentWrapper(transactionDataState.deleteMultipleTransactions),
        addRecurringTransaction: createPersistentWrapper(transactionDataState.addRecurringTransaction),
        updateRecurringTransaction: createPersistentWrapper(transactionDataState.updateRecurringTransaction),
        deleteRecurringTransaction: createPersistentWrapper(transactionDataState.deleteRecurringTransaction),
        handleUpdateTag: createPersistentWrapper(transactionDataState.handleUpdateTag),
        handleDeleteTag: createPersistentWrapper(transactionDataState.handleDeleteTag),
        handleReassignAndDeleteTag: createPersistentWrapper(transactionDataState.handleReassignAndDeleteTag),
        reassignCategoryForTransactions: createPersistentWrapper(transactionDataState.reassignCategoryForTransactions),
        reassignUserForTransactions: createPersistentWrapper(transactionDataState.reassignUserForTransactions),
        createTransactionGroup: createPersistentWrapper(transactionDataState.createTransactionGroup),
        updateGroupedTransaction: createPersistentWrapper(transactionDataState.updateGroupedTransaction),
        removeTransactionFromGroup: createPersistentWrapper(transactionDataState.removeTransactionFromGroup),
        addTransactionsToGroup: createPersistentWrapper(transactionDataState.addTransactionsToGroup),
        mergeTransactionWithTarget: createPersistentWrapper(transactionDataState.mergeTransactionWithTarget),
        updateGroupVerifiedStatus: createPersistentWrapper(transactionDataState.updateGroupVerifiedStatus),
        updateGroupTargetAmount: createPersistentWrapper(transactionDataState.updateGroupTargetAmount),
        addTransactionToGroup: createPersistentWrapper(transactionDataState.addTransactionToGroup),
        analyzeReceipt,
        addRecipe: createPersistentWrapper((recipe: Recipe) => uiState.setRecipes(prev => [...prev, recipe])),
        updateRecipe: createPersistentWrapper((recipe: Recipe) => uiState.setRecipes(prev => prev.map(r => r.id === recipe.id ? recipe : r))),
        deleteRecipe: createPersistentWrapper((recipeId: string) => uiState.setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, isDeleted: true, lastModified: new Date().toISOString(), version: (r.version || 0) + 1 } : r))),
        recipeMap,
    }), [transactionDataState, enrichedTransactions, totalMonthlyBudget, totalSpentThisMonth, totalMonthlyFixedCosts, analyzeReceipt, createPersistentWrapper, uiState.setRecipes, recipeMap]);
    
    const syncValue = useMemo<SyncContextType>(() => ({ ...syncState, syncOperation: syncState.syncStatus === 'syncing' ? 'sync' : null, resetAppData }), [syncState, resetAppData]);
    
    return (
        <UIContext.Provider value={uiValue}>
            <UserContext.Provider value={userValue}>
                <TaxonomyContext.Provider value={taxonomyValue}>
                    <DataContext.Provider value={dataValue}>
                        <SyncContext.Provider value={syncValue}>
                            {children}
                        </SyncContext.Provider>
                    </DataContext.Provider>
                </TaxonomyContext.Provider>
            </UserContext.Provider>
        </UIContext.Provider>
    );
};

const AppStateContainer: React.FC<{
    children: React.ReactNode;
    isDemoModeEnabled: boolean;
    isInitialSetupDone: boolean;
    setIsInitialSetupDone: React.Dispatch<React.SetStateAction<boolean>>;
    appMode: 'demo' | 'standard';
}> = (props) => {
    const { children, appMode, ...rest } = props;

    const uiState = useUI({ isDemoModeEnabled: props.isDemoModeEnabled });
    const usersState = useUsers({ isDemoModeEnabled: props.isDemoModeEnabled });
    
    if (usersState.isLoading) {
        return <div className="fixed inset-0 bg-slate-900 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>;
    }
    
    if (!props.isDemoModeEnabled && usersState.users.length === 0) {
         return (
             <ReadyAppProvider {...rest} appMode={appMode} uiState={uiState} usersState={usersState}>
                <FirstUserSetup />
            </ReadyAppProvider>
        );
    }

    if (usersState.users.length > 0) {
        const currentUserIsValid = uiState.currentUserId && usersState.users.some(u => u.id === uiState.currentUserId);
        if (!currentUserIsValid) {
            uiState.setCurrentUserId(usersState.users[0].id);
            return <div className="fixed inset-0 bg-slate-900 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>;
        }
    }
    
    const { isLoading: _isLoading, ...restUsersState } = usersState;
    return (
        <ReadyAppProvider {...rest} appMode={appMode} uiState={uiState} usersState={restUsersState}>
            {children}
        </ReadyAppProvider>
    );
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [appMode, setAppMode] = useState<'loading' | 'demo' | 'standard'>('loading');
    const [isInitialSetupDone, setIsInitialSetupDone] = useLocalStorage<boolean>('initialSetupDone', false);
    const [localAppMode, setLocalAppMode] = useLocalStorage<'demo' | 'standard'>('appMode', 'standard');

    useEffect(() => {
        const determineInitialMode = async () => {
            if (!isInitialSetupDone) { setAppMode('demo'); setLocalAppMode('demo'); return; }
            setAppMode(localAppMode);
            try {
                const { userSettings }: { userSettings: UserSetting[] } = await apiGet('/api/sheets/read?ranges=UserSettings!A2:Z');
                const remoteMode = userSettings.find(s => s.userId === 'app_meta' && s.key === 'mode')?.value === 'demo' ? 'demo' : 'standard';
                if (remoteMode !== localAppMode) {
                    toast(`App-Modus wurde synchronisiert: ${remoteMode === 'demo' ? 'Demo' : 'Standard'}.`);
                    setAppMode(remoteMode); setLocalAppMode(remoteMode);
                }
            } catch (error) { console.error("Could not fetch app mode from server.", error); }
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

    return (
        <AppStateContainer key={appMode} isDemoModeEnabled={appMode === 'demo'} isInitialSetupDone={isInitialSetupDone} setIsInitialSetupDone={setIsInitialSetupDone} appMode={appMode}>
            {children}
        </AppStateContainer>
    );
};

// --- HOOKS ---
const createUseContextHook = <T,>(context: React.Context<T | null>, name: string) => () => {
    const ctx = useContext(context);
    if (!ctx) throw new Error(`${name} must be used within an AppProvider`);
    return ctx;
};

export const useUIContext = createUseContextHook(UIContext, 'useUIContext');
export const useUserContext = createUseContextHook(UserContext, 'useUserContext');
export const useTaxonomyContext = createUseContextHook(TaxonomyContext, 'useTaxonomyContext');
export const useDataContext = createUseContextHook(DataContext, 'useDataContext');
export const useSyncContext = createUseContextHook(SyncContext, 'useSyncContext');

// Add a convenience hook that combines all contexts
export const useApp = () => {
    return {
        ...useUIContext(),
        ...useUserContext(),
        ...useTaxonomyContext(),
        ...useDataContext(),
        ...useSyncContext(),
    };
};