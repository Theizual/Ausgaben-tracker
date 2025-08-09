
import React, { FC, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Gift, Loader2 } from '@/shared/ui';
import { ToggleSwitch } from '@/shared/ui';
import { APP_VERSION } from '@/constants';

interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    changes: string[];
}

interface ChangelogModalProps {
    onClose: () => void;
    isAutoShowEnabled: boolean;
    onToggleAutoShow: () => void;
}

const ChangelogModal: FC<ChangelogModalProps> = ({
    onClose,
    isAutoShowEnabled,
    onToggleAutoShow,
}) => {
    const [changelogData, setChangelogData] = useState<ChangelogEntry[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        fetch('/changelog.json')
            .then(res => res.json())
            .then(data => {
                setChangelogData(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to load changelog", err);
                setIsLoading(false);
            });

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const latestChange = changelogData?.[0];

    return (
        <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            >
                <header className="relative p-6 border-b border-slate-700 flex-shrink-0 text-center">
                    <Gift className="h-12 w-12 text-rose-400 mx-auto mb-3" />
                    <h2 id="modal-title" className="text-2xl font-bold text-white">Was ist neu in Version {APP_VERSION}?</h2>
                    {latestChange && <p className="text-sm text-slate-400 mt-1">{latestChange.title}</p>}
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Dialog schließen">
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <main className="p-6 overflow-y-auto custom-scrollbar flex-grow">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                        </div>
                    ) : latestChange ? (
                        <div className="prose prose-sm prose-invert max-w-none prose-ul:list-disc prose-ul:pl-5 prose-strong:text-white">
                            <p className="text-xs text-slate-500 font-semibold mb-4">{latestChange.date}</p>
                            <ul className="space-y-2">
                            {latestChange.changes.map((change, index) => (
                                <li key={index} dangerouslySetInnerHTML={{ __html: change.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>') }} />
                            ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="text-slate-400 text-center">Changelog konnte nicht geladen werden.</p>
                    )}
                </main>

                <footer className="p-4 sm:p-6 border-t border-slate-700 flex-shrink-0 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <ToggleSwitch enabled={isAutoShowEnabled} setEnabled={onToggleAutoShow} id="show-changelog-toggle" />
                         <label htmlFor="show-changelog-toggle" className="text-sm text-slate-300 cursor-pointer">
                             Bei Updates automatisch anzeigen
                         </label>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
                    >
                        Verstanden!
                    </button>
                </footer>
            </motion.div>
        </motion.div>
    );
};

export default ChangelogModal;
