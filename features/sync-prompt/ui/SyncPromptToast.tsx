

import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { formatDistanceToNow } from 'date-fns';
import { toast, Toast } from 'react-hot-toast';
import { RefreshCw, X } from '@/shared/ui';

export const SyncPromptToast: FC = () => {
    const { isSyncRecommended, setIsSyncRecommended, lastSync, syncData, deLocale } = useApp();

    const handleSync = () => {
        syncData();
        setIsSyncRecommended(false);
        toast.dismiss('sync-prompt');
    };

    const handleDismiss = () => {
        setIsSyncRecommended(false);
        toast.dismiss('sync-prompt');
    };

    React.useEffect(() => {
        if (isSyncRecommended) {
            toast.custom(
                (t: Toast) => (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50, transition: { duration: 0.2 } }}
                        className="relative bg-slate-800 border border-slate-700 shadow-lg rounded-xl p-4 w-full max-w-sm flex items-start gap-4"
                    >
                        <div className="bg-blue-500/20 text-blue-400 rounded-full p-3 flex-shrink-0 mt-1">
                            <RefreshCw className="h-6 w-6" />
                        </div>
                        <div className="flex-grow">
                            <h3 className="font-bold text-white">Synchronisierung empfohlen</h3>
                            <p className="text-sm text-slate-400 mt-1">
                                {lastSync
                                    ? `Letzte Synchronisierung: ${formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: deLocale })}. Jetzt aktualisieren?`
                                    : 'Jetzt auf den neuesten Stand bringen?'}
                            </p>
                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={handleSync}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                                >
                                    Synchronisieren
                                </button>
                                <button
                                    onClick={handleDismiss}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                                >
                                    Später
                                </button>
                            </div>
                        </div>
                        <button onClick={handleDismiss} className="absolute top-2 right-2 p-2 text-slate-500 hover:text-white rounded-full">
                            <X className="h-4 w-4" />
                        </button>
                    </motion.div>
                ),
                { id: 'sync-prompt', duration: Infinity, position: 'bottom-center' }
            );
        }
    }, [isSyncRecommended, lastSync, deLocale, handleSync, handleDismiss]);

    return null; // This component only renders toasts
};
