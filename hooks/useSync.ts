
import { useCallback, useEffect, useRef, useState } from 'react';
import useLocalStorage from '@/shared/hooks/useLocalStorage';
import type { Category, Transaction, RecurringTransaction, Tag, User, UserSetting } from '@/shared/types';

export interface SyncProps {
    rawTransactions: Transaction[];
    rawRecurringTransactions: RecurringTransaction[];
    rawAllAvailableTags: Tag[];
    rawUsers: User[];
    rawUserSettings: UserSetting[];
    setTransactions: (data: Transaction[]) => void;
    setRecurringTransactions: (data: RecurringTransaction[]) => void;
    setAllAvailableTags: (data: Tag[]) => void;
    setUsers: (data: User[]) => void;
    setUserSettings: (data: UserSetting[]) => void;
}

interface Mergeable {
    id?: string;
    userId?: string;
    settingKey?: string;
    version: number;
    conflicted?: boolean;
}

const isMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const fetchWithMobileTimeout = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const timeoutMs = isMobile() ? 15000 : 8000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json', 'User-Agent': navigator.userAgent, ...options.headers },
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') throw new Error('Request timeout - please try again');
        throw error;
    }
};

const getItemKey = (item: any): string => {
    if (item.id) return item.id;
    if (item.userId && item.settingKey) return `${item.userId}-${item.settingKey}`;
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
    categories: Category[]; transactions: Transaction[]; recurringTransactions: RecurringTransaction[];
    allAvailableTags: Tag[]; users: User[]; userSettings: UserSetting[];
}
interface ConflictData {
    categories: Category[]; transactions: Transaction[]; recurring: RecurringTransaction[];
    tags: Tag[]; users: User[]; userSettings: UserSetting[];
}
interface WriteErrorResponse { error: string; conflicts?: ConflictData; }

type SyncStatus = 'idle' | 'loading' | 'syncing' | 'success' | 'error' | 'conflict';

export const useSync = (props: SyncProps) => {
    const {
        rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers, rawUserSettings,
        setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setUserSettings
    } = props;
    
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [syncError, setSyncError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useLocalStorage<string | null>('lastSyncTimestamp', null);
    const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useLocalStorage<boolean>('autoSyncEnabled', false);
    const [isSyncRecommended, setIsSyncRecommended] = useState(false);
    
    const syncInProgressRef = useRef(false);
    
    const handleMergeConflicts = useCallback(async (conflicts: ConflictData) => {
        setTransactions(mergeItems(rawTransactions, [], conflicts.transactions));
        setRecurringTransactions(mergeItems(rawRecurringTransactions, [], conflicts.recurring));
        setAllAvailableTags(mergeItems(rawAllAvailableTags, [], conflicts.tags));
        setUsers(mergeItems(rawUsers, [], conflicts.users));
        setUserSettings(mergeItems(rawUserSettings, [], conflicts.userSettings));
        setSyncStatus('conflict');
    }, [
        rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers, rawUserSettings,
        setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setUserSettings
    ]);

    const syncData = useCallback(async (options: { isAuto?: boolean } = {}) => {
        if (syncInProgressRef.current) return;
        syncInProgressRef.current = true;
        setSyncStatus(options.isAuto ? 'loading' : 'syncing');
        setSyncError(null);

        try {
            const response = await fetchWithMobileTimeout('/api/sheets/write', {
                method: 'POST',
                body: JSON.stringify({
                    transactions: rawTransactions, recurringTransactions: rawRecurringTransactions,
                    allAvailableTags: rawAllAvailableTags, users: rawUsers, userSettings: rawUserSettings,
                }),
            });

            if (response.status === 409) {
                const conflictData: WriteErrorResponse = await response.json();
                if (conflictData.conflicts) await handleMergeConflicts(conflictData.conflicts);
                else throw new Error('Conflict error, but no conflict data received.');
            } else if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unbekannter Serverfehler' }));
                throw new Error(errorData.error || `Serverfehler: ${response.status}`);
            }
            setLastSync(new Date().toISOString());
            setSyncStatus('success');
        } catch (e: any) {
            setSyncError(e.message);
            setSyncStatus('error');
        } finally {
            syncInProgressRef.current = false;
        }
    }, [
        rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers, rawUserSettings,
        handleMergeConflicts, setLastSync
    ]);

    const loadFromSheet = useCallback(async () => {
        if (syncInProgressRef.current) return;
        syncInProgressRef.current = true;
        setSyncStatus('loading');
        setSyncError(null);

        try {
            const response = await fetchWithMobileTimeout('/api/sheets/read', { method: 'POST' });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
                throw new Error(errorData.error || `Server responded with ${response.status}`);
            }
            const data: ReadApiResponse = await response.json();
            setTransactions(data.transactions);
            setRecurringTransactions(data.recurringTransactions);
            setAllAvailableTags(data.allAvailableTags);
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
    }, [setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setUserSettings, setLastSync]);

    useEffect(() => {
        if (syncStatus === 'success' || syncStatus === 'error' || syncStatus === 'conflict') {
            const timer = setTimeout(() => setSyncStatus('idle'), 4000);
            return () => clearTimeout(timer);
        }
    }, [syncStatus]);

    useEffect(() => {
        if (!lastSync) {
            loadFromSheet();
        } else if (!isAutoSyncEnabled && lastSync && (Date.now() - new Date(lastSync).getTime() > 5 * 60 * 60 * 1000)) {
            setIsSyncRecommended(true);
        }
    }, [isAutoSyncEnabled, lastSync, loadFromSheet]);

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
