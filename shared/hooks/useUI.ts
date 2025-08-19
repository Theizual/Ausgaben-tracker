import { useState, useCallback, useEffect, useMemo } from 'react';
import { format, subDays } from '@/shared/utils/dateUtils';
import type { Transaction, ViewMode, PeriodType, QuickFilterId, SettingsTab, Category, User, MealPrefs, WeeklyPlan, ShoppingListState, Recipe } from '@/shared/types';
import useLocalStorage from '@/shared/hooks/useLocalStorage';
import type { CategoryFormData } from '@/features/settings/components/CategoryLibrarySettings';
import { getSeedRecipes } from '@/features/meal-plan/data/recipes';


export const useUI = (props?: { isDemoModeEnabled: boolean }) => {
    const isDemoModeEnabled = props?.isDemoModeEnabled ?? false;
    const prefix = isDemoModeEnabled ? 'demo_' : '';
    
    // General App Navigation
    const [activeTab, _setActiveTab] = useState<'dashboard' | 'transactions' | 'analysis' | 'meal-plan'>('dashboard');
    const [analysisView, setAnalysisView] = useState<'monthly' | 'tags'>('monthly');

    const setActiveTab = useCallback((tab: 'dashboard' | 'transactions' | 'analysis' | 'meal-plan') => {
        if (tab !== 'analysis') {
            // Reset to default view when leaving the analysis tab
            setAnalysisView('monthly');
        }
        _setActiveTab(tab);
    }, []);

    // Modals and Global UI Elements
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    const [initialSettingsTab, setInitialSettingsTab] = useState<SettingsTab>('general');
    const [confirmationData, setConfirmationData] = useState<{ transactions: Transaction[]; totalSpentBefore: number; } | null>(null);
    const [transactionForDetail, setTransactionForDetail] = useState<{ transaction: Transaction } | null>(null);
    const [isChangelogOpen, setIsChangelogOpen] = useState(false);
    const [reassignModalInfo, setReassignModalInfo] = useState<{ category: Category | CategoryFormData, txCount: number, transactions: Transaction[] } | null>(null);
    const [userMergeModalInfo, setUserMergeModalInfo] = useState<{ remoteUsers: User[] } | null>(null);
    
    // Non-namespaced settings
    const [isChangelogAutoShowEnabled, setIsChangelogAutoShowEnabled] = useLocalStorage('changelogAutoShowEnabled', true);
    
    // User Management - UI Preference ONLY (namespaced)
    const [currentUserId, setCurrentUserId] = useLocalStorage<string | null>(`${prefix}app-current-user-id`, null);
    

    // Page-specific persistent states
    // Dashboard
    const [dashboardViewMode, setDashboardViewMode] = useState<ViewMode>('monat');
    
    // Statistics
    const [statisticsCurrentMonth, setStatisticsCurrentMonth] = useState(new Date());
    const [statisticsSelectedDay, setStatisticsSelectedDay] = useState<Date | null>(null);
    
    // TagsPage
    const [tagsPeriodType, setTagsPeriodType] = useState<PeriodType>('last3Months');
    const [tagsCurrentDate, setTagsCurrentDate] = useState(new Date());
    const [tagsCustomDateRange, setTagsCustomDateRange] = useState({
        start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
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
            startDate: format(subDays(now, 2), 'yyyy-MM-dd'),
            endDate: format(now, 'yyyy-MM-dd'),
        };
    });
    const [transactionActiveQuickFilter, setTransactionActiveQuickFilter] = useState<QuickFilterId | null>('current');

    // MealPlanPage
    const [mealPlanPrefs, setMealPlanPrefs] = useLocalStorage<MealPrefs | null>(`${prefix}mealPlanPrefs`, null);
    const [weeklyMealPlans, setWeeklyMealPlans] = useLocalStorage<Record<string, WeeklyPlan>>(`${prefix}weeklyMealPlans`, {});
    const [shoppingLists, setShoppingLists] = useLocalStorage<Record<string, ShoppingListState>>(`${prefix}shoppingLists`, {});
    const [currentMealPlanWeek, setCurrentMealPlanWeek] = useState(new Date());
    const [recipes, setRecipes] = useLocalStorage<Recipe[]>(`${prefix}recipes`, getSeedRecipes);
    const [recentRecipeIds, setRecentRecipeIds] = useLocalStorage<string[]>(`${prefix}recentRecipeIds`, []);
    

    // Callbacks for Modals
    const openSettings = useCallback((tab: SettingsTab = 'general') => {
        setInitialSettingsTab(tab);
        setSettingsOpen(true);
    }, []);
    const closeSettings = useCallback(() => setSettingsOpen(false), []);
    const showConfirmation = useCallback((data: { transactions: Transaction[]; totalSpentBefore: number; }) => setConfirmationData(data), []);
    const closeConfirmation = useCallback(() => setConfirmationData(null), []);
    const showTransactionDetail = useCallback((transaction: Transaction) => {
        setTransactionForDetail({ transaction });
    }, []);
    const closeTransactionDetail = useCallback(() => setTransactionForDetail(null), []);
    const openChangelog = useCallback(() => setIsChangelogOpen(true), []);
    const closeChangelog = useCallback(() => setIsChangelogOpen(false), []);
    const openReassignModal = useCallback((category: Category | CategoryFormData, txCount: number, transactions: Transaction[]) => {
        setReassignModalInfo({ category, txCount, transactions });
    }, []);
    const closeReassignModal = useCallback(() => setReassignModalInfo(null), []);

    const openUserMergeModal = useCallback((remoteUsers: User[]) => {
        setUserMergeModalInfo({ remoteUsers });
    }, []);
    const closeUserMergeModal = useCallback(() => setUserMergeModalInfo(null), []);


    // Cross-tab navigation handlers
    const handleTagAnalyticsClick = useCallback((tagId: string) => {
        setActiveTab('analysis');
        setAnalysisView('tags');
        setSelectedTagIdsForAnalysis([tagId]);
    }, [setActiveTab]);

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
        
        // User Management UI preference
        currentUserId,
        setCurrentUserId,
        
        // Dashboard state
        dashboardViewMode,
        setDashboardViewMode,

        // New unified analysis state
        analysisView,
        setAnalysisView,
        
        // Statistics state (now part of analysis)
        statisticsCurrentMonth,
        setStatisticsCurrentMonth,
        statisticsSelectedDay,
        setStatisticsSelectedDay,
        
        // TagsPage state (now part of analysis)
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

        // Changelog UI State
        isChangelogOpen,
        openChangelog,
        closeChangelog,
        isChangelogAutoShowEnabled,
        setIsChangelogAutoShowEnabled,

        // Reassign Modal State
        reassignModalInfo,
        openReassignModal,
        closeReassignModal,

        // User Merge Modal State
        userMergeModalInfo,
        openUserMergeModal,
        closeUserMergeModal,

        // Meal Plan state
        mealPlanPrefs,
        setMealPlanPrefs,
        weeklyMealPlans,
        setWeeklyMealPlans,
        shoppingLists,
        setShoppingLists,
        currentMealPlanWeek,
        setCurrentMealPlanWeek,
        recipes,
        setRecipes,
        recentRecipeIds,
        setRecentRecipeIds,
    };
};