
import React, { useState, useMemo, useRef, useEffect, FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import type { Transaction, Category, Tag } from '../types';
import { format, parseISO, formatCurrency, endOfDay, startOfDay, getWeekInterval, getMonthInterval } from '../utils/dateUtils';
import { iconMap, Search, SlidersHorizontal, ChevronDown, Tag as TagIcon, Edit, Trash2 } from './Icons';

type QuickFilterId = 'today' | 'week' | 'month' | 'all';
const quickFilterButtons: { id: QuickFilterId; label: string }[] = [
    { id: 'today', label: 'Heute' },
    { id: 'week', label: 'Diese Woche' },
    { id: 'month', label: 'Dieser Monat' },
    { id: 'all', label: 'Gesamt' },
];

const QuickFilters: FC<{
    activeQuickFilter: QuickFilterId | null;
    onQuickFilter: (filter: QuickFilterId) => void;
}> = ({ activeQuickFilter, onQuickFilter }) => {
    return (
        <div className="flex items-center space-x-1 bg-slate-700/80 p-1 rounded-full mb-4 self-start">
            {quickFilterButtons.map(btn => (
                <button
                    key={btn.id}
                    onClick={() => onQuickFilter(btn.id)}
                    className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors duration-300 whitespace-nowrap ${
                        activeQuickFilter === btn.id
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'text-slate-300 hover:bg-slate-600/50'
                    }`}
                >
                    {btn.label}
                </button>
            ))}
        </div>
    );
};

const TransactionList: FC<{ 
    transactions: Transaction[]; 
    showEmptyMessage?: boolean;
    activeQuickFilter: QuickFilterId | null;
    onQuickFilter: (filter: QuickFilterId) => void;
}> = ({ transactions, showEmptyMessage = false, activeQuickFilter, onQuickFilter }) => {
    const { categoryMap, tagMap, handleTagAnalyticsClick, handleTransactionClick, deleteTransaction } = useApp();
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col h-full"
        >
            <QuickFilters activeQuickFilter={activeQuickFilter} onQuickFilter={onQuickFilter} />
            <div className="flex-grow space-y-3 overflow-y-auto -mr-4 pr-4">
                <AnimatePresence>
                {transactions.length > 0 ? transactions.map(t => (
                    <motion.div 
                        key={t.id} 
                        layout
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, x: -20 }} 
                        transition={{ duration: 0.3 }}
                    >
                        <TransactionItem 
                            transaction={t}
                            category={categoryMap.get(t.categoryId)}
                            tagMap={tagMap}
                            onTagClick={handleTagAnalyticsClick}
                            onTransactionClick={handleTransactionClick}
                            deleteTransaction={deleteTransaction}
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
    tagMap: Map<string, string>;
    onTagClick: (tagId: string) => void;
    onTransactionClick: (transaction: Transaction, mode: 'view' | 'edit') => void;
    deleteTransaction: (id: string) => void;
}> = ({ transaction, category, tagMap, onTagClick, onTransactionClick, deleteTransaction }) => {
    const Icon = category ? iconMap[category.icon] || iconMap.MoreHorizontal : iconMap.MoreHorizontal;
    const color = category ? category.color : '#64748b';

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

    return (
        <div className="flex items-center gap-3 bg-slate-800/50 hover:bg-slate-700/50 p-3 rounded-lg transition-colors">
            <button 
                onClick={() => onTransactionClick(transaction, 'view')}
                className="w-full flex items-start gap-4 flex-1 min-w-0 text-left"
            >
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{transaction.description}</p>
                     <div className="flex flex-col items-start">
                        <div className="text-sm text-slate-400 mt-1">{formattedDate}</div>
                        {transaction.tagIds && transaction.tagIds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {transaction.tagIds.map(id => {
                                    const tagName = tagMap.get(id);
                                    if (!tagName) return null;
                                    return (
                                    <div
                                        key={id}
                                        onClick={(e) => {
                                            e.stopPropagation(); // prevent opening the detail modal
                                            onTagClick(id);
                                        }}
                                        className="text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                                        aria-label={`Analysiere Tag ${tagName}`}
                                    >
                                        #{tagName}
                                    </div>
                                )})}
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                     <p className="font-bold text-white text-lg">{formatCurrency(transaction.amount)}</p>
                     <p className="text-xs text-slate-400 truncate">{category?.name}</p>
                </div>
            </button>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onTransactionClick(transaction, 'edit')}
                    className="p-2 rounded-full text-slate-400 hover:bg-slate-600 hover:text-white"
                    title="Bearbeiten"
                >
                    <Edit className="h-4 w-4" />
                </button>
                <button
                    onClick={() => {
                        if (window.confirm(`Möchten Sie die Ausgabe "${transaction.description}" wirklich löschen?`)) {
                            deleteTransaction(transaction.id);
                        }
                    }}
                    className="p-2 rounded-full text-slate-400 hover:bg-slate-600 hover:text-red-400"
                    title="Löschen"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
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

    const allCategories = useMemo(() => {
        return [...categories].sort((a,b) => a.name.localeCompare(b.name));
    }, [categories]);

    return (
        <div className="relative" ref={wrapperRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-left text-white flex justify-between items-center">
                <span className="truncate">{selected.length === 0 ? 'Alle Kategorien' : `${selected.length} Kategorien gewählt`}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
            {isOpen && (
                <motion.div initial={{opacity: 0, y: -5}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -5}} className="absolute z-10 top-full mt-2 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {allCategories.map(category => (
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
    onFilterChange: (filters: any) => void;
    filters: any;
}> = ({ onFilterChange, filters }) => {
    const { categories } = useApp();
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleFilterChange = (field: keyof typeof filters, value: any) => {
        onFilterChange({ ...filters, [field]: value });
    };
    
    const resetFilters = () => {
        const emptyFilters = { text: '', tags: '', categories: [], minAmount: '', maxAmount: '', startDate: '', endDate: '' };
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
                    <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Filter nach Tag..."
                        value={filters.tags}
                        onChange={e => handleFilterChange('tags', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-end pt-4 border-t border-slate-700/50">
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center justify-center gap-2 text-sm text-white bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-semibold">
                        <SlidersHorizontal className="h-4 w-4"/>
                        <span>Erweiterte Filter</span>
                    </button>
                     <button onClick={resetFilters} className="text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 px-4 py-2 rounded-lg">
                        Zurücksetzen
                    </button>
                </div>
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

const TransactionsPage: FC = () => {
    const { transactions, tagMap } = useApp();

    const [filters, setFilters] = useState({
        text: '',
        tags: '',
        categories: [] as string[],
        minAmount: '',
        maxAmount: '',
        startDate: '',
        endDate: '',
    });
    const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilterId | null>('all');

    const handleQuickFilter = (filter: QuickFilterId) => {
        setActiveQuickFilter(filter);
        
        let startDate = '';
        let endDate = '';
        const now = new Date();

        switch (filter) {
            case 'today':
                startDate = format(startOfDay(now), 'yyyy-MM-dd');
                endDate = format(endOfDay(now), 'yyyy-MM-dd');
                break;
            case 'week':
                const weekInterval = getWeekInterval(now);
                startDate = format(weekInterval.start, 'yyyy-MM-dd');
                endDate = format(weekInterval.end, 'yyyy-MM-dd');
                break;
            case 'month':
                const monthInterval = getMonthInterval(now);
                startDate = format(monthInterval.start, 'yyyy-MM-dd');
                endDate = format(monthInterval.end, 'yyyy-MM-dd');
                break;
            case 'all':
                break; // a reset will set dates to ''
        }
        
        setFilters(prevFilters => ({ ...prevFilters, startDate, endDate }));
    };

    const handleAdvancedFilterChange = (newFilters: any) => {
        setFilters(newFilters);
        
        const { startDate, endDate } = newFilters;
        const now = new Date();

        let correspondingQuickFilter: QuickFilterId | null = null;
        if (startDate === format(startOfDay(now), 'yyyy-MM-dd') && endDate === format(endOfDay(now), 'yyyy-MM-dd')) {
            correspondingQuickFilter = 'today';
        } else if (startDate === format(getWeekInterval(now).start, 'yyyy-MM-dd') && endDate === format(getWeekInterval(now).end, 'yyyy-MM-dd')) {
            correspondingQuickFilter = 'week';
        } else if (startDate === format(getMonthInterval(now).start, 'yyyy-MM-dd') && endDate === format(getMonthInterval(now).end, 'yyyy-MM-dd')) {
            correspondingQuickFilter = 'month';
        } else if (!startDate && !endDate) {
            correspondingQuickFilter = 'all';
        }
        
        setActiveQuickFilter(correspondingQuickFilter);
    };

    const sortedTransactions = useMemo(() => 
        [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
    [transactions]);

    const filteredTransactions = useMemo(() => {
        return sortedTransactions.filter(t => {
            if (filters.text && !t.description.toLowerCase().includes(filters.text.toLowerCase())) return false;
            
            if (filters.tags) {
                const searchTags = filters.tags.toLowerCase().split(',').map(tag => tag.trim()).filter(Boolean);
                if (searchTags.length > 0) {
                    const transactionTagNames = (t.tagIds || []).map(id => tagMap.get(id)?.toLowerCase());
                    if (!searchTags.every(st => transactionTagNames.some(ttn => ttn?.includes(st)))) {
                        return false;
                    }
                }
            }

            if (filters.categories.length > 0 && !filters.categories.includes(t.categoryId)) return false;
            
            const min = parseFloat(filters.minAmount);
            if (!isNaN(min) && t.amount < min) return false;
            
            const max = parseFloat(filters.maxAmount);
            if (!isNaN(max) && t.amount > max) return false;
            
            try {
                if (!t.date || typeof t.date !== 'string') return false; // Guard against invalid date property
                const tDate = parseISO(t.date);
                if (isNaN(tDate.getTime())) return false; // Guard against invalid date string
                
                if (filters.startDate) {
                    const startDate = startOfDay(parseISO(filters.startDate));
                    if (isNaN(startDate.getTime())) return true; // Ignore invalid filter
                    if (tDate < startDate) return false;
                }
                if (filters.endDate) {
                    const endDate = endOfDay(parseISO(filters.endDate));
                    if (isNaN(endDate.getTime())) return true; // Ignore invalid filter
                    if (tDate > endDate) return false;
                }
            } catch (e) { 
                console.error("Date parsing error for transaction:", t, "or filter:", filters, e);
                return true; // Don't filter out item on parsing error
            }

            return true;
        });
    }, [sortedTransactions, filters, tagMap]);


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Transaktionen</h1>
            <TransactionFilters onFilterChange={handleAdvancedFilterChange} filters={filters} />
            <div className="h-[calc(100vh-380px)]">
                <TransactionList 
                    transactions={filteredTransactions}
                    showEmptyMessage={true}
                    activeQuickFilter={activeQuickFilter}
                    onQuickFilter={handleQuickFilter}
                />
            </div>
        </div>
    );
};

export default TransactionsPage;
