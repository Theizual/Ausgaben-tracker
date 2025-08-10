import type { Group, Category as CategoryType } from '@/shared/types';

// Striktere Typisierung für die Konfigurationsdatei
type TaxonomyCategory = Omit<CategoryType, 'lastModified' | 'version' | 'isDeleted' | 'conflicted'>;
type TaxonomyGroup = Omit<Group, 'sortIndex' | 'lastModified' | 'version' | 'isDeleted' | 'conflicted' | 'isDefault' | 'icon'> & { icon: string, categories: TaxonomyCategory[] };

export const CATEGORY_TAXONOMY: readonly TaxonomyGroup[] = [
  { id:'grpid_0001', name:'Haushalt & Lebensmittel', color:'#10b981', icon: 'ShoppingBasket', categories:[
    {id:'cat_supermarkt', name:'Supermarkt / Drogeriemarkt', color:'#10b981', icon:'ShoppingCart', groupId:'grpid_0001', budget: 400},
    {id:'cat_metzger', name:'Metzger', color:'#ff4a4a', icon:'Beef', groupId:'grpid_0001', budget: 40},
    {id:'cat_baecker', name:'Bäcker', color:'#f59e0b', icon:'Croissant', groupId:'grpid_0001', budget: 50},
    {id:'cat_gemuese', name:'Gemüsemarkt', color:'#65a30d', icon:'Carrot', groupId:'grpid_0001', budget: 60},
    {id:'cat_fisch', name:'Fisch', color:'#3b82f6', icon:'Fish', groupId:'grpid_0001', budget: 30},
    {id:'cat_haushalt', name:'Haushaltswaren', color:'#84cc16', icon:'Brush', groupId:'grpid_0001', budget: 50},
    {id:'cat_garten', name:'Garten & Pflanzen', color:'#22c55e', icon:'Sprout', groupId:'grpid_0001', budget: 40},
  ]},
  { id:'grpid_0002', name:'Freizeit & Unterhaltung', color:'#ec4899', icon: 'PartyPopper', categories:[
    {id:'cat_gastro', name:'Gastronomie / Lieferservice / Restaurant / Café', color:'#ec4899', icon:'UtensilsCrossed', groupId:'grpid_0002', budget: 150},
    {id:'cat_kino', name:'Kino / Kultur', color:'#a855f7', icon:'Film', groupId:'grpid_0002', budget: 40},
    {id:'cat_sport', name:'Sport & Hobbies', color:'#8b5cf6', icon:'Dumbbell', groupId:'grpid_0002', budget: 50},
    {id:'cat_urlaub', name:'Urlaub & Reisen', color:'#14b8a6', icon:'Plane', groupId:'grpid_0002', budget: 200},
    {id:'cat_technik', name:'Elektronik & Technik', color:'#64748b', icon:'Smartphone', groupId:'grpid_0002', budget: 80},
    {id:'cat_abos', name:'Abos (Streaming, etc.)', color:'#78716c', icon:'Clapperboard', groupId:'grpid_0002', budget: 30},
    {id:'cat_buecher', name:'Bücher / Bildung', color:'#06b6d4', icon:'BookOpen', groupId:'grpid_0002', budget: 20},
    {id:'cat_events', name:'Veranstaltungen / Konzerte', color:'#f87171', icon:'Ticket', groupId:'grpid_0002', budget: 60},
  ]},
  { id:'grpid_0003', name:'Mobilität', color:'#f97316', icon: 'Car', categories:[
    {id:'cat_oepnv', name:'ÖPNV / Tickets', color:'#f97316', icon:'BusFront', groupId:'grpid_0003', budget: 50},
    {id:'cat_auto', name:'Auto (Wartung, Reparatur, Parken, Versicherung)', color:'#d946ef', icon:'Car', groupId:'grpid_0003', budget: 120},
    {id:'cat_tanken', name:'Tanken', color:'#ef4444', icon:'Fuel', groupId:'grpid_0003', budget: 150},
  ]},
  { id:'grpid_0004', name:'Shopping', color:'#eab308', icon: 'ShoppingBag', categories:[
    {id:'cat_kleidung', name:'Kleidung & Schuhe', color:'#eab308', icon:'Shirt', groupId:'grpid_0004', budget: 80},
    {id:'cat_geschenke', name:'Geschenke', color:'#f43f5e', icon:'Gift', groupId:'grpid_0004', budget: 50},
  ]},
  { id:'grpid_0005', name:'Persönliches & Gesundheit', color:'#2563eb', icon: 'HeartPulse', categories:[
    {id:'cat_gesundheit', name:'Gesundheit / Apotheke', color:'#2563eb', icon:'Stethoscope', groupId:'grpid_0005', budget: 30},
    {id:'cat_friseur', name:'Friseur / Kosmetik', color:'#c026d3', icon:'Scissors', groupId:'grpid_0005', budget: 30},
    {id:'cat_wellness', name:'Wellness & Spa', color:'#ec4899', icon:'Sparkles', groupId:'grpid_0005', budget: 40},
  ]},
  { id:'grpid_0006', name:'Kleidung & Pflege', color:'#0d9488', icon: 'Shirt', categories:[
    {id:'cat_koerperpflege', name:'Körperpflege / Drogerie', color:'#0d9488', icon:'ShowerHead', groupId:'grpid_0006', budget: 20},
    {id:'cat_haushaltspflege', name:'Haushaltspflege / Reinigung', color:'#0ea5e9', icon:'SprayCan', groupId:'grpid_0006', budget: 20},
  ]},
  { id:'grpid_0007', name:'Finanzen & Verträge', color:'#10b981', icon: 'Landmark', categories:[
    {id:'cat_sparen', name:'Sparen & Investieren', color:'#10b981', icon:'PiggyBank', groupId:'grpid_0007', budget: 300},
    {id:'cat_spenden', name:'Spenden', color:'#f43f5e', icon:'HeartHandshake', groupId:'grpid_0007', budget: 20},
    {id:'cat_versicherungen', name:'Versicherungen', color:'#3b82f6', icon:'ShieldCheck', groupId:'grpid_0007', budget: 150},
  ]},
  { id:'grpid_0008', name:'Sonstiges', color:'#64748b', icon: 'Package', categories:[
    {id:'cat_kinder', name:'Kinder / Familie', color:'#f472b6', icon:'Baby', groupId:'grpid_0008', budget: 80},
    {id:'cat_haustier', name:'Haustierbedarf', color:'#a855f7', icon:'PawPrint', groupId:'grpid_0008', budget: 40},
    {id:'cat_nonfood', name:'Elektronik / Non-Food', color:'#78716c', icon:'Package', groupId:'grpid_0008', budget: 50},
    {id:'cat_internetkaeufe', name:'Internetkäufe (allgemein)', color:'#f43f5e', icon:'MousePointerClick', groupId:'grpid_0008', budget: 60},
    {id:'cat_gebuehren', name:'Gebühren / Steuern', color:'#84cc16', icon:'Landmark', groupId:'grpid_0008', budget: 100},
    {id:'cat_beruf', name:'Berufliche Ausgaben', color:'#4f46e5', icon:'Briefcase', groupId:'grpid_0008', budget: 80},
    {id:'cat_sonstiges', name:'Sonstige Ausgaben', color:'#64748b', icon:'MoreHorizontal', groupId:'grpid_0008', budget: 50},
  ]},
  { id:'grpid_0009', name:'Fixkosten', color:'#0ea5e9', icon: 'Home', categories:[
    {id:'cat_miete', name:'Miete / Rate', color:'#0ea5e9', icon:'Home', groupId:'grpid_0009', budget: 900},
    {id:'cat_nebenkosten', name:'Nebenkosten (Strom, Wasser)', color:'#0d9488', icon:'Zap', groupId:'grpid_0009', budget: 150},
    {id:'cat_internet', name:'Internet / Telefon / TV', color:'#6366f1', icon:'Router', groupId:'grpid_0009', budget: 50},
  ]},
] as const;


const allCategories: readonly CategoryType[] = CATEGORY_TAXONOMY.flatMap(group => 
    group.categories.map(category => ({
        ...category,
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
    isDefault: group.id === 'grpid_0008',
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