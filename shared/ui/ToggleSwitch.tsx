import React, { FC } from 'react';
import { clsx } from 'clsx';

export const ToggleSwitch: FC<{ enabled: boolean; setEnabled: (enabled: boolean) => void; id?: string }> = ({ enabled, setEnabled, id }) => (
    <button
        id={id}
        type="button"
        className={clsx(
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-theme-ring focus:ring-offset-2 focus:ring-offset-slate-800',
            enabled ? 'bg-theme-primary' : 'bg-slate-600'
        )}
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled(!enabled)}
    >
        <span className="sr-only">Toggle</span>
        <span
            aria-hidden="true"
            className={clsx(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                enabled ? 'translate-x-5' : 'translate-x-0'
            )}
        />
    </button>
);