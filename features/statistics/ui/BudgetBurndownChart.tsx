import React, { useMemo, FC, useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { clsx } from 'clsx';
import type { Transaction, Category } from '@/shared/types';
import { eachDayOfInterval, format, parseISO, startOfMonth, endOfMonth, isAfter, getDate, getDaysInMonth, isSameDay } from 'date-fns';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { TrendingDown } from '@/shared/ui';
import { FIXED_COSTS_GROUP_ID, CHART_COLOR_PALETTE } from '@/constants';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';

interface BudgetBurndownChartProps {
    transactions: Transaction[];
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

export const BudgetBurndownChart: FC<BudgetBurndownChartProps> = ({ transactions, currentMonth }) => {
    const { deLocale, flexibleCategories, groups, statisticsSelectedDay, setStatisticsSelectedDay } = useApp();
    const [inactiveLegendItems, setInactiveLegendItems] = useState<string[]>([]);
    const [hoveredLegendItem, setHoveredLegendItem] = useState<string | null>(null);
    const dataRef = useRef<{ data: any[], items: ItemInfoWithTrend[] }>({ data: [], items: [] });
    const [lockedTooltipPayload, setLockedTooltipPayload] = useState<any[] | null>(null);
    const [lockedCoordinate, setLockedCoordinate] = useState<{x: number, y: number} | null>(null);
    
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
        setLockedTooltipPayload(null);
        setLockedCoordinate(null);
    }, [currentMonth]);
    
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (setStatisticsSelectedDay) {
                    setStatisticsSelectedDay(null);
                }
                setLockedTooltipPayload(null);
                setLockedCoordinate(null);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [setStatisticsSelectedDay]);

    const handleChartClick = (e: any) => {
        if (e && e.activeLabel) {
            const clickedDate = new Date(e.activeLabel);
            if (setStatisticsSelectedDay) {
                setStatisticsSelectedDay(prev => {
                    if (prev && isSameDay(prev, clickedDate)) {
                        setLockedTooltipPayload(null);
                        setLockedCoordinate(null);
                        return null;
                    }
                    setLockedTooltipPayload(e.activePayload);
                    setLockedCoordinate(e.chartX && e.chartY ? { x: e.chartX, y: e.chartY } : null);
                    return clickedDate;
                });
            }
        } else if (setStatisticsSelectedDay) {
            setStatisticsSelectedDay(null);
            setLockedTooltipPayload(null);
            setLockedCoordinate(null);
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
            </div>
            <div style={{ height: `${DEFAULT_HEIGHT}px` }} className="pr-4 -ml-4 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} onClick={handleChartClick} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" strokeOpacity={0.3} />
                        <XAxis dataKey="date" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(d) => format(new Date(d), 'd. MMM', { locale: deLocale })} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                        <YAxis domain={[0, 'auto']} tickFormatter={(v) => formatCurrency(v)} stroke="#94a3b8" fontSize={12} width={80} axisLine={false} tickLine={false} />
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
                {lockedTooltipPayload && lockedCoordinate && (
                    <div style={{ position: 'absolute', top: lockedCoordinate.y, left: lockedCoordinate.x, transform: 'translate(10px, -50%)', pointerEvents: 'none', zIndex: 1000 }}>
                        <CustomTooltip
                            active={true}
                            payload={lockedTooltipPayload}
                            label={lockedTooltipPayload[0]?.payload.date}
                            deLocale={deLocale}
                            locked={true}
                        />
                    </div>
                )}
            </div>
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
