

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { toast } from 'react-hot-toast';
import useLocalStorage from './useLocalStorage';
import type { Transaction, RecurringTransaction, Tag } from '../types';
import { addMonths, addYears, isSameDay, parseISO, getMonthInterval, isWithinInterval } from '../utils/dateUtils';

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
                transactions: action.payload.transactions,
                tags: action.payload.tags,
                recurring: action.payload.recurring,
            };
        case 'SET_TRANSACTIONS':
            return { ...state, transactions: action.payload };
        case 'SET_TAGS':
            return { ...state, tags: action.payload };
        case 'SET_RECURRING':
            return { ...state, recurring: action.payload };
        case 'ADD_TRANSACTION':
            return { ...state, transactions: [...state.transactions, action.payload] };
        case 'ADD_MULTIPLE_TRANSACTIONS':
            return { ...state, transactions: [...state.transactions, ...action.payload] };
        case 'UPDATE_TRANSACTION':
            return { ...state, transactions: state.transactions.map(t => t.id === action.payload.id ? action.payload : t) };
        
        case 'ADD_RECURRING':
            return { ...state, recurring: [...state.recurring, action.payload] };
        case 'UPDATE_RECURRING':
            return { ...state, recurring: state.recurring.map(r => r.id === action.payload.id ? action.payload : r) };
            
        case 'ADD_TAGS': {
             const newTags = action.payload.filter(newTag => !state.tags.some(existing => existing.id === newTag.id));
             if (newTags.length === 0) return state;
             return { ...state, tags: [...state.tags, ...newTags].sort((a,b) => a.name.localeCompare(b.name)) };
        }
        case 'UPDATE_TAG': {
            const updatedTag = action.payload;
            const transactionsWithUpdatedTag = state.transactions.map(t => {
                if(t.tagIds?.includes(updatedTag.id) && updatedTag.isDeleted){
                     return {...t, tagIds: t.tagIds.filter(id => id !== updatedTag.id), lastModified: new Date().toISOString() };
                }
                return t;
            })
             return { 
                ...state, 
                tags: state.tags.map(t => t.id === updatedTag.id ? updatedTag : t),
                transactions: transactionsWithUpdatedTag,
            };
        }
        case 'PROCESS_RECURRING_UPDATES':
            return {
                ...state,
                transactions: [...state.transactions, ...action.payload.newTransactions],
                recurring: state.recurring.map(orig => action.payload.updatedRecurring.find(upd => upd.id === orig.id) || orig)
            };
        default:
            return state;
    }
};


// --- HOOK IMPLEMENTATION ---

interface useTransactionDataProps {
    showConfirmation: (data: { transactions: Transaction[]; totalSpentBefore: number }) => void;
    closeTransactionDetail: () => void;
}

export const useTransactionData = ({ showConfirmation, closeTransactionDetail }: useTransactionDataProps) => {
    const [rawState, dispatch] = useReducer(dataReducer, { transactions: [], tags: [], recurring: [] });
    
    // Separate local storage for each data type
    const [storedTransactions, setStoredTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [storedTags, setStoredTags] = useLocalStorage<Tag[]>('allAvailableTags', []);
    const [storedRecurring, setStoredRecurring] = useLocalStorage<RecurringTransaction[]>('recurringTransactions', []);
    
    // Load from local storage once on mount
    useEffect(() => {
        dispatch({ type: 'SET_ALL_DATA', payload: {
            transactions: storedTransactions,
            tags: storedTags,
            recurring: storedRecurring
        }});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    
    // Persist to local storage on change
    useEffect(() => setStoredTransactions(rawState.transactions), [rawState.transactions, setStoredTransactions]);
    useEffect(() => setStoredTags(rawState.tags), [rawState.tags, setStoredTags]);
    useEffect(() => setStoredRecurring(rawState.recurring), [rawState.recurring, setStoredRecurring]);

    // Memoized "live" data, filtered to exclude soft-deleted items
    const transactions = useMemo(() => rawState.transactions.filter(t => !t.isDeleted), [rawState.transactions]);
    const allAvailableTags = useMemo(() => rawState.tags.filter(t => !t.isDeleted), [rawState.tags]);
    const recurringTransactions = useMemo(() => rawState.recurring.filter(r => !r.isDeleted), [rawState.recurring]);

    const tagMap = useMemo(() => new Map(allAvailableTags.map(t => [t.id, t.name])), [allAvailableTags]);

    const totalSpentThisMonth = useMemo(() => {
        const monthInterval = getMonthInterval(new Date());
        return transactions
            .filter(t => isWithinInterval(parseISO(t.date), monthInterval))
            .reduce((sum, t) => sum + t.amount, 0);
    }, [transactions]);
    
    const getOrCreateTagIds = useCallback((tagNames?: string[]): string[] => {
        if (!tagNames || tagNames.length === 0) return [];
        
        const newTagsToCreate: Tag[] = [];
        const ids: string[] = [];
        const now = new Date().toISOString();
        const currentTagMapByName = new Map(rawState.tags.map(t => [t.name.toLowerCase(), t]));

        tagNames.forEach(name => {
            const trimmedName = name.trim();
            if (!trimmedName) return;

            const existingTag = currentTagMapByName.get(trimmedName.toLowerCase());
            if (existingTag) {
                if (existingTag.isDeleted) {
                    // "Undelete" the tag
                    const undeletedTag = { ...existingTag, isDeleted: false, lastModified: now };
                    dispatch({ type: 'UPDATE_TAG', payload: undeletedTag });
                    if (!ids.includes(undeletedTag.id)) ids.push(undeletedTag.id);
                } else {
                    if (!ids.includes(existingTag.id)) ids.push(existingTag.id);
                }
            } else {
                const newTag: Tag = { 
                    id: crypto.randomUUID(), 
                    name: trimmedName,
                    lastModified: now,
                };
                newTagsToCreate.push(newTag);
                ids.push(newTag.id);
            }
        });

        if (newTagsToCreate.length > 0) {
            dispatch({ type: 'ADD_TAGS', payload: newTagsToCreate });
        }
        return ids;
    }, [rawState.tags]);
    
    const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'date' | 'tagIds' | 'lastModified'> & { tags?: string[] }) => {
        const totalSpentBefore = totalSpentThisMonth;
        const now = new Date().toISOString();
        const tagIds = getOrCreateTagIds(transaction.tags);
        const newTransaction: Transaction = {
            ...transaction,
            id: crypto.randomUUID(),
            date: now,
            lastModified: now,
            tagIds,
        };
        dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
        showConfirmation({ transactions: [newTransaction], totalSpentBefore });
    }, [totalSpentThisMonth, getOrCreateTagIds, showConfirmation]);

    const addMultipleTransactions = useCallback((
        transactionsToCreate: Array<{amount: number, description: string}>,
        commonData: { categoryId: string, tags?: string[] }
    ) => {
        const totalSpentBefore = totalSpentThisMonth;
        const now = new Date().toISOString();
        const tagIds = getOrCreateTagIds(commonData.tags);

        const newTransactions: Transaction[] = transactionsToCreate.map(t => ({
            ...t,
            id: crypto.randomUUID(),
            date: now,
            lastModified: now,
            categoryId: commonData.categoryId,
            tagIds,
        }));

        dispatch({ type: 'ADD_MULTIPLE_TRANSACTIONS', payload: newTransactions });
        showConfirmation({ transactions: newTransactions, totalSpentBefore });
    }, [getOrCreateTagIds, totalSpentThisMonth, showConfirmation]);

    const updateTransaction = useCallback((transaction: Transaction, tags?: string[]) => {
        const tagIds = getOrCreateTagIds(tags);
        const finalTransaction: Transaction = {
            ...transaction,
            tagIds,
            lastModified: new Date().toISOString()
        };
        dispatch({ type: 'UPDATE_TRANSACTION', payload: finalTransaction });
    }, [getOrCreateTagIds]);

    const deleteTransaction = useCallback((id: string) => {
        const transaction = rawState.transactions.find(t => t.id === id);
        if (transaction) {
            const deletedTransaction = { ...transaction, isDeleted: true, lastModified: new Date().toISOString() };
            dispatch({ type: 'UPDATE_TRANSACTION', payload: deletedTransaction });
            closeTransactionDetail();
            toast.success('Transaktion gelöscht!');
        }
    }, [rawState.transactions, closeTransactionDetail]);

    const addRecurringTransaction = useCallback((item: Omit<RecurringTransaction, 'lastModified'>) => {
        const newRec: RecurringTransaction = { ...item, lastModified: new Date().toISOString() };
        dispatch({ type: 'ADD_RECURRING', payload: newRec });
    }, []);
    
    const updateRecurringTransaction = useCallback((item: RecurringTransaction) => {
        const updatedRec: RecurringTransaction = { ...item, lastModified: new Date().toISOString() };
        dispatch({ type: 'UPDATE_RECURRING', payload: updatedRec });
    }, []);

    const deleteRecurringTransaction = useCallback((id: string) => {
        const item = rawState.recurring.find(r => r.id === id);
        if (item) {
            const deletedItem = { ...item, isDeleted: true, lastModified: new Date().toISOString() };
            dispatch({ type: 'UPDATE_RECURRING', payload: deletedItem });
        }
    }, [rawState.recurring]);

    const handleUpdateTag = useCallback((tagId: string, newName: string) => {
        const trimmedNewName = newName.trim();
        if (!trimmedNewName) return;
        
        const existingTag = rawState.tags.find(t => t.id === tagId);
        if (!existingTag) return;

        const isDuplicate = rawState.tags.some(t => t.name.toLowerCase() === trimmedNewName.toLowerCase() && t.id !== tagId && !t.isDeleted);
        if (isDuplicate) {
            toast.error(`Der Tag "${trimmedNewName}" existiert bereits.`);
            return;
        }

        const updatedTag: Tag = { ...existingTag, name: trimmedNewName, lastModified: new Date().toISOString() };
        dispatch({ type: 'UPDATE_TAG', payload: updatedTag });
        toast.success(`Tag umbenannt in "${trimmedNewName}"`);
    }, [rawState.tags]);

    const handleDeleteTag = useCallback((tagId: string) => {
        const tag = rawState.tags.find(t => t.id === tagId);
        if (tag) {
            const deletedTag: Tag = { ...tag, isDeleted: true, lastModified: new Date().toISOString() };
            dispatch({ type: 'UPDATE_TAG', payload: deletedTag });
            toast.success(`Tag "${tag.name}" gelöscht`);
        }
    }, [rawState.tags]);

    // Effect for processing recurring transactions
    useEffect(() => {
        const newTransactions: Transaction[] = [];
        const updatedRecurring: RecurringTransaction[] = [];
        const now = new Date();

        rawState.recurring.forEach(rec => {
            if (rec.isDeleted) return;

            let lastDate = rec.lastProcessedDate ? parseISO(rec.lastProcessedDate) : parseISO(rec.startDate);
            let nextDueDate = lastDate;
            let hasChanged = false;
            
            while (true) {
                nextDueDate = rec.frequency === 'monthly' ? addMonths(lastDate, 1) : addYears(lastDate, 1);
                if (nextDueDate > now) break;

                if (nextDueDate >= parseISO(rec.startDate)) {
                    // Check if a transaction for this recurring event on this day already exists
                    const alreadyExists = rawState.transactions.some(t =>
                        t.description.includes(`(Wiederkehrend) ${rec.description}`) && isSameDay(parseISO(t.date), nextDueDate)
                    );
                    if (!alreadyExists) {
                         newTransactions.push({
                            id: crypto.randomUUID(),
                            amount: rec.amount,
                            description: `(Wiederkehrend) ${rec.description}`,
                            categoryId: rec.categoryId,
                            date: nextDueDate.toISOString(),
                            lastModified: new Date().toISOString(),
                        });
                    }
                }
                lastDate = nextDueDate;
                hasChanged = true;
            }

            if (hasChanged) {
                 updatedRecurring.push({ ...rec, lastProcessedDate: lastDate.toISOString(), lastModified: new Date().toISOString() });
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
        addRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
        handleUpdateTag,
        handleDeleteTag,
    };
};