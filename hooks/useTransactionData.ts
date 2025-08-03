
import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { toast } from 'react-hot-toast';
import useLocalStorage from './useLocalStorage';
import type { Transaction, RecurringTransaction, Tag } from '../types';
import { addMonths, addYears, isSameDay, parseISO, getMonthInterval, isWithinInterval } from '../utils/dateUtils';

// Action types for the reducer
type Action =
    | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
    | { type: 'ADD_TRANSACTION'; payload: Transaction }
    | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
    | { type: 'DELETE_TRANSACTION'; payload: string }
    | { type: 'ADD_RECURRING'; payload: RecurringTransaction[] }
    | { type: 'PROCESS_RECURRING'; payload: { transactions: Transaction[], recurring: RecurringTransaction[] } }
    | { type: 'SET_TAGS'; payload: Tag[] }
    | { type: 'ADD_TAGS'; payload: Tag[] }
    | { type: 'UPDATE_TAG'; payload: { id: string, name: string } }
    | { type: 'DELETE_TAG'; payload: string };

// Reducer for transactions state
const transactionsReducer = (state: Transaction[], action: Action): Transaction[] => {
    switch (action.type) {
        case 'SET_TRANSACTIONS':
            return action.payload;
        case 'ADD_TRANSACTION':
            return [...state, action.payload];
        case 'UPDATE_TRANSACTION':
            return state.map(t => t.id === action.payload.id ? action.payload : t);
        case 'DELETE_TRANSACTION':
            return state.filter(t => t.id !== action.payload);
        case 'DELETE_TAG':
            return state.map(t => {
                if (t.tagIds?.includes(action.payload)) {
                    return { ...t, tagIds: t.tagIds.filter(id => id !== action.payload) };
                }
                return t;
            });
        case 'PROCESS_RECURRING':
            return [...state, ...action.payload.transactions];
        default:
            return state;
    }
};

const tagsReducer = (state: Tag[], action: Action): Tag[] => {
     switch (action.type) {
        case 'SET_TAGS':
            return action.payload;
        case 'ADD_TAGS':
            return [...state, ...action.payload].sort((a,b) => a.name.localeCompare(b.name));
        case 'UPDATE_TAG':
            return state
                .map(t => t.id === action.payload.id ? { ...t, name: action.payload.name } : t)
                .sort((a,b) => a.name.localeCompare(b.name));
        case 'DELETE_TAG':
            return state.filter(t => t.id !== action.payload);
        default:
            return state;
     }
}

interface useTransactionDataProps {
    showConfirmation: (data: { transaction: Transaction; totalSpentBefore: number }) => void;
    closeTransactionDetail: () => void;
}

export const useTransactionData = ({ showConfirmation, closeTransactionDetail }: useTransactionDataProps) => {
    const [transactions, dispatchTransactions] = useReducer(transactionsReducer, []);
    const [allAvailableTags, dispatchTags] = useReducer(tagsReducer, []);

    const [storedTransactions, setStoredTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [storedTags, setStoredTags] = useLocalStorage<Tag[]>('allAvailableTags', []);
    const [recurringTransactions, setRecurringTransactions] = useLocalStorage<RecurringTransaction[]>('recurringTransactions', []);

    // Load from local storage once on mount
    useEffect(() => {
        dispatchTransactions({ type: 'SET_TRANSACTIONS', payload: storedTransactions });
        dispatchTags({ type: 'SET_TAGS', payload: storedTags });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Persist to local storage on change
    useEffect(() => setStoredTransactions(transactions), [transactions, setStoredTransactions]);
    useEffect(() => setStoredTags(allAvailableTags), [allAvailableTags, setStoredTags]);

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
        const currentTagMapByName = new Map(allAvailableTags.map(t => [t.name.toLowerCase(), t.id]));
        const numericIds = allAvailableTags.map(t => parseInt(t.id, 10)).filter(id => !isNaN(id));
        let nextIdCounter = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;

        tagNames.forEach(name => {
            const trimmedName = name.trim();
            if (!trimmedName) return;

            const existingId = currentTagMapByName.get(trimmedName.toLowerCase());
            if (existingId) {
                if (!ids.includes(existingId)) ids.push(existingId);
            } else {
                const newId = nextIdCounter.toString().padStart(4, '0');
                const newTag: Tag = { id: newId, name: trimmedName };
                newTagsToCreate.push(newTag);
                ids.push(newTag.id);
                currentTagMapByName.set(trimmedName.toLowerCase(), newTag.id);
                nextIdCounter++;
            }
        });

        if (newTagsToCreate.length > 0) {
            dispatchTags({ type: 'ADD_TAGS', payload: newTagsToCreate });
        }
        return ids;
    }, [allAvailableTags]);
    
    const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'date' | 'tagIds'> & { tags?: string[] }) => {
        const totalSpentBefore = totalSpentThisMonth;
        const tagIds = getOrCreateTagIds(transaction.tags);
        const newTransaction: Transaction = {
            ...transaction,
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            tagIds,
        };
        dispatchTransactions({ type: 'ADD_TRANSACTION', payload: newTransaction });
        showConfirmation({ transaction: newTransaction, totalSpentBefore });
    }, [totalSpentThisMonth, getOrCreateTagIds, showConfirmation]);

    const updateTransaction = useCallback((transaction: Transaction, tags?: string[]) => {
        const tagIds = getOrCreateTagIds(tags);
        const finalTransaction = { ...transaction, tagIds };
        dispatchTransactions({ type: 'UPDATE_TRANSACTION', payload: finalTransaction });
    }, [getOrCreateTagIds]);

    const deleteTransaction = useCallback((id: string) => {
        dispatchTransactions({ type: 'DELETE_TRANSACTION', payload: id });
        closeTransactionDetail(); // Close modal if the detailed transaction was deleted
        toast.success('Transaktion gelöscht!');
    }, [closeTransactionDetail]);

    const handleUpdateTag = useCallback((tagId: string, newName: string) => {
        const trimmedNewName = newName.trim();
        if (!trimmedNewName) return;
        const isDuplicate = allAvailableTags.some(t => t.name.toLowerCase() === trimmedNewName.toLowerCase() && t.id !== tagId);
        if (isDuplicate) {
            toast.error(`Der Tag "${trimmedNewName}" existiert bereits.`);
            return;
        }
        dispatchTags({ type: 'UPDATE_TAG', payload: { id: tagId, name: trimmedNewName } });
    }, [allAvailableTags]);

    const handleDeleteTag = useCallback((tagId: string) => {
        dispatchTags({ type: 'DELETE_TAG', payload: tagId });
        dispatchTransactions({ type: 'DELETE_TAG', payload: tagId }); // Also clean up transactions
    }, []);

    // Effect for processing recurring transactions
    useEffect(() => {
        const newTransactions: Transaction[] = [];
        const updatedRecurring = recurringTransactions.map(rec => {
            let lastDate = rec.lastProcessedDate ? parseISO(rec.lastProcessedDate) : parseISO(rec.startDate);
            let nextDueDate = lastDate;
            const newRec = { ...rec };
            
            while (true) {
                nextDueDate = newRec.frequency === 'monthly' ? addMonths(lastDate, 1) : addYears(lastDate, 1);
                if (nextDueDate > new Date()) break;

                if (nextDueDate >= parseISO(newRec.startDate)) {
                    const alreadyExists = transactions.some(t =>
                        t.description.includes(`(Wiederkehrend) ${newRec.description}`) &&
                        isSameDay(parseISO(t.date), nextDueDate)
                    );
                    if (!alreadyExists) {
                        newTransactions.push({
                            id: crypto.randomUUID(),
                            amount: newRec.amount,
                            description: `(Wiederkehrend) ${newRec.description}`,
                            categoryId: newRec.categoryId,
                            date: nextDueDate.toISOString(),
                        });
                    }
                }
                lastDate = nextDueDate;
                newRec.lastProcessedDate = lastDate.toISOString();
            }
            return newRec;
        });

        if (newTransactions.length > 0) {
            dispatchTransactions({ type: 'PROCESS_RECURRING', payload: { transactions: newTransactions, recurring: updatedRecurring } });
            setRecurringTransactions(updatedRecurring);
        }
    // Run only once on mount to catch up, and when recurring transactions change
    }, [recurringTransactions, setRecurringTransactions]); // eslint-disable-line react-hooks/exhaustive-deps


    const setAllTransactions = useCallback((data: Transaction[]) => dispatchTransactions({ type: 'SET_TRANSACTIONS', payload: data }), []);
    const setAllTags = useCallback((data: Tag[]) => dispatchTags({ type: 'SET_TAGS', payload: data }), []);

    return {
        transactions,
        setTransactions: setAllTransactions,
        recurringTransactions,
        setRecurringTransactions,
        allAvailableTags,
        setAllAvailableTags: setAllTags,
        tagMap,
        totalSpentThisMonth,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        handleUpdateTag,
        handleDeleteTag
    };
};
