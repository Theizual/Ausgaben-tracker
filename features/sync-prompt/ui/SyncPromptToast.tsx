





import React, { FC } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatDistanceToNow } from 'date-fns';
import { Modal, Button, RefreshCw } from '@/shared/ui';

export const SyncPromptToast: FC = () => { // Component name kept for import compatibility
    const { isSyncRecommended, dismissSyncPrompt, lastSync, syncData, deLocale } = useApp();

    const handleSync = () => {
        syncData();
        dismissSyncPrompt();
    };
    
    const footer = (
         <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={dismissSyncPrompt}>Später</Button>
            <Button onClick={handleSync}>Synchronisieren</Button>
        </div>
    );
    
    if (!isSyncRecommended) {
        return null;
    }

    return (
        <Modal isOpen={isSyncRecommended} onClose={dismissSyncPrompt} title="Synchronisierung empfohlen" footer={footer}>
            <div className="flex items-start gap-4">
                <div className="bg-blue-500/20 text-blue-400 rounded-full p-3 flex-shrink-0 mt-1">
                    <RefreshCw className="h-6 w-6" />
                </div>
                <div>
                    <p className="text-sm text-slate-300">
                        {lastSync
                            ? `Letzte Synchronisierung: ${formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: deLocale })}. Jetzt aktualisieren?`
                            : 'Jetzt auf den neuesten Stand bringen?'}
                    </p>
                </div>
            </div>
        </Modal>
    );
};