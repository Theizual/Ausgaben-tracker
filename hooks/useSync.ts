
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import useLocalStorage from './useLocalStorage';
import type { Category, Transaction, RecurringTransaction, Tag } from '../types';

interface SyncProps {
    categories: Category[];
    transactions: Transaction[];
    recurringTransactions: RecurringTransaction[];
    allAvailableTags: Tag[];
    setCategories: (data: Category[]) => void;
    setCategoryGroups: (data: string[]) => void;
    setTransactions: (data: Transaction[]) => void;
    setRecurringTransactions: (data: RecurringTransaction[]) => void;
    setAllAvailableTags: (data: Tag[]) => void;
}

export const useSync = (props: SyncProps) => {
    const {
        categories, transactions, recurringTransactions, allAvailableTags,
        setCategories, setCategoryGroups, setTransactions, setRecurringTransactions, setAllAvailableTags
    } = props;
    
    const [syncOperation, setSyncOperation] = useState<'upload' | 'download' | null>(null);
    const isSyncing = syncOperation !== null;
    const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useLocalStorage<boolean>('autoSyncEnabled', true);

    const downloadFromSheet = useCallback(async () => {
        setSyncOperation('download');
        
        const promise = fetch('/api/sheets/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }).then(async (response) => {
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Fehler beim Laden (${response.status})`);
            }
            const data = await response.json();
            const newCategories: Category[] = data.categories || [];
            const newTransactions: Transaction[] = data.transactions || [];
            const newRecurring: RecurringTransaction[] = data.recurringTransactions || [];
            const newTags: Tag[] = data.allAvailableTags || [];
    
            if (newCategories.length > 0) {
                 setCategories(newCategories);
                 const newGroups = [...new Set(newCategories.map(c => c.group))];
                 setCategoryGroups(newGroups);
            }
            if (newTransactions.length > 0) setTransactions(newTransactions);
            if (newRecurring.length > 0) setRecurringTransactions(newRecurring);
            if (newTags.length > 0) setAllAvailableTags(newTags);
            
            return `Daten erfolgreich geladen: ${newTransactions.length} Transaktionen`;
        });

        toast.promise(promise, {
            loading: 'Lade Daten vom Google Sheet...',
            success: (message) => message,
            error: (err) => `Fehler: ${err.message}`
        })
        .finally(() => {
            setSyncOperation(null);
        });
    }, [setCategories, setTransactions, setCategoryGroups, setRecurringTransactions, setAllAvailableTags]);

    const uploadToSheet = useCallback(async (options: { isAutoSync?: boolean } = {}) => {
        const { isAutoSync = false } = options;
        if (!isAutoSync) setSyncOperation('upload');
        
        const promise = fetch('/api/sheets/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                categories,
                transactions,
                recurringTransactions,
                allAvailableTags,
            }),
        }).then(async (response) => {
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Fehler beim Speichern (${response.status})`);
            }
            return response.json();
        });

        if (!isAutoSync) {
            toast.promise(promise, {
                loading: 'Speichere Daten in Google Sheet...',
                success: 'Daten erfolgreich gespeichert!',
                error: (err) => `Fehler: ${err.message}`
            });
        }
        
        promise.catch(e => {
            console.error("Error uploading to sheet:", e);
        }).finally(() => {
            if (!isAutoSync) setSyncOperation(null);
        });
    }, [categories, transactions, recurringTransactions, allAvailableTags]);
    
    useEffect(() => {
        if (!isAutoSyncEnabled) return;
    
        const intervalId = setInterval(() => {
            if (!isSyncing) {
                uploadToSheet({ isAutoSync: true });
            }
        }, 5 * 60 * 1000); // 5 minutes
    
        return () => clearInterval(intervalId);
    }, [isAutoSyncEnabled, isSyncing, uploadToSheet]);

    return {
        syncOperation,
        isSyncing,
        isAutoSyncEnabled,
        setIsAutoSyncEnabled,
        downloadFromSheet,
        uploadToSheet,
    };
};
