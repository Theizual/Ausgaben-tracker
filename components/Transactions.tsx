
import React, { useState, useMemo } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Transaction, Category } from '../types';
import { format, parseISO, formatCurrency, endOfDay } from '../utils/dateUtils';
import { iconMap, Edit, Trash2 } from './Icons';
import { CategoryButtons } from './Dashboard';

interface TransactionsPageProps {
    transactions: Transaction[];
    categoryMap: Map<string, Category>;
    updateTransaction: (transaction: Transaction) => void;
    deleteTransaction: (id: string) => void;
    categories: Category[];
    categoryGroups: string[];
}

const TransactionList: FC<{ 
    transactions: Transaction[]; 
    categoryMap: Map<string, Category>; 
    updateTransaction: (t: Transaction) => void;
    deleteTransaction: (id: string) => void; 
    categories: Category[];
    categoryGroups: string[];
    showEmptyMessage?: boolean;
}> = ({ transactions, categoryMap, updateTransaction, deleteTransaction, categories, categoryGroups, showEmptyMessage = false }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col h-full"
        >
            <h3 className="font-bold text-white mb-4 flex-shrink-0">Alle Transaktionen</h3>
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
                        />
                    </motion.div>
                )) : (
                    showEmptyMessage && <p className="text-slate-500 text-center py-4">Noch keine Transaktionen erfasst.</p>
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
}> = ({ transaction, category, onUpdate, onDelete, isEditing, onEditClick, categories, categoryGroups }) => {
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
                                    const transactionDate = endOfDay(parseISO(e.target.value));
                                    setFormState({...formState, date: transactionDate.toISOString()});
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
        <div className="flex items-center gap-4 bg-slate-800/50 hover:bg-slate-700/50 p-3 rounded-lg transition-colors">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
                <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
                <p className="font-medium text-white">{transaction.description}</p>
                <p className="text-xs text-slate-400">{formattedDate}</p>
            </div>
            <div className="text-right">
                 <p className="font-bold text-white">{formatCurrency(transaction.amount)}</p>
                 <div className="flex gap-3 justify-end mt-1">
                    <button onClick={onEditClick}><Edit className="h-4 w-4 text-slate-500 hover:text-rose-400" /></button>
                    <button onClick={() => onDelete(transaction.id)}><Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" /></button>
                 </div>
            </div>
        </div>
    );
};

const TransactionsPage: FC<TransactionsPageProps> = ({
    transactions,
    categoryMap,
    updateTransaction,
    deleteTransaction,
    categories,
    categoryGroups
}) => {
    const sortedTransactions = useMemo(() => 
        [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
    [transactions]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Transaktionen</h1>
            <div className="h-[calc(100vh-250px)]">
                <TransactionList 
                    transactions={sortedTransactions}
                    categoryMap={categoryMap}
                    updateTransaction={updateTransaction}
                    deleteTransaction={deleteTransaction}
                    categories={categories}
                    categoryGroups={categoryGroups}
                    showEmptyMessage={true}
                />
            </div>
        </div>
    );
};

export default TransactionsPage;
