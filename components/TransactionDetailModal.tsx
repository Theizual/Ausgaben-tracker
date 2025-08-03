
import React, { useState, useEffect, useMemo, FC, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '../contexts/AppContext';
import type { Transaction, Category, Tag } from '../types';
import { format, parseISO, formatCurrency } from '../utils/dateUtils';
import { iconMap, X, Edit, Trash2, Tag as TagIcon } from './Icons';
import CategoryButtons from './CategoryButtons';
import TagInput from './TagInput';
import AvailableTags from './AvailableTags';

interface TransactionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction;
    initialMode: 'view' | 'edit';
}

const TransactionDetailModal: FC<TransactionDetailModalProps> = ({
    isOpen,
    onClose,
    transaction,
    initialMode,
}) => {
    const { 
        categoryMap, 
        tagMap, 
        updateTransaction, 
        deleteTransaction,
        categories,
        categoryGroups,
        allAvailableTags,
        transactions
    } = useApp();

    const [isEditing, setIsEditing] = useState(initialMode === 'edit');
    const [formState, setFormState] = useState(transaction);
    const [localTags, setLocalTags] = useState<string[]>([]);
    const [amountInput, setAmountInput] = useState<string>(''); // For handling empty input
    
    const category = categoryMap.get(formState.categoryId);
    const Icon = category ? iconMap[category.icon] || iconMap.MoreHorizontal : iconMap.MoreHorizontal;
    const color = category ? category.color : '#64748b';

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            setIsEditing(initialMode === 'edit');
            setFormState(transaction);
            setAmountInput(String(transaction.amount));
            const tagNames = (transaction.tagIds || []).map(id => tagMap.get(id)).filter((name): name is string => !!name);
            setLocalTags(tagNames);
        } else {
            // Reset editing state when modal closes
            setTimeout(() => setIsEditing(false), 200); // delay to allow exit animation
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, transaction, tagMap, initialMode, onClose]);
    
    const recentlyUsedTags = useMemo(() => {
        const sortedTransactions = [...transactions].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        const recentTagIds = new Set<string>();

        for (const trans of sortedTransactions) {
            if (recentTagIds.size >= 10) break;
            if (trans.tagIds) {
                for (const tagId of trans.tagIds) {
                    if (recentTagIds.size >= 10) break;
                    recentTagIds.add(tagId);
                }
            }
        }
        
        const currentTagMap = new Map(allAvailableTags.map(t => [t.id, t]));
        return Array.from(recentTagIds).map(id => currentTagMap.get(id)).filter((t): t is Tag => !!t);
    }, [transactions, allAvailableTags]);

    const handleSave = () => {
        const numAmount = parseFloat(amountInput.replace(',', '.'));
        if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
            toast.error('Bitte geben Sie einen gültigen Betrag ein.');
            return;
        }

        const updatedFormState = { ...formState, amount: numAmount };
        updateTransaction(updatedFormState, localTags);
        onClose();
    };

    const handleDelete = useCallback(() => {
        if (window.confirm(`Möchten Sie die Ausgabe "${transaction.description}" wirklich löschen?`)) {
            deleteTransaction(transaction.id);
            // No need to call onClose() here, as the AppContext logic handles it now
        }
    }, [transaction, deleteTransaction]);

    const handleCancelEdit = () => {
        setFormState(transaction);
        setAmountInput(String(transaction.amount));
        const tagNames = (transaction.tagIds || []).map(id => tagMap.get(id)).filter((name): name is string => !!name);
        setLocalTags(tagNames);
        setIsEditing(false);
    };

    const handleTagClick = (tag: string) => {
        setLocalTags(prev => {
            const currentTags = prev || [];
            return currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag];
        });
    };

    const getFormattedDate = (dateString: string, formatString: string) => {
        try {
            if (!dateString || typeof dateString !== 'string') return '';
            const parsedDate = parseISO(dateString);
            return isNaN(parsedDate.getTime()) ? '' : format(parsedDate, formatString);
        } catch {
            return '';
        }
    };

    const renderViewMode = () => (
        <>
            <div className="p-6 sm:p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: color }}>
                    <Icon className="h-8 w-8 text-white" />
                </div>
                <p className="text-4xl font-bold text-white">{formatCurrency(transaction.amount)}</p>
                <p className="text-lg text-slate-300 mt-1">{transaction.description}</p>
                <p className="text-sm text-slate-500">{category?.name}</p>
                <p className="text-sm text-slate-400 mt-4">{getFormattedDate(transaction.date, 'EEEE, dd. MMMM yyyy, HH:mm')} Uhr</p>

                {transaction.tagIds && transaction.tagIds.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                        {transaction.tagIds.map(id => {
                            const tagName = tagMap.get(id);
                            if (!tagName) return null;
                            return (
                                <div key={id} className="text-sm font-medium bg-slate-700 text-slate-300 px-3 py-1 rounded-full">
                                    #{tagName}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
            <div className="p-4 bg-slate-800/50 border-t border-slate-700 grid grid-cols-3 gap-3">
                 <button onClick={() => setIsEditing(true)} className="px-4 py-3 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                    <Edit className="h-5 w-5" /> <span className="hidden sm:inline">Bearbeiten</span>
                </button>
                <button onClick={handleDelete} className="px-4 py-3 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2">
                    <Trash2 className="h-5 w-5" /> <span className="hidden sm:inline">Löschen</span>
                </button>
                <button onClick={onClose} className="px-4 py-3 rounded-lg text-sm font-semibold text-white bg-slate-600 hover:bg-slate-500 transition-colors col-span-3 sm:col-span-1">Schließen</button>
            </div>
        </>
    );

    const renderEditMode = () => (
         <div className="p-6 sm:p-8 space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">Eintrag bearbeiten</h3>
            <div className="grid grid-cols-2 gap-3">
                <input 
                    type="text"
                    inputMode="decimal"
                    value={amountInput} 
                    onChange={e => setAmountInput(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Betrag"
                />
                <input
                    type="date"
                    value={getFormattedDate(formState.date, 'yyyy-MM-dd')}
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
                        } catch (err) { /* ignore invalid date input */ }
                    }}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                />
             </div>
             <input 
                type="text" 
                value={formState.description} 
                onChange={e => setFormState({...formState, description: e.target.value})} 
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Beschreibung"
            />
             <div className="space-y-3">
                <TagInput
                    tags={localTags}
                    setTags={setLocalTags}
                    allAvailableTags={allAvailableTags}
                />
                <AvailableTags
                    availableTags={recentlyUsedTags}
                    selectedTags={localTags}
                    onTagClick={handleTagClick}
                />
             </div>
             <CategoryButtons 
                categories={categories}
                categoryGroups={categoryGroups}
                selectedCategoryId={formState.categoryId}
                onSelectCategory={(id) => setFormState({...formState, categoryId: id})}
             />
             <div className="flex justify-end gap-3 pt-4">
                <button onClick={handleCancelEdit} className="px-4 py-3 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-700 transition-colors">Abbrechen</button>
                <button onClick={handleSave} className="px-6 py-3 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors">Speichern</button>
             </div>
        </div>
    );

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
                        className="bg-slate-800 rounded-t-2xl md:rounded-2xl w-full max-w-lg shadow-2xl border-t md:border border-slate-700 flex flex-col overflow-hidden max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    >
                        {/* Optional: Add a grab handle for mobile */}
                        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-3 md:hidden" />
                        
                        <div className="overflow-y-auto">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={isEditing ? 'edit' : 'view'}
                                    initial={{ opacity: 0, x: isEditing ? 50 : -50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: isEditing ? -50 : 50 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {isEditing ? renderEditMode() : renderViewMode()}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TransactionDetailModal;
