import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { Transaction, RecurringTransaction, Tag, CategoryId, TransactionGroup, Category } from '@/shared/types';
import { addMonths, addYears, isSameDay, parseISO, isWithinInterval, isValid, format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { generateUUID } from '@/shared/utils/uuid';
import { FIXED_COSTS_GROUP_ID } from '@/constants';
import { getCategories } from '@/shared/config/taxonomy';
import { generateRichDemoData, RichDemoData } from '@/processes/onboarding/model/demo.seed';

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
    | { type: 'SET_ALL_DATA'; payload: { transactions: Transaction[]; tags: Tag[]; recurring: RecurringTransaction[], transactionGroups: TransactionGroup[] } }
    | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
    | { type: 'SET_TAGS'; payload: Tag[] }
    | { type: 'SET_RECURRING'; payload: RecurringTransaction[] }
    | { type: 'SET_TRANSACTION_GROUPS'; payload: TransactionGroup[] }
    | { type: 'ADD_TRANSACTION'; payload: Transaction }
    | { type: 'ADD_MULTIPLE_TRANSACTIONS'; payload: Transaction[] }
    | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
    | { type: 'UPDATE_MULTIPLE_TRANSACTIONS'; payload: Transaction[] }
    | { type: 'UPSERT_TRANSACTION_GROUP'; payload: TransactionGroup }
    | { type: 'ADD_RECURRING'; payload: RecurringTransaction }
    | { type: 'UPDATE_RECURRING'; payload: RecurringTransaction }
    | { type: 'ADD_TAGS'; payload: Tag[] }
    | { type: 'UPDATE_TAG'; payload: Tag }
    | { type: 'PROCESS_RECURRING_UPDATES'; payload: { newTransactions: Transaction[], updatedRecurring: RecurringTransaction[] } };

const dataReducer = (state: DataState, action: Action): DataState => {
    switch (action.type) {
        case 'SET_ALL_DATA': return { ...state, transactions: sortTransactions(action.payload.transactions), tags: action.payload.tags, recurring: action.payload.recurring, transactionGroups: action.payload.transactionGroups };
        case 'SET_TRANSACTIONS': return { ...state, transactions: sortTransactions(action.payload) };
        case 'SET_TAGS': return { ...state, tags: action.payload };
        case 'SET_RECURRING': return { ...state, recurring: action.payload };
        case 'SET_TRANSACTION_GROUPS': return { ...state, transactionGroups: action.payload };
        case 'ADD_TRANSACTION': return { ...state, transactions: sortTransactions([...state.transactions, action.payload]) };
        case 'ADD_MULTIPLE_TRANSACTIONS': return { ...state, transactions: sortTransactions([...state.transactions, ...action.payload]) };
        case 'UPDATE_TRANSACTION': return { ...state, transactions: sortTransactions(state.transactions.map(t => t.id === action.payload.id ? action.payload : t)) };
        case 'UPDATE_MULTIPLE_TRANSACTIONS': {
            const updates = new Map(action.payload.map(t => [t.id, t]));
            const newTransactions = state.transactions.map(t => updates.get(t.id) || t);
            return { ...state, transactions: sortTransactions(newTransactions) };
        }
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
        case 'ADD_RECURRING': return { ...state, recurring: [...state.recurring, action.payload] };
        case 'UPDATE_RECURRING': return { ...state, recurring: state.recurring.map(r => r.id === action.payload.id ? action.payload : r) };
        case 'ADD_TAGS': {
             const newTags = action.payload.filter(newTag => !state.tags.some(existing => existing.id === newTag.id));
             if (newTags.length === 0) return state;
             return { ...state, tags: [...state.tags, ...newTags].sort((a,b) => a.name.localeCompare(b.name, 'de-DE')) };
        }
        case 'UPDATE_TAG': {
            const updatedTag = action.payload;
            return { ...state, tags: state.tags.map(t => t.id === updatedTag.id ? updatedTag : t).sort((a,b) => a.name.localeCompare(b.name, 'de-DE')) };
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
    const TG_KEY = `${prefix}transactionGroups`;
    
    try {
        const storedTransactions = JSON.parse(window.localStorage.getItem(T_KEY) || '[]') as Transaction[];
        const storedTags = JSON.parse(window.localStorage.getItem(TAGS_KEY) || '[]') as Tag[];
        // Use 'null' as default to distinguish between "not set" and "empty array"
        const storedRecurring = JSON.parse(window.localStorage.getItem(R_KEY) || 'null') as RecurringTransaction[] | null;
        const storedTransactionGroups = JSON.parse(window.localStorage.getItem(TG_KEY) || '[]') as TransactionGroup[];
        
        if (!Array.isArray(storedTransactions) || !Array.isArray(storedTags)) {
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
    flexibleCategories: Category[];
}

export const useTransactionData = ({ showConfirmation, closeTransactionDetail, currentUserId, isDemoModeEnabled, addRecentCategory, showDemoData, flexibleCategories }: useTransactionDataProps) => {
    const prefix = isDemoModeEnabled ? 'demo_' : '';
    const T_KEY = `${prefix}transactions`;
    const TAGS_KEY = `${prefix}allAvailableTags`;
    const R_KEY = `${prefix}recurringTransactions`;
    const TG_KEY = `${prefix}transactionGroups`;

    const initializer = useMemo(() => makeInitializer(isDemoModeEnabled), [isDemoModeEnabled]);
    const [rawState, dispatch] = useReducer(dataReducer, undefined, initializer);
    const [demoData, setDemoData] = useState<RichDemoData | null>(null);
    const demoDataShownRef = useRef(false);

    useEffect(() => {
        if (showDemoData) {
            const newDemoData = generateRichDemoData(flexibleCategories);
            setDemoData(newDemoData);
            if (!demoDataShownRef.current) {
                toast.success("Demodaten aktiviert.");
                demoDataShownRef.current = true;
            }
        } else {
            setDemoData(null);
            if (demoDataShownRef.current) {
                toast.success("Demodaten deaktiviert.");
                demoDataShownRef.current = false;
            }
        }
    }, [showDemoData, flexibleCategories]);

    useEffect(() => { window.localStorage.setItem(T_KEY, JSON.stringify(rawState.transactions)); }, [rawState.transactions, T_KEY]);
    useEffect(() => { window.localStorage.setItem(TAGS_KEY, JSON.stringify(rawState.tags)); }, [rawState.tags, TAGS_KEY]);
    useEffect(() => { window.localStorage.setItem(R_KEY, JSON.stringify(rawState.recurring)); }, [rawState.recurring, R_KEY]);
    useEffect(() => { window.localStorage.setItem(TG_KEY, JSON.stringify(rawState.transactionGroups)); }, [rawState.transactionGroups, TG_KEY]);

    const liveTransactions = useMemo(() => rawState.transactions.filter(t => !t.isDeleted), [rawState.transactions]);
    const liveTags = useMemo(() => rawState.tags.filter(t => !t.isDeleted), [rawState.tags]);
    const liveTransactionGroups = useMemo(() => rawState.transactionGroups.filter(g => !g.isDeleted), [rawState.transactionGroups]);
    
    const transactions = useMemo(() => {
        return showDemoData && demoData
            ? sortTransactions([...demoData.transactions, ...liveTransactions])
            : liveTransactions;
    }, [liveTransactions, showDemoData, demoData]);
    
    const allAvailableTags = useMemo(() => {
        const base = liveTags;
        if (showDemoData && demoData) {
            const liveTagNames = new Set(base.map(t => t.name.toLowerCase()));
            const uniqueDemoTags = demoData.tags.filter(dt => !liveTagNames.has(dt.name.toLowerCase()));
            return [...uniqueDemoTags, ...base];
        }
        return base;
    }, [liveTags, showDemoData, demoData]);

    const transactionGroups = useMemo(() => {
        const base = liveTransactionGroups;
        if (showDemoData && demoData) {
            return [...demoData.transactionGroups, ...base];
        }
        return base;
    }, [liveTransactionGroups, showDemoData, demoData]);

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
    
    const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'date' | 'createdAt' | 'tagIds' | 'lastModified' | 'version' | 'createdBy'> & { tags?: string[] }) => {
        const totalSpentBefore = selectTotalSpentForMonth(new Date());
        const now = new Date().toISOString();
        const newTransaction: Transaction = { ...transaction, id: generateUUID('tx'), date: now, createdAt: now, lastModified: now, version: 1, tagIds: getOrCreateTagIds(transaction.tags), createdBy: currentUserId || undefined };
        dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
        showConfirmation({ transactions: [newTransaction], totalSpentBefore });
        addRecentCategory(newTransaction.categoryId);
    }, [getOrCreateTagIds, showConfirmation, currentUserId, selectTotalSpentForMonth, addRecentCategory]);

    const addMultipleTransactions = useCallback((transactionsToCreate: Array<{amount: number, description: string}>, totalAmount: number, commonData: { categoryId: string, tags?: string[] }) => {
        const totalSpentBefore = selectTotalSpentForMonth(new Date());
        const now = new Date().toISOString();
        const tagIds = getOrCreateTagIds(commonData.tags);
        
        const newGroupId = generateUUID('tgrp');
        const newGroup: TransactionGroup = {
            id: newGroupId,
            targetAmount: totalAmount,
            createdAt: now,
            lastModified: now,
            version: 1
        };
        dispatch({ type: 'UPSERT_TRANSACTION_GROUP', payload: newGroup });
    
        const newTransactions: Transaction[] = transactionsToCreate.map(t => ({ 
            ...t, 
            id: generateUUID('tx'), 
            date: now, 
            createdAt: now, 
            lastModified: now, 
            version: 1, 
            categoryId: commonData.categoryId, 
            tagIds, 
            createdBy: currentUserId || undefined, 
            transactionGroupId: newGroupId,
            groupBaseAmount: t.amount
        }));
    
        dispatch({ type: 'ADD_MULTIPLE_TRANSACTIONS', payload: newTransactions });
        showConfirmation({ transactions: newTransactions, totalSpentBefore });
        addRecentCategory(commonData.categoryId);
    }, [getOrCreateTagIds, showConfirmation, currentUserId, selectTotalSpentForMonth, addRecentCategory]);

    const updateTransaction = useCallback((transaction: Transaction, tags?: string[] | null) => {
        const now = new Date().toISOString();
        let finalTransaction: Transaction = { ...transaction, lastModified: now, version: (transaction.version || 0) + 1 };
        if (tags !== undefined) finalTransaction.tagIds = getOrCreateTagIds(tags || []);

        const originalTransaction = rawState.transactions.find(t => t.id === transaction.id);

        // Group Date Sync Logic
        if (originalTransaction && finalTransaction.date !== originalTransaction.date && finalTransaction.transactionGroupId) {
            const groupId = finalTransaction.transactionGroupId;
            const newDate = finalTransaction.date;
            
            const transactionsToUpdate = rawState.transactions
                .filter(t => t.transactionGroupId === groupId && !t.isDeleted);
            
            if (transactionsToUpdate.length > 0) {
                const updatedTransactions = transactionsToUpdate.map(t => ({
                    ...t,
                    date: newDate,
                    lastModified: now,
                    version: (t.version || 0) + 1
                }));
                
                dispatch({ type: 'UPDATE_MULTIPLE_TRANSACTIONS', payload: updatedTransactions });
                toast.success(`Datum für ${updatedTransactions.length} Gruppeneinträge aktualisiert.`);
                return; // Exit early as we've dispatched a multi-update
            }
        }
        
        // Fallback to single transaction update
        dispatch({ type: 'UPDATE_TRANSACTION', payload: finalTransaction });
    }, [rawState.transactions, getOrCreateTagIds]);

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
            const now = new Date().toISOString();
            const transactionsToUpdate = rawState.transactions.filter(t => t.tagIds?.includes(tagId));

            if (transactionsToUpdate.length > 0) {
                const updatedTransactions = transactionsToUpdate.map(t => ({
                    ...t,
                    tagIds: t.tagIds!.filter(id => id !== tagId),
                    lastModified: now,
                    version: (t.version || 0) + 1,
                }));
                dispatch({ type: 'UPDATE_MULTIPLE_TRANSACTIONS', payload: updatedTransactions });
            }

            const deletedTag: Tag = { ...tag, isDeleted: true, lastModified: now, version: (tag.version || 0) + 1 };
            dispatch({ type: 'UPDATE_TAG', payload: deletedTag });
            toast.success(`Tag "${tag.name}" gelöscht und von Transaktionen entfernt.`);
        }
    }, [rawState.tags, rawState.transactions]);

    const handleReassignAndDeleteTag = useCallback((sourceTagId: string, newTagNames: string[]) => {
        const sourceTag = rawState.tags.find(t => t.id === sourceTagId);
        if (!sourceTag) return;

        const now = new Date().toISOString();
        const targetTagIds = getOrCreateTagIds(newTagNames);

        const transactionsToUpdate = rawState.transactions.filter(t => t.tagIds?.includes(sourceTagId));

        if (transactionsToUpdate.length > 0) {
            const updatedTransactions = transactionsToUpdate.map(t => {
                const newTagIds = new Set(t.tagIds!.filter(id => id !== sourceTagId));
                targetTagIds.forEach(id => newTagIds.add(id));
                return {
                    ...t,
                    tagIds: Array.from(newTagIds),
                    lastModified: now,
                    version: (t.version || 0) + 1,
                };
            });
            dispatch({ type: 'UPDATE_MULTIPLE_TRANSACTIONS', payload: updatedTransactions });
        }

        const deletedTag: Tag = { ...sourceTag, isDeleted: true, lastModified: now, version: (sourceTag.version || 0) + 1 };
        dispatch({ type: 'UPDATE_TAG', payload: deletedTag });
        toast.success(`Tag "${sourceTag.name}" gelöscht und Transaktionen neu zugeordnet.`);
    }, [rawState.tags, rawState.transactions, getOrCreateTagIds]);


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
                const nextDueDate = (() => {
                    switch (rec.frequency) {
                        case 'bimonthly': return addMonths(lastDate, 2);
                        case 'quarterly': return addMonths(lastDate, 3);
                        case 'semiannually': return addMonths(lastDate, 6);
                        case 'yearly': return addYears(lastDate, 1);
                        case 'monthly':
                        default: return addMonths(lastDate, 1);
                    }
                })();
                
                if (!isValid(nextDueDate) || nextDueDate > now) break;
                if (nextDueDate >= parseISO(rec.startDate)) {
                    if (!rawState.transactions.some(t => !t.isDeleted && t.recurringId === rec.id && isSameDay(parseISO(t.date), nextDueDate))) {
                        newTransactions.push({ id: generateUUID('tx'), amount: rec.amount, description: rec.description, categoryId: rec.categoryId, date: nextDueDate.toISOString(), createdAt: nextDueDate.toISOString(), recurringId: rec.id, lastModified: new Date().toISOString(), version: 1 });
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

    const createTransactionGroup = useCallback((transactionIds: string[], sourceTransactionId: string) => {
        const now = new Date().toISOString();
        const allIds = [sourceTransactionId, ...transactionIds];
        const transactionsToGroup = rawState.transactions.filter(t => allIds.includes(t.id));
    
        if (transactionsToGroup.length < 2) return;
    
        const totalAmount = transactionsToGroup.reduce((sum, t) => sum + t.amount, 0);
    
        const newGroup: TransactionGroup = {
            id: generateUUID('tgrp'),
            targetAmount: totalAmount,
            createdAt: now,
            lastModified: now,
            version: 1,
        };
        dispatch({ type: 'UPSERT_TRANSACTION_GROUP', payload: newGroup });
    
        const updatedTransactions = transactionsToGroup.map(t => ({
            ...t,
            transactionGroupId: newGroup.id,
            groupBaseAmount: t.amount,
            isCorrected: false,
            lastModified: now,
            version: (t.version || 0) + 1,
        }));
        dispatch({ type: 'UPDATE_MULTIPLE_TRANSACTIONS', payload: updatedTransactions });
        
        toast.success(`Gruppe mit ${updatedTransactions.length} Transaktionen erstellt.`);
    }, [rawState.transactions]);
    
    const updateGroupedTransaction = useCallback((options: { transactionId: string, newAmount?: number, resetCorrection?: boolean }) => {
        const { transactionId, newAmount, resetCorrection } = options;
        const now = new Date().toISOString();
        
        const sourceTx = rawState.transactions.find(t => t.id === transactionId);
        if (!sourceTx || !sourceTx.transactionGroupId) return;
    
        const group = rawState.transactionGroups.find(g => g.id === sourceTx.transactionGroupId);
        if (!group) return;
    
        const allGroupTxs = rawState.transactions.filter(t => t.transactionGroupId === group.id && !t.isDeleted);
        
        let updatedTxs: Transaction[] = [];
    
        if (resetCorrection) {
            // Resetting one transaction means we need to rebalance the entire group.
            const totalAmount = group.targetAmount;
            const totalBaseAmount = allGroupTxs.reduce((sum, t) => sum + (t.groupBaseAmount || t.amount), 0);
            
            updatedTxs = allGroupTxs.map(t => {
                const ratio = totalBaseAmount > 0 ? (t.groupBaseAmount || t.amount) / totalBaseAmount : 1 / allGroupTxs.length;
                const newTxAmount = totalAmount * ratio;
                return {
                    ...t,
                    amount: newTxAmount,
                    isCorrected: false,
                    lastModified: now,
                    version: (t.version || 0) + 1,
                };
            });
    
        } else if (newAmount !== undefined) {
            // Correcting one transaction amount
            const updatedSourceTx = {
                ...sourceTx,
                amount: newAmount,
                isCorrected: true,
                lastModified: now,
                version: (sourceTx.version || 0) + 1,
            };
            
            const correctedTxs = [...allGroupTxs.filter(t => t.id !== transactionId && t.isCorrected), updatedSourceTx];
            const uncorrectedTxs = allGroupTxs.filter(t => t.id !== transactionId && !t.isCorrected);
    
            const amountCorrected = correctedTxs.reduce((sum, t) => sum + t.amount, 0);
            const amountToDistribute = group.targetAmount - amountCorrected;
            
            const baseAmountToDistribute = uncorrectedTxs.reduce((sum, t) => sum + (t.groupBaseAmount || t.amount), 0);
            
            const rebalancedUncorrectedTxs = uncorrectedTxs.map(t => {
                const ratio = baseAmountToDistribute > 0 ? (t.groupBaseAmount || t.amount) / baseAmountToDistribute : 1 / uncorrectedTxs.length;
                const newTxAmount = amountToDistribute * ratio;
                return { ...t, amount: newTxAmount, lastModified: now, version: (t.version || 0) + 1 };
            });
    
            updatedTxs = [...correctedTxs, ...rebalancedUncorrectedTxs];
        }
    
        if (updatedTxs.length > 0) {
            dispatch({ type: 'UPDATE_MULTIPLE_TRANSACTIONS', payload: updatedTxs });
        }
    }, [rawState.transactions, rawState.transactionGroups]);
    
    const removeTransactionFromGroup = useCallback((transactionId: string) => {
        const now = new Date().toISOString();
        const sourceTx = rawState.transactions.find(t => t.id === transactionId);
        if (!sourceTx || !sourceTx.transactionGroupId) return;
    
        const group = rawState.transactionGroups.find(g => g.id === sourceTx.transactionGroupId);
        if (!group) return;
    
        const remainingGroupTxs = rawState.transactions.filter(t => t.transactionGroupId === group.id && t.id !== transactionId && !t.isDeleted);
        
        // Update the source transaction
        const updatedSourceTx: Transaction = {
            ...sourceTx,
            transactionGroupId: undefined,
            groupBaseAmount: undefined,
            isCorrected: undefined,
            lastModified: now,
            version: (sourceTx.version || 0) + 1,
        };
    
        if (remainingGroupTxs.length < 2) {
            // If less than 2 txs remain, dissolve the group.
            const updatedRemainingTxs = remainingGroupTxs.map(t => ({
                ...t,
                transactionGroupId: undefined,
                groupBaseAmount: undefined,
                isCorrected: undefined,
                lastModified: now,
                version: (t.version || 0) + 1,
            }));
            
            const updatedGroup: TransactionGroup = { ...group, isDeleted: true, lastModified: now, version: (group.version || 0) + 1 };
            dispatch({ type: 'UPSERT_TRANSACTION_GROUP', payload: updatedGroup });
            dispatch({ type: 'UPDATE_MULTIPLE_TRANSACTIONS', payload: [updatedSourceTx, ...updatedRemainingTxs] });
            toast("Transaktionsgruppe aufgelöst.");
        } else {
            // Rebalance the remaining group.
            const newTargetAmount = group.targetAmount - sourceTx.amount;
            const updatedGroup: TransactionGroup = { ...group, targetAmount: newTargetAmount, lastModified: now, version: (group.version || 0) + 1 };
            
            const totalBaseAmountRemaining = remainingGroupTxs.reduce((sum, t) => sum + (t.groupBaseAmount || t.amount), 0);
            
            const rebalancedRemainingTxs = remainingGroupTxs.map(t => {
                const ratio = totalBaseAmountRemaining > 0 ? (t.groupBaseAmount || t.amount) / totalBaseAmountRemaining : 1 / remainingGroupTxs.length;
                const newTxAmount = newTargetAmount * ratio;
                return {
                    ...t,
                    amount: newTxAmount,
                    isCorrected: false, // Reset all corrections on rebalance
                    lastModified: now,
                    version: (t.version || 0) + 1,
                };
            });
            
            dispatch({ type: 'UPSERT_TRANSACTION_GROUP', payload: updatedGroup });
            dispatch({ type: 'UPDATE_MULTIPLE_TRANSACTIONS', payload: [updatedSourceTx, ...rebalancedRemainingTxs] });
            toast.success("Transaktion aus Gruppe entfernt und Restbeträge angepasst.");
        }
    }, [rawState.transactions, rawState.transactionGroups]);
    
    const addTransactionsToGroup = useCallback((groupId: string, transactionIdsToAdd: string[]) => {
        const now = new Date().toISOString();
        const group = rawState.transactionGroups.find(g => g.id === groupId);
        if (!group) {
            toast.error("Gruppe nicht gefunden.");
            return;
        }

        const txsToAdd = rawState.transactions.filter(t => transactionIdsToAdd.includes(t.id));
        if (txsToAdd.length === 0) return;

        const amountToAdd = txsToAdd.reduce((sum, t) => sum + t.amount, 0);

        // Update the group's target amount
        const newTargetAmount = group.targetAmount + amountToAdd;
        const updatedGroup: TransactionGroup = {
            ...group,
            targetAmount: newTargetAmount,
            lastModified: now,
            version: (group.version || 0) + 1,
        };
        dispatch({ type: 'UPSERT_TRANSACTION_GROUP', payload: updatedGroup });

        // Mark new transactions as part of the group
        const newlyGroupedTxs = txsToAdd.map(t => ({
            ...t,
            transactionGroupId: groupId,
            groupBaseAmount: t.amount,
            isCorrected: false, // Start as non-corrected
            lastModified: now,
            version: (t.version || 0) + 1,
        }));

        // Rebalance all non-corrected transactions in the group (old and new)
        const existingGroupTxs = rawState.transactions.filter(t => t.transactionGroupId === groupId && !t.isDeleted);
        const allTxsInGroupNow = [...existingGroupTxs, ...newlyGroupedTxs];
        
        const correctedTxs = allTxsInGroupNow.filter(t => t.isCorrected);
        const uncorrectedTxs = allTxsInGroupNow.filter(t => !t.isCorrected);

        const amountCorrected = correctedTxs.reduce((sum, t) => sum + t.amount, 0);
        const amountToDistribute = newTargetAmount - amountCorrected;
        const baseAmountToDistribute = uncorrectedTxs.reduce((sum, t) => sum + (t.groupBaseAmount || t.amount), 0);

        const rebalancedUncorrectedTxs = uncorrectedTxs.map(t => {
            const ratio = baseAmountToDistribute > 0 ? (t.groupBaseAmount || t.amount) / baseAmountToDistribute : 1 / uncorrectedTxs.length;
            const newTxAmount = amountToDistribute * ratio;
            return { ...t, amount: newTxAmount, lastModified: now, version: (t.version || 0) + 1 };
        });

        const allUpdatedTxs = [...correctedTxs.filter(t => newlyGroupedTxs.some(nt => nt.id === t.id)), ...rebalancedUncorrectedTxs];
        dispatch({ type: 'UPDATE_MULTIPLE_TRANSACTIONS', payload: allUpdatedTxs });
        toast.success(`${transactionIdsToAdd.length} Transaktion(en) zur Gruppe hinzugefügt.`);
    }, [rawState.transactions, rawState.transactionGroups]);

    const mergeTransactionWithTarget = useCallback((sourceId: string, targetId: string) => {
        const sourceTx = rawState.transactions.find(t => t.id === sourceId);
        const targetTx = rawState.transactions.find(t => t.id === targetId);

        if (!sourceTx || !targetTx) {
            toast.error("Transaktionen nicht gefunden.");
            return;
        }

        if (targetTx.transactionGroupId) {
            // Target is in a group, add source to it
            addTransactionsToGroup(targetTx.transactionGroupId, [sourceId]);
        } else {
            // Neither is in a group, create a new one
            createTransactionGroup([targetId], sourceId);
        }
        closeTransactionDetail();
    }, [rawState.transactions, addTransactionsToGroup, createTransactionGroup, closeTransactionDetail]);

    const updateGroupVerifiedStatus = useCallback((groupId: string, verified: boolean) => {
        const now = new Date().toISOString();
        const transactionsToUpdate = rawState.transactions
            .filter(t => t.transactionGroupId === groupId && !t.isDeleted)
            .map(t => ({
                ...t,
                isVerified: verified,
                lastModified: now,
                version: (t.version || 0) + 1,
            }));
        
        if (transactionsToUpdate.length > 0) {
            dispatch({ type: 'UPDATE_MULTIPLE_TRANSACTIONS', payload: transactionsToUpdate });
            toast.success(`Gruppe als ${verified ? 'geprüft' : 'ungeprüft'} markiert.`);
        }
    }, [rawState.transactions]);

    return {
        transactions, recurringTransactions, allAvailableTags, tagMap, selectTotalSpentForMonth, totalSpentThisMonth, transactionGroups,
        rawTransactions: rawState.transactions, rawRecurringTransactions: rawState.recurring, rawAllAvailableTags: rawState.tags, rawTransactionGroups: rawState.transactionGroups,
        setTransactions: (data: Transaction[]) => dispatch({type: 'SET_TRANSACTIONS', payload: data}),
        setAllAvailableTags: (data: Tag[]) => dispatch({type: 'SET_TAGS', payload: data}),
        setRecurringTransactions: (data: RecurringTransaction[]) => dispatch({type: 'SET_RECURRING', payload: data}),
        setTransactionGroups: (data: TransactionGroup[]) => dispatch({type: 'SET_TRANSACTION_GROUPS', payload: data}),
        addTransaction, addMultipleTransactions, updateTransaction, deleteTransaction, deleteMultipleTransactions,
        addRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction, handleUpdateTag, handleDeleteTag, handleReassignAndDeleteTag,
        reassignCategoryForTransactions,
        reassignUserForTransactions,
        createTransactionGroup,
        updateGroupedTransaction,
        removeTransactionFromGroup,
        addTransactionsToGroup,
        mergeTransactionWithTarget,
        updateGroupVerifiedStatus,
    };
};