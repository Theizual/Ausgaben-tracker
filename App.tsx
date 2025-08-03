
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import { INITIAL_CATEGORIES, INITIAL_GROUPS } from './constants';
import useLocalStorage from './hooks/useLocalStorage';
import type { Transaction, Category } from './types';
import Dashboard from './components/Dashboard';
import Statistics from './components/Statistics';
import Budget from './components/Budget';
import TransactionsPage from './components/Transactions';
import { formatGermanDate } from './utils/dateUtils';
import { iconMap, Settings, Loader2, X, TrendingDown, LayoutGrid, BarChart2, Sheet, Save, DownloadCloud, Target, Edit, Trash2, Plus, GripVertical, Wallet, SlidersHorizontal, Repeat } from './components/Icons';
import type { LucideProps } from 'lucide-react';
import type { FC } from 'react';

// Icon Picker Component
const IconPicker: FC<{
  onSelect: (iconName: string) => void;
  onClose: () => void;
}> = ({ onSelect, onClose }) => {
    const iconList = Object.keys(iconMap);
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
                    <h3 className="text-lg font-bold text-white">Symbol auswählen</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 p-4 overflow-y-auto">
                    {iconList.sort().map(iconName => {
                        const Icon = iconMap[iconName];
                        return (
                            <button
                                key={iconName}
                                onClick={() => onSelect(iconName)}
                                className="aspect-square flex items-center justify-center bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-rose-400"
                                title={iconName}
                            >
                                <Icon className="h-6 w-6" />
                            </button>
                        );
                    })}
                </div>
            </motion.div>
        </motion.div>
    );
};


// Main App Component
const App: React.FC = () => {
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [categories, setCategories] = useLocalStorage<Category[]>('categories', INITIAL_CATEGORIES);
    const [categoryGroups, setCategoryGroups] = useLocalStorage<string[]>('categoryGroups', INITIAL_GROUPS);
    const [totalMonthlyBudget, setTotalMonthlyBudget] = useLocalStorage<number>('totalMonthlyBudget', 0);
    const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useLocalStorage<boolean>('autoSyncEnabled', true);
    
    const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'budget' | 'statistics'>('dashboard');
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    
    const [syncOperation, setSyncOperation] = useState<'upload' | 'download' | null>(null);
    const isSyncing = syncOperation !== null;
    const [syncError, setSyncError] = useState<string | null>(null);

    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
    
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

            if (newCategories.length > 0) {
                 setCategories(newCategories);
                 const newGroups = [...new Set(newCategories.map(c => c.group))];
                 setCategoryGroups(newGroups);
            }
            if (newTransactions.length > 0) setTransactions(newTransactions);
            
            alert(`Daten erfolgreich geladen: ${newCategories.length} Kategorien und ${newTransactions.length} Transaktionen.`);

        } catch (e: any) {
            console.error("Error downloading from sheet:", e);
            const errorMessage = e.message || "Unbekannter Fehler beim Herunterladen. Prüfen Sie die Serverkonfiguration & Freigabe für den Service Account.";
            setSyncError(errorMessage);
            alert(errorMessage);
        } finally {
            setSyncOperation(null);
        }
    }, [setCategories, setTransactions, setCategoryGroups]);

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
    }, [categories, transactions]);

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


    const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
        setTransactions(prev => [...prev, { ...transaction, id: crypto.randomUUID() }]);
    };

    const updateTransaction = (updatedTransaction: Transaction) => {
        setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
    };

    const deleteTransaction = (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
    };

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
                                />
                            ) : activeTab === 'transactions' ? (
                                <TransactionsPage
                                    transactions={transactions}
                                    categoryMap={categoryMap}
                                    updateTransaction={updateTransaction}
                                    deleteTransaction={deleteTransaction}
                                    categories={categories}
                                    categoryGroups={categoryGroups}
                                />
                            ) : activeTab === 'budget' ? (
                                <Budget
                                    transactions={transactions}
                                    categories={categories}
                                    setCategories={setCategories}
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
                    totalMonthlyBudget={totalMonthlyBudget}
                    setTotalMonthlyBudget={setTotalMonthlyBudget}
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
const MainTabs: React.FC<{ activeTab: string; setActiveTab: (tab: 'dashboard' | 'transactions' | 'budget' | 'statistics') => void }> = ({ activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'dashboard', label: 'Übersicht', icon: LayoutGrid },
        { id: 'transactions', label: 'Transaktionen', icon: Repeat },
        { id: 'budget', label: 'Budgets', icon: Target },
        { id: 'statistics', label: 'Statistiken', icon: BarChart2 }
    ];
    return (
        <div className="mt-6 flex items-center space-x-2">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'dashboard' | 'transactions' | 'budget' | 'statistics')}
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

const ToggleSwitch: React.FC<{
    enabled: boolean;
    setEnabled: (enabled: boolean) => void;
    id?: string;
}> = ({ enabled, setEnabled, id }) => {
    return (
        <button
            type="button"
            id={id}
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-rose-500 ${enabled ? 'bg-rose-600' : 'bg-slate-600'}`}
        >
            <span className="sr-only">Automatische Synchronisierung aktivieren</span>
            <motion.span
                layout
                transition={{ type: 'spring', stiffness: 700, damping: 30 }}
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
            />
        </button>
    );
};

// SettingsModal Component
const SettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    setCategories: (cats: Category[] | ((prev: Category[]) => Category[])) => void;
    categoryGroups: string[];
    setCategoryGroups: (groups: string[] | ((prev: string[]) => string[])) => void;
    isAutoSyncEnabled: boolean;
    setIsAutoSyncEnabled: (enabled: boolean) => void;
    totalMonthlyBudget: number;
    setTotalMonthlyBudget: (budget: number) => void;
}> = ({ 
    isOpen, onClose, categories, setCategories, categoryGroups, setCategoryGroups, 
    isAutoSyncEnabled, setIsAutoSyncEnabled, totalMonthlyBudget, setTotalMonthlyBudget 
}) => {
    const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'categories'>('general');
    const [editableGroups, setEditableGroups] = useState(categoryGroups);
    const [editableCategories, setEditableCategories] = useState(categories);
    const [editableTotalBudget, setEditableTotalBudget] = useState(String(totalMonthlyBudget || ''));
    const [pickingIconFor, setPickingIconFor] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setActiveSettingsTab('general');
            setEditableGroups(categoryGroups);
            setEditableCategories(categories);
            setEditableTotalBudget(String(totalMonthlyBudget || ''));
        }
    }, [isOpen, categories, categoryGroups, totalMonthlyBudget]);

    const handleCategoryChange = (id: string, field: keyof Category, value: any) => {
        setEditableCategories(current =>
            current.map(cat => cat.id === id ? { ...cat, [field]: value } : cat)
        );
    };
    
    const handleGroupChange = (oldName: string, newName: string) => {
      if (oldName === newName || !newName.trim()) return;
      setEditableGroups(current => current.map(g => g === oldName ? newName : g));
      setEditableCategories(current => current.map(cat => cat.group === oldName ? { ...cat, group: newName } : cat));
    };

    const handleAddGroup = () => {
        const newGroupName = `Neue Gruppe ${editableGroups.length + 1}`;
        if (editableGroups.includes(newGroupName)) return;
        setEditableGroups(current => [...current, newGroupName]);
    };

    const handleDeleteGroup = (groupName: string) => {
        if (editableGroups.length <= 1) {
            alert("Die letzte Gruppe kann nicht gelöscht werden.");
            return;
        }
        const fallbackGroup = editableGroups.find(g => g !== groupName) || '';
        setEditableCategories(current => current.map(cat => cat.group === groupName ? { ...cat, group: fallbackGroup } : cat));
        setEditableGroups(current => current.filter(g => g !== groupName));
    };
    
    const handleAddCategory = (groupName: string) => {
        const newCategory: Category = {
            id: crypto.randomUUID(),
            name: "Neue Kategorie",
            color: "#8b5cf6",
            icon: "Plus",
            group: groupName
        };
        setEditableCategories(current => [...current, newCategory]);
    };
    
    const handleDeleteCategory = (id: string) => {
        setEditableCategories(current => current.filter(cat => cat.id !== id));
    };

    const handleSave = () => {
        setCategories(editableCategories);
        setCategoryGroups(editableGroups);
        setTotalMonthlyBudget(parseFloat(editableTotalBudget.replace(',', '.')) || 0);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                    className="bg-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-700 flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center p-6 border-b border-slate-700 flex-shrink-0">
                        <h2 className="text-xl font-bold text-white">Einstellungen</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors"><X className="h-5 w-5" /></button>
                    </div>

                    <div className="flex border-b border-slate-700 px-6 pt-4">
                        <button 
                            onClick={() => setActiveSettingsTab('general')} 
                            className={`flex items-center gap-2 pb-3 px-2 border-b-2 text-sm font-semibold transition-colors ${
                                activeSettingsTab === 'general' 
                                ? 'border-rose-500 text-white' 
                                : 'border-transparent text-slate-400 hover:text-white'
                            }`}
                        >
                            <SlidersHorizontal className="h-4 w-4"/>
                            Allgemein
                        </button>
                        <button 
                            onClick={() => setActiveSettingsTab('categories')} 
                            className={`flex items-center gap-2 pb-3 px-2 ml-4 border-b-2 text-sm font-semibold transition-colors ${
                                activeSettingsTab === 'categories' 
                                ? 'border-rose-500 text-white' 
                                : 'border-transparent text-slate-400 hover:text-white'
                            }`}
                        >
                           <LayoutGrid className="h-4 w-4"/>
                           Kategorien
                        </button>
                    </div>

                    <div className="p-6 max-h-[60vh] overflow-y-auto space-y-8">
                        <AnimatePresence mode="wait">
                            {activeSettingsTab === 'general' && (
                                <motion.div
                                    key="general"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-8"
                                >
                                    {/* Sync Settings */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                                            <Sheet className="h-5 w-5 text-green-400" /> Google Sheets Sync
                                        </h3>
                                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700/50">
                                            <div>
                                                <label htmlFor="auto-sync-toggle" className="block text-sm font-medium text-slate-300">Automatische Synchronisierung</label>
                                                <p className="text-xs text-slate-400 mt-1">Speichert Änderungen alle 5 Minuten im Hintergrund.</p>
                                            </div>
                                            <ToggleSwitch id="auto-sync-toggle" enabled={isAutoSyncEnabled} setEnabled={setIsAutoSyncEnabled} />
                                        </div>
                                    </div>

                                    {/* Default Budget */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                                            <Wallet className="h-5 w-5 text-blue-400" /> Monatliches Standardbudget
                                        </h3>
                                        <div className="pt-4 mt-4 border-t border-slate-700/50">
                                           <label htmlFor="total-budget-input" className="block text-sm font-medium text-slate-300 mb-1">Gesamtbudget</label>
                                           <p className="text-xs text-slate-400 mb-3">Dieses Budget wird als Gesamtbudget für die Monatsübersicht im "Budgets" Tab verwendet.</p>
                                            <div className="relative mt-2 max-w-xs">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                                                <input
                                                    id="total-budget-input"
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={editableTotalBudget}
                                                    onChange={e => setEditableTotalBudget(e.target.value)}
                                                    placeholder="z.B. 2000"
                                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-8 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeSettingsTab === 'categories' && (
                                 <motion.div
                                    key="categories"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-white">Kategorien & Gruppen</h3>
                                        <button onClick={handleAddGroup} className="flex items-center gap-2 text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md font-semibold"><Plus className="h-4 w-4"/>Neue Gruppe</button>
                                    </div>
                                    <Reorder.Group axis="y" values={editableGroups} onReorder={setEditableGroups} className="space-y-4">
                                        {editableGroups.map(groupName => {
                                            const groupCategories = editableCategories.filter(c => c.group === groupName);
                                            return (
                                            <Reorder.Item key={groupName} value={groupName} as="div" className="bg-slate-700/40 p-4 rounded-lg">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="text-slate-500 cursor-grab"><GripVertical className="h-5 w-5" /></div>
                                                    <input
                                                        type="text"
                                                        value={groupName}
                                                        onBlur={(e) => handleGroupChange(groupName, e.target.value)}
                                                        onChange={(e) => setEditableGroups(current => current.map(g => g === groupName ? e.target.value : g))}
                                                        className="bg-transparent text-lg font-bold text-white w-full focus:outline-none focus:bg-slate-600/50 rounded px-2"
                                                    />
                                                    <button onClick={() => handleDeleteGroup(groupName)} className="p-1 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4"/></button>
                                                </div>
                                                <Reorder.Group
                                                    axis="y"
                                                    values={groupCategories}
                                                    onReorder={(newOrder) => {
                                                        const otherCategories = editableCategories.filter(c => c.group !== groupName);
                                                        setEditableCategories([...otherCategories, ...newOrder]);
                                                    }}
                                                    className="space-y-2 ml-4 pl-4 border-l-2 border-slate-600"
                                                >
                                                    {groupCategories.map(cat => {
                                                        const Icon = iconMap[cat.icon] || iconMap['MoreHorizontal'];
                                                        return (
                                                            <Reorder.Item key={cat.id} value={cat} as="div" className="flex items-center gap-3 p-2 bg-slate-700/50 rounded-lg">
                                                                <div className="text-slate-500 cursor-grab"><GripVertical className="h-5 w-5" /></div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPickingIconFor(cat.id)}
                                                                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-rose-500"
                                                                    style={{ backgroundColor: cat.color }}
                                                                    title="Symbol ändern"
                                                                ><Icon className="h-5 w-5 text-white" /></button>
                                                                
                                                                <input type="text" value={cat.name} onChange={e => handleCategoryChange(cat.id, 'name', e.target.value)} className="bg-transparent font-medium text-white w-full focus:outline-none"/>
                                                                <input type="color" value={cat.color} onChange={e => handleCategoryChange(cat.id, 'color', e.target.value)} className="w-8 h-8 p-0 border-none rounded-md bg-transparent cursor-pointer" title="Farbe ändern"/>
                                                                
                                                                <select value={cat.group} onChange={e => handleCategoryChange(cat.id, 'group', e.target.value)} className="bg-slate-600 text-sm rounded-md border-slate-500 p-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500">
                                                                  {editableGroups.map(g => <option key={g} value={g}>{g}</option>)}
                                                                </select>

                                                                <button onClick={() => handleDeleteCategory(cat.id)} className="p-1 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4"/></button>
                                                            </Reorder.Item>
                                                        )
                                                    })}
                                                </Reorder.Group>
                                                <button onClick={() => handleAddCategory(groupName)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mt-3 ml-8"><Plus className="h-4 w-4"/>Kategorie hinzufügen</button>
                                            </Reorder.Item>
                                            )
                                        })}
                                    </Reorder.Group>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="p-6 border-t border-slate-700 flex justify-end">
                         <button onClick={handleSave} className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold px-6 py-2 rounded-lg shadow-md hover:opacity-90 transition-opacity">
                            <Save className="h-4 w-4" /> Speichern & Schließen
                        </button>
                    </div>
                </motion.div>
            </motion.div>
            {pickingIconFor && (
                <IconPicker
                    onClose={() => setPickingIconFor(null)}
                    onSelect={(iconName) => {
                        if (pickingIconFor) {
                             handleCategoryChange(pickingIconFor, 'icon', iconName);
                        }
                        setPickingIconFor(null);
                    }}
                />
            )}
        </AnimatePresence>
    );
};

export default App;
