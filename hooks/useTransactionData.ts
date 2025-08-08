


import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { toast } from 'react-hot-toast';
import type { Transaction, RecurringTransaction, Tag } from '../types';
import { addMonths, addYears, isSameDay, parseISO, isWithinInterval, isValid, format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { generateUUID } from '../utils/uuid';
import { INITIAL_CATEGORIES, FIXED_COSTS_GROUP_NAME } from '../constants';

// --- CONSTANTS & HELPERS ---
const TAG_MIN_LENGTH = 1;
const TAG_MAX_LENGTH = 40;
const normalizeTagName = (name: string): string => name.trim().toLowerCase();
const MAX_RECURRING_ITERATIONS = 100;
const sortTransactions = (transactions: Transaction[]): Transaction[] => 
    [...transactions].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

const DEMO_TAGS: Tag[] = [
    { id: 'dev-tag-1', name: 'Urlaub', lastModified: new Date().toISOString(), version: 1, isDemo: true },
    { id: 'dev-tag-2', name: 'Projekt', lastModified: new Date().toISOString(), version: 1, isDemo: true },
    { id: 'dev-tag-3', name: 'Wochenende', lastModified: new Date().toISOString(), version: 1, isDemo: true },
    { id: 'dev-tag-4', name: 'Auto', lastModified: new Date().toISOString(), version: 1, isDemo: true },
    { id: 'dev-tag-5', name: 'Fitness', lastModified: new Date().toISOString(), version: 1, isDemo: true },
];

const makeDemoTransactions = (): Transaction[] => {
    const now = new Date();
    const standardUser = '1001';
    return [
        { id: 'dev-1', amount: 12.34, description: 'Kaffee & Croissant', categoryId: 'cat_baecker', date: new Date().toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-2', amount: 99.99, description: 'Wocheneinkauf Supermarkt', categoryId: 'cat_supermarkt', date: subDays(now, 1).toISOString(), isDemo: true, tagIds: ['dev-tag-3'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-3', amount: 7.50, description: 'Parkgebühren', categoryId: 'cat_auto', date: subDays(now, 2).toISOString(), isDemo: true, tagIds: ['dev-tag-4'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-4', amount: 25.00, description: 'Pizza Lieferservice', categoryId: 'cat_gastro', date: subDays(now, 2).toISOString(), isDemo: true, tagIds: ['dev-tag-3'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-5', amount: 125.60, description: 'Neue Winterjacke', categoryId: 'cat_kleidung', date: subDays(now, 3).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-6', amount: 55.00, description: 'Gartenerde & Pflanzen', categoryId: 'cat_garten', date: subDays(now, 4).toISOString(), isDemo: true, tagIds: ['dev-tag-2'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-7', amount: 8.20, description: 'Gemüse vom Markt', categoryId: 'cat_supermarkt', date: subDays(now, 5).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-8', amount: 42.00, description: 'Geburtstagsgeschenk', categoryId: 'cat_geschenke', date: subDays(now, 6).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-9', amount: 330.00, description: 'Hotel für Wochenende', categoryId: 'cat_urlaub', date: subDays(now, 7).toISOString(), isDemo: true, tagIds: ['dev-tag-1', 'dev-tag-3'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-10', amount: 18.00, description: 'Kino-Tickets', categoryId: 'cat_kultur', date: subDays(now, 8).toISOString(), isDemo: true, tagIds: ['dev-tag-3'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-11', amount: 22.50, description: 'Apothekenkauf', categoryId: 'cat_gesundheit', date: subDays(now, 9).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-12', amount: 64.95, description: 'Neues Videospiel', categoryId: 'cat_technik', date: subDays(now, 10).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-13', amount: 35.00, description: 'Tankfüllung', categoryId: 'cat_tanken', date: subDays(now, 11).toISOString(), isDemo: true, tagIds: ['dev-tag-4'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-14', amount: 19.99, description: 'Fitnessstudio Monatsbeitrag', categoryId: 'cat_hobbies', date: subDays(now, 12).toISOString(), isDemo: true, tagIds: ['dev-tag-5'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-15', amount: 29.99, description: 'Proteinpulver', categoryId: 'cat_supermarkt', date: subDays(now, 13).toISOString(), isDemo: true, tagIds: ['dev-tag-5'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-16', amount: 75.00, description: 'Laufschuhe', categoryId: 'cat_kleidung', date: subDays(now, 14).toISOString(), isDemo: true, tagIds: ['dev-tag-5'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-17', amount: 49.99, description: 'Streaming Dienst Jahresabo', categoryId: 'cat_abos', date: subDays(now, 15).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-18', amount: 15.50, description: 'Haarschnitt', categoryId: 'cat_friseur', date: subDays(now, 16).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: standardUser },
    ];
};

const DEMO_TRANSACTIONS = makeDemoTransactions();

// --- STATE MANAGEMENT ---

type DataState = { transactions: Transaction[]; tags: Tag[]; recurring: RecurringTransaction[]; };
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
        case 'SET_ALL_DATA': return { ...state, transactions: sortTransactions(action.payload.transactions), tags: action.payload.tags, recurring: action.payload.recurring };
        case 'SET_TRANSACTIONS': return { ...state, transactions: sortTransactions(action.payload) };
        case 'SET_TAGS': return { ...state, tags: action.payload };
        case 'SET_RECURRING': return { ...state, recurring: action.payload };
        case 'ADD_TRANSACTION': return { ...state, transactions: sortTransactions([...state.transactions, action.payload]) };
        case 'ADD_MULTIPLE_TRANSACTIONS': return { ...state, transactions: sortTransactions([...state.transactions, ...action.payload]) };
        case 'UPDATE_TRANSACTION': return { ...state, transactions: sortTransactions(state.transactions.map(t => t.id === action.payload.id ? action.payload : t)) };
        case 'ADD_RECURRING': return { ...state, recurring: [...state.recurring, action.payload] };
        case 'UPDATE_RECURRING': return { ...state, recurring: state.recurring.map(r => r.id === action.payload.id ? action.payload : r) };
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

    return INITIAL_CATEGORIES
        .filter(cat => cat.group === FIXED_COSTS_GROUP_NAME && cat.budget && cat.budget > 0)
        .map(cat => ({
            id: `rec_${cat.id}`, // A predictable ID
            amount: cat.budget!,
            description: cat.name,
            categoryId: cat.id,
            frequency: 'monthly' as const,
            startDate: startDate,
            lastModified: lastModified,
            version: 1,
        }));
};

const initializer = (): DataState => {
    try {
        const storedTransactions = JSON.parse(window.localStorage.getItem('transactions') || '[]') as Transaction[];
        const storedTags = JSON.parse(window.localStorage.getItem('allAvailableTags') || '[]') as Tag[];
        // Use 'null' as default to distinguish between "not set" and "empty array"
        const storedRecurring = JSON.parse(window.localStorage.getItem('recurringTransactions') || 'null') as RecurringTransaction[] | null;
        
        if (!Array.isArray(storedTransactions) || !Array.isArray(storedTags)) {
             // If basic data is corrupt, start completely fresh
            return { transactions: [], tags: [], recurring: createInitialRecurringTransactions() };
        }

        // Only create initial recurring if they have never been set before.
        const recurring = Array.isArray(storedRecurring) 
            ? storedRecurring 
            : createInitialRecurringTransactions();

        return { transactions: sortTransactions(storedTransactions), tags: storedTags, recurring: recurring };
    } catch (error) {
        // Fallback in case of any parsing error
        return { transactions: [], tags: [], recurring: createInitialRecurringTransactions() };
    }
};

interface useTransactionDataProps { showConfirmation: (data: { transactions: Transaction[]; totalSpentBefore: number }) => void; closeTransactionDetail: () => void; currentUserId: string | null; isDemoModeEnabled: boolean; }

export const useTransactionData = ({ showConfirmation, closeTransactionDetail, currentUserId, isDemoModeEnabled }: useTransactionDataProps) => {
    const [rawState, dispatch] = useReducer(dataReducer, undefined, initializer);

    useEffect(() => { window.localStorage.setItem('transactions', JSON.stringify(rawState.transactions)); }, [rawState.transactions]);
    useEffect(() => { window.localStorage.setItem('allAvailableTags', JSON.stringify(rawState.tags)); }, [rawState.tags]);
    useEffect(() => { window.localStorage.setItem('recurringTransactions', JSON.stringify(rawState.recurring)); }, [rawState.recurring]);

    const liveTransactions = useMemo(() => rawState.transactions.filter(t => !t.isDeleted), [rawState.transactions]);
    const liveTags = useMemo(() => rawState.tags.filter(t => !t.isDeleted), [rawState.tags]);
    const transactions = useMemo(() => isDemoModeEnabled ? sortTransactions([...DEMO_TRANSACTIONS, ...liveTransactions]) : liveTransactions, [liveTransactions, isDemoModeEnabled]);
    const allAvailableTags = useMemo(() => isDemoModeEnabled ? [...DEMO_TAGS, ...liveTags] : liveTags, [liveTags, isDemoModeEnabled]);
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
                const newTag: Tag = { id: generateUUID(), name: trimmedName, lastModified: now, version: 1 };
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
        const newTransaction: Transaction = { ...transaction, id: generateUUID(), date: now, lastModified: now, version: 1, tagIds: getOrCreateTagIds(transaction.tags), createdBy: currentUserId || undefined };
        dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
        showConfirmation({ transactions: [newTransaction], totalSpentBefore });
    }, [getOrCreateTagIds, showConfirmation, currentUserId, selectTotalSpentForMonth]);

    const addMultipleTransactions = useCallback((transactionsToCreate: Array<{amount: number, description: string}>, commonData: { categoryId: string, tags?: string[] }) => {
        const totalSpentBefore = selectTotalSpentForMonth(new Date());
        const now = new Date().toISOString();
        const tagIds = getOrCreateTagIds(commonData.tags);
        const newTransactions: Transaction[] = transactionsToCreate.map(t => ({ ...t, id: generateUUID(), date: now, lastModified: now, version: 1, categoryId: commonData.categoryId, tagIds, createdBy: currentUserId || undefined }));
        dispatch({ type: 'ADD_MULTIPLE_TRANSACTIONS', payload: newTransactions });
        showConfirmation({ transactions: newTransactions, totalSpentBefore });
    }, [getOrCreateTagIds, showConfirmation, currentUserId, selectTotalSpentForMonth]);

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

    const addRecurringTransaction = useCallback((item: Omit<RecurringTransaction, 'id' | 'lastModified' | 'version'>, id: string) => {
        const newRec: RecurringTransaction = { ...item, id, lastModified: new Date().toISOString(), version: 1 };
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
                        newTransactions.push({ id: generateUUID(), amount: rec.amount, description: rec.description, categoryId: rec.categoryId, date: nextDueDate.toISOString(), recurringId: rec.id, lastModified: new Date().toISOString(), version: 1 });
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
    
    return {
        transactions, recurringTransactions, allAvailableTags, tagMap, selectTotalSpentForMonth, totalSpentThisMonth,
        rawTransactions: rawState.transactions, rawRecurringTransactions: rawState.recurring, rawAllAvailableTags: rawState.tags,
        setTransactions: (data: Transaction[]) => dispatch({type: 'SET_TRANSACTIONS', payload: data}),
        setAllAvailableTags: (data: Tag[]) => dispatch({type: 'SET_TAGS', payload: data}),
        setRecurringTransactions: (data: RecurringTransaction[]) => dispatch({type: 'SET_RECURRING', payload: data}),
        addTransaction, addMultipleTransactions, updateTransaction, deleteTransaction, deleteMultipleTransactions,
        addRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction, handleUpdateTag, handleDeleteTag,
    };
};