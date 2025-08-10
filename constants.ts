import type { Category, Group } from '@/shared/types';

export const APP_VERSION = '0.714';

export const FIXED_COSTS_GROUP_ID = 'group_fixkosten';
export const FIXED_COSTS_GROUP_NAME = 'Fixkosten';
export const DEFAULT_GROUP_ID = 'group_sonstige';
export const DEFAULT_GROUP_NAME = 'Sonstige Ausgaben';

export const INITIAL_GROUPS: Group[] = [
  { id: FIXED_COSTS_GROUP_ID, name: 'Fixkosten', sortIndex: 0, lastModified: new Date().toISOString(), version: 1 },
  { id: 'group_haushalt', name: 'Haushalt & Lebensmittel', sortIndex: 1, lastModified: new Date().toISOString(), version: 1 },
  { id: 'group_mobilitaet', name: 'Mobilität', sortIndex: 2, lastModified: new Date().toISOString(), version: 1 },
  { id: 'group_freizeit', name: 'Freizeit & Unterhaltung', sortIndex: 3, lastModified: new Date().toISOString(), version: 1 },
  { id: 'group_shopping', name: 'Shopping', sortIndex: 4, lastModified: new Date().toISOString(), version: 1 },
  { id: 'group_persoenliches', name: 'Persönliches & Gesundheit', sortIndex: 5, lastModified: new Date().toISOString(), version: 1 },
  { id: DEFAULT_GROUP_ID, name: 'Sonstige Ausgaben', sortIndex: 6, lastModified: new Date().toISOString(), version: 1 },
];

export const INITIAL_CATEGORIES: Category[] = [
  // Fixkosten
  { id: 'cat_miete', name: 'Miete / Rate', color: '#0ea5e9', icon: 'Home', budget: 1000, groupId: FIXED_COSTS_GROUP_ID, lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_nebenkosten', name: 'Nebenkosten (Strom, Wasser)', color: '#0d9488', icon: 'Zap', budget: 200, groupId: FIXED_COSTS_GROUP_ID, lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_internet_tv', name: 'Internet / Telefon / TV', color: '#6366f1', icon: 'Router', budget: 100, groupId: FIXED_COSTS_GROUP_ID, lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_versicherung', name: 'Versicherungen', color: '#3b82f6', icon: 'ShieldCheck', budget: 120, groupId: FIXED_COSTS_GROUP_ID, lastModified: new Date().toISOString(), version: 1 },

  // Haushalt & Lebensmittel
  { id: 'cat_supermarkt', name: 'Supermarkt', color: '#10b981', icon: 'ShoppingCart', budget: 400, groupId: 'group_haushalt', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_drogerie', name: 'Drogerie', color: '#06b6d4', icon: 'ShowerHead', budget: 50, groupId: 'group_haushalt', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_baecker', name: 'Bäcker', color: '#f59e0b', icon: 'Croissant', budget: 40, groupId: 'group_haushalt', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_haushaltswaren', name: 'Haushaltswaren', color: '#84cc16', icon: 'Brush', budget: 30, groupId: 'group_haushalt', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_garten', name: 'Garten & Pflanzen', color: '#22c55e', icon: 'Sprout', budget: 20, groupId: 'group_haushalt', lastModified: new Date().toISOString(), version: 1 },

  // Mobilität
  { id: 'cat_tanken', name: 'Tanken', color: '#ef4444', icon: 'Fuel', budget: 150, groupId: 'group_mobilitaet', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_oepnv', name: 'ÖPNV', color: '#f97316', icon: 'BusFront', budget: 60, groupId: 'group_mobilitaet', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_auto', name: 'Auto (Reparatur, Parken)', color: '#d946ef', icon: 'Car', budget: 80, groupId: 'group_mobilitaet', lastModified: new Date().toISOString(), version: 1 },
  
  // Freizeit & Unterhaltung
  { id: 'cat_gastro', name: 'Restaurant / Café', color: '#ec4899', icon: 'UtensilsCrossed', budget: 120, groupId: 'group_freizeit', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_kultur', name: 'Kino / Kultur', color: '#a855f7', icon: 'Film', budget: 40, groupId: 'group_freizeit', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_hobbies', name: 'Sport & Hobbies', color: '#8b5cf6', icon: 'Dumbbell', budget: 50, groupId: 'group_freizeit', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_urlaub', name: 'Urlaub & Reisen', color: '#14b8a6', icon: 'Plane', budget: 200, groupId: 'group_freizeit', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_technik', name: 'Elektronik & Technik', color: '#64748b', icon: 'Smartphone', budget: 50, groupId: 'group_freizeit', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_abos', name: 'Abos (Streaming, etc.)', color: '#78716c', icon: 'Clapperboard', budget: 30, groupId: 'group_freizeit', lastModified: new Date().toISOString(), version: 1 },

  // Shopping
  { id: 'cat_kleidung', name: 'Kleidung & Schuhe', color: '#eab308', icon: 'Shirt', budget: 80, groupId: 'group_shopping', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_geschenke', name: 'Geschenke', color: '#f43f5e', icon: 'Gift', budget: 30, groupId: 'group_shopping', lastModified: new Date().toISOString(), version: 1 },

  // Persönliches & Gesundheit
  { id: 'cat_gesundheit', name: 'Gesundheit & Apotheke', color: '#2563eb', icon: 'Stethoscope', budget: 40, groupId: 'group_persoenliches', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_friseur', name: 'Friseur & Kosmetik', color: '#c026d3', icon: 'Scissors', budget: 30, groupId: 'group_persoenliches', lastModified: new Date().toISOString(), version: 1 },
];