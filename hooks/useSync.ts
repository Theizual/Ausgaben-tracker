import React, {FC, useCallback, useEffect, useRef, useState} from 'react';
import { toast, Toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import useLocalStorage from './useLocalStorage';
import type { Category, Transaction, RecurringTransaction, Tag, User } from '../types';
import { RefreshCw, X } from '../components/Icons';

export interface SyncProps {
    rawCategories: Category[];
    rawTransactions: Transaction[];
    rawRecurringTransactions: RecurringTransaction[];
    rawAllAvailableTags: Tag[];
    rawUsers: User[];
    setCategories: (data: Category[]) => void;
    setCategoryGroups: (data: string[]) => void;
    setTransactions: (data: Transaction[]) => void;
    setRecurringTransactions: (data: RecurringTransaction[]) => void;
    setAllAvailableTags: (data: Tag[]) => void;
    setUsers: (data: User[]) => void;
}

interface Mergeable {
    id: string;
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

// Generic function to merge local and remote data based on version number
function mergeItems<T extends Mergeable>(localItems: T[], remoteItems: T[], conflicts: T[] = []): T[] {
    const allItems = new Map<string, T>();

    const processItem = (item: T) => {
        const existing = allItems.get(item.id);
        if (!existing || item.version > existing.version) {
            allItems.set(item.id, item);
        }
    };

    // Process all three lists. Order matters: conflicts first, then remote, then local.
    conflicts.forEach(processItem);
    remoteItems.forEach(processItem);
    localItems.forEach(processItem);
    
    // Mark conflicts
    const conflictMap = new Map(conflicts.map(c => [c.id, c]));
    const finalItems = Array.from(allItems.values());

    return finalItems.map(item => {
        const conflictSource = conflictMap.get(item.id);
        if (conflictSource && item.version === conflictSource.version) {
            // If the winning item is the one from the conflict list, mark it.
            return { ...item, conflicted: true };
        }
        
        // For non-conflicting items, if they have a `conflicted` flag from a previous
        // merge operation (e.g. from local state), we need to remove it.
        // This is a safer way to create a clean copy.
        if ('conflicted' in item) {
            const cleanItem = { ...item };
            delete (cleanItem as Partial<T>).conflicted;
            return cleanItem;
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
}

interface ConflictData {
    categories: Category[];
    transactions: Transaction[];
    recurring: RecurringTransaction[];
    tags: Tag[];
    users: User[];
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
        rawCategories, rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers,
        setCategories, setCategoryGroups, setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers
    } = props;
    
    const [syncOperation, setSyncOperation] = useState<'sync' | null>(null);
    const [lastSync, setLastSync] = useLocalStorage<string | null>('lastSyncTimestamp', null);
    const [isLoading, setIsLoading] = useState(false);
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

    // Verbesserte loadFromSheet Funktion mit Anti-Loop-Schutz
    const loadFromSheet = useCallback(async () => {
        // Anti-Loop: Mindestabstand zwischen Loads
        const now = Date.now();
        const MIN_LOAD_INTERVAL = 5000; // 5 Sekunden
        
        if (now - lastAutoLoadRef.current < MIN_LOAD_INTERVAL) {
            console.log('Load attempted too soon, skipping...');
            return;
        }
        
        if (isLoading || isDataUpdatingRef.current) {
            console.log('Load already in progress or data updating, skipping...');
            return;
        }
        
        lastAutoLoadRef.current = now;
        setIsLoading(true);
        setError(null);
        
        const maxRetries = isMobile() ? 3 : 2;
        let lastError: Error | null = null;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetchWithMobileTimeout('/api/sheets/read', { method: 'POST' });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
                    throw new Error(errorData.error || `Server responded with ${response.status}`);
                }
                const data: ReadApiResponse = await response.json();
                
                isDataUpdatingRef.current = true;
                const newGroups = [...new Set(data.categories.map(c => c.group || 'Sonstiges'))];

                setCategories(data.categories);
                setCategoryGroups(newGroups);
                setTransactions(data.transactions);
                setRecurringTransactions(data.recurringTransactions);
                setAllAvailableTags(data.allAvailableTags);
                setUsers(data.users);
                setLastSync(new Date().toISOString());
                isDataUpdatingRef.current = false;
                
                setIsLoading(false);
                toast.success('Daten erfolgreich geladen');
                return; // Success
            } catch (e: any) {
                lastError = e;
                console.error(`Load attempt ${i + 1} failed:`, e.message);
                if (i < maxRetries - 1) {
                    await new Promise(res => setTimeout(res, (1000 * Math.pow(2, i)) + Math.random() * 500)); // Exponential backoff with jitter
                }
            }
        }
        
        // If all retries fail
        if (lastError) {
            setError(lastError.message);
            toast.error(`Daten konnten nicht geladen werden: ${lastError.message}`);
        }
        
        setIsLoading(false);
    }, [isLoading, setCategories, setCategoryGroups, setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setLastSync]);
    
    const handleMergeConflicts = useCallback(async (conflicts: ConflictData) => {
        isDataUpdatingRef.current = true;

        setCategories(mergeItems(rawCategories, [], conflicts.categories));
        setTransactions(mergeItems(rawTransactions, [], conflicts.transactions));
        setRecurringTransactions(mergeItems(rawRecurringTransactions, [], conflicts.recurring));
        setAllAvailableTags(mergeItems(rawAllAvailableTags, [], conflicts.tags));
        setUsers(mergeItems(rawUsers, [], conflicts.users));
        
        isDataUpdatingRef.current = false;
        
        toast.error('Konflikt! Daten wurden zusammengeführt. Bitte prüfen Sie Ihre Einträge.', { duration: 5000 });
    }, [
        rawCategories, rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers,
        setCategories, setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers
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
                categories: rawCategories,
                transactions: rawTransactions,
                recurringTransactions: rawRecurringTransactions,
                allAvailableTags: rawAllAvailableTags,
                users: rawUsers,
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
        rawCategories, rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers,
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
        isLoading,
        error,
        lastSync,
        isAutoSyncEnabled,
        setIsAutoSyncEnabled,
        syncData,
        loadFromSheet,
        handleMergeConflicts,
    };
};
