import React from 'react';
import type { User as UserType } from '@/shared/types';
import Logo from '@/shared/ui/Logo';
import { formatGermanDate, format } from '@/shared/utils/dateUtils';
import { Loader2, RefreshCw, Settings, FlaskConical } from '@/shared/ui';
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
    showDemoData: boolean;
}> = ({ users, onSettingsClick, onSyncClick, syncOperation, lastSync, deLocale, showDemoData }) => {
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
                 {showDemoData && (
                    <div className="hidden sm:flex items-center gap-1.5 bg-rose-900/70 text-rose-300 text-xs font-bold px-2 py-1 rounded-full" aria-label="Demodaten aktiv">
                        Demo aktiv
                    </div>
                )}
                <div className="text-right">
                    <p className="text-slate-400 text-sm hidden sm:block">{formatGermanDate(new Date(), deLocale)}</p>
                    <p className="text-slate-400 text-xs sm:hidden whitespace-nowrap">{format(new Date(), 'E, d. MMM', { locale: deLocale })}</p>
                    <p className="text-xs text-slate-500 hidden sm:block">{renderLastSyncText()}</p>
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