import { subDays, startOfDay } from 'date-fns';
import type { Transaction, Tag, TransactionGroup, Category } from '@/shared/types';
import { generateUUID } from '@/shared/utils/uuid';

export interface RichDemoData {
    transactions: Transaction[];
    tags: Tag[];
    transactionGroups: TransactionGroup[];
}

const DEMO_TAGS: Omit<Tag, 'lastModified' | 'version'>[] = [
    { id: 'tag_demo_angebot', name: 'Angebot', isDemo: true },
    { id: 'tag_demo_mealprep', name: 'Meal-Prep', isDemo: true },
    { id: 'tag_demo_snack', name: 'Snack', isDemo: true },
    { id: 'tag_demo_wochenende', name: 'Wochenende', isDemo: true },
    { id: 'tag_demo_gesund', name: 'Gesund', isDemo: true },
];

const randomFloat = (min: number, max: number) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateRichDemoData = (categories: Category[]): RichDemoData => {
    const now = new Date();
    const demoUser = 'usr_demo';

    const transactions: Transaction[] = [];
    const transactionGroups: TransactionGroup[] = [];
    const tags: Tag[] = DEMO_TAGS.map(t => ({...t, lastModified: now.toISOString(), version: 1}));
    const tagIds = tags.map(t => t.id);

    const householdCatIds = categories.filter(c => c.groupId === 'grp_haushalt').map(c => c.id);
    const leisureCatIds = categories.filter(c => c.groupId === 'grp_freizeit').map(c => c.id);
    const otherCatIds = categories.filter(c => c.groupId !== 'grp_haushalt' && c.groupId !== 'grp_freizeit').map(c => c.id);
    const iconOverrides = ['Pizza', 'Coffee', 'Bus', 'Bike', 'Book'];

    // Generate ~50 transactions over the last 90 days
    for (let i = 0; i < 50; i++) {
        const date = subDays(startOfDay(now), randomInt(0, 90)).toISOString();
        let categoryId: string;
        let amount: number;
        
        const catChance = Math.random();
        if (catChance < 0.6 && householdCatIds.length > 0) { // 60% household
            categoryId = pickRandom(householdCatIds);
            amount = randomFloat(5, 60);
        } else if (catChance < 0.8 && leisureCatIds.length > 0) { // 20% leisure
            categoryId = pickRandom(leisureCatIds);
            amount = randomFloat(12, 40);
        } else if (otherCatIds.length > 0) { // 20% other
            categoryId = pickRandom(otherCatIds);
            amount = randomFloat(1.5, 25);
        } else { // Fallback
            categoryId = pickRandom(categories.map(c => c.id));
            amount = randomFloat(10, 30);
        }

        transactions.push({
            id: generateUUID('tx_demo'),
            amount,
            description: `Demo-Ausgabe ${i + 1}`,
            categoryId,
            date,
            createdAt: date,
            isDemo: true,
            lastModified: now.toISOString(),
            version: 1,
            createdBy: demoUser,
            tagIds: Math.random() < 0.4 ? [pickRandom(tagIds)] : (Math.random() < 0.1 ? [pickRandom(tagIds), pickRandom(tagIds)] : []),
            iconOverride: Math.random() < 0.15 ? pickRandom(iconOverrides) : undefined,
        });
    }

    // Create ~8 transaction groups from the generated transactions
    for (let i = 0; i < 8; i++) {
        const availableTxs = transactions.filter(t => !t.transactionGroupId);
        if (availableTxs.length < 2) break;

        const groupSize = randomInt(2, 4);
        const groupTxs = availableTxs.slice(0, groupSize);
        if (groupTxs.length < 2) continue;
        
        const targetAmount = groupTxs.reduce((sum, t) => sum + t.amount, 0);
        const groupId = generateUUID('tgrp_demo');

        transactionGroups.push({
            id: groupId,
            targetAmount,
            createdAt: now.toISOString(),
            lastModified: now.toISOString(),
            version: 1,
            isDeleted: false,
        });

        // Update transactions to be part of the group
        groupTxs.forEach((tx, index) => {
            const txIndex = transactions.findIndex(t => t.id === tx.id);
            if (txIndex > -1) {
                transactions[txIndex].transactionGroupId = groupId;
                transactions[txIndex].groupBaseAmount = tx.amount;
                // Make 1-2 items corrected
                if (index > 0 && Math.random() < 0.4) {
                     transactions[txIndex].isCorrected = true;
                }
            }
        });
    }

    return { transactions, tags, transactionGroups };
};
