import React, { FC, useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { clsx } from 'clsx';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, format, parseISO, addMonths, addDays, differenceInDays } from '@/shared/utils/dateUtils';
import type { Transaction, PeriodType } from '@/shared/types';
import { ChartControls, ResizeHandle } from '@/shared/ui';
import { LockedTooltip } from './LockedTooltip';
import { CHART_COLOR_PALETTE } from '@/constants';

export const CustomTooltip = ({ active, payload, label, tagMap, deLocale, groupByMonth }: any) => {
    if (active && payload && payload.length) {
        const formattedLabel = label ? format(new Date(label), groupByMonth ? 'MMMM yyyy' : 'eeee, d. MMM', { locale: deLocale }) : '';
        
        const entries = payload
            .filter((p: any) => !p.dataKey.startsWith('avg_') && p.value > 0)
            .map((p: any) => ({ name: p.name, value: p.value, color: p.stroke }))
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

const DEFAULT_HEIGHT = 320;

export const TagAnalysisChart: FC<TagAnalysisChartProps> = ({ transactions, tagIds, interval, periodType }) => {
    const { tagMap, deLocale } = useApp();
    const [inactiveLegendItems, setInactiveLegendItems] = useState<string[]>([]);
    const [hoveredLegendItem, setHoveredLegendItem] = useState<string | null>(null);
    const [lockedTooltipPayload, setLockedTooltipPayload] = useState<any | null>(null);
    
    const [zoomAxis, setZoomAxis] = useState<'x' | 'y'>('x');
    const [chartHeight, setChartHeight] = useState(DEFAULT_HEIGHT);
    const [domain, setDomain] = useState<{ x: [any, any]; y: [any, any] }>({ x: ['dataMin', 'dataMax'], y: [0, 'auto'] });
    
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setLockedTooltipPayload(null);
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

    useEffect(() => {
        setDomain({ x: ['dataMin', 'dataMax'], y: [0, 'auto'] });
        setChartHeight(DEFAULT_HEIGHT);
        setLockedTooltipPayload(null);
    }, [tagIds, interval, periodType]);

    const diffDays = differenceInDays(interval.end, interval.start);
    const groupByMonth = periodType === 'year' || (periodType === 'custom' && diffDays > 92);

    const chartMetrics = useMemo(() => {
        if (transactions.length === 0) return { chartData: [], colors: {}, earliestDate: null };

        const colors: Record<string, string> = {};
        tagIds.forEach((id, index) => { colors[id] = CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length]; });

        const chartStartDate = interval.start;
        const chartEndDate = interval.end;
        
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
                    if (tagIds.includes(tagId)) { dataMap.get(key)[tagId] += t.amount; }
                });
            }
        });
        
        const sortedData = Array.from(dataMap.values()).sort((a,b) => a.date.localeCompare(b.date));
        
        const cumulativeSums = new Map<string, number>();
        tagIds.forEach(id => cumulativeSums.set(id, 0));
        
        const cumulativeChartData = sortedData.map(point => {
            const cumulativePoint: { [key: string]: any } = { date: parseISO(point.date).getTime() };
            tagIds.forEach(id => {
                const newCumulative = (cumulativeSums.get(id) || 0) + (point[id] || 0);
                cumulativeSums.set(id, newCumulative);
                cumulativePoint[id] = newCumulative;
            });
            return cumulativePoint;
        });

        return { chartData: cumulativeChartData, colors, earliestDate: chartStartDate };
    }, [transactions, tagIds, interval, groupByMonth]);

    const handleZoom = (direction: 'in' | 'out') => {
        const factor = direction === 'in' ? 0.8 : 1.2;
        if (zoomAxis === 'x') {
            const data = chartMetrics.chartData;
            if (!data || data.length === 0) return;
            const [min, max] = domain.x;
            const dataMin = data[0].date;
            const dataMax = data[data.length - 1].date;
            const currentMin = min === 'dataMin' ? dataMin : min;
            const currentMax = max === 'dataMax' ? dataMax : max;
            const range = currentMax - currentMin;
            const newRange = range * factor;
            const mid = currentMin + range / 2;
            let newMin = mid - newRange / 2; let newMax = mid + newRange / 2;
            if (newMin < dataMin) newMin = dataMin; if (newMax > dataMax) newMax = dataMax;
            if (newMax - newMin < 86400000 * 2) return;
            setDomain(d => ({ ...d, x: [newMin, newMax] }));
        } else {
            const [, max] = domain.y;
            if (chartMetrics.chartData.length === 0) return;
            const dataMax = Math.max(...chartMetrics.chartData.map(d => Math.max(...tagIds.map(id => d[id] || 0))));
            const currentMax = max === 'auto' ? dataMax : max;
            const newMax = Math.max(10, currentMax * factor);
            setDomain(d => ({ ...d, y: [0, newMax] }));
        }
    };
    const handleReset = () => {
        setDomain({ x: ['dataMin', 'dataMax'], y: [0, 'auto'] });
        setChartHeight(DEFAULT_HEIGHT);
        setLockedTooltipPayload(null);
    };

    const handleChartClick = (e: any) => {
        if (e && e.activePayload && e.activePayload.length > 0) {
            setLockedTooltipPayload(prev => (prev && prev.date === e.activePayload[0].payload.date) ? null : e.activePayload[0].payload);
        } else {
            setLockedTooltipPayload(null);
        }
    };

    const handleLegendClick = (data: any) => {
        const { dataKey } = data;
        setInactiveLegendItems(prev => prev.includes(dataKey) ? prev.filter(key => key !== dataKey) : [...prev, dataKey]);
    };
    const handleLegendHover = (data: any) => setHoveredLegendItem(data.dataKey);
    const handleLegendLeave = () => setHoveredLegendItem(null);

    return (
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <div>
                    <h3 className="font-bold text-white">Ausgaben im Zeitverlauf</h3>
                    <p className="text-sm text-slate-400">{`${format(interval.start, 'd. MMM yyyy', { locale: deLocale })} - ${format(interval.end, 'd. MMM yyyy', { locale: deLocale })}`}</p>
                </div>
                 <ChartControls onZoomIn={() => handleZoom('in')} onZoomOut={() => handleZoom('out')} onReset={handleReset} zoomAxis={zoomAxis} onZoomAxisChange={setZoomAxis} />
            </div>
            <div style={{ height: `${chartHeight}px` }} className="pr-4 -ml-4 relative">
                <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartMetrics.chartData} onClick={handleChartClick} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                         <defs>
                            {tagIds.map(id => ( <linearGradient key={`grad-${id}`} id={`color-${id}`} x1="0" y1="0" x2="0" y2="1"> <stop offset="5%" stopColor={chartMetrics.colors[id]} stopOpacity={0.4}/> <stop offset="95%" stopColor={chartMetrics.colors[id]} stopOpacity={0}/> </linearGradient> ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" strokeOpacity={0.3}/>
                        <XAxis dataKey="date" type="number" scale="time" domain={domain.x} tickFormatter={(d) => format(new Date(d), chartMetrics.chartData.length > 31 ? 'MMM yy' : 'd. MMM', {locale: deLocale})} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                        <YAxis domain={domain.y} tickFormatter={(v) => formatCurrency(v)} stroke="#94a3b8" fontSize={12} width={80} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip tagMap={tagMap} deLocale={deLocale} groupByMonth={groupByMonth} />} cursor={{ stroke: '#f43f5e', strokeWidth: 1, strokeDasharray: '3 3' }}/>
                        <Legend wrapperStyle={{paddingTop: '20px'}} onClick={handleLegendClick} onMouseEnter={handleLegendHover} onMouseLeave={handleLegendLeave} formatter={(value, entry) => { const { dataKey } = entry; const isInactive = inactiveLegendItems.includes(dataKey as string); const isDimmed = hoveredLegendItem && hoveredLegendItem !== dataKey; return ( <span className={clsx('text-sm cursor-pointer transition-opacity', { 'text-slate-300': !isInactive, 'text-slate-500 line-through': isInactive, 'opacity-50': isDimmed, })}> {value} </span> ); }} />
                        {lockedTooltipPayload && (<ReferenceLine x={lockedTooltipPayload.date} stroke="#f43f5e" strokeWidth={2} />)}
                        {tagIds.map(id => ( <Area key={id} type="monotone" dataKey={id} name={tagMap.get(id) || 'Unbekannt'} stroke={chartMetrics.colors[id]} strokeWidth={2.5} fillOpacity={hoveredLegendItem && hoveredLegendItem !== id ? 0.3 : 1} fill={`url(#color-${id})`} dot={false} activeDot={{ r: 6, stroke: '#1e293b', strokeWidth: 2, fill: chartMetrics.colors[id] }} hide={inactiveLegendItems.includes(id)} strokeOpacity={hoveredLegendItem && hoveredLegendItem !== id ? 0.3 : 1} /> ))}
                    </AreaChart>
                </ResponsiveContainer>
                 <ResizeHandle onResize={setChartHeight} />
            </div>
            <LockedTooltip payload={lockedTooltipPayload} colors={chartMetrics.colors} onClose={() => setLockedTooltipPayload(null)} groupByMonth={groupByMonth} />
        </div>
    );
};