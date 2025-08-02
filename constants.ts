import type { Category } from './types';

export const CATEGORY_GROUPS: { name: string; categories: Category[] }[] = [
  {
    name: 'Einkauf Lebensmittel',
    categories: [
      { id: 'cat_supermarkt', name: 'Supermarkt / Drogeriemarkt', color: '#f97316', icon: 'ShoppingCart' },
      { id: 'cat_metzger', name: 'Metzger', color: '#a16207', icon: 'Beef' },
      { id: 'cat_baecker', name: 'Bäcker / Bärenbrot', color: '#d97706', icon: 'Croissant' },
      { id: 'cat_gemuese', name: 'Gemüsemarkt', color: '#65a30d', icon: 'Carrot' },
      { id: 'cat_gastro', name: 'Gastronomie / Lieferservice', color: '#6366f1', icon: 'UtensilsCrossed' },
    ],
  },
  {
    name: 'Haushalt & Familie',
    categories: [
      { id: 'cat_pflege', name: 'Körperpflege / Gesundheit', color: '#0d9488', icon: 'ShowerHead' },
      { id: 'cat_reinigung', name: 'Haushaltspflege / Reinigung', color: '#0ea5e9', icon: 'SprayCan' },
      { id: 'cat_kinder', name: 'Kinderbedarf / Babyartikel', color: '#f472b6', icon: 'Baby' },
      { id: 'cat_tier', name: 'Tierbedarf', color: '#a855f7', icon: 'Bone' },
    ],
  },
  {
    name: 'Sonstiges',
    categories: [
      { id: 'cat_sonstiges', name: 'Sonstiges / Non-Food / Tabak / Kleidung / Internetkäufe', color: '#64748b', icon: 'MoreHorizontal' },
    ],
  },
];


export const INITIAL_CATEGORIES: Category[] = CATEGORY_GROUPS.flatMap(group => group.categories);