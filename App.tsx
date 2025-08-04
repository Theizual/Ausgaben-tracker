

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
import { Settings, Loader2, LayoutGrid, Repeat, BarChart2, Tags, RefreshCw } from './components/Icons';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import Logo from './components/Logo';

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
        lastSync,
        syncData,
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
                position="top-center"
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

            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Header 
                        onSettingsClick={openSettings} 
                        onSyncClick={() => syncData()}
                        syncOperation={syncOperation}
                        lastSync={lastSync}
                    />
                </div>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-6">
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
                        transactions={confirmationData.transactions}
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
    onSyncClick: () => void; 
    syncOperation: 'sync' | null;
    lastSync: string | null;
}> = ({ onSettingsClick, onSyncClick, syncOperation, lastSync }) => {
    const isSyncing = syncOperation !== null;

    const renderLastSyncText = () => {
        if (!lastSync) return 'Noch nicht synchronisiert';
        try {
            const lastSyncDate = new Date(lastSync);
            return `Zuletzt synchronisiert: ${formatDistanceToNow(lastSyncDate, { addSuffix: true, locale: de })}`;
        } catch {
            return 'Sync-Status unbekannt';
        }
    };
    
    return (
        <header className="flex justify-between items-center py-2 sm:py-3">
            <Logo />
            <div className="flex items-center gap-1 sm:gap-2">
                <div className="text-right hidden sm:block">
                    <p className="text-slate-400 text-sm">{formatGermanDate(new Date())}</p>
                     <p className="text-xs text-slate-500">{renderLastSyncText()}</p>
                </div>
                 <button 
                    onClick={onSyncClick} 
                    disabled={isSyncing} 
                    className="p-3 rounded-full hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    title={"Daten synchronisieren"}
                >
                    {isSyncing ? <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" /> : <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6" />}
                </button>
                <button onClick={onSettingsClick} className="p-3 rounded-full hover:bg-slate-700 transition-colors">
                    <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
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