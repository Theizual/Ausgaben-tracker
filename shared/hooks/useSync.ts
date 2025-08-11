import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import useLocalStorage from '@/shared/hooks/useLocalStorage';
import type { Category, Transaction, RecurringTransaction, Tag, User, UserSetting, Group } from '@/shared/types';
import { apiGet, apiPost, HttpError } from '@/shared/lib/http';

export interface SyncProps {
    rawCategories: Category[];
    rawGroups: Group[];
    rawTransactions: Transaction[];
    rawRecurringTransactions: RecurringTransaction[];
    rawAllAvailableTags: Tag[];
    rawUsers: User[];
    rawUserSettings: UserSetting[];
    setCategoriesAndGroups: (categories: Category[], groups: Group[]) => void;
    setTransactions: (data: Transaction[]) => void;
    setRecurringTransactions: (data: RecurringTransaction[]) => void;
    setAllAvailableTags: (data: Tag[]) => void;
    setUsers: (data: User[]) => void;
    setUserSettings: (data: UserSetting[]) => void;
    isInitialSetupDone: boolean;
    isDemoModeEnabled: boolean;
    setIsInitialSetupDone: React.Dispatch<React.SetStateAction<boolean>>;
    currentUserId: string | null;
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
    const k = item?.key ?? item?.settingKey; 
    if (item?.userId && k) return `${item.userId}-${k}`;
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
    groups: Group[];
    categories: Category[]; transactions: Transaction[]; recurring: RecurringTransaction[];
    tags: Tag[]; users: User[]; userSettings: UserSetting[];
}
interface ConflictData {
    groups: Group[];
    categories: Category[]; transactions: Transaction[]; recurring: RecurringTransaction[];
    tags: Tag[]; users: User[]; userSettings: UserSetting[];
}

type SyncStatus = 'idle' | 'loading' | 'syncing' | 'success' | 'error' | 'conflict';

export const useSync = (props: SyncProps) => {
    const {
        rawCategories, rawGroups, rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers, rawUserSettings,
        setCategoriesAndGroups, setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setUserSettings,
        isInitialSetupDone, isDemoModeEnabled, setIsInitialSetupDone, currentUserId
    } = props;
    
    const prefix = isDemoModeEnabled ? 'demo_' : '';
    
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [syncError, setSyncError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useLocalStorage<string | null>(`${prefix}lastSyncTimestamp`, null);
    const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useLocalStorage<boolean>(`${prefix}autoSyncEnabled`, false);
    const [isSyncRecommended, setIsSyncRecommended] = useState(false);
    const [syncPromptDismissedUntil, setSyncPromptDismissedUntil] = useLocalStorage<number | null>(`${prefix}syncPromptDismissedUntil`, null);
    
    const syncInProgressRef = useRef(false);

    const dismissSyncPrompt = useCallback(() => {
        setSyncPromptDismissedUntil(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        setIsSyncRecommended(false);
    }, [setSyncPromptDismissedUntil, setIsSyncRecommended]);
    
    const handleMergeConflicts = useCallback(async (conflicts: ConflictData) => {
        const mergedCategories = mergeItems<Category>(rawCategories, [], conflicts.categories);
        const mergedGroups = mergeItems<Group>(rawGroups, [], conflicts.groups);
        setCategoriesAndGroups(mergedCategories, mergedGroups);
        setTransactions(mergeItems<Transaction>(rawTransactions, [], conflicts.transactions));
        setRecurringTransactions(mergeItems<RecurringTransaction>(rawRecurringTransactions, [], conflicts.recurring));
        setAllAvailableTags(mergeItems<Tag>(rawAllAvailableTags, [], conflicts.tags));
        setUsers(mergeItems<User>(rawUsers, [], conflicts.users));
        setUserSettings(mergeItems<UserSetting>(rawUserSettings, [], conflicts.userSettings));
        setSyncStatus('conflict');
    }, [
        rawCategories, rawGroups, rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers, rawUserSettings,
        setCategoriesAndGroups, setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setUserSettings
    ]);

    const syncData = useCallback(async (options: { isAuto?: boolean } = {}) => {
        if (syncInProgressRef.current) return;

        if (isDemoModeEnabled) {
            if (window.confirm("Möchten Sie Ihre Daten aus Google Sheets laden? Dadurch wird der Demo-Modus beendet und die aktuellen Demo-Daten werden überschrieben.")) {
                return;
            }
            
            syncInProgressRef.current = true;
            setSyncStatus('syncing');
            setSyncError(null);
            const toastId = 'initial-load-toast';
            toast.loading('Lade Daten aus Google Sheets...', { id: toastId });

            try {
                const data: ReadApiResponse = await apiGet('/api/sheets/read');
                
                const { categories, groups, transactions, recurring, tags, users } = data;
                let { userSettings } = data;

                // Ensure there's a main user to associate categories with
                const mainUser = users.find(u => !u.isDeleted);
                if (!mainUser) {
                    throw new Error("Kein aktiver Benutzer in den Google Sheet-Daten gefunden.");
                }

                // Create or update the category configuration for the main user
                const categoryConfigValue = JSON.stringify({ categories, groups });
                const now = new Date().toISOString();

                const existingConfigIndex = userSettings.findIndex(s => s.userId === mainUser.id && s.key === 'categoryConfiguration');
                if (existingConfigIndex > -1) {
                    const existing = userSettings[existingConfigIndex];
                    userSettings[existingConfigIndex] = {
                        ...existing,
                        value: categoryConfigValue,
                        lastModified: now,
                        version: (existing.version || 0) + 1,
                    };
                } else {
                    userSettings.push({
                        userId: mainUser.id,
                        key: 'categoryConfiguration',
                        value: categoryConfigValue,
                        lastModified: now,
                        version: 1,
                    });
                }
                
                // Manually write all data to production localStorage keys
                window.localStorage.setItem('transactions', JSON.stringify(transactions || []));
                window.localStorage.setItem('recurringTransactions', JSON.stringify(recurring || []));
                window.localStorage.setItem('allAvailableTags', JSON.stringify(tags || []));
                window.localStorage.setItem('users', JSON.stringify(users || []));
                window.localStorage.setItem('userSettings', JSON.stringify(userSettings || []));
                window.localStorage.setItem('lastSyncTimestamp', JSON.stringify(now));
                window.localStorage.setItem('app-current-user-id', JSON.stringify(mainUser.id));
                
                // Set app to "production mode" for the next load
                setIsInitialSetupDone(true);
                
                toast.success('Daten erfolgreich geladen! Die App wird neu gestartet, um den Produktiv-Modus zu aktivieren.', { id: toastId, duration: 4000 });
                
                // Reload the page to apply the new state from production storage
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
            // Fetch current settings from server to avoid overwriting other users' changes.
            const serverState: ReadApiResponse = await apiGet('/api/sheets/read');
            const remoteUserSettings = serverState.userSettings || [];
            
            let userSettingsPayload: UserSetting[];
            if (currentUserId) {
                const currentUserLocalSettings = rawUserSettings.filter(s => s.userId === currentUserId);
                const otherUsersRemoteSettings = remoteUserSettings.filter(s => s.userId !== currentUserId);
                userSettingsPayload = [...otherUsersRemoteSettings, ...currentUserLocalSettings];
            } else {
                toast.error("Kein Benutzer ausgewählt. Synchronisierung abgebrochen.");
                setSyncStatus('error');
                setSyncError("Kein Benutzer ausgewählt.");
                syncInProgressRef.current = false;
                return;
            }

            const remoteData: ReadApiResponse = await apiPost('/api/sheets/write', {
                groups: rawGroups,
                categories: rawCategories,
                transactions: rawTransactions, recurring: rawRecurringTransactions,
                tags: rawAllAvailableTags, users: rawUsers, userSettings: userSettingsPayload,
            });
            
            const mergedCategories = mergeItems<Category>(rawCategories, remoteData.categories);
            const mergedGroups = mergeItems<Group>(rawGroups, remoteData.groups);
            setCategoriesAndGroups(mergedCategories, mergedGroups);
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
        isDemoModeEnabled, setIsInitialSetupDone, rawCategories, rawGroups, rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers, rawUserSettings,
        handleMergeConflicts, setLastSync, setCategoriesAndGroups, setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setUserSettings,
        currentUserId
    ]);

    const loadFromSheet = useCallback(async () => {
        if (syncInProgressRef.current || isDemoModeEnabled) return;
        syncInProgressRef.current = true;
        setSyncStatus('loading');
        setSyncError(null);

        try {
            const data: ReadApiResponse = await apiGet('/api/sheets/read');
            setCategoriesAndGroups(data.categories, data.groups);
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
    }, [isDemoModeEnabled, setCategoriesAndGroups, setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setUserSettings, setLastSync]);


    useEffect(() => {
        if (syncStatus === 'success' || syncStatus === 'error' || syncStatus === 'conflict') {
            const timer = setTimeout(() => setSyncStatus('idle'), 4000);
            return () => clearTimeout(timer);
        }
    }, [syncStatus]);

    useEffect(() => {
        if (syncPromptDismissedUntil && Date.now() < syncPromptDismissedUntil) {
            return;
        }
        if (isInitialSetupDone && !lastSync && !isDemoModeEnabled) {
            loadFromSheet();
        }
        else if (lastSync && !isAutoSyncEnabled && !isDemoModeEnabled && (Date.now() - new Date(lastSync).getTime() > 5 * 60 * 60 * 1000)) {
            setIsSyncRecommended(true);
        }
    }, [isInitialSetupDone, isAutoSyncEnabled, lastSync, loadFromSheet, isDemoModeEnabled, syncPromptDismissedUntil]);


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
        dismissSyncPrompt,
        syncData,
        loadFromSheet,
    };
};