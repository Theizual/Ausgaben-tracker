

import React, { useState, useCallback, useEffect, FC } from 'react';
import { toast, Toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import useLocalStorage from './useLocalStorage';
import type { Category, Transaction, RecurringTransaction, Tag } from '../types';
import { RefreshCw, X } from '../components/Icons';


interface SyncProps {
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

// Generic function to merge local and sheet data
function mergeItems<T extends Mergeable>(localItems: T[], sheetItems: T[]): T[] {
  const allItems = new Map<string, T>();

  // Process sheet items first
  for (const item of sheetItems) {
    if (item.id) {
      allItems.set(item.id, item);
    }
  }

  // Process local items, potentially overwriting sheet items if local is newer
  for (const item of localItems) {
    if (!item.id) continue; // Skip items without ID

    const existingItem = allItems.get(item.id);

    if (!existingItem) {
      // New item, only exists locally
      allItems.set(item.id, item);
    } else {
      // Item exists in both. Compare timestamps.
      const localDate = new Date(item.lastModified);
      const sheetDate = new Date(existingItem.lastModified);

      if (localDate > sheetDate) {
        allItems.set(item.id, item);
      }
    }
  }

  return Array.from(allItems.values());
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


export const useSync = (props: SyncProps) => {
    const {
        rawCategories, rawTransactions, rawRecurringTransactions, rawAllAvailableTags,
        setCategories, setCategoryGroups, setTransactions, setRecurringTransactions, setAllAvailableTags
    } = props;
    
    const [syncOperation, setSyncOperation] = useState<'sync' | null>(null);
    const [lastSync, setLastSync] = useLocalStorage<string | null>('lastSyncTimestamp', null);
    const isSyncing = syncOperation !== null;
    const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useLocalStorage<boolean>('autoSyncEnabled', false);

    const syncData = useCallback(async (options: { isAuto?: boolean } = {}) => {
        const { isAuto = false } = options;
        if (isSyncing) return;
        
        // Don't show manual spinner for auto-syncs, but still show for user-initiated syncs
        if (!isAuto) {
            setSyncOperation('sync');
        }

        const syncPromise = new Promise<string>(async (resolve, reject) => {
            try {
                 // 1. Fetch remote data
                const readResponse = await fetch('/api/sheets/read', { method: 'POST' });
                if (!readResponse.ok) {
                    const errorData = await readResponse.json();
                    throw new Error(errorData.error || `Fehler beim Laden (${readResponse.status})`);
                }
                const remoteData = await readResponse.json();
                const sheetCategories: Category[] = remoteData.categories || [];
                const sheetTransactions: Transaction[] = remoteData.transactions || [];
                const sheetRecurring: RecurringTransaction[] = remoteData.recurringTransactions || [];
                const sheetTags: Tag[] = remoteData.allAvailableTags || [];

                // 2. Merge data
                const mergedCategories = mergeItems(rawCategories, sheetCategories);
                const mergedTransactions = mergeItems(rawTransactions, sheetTransactions);
                const mergedRecurring = mergeItems(rawRecurringTransactions, sheetRecurring);
                const mergedTags = mergeItems(rawAllAvailableTags, sheetTags);

                // 3. Update local state with merged data
                setCategories(mergedCategories);
                const newGroups = [...new Set(mergedCategories.filter(c => !c.isDeleted).map(c => c.group))];
                setCategoryGroups(newGroups);
                setTransactions(mergedTransactions);
                setRecurringTransactions(mergedRecurring);
                setAllAvailableTags(mergedTags);
                
                // 4. Write merged data back to sheet
                const writeResponse = await fetch('/api/sheets/write', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        categories: mergedCategories,
                        transactions: mergedTransactions,
                        recurringTransactions: mergedRecurring,
                        allAvailableTags: mergedTags,
                    }),
                });

                if (!writeResponse.ok) {
                    const errorData = await writeResponse.json();
                    throw new Error(errorData.error || `Fehler beim Speichern (${writeResponse.status})`);
                }

                setLastSync(new Date().toISOString());
                resolve('Daten erfolgreich synchronisiert!');
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
        
        if (shouldPrompt && !isSyncing) {
            setTimeout(() => { // Use timeout to ensure toaster is ready
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
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        syncOperation,
        isSyncing,
        lastSync,
        isAutoSyncEnabled,
        setIsAutoSyncEnabled,
        syncData,
    };
};