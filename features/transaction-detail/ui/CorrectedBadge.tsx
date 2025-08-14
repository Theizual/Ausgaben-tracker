import React from 'react';
import { Edit } from '@/shared/ui';

export const CorrectedBadge = () => (
    <div 
        className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-semibold"
        title="Der Betrag dieser Transaktion wurde manuell festgelegt und wird von der automatischen Verteilung ausgeschlossen."
    >
        <Edit className="h-3 w-3" />
        <span>Korrigiert</span>
    </div>
);
