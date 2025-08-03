import React, { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import type { Transaction, Category, Tag } from '../types';
import { format, parseISO, formatCurrency } from '../utils/dateUtils';
import { de } from 'date-fns/locale';
import { Search, Hash, Coins, BarChart2, CalendarDays } from './Icons';
import { iconMap } from './Icons';

interface TagsPageProps {
    transactions: Transaction[];
    tags: Tag[];
    tagMap: Map<string, string>;
    categoryMap: Map<string, Category>;
    selectedTagId: string | null;
    onTagSelect: (tagId: string) => void;
}

const TagsPage: FC<TagsPageProps> = ({ transactions, tags, tagMap, categoryMap, selectedTagId, onTagSelect }) => {
    
    useEffect(() => {
        // If a tag is selected from another page, but no tag is selected in this component's state,
        // or if there are tags but none are selected, select the first one.
        if (selectedTagId) {
            // Component is controlled by App state
        } else if (tags.length > 0 && !selectedTagId) {
            onTagSelect(tags[0].id);
        }
    }, [selectedTagId, tags, onTagSelect]);


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Tag-Analyse</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1">
                    <TagList 
                        tags={tags}
                        transactions={transactions}
                        selectedTagId={selectedTagId} 
                        onTagSelect={onTagSelect}
                    />
                </motion.div>
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
                    <AnimatePresence mode="wait">
                        {selectedTagId ? (
                            <TagDetailView
                                key={selectedTagId} // Re-mount component on tag change for animations
                                tagId={selectedTagId}
                                transactions={transactions}
                                tagMap={tagMap}
                                categoryMap={categoryMap}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-96 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                <p className="text-slate-500">Wählen Sie einen Tag aus, um die Details anzuzeigen.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
};

const TagList: FC<{
    tags: Tag[],
    transactions: Transaction[],
    selectedTagId: string | null,
    onTagSelect: (tagId: string) => void;
}> = ({ tags, transactions, selectedTagId, onTagSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const tagSpending = useMemo(() => {
        const spendingMap = new Map<string, number>();
        transactions.forEach(t => {
            t.tagIds?.forEach(tagId => {
                spendingMap.set(tagId, (spendingMap.get(tagId) || 0) + t.amount);
            });
        });
        return spendingMap;
    }, [transactions]);
    
    const sortedAndFilteredTags = useMemo(() => {
        return tags
            .map(tag => ({...tag, total: tagSpending.get(tag.id) || 0}))
            .filter(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a,b) => b.total - a.total);
    }, [tags, searchTerm, tagSpending]);

    return (
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Tag suchen..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
            </div>
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto space-y-2 -mr-2 pr-2">
                {sortedAndFilteredTags.map(tag => (
                    <button
                        key={tag.id}
                        onClick={() => onTagSelect(tag.id)}
                        className={`w-full flex justify-between items-center p-3 rounded-lg text-left transition-colors ${
                            selectedTagId === tag.id
                                ? 'bg-rose-600/20 ring-1 ring-rose-500'
                                : 'hover:bg-slate-700/70'
                        }`}
                    >
                        <div>
                            <p className={`font-semibold ${selectedTagId === tag.id ? 'text-rose-300' : 'text-white'}`}>#{tag.name}</p>
                        </div>
                        <p className={`text-sm font-bold ${selectedTagId === tag.id ? 'text-white' : 'text-slate-300'}`}>{formatCurrency(tag.total)}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

const TagDetailView: FC<{
    tagId: string,
    transactions: Transaction[],
    tagMap: Map<string, string>,
    categoryMap: Map<string, Category>
}> = ({ tagId, transactions, tagMap, categoryMap }) => {
    
    const tagName = tagMap.get(tagId);

    const relatedTransactions = useMemo(() => {
        return transactions.filter(t => t.tagIds?.includes(tagId)).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }, [tagId, transactions]);
    
    const stats = useMemo(() => {
        const total = relatedTransactions.reduce((sum, t) => sum + t.amount, 0);
        const count = relatedTransactions.length;
        const average = count > 0 ? total / count : 0;
        return { total, count, average };
    }, [relatedTransactions]);

    const categoryBreakdownData = useMemo(() => {
        const spending = new Map<string, number>();
        relatedTransactions.forEach(t => {
            spending.set(t.categoryId, (spending.get(t.categoryId) || 0) + t.amount);
        });
        return Array.from(spending.entries())
            .map(([id, amount]) => ({
                id,
                name: categoryMap.get(id)?.name || 'Unbekannt',
                value: amount,
                color: categoryMap.get(id)?.color || '#64748b'
            }))
            .sort((a,b) => b.value - a.value);
    }, [relatedTransactions, categoryMap]);
    
    const spendingOverTimeData = useMemo(() => {
        const dailySpending = new Map<string, number>();
         relatedTransactions.forEach(t => {
            const day = format(parseISO(t.date), 'yyyy-MM-dd');
            dailySpending.set(day, (dailySpending.get(day) || 0) + t.amount);
         });
         return Array.from(dailySpending.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    }, [relatedTransactions]);

    if (!tagName) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                <Hash className="text-rose-400 h-7 w-7" />
                <span>{tagName}</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={Coins} title="Gesamtausgaben" value={formatCurrency(stats.total)} />
                <StatCard icon={BarChart2} title="Transaktionen" value={stats.count.toString()} />
                <StatCard icon={CalendarDays} title="Ø pro Transaktion" value={formatCurrency(stats.average)} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div className="xl:col-span-2 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                    <h3 className="font-bold text-white mb-4">Top Kategorien</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)'}} />
                                <Pie data={categoryBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                                    {categoryBreakdownData.map(entry => <Cell key={entry.id} fill={entry.color} />)}
                                </Pie>
                                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                 <div className="xl:col-span-3 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                    <h3 className="font-bold text-white mb-4">Ausgaben im Zeitverlauf</h3>
                    <div className="h-64 pr-4">
                        <ResponsiveContainer width="100%" height="100%">
                             <LineChart data={spendingOverTimeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                                <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), 'd. MMM', {locale: de})} stroke="#94a3b8" fontSize={12} />
                                <YAxis tickFormatter={(v) => formatCurrency(v)} stroke="#94a3b8" fontSize={12} width={80} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="amount" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4, fill: '#f43f5e' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <h3 className="font-bold text-white mb-4">Alle Transaktionen für #{tagName} ({relatedTransactions.length})</h3>
                <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                    {relatedTransactions.map(t => {
                        const category = categoryMap.get(t.categoryId);
                        if (!category) return null;
                        const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
                        return (
                            <div key={t.id} className="flex items-center gap-4 bg-slate-800 p-3 rounded-lg">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: category.color }}>
                                    <Icon className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white truncate">{t.description}</p>
                                    <p className="text-xs text-slate-400">{format(parseISO(t.date), 'dd. MMMM yyyy, HH:mm')} Uhr</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="font-bold text-white">{formatCurrency(t.amount)}</p>
                                    <p className="text-xs text-slate-500">{category.name}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </motion.div>
    )
}

const StatCard: FC<{ icon: FC<any>, title: string, value: string }> = ({ icon: Icon, title, value }) => (
    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex items-center gap-4">
        <div className="bg-slate-700 p-3 rounded-full">
            <Icon className="h-6 w-6 text-rose-400" />
        </div>
        <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        const name = data.name || data.payload.name;
        return (
            <div className="bg-slate-700 p-3 rounded-lg border border-slate-600 shadow-xl">
                 <p className="text-sm text-slate-400">{label ? format(parseISO(label), 'eeee, d. MMM', { locale: de }) : name}</p>
                 <p className="font-bold text-white" style={{color: data.color || data.payload.color || '#f43f5e'}}>
                    {formatCurrency(data.value)}
                </p>
            </div>
        );
    }
    return null;
};

export default TagsPage;