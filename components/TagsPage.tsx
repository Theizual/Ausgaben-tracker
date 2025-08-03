import React, { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Transaction, Category, Tag } from '../types';
import { format, parseISO, formatCurrency, de, isWithinInterval, addMonths, subMonths, addYears, subYears, getMonthInterval, getYearInterval } from '../utils/dateUtils';
import { Search, Hash, Coins, BarChart2, CalendarDays, ChevronLeft, ChevronRight } from './Icons';
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
    const [periodType, setPeriodType] = useState<'month' | 'year'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    // This logic determines the active tag ID. It uses the one from props if available,
    // otherwise defaults to the first in the list. This avoids running a side effect
    // to set the default, which could cause infinite loops.
    const activeTagId = selectedTagId || (tags.length > 0 ? tags[0].id : null);
    
    // This effect ensures that if the page is loaded without a pre-selected tag,
    // the parent component's state is updated to reflect the default selection.
    useEffect(() => {
        if (!selectedTagId && tags.length > 0) {
            onTagSelect(tags[0].id);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tags]); // It should only depend on tags being loaded

    if (tags.length === 0) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-white">Tag-Analyse</h1>
                <div className="flex items-center justify-center h-96 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <p className="text-slate-500">Keine Tags vorhanden. Fügen Sie bei einer Transaktion einen neuen Tag hinzu.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Tag-Analyse</h1>
             <PeriodNavigator
                periodType={periodType}
                setPeriodType={setPeriodType}
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1">
                    <TagList 
                        tags={tags}
                        transactions={transactions}
                        selectedTagId={activeTagId} 
                        onTagSelect={onTagSelect}
                    />
                </motion.div>
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
                    <AnimatePresence mode="wait">
                        {activeTagId ? (
                            <TagDetailView
                                key={`${activeTagId}-${periodType}-${currentDate.toISOString()}`} // Re-mount for animations
                                tagId={activeTagId}
                                transactions={transactions}
                                tagMap={tagMap}
                                categoryMap={categoryMap}
                                periodType={periodType}
                                currentDate={currentDate}
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

const PeriodNavigator: FC<{
    periodType: 'month' | 'year';
    setPeriodType: (type: 'month' | 'year') => void;
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
}> = ({ periodType, setPeriodType, currentDate, setCurrentDate }) => {
    const changeDate = (direction: 'prev' | 'next') => {
        const amount = direction === 'prev' ? -1 : 1;
        if (periodType === 'month') {
            setCurrentDate(addMonths(currentDate, amount));
        } else {
            setCurrentDate(addYears(currentDate, amount));
        }
    };

    const periodLabel = periodType === 'month'
        ? format(currentDate, 'MMMM yyyy', { locale: de })
        : format(currentDate, 'yyyy', { locale: de });

    return (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
             <div className="bg-slate-800 p-1 rounded-full flex items-center self-start sm:self-center">
                {(['month', 'year'] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => setPeriodType(type)}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors duration-300 ${
                            periodType === type
                                ? 'bg-rose-600 text-white'
                                : 'text-slate-300 hover:bg-slate-700/50'
                        }`}
                    >
                        {type === 'month' ? 'Monat' : 'Jahr'}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-4">
                <button onClick={() => changeDate('prev')} className="p-2 rounded-full hover:bg-slate-700"><ChevronLeft className="h-5 w-5" /></button>
                <span className="font-bold text-white w-36 text-center">{periodLabel}</span>
                <button onClick={() => changeDate('next')} className="p-2 rounded-full hover:bg-slate-700"><ChevronRight className="h-5 w-5" /></button>
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
            <div className="max-h-[calc(100vh-420px)] overflow-y-auto space-y-2 -mr-2 pr-2">
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
    categoryMap: Map<string, Category>,
    periodType: 'month' | 'year',
    currentDate: Date
}> = ({ tagId, transactions, tagMap, categoryMap, periodType, currentDate }) => {
    
    const tagName = tagMap.get(tagId);

    const relatedTransactions = useMemo(() => {
        const interval = periodType === 'month' 
            ? getMonthInterval(currentDate) 
            : getYearInterval(currentDate);

        return transactions
            .filter(t => t.tagIds?.includes(tagId) && isWithinInterval(parseISO(t.date), interval))
            .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }, [tagId, transactions, periodType, currentDate]);
    
    const stats = useMemo(() => {
        const total = relatedTransactions.reduce((sum, t) => sum + t.amount, 0);
        const count = relatedTransactions.length;
        const average = count > 0 ? total / count : 0;
        return { total, count, average };
    }, [relatedTransactions]);

    const mainCategory = useMemo(() => {
        if (relatedTransactions.length === 0) return null;
        
        const spending = new Map<string, number>();
        relatedTransactions.forEach(t => {
            spending.set(t.categoryId, (spending.get(t.categoryId) || 0) + t.amount);
        });
        
        if (spending.size === 0) return null;
        const topEntry = [...spending.entries()].reduce((max, entry) => entry[1] > max[1] ? entry : max);
        const category = categoryMap.get(topEntry[0]);

        return category ? { ...category, amount: topEntry[1] } : null;
    }, [relatedTransactions, categoryMap]);
    
    const spendingOverTimeData = useMemo(() => {
        if (periodType === 'month') {
            const dailySpending = new Map<string, number>();
            relatedTransactions.forEach(t => {
                const day = format(parseISO(t.date), 'yyyy-MM-dd');
                dailySpending.set(day, (dailySpending.get(day) || 0) + t.amount);
            });
            return Array.from(dailySpending.entries())
                .map(([date, amount]) => ({ date, amount }))
                .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
        } else { // year
            const monthlySpending = new Map<string, { date: string, amount: number }>();
            for (let i = 0; i < 12; i++) {
                const monthDate = new Date(currentDate.getFullYear(), i, 1);
                const monthKey = format(monthDate, 'yyyy-MM');
                monthlySpending.set(monthKey, { date: monthKey, amount: 0 });
            }
            relatedTransactions.forEach(t => {
                const monthKey = format(parseISO(t.date), 'yyyy-MM');
                if (monthlySpending.has(monthKey)) {
                    monthlySpending.get(monthKey)!.amount += t.amount;
                }
            });
            return Array.from(monthlySpending.values())
                .sort((a,b) => a.date.localeCompare(b.date));
        }
    }, [relatedTransactions, periodType, currentDate]);

    if (!tagName) return null;

    if (relatedTransactions.length === 0) {
        return (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-96 bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 text-center">
                 <Hash className="text-slate-600 h-12 w-12 mb-4" />
                 <h2 className="text-xl font-bold text-white">Keine Daten für #{tagName}</h2>
                 <p className="text-slate-400">Für den gewählten Zeitraum gibt es keine Transaktionen mit diesem Tag.</p>
            </motion.div>
        )
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                <Hash className="text-rose-400 h-7 w-7" />
                <span>{tagName}</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon={Coins} title="Gesamtausgaben" value={formatCurrency(stats.total)} />
                <StatCard icon={BarChart2} title="Transaktionen" value={stats.count.toString()} />
                {mainCategory && <StatCard icon={iconMap[mainCategory.icon] || BarChart2} title="Hauptkategorie" value={mainCategory.name} subValue={formatCurrency(mainCategory.amount)} />}
            </div>

            <div className="grid grid-cols-1 gap-6">
                 <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                    <h3 className="font-bold text-white mb-4">Ausgaben im Zeitverlauf</h3>
                    <div className="h-64 pr-4">
                        <ResponsiveContainer width="100%" height="100%">
                             <LineChart data={spendingOverTimeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                                <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), periodType === 'month' ? 'd. MMM' : 'MMM', {locale: de})} stroke="#94a3b8" fontSize={12} />
                                <YAxis tickFormatter={(v) => formatCurrency(v)} stroke="#94a3b8" fontSize={12} width={80} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="amount" name="Ausgaben" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4, fill: '#f43f5e' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <h3 className="font-bold text-white mb-4">Transaktionen ({relatedTransactions.length})</h3>
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

const StatCard: FC<{ icon: FC<any>, title: string, value: string, subValue?: string }> = ({ icon: Icon, title, value, subValue }) => (
    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex items-center gap-4">
        <div className="bg-slate-700 p-3 rounded-full">
            <Icon className="h-6 w-6 text-rose-400" />
        </div>
        <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-xl font-bold text-white truncate">{value}</p>
            {subValue && <p className="text-xs text-rose-300 font-semibold">{subValue}</p>}
        </div>
    </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        const formattedLabel = label ? (
            label.includes('-') // Check if it's a date string like '2023-10' or '2023-10-25'
                ? format(parseISO(label), label.length > 7 ? 'eeee, d. MMM' : 'MMMM yyyy', { locale: de }) 
                : label
            ) : data.name;

        return (
            <div className="bg-slate-700 p-3 rounded-lg border border-slate-600 shadow-xl">
                 <p className="text-sm text-slate-400">{formattedLabel}</p>
                 <p className="font-bold text-white" style={{color: '#f43f5e'}}>
                    {formatCurrency(data.value)}
                </p>
            </div>
        );
    }
    return null;
};

export default TagsPage;