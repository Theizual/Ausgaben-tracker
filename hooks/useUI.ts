import { useState, useCallback, useEffect, useMemo } from 'react';
import { format, startOfDay, endOfDay, subMonths } from '../utils/dateUtils';
import type { Transaction, ViewMode, PeriodType, QuickFilterId, User } from '../types';
import useLocalStorage from './useLocalStorage';

const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768; // md breakpoint
};

type SettingsTab = 'general' | 'users' | 'budget' | 'categories' | 'tags' | 'recurring';

export const useUI = () => {
    // General App Navigation
    const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'statistics' | 'tags'>('dashboard');

    // Modals and Global UI Elements
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    const [initialSettingsTab, setInitialSettingsTab] = useState<SettingsTab>('general');
    const [confirmationData, setConfirmationData] = useState<{ transactions: Transaction[]; totalSpentBefore: number; } | null>(null);
    const [transactionForDetail, setTransactionForDetail] = useState<{ transaction: Transaction; mode: 'view' | 'edit' } | null>(null);
    
    // User Management
    const [users, setUsers] = useLocalStorage<User[]>('app-users', []);
    const [currentUserId, setCurrentUserId] = useLocalStorage<string | null>('app-current-user-id', null);
    
    // Dev Mode
    const [isDevModeEnabled, setIsDevModeEnabled] = useLocalStorage<boolean>('devModeEnabled', false);

    const currentUser = useMemo(() => {
        if (!currentUserId) return null;
        return users.find(u => u.id === currentUserId) || null;
    }, [users, currentUserId]);

    useEffect(() => {
        if (users.length === 0) {
            // No users exist, create the default user.
            const defaultUser: User = {
                id: 'default-user', // Use a stable ID for the default user
                name: 'Benutzer',
                color: '#64748b' // A neutral slate color
            };
            setUsers([defaultUser]);
            setCurrentUserId(defaultUser.id);
        } else if (!currentUserId || !users.some(u => u.id === currentUserId)) {
            // Users exist, but none is selected or the selected one is invalid. Select the first one.
            setCurrentUserId(users[0].id);
        }
    }, [users, currentUserId, setUsers, setCurrentUserId]);
    
    const addUser = useCallback((name: string) => {
        if (!name.trim()) return;
        const newUser: User = {
            id: crypto.randomUUID(),
            name: name.trim(),
            color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
        };
        setUsers(prev => [...prev, newUser]);
    }, [setUsers]);

    const updateUser = useCallback((id: string, updates: Partial<User>) => {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    }, [setUsers]);

    const deleteUser = useCallback((id: string) => {
        setUsers(prev => prev.filter(u => u.id !== id));
    }, [setUsers]);


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
    
    const [transactionViewMode, setTransactionViewMode] = useState<'list' | 'grid'>(() => {
        if (typeof window !== 'undefined') {
            const storedView = localStorage.getItem('transactionViewMode');
            if (storedView === 'list' || storedView === 'grid') {
                return storedView;
            }
        }
        return isMobile() ? 'grid' : 'list';
    });

    const [transactionViewDensity, setTransactionViewDensity] = useLocalStorage<'normal' | 'compact'>('transactionViewDensity', 'normal');


    useEffect(() => {
        localStorage.setItem('transactionViewMode', transactionViewMode);
    }, [transactionViewMode]);
    
    // Callbacks for Modals
    const openSettings = useCallback((tab: SettingsTab = 'general') => {
        setInitialSettingsTab(tab);
        setSettingsOpen(true);
    }, []);
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
        initialSettingsTab,
        confirmationData,
        showConfirmation,
        closeConfirmation,
        transactionForDetail,
        handleTransactionClick: showTransactionDetail,
        closeTransactionDetail,
        handleTagAnalyticsClick,
        
        // User Management
        users,
        currentUser,
        setCurrentUserId,
        addUser,
        updateUser,
        deleteUser,

        // Dev Mode
        isDevModeEnabled,
        setIsDevModeEnabled,
        
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
        transactionViewMode,
        setTransactionViewMode,
        transactionViewDensity,
        setTransactionViewDensity,
    };
};