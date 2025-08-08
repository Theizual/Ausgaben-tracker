
import React, { useState, useMemo, useEffect, FC } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useApp } from '@/contexts/AppContext';
import type { Transaction, Category } from '@/shared/types';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { iconMap } from '@/shared/ui';

// New Pie Chart Component
interface CategoryPieChartProps {
  transactions: Transaction[];
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-700 p-3 rounded-lg border border-slate-600 shadow-xl">
                <p className="font-bold text-white">{data.name}</p>
                <p className="text-rose-400">{formatCurrency(data.value)}</p>
            </div>
        );
    }
    return null;
};

const MAX_PIE_SLICES = 5; // Top 5 + 1 for "Other"

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ transactions }) => {
  const { categoryMap } = useApp();
  const getCategoryById = (id: string): Category | undefined => categoryMap.get(id);

  const [isMobileView, setIsMobileView] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobileView(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

  const data = useMemo(() => {
    if (!transactions.length) return [];
    
    const categoryTotals: { [key: string]: number } = {};
    transactions.forEach(t => {
      categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + t.amount;
    });

    const sortedData = Object.entries(categoryTotals)
      .map(([categoryId, total]) => ({
        id: categoryId,
        name: getCategoryById(categoryId)?.name || 'Unbekannt',
        value: total || 0,
        color: getCategoryById(categoryId)?.color || '#78716c',
        icon: getCategoryById(categoryId)?.icon
      }))
      .sort((a, b) => b.value - a.value);

    if (sortedData.length > MAX_PIE_SLICES) {
      const topData = sortedData.slice(0, MAX_PIE_SLICES);
      const otherValue = sortedData.slice(MAX_PIE_SLICES).reduce((acc, curr) => acc + curr.value, 0);
      return [
          ...topData,
          { id: 'other', name: 'Sonstige', value: otherValue, color: '#64748b', icon: 'MoreHorizontal' },
      ];
    }
    return sortedData;
  }, [transactions, categoryMap]);

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

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <p>Keine Daten für Diagramm verfügbar.</p>
        <p className="text-sm">Füge eine Ausgabe hinzu.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)'}} />
        <Pie
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
          {data.map((entry) => (
             <Cell key={`cell-${entry.id}`} fill={entry.color} stroke={entry.color} />
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
  );
};
