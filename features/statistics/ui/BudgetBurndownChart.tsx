

import React, { useMemo, FC, useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceDot } from 'recharts';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { Transaction, Category } from '@/shared/types';
import { eachDayOfInterval, format, parseISO, startOfMonth, endOfMonth, isAfter, getDate, getDaysInMonth } from 'date-fns';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { TrendingDown } from '@/shared/ui';
import { FIXED_COSTS_GROUP_ID } from '@/constants';
import { useApp } from '@/contexts/AppContext';

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

const COLOR_PALETTE = [
  '#3b82f6', // blue-500
  '#ec4899', // pink-500
  '#10b981', // emerald-500
  '#f97316', // orange-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#eab308', // yellow-500
  '#ef4444', // red-500
];

const CustomTooltip = ({ active, payload, label, deLocale }: any) => {
    if (active && payload && payload.length) {
        const date = parseISO(label);
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
                <p className="font-bold text-white mb-2">{formattedDate}</p>
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

export const BudgetBurndownChart: FC<BudgetBurndownChartProps> = ({ transactions, categoryMap, currentMonth }) => {
    const { deLocale, flexibleCategories, groupMap, groups } = useApp();
    const [selectedGroupNames, setSelectedGroupNames] = useState<string[]>([]);
    const [initialSelectionDone, setInitialSelectionDone] = useState(false);
    const [inactiveLegendItems, setInactiveLegendItems] = useState<string[]>([]);
    const [hoveredLegendItem, setHoveredLegendItem] = useState<string | null>(null);

    const allItems = useMemo(() => {
        const allPotentialItems = groups
            .filter(group => group.id !== FIXED_COSTS_GROUP_ID)
            .map(group => {
                const groupCategories = flexibleCategories.filter(c => c.groupId === group.id);
                const groupBudget = groupCategories.reduce((sum, c) => sum + (c.budget || 0), 0);
                return {
                    name: group.name,
                    budget: groupBudget,
                    color: group.color as string,
                    itemIds: groupCategories.map(c => c.id),
                    totalSpent: 0
                };
            })
            .filter((item): item is ItemInfo => item !== null && item.budget > 0);

        const spendingPerCategory = new Map<string, number>();
        transactions.forEach(t => {
            spendingPerCategory.set(t.categoryId, (spendingPerCategory.get(t.categoryId) || 0) + t.amount);
        });

        allPotentialItems.forEach(item => {
            item.totalSpent = item.itemIds.reduce((sum, catId) => sum + (spendingPerCategory.get(catId) || 0), 0);
        });

        return allPotentialItems.sort((a, b) => b.totalSpent - a.totalSpent);
    }, [groups, flexibleCategories, transactions]);

    useEffect(() => {
        if (!initialSelectionDone && allItems.length > 0) {
            const top5 = allItems.slice(0, 5).map(item => item.name);
            setSelectedGroupNames(top5);
            setInitialSelectionDone(true);
        }
    }, [allItems, initialSelectionDone]);

    const { data, activeItems, endangeredGroups } = useMemo(() => {
        const itemsToTrack: ItemInfo[] = allItems
            .filter(item => selectedGroupNames.includes(item.name))
            .map((item, index) => ({
                ...item,
                color: COLOR_PALETTE[index % COLOR_PALETTE.length],
            }));
        
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
            const dataPoint: { [key: string]: any } = { date: dayKey };
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

        return { data: chartData, activeItems: itemsWithTrend, endangeredGroups };
    }, [allItems, selectedGroupNames, currentMonth, transactions]);

    const handleGroupSelectionChange = (groupName: string) => {
        setSelectedGroupNames(prev =>
            prev.includes(groupName)
                ? prev.filter(name => name !== groupName)
                : [...prev, groupName]
        );
    };

    const handleLegendClick = (data: any) => {
        const { dataKey } = data;
        setInactiveLegendItems(prev =>
            prev.includes(dataKey)
                ? prev.filter(key => key !== dataKey)
                : [...prev, dataKey]
        );
    };

    const handleLegendHover = (data: any) => setHoveredLegendItem(data.dataKey);
    const handleLegendLeave = () => setHoveredLegendItem(null);
    
    const chartHeight = Math.max(320, 150 + activeItems.length * 20);

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
            <div className="border-b border-slate-700/50 pb-4 mb-4">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">Angezeigte Gruppen</h4>
                 <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {allItems.map(item => (
                        <label key={item.name} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedGroupNames.includes(item.name)}
                                onChange={() => handleGroupSelectionChange(item.name)}
                                className="w-4 h-4 rounded bg-slate-600 border-slate-500 focus:ring-rose-500 shrink-0 cursor-pointer"
                                style={{ accentColor: item.color }}
                            />
                            <span>{item.name}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div style={{ height: `${chartHeight}px` }} className="pr-4 -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" strokeOpacity={0.3} />
                        <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), 'd. MMM', { locale: deLocale })} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                        <YAxis tickFormatter={(v) => formatCurrency(v)} stroke="#94a3b8" fontSize={12} width={80} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                        <Tooltip content={<CustomTooltip deLocale={deLocale} />} cursor={{ stroke: '#f43f5e', strokeWidth: 1, strokeDasharray: '3 3' }} />
                        <Legend
                            wrapperStyle={{paddingTop: '20px'}}
                            onClick={handleLegendClick}
                            onMouseEnter={handleLegendHover}
                            onMouseLeave={handleLegendLeave}
                            formatter={(value) => {
                                const item = activeItems.find(i => i.name === value);
                                const isInactive = inactiveLegendItems.includes(value);
                                const isDimmed = hoveredLegendItem && hoveredLegendItem !== value;
                                return (
                                    <span className={clsx('flex items-center gap-1.5 text-sm cursor-pointer transition-opacity', {
                                            'text-slate-300': !isInactive,
                                            'text-slate-500 line-through': isInactive,
                                            'opacity-50': isDimmed,
                                        })}>
                                        {value}
                                        {item?.isTrendNegative && !isInactive && <span title="Prognose: Budget wird überschritten"><TrendingDown className="h-4 w-4 text-red-500"/></span>}
                                    </span>
                                );
                            }}/>
                        
                        {activeItems.map(item => (
                             <React.Fragment key={item.name}>
                                <Line type="monotone" dataKey={item.name} stroke={item.color} strokeWidth={2.5} dot={false} activeDot={{ r: 6, stroke: '#1e293b', strokeWidth: 2, fill: item.color }} connectNulls={false} hide={inactiveLegendItems.includes(item.name)} strokeOpacity={hoveredLegendItem && hoveredLegendItem !== item.name ? 0.3 : 1}/>
                                <Line type="monotone" dataKey={`${item.name}_trend`} stroke={item.color} strokeWidth={1.5} strokeDasharray="5 5" dot={false} legendType="none" activeDot={false} hide={inactiveLegendItems.includes(item.name)} strokeOpacity={hoveredLegendItem && hoveredLegendItem !== item.name ? 0.3 : 1} />
                            </React.Fragment>
                        ))}

                        {activeItems.map(item => (
                            <ReferenceDot
                                key={`dot-${item.name}`}
                                x={format(endOfMonth(currentMonth), 'yyyy-MM-dd')}
                                y={item.projectedEndValue < 0 ? 0 : item.projectedEndValue}
                                r={5}
                                fill={item.isTrendNegative ? '#ef4444' : '#22c55e'}
                                stroke="#1e293b"
                                strokeWidth={2}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
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
