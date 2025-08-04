
import type { Category } from './types';

// This is the source of truth for the initial setup.
const initialSetup: { name: string; categories: Omit<Category, 'group' | 'lastModified'>[] }[] = [
  {
    name: 'Einkauf Lebensmittel',
    categories: [
      { id: 'cat_supermarkt', name: 'Supermarkt / Drogeriemarkt', color: '#c7aa05', icon: 'ShoppingCart', budget: 500 },
      { id: 'cat_metzger', name: 'Metzger', color: '#ff4a4a', icon: 'Beef', budget: 100 },
      { id: 'cat_baecker', name: 'Bäcker / Bärenbrot', color: '#d97706', icon: 'Croissant', budget: 50 },
      { id: 'cat_gemuese', name: 'Gemüsemarkt', color: '#65a30d', icon: 'Carrot', budget: 100 },
      { id: 'cat_gastro', name: 'Gastronomie / Lieferservice', color: '#6366f1', icon: 'UtensilsCrossed', budget: 100 },
    ],
  },
  {
    name: 'Haushalt & Familie',
    categories: [
      { id: 'cat_pflege', name: 'Körperpflege / Gesundheit', color: '#0d9488', icon: 'ShowerHead', budget: 100 },
      { id: 'cat_reinigung', name: 'Haushaltspflege / Reinigung', color: '#0ea5e9', icon: 'SprayCan', budget: 50 },
      { id: 'cat_kinder', name: 'Kinderbedarf / Babyartikel', color: '#f472b6', icon: 'Baby', budget: 100 },
      { id: 'cat_tier', name: 'Tierbedarf', color: '#a855f7', icon: 'Bone', budget: 50 },
      { id: 'cat_sonstiges', name: 'Sonstiges / Non-Food / Tabak / Kleidung / Internetkäufe', color: '#64748b', icon: 'MoreHorizontal', budget: 150 },
    ],
  },
];

const now = new Date().toISOString();

export const INITIAL_GROUPS: string[] = initialSetup.map(group => group.name);

export const INITIAL_CATEGORIES: Category[] = initialSetup.flatMap(group => 
    group.categories.map(category => ({
        ...category,
        group: group.name,
        lastModified: now
    }))
);