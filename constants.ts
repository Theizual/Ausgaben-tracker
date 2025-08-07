import type { Category } from './types';

export const APP_VERSION = '0.88';

export const CHANGELOG = [
    {
        version: '0.88',
        date: '07.08.2024, 11:00 Uhr',
        title: 'UI- & Statistik-Generalüberholung',
        changes: [
            'Das Budget-Verlaufsdiagramm zeigt am Ende der Trendlinie nun einen Prognose-Punkt (grün/rot) an, der den erwarteten Budget-Ausgang signalisiert.',
            'Die Kategorien-Übersicht im Statistik-Tab und die Budget-Übersicht auf dem Dashboard sind jetzt für mehr Übersichtlichkeit nach Gruppen strukturiert.',
            'Die Anzeige von Transaktionen wurde in der gesamten App für ein einheitliches Design vereinheitlicht und zentralisiert.',
            'Der veraltete Ausgaben-Graph auf der Übersichtsseite wurde entfernt.',
        ]
    },
    {
        version: '0.86',
        date: '06.08.2024, 10:00 Uhr',
        title: 'Verbesserte Statistik-Ansicht',
        changes: [
            'Das Budget-Burndown-Diagramm enthält jetzt eine Trendlinie pro Kategorie, um die Einhaltung des Budgets besser vorherzusagen.',
            'Ein Fehler wurde behoben, bei dem die Seite beim Wechseln des Monats im Statistik-Kalender gesprungen ist.',
        ]
    },
    {
        version: '0.84',
        date: '05.08.2024, 11:00 Uhr',
        title: 'Verbesserte Verwaltung von Kategoriegruppen',
        changes: [
            'Die Löschfunktion für Gruppen wurde aus dem Umbenennen-Dialog entfernt, um die Bedienung eindeutiger zu machen.',
            'Leere Kategoriegruppen können nun direkt über ein Mülleimer-Symbol in der Bibliotheksansicht gelöscht werden.',
            'Die interne Logik zum Löschen von Gruppen wurde überarbeitet, um Fehler zu beheben und die Zuverlässigkeit zu erhöhen.',
        ]
    },
    {
        version: '0.83',
        date: '02.08.2024, 15:00 Uhr',
        title: 'Optimierung der Transaktionsansicht',
        changes: [
            'Die Funktion zum massenhaften Löschen von Transaktionen wurde entfernt, um die Oberfläche zu vereinfachen.',
            'Bearbeiten- und Löschen-Buttons werden nicht mehr bei Maus-Hover angezeigt; die Verwaltung erfolgt nun zentral über das Detail-Fenster.',
            'Das Layout der Listenansicht auf Mobilgeräten wurde optimiert, um abgeschnittene Beschreibungen zu vermeiden.',
        ]
    },
    {
        version: '0.80',
        date: '31.07.2024, 10:00 Uhr',
        title: 'Mobile Optimierungen & Fixes',
        changes: [
            'Fehlerbehebung: Das Kuchendiagramm in der Übersicht wird auf mobilen Geräten nun korrekt dargestellt und kollabiert nicht mehr.',
            'Die mobile Navigationsleiste wurde für eine bessere Erreichbarkeit an den oberen Bildschirmrand verschoben und ist nun fixiert.',
        ]
    },
    {
        version: '0.78',
        date: '30.07.2024, 11:00 Uhr',
        title: 'Stabilität & Kritische Fehlerbehebungen',
        changes: [
            'KRITISCH: Ein schwerwiegender Fehler wurde behoben, bei dem gezogene Kategorien beim Verschieben zwischen Gruppen unsichtbar wurden oder die Ansicht überlagerten.',
            'Die Drag-and-Drop-Funktionalität in der Kategorien-Verwaltung ist nun stabil und zuverlässig.',
            'Diverse interne Code-Verbesserungen zur Steigerung der Stabilität und Performance.',
        ]
    },
    {
        version: '0.77',
        date: '29.07.2024, 15:30 Uhr',
        title: 'Drag & Drop Verbesserungen & Changelog',
        changes: [
            'Gruppen öffnen sich nun automatisch, wenn eine Kategorie darüber gezogen wird.',
            'App-Version und Changelog in den Einstellungen hinzugefügt.',
            'Option zum Deaktivieren der automatischen Changelog-Anzeige implementiert.',
            'Verbesserte visuelle Darstellung beim Ziehen von Kategorien.',
        ]
    },
    {
        version: '0.76',
        date: '28.07.2024, 10:00 Uhr',
        title: 'Interaktive Kategorien-Verwaltung',
        changes: [
            'Einklappbare Gruppen (Akkordeon-Ansicht) für bessere Übersicht.',
            'Drag & Drop zum Sortieren von Gruppen und Kategorien hinzugefügt.',
            'Kategorien können jetzt zwischen Gruppen verschoben werden.',
            'Diverse UI-Fehlerbehebungen und Performance-Optimierungen.',
        ]
    }
];


// This is the source of truth for the initial setup.
const initialSetup: { name: string; categories: Omit<Category, 'group' | 'lastModified' | 'version'>[] }[] = [
  {
    name: 'Einkauf & Lebensmittel',
    categories: [
      { id: 'cat_supermarkt', name: 'Supermarkt / Drogerie', color: '#c7aa05', icon: 'ShoppingCart', budget: 500 },
      { id: 'cat_gastro', name: 'Gastronomie / Lieferservice', color: '#6366f1', icon: 'UtensilsCrossed', budget: 150 },
      { id: 'cat_baecker', name: 'Bäcker', color: '#d97706', icon: 'Croissant', budget: 50 },
      { id: 'cat_metzger', name: 'Metzger / Fisch', color: '#ff4a4a', icon: 'Beef', budget: 80 },
    ],
  },
  {
    name: 'Wohnen & Haushalt',
    categories: [
      { id: 'cat_miete', name: 'Miete / Rate', color: '#0ea5e9', icon: 'Home', budget: 1200 },
      { id: 'cat_nebenkosten', name: 'Nebenkosten (Strom, Wasser)', color: '#0d9488', icon: 'Zap', budget: 150 },
      { id: 'cat_internet_tv', name: 'Internet / Telefon / TV', color: '#6366f1', icon: 'Router', budget: 60 },
      { id: 'cat_haushalt', name: 'Haushaltsartikel / Reinigung', color: '#0ea5e9', icon: 'SprayCan', budget: 50 },
      { id: 'cat_moebel', name: 'Möbel / Einrichtung', color: '#a16207', icon: 'Sofa', budget: 100 },
      { id: 'cat_reparaturen', name: 'Reparaturen', color: '#f59e0b', icon: 'Wrench', budget: 50 },
      { id: 'cat_garten', name: 'Garten & Balkon', color: '#22c55e', icon: 'Leaf', budget: 30 },
    ],
  },
  {
    name: 'Mobilität',
    categories: [
      { id: 'cat_tanken', name: 'Tanken', color: '#ef4444', icon: 'Fuel', budget: 200 },
      { id: 'cat_oepnv', name: 'ÖPNV / Tickets', color: '#3b82f6', icon: 'Ticket', budget: 80 },
      { id: 'cat_auto', name: 'Auto (Wartung, Versicherung)', color: '#64748b', icon: 'Car', budget: 100 },
      { id: 'cat_taxi', name: 'Taxi / Fahrdienste', color: '#eab308', icon: 'Car', budget: 40 },
    ],
  },
  {
    name: 'Freizeit & Unterhaltung',
    categories: [
      { id: 'cat_hobbies', name: 'Hobbies / Sport', color: '#f59e0b', icon: 'Dumbbell', budget: 75 },
      { id: 'cat_kultur', name: 'Kultur / Ausgehen', color: '#a855f7', icon: 'Film', budget: 80 },
      { id: 'cat_urlaub', name: 'Urlaub / Reisen', color: '#14b8a6', icon: 'Plane', budget: 200 },
      { id: 'cat_bildung', name: 'Bücher / Bildung', color: '#06b6d4', icon: 'BookOpen', budget: 30 },
      { id: 'cat_technik', name: 'Technik & Gadgets', color: '#64748b', icon: 'Gamepad2', budget: 75 },
    ],
  },
  {
    name: 'Kleidung & Pflege',
    categories: [
      { id: 'cat_kleidung', name: 'Kleidung / Schuhe', color: '#ec4899', icon: 'Shirt', budget: 100 },
      { id: 'cat_pflege', name: 'Drogerie / Körperpflege', color: '#0d9488', icon: 'ShowerHead', budget: 50 },
      { id: 'cat_friseur', name: 'Friseur / Kosmetik', color: '#f472b6', icon: 'Scissors', budget: 40 },
      { id: 'cat_gesundheit', name: 'Gesundheit / Apotheke', color: '#22c55e', icon: 'HeartPulse', budget: 50 },
      { id: 'cat_wellness', name: 'Wellness & Spa', color: '#ec4899', icon: 'Sparkles', budget: 75 },
    ],
  },
  {
    name: 'Finanzen & Verträge',
    categories: [
      { id: 'cat_versicherung', name: 'Versicherungen', color: '#3b82f6', icon: 'ShieldCheck', budget: 150 },
      { id: 'cat_abos', name: 'Abos & Dienste', color: '#8b5cf6', icon: 'Repeat', budget: 40 },
      { id: 'cat_sparen', name: 'Sparen & Investieren', color: '#10b981', icon: 'PiggyBank', budget: 200 },
      { id: 'cat_spenden', name: 'Spenden', color: '#f43f5e', icon: 'HeartHandshake', budget: 25 },
      { id: 'cat_rueckzahlung', name: 'Rückzahlung (Kredit)', color: '#78716c', icon: 'Coins', budget: 0 },
    ]
  },
  {
    name: 'Sonstiges',
    categories: [
      { id: 'cat_geschenke', name: 'Geschenke', color: '#d946ef', icon: 'Gift', budget: 50 },
      { id: 'cat_kinder', name: 'Kinder / Familie', color: '#f472b6', icon: 'Baby', budget: 100 },
      { id: 'cat_tier', name: 'Haustier', color: '#a855f7', icon: 'PawPrint', budget: 50 },
      { id: 'cat_non_food', name: 'Elektronik / Non-Food', color: '#78716c', icon: 'Package', budget: 75 },
      { id: 'cat_internetkaeufe', name: 'Internetkäufe (allg.)', color: '#f43f5e', icon: 'Globe', budget: 100 },
      { id: 'cat_gebuehren', name: 'Gebühren / Steuern', color: '#84cc16', icon: 'Landmark', budget: 100 },
      { id: 'cat_uncategorized', name: 'Sonstige Ausgaben', color: '#64748b', icon: 'MoreHorizontal', budget: 100 },
    ]
  }
];

const now = new Date().toISOString();

export const INITIAL_GROUPS: string[] = initialSetup.map(group => group.name);

export const INITIAL_CATEGORIES: Category[] = initialSetup.flatMap(group => 
    group.categories.map(category => ({
        ...category,
        group: group.name,
        lastModified: now,
        version: 1,
    }))
);