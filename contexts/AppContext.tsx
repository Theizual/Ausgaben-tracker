
import React, { createContext, useContext } from 'react';
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Instantiate hooks in an order that resolves dependencies.
    // UI and Categories are independent.
    const uiState = useUI();
    const categoriesState = useCategories();

    // TransactionData depends on UI handlers for modals.
    const transactionData = useTransactionData({
        showConfirmation: uiState.showConfirmation,
        closeTransactionDetail: uiState.closeTransactionDetail,
    });
    
    // Sync needs data and setters from all other domains.
    const sync = useSync({
        ...categoriesState,
        ...transactionData,
    });

    const value: AppContextType = {
        ...uiState,
        ...categoriesState,
        ...transactionData,
        ...sync
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
