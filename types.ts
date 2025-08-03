
export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  budget?: number;
  group: string;
}

export interface Transaction {
  id:string;
  amount: number;
  description: string;
  categoryId: string;
  date: string; // ISO string format
}

export type ViewMode = 'woche' | 'monat';

export type CategoryId = string;