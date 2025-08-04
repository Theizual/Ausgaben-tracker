

import { useState, useCallback } from 'react';
import { format, startOfDay, endOfDay, subMonths } from '../utils/dateUtils';
import type { Transaction, ViewMode, PeriodType, QuickFilterId } from '../types';


export const useUI = () => {
    // General App Navigation
    const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'statistics' | 'tags'>('dashboard');

    // Modals and Global UI Elements
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    const [confirmationData, setConfirmationData] = useState<{ transactions: Transaction[]; totalSpentBefore: number; } | null>(null);
    const [transactionForDetail, setTransactionForDetail] = useState<{ transaction: Transaction; mode: 'view' | 'edit' } | null>(null);
    
    // Page-specific persistent states
    // Dashboard
    const [dashboardViewMode, setDashboardViewMode] = useState<ViewMode>('woche');
    
    // Statistics
    const [statisticsCurrentMonth, setStatisticsCurrentMonth] = useState(new Date());
    const [statisticsSelectedDay, setStatisticsSelectedDay] = useState<Date | null>(new Date());
    
    // TagsPage
    const [tagsPeriodType, setTagsPeriodType] = useState<PeriodType>('last3Months');
    const [tagsCurrentDate, setTagsCurrentDate] = useState(new Date());
    const [tagsCustomDateRange, setTagsCustomDateRange] = useState({
        start: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd'),
    });
    const [selectedTagIdsForAnalysis, setSelectedTagIdsForAnalysis] = useState<string[]>([]);
    
    // TransactionsPage
    const [transactionFilters, setTransactionFilters] = useState(() => {
        const now = new Date();
        return {
            text: '',
            tags: '',
            categories: [] as string[],
            minAmount: '',
            maxAmount: '',
            startDate: format(startOfDay(now), 'yyyy-MM-dd'),
            endDate: format(endOfDay(now), 'yyyy-MM-dd'),
        };
    });
    const [transactionActiveQuickFilter, setTransactionActiveQuickFilter] = useState<QuickFilterId | null>('today');
    
    // Callbacks for Modals
    const openSettings = useCallback(() => setSettingsOpen(true), []);
    const closeSettings = useCallback(() => setSettingsOpen(false), []);
    const showConfirmation = useCallback((data: { transactions: Transaction[]; totalSpentBefore: number; }) => setConfirmationData(data), []);
    const closeConfirmation = useCallback(() => setConfirmationData(null), []);
    const showTransactionDetail = useCallback((transaction: Transaction, mode: 'view' | 'edit' = 'view') => {
        setTransactionForDetail({ transaction, mode });
    }, []);
    const closeTransactionDetail = useCallback(() => setTransactionForDetail(null), []);

    // Cross-tab navigation handlers
    const handleTagAnalyticsClick = useCallback((tagId: string) => {
        setActiveTab('tags');
        setSelectedTagIdsForAnalysis([tagId]);
    }, []);
    const handleSelectTagForAnalysis = useCallback((tagIds: string[]) => {
        setSelectedTagIdsForAnalysis(tagIds);
    }, []);

    return {
        activeTab,
        setActiveTab,
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
        
        // Dashboard state
        dashboardViewMode,
        setDashboardViewMode,
        
        // Statistics state
        statisticsCurrentMonth,
        setStatisticsCurrentMonth,
        statisticsSelectedDay,
        setStatisticsSelectedDay,
        
        // TagsPage state
        tagsPeriodType,
        setTagsPeriodType,
        tagsCurrentDate,
        setTagsCurrentDate,
        tagsCustomDateRange,
        setTagsCustomDateRange,
        selectedTagIdsForAnalysis,
        handleSelectTagForAnalysis,

        // TransactionsPage state
        transactionFilters,
        setTransactionFilters,
        transactionActiveQuickFilter,
        setTransactionActiveQuickFilter,
    };
};