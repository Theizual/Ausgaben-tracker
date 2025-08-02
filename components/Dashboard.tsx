import React, { useState, useMemo, useRef } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Transaction, Category, ViewMode, CategoryId } from '../types';
import { format, parseISO, formatCurrency, de, endOfDay, isWithinInterval } from '../utils/dateUtils';
import { getWeekInterval, getMonthInterval } from '../utils/dateUtils';
import { iconMap, Plus, Edit, Trash2, BarChart2, ChevronDown, Coins, CalendarDays } from './Icons';

type DashboardProps = {
    transactions: Transaction[];
    categories: Category[];
    categoryMap: Map<string, Category>;
    addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
    updateTransaction: (transaction: Transaction) => void;
    deleteTransaction: (id: string) => void;
};

const Dashboard: FC<DashboardProps> = (props) => {
    const [viewMode, setViewMode] = useState<ViewMode>('woche');
    
    const { filteredTransactions, totalExpenses, dailyAverage, subtext } = useMemo(() => {
        const now = new Date();
        const interval = viewMode === 'woche' ? getWeekInterval(now) : getMonthInterval(now);
        
        let subtext: string;
        if (viewMode === 'woche') {
            const range = `${format(interval.start, 'd. MMM', { locale: de })} - ${format(interval.end, 'd. MMM', { locale: de })}`;
            subtext = `in dieser Woche (${range})`;
        } else {
            const range = format(interval.start, 'MMMM yyyy', { locale: de });
            subtext = `in diesem Monat (${range})`;
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
        
        // Calculate total only up to the current day for the average to be accurate
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-white">Übersicht</h1>
            </div>

            <QuickAddForm categories={props.categories} addTransaction={props.addTransaction} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Right column: Chart and Stats. Shows first on mobile. */}
                <div className="lg:col-span-1 space-y-6 order-1 lg:order-2">
                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                        <div className="h-[280px]">
                            <CategoryPieChart transactions={filteredTransactions} categoryMap={props.categoryMap} />
                        </div>
                        <div className="mt-4 flex justify-center">
                            <ViewTabs viewMode={viewMode} setViewMode={setViewMode} />
                        </div>
                    </div>
                    
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50"
                    >
                        {/* Total Expenses */}
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                            <p className="font-medium">Gesamtausgaben</p>
                            <Coins className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{formatCurrency(totalExpenses)}</p>
                            {subtext && <p className="text-sm text-slate-500">{subtext}</p>}
                        </div>

                        <div className="my-4 border-t border-slate-700/50"></div>

                        {/* Daily Average */}
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                            <p className="font-medium">Tagesdurchschnitt</p>
                            <BarChart2 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{formatCurrency(dailyAverage)}</p>
                            {subtext && <p className="text-sm text-slate-500">{subtext}</p>}
                        </div>
                    </motion.div>
                </div>

                {/* Left column: Transaction List. Shows second on mobile. */}
                <div className="lg:col-span-2 order-2 lg:order-1 h-[640px] lg:h-auto">
                    <TransactionList 
                        transactions={filteredTransactions}
                        categories={props.categories}
                        categoryMap={props.categoryMap}
                        updateTransaction={props.updateTransaction}
                        deleteTransaction={props.deleteTransaction}
                    />
                </div>

            </div>
        </div>
    );
};

const ViewTabs: FC<{ viewMode: ViewMode; setViewMode: (mode: ViewMode) => void; }> = ({ viewMode, setViewMode }) => {
    const tabs: { id: ViewMode; label: string }[] = [{ id: 'woche', label: 'Diese Woche' }, { id: 'monat', label: 'Dieser Monat' }];

    return (
        <div className="bg-slate-800 p-1 rounded-full flex items-center">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setViewMode(tab.id)}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors duration-300 ${
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

const QuickAddForm: FC<{ categories: Category[], addTransaction: (t: Omit<Transaction, 'id'>) => void }> = ({ categories, addTransaction }) => {
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

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-grow">
                            <select
                                id="category"
                                value={categoryId}
                                onChange={e => setCategoryId(e.target.value)}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-rose-500 appearance-none"
                                required
                            >
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                        </div>
                        
                        <button
                            type="submit"
                            className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold px-4 py-2.5 rounded-lg shadow-md hover:opacity-90 transition-opacity"
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

const TransactionList: FC<{ 
    transactions: Transaction[]; 
    categories: Category[];
    categoryMap: Map<string, Category>; 
    updateTransaction: (t: Transaction) => void;
    deleteTransaction: (id: string) => void; 
}> = ({ transactions, categories, categoryMap, updateTransaction, deleteTransaction }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col h-full"
        >
            <h3 className="font-bold text-white mb-4 flex-shrink-0">Letzte Transaktionen</h3>
            <div className="flex-grow space-y-3 overflow-y-auto -mr-4 pr-4">
                <AnimatePresence>
                {transactions.length > 0 ? transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                    <motion.div key={t.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                        <TransactionItem 
                            transaction={t}
                            category={categoryMap.get(t.categoryId)}
                            categories={categories}
                            onUpdate={updateTransaction}
                            onDelete={deleteTransaction}
                            isEditing={editingId === t.id}
                            onEditClick={() => setEditingId(t.id === editingId ? null : t.id)}
                        />
                    </motion.div>
                )) : <p className="text-slate-500 text-center py-4">Keine Transaktionen in diesem Zeitraum.</p>}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

const TransactionItem: FC<{ 
    transaction: Transaction; 
    category?: Category; 
    categories: Category[];
    onUpdate: (t: Transaction) => void; 
    onDelete: (id: string) => void; 
    isEditing: boolean; 
    onEditClick: () => void; 
}> = ({ transaction, category, categories, onUpdate, onDelete, isEditing, onEditClick }) => {
    const [formState, setFormState] = useState(transaction);
    
    React.useEffect(() => {
        setFormState(transaction);
    }, [transaction, isEditing]);
    
    const Icon = category ? iconMap[category.icon] || iconMap.MoreHorizontal : iconMap.MoreHorizontal;
    const color = category ? category.color : '#64748b';

    const handleSave = () => {
        onUpdate(formState);
        onEditClick();
    };

    const formattedDate = React.useMemo(() => {
        try {
            if (!transaction.date || typeof transaction.date !== 'string') {
                return 'Ungültiges Datum';
            }
            const parsedDate = parseISO(transaction.date);
            if (isNaN(parsedDate.getTime())) {
                return 'Ungültiges Datum';
            }
            return format(parsedDate, 'dd. MMMM, HH:mm');
        } catch (error) {
            return 'Ungültiges Datum';
        }
    }, [transaction.date]);

    if (isEditing) {
        // Safely format the date for the input to prevent crashes from invalid date strings
        const getFormattedDate = () => {
            try {
                // Ensure date is a valid string before parsing
                if (!formState.date || typeof formState.date !== 'string') {
                    return '';
                }
                const parsedDate = parseISO(formState.date);
                if (isNaN(parsedDate.getTime())) return '';
                return format(parsedDate, 'yyyy-MM-dd');
            } catch (error) {
                console.error(`Invalid date format for transaction ${formState.id}:`, formState.date, error);
                // Return an empty string, forcing the user to select a valid date
                return '';
            }
        };

        return (
            <div className="bg-slate-700/80 p-3 rounded-lg space-y-3 ring-2 ring-rose-500">
                <div className="grid grid-cols-2 gap-3">
                    <input 
                        type="number" 
                        step="0.01" 
                        value={formState.amount} 
                        onChange={e => setFormState({...formState, amount: parseFloat(e.target.value) || 0})} 
                        className="w-full bg-slate-600 border border-slate-500 rounded-md px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        placeholder="Betrag"
                    />
                    <input
                        type="date"
                        value={getFormattedDate()}
                        onChange={(e) => {
                            try {
                                if (e.target.value) {
                                    const transactionDate = endOfDay(parseISO(e.target.value));
                                    setFormState({...formState, date: transactionDate.toISOString()});
                                }
                            } catch (err) {
                                console.error("Could not parse date", e.target.value)
                            }
                        }}
                        className="w-full bg-slate-600 border border-slate-500 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                        required
                    />
                 </div>
                 <input 
                    type="text" 
                    value={formState.description} 
                    onChange={e => setFormState({...formState, description: e.target.value})} 
                    className="w-full bg-slate-600 border border-slate-500 rounded-md px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Beschreibung"
                />
                 <div className="relative">
                    <select 
                        value={formState.categoryId} 
                        onChange={e => setFormState({...formState, categoryId: e.target.value})} 
                        className="w-full bg-slate-600 border border-slate-500 rounded-md px-3 py-2 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                 </div>
                 <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onEditClick} className="text-slate-400 hover:text-white px-4 py-1.5 rounded-md hover:bg-slate-600/50 transition-colors text-sm">Abbrechen</button>
                    <button onClick={handleSave} className="bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold px-4 py-1.5 rounded-md transition-colors">Speichern</button>
                 </div>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-4 bg-slate-800/50 hover:bg-slate-700/50 p-3 rounded-lg transition-colors">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
                <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
                <p className="font-medium text-white">{transaction.description}</p>
                <p className="text-xs text-slate-400">{formattedDate}</p>
            </div>
            <div className="text-right">
                 <p className="font-bold text-white">{formatCurrency(transaction.amount)}</p>
                 <div className="flex gap-3 justify-end mt-1">
                    <button onClick={onEditClick}><Edit className="h-4 w-4 text-slate-500 hover:text-rose-400" /></button>
                    <button onClick={() => onDelete(transaction.id)}><Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" /></button>
                 </div>
            </div>
        </div>
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
                // Defensive check to prevent crash if entry or payload is malformed
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