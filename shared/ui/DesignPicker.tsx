import React, { FC, useState, useMemo, useRef } from 'react';
import { iconMap, Search, ColorPickerIcon } from '@/shared/ui';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981', 
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e', '#64748b',
];

const IconPickerGrid: FC<{ onSelect: (iconName: string) => void; }> = ({ onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const availableIcons = useMemo(() => Object.keys(iconMap).sort(), []);
    const filteredIcons = useMemo(() => 
        availableIcons.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase())), 
        [availableIcons, searchTerm]
    );

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 mb-3">
                <div className="flex items-center bg-slate-700 border border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-rose-500 px-3">
                    <Search className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Icon suchen..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent border-none pl-2 py-2 text-white placeholder-slate-500 focus:outline-none"
                    />
                </div>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar -mr-3 pr-3">
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1">
                    {filteredIcons.map(iconName => {
                        const IconComponent = iconMap[iconName];
                        return (
                            <button 
                                key={iconName} 
                                onClick={() => onSelect(iconName)} 
                                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-slate-700 aspect-square" 
                                title={iconName}
                            >
                                <IconComponent className="h-5 w-5 text-slate-300" />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};


interface DesignPickerProps {
    value: { color: string; icon: string };
    onChange: (value: { color: string; icon: string }) => void;
}

export const DesignPicker: FC<DesignPickerProps> = ({ value, onChange }) => {
    const colorInputRef = useRef<HTMLInputElement>(null);

    const handleColorChange = (color: string) => {
        onChange({ ...value, color });
    };

    const handleIconChange = (icon: string) => {
        onChange({ ...value, icon });
    };
    
    const handleColorPickerClick = () => {
        colorInputRef.current?.click();
    };

    return (
        <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-[240px] flex-shrink-0">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Farbe wählen</h3>
                <div className="p-4 bg-slate-700/30 rounded-lg">
                    <div className="flex flex-wrap gap-3 justify-center">
                        {PRESET_COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => handleColorChange(color)}
                                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${value.color.toLowerCase() === color.toLowerCase() ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white' : ''}`}
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                        ))}
                        <ColorPickerIcon
                            onClick={handleColorPickerClick}
                            size={32}
                        />
                        <input
                            ref={colorInputRef}
                            type="color"
                            value={value.color}
                            onChange={e => handleColorChange(e.target.value)}
                            className="absolute w-0 h-0 opacity-0 pointer-events-none"
                            tabIndex={-1}
                        />
                    </div>
                </div>
            </div>
            <div className="flex-grow flex flex-col min-h-[50vh] md:min-h-0">
                 <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2 flex-shrink-0">Icon wählen</h3>
                <div className="flex-grow min-h-0 p-4 bg-slate-700/30 rounded-lg">
                     <IconPickerGrid onSelect={handleIconChange} />
                </div>
            </div>
        </div>
    );
};

export default DesignPicker;