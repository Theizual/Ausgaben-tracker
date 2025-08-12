





import React, { FC, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { Transaction } from '@/shared/types';
import { format, parseISO, isToday, isYesterday, startOfWeek, endOfWeek, getWeek, isValid, startOfDay, endOfDay } from 'date-fns';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { Search } from '@/shared/ui';
import { StandardTransactionItem } from '@/shared/ui';

type GroupedTransactions = {
    date: string;
    total: number;
    transactions: Transaction[];
}[];

export const TransactionList: FC = () => {
    const { 
        handleTransactionClick, 
        transactions, 
        transactionFilters, 
        tagMap, 
        transactionActiveQuickFilter,
        deLocale 
    } = useApp();

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
                if (!isValid(tDate)) return false;
                
                if (transactionFilters.startDate) {
                    const filterStart = startOfDay(parseISO(transactionFilters.startDate));
                    if (!isValid(filterStart)) return false;
                    if (tDate < filterStart) return false;
                }
                if (transactionFilters.endDate) {
                    const filterEnd = endOfDay(parseISO(transactionFilters.endDate));
                    if (!isValid(filterEnd)) return false;
                    if (tDate > filterEnd) return false;
                }
            } catch (e) { 
                return false; 
            }

            return true;
        });
    }, [transactions, transactionFilters, tagMap]);

    const groupedTransactions: GroupedTransactions = useMemo(() => {
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
                const weekNumber = getWeek(weekStart, { weekStartsOn: 1, locale: deLocale });
                formattedDate = `KW ${weekNumber}: ${startFormat} - ${endFormat}`;
            } else { // Daily grouping for 'current' filter
                 if(isToday(parsedDate)) formattedDate = `Heute, ${format(parsedDate, 'dd. MMMM', { locale: deLocale })}`;
                else if(isYesterday(parsedDate)) formattedDate = `Gestern, ${format(parsedDate, 'dd. MMMM', { locale: deLocale })}`;
                else formattedDate = format(parsedDate, 'EEEE, dd. MMMM', { locale: deLocale });
            }

            // Sort transactions within each group by date descending
            groupData.transactions.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

            return {
                date: formattedDate,
                total: groupData.total,
                transactions: groupData.transactions,
            }
        }).sort((a, b) => parseISO(b.transactions[0].date).getTime() - parseISO(a.transactions[0].date).getTime());
    }, [filteredTransactions, transactionActiveQuickFilter, deLocale]);

    if (groupedTransactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-4 min-h-[200px]">
                <Search className="h-12 w-12 mb-4 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-300">Keine Transaktionen gefunden</h3>
                <p>Für die aktuellen Filter gibt es keine Einträge.</p>
            </div>
        );
    }
    
    const groupAnimation = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 20 },
        transition: { duration: 0.3 },
    };

    return (
        <div className="space-y-4">
            <AnimatePresence>
                {groupedTransactions.map(group => {
                    return (
                        <motion.div 
                            key={group.date}
                            {...groupAnimation}
                            className="bg-slate-800/20 rounded-xl"
                        >
                            <header className="p-3 border-b border-slate-700/50 sticky top-[70px] md:top-[105px] bg-slate-800/80 backdrop-blur-sm z-10">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <h3 className="font-bold text-white text-md truncate">{group.date}</h3>
                                    <p className="text-xs text-slate-400 sm:text-right">Gesamt: {formatCurrency(group.total)}</p>
                                </div>
                            </header>
                            <div className="p-2 space-y-1">
                                {group.transactions.map(t => (
                                    <StandardTransactionItem
                                        key={t.id}
                                        transaction={t}
                                        onClick={handleTransactionClick}
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