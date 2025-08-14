import { subDays } from 'date-fns';
import type { Transaction, Tag } from '@/shared/types';

export interface DemoData {
    transactions: Transaction[];
    tags: Tag[];
}

const DEMO_TAGS: Tag[] = [
    { id: 'tag_demo_1', name: 'Urlaub', lastModified: new Date().toISOString(), version: 1, isDemo: true },
    { id: 'tag_demo_2', name: 'Projekt', lastModified: new Date().toISOString(), version: 1, isDemo: true },
    { id: 'tag_demo_3', name: 'Wochenende', lastModified: new Date().toISOString(), version: 1, isDemo: true },
    { id: 'tag_demo_4', name: 'Auto', lastModified: new Date().toISOString(), version: 1, isDemo: true },
    { id: 'tag_demo_5', name: 'Fitness', lastModified: new Date().toISOString(), version: 1, isDemo: true },
];

const makeDemoTransactions = (): Transaction[] => {
    const now = new Date();
    const demoUser = 'usr_demo';
    const txDate1 = new Date().toISOString();
    return [
        { id: 'tx_demo_1', amount: 12.34, description: 'Kaffee & Croissant', categoryId: 'cat_gastro', date: txDate1, createdAt: txDate1, isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: demoUser },
        { id: 'tx_demo_2', amount: 99.99, description: 'Wocheneinkauf Supermarkt', categoryId: 'cat_supermarkt', date: subDays(now, 1).toISOString(), createdAt: subDays(now, 1).toISOString(), isDemo: true, tagIds: ['tag_demo_3'], lastModified: now.toISOString(), version: 1, createdBy: demoUser },
        { id: 'tx_demo_3', amount: 7.50, description: 'Parkgebühren Innenstadt', categoryId: 'cat_auto', date: subDays(now, 2).toISOString(), createdAt: subDays(now, 2).toISOString(), isDemo: true, tagIds: ['tag_demo_4'], lastModified: now.toISOString(), version: 1, createdBy: demoUser },
        { id: 'tx_demo_4', amount: 25.00, description: 'Pizza Lieferservice', categoryId: 'cat_gastro', date: subDays(now, 2).toISOString(), createdAt: subDays(now, 2).toISOString(), isDemo: true, tagIds: ['tag_demo_3'], lastModified: now.toISOString(), version: 1, createdBy: demoUser },
        { id: 'tx_demo_5', amount: 125.60, description: 'Neue Winterjacke', categoryId: 'cat_kleidung', date: subDays(now, 3).toISOString(), createdAt: subDays(now, 3).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: demoUser },
        { id: 'tx_demo_6', amount: 15.45, description: 'Shampoo und Duschgel', categoryId: 'cat_drogerie', date: subDays(now, 4).toISOString(), createdAt: subDays(now, 4).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: demoUser },
        { id: 'tx_demo_7', amount: 8.20, description: 'Gemüse vom Markt', categoryId: 'cat_supermarkt', date: subDays(now, 5).toISOString(), createdAt: subDays(now, 5).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: demoUser },
        { id: 'tx_demo_8', amount: 42.00, description: 'Geburtstagsgeschenk für Mama', categoryId: 'cat_geschenke', date: subDays(now, 6).toISOString(), createdAt: subDays(now, 6).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: demoUser },
        { id: 'tx_demo_9', amount: 330.00, description: 'Hotel für Wochenende in Berlin', categoryId: 'cat_urlaub', date: subDays(now, 7).toISOString(), createdAt: subDays(now, 7).toISOString(), isDemo: true, tagIds: ['tag_demo_1', 'tag_demo_3'], lastModified: now.toISOString(), version: 1, createdBy: demoUser },
        { id: 'tx_demo_10', amount: 18.00, description: 'Kino: Neuer Superheldenfilm', categoryId: 'cat_kultur', date: subDays(now, 8).toISOString(), createdAt: subDays(now, 8).toISOString(), isDemo: true, tagIds: ['tag_demo_3'], lastModified: now.toISOString(), version: 1, createdBy: demoUser },
        { id: 'tx_demo_11', amount: 22.50, description: 'Medikamente aus der Apotheke', categoryId: 'cat_gesundheit', date: subDays(now, 9).toISOString(), createdAt: subDays(now, 9).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: demoUser },
        { id: 'tx_demo_12', amount: 64.95, description: 'Neues Videospiel', categoryId: 'cat_technik', date: subDays(now, 10).toISOString(), createdAt: subDays(now, 10).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: demoUser },
        { id: 'tx_demo_13', amount: 35.00, description: 'Monatsticket ÖPNV', categoryId: 'cat_oepnv', date: subDays(now, 11).toISOString(), createdAt: subDays(now, 11).toISOString(), isDemo: true, tagIds: ['tag_demo_4'], lastModified: now.toISOString(), version: 1, createdBy: demoUser },
        { id: 'tx_demo_14', amount: 19.99, description: 'Fitnessstudio Monatsbeitrag', categoryId: 'cat_hobbies', date: subDays(now, 12).toISOString(), createdAt: subDays(now, 12).toISOString(), isDemo: true, tagIds: ['tag_demo_5'], lastModified: now.toISOString(), version: 1, createdBy: demoUser },
        { id: 'tx_demo_15', amount: 29.99, description: 'Spotify Abo', categoryId: 'cat_abos', date: subDays(now, 13).toISOString(), createdAt: subDays(now, 13).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: demoUser },
        { id: 'tx_demo_16', amount: 75.00, description: 'Laufschuhe', categoryId: 'cat_kleidung', date: subDays(now, 14).toISOString(), createdAt: subDays(now, 14).toISOString(), isDemo: true, tagIds: ['tag_demo_5'], lastModified: now.toISOString(), version: 1, createdBy: demoUser },
        { id: 'tx_demo_17', amount: 49.99, description: 'Netflix Jahresabo', categoryId: 'cat_abos', date: subDays(now, 15).toISOString(), createdAt: subDays(now, 15).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: demoUser },
        { id: 'tx_demo_18', amount: 25.50, description: 'Haarschnitt', categoryId: 'cat_friseur', date: subDays(now, 16).toISOString(), createdAt: subDays(now, 16).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: demoUser },
    ];
};

export const getDemoData = (): DemoData => ({
    transactions: makeDemoTransactions(),
    tags: DEMO_TAGS
});