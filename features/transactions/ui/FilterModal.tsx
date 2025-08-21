import React, { useState, useEffect, FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Modal, Search, Tag, ChevronDown } from '@/shared/ui';
import { MultiCategoryPicker } from './MultiCategoryPicker';

export const FilterModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onApplyFilters: (filters: any) => void;
    initialFilters: any;
}> = ({ isOpen, onClose, onApplyFilters, initialFilters }) => {
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
    
    const footer = (
        <div className="flex justify-between items-center">
             <button onClick={handleReset} className="text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 px-4 py-2 rounded-lg">
                Zurücksetzen
            </button>
            <button onClick={handleApply} className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors">
                Filter anwenden
            </button>
        </div>
    );

    const advancedFilterAnimation = {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: 'auto' },
        exit: { opacity: 0, height: 0 },
    };

    return (
         <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Suchen & Filtern"
            size="2xl"
            footer={footer}
        >
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-grow flex items-center bg-slate-700 border border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-rose-500 px-3">
                        <Search className="h-5 w-5 text-slate-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Suche nach Beschreibung"
                            value={localFilters.text}
                            onChange={e => handleFilterChange('text', e.target.value)}
                            className="w-full bg-transparent border-none pl-2 py-2.5 text-white placeholder-slate-500 focus:outline-none"
                        />
                    </div>
                    <div className="flex-grow flex items-center bg-slate-700 border border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-rose-500 px-3">
                        <Tag className="h-5 w-5 text-slate-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Filter nach Tag (mit Komma trennen)"
                            value={localFilters.tags}
                            onChange={e => handleFilterChange('tags', e.target.value)}
                            className="w-full bg-transparent border-none pl-2 py-2.5 text-white placeholder-slate-500 focus:outline-none"
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
                    <motion.div {...advancedFilterAnimation} className="overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <div className="md:col-span-2">
                                <p className="text-sm font-medium text-slate-300 mb-2">Kategorien</p>
                                <MultiCategoryPicker selected={localFilters.categories} onChange={val => handleFilterChange('categories', val)} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-300 mb-2">Betrag</p>
                                <div className="flex items-center gap-2">
                                    <input type="number" placeholder="Min." value={localFilters.minAmount} onChange={e => handleFilterChange('minAmount', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"/>
                                    <input type="number" placeholder="Max." value={localFilters.maxAmount} onChange={e => handleFilterChange('maxAmount', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"/>
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
            </div>
        </Modal>
    );
};