import React, { useState, useCallback, useEffect, FC, useRef } from 'react';
import { toast, Toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import useLocalStorage from './useLocalStorage';
import type { Category, Transaction, RecurringTransaction, Tag } from '../types';
import { RefreshCw, X } from '../components/Icons';


export interface SyncProps {
    rawCategories: Category[];
    rawTransactions: Transaction[];
    rawRecurringTransactions: RecurringTransaction[];
    rawAllAvailableTags: Tag[];
    setCategories: (data: Category[]) => void;
    setCategoryGroups: (data: string[]) => void;
    setTransactions: (data: Transaction[]) => void;
    setRecurringTransactions: (data: RecurringTransaction[]) => void;
    setAllAvailableTags: (data: Tag[]) => void;
}

type Mergeable = Category | Transaction | RecurringTransaction | Tag;

// Generic function to merge local and remote data based on version number
function mergeItems<T extends Mergeable>(localItems: T[], remoteItems: T[], conflicts: T[] = []): T[] {
  const allItems = new Map<string, T>();

  const processItem = (item: T) => {
      if (!item.id) return;
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
    // Otherwise, remove any pre-existing conflict flag.
    const { conflicted, ...rest } = item;
    return rest as T;
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


    return React.createElement(motion('div'), {
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
}
interface ConflictData {
    categories: Category[];
    transactions: Transaction[];
    recurring: RecurringTransaction[];
    tags: Tag[];
}
interface WriteErrorResponse {
    error: string;
    conflicts?: ConflictData;
}


export const useSync = (props: SyncProps) => {
    const {
        rawCategories, rawTransactions, rawRecurringTransactions, rawAllAvailableTags,
        setCategories, setCategoryGroups, setTransactions, setRecurringTransactions, setAllAvailableTags
    } = props;
    
    const [syncOperation, setSyncOperation] = useState<'sync' | null>(null);
    const [lastSync, setLastSync] = useLocalStorage<string | null>('lastSyncTimestamp', null);
    const isSyncing = syncOperation !== null;
    const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useLocalStorage<boolean>('autoSyncEnabled', false);
    const promptShownRef = useRef(false);

    const syncData = useCallback(async (options: { isAuto?: boolean; isConflictResolution?: boolean } = {}) => {
        const { isAuto = false, isConflictResolution = false } = options;
        if (isSyncing) return;
        
        if (!isAuto) {
            setSyncOperation('sync');
        }

        const syncPromise = new Promise<string>(async (resolve, reject) => {
            try {
                // 1. Write local data to sheet, which performs the version check
                const writeResponse = await fetch('/api/sheets/write', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        categories: rawCategories,
                        transactions: rawTransactions,
                        recurringTransactions: rawRecurringTransactions,
                        allAvailableTags: rawAllAvailableTags,
                    }),
                });

                if (!writeResponse.ok) {
                    const errorBody = await writeResponse.text();
                    let errorJson: WriteErrorResponse | null = null;
                    try {
                        errorJson = JSON.parse(errorBody);
                    } catch(e) {
                        // Not a JSON response, throw with the raw text.
                        throw new Error(errorBody || `Fehler beim Speichern (${writeResponse.status})`);
                    }

                    if (writeResponse.status === 409 && errorJson?.conflicts) {
                         // CONFLICT DETECTED
                        console.warn("Sync conflict detected. Merging server data and re-syncing.");
                        
                        const mergedCategories = mergeItems(rawCategories, [], errorJson.conflicts.categories);
                        const mergedTransactions = mergeItems(rawTransactions, [], errorJson.conflicts.transactions);
                        const mergedRecurring = mergeItems(rawRecurringTransactions, [], errorJson.conflicts.recurring);
                        const mergedTags = mergeItems(rawAllAvailableTags, [], errorJson.conflicts.tags);
                        
                        // Update local state
                        setCategories(mergedCategories);
                        const newGroups = [...new Set(mergedCategories.filter(c => !c.isDeleted).map(c => c.group))];
                        setCategoryGroups(newGroups);
                        setTransactions(mergedTransactions);
                        setRecurringTransactions(mergedRecurring);
                        setAllAvailableTags(mergedTags);
                        
                        // Immediately trigger a new sync to push the resolved state
                        setTimeout(() => syncData({ isAuto, isConflictResolution: true }), 100);

                        resolve('Konflikt gelöst. Erneute Synchronisierung...');
                        return;
                    }
                    throw new Error(errorJson?.error || `Fehler beim Speichern (${writeResponse.status})`);
                }
                
                // If write was successful, read back the canonical state from the sheet.
                const readResponse = await fetch('/api/sheets/read', { method: 'POST' });
                const responseBody = await readResponse.text();

                if (!readResponse.ok) {
                    let errorJson: { error?: string } | null = null;
                    try {
                        errorJson = JSON.parse(responseBody);
                    } catch(e) {
                        throw new Error(responseBody || `Fehler beim Laden (${readResponse.status})`);
                    }
                    throw new Error(errorJson?.error || `Fehler beim Laden nach Speichern (${readResponse.status})`);
                }

                const remoteData = JSON.parse(responseBody) as ReadApiResponse;

                // Set local state to exactly match the remote state
                setCategories(remoteData.categories || []);
                const newGroups = [...new Set((remoteData.categories || []).filter((c: Category) => !c.isDeleted).map((c: Category) => c.group))];
                setCategoryGroups(newGroups);
                setTransactions(remoteData.transactions || []);
                setRecurringTransactions(remoteData.recurringTransactions || []);
                setAllAvailableTags(remoteData.allAvailableTags || []);
                
                setLastSync(new Date().toISOString());
                
                if(isConflictResolution) {
                    resolve('Konflikt erfolgreich behoben und synchronisiert!');
                } else {
                    resolve('Daten erfolgreich synchronisiert!');
                }

            } catch (error: any) {
                console.error('Sync Error:', error);
                reject(error);
            }
        });

        if (!isAuto) {
            toast.promise(syncPromise, {
                loading: 'Synchronisiere Daten...',
                success: (message) => String(message),
                error: (err) => `Sync-Fehler: ${err.message}`,
            });
        } else {
             syncPromise.catch(err => {
                console.warn('Auto-sync failed in background:', err.message);
             });
        }
        
        syncPromise.finally(() => {
            if (!isAuto) {
                setSyncOperation(null);
            }
        });

    }, [
        isSyncing,
        rawCategories, rawTransactions, rawRecurringTransactions, rawAllAvailableTags,
        setCategories, setCategoryGroups, setTransactions, setRecurringTransactions, setAllAvailableTags, setLastSync
    ]);

    useEffect(() => {
        // Don't show prompt if already shown in this session, or if a sync is happening.
        if (promptShownRef.current || isSyncing) {
            return;
        }

        const SYNC_PROMPT_THRESHOLD = 60 * 60 * 1000; // 1 hour
        let shouldPrompt = false;

        if (!lastSync) {
            shouldPrompt = true;
        } else {
            try {
                const timeSinceLastSync = new Date().getTime() - new Date(lastSync).getTime();
                if (timeSinceLastSync > SYNC_PROMPT_THRESHOLD) {
                    shouldPrompt = true;
                }
            } catch (e) {
                // If lastSync is an invalid date string, prompt to be safe.
                shouldPrompt = true;
            }
        }
        
        if (shouldPrompt) {
            // Mark as shown immediately to prevent re-triggering on subsequent renders.
            promptShownRef.current = true;
            
            setTimeout(() => {
                toast.custom(
                    (t: Toast) => React.createElement(SyncPromptToast, {
                        lastSync: lastSync,
                        onSync: () => syncData(),
                        onDismiss: () => toast.dismiss(t.id),
                    }),
                    {
                        id: 'sync-prompt',
                        duration: Infinity,
                        position: 'top-center'
                    }
                );
            }, 500);
        }
    }, [lastSync, isSyncing, syncData]);

    return {
        syncOperation,
        isSyncing,
        lastSync,
        isAutoSyncEnabled,
        setIsAutoSyncEnabled,
        syncData,
    };
};