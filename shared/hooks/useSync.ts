
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import useLocalStorage from '@/shared/hooks/useLocalStorage';
import type { Category, Transaction, RecurringTransaction, Tag, User, UserSetting } from '@/shared/types';
import { apiGet, apiPost, HttpError } from '@/shared/lib/http';

export interface SyncProps {
    rawCategories: Category[];
    rawTransactions: Transaction[];
    rawRecurringTransactions: RecurringTransaction[];
    rawAllAvailableTags: Tag[];
    rawUsers: User[];
    rawUserSettings: UserSetting[];
    setCategories: (data: Category[]) => void;
    setTransactions: (data: Transaction[]) => void;
    setRecurringTransactions: (data: RecurringTransaction[]) => void;
    setAllAvailableTags: (data: Tag[]) => void;
    setUsers: (data: User[]) => void;
    setUserSettings: (data: UserSetting[]) => void;
    isInitialSetupDone: boolean;
    isDemoModeEnabled: boolean;
    setIsInitialSetupDone: React.Dispatch<React.SetStateAction<boolean>>;
}

interface Mergeable {
    id?: string;
    userId?: string;
    key?: string;
    version: number;
    conflicted?: boolean;
}

const getItemKey = (item: any): string => {
    if (item.id) return item.id;
    if (item.userId && item.key) return `${item.userId}-${item.key}`;
    throw new Error('Cannot determine key for mergeable item');
};

function mergeItems<T extends Mergeable>(localItems: T[], remoteItems: T[], conflicts: T[] = []): T[] {
    const allItems = new Map<string, T>();
    const processItem = (item: T) => {
        const key = getItemKey(item);
        const existing = allItems.get(key);
        if (!existing || item.version > existing.version) {
            allItems.set(key, { ...item, conflicted: false });
        }
    };

    conflicts.forEach(processItem);
    remoteItems.forEach(processItem);
    localItems.forEach(processItem);

    const conflictMap = new Map(conflicts.map(c => [getItemKey(c), true]));
    return Array.from(allItems.values()).map(item =>
        conflictMap.has(getItemKey(item)) ? { ...item, conflicted: true } : item
    );
}

interface ReadApiResponse {
    categories: Category[]; transactions: Transaction[]; recurring: RecurringTransaction[];
    tags: Tag[]; users: User[]; userSettings: UserSetting[];
}
interface ConflictData {
    categories: Category[]; transactions: Transaction[]; recurring: RecurringTransaction[];
    tags: Tag[]; users: User[]; userSettings: UserSetting[];
}

type SyncStatus = 'idle' | 'loading' | 'syncing' | 'success' | 'error' | 'conflict';

export const useSync = (props: SyncProps) => {
    const {
        rawCategories, rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers, rawUserSettings,
        setCategories, setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setUserSettings,
        isInitialSetupDone, isDemoModeEnabled, setIsInitialSetupDone
    } = props;
    
    const prefix = isDemoModeEnabled ? 'demo_' : '';
    
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [syncError, setSyncError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useLocalStorage<string | null>(`${prefix}lastSyncTimestamp`, null);
    const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useLocalStorage<boolean>(`${prefix}autoSyncEnabled`, false);
    const [isSyncRecommended, setIsSyncRecommended] = useState(false);
    
    const syncInProgressRef = useRef(false);
    
    const handleMergeConflicts = useCallback(async (conflicts: ConflictData) => {
        setCategories(mergeItems<Category>(rawCategories, [], conflicts.categories));
        setTransactions(mergeItems<Transaction>(rawTransactions, [], conflicts.transactions));
        setRecurringTransactions(mergeItems<RecurringTransaction>(rawRecurringTransactions, [], conflicts.recurring));
        setAllAvailableTags(mergeItems<Tag>(rawAllAvailableTags, [], conflicts.tags));
        setUsers(mergeItems<User>(rawUsers, [], conflicts.users));
        setUserSettings(mergeItems<UserSetting>(rawUserSettings, [], conflicts.userSettings));
        setSyncStatus('conflict');
    }, [
        rawCategories, rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers, rawUserSettings,
        setCategories, setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setUserSettings
    ]);

    const syncData = useCallback(async (options: { isAuto?: boolean } = {}) => {
        if (syncInProgressRef.current) return;

        if (isDemoModeEnabled) {
            if (!window.confirm("Möchten Sie Ihre Daten aus Google Sheets laden? Dadurch wird der Demo-Modus beendet und die aktuellen Demo-Daten werden überschrieben.")) {
                return;
            }
            
            syncInProgressRef.current = true;
            setSyncStatus('syncing');
            setSyncError(null);
            const toastId = 'initial-load-toast';
            toast.loading('Lade Daten aus Google Sheets...', { id: toastId });

            try {
                const data: ReadApiResponse = await apiGet('/api/sheets/read');
                
                setCategories(data.categories);
                setTransactions(data.transactions);
                setRecurringTransactions(data.recurring);
                setAllAvailableTags(data.tags);
                setUsers(data.users);
                setUserSettings(data.userSettings);

                setLastSync(new Date().toISOString());
                setSyncStatus('success');
                setIsInitialSetupDone(true);
                
                toast.success('Daten erfolgreich geladen! Die App wird neu gestartet, um den Produktiv-Modus zu aktivieren.', { id: toastId, duration: 4000 });
                
                setTimeout(() => window.location.reload(), 1500);

            } catch (e: any) {
                setSyncError(e.message);
                setSyncStatus('error');
                toast.error(`Fehler beim Laden der Daten: ${e.message}`, { id: toastId });
            } finally {
                syncInProgressRef.current = false;
            }
            return;
        }
        
        // --- Regular Production Sync ---
        syncInProgressRef.current = true;
        setSyncStatus(options.isAuto ? 'loading' : 'syncing');
        setSyncError(null);

        try {
            const remoteData: ReadApiResponse = await apiPost('/api/sheets/write', {
                categories: rawCategories,
                transactions: rawTransactions, recurring: rawRecurringTransactions,
                tags: rawAllAvailableTags, users: rawUsers, userSettings: rawUserSettings,
            });
            
            setCategories(mergeItems<Category>(rawCategories, remoteData.categories));
            setTransactions(mergeItems<Transaction>(rawTransactions, remoteData.transactions));
            setRecurringTransactions(mergeItems<RecurringTransaction>(rawRecurringTransactions, remoteData.recurring));
            setAllAvailableTags(mergeItems<Tag>(rawAllAvailableTags, remoteData.tags));
            setUsers(mergeItems<User>(rawUsers, remoteData.users));
            setUserSettings(mergeItems<UserSetting>(rawUserSettings, remoteData.userSettings));

            setLastSync(new Date().toISOString());
            setSyncStatus('success');
        } catch (e: any) {
            if (e instanceof HttpError && e.status === 409) {
                if (e.body?.conflicts) {
                    await handleMergeConflicts(e.body.conflicts);
                } else {
                    setSyncError('Conflict error, but no conflict data received.');
                    setSyncStatus('error');
                }
            } else {
                setSyncError(e.message);
                setSyncStatus('error');
            }
        } finally {
            syncInProgressRef.current = false;
        }
    }, [
        isDemoModeEnabled, setIsInitialSetupDone, rawCategories, rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers, rawUserSettings,
        handleMergeConflicts, setLastSync, setCategories, setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setUserSettings
    ]);

    const loadFromSheet = useCallback(async () => {
        if (syncInProgressRef.current || isDemoModeEnabled) return;
        syncInProgressRef.current = true;
        setSyncStatus('loading');
        setSyncError(null);

        try {
            const data: ReadApiResponse = await apiGet('/api/sheets/read');
            setCategories(data.categories);
            setTransactions(data.transactions);
            setRecurringTransactions(data.recurring);
            setAllAvailableTags(data.tags);
            setUsers(data.users);
            setUserSettings(data.userSettings);
            setLastSync(new Date().toISOString());
            setSyncStatus('success');
        } catch (e: any) {
            setSyncError(e.message);
            setSyncStatus('error');
        } finally {
            syncInProgressRef.current = false;
        }
    }, [isDemoModeEnabled, setCategories, setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setUserSettings, setLastSync]);


    useEffect(() => {
        if (syncStatus === 'success' || syncStatus === 'error' || syncStatus === 'conflict') {
            const timer = setTimeout(() => setSyncStatus('idle'), 4000);
            return () => clearTimeout(timer);
        }
    }, [syncStatus]);

    useEffect(() => {
        if (isInitialSetupDone && !lastSync && !isDemoModeEnabled) {
            loadFromSheet();
        }
        else if (lastSync && !isAutoSyncEnabled && !isDemoModeEnabled && (Date.now() - new Date(lastSync).getTime() > 5 * 60 * 60 * 1000)) {
            setIsSyncRecommended(true);
        }
    }, [isInitialSetupDone, isAutoSyncEnabled, lastSync, loadFromSheet, isDemoModeEnabled]);


    const syncOperation: 'sync' | null = syncStatus === 'syncing' ? 'sync' : null;

    return {
        syncStatus,
        syncError,
        isSyncing: syncStatus === 'syncing' || syncStatus === 'loading',
        syncOperation,
        lastSync,
        isAutoSyncEnabled,
        setIsAutoSyncEnabled,
        isSyncRecommended,
        setIsSyncRecommended,
        syncData,
        loadFromSheet,
    };
};