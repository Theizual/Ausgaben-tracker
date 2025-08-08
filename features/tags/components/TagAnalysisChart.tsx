
import React, { FC, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useApp } from '../../../contexts/AppContext';
import { formatCurrency, format, parseISO, addMonths, addDays, differenceInDays, startOfDay, isWithinInterval } from '../../../utils/dateUtils';
import type { Transaction, PeriodType } from '../../../types';

export const CustomTooltip = ({ active, payload, label, tagMap, deLocale }: any) => {
    if (active && payload && payload.length) {
        const formattedLabel = label ? (
            label.includes('-') 
                ? format(parseISO(label), label.length > 7 ? 'eeee, d. MMM' : 'MMMM yyyy', { locale: deLocale }) 
                : label
            ) : '';
        
        const entries = payload
            .filter((p: any) => !p.dataKey.startsWith('avg_') && p.value > 0) // Exclude averages and zero values
            .map((p: any) => ({
                name: p.name,
                value: p.value,
                color: p.stroke,
            }))
            .sort((a: any,b: any) => b.value - a.value);

        if (entries.length === 0) return null;

        return (
            <div className="bg-slate-700 p-3 rounded-lg border border-slate-600 shadow-xl">
                 <p className="text-sm text-slate-400 mb-1">{formattedLabel}</p>
                 {entries.map((entry: any) => (
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

interface TagAnalysisChartProps {
    transactions: Transaction[];
    tagIds: string[];
    interval: { start: Date, end: Date };
    periodType: PeriodType;
}

export const TagAnalysisChart: FC<TagAnalysisChartProps> = ({ transactions, tagIds, interval, periodType }) => {
    const { tagMap, deLocale } = useApp();

    const chartMetrics = useMemo(() => {
        if (transactions.length === 0) {
            return { chartData: [], colors: {}, earliestDate: null };
        }

        const colors: Record<string, string> = {};
        const colorPalette = ['#f43f5e', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#64748b', '#06b6d4', '#d946ef'];
        tagIds.forEach((id, index) => {
            colors[id] = colorPalette[index % colorPalette.length];
        });

        const earliestTransactionDate = transactions.reduce((earliest, t) => {
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

        transactions.forEach(t => {
            const tDate = parseISO(t.date);
            const key = groupByMonth ? format(tDate, 'yyyy-MM') : format(tDate, 'yyyy-MM-dd');
            if (dataMap.has(key)) {
                t.tagIds?.forEach(tagId => {
                    if (tagIds.includes(tagId)) {
                        dataMap.get(key)[tagId] += t.amount;
                    }
                });
            }
        });
        
        const sortedData = Array.from(dataMap.values()).sort((a,b) => a.date.localeCompare(b.date));
        
        const cumulativeSums = new Map<string, number>();
        tagIds.forEach(id => cumulativeSums.set(id, 0));
        
        const cumulativeChartData = sortedData.map(point => {
            const cumulativePoint: { [key: string]: any } = { date: point.date };
            tagIds.forEach(id => {
                const currentCumulative = cumulativeSums.get(id) || 0;
                const newCumulative = currentCumulative + (point[id] || 0);
                cumulativeSums.set(id, newCumulative);
                cumulativePoint[id] = newCumulative;
            });
            return cumulativePoint;
        });

        return { chartData: cumulativeChartData, colors, earliestDate: chartStartDate };
    }, [transactions, tagIds, interval, periodType]);

    return (
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
            <div className="mb-4">
                <h3 className="font-bold text-white">Ausgaben im Zeitverlauf</h3>
                <p className="text-sm text-slate-400">{`${format(interval.start, 'd. MMM yyyy', { locale: deLocale })} - ${format(interval.end, 'd. MMM yyyy', { locale: deLocale })}`}</p>
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
                        <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), chartMetrics.chartData.length > 31 ? 'MMM yy' : 'd. MMM', {locale: deLocale})} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                        <YAxis tickFormatter={(v) => formatCurrency(v)} stroke="#94a3b8" fontSize={12} width={80} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip tagMap={tagMap} deLocale={deLocale} />} cursor={{ stroke: '#f43f5e', strokeWidth: 1, strokeDasharray: '3 3' }}/>
                        <Legend wrapperStyle={{paddingTop: '20px'}} />
                        {tagIds.map(id => (
                            <Area
                                key={id}
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
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};