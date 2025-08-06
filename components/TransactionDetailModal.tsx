import React, { useState, useEffect, useMemo, FC, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '../contexts/AppContext';
import type { Transaction, Category, Tag, CategoryId, User } from '../types';
import { format, parseISO, formatCurrency } from '../utils/dateUtils';
import { iconMap, X, Edit, Trash2, Tag as TagIcon, CheckSquare, Square } from './Icons';
import CategoryButtons from './CategoryButtons';

const MotionDiv = motion('div');
const MotionButton = motion('button');

interface TransactionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction;
}

const TransactionDetailModal: FC<TransactionDetailModalProps> = ({
    isOpen,
    onClose,
    transaction,
}) => {
    const { 
        categoryMap, 
        tagMap, 
        updateTransaction, 
        deleteTransaction,
        categories,
        categoryGroups,
        allAvailableTags,
        transactions,
        users,
    } = useApp();

    const [formState, setFormState] = useState(transaction);
    
    // States for inline editing
    const [isEditingAmount, setIsEditingAmount] = useState(false);
    const [amountValue, setAmountValue] = useState('');
    const [isPickingCategory, setIsPickingCategory] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [descriptionValue, setDescriptionValue] = useState('');
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [dateValue, setDateValue] = useState('');
    const [isPickingUser, setIsPickingUser] = useState(false);
    const [isEditingTags, setIsEditingTags] = useState(false);
    
    const category = categoryMap.get(formState.categoryId);
    const Icon = category ? iconMap[category.icon] || iconMap.MoreHorizontal : iconMap.MoreHorizontal;
    const color = category ? category.color : '#64748b';

    const createdBy = useMemo(() => {
        if (!formState.createdBy) return null;
        return users.find(u => u.id === formState.createdBy);
    }, [formState.createdBy, users]);

    const getTagNames = useCallback((t: Transaction) => (t.tagIds || []).map(id => tagMap.get(id)).filter((name): name is string => !!name), [tagMap]);

    useEffect(() => {
        if (isOpen) {
            setFormState(transaction);
            
            // Reset all inline editing states on open
            setIsEditingAmount(false);
            setIsPickingCategory(false);
            setIsEditingDescription(false);
            setIsEditingDate(false);
            setIsPickingUser(false);
            setIsEditingTags(false);
        }
    }, [isOpen, transaction]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (isEditingTags) setIsEditingTags(false);
                else if (isPickingUser) setIsPickingUser(false);
                else if (isPickingCategory) setIsPickingCategory(false);
                else if (isEditingDate) setIsEditingDate(false);
                else if (isEditingAmount) setIsEditingAmount(false);
                else if (isEditingDescription) setIsEditingDescription(false);
                else onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, isEditingAmount, isPickingCategory, isEditingDate, isEditingDescription, isPickingUser, isEditingTags]);
    
    const handleDelete = useCallback(() => {
        if (window.confirm(`Möchten Sie die Ausgabe "${transaction.description}" wirklich löschen?`)) {
            deleteTransaction(transaction.id);
        }
    }, [transaction, deleteTransaction]);

    const getFormattedDate = (dateString: string, formatString: string) => {
        try {
            if (!dateString || typeof dateString !== 'string') return '';
            const parsedDate = parseISO(dateString);
            return isNaN(parsedDate.getTime()) ? '' : format(parsedDate, formatString);
        } catch {
            return '';
        }
    };
    
    const handleUpdate = useCallback((updates: Partial<Transaction>, newTags?: string[]) => {
        const updatedTransaction = { ...formState, ...updates };
        updateTransaction(updatedTransaction, newTags ?? getTagNames(formState));
        setFormState(updatedTransaction);
    }, [formState, updateTransaction, getTagNames]);

    const handleAmountUpdate = () => {
        const newAmount = parseFloat(amountValue.replace(',', '.'));
        if (isNaN(newAmount) || newAmount <= 0) {
            toast.error('Ungültiger Betrag.');
        } else if (newAmount !== formState.amount) {
            handleUpdate({ amount: newAmount });
            toast.success('Betrag aktualisiert');
        }
        setIsEditingAmount(false);
    };

    const handleDescriptionUpdate = () => {
        if(descriptionValue.trim() && descriptionValue.trim() !== formState.description){
            handleUpdate({ description: descriptionValue.trim() });
            toast.success("Beschreibung aktualisiert.");
        }
        setIsEditingDescription(false);
    };

    const handleDateUpdate = () => {
        try {
            const newDate = new Date(dateValue);
            if(isNaN(newDate.getTime())) throw new Error("Invalid date");
            const newISO = newDate.toISOString();
            if(newISO !== formState.date){
                handleUpdate({ date: newISO });
                toast.success("Datum aktualisiert.");
            }
        } catch(e) {
            toast.error("Ungültiges Datumformat.");
        }
        setIsEditingDate(false);
    };

    const handleCategoryUpdate = (newCategoryId: CategoryId) => {
        if (newCategoryId !== formState.categoryId) {
            handleUpdate({ categoryId: newCategoryId });
            toast.success('Kategorie aktualisiert');
        }
        setIsPickingCategory(false);
    };

    const handleUserUpdate = (newUserId: string | null) => {
        if(newUserId !== formState.createdBy) {
            handleUpdate({ createdBy: newUserId || undefined });
            toast.success("Benutzer aktualisiert.");
        }
        setIsPickingUser(false);
    }
    
    const handleTagsUpdate = (newTagNames: string[]) => {
        handleUpdate({}, newTagNames);
        toast.success("Tags aktualisiert.");
        setIsEditingTags(false);
    };

    const localTags = getTagNames(formState);

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <MotionDiv
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <MotionDiv
                            className="bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden max-h-[90vh]"
                            onClick={e => e.stopPropagation()}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        >
                            <div className="overflow-y-auto custom-scrollbar">
                                <>
                                    <div className="relative p-6 sm:p-8 flex flex-col items-center text-center">
                                         <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-700 transition-colors z-10">
                                            <X className="h-5 w-5" />
                                        </button>
                                        <MotionButton 
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setIsPickingCategory(true)}
                                            className="w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform" 
                                            style={{ backgroundColor: color }}
                                            title="Kategorie ändern"
                                        >
                                            <Icon className="h-8 w-8 text-white" />
                                        </MotionButton>
                                        
                                        {isEditingAmount ? (
                                            <MotionDiv initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="my-1">
                                                 <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={amountValue}
                                                    onChange={(e) => setAmountValue(e.target.value)}
                                                    onBlur={handleAmountUpdate}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAmountUpdate()}
                                                    className="w-48 text-center bg-slate-700 border border-slate-600 rounded-lg py-2 text-4xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                                                    autoFocus
                                                />
                                            </MotionDiv>
                                        ) : (
                                            <button onClick={() => { setAmountValue(String(formState.amount).replace('.', ',')); setIsEditingAmount(true); }} className="rounded-lg p-1 -m-1" title="Betrag ändern">
                                                <p className="text-4xl font-bold text-white">{formatCurrency(formState.amount)}</p>
                                            </button>
                                        )}
                                        
                                        {isEditingDescription ? (
                                             <MotionDiv initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mt-2">
                                                <input
                                                    type="text"
                                                    value={descriptionValue}
                                                    onChange={(e) => setDescriptionValue(e.target.value)}
                                                    onBlur={handleDescriptionUpdate}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleDescriptionUpdate()}
                                                    className="w-full text-center bg-slate-700 border border-slate-600 rounded-lg py-1 text-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                                                    autoFocus
                                                />
                                             </MotionDiv>
                                        ) : (
                                             <button onClick={() => { setDescriptionValue(formState.description); setIsEditingDescription(true); }} className="w-full rounded-lg p-1 -m-1 mt-2" title="Beschreibung ändern">
                                                <p className="text-lg font-semibold text-white truncate">{formState.description}</p>
                                            </button>
                                        )}
                                        <p className="text-sm text-slate-400">{category?.name}</p>

                                        {/* Metadata Section */}
                                        <div className="w-full max-w-sm mt-6 pt-4 border-t border-slate-700/50 space-y-3 text-sm">
                                             <div className="flex justify-between items-center">
                                                <span className="text-slate-400 font-medium">Datum</span>
                                                 {isEditingDate ? (
                                                      <input
                                                        type="datetime-local"
                                                        value={dateValue}
                                                        onChange={e => setDateValue(e.target.value)}
                                                        onBlur={handleDateUpdate}
                                                        className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                                                        autoFocus
                                                      />
                                                 ) : (
                                                    <button onClick={() => { setDateValue(getFormattedDate(formState.date, "yyyy-MM-dd'T'HH:mm")); setIsEditingDate(true);}} className="text-slate-200 font-medium rounded p-1 -m-1" title="Datum ändern">
                                                        {getFormattedDate(formState.date, 'dd. MMM yyyy, HH:mm')} Uhr
                                                    </button>
                                                 )}
                                            </div>
                                            {createdBy && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400 font-medium">Erstellt von</span>
                                                    <button onClick={() => setIsPickingUser(true)} className="flex items-center gap-2 text-slate-200 font-medium rounded p-1 -m-1" title="Benutzer ändern">
                                                         <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: createdBy.color }}>
                                                            {createdBy.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span>{createdBy.name}</span>
                                                    </button>
                                                </div>
                                            )}
                                            {formState.isDev && (
                                                 <div className="flex justify-between items-center">
                                                    <span className="text-slate-400 font-medium">Status</span>
                                                    <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">DEV EINTRAG</span>
                                                </div>
                                            )}
                                        </div>

                                        {localTags.length > 0 && (
                                             <div className="w-full max-w-sm mt-4 pt-4 border-t border-slate-700/50">
                                                <div className="flex items-center justify-center gap-2 mb-2">
                                                    <h4 className="text-sm font-medium text-slate-400">Tags</h4>
                                                    <button onClick={() => setIsEditingTags(true)} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700" title="Tags bearbeiten">
                                                        <Edit className="h-3 w-3"/>
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap justify-center gap-2">
                                                    {localTags.map(tagName => (
                                                        <div key={tagName} className="text-sm font-medium bg-rose-500/20 text-rose-300 px-3 py-1 rounded-full">
                                                            #{tagName}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 bg-slate-800/50 border-t border-slate-700">
                                        <button onClick={handleDelete} className="w-full px-4 py-3 rounded-lg text-sm font-semibold text-red-400 bg-slate-700/50 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2">
                                            <Trash2 className="h-5 w-5" />
                                            <span>Löschen</span>
                                        </button>
                                    </div>
                                </>
                            </div>
                        </MotionDiv>
                    </MotionDiv>
                )}
            </AnimatePresence>
            <PickerModals
                isPickingCategory={isPickingCategory}
                setIsPickingCategory={setIsPickingCategory}
                handleCategoryUpdate={handleCategoryUpdate}
                isPickingUser={isPickingUser}
                setIsPickingUser={setIsPickingUser}
                handleUserUpdate={handleUserUpdate}
                isEditingTags={isEditingTags}
                setIsEditingTags={setIsEditingTags}
                handleTagsUpdate={handleTagsUpdate}
                currentTransaction={formState}
            />
        </>
    );
};

// Picker Modals Extracted for Clarity
const PickerModals: FC<any> = ({
    isPickingCategory, setIsPickingCategory, handleCategoryUpdate,
    isPickingUser, setIsPickingUser, handleUserUpdate,
    isEditingTags, setIsEditingTags, handleTagsUpdate,
    currentTransaction,
}) => {
    const { categories, categoryGroups, users, allAvailableTags, tagMap } = useApp();
    const currentTagNames = useMemo(() => (currentTransaction.tagIds || []).map((id:string) => tagMap.get(id)).filter(Boolean), [currentTransaction.tagIds, tagMap]);

    return (
        <>
            <AnimatePresence>
                {isPickingCategory && (
                     <PickerModalBase onClose={() => setIsPickingCategory(false)} title="Kategorie ändern">
                        <CategoryButtons 
                            categories={categories}
                            categoryGroups={categoryGroups}
                            selectedCategoryId={currentTransaction.categoryId}
                            onSelectCategory={handleCategoryUpdate}
                        />
                     </PickerModalBase>
                )}
                {isPickingUser && (
                     <PickerModalBase onClose={() => setIsPickingUser(false)} title="Benutzer ändern">
                        <div className="space-y-2">
                         {users.map((user: User) => (
                            <button
                                key={user.id}
                                onClick={() => handleUserUpdate(user.id)}
                                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-slate-700/50 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{backgroundColor: user.color}}>
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-white">{user.name}</span>
                                {currentTransaction.createdBy === user.id && <CheckSquare className="h-5 w-5 text-rose-400 ml-auto" />}
                            </button>
                         ))}
                        </div>
                     </PickerModalBase>
                )}
                 {isEditingTags && (
                     <TagEditorModal
                        initialTagNames={currentTagNames}
                        allTags={allAvailableTags}
                        onSave={handleTagsUpdate}
                        onClose={() => setIsEditingTags(false)}
                     />
                 )}
            </AnimatePresence>
        </>
    );
};

const PickerModalBase: FC<{onClose: () => void; title: string; children: React.ReactNode;}> = ({onClose, title, children}) => (
    <MotionDiv
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[60] p-4"
        onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
        <MotionDiv
            className="bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700 flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.3 }}
        >
            <div className="p-6 border-b border-slate-700 flex-shrink-0 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700"><X className="h-5 w-5"/></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
                {children}
            </div>
        </MotionDiv>
    </MotionDiv>
);

const TagEditorModal: FC<{
    initialTagNames: string[];
    allTags: Tag[];
    onSave: (tagNames: string[]) => void;
    onClose: () => void;
}> = ({ initialTagNames, allTags, onSave, onClose }) => {
    const [selectedTagNames, setSelectedTagNames] = useState<string[]>(initialTagNames);

    const toggleTag = (tagName: string) => {
        setSelectedTagNames(prev => prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]);
    };
    
    const sortedTags = useMemo(() => [...allTags].sort((a,b) => a.name.localeCompare(b.name)), [allTags]);

    return (
        <PickerModalBase onClose={onClose} title="Tags bearbeiten">
            <div className="flex flex-wrap gap-2">
                {sortedTags.map(tag => (
                     <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.name)}
                        className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors flex items-center gap-2 ${
                            selectedTagNames.includes(tag.name) ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                     >
                        {selectedTagNames.includes(tag.name) ? <CheckSquare className="h-4 w-4"/> : <Square className="h-4 w-4 text-slate-500"/>}
                        #{tag.name}
                     </button>
                ))}
            </div>
             <div className="mt-6 pt-4 border-t border-slate-700 flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-700">Abbrechen</button>
                <button onClick={() => onSave(selectedTagNames)} className="px-6 py-2 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500">Speichern</button>
             </div>
        </PickerModalBase>
    );
}

export default TransactionDetailModal;