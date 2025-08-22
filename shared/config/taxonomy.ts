import type { Group, Category as CategoryType } from '@/shared/types';
import { DEFAULT_GROUP_ID, FIXED_COSTS_GROUP_ID } from '@/constants';

// Striktere Typisierung für die Konfigurationsdatei
type TaxonomyCategory = Omit<CategoryType, 'sortIndex' | 'lastModified' | 'version' | 'isDeleted' | 'conflicted'>;
type TaxonomyGroup = Omit<Group, 'sortIndex' | 'lastModified' | 'version' | 'isDeleted' | 'conflicted' | 'isDefault' | 'icon'> & { icon: string, categories: TaxonomyCategory[] };

export const CATEGORY_TAXONOMY: readonly TaxonomyGroup[] = [
  { id:'grp_haushalt', name:'Einkauf & Lebensmittel', color:'#facc15', icon: 'ShoppingBasket', categories:[
    {id:'cat_supermarkt', name:'Supermarkt / Drogeriemarkt', color:'#fff530', icon:'ShoppingCart', groupId:'grp_haushalt'},
    {id:'cat_metzger', name:'Metzger', color:'#ff4a4a', icon:'Beef', groupId:'grp_haushalt'},
    {id:'cat_baecker', name:'Bäcker', color:'#f59e0b', icon:'Croissant', groupId:'grp_haushalt'},
    {id:'cat_gemuese', name:'Gemüsemarkt', color:'#65a30d', icon:'Carrot', groupId:'grp_haushalt'},
    {id:'cat_fisch', name:'Fisch', color:'#3b82f6', icon:'Fish', groupId:'grp_haushalt'},
    {id:'cat_gastro', name:'Gastro / Lieferservice', color:'#a855f7', icon:'UtensilsCrossed', groupId:'grp_haushalt'},
  ]},
  { id:'grp_pflege', name:'Familie & Haushalt', color:'#06b6d4', icon: 'Shirt', categories:[
    {id:'cat_haushalt', name:'Haushaltswaren', color:'#a16207', icon:'Stamp', groupId:'grp_pflege'},
    {id:'cat_garten', name:'Garten & Pflanzen', color:'#22c55e', icon:'Sprout', groupId:'grp_pflege'},
    {id:'cat_koerperpflege', name:'Körperpflege', color:'#0d9488', icon:'ShowerHead', groupId:'grp_pflege'},
    {id:'cat_haushaltspflege', name:'Haushaltspflege / Reinigung', color:'#0ea5e9', icon:'SprayCan', groupId:'grp_pflege'},
    {id:'cat_haustier', name:'Haustierbedarf', color:'#64748b', icon:'PawPrint', groupId:'grp_pflege'},
    {id:'cat_baumarkt', name:'Baumarkt', color:'#f97316', icon:'Drill', groupId:'grp_pflege'},
  ]},
  { id:'grp_freizeit', name:'Freizeit & Hobby', color:'#3b82f6', icon: 'PartyPopper', categories:[
    {id:'cat_kino', name:'Kino / Kultur', color:'#a855f7', icon:'Film', groupId:'grp_freizeit'},
    {id:'cat_sport', name:'Freizeitaktivitäten', color:'#0ea5e9', icon:'FerrisWheel', groupId:'grp_freizeit'},
    {id:'cat_buecher', name:'Bücher / Bildung', color:'#06b6d4', icon:'BookOpen', groupId:'grp_freizeit'},
    {id:'cat_events', name:'Veranstaltungen', color:'#f87171', icon:'Ticket', groupId:'grp_freizeit'},
    {id:'cat_rauchbedarf', name:'Rauchbedarf', color:'#a16207', icon:'Cigarette', groupId:'grp_freizeit'},
  ]},
  { id:'grp_mobilitaet', name:'Mobilität', color:'#ef4444', icon: 'Car', categories:[
    {id:'cat_auto', name:'Auto (Wartung, Reparatur, Parken, Versicherung)', color:'#d946ef', icon:'Car', groupId:'grp_mobilitaet'},
    {id:'cat_tanken', name:'Tanken', color:'#ef4444', icon:'Fuel', groupId:'grp_mobilitaet'},
    {id:'cat_oepnv', name:'ÖPNV', color:'#22c55e', icon:'BusFront', groupId:'grp_mobilitaet'},
  ]},
  { id:'grp_shopping', name:'Shopping', color:'#e879f9', icon: 'ShoppingBag', categories:[
    {id:'cat_technik', name:'Elektronik & Technik', color:'#64748b', icon:'Smartphone', groupId:'grp_shopping'},
    {id:'cat_kleidung', name:'Kleidung & Schuhe', color:'#f97316', icon:'Shirt', groupId:'grp_shopping'},
    {id:'cat_geschenke', name:'Geschenke', color:'#f43f5e', icon:'Gift', groupId:'grp_shopping'},
    {id:'cat_kinder', name:'Kinderbedarf', color:'#f472b6', icon:'Baby', groupId:'grp_shopping'},
    {id:'cat_nonfood', name:'Sonstiges / Non-Food', color:'#78716c', icon:'Package', groupId:'grp_shopping'},
    {id:'cat_internetkaeufe', name:'Internetkäufe', color:'#f43f5e', icon:'MousePointerClick', groupId:'grp_shopping'},
  ]},
  { id:'grp_gesundheit', name:'Gesundheit & Kosmetik', color:'#22c55e', icon: 'HeartPulse', categories:[
    {id:'cat_gesundheit', name:'Gesundheit / Apotheke', color:'#10b981', icon:'HeartPulse', groupId:'grp_gesundheit'},
    {id:'cat_friseur', name:'Friseur / Kosmetik', color:'#ff7af0', icon:'Scissors', groupId:'grp_gesundheit'},
    {id:'cat_wellness', name:'Wellness & Spa', color:'#ec4899', icon:'Sparkles', groupId:'grp_gesundheit'},
  ]},
  { id:'grp_finanzen', name:'Finanzen & Verträge', color:'#84cc16', icon: 'Landmark', categories:[
    {id:'cat_sparen', name:'Sparen & Investieren', color:'#10b981', icon:'PiggyBank', groupId:'grp_finanzen'},
    {id:'cat_spenden', name:'Spenden', color:'#f43f5e', icon:'HeartHandshake', groupId:'grp_finanzen'},
    {id:'cat_gebuehren', name:'Gebühren / Steuern', color:'#84cc16', icon:'Landmark', groupId:'grp_finanzen'},
  ]},
  { id: DEFAULT_GROUP_ID, name:'Sonstiges', color:'#64748b', icon: 'Package', categories:[
    {id:'cat_urlaub', name:'Urlaub & Reisen', color:'#14b8a6', icon:'Plane', groupId: DEFAULT_GROUP_ID},
    {id:'cat_beruf', name:'Berufliche Ausgaben', color:'#4f46e5', icon:'Briefcase', groupId: DEFAULT_GROUP_ID},
    {id:'cat_default', name:'Sonstige Ausgaben', color:'#64748b', icon:'MoreHorizontal', groupId: DEFAULT_GROUP_ID},
    {id:'cat_abos', name:'Abos (Streaming, etc.)', color:'#78716c', icon:'Clapperboard', groupId: DEFAULT_GROUP_ID},
  ]},
  { id: FIXED_COSTS_GROUP_ID, name:'Fixkosten', color:'#0ea5e9', icon: 'Home', categories:[
    {id:'cat_netflix', name:'Netflix (Streaming)', color:'#ef4444', icon:'Clapperboard', groupId: FIXED_COSTS_GROUP_ID},
    {id:'cat_versicherungen', name:'Versicherungen', color:'#3b82f6', icon:'ShieldCheck', groupId: FIXED_COSTS_GROUP_ID},
    {id:'cat_miete', name:'Miete / Rate', color:'#0ea5e9', icon:'Home', groupId: FIXED_COSTS_GROUP_ID},
    {id:'cat_nebenkosten', name:'Nebenkosten (Strom, Wasser)', color:'#0d9488', icon:'Zap', groupId: FIXED_COSTS_GROUP_ID},
    {id:'cat_internet', name:'Internet / Telefon / TV', color:'#d946ef', icon:'Router', groupId: FIXED_COSTS_GROUP_ID},
    {id:'cat_spotify', name:'Spotify', color:'#22c55e', icon:'Music4', groupId: FIXED_COSTS_GROUP_ID},
  ]},
] as const;


const allCategories: readonly CategoryType[] = CATEGORY_TAXONOMY.flatMap(group => 
    group.categories.map((category, index) => ({
        ...category,
        sortIndex: index,
        lastModified: new Date().toISOString(),
        version: 1,
    }))
);

const allGroups: readonly Group[] = CATEGORY_TAXONOMY.map((group, index) => ({
    id: group.id,
    name: group.name,
    icon: group.icon,
    color: group.color,
    sortIndex: index,
    lastModified: new Date().toISOString(),
    version: 1,
    isDefault: group.id === DEFAULT_GROUP_ID,
}));


const categoryMap = new Map(allCategories.map(c => [c.id, c]));
const groupMap = new Map(allGroups.map(g => [g.id, g]));

// --- Public API ---

export const getCategories = (): CategoryType[] => JSON.parse(JSON.stringify(allCategories));
export const getGroups = (): Group[] => JSON.parse(JSON.stringify(allGroups));
export const getCategoryById = (id: string): CategoryType | undefined => categoryMap.get(id);
export const getGroupById = (id: string): Group | undefined => groupMap.get(id);
export const getCategoryMap = (): Map<string, CategoryType> => categoryMap;
export const getGroupMap = (): Map<string, Group> => groupMap;