import React, {FC, useCallback, useEffect, useRef, useState} from 'react';
import { toast, Toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import useLocalStorage from './useLocalStorage';
import type { Category, Transaction, RecurringTransaction, Tag, User, UserSetting } from '../types';
import { RefreshCw, X } from '../components/Icons';

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
    id?: string; // UserSetting uses a composite key, so id might not be the primary one.
    userId?: string;
    settingKey?: string;
    version: number;
    conflicted?: boolean;
}

// --- MOBILE UTILITIES ---

// Detect mobile device
const isMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Improved fetch with mobile-specific timeouts
const fetchWithMobileTimeout = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const timeoutMs = isMobile() ? 15000 : 8000; // Längere Timeouts für mobile
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': navigator.userAgent, // Explizit User-Agent senden
                ...options.headers,
            },
        });
        
        clearTimeout(timeoutId);
        return response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout - please try again');
        }
        throw error;
    }
};

const getItemKey = (item: any): string => {
    if (item.id) return item.id;
    if (item.userId && item.settingKey) return `${item.userId}-${item.settingKey}`;
    throw new Error('Cannot determine key for mergeable item');
}

// Generic function to merge local and remote data based on version number
function mergeItems<T extends Mergeable>(localItems: T[], remoteItems: T[], conflicts: T[] = []): T[] {
    const allItems = new Map<string, T>();

    const processItem = (item: T) => {
        const key = getItemKey(item);
        const existing = allItems.get(key);
        if (!existing || item.version > existing.version) {
            allItems.set(key, item);
        }
    };

    // Process all three lists. Order matters: conflicts first, then remote, then local.
    conflicts.forEach(processItem);
    remoteItems.forEach(processItem);
    localItems.forEach(processItem);
    
    // Mark conflicts
    const conflictMap = new Map(conflicts.map(c => [getItemKey(c), c]));
    const finalItems = Array.from(allItems.values());

    return finalItems.map(item => {
        const key = getItemKey(item);
        const conflictSource = conflictMap.get(key);
        if (conflictSource && item.version === conflictSource.version) {
            // If the winning item is the one from the conflict list, mark it.
            return { ...item, conflicted: true };
        }
        
        // For non-conflicting items, if they have a `conflicted` flag from a previous
        // merge operation (e.g. from local state), we need to remove it.
        // This is a safer way to create a clean copy.
        if ('conflicted' in item) {
            const cleanItem: Partial<T> = { ...item };
            delete cleanItem.conflicted;
            return cleanItem as T;
        }
        
        return item;
    });
}

interface SyncPromptToastProps {
    lastSync: string | null;
    onSync: () => void;
    onDismiss: () => void;
}

// Component for the custom sync prompt toast, written with React.createElement to be valid in a .ts file
const SyncPromptToast: FC<SyncPromptToastProps> = ({ lastSync, onSync, onDismiss }) => {
    const promptText = lastSync
        ? `Letzte Synchronisierung: ${formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: de })}. Möchten Sie auf den neuesten Stand aktualisieren?`
        : 'Möchten Sie auf den neuesten Stand aktualisieren?';

    return React.createElement(motion.div, {
        initial: { opacity: 0, y: 50 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 50, transition: { duration: 0.2 } },
        className: "relative bg-slate-800 border border-slate-700 shadow-lg rounded-xl p-4 w-full max-w-sm flex items-start gap-4"
    },
        React.createElement('div', { key: 'icon', className: "bg-blue-500/20 text-blue-400 rounded-full p-3 flex-shrink-0 mt-1" },
            React.createElement(RefreshCw, { className: "h-6 w-6" })
        ),
        React.createElement('div', { key: 'content', className: "flex-grow" },
            React.createElement('h3', { key: 'h3', className: "font-bold text-white" }, "Synchronisierung empfohlen"),
            React.createElement('p', { key: 'p', className: "text-sm text-slate-400 mt-1" }, promptText),
            React.createElement('div', { key: 'buttons', className: "mt-4 flex gap-3" },
                React.createElement('button', {
                    key: 'sync',
                    onClick: () => { onSync(); onDismiss(); },
                    className: "flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                }, "Synchronisieren"),
                React.createElement('button', {
                    key: 'dismiss',
                    onClick: onDismiss,
                    className: "flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                }, "Später")
            )
        ),
        React.createElement('button', { key: 'close', onClick: onDismiss, className: "absolute top-2 right-2 p-2 text-slate-500 hover:text-white rounded-full" },
            React.createElement(X, { className: "h-4 w-4" })
        )
    );
};

// --- API Response Type Definitions ---
interface ReadApiResponse {
    categories: Category[];
    transactions: Transaction[];
    recurringTransactions: RecurringTransaction[];
    allAvailableTags: Tag[];
    users: User[];
    userSettings: UserSetting[];
}

interface ConflictData {
    categories: Category[];
    transactions: Transaction[];
    recurring: RecurringTransaction[];
    tags: Tag[];
    users: User[];
    userSettings: UserSetting[];
}

interface WriteErrorResponse {
    error: string;
    conflicts?: ConflictData;
}

export const useSync = (props: SyncProps) => {
    // Guard to show the sync start prompt only once per tab (handles React 18 StrictMode)
    const didShowSyncPromptRef = useRef(false);
    
    useEffect(() => {
        if (didShowSyncPromptRef.current) return;
        didShowSyncPromptRef.current = true;
        if (typeof window !== 'undefined') {
            const k = 'syncPromptShown';
            if (sessionStorage.getItem(k) !== '1') {
                sessionStorage.setItem(k, '1');
                // The app's existing logic will open the modal; this flag prevents repeated opens per tab.
            }
        }
    }, []);

    const {
        rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers, rawUserSettings,
        setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setUserSettings
    } = props;
    
    const [syncOperation, setSyncOperation] = useState<'sync' | null>(null);
    const [lastSync, setLastSync] = useLocalStorage<string | null>('lastSyncTimestamp', null);
    const [error, setError] = useState<string | null>(null);
    const [shouldAutoLoad] = useState(true); // You can make this configurable
    
    const isSyncing = syncOperation !== null;
    const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useLocalStorage<boolean>('autoSyncEnabled', false);
    const promptShownRef = useRef(false);
    
    // ANTI-LOOP MECHANISMS
    const syncInProgressRef = useRef(false);
    const lastSyncAttemptRef = useRef<number>(0);
    const lastAutoLoadRef = useRef<number>(0);
    const isDataUpdatingRef = useRef(false);

    const loadFromSheet = useCallback(async () => {
        const now = Date.now();
        const MIN_LOAD_INTERVAL = 5000;
        
        if (syncInProgressRef.current || now - lastAutoLoadRef.current < MIN_LOAD_INTERVAL) {
            return;
        }
        
        syncInProgressRef.current = true;
        lastAutoLoadRef.current = now;
        setError(null);
        
        const maxRetries = isMobile() ? 3 : 2;
        let lastError: Error | null = null;
        try {
            for (let i = 0; i < maxRetries; i++) {
                try {
                    const response = await fetchWithMobileTimeout('/api/sheets/read', { method: 'POST' });
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
                        throw new Error(errorData.error || `Server responded with ${response.status}`);
                    }
                    const data: ReadApiResponse = await response.json();
                    
                    isDataUpdatingRef.current = true;
                    setTransactions(data.transactions);
                    setRecurringTransactions(data.recurringTransactions);
                    setAllAvailableTags(data.allAvailableTags);
                    setUsers(data.users);
                    setUserSettings(data.userSettings);
                    setLastSync(new Date().toISOString());
                    isDataUpdatingRef.current = false;
                    
                    return; // Success
                } catch (e: any) {
                    lastError = e;
                    if (i < maxRetries - 1) {
                        await new Promise(res => setTimeout(res, (1000 * Math.pow(2, i)) + Math.random() * 500)); // Exponential backoff with jitter
                    }
                }
            }
            
            if (lastError) {
                setError(lastError.message);
                toast.error(`Daten konnten nicht geladen werden: ${lastError.message}`);
            }
        } finally {
            syncInProgressRef.current = false;
        }
    }, [setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setUserSettings, setLastSync]);
    
    const handleMergeConflicts = useCallback(async (conflicts: ConflictData) => {
        isDataUpdatingRef.current = true;

        setTransactions(mergeItems(rawTransactions, [], conflicts.transactions));
        setRecurringTransactions(mergeItems(rawRecurringTransactions, [], conflicts.recurring));
        setAllAvailableTags(mergeItems(rawAllAvailableTags, [], conflicts.tags));
        setUsers(mergeItems(rawUsers, [], conflicts.users));
        setUserSettings(mergeItems(rawUserSettings, [], conflicts.userSettings));
        
        isDataUpdatingRef.current = false;
        
        toast.error('Konflikt! Daten wurden zusammengeführt. Bitte prüfen Sie Ihre Einträge.', { duration: 5000 });
    }, [
        rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers, rawUserSettings,
        setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setUserSettings
    ]);

    const syncData = useCallback(async (options: { isAuto?: boolean } = {}) => {
        const now = Date.now();
        const MIN_SYNC_INTERVAL = 5000;
        if (syncInProgressRef.current || (now - lastSyncAttemptRef.current < MIN_SYNC_INTERVAL)) {
            if (!options.isAuto) toast('Synchronisierung läuft bereits.');
            return;
        }

        syncInProgressRef.current = true;
        lastSyncAttemptRef.current = now;
        setSyncOperation('sync');
        setError(null);
        
        if (!options.isAuto) toast.loading('Synchronisiere Daten...', { id: 'sync-toast' });

        try {
            const body = JSON.stringify({
                transactions: rawTransactions,
                recurringTransactions: rawRecurringTransactions,
                allAvailableTags: rawAllAvailableTags,
                users: rawUsers,
                userSettings: rawUserSettings,
            });

            const response = await fetchWithMobileTimeout('/api/sheets/write', {
                method: 'POST',
                body,
            });

            if (response.status === 409) {
                const conflictData: WriteErrorResponse = await response.json();
                if (conflictData.conflicts) {
                    await handleMergeConflicts(conflictData.conflicts);
                } else {
                     throw new Error('Conflict error, but no conflict data received.');
                }
            } else if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ error: 'Unbekannter Serverfehler' }));
                 throw new Error(errorData.error || `Serverfehler: ${response.status}`);
            }

            const newSyncTime = new Date().toISOString();
            setLastSync(newSyncTime);
            
            if (!options.isAuto) {
                toast.success('Synchronisierung erfolgreich!', { id: 'sync-toast' });
            }

        } catch (e: any) {
            setError(e.message);
            if (!options.isAuto) toast.error(`Fehler: ${e.message}`, { id: 'sync-toast' });
        } finally {
            setSyncOperation(null);
            syncInProgressRef.current = false;
        }
    }, [
        rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers, rawUserSettings,
        handleMergeConflicts, setLastSync
    ]);
    
    useEffect(() => {
        if (shouldAutoLoad && !lastSync) {
            loadFromSheet();
        }
    }, [shouldAutoLoad, lastSync, loadFromSheet]);

    useEffect(() => {
        if (!promptShownRef.current && !isAutoSyncEnabled && lastSync) {
            const fiveHours = 5 * 60 * 60 * 1000;
            if (Date.now() - new Date(lastSync).getTime() > fiveHours) {
                promptShownRef.current = true;
                toast.custom((t: Toast) => React.createElement(SyncPromptToast, {
                    lastSync: lastSync,
                    onSync: () => {
                        syncData();
                        toast.dismiss(t.id);
                    },
                    onDismiss: () => toast.dismiss(t.id),
                }), { duration: Infinity, position: 'bottom-center' });
            }
        }
    }, [isAutoSyncEnabled, lastSync, syncData]);

    return {
        syncOperation,
        isSyncing,
        isLoading: syncInProgressRef.current,
        error,
        lastSync,
        isAutoSyncEnabled,
        setIsAutoSyncEnabled,
        syncData,
        loadFromSheet,
        handleMergeConflicts,
    };
};