





import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { QuickFilterId } from '@/shared/types';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { SlidersHorizontal } from '@/shared/ui';
import { QuickFilters } from './ui/QuickFilters';
import { TransactionList } from './ui/TransactionList';
import { FilterModal } from './ui/FilterModal';

const TransactionsPage = () => {
    const { 
        transactions, 
        tagMap,
        transactionFilters, 
        setTransactionFilters, 
        transactionActiveQuickFilter, 
        setTransactionActiveQuickFilter,
        deLocale,
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
                const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) };
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
            } else if (startDate === format(startOfMonth(now), 'yyyy-MM-dd') && endDate === format(endOfMonth(now), 'yyyy-MM-dd')) {
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
    
    const motionContainerProps = { layout: true };
    const motionButtonProps = { layout: true };
    const motionDotProps = { layoutId: "filter-dot" };

    return (
        <div className="space-y-4">
            <h1 className="text-3xl font-bold text-white">Transaktionen</h1>
            
            <motion.div
                {...motionContainerProps}
                className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50"
            >
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <QuickFilters activeQuickFilter={transactionActiveQuickFilter} onQuickFilter={handleQuickFilter} />
                    <div className="flex items-center gap-2">
                        <motion.button
                            {...motionButtonProps}
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
                                <motion.div {...motionDotProps} className="absolute top-1 right-1 h-2 w-2 bg-rose-400 rounded-full" />
                            )}
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            <motion.div
                {...motionContainerProps}
                className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50"
            >
                <TransactionList />
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