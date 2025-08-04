import React, { createContext, useContext, useEffect, useMemo, useRef} from 'react';
import { useCategories } from '../hooks/useCategories';
import { useTransactionData } from '../hooks/useTransactionData';
import { useUI } from '../hooks/useUI';
import { useSync, type SyncProps } from '../hooks/useSync';

// Combine the return types of all hooks to define the shape of the context
type AppContextType = 
    ReturnType<typeof useCategories> &
    ReturnType<typeof useTransactionData> &
    ReturnType<typeof useUI> &
    ReturnType<typeof useSync>;

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
    // Instantiate hooks in an order that resolves dependencies.
    const uiState = useUI();
    const categoriesState = useCategories();
    const transactionDataState = useTransactionData({
        showConfirmation: uiState.showConfirmation,
        closeTransactionDetail: uiState.closeTransactionDetail,
    });
    
    // Sync needs data and setters from all other domains.
    const syncState = useSync({
        rawCategories: categoriesState.rawCategories,
        rawTransactions: transactionDataState.rawTransactions,
        rawRecurringTransactions: transactionDataState.rawRecurringTransactions,
        rawAllAvailableTags: transactionDataState.rawAllAvailableTags,
        setCategories: categoriesState.setCategories,
        setCategoryGroups: categoriesState.setCategoryGroups,
        setTransactions: transactionDataState.setTransactions,
        setRecurringTransactions: transactionDataState.setRecurringTransactions,
        setAllAvailableTags: transactionDataState.setAllAvailableTags,
    });
    
    // --- Auto-sync logic with stale closure fix ---

    // 1. Ref Latch: This ref will always hold the most current syncState.
    const syncStateRef = useRef(syncState);
    useEffect(() => {
        syncStateRef.current = syncState;
    });

    // 2. Stable debounced function: Created once with useMemo.
    // It reads from the ref at execution time, getting the latest state.
    
// Suppress auto-sync right after a sync finishes to avoid loops from sync-written state
const suppressAutoSyncRef = useRef(false);
useEffect(() => {
  // When syncing stops, block auto-sync for a short period
  if (!syncState.isSyncing) {
    suppressAutoSyncRef.current = true;
    const t = setTimeout(() => { suppressAutoSyncRef.current = false; }, 1000);
    return () => clearTimeout(t);
  }
}, [syncState.isSyncing]);

const debouncedSync = useMemo(() => debounce(() => {
        if (suppressAutoSyncRef.current) return;
        const { isAutoSyncEnabled, isSyncing, syncData } = syncStateRef.current;
        if (isAutoSyncEnabled && !isSyncing) {
           syncData({ isAuto: true });
        }
    }, 2000), []); // Empty dependency array ensures this function is stable

    // 3. Effect trigger: Runs on data changes, but skips the initial mount.
    const isInitialMount = useRef(true);
    
    useEffect(() => {
        // Don't trigger sync on the very first render when data is hydrated
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        
        debouncedSync();
    }, [
        categoriesState.rawCategories, 
        categoriesState.categoryGroups,
        transactionDataState.rawTransactions, 
        transactionDataState.rawRecurringTransactions, 
        transactionDataState.rawAllAvailableTags,
        debouncedSync // This is stable, but good practice to include
    ]);


    const value: AppContextType = {
        ...uiState,
        ...categoriesState,
        ...transactionDataState,
        deleteMultipleTransactions: transactionDataState.deleteMultipleTransactions,
        addMultipleTransactions: transactionDataState.addMultipleTransactions,
        selectTotalSpentForMonth: transactionDataState.selectTotalSpentForMonth,
        ...syncState,
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