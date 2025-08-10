import type { Category, Group } from '@/shared/types';

export const APP_VERSION = '0.714';

export const FIXED_COSTS_GROUP_ID = 'grpid_0009';
export const FIXED_COSTS_GROUP_NAME = 'Fixkosten';
export const DEFAULT_GROUP_ID = 'grpid_0008';
export const DEFAULT_GROUP_NAME = 'Sonstiges';
export const DEFAULT_GROUP_COLOR = '#64748b'; // slate-500

export const INITIAL_GROUPS: Group[] = [
  { id: 'grpid_0001', name: 'Haushalt & Lebensmittel', color: '#22c55e', sortIndex: 1, lastModified: new Date().toISOString(), version: 1 },
  { id: 'grpid_0002', name: 'Freizeit & Unterhaltung', color: '#a855f7', sortIndex: 2, lastModified: new Date().toISOString(), version: 1 },
  { id: 'grpid_0003', name: 'Mobilität', color: '#ef4444', sortIndex: 3, lastModified: new Date().toISOString(), version: 1 },
  { id: 'grpid_0004', name: 'Shopping', color: '#eab308', sortIndex: 4, lastModified: new Date().toISOString(), version: 1 },
  { id: 'grpid_0005', name: 'Persönliches & Gesundheit', color: '#3b82f6', sortIndex: 5, lastModified: new Date().toISOString(), version: 1 },
  { id: 'grpid_0006', name: 'Kleidung & Pflege', color: '#d946ef', sortIndex: 6, lastModified: new Date().toISOString(), version: 1 },
  { id: 'grpid_0007', name: 'Finanzen & Verträge', color: '#0d9488', sortIndex: 7, lastModified: new Date().toISOString(), version: 1 },
  { id: DEFAULT_GROUP_ID, name: 'Sonstiges', color: DEFAULT_GROUP_COLOR, sortIndex: 8, isDefault: true, lastModified: new Date().toISOString(), version: 1 },
  { id: FIXED_COSTS_GROUP_ID, name: 'Fixkosten', color: '#0ea5e9', sortIndex: 0, lastModified: new Date().toISOString(), version: 1 },
];

export const INITIAL_CATEGORIES: Category[] = [
  // Fixkosten
  { id: 'cat_miete', name: 'Miete / Rate', color: '#0284c7', icon: 'Home', budget: 1000, groupId: FIXED_COSTS_GROUP_ID, lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_nebenkosten', name: 'Nebenkosten (Strom, Wasser)', color: '#0d9488', icon: 'Zap', budget: 200, groupId: FIXED_COSTS_GROUP_ID, lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_internet_tv', name: 'Internet / Telefon / TV', color: '#6366f1', icon: 'Router', budget: 100, groupId: FIXED_COSTS_GROUP_ID, lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_versicherungen_fix', name: 'Laufende Versicherungen', color: '#2563eb', icon: 'ShieldCheck', budget: 120, groupId: FIXED_COSTS_GROUP_ID, lastModified: new Date().toISOString(), version: 1 },

  // Haushalt & Lebensmittel
  { id: 'cat_supermarkt', name: 'Supermarkt', color: '#16a34a', icon: 'ShoppingCart', budget: 400, groupId: 'grpid_0001', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_drogerie', name: 'Drogerie', color: '#0891b2', icon: 'ShowerHead', budget: 50, groupId: 'grpid_0001', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_baecker', name: 'Bäcker', color: '#f59e0b', icon: 'Croissant', budget: 40, groupId: 'grpid_0001', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_haushaltswaren', name: 'Haushaltswaren', color: '#84cc16', icon: 'Brush', budget: 30, groupId: 'grpid_0001', lastModified: new Date().toISOString(), version: 1 },
  
  // Freizeit & Unterhaltung
  { id: 'cat_gastro', name: 'Restaurant / Café', color: '#db2777', icon: 'UtensilsCrossed', budget: 120, groupId: 'grpid_0002', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_kultur', name: 'Kino / Kultur', color: '#9333ea', icon: 'Film', budget: 40, groupId: 'grpid_0002', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_hobbies', name: 'Sport & Hobbies', color: '#7c3aed', icon: 'Dumbbell', budget: 50, groupId: 'grpid_0002', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_urlaub', name: 'Urlaub & Reisen', color: '#0f766e', icon: 'Plane', budget: 200, groupId: 'grpid_0002', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_technik', name: 'Elektronik & Technik', color: '#6b7280', icon: 'Smartphone', budget: 50, groupId: 'grpid_0002', lastModified: new Date().toISOString(), version: 1 },

  // Mobilität
  { id: 'cat_tanken', name: 'Tanken', color: '#dc2626', icon: 'Fuel', budget: 150, groupId: 'grpid_0003', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_oepnv', name: 'ÖPNV', color: '#ea580c', icon: 'BusFront', budget: 60, groupId: 'grpid_0003', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_auto', name: 'Auto (Reparatur, Parken)', color: '#be185d', icon: 'Car', budget: 80, groupId: 'grpid_0003', lastModified: new Date().toISOString(), version: 1 },

  // Shopping
  { id: 'cat_geschenke', name: 'Geschenke', color: '#e11d48', icon: 'Gift', budget: 30, groupId: 'grpid_0004', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_abos', name: 'Abos (Streaming etc.)', color: '#71717a', icon: 'Clapperboard', budget: 30, groupId: 'grpid_0004', lastModified: new Date().toISOString(), version: 1 },
  
  // Persönliches & Gesundheit
  { id: 'cat_gesundheit', name: 'Gesundheit & Apotheke', color: '#1d4ed8', icon: 'Stethoscope', budget: 40, groupId: 'grpid_0005', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_bildung', name: 'Bildung & Bücher', color: '#4f46e5', icon: 'BookOpen', budget: 30, groupId: 'grpid_0005', lastModified: new Date().toISOString(), version: 1 },
  
  // Kleidung & Pflege
  { id: 'cat_kleidung', name: 'Kleidung & Schuhe', color: '#ca8a04', icon: 'Shirt', budget: 80, groupId: 'grpid_0006', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_friseur', name: 'Friseur & Kosmetik', color: '#a21caf', icon: 'Scissors', budget: 30, groupId: 'grpid_0006', lastModified: new Date().toISOString(), version: 1 },
  
  // Finanzen & Verträge
  { id: 'cat_gebuehren', name: 'Bankgebühren', color: '#047857', icon: 'Landmark', budget: 10, groupId: 'grpid_0007', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_kredit', name: 'Kreditrückzahlung', color: '#115e59', icon: 'CreditCard', budget: 150, groupId: 'grpid_0007', lastModified: new Date().toISOString(), version: 1 },
  
  // Sonstiges
  { id: 'cat_sonstiges', name: 'Sonstiges', color: '#475569', icon: 'MoreHorizontal', budget: 50, groupId: DEFAULT_GROUP_ID, lastModified: new Date().toISOString(), version: 1 },
];
