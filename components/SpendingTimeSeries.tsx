import React, { useState, useMemo, FC } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Brush, Area, AreaChart } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import { de, format, parseISO, subDays, isValid } from '../utils/dateUtils';
import type { Transaction } from '../types';
import { useApp } from '../contexts/AppContext';
import { formatCurrency } from '../utils/dateUtils';
import { aggregateTransactions, calculateDerivedSeries, type TimeSeriesDataPoint, type AggregationType } from '../utils/series';
import { BarChart2 } from './Icons';

const MotionDiv = motion('div');

// Custom Tooltip for better formatting
const CustomTooltip: FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-700/80 backdrop-blur-sm p-3 rounded-lg border border-slate-600 shadow-xl">
                <p className="font-bold text-white mb-2">{format(parseISO(label), 'eeee, d. MMM yyyy', { locale: de })}</p>
                <div className="space-y-1">
                    {payload.map((p: any) => (
                        <div key={p.dataKey} className="flex justify-between items-center text-sm">
                            <span style={{ color: p.stroke || p.fill }} className="font-semibold">{p.name}:</span>
                            <span className="font-mono ml-4 text-white">{formatCurrency(p.value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

interface SpendingTimeSeriesProps {
    transactions?: Transaction[];
    aggregation?: AggregationType;
    dateRange?: { from: Date; to: Date };
    onDayClick?: (date: Date) => void;
}

const SpendingTimeSeries: FC<SpendingTimeSeriesProps> = ({
    transactions: transactionsProp,
    aggregation: aggregationProp,
    dateRange: dateRangeProp,
    onDayClick,
}) => {
    const { transactions: contextTransactions, dashboardViewMode } = useApp();
    const transactions = transactionsProp || contextTransactions;
    const aggregation = aggregationProp || 'day';

    const { chartData, ariaLabel, periodLabel } = useMemo(() => {
        const finalDateRange = dateRangeProp ?? {
            from: subDays(new Date(), dashboardViewMode === 'woche' ? 6 : 29),
            to: new Date(),
        };

        const aggregated = aggregateTransactions(transactions, aggregation, finalDateRange);
        const finalChartData = calculateDerivedSeries(aggregated);

        let periodLabelText;
        if (dateRangeProp) {
            // This is from Statistics page which passes a full month range.
            periodLabelText = `${format(finalDateRange.from, 'd. MMM yyyy', { locale: de })} - ${format(finalDateRange.to, 'd. MMM yyyy', { locale: de })}`;
        } else {
            // This is for the dashboard.
            const { from, to } = finalDateRange;
            periodLabelText = `${format(from, 'd. MMM', { locale: de })} - ${format(to, 'd. MMM yyyy', { locale: de })}`;
        }

        return {
            chartData: finalChartData,
            ariaLabel: `Ausgabenverlauf für ${periodLabelText}`,
            periodLabel: periodLabelText
        };
    }, [transactions, dashboardViewMode, aggregation, dateRangeProp]);
    
    const handleChartClick = (e: any) => {
        if (e && e.activeLabel && onDayClick) {
            const dateStr = e.activeLabel;
            try {
                const date = parseISO(dateStr);
                if (isValid(date)) {
                    onDayClick(date);
                }
            } catch (error) {
                console.error("Invalid date from chart click:", dateStr, error);
            }
        }
    };

    const key = `${dashboardViewMode}-${aggregation}-${dateRangeProp?.from.toISOString() ?? ''}`;

    return (
        <MotionDiv 
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-slate-800/50 p-4 sm:p-6 rounded-2xl border border-slate-700/50"
            aria-label={ariaLabel}
        >
             <div className="mb-4">
                 <h3 className="text-lg font-bold text-white">Ausgabenverlauf</h3>
                 <p className="text-sm text-slate-400">{periodLabel}</p>
            </div>

            {(chartData.length === 0 || chartData.every(d => d.sum === 0)) ? (
                <div className="flex flex-col items-center justify-center text-center h-80">
                    <BarChart2 className="w-12 h-12 text-slate-600 mb-4" />
                    <h4 className="font-bold text-white">Keine Ausgaben im Zeitraum</h4>
                    <p className="text-slate-400 text-sm">Fügen Sie eine neue Ausgabe hinzu, um den Verlauf zu sehen.</p>
                </div>
            ) : (
                <div className="h-80 pr-4 -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} onClick={handleChartClick}>
                            <defs>
                                <linearGradient id="colorSum" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#475569" strokeOpacity={0.3} />
                            <XAxis 
                                dataKey="date" 
                                tickFormatter={(d) => format(parseISO(d), aggregation === 'day' ? 'dd.MM' : 'dd.MM.yy', { locale: de })} 
                                stroke="#94a3b8" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                                dy={10} 
                            />
                            <YAxis 
                                tickFormatter={(v) => formatCurrency(v)} 
                                stroke="#94a3b8" 
                                fontSize={12} 
                                width={80} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f43f5e', strokeWidth: 1, strokeDasharray: '3 3' }}/>
                            
                            <Area
                                type="monotone"
                                dataKey="sum"
                                name="Ausgaben"
                                stroke="#ef4444"
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#colorSum)"
                                dot={false}
                                activeDot={{ r: 6, stroke: '#111827', strokeWidth: 2, fill: '#ef4444' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </MotionDiv>
    );
};

export default SpendingTimeSeries;