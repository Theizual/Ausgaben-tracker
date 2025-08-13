import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { Transaction, RecurringTransaction, Tag, CategoryId, TransactionGroup } from '@/shared/types';
import { addMonths, addYears, isSameDay, parseISO, isWithinInterval, isValid, format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { generateUUID } from '@/shared/utils/uuid';
import { FIXED_COSTS_GROUP_ID } from '@/constants';
import { getCategories } from '@/shared/config/taxonomy';
import type { DemoData } from '@/processes/onboarding/model/demo.seed';

// --- CONSTANTS & HELPERS ---
const TAG_MIN_LENGTH = 1;
const TAG_MAX_LENGTH = 40;
const normalizeTagName = (name: string): string => name.trim().toLowerCase();
const MAX_RECURRING_ITERATIONS = 100;
const sortTransactions = (transactions: Transaction[]): Transaction[] => 
    [...transactions].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

// --- STATE MANAGEMENT ---
type DataState = { transactions: Transaction[]; tags: Tag[]; recurring: RecurringTransaction[]; transactionGroups: TransactionGroup[]; };
type Action =
    | { type: 'SET_ALL_DATA'; payload: { transactions: Transaction[]; tags: Tag[]; recurring: RecurringTransaction[]; transactionGroups: TransactionGroup[] } }
    | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
    | { type: 'UPDATE_MULTIPLE_TRANSACTIONS'; payload: Transaction[] }
    | { type: 'SET_TAGS'; payload: Tag[] }
    | { type: 'SET_RECURRING'; payload: RecurringTransaction[] }
    | { type: 'SET_TRANSACTION_GROUPS'; payload: TransactionGroup[] }
    | { type: 'ADD_TRANSACTION'; payload: Transaction }
    | { type: 'ADD_MULTIPLE_TRANSACTIONS'; payload: Transaction[] }
    | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
    | { type: 'ADD_RECURRING'; payload: RecurringTransaction }
    | { type: 'UPDATE_RECURRING'; payload: RecurringTransaction }
    | { type: 'UPSERT_TRANSACTION_GROUP'; payload: TransactionGroup }
    | { type: 'ADD_TAGS'; payload: Tag[] }
    | { type: 'UPDATE_TAG'; payload: Tag }
    | { type: 'PROCESS_RECURRING_UPDATES'; payload: { newTransactions: Transaction[], updatedRecurring: RecurringTransaction[] } };

const dataReducer = (state: DataState, action: Action): DataState => {
    switch (action.type) {
        case 'SET_ALL_DATA': return { ...state, transactions: sortTransactions(action.payload.transactions), tags: action.payload.tags, recurring: action.payload.recurring, transactionGroups: action.payload.transactionGroups || [] };
        case 'SET_TRANSACTIONS': return { ...state, transactions: sortTransactions(action.payload) };
        case 'UPDATE_MULTIPLE_TRANSACTIONS': {
            const updatesMap = new Map(action.payload.map(t => [t.id, t]));
            return {
                ...state,
                transactions: sortTransactions(state.transactions.map(t => updatesMap.get(t.id) || t)),
            };
        }
        case 'SET_TAGS': return { ...state, tags: action.payload };
        case 'SET_RECURRING': return { ...state, recurring: action.payload };
        case 'SET_TRANSACTION_GROUPS': return { ...state, transactionGroups: action.payload };
        case 'ADD_TRANSACTION': return { ...state, transactions: sortTransactions([...state.transactions, action.payload]) };
        case 'ADD_MULTIPLE_TRANSACTIONS': return { ...state, transactions: sortTransactions([...state.transactions, ...action.payload]) };
        case 'UPDATE_TRANSACTION': return { ...state, transactions: sortTransactions(state.transactions.map(t => t.id === action.payload.id ? action.payload : t)) };
        case 'ADD_RECURRING': return { ...state, recurring: [...state.recurring, action.payload] };
        case 'UPDATE_RECURRING': return { ...state, recurring: state.recurring.map(r => r.id === action.payload.id ? action.payload : r) };
        case 'UPSERT_TRANSACTION_GROUP': {
            const newGroup = action.payload;
            const existingIndex = state.transactionGroups.findIndex(g => g.id === newGroup.id);
            if (existingIndex > -1) {
                const newGroups = [...state.transactionGroups];
                newGroups[existingIndex] = newGroup;
                return { ...state, transactionGroups: newGroups };
            }
            return { ...state, transactionGroups: [...state.transactionGroups, newGroup] };
        }
        case 'ADD_TAGS': {
             const newTags = action.payload.filter(newTag => !state.tags.some(existing => existing.id === newTag.id));
             if (newTags.length === 0) return state;
             return { ...state, tags: [...state.tags, ...newTags].sort((a,b) => a.name.localeCompare(b.name, 'de-DE')) };
        }
        case 'UPDATE_TAG': {
            const updatedTag = action.payload;
            const transactionsWithUpdatedTag = state.transactions.map(t => {
                if(t.tagIds?.includes(updatedTag.id) && updatedTag.isDeleted){
                     return { ...t, tagIds: t.tagIds.filter(id => id !== updatedTag.id), lastModified: new Date().toISOString(), version: (t.version || 0) + 1 };
                }
                return t;
            })
             return { ...state, tags: state.tags.map(t => t.id === updatedTag.id ? updatedTag : t).sort((a,b) => a.name.localeCompare(b.name, 'de-DE')), transactions: transactionsWithUpdatedTag };
        }
        case 'PROCESS_RECURRING_UPDATES':
            return { ...state, transactions: sortTransactions([...state.transactions, ...action.payload.newTransactions]), recurring: state.recurring.map(orig => action.payload.updatedRecurring.find(upd => upd.id === orig.id) || orig) };
        default: return state;
    }
};

const createInitialRecurringTransactions = (): RecurringTransaction[] => {
    const now = new Date();
    const startDate = now.toISOString().split('T')[0];
    const lastModified = now.toISOString();

    const defaultAmounts: Record<string, number> = {
        'catId_00037': 1000,
        'catId_00038': 200,
        'catId_00039': 100,
    };

    // Use the new taxonomy as the source of truth, create entries with amount 0
    return getCategories()
        .filter(cat => cat.groupId === FIXED_COSTS_GROUP_ID)
        .map(cat => ({
            id: `rec_${cat.id}`, // A predictable ID
            amount: defaultAmounts[cat.id] || 0,
            description: cat.name,
            categoryId: cat.id,
            frequency: 'monthly' as const,
            startDate: startDate,
            lastModified: lastModified,
            version: 1,
        }));
};

const makeInitializer = (isDemoMode: boolean): (() => DataState) => () => {
    const prefix = isDemoMode ? 'demo_' : '';
    const T_KEY = `${prefix}transactions`;
    const TAGS_KEY = `${prefix}allAvailableTags`;
    const R_KEY = `${prefix}recurringTransactions`;
    const TGRP_KEY = `${prefix}transactionGroups`;
    
    try {
        const storedTransactions = JSON.parse(window.localStorage.getItem(T_KEY) || '[]') as Transaction[];
        const storedTags = JSON.parse(window.localStorage.getItem(TAGS_KEY) || '[]') as Tag[];
        // Use 'null' as default to distinguish between "not set" and "empty array"
        const storedRecurring = JSON.parse(window.localStorage.getItem(R_KEY) || 'null') as RecurringTransaction[] | null;
        const storedTransactionGroups = JSON.parse(window.localStorage.getItem(TGRP_KEY) || '[]') as TransactionGroup[];
        
        if (!Array.isArray(storedTransactions) || !Array.isArray(storedTags) || !Array.isArray(storedTransactionGroups)) {
             // If basic data is corrupt, start completely fresh
            return { transactions: [], tags: [], recurring: createInitialRecurringTransactions(), transactionGroups: [] };
        }

        // Only create initial recurring if they have never been set before.
        const recurring = Array.isArray(storedRecurring) 
            ? storedRecurring 
            : createInitialRecurringTransactions();

        return { transactions: sortTransactions(storedTransactions), tags: storedTags, recurring: recurring, transactionGroups: storedTransactionGroups };
    } catch (error) {
        // Fallback in case of any parsing error
        return { transactions: [], tags: [], recurring: createInitialRecurringTransactions(), transactionGroups: [] };
    }
};

interface useTransactionDataProps { 
    showConfirmation: (data: { transactions: Transaction[]; totalSpentBefore: number }) => void; 
    closeTransactionDetail: () => void; 
    currentUserId: string | null; 
    isDemoModeEnabled: boolean; 
    addRecentCategory: (categoryId: CategoryId) => void; 
    showDemoData: boolean;
}

export const useTransactionData = ({ showConfirmation, closeTransactionDetail, currentUserId, isDemoModeEnabled, addRecentCategory, showDemoData }: useTransactionDataProps) => {
    const prefix = isDemoModeEnabled ? 'demo_' : '';
    const T_KEY = `${prefix}transactions`;
    const TAGS_KEY = `${prefix}allAvailableTags`;
    const R_KEY = `${prefix}recurringTransactions`;
    const TGRP_KEY = `${prefix}transactionGroups`;

    const initializer = useMemo(() => makeInitializer(isDemoModeEnabled), [isDemoModeEnabled]);
    const [rawState, dispatch] = useReducer(dataReducer, undefined, initializer);
    const [demoData, setDemoData] = useState<DemoData | null>(null);

    // Lazy-load demo data
    useEffect(() => {
        if (isDemoModeEnabled) {
            import('@/processes/onboarding/model/demo.seed')
                .then(module => {
                    setDemoData(module.getDemoData());
                })
                .catch(err => console.error("Failed to load demo data:", err));
        } else {
            // Clear demo data if mode is disabled
            setDemoData(null);
        }
    }, [isDemoModeEnabled]);

    useEffect(() => { window.localStorage.setItem(T_KEY, JSON.stringify(rawState.transactions)); }, [rawState.transactions, T_KEY]);
    useEffect(() => { window.localStorage.setItem(TAGS_KEY, JSON.stringify(rawState.tags)); }, [rawState.tags, TAGS_KEY]);
    useEffect(() => { window.localStorage.setItem(R_KEY, JSON.stringify(rawState.recurring)); }, [rawState.recurring, R_KEY]);
    useEffect(() => { window.localStorage.setItem(TGRP_KEY, JSON.stringify(rawState.transactionGroups)); }, [rawState.transactionGroups, TGRP_KEY]);

    const liveTransactions = useMemo(() => rawState.transactions.filter(t => !t.isDeleted), [rawState.transactions]);
    const liveTags = useMemo(() => rawState.tags.filter(t => !t.isDeleted), [rawState.tags]);
    const liveTransactionGroups = useMemo(() => rawState.transactionGroups.filter(g => !g.isDeleted), [rawState.transactionGroups]);
    
    const transactions = useMemo(() => {
        return showDemoData && demoData
            ? sortTransactions([...demoData.transactions, ...liveTransactions])
            : liveTransactions;
    }, [liveTransactions, showDemoData, demoData]);
    
    const allAvailableTags = useMemo(() => {
        return showDemoData && demoData
            ? [...demoData.tags, ...liveTags]
            : liveTags;
    }, [liveTags, showDemoData, demoData]);

    const recurringTransactions = useMemo(() => rawState.recurring.filter(r => !r.isDeleted), [rawState.recurring]);
    const tagMap = useMemo(() => new Map(allAvailableTags.map(t => [t.id, t.name])), [allAvailableTags]);
    
    const selectTotalSpentForMonth = useMemo(() => {
        const cache = new Map<string, number>();
        return (date: Date): number => {
            const key = format(date, 'yyyy-MM');
            if (cache.has(key)) return cache.get(key)!;
            const monthInterval = { start: startOfMonth(date), end: endOfMonth(date) };
            const total = transactions.filter(t => { try { return isWithinInterval(parseISO(t.date), monthInterval); } catch { return false; } }).reduce((sum, t) => sum + t.amount, 0);
            cache.set(key, total);
            return total;
        };
    }, [transactions]);
    const totalSpentThisMonth = useMemo(() => selectTotalSpentForMonth(new Date()), [selectTotalSpentForMonth]);
    
    const getOrCreateTagIds = useCallback((tagNames?: string[]): string[] => {
        if (!tagNames || tagNames.length === 0) return [];
        const newTagsToCreate: Tag[] = [];
        const resultingTagIds = new Set<string>();
        const now = new Date().toISOString();
        const currentTagMapByNormalizedName = new Map(rawState.tags.map(t => [normalizeTagName(t.name), t]));

        for (const name of new Set(tagNames)) {
            const trimmedName = name.trim();
            if (trimmedName.length < TAG_MIN_LENGTH || trimmedName.length > TAG_MAX_LENGTH) continue;
            const normalizedName = normalizeTagName(trimmedName);
            const existingTag = currentTagMapByNormalizedName.get(normalizedName);
            if (existingTag) {
                if (existingTag.isDeleted) {
                    const undeletedTag = { ...existingTag, name: trimmedName, isDeleted: false, lastModified: now, version: (existingTag.version || 0) + 1 };
                    dispatch({ type: 'UPDATE_TAG', payload: undeletedTag });
                    resultingTagIds.add(undeletedTag.id);
                } else {
                    resultingTagIds.add(existingTag.id);
                }
            } else {
                const newTag: Tag = { id: generateUUID('tag'), name: trimmedName, lastModified: now, version: 1 };
                newTagsToCreate.push(newTag);
                resultingTagIds.add(newTag.id);
            }
        }
        if (newTagsToCreate.length > 0) dispatch({ type: 'ADD_TAGS', payload: newTagsToCreate });
        return Array.from(resultingTagIds);
    }, [rawState.tags]);
    
    const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'date' | 'tagIds' | 'lastModified' | 'version' | 'createdBy'> & { tags?: string[] }) => {
        const totalSpentBefore = selectTotalSpentForMonth(new Date());
        const now = new Date().toISOString();
        const newTransaction: Transaction = { ...transaction, id: generateUUID('tx'), date: now, lastModified: now, version: 1, tagIds: getOrCreateTagIds(transaction.tags), createdBy: currentUserId || undefined };
        dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
        showConfirmation({ transactions: [newTransaction], totalSpentBefore });
        addRecentCategory(newTransaction.categoryId);
    }, [getOrCreateTagIds, showConfirmation, currentUserId, selectTotalSpentForMonth, addRecentCategory]);

    const addMultipleTransactions = useCallback((transactionsToCreate: Array<{amount: number, description: string}>, commonData: { categoryId: string, tags?: string[] }) => {
        const totalSpentBefore = selectTotalSpentForMonth(new Date());
        const now = new Date().toISOString();
        const tagIds = getOrCreateTagIds(commonData.tags);
        const transactionGroupId = generateUUID('tgrp');
        const newTransactions: Transaction[] = transactionsToCreate.map(t => ({ ...t, id: generateUUID('tx'), date: now, lastModified: now, version: 1, categoryId: commonData.categoryId, tagIds, createdBy: currentUserId || undefined, transactionGroupId }));
        dispatch({ type: 'ADD_MULTIPLE_TRANSACTIONS', payload: newTransactions });
        showConfirmation({ transactions: newTransactions, totalSpentBefore });
        addRecentCategory(commonData.categoryId);
    }, [getOrCreateTagIds, showConfirmation, currentUserId, selectTotalSpentForMonth, addRecentCategory]);

    const updateTransaction = useCallback((transaction: Transaction, tags?: string[] | null) => {
        let finalTransaction: Transaction = { ...transaction, lastModified: new Date().toISOString(), version: (transaction.version || 0) + 1 };
        if (tags !== undefined) finalTransaction.tagIds = getOrCreateTagIds(tags || []);
        dispatch({ type: 'UPDATE_TRANSACTION', payload: finalTransaction });
    }, [getOrCreateTagIds]);

    const deleteTransaction = useCallback((id: string) => {
        const transaction = rawState.transactions.find(t => t.id === id);
        if (transaction) {
            const deletedTransaction = { ...transaction, isDeleted: true, lastModified: new Date().toISOString(), version: (transaction.version || 0) + 1 };
            dispatch({ type: 'UPDATE_TRANSACTION', payload: deletedTransaction });
            closeTransactionDetail();
            toast.success('Transaktion gelöscht!');
        }
    }, [rawState.transactions, closeTransactionDetail]);

    const deleteMultipleTransactions = useCallback((ids: string[]) => {
        if (ids.length === 0) return;
        const now = new Date().toISOString();
        const updatedTransactions = rawState.transactions.map(t => ids.includes(t.id) ? { ...t, isDeleted: true, lastModified: now, version: (t.version || 0) + 1 } : t);
        dispatch({ type: 'SET_TRANSACTIONS', payload: updatedTransactions });
        toast.success(`${ids.length} ${ids.length > 1 ? 'Einträge' : 'Eintrag'} gelöscht.`);
    }, [rawState.transactions]);

    const reassignCategoryForTransactions = useCallback((sourceId: string, targetId: string) => {
        if (!sourceId || !targetId) return;
        const now = new Date().toISOString();
        const updatedTransactions = rawState.transactions.map(t => 
            t.categoryId === sourceId
            ? { ...t, categoryId: targetId, lastModified: now, version: (t.version || 0) + 1 }
            : t
        );
        dispatch({ type: 'SET_TRANSACTIONS', payload: updatedTransactions });
    }, [rawState.transactions]);
    
    const reassignUserForTransactions = useCallback((sourceUserId: string, targetUserId: string, onlyNonDemo: boolean = false) => {
        if (!sourceUserId || !targetUserId) return;
        const now = new Date().toISOString();
        const updatedTransactions = rawState.transactions.map(t => 
            (t.createdBy === sourceUserId && (!onlyNonDemo || !t.isDemo))
            ? { ...t, createdBy: targetUserId, lastModified: now, version: (t.version || 0) + 1 }
            : t
        );
        dispatch({ type: 'SET_TRANSACTIONS', payload: updatedTransactions });
    }, [rawState.transactions]);

    const addRecurringTransaction = useCallback((item: Omit<RecurringTransaction, 'id' | 'lastModified' | 'version'>, id: string) => {
        const newRec: RecurringTransaction = { ...item, id: id.startsWith('rec_') ? id : generateUUID('rec'), lastModified: new Date().toISOString(), version: 1 };
        dispatch({ type: 'ADD_RECURRING', payload: newRec });
    }, []);
    
    const updateRecurringTransaction = useCallback((item: RecurringTransaction) => {
        const updatedRec: RecurringTransaction = { ...item, lastModified: new Date().toISOString(), version: (item.version || 0) + 1 };
        dispatch({ type: 'UPDATE_RECURRING', payload: updatedRec });
    }, []);

    const deleteRecurringTransaction = useCallback((id: string) => {
        const item = rawState.recurring.find(r => r.id === id);
        if (item) dispatch({ type: 'UPDATE_RECURRING', payload: { ...item, isDeleted: true, lastModified: new Date().toISOString(), version: (item.version || 0) + 1 } });
    }, [rawState.recurring]);

    const handleUpdateTag = useCallback((tagId: string, newName: string) => {
        const trimmedNewName = newName.trim();
        if (trimmedNewName.length < TAG_MIN_LENGTH || trimmedNewName.length > TAG_MAX_LENGTH) return;
        const existingTag = rawState.tags.find(t => t.id === tagId);
        if (!existingTag) return;
        const normalizedNewName = normalizeTagName(trimmedNewName);
        if (rawState.tags.some(t => normalizeTagName(t.name) === normalizedNewName && t.id !== tagId && !t.isDeleted)) {
            toast.error(`Der Tag "${trimmedNewName}" existiert bereits.`);
            return;
        }
        const updatedTag: Tag = { ...existingTag, name: trimmedNewName, lastModified: new Date().toISOString(), version: (existingTag.version || 0) + 1 };
        dispatch({ type: 'UPDATE_TAG', payload: updatedTag });
        toast.success(`Tag umbenannt in "${trimmedNewName}"`);
    }, [rawState.tags]);

    const handleDeleteTag = useCallback((tagId: string) => {
        const tag = rawState.tags.find(t => t.id === tagId);
        if (tag) {
            const deletedTag: Tag = { ...tag, isDeleted: true, lastModified: new Date().toISOString(), version: (tag.version || 0) + 1 };
            dispatch({ type: 'UPDATE_TAG', payload: deletedTag });
            toast.success(`Tag "${tag.name}" gelöscht`);
        }
    }, [rawState.tags]);

    useEffect(() => {
        const newTransactions: Transaction[] = [];
        const updatedRecurring: RecurringTransaction[] = [];
        const now = new Date();
        rawState.recurring.forEach(rec => {
            if (rec.isDeleted) return;
            let lastDate;
            try { lastDate = rec.lastProcessedDate ? parseISO(rec.lastProcessedDate) : parseISO(rec.startDate); if (!isValid(lastDate)) throw new Error("Invalid date"); } catch (e) { return; }
            let hasChanged = false; let iterations = 0;
            while (iterations < MAX_RECURRING_ITERATIONS) {
                const nextDueDate = rec.frequency === 'monthly' ? addMonths(lastDate, 1) : addYears(lastDate, 1);
                if (!isValid(nextDueDate) || nextDueDate > now) break;
                if (nextDueDate >= parseISO(rec.startDate)) {
                    if (!rawState.transactions.some(t => !t.isDeleted && t.recurringId === rec.id && isSameDay(parseISO(t.date), nextDueDate))) {
                        newTransactions.push({ id: generateUUID('tx'), amount: rec.amount, description: rec.description, categoryId: rec.categoryId, date: nextDueDate.toISOString(), recurringId: rec.id, lastModified: new Date().toISOString(), version: 1 });
                    }
                }
                lastDate = nextDueDate; hasChanged = true; iterations++;
            }
            if (hasChanged) updatedRecurring.push({ ...rec, lastProcessedDate: lastDate.toISOString(), lastModified: new Date().toISOString(), version: (rec.version || 0) + 1 });
        });
        if (newTransactions.length > 0 || updatedRecurring.length > 0) {
            dispatch({ type: 'PROCESS_RECURRING_UPDATES', payload: { newTransactions, updatedRecurring } });
        }
    }, [rawState.recurring, rawState.transactions]);

    const createTransactionGroup = useCallback((transactionIds: string[]) => {
        if (transactionIds.length < 2) return;
        const now = new Date().toISOString();
        const transactionsInGroup = rawState.transactions.filter(t => transactionIds.includes(t.id));
        if (transactionsInGroup.some(t => t.transactionGroupId)) {
            toast.error("Einige Transaktionen gehören bereits zu einer Gruppe.");
            return;
        }
        const targetAmount = transactionsInGroup.reduce((sum, t) => sum + t.amount, 0);
        const newGroup: TransactionGroup = { id: generateUUID('tgrp'), targetAmount, createdAt: now, lastModified: now, version: 1 };
        const updatedTransactions = transactionsInGroup.map(t => ({ ...t, transactionGroupId: newGroup.id, groupBaseAmount: t.amount, isCorrected: false, lastModified: now, version: (t.version || 0) + 1 }));
        dispatch({ type: 'UPSERT_TRANSACTION_GROUP', payload: newGroup });
        dispatch({ type: 'UPDATE_MULTIPLE_TRANSACTIONS', payload: updatedTransactions });
        toast.success("Transaktionsgruppe erstellt.");
    }, [rawState.transactions]);

    const addTransactionsToGroup = useCallback((groupId: string, transactionIds: string[]) => {
        const group = rawState.transactionGroups.find(g => g.id === groupId);
        if (!group) return;
        const now = new Date().toISOString();
        const transactionsToAdd = rawState.transactions.filter(t => transactionIds.includes(t.id) && !t.transactionGroupId);
        if (transactionsToAdd.length === 0) return;
        const newTargetAmount = group.targetAmount + transactionsToAdd.reduce((sum, t) => sum + t.amount, 0);
        const updatedGroup = { ...group, targetAmount: newTargetAmount, lastModified: now, version: (group.version || 0) + 1 };
        const updatedTransactions = transactionsToAdd.map(t => ({ ...t, transactionGroupId: groupId, groupBaseAmount: t.amount, isCorrected: false, lastModified: now, version: (t.version || 0) + 1 }));
        dispatch({ type: 'UPSERT_TRANSACTION_GROUP', payload: updatedGroup });
        dispatch({ type: 'UPDATE_MULTIPLE_TRANSACTIONS', payload: updatedTransactions });
        toast.success(`${transactionIds.length} Transaktion(en) zur Gruppe hinzugefügt.`);
    }, [rawState.transactions, rawState.transactionGroups]);

    const removeTransactionFromGroup = useCallback((transactionId: string) => {
        const transaction = rawState.transactions.find(t => t.id === transactionId);
        if (!transaction?.transactionGroupId) return;
        
        const now = new Date().toISOString();
        const updatedTransaction: Transaction = { ...transaction, transactionGroupId: undefined, groupBaseAmount: undefined, isCorrected: undefined, lastModified: now, version: (transaction.version || 0) + 1 };
        
        const group = rawState.transactionGroups.find(g => g.id === transaction.transactionGroupId);
        if (group) {
            const members = rawState.transactions.filter(t => t.transactionGroupId === group.id && t.id !== transactionId);
            if (members.length < 2) {
                const updatedMembers = members.map(m => ({ ...m, transactionGroupId: undefined, groupBaseAmount: undefined, isCorrected: undefined, lastModified: now, version: (m.version || 0) + 1 }));
                const updatedGroup = { ...group, isDeleted: true, lastModified: now, version: (group.version || 0) + 1 };
                dispatch({ type: 'UPDATE_MULTIPLE_TRANSACTIONS', payload: [updatedTransaction, ...updatedMembers] });
                dispatch({ type: 'UPSERT_TRANSACTION_GROUP', payload: updatedGroup });
                 toast.success("Gruppe aufgelöst.");
            } else {
                const newTargetAmount = group.targetAmount - transaction.amount;
                const updatedGroup = { ...group, targetAmount: newTargetAmount, lastModified: now, version: (group.version || 0) + 1 };
                dispatch({ type: 'UPDATE_TRANSACTION', payload: updatedTransaction });
                dispatch({ type: 'UPSERT_TRANSACTION_GROUP', payload: updatedGroup });
                 toast.success("Transaktion aus Gruppe entfernt.");
            }
        } else {
            dispatch({ type: 'UPDATE_TRANSACTION', payload: updatedTransaction });
        }
    }, [rawState.transactions, rawState.transactionGroups]);

     const updateTransactionInGroup = useCallback((transactionId: string, newAmount: number) => {
        const transaction = rawState.transactions.find(t => t.id === transactionId);
        if (!transaction?.transactionGroupId) return;
        const groupId = transaction.transactionGroupId;
        const group = rawState.transactionGroups.find(g => g.id === groupId);
        if (!group) return;

        const now = new Date().toISOString();
        const members = rawState.transactions.filter(t => t.transactionGroupId === groupId);
        
        const updatedTransaction = { ...transaction, amount: newAmount, isCorrected: true, lastModified: now, version: (transaction.version || 0) + 1, groupBaseAmount: transaction.groupBaseAmount === undefined ? transaction.amount : transaction.groupBaseAmount };
        const otherMembers = members.filter(t => t.id !== transactionId);
        const correctedMembers = [...otherMembers.filter(t => t.isCorrected), updatedTransaction];
        const uncorrectedMembers = otherMembers.filter(t => !t.isCorrected);
        const sumCorrected = correctedMembers.reduce((sum, t) => sum + t.amount, 0);
        const remainingTarget = group.targetAmount - sumCorrected;
        const sumUncorrectedBase = uncorrectedMembers.reduce((sum, t) => sum + (t.groupBaseAmount || t.amount), 0);
        const updatedTransactions = [updatedTransaction];

        if (sumUncorrectedBase > 0) {
            let distributedAmount = 0;
            uncorrectedMembers.forEach((t, index) => {
                const isLast = index === uncorrectedMembers.length - 1;
                const newTxAmount = isLast ? remainingTarget - distributedAmount : Math.round(remainingTarget * ((t.groupBaseAmount || t.amount) / sumUncorrectedBase) * 100) / 100;
                distributedAmount += newTxAmount;
                updatedTransactions.push({ ...t, amount: newTxAmount, lastModified: now, version: (t.version || 0) + 1 });
            });
        } else if (uncorrectedMembers.length > 0) {
            const amountPerTx = remainingTarget / uncorrectedMembers.length;
            uncorrectedMembers.forEach(t => updatedTransactions.push({ ...t, amount: amountPerTx, lastModified: now, version: (t.version || 0) + 1 }));
        }
        dispatch({ type: 'UPDATE_MULTIPLE_TRANSACTIONS', payload: updatedTransactions });
    }, [rawState.transactions, rawState.transactionGroups]);
    
    const resetCorrectionInGroup = useCallback((transactionId: string) => {
        const transaction = rawState.transactions.find(t => t.id === transactionId);
        if (!transaction || !transaction.transactionGroupId || !transaction.isCorrected) return;
        
        const now = new Date().toISOString();
        
        // Create a temporary state with the transaction reset
        const tempTransaction = { ...transaction, amount: transaction.groupBaseAmount || transaction.amount, isCorrected: false };
        const tempMembers = rawState.transactions.map(t => t.id === transactionId ? tempTransaction : t);

        const groupId = transaction.transactionGroupId;
        const group = rawState.transactionGroups.find(g => g.id === groupId);
        if (!group) return;

        const members = tempMembers.filter(t => t.transactionGroupId === groupId);
        const correctedMembers = members.filter(t => t.isCorrected);
        const uncorrectedMembers = members.filter(t => !t.isCorrected);
        
        const sumCorrected = correctedMembers.reduce((sum, t) => sum + t.amount, 0);
        const remainingTarget = group.targetAmount - sumCorrected;
        const sumUncorrectedBase = uncorrectedMembers.reduce((sum, t) => sum + (t.groupBaseAmount || t.amount), 0);
        
        const updatedTransactions = [...correctedMembers];

        if (sumUncorrectedBase > 0) {
            let distributedAmount = 0;
            uncorrectedMembers.forEach((t, index) => {
                const isLast = index === uncorrectedMembers.length - 1;
                const newTxAmount = isLast ? remainingTarget - distributedAmount : Math.round(remainingTarget * ((t.groupBaseAmount || t.amount) / sumUncorrectedBase) * 100) / 100;
                distributedAmount += newTxAmount;
                updatedTransactions.push({ ...t, amount: newTxAmount, isCorrected: false, lastModified: now, version: (t.version || 0) + 1 });
            });
        } // Handle other cases if needed

        dispatch({ type: 'UPDATE_MULTIPLE_TRANSACTIONS', payload: updatedTransactions });
        toast.info("Korrektur zurückgesetzt und Beträge neu verteilt.");
    }, [rawState.transactions, rawState.transactionGroups]);
    
    return {
        transactions, recurringTransactions, allAvailableTags, tagMap, selectTotalSpentForMonth, totalSpentThisMonth,
        rawTransactions: rawState.transactions, rawRecurringTransactions: rawState.recurring, rawAllAvailableTags: rawState.tags,
        rawTransactionGroups: rawState.transactionGroups,
        transactionGroups: liveTransactionGroups,
        setTransactions: (data: Transaction[]) => dispatch({type: 'SET_TRANSACTIONS', payload: data}),
        setAllAvailableTags: (data: Tag[]) => dispatch({type: 'SET_TAGS', payload: data}),
        setRecurringTransactions: (data: RecurringTransaction[]) => dispatch({type: 'SET_RECURRING', payload: data}),
        setTransactionGroups: (data: TransactionGroup[]) => dispatch({type: 'SET_TRANSACTION_GROUPS', payload: data}),
        addTransaction, addMultipleTransactions, updateTransaction, deleteTransaction, deleteMultipleTransactions,
        addRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction, handleUpdateTag, handleDeleteTag,
        reassignCategoryForTransactions,
        reassignUserForTransactions,
        createTransactionGroup,
        addTransactionsToGroup,
        removeTransactionFromGroup,
        updateTransactionInGroup,
        resetCorrectionInGroup,
    };
};
