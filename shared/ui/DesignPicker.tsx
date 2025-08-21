import React, { FC, useState, useMemo, useRef, useEffect } from 'react';
import { iconMap, Search, ColorPickerIcon, Button, ChevronLeft, ChevronRight } from '@/shared/ui';
import { iconGroups } from '@/shared/config/icon-groups';
import { clsx } from 'clsx';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981', 
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e', '#64748b',
  '#14b8a6', '#a3e635', '#7e22ce', '#475569', '#a16207'
];

const TABS = Object.keys(iconGroups);
const ITEMS_PER_PAGE = 32;

const IconPickerGrid: FC<{ onSelect: (iconName: string) => void; }> = ({ onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState(TABS[0]);
    const [currentPage, setCurrentPage] = useState(0);
    const gridRef = useRef<HTMLDivElement>(null);

    const availableIcons = useMemo(() => Object.keys(iconMap).sort(), []);
    
    const iconsForCurrentView = useMemo(() => {
        const hasSearchTerm = searchTerm.trim().length > 0;
        const source = hasSearchTerm
            ? availableIcons.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
            : (iconGroups[activeTab as keyof typeof iconGroups] || []).sort();
        return source;
    }, [searchTerm, activeTab, availableIcons]);

    const totalPages = Math.ceil(iconsForCurrentView.length / ITEMS_PER_PAGE);
    const paginatedIcons = useMemo(() => 
        iconsForCurrentView.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE),
        [iconsForCurrentView, currentPage]
    );

    useEffect(() => {
        setCurrentPage(0);
        gridRef.current?.scrollTo(0, 0);
    }, [searchTerm, activeTab]);

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
        gridRef.current?.scrollTo(0, 0);
    };

    const hasSearchTerm = searchTerm.trim().length > 0;

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 mb-2">
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
            {!hasSearchTerm && (
                 <nav className="flex-shrink-0 border-b border-slate-700/80 -mx-3 px-1">
                    <div className="flex space-x-1 overflow-x-auto custom-scrollbar">
                        {TABS.map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={clsx(
                                    'px-3 py-2 text-sm font-semibold transition-colors whitespace-nowrap border-b-2',
                                    activeTab === tab ? 'border-rose-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </nav>
            )}
            <div ref={gridRef} className="flex-grow overflow-y-auto custom-scrollbar -mr-3 pr-2 pt-3">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1">
                    {paginatedIcons.length === 0 ? (
                         <p className="col-span-full text-center text-slate-500 py-8">Keine Icons gefunden.</p>
                    ) : (
                        paginatedIcons.map(iconName => {
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
                        })
                    )}
                </div>
            </div>
             {totalPages > 1 && (
                <div className="flex-shrink-0 flex items-center justify-center gap-2 pt-3 text-sm">
                    <Button variant="ghost" size="icon-xs" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-slate-400 font-mono text-xs">
                        {currentPage + 1} / {totalPages}
                    </span>
                    <Button variant="ghost" size="icon-xs" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages - 1}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
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
            <div className="md:w-[220px] flex-shrink-0">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Farbe wählen</h3>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex flex-wrap gap-2.5 justify-center">
                        {PRESET_COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => handleColorChange(color)}
                                className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${value.color.toLowerCase() === color.toLowerCase() ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white' : ''}`}
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                        ))}
                        <ColorPickerIcon
                            onClick={handleColorPickerClick}
                            size={24}
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
            <div className="flex-grow flex flex-col min-h-[40vh] md:min-h-0 min-w-0">
                 <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2 flex-shrink-0">Icon wählen</h3>
                <div className="flex-grow min-h-0 p-3 bg-slate-800/50 rounded-lg">
                     <IconPickerGrid onSelect={handleIconChange} />
                </div>
            </div>
        </div>
    );
};

export default DesignPicker;