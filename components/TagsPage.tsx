

import React, { useState, useMemo, FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useApp } from '../contexts/AppContext';
import type { Transaction, Category, Tag, PeriodType } from '../types';
import { 
    format, parseISO, formatCurrency, de, isWithinInterval, addMonths, subMonths, 
    addYears, subYears, getMonthInterval, getYearInterval,
    addDays, differenceInDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear
} from '../utils/dateUtils';
import { Hash, Coins, BarChart2, ChevronLeft, ChevronRight, X, Plus, Search } from './Icons';
import StandardTransactionItem from './StandardTransactionItem';
import { TagPill } from './ui/TagPill';

const AllTagsModal: FC<{
    allTags: Tag[];
    selectedTagIds: string[];
    onTagClick: (tagId: string) => void;
    onClose: () => void;
}> = ({ allTags, selectedTagIds, onTagClick, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredTags = useMemo(() => 
        allTags
            .filter(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a,b) => a.name.localeCompare(b.name)),
        [allTags, searchTerm]
    );

    return (
        <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-700 flex flex-col max-h-[70vh]"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-4 border-b border-slate-700 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Weitere Tags suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md pl-8 pr-3 py-1.5 text-white placeholder-slate-500 text-sm"
                            autoFocus
                        />
                    </div>
                </header>
                <main className="p-4 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                         {filteredTags.map(tag => (
                             <TagPill
                                key={tag.id}
                                tagName={tag.name}
                                selected={selectedTagIds.includes(tag.id)}
                                onClick={() => onTagClick(tag.id)}
                            />
                        ))}
                        {filteredTags.length === 0 && <p className="text-slate-500 text-center w-full">Keine passenden Tags gefunden.</p>}
                    </div>
                </main>
                 <footer className="p-4 border-t border-slate-700 flex-shrink-0 text-right">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-600 hover:bg-slate-500">
                        Schließen
                    </button>
                </footer>
            </motion.div>
        </motion.div>
    );
};

const MultiTagPicker: FC<{
    allTags: Tag[];
    recentTags: Tag[];
    selectedTagIds: string[];
    onSelectionChange: (ids: string[]) => void;
}> = ({ allTags, recentTags, selectedTagIds, onSelectionChange }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleTagClick = (tagId: string) => {
        const newSelection = selectedTagIds.includes(tagId)
            ? selectedTagIds.filter(id => id !== tagId)
            : [...selectedTagIds, tagId];
        onSelectionChange(newSelection);
    };

    const otherTags = useMemo(() => {
        const recentTagIds = new Set(recentTags.map(t => t.id));
        return allTags.filter(tag => !recentTagIds.has(tag.id));
    }, [allTags, recentTags]);

    return (
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                Tags zur Analyse auswählen
            </h4>
            <div className="flex flex-wrap gap-2">
                {recentTags.map(tag => (
                    <TagPill
                        key={tag.id}
                        tagName={tag.name}
                        selected={selectedTagIds.includes(tag.id)}
                        onClick={() => handleTagClick(tag.id)}
                        size="md"
                    />
                ))}
                {otherTags.length > 0 && (
                     <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-3 py-1.5 text-sm font-semibold rounded-full transition-colors bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center gap-1.5"
                    >
                        <Plus className="h-4 w-4" />
                        Weitere
                    </button>
                )}
            </div>
            
            <AnimatePresence>
                {isModalOpen && (
                    <AllTagsModal
                        allTags={otherTags}
                        selectedTagIds={selectedTagIds}
                        onTagClick={handleTagClick}
                        onClose={() => setIsModalOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const PeriodNavigator: FC<{
    periodType: PeriodType;
    setPeriodType: (type: PeriodType) => void;
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    customDateRange: { start: string, end: string };
    setCustomDateRange: (range: { start: string, end: string }) => void;
}> = ({ periodType, setPeriodType, currentDate, setCurrentDate, customDateRange, setCustomDateRange }) => {
    
    const periodButtons: { id: PeriodType, label: string }[] = [
        { id: 'last3Months', label: 'Letzte 3 Monate' },
        { id: 'month', label: 'Monat' },
        { id: 'year', label: 'Jahr' },
        { id: 'custom', label: 'Zeitraum' },
    ];
    
    const changeDate = (direction: 'prev' | 'next') => {
        if (periodType !== 'month' && periodType !== 'year') return;
        const amount = direction === 'prev' ? -1 : 1;
        if (periodType === 'month') {
            setCurrentDate(addMonths(currentDate, amount));
        } else {
            setCurrentDate(addYears(currentDate, amount));
        }
    };

    const getPeriodLabel = () => {
        switch(periodType) {
            case 'last3Months': return 'Letzte 3 Monate';
            case 'month': return format(currentDate, 'MMMM yyyy', { locale: de });
            case 'year': return format(currentDate, 'yyyy', { locale: de });
            case 'custom': return 'Benutzerdefiniert';
        }
    };

    const isNavDisabled = periodType === 'last3Months' || periodType === 'custom';

    return (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
            <div className="bg-slate-800 p-1 rounded-full flex items-center self-start sm:self-center flex-wrap">
                {periodButtons.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setPeriodType(p.id)}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors duration-300 whitespace-nowrap ${
                            periodType === p.id
                                ? 'bg-rose-600 text-white'
                                : 'text-slate-300 hover:bg-slate-700/50'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>
            
            <AnimatePresence mode="wait">
                {periodType === 'custom' ? (
                    <motion.div 
                        key="custom"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-2 overflow-hidden"
                    >
                        <input
                            type="date"
                            value={customDateRange.start}
                            onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                            className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-white text-sm"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                            type="date"
                            value={customDateRange.end}
                            onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                            className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-white text-sm"
                        />
                    </motion.div>
                ) : (
                    <motion.div 
                        key="nav"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-4"
                    >
                        <button onClick={() => changeDate('prev')} disabled={isNavDisabled} className="p-2 rounded-full hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="h-5 w-5" /></button>
                        <span className="font-bold text-white w-40 text-center">{getPeriodLabel()}</span>
                        <button onClick={() => changeDate('next')} disabled={isNavDisabled} className="p-2 rounded-full hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="h-5 w-5" /></button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

type AppContextSubset = Omit<ReturnType<typeof useApp>,
    'allAvailableTags' |
    'selectedTagIdsForAnalysis' |
    'handleSelectTagForAnalysis' |
    'tagsPeriodType' |
    'setTagsPeriodType' |
    'tagsCurrentDate' |
    'setTagsCurrentDate' |
    'tagsCustomDateRange' |
    'setTagsCustomDateRange'
>;

const TagDetailView: FC<{
    tagIds: string[],
    periodType: PeriodType,
    currentDate: Date,
    customDateRange: { start: string, end: string },
    appContext: AppContextSubset
}> = ({ tagIds, periodType, currentDate, customDateRange, appContext }) => {
    const { transactions, tagMap, handleTransactionClick } = appContext;
    const formattedTagNames = tagIds.map(id => `#${tagMap.get(id) || 'Unbekannt'}`).join(', ');

    const { filteredTransactions, interval } = useMemo(() => {
        let start: Date, end: Date;
        const now = new Date();

        switch (periodType) {
            case 'last3Months':
                start = startOfMonth(subMonths(now, 2));
                end = endOfDay(now);
                break;
            case 'month':
                start = startOfMonth(currentDate);
                end = endOfMonth(currentDate);
                break;
            case 'year':
                start = startOfYear(currentDate);
                end = endOfYear(currentDate);
                break;
            case 'custom':
                try {
                    start = startOfDay(parseISO(customDateRange.start));
                    end = endOfDay(parseISO(customDateRange.end));
                } catch {
                    start = new Date(); end = new Date(); // fallback
                }
                break;
        }
        
        const filtered = transactions
            .filter(t => t.tagIds?.some(tagId => tagIds.includes(tagId)) && isWithinInterval(parseISO(t.date), {start, end}))
            .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

        return { filteredTransactions: filtered, interval: { start, end } };
    }, [tagIds, transactions, periodType, currentDate, customDateRange]);

    const chartMetrics = useMemo(() => {
        if (filteredTransactions.length === 0) {
            return { chartData: [], averages: {}, colors: {}, earliestDate: null };
        }

        const colors: Record<string, string> = {};
        const colorPalette = ['#f43f5e', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#64748b', '#06b6d4', '#d946ef'];
        tagIds.forEach((id, index) => {
            colors[id] = colorPalette[index % colorPalette.length];
        });

        const earliestTransactionDate = filteredTransactions.reduce((earliest, t) => {
            const tDate = parseISO(t.date);
            return tDate < earliest ? tDate : earliest;
        }, new Date());

        const chartStartDate = startOfDay(earliestTransactionDate);
        const chartEndDate = interval.end;
        const diffDays = differenceInDays(chartEndDate, chartStartDate);

        const groupByMonth = periodType === 'year' || (periodType === 'custom' && diffDays > 92);
        
        const dataMap = new Map<string, any>();
        let currentDatePointer = chartStartDate;

        while (currentDatePointer <= chartEndDate) {
            const key = groupByMonth ? format(currentDatePointer, 'yyyy-MM') : format(currentDatePointer, 'yyyy-MM-dd');
            if (!dataMap.has(key)) {
                const entry: any = { date: key };
                tagIds.forEach(id => { entry[id] = 0; });
                dataMap.set(key, entry);
            }
            currentDatePointer = groupByMonth ? addMonths(currentDatePointer, 1) : addDays(currentDatePointer, 1);
        }

        const tagTotals: Record<string, number> = {};
        tagIds.forEach(id => { tagTotals[id] = 0; });

        filteredTransactions.forEach(t => {
            const tDate = parseISO(t.date);
            const key = groupByMonth ? format(tDate, 'yyyy-MM') : format(tDate, 'yyyy-MM-dd');
            if (dataMap.has(key)) {
                t.tagIds?.forEach(tagId => {
                    if (tagIds.includes(tagId)) {
                        dataMap.get(key)[tagId] += t.amount;
                        tagTotals[tagId] += t.amount;
                    }
                });
            }
        });
        
        const averages: Record<string, number> = {};
        const numberOfUnits = dataMap.size;
        if (numberOfUnits > 0) {
            tagIds.forEach(id => { averages[id] = tagTotals[id] / numberOfUnits; });
        }
        
        dataMap.forEach(entry => {
            tagIds.forEach(id => { entry[`avg_${id}`] = averages[id]; });
        });

        const chartData = Array.from(dataMap.values()).sort((a,b) => a.date.localeCompare(b.date));

        return { chartData, averages, colors, earliestDate: chartStartDate };
    }, [filteredTransactions, tagIds, interval, periodType]);

    const stats = useMemo(() => {
        const total = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
        return { total, count: filteredTransactions.length };
    }, [filteredTransactions]);

    if (filteredTransactions.length === 0) {
        return (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-96 bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 text-center">
                 <Hash className="text-slate-600 h-12 w-12 mb-4" />
                 <h2 className="text-xl font-bold text-white">Keine Daten für {formattedTagNames}</h2>
                 <p className="text-slate-400">Für den gewählten Zeitraum gibt es keine Transaktionen mit diesen Tags.</p>
            </motion.div>
        )
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
                {formattedTagNames}
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard icon={Coins} title="Gesamtausgaben" value={formatCurrency(stats.total)} />
                <StatCard icon={BarChart2} title="Transaktionen" value={stats.count.toString()} />
            </div>

             <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <div className="mb-4">
                    <h3 className="font-bold text-white">Ausgaben im Zeitverlauf</h3>
                    <p className="text-sm text-slate-400">{`${format(interval.start, 'd. MMM yyyy', { locale: de })} - ${format(interval.end, 'd. MMM yyyy', { locale: de })}`}</p>
                </div>
                <div className="h-72 pr-4 -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={chartMetrics.chartData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                             <defs>
                                {tagIds.map(id => (
                                     <linearGradient key={`grad-${id}`} id={`color-${id}`} x1="0" y1="0" x2="0" y2="1">
                                         <stop offset="5%" stopColor={chartMetrics.colors[id]} stopOpacity={0.4}/>
                                         <stop offset="95%" stopColor={chartMetrics.colors[id]} stopOpacity={0}/>
                                     </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#475569" strokeOpacity={0.3}/>
                            <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), chartMetrics.chartData.length > 31 ? 'MMM yy' : 'd. MMM', {locale: de})} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                            <YAxis tickFormatter={(v) => formatCurrency(v)} stroke="#94a3b8" fontSize={12} width={80} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip tagMap={tagMap} />} cursor={{ stroke: '#f43f5e', strokeWidth: 1, strokeDasharray: '3 3' }}/>
                            <Legend wrapperStyle={{paddingTop: '20px'}} />
                            {tagIds.map(id => (
                                <React.Fragment key={id}>
                                    <Area
                                        type="monotone"
                                        dataKey={id}
                                        name={tagMap.get(id) || 'Unbekannt'}
                                        stroke={chartMetrics.colors[id]}
                                        strokeWidth={2.5}
                                        fillOpacity={1}
                                        fill={`url(#color-${id})`}
                                        dot={false}
                                        activeDot={{ r: 6, stroke: '#111827', strokeWidth: 2, fill: chartMetrics.colors[id] }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey={`avg_${id}`}
                                        name={`Ø ${tagMap.get(id)}`}
                                        stroke={chartMetrics.colors[id]}
                                        strokeWidth={1.5}
                                        strokeDasharray="3 5"
                                        dot={false}
                                        activeDot={false}
                                        legendType="none"
                                    />
                                </React.Fragment>
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <h3 className="font-bold text-white mb-4">Transaktionen ({filteredTransactions.length})</h3>
                <div className="max-h-96 overflow-y-auto space-y-1 pr-2">
                    {filteredTransactions.map(t => (
                        <StandardTransactionItem
                            key={t.id}
                            transaction={t}
                            onClick={() => handleTransactionClick(t)}
                            showSublineInList="date"
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    )
}


const TagsPage: FC = () => {
    const { 
        allAvailableTags,
        transactions,
        selectedTagIdsForAnalysis,
        handleSelectTagForAnalysis,
        tagsPeriodType,
        setTagsPeriodType,
        tagsCurrentDate,
        setTagsCurrentDate,
        tagsCustomDateRange,
        setTagsCustomDateRange,
        ...rest
    } = useApp();

    const recentlyUsedTags = useMemo(() => {
        const sortedTransactions = [...transactions].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        const recentTagIds = new Set<string>();

        for (const transaction of sortedTransactions) {
            if (recentTagIds.size >= 20) break;
            if (transaction.tagIds) {
                for (const tagId of transaction.tagIds) {
                    if (recentTagIds.size >= 20) break;
                    recentTagIds.add(tagId);
                }
            }
        }
        
        const tagMap = new Map(allAvailableTags.map(t => [t.id, t]));
        return Array.from(recentTagIds).map(id => tagMap.get(id)).filter((t): t is Tag => !!t);
    }, [transactions, allAvailableTags]);


    if (allAvailableTags.length === 0) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-white">Tag-Analyse</h1>
                <div className="flex items-center justify-center h-96 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <p className="text-slate-500">Keine Tags vorhanden. Fügen Sie bei einer Transaktion einen neuen Tag hinzu.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Tag-Analyse</h1>
            
            <MultiTagPicker 
                allTags={allAvailableTags}
                recentTags={recentlyUsedTags}
                selectedTagIds={selectedTagIdsForAnalysis}
                onSelectionChange={handleSelectTagForAnalysis}
            />

            <PeriodNavigator
                periodType={tagsPeriodType}
                setPeriodType={setTagsPeriodType}
                currentDate={tagsCurrentDate}
                setCurrentDate={setTagsCurrentDate}
                customDateRange={tagsCustomDateRange}
                setCustomDateRange={setTagsCustomDateRange}
            />

            <AnimatePresence mode="wait">
                {selectedTagIdsForAnalysis.length > 0 ? (
                    <motion.div
                        key={selectedTagIdsForAnalysis.join('-')}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <TagDetailView
                            tagIds={selectedTagIdsForAnalysis}
                            periodType={tagsPeriodType}
                            currentDate={tagsCurrentDate}
                            customDateRange={tagsCustomDateRange}
                            appContext={{ ...rest, transactions }}
                        />
                    </motion.div>
                ) : (
                     <div className="flex flex-col items-center justify-center h-96 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-center">
                         <Hash className="text-slate-600 h-12 w-12 mb-4" />
                         <h2 className="text-xl font-bold text-white">Wählen Sie Tags zur Analyse aus</h2>
                         <p className="text-slate-400">Klicken Sie oben auf einen Tag, um zu beginnen.</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};


const StatCard: FC<{ icon: FC<any>, title: string, value: string, subValue?: string }> = ({ icon: Icon, title, value, subValue }) => (
    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex items-center gap-4">
        <div className="bg-slate-700 p-3 rounded-full">
            <Icon className="h-6 w-6 text-rose-400" />
        </div>
        <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-xl font-bold text-white truncate">{value}</p>
            {subValue && <p className="text-xs text-rose-300 font-semibold">{subValue}</p>}
        </div>
    </div>
);

const CustomTooltip = ({ active, payload, label, tagMap }: any) => {
    if (active && payload && payload.length) {
        const formattedLabel = label ? (
            label.includes('-') 
                ? format(parseISO(label), label.length > 7 ? 'eeee, d. MMM' : 'MMMM yyyy', { locale: de }) 
                : label
            ) : '';
        
        const entries = payload
            .filter(p => !p.dataKey.startsWith('avg_') && p.value > 0) // Exclude averages and zero values
            .map(p => ({
                name: p.name,
                value: p.value,
                color: p.stroke,
            }))
            .sort((a,b) => b.value - a.value);

        if (entries.length === 0) return null;

        return (
            <div className="bg-slate-700 p-3 rounded-lg border border-slate-600 shadow-xl">
                 <p className="text-sm text-slate-400 mb-1">{formattedLabel}</p>
                 {entries.map(entry => (
                     <div key={entry.name} className="flex justify-between items-center gap-4">
                        <span className="font-semibold text-sm flex items-center gap-2" style={{color: entry.color}}>
                             <div className="h-2 w-2 rounded-full" style={{backgroundColor: entry.color}} />
                             {entry.name}
                        </span>
                        <span className="font-bold text-white text-sm">
                            {formatCurrency(entry.value)}
                        </span>
                    </div>
                 ))}
            </div>
        );
    }
    return null;
};

export default TagsPage;