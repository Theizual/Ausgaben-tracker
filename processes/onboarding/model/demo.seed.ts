import { subDays } from 'date-fns';
import type { Transaction, Tag } from '@/shared/types';

export interface DemoData {
    transactions: Transaction[];
    tags: Tag[];
}

const DEMO_TAGS: Tag[] = [
    { id: 'dev-tag-1', name: 'Urlaub', lastModified: new Date().toISOString(), version: 1, isDemo: true },
    { id: 'dev-tag-2', name: 'Projekt', lastModified: new Date().toISOString(), version: 1, isDemo: true },
    { id: 'dev-tag-3', name: 'Wochenende', lastModified: new Date().toISOString(), version: 1, isDemo: true },
    { id: 'dev-tag-4', name: 'Auto', lastModified: new Date().toISOString(), version: 1, isDemo: true },
    { id: 'dev-tag-5', name: 'Fitness', lastModified: new Date().toISOString(), version: 1, isDemo: true },
];

const makeDemoTransactions = (): Transaction[] => {
    const now = new Date();
    const standardUser = '1001';
    return [
        { id: 'dev-1', amount: 12.34, description: 'Kaffee & Croissant', categoryId: 'cat_baecker', date: new Date().toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-2', amount: 99.99, description: 'Wocheneinkauf Supermarkt', categoryId: 'cat_supermarkt', date: subDays(now, 1).toISOString(), isDemo: true, tagIds: ['dev-tag-3'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-3', amount: 7.50, description: 'Parkgebühren', categoryId: 'cat_auto', date: subDays(now, 2).toISOString(), isDemo: true, tagIds: ['dev-tag-4'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-4', amount: 25.00, description: 'Pizza Lieferservice', categoryId: 'cat_gastro', date: subDays(now, 2).toISOString(), isDemo: true, tagIds: ['dev-tag-3'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-5', amount: 125.60, description: 'Neue Winterjacke', categoryId: 'cat_kleidung', date: subDays(now, 3).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-6', amount: 55.00, description: 'Gartenerde & Pflanzen', categoryId: 'cat_garten', date: subDays(now, 4).toISOString(), isDemo: true, tagIds: ['dev-tag-2'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-7', amount: 8.20, description: 'Gemüse vom Markt', categoryId: 'cat_supermarkt', date: subDays(now, 5).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-8', amount: 42.00, description: 'Geburtstagsgeschenk', categoryId: 'cat_geschenke', date: subDays(now, 6).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-9', amount: 330.00, description: 'Hotel für Wochenende', categoryId: 'cat_urlaub', date: subDays(now, 7).toISOString(), isDemo: true, tagIds: ['dev-tag-1', 'dev-tag-3'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-10', amount: 18.00, description: 'Kino-Tickets', categoryId: 'cat_kultur', date: subDays(now, 8).toISOString(), isDemo: true, tagIds: ['dev-tag-3'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-11', amount: 22.50, description: 'Apothekenkauf', categoryId: 'cat_gesundheit', date: subDays(now, 9).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-12', amount: 64.95, description: 'Neues Videospiel', categoryId: 'cat_technik', date: subDays(now, 10).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-13', amount: 35.00, description: 'Tankfüllung', categoryId: 'cat_tanken', date: subDays(now, 11).toISOString(), isDemo: true, tagIds: ['dev-tag-4'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-14', amount: 19.99, description: 'Fitnessstudio Monatsbeitrag', categoryId: 'cat_hobbies', date: subDays(now, 12).toISOString(), isDemo: true, tagIds: ['dev-tag-5'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-15', amount: 29.99, description: 'Proteinpulver', categoryId: 'cat_supermarkt', date: subDays(now, 13).toISOString(), isDemo: true, tagIds: ['dev-tag-5'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-16', amount: 75.00, description: 'Laufschuhe', categoryId: 'cat_kleidung', date: subDays(now, 14).toISOString(), isDemo: true, tagIds: ['dev-tag-5'], lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-17', amount: 49.99, description: 'Streaming Dienst Jahresabo', categoryId: 'cat_abos', date: subDays(now, 15).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: standardUser },
        { id: 'dev-18', amount: 15.50, description: 'Haarschnitt', categoryId: 'cat_friseur', date: subDays(now, 16).toISOString(), isDemo: true, lastModified: now.toISOString(), version: 1, createdBy: standardUser },
    ];
};

export const getDemoData = (): DemoData => ({
    transactions: makeDemoTransactions(),
    tags: DEMO_TAGS
});