import React, { useState, useMemo } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useApp } from '../contexts/AppContext';
import type { Transaction, Category, ViewMode, CategoryId, Tag } from '../types';
import { format, parseISO, formatCurrency, de, endOfDay, isWithinInterval, startOfMonth, endOfMonth, getWeekInterval, getMonthInterval, isSameDay } from '../utils/dateUtils';
import { iconMap, Plus, BarChart2, ChevronDown, Coins } from './Icons';
import CategoryButtons from './CategoryButtons';
import TagInput from './TagInput';
import AvailableTags from './AvailableTags';
import SpendingTimeSeries from './SpendingTimeSeries';

const MotionDiv = motion('div');

const ProgressBar: FC<{ percentage: number; color: string; }> = ({ percentage, color }) => (
    <div className="w-full bg-slate-700 rounded-full h-2">
        <MotionDiv
            className="h-2 rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
        />
    </div>
);


const Dashboard: FC = () => {
    const {
        transactions,
        categories,
        categoryGroups,
        categoryMap,
        addTransaction,
        totalMonthlyBudget,
        totalSpentThisMonth,
        allAvailableTags,
        handleTransactionClick,
        dashboardViewMode,
        setDashboardViewMode,
    } = useApp();

    const [isCategoryBudgetOpen, setCategoryBudgetOpen] = useState(false);
    const [expandedBudgetId, setExpandedBudgetId] = useState<string | null>(null);
    
    const { filteredTransactions, totalExpenses, todaysExpenses, totalExpensesLabel, todaysExpensesLabel, monthlyTransactions } = useMemo(() => {
        const now = new Date();
        const weekInterval = getWeekInterval(now);
        const monthInterval = getMonthInterval(now);
    
        const allMonthlyTransactions = transactions.filter(t => {
            try { return isWithinInterval(parseISO(t.date), monthInterval); } catch { return false; }
        });
    
        const interval = dashboardViewMode === 'woche' ? weekInterval : monthInterval;
        
        // Label for Total Expenses
        let totalExpensesLabel: string;
        if (dashboardViewMode === 'woche') {
            const range = `${format(interval.start, 'd. MMM', { locale: de })} - ${format(interval.end, 'd. MMM', { locale: de })}`;
            totalExpensesLabel = `Diese Woche (${range})`;
        } else {
            const range = format(interval.start, 'MMMM yyyy', { locale: de });
            totalExpensesLabel = `Dieser Monat (${range})`;
        }
    
        const filteredTransactions = transactions.filter(t => {
            if (!t.date || typeof t.date !== 'string') return false;
            try {
                const date = parseISO(t.date);
                return !isNaN(date.getTime()) && isWithinInterval(date, interval);
            } catch {
                return false;
            }
        });
    
        const totalExpenses = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

        // --- Calculation for Today's Expenses ---
        const todaysTransactions = transactions.filter(t => {
            if (!t.date || typeof t.date !== 'string') return false;
            try {
                const date = parseISO(t.date);
                return !isNaN(date.getTime()) && isSameDay(date, now);
            } catch {
                return false;
            }
        });
        const todaysExpenses = todaysTransactions.reduce((sum, t) => sum + t.amount, 0);
        const todaysExpensesLabel = `Heute, ${format(now, 'd. MMMM', { locale: de })}`;
        
        return { 
            filteredTransactions, 
            totalExpenses, 
            todaysExpenses, 
            totalExpensesLabel,
            todaysExpensesLabel, 
            monthlyTransactions: allMonthlyTransactions 
        };
    }, [transactions, dashboardViewMode]);

    const { spendingByCategory, budgetedCategories } = useMemo(() => {
        const spendingMap = new Map<CategoryId, number>();
        monthlyTransactions.forEach(t => {
            spendingMap.set(t.categoryId, (spendingMap.get(t.categoryId) || 0) + t.amount);
        });
        
        const budgetedCats = categories.filter(c => c.budget && c.budget > 0);

        return { 
            spendingByCategory: spendingMap,
            budgetedCategories: budgetedCats
        };
    }, [monthlyTransactions, categories]);

    const totalBudgetPercentage = totalMonthlyBudget > 0 ? (totalSpentThisMonth / totalMonthlyBudget) * 100 : 0;
    
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
                    <QuickAddForm />
                </div>
                
                {/* Right Column */}
                <div className="space-y-6">
                    <MotionDiv
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white">Zusammenfassung</h3>
                            <ViewTabs viewMode={dashboardViewMode} setViewMode={setDashboardViewMode} />
                        </div>
                        <div className="flex justify-between items-start">
                             <div className="w-[calc(50%-1rem)]">
                                <div className="flex items-center text-slate-400 mb-1">
                                    <BarChart2 className="h-5 w-5 mr-2 flex-shrink-0" />
                                    <p className="font-medium text-sm">Tagesausgaben</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white truncate" title={formatCurrency(todaysExpenses)}>{formatCurrency(todaysExpenses)}</p>
                                    <p className="text-xs text-slate-500 truncate mt-0.5" title={todaysExpensesLabel}>{todaysExpensesLabel}</p>
                                </div>
                            </div>
                            
                            <div className="w-px bg-slate-700/50 self-stretch mx-4"></div>
                            
                            <div className="w-[calc(50%-1rem)]">
                                <div className="flex items-center text-slate-400 mb-1">
                                    <Coins className="h-5 w-5 mr-2 flex-shrink-0" />
                                    <p className="font-medium text-sm">Gesamtausgaben</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white truncate" title={formatCurrency(totalExpenses)}>{formatCurrency(totalExpenses)}</p>
                                    <p className="text-xs text-slate-500 truncate mt-0.5" title={totalExpensesLabel}>{totalExpensesLabel}</p>
                                </div>
                            </div>
                        </div>
                    </MotionDiv>
                    <MotionDiv
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white">Analyse</h3>
                        </div>
                        <div className="h-[250px]">
                            <CategoryPieChart transactions={filteredTransactions} categoryMap={categoryMap} />
                        </div>
                        {totalMonthlyBudget > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-700/50">
                                <h4 className="text-sm font-semibold text-slate-300 mb-3">Monatsbudget</h4>
                                <div className="flex justify-between items-baseline text-sm mb-1">
                                    <p className="text-slate-300">
                                        <span className="font-semibold text-white">{formatCurrency(totalSpentThisMonth)}</span>
                                        <span className="text-slate-500"> / {formatCurrency(totalMonthlyBudget)}</span>
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
                                     <MotionDiv
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
                                                const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
                                                const isExpanded = expandedBudgetId === category.id;
                                                
                                                return (
                                                    <div key={category.id} className="bg-slate-700/30 p-3 rounded-lg">
                                                        <div 
                                                            className="flex flex-col cursor-pointer"
                                                            onClick={() => setExpandedBudgetId(isExpanded ? null : category.id)}
                                                        >
                                                            <div className="flex justify-between items-center text-sm mb-1.5">
                                                                <div className="flex items-center gap-3 truncate">
                                                                    <Icon className="h-4 w-4 flex-shrink-0" style={{ color: category.color }} />
                                                                    <span className="font-medium text-white truncate">{category.name}</span>
                                                                    <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                                </div>
                                                                <div className="font-semibold text-white flex-shrink-0 pl-2">
                                                                    {formatCurrency(spent)}
                                                                    <span className="text-slate-500 text-xs"> / {formatCurrency(budget)}</span>
                                                                </div>
                                                            </div>
                                                            <ProgressBar percentage={percentage} color={getCategoryBarColor(percentage, category.color)} />
                                                        </div>
                                                         <AnimatePresence>
                                                            {isExpanded && (
                                                                <MotionDiv
                                                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                                    animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
                                                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="ml-4 pl-4 border-l-2 border-slate-600/50 space-y-2">
                                                                        {monthlyTransactions.filter(t => t.categoryId === category.id)
                                                                            .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                                                                            .map(t => (
                                                                                <button
                                                                                    key={t.id}
                                                                                    onClick={() => handleTransactionClick(t, 'view')}
                                                                                    className="w-full flex items-center gap-3 text-sm p-2 rounded-md hover:bg-slate-700/50 text-left"
                                                                                >
                                                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: category.color }}>
                                                                                        <Icon className="h-5 w-5 text-white" />
                                                                                    </div>
                                                                                    <div className="flex-1 flex justify-between items-center min-w-0">
                                                                                        <div className="min-w-0">
                                                                                            <p className="text-slate-300 truncate">{t.description}</p>
                                                                                            <p className="text-xs text-slate-500">{format(parseISO(t.date), 'dd.MM, HH:mm')} Uhr</p>
                                                                                        </div>
                                                                                        <p className="font-semibold text-slate-200 flex-shrink-0 pl-2">{formatCurrency(t.amount)}</p>
                                                                                    </div>
                                                                                </button>
                                                                            ))
                                                                        }
                                                                         {monthlyTransactions.filter(t => t.categoryId === category.id).length === 0 && (
                                                                            <p className="text-slate-500 text-sm p-2">Keine Ausgaben diesen Monat.</p>
                                                                        )}
                                                                    </div>
                                                                </MotionDiv>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </MotionDiv>
                                )}
                                </AnimatePresence>
                            </div>
                        )}
                    </MotionDiv>
                </div>
            </div>
            <div className="lg:col-span-2">
                <SpendingTimeSeries transactions={transactions} defaultAggregation="day" defaultRangeInDays={30} />
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

const QuickAddForm: FC = () => {
    const { 
        addTransaction,
        addMultipleTransactions,
        categories, 
        categoryGroups, 
        allAvailableTags, 
        transactions 
    } = useApp();
    
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
                toast.error("Bitte wählen Sie eine Kategorie aus.");
            }
            return;
        }
        
        const items = description.split(',').map(d => d.trim()).filter(Boolean);

        if (items.length > 1) {
            const totalCents = Math.round(numAmount * 100);
            const itemCount = items.length;
            const baseCents = Math.floor(totalCents / itemCount);
            let remainderCents = totalCents % itemCount;

            const transactionsToCreate = items.map(itemDesc => {
                let itemCents = baseCents;
                if (remainderCents > 0) {
                    itemCents++;
                    remainderCents--;
                }
                return {
                    description: itemDesc,
                    amount: itemCents / 100,
                };
            });
            addMultipleTransactions(transactionsToCreate, { categoryId, tags });
        } else {
            addTransaction({ 
                amount: numAmount, 
                description, 
                categoryId, 
                tags,
            });
        }
        
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
        <MotionDiv initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-bold text-white mb-4">Ausgabe hinzufügen</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="sm:w-48 flex-shrink-0">
                            <div className="flex items-center bg-slate-700 border border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-rose-500 px-3">
                                <Coins className="h-5 w-5 text-slate-400 shrink-0" />
                                <input
                                    id="amount"
                                    type="text"
                                    inputMode="decimal"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="Betrag"
                                    className="w-full bg-transparent border-none pl-2 pr-0 py-2.5 text-white placeholder-slate-500 focus:outline-none"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex-grow">
                            <input
                                id="description"
                                type="text"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Beschreibung..."
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                required
                            />
                             <p className="text-xs text-slate-400 mt-1.5 px-1">Tipp: Mehrere Artikel mit Komma trennen für eine Aufteilung.</p>
                        </div>
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
        </MotionDiv>
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