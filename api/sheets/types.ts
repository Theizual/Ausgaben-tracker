



export interface User {
  id: string;
  name: string;
  color: string;
  lastModified: string; // ISO string
  isDeleted?: boolean;
  version: number;
  conflicted?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  lastModified: string; // ISO string
  isDeleted?: boolean;
  version: number;
  conflicted?: boolean;
  isDev?: boolean;
}

export interface Category {
  id:string;
  name: string;
  color: string;
  icon: string;
  budget?: number;
  group: string;
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
  recurringId?: string; // Verknüpfung zur wiederkehrenden Ausgabe
  lastModified: string; // ISO string
  isDeleted?: boolean;
  version: number;
  conflicted?: boolean;
  createdBy?: string; // ID of the user who created the transaction
  isDev?: boolean; // Flag for temporary development/test transactions
}

export interface RecurringTransaction {
  id: string;
  amount: number;
  description: string;
  categoryId: string;
  frequency: 'monthly' | 'yearly';
  startDate: string; // ISO string
  lastProcessedDate?: string; // ISO string
  lastModified: string; // ISO string
  isDeleted?: boolean;
  version: number;
  conflicted?: boolean;
}

export type ViewMode = 'woche' | 'monat';
export type PeriodType = 'last3Months' | 'month' | 'year' | 'custom';
export type QuickFilterId = 'current' | 'month' | 'all';
export type CategoryId = string;
export type SettingsTab = 'general' | 'users' | 'budget' | 'recurring';