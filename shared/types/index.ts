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
  isHiddenInQuickAdd?: boolean;
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