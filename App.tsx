import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { INITIAL_CATEGORIES, INITIAL_GROUPS } from './constants';
import useLocalStorage from './hooks/useLocalStorage';
import type { Transaction, Category, RecurringTransaction } from './types';
import Dashboard from './components/Dashboard';
import Statistics from './components/Statistics';
import TransactionsPage from './components/Transactions';
import SettingsModal from './components/SettingsModal';
import { formatGermanDate, parseISO, addMonths, addYears, isSameDay } from './utils/dateUtils';
import { Settings, Loader2, X, TrendingDown, LayoutGrid, BarChart2, Repeat, Save, DownloadCloud } from './components/Icons';


// Main App Component
const App: React.FC = () => {
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [recurringTransactions, setRecurringTransactions] = useLocalStorage<RecurringTransaction[]>('recurringTransactions', []);
    const [categories, setCategories] = useLocalStorage<Category[]>('categories', INITIAL_CATEGORIES);
    const [categoryGroups, setCategoryGroups] = useLocalStorage<string[]>('categoryGroups', INITIAL_GROUPS);
    const [totalMonthlyBudget, setTotalMonthlyBudget] = useLocalStorage<number>('totalMonthlyBudget', 1000);
    const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useLocalStorage<boolean>('autoSyncEnabled', true);
    const [allAvailableTags, setAllAvailableTags] = useLocalStorage<string[]>('allAvailableTags', ['Lidl', 'Dm']);
    
    const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'statistics'>('dashboard');
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    
    const [syncOperation, setSyncOperation] = useState<'upload' | 'download' | null>(null);
    const isSyncing = syncOperation !== null;
    const [syncError, setSyncError] = useState<string | null>(null);

    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
    
    const learnNewTags = useCallback((tags: string[]) => {
        const newTags = tags.filter(tag => !allAvailableTags.includes(tag));
        if (newTags.length > 0) {
            setAllAvailableTags(prev => [...new Set([...prev, ...newTags])].sort());
        }
    }, [allAvailableTags, setAllAvailableTags]);

    const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
        const newTransaction = { ...transaction, id: crypto.randomUUID(), date: new Date().toISOString() };
        setTransactions(prev => [...prev, newTransaction]);
        if(transaction.tags) {
            learnNewTags(transaction.tags);
        }
    };
    
    // Process recurring transactions on app load
    useEffect(() => {
        const newTransactions: Omit<Transaction, 'id'>[] = [];
        const updatedRecurring = recurringTransactions.map(rec => {
            const newRec = { ...rec };
            let lastDate = newRec.lastProcessedDate ? parseISO(newRec.lastProcessedDate) : parseISO(newRec.startDate);
            
            while (true) {
                const nextDueDate = newRec.frequency === 'monthly'
                    ? addMonths(lastDate, 1)
                    : addYears(lastDate, 1);
                
                if (nextDueDate > new Date()) break;

                // Only add if the due date is on or after the start date
                if (nextDueDate >= parseISO(newRec.startDate)) {
                    // Check if a transaction for this recurring item on this day already exists
                    const alreadyExists = transactions.some(t => 
                        t.description.includes(`(Wiederkehrend) ${newRec.description}`) &&
                        isSameDay(parseISO(t.date), nextDueDate)
                    );

                    if (!alreadyExists) {
                        newTransactions.push({
                            amount: newRec.amount,
                            description: `(Wiederkehrend) ${newRec.description}`,
                            categoryId: newRec.categoryId,
                            date: nextDueDate.toISOString(),
                        });
                    }
                }

                lastDate = nextDueDate;
                newRec.lastProcessedDate = lastDate.toISOString();
            }
            return newRec;
        });

        if (newTransactions.length > 0) {
            setTransactions(prev => [...prev, ...newTransactions.map(t => ({ ...t, id: crypto.randomUUID() }))]);
            setRecurringTransactions(updatedRecurring);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount to catch up

    const downloadFromSheet = useCallback(async () => {
        setSyncOperation('download');
        setSyncError(null);
        try {
            const response = await fetch('/api/sheets/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Fehler beim Laden (${response.status})`);
            }

            const data = await response.json();
            const newCategories: Category[] = data.categories || [];
            const newTransactions: Transaction[] = data.transactions || [];
            const newRecurring: RecurringTransaction[] = data.recurringTransactions || [];
            const newTags: string[] = data.allAvailableTags || [];


            if (newCategories.length > 0) {
                 setCategories(newCategories);
                 const newGroups = [...new Set(newCategories.map(c => c.group))];
                 setCategoryGroups(newGroups);
            }
            if (newTransactions.length > 0) setTransactions(newTransactions);
            if (newRecurring.length > 0) setRecurringTransactions(newRecurring);
            if (newTags.length > 0) setAllAvailableTags(newTags);
            
            alert(`Daten erfolgreich geladen: ${newCategories.length} Kategorien, ${newTransactions.length} Transaktionen, ${newRecurring.length} wiederkehrende Ausgaben, ${newTags.length} Tags.`);

        } catch (e: any) {
            console.error("Error downloading from sheet:", e);
            const errorMessage = e.message || "Unbekannter Fehler beim Herunterladen. Prüfen Sie die Serverkonfiguration & Freigabe für den Service Account.";
            setSyncError(errorMessage);
            alert(errorMessage);
        } finally {
            setSyncOperation(null);
        }
    }, [setCategories, setTransactions, setCategoryGroups, setRecurringTransactions, setAllAvailableTags]);

    const uploadToSheet = useCallback(async (options: { isAutoSync?: boolean } = {}) => {
        const { isAutoSync = false } = options;
        
        if(!isAutoSync) setSyncOperation('upload');
        setSyncError(null);

        try {
            const response = await fetch('/api/sheets/write', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categories,
                    transactions,
                    recurringTransactions,
                    allAvailableTags,
                }),
            });

            if (!response.ok) {
                 const errorData = await response.json();
                throw new Error(errorData.error || `Fehler beim Speichern (${response.status})`);
            }

            await response.json();
            if (!isAutoSync) {
                alert("Daten erfolgreich in Google Sheet gespeichert!");
            }
        } catch (e: any) {
            console.error("Error uploading to sheet:", e);
            const errorMessage = e.message || "Fehler beim Hochladen. Prüfen Sie Ihre Berechtigungen.";
            setSyncError(errorMessage);
            if (!isAutoSync) {
                alert(errorMessage);
            }
        } finally {
            if(!isAutoSync) setSyncOperation(null);
        }
    }, [categories, transactions, recurringTransactions, allAvailableTags]);

    useEffect(() => {
        if (!isAutoSyncEnabled) {
            return;
        }
    
        const intervalId = setInterval(() => {
            if (!isSyncing) {
                console.log('Auto-sync: Uploading data to Google Sheet...');
                uploadToSheet({ isAutoSync: true });
            } else {
                console.log('Auto-sync: Skipped, another sync is in progress.');
            }
        }, 5 * 60 * 1000); // 5 minutes
    
        return () => clearInterval(intervalId);
    }, [isAutoSyncEnabled, isSyncing, uploadToSheet]);

    const updateTransaction = (updatedTransaction: Transaction) => {
        setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
        if(updatedTransaction.tags) {
            learnNewTags(updatedTransaction.tags);
        }
    };

    const deleteTransaction = (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
    };

    const handleUpdateTag = useCallback((oldTag: string, newTag: string) => {
        const trimmedNewTag = newTag.trim();
        if (!trimmedNewTag || (allAvailableTags.includes(trimmedNewTag) && trimmedNewTag !== oldTag)) {
            alert(`Der Tag "${trimmedNewTag}" existiert bereits.`);
            return;
        }
        
        setAllAvailableTags(prev => [...new Set(prev.map(t => t === oldTag ? trimmedNewTag : t))].sort());
        
        setTransactions(prev => prev.map(transaction => {
            if (transaction.tags?.includes(oldTag)) {
                return {
                    ...transaction,
                    tags: [...new Set(transaction.tags.map(t => t === oldTag ? trimmedNewTag : t))]
                };
            }
            return transaction;
        }));
    }, [allAvailableTags, setAllAvailableTags, setTransactions]);

    const handleDeleteTag = useCallback((tagToDelete: string) => {
        setAllAvailableTags(prev => prev.filter(t => t !== tagToDelete));
        setTransactions(prev => prev.map(transaction => {
            if (transaction.tags?.includes(tagToDelete)) {
                return { ...transaction, tags: transaction.tags.filter(t => t !== tagToDelete) };
            }
            return transaction;
        }));
    }, [setAllAvailableTags, setTransactions]);
    
    // Update total budget whenever categories change
    useEffect(() => {
        const newTotal = categories.reduce((sum, cat) => sum + (cat.budget || 0), 0);
        setTotalMonthlyBudget(newTotal);
    }, [categories, setTotalMonthlyBudget]);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <Header 
                    onSettingsClick={() => setSettingsOpen(true)} 
                    onUploadClick={() => uploadToSheet()}
                    onDownloadClick={downloadFromSheet}
                    syncOperation={syncOperation}
                />
                <SyncErrorBanner message={syncError} onClose={() => setSyncError(null)} />
                <MainTabs activeTab={activeTab} setActiveTab={setActiveTab} />
                <main className="mt-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTab === 'dashboard' ? (
                                <Dashboard
                                    transactions={transactions}
                                    categories={categories}
                                    categoryGroups={categoryGroups}
                                    categoryMap={categoryMap}
                                    addTransaction={addTransaction}
                                    totalMonthlyBudget={totalMonthlyBudget}
                                    allAvailableTags={allAvailableTags}
                                />
                            ) : activeTab === 'transactions' ? (
                                <TransactionsPage
                                    transactions={transactions}
                                    categoryMap={categoryMap}
                                    updateTransaction={updateTransaction}
                                    deleteTransaction={deleteTransaction}
                                    categories={categories}
                                    categoryGroups={categoryGroups}
                                    allAvailableTags={allAvailableTags}
                                />
                            ) : (
                                <Statistics transactions={transactions} categories={categories} categoryMap={categoryMap} />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </main>
                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    categories={categories}
                    setCategories={setCategories}
                    categoryGroups={categoryGroups}
                    setCategoryGroups={setCategoryGroups}
                    isAutoSyncEnabled={isAutoSyncEnabled}
                    setIsAutoSyncEnabled={setIsAutoSyncEnabled}
                    recurringTransactions={recurringTransactions}
                    setRecurringTransactions={setRecurringTransactions}
                    allAvailableTags={allAvailableTags}
                    onUpdateTag={handleUpdateTag}
                    onDeleteTag={handleDeleteTag}
                />
            </div>
        </div>
    );
};

// SyncErrorBanner Component
const SyncErrorBanner: React.FC<{ message: string | null; onClose: () => void }> = ({ message, onClose }) => {
    if (!message) return null;
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg relative my-4 flex items-start gap-3"
            role="alert"
        >
            <div className="py-1">
                 <svg className="fill-current h-6 w-6 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-1-5h2v2h-2v-2zm0-8h2v6h-2V5z"/></svg>
            </div>
            <div>
                <strong className="font-bold">Fehler</strong>
                <span className="block sm:inline ml-2">{message}</span>
            </div>
            <button onClick={onClose} className="absolute top-0 bottom-0 right-0 px-4 py-3" aria-label="Fehlermeldung schließen">
                <X className="h-5 w-5 text-red-400 hover:text-red-200" />
            </button>
        </motion.div>
    );
};


// Header Component
const Header: React.FC<{ 
    onSettingsClick: () => void; 
    onUploadClick: () => void; 
    onDownloadClick: () => void;
    syncOperation: 'upload' | 'download' | null;
}> = ({ onSettingsClick, onUploadClick, onDownloadClick, syncOperation }) => {
    const [currentDate, setCurrentDate] = useState(formatGermanDate(new Date()));
    const isSyncing = syncOperation !== null;
    
    return (
        <header className="flex justify-between items-center pb-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-rose-500" />
                <h1 className="text-2xl font-bold text-white">Ausgaben Tracker</h1>
            </div>
            <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                    <p className="text-slate-400 text-sm">{currentDate}</p>
                </div>
                 <button 
                    onClick={onDownloadClick} 
                    disabled={isSyncing} 
                    className="p-2 rounded-full hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    title={"Von Google Sheet laden"}
                >
                    {syncOperation === 'download' ? <Loader2 className="h-5 w-5 animate-spin" /> : <DownloadCloud className="h-5 w-5" />}
                </button>
                 <button 
                    onClick={onUploadClick} 
                    disabled={isSyncing} 
                    className="p-2 rounded-full hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    title={"In Google Sheet speichern"}
                >
                    {syncOperation === 'upload' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                </button>
                <button onClick={onSettingsClick} className="p-2 rounded-full hover:bg-slate-700 transition-colors">
                    <Settings className="h-5 w-5" />
                </button>
            </div>
        </header>
    );
};

// MainTabs Component
const MainTabs: React.FC<{ activeTab: string; setActiveTab: (tab: 'dashboard' | 'transactions' | 'statistics') => void }> = ({ activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'dashboard', label: 'Übersicht', icon: LayoutGrid },
        { id: 'transactions', label: 'Transaktionen', icon: Repeat },
        { id: 'statistics', label: 'Statistiken', icon: BarChart2 }
    ];
    return (
        <div className="mt-6 flex items-center space-x-2">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'dashboard' | 'transactions' | 'statistics')}
                    className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all
                        ${
                            activeTab === tab.id
                                ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white'
                        }`
                    }
                >
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                </button>
            ))}
        </div>
    );
};

export default App;
