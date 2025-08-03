import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Transaction, Category } from '../types';
import { format, parseISO, formatCurrency, endOfDay, startOfDay } from '../utils/dateUtils';
import { iconMap, Edit, Trash2, Search, SlidersHorizontal, X, ChevronDown, Tag } from './Icons';
import CategoryButtons from './CategoryButtons';
import TagInput from './TagInput';
import AvailableTags from './AvailableTags';

interface TransactionsPageProps {
    transactions: Transaction[];
    categoryMap: Map<string, Category>;
    updateTransaction: (transaction: Transaction) => void;
    deleteTransaction: (id: string) => void;
    categories: Category[];
    categoryGroups: string[];
    allAvailableTags: string[];
}

const TransactionList: FC<{ 
    transactions: Transaction[]; 
    categoryMap: Map<string, Category>; 
    updateTransaction: (t: Transaction) => void;
    deleteTransaction: (id: string) => void; 
    categories: Category[];
    categoryGroups: string[];
    allAvailableTags: string[];
    showEmptyMessage?: boolean;
}> = ({ transactions, categoryMap, updateTransaction, deleteTransaction, categories, categoryGroups, allAvailableTags, showEmptyMessage = false }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col h-full"
        >
            <div className="flex-grow space-y-3 overflow-y-auto -mr-4 pr-4">
                <AnimatePresence>
                {transactions.length > 0 ? transactions.map(t => (
                    <motion.div key={t.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                        <TransactionItem 
                            transaction={t}
                            category={categoryMap.get(t.categoryId)}
                            onUpdate={updateTransaction}
                            onDelete={deleteTransaction}
                            isEditing={editingId === t.id}
                            onEditClick={() => setEditingId(t.id === editingId ? null : t.id)}
                            categories={categories}
                            categoryGroups={categoryGroups}
                            allAvailableTags={allAvailableTags}
                        />
                    </motion.div>
                )) : (
                    showEmptyMessage && <p className="text-slate-500 text-center py-4">Keine Transaktionen gefunden.</p>
                )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

const TransactionItem: FC<{ 
    transaction: Transaction; 
    category?: Category; 
    onUpdate: (t: Transaction) => void; 
    onDelete: (id: string) => void; 
    isEditing: boolean; 
    onEditClick: () => void;
    categories: Category[];
    categoryGroups: string[];
    allAvailableTags: string[];
}> = ({ transaction, category, onUpdate, onDelete, isEditing, onEditClick, categories, categoryGroups, allAvailableTags }) => {
    const [formState, setFormState] = useState(transaction);
    
    React.useEffect(() => {
        setFormState(transaction);
    }, [transaction, isEditing]);
    
    const Icon = category ? iconMap[category.icon] || iconMap.MoreHorizontal : iconMap.MoreHorizontal;
    const color = category ? category.color : '#64748b';

    const handleSave = () => {
        onUpdate(formState);
        onEditClick();
    };

    const formattedDate = React.useMemo(() => {
        try {
            if (!transaction.date || typeof transaction.date !== 'string') return 'Ungültiges Datum';
            const parsedDate = parseISO(transaction.date);
            if (isNaN(parsedDate.getTime())) return 'Ungültiges Datum';
            return format(parsedDate, 'dd. MMMM, HH:mm');
        } catch (error) {
            return 'Ungültiges Datum';
        }
    }, [transaction.date]);

    const handleTagClick = (tag: string) => {
        setFormState(prev => {
            const currentTags = prev.tags || [];
            const newTags = currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag];
            return { ...prev, tags: newTags };
        });
    };

    if (isEditing) {
        const getFormattedDate = () => {
            try {
                if (!formState.date || typeof formState.date !== 'string') return '';
                const parsedDate = parseISO(formState.date);
                if (isNaN(parsedDate.getTime())) return '';
                return format(parsedDate, 'yyyy-MM-dd');
            } catch (error) {
                console.error(`Invalid date format for transaction ${formState.id}:`, formState.date, error);
                return '';
            }
        };

        return (
            <div className="bg-slate-700/80 p-4 rounded-lg space-y-4 ring-2 ring-rose-500">
                <div className="grid grid-cols-2 gap-3">
                    <input 
                        type="number" 
                        step="0.01" 
                        value={formState.amount} 
                        onChange={e => setFormState({...formState, amount: parseFloat(e.target.value) || 0})} 
                        className="w-full bg-slate-600 border border-slate-500 rounded-md px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        placeholder="Betrag"
                    />
                    <input
                        type="date"
                        value={getFormattedDate()}
                        onChange={(e) => {
                            try {
                                if (e.target.value) {
                                    const newDatePart = parseISO(e.target.value);
                                    const originalDate = parseISO(formState.date);
                                    
                                    const finalDate = new Date(newDatePart);
                                    finalDate.setHours(originalDate.getHours());
                                    finalDate.setMinutes(originalDate.getMinutes());
                                    finalDate.setSeconds(originalDate.getSeconds());
                                    finalDate.setMilliseconds(originalDate.getMilliseconds());

                                    setFormState({...formState, date: finalDate.toISOString()});
                                }
                            } catch (err) {
                                console.error("Could not parse date", e.target.value)
                            }
                        }}
                        className="w-full bg-slate-600 border border-slate-500 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                        required
                    />
                 </div>
                 <input 
                    type="text" 
                    value={formState.description} 
                    onChange={e => setFormState({...formState, description: e.target.value})} 
                    className="w-full bg-slate-600 border border-slate-500 rounded-md px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Beschreibung"
                />
                 <div className="space-y-3">
                    <TagInput
                        tags={formState.tags || []}
                        setTags={(newTags) => setFormState({ ...formState, tags: newTags })}
                        suggestionTags={allAvailableTags}
                    />
                    <AvailableTags
                        availableTags={allAvailableTags}
                        selectedTags={formState.tags || []}
                        onTagClick={handleTagClick}
                    />
                 </div>
                 <CategoryButtons 
                    categories={categories}
                    categoryGroups={categoryGroups}
                    selectedCategoryId={formState.categoryId}
                    onSelectCategory={(id) => setFormState({...formState, categoryId: id})}
                 />
                 <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onEditClick} className="text-slate-400 hover:text-white px-4 py-1.5 rounded-md hover:bg-slate-600/50 transition-colors text-sm">Abbrechen</button>
                    <button onClick={handleSave} className="bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold px-4 py-1.5 rounded-md transition-colors">Speichern</button>
                 </div>
            </div>
        )
    }

    return (
        <div className="flex items-start gap-4 bg-slate-800/50 hover:bg-slate-700/50 p-3 rounded-lg transition-colors">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
                <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{transaction.description}</p>
                 <div className="flex flex-col items-start">
                    <div className="text-xs text-slate-400 mt-1">{formattedDate}</div>
                    {transaction.tags && transaction.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {transaction.tags.map(tag => (
                                <span key={tag} className="text-xs font-medium bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="text-right flex-shrink-0">
                 <p className="font-bold text-white">{formatCurrency(transaction.amount)}</p>
                 <div className="flex gap-3 justify-end mt-1">
                    <button onClick={onEditClick}><Edit className="h-4 w-4 text-slate-500 hover:text-rose-400" /></button>
                    <button onClick={() => onDelete(transaction.id)}><Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" /></button>
                 </div>
            </div>
        </div>
    );
};

const MultiCategoryPicker: FC<{
    categories: Category[];
    selected: string[];
    onChange: (selected: string[]) => void;
}> = ({ categories, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const toggleCategory = (id: string) => {
        if (selected.includes(id)) {
            onChange(selected.filter(catId => catId !== id));
        } else {
            onChange([...selected, id]);
        }
    };
    
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div className="relative" ref={wrapperRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-left text-white flex justify-between items-center">
                <span className="truncate">{selected.length === 0 ? 'Alle Kategorien' : `${selected.length} Kategorien gewählt`}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
            {isOpen && (
                <motion.div initial={{opacity: 0, y: -5}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -5}} className="absolute z-10 top-full mt-2 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {categories.map(category => (
                        <label key={category.id} className="flex items-center gap-3 p-3 hover:bg-slate-700/50 cursor-pointer">
                            <input type="checkbox" checked={selected.includes(category.id)} onChange={() => toggleCategory(category.id)} className="w-4 h-4 rounded text-rose-500 bg-slate-600 border-slate-500 focus:ring-rose-500"/>
                            <span className="text-white text-sm font-medium">{category.name}</span>
                        </label>
                    ))}
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

const TransactionFilters: FC<{
    categories: Category[];
    onFilterChange: (filters: any) => void;
}> = ({ categories, onFilterChange }) => {
    const [filters, setFilters] = useState({
        text: '',
        tags: '',
        categories: [] as string[],
        minAmount: '',
        maxAmount: '',
        startDate: '',
        endDate: '',
    });
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleFilterChange = (field: keyof typeof filters, value: any) => {
        const newFilters = { ...filters, [field]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };
    
    const resetFilters = () => {
        const emptyFilters = { text: '', tags: '', categories: [], minAmount: '', maxAmount: '', startDate: '', endDate: '' };
        setFilters(emptyFilters);
        onFilterChange(emptyFilters);
    };

    return (
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 mb-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Suche nach Beschreibung..."
                        value={filters.text}
                        onChange={e => handleFilterChange('text', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                </div>
                <div className="relative flex-grow">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Filter nach Tag..."
                        value={filters.tags}
                        onChange={e => handleFilterChange('tags', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                </div>
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center justify-center gap-2 text-sm text-white bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-semibold">
                    <SlidersHorizontal className="h-4 w-4"/>
                    <span>Filter</span>
                </button>
                 <button onClick={resetFilters} className="text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 px-4 py-2 rounded-lg">
                    Zurücksetzen
                </button>
            </div>
            <AnimatePresence>
            {showAdvanced && (
                <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} exit={{opacity: 0, height: 0}} className="overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-700">
                         <MultiCategoryPicker categories={categories} selected={filters.categories} onChange={val => handleFilterChange('categories', val)} />
                         <input type="number" placeholder="Min. Betrag" value={filters.minAmount} onChange={e => handleFilterChange('minAmount', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500"/>
                         <input type="number" placeholder="Max. Betrag" value={filters.maxAmount} onChange={e => handleFilterChange('maxAmount', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500"/>
                         <div className="flex items-center gap-2">
                            <input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"/>
                            <span className="text-slate-400">-</span>
                            <input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"/>
                         </div>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
}

const TransactionsPage: FC<TransactionsPageProps> = ({
    transactions,
    categoryMap,
    updateTransaction,
    deleteTransaction,
    categories,
    categoryGroups,
    allAvailableTags
}) => {
    const [filters, setFilters] = useState({
        text: '',
        tags: '',
        categories: [] as string[],
        minAmount: '',
        maxAmount: '',
        startDate: '',
        endDate: '',
    });

    const sortedTransactions = useMemo(() => 
        [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
    [transactions]);

    const filteredTransactions = useMemo(() => {
        return sortedTransactions.filter(t => {
            if (filters.text && !t.description.toLowerCase().includes(filters.text.toLowerCase())) return false;
            if (filters.tags && (!t.tags || !t.tags.some(tag => tag.toLowerCase().includes(filters.tags.toLowerCase())))) return false;
            if (filters.categories.length > 0 && !filters.categories.includes(t.categoryId)) return false;
            
            const min = parseFloat(filters.minAmount);
            if (!isNaN(min) && t.amount < min) return false;
            
            const max = parseFloat(filters.maxAmount);
            if (!isNaN(max) && t.amount > max) return false;
            
            try {
                const tDate = parseISO(t.date);
                if (filters.startDate && tDate < startOfDay(parseISO(filters.startDate))) return false;
                if (filters.endDate && tDate > endOfDay(parseISO(filters.endDate))) return false;
            } catch (e) { /* Invalid date in filter, ignore for now */ }

            return true;
        });
    }, [sortedTransactions, filters]);


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Transaktionen</h1>
            <TransactionFilters categories={categories} onFilterChange={setFilters} />
            <div className="h-[calc(100vh-350px)]">
                <TransactionList 
                    transactions={filteredTransactions}
                    categoryMap={categoryMap}
                    updateTransaction={updateTransaction}
                    deleteTransaction={deleteTransaction}
                    categories={categories}
                    categoryGroups={categoryGroups}
                    allAvailableTags={allAvailableTags}
                    showEmptyMessage={true}
                />
            </div>
        </div>
    );
};

export default TransactionsPage;
