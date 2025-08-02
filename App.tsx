
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { INITIAL_CATEGORIES } from './constants';
import useLocalStorage from './hooks/useLocalStorage';
import type { Transaction, Category } from './types';
import Dashboard from './components/Dashboard';
import Statistics from './components/Statistics';
import { formatGermanDate } from './utils/dateUtils';
import { iconMap, Settings, Cloud, Loader2, X, TrendingDown, LayoutGrid, BarChart2, Sheet } from './components/Icons';

// GAPI types for window object
declare global {
    interface Window {
        gapi: any;
    }
}

// Main App Component
const App: React.FC = () => {
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [categories, setCategories] = useLocalStorage<Category[]>('categories', INITIAL_CATEGORIES);
    const [googleSheetUrl, setGoogleSheetUrl] = useLocalStorage<string>('googleSheetUrl', '');
    
    const [activeTab, setActiveTab] = useState<'dashboard' | 'statistics'>('dashboard');
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    
    const [isGapiReady, setIsGapiReady] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    const hasPerformedInitialDownload = useRef(false);

    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
    
    const sheetConfig = useMemo(() => {
        try {
            if (!googleSheetUrl) return null;
            const url = new URL(googleSheetUrl);
            const pathParts = url.pathname.split('/');
            const spreadsheetId = pathParts[pathParts.indexOf('d') + 1];
            if (!spreadsheetId) return null;
            return { spreadsheetId };
        } catch (e) {
            return null;
        }
    }, [googleSheetUrl]);

    useEffect(() => {
        const initClient = () => {
            if (!process.env.API_KEY) {
                const errorMsg = "API Key für Google Sheets nicht konfiguriert. Die Sync-Funktion ist deaktiviert.";
                console.error(errorMsg);
                setSyncError(errorMsg);
                return;
            }

            window.gapi.client.init({
                apiKey: process.env.API_KEY,
                discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
            }).then(() => {
                setIsGapiReady(true);
                setSyncError(null);
            }).catch((error: any) => {
                console.error("Error initializing GAPI client. Details:", JSON.stringify(error, null, 2));
                const userMessage = "Google API-Initialisierung fehlgeschlagen: Der API-Schlüssel ist ungültig oder für Google Sheets nicht freigeschaltet. Die Sync-Funktion ist deaktiviert.";
                setSyncError(userMessage);
            });
        };

        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => window.gapi.load('client', initClient);
        script.onerror = () => setSyncError("Das Google API Skript konnte nicht geladen werden. Sync ist nicht möglich.");
        script.async = true;
        document.body.appendChild(script);

        return () => {
            const scriptTag = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
            if (scriptTag && scriptTag.parentNode) {
                scriptTag.parentNode.removeChild(scriptTag);
            }
        };
    }, []);

    const downloadFromSheet = useCallback(async () => {
        if (!isGapiReady || !sheetConfig) {
             alert("Bitte zuerst eine gültige Google Sheet URL in den Einstellungen speichern.");
             return;
        }
        setIsSyncing(true);
        setSyncError(null);
        try {
            const response = await window.gapi.client.sheets.spreadsheets.values.batchGet({
                spreadsheetId: sheetConfig.spreadsheetId,
                ranges: ['Categories!A2:D', 'Transactions!A2:E'],
            });
            const valueRanges = response.result.valueRanges;
            
            const categoryValues = valueRanges.find((r: any) => r.range.startsWith('Categories'))?.values || [];
            const newCategories: Category[] = categoryValues.map((row: string[]) => ({
                id: row[0], name: row[1], color: row[2], icon: row[3],
            })).filter((c: Category) => c.id && c.name && c.color && c.icon);

            const transactionValues = valueRanges.find((r: any) => r.range.startsWith('Transactions'))?.values || [];
            const newTransactions: Transaction[] = transactionValues.map((row: string[]) => ({
                id: row[0], amount: parseFloat(row[1].replace(',', '.')) || 0, description: row[2], categoryId: row[3], date: row[4],
            })).filter((t: Transaction) => t.id && t.amount > 0 && t.categoryId && t.date);

            if (newCategories.length > 0) setCategories(newCategories);
            if (newTransactions.length > 0) setTransactions(newTransactions);
            
            alert(`Daten erfolgreich geladen: ${newCategories.length} Kategorien und ${newTransactions.length} Transaktionen.`);

        } catch (e: any) {
            console.error("Error downloading from sheet:", e);
            const errorMessage = "Fehler beim Herunterladen der Daten. Überprüfen Sie die URL, die Blattnamen ('Categories', 'Transactions') und die Freigabeeinstellungen.";
            setSyncError(errorMessage);
            alert(errorMessage);
        } finally {
            setIsSyncing(false);
        }
    }, [isGapiReady, sheetConfig, setCategories, setTransactions]);

    useEffect(() => {
        if (isGapiReady && !syncError && googleSheetUrl && !hasPerformedInitialDownload.current) {
            hasPerformedInitialDownload.current = true;
            downloadFromSheet();
        }
    }, [isGapiReady, syncError, googleSheetUrl, downloadFromSheet]);

    const uploadToSheet = useCallback(async () => {
        if (!isGapiReady || !sheetConfig || syncError) {
            alert("Die Synchronisierung ist aufgrund eines Konfigurationsproblems nicht möglich. Bitte überprüfen Sie die Einstellungen und die Fehlermeldung.");
            return;
        }
        setIsSyncing(true);
        setSyncError(null);

        const categoryHeader = ['id', 'name', 'color', 'icon'];
        const transactionHeader = ['id', 'amount', 'description', 'categoryId', 'date'];

        const categoryValues = [categoryHeader, ...categories.map(c => [c.id, c.name, c.color, c.icon])];
        const transactionValues = [transactionHeader, ...transactions.map(t => [t.id, String(t.amount).replace('.',','), t.description, t.categoryId, t.date])];

        try {
            await window.gapi.client.sheets.spreadsheets.values.batchClear({
                 spreadsheetId: sheetConfig.spreadsheetId,
                 resource: { ranges: ['Categories!A1:D', 'Transactions!A1:E'] }
            });
            
            await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: sheetConfig.spreadsheetId,
                resource: {
                    valueInputOption: 'USER_ENTERED',
                    data: [
                        { range: 'Categories!A1', values: categoryValues },
                        { range: 'Transactions!A1', values: transactionValues }
                    ]
                }
            });
            alert("Daten erfolgreich in Google Sheet gespeichert!");
        } catch (e: any) {
            console.error("Error uploading to sheet:", e);
            const errorMessage = "Fehler beim Hochladen der Daten. Überprüfen Sie die URL, die Freigabeeinstellungen und ob die API-Berechtigungen korrekt sind.";
            setSyncError(errorMessage);
            alert(errorMessage);
        } finally {
            setIsSyncing(false);
        }
    }, [isGapiReady, sheetConfig, categories, transactions, syncError]);


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
                <Header onSettingsClick={() => setSettingsOpen(true)} onSyncClick={uploadToSheet} isSyncing={isSyncing} googleSheetUrlConfigured={!!googleSheetUrl} isGapiReady={isGapiReady} syncError={syncError} />
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
                    isGapiReady={isGapiReady}
                    syncError={syncError}
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
                <strong className="font-bold">Sync-Fehler</strong>
                <span className="block sm:inline ml-2">{message}</span>
            </div>
            <button onClick={onClose} className="absolute top-0 bottom-0 right-0 px-4 py-3" aria-label="Fehlermeldung schließen">
                <X className="h-5 w-5 text-red-400 hover:text-red-200" />
            </button>
        </motion.div>
    );
};


// Header Component
const Header: React.FC<{ onSettingsClick: () => void; onSyncClick: () => void; isSyncing: boolean; googleSheetUrlConfigured: boolean; isGapiReady: boolean; syncError: string | null; }> = ({ onSettingsClick, onSyncClick, isSyncing, googleSheetUrlConfigured, isGapiReady, syncError }) => {
    const [currentDate, setCurrentDate] = useState(formatGermanDate(new Date()));
    const isSyncDisabled = isSyncing || !isGapiReady || !!syncError;
    
    const getSyncTitle = () => {
        if (syncError) return `Sync deaktiviert: ${syncError}`;
        if (!isGapiReady) return "Google API wird initialisiert...";
        if (isSyncing) return "Synchronisiere...";
        return "In Google Sheet speichern";
    };

    return (
        <header className="flex justify-between items-center pb-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-rose-500" />
                <h1 className="text-2xl font-bold text-white">Ausgaben Tracker</h1>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <p className="text-slate-400 text-sm">{currentDate}</p>
                </div>
                {googleSheetUrlConfigured && (
                    <button onClick={onSyncClick} disabled={isSyncDisabled} className="p-2 rounded-full hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={getSyncTitle()}>
                        {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Cloud className="h-5 w-5" />}
                    </button>
                )}
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
    isGapiReady: boolean;
    syncError: string | null;
}> = ({ isOpen, onClose, categories, setCategories, googleSheetUrl, setGoogleSheetUrl, onDownload, isSyncing, isGapiReady, syncError }) => {
    const [editableCategories, setEditableCategories] = useState(categories);
    const [editableGoogleSheetUrl, setEditableGoogleSheetUrl] = useState(googleSheetUrl);
    
    useEffect(() => {
        setEditableCategories(categories);
        setEditableGoogleSheetUrl(googleSheetUrl);
    }, [isOpen, categories, googleSheetUrl]);

    const handleCategoryChange = (id: string, field: 'name' | 'color', value: string) => {
        setEditableCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleSave = () => {
        setCategories(editableCategories);
        setGoogleSheetUrl(editableGoogleSheetUrl);
        // If the URL was empty and is now filled, we might want to trigger a re-download.
        // The main component's useEffect will handle this when googleSheetUrl changes.
        onClose();
    };

    if (!isOpen) return null;
    
    const isDownloadDisabled = isSyncing || !isGapiReady || !!syncError;

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
                            <h3 className="text-lg font-semibold mb-2 text-white flex items-center gap-2">
                                <Sheet className="h-5 w-5 text-green-400" /> Google Sheets Sync
                            </h3>
                            <p className="text-sm text-slate-400 mb-4">
                                Tragen Sie die URL Ihres Google Sheets ein. Die Tabelle muss zwei Blätter haben: <code className="bg-slate-700 px-1 rounded">Categories</code> und <code className="bg-slate-700 px-1 rounded">Transactions</code>.
                                Stellen Sie sicher, dass die Freigabe auf <span className="font-semibold text-amber-400">'Jeder, der über den Link verfügt'</span> mit der Berechtigung <span className="font-semibold text-amber-400">'Bearbeiter'</span> gesetzt ist.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="url"
                                    value={editableGoogleSheetUrl}
                                    onChange={e => setEditableGoogleSheetUrl(e.target.value)}
                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                />
                                <button onClick={onDownload} disabled={isDownloadDisabled} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Laden'}
                                </button>
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
                            Speichern
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default App;
