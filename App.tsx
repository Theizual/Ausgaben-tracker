
import React, { useState, useEffect } from 'react';
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
import { Header, MainTabs } from '@/features/shell';
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

export default App;
