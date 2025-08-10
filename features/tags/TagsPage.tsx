

import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { Tag } from '@/shared/types';
import { parseISO } from 'date-fns';
import { Hash } from '@/shared/ui';
import { PeriodNavigator } from './ui/PeriodNavigator';
import { MultiTagPicker } from './ui/MultiTagPicker';
import { TagDetailView } from './ui/TagDetailView';

const TagsPage = () => {
    const { 
        allAvailableTags,
        transactions,
        selectedTagIdsForAnalysis,
        handleSelectTagForAnalysis,
        tagsPeriodType,
        setTagsPeriodType,
        tagsCurrentDate,
        setTagsCurrentDate,
        tagsCustomDateRange,
        setTagsCustomDateRange,
        ...rest
    } = useApp();

    const recentlyUsedTags = useMemo(() => {
        const sortedTransactions = [...transactions].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        const recentTagIds = new Set<string>();

        for (const transaction of sortedTransactions) {
            if (recentTagIds.size >= 20) break;
            if (transaction.tagIds) {
                for (const tagId of transaction.tagIds) {
                    if (recentTagIds.size >= 20) break;
                    recentTagIds.add(tagId);
                }
            }
        }
        
        const tagMap = new Map(allAvailableTags.map(t => [t.id, t]));
        return Array.from(recentTagIds).map(id => tagMap.get(id)).filter((t): t is Tag => !!t);
    }, [transactions, allAvailableTags]);


    if (allAvailableTags.length === 0) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-white">Tag-Analyse</h1>
                <div className="flex items-center justify-center h-96 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <p className="text-slate-500">Keine Tags vorhanden. Fügen Sie bei einer Transaktion einen neuen Tag hinzu.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Tag-Analyse</h1>
            
            <MultiTagPicker 
                allTags={allAvailableTags}
                recentTags={recentlyUsedTags}
                selectedTagIds={selectedTagIdsForAnalysis}
                onSelectionChange={handleSelectTagForAnalysis}
            />

            <PeriodNavigator
                periodType={tagsPeriodType}
                setPeriodType={setTagsPeriodType}
                currentDate={tagsCurrentDate}
                setCurrentDate={setTagsCurrentDate}
                customDateRange={tagsCustomDateRange}
                setCustomDateRange={setTagsCustomDateRange}
            />

            <AnimatePresence mode="wait">
                {selectedTagIdsForAnalysis.length > 0 ? (
                    <motion.div
                        key={selectedTagIdsForAnalysis.join('-')}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <TagDetailView
                            tagIds={selectedTagIdsForAnalysis}
                            periodType={tagsPeriodType}
                            currentDate={tagsCurrentDate}
                            customDateRange={tagsCustomDateRange}
                            appContext={{ ...rest, transactions }}
                        />
                    </motion.div>
                ) : (
                     <div className="flex flex-col items-center justify-center h-96 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-center">
                         <Hash className="text-slate-600 h-12 w-12 mb-4" />
                         <h2 className="text-xl font-bold text-white">Wählen Sie Tags zur Analyse aus</h2>
                         <p className="text-slate-400">Klicken Sie oben auf einen Tag, um zu beginnen.</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TagsPage;
