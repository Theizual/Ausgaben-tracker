
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { INITIAL_CATEGORIES } from './constants';
import useLocalStorage from './hooks/useLocalStorage';
import type { Transaction, Category } from './types';
import Dashboard from './components/Dashboard';
import Statistics from './components/Statistics';
import { formatGermanDate } from './utils/dateUtils';
import { extractSheetIdFromUrl } from './utils/sheetUtils';
import { iconMap, Settings, Cloud, Loader2, X, TrendingDown, LayoutGrid, BarChart2, Sheet } from './components/Icons';

// Main App Component
const App: React.FC = () => {
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [categories, setCategories] = useLocalStorage<Category[]>('categories', INITIAL_CATEGORIES);
    const [googleSheetUrl, setGoogleSheetUrl] = useLocalStorage<string>('googleSheetUrl', '');
    
    const [activeTab, setActiveTab] = useState<'dashboard' | 'statistics'>('dashboard');
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    
    // API communication state
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
    
    const sheetId = useMemo(() => extractSheetIdFromUrl(googleSheetUrl), [googleSheetUrl]);

    const downloadFromSheet = useCallback(async () => {
        if (!sheetId) {
             alert("Bitte zuerst eine gültige Google Sheet URL in den Einstellungen speichern.");
             return;
        }
        setIsSyncing(true);
        setSyncError(null);
        try {
            const response = await fetch('/api/sheets/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sheetId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Fehler beim Laden (${response.status})`);
            }

            const data = await response.json();
            const newCategories: Category[] = data.categories || [];
            const newTransactions: Transaction[] = data.transactions || [];

            if (newCategories.length > 0) setCategories(newCategories);
            if (newTransactions.length > 0) setTransactions(newTransactions);
            
            alert(`Daten erfolgreich geladen: ${newCategories.length} Kategorien und ${newTransactions.length} Transaktionen.`);

        } catch (e: any) {
            console.error("Error downloading from sheet:", e);
            const errorMessage = e.message || "Unbekannter Fehler beim Herunterladen. Prüfen Sie URL, Blattnamen & Freigabe für den Service Account.";
            setSyncError(errorMessage);
            alert(errorMessage);
        } finally {
            setIsSyncing(false);
        }
    }, [sheetId, setCategories, setTransactions]);

    const uploadToSheet = useCallback(async () => {
        if (!sheetId) {
            alert("Keine gültige Sheet-URL konfiguriert.");
            return;
        }
        setIsSyncing(true);
        setSyncError(null);

        try {
            const response = await fetch('/api/sheets/write', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sheetId,
                    categories,
                    transactions,
                }),
            });

            if (!response.ok) {
                 const errorData = await response.json();
                throw new Error(errorData.error || `Fehler beim Speichern (${response.status})`);
            }

            await response.json();
            alert("Daten erfolgreich in Google Sheet gespeichert!");
        } catch (e: any) {
            console.error("Error uploading to sheet:", e);
            const errorMessage = e.message || "Fehler beim Hochladen. Prüfen Sie Ihre Berechtigungen.";
            setSyncError(errorMessage);
            alert(errorMessage);
        } finally {
            setIsSyncing(false);
        }
    }, [sheetId, categories, transactions]);


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
                    onSyncClick={uploadToSheet}
                    isSyncing={isSyncing} 
                    isSheetConfigured={!!sheetId}
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
                                    categoryMap={categoryMap}
                                    addTransaction={addTransaction}
                                    updateTransaction={updateTransaction}
                                    deleteTransaction={deleteTransaction}
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
                    googleSheetUrl={googleSheetUrl}
                    setGoogleSheetUrl={setGoogleSheetUrl}
                    onDownload={downloadFromSheet}
                    isSyncing={isSyncing}
                    isSheetConfigured={!!sheetId}
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
    onSyncClick: () => void; 
    isSyncing: boolean; 
    isSheetConfigured: boolean; 
}> = ({ onSettingsClick, onSyncClick, isSyncing, isSheetConfigured }) => {
    const [currentDate, setCurrentDate] = useState(formatGermanDate(new Date()));
    
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
                    onClick={onSyncClick} 
                    disabled={isSyncing || !isSheetConfigured} 
                    className="p-2 rounded-full hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    title={!isSheetConfigured ? "Bitte Sheet URL in Einstellungen festlegen" : "In Google Sheet speichern"}
                >
                    {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Cloud className="h-5 w-5" />}
                </button>
                <button onClick={onSettingsClick} className="p-2 rounded-full hover:bg-slate-700 transition-colors">
                    <Settings className="h-5 w-5" />
                </button>
            </div>
        </header>
    );
};

// MainTabs Component
const MainTabs: React.FC<{ activeTab: string; setActiveTab: (tab: 'dashboard' | 'statistics') => void }> = ({ activeTab, setActiveTab }) => {
    const tabs = [{ id: 'dashboard', label: 'Übersicht', icon: LayoutGrid }, { id: 'statistics', label: 'Statistiken', icon: BarChart2 }];
    return (
        <div className="mt-6 flex items-center space-x-2">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'dashboard' | 'statistics')}
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

// SettingsModal Component
const SettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    setCategories: (cats: Category[] | ((prev: Category[]) => Category[])) => void;
    googleSheetUrl: string;
    setGoogleSheetUrl: (url: string) => void;
    onDownload: () => void;
    isSyncing: boolean;
    isSheetConfigured: boolean;
}> = ({ isOpen, onClose, categories, setCategories, googleSheetUrl, setGoogleSheetUrl, onDownload, isSyncing, isSheetConfigured }) => {
    const [editableCategories, setEditableCategories] = useState(categories);
    const [editableGoogleSheetUrl, setEditableGoogleSheetUrl] = useState(googleSheetUrl);
    
    useEffect(() => {
        if (isOpen) {
            setEditableCategories(categories);
            setEditableGoogleSheetUrl(googleSheetUrl);
        }
    }, [isOpen, categories, googleSheetUrl]);

    const handleCategoryChange = (id: string, field: 'name' | 'color', value: string) => {
        setEditableCategories(currentCategories =>
            currentCategories.map(cat =>
                cat.id === id ? { ...cat, [field]: value } : cat
            )
        );
    };

    const handleSave = () => {
        setCategories(editableCategories);
        setGoogleSheetUrl(editableGoogleSheetUrl);
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
                    className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center p-6 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-white">Einstellungen</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="p-6 max-h-[70vh] overflow-y-auto">
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                                <Sheet className="h-5 w-5 text-green-400" /> Google Sheets Sync
                            </h3>
                            <p className="text-sm text-slate-400 mb-6">
                                Sichern Sie Ihre Daten in einem privaten Google Sheet. Geben Sie die URL Ihres Sheets ein und geben Sie es für die E-Mail-Adresse Ihres Service-Accounts frei (siehe Anleitung).
                                Ihre Tabelle muss die Blätter <code className="bg-slate-700 px-1 rounded text-xs">Categories</code> und <code className="bg-slate-700 px-1 rounded text-xs">Transactions</code> enthalten.
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="sheet-url" className="block text-sm font-medium text-slate-300 mb-2">Google Sheet URL</label>
                                    <input
                                        id="sheet-url"
                                        type="url"
                                        value={editableGoogleSheetUrl}
                                        onChange={e => setEditableGoogleSheetUrl(e.target.value)}
                                        placeholder="https://docs.google.com/spreadsheets/d/..."
                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>
                                <div className="pt-2">
                                    <button onClick={onDownload} disabled={isSyncing || !isSheetConfigured} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" title={!isSheetConfigured ? 'Bitte zuerst URL speichern' : 'Daten aus Sheet laden'}>
                                        {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Von Sheet laden'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4 text-white">Kategorien verwalten</h3>
                            <div className="space-y-3">
                                {editableCategories.map(cat => {
                                    const Icon = iconMap[cat.icon] || iconMap['MoreHorizontal'];
                                    return (
                                        <div key={cat.id} className="flex items-center gap-4 p-2 bg-slate-700/50 rounded-lg">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: cat.color }}>
                                                    <Icon className="h-5 w-5 text-white" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={cat.name}
                                                    onChange={e => handleCategoryChange(cat.id, 'name', e.target.value)}
                                                    className="bg-transparent font-medium text-white w-full focus:outline-none"
                                                />
                                            </div>
                                            <input
                                                type="color"
                                                value={cat.color}
                                                onChange={e => handleCategoryChange(cat.id, 'color', e.target.value)}
                                                className="w-8 h-8 p-0 border-none rounded-md bg-slate-600 cursor-pointer"
                                                style={{backgroundColor: cat.color}}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-t border-slate-700 flex justify-end">
                         <button onClick={handleSave} className="bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold px-6 py-2 rounded-lg shadow-md hover:opacity-90 transition-opacity">
                            Speichern & Schließen
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default App;
