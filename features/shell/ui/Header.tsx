
import React from 'react';
import type { User as UserType } from '@/shared/types';
import Logo from '@/shared/ui/Logo';
import { formatGermanDate } from '@/shared/utils/dateUtils';
import { Loader2, RefreshCw, Settings } from '@/shared/ui';
import { UserSelector } from './UserSelector';
import { formatDistanceToNow } from 'date-fns';

// Header Component
export const Header: React.FC<{ 
    users: UserType[];
    onSettingsClick: () => void; 
    onSyncClick: () => void; 
    syncOperation: 'sync' | null;
    lastSync: string | null;
    deLocale: any;
}> = ({ users, onSettingsClick, onSyncClick, syncOperation, lastSync, deLocale }) => {
    const isSyncing = syncOperation !== null;

    const renderLastSyncText = () => {
        if (!lastSync) return 'Noch nicht synchronisiert';
        try {
            const lastSyncDate = new Date(lastSync);
            return `Zuletzt synchronisiert: ${formatDistanceToNow(lastSyncDate, { addSuffix: true, locale: deLocale })}`;
        } catch {
            return 'Sync-Status unbekannt';
        }
    };
    
    return (
        <div className="flex justify-between items-center py-2 sm:py-3">
            <Logo />
            <div className="flex items-center gap-1 sm:gap-2">
                <div className="text-right hidden sm:block">
                    <p className="text-slate-400 text-sm">{formatGermanDate(new Date(), deLocale)}</p>
                     <p className="text-xs text-slate-500">{renderLastSyncText()}</p>
                </div>
                 <button 
                    onClick={onSyncClick} 
                    disabled={isSyncing} 
                    className="p-3 rounded-full hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    title={"Daten synchronisieren"}
                >
                    {isSyncing ? <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" /> : <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6" />}
                </button>
                {users.length === 0 && (
                    <button onClick={onSettingsClick} className="p-3 rounded-full hover:bg-slate-700 transition-colors">
                        <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                )}
                <UserSelector />
            </div>
        </div>
    );
};
