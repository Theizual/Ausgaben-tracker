



import React, { useEffect, useState, useCallback } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { X, Gift, Loader2 } from '@/shared/ui';
import { ToggleSwitch, Button } from '@/shared/ui';
import { APP_VERSION } from '@/constants';
import { apiGet } from '@/shared/lib/http';

const toArray = <T,>(v: T[] | undefined | null): T[] => (Array.isArray(v) ? v : []);

interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    changes?: string[];
}

interface ChangelogModalProps {
    onClose: () => void;
    isAutoShowEnabled: boolean;
    onToggleAutoShow: () => void;
}

const ChangelogModal = ({
    onClose,
    isAutoShowEnabled,
    onToggleAutoShow,
}: ChangelogModalProps) => {
    const [changelogData, setChangelogData] = useState<ChangelogEntry[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchChangelog = useCallback(() => {
        setIsLoading(true);
        setError(null);
        apiGet('/changelog.json')
            .then(data => {
                setChangelogData(data);
                try {
                    localStorage.setItem('changelogCache', JSON.stringify({ data, timestamp: Date.now() }));
                } catch (e) {
                    console.warn('Could not cache changelog', e);
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to load changelog", err);
                let errorMessage = "Changelog konnte nicht geladen werden.";
                try {
                    const cached = localStorage.getItem('changelogCache');
                    if (cached) {
                        const { data } = JSON.parse(cached);
                        setChangelogData(data);
                        errorMessage += " Zeige zwischengespeicherte Version.";
                    }
                } catch (cacheError) {
                    console.error("Failed to parse cached changelog", cacheError);
                }
                setError(errorMessage);
                setIsLoading(false);
            });
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        fetchChangelog();
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, fetchChangelog]);

    useEffect(() => {
        document.body.classList.add('modal-open');
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, []);

    const latestChange = changelogData?.[0];

    const backdropAnimation: MotionProps = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
    };

    const modalAnimation: MotionProps = {
        initial: { scale: 0.95, y: 20 },
        animate: { scale: 1, y: 0 },
        exit: { scale: 0.95, y: 20 },
        transition: { type: 'spring', stiffness: 350, damping: 30 },
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
            {...backdropAnimation}
            onClick={onClose}
        >
            <motion.div
                className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
                {...modalAnimation}
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
                    ) : changelogData && latestChange ? (
                        <>
                            {error && (
                                <div className="text-center text-amber-400 text-sm mb-4 bg-amber-500/10 p-2 rounded-md">
                                    <p>{error}</p>
                                    <button onClick={fetchChangelog} className="underline font-semibold mt-1">
                                        Erneut versuchen
                                    </button>
                                </div>
                            )}
                            <div className="prose prose-sm prose-invert max-w-none prose-ul:list-disc prose-ul:pl-5 prose-strong:text-white">
                                <p className="text-xs text-slate-500 font-semibold mb-4">{latestChange.date}</p>
                                <ul className="space-y-2">
                                {toArray(latestChange?.changes).length === 0 ? (
                                    <li className="text-slate-400">Keine Änderungen vorhanden.</li>
                                ) : (
                                    toArray(latestChange?.changes).map((change, index) => (
                                        <li
                                        key={index}
                                        dangerouslySetInnerHTML={{
                                            __html: change.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            }}
                                            />
                                    ))

                                )}
                                </ul>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                            <p className="text-red-400">{error || 'Changelog konnte nicht geladen werden.'}</p>
                            <Button onClick={fetchChangelog} variant="secondary" className="mt-4">
                                Erneut versuchen
                            </Button>
                        </div>
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