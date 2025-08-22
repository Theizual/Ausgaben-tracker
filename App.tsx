import React, { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useUIContext, useDataContext, useSyncContext, useUserContext } from '@/contexts/AppContext';
import { DashboardPage } from '@/features/dashboard';
import { AnalysisPage } from '@/features/statistics';
import { TransactionsPage } from '@/features/transactions';
import { MealPlanPage } from '@/features/meal-plan';
import { SettingsModal } from '@/features/settings';
import { ConfirmationModal } from '@/features/confirmation';
import { TransactionDetailModal } from '@/features/transaction-detail';
import { ChangelogModal } from '@/features/changelog';
import { Header, MainTabs } from '@/features/shell';
import { APP_VERSION } from '@/constants';
import useLocalStorage from '@/shared/hooks/useLocalStorage';
import { SyncPromptToast } from '@/features/sync-prompt/ui/SyncPromptToast';
import { DeleteCategoryModal } from '@/features/settings/components/DeleteCategoryModal';
import { DeleteTagModal } from '@/features/settings/components/DeleteTagModal';
import type { CategoryFormData } from '@/features/settings/components/CategoryLibrarySettings';
import { UserMergePromptModal } from '@/features/onboarding';
import type { Transaction, Tag } from '@/shared/types';
import { pageContentAnimation } from '@/shared/lib/animations';
import { ErrorBoundary } from '@/shared/ui';

// Main App Component (now a clean layout/composition root)
const App = () => {
    const {
        activeTab,
        setActiveTab,
        isSettingsOpen,
        openSettings,
        closeSettings,
        initialSettingsTab,
        confirmationData,
        closeConfirmation,
        transactionForDetailId,
        closeTransactionDetail,
        isChangelogOpen,
        openChangelog,
        closeChangelog,
        isChangelogAutoShowEnabled,
        setIsChangelogAutoShowEnabled,
        reassignModalInfo,
        closeReassignModal,
        userMergeModalInfo,
        closeUserMergeModal,
        deleteTagModalInfo,
        closeDeleteTagModal,
        deLocale,
    } = useUIContext();
    
    const { transactions } = useDataContext();
    const { syncOperation, lastSync, syncData } = useSyncContext();
    const { users, showDemoData, isMealPlanEnabled } = useUserContext();

    const [lastSeenVersion, setLastSeenVersion] = useLocalStorage('lastSeenVersion', '0.0.0');

    const transactionObjectForDetail = useMemo(() => 
        transactionForDetailId ? transactions.find(t => t.id === transactionForDetailId) : null,
        [transactions, transactionForDetailId]
    );

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

    // Redirect if meal plan is disabled
    useEffect(() => {
        if (!isMealPlanEnabled && activeTab === 'meal-plan') {
            setActiveTab('dashboard');
        }
    }, [isMealPlanEnabled, activeTab, setActiveTab]);

    const handleCloseChangelog = () => {
        closeChangelog();
        setLastSeenVersion(APP_VERSION);
    };


    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardPage />;
            case 'transactions': return <TransactionsPage />;
            case 'analysis': return <AnalysisPage />;
            case 'meal-plan': return isMealPlanEnabled ? <MealPlanPage /> : null;
            default: return null;
        }
    };

    return (
        <ErrorBoundary>
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
                            showDemoData={showDemoData}
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
                                {...{
                                    variants: pageContentAnimation,
                                    initial: "initial",
                                    animate: "animate",
                                    exit: "exit",
                                    transition: { duration: 0.3 },
                                }}
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
                    {transactionObjectForDetail && (
                         <TransactionDetailModal
                            isOpen={!!transactionObjectForDetail}
                            onClose={closeTransactionDetail}
                            transaction={transactionObjectForDetail}
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
                
                <AnimatePresence>
                    {reassignModalInfo && (
                        <DeleteCategoryModal
                            isOpen={!!reassignModalInfo}
                            onClose={closeReassignModal}
                            category={reassignModalInfo.category as CategoryFormData}
                            transactionCount={reassignModalInfo.txCount}
                            transactions={reassignModalInfo.transactions as Transaction[]}
                        />
                    )}
                </AnimatePresence>

                 <AnimatePresence>
                    {deleteTagModalInfo && (
                        <DeleteTagModal
                            isOpen={!!deleteTagModalInfo}
                            onClose={closeDeleteTagModal}
                            tag={deleteTagModalInfo.tag}
                            transactionCount={deleteTagModalInfo.txCount}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {userMergeModalInfo && (
                        <UserMergePromptModal
                            isOpen={!!userMergeModalInfo}
                            remoteUsers={userMergeModalInfo.remoteUsers}
                            onClose={closeUserMergeModal}
                        />
                    )}
                </AnimatePresence>

                <SyncPromptToast />
            </div>
        </ErrorBoundary>
    );
};

export default App;