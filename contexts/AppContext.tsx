
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useCategories } from '../hooks/useCategories';
import { useTransactionData } from '../hooks/useTransactionData';
import { useUI } from '../hooks/useUI';
import { useSync } from '../hooks/useSync';

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
        ...categoriesState,
        ...transactionDataState,
    });
    
    // Auto-sync logic
    const debouncedSync = useRef(debounce(() => {
        if (syncState.isAutoSyncEnabled && !syncState.isSyncing) {
           syncState.syncData({ isAuto: true });
        }
    }, 2000)).current; // 2-second debounce delay
    
    // The initial sync is now handled by a prompt in useSync.ts
    // The user's request for auto-sync after an entry is handled here:
    useEffect(() => {
        debouncedSync();
    }, [
        categoriesState.rawCategories, 
        categoriesState.categoryGroups,
        transactionDataState.rawTransactions, 
        transactionDataState.rawRecurringTransactions, 
        transactionDataState.rawAllAvailableTags,
        debouncedSync
    ]);


    const value: AppContextType = {
        ...uiState,
        ...categoriesState,
        ...transactionDataState,
        addMultipleTransactions: transactionDataState.addMultipleTransactions,
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
