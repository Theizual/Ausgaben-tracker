import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import type { Transaction, CategoryId, User } from '@/shared/types';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { iconMap, X, Edit, Trash2, Plus, FlaskConical, Link, getIconComponent, RefreshCcw, Button, PlusCircle, Info, ShieldCheck, ToggleSwitch } from '@/shared/ui';
import { PickerModals } from './ui/PickerModals';
import { TagPill } from '@/shared/ui';
import { modalBackdropAnimation, modalContentAnimation, collapsibleAnimation } from '@/shared/lib/animations';
import { MergePickerModal } from './ui/MergePickerModal';
import { CorrectedBadge } from './ui/CorrectedBadge';

interface TransactionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction;
}

const TransactionDetailModal = ({
    isOpen,
    onClose,
    transaction,
}: TransactionDetailModalProps) => {
    const { 
        categoryMap, 
        tagMap, 
        updateTransaction, 
        deleteTransaction,
        users,
        deLocale,
        transactions: allTransactions,
        transactionGroups,
        handleTransactionClick: showTransactionDetail,
        updateGroupedTransaction,
        removeTransactionFromGroup,
        mergeTransactionWithTarget,
        updateGroupVerifiedStatus,
        updateGroupTargetAmount,
        addTransactionToGroup
    } = useApp();

    const [formState, setFormState] = useState(transaction);
    
    // States for inline editing
    const [isEditingAmount, setIsEditingAmount] = useState(false);
    const [amountValue, setAmountValue] = useState('');
    const [isPickingCategory, setIsPickingCategory] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [descriptionValue, setDescriptionValue] = useState('');
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [notesValue, setNotesValue] = useState('');
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [dateValue, setDateValue] = useState('');
    const [isPickingUser, setIsPickingUser] = useState(false);
    const [isEditingTags, setIsEditingTags] = useState(false);
    const [isPickingIcon, setIsPickingIcon] = useState(false);
    const [isMerging, setIsMerging] = useState(false);

    // Group editing states
    const [isAddingToGroup, setIsAddingToGroup] = useState(false);
    const [newGroupTx, setNewGroupTx] = useState({ description: '', amount: '' });
    const [isEditingTargetAmount, setIsEditingTargetAmount] = useState(false);
    const [targetAmountValue, setTargetAmountValue] = useState('');
    
    const category = categoryMap.get(formState.categoryId);
    const Icon = getIconComponent(formState.iconOverride || category?.icon);
    const CategoryIcon = getIconComponent(category?.icon);
    const color = category ? category.color : '#64748b';
    const isVerified = !!formState.isVerified;
    const isDemo = !!formState.isDemo;

    const createdBy = useMemo(() => {
        if (!formState.createdBy) return null;
        return users.find(u => u.id === formState.createdBy);
    }, [formState.createdBy, users]);

    const getTagNames = useCallback((t: Transaction) => (t.tagIds || []).map(id => tagMap.get(id)).filter((name): name is string => !!name), [tagMap]);

    const { group, groupedTransactions, currentGroupTotal, allInGroupVerified } = useMemo(() => {
        if (!formState.transactionGroupId) return { group: null, groupedTransactions: [], currentGroupTotal: 0, allInGroupVerified: false };
        const groupData = transactionGroups.find(g => g.id === formState.transactionGroupId);
        if (!groupData) return { group: null, groupedTransactions: [], currentGroupTotal: 0, allInGroupVerified: false };
        const txsInGroup = allTransactions
            .filter(t => t.transactionGroupId === formState.transactionGroupId && !t.isDeleted)
            .sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
        const total = txsInGroup.reduce((sum, t) => sum + t.amount, 0);
        const allVerified = txsInGroup.length > 0 && txsInGroup.every(t => t.isVerified);
        return { group: groupData, groupedTransactions: txsInGroup, currentGroupTotal: total, allInGroupVerified: allVerified };
    }, [formState.transactionGroupId, allTransactions, transactionGroups]);

    useEffect(() => {
        if (isOpen) {
            setFormState(transaction);
            
            // Reset all inline editing states on open
            setIsEditingAmount(false);
            setIsPickingCategory(false);
            setIsEditingDescription(false);
            setIsEditingNotes(false);
            setIsEditingDate(false);
            setIsPickingUser(false);
            setIsEditingTags(false);
            setIsPickingIcon(false);
            setIsMerging(false);
            setIsAddingToGroup(false);
            setIsEditingTargetAmount(false);
        }
    }, [isOpen, transaction]);

    useEffect(() => {
        if (!isOpen) return;

        document.body.classList.add('modal-open');
        
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (isMerging) setIsMerging(false);
                else if (isPickingIcon) setIsPickingIcon(false);
                else if (isEditingTags) setIsEditingTags(false);
                else if (isPickingUser) setIsPickingUser(false);
                else if (isPickingCategory) setIsPickingCategory(false);
                else if (isEditingDate) setIsEditingDate(false);
                else if (isEditingAmount) setIsEditingAmount(false);
                else if (isEditingDescription) setIsEditingDescription(false);
                else if (isEditingNotes) setIsEditingNotes(false);
                else if (isAddingToGroup) setIsAddingToGroup(false);
                else if (isEditingTargetAmount) setIsEditingTargetAmount(false);
                else onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        
        return () => {
            document.body.classList.remove('modal-open');
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, isEditingAmount, isPickingCategory, isEditingDate, isEditingDescription, isEditingNotes, isPickingUser, isEditingTags, isPickingIcon, isMerging, isAddingToGroup, isEditingTargetAmount]);
    
    const handleDelete = useCallback(() => {
        if (window.confirm(`Möchten Sie die Ausgabe "${transaction.description}" wirklich löschen?`)) {
            deleteTransaction(transaction.id);
            onClose(); // Close modal after deletion
        }
    }, [transaction, deleteTransaction, onClose]);

    const getFormattedDate = (dateString: string, formatString: string) => {
        try {
            if (!dateString || typeof dateString !== 'string') return '';
            const parsedDate = parseISO(dateString);
            return isNaN(parsedDate.getTime()) ? '' : format(parsedDate, formatString, { locale: deLocale });
        } catch {
            return '';
        }
    };
    
    const handleUpdate = useCallback((updates: Partial<Transaction>, newTags?: string[]) => {
        let updatedTransaction = { ...formState, ...updates };
        if (updates.hasOwnProperty('notes')) {
            updatedTransaction.notes = updates.notes;
        }
        updateTransaction(updatedTransaction, newTags ?? getTagNames(formState));
        setFormState(updatedTransaction);
    }, [formState, updateTransaction, getTagNames]);

    const handleAmountUpdate = () => {
        const newAmount = parseFloat(amountValue.replace(',', '.'));
        if (isNaN(newAmount) || newAmount <= 0) {
            toast.error('Ungültiger Betrag.');
        } else if (newAmount !== formState.amount) {
            if (formState.transactionGroupId) {
                updateGroupedTransaction({ transactionId: formState.id, newAmount });
            } else {
                handleUpdate({ amount: newAmount });
            }
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
    
    const handleNotesUpdate = () => {
        const newNotes = notesValue.trim();
        if(newNotes !== (formState.notes || '')) {
            handleUpdate({ notes: newNotes });
            toast.success("Notiz aktualisiert.");
        }
        setIsEditingNotes(false);
    };

    const handleDateUpdate = () => {
        try {
            const newDate = new Date(dateValue);
            if(isNaN(newDate.getTime())) throw new Error("Invalid date");
            const newISO = newDate.toISOString();
            if(newISO !== formState.date){
                handleUpdate({ date: newISO });
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

    const handleIconUpdate = (iconName: string) => {
        if (iconName !== formState.iconOverride) {
            handleUpdate({ iconOverride: iconName });
            toast.success('Icon aktualisiert.');
        }
        setIsPickingIcon(false);
    };
    
    const handleVerifiedToggle = (verified: boolean) => {
        handleUpdate({ isVerified: verified });
        toast.success(verified ? "Transaktion als geprüft markiert." : "Prüfstatus entfernt.");
    };

    const handleIconReset = () => {
        if (formState.iconOverride) {
            // Create a new object to ensure we remove the key
            const updates: Partial<Transaction> = { iconOverride: undefined };
            handleUpdate(updates);
            toast.success('Icon zurückgesetzt.');
        }
        setIsPickingIcon(false);
    };

    const handleMergeConfirm = (targetTxId: string) => {
        mergeTransactionWithTarget(formState.id, targetTxId);
        setIsMerging(false);
    };

    const handleResetCorrection = (txId: string) => {
        updateGroupedTransaction({ transactionId: txId, resetCorrection: true });
        toast.success("Korrektur zurückgesetzt.");
    };

    const handleRemoveFromGroup = (txId: string) => {
        if(window.confirm("Möchten Sie diese Transaktion wirklich aus der Gruppe entfernen? Die Beträge der verbleibenden Einträge werden angepasst.")) {
            removeTransactionFromGroup(txId);
        }
    };

    const handleTargetAmountUpdate = () => {
        if (!group) return;
        const newAmount = parseFloat(targetAmountValue.replace(',', '.'));
        if (isNaN(newAmount) || newAmount < 0) {
            toast.error("Ungültiger Betrag.");
        } else if (newAmount !== group.targetAmount) {
            updateGroupTargetAmount(group.id, newAmount);
        }
        setIsEditingTargetAmount(false);
    };

    const handleAddTxToGroup = (e: React.FormEvent) => {
        e.preventDefault();
        if (!group) return;
        const amount = parseFloat(newGroupTx.amount.replace(',', '.'));
        const description = newGroupTx.description.trim();

        if (description && !isNaN(amount) && amount > 0) {
            addTransactionToGroup(group.id, { description, amount });
            setNewGroupTx({ description: '', amount: '' });
            setIsAddingToGroup(false);
        } else {
            toast.error("Bitte Beschreibung und gültigen Betrag eingeben.");
        }
    };

    const localTags = getTagNames(formState);
    
    const iconButtonAnimation = {
        whileHover: { scale: 1.1 },
        whileTap: { scale: 0.95 },
    };

    const inputAnimation = {
        initial: { opacity: 0, y: -5 },
        animate: { opacity: 1, y: 0 },
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
                        onClick={onClose}
                        {...modalBackdropAnimation}
                    >
                        <motion.div
                            className="bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden max-h-[90vh]"
                            onClick={e => e.stopPropagation()}
                            {...modalContentAnimation}
                        >
                            <div className="overflow-y-auto custom-scrollbar">
                                <>
                                    <div className="relative p-6 sm:p-8 flex flex-col items-center text-center">
                                         <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-700 transition-colors z-10">
                                            <X className="h-5 w-5" />
                                        </button>
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={formState.id}
                                                className="w-full"
                                                {...{
                                                    initial: { opacity: 0 },
                                                    animate: { opacity: 1 },
                                                    exit: { opacity: 0 },
                                                    transition: { duration: 0.2 },
                                                }}
                                            >
                                                <div className="relative mb-4 w-16 h-16 mx-auto">
                                                    <motion.button 
                                                        {...iconButtonAnimation}
                                                        onClick={() => !isVerified && !isDemo && setIsPickingIcon(true)}
                                                        disabled={isVerified || isDemo}
                                                        className="w-16 h-16 rounded-full flex items-center justify-center transition-transform disabled:cursor-not-allowed bg-transparent border-4" 
                                                        style={{ borderColor: color }}
                                                        title={isVerified ? "Geprüfte Transaktionen können nicht bearbeitet werden" : (isDemo ? "Demo-Icon kann nicht geändert werden" : "Icon ändern")}
                                                    >
                                                        <Icon className="h-8 w-8" style={{ color: color }}/>
                                                    </motion.button>
                                                    {formState.iconOverride && (
                                                        <motion.button
                                                            {...iconButtonAnimation}
                                                            onClick={handleIconReset}
                                                            disabled={isVerified || isDemo}
                                                            title={isVerified ? "Geprüfte Transaktionen können nicht bearbeitet werden" : (isDemo ? "Demo-Icon kann nicht geändert werden" : "Icon zurücksetzen")}
                                                            className="absolute -top-1 -right-1 z-10 p-1 bg-slate-700 rounded-full text-slate-400 hover:text-white disabled:cursor-not-allowed"
                                                            aria-label="Transaktions-Icon auf Kategorie-Standard zurücksetzen"
                                                        >
                                                            <RefreshCcw className="h-3 w-3" />
                                                        </motion.button>
                                                    )}
                                                </div>
                                                
                                                {isEditingAmount ? (
                                                    <motion.div {...inputAnimation} className="my-1">
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
                                                    </motion.div>
                                                ) : (
                                                    <button onClick={() => !isVerified && !isDemo && (setAmountValue(String(formState.amount).replace('.', ',')), setIsEditingAmount(true))} disabled={isVerified || isDemo} className="rounded-lg p-1 -m-1 disabled:cursor-not-allowed" title={isVerified ? "Geprüfte Transaktionen können nicht bearbeitet werden" : (isDemo ? "Demo-Betrag kann nicht geändert werden" : "Betrag ändern")}>
                                                        <p className="text-4xl font-bold text-white">{formatCurrency(formState.amount)}</p>
                                                    </button>
                                                )}
                                                
                                                {isEditingDescription ? (
                                                     <motion.div {...inputAnimation} className="w-full max-w-sm mt-2">
                                                        <input
                                                            type="text"
                                                            value={descriptionValue}
                                                            onChange={(e) => setDescriptionValue(e.target.value)}
                                                            onBlur={handleDescriptionUpdate}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleDescriptionUpdate()}
                                                            className="w-full text-center bg-slate-700 border border-slate-600 rounded-lg py-1 text-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                                                            autoFocus
                                                        />
                                                     </motion.div>
                                                ) : (
                                                     <button onClick={() => !isVerified && !isDemo && (setDescriptionValue(formState.description), setIsEditingDescription(true))} disabled={isVerified || isDemo} className="w-full rounded-lg p-1 -m-1 mt-2 disabled:cursor-not-allowed" title={isVerified ? "Geprüfte Transaktionen können nicht bearbeitet werden" : (isDemo ? "Demo-Beschreibung kann nicht geändert werden" : "Beschreibung ändern")}>
                                                        <p className="text-lg font-semibold text-white truncate">{formState.description}</p>
                                                    </button>
                                                )}
                                                <button onClick={() => !isVerified && !isDemo && setIsPickingCategory(true)} disabled={isVerified || isDemo} className="mt-1 flex items-center justify-center gap-1.5 text-sm text-slate-400 rounded-lg p-1 -m-1 hover:text-white transition-colors disabled:cursor-not-allowed" title={isVerified ? "Geprüfte Transaktionen können nicht bearbeitet werden" : (isDemo ? "Demo-Kategorie kann nicht geändert werden" : "Kategorie ändern")}>
                                                    <CategoryIcon className="h-4 w-4 flex-shrink-0" style={{ color: category?.color }}/>
                                                    <span>{category?.name}</span>
                                                </button>
                                            </motion.div>
                                        </AnimatePresence>

                                        {/* Metadata Section */}
                                        <div className="w-full max-w-sm mt-6 pt-4 border-t border-slate-700/50 space-y-3 text-sm">
                                             <div className="flex justify-between items-center">
                                                <span className="text-slate-400 font-medium">Datum</span>
                                                 {isEditingDate ? (
                                                      <motion.div {...inputAnimation} className="flex flex-col items-end">
                                                        <input
                                                            type="datetime-local"
                                                            value={dateValue}
                                                            onChange={e => setDateValue(e.target.value)}
                                                            onBlur={handleDateUpdate}
                                                            className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                                                            autoFocus
                                                        />
                                                        {formState.transactionGroupId && <p className="text-xs text-slate-500 mt-1">Änderung wirkt auf gesamte Gruppe.</p>}
                                                    </motion.div>
                                                 ) : (
                                                    <button onClick={() => !isVerified && !isDemo && (setDateValue(getFormattedDate(formState.date, "yyyy-MM-dd'T'HH:mm")), setIsEditingDate(true))} disabled={isVerified || isDemo} className="text-slate-200 font-medium rounded p-1 -m-1 disabled:cursor-not-allowed" title={isVerified ? "Geprüfte Transaktionen können nicht bearbeitet werden" : (isDemo ? "Demo-Datum kann nicht geändert werden" : "Datum ändern")}>
                                                        {getFormattedDate(formState.date, 'dd. MMM yyyy, HH:mm')} Uhr
                                                    </button>
                                                 )}
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400 font-medium">Erstellt von</span>
                                                {createdBy ? (
                                                    <button onClick={() => !isVerified && !isDemo && setIsPickingUser(true)} disabled={isVerified || isDemo} className="flex items-center gap-2 text-slate-200 font-medium rounded p-1 -m-1 disabled:cursor-not-allowed" title={isVerified ? "Geprüfte Transaktionen können nicht bearbeitet werden" : (isDemo ? "Demo-Benutzer kann nicht geändert werden" : "Benutzer ändern")}>
                                                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: createdBy.color }}>
                                                            {createdBy.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span>{createdBy.name}</span>
                                                    </button>
                                                ) : (
                                                    <button onClick={() => !isVerified && !isDemo && setIsPickingUser(true)} disabled={isVerified || isDemo} className="flex items-center gap-1 text-rose-400 font-medium rounded p-1 -m-1 hover:text-rose-300 disabled:cursor-not-allowed" title={isVerified ? "Geprüfte Transaktionen können nicht bearbeitet werden" : (isDemo ? "Demo-Benutzer kann nicht geändert werden" : "Benutzer zuweisen")}>
                                                        <Plus className="h-4 w-4" />
                                                        <span>Zuweisen</span>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-center pt-2">
                                                <span className="text-slate-400 font-medium">Status</span>
                                                {isDemo ? (
                                                    <span className="flex items-center gap-1.5 bg-purple-500/20 text-purple-300 text-xs font-bold px-2 py-1 rounded-full">
                                                        <FlaskConical className="h-3 w-3" />
                                                        Demo-Eintrag
                                                    </span>
                                                ) : (
                                                     <div className="flex items-center gap-2" title="Geprüfte Transaktionen können nicht mehr bearbeitet werden.">
                                                        <label htmlFor="verify-toggle" className="text-sm text-slate-300 cursor-pointer">Geprüft</label>
                                                        <ToggleSwitch id="verify-toggle" enabled={isVerified} setEnabled={handleVerifiedToggle} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Grouped Transactions Section */}
                                        {group && groupedTransactions.length > 0 && (
                                            <div className="w-full max-w-sm mt-4 pt-4 border-t border-slate-700/50">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Link className="h-4 w-4 text-slate-400"/>Transaktionsgruppe</h3>
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-xs text-right">
                                                            {isEditingTargetAmount ? (
                                                                <motion.div {...inputAnimation}>
                                                                    <input type="text" inputMode="decimal" value={targetAmountValue} onChange={e => setTargetAmountValue(e.target.value)} onBlur={handleTargetAmountUpdate} onKeyDown={e => e.key === 'Enter' && handleTargetAmountUpdate()} className="w-24 bg-slate-700 border border-slate-600 rounded-md py-1 text-right text-xs text-white focus:ring-1 focus:ring-rose-500" autoFocus/>
                                                                </motion.div>
                                                            ) : (
                                                                <button onClick={() => !allInGroupVerified && (setTargetAmountValue(String(group.targetAmount).replace('.',',')), setIsEditingTargetAmount(true))} disabled={allInGroupVerified} className="disabled:cursor-not-allowed rounded-md p-0.5 -m-0.5">
                                                                    <p className="text-slate-400">Soll: <span className="font-bold text-white">{formatCurrency(group.targetAmount)}</span></p>
                                                                </button>
                                                            )}
                                                            <p className={currentGroupTotal.toFixed(2) !== group.targetAmount.toFixed(2) ? 'text-red-400' : 'text-slate-400'}>Ist: <span className="font-bold text-white">{formatCurrency(currentGroupTotal)}</span></p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div title="Gruppe als geprüft markieren">
                                                                <ToggleSwitch id="group-verify-toggle" enabled={allInGroupVerified} setEnabled={(v) => updateGroupVerifiedStatus(group.id, v)} />
                                                            </div>
                                                            <Button variant="ghost" size="icon-xs" onClick={() => setIsAddingToGroup(p => !p)} title="Neue Transaktion zur Gruppe hinzufügen" disabled={allInGroupVerified}><PlusCircle className="h-4 w-4"/></Button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <AnimatePresence>
                                                    {isAddingToGroup && (
                                                        <motion.form {...collapsibleAnimation} onSubmit={handleAddTxToGroup} className="overflow-hidden">
                                                            <div className="p-2 mb-2 bg-slate-700/50 rounded-lg space-y-2">
                                                                <input type="text" value={newGroupTx.description} onChange={e => setNewGroupTx(p => ({...p, description: e.target.value}))} placeholder="Beschreibung" className="w-full bg-slate-800/50 border border-slate-600 rounded px-2 py-1 text-sm"/>
                                                                <div className="flex gap-2">
                                                                    <input type="text" inputMode="decimal" value={newGroupTx.amount} onChange={e => setNewGroupTx(p => ({...p, amount: e.target.value}))} placeholder="Betrag" className="w-full bg-slate-800/50 border border-slate-600 rounded px-2 py-1 text-sm"/>
                                                                    <Button type="submit" size="sm">OK</Button>
                                                                </div>
                                                            </div>
                                                        </motion.form>
                                                    )}
                                                </AnimatePresence>
                                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                    {groupedTransactions.map(t => {
                                                        const cat = categoryMap.get(t.categoryId);
                                                        const isCurrent = t.id === formState.id;
                                                        const TIcon = getIconComponent(t.iconOverride || cat?.icon);
                                                        const tColor = cat ? cat.color : '#64748b';

                                                        return (
                                                            <div key={t.id} className={`w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors ${isCurrent ? 'bg-slate-700/50' : 'hover:bg-slate-700/80'}`}>
                                                                <button 
                                                                    onClick={() => !isCurrent && showTransactionDetail(t)}
                                                                    className={`flex items-center gap-2 flex-grow min-w-0 text-left ${isCurrent ? 'cursor-default' : ''}`}
                                                                >
                                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tColor, opacity: isCurrent ? 1 : 0.7 }}>
                                                                        <TIcon className="h-4 w-4 text-white" />
                                                                    </div>
                                                                    <p className="flex-1 text-sm text-white truncate">{t.description}</p>
                                                                </button>
                                                                <div className="flex-shrink-0 flex items-center gap-2">
                                                                    {t.isCorrected && <CorrectedBadge />}
                                                                    <p className="font-semibold text-sm text-white w-20 text-right">{formatCurrency(t.amount)}</p>
                                                                    {t.isCorrected && !isCurrent && !isDemo && !isVerified && (
                                                                        <Button variant="ghost" size="icon-xs" onClick={() => handleResetCorrection(t.id)} title="Korrektur zurücksetzen"><RefreshCcw className="h-4 w-4"/></Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                 <div className="flex justify-end gap-2 mt-3">
                                                    <Button variant="secondary" size="sm" onClick={() => setIsMerging(true)} disabled={isVerified || isDemo}>
                                                        <Link className="h-4 w-4 mr-2" /> Verknüpfen...
                                                    </Button>
                                                    <Button variant="secondary" size="sm" onClick={() => handleRemoveFromGroup(formState.id)} disabled={isVerified || isDemo}>Aus Gruppe entfernen</Button>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {!formState.transactionGroupId && !isDemo && (
                                            <div className="w-full max-w-sm mt-4 pt-4 border-t border-slate-700/50">
                                                 <Button variant="secondary" onClick={() => setIsMerging(true)} disabled={isVerified || isDemo}>
                                                    <Link className="h-4 w-4 mr-2"/> Mit Transaktion/Gruppe verknüpfen...
                                                </Button>
                                            </div>
                                        )}

                                        {/* Tags & Notes Section */}
                                        <div className="w-full max-w-sm mt-4 pt-4 border-t border-slate-700/50 space-y-3">
                                             <button onClick={() => !isVerified && !isDemo && setIsEditingTags(true)} disabled={isVerified || isDemo} className="w-full text-left rounded-lg p-1 -m-1 disabled:cursor-not-allowed" title={isVerified ? "Geprüfte Transaktionen können nicht bearbeitet werden" : (isDemo ? "Demo-Tags können nicht geändert werden" : "Tags bearbeiten")}>
                                                 <h3 className="text-sm font-semibold text-white mb-2">Tags</h3>
                                                {localTags.length > 0 ? (
                                                     <div className="flex flex-wrap gap-2 justify-center">
                                                         {localTags.map(tag => <TagPill key={tag} tagName={tag} />)}
                                                    </div>
                                                ) : (
                                                    <p className="text-slate-500 text-center">Keine Tags hinzugefügt</p>
                                                )}
                                             </button>
                                             
                                              <div className="w-full pt-2">
                                                <h3 className="text-sm font-semibold text-white text-center mb-2">Notiz</h3>
                                                {isEditingNotes ? (
                                                    <motion.div {...inputAnimation}>
                                                        <textarea
                                                            value={notesValue}
                                                            onChange={e => { if (e.target.value.length <= 280) setNotesValue(e.target.value) }}
                                                            onBlur={handleNotesUpdate}
                                                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleNotesUpdate() }}
                                                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                                                            rows={3}
                                                            autoFocus
                                                        />
                                                        <p className="text-xs text-slate-500 text-right mt-1">{280 - notesValue.length}</p>
                                                    </motion.div>
                                                ) : (
                                                    <button onClick={() => !isVerified && !isDemo && (setNotesValue(formState.notes || ''), setIsEditingNotes(true))} disabled={isVerified || isDemo} className="w-full text-slate-300 rounded p-1 -m-1 disabled:cursor-not-allowed text-center min-h-[24px]">
                                                        <p className="italic whitespace-pre-wrap break-words">
                                                            {formState.notes || <span className="text-slate-500 not-italic">Notiz hinzufügen...</span>}
                                                        </p>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            </div>
                            <div className="flex-shrink-0 p-4 bg-slate-900/50 flex justify-between items-center border-t border-slate-700">
                                {!isDemo ? (
                                    <Button variant="destructive" onClick={handleDelete} disabled={isVerified}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Löschen
                                    </Button>
                                ) : (
                                    <div /> // Placeholder to keep layout consistent
                                )}
                                <Button variant="primary" onClick={onClose}>
                                    OK
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
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
                isPickingIcon={isPickingIcon}
                setIsPickingIcon={setIsPickingIcon}
                handleIconUpdate={handleIconUpdate}
            />
             <AnimatePresence>
                {isMerging && (
                    <MergePickerModal
                        isOpen={isMerging}
                        onClose={() => setIsMerging(false)}
                        onConfirm={handleMergeConfirm}
                        sourceTransactionId={formState.id}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default TransactionDetailModal;