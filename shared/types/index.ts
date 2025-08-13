
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
  key: 'groupColors' | 'visibleGroups' | 'mode' | 'quickAddHideGroups' | 'categoryColorOverrides' | 'hiddenCategories';
  value: string; // Comma-separated list for visibleGroups, JSON string for groupColors/categoryColorOverrides/hiddenCategories
  lastModified: string;
  version: number;
  isDeleted?: boolean;
  conflicted?: boolean;
}

export type ViewMode = 'woche' | 'monat';
export type TransactionViewMode = 'list' | 'grid';
export type PeriodType = 'last3Months' | 'month' | 'year' | 'custom';
export type QuickFilterId = 'current' | 'month' | 'all';
export type CategoryId = string;
export type SettingsTab = 'general' | 'categories' | 'users' | 'budget';