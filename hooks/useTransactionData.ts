

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { toast } from 'react-hot-toast';
import type { Transaction, RecurringTransaction, Tag } from '../types';
import { addMonths, addYears, isSameDay, parseISO, getMonthInterval, isWithinInterval, isValid, format } from '../utils/dateUtils';

// --- CONSTANTS & HELPERS ---
const TAG_MIN_LENGTH = 1;
const TAG_MAX_LENGTH = 40;
const normalizeTagName = (name: string): string => name.trim().toLowerCase();
const MAX_RECURRING_ITERATIONS = 100; // Safety break for while loop (100 months/years)
const sortTransactions = (transactions: Transaction[]): Transaction[] => 
    [...transactions].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());


// --- STATE MANAGEMENT ---

type DataState = {
    transactions: Transaction[];
    tags: Tag[];
    recurring: RecurringTransaction[];
};

type Action =
    | { type: 'SET_ALL_DATA'; payload: { transactions: Transaction[]; tags: Tag[]; recurring: RecurringTransaction[] } }
    | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
    | { type: 'SET_TAGS'; payload: Tag[] }
    | { type: 'SET_RECURRING'; payload: RecurringTransaction[] }
    | { type: 'ADD_TRANSACTION'; payload: Transaction }
    | { type: 'ADD_MULTIPLE_TRANSACTIONS'; payload: Transaction[] }
    | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
    | { type: 'ADD_RECURRING'; payload: RecurringTransaction }
    | { type: 'UPDATE_RECURRING'; payload: RecurringTransaction }
    | { type: 'ADD_TAGS'; payload: Tag[] }
    | { type: 'UPDATE_TAG'; payload: Tag }
    | { type: 'PROCESS_RECURRING_UPDATES'; payload: { newTransactions: Transaction[], updatedRecurring: RecurringTransaction[] } };

const dataReducer = (state: DataState, action: Action): DataState => {
    switch (action.type) {
        case 'SET_ALL_DATA':
            return {
                ...state,
                transactions: sortTransactions(action.payload.transactions),
                tags: action.payload.tags,
                recurring: action.payload.recurring,
            };
        case 'SET_TRANSACTIONS':
            return { ...state, transactions: sortTransactions(action.payload) };
        case 'SET_TAGS':
            return { ...state, tags: action.payload };
        case 'SET_RECURRING':
            return { ...state, recurring: action.payload };
        case 'ADD_TRANSACTION':
            return { ...state, transactions: sortTransactions([...state.transactions, action.payload]) };
        case 'ADD_MULTIPLE_TRANSACTIONS':
            return { ...state, transactions: sortTransactions([...state.transactions, ...action.payload]) };
        case 'UPDATE_TRANSACTION':
            return { ...state, transactions: sortTransactions(state.transactions.map(t => t.id === action.payload.id ? action.payload : t)) };
        
        case 'ADD_RECURRING':
            return { ...state, recurring: [...state.recurring, action.payload] };
        case 'UPDATE_RECURRING':
            return { ...state, recurring: state.recurring.map(r => r.id === action.payload.id ? action.payload : r) };
            
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
             return { 
                ...state, 
                tags: state.tags.map(t => t.id === updatedTag.id ? updatedTag : t).sort((a,b) => a.name.localeCompare(b.name, 'de-DE')),
                transactions: transactionsWithUpdatedTag,
            };
        }
        case 'PROCESS_RECURRING_UPDATES':
            return {
                ...state,
                transactions: sortTransactions([...state.transactions, ...action.payload.newTransactions]),
                recurring: state.recurring.map(orig => action.payload.updatedRecurring.find(upd => upd.id === orig.id) || orig)
            };
        default:
            return state;
    }
};

// --- LAZY INITIALIZER FOR REDUCER ---

const emptyState: DataState = {
    transactions: [],
    tags: [],
    recurring: [],
};

// This function runs only once on component mount to hydrate the state from localStorage.
const initializer = (): DataState => {
    try {
        const storedTransactions = JSON.parse(window.localStorage.getItem('transactions') || '[]') as Transaction[];
        const storedTags = JSON.parse(window.localStorage.getItem('allAvailableTags') || '[]') as Tag[];
        const storedRecurring = JSON.parse(window.localStorage.getItem('recurringTransactions') || '[]') as RecurringTransaction[];

        // Basic validation to ensure we have arrays
        if (!Array.isArray(storedTransactions) || !Array.isArray(storedTags) || !Array.isArray(storedRecurring)) {
            console.warn("localStorage data is corrupt. Starting fresh.");
            return emptyState;
        }
        
        return {
            transactions: sortTransactions(storedTransactions),
            tags: storedTags,
            recurring: storedRecurring,
        };
    } catch (error) {
        console.error("Failed to parse data from localStorage, starting fresh.", error);
        return emptyState;
    }
};


// --- HOOK IMPLEMENTATION ---

interface useTransactionDataProps {
    showConfirmation: (data: { transactions: Transaction[]; totalSpentBefore: number }) => void;
    closeTransactionDetail: () => void;
}

export const useTransactionData = ({ showConfirmation, closeTransactionDetail }: useTransactionDataProps) => {
    // 1. Use reducer with the lazy initializer. State is now hydrated synchronously.
    const [rawState, dispatch] = useReducer(dataReducer, undefined, initializer);

    // 2. Persist state changes back to localStorage using useEffect.
    // This runs after every render where the corresponding state slice has changed.
    useEffect(() => {
        window.localStorage.setItem('transactions', JSON.stringify(rawState.transactions));
    }, [rawState.transactions]);

    useEffect(() => {
        window.localStorage.setItem('allAvailableTags', JSON.stringify(rawState.tags));
    }, [rawState.tags]);
    
    useEffect(() => {
        window.localStorage.setItem('recurringTransactions', JSON.stringify(rawState.recurring));
    }, [rawState.recurring]);

    // Memoized "live" data, filtered to exclude soft-deleted items
    const transactions = useMemo(() => rawState.transactions.filter(t => !t.isDeleted), [rawState.transactions]);
    const allAvailableTags = useMemo(() => rawState.tags.filter(t => !t.isDeleted), [rawState.tags]);
    const recurringTransactions = useMemo(() => rawState.recurring.filter(r => !r.isDeleted), [rawState.recurring]);

    // Create a stable key based on tag content to ensure tagMap is only recomputed when tags actually change.
    const tagsKey = useMemo(() => allAvailableTags.map(t => `${t.id}:${t.version}`).join(','), [allAvailableTags]);
    const tagMap = useMemo(() => new Map(allAvailableTags.map(t => [t.id, t.name])), [tagsKey]);

    const selectTotalSpentForMonth = useMemo(() => {
        const cache = new Map<string, number>();
        // The returned function closes over `transactions`. A new function is created when `transactions` changes, with a new cache.
        return (date: Date): number => {
            const key = format(date, 'yyyy-MM');
            if (cache.has(key)) {
                return cache.get(key)!;
            }
            const monthInterval = getMonthInterval(date);
            const total = transactions
                .filter(t => {
                    try {
                        return isWithinInterval(parseISO(t.date), monthInterval);
                    } catch { return false; }
                })
                .reduce((sum, t) => sum + t.amount, 0);
            cache.set(key, total);
            return total;
        };
    }, [transactions]);

    const totalSpentThisMonth = useMemo(() => selectTotalSpentForMonth(new Date()), [selectTotalSpentForMonth]);

     // Ref latch to give callbacks stable access to the latest selector without re-creating the callback itself.
    const selectorRef = useRef(selectTotalSpentForMonth);
    useEffect(() => {
        selectorRef.current = selectTotalSpentForMonth;
    }, [selectTotalSpentForMonth]);
    
    const getOrCreateTagIds = useCallback((tagNames?: string[]): string[] => {
        if (!tagNames || tagNames.length === 0) return [];
        
        const newTagsToCreate: Tag[] = [];
        const resultingTagIds = new Set<string>(); // Use Set for performance and uniqueness
        const now = new Date().toISOString();
        const currentTagMapByNormalizedName = new Map(rawState.tags.map(t => [normalizeTagName(t.name), t]));

        // Process unique names to avoid redundant work
        for (const name of new Set(tagNames)) {
            const trimmedName = name.trim();

            if (trimmedName.length < TAG_MIN_LENGTH) {
                toast.error('Tag ist zu kurz.');
                continue;
            }
            if (trimmedName.length > TAG_MAX_LENGTH) {
                toast.error(`Tag darf maximal ${TAG_MAX_LENGTH} Zeichen haben.`);
                continue;
            }

            const normalizedName = normalizeTagName(trimmedName);
            const existingTag = currentTagMapByNormalizedName.get(normalizedName);

            if (existingTag) {
                if (existingTag.isDeleted) {
                    // Undelete and use the original casing if a user wants to revive a tag with different casing.
                    const undeletedTag = { ...existingTag, name: trimmedName, isDeleted: false, lastModified: now, version: (existingTag.version || 0) + 1 };
                    dispatch({ type: 'UPDATE_TAG', payload: undeletedTag });
                    resultingTagIds.add(undeletedTag.id);
                } else {
                    resultingTagIds.add(existingTag.id);
                }
            } else {
                const newTag: Tag = { 
                    id: crypto.randomUUID(), 
                    name: trimmedName,
                    lastModified: now,
                    version: 1,
                };
                newTagsToCreate.push(newTag);
                resultingTagIds.add(newTag.id);
            }
        }

        if (newTagsToCreate.length > 0) {
            dispatch({ type: 'ADD_TAGS', payload: newTagsToCreate });
        }
        return Array.from(resultingTagIds);
    }, [rawState.tags]);
    
    const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'date' | 'tagIds' | 'lastModified' | 'version'> & { tags?: string[] }) => {
        const totalSpentBefore = selectorRef.current(new Date());
        const now = new Date().toISOString();
        const tagIds = getOrCreateTagIds(transaction.tags);
        const newTransaction: Transaction = {
            ...transaction,
            id: crypto.randomUUID(),
            date: now,
            lastModified: now,
            version: 1,
            tagIds,
        };
        dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
        showConfirmation({ transactions: [newTransaction], totalSpentBefore });
    }, [getOrCreateTagIds, showConfirmation]);

    const addMultipleTransactions = useCallback((
        transactionsToCreate: Array<{amount: number, description: string}>,
        commonData: { categoryId: string, tags?: string[] }
    ) => {
        const totalSpentBefore = selectorRef.current(new Date());
        const now = new Date().toISOString();
        const tagIds = getOrCreateTagIds(commonData.tags);

        const newTransactions: Transaction[] = transactionsToCreate.map(t => ({
            ...t,
            id: crypto.randomUUID(),
            date: now,
            lastModified: now,
            version: 1,
            categoryId: commonData.categoryId,
            tagIds,
        }));

        dispatch({ type: 'ADD_MULTIPLE_TRANSACTIONS', payload: newTransactions });
        showConfirmation({ transactions: newTransactions, totalSpentBefore });
    }, [getOrCreateTagIds, showConfirmation]);

    const updateTransaction = useCallback((transaction: Transaction, tags?: string[] | null) => {
        let finalTransaction: Transaction = {
            ...transaction,
            lastModified: new Date().toISOString(),
            version: (transaction.version || 0) + 1,
        };

        if (tags !== undefined) {
            // Tags were explicitly passed (even as an empty array or null), so update them.
            finalTransaction.tagIds = getOrCreateTagIds(tags || []);
        }
        
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
        const updatedTransactions = rawState.transactions.map(t => {
            if (ids.includes(t.id)) {
                return { ...t, isDeleted: true, lastModified: now, version: (t.version || 0) + 1 };
            }
            return t;
        });
        dispatch({ type: 'SET_TRANSACTIONS', payload: updatedTransactions });
        toast.success(`${ids.length} ${ids.length > 1 ? 'Einträge' : 'Eintrag'} gelöscht.`);
    }, [rawState.transactions]);

    const addRecurringTransaction = useCallback((item: Omit<RecurringTransaction, 'lastModified' | 'version'>) => {
        const newRec: RecurringTransaction = { ...item, lastModified: new Date().toISOString(), version: 1 };
        dispatch({ type: 'ADD_RECURRING', payload: newRec });
    }, []);
    
    const updateRecurringTransaction = useCallback((item: RecurringTransaction) => {
        const updatedRec: RecurringTransaction = { ...item, lastModified: new Date().toISOString(), version: (item.version || 0) + 1 };
        dispatch({ type: 'UPDATE_RECURRING', payload: updatedRec });
    }, []);

    const deleteRecurringTransaction = useCallback((id: string) => {
        const item = rawState.recurring.find(r => r.id === id);
        if (item) {
            const deletedItem = { ...item, isDeleted: true, lastModified: new Date().toISOString(), version: (item.version || 0) + 1 };
            dispatch({ type: 'UPDATE_RECURRING', payload: deletedItem });
        }
    }, [rawState.recurring]);

    const handleUpdateTag = useCallback((tagId: string, newName: string) => {
        const trimmedNewName = newName.trim();
        
        if (trimmedNewName.length < TAG_MIN_LENGTH) {
            toast.error('Tag ist zu kurz.');
            return;
        }
        if (trimmedNewName.length > TAG_MAX_LENGTH) {
            toast.error(`Tag darf maximal ${TAG_MAX_LENGTH} Zeichen haben.`);
            return;
        }

        const existingTag = rawState.tags.find(t => t.id === tagId);
        if (!existingTag) return;

        const normalizedNewName = normalizeTagName(trimmedNewName);
        const isDuplicate = rawState.tags.some(
            t => normalizeTagName(t.name) === normalizedNewName && t.id !== tagId && !t.isDeleted
        );

        if (isDuplicate) {
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

    // Effect for processing recurring transactions
    useEffect(() => {
        const newTransactions: Transaction[] = [];
        const updatedRecurring: RecurringTransaction[] = [];
        const now = new Date();

        // Use raw state to avoid dependency cycles and process all items
        rawState.recurring.forEach(rec => {
            if (rec.isDeleted) return;

            let lastDate;
            try {
                lastDate = rec.lastProcessedDate ? parseISO(rec.lastProcessedDate) : parseISO(rec.startDate);
                 if (!isValid(lastDate)) throw new Error("Invalid last processed/start date");
            } catch (e) {
                console.error(`Skipping recurring transaction with invalid date: ${rec.id}`, e);
                return;
            }

            let hasChanged = false;
            let iterations = 0;
            
            while (iterations < MAX_RECURRING_ITERATIONS) {
                const nextDueDate = rec.frequency === 'monthly' ? addMonths(lastDate, 1) : addYears(lastDate, 1);
                
                if (!isValid(nextDueDate)) {
                     console.error(`Generated invalid next due date for recurring transaction ${rec.id}. Aborting.`);
                     break;
                }

                if (nextDueDate > now) break;

                if (nextDueDate >= parseISO(rec.startDate)) {
                    // Robust check using recurringId
                    const alreadyExists = rawState.transactions.some(t =>
                        !t.isDeleted &&
                        t.recurringId === rec.id &&
                        isSameDay(parseISO(t.date), nextDueDate)
                    );

                    if (!alreadyExists) {
                         newTransactions.push({
                            id: crypto.randomUUID(),
                            amount: rec.amount,
                            description: rec.description, // No more "(Wiederkehrend)" prefix
                            categoryId: rec.categoryId,
                            date: nextDueDate.toISOString(),
                            recurringId: rec.id, // Add the link to the parent
                            lastModified: new Date().toISOString(),
                            version: 1,
                        });
                    }
                }
                lastDate = nextDueDate;
                hasChanged = true;
                iterations++;
            }
             if (iterations >= MAX_RECURRING_ITERATIONS) {
                console.warn(`Max iterations reached for recurring transaction ${rec.id}. Check for potential infinite loop.`);
            }

            if (hasChanged) {
                 updatedRecurring.push({ ...rec, lastProcessedDate: lastDate.toISOString(), lastModified: new Date().toISOString(), version: (rec.version || 0) + 1 });
            }
        });

        if (newTransactions.length > 0 || updatedRecurring.length > 0) {
            dispatch({ type: 'PROCESS_RECURRING_UPDATES', payload: { newTransactions, updatedRecurring } });
        }
    }, [rawState.recurring, rawState.transactions]);
    
    return {
        // Live data (filtered for UI)
        transactions,
        recurringTransactions,
        allAvailableTags,
        tagMap,
        selectTotalSpentForMonth,
        totalSpentThisMonth,
        
        // Raw data (for sync)
        rawTransactions: rawState.transactions,
        rawRecurringTransactions: rawState.recurring,
        rawAllAvailableTags: rawState.tags,

        // Data setters (for sync) - names must match useSync props
        setTransactions: (data: Transaction[]) => dispatch({type: 'SET_TRANSACTIONS', payload: data}),
        setAllAvailableTags: (data: Tag[]) => dispatch({type: 'SET_TAGS', payload: data}),
        setRecurringTransactions: (data: RecurringTransaction[]) => dispatch({type: 'SET_RECURRING', payload: data}),
        
        // Actions
        addTransaction,
        addMultipleTransactions,
        updateTransaction,
        deleteTransaction,
        deleteMultipleTransactions,
        addRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
        handleUpdateTag,
        handleDeleteTag,
    };
};