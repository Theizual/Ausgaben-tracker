
import React, { useMemo, FC, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import type { Transaction, Category } from '@/shared/types';
import { eachDayOfInterval, format, parseISO, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { TrendingDown } from '@/shared/ui';
import { FIXED_COSTS_GROUP_NAME } from '@/constants';
import { useApp } from '@/contexts/AppContext';

type ChartViewMode = 'category' | 'group';

interface BudgetBurndownChartProps {
    transactions: Transaction[];
    categoryMap: Map<string, Category>;
    currentMonth: Date;
    visibleCategoryGroups: string[];
    groupColors: Record<string, string>;
}

interface GroupInfo {
    name: string;
    budget: number;
    color: string;
}

type ActiveItem = Category | GroupInfo;

const CustomTooltip = ({ active, payload, label, activeItems, deLocale }: any) => {
    if (active && payload && payload.length && activeItems) {
        const date = parseISO(label);
        const formattedDate = format(date, 'd. MMMM', { locale: deLocale });

        const totalSpent = payload.reduce((sum: number, p: any) => sum + p.value, 0);

        return (
            <div className="bg-slate-700 p-3 rounded-lg border border-slate-600 shadow-xl min-w-[250px]">
                <div className="flex justify-between items-baseline mb-2">
                    <p className="font-bold text-white">{formattedDate}</p>
                    <p className="text-sm text-slate-400">Gesamt: <span className="font-bold text-white">{formatCurrency(totalSpent)}</span></p>
                </div>
                <div className="space-y-1">
                    {payload.map((p: any) => {
                        const item = activeItems.find((i: ActiveItem) => i.name === p.name);
                        if (!item || p.value === 0) return null;
                        
                        return (
                            <div key={p.dataKey} className="flex justify-between items-center text-sm gap-4">
                                <div className="flex items-center gap-2 truncate">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                                    <span className="text-slate-300 truncate" style={{ color: item.color }}>{p.name}</span>
                                </div>
                                <span className="font-mono text-white font-semibold flex-shrink-0">{formatCurrency(p.value)}</span>
                            </div>
                        );
                    }).filter(Boolean)}
                </div>
            </div>
        );
    }
    return null;
};

export const BudgetBurndownChart: FC<BudgetBurndownChartProps> = ({ transactions, categoryMap, currentMonth, visibleCategoryGroups, groupColors }) => {
    const { deLocale } = useApp();
    const [viewMode, setViewMode] = useState<ChartViewMode>('group');

    const { data, activeItems } = useMemo(() => {
        const flexibleTransactions = transactions.filter(t => categoryMap.get(t.categoryId)?.group !== FIXED_COSTS_GROUP_NAME);
        
        const itemsToTrack: (Category | GroupInfo)[] = viewMode === 'category'
            ? Array.from(categoryMap.values()).filter(c => c.group !== FIXED_COSTS_GROUP_NAME && c.budget && c.budget > 0 && visibleCategoryGroups.includes(c.group))
            : visibleCategoryGroups
                .filter(g => g !== FIXED_COSTS_GROUP_NAME)
                .map(groupName => {
                    const groupCategories = Array.from(categoryMap.values()).filter(c => c.group === groupName);
                    const groupBudget = groupCategories.reduce((sum, c) => sum + (c.budget || 0), 0);
                    return { name: groupName, budget: groupBudget, color: groupColors[groupName] || '#a855f7' };
                })
                .filter(g => g.budget > 0);

        const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
        const itemMapByName = new Map(itemsToTrack.map(item => [item.name, item]));

        let cumulativeSpending: Record<string, number> = {};
        itemsToTrack.forEach(item => { cumulativeSpending[item.name] = 0; });

        const chartData = daysInMonth.map(day => {
            const dailyTransactions = flexibleTransactions.filter(t => {
                try {
                    return isSameDay(parseISO(t.date), day);
                } catch {
                    return false;
                }
            });
            
            const dailySpending: Record<string, number> = {};
            itemsToTrack.forEach(item => { dailySpending[item.name] = 0; });

            dailyTransactions.forEach(t => {
                const category = categoryMap.get(t.categoryId);
                if (!category) return;
                
                const key = viewMode === 'category' ? category.name : category.group;
                if (itemMapByName.has(key)) {
                    dailySpending[key] = (dailySpending[key] || 0) + t.amount;
                }
            });

            const dataPoint: { [key: string]: any } = { date: format(day, 'yyyy-MM-dd') };
            itemsToTrack.forEach(item => {
                cumulativeSpending[item.name] = (cumulativeSpending[item.name] || 0) + (dailySpending[item.name] || 0);
                dataPoint[item.name] = cumulativeSpending[item.name];
            });
            
            return dataPoint;
        });

        return { data: chartData, activeItems: itemsToTrack };
    }, [viewMode, transactions, categoryMap, currentMonth, visibleCategoryGroups, groupColors]);

    if (activeItems.length === 0) {
        return (
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><TrendingDown className="h-5 w-5 text-rose-400" /> Ausgabenverlauf nach Budget</h3>
                <div className="flex flex-col items-center justify-center text-center h-80">
                    <p className="text-slate-500">Keine budgetierten Kategorien für diesen Monat vorhanden.</p>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><TrendingDown className="h-5 w-5 text-rose-400" /> Ausgabenverlauf nach Budget</h3>
                <div className="bg-slate-700/50 p-1 rounded-full flex items-center self-end sm:self-center">
                    {(['group', 'category'] as ChartViewMode[]).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors duration-300 ${
                                viewMode === mode ? 'bg-rose-600 text-white' : 'text-slate-300 hover:bg-slate-600/50'
                            }`}
                        >
                            {mode === 'group' ? 'Nach Gruppe' : 'Nach Kategorie'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="h-80 pr-4 -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" strokeOpacity={0.3} />
                        <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), 'd. MMM', { locale: deLocale })} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                        <YAxis tickFormatter={(v) => formatCurrency(v)} stroke="#94a3b8" fontSize={12} width={80} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip activeItems={activeItems} deLocale={deLocale} />} cursor={{ stroke: '#f43f5e', strokeWidth: 1, strokeDasharray: '3 3' }} />
                        <Legend wrapperStyle={{paddingTop: '20px'}} />
                        {activeItems.map(item => (
                            <Line
                                key={item.name}
                                type="monotone"
                                dataKey={item.name}
                                stroke={item.color}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 6, stroke: '#111827', strokeWidth: 2, fill: item.color }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};
