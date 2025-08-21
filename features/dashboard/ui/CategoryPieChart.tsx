import React, { useState, useMemo, useEffect, FC, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, Sector } from 'recharts';
import { useTaxonomyContext } from '@/contexts/AppContext';
import type { Transaction, Category } from '@/shared/types';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { iconMap } from '@/shared/ui';

interface CategoryPieChartProps {
  transactions: Transaction[];
}

const MAX_PIE_SLICES = 5; // Top 5 + 1 for "Other"

const CustomTooltip = ({ active, payload, transactions, totalSpent, categoryMap }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const { id, name, value, otherGroupIds } = data;

        let relevantTransactions: Transaction[];
        if (id === 'other') {
            const otherIds = new Set(otherGroupIds);
            relevantTransactions = transactions.filter((t: Transaction) => {
                const category = categoryMap.get(t.categoryId);
                return category && otherIds.has(category.groupId);
            });
        } else {
            relevantTransactions = transactions.filter((t: Transaction) => {
                const category = categoryMap.get(t.categoryId);
                return category && category.groupId === id;
            });
        }
        const topTransactions = relevantTransactions.sort((a, b) => b.amount - a.amount).slice(0, 5);
        
        const percentage = totalSpent > 0 ? (value / totalSpent) * 100 : 0;

        return (
            <div className="bg-slate-700 p-3 rounded-lg border border-slate-600 shadow-xl min-w-[250px] max-w-xs">
                <div className="flex justify-between items-baseline mb-2 pb-2 border-b border-slate-600">
                    <p className="font-bold text-white truncate mr-2">{name}</p>
                    <div className="text-right flex-shrink-0">
                         <p className="font-bold text-rose-400">{formatCurrency(value)}</p>
                         <p className="text-xs text-slate-400">{percentage.toFixed(1)}%</p>
                    </div>
                </div>
                
                {topTransactions.length > 0 ? (
                    <ul className="space-y-1 text-xs">
                        {topTransactions.map((tx: Transaction) => (
                            <li key={tx.id} className="flex justify-between items-center gap-2">
                                <span className="text-slate-300 truncate" title={tx.description}>• {tx.description}</span>
                                <span className="font-mono text-white flex-shrink-0">{formatCurrency(tx.amount)}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs text-slate-500 italic">Keine Einzelbuchungen in diesem Zeitraum.</p>
                )}
            </div>
        );
    }
    return null;
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 2} // Slightly larger when active
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke={fill}
        strokeWidth={1}
      />
    </g>
  );
};

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ transactions }) => {
  const { categoryMap, groupMap } = useTaxonomyContext();

  const [isMobileView, setIsMobileView] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const chartRef = useRef<HTMLDivElement>(null);
  
  const totalSpent = useMemo(() => transactions.reduce((sum, t) => sum + t.amount, 0), [transactions]);

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chartRef.current && !chartRef.current.contains(event.target as Node)) {
        setActiveIndex(undefined);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            setActiveIndex(undefined);
        }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const data = useMemo(() => {
    if (!transactions.length || !groupMap) return [];
    
    const groupTotals: { [key: string]: number } = {};
    transactions.forEach(t => {
      const category = categoryMap.get(t.categoryId);
      if (category?.groupId) {
        groupTotals[category.groupId] = (groupTotals[category.groupId] || 0) + t.amount;
      }
    });

    const sortedData = Object.entries(groupTotals)
      .map(([groupId, total]) => {
        const group = groupMap.get(groupId);
        return {
          id: groupId,
          name: group?.name || 'Unbekannt',
          value: total || 0,
          color: group?.color || '#78716c',
          icon: group?.icon || 'Package',
        };
      })
      .sort((a, b) => b.value - a.value);

    if (sortedData.length > MAX_PIE_SLICES) {
      const topData = sortedData.slice(0, MAX_PIE_SLICES);
      const otherSliceData = sortedData.slice(MAX_PIE_SLICES);
      const otherValue = otherSliceData.reduce((acc, curr) => acc + curr.value, 0);
      const otherGroupIds = otherSliceData.map(d => d.id);
      return [
          ...topData,
          { id: 'other', name: 'Sonstige', value: otherValue, color: '#64748b', icon: 'MoreHorizontal', otherGroupIds },
      ];
    }
    return sortedData;
  }, [transactions, categoryMap, groupMap]);

  const CustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, payload }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.45;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    if (!payload.icon) return null;
    const Icon = iconMap[payload.icon];
    if (!Icon) return null;

    return (
        <foreignObject x={x - 10} y={y - 10} width={20} height={20} style={{ overflow: 'visible' }}>
            <Icon className="text-white/90 h-5 w-5" />
        </foreignObject>
    );
  };

  const onPieClick = (_: any, index: number) => {
      setActiveIndex(prevIndex => (prevIndex === index ? undefined : index));
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <p>Keine Daten für Diagramm verfügbar.</p>
        <p className="text-sm">Füge eine Ausgabe hinzu.</p>
      </div>
    );
  }

  return (
    <div ref={chartRef} className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
        <PieChart>
            <Tooltip
                content={<CustomTooltip transactions={transactions} totalSpent={totalSpent} categoryMap={categoryMap} />}
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                isAnimationActive={false}
            />
            <Pie
            // @ts-ignore
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onClick={onPieClick}
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={<CustomizedLabel />}
            outerRadius={isMobileView ? "75%" : "80%"}
            innerRadius={isMobileView ? "45%" : "50%"}
            fill="#8884d8"
            dataKey="value"
            paddingAngle={3}
            >
            {data.map((entry, index) => (
                <Cell key={`cell-${entry.id}-${index}`} fill={entry.color} stroke={entry.color} />
            ))}
            </Pie>
            <Legend 
                iconType="circle" 
                layout={isMobileView ? 'horizontal' : 'vertical'}
                verticalAlign={isMobileView ? 'bottom' : 'middle'}
                align={isMobileView ? 'center' : 'right'}
                wrapperStyle={isMobileView 
                    ? { fontSize: '10px', paddingTop: '10px', lineHeight: '1.2' }
                    : { fontSize: '12px', lineHeight: '1.5', paddingLeft: '20px' }
                }
                formatter={(value, entry) => {
                    if (!entry || !entry.payload) {
                        return <span className="text-slate-400">{value}</span>;
                    }
                    const { payload } = entry;
                    const formattedValue = payload.value != null ? formatCurrency(payload.value) : '';
                    return (
                        <span className="text-slate-400 inline-block mr-2">
                            {value}{' '}
                            <span className="font-semibold text-slate-300">
                            {formattedValue}
                            </span>
                        </span>
                    );
                }}
            />
        </PieChart>
        </ResponsiveContainer>
    </div>
  );
};