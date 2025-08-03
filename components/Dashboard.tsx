import React, { useState, useMemo } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Transaction, Category, ViewMode, CategoryId, Tag } from '../types';
import { format, parseISO, formatCurrency, de, endOfDay, isWithinInterval, startOfMonth, endOfMonth, getWeekInterval, getMonthInterval } from '../utils/dateUtils';
import { iconMap, Plus, BarChart2, ChevronDown, Coins } from './Icons';
import CategoryButtons from './CategoryButtons';
import TagInput from './TagInput';
import AvailableTags from './AvailableTags';

type DashboardProps = {
    transactions: Transaction[];
    categories: Category[];
    categoryGroups: string[];
    categoryMap: Map<string, Category>;
    addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'tagIds'> & { tags?: string[] }) => void;
    totalMonthlyBudget: number;
    allAvailableTags: Tag[];
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
    const [isCategoryBudgetOpen, setCategoryBudgetOpen] = useState(false);
    
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

    const { totalSpentThisMonth, spendingByCategory, budgetedCategories } = useMemo(() => {
        const now = new Date();
        const monthInterval = getMonthInterval(now);
        const monthlyTransactions = props.transactions.filter(t => isWithinInterval(parseISO(t.date), monthInterval));
        const total = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        const spendingMap = new Map<CategoryId, number>();
        monthlyTransactions.forEach(t => {
            spendingMap.set(t.categoryId, (spendingMap.get(t.categoryId) || 0) + t.amount);
        });
        
        const budgetedCats = props.categories.filter(c => c.budget && c.budget > 0);

        return { 
            totalSpentThisMonth: total,
            spendingByCategory: spendingMap,
            budgetedCategories: budgetedCats
        };
    }, [props.transactions, props.categories]);

    const totalBudgetPercentage = props.totalMonthlyBudget > 0 ? (totalSpentThisMonth / props.totalMonthlyBudget) * 100 : 0;
    
    const getTotalBarColor = () => {
        if (totalBudgetPercentage > 100) return '#ef4444'; // red-500
        if (totalBudgetPercentage > 85) return '#f97316'; // orange-500
        return '#22c55e'; // green-500
    };

    const getCategoryBarColor = (percentage: number, categoryColor: string) => {
        if (percentage > 100) return '#ef4444'; // red-500
        if (percentage > 85) return '#f97316'; // orange-500
        return categoryColor;
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Übersicht</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                
                {/* Left Column */}
                <div className="space-y-6">
                    <QuickAddForm 
                        addTransaction={props.addTransaction} 
                        categories={props.categories} 
                        categoryGroups={props.categoryGroups} 
                        allAvailableTags={props.allAvailableTags}
                        transactions={props.transactions}
                    />
                </div>
                
                {/* Right Column */}
                <div className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white">Zusammenfassung</h3>
                            <ViewTabs viewMode={viewMode} setViewMode={setViewMode} />
                        </div>
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
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white">Analyse</h3>
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
                        {budgetedCategories.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-700/50">
                                <button 
                                    onClick={() => setCategoryBudgetOpen(!isCategoryBudgetOpen)}
                                    className="w-full flex justify-between items-center text-left"
                                    aria-expanded={isCategoryBudgetOpen}
                                >
                                    <h4 className="text-sm font-semibold text-slate-300">Kategorienbudgets</h4>
                                    <ChevronDown 
                                        className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isCategoryBudgetOpen ? 'rotate-180' : ''}`} 
                                    />
                                </button>
                                <AnimatePresence>
                                {isCategoryBudgetOpen && (
                                     <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="overflow-hidden"
                                    >
                                        <div className="space-y-4 mt-4">
                                            {budgetedCategories.map(category => {
                                                const spent = spendingByCategory.get(category.id) || 0;
                                                const budget = category.budget!;
                                                const percentage = (spent / budget) * 100;
                                                const totalBudgetShare = props.totalMonthlyBudget > 0 ? ((budget / props.totalMonthlyBudget) * 100) : 0;
                                                const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
                                                
                                                return (
                                                    <div key={category.id}>
                                                        <div className="flex justify-between items-center text-sm mb-1.5">
                                                            <div className="flex items-center gap-3 truncate">
                                                                <Icon className="h-4 w-4 flex-shrink-0" style={{ color: category.color }} />
                                                                <span className="font-medium text-white truncate">{category.name}</span>
                                                            </div>
                                                            <div className="font-semibold text-white flex-shrink-0 pl-2">
                                                                {formatCurrency(spent)}
                                                                <span className="text-slate-500 text-xs"> / {formatCurrency(budget)}</span>
                                                            </div>
                                                        </div>
                                                        <ProgressBar percentage={percentage} color={getCategoryBarColor(percentage, category.color)} />
                                                        {totalBudgetShare > 0 && (
                                                            <p className="text-xs text-slate-500 text-right mt-1">
                                                                Entspricht {totalBudgetShare.toFixed(0)}% des Gesamtbudgets
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            </div>
                        )}
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
    addTransaction: (t: Omit<Transaction, 'id' | 'date' | 'tagIds'> & { tags?: string[] }) => void;
    categories: Category[];
    categoryGroups: string[];
    allAvailableTags: Tag[];
    transactions: Transaction[];
}> = ({ addTransaction, categories, categoryGroups, allAvailableTags, transactions }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [tags, setTags] = useState<string[]>([]);

    const recentlyUsedTags = useMemo(() => {
        const sortedTransactions = [...transactions].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        const recentTagIds = new Set<string>();

        for (const transaction of sortedTransactions) {
            if (recentTagIds.size >= 10) break;
            if (transaction.tagIds) {
                for (const tagId of transaction.tagIds) {
                    if (recentTagIds.size >= 10) break;
                    recentTagIds.add(tagId);
                }
            }
        }
        
        const tagMap = new Map(allAvailableTags.map(t => [t.id, t]));
        return Array.from(recentTagIds).map(id => tagMap.get(id)).filter((t): t is Tag => !!t);
    }, [transactions, allAvailableTags]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount.replace(',', '.'));
        if (!numAmount || numAmount <= 0 || !description || !categoryId) {
            if (!categoryId) {
                alert("Bitte wählen Sie eine Kategorie aus.");
            }
            return;
        }
        
        addTransaction({ 
            amount: numAmount, 
            description, 
            categoryId, 
            tags,
        });
        
        setAmount('');
        setDescription('');
        setTags([]);
        setCategoryId('');
    };

    const handleTagClick = (tag: string) => {
        setTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
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
                    
                    <div className="pt-2">
                        <h4 className="text-sm font-semibold text-white mb-3">Kategorie wählen:</h4>
                        <CategoryButtons
                            categories={categories}
                            categoryGroups={categoryGroups}
                            selectedCategoryId={categoryId}
                            onSelectCategory={setCategoryId}
                        />
                    </div>

                    <div className="space-y-3">
                        <TagInput 
                            tags={tags} 
                            setTags={setTags}
                            allAvailableTags={allAvailableTags}
                        />
                        <AvailableTags 
                            availableTags={recentlyUsedTags}
                            selectedTags={tags}
                            onTagClick={handleTagClick}
                        />
                    </div>
                    
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