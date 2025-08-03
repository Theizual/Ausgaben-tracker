
import React, { useState, useMemo } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Transaction, Category, ViewMode, CategoryId } from '../types';
import { format, parseISO, formatCurrency, de, endOfDay, isWithinInterval, startOfMonth, endOfMonth } from '../utils/dateUtils';
import { getWeekInterval, getMonthInterval } from '../utils/dateUtils';
import { iconMap, Plus, Edit, Trash2, BarChart2, ChevronDown, Coins, CalendarDays } from './Icons';

type DashboardProps = {
    transactions: Transaction[];
    categories: Category[];
    categoryGroups: string[];
    categoryMap: Map<string, Category>;
    addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
    totalMonthlyBudget: number;
};

export const CategoryButtons: FC<{
    categories: Category[];
    categoryGroups: string[];
    selectedCategoryId: CategoryId;
    onSelectCategory: (id: CategoryId) => void;
}> = ({ categories, categoryGroups, selectedCategoryId, onSelectCategory }) => {
    
    const groupedCategories = useMemo(() => {
        const groupMap = new Map<string, Category[]>();
        categories.forEach(category => {
            if (!groupMap.has(category.group)) {
                groupMap.set(category.group, []);
            }
            groupMap.get(category.group)!.push(category);
        });

        return categoryGroups.map(groupName => ({
            name: groupName,
            categories: groupMap.get(groupName) || []
        })).filter(group => group.categories.length > 0);

    }, [categories, categoryGroups]);

    return (
        <div className="space-y-4">
            {groupedCategories.map(group => (
                <div key={group.name}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">{group.name}</h4>
                    <div className="flex flex-wrap gap-2">
                        {group.categories.map(category => {
                            const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
                            const isSelected = selectedCategoryId === category.id;
                            return (
                                <motion.button
                                    key={category.id}
                                    type="button"
                                    onClick={() => onSelectCategory(category.id)}
                                    layout
                                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                    style={{
                                        backgroundColor: isSelected ? category.color : undefined,
                                        borderColor: category.color,
                                    }}
                                    className={`flex items-center justify-center rounded-lg transition-colors duration-200 border
                                        ${isSelected 
                                            ? 'gap-2 px-4 py-3 text-white font-semibold shadow-lg' 
                                            : 'w-12 h-12 bg-slate-700/80 hover:bg-slate-700'
                                        }`
                                    }
                                    title={category.name}
                                >
                                    <Icon className="h-6 w-6 shrink-0" style={{ color: isSelected ? 'white' : category.color }} />
                                    <AnimatePresence>
                                        {isSelected && (
                                            <motion.span
                                                initial={{ opacity: 0, width: 0 }}
                                                animate={{ opacity: 1, width: 'auto' }}
                                                exit={{ opacity: 0, width: 0 }}
                                                transition={{ duration: 0.15, ease: 'linear' }}
                                                className="whitespace-nowrap overflow-hidden text-sm"
                                            >
                                                {category.name}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

const ProgressBar: FC<{ percentage: number; color: string; }> = ({ percentage, color }) => (
    <div className="w-full bg-slate-700 rounded-full h-2">
        <motion.div
            className="h-2 rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
        />
    </div>
);


const Dashboard: FC<DashboardProps> = (props) => {
    const [viewMode, setViewMode] = useState<ViewMode>('woche');
    
    const { filteredTransactions, totalExpenses, dailyAverage, subtext } = useMemo(() => {
        const now = new Date();
        const interval = viewMode === 'woche' ? getWeekInterval(now) : getMonthInterval(now);
        
        let subtext: string;
        if (viewMode === 'woche') {
            const range = `${format(interval.start, 'd. MMM', { locale: de })} - ${format(interval.end, 'd. MMM', { locale: de })}`;
            subtext = `Diese Woche (${range})`;
        } else {
            const range = format(interval.start, 'MMMM yyyy', { locale: de });
            subtext = `Dieser Monat (${range})`;
        }

        const filtered = props.transactions.filter(t => {
            if (!t.date || typeof t.date !== 'string') return false;
            try {
                const date = parseISO(t.date);
                if (isNaN(date.getTime())) return false; // Check for Invalid Date
                return isWithinInterval(date, interval);
            } catch {
                return false;
            }
        });

        const total = filtered.reduce((sum, t) => sum + t.amount, 0);

        if (filtered.length === 0) {
            return { filteredTransactions: filtered, totalExpenses: 0, dailyAverage: 0, subtext };
        }

        let daysInPeriod: number;
        if (viewMode === 'woche') {
            const dayOfWeek = now.getDay(); // Sunday = 0, Monday = 1...
            // Our weeks start on Monday, so we adjust. Sunday (0) is the 7th day.
            daysInPeriod = dayOfWeek === 0 ? 7 : dayOfWeek;
        } else { // monat
            daysInPeriod = now.getDate();
        }
        
        const endOfToday = endOfDay(now);
        const transactionsForAverage = filtered.filter(t => {
            if (!t.date || typeof t.date !== 'string') return false;
            try {
                const date = parseISO(t.date);
                if (isNaN(date.getTime())) return false;
                return date <= endOfToday;
            } catch {
                return false;
            }
        });
        const totalForAverage = transactionsForAverage.reduce((sum, t) => sum + t.amount, 0);

        const average = daysInPeriod > 0 ? totalForAverage / daysInPeriod : 0;

        return { filteredTransactions: filtered, totalExpenses: total, dailyAverage: average, subtext };
    }, [props.transactions, viewMode]);

    const { totalSpentThisMonth } = useMemo(() => {
        const now = new Date();
        const monthInterval = getMonthInterval(now);
        const monthlyTransactions = props.transactions.filter(t => isWithinInterval(parseISO(t.date), monthInterval));
        const total = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
        return { totalSpentThisMonth: total };
    }, [props.transactions]);

    const totalBudgetPercentage = props.totalMonthlyBudget > 0 ? (totalSpentThisMonth / props.totalMonthlyBudget) * 100 : 0;
    
    const getTotalBarColor = () => {
        if (totalBudgetPercentage > 100) return '#ef4444'; // red-500
        if (totalBudgetPercentage > 85) return '#f97316'; // orange-500
        return '#22c55e'; // green-500
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Übersicht</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                
                {/* Left Column */}
                <div className="space-y-6">
                    <QuickAddForm addTransaction={props.addTransaction} categories={props.categories} categoryGroups={props.categoryGroups} />
                </div>
                
                {/* Right Column */}
                <div className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white">Analyse</h3>
                            <ViewTabs viewMode={viewMode} setViewMode={setViewMode} />
                        </div>
                        <div className="h-[250px]">
                            <CategoryPieChart transactions={filteredTransactions} categoryMap={props.categoryMap} />
                        </div>
                        {props.totalMonthlyBudget > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-700/50">
                                <h4 className="text-sm font-semibold text-slate-300 mb-3">Monatsbudget</h4>
                                <div className="flex justify-between items-baseline text-sm mb-1">
                                    <p className="text-slate-300">
                                        <span className="font-semibold text-white">{formatCurrency(totalSpentThisMonth)}</span>
                                        <span className="text-slate-500"> / {formatCurrency(props.totalMonthlyBudget)}</span>
                                    </p>
                                    <p className="font-semibold" style={{color: getTotalBarColor()}}>{totalBudgetPercentage.toFixed(0)}%</p>
                                </div>
                                <ProgressBar percentage={totalBudgetPercentage} color={getTotalBarColor()} />
                            </div>
                        )}
                    </motion.div>
                    
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50"
                    >
                        <div className="flex justify-between items-start">
                             <div className="w-[calc(50%-1rem)]">
                                <div className="flex items-center text-slate-400 mb-2">
                                    <Coins className="h-5 w-5 mr-2 flex-shrink-0" />
                                    <p className="font-medium text-sm">Gesamtausgaben</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white truncate" title={formatCurrency(totalExpenses)}>{formatCurrency(totalExpenses)}</p>
                                </div>
                            </div>
                            
                            <div className="w-px bg-slate-700/50 self-stretch mx-4"></div>
                            
                            <div className="w-[calc(50%-1rem)]">
                                <div className="flex items-center text-slate-400 mb-2">
                                    <BarChart2 className="h-5 w-5 mr-2 flex-shrink-0" />
                                    <p className="font-medium text-sm">Tagesdurchschnitt</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white truncate" title={formatCurrency(dailyAverage)}>{formatCurrency(dailyAverage)}</p>
                                </div>
                            </div>
                        </div>
                         {subtext && <p className="text-sm text-slate-500 text-center mt-4 pt-4 border-t border-slate-700/50">{subtext}</p>}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

const ViewTabs: FC<{ viewMode: ViewMode; setViewMode: (mode: ViewMode) => void; }> = ({ viewMode, setViewMode }) => {
    const tabs: { id: ViewMode; label: string }[] = [{ id: 'woche', label: 'Woche' }, { id: 'monat', label: 'Monat' }];

    return (
        <div className="bg-slate-800 p-1 rounded-full flex items-center">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setViewMode(tab.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors duration-300 ${
                        viewMode === tab.id
                            ? 'bg-red-600 text-white'
                            : 'text-slate-300 hover:bg-slate-700/50'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

const QuickAddForm: FC<{ 
    addTransaction: (t: Omit<Transaction, 'id'>) => void;
    categories: Category[];
    categoryGroups: string[];
}> = ({ addTransaction, categories, categoryGroups }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState(categories[0]?.id || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount.replace(',', '.'));
        if (!numAmount || numAmount <= 0 || !description || !categoryId) {
            return;
        }
        
        const transactionDate = endOfDay(new Date());
        
        addTransaction({ 
            amount: numAmount, 
            description, 
            categoryId, 
            date: transactionDate.toISOString() 
        });
        
        setAmount('');
        setDescription('');
    };

    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-bold text-white mb-4">Ausgabe hinzufügen</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative sm:w-48 flex-shrink-0">
                            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                            <input
                                id="amount"
                                type="text"
                                inputMode="decimal"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="Betrag"
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                required
                            />
                        </div>
                        <input
                            id="description"
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Beschreibung..."
                            className="flex-grow bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                            required
                        />
                    </div>

                    <CategoryButtons
                        categories={categories}
                        categoryGroups={categoryGroups}
                        selectedCategoryId={categoryId}
                        onSelectCategory={setCategoryId}
                    />
                    
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:opacity-90 transition-opacity"
                            aria-label="Ausgabe hinzufügen"
                        >
                            <Plus className="h-5 w-5" />
                            <span className="sm:inline">Hinzufügen</span>
                        </button>
                    </div>
                </form>
            </div>
        </motion.div>
    );
};

// New Pie Chart Component
interface CategoryPieChartProps {
  transactions: Transaction[];
  categoryMap: Map<string, Category>;
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

const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ transactions, categoryMap }) => {
  const getCategoryById = (id: string): Category | undefined => categoryMap.get(id);

  const data = useMemo(() => {
    if (!transactions.length) return [];
    
    const categoryTotals: { [key in CategoryId]?: number } = {};
    transactions.forEach(t => {
      categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + t.amount;
    });

    const sortedData = Object.entries(categoryTotals)
      .map(([categoryId, total]) => ({
        id: categoryId as CategoryId,
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
          outerRadius="80%"
          innerRadius="50%"
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
            layout="vertical" 
            verticalAlign="middle" 
            align="right" 
            wrapperStyle={{ fontSize: '12px', lineHeight: '1.5', paddingLeft: '20px' }}
            formatter={(value, entry) => {
                if (!entry || !entry.payload) {
                    return <span className="text-slate-400">{value}</span>;
                }
                const { payload } = entry;
                const formattedValue = payload.value != null ? formatCurrency(payload.value) : '';
                return (
                    <span className="text-slate-400">
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


export default Dashboard;
