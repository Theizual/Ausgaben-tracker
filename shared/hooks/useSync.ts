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
    appMode: 'demo' | 'standard';
    openUserMergeModal: (users: User[]) => void;
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

/**
 * Translates common Google API errors into user-friendly German messages.
 * @param errorMessage The raw error message from the API.
 * @returns A user-friendly string.
 */
const translateGoogleApiError = (errorMessage: string): string => {
    const lowerCaseError = (errorMessage || '').toLowerCase();

    if (lowerCaseError.includes('permission denied')) {
        return 'Keine Berechtigung für das Google Sheet. Bitte prüfen Sie die Freigabe-Einstellungen für die Service-Account-E-Mail.';
    }
    if (lowerCaseError.includes('unable to parse range') || lowerCaseError.includes('not found')) {
        return 'Ein Tabellenblatt im Google Sheet konnte nicht gefunden werden. Bitte prüfen Sie die Namen der Tabs (z.B. "Transactions", "Categories").';
    }
    if (lowerCaseError.includes('request entity too large')) {
        return 'Die Datenmenge ist zu groß für eine einzelne Anfrage. Bitte versuchen Sie es später erneut.';
    }
    // Return the original message if no specific translation is found
    return errorMessage || 'Ein unbekannter Fehler ist aufgetreten.';
};


export const useSync = (props: SyncProps) => {
    const {
        rawCategories, rawGroups, rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers, rawUserSettings,
        setCategoriesAndGroups, setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setUserSettings,
        isInitialSetupDone, isDemoModeEnabled, setIsInitialSetupDone, currentUserId, appMode, openUserMergeModal
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
        
        if (isDemoModeEnabled && !isInitialSetupDone) {
             if (!window.confirm("Möchten Sie Ihre Demo-Daten in Google Sheets speichern? Dadurch wird eine Verbindung hergestellt und die Synchronisierung aktiviert.")) {
                return;
             }
        }
        
        syncInProgressRef.current = true;
        
        // --- User Merge Check ---
        if (!isInitialSetupDone) {
            const localDemoUserExists = rawUsers.some(u => u.id === 'usr_demo' && u.isDemo && !u.isDeleted);
            if (localDemoUserExists) {
                try {
                    const { users: remoteUsersForCheck }: { users?: User[] } = await apiGet('/api/sheets/read?ranges=Users!A2:Z');
                    const liveRemoteUsers = remoteUsersForCheck?.filter(u => !u.isDeleted && !u.isDemo) || [];
                    if (liveRemoteUsers.length > 0) {
                        openUserMergeModal(liveRemoteUsers);
                        syncInProgressRef.current = false;
                        setSyncStatus('idle');
                        return; // Abort sync until user resolves the merge
                    }
                } catch (e: any) {
                     toast.error(`Fehler beim Abrufen der Benutzer: ${e.message}`);
                     syncInProgressRef.current = false;
                     setSyncStatus('error');
                     return;
                }
            }
        }
        
        setSyncStatus(options.isAuto ? 'loading' : 'syncing');
        setSyncError(null);

        try {
            // Push-First Strategy: Send local state to the server.
            // The server will overwrite the sheet, read it back, and return the new source of truth.
            // We explicitly filter out the 'app_meta' mode setting to prevent the client from overwriting it.
            // The Google Sheet is the single source of truth for the app's mode.
            const userSettingsForPayload = rawUserSettings.filter(
                s => !(s.userId === 'app_meta' && s.key === 'mode')
            );

            const payload = {
                groups: rawGroups,
                categories: rawCategories,
                transactions: rawTransactions.filter(t => !t.isDemo),
                recurring: rawRecurringTransactions,
                tags: rawAllAvailableTags.filter(t => !t.isDemo),
                users: rawUsers,
                userSettings: userSettingsForPayload,
            };

            const { data: remoteData }: { data: ReadApiResponse; migrationMap: Record<string, string> } = await apiPost('/api/sheets/write', payload);
            
            setCategoriesAndGroups(remoteData.categories, remoteData.groups);
            setTransactions(remoteData.transactions);
            setRecurringTransactions(remoteData.recurring);
            setAllAvailableTags(remoteData.tags);
            setUsers(remoteData.users);
            setUserSettings(remoteData.userSettings);

            setLastSync(new Date().toISOString());
            setSyncStatus('success');

            if (!isInitialSetupDone) {
                setIsInitialSetupDone(true);
            }
        } catch (e: any) {
            if (e instanceof HttpError && e.status === 409) {
                if (e.body?.conflicts) {
                    await handleMergeConflicts(e.body.conflicts);
                } else {
                    setSyncError('Conflict error, but no conflict data received.');
                    setSyncStatus('error');
                }
            } else {
                const detailedMessage = translateGoogleApiError(e.message);
                setSyncError(detailedMessage);
                setSyncStatus('error');
            }
        } finally {
            syncInProgressRef.current = false;
        }
    }, [
        isDemoModeEnabled, isInitialSetupDone, setIsInitialSetupDone,
        rawCategories, rawGroups, rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers, rawUserSettings,
        handleMergeConflicts, setLastSync, setCategoriesAndGroups, setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setUserSettings,
        openUserMergeModal
    ]);

    const loadFromSheet = useCallback(async () => {
        if (syncInProgressRef.current || isDemoModeEnabled) return;
        syncInProgressRef.current = true;
        setSyncStatus('loading');
        setSyncError(null);

        try {
            const { data }: { data: ReadApiResponse } = await apiGet('/api/sheets/read');
            setCategoriesAndGroups(data.categories, data.groups);
            setTransactions(data.transactions);
            setRecurringTransactions(data.recurring);
            setAllAvailableTags(data.tags);
            setUsers(data.users);
            setUserSettings(data.userSettings);
            setLastSync(new Date().toISOString());
            setSyncStatus('success');
        } catch (e: any) {
            const detailedMessage = translateGoogleApiError(e.message);
            setSyncError(detailedMessage);
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

    // Effect for periodic background refresh (pulling data from the sheet)
    useEffect(() => {
        if (!isAutoSyncEnabled || isDemoModeEnabled || !isInitialSetupDone) {
            return; // Do nothing if auto-sync is off, in demo mode, or setup isn't done
        }

        const intervalId = setInterval(() => {
            // The loadFromSheet function already prevents running if a sync is in progress
            console.log('Performing periodic background data refresh...');
            loadFromSheet();
        }, 60000); // Poll every 60 seconds

        return () => {
            clearInterval(intervalId); // Cleanup on unmount or when deps change
        };
    }, [isAutoSyncEnabled, isDemoModeEnabled, isInitialSetupDone, loadFromSheet]);


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