import React, { useMemo, FC } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import type { Transaction, Category } from '../types';
import { eachDayOfInterval, format, parseISO, startOfMonth, endOfMonth, isSameDay, isSameMonth, getDaysInMonth } from '../utils/dateUtils';
import { de } from 'date-fns/locale';
import { formatCurrency } from '../utils/dateUtils';
import { TrendingDown } from './Icons';

interface BudgetBurndownChartProps {
    transactions: Transaction[];
    categoryMap: Map<string, Category>;
    currentMonth: Date;
}

const CustomTooltip: FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const filteredPayload = payload.filter((p: any) => !p.dataKey.startsWith('trend_'));
        if (filteredPayload.length === 0) return null;

        return (
            <div className="bg-slate-700/80 backdrop-blur-sm p-3 rounded-lg border border-slate-600 shadow-xl">
                <p className="font-bold text-white mb-2">{format(parseISO(label), 'eeee, d. MMM', { locale: de })}</p>
                <div className="space-y-1">
                    {filteredPayload.sort((a: any,b: any) => b.value - a.value).map((p: any) => (
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

const BudgetBurndownChart: FC<BudgetBurndownChartProps> = ({ transactions, categoryMap, currentMonth }) => {

    const { data, activeCategoriesWithBudget, maxBudget } = useMemo(() => {
        const categoriesWithBudget = Array.from(categoryMap.values()).filter(cat => cat.budget && cat.budget > 0);
        if (categoriesWithBudget.length === 0) {
            return { data: [], activeCategoriesWithBudget: [], maxBudget: 0 };
        }

        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);

        const activeCategoryIdsInMonth = new Set(transactions.map(t => t.categoryId));
        const activeCategoriesForChart = categoriesWithBudget.filter(cat => activeCategoryIdsInMonth.has(cat.id));

        if (activeCategoriesForChart.length === 0) {
            return { data: [], activeCategoriesWithBudget: [], maxBudget: 0 };
        }
        
        const calculatedMaxBudget = Math.max(...activeCategoriesForChart.map(c => c.budget || 0));

        const daysInMonth = eachDayOfInterval({ start, end });
        const isCurrentMonthView = isSameMonth(new Date(), currentMonth);
        const daysForAverage = isCurrentMonthView ? new Date().getDate() : getDaysInMonth(currentMonth);

        const averageDailySpending = new Map<string, number>();
        activeCategoriesForChart.forEach(cat => {
            const totalSpent = transactions
                .filter(t => t.categoryId === cat.id)
                .reduce((sum, t) => sum + t.amount, 0);
            averageDailySpending.set(cat.id, daysForAverage > 0 ? totalSpent / daysForAverage : 0);
        });

        const cumulativeCategoryExpenses = new Map<string, number>();
        activeCategoriesForChart.forEach(cat => cumulativeCategoryExpenses.set(cat.id, 0));
        
        const chartData = daysInMonth.map((day, index) => {
            const dailyTransactions = transactions.filter(t => isSameDay(parseISO(t.date), day));
            
            dailyTransactions.forEach(t => {
                if (cumulativeCategoryExpenses.has(t.categoryId)) {
                    cumulativeCategoryExpenses.set(t.categoryId, (cumulativeCategoryExpenses.get(t.categoryId) || 0) + t.amount);
                }
            });

            const dataPoint: { [key: string]: any } = {
                date: format(day, 'yyyy-MM-dd'),
            };

            activeCategoriesForChart.forEach(cat => {
                const categoryBudget = cat.budget || 0;
                const categoryExpense = cumulativeCategoryExpenses.get(cat.id) || 0;
                dataPoint[cat.id] = Math.max(0, categoryBudget - categoryExpense);

                const avgSpending = averageDailySpending.get(cat.id) || 0;
                const projectedExpense = avgSpending * (index + 1);
                dataPoint[`trend_${cat.id}`] = Math.max(0, categoryBudget - projectedExpense);
            });
            
            return dataPoint;
        });

        return { data: chartData, activeCategoriesWithBudget: activeCategoriesForChart, maxBudget: calculatedMaxBudget };

    }, [transactions, categoryMap, currentMonth]);
    
    // Custom Dot Component for the end of the trend line
    const TrendlineEndDot = (props: any) => {
        const { cx, cy, payload, index, dataKey } = props;
        
        // Only render for the very last data point
        if (index !== data.length - 1) {
            return null;
        }
        
        const projectedRemaining = payload[dataKey];
        const dotColor = projectedRemaining > 0 ? '#22c55e' : '#ef4444'; // green for surplus, red for deficit
        
        return (
            <circle cx={cx} cy={cy} r={5} stroke="#1e293b" strokeWidth={2} fill={dotColor} />
        );
    };

    if (activeCategoriesWithBudget.length === 0) {
        const hasAnyBudget = Array.from(categoryMap.values()).some(cat => cat.budget && cat.budget > 0);
        const emptyStateTitle = hasAnyBudget
            ? 'Keine Ausgaben in budgetierten Kategorien'
            : 'Kein Monatsbudget festgelegt';
        const emptyStateMessage = hasAnyBudget
            ? 'Für diesen Monat gibt es keine Ausgaben in Kategorien, für die Sie ein Budget festgelegt haben.'
            : 'Setzen Sie Budgets in den Einstellungen, um den Budgetverlauf zu sehen.';

        return (
            <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800 p-6 rounded-2xl border border-slate-700 h-[432px] flex flex-col items-center justify-center text-center"
            >
                <TrendingDown className="h-12 w-12 text-slate-600 mb-4" />
                <h4 className="font-bold text-white">{emptyStateTitle}</h4>
                <p className="text-slate-500 text-sm">{emptyStateMessage}</p>
            </motion.div>
        );
    }
    
    return (
         <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-700"
        >
            <h3 className="text-lg font-bold text-white mb-4">Budget-Verlauf (Burndown)</h3>
            <div className="h-96 pr-4 -ml-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" strokeOpacity={0.3} />
                        <XAxis 
                            dataKey="date" 
                            tickFormatter={(d) => format(parseISO(d), 'dd.MM', { locale: de })}
                            stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} 
                        />
                        <YAxis 
                            domain={[0, dataMax => Math.ceil(Math.max(maxBudget, dataMax) / 100) * 100]}
                            tickFormatter={(v) => formatCurrency(v)} 
                            stroke="#94a3b8" fontSize={12} width={80} axisLine={false} tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{paddingTop: '20px'}}/>
                        
                        {activeCategoriesWithBudget.map(cat => (
                           <React.Fragment key={`fragment-${cat.id}`}>
                                <Line 
                                    key={cat.id}
                                    type="monotone"
                                    dataKey={cat.id}
                                    name={cat.name}
                                    stroke={cat.color}
                                    strokeWidth={2}
                                    strokeOpacity={0.8}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 1, fill: cat.color }}
                                />
                                <Line
                                    key={`trend-${cat.id}`}
                                    type="monotone"
                                    dataKey={`trend_${cat.id}`}
                                    name={`Trend ${cat.name}`}
                                    stroke={cat.color}
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    strokeOpacity={0.5}
                                    dot={<TrendlineEndDot />}
                                    activeDot={false}
                                    legendType="none"
                                />
                           </React.Fragment>
                        ))}

                    </LineChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};

export default BudgetBurndownChart;