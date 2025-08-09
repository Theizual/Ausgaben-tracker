import type { Category } from '@/shared/types';

export const APP_VERSION = '0.610';
export const FIXED_COSTS_GROUP_NAME = 'Fixkosten';
export const DEFAULT_GROUP = 'Sonstige Ausgaben';

export const INITIAL_GROUPS = [
  FIXED_COSTS_GROUP_NAME,
  'Haushalt & Lebensmittel',
  'Mobilität',
  'Freizeit & Unterhaltung',
  'Shopping',
  'Persönliches & Gesundheit',
  DEFAULT_GROUP,
];


export const INITIAL_CATEGORIES: Category[] = [
  // Fixkosten
  { id: 'cat_miete', name: 'Miete / Rate', color: '#0ea5e9', icon: 'Home', budget: 1000, group: FIXED_COSTS_GROUP_NAME, lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_nebenkosten', name: 'Nebenkosten (Strom, Wasser)', color: '#0d9488', icon: 'Zap', budget: 200, group: FIXED_COSTS_GROUP_NAME, lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_internet_tv', name: 'Internet / Telefon / TV', color: '#6366f1', icon: 'Router', budget: 100, group: FIXED_COSTS_GROUP_NAME, lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_versicherung', name: 'Versicherungen', color: '#3b82f6', icon: 'ShieldCheck', budget: 120, group: FIXED_COSTS_GROUP_NAME, lastModified: new Date().toISOString(), version: 1 },

  // Haushalt & Lebensmittel
  { id: 'cat_supermarkt', name: 'Supermarkt', color: '#10b981', icon: 'ShoppingCart', budget: 400, group: 'Haushalt & Lebensmittel', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_drogerie', name: 'Drogerie', color: '#06b6d4', icon: 'ShowerHead', budget: 50, group: 'Haushalt & Lebensmittel', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_baecker', name: 'Bäcker', color: '#f59e0b', icon: 'Croissant', budget: 40, group: 'Haushalt & Lebensmittel', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_haushaltswaren', name: 'Haushaltswaren', color: '#84cc16', icon: 'Brush', budget: 30, group: 'Haushalt & Lebensmittel', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_garten', name: 'Garten & Pflanzen', color: '#22c55e', icon: 'Sprout', budget: 20, group: 'Haushalt & Lebensmittel', lastModified: new Date().toISOString(), version: 1 },

  // Mobilität
  { id: 'cat_tanken', name: 'Tanken', color: '#ef4444', icon: 'Fuel', budget: 150, group: 'Mobilität', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_oepnv', name: 'ÖPNV', color: '#f97316', icon: 'BusFront', budget: 60, group: 'Mobilität', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_auto', name: 'Auto (Reparatur, Parken)', color: '#d946ef', icon: 'Car', budget: 80, group: 'Mobilität', lastModified: new Date().toISOString(), version: 1 },
  
  // Freizeit & Unterhaltung
  { id: 'cat_gastro', name: 'Restaurant / Café', color: '#ec4899', icon: 'UtensilsCrossed', budget: 120, group: 'Freizeit & Unterhaltung', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_kultur', name: 'Kino / Kultur', color: '#a855f7', icon: 'Film', budget: 40, group: 'Freizeit & Unterhaltung', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_hobbies', name: 'Sport & Hobbies', color: '#8b5cf6', icon: 'Dumbbell', budget: 50, group: 'Freizeit & Unterhaltung', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_urlaub', name: 'Urlaub & Reisen', color: '#14b8a6', icon: 'Plane', budget: 200, group: 'Freizeit & Unterhaltung', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_technik', name: 'Elektronik & Technik', color: '#64748b', icon: 'Smartphone', budget: 50, group: 'Freizeit & Unterhaltung', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_abos', name: 'Abos (Streaming, etc.)', color: '#78716c', icon: 'Clapperboard', budget: 30, group: 'Freizeit & Unterhaltung', lastModified: new Date().toISOString(), version: 1 },

  // Shopping
  { id: 'cat_kleidung', name: 'Kleidung & Schuhe', color: '#eab308', icon: 'Shirt', budget: 80, group: 'Shopping', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_geschenke', name: 'Geschenke', color: '#f43f5e', icon: 'Gift', budget: 30, group: 'Shopping', lastModified: new Date().toISOString(), version: 1 },

  // Persönliches & Gesundheit
  { id: 'cat_gesundheit', name: 'Gesundheit & Apotheke', color: '#2563eb', icon: 'Stethoscope', budget: 40, group: 'Persönliches & Gesundheit', lastModified: new Date().toISOString(), version: 1 },
  { id: 'cat_friseur', name: 'Friseur & Kosmetik', color: '#c026d3', icon: 'Scissors', budget: 30, group: 'Persönliches & Gesundheit', lastModified: new Date().toISOString(), version: 1 },
];