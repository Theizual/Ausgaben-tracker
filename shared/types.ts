export interface User {
  id: string;
  name: string;
  color: string;
  lastModified: string; // ISO string
  isDeleted?: boolean;
  version: number;
  conflicted?: boolean;
  isDemo?: boolean;
}

export interface Group {
  id: string;
  name: string;
  sortIndex: number;
  icon?: string;
  color?: string;
  isDefault?: boolean;
  lastModified: string; // ISO string
  isDeleted?: boolean;
  version: number;
  conflicted?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  lastModified: string; // ISO string
  isDeleted?: boolean;
  version: number;
  conflicted?: boolean;
  isDemo?: boolean;
}

export interface Category {
  id:string;
  name: string;
  color: string;
  icon: string;
  budget?: number;
  groupId: string;
  sortIndex: number;
  lastModified: string; // ISO string
  isDeleted?: boolean;
  version: number;
  conflicted?: boolean;
}

export interface Transaction {
  id:string;
  amount: number;
  description: string;
  categoryId: string;
  date: string; // ISO string format
  createdAt: string; // ISO string
  tagIds?: string[];
  recurringId?: string;
  lastModified: string; // ISO string
  isDeleted?: boolean;
  version: number;
  conflicted?: boolean;
  createdBy?: string;
  isDemo?: boolean;
  transactionGroupId?: string;
  iconOverride?: string;
  isCorrected?: boolean;
  groupBaseAmount?: number;
  notes?: string;
  isVerified?: boolean;
}

export interface TransactionGroup {
  id: string;
  targetAmount: number;
  createdAt: string; // ISO string
  lastModified: string; // ISO string
  isDeleted?: boolean;
  version: number;
  conflicted?: boolean;
}

export interface RecurringTransaction {
  id: string;
  amount: number;
  description: string;
  categoryId: string;
  frequency: 'monthly' | 'yearly';
  dayOfMonth?: number;
  startDate: string; // ISO string
  endDate?: string;
  active?: boolean;
  lastProcessedDate?: string; // ISO string
  lastModified: string; // ISO string
  isDeleted?: boolean;
  version: number;
  conflicted?: boolean;
}

export interface UserSetting {
  userId: string | 'app_meta';
  key: 'groupColors' | 'visibleGroups' | 'mode' | 'quickAddHideGroups' | 'categoryColorOverrides' | 'hiddenCategories' | 'aiFeaturesEnabled';
  value: string; // Comma-separated list for visibleGroups, JSON string for groupColors/categoryColorOverrides/hiddenCategories
  lastModified: string;
  version: number;
  isDeleted?: boolean;
  conflicted?: boolean;
}

export interface MealPrefs {
  base: 'nudeln' | 'reis' | 'kartoffeln' | 'mix';
  sides: string[];
  meatRate: 'none' | '1-2' | '3-5' | 'daily';
  diet: {
    vegetarian?: boolean;
    glutenFree?: boolean;
    lactoseFree?: boolean;
  };
  people: {
    adults: number;
    kids: number;
  };
  tipsEnabled: boolean;
  excludeTags: string[];
  favoriteRecipeIds: string[];
}

export interface MealDay {
  day: string;
  dateISO: string;
  recipeId: string;
  title: string;
  side?: string;
  servings: {
    adults: number;
    kids: number;
  };
  estimatedPrice: number;
  isConfirmed?: boolean;
  priceOverride?: number;
  note?: string;
  link?: string;
}

export interface WeeklyPlan {
  weekKey: string; // e.g., "2024-W34"
  days: MealDay[];
  totalEstimate: number;
  totalOverride: number;
}

export interface CustomShoppingListItem {
    id: string;
    name: string;
    category: string;
    checked: boolean;
}
export interface ShoppingListState {
    checkedItems: string[]; // names of items from recipes
    customItems: CustomShoppingListItem[];
}

export type ViewMode = 'woche' | 'monat';
export type TransactionViewMode = 'list' | 'grid';
export type PeriodType = 'last3Months' | 'month' | 'year' | 'custom';
export type QuickFilterId = 'current' | 'month' | 'all';
export type CategoryId = string;
export type SettingsTab = 'general' | 'categories' | 'users' | 'budget';