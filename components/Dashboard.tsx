
import React, { useState, useMemo } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Transaction, Category, ViewMode, CategoryId } from '../types';
import { format, parseISO, formatCurrency, de } from '../utils/dateUtils';
import { getWeekInterval, getMonthInterval, filterTransactionsByInterval } from '../utils/dateUtils';
import { iconMap, Plus, Edit, Trash2, BarChart2, ChevronDown, Coins } from './Icons';

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

        const filtered = filterTransactionsByInterval(props.transactions, interval);
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
        
        const average = daysInPeriod > 0 ? total / daysInPeriod : 0;

        return { filteredTransactions: filtered, totalExpenses: total, dailyAverage: average, subtext };
    }, [props.transactions, viewMode]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-white">Übersicht</h1>
                <ViewTabs viewMode={viewMode} setViewMode={setViewMode} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <QuickAddForm categories={props.categories} addTransaction={props.addTransaction} />
                </div>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex items-center justify-center min-h-[280px] h-full">
                    <CategoryPieChart transactions={filteredTransactions} categoryMap={props.categoryMap} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <StatCard 
                    icon={<Coins className="h-6 w-6" />} 
                    title="Gesamtausgaben"
                    value={formatCurrency(totalExpenses)}
                    subtext={subtext}
                />
                <StatCard 
                    icon={<BarChart2 className="h-6 w-6" />} 
                    title="Tagesdurchschnitt"
                    value={formatCurrency(dailyAverage)}
                    subtext={subtext}
                />
            </div>
            
            <TransactionList 
                transactions={filteredTransactions}
                categories={props.categories}
                categoryMap={props.categoryMap}
                updateTransaction={props.updateTransaction}
                deleteTransaction={props.deleteTransaction}
            />
        </div>
    );
};

const ViewTabs: FC<{ viewMode: ViewMode; setViewMode: (mode: ViewMode) => void; }> = ({ viewMode, setViewMode }) => {
    const tabs: { id: ViewMode; label: string }[] = [{ id: 'woche', label: 'Diese Woche' }, { id: 'monat', label: 'Dieser Monat' }];

    return (
        <div className="bg-slate-800 p-1 rounded-full flex items-center self-start">
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

const StatCard: FC<{ icon: React.ReactNode; title: string; value: string; subtext?: string; }> = ({ icon, title, value, subtext }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between text-slate-400 mb-2">
            <p className="font-medium">{title}</p>
            {icon}
        </div>
        <div>
            <p className="text-3xl font-bold text-white">{value}</p>
            {subtext && <p className="text-sm text-slate-500">{subtext}</p>}
        </div>
    </motion.div>
);

const QuickAddForm: FC<{ categories: Category[], addTransaction: (t: Omit<Transaction, 'id'>) => void }> = ({ categories, addTransaction }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState(categories[0]?.id || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount.replace(',', '.'));
        if (!numAmount || numAmount <= 0 || !description || !categoryId) {
            alert("Bitte alle Felder korrekt ausfüllen.");
            return;
        }
        addTransaction({ amount: numAmount, description, categoryId, date: new Date().toISOString() });
        setAmount('');
        setDescription('');
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-800 p-6 rounded-2xl h-full">
            <h3 className="text-xl font-bold text-white mb-6">Ausgabe hinzufügen</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-slate-400 mb-2">Betrag (€)</label>
                    <input id="amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="z.B. 12,50" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500" />
                </div>
                <div>
                     <label htmlFor="category" className="block text-sm font-medium text-slate-400 mb-2">Kategorie</label>
                     <div className="relative">
                        <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500 appearance-none">
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="description" className="block text-sm font-medium text-slate-400 mb-2">Beschreibung</label>
                    <input id="description" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="z.B. Mittagessen" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500" />
                </div>
                <div className="md:col-span-2">
                    <button type="submit" className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold py-3 rounded-lg shadow-md hover:opacity-90 transition-opacity">
                        <Plus className="h-5 w-5" /> Ausgabe hinzufügen
                    </button>
                </div>
            </form>
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-slate-800 p-6 rounded-2xl">
            <h3 className="font-bold text-white mb-4">Letzte Transaktionen</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
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
                )) : <p className="text-slate-500 text-center py-4">Keine Transaktionen.</p>}
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
    
    const Icon = category ? iconMap[category.icon] || iconMap.MoreHorizontal : iconMap.MoreHorizontal;
    const color = category ? category.color : '#64748b';

    const handleSave = () => {
        onUpdate(formState);
        onEditClick();
    };

    if (isEditing) {
        return (
            <div className="bg-slate-700 p-3 rounded-lg space-y-3">
                 <input type="number" step="0.01" value={formState.amount} onChange={e => setFormState({...formState, amount: parseFloat(e.target.value) || 0})} className="w-full bg-slate-600 border border-slate-500 rounded-md px-2 py-1 text-white" />
                 <input type="text" value={formState.description} onChange={e => setFormState({...formState, description: e.target.value})} className="w-full bg-slate-600 border border-slate-500 rounded-md px-2 py-1 text-white" />
                 <div className="relative">
                    <select value={formState.categoryId} onChange={e => setFormState({...formState, categoryId: e.target.value})} className="w-full bg-slate-600 border border-slate-500 rounded-md px-2 py-1 text-white appearance-none">
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                 </div>
                 <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onEditClick} className="text-slate-400 hover:text-white text-xs px-2 py-1">Abbrechen</button>
                    <button onClick={handleSave} className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-3 py-1 rounded">Speichern</button>
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
                <p className="text-xs text-slate-400">{format(parseISO(transaction.date), 'dd. MMMM, HH:mm')}</p>
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
                const { payload } = entry;
                const formattedValue = payload && payload.value != null ? formatCurrency(payload.value) : '';
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
