import React, { useState, useMemo, FC } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Brush } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import { de, format, parseISO, subDays } from '../utils/dateUtils';
import type { Transaction, Category, Tag } from '../types';
import { useApp } from '../contexts/AppContext';
import { formatCurrency } from '../utils/dateUtils';
import { aggregateTransactions, calculateDerivedSeries, type AggregationType, type TimeSeriesDataPoint } from '../utils/series';
import { SlidersHorizontal, ChevronDown, CheckSquare, Square } from './Icons';


// Custom Tooltip for better formatting
const CustomTooltip: FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-700/80 backdrop-blur-sm p-3 rounded-lg border border-slate-600 shadow-xl">
                <p className="font-bold text-white mb-2">{format(parseISO(label), 'eeee, d. MMM yyyy', { locale: de })}</p>
                <div className="space-y-1">
                    {payload.map((p: any) => (
                        <div key={p.dataKey} className="flex justify-between items-center text-sm">
                            <span style={{ color: p.stroke }} className="font-semibold">{p.name}:</span>
                            <span className="font-mono ml-4 text-white">{formatCurrency(p.value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const MultiSelectPicker: FC<{
    label: string;
    items: {id: string, name: string}[];
    selected: string[];
    onChange: (selected: string[]) => void;
}> = ({ label, items, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    const toggleItem = (id: string) => {
        onChange(selected.includes(id) ? selected.filter(i => i !== id) : [...selected, id]);
    };
    
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-slate-700/80 border border-slate-600 rounded-lg px-3 py-1.5 text-left text-white flex justify-between items-center text-sm"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className="truncate">{selected.length === 0 ? `Alle ${label}` : `${selected.length} ${label} gewählt`}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
            {isOpen && (
                <motion.div initial={{opacity: 0, y: -5}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -5}} className="absolute z-30 top-full mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                    <div className="p-2">
                        <button onClick={() => onChange([])} className="w-full text-left px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-700 rounded-md">Alle zurücksetzen</button>
                    </div>
                    {items.map(item => (
                        <label key={item.id} className="flex items-center gap-3 p-2 hover:bg-slate-700/50 cursor-pointer">
                            {selected.includes(item.id) ? <CheckSquare className="h-4 w-4 text-rose-400" /> : <Square className="h-4 w-4 text-slate-500"/>}
                            <span className="text-white text-sm font-medium truncate">{item.name}</span>
                        </label>
                    ))}
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};


interface SpendingTimeSeriesProps {
    transactions: Transaction[];
    defaultRangeInDays?: number;
    defaultAggregation?: AggregationType;
}

const SpendingTimeSeries: FC<SpendingTimeSeriesProps> = ({
    transactions,
    defaultRangeInDays = 30,
    defaultAggregation = 'day',
}) => {
    const { categories, allAvailableTags } = useApp();

    // Filter states
    const [dateRange, setDateRange] = useState(() => ({
        from: subDays(new Date(), defaultRangeInDays - 1),
        to: new Date(),
    }));
    const [aggregation, setAggregation] = useState<AggregationType>(defaultAggregation);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isFilterPanelOpen, setFilterPanelOpen] = useState(false);

    // Visibility state for chart lines
    const [visibleSeries, setVisibleSeries] = useState({
        sum: true,
        cumulative: false,
        rollingMean7: false,
        rollingMean30: false,
    });

    // Memoized data processing pipeline
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const tDate = parseISO(t.date);
            if (tDate < dateRange.from || tDate > dateRange.to) return false;
            if (selectedCategories.length > 0 && !selectedCategories.includes(t.categoryId)) return false;
            if (selectedTags.length > 0 && !t.tagIds?.some(tagId => selectedTags.includes(tagId))) return false;
            return true;
        });
    }, [transactions, dateRange, selectedCategories, selectedTags]);

    const chartData = useMemo(() => {
        const aggregated = aggregateTransactions(filteredTransactions, aggregation, dateRange);
        return calculateDerivedSeries(aggregated);
    }, [filteredTransactions, aggregation, dateRange]);

    const handleLegendClick = (dataKey: string) => {
        setVisibleSeries(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
    };
    
    const setDatePreset = (days: number) => {
        setDateRange({ from: subDays(new Date(), days-1), to: new Date() });
    };

    const seriesConfig = [
        { name: 'Ausgaben', dataKey: 'sum', color: '#f43f5e', active: visibleSeries.sum },
        { name: 'Kumulativ', dataKey: 'cumulative', color: '#3b82f6', active: visibleSeries.cumulative },
        { name: 'Ø 7 Tage', dataKey: 'rollingMean7', color: '#f97316', active: visibleSeries.rollingMean7 },
        { name: 'Ø 30 Tage', dataKey: 'rollingMean30', color: '#14b8a6', active: visibleSeries.rollingMean30 },
    ];
    
    return (
        <div className="bg-slate-800/50 p-4 sm:p-6 rounded-2xl border border-slate-700/50 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
                 <h3 className="text-lg font-bold text-white">Ausgabenverlauf</h3>
                 <button 
                    onClick={() => setFilterPanelOpen(!isFilterPanelOpen)} 
                    className="p-2 rounded-full hover:bg-slate-700 text-slate-300 transition-colors"
                    aria-label="Filter anzeigen/verbergen"
                    aria-expanded={isFilterPanelOpen}
                >
                    <SlidersHorizontal className="h-5 w-5" />
                 </button>
            </div>
            
            <AnimatePresence>
            {isFilterPanelOpen && (
                <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} exit={{opacity: 0, height: 0}} className="overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 pb-4 border-b border-slate-700">
                        {/* Date Range */}
                        <div className="lg:col-span-2 space-y-2">
                             <label className="text-xs font-semibold text-slate-400">Zeitraum</label>
                             <div className="flex items-center bg-slate-800 p-1 rounded-full text-sm">
                                {[30, 90, 365].map(days => (
                                    <button key={days} onClick={() => setDatePreset(days)} className={`flex-1 px-3 py-1 rounded-full font-semibold transition-colors ${dateRange.from.getTime() === subDays(new Date(), days-1).getTime() ? 'bg-slate-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}>{days} Tage</button>
                                ))}
                             </div>
                        </div>
                        {/* Aggregation */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400">Ansicht</label>
                            <div className="flex items-center bg-slate-800 p-1 rounded-full text-sm">
                                {(['day', 'week', 'month'] as AggregationType[]).map(agg => (
                                    <button key={agg} onClick={() => setAggregation(agg)} className={`flex-1 px-3 py-1 rounded-full font-semibold transition-colors ${aggregation === agg ? 'bg-slate-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}>{agg === 'day' ? 'Tag' : agg === 'week' ? 'Woche' : 'Monat'}</button>
                                ))}
                            </div>
                        </div>
                        {/* Custom Date Inputs */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <label htmlFor="date-from" className="text-xs font-semibold text-slate-400">Von</label>
                                <input id="date-from" type="date" value={format(dateRange.from, 'yyyy-MM-dd')} onChange={e => setDateRange(prev => ({ ...prev, from: parseISO(e.target.value)}))} className="w-full bg-slate-700/80 border-slate-600 rounded-md p-1.5 text-sm text-white"/>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="date-to" className="text-xs font-semibold text-slate-400">Bis</label>
                                <input id="date-to" type="date" value={format(dateRange.to, 'yyyy-MM-dd')} onChange={e => setDateRange(prev => ({ ...prev, to: parseISO(e.target.value)}))} className="w-full bg-slate-700/80 border-slate-600 rounded-md p-1.5 text-sm text-white"/>
                            </div>
                        </div>
                        {/* Category & Tag Selectors */}
                         <div className="lg:col-span-2 space-y-2">
                             <label className="text-xs font-semibold text-slate-400">Kategorien</label>
                             <MultiSelectPicker label="Kategorien" items={categories} selected={selectedCategories} onChange={setSelectedCategories} />
                         </div>
                         <div className="lg:col-span-2 space-y-2">
                             <label className="text-xs font-semibold text-slate-400">Tags</label>
                             <MultiSelectPicker label="Tags" items={allAvailableTags} selected={selectedTags} onChange={setSelectedTags} />
                         </div>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
            
            <div className="h-80 pr-4 -ml-4">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#475569" strokeOpacity={0.5} />
                            <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), 'd. MMM', { locale: de })} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis tickFormatter={(v) => formatCurrency(v)} stroke="#94a3b8" fontSize={12} width={80} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend onClick={(e: any) => handleLegendClick(e.dataKey)} wrapperStyle={{fontSize: '12px', paddingTop: '20px'}} />
                            
                            {seriesConfig.filter(s => s.active).map(s => (
                                <Line
                                    key={s.dataKey}
                                    type="monotone"
                                    dataKey={s.dataKey}
                                    name={s.name}
                                    stroke={s.color}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 2, fill: s.color }}
                                    connectNulls={true}
                                />
                            ))}

                            <Brush 
                                dataKey="date" 
                                height={30} 
                                stroke="#f43f5e" 
                                fill="#27272a"
                                tickFormatter={(d) => format(parseISO(d as string), 'd.M', { locale: de })}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">
                        <p>Keine Daten für den gewählten Zeitraum oder Filter.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SpendingTimeSeries;
