import React, { FC } from 'react';
import { clsx } from 'clsx';

export const StatCard: FC<{ icon: FC<any>, title: string, value: string, subValue?: string, iconClassName?: string }> = ({ icon: Icon, title, value, subValue, iconClassName }) => (
    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex items-center gap-4">
        <div className="bg-slate-700 p-3 rounded-full">
            <Icon className={clsx("h-6 w-6 text-rose-400", iconClassName)} />
        </div>
        <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-xl font-bold text-white truncate">{value}</p>
            {subValue && <p className="text-xs text-rose-300 font-semibold">{subValue}</p>}
        </div>
    </div>
);