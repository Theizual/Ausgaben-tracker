
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useApp } from './contexts/AppContext';
import Dashboard from './components/Dashboard';
import Statistics from './components/Statistics';
import TransactionsPage from './components/Transactions';
import TagsPage from './components/TagsPage';
import SettingsModal from './components/SettingsModal';
import ConfirmationModal from './components/ConfirmationModal';
import TransactionDetailModal from './components/TransactionDetailModal';
import { formatGermanDate } from './utils/dateUtils';
import { Settings, Loader2, Save, DownloadCloud, TrendingDown, LayoutGrid, Repeat, BarChart2, Tags } from './components/Icons';

// Main App Component (now a clean layout/composition root)
const App: React.FC = () => {
    const {
        // UI State & Handlers
        activeTab,
        setActiveTab,
        isSettingsOpen,
        openSettings,
        closeSettings,
        confirmationData,
        closeConfirmation,
        transactionForDetail,
        closeTransactionDetail,
        // Sync State & Handlers
        syncOperation,
        uploadToSheet,
        downloadFromSheet,
    } = useApp();

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <Dashboard />;
            case 'transactions': return <TransactionsPage />;
            case 'statistics': return <Statistics />;
            case 'tags': return <TagsPage />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200">
            <Toaster
                position="bottom-center"
                toastOptions={{
                    className: 'bg-slate-700 text-white border border-slate-600',
                    success: {
                        className: 'bg-green-800/80 text-white border border-green-600/50',
                        iconTheme: { primary: '#10B981', secondary: 'white' },
                    },
                    error: {
                        className: 'bg-red-800/80 text-white border border-red-600/50',
                         iconTheme: { primary: '#F87171', secondary: 'white' },
                    },
                }}
            />
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 md:pb-24">
                <Header 
                    onSettingsClick={openSettings} 
                    onUploadClick={() => uploadToSheet()}
                    onDownloadClick={downloadFromSheet}
                    syncOperation={syncOperation}
                />
                
                {/* Desktop Tabs */}
                <div className="hidden md:block">
                    <MainTabs activeTab={activeTab} setActiveTab={setActiveTab} isMobile={false} />
                </div>
                
                <main className="mt-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

             {/* Mobile Bottom Nav */}
            <div className="md:hidden">
                <MainTabs activeTab={activeTab} setActiveTab={setActiveTab} isMobile={true} />
            </div>

            <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
            
            <AnimatePresence>
                {confirmationData && (
                    <ConfirmationModal
                        isOpen={!!confirmationData}
                        onClose={closeConfirmation}
                        transaction={confirmationData.transaction}
                        totalSpentBefore={confirmationData.totalSpentBefore}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {transactionForDetail && (
                     <TransactionDetailModal
                        isOpen={!!transactionForDetail}
                        onClose={closeTransactionDetail}
                        transaction={transactionForDetail.transaction}
                        initialMode={transactionForDetail.mode}
                     />
                )}
            </AnimatePresence>
        </div>
    );
};

// Header Component
const Header: React.FC<{ 
    onSettingsClick: () => void; 
    onUploadClick: () => void; 
    onDownloadClick: () => void;
    syncOperation: 'upload' | 'download' | null;
}> = ({ onSettingsClick, onUploadClick, onDownloadClick, syncOperation }) => {
    const isSyncing = syncOperation !== null;
    
    return (
        <header className="flex justify-between items-center pb-4 md:border-b md:border-slate-700">
            <div className="flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-rose-500" />
                <h1 className="text-2xl font-bold text-white">Ausgaben Tracker</h1>
            </div>
            <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                    <p className="text-slate-400 text-sm">{formatGermanDate(new Date())}</p>
                </div>
                 <button 
                    onClick={onDownloadClick} 
                    disabled={isSyncing} 
                    className="p-3 rounded-full hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    title={"Von Google Sheet laden"}
                >
                    {syncOperation === 'download' ? <Loader2 className="h-5 w-5 animate-spin" /> : <DownloadCloud className="h-5 w-5" />}
                </button>
                 <button 
                    onClick={onUploadClick} 
                    disabled={isSyncing} 
                    className="p-3 rounded-full hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    title={"In Google Sheet speichern"}
                >
                    {syncOperation === 'upload' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                </button>
                <button onClick={onSettingsClick} className="p-3 rounded-full hover:bg-slate-700 transition-colors">
                    <Settings className="h-5 w-5" />
                </button>
            </div>
        </header>
    );
};

// MainTabs Component
const MainTabs: React.FC<{ 
    activeTab: string; 
    setActiveTab: (tab: 'dashboard' | 'transactions' | 'statistics' | 'tags') => void;
    isMobile: boolean;
}> = ({ activeTab, setActiveTab, isMobile }) => {
    const tabs = [
        { id: 'dashboard', label: 'Übersicht', icon: LayoutGrid },
        { id: 'transactions', label: 'Transaktionen', icon: Repeat },
        { id: 'statistics', label: 'Statistiken', icon: BarChart2 },
        { id: 'tags', label: 'Tags', icon: Tags },
    ];
    
    if (isMobile) {
        return (
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700">
                <div className="flex justify-around items-center h-16">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${
                                activeTab === tab.id
                                    ? 'text-rose-400'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title={tab.label}
                        >
                            <tab.icon className="h-6 w-6" />
                            <span className="text-xs font-medium">{tab.label}</span>
                             {activeTab === tab.id && (
                                <motion.div className="absolute bottom-0 h-1 w-8 bg-rose-400 rounded-t-full" layoutId="underline" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="mt-6 flex items-center space-x-2">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center justify-center rounded-lg text-sm font-medium transition-all gap-2 p-3 px-4 py-2
                        ${
                            activeTab === tab.id
                                ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`
                    }
                    title={tab.label}
                >
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                </button>
            ))}
        </div>
    );
};

export default App;
