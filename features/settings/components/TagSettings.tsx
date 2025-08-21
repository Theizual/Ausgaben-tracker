import React from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { Tag, Trash2, Button } from '@/shared/ui';
import { settingsContentAnimation } from '@/shared/lib/animations';

const TRANSPARENT_INPUT_CLASSES = "bg-transparent font-medium text-white w-full focus:outline-none focus:bg-slate-600/50 rounded px-2 py-1";

export const TagSettings = () => {
    const { allAvailableTags, handleUpdateTag, handleDeleteTag, transactions, openDeleteTagModal } = useApp();

    return (
        <motion.div 
            key="tags"
            {...{
                variants: settingsContentAnimation,
                initial: "initial",
                animate: "animate",
                exit: "exit",
            }}
        >
            <h3 className="text-lg font-semibold text-white mb-1">Tag-Verwaltung</h3>
            <p className="text-sm text-slate-400 mb-6">Bestehende Tags umbenennen oder löschen. Neue Tags werden beim Hinzufügen einer Transaktion erstellt.</p>
            <div className="space-y-3">
                {allAvailableTags.map(tag => (
                    <div key={tag.id} className="flex items-center gap-3 bg-slate-700/50 p-2 rounded-lg">
                        <Tag className="h-5 w-5 text-slate-400 shrink-0 ml-2" />
                        <input
                            type="text"
                            defaultValue={tag.name}
                            onBlur={(e) => handleUpdateTag(tag.id, e.currentTarget.value.trim())}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                            className={TRANSPARENT_INPUT_CLASSES}
                        />
                        <Button
                            variant="destructive-ghost"
                            size="icon-auto"
                            onClick={() => {
                                const txCount = transactions.filter(t => !t.isDeleted && t.tagIds?.includes(tag.id)).length;
                                if (txCount > 0) {
                                    openDeleteTagModal(tag, txCount);
                                } else {
                                    if (window.confirm(`Tag "${tag.name}" wirklich löschen?`)) {
                                        handleDeleteTag(tag.id);
                                    }
                                }
                            }}
                        >
                            <Trash2 className="h-5 w-5" />
                        </Button>
                    </div>
                ))}
                {allAvailableTags.length === 0 && (
                    <p className="text-center text-slate-500 py-4">Keine Tags vorhanden.</p>
                )}
            </div>
        </motion.div>
    );
};