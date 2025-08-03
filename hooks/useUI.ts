
import { useState, useCallback } from 'react';
import type { Transaction } from '../types';

export const useUI = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'statistics' | 'tags'>('dashboard');
    const [selectedTagIdForAnalysis, setSelectedTagIdForAnalysis] = useState<string | null>(null);
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    const [confirmationData, setConfirmationData] = useState<{ transaction: Transaction; totalSpentBefore: number; } | null>(null);
    const [transactionForDetail, setTransactionForDetail] = useState<{ transaction: Transaction; mode: 'view' | 'edit' } | null>(null);

    const openSettings = useCallback(() => setSettingsOpen(true), []);
    const closeSettings = useCallback(() => setSettingsOpen(false), []);
    
    const showConfirmation = useCallback((data: { transaction: Transaction; totalSpentBefore: number; }) => setConfirmationData(data), []);
    const closeConfirmation = useCallback(() => setConfirmationData(null), []);

    const showTransactionDetail = useCallback((transaction: Transaction, mode: 'view' | 'edit' = 'view') => {
        setTransactionForDetail({ transaction, mode });
    }, []);
    const closeTransactionDetail = useCallback(() => setTransactionForDetail(null), []);

    const handleTagAnalyticsClick = useCallback((tagId: string) => {
        setActiveTab('tags');
        setSelectedTagIdForAnalysis(tagId);
    }, []);

    return {
        activeTab,
        setActiveTab,
        selectedTagIdForAnalysis,
        setSelectedTagIdForAnalysis,
        isSettingsOpen,
        openSettings,
        closeSettings,
        confirmationData,
        showConfirmation,
        closeConfirmation,
        transactionForDetail,
        handleTransactionClick: showTransactionDetail,
        closeTransactionDetail,
        handleTagAnalyticsClick,
        handleSelectTagForAnalysis: setSelectedTagIdForAnalysis,
    };
};
