
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

function resolveLegacyIds(data: ReadApiResponse): ReadApiResponse {
    const { groups, categories, transactions, recurring, tags } = data || {};

    const buildLegacyMap = (items: ({ id: string; legacyId?: string } | undefined)[] | undefined) => {
        const map = new Map<string, string>();
        (items || []).forEach(item => {
            if (item && item.legacyId && item.id && item.legacyId !== item.id) {
                map.set(item.legacyId, item.id);
            }
        });
        return map;
    };
    
    const groupsLegacyMap = buildLegacyMap(groups);
    const categoriesLegacyMap = buildLegacyMap(categories);
    const recurringLegacyMap = buildLegacyMap(recurring);
    const tagsLegacyMap = buildLegacyMap(tags);
    
    const resolveId = (id: string | undefined, map: Map<string, string>) => (id ? map.get(id) || id : undefined);

    const resolvedCategories = (categories || []).map(cat => ({
        ...cat,
        groupId: resolveId(cat.groupId, groupsLegacyMap)!,
    }));

    const resolvedTransactions = (transactions || []).map(tx => ({
        ...tx,
        categoryId: resolveId(tx.categoryId, categoriesLegacyMap)!,
        recurringId: resolveId(tx.recurringId, recurringLegacyMap),
        tagIds: (tx.tagIds || []).map(id => tagsLegacyMap.get(id) || id).filter(Boolean),
    }));

    const resolvedRecurring = (recurring || []).map(rec => ({
        ...rec,
        categoryId: resolveId(rec.categoryId, categoriesLegacyMap)!,
    }));

    return { ...data, categories: resolvedCategories, transactions: resolvedTransactions, recurring: resolvedRecurring };
}


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
            const localDefaultUserExists = rawUsers.some(u => u.id === 'usrId_0001' && u.name === 'Benutzer' && !u.isDeleted);
            if (localDefaultUserExists) {
                try {
                    const { users: remoteUsersForCheck }: { users?: User[] } = await apiGet('/api/sheets/read?ranges=Users!A2:Z');
                    const liveRemoteUsers = remoteUsersForCheck?.filter(u => !u.isDeleted) || [];
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
            // Push-First Strategy: Send local state to the server directly.
            // The server will overwrite the sheet, read it back, and return the new source of truth.
            // This ensures the user's latest changes are always sent.
            const existingModeSetting = rawUserSettings.find(s => s.userId === 'app_meta' && s.key === 'mode');
            const modeSetting: UserSetting = {
                userId: 'app_meta',
                key: 'mode',
                value: appMode,
                lastModified: new Date().toISOString(),
                version: (existingModeSetting?.version || 0) + 1,
            };
            const payloadWithoutMode = rawUserSettings.filter(s => !(s.userId === 'app_meta' && s.key === 'mode'));

            const { data: remoteData }: { data: ReadApiResponse; migrationMap: Record<string, string> } = await apiPost('/api/sheets/write', {
                groups: rawGroups,
                categories: rawCategories,
                transactions: rawTransactions,
                recurring: rawRecurringTransactions,
                tags: rawAllAvailableTags,
                users: rawUsers,
                userSettings: [...payloadWithoutMode, modeSetting],
            });
            
            const resolvedData = resolveLegacyIds(remoteData);
            setCategoriesAndGroups(resolvedData.categories, resolvedData.groups);
            setTransactions(resolvedData.transactions);
            setRecurringTransactions(resolvedData.recurring);
            setAllAvailableTags(resolvedData.tags);
            setUsers(resolvedData.users);
            setUserSettings(resolvedData.userSettings);

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
        openUserMergeModal
    ]);

    const loadFromSheet = useCallback(async () => {
        if (syncInProgressRef.current || isDemoModeEnabled) return;
        syncInProgressRef.current = true;
        setSyncStatus('loading');
        setSyncError(null);

        try {
            const { data }: { data: ReadApiResponse } = await apiGet('/api/sheets/read');
            const resolvedData = resolveLegacyIds(data);
            setCategoriesAndGroups(resolvedData.categories, resolvedData.groups);
            setTransactions(resolvedData.transactions);
            setRecurringTransactions(resolvedData.recurring);
            setAllAvailableTags(resolvedData.tags);
            setUsers(resolvedData.users);
            setUserSettings(resolvedData.userSettings);
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
