
import type { Category } from './types';

// This is the source of truth for the initial setup.
const initialSetup: { name: string; categories: Omit<Category, 'group'>[] }[] = [
  {
    name: 'Einkauf Lebensmittel',
    categories: [
      { id: 'cat_supermarkt', name: 'Supermarkt / Drogeriemarkt', color: '#f97316', icon: 'ShoppingCart', budget: 300 },
      { id: 'cat_metzger', name: 'Metzger', color: '#a16207', icon: 'Beef', budget: 60 },
      { id: 'cat_baecker', name: 'Bäcker / Bärenbrot', color: '#d97706', icon: 'Croissant', budget: 50 },
      { id: 'cat_gemuese', name: 'Gemüsemarkt', color: '#65a30d', icon: 'Carrot', budget: 80 },
      { id: 'cat_gastro', name: 'Gastronomie / Lieferservice', color: '#6366f1', icon: 'UtensilsCrossed', budget: 100 },
    ],
  },
  {
    name: 'Haushalt & Familie',
    categories: [
      { id: 'cat_pflege', name: 'Körperpflege / Gesundheit', color: '#0d9488', icon: 'ShowerHead', budget: 70 },
      { id: 'cat_reinigung', name: 'Haushaltspflege / Reinigung', color: '#0ea5e9', icon: 'SprayCan', budget: 50 },
      { id: 'cat_kinder', name: 'Kinderbedarf / Babyartikel', color: '#f472b6', icon: 'Baby', budget: 80 },
      { id: 'cat_tier', name: 'Tierbedarf', color: '#a855f7', icon: 'Bone', budget: 60 },
    ],
  },
  {
    name: 'Sonstiges',
    categories: [
      { id: 'cat_sonstiges', name: 'Sonstiges / Non-Food / Tabak / Kleidung / Internetkäufe', color: '#64748b', icon: 'MoreHorizontal', budget: 150 },
    ],
  },
];

export const INITIAL_GROUPS: string[] = initialSetup.map(group => group.name);

export const INITIAL_CATEGORIES: Category[] = initialSetup.flatMap(group => 
    group.categories.map(category => ({
        ...category,
        group: group.name,
    }))
);