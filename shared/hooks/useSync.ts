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
        isInitialSetupDone, isDemoModeEnabled, setIsInitialSetupDone, currentUserId, appMode,
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
        setSyncStatus(options.isAuto ? 'loading' : 'syncing');
        setSyncError(null);

        try {
            const { data: serverState }: { data: ReadApiResponse } = await apiGet('/api/sheets/read');
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

            const existingModeSetting = rawUserSettings.find(s => s.userId === 'app_meta' && s.key === 'mode');
            const modeSetting: UserSetting = {
                userId: 'app_meta',
                key: 'mode',
                value: appMode,
                lastModified: new Date().toISOString(),
                version: (existingModeSetting?.version || 0) + 1,
            };
            const payloadWithoutMode = userSettingsPayload.filter(s => !(s.userId === 'app_meta' && s.key === 'mode'));
            const finalPayload = [...payloadWithoutMode, modeSetting];

            const { data: remoteData }: { data: ReadApiResponse; migrationMap: Record<string, string> } = await apiPost('/api/sheets/write', {
                groups: rawGroups,
                categories: rawCategories,
                transactions: rawTransactions, recurring: rawRecurringTransactions,
                tags: rawAllAvailableTags, users: rawUsers, userSettings: finalPayload,
            });
            
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
                setSyncError(e.message);
                setSyncStatus('error');
            }
        } finally {
            syncInProgressRef.current = false;
        }
    }, [
        isDemoModeEnabled, isInitialSetupDone, setIsInitialSetupDone, appMode,
        rawCategories, rawGroups, rawTransactions, rawRecurringTransactions, rawAllAvailableTags, rawUsers, rawUserSettings,
        handleMergeConflicts, setLastSync, setCategoriesAndGroups, setTransactions, setRecurringTransactions, setAllAvailableTags, setUsers, setUserSettings,
        currentUserId
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
