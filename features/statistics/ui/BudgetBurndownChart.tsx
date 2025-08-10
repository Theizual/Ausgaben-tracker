

import React, { useMemo, FC } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceDot } from 'recharts';
import { motion, MotionProps } from 'framer-motion';
import type { Transaction, Category, Group } from '@/shared/types';
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
}

interface ItemInfoWithTrend extends ItemInfo {
    averageDailySpend: number;
    projectedEndValue: number;
    isTrendNegative: boolean;
}

const CustomTooltip = ({ active, payload, label, deLocale }: any) => {
    if (active && payload && payload.length) {
        const date = parseISO(label);
        const formattedDate = format(date, 'd. MMMM', { locale: deLocale });

        const sortedPayload = payload
            .filter((p: any) => p.value !== null && p.value !== undefined && !p.dataKey.endsWith('_trend'))
            .map((p: any) => {
                const trendPayload = payload.find((tp: any) => tp.dataKey === `${p.dataKey}_trend`);
                return {
                    name: p.name,
                    value: p.value,
                    color: p.stroke,
                    trendValue: trendPayload ? trendPayload.value : undefined,
                };
            })
            .sort((a: any, b: any) => b.value - a.value);

        if (sortedPayload.length === 0) return null;

        return (
            <div className="bg-slate-700 p-3 rounded-lg border border-slate-600 shadow-xl min-w-[280px]">
                <p className="font-bold text-white mb-2">{formattedDate}</p>
                <div className="space-y-1.5">
                    {sortedPayload.map((p: any) => (
                        <div key={p.name}>
                             <div className="flex justify-between items-center text-sm gap-4">
                                <div className="flex items-center gap-2 truncate">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                                    <span className="text-slate-300 truncate" style={{ color: p.color }}>{p.name}</span>
                                </div>
                                <span className="font-mono text-white font-semibold flex-shrink-0">{formatCurrency(p.value)}</span>
                            </div>
                            {p.trendValue !== undefined && (
                                <div className="flex justify-between items-center text-xs gap-4 pl-4">
                                    <span className="text-slate-400">Prognose</span>
                                    <span className="font-mono text-slate-400">{formatCurrency(p.trendValue)}</span>
                                </div>
                            )}
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

    const { data, activeItems, endangeredGroups } = useMemo(() => {
        const itemsToTrack: ItemInfo[] = groups
            .filter(group => group.id !== FIXED_COSTS_GROUP_ID)
            .map(group => {
                const groupCategories = flexibleCategories.filter(c => c.groupId === group.id);
                const groupBudget = groupCategories.reduce((sum, c) => sum + (c.budget || 0), 0);
                return {
                    name: group.name, budget: groupBudget, color: group.color as string,
                    itemIds: groupCategories.map(c => c.id)
                };
            }).filter((g): g is ItemInfo => g !== null && g.budget > 0);

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
            
            const daysPassed = isAfter(today, endOfCurrentMonth) ? totalDaysInMonth : (isAfter(today, startOfCurrentMonth) ? getDate(today) : 0);
            const averageDailySpend = daysPassed > 0 ? totalSpentToDate / daysPassed : 0;
            const projectedEndValue = item.budget - (averageDailySpend * totalDaysInMonth);

            return { ...item, averageDailySpend, projectedEndValue, isTrendNegative: projectedEndValue < 0 };
        });

        let cumulativeSpending = new Map<string, number>();
        itemsToTrack.forEach(item => cumulativeSpending.set(item.name, 0));
        let lastKnownRemaining = new Map<string, number>();

        const chartData = daysInMonthArray.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayNumber = getDate(day);
            const dataPoint: { [key: string]: any } = { date: dayKey };

            itemsWithTrend.forEach(item => {
                dataPoint[`${item.name}_trend`] = Math.max(0, item.budget - (item.averageDailySpend * dayNumber));
                
                if (!isAfter(day, today)) {
                    let dailySpendOnItem = 0;
                    const dailySpendingMap = spendingPerDayPerCategory.get(dayKey);
                    if(dailySpendingMap) dailySpendOnItem = item.itemIds.reduce((sum, catId) => sum + (dailySpendingMap.get(catId) || 0), 0);
                    const newCumulative = (cumulativeSpending.get(item.name) || 0) + dailySpendOnItem;
                    cumulativeSpending.set(item.name, newCumulative);
                    const remaining = item.budget - newCumulative;
                    dataPoint[item.name] = remaining;
                    lastKnownRemaining.set(item.name, remaining);
                } else {
                    dataPoint[item.name] = lastKnownRemaining.get(item.name) ?? item.budget;
                }
            });
            return dataPoint;
        });

        const endangeredGroups = itemsWithTrend.filter(item => item.isTrendNegative);

        return { data: chartData, activeItems: itemsWithTrend, endangeredGroups };
    }, [flexibleCategories, transactions, currentMonth, categoryMap, groupMap, groups]);
    
    const chartHeight = Math.max(320, 150 + activeItems.length * 20);

    const chartAnimation: MotionProps = {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.2 },
    };

    if (activeItems.length === 0) {
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
            <div style={{ height: `${chartHeight}px` }} className="pr-4 -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" strokeOpacity={0.3} />
                        <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), 'd. MMM', { locale: deLocale })} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                        <YAxis tickFormatter={(v) => formatCurrency(v)} stroke="#94a3b8" fontSize={12} width={80} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                        <Tooltip content={<CustomTooltip deLocale={deLocale} />} cursor={{ stroke: '#f43f5e', strokeWidth: 1, strokeDasharray: '3 3' }} />
                        <Legend wrapperStyle={{paddingTop: '20px'}} formatter={(value) => {
                                const item = activeItems.find(i => i.name === value);
                                return (
                                    <span className="flex items-center gap-1.5 text-slate-300 text-sm">
                                        {value}
                                        {item?.isTrendNegative && <span title="Prognose: Budget wird überschritten"><TrendingDown className="h-4 w-4 text-red-500"/></span>}
                                    </span>
                                );
                            }}/>
                        
                        {activeItems.map(item => (
                             <React.Fragment key={item.name}>
                                <Line type="monotone" dataKey={item.name} stroke={item.color} strokeWidth={2.5} dot={false} activeDot={{ r: 6, stroke: '#1e293b', strokeWidth: 2, fill: item.color }} connectNulls={false} />
                                <Line type="monotone" dataKey={`${item.name}_trend`} stroke={item.color} strokeWidth={1.5} strokeDasharray="5 5" dot={false} legendType="none" activeDot={false} />
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