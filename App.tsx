
import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import { DashboardPage } from '@/features/dashboard';
import { StatisticsPage } from '@/features/statistics';
import { TransactionsPage } from '@/features/transactions';
import { TagsPage } from '@/features/tags';
import { SettingsModal } from '@/features/settings';
import { ConfirmationModal } from '@/features/confirmation';
import { TransactionDetailModal } from '@/features/transaction-detail';
import { ChangelogModal } from '@/features/changelog';
import { formatGermanDate } from '@/shared/utils/dateUtils';
import { Settings, Loader2, LayoutGrid, Repeat, BarChart2, Tags, RefreshCw, User, CheckCircle2, Users } from '@/shared/ui';
import { formatDistanceToNow } from 'date-fns';
import Logo from '@/components/Logo';
import type { User as UserType } from '@/shared/types';
import { APP_VERSION } from '@/constants';
import useLocalStorage from '@/shared/hooks/useLocalStorage';
import { SyncPromptToast } from '@/features/sync-prompt/ui/SyncPromptToast';

// Main App Component (now a clean layout/composition root)
const App: React.FC = () => {
    const {
        // UI State & Handlers
        activeTab,
        setActiveTab,
        isSettingsOpen,
        openSettings,
        closeSettings,
        initialSettingsTab,
        confirmationData,
        closeConfirmation,
        transactionForDetail,
        closeTransactionDetail,
        isChangelogOpen,
        openChangelog,
        closeChangelog,
        isChangelogAutoShowEnabled,
        setIsChangelogAutoShowEnabled,
        // Sync State & Handlers
        syncOperation,
        lastSync,
        syncData,
        // User State
        users,
        deLocale,
    } = useApp();

    const [lastSeenVersion, setLastSeenVersion] = useLocalStorage('lastSeenVersion', '0.0.0');

    useEffect(() => {
        // Automatically show changelog on first launch after an update
        if (APP_VERSION > lastSeenVersion && isChangelogAutoShowEnabled) {
            openChangelog();
        }
    }, []); // Run only once on mount

    // Scroll to top when the main tab changes
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [activeTab]);

    const handleCloseChangelog = () => {
        closeChangelog();
        setLastSeenVersion(APP_VERSION);
    };


    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardPage />;
            case 'transactions': return <TransactionsPage />;
            case 'statistics': return <StatisticsPage />;
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

            {/* Sticky Header & Navigation */}
            <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Header 
                        users={users}
                        onSettingsClick={() => openSettings('general')} 
                        onSyncClick={() => syncData()}
                        syncOperation={syncOperation}
                        lastSync={lastSync}
                        deLocale={deLocale}
                    />
                    {/* Responsive Tabs are now part of the sticky header */}
                    <MainTabs activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>
                 {/* The bottom border now lives outside the padded container to be full-width */}
                <div className="border-b border-slate-700"></div>
            </header>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
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

            <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} initialTab={initialSettingsTab} />
            
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
                     />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isChangelogOpen && (
                    <ChangelogModal 
                        onClose={handleCloseChangelog}
                        isAutoShowEnabled={isChangelogAutoShowEnabled}
                        onToggleAutoShow={() => setIsChangelogAutoShowEnabled(prev => !prev)}
                    />
                )}
            </AnimatePresence>
            <SyncPromptToast />
        </div>
    );
};

// User Selector Component
const UserSelector: React.FC = () => {
    const { users, currentUser, setCurrentUserId, openSettings } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleManageUsers = () => {
        setIsOpen(false);
        openSettings('users');
    };

    const handleOpenGeneralSettings = () => {
        setIsOpen(false);
        openSettings('general');
    };

    if (users.length === 0) {
        return (
            <button onClick={handleManageUsers} className="hidden sm:flex items-center gap-2 text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md font-semibold text-slate-300">
                <User className="h-4 w-4"/>Benutzer hinzufügen
            </button>
        )
    }

    if (!currentUser) return null;

    return (
        <div className="relative" ref={wrapperRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-700 transition-colors">
                 <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: currentUser.color }}>
                    {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline font-semibold text-sm text-slate-200">{currentUser.name}</span>
            </button>
            <AnimatePresence>
                {isOpen && (
                     <motion.div 
                        initial={{ opacity: 0, y: -5, scale: 0.95 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute z-40 top-full mt-2 right-0 w-60 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2"
                    >
                         <p className="px-4 py-1 text-xs text-slate-400 font-semibold uppercase">Benutzer wechseln</p>
                        {users.map(user => (
                            <button
                                key={user.id}
                                onClick={() => {
                                    setCurrentUserId(user.id);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50"
                            >
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: user.color }}>
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-white flex-1">{user.name}</span>
                                {currentUser.id === user.id && <CheckCircle2 className="h-5 w-5 text-rose-400" />}
                            </button>
                        ))}
                         <div className="border-t border-slate-700 my-2"></div>
                         <button onClick={handleManageUsers} className="w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50 text-slate-300">
                            <Users className="h-5 w-5"/>
                            <span className="font-medium">Benutzer verwalten</span>
                        </button>
                         <button onClick={handleOpenGeneralSettings} className="w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50 text-slate-300">
                            <Settings className="h-5 w-5"/>
                            <span className="font-medium">Einstellungen</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// Header Component
const Header: React.FC<{ 
    users: UserType[];
    onSettingsClick: () => void; 
    onSyncClick: () => void; 
    syncOperation: 'sync' | null;
    lastSync: string | null;
    deLocale: any;
}> = ({ users, onSettingsClick, onSyncClick, syncOperation, lastSync, deLocale }) => {
    const isSyncing = syncOperation !== null;

    const renderLastSyncText = () => {
        if (!lastSync) return 'Noch nicht synchronisiert';
        try {
            const lastSyncDate = new Date(lastSync);
            return `Zuletzt synchronisiert: ${formatDistanceToNow(lastSyncDate, { addSuffix: true, locale: deLocale })}`;
        } catch {
            return 'Sync-Status unbekannt';
        }
    };
    
    return (
        <div className="flex justify-between items-center py-2 sm:py-3">
            <Logo />
            <div className="flex items-center gap-1 sm:gap-2">
                <div className="text-right hidden sm:block">
                    <p className="text-slate-400 text-sm">{formatGermanDate(new Date(), deLocale)}</p>
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
                {users.length === 0 && (
                    <button onClick={onSettingsClick} className="p-3 rounded-full hover:bg-slate-700 transition-colors">
                        <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                )}
                <UserSelector />
            </div>
        </div>
    );
};

// Responsive MainTabs Component
const MainTabs: React.FC<{ 
    activeTab: string; 
    setActiveTab: (tab: 'dashboard' | 'transactions' | 'statistics' | 'tags') => void;
}> = ({ activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'dashboard', label: 'Übersicht', icon: LayoutGrid },
        { id: 'transactions', label: 'Transaktionen', icon: Repeat },
        { id: 'statistics', label: 'Statistiken', icon: BarChart2 },
        { id: 'tags', label: 'Tags', icon: Tags },
    ];
    
    return (
        <nav>
            {/* Mobile Tabs */}
            <div className="md:hidden">
                <div className="flex justify-around items-center h-14">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`relative flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${
                                activeTab === tab.id ? 'text-rose-400' : 'text-slate-400 hover:text-white'
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

            {/* Desktop Tabs */}
            <div className="hidden md:flex pb-3 items-center space-x-2">
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
        </nav>
    );
};

export default App;
