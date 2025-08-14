import React, { useMemo, FC, useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { Transaction, Category } from '@/shared/types';
import { eachDayOfInterval, format, parseISO, startOfMonth, endOfMonth, isAfter, getDate, getDaysInMonth, isSameDay } from 'date-fns';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { TrendingDown, X } from '@/shared/ui';
import { FIXED_COSTS_GROUP_ID, CHART_COLOR_PALETTE } from '@/constants';
import { useApp } from '@/contexts/AppContext';
import { ChartControls, ResizeHandle } from '@/shared/ui';

interface BudgetBurndownChartProps {
    transactions: Transaction[];
    categoryMap: Map<string, Category>;
    currentMonth: Date;
}

interface ItemInfo {
    name: string;
    budget: number;
    color: string;
    itemIds: string[]; // Category IDs belonging to this item
    totalSpent: number;
}

interface ItemInfoWithTrend extends ItemInfo {
    averageDailySpend: number;
    projectedEndValue: number;
    isTrendNegative: boolean;
}

const CustomTooltip = ({ active, payload, label, deLocale, locked }: any) => {
    if (active && payload && payload.length) {
        const date = new Date(label);
        const formattedDate = format(date, 'd. MMMM', { locale: deLocale });

        const dataKeys = [...new Set(payload.map((p: any) => p.dataKey.replace('_trend', '')))];

        const entries = dataKeys
            .map(key => {
                const actualPayload = payload.find((p: any) => p.dataKey === key);
                const trendPayload = payload.find((p: any) => p.dataKey === `${key}_trend`);
                const valueToShow = actualPayload?.value ?? trendPayload?.value;

                if (valueToShow === null || valueToShow === undefined) return null;

                return {
                    name: actualPayload?.name || trendPayload?.name,
                    value: valueToShow,
                    color: actualPayload?.stroke || trendPayload?.stroke,
                    isTrend: !actualPayload?.value && !!trendPayload?.value,
                };
            })
            .filter((e): e is NonNullable<typeof e> => e !== null)
            .sort((a, b) => b.value - a.value);

        if (entries.length === 0) return null;

        return (
            <div className="bg-slate-700 p-3 rounded-lg border border-slate-600 shadow-xl min-w-[280px]">
                <p className="font-bold text-white mb-2 flex justify-between items-center">{formattedDate} {locked && <span className="text-xs font-mono bg-slate-600 px-1.5 py-0.5 rounded">LOCKED</span>}</p>
                <div className="space-y-1.5">
                    {entries.map((p: any) => (
                        <div key={p.name} className="flex justify-between items-center text-sm gap-4">
                            <div className="flex items-center gap-2 truncate">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                                <span className="text-slate-300 truncate" style={{ color: p.color }}>{p.name}</span>
                            </div>
                            <span className="font-mono text-white font-semibold flex-shrink-0">
                                {p.isTrend && <span className="text-slate-400 mr-1 text-xs">(Prognose)</span>}
                                {formatCurrency(p.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const DEFAULT_HEIGHT = 350;

const LockedTooltipComponent: FC<{
    payload: any[] | null;
    items: ItemInfoWithTrend[];
    onClose: () => void;
}> = ({ payload, items, onClose }) => {
    const { deLocale } = useApp();

    const animation = {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: { duration: 0.2 },
    };

    if (!payload || payload.length === 0) return <AnimatePresence />;

    const dataPoint = payload[0].payload;
    const formattedLabel = dataPoint.date
        ? format(new Date(dataPoint.date), 'eeee, d. MMM yyyy', { locale: deLocale })
        : '';

    const entries = payload
        .map((p) => {
            const item = items.find((i) => i.name === p.dataKey.replace('_trend', ''));
            if (!item || p.value === null || p.value === undefined) return null;
            const isTrend = p.dataKey.includes('_trend');
            return {
                name: item.name,
                value: p.value,
                color: item.color,
                isTrend,
            };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null)
        .sort((a, b) => b.value - a.value);

    if (entries.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div {...animation} className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="bg-slate-700/50 p-3 rounded-lg relative">
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-slate-600/50"
                        aria-label="Fixierten Tooltip schließen"
                    >
                        <X className="h-4 w-4 text-slate-400" />
                    </button>
                    <h4 className="font-bold text-white mb-2">{formattedLabel}</h4>
                    <div className="space-y-1.5">
                        {entries.map((entry) => (
                            <div key={entry.name} className="flex justify-between items-center text-sm gap-4">
                                <div className="flex items-center gap-2 truncate">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                    <span className="text-slate-300 truncate" style={{ color: entry.color }}>
                                        {entry.name}
                                    </span>
                                </div>
                                <span className="font-mono text-white font-semibold flex-shrink-0">
                                    {entry.isTrend && <span className="text-slate-400 mr-1 text-xs">(Prognose)</span>}
                                    {formatCurrency(entry.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};


export const BudgetBurndownChart: FC<BudgetBurndownChartProps> = ({ transactions, currentMonth }) => {
    const { deLocale, flexibleCategories, groups, statisticsSelectedDay, setStatisticsSelectedDay } = useApp();
    const [inactiveLegendItems, setInactiveLegendItems] = useState<string[]>([]);
    const [hoveredLegendItem, setHoveredLegendItem] = useState<string | null>(null);
    const [zoomAxis, setZoomAxis] = useState<'x' | 'y'>('x');
    const [chartHeight, setChartHeight] = useState(DEFAULT_HEIGHT);
    const [domain, setDomain] = useState<{ x: [any, any]; y: [any, any] }>({ x: ['dataMin', 'dataMax'], y: [0, 'auto'] });
    const dataRef = useRef<{ data: any[], items: ItemInfoWithTrend[] }>({ data: [], items: [] });
    const [lockedTooltipPayload, setLockedTooltipPayload] = useState<any[] | null>(null);
    
    const allItems = useMemo(() => {
        const allPotentialItems = groups
            .filter(group => group.id !== FIXED_COSTS_GROUP_ID)
            .map((group, index) => {
                const groupCategories = flexibleCategories.filter(c => c.groupId === group.id);
                const groupBudget = groupCategories.reduce((sum, c) => sum + (c.budget || 0), 0);
                if (groupBudget <= 0) return null;
                return {
                    name: group.name,
                    budget: groupBudget,
                    color: group.color || CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length],
                    itemIds: groupCategories.map(c => c.id),
                    totalSpent: 0
                };
            })
            .filter((item): item is ItemInfo => item !== null);

        const spendingPerCategory = new Map<string, number>();
        transactions.forEach(t => {
            spendingPerCategory.set(t.categoryId, (spendingPerCategory.get(t.categoryId) || 0) + t.amount);
        });

        allPotentialItems.forEach(item => {
            item.totalSpent = item.itemIds.reduce((sum, catId) => sum + (spendingPerCategory.get(catId) || 0), 0);
        });

        return allPotentialItems.sort((a, b) => b.totalSpent - a.totalSpent);
    }, [groups, flexibleCategories, transactions]);

    const { data, activeItems, endangeredGroups } = useMemo(() => {
        const itemsToTrack: ItemInfo[] = allItems;
        if (itemsToTrack.length === 0) return { data: [], activeItems: [], endangeredGroups: [] };

        const today = new Date();
        const startOfCurrentMonth = startOfMonth(currentMonth);
        const endOfCurrentMonth = endOfMonth(currentMonth);
        const daysInMonthArray = eachDayOfInterval({ start: startOfCurrentMonth, end: endOfCurrentMonth });
        const totalDaysInMonth = getDaysInMonth(currentMonth);

        const spendingPerDayPerCategory = new Map<string, Map<string, number>>();
        transactions.forEach(t => {
            try {
                if (!t.date) return;
                const dayKey = format(parseISO(t.date), 'yyyy-MM-dd');
                if (!spendingPerDayPerCategory.has(dayKey)) spendingPerDayPerCategory.set(dayKey, new Map<string, number>());
                const dayMap = spendingPerDayPerCategory.get(dayKey)!;
                dayMap.set(t.categoryId, (dayMap.get(t.categoryId) || 0) + t.amount);
            } catch {}
        });

        const itemsWithTrend: ItemInfoWithTrend[] = itemsToTrack.map(item => {
            let totalSpentToDate = 0;
            for (const day of daysInMonthArray) {
                if (isAfter(day, today)) break;
                const dailySpendingMap = spendingPerDayPerCategory.get(format(day, 'yyyy-MM-dd'));
                if (dailySpendingMap) {
                    totalSpentToDate += item.itemIds.reduce((sum, catId) => sum + (dailySpendingMap.get(catId) || 0), 0);
                }
            }
            
            const daysPassed = isAfter(today, endOfCurrentMonth) ? totalDaysInMonth : (isAfter(today, startOfCurrentMonth) ? Math.min(getDate(today), totalDaysInMonth) : 0);
            const averageDailySpend = daysPassed > 0 ? totalSpentToDate / daysPassed : 0;
            const projectedEndValue = item.budget - (averageDailySpend * totalDaysInMonth);

            return { ...item, averageDailySpend, projectedEndValue, isTrendNegative: projectedEndValue < 0 };
        });

        let cumulativeSpending = new Map<string, number>();
        itemsToTrack.forEach(item => cumulativeSpending.set(item.name, 0));
        
        const todayKey = format(today, 'yyyy-MM-dd');

        const chartData = daysInMonthArray.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayNumber = getDate(day);
            const dataPoint: { [key: string]: any } = { date: day.getTime() };
            const isPastOrToday = !isAfter(day, today);

            itemsWithTrend.forEach(item => {
                if (isPastOrToday) {
                    let dailySpendOnItem = 0;
                    const dailySpendingMap = spendingPerDayPerCategory.get(dayKey);
                    if(dailySpendingMap) dailySpendOnItem = item.itemIds.reduce((sum, catId) => sum + (dailySpendingMap.get(catId) || 0), 0);
                    const newCumulative = (cumulativeSpending.get(item.name) || 0) + dailySpendOnItem;
                    cumulativeSpending.set(item.name, newCumulative);
                    const remaining = item.budget - newCumulative;
                    dataPoint[item.name] = Math.max(0, remaining);
                    
                    dataPoint[`${item.name}_trend`] = dayKey === todayKey ? Math.max(0, remaining) : null;
                } else {
                    dataPoint[item.name] = null;
                    dataPoint[`${item.name}_trend`] = Math.max(0, item.budget - (item.averageDailySpend * dayNumber));
                }
            });
            return dataPoint;
        });

        const endangeredGroups = itemsWithTrend.filter(item => item.isTrendNegative);
        dataRef.current = { data: chartData, items: itemsWithTrend };
        return { data: chartData, activeItems: itemsWithTrend, endangeredGroups };
    }, [allItems, currentMonth, transactions]);

    useEffect(() => {
        setDomain({ x: ['dataMin', 'dataMax'], y: [0, 'auto'] });
        setChartHeight(DEFAULT_HEIGHT);
    }, [currentMonth]);
    
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (setStatisticsSelectedDay) {
                    setStatisticsSelectedDay(null);
                }
                setLockedTooltipPayload(null);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [setStatisticsSelectedDay]);

    const handleZoom = (direction: 'in' | 'out') => {
        const factor = direction === 'in' ? 0.8 : 1.2;
        if (zoomAxis === 'x') {
            const { data: chartData } = dataRef.current;
            if (!chartData || chartData.length === 0) return;
            const [min, max] = domain.x;
            const dataMin = chartData[0].date;
            const dataMax = chartData[chartData.length - 1].date;
            const currentMin = min === 'dataMin' ? dataMin : min;
            const currentMax = max === 'dataMax' ? dataMax : max;
            const range = currentMax - currentMin;
            const newRange = range * factor;
            const mid = currentMin + range / 2;
            let newMin = mid - newRange / 2;
            let newMax = mid + newRange / 2;
            if (newMin < dataMin) newMin = dataMin;
            if (newMax > dataMax) newMax = dataMax;
            if (newMax - newMin < 86400000 * 2) return;
            setDomain(d => ({ ...d, x: [newMin, newMax] }));
        } else {
            const [min, max] = domain.y;
            const dataMax = Math.max(...dataRef.current.items.map(item => item.budget));
            const currentMax = max === 'auto' ? dataMax : max;
            const newMax = Math.max(10, currentMax * factor);
            setDomain(d => ({ ...d, y: [0, newMax] }));
        }
    };

    const handleReset = () => {
        setDomain({ x: ['dataMin', 'dataMax'], y: [0, 'auto'] });
        setChartHeight(DEFAULT_HEIGHT);
        if (setStatisticsSelectedDay) setStatisticsSelectedDay(null);
        setLockedTooltipPayload(null);
    };

    const handleChartClick = (e: any) => {
        if (e && e.activeLabel) {
            const clickedDate = new Date(e.activeLabel);
            if (setStatisticsSelectedDay) {
                setStatisticsSelectedDay(prev => {
                    if (prev && isSameDay(prev, clickedDate)) {
                        setLockedTooltipPayload(null);
                        return null;
                    }
                    setLockedTooltipPayload(e.activePayload);
                    return clickedDate;
                });
            }
        } else if (setStatisticsSelectedDay) {
            setStatisticsSelectedDay(null);
            setLockedTooltipPayload(null);
        }
    };
    
    const handleLegendClick = (data: any) => {
        const { dataKey } = data;
        setInactiveLegendItems(prev => prev.includes(dataKey) ? prev.filter(key => key !== dataKey) : [...prev, dataKey]);
    };
    const handleLegendHover = (data: any) => setHoveredLegendItem(data.dataKey);
    const handleLegendLeave = () => setHoveredLegendItem(null);

    const chartAnimation = {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.2 },
    };

    if (allItems.length === 0) {
        return (
             <motion.div {...chartAnimation} className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><TrendingDown className="h-5 w-5 text-rose-400" /> Ausgabenverlauf nach Budget</h3>
                <div className="flex flex-col items-center justify-center text-center h-80">
                    <p className="text-slate-500">Keine budgetierten Kategorien für diesen Monat vorhanden.</p>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div {...chartAnimation} className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><TrendingDown className="h-5 w-5 text-rose-400" /> Budget-Verlauf (Gruppen)</h3>
                <ChartControls
                    onZoomIn={() => handleZoom('in')}
                    onZoomOut={() => handleZoom('out')}
                    onReset={handleReset}
                    zoomAxis={zoomAxis}
                    onZoomAxisChange={setZoomAxis}
                />
            </div>
            <div style={{ height: `${chartHeight}px` }} className="pr-4 -ml-4 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} onClick={handleChartClick} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" strokeOpacity={0.3} />
                        <XAxis dataKey="date" type="number" scale="time" domain={domain.x} tickFormatter={(d) => format(new Date(d), 'd. MMM', { locale: deLocale })} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                        <YAxis domain={domain.y} tickFormatter={(v) => formatCurrency(v)} stroke="#94a3b8" fontSize={12} width={80} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip deLocale={deLocale} locked={!!lockedTooltipPayload} />} cursor={{ stroke: '#f43f5e', strokeWidth: 1, strokeDasharray: '3 3' }} active={!lockedTooltipPayload} />
                        <Legend wrapperStyle={{paddingTop: '20px'}} onClick={handleLegendClick} onMouseEnter={handleLegendHover} onMouseLeave={handleLegendLeave} formatter={(value) => { const item = activeItems.find(i => i.name === value); const isInactive = inactiveLegendItems.includes(value); const isDimmed = hoveredLegendItem && hoveredLegendItem !== value; return ( <span className={clsx('flex items-center gap-1.5 text-sm cursor-pointer transition-opacity', { 'text-slate-300': !isInactive, 'text-slate-500 line-through': isInactive, 'opacity-50': isDimmed, })}> {value} {item?.isTrendNegative && !isInactive && <span title="Prognose: Budget wird überschritten"><TrendingDown className="h-4 w-4 text-red-500"/></span>} </span> ); }}/>
                        
                        {statisticsSelectedDay && (<ReferenceLine x={statisticsSelectedDay.getTime()} stroke="#f43f5e" strokeWidth={2} />)}

                        {activeItems.map(item => (
                             <React.Fragment key={item.name}>
                                <Line type="monotone" dataKey={item.name} stroke={item.color} strokeWidth={2.5} dot={false} activeDot={{ r: 6, stroke: '#1e293b', strokeWidth: 2, fill: item.color }} connectNulls={false} hide={inactiveLegendItems.includes(item.name)} strokeOpacity={hoveredLegendItem && hoveredLegendItem !== item.name ? 0.3 : 1}/>
                                <Line type="monotone" dataKey={`${item.name}_trend`} stroke={item.color} strokeWidth={1.5} strokeDasharray="5 5" dot={false} legendType="none" activeDot={false} hide={inactiveLegendItems.includes(item.name)} strokeOpacity={hoveredLegendItem && hoveredLegendItem !== item.name ? 0.3 : 1} />
                            </React.Fragment>
                        ))}
                    </LineChart>
                </ResponsiveContainer>
                 <ResizeHandle onResize={setChartHeight} />
            </div>
            {lockedTooltipPayload && (
                <LockedTooltipComponent
                    payload={lockedTooltipPayload}
                    items={activeItems}
                    onClose={() => {
                        setLockedTooltipPayload(null);
                        if (setStatisticsSelectedDay) setStatisticsSelectedDay(null);
                    }}
                />
            )}
            {endangeredGroups.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-700">
                    <h4 className="text-sm font-semibold text-red-400 mb-3">Budget gefährdet:</h4>
                    <div className="flex flex-wrap gap-2">
                        {endangeredGroups.map(group => (
                            <div key={group.name} className="flex items-center gap-2 px-2 py-1 bg-slate-700/50 rounded-md text-xs text-slate-300">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                                <span>{group.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
};