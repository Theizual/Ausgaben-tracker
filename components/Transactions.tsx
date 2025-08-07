

import React, { useState, useMemo, FC, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import type { Transaction, Category, Tag, QuickFilterId, User } from '../types';
import { format, parseISO, formatCurrency, endOfDay, startOfDay, getWeekInterval, getMonthInterval, isToday, isYesterday, startOfWeek, endOfWeek, getWeek, subDays } from '../utils/dateUtils';
import { de } from 'date-fns/locale';
import { iconMap, Search, SlidersHorizontal, ChevronDown, Tag as TagIcon, Edit, Trash2, X, Square, CheckSquare, Calendar } from './Icons';
import ViewSwitch from './ViewSwitch';
import { TagPill } from './ui/TagPill';
import StandardTransactionItem from './StandardTransactionItem';

type GroupedTransactions = {
    date: string;
    total: number;
    transactions: Transaction[];
}[];

const quickFilterButtons: { id: QuickFilterId; label: string }[] = [
    { id: 'current', label: 'Aktuell' },
    { id: 'month', label: 'Monat' },
    { id: 'all', label: 'Gesamt' },
];

const QuickFilters: FC<{
    activeQuickFilter: QuickFilterId | null;
    onQuickFilter: (filter: QuickFilterId) => void;
}> = ({ activeQuickFilter, onQuickFilter }) => {
    return (
        <div className="flex items-center space-x-1 bg-slate-700/80 p-1 rounded-full self-start">
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
    groupedTransactions: GroupedTransactions;
    showEmptyMessage?: boolean;
    viewMode?: 'list' | 'grid';
}> = ({ groupedTransactions, showEmptyMessage = false, viewMode = 'list' }) => {
    const { handleTransactionClick } = useApp();

    if (showEmptyMessage && groupedTransactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-4 min-h-[200px]">
                <Search className="h-12 w-12 mb-4 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-300">Keine Transaktionen gefunden</h3>
                <p>Für die aktuellen Filter gibt es keine Einträge.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <AnimatePresence>
                {groupedTransactions.map(group => {
                    const isList = viewMode === 'list';

                    return (
                        <motion.div 
                            key={group.date}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.3 }}
                            className={isList ? "bg-slate-800/20 rounded-xl" : ""}
                        >
                            <header className={`p-3 border-b border-slate-700/50 ${isList ? 'sticky top-[70px] md:top-[105px] bg-slate-800/80 backdrop-blur-sm z-10' : ''}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <h3 className="font-bold text-white text-md truncate">{group.date}</h3>
                                    <p className="text-xs text-slate-400 sm:text-right">Gesamt: {formatCurrency(group.total)}</p>
                                </div>
                            </header>
                            <div className={isList ? "p-2 space-y-1" : "grid grid-cols-1 sm:grid-cols-2 gap-3 p-2"}>
                                {group.transactions.map(t => (
                                    <StandardTransactionItem
                                        key={t.id}
                                        transaction={t}
                                        onClick={handleTransactionClick}
                                        viewMode={viewMode}
                                        showSublineInList='category'
                                        density='normal'
                                    />
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

const FilterModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onApplyFilters: (filters: any) => void;
    initialFilters: any;
}> = ({ isOpen, onClose, onApplyFilters, initialFilters }) => {
    const { categories } = useApp();
    const [localFilters, setLocalFilters] = useState(initialFilters);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLocalFilters(initialFilters);
            const hasAdvancedFilters = initialFilters.categories.length > 0 || initialFilters.minAmount || initialFilters.maxAmount;
            setShowAdvanced(hasAdvancedFilters);
        }
    }, [isOpen, initialFilters]);

    const handleFilterChange = (field: keyof typeof localFilters, value: any) => {
        setLocalFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleReset = () => {
        const emptyFilters = { text: '', tags: '', categories: [], minAmount: '', maxAmount: '', startDate: '', endDate: '' };
        onApplyFilters(emptyFilters);
        onClose();
    };

    const handleApply = () => {
        onApplyFilters(localFilters);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end md:items-center z-50"
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="bg-slate-800 rounded-t-2xl md:rounded-2xl w-full max-w-2xl shadow-2xl border-t md:border border-slate-700 flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    >
                        <header className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Search className="h-5 w-5"/> Suchen & Filtern</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors"><X className="h-5 w-5" /></button>
                        </header>

                        <main className="p-6 space-y-4 overflow-y-auto">
                            <div className="flex flex-col md:flex-row gap-3">
                                <div className="relative flex-grow">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Suche nach Beschreibung..."
                                        value={localFilters.text}
                                        onChange={e => handleFilterChange('text', e.target.value)}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>
                                <div className="relative flex-grow">
                                    <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Filter nach Tag (mit Komma trennen)..."
                                        value={localFilters.tags}
                                        onChange={e => handleFilterChange('tags', e.target.value)}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-700/50">
                                <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex justify-between items-center text-left text-lg font-semibold text-white">
                                    <span>Erweiterte Filter</span>
                                    <ChevronDown className={`h-5 w-5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            <AnimatePresence>
                            {showAdvanced && (
                                <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} exit={{opacity: 0, height: 0}} className="overflow-hidden">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                        <div className="md:col-span-2">
                                            <p className="text-sm font-medium text-slate-300 mb-2">Kategorien</p>
                                            <MultiCategoryPicker categories={categories} selected={localFilters.categories} onChange={val => handleFilterChange('categories', val)} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-300 mb-2">Betrag</p>
                                            <div className="flex items-center gap-2">
                                                <input type="number" placeholder="Min." value={localFilters.minAmount} onChange={e => handleFilterChange('minAmount', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500"/>
                                                <input type="number" placeholder="Max." value={localFilters.maxAmount} onChange={e => handleFilterChange('maxAmount', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500"/>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-300 mb-2">Zeitraum</p>
                                            <div className="flex items-center gap-2">
                                                <input type="date" value={localFilters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"/>
                                                <input type="date" value={localFilters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"/>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </main>

                        <footer className="p-4 border-t border-slate-700 flex justify-between items-center flex-shrink-0">
                             <button onClick={handleReset} className="text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 px-4 py-2 rounded-lg">
                                Zurücksetzen
                            </button>
                            <button onClick={handleApply} className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors">
                                Filter anwenden
                            </button>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const MultiCategoryPicker: FC<{
    categories: Category[];
    selected: string[];
    onChange: (selected: string[]) => void;
}> = ({ categories, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    const toggleCategory = (id: string) => {
        if (selected.includes(id)) {
            onChange(selected.filter(catId => catId !== id));
        } else {
            onChange([...selected, id]);
        }
    };
    
    React.useEffect(() => {
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

const TransactionsPage: FC = () => {
    const { 
        transactions, 
        tagMap,
        transactionFilters, 
        setTransactionFilters, 
        transactionActiveQuickFilter, 
        setTransactionActiveQuickFilter,
        transactionViewMode,
        setTransactionViewMode,
    } = useApp();
    const [isFilterModalOpen, setFilterModalOpen] = useState(false);

    const handleQuickFilter = (filter: QuickFilterId) => {
        setTransactionActiveQuickFilter(filter);
        
        let startDate = '';
        let endDate = '';
        const now = new Date();

        switch (filter) {
            case 'current':
                startDate = format(subDays(now, 2), 'yyyy-MM-dd');
                endDate = format(now, 'yyyy-MM-dd');
                break;
            case 'month':
                const monthInterval = getMonthInterval(now);
                startDate = format(monthInterval.start, 'yyyy-MM-dd');
                endDate = format(monthInterval.end, 'yyyy-MM-dd');
                break;
            case 'all':
                break; // a reset will set dates to ''
        }
        
        setTransactionFilters({
            text: '',
            tags: '',
            categories: [],
            minAmount: '',
            maxAmount: '',
            startDate,
            endDate,
        });
    };

    const handleAdvancedFilterChange = (newFilters: any) => {
        setTransactionFilters(newFilters);
        
        const { startDate, endDate, text, tags, categories, minAmount, maxAmount } = newFilters;
        const now = new Date();
        
        const hasAdvancedFilters = text || tags || categories.length > 0 || minAmount || maxAmount;
        let correspondingQuickFilter: QuickFilterId | null = null;
        
        if (!hasAdvancedFilters) {
            if (startDate === format(subDays(now, 2), 'yyyy-MM-dd') && endDate === format(now, 'yyyy-MM-dd')) {
                correspondingQuickFilter = 'current';
            } else if (startDate === format(getMonthInterval(now).start, 'yyyy-MM-dd') && endDate === format(getMonthInterval(now).end, 'yyyy-MM-dd')) {
                correspondingQuickFilter = 'month';
            } else if (!startDate && !endDate) {
                correspondingQuickFilter = 'all';
            }
        }
        
        setTransactionActiveQuickFilter(correspondingQuickFilter);
    };

    const isFilterActive = useMemo(() => {
        return !!(transactionFilters.text || 
               transactionFilters.tags || 
               transactionFilters.categories.length > 0 || 
               transactionFilters.minAmount || 
               transactionFilters.maxAmount);
    }, [transactionFilters]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (transactionFilters.text && !t.description.toLowerCase().includes(transactionFilters.text.toLowerCase())) return false;
            
            if (transactionFilters.tags) {
                const searchTags = transactionFilters.tags.toLowerCase().split(',').map(tag => tag.trim()).filter(Boolean);
                if (searchTags.length > 0) {
                    const transactionTagNames = (t.tagIds || []).map(id => tagMap.get(id)?.toLowerCase());
                    if (!searchTags.every(st => transactionTagNames.some(ttn => ttn?.includes(st)))) {
                        return false;
                    }
                }
            }

            if (transactionFilters.categories.length > 0 && !transactionFilters.categories.includes(t.categoryId)) return false;
            
            const min = parseFloat(transactionFilters.minAmount);
            if (!isNaN(min) && t.amount < min) return false;
            
            const max = parseFloat(transactionFilters.maxAmount);
            if (!isNaN(max) && t.amount > max) return false;
            
            try {
                if (!t.date || typeof t.date !== 'string') return false; 
                const tDate = parseISO(t.date);
                if (isNaN(tDate.getTime())) return false;
                
                if (transactionFilters.startDate) {
                    const startDate = startOfDay(parseISO(transactionFilters.startDate));
                    if (isNaN(startDate.getTime())) return true;
                    if (tDate < startDate) return false;
                }
                if (transactionFilters.endDate) {
                    const endDate = endOfDay(parseISO(transactionFilters.endDate));
                    if (isNaN(endDate.getTime())) return true; 
                    if (tDate > endDate) return false;
                }
            } catch (e) { 
                console.error("Date parsing error for transaction:", t, "or filter:", transactionFilters, e);
                return true; 
            }

            return true;
        });
    }, [transactions, transactionFilters, tagMap]);

    const groupedTransactions = useMemo(() => {
        const isWeeklyGrouping = transactionActiveQuickFilter === 'month' || transactionActiveQuickFilter === 'all';
        const groups: { [key: string]: { total: number, transactions: Transaction[] } } = {};
        
        filteredTransactions.forEach(t => {
            let dateKey: string;
            try {
                const tDate = parseISO(t.date);
                if (isWeeklyGrouping) {
                    dateKey = format(startOfWeek(tDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                } else { // Daily grouping for 'current' filter
                    dateKey = format(tDate, 'yyyy-MM-dd');
                }
            } catch(e) { return; } // ignore invalid dates

            if (!groups[dateKey]) {
                groups[dateKey] = { total: 0, transactions: [] };
            }
            groups[dateKey].total += t.amount;
            groups[dateKey].transactions.push(t);
        });

        return Object.entries(groups).map(([dateKey, groupData]) => {
            const parsedDate = parseISO(dateKey);
            let formattedDate: string;
            
            if (isWeeklyGrouping) {
                const weekStart = parsedDate;
                const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                const startFormat = format(weekStart, 'd. MMM');
                const endFormat = format(weekEnd, 'd. MMM yyyy');
                const weekNumber = getWeek(weekStart, { weekStartsOn: 1, locale: de });
                formattedDate = `KW ${weekNumber}: ${startFormat} - ${endFormat}`;
            } else { // Daily grouping for 'current' filter
                 if(isToday(parsedDate)) formattedDate = `Heute, ${format(parsedDate, 'dd. MMMM', { locale: de })}`;
                else if(isYesterday(parsedDate)) formattedDate = `Gestern, ${format(parsedDate, 'dd. MMMM', { locale: de })}`;
                else formattedDate = format(parsedDate, 'EEEE, dd. MMMM', { locale: de });
            }

            // Sort transactions within each group by date descending
            groupData.transactions.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

            return {
                date: formattedDate,
                total: groupData.total,
                transactions: groupData.transactions,
            }
        }).sort((a, b) => parseISO(b.transactions[0].date).getTime() - parseISO(a.transactions[0].date).getTime()); // Sort groups by date descending
    }, [filteredTransactions, transactionActiveQuickFilter]);

    return (
        <div className="space-y-4">
            <h1 className="text-3xl font-bold text-white">Transaktionen</h1>
            
            <motion.div
                layout
                className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50"
            >
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <QuickFilters activeQuickFilter={transactionActiveQuickFilter} onQuickFilter={handleQuickFilter} />
                    <div className="flex items-center gap-2">
                         <ViewSwitch viewMode={transactionViewMode} onChange={setTransactionViewMode} />
                        <motion.button
                            layout
                            onClick={() => setFilterModalOpen(true)}
                            className={`relative p-2 rounded-full transition-colors ${
                                isFilterActive
                                    ? 'bg-rose-500/30 text-rose-300'
                                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`}
                            title="Suchen & Filtern"
                        >
                            <SlidersHorizontal className="h-5 w-5" />
                            {isFilterActive && (
                                <motion.div layoutId="filter-dot" className="absolute top-1 right-1 h-2 w-2 bg-rose-400 rounded-full" />
                            )}
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            <motion.div
                layout
                className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50"
            >
                <TransactionList
                    groupedTransactions={groupedTransactions}
                    showEmptyMessage={true}
                    viewMode={transactionViewMode}
                />
            </motion.div>
            
            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setFilterModalOpen(false)}
                onApplyFilters={handleAdvancedFilterChange}
                initialFilters={transactionFilters}
            />
        </div>
    );
};

export default TransactionsPage;