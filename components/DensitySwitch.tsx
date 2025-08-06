import React, { FC } from 'react';
import { Shrink, Expand } from './Icons';

type Density = 'normal' | 'compact';

interface DensitySwitchProps {
  density: Density;
  onChange: (density: Density) => void;
}

const DensitySwitch: FC<DensitySwitchProps> = ({ density, onChange }) => {
    const isCompact = density === 'compact';
    const Icon = isCompact ? Expand : Shrink;
    const label = isCompact ? "Normale Ansicht" : "Kompakte Ansicht";
    
    return (
        <button
            onClick={() => onChange(isCompact ? 'normal' : 'compact')}
            role="switch"
            aria-checked={isCompact}
            aria-label={label}
            title={label}
            className="relative p-2 rounded-full transition-colors text-slate-400 hover:bg-slate-700 hover:text-white"
        >
            <Icon className="h-5 w-5" />
        </button>
    );
};

export default DensitySwitch;
