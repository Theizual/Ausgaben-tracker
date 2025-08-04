

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useApp } from '../contexts/AppContext';
import type { Transaction, Category, Tag } from '../types';
import { format, parseISO, formatCurrency, de, isWithinInterval, addMonths, subMonths, addYears, subYears, getMonthInterval, getYearInterval } from '../utils/dateUtils';
import { Hash, Coins, BarChart2, ChevronLeft, ChevronRight, X, Edit, Trash2, Plus, Search } from './Icons';
import { iconMap } from './Icons';

const AllTagsModal: FC<{
    allTags: Tag[];
    selectedTagIds: string[];
    onTagClick: (tagId: string) => void;
    onClose: () => void;
}> = ({ allTags, selectedTagIds, onTagClick, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredTags = useMemo(() => 
        allTags
            .filter(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a,b) => a.name.localeCompare(b.name)),
        [allTags, searchTerm]
    );

    return (
        <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-700 flex flex-col max-h-[70vh]"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-4 border-b border-slate-700 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Weitere Tags suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md pl-8 pr-3 py-1.5 text-white placeholder-slate-500 text-sm"
                            autoFocus
                        />
                    </div>
                </header>
                <main className="p-4 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                         {filteredTags.map(tag => {
                            const isSelected = selectedTagIds.includes(tag.id);
                            return (
                                <button
                                    key={tag.id}
                                    onClick={() => onTagClick(tag.id)}
                                    className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                                        isSelected 
                                            ? 'bg-rose-600 text-white' 
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                                >
                                    #{tag.name}
                                </button>
                            );
                        })}
                        {filteredTags.length === 0 && <p className="text-slate-500 text-center w-full">Keine passenden Tags gefunden.</p>}
                    </div>
                </main>
                 <footer className="p-4 border-t border-slate-700 flex-shrink-0 text-right">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-600 hover:bg-slate-500">
                        Schließen
                    </button>
                </footer>
            </motion.div>
        </motion.div>
    );
};

const MultiTagPicker: FC<{
    allTags: Tag[];
    recentTags: Tag[];
    selectedTagIds: string[];
    onSelectionChange: (ids: string[]) => void;
}> = ({ allTags, recentTags, selectedTagIds, onSelectionChange }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleTagClick = (tagId: string) => {
        const newSelection = selectedTagIds.includes(tagId)
            ? selectedTagIds.filter(id => id !== tagId)
            : [...selectedTagIds, tagId];
        onSelectionChange(newSelection);
    };

    const otherTags = useMemo(() => {
        const recentTagIds = new Set(recentTags.map(t => t.id));
        return allTags.filter(tag => !recentTagIds.has(tag.id));
    }, [allTags, recentTags]);

    return (
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                Tags zur Analyse auswählen
            </h4>
            <div className="flex flex-wrap gap-2">
                {recentTags.map(tag => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                        <button
                            key={tag.id}
                            onClick={() => handleTagClick(tag.id)}
                            className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                                isSelected 
                                    ? 'bg-rose-600 text-white shadow-md'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                        >
                            #{tag.name}
                        </button>
                    );
                })}
                {otherTags.length > 0 && (
                     <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-3 py-1.5 text-sm font-semibold rounded-full transition-colors bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center gap-1.5"
                    >
                        <Plus className="h-4 w-4" />
                        Weitere
                    </button>
                )}
            </div>
            
            <AnimatePresence>
                {isModalOpen && (
                    <AllTagsModal
                        allTags={otherTags}
                        selectedTagIds={selectedTagIds}
                        onTagClick={handleTagClick}
                        onClose={() => setIsModalOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};


const TagsPage: FC = () => {
    const { 
        allAvailableTags,
        transactions,
        selectedTagIdsForAnalysis,
        handleSelectTagForAnalysis,
        ...rest
    } = useApp();

    const [periodType, setPeriodType] = useState<'month' | 'year'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const recentlyUsedTags = useMemo(() => {
        const sortedTransactions = [...transactions].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        const recentTagIds = new Set<string>();

        for (const transaction of sortedTransactions) {
            if (recentTagIds.size >= 20) break;
            if (transaction.tagIds) {
                for (const tagId of transaction.tagIds) {
                    if (recentTagIds.size >= 20) break;
                    recentTagIds.add(tagId);
                }
            }
        }
        
        const tagMap = new Map(allAvailableTags.map(t => [t.id, t]));
        return Array.from(recentTagIds).map(id => tagMap.get(id)).filter((t): t is Tag => !!t);
    }, [transactions, allAvailableTags]);


    if (allAvailableTags.length === 0) {
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
            
            <MultiTagPicker 
                allTags={allAvailableTags}
                recentTags={recentlyUsedTags}
                selectedTagIds={selectedTagIdsForAnalysis}
                onSelectionChange={handleSelectTagForAnalysis}
            />

            <PeriodNavigator
                periodType={periodType}
                setPeriodType={setPeriodType}
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
            />

            <AnimatePresence mode="wait">
                {selectedTagIdsForAnalysis.length > 0 ? (
                    <motion.div
                        key={selectedTagIdsForAnalysis.join('-')}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <TagDetailView
                            tagIds={selectedTagIdsForAnalysis}
                            periodType={periodType}
                            currentDate={currentDate}
                            appContext={{ ...rest, transactions }}
                        />
                    </motion.div>
                ) : (
                     <div className="flex flex-col items-center justify-center h-96 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-center">
                         <Hash className="text-slate-600 h-12 w-12 mb-4" />
                         <h2 className="text-xl font-bold text-white">Wählen Sie Tags zur Analyse aus</h2>
                         <p className="text-slate-400">Klicken Sie oben auf einen Tag, um zu beginnen.</p>
                    </div>
                )}
            </AnimatePresence>
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

// We pass the appContext down to avoid prop-drilling hell inside a memoized component
type AppContextSubset = Omit<ReturnType<typeof useApp>, 'allAvailableTags' | 'selectedTagIdsForAnalysis' | 'handleSelectTagForAnalysis'>;

const TagDetailView: FC<{
    tagIds: string[],
    periodType: 'month' | 'year',
    currentDate: Date,
    appContext: AppContextSubset
}> = ({ tagIds, periodType, currentDate, appContext }) => {
    const { transactions, tagMap, categoryMap, handleTransactionClick, deleteTransaction } = appContext;
    const tagNames = tagIds.map(id => tagMap.get(id) || 'Unbekannt').join(', ');

    const relatedTransactions = useMemo(() => {
        const interval = periodType === 'month' 
            ? getMonthInterval(currentDate) 
            : getYearInterval(currentDate);

        return transactions
            .filter(t => t.tagIds?.some(tagId => tagIds.includes(tagId)) && isWithinInterval(parseISO(t.date), interval))
            .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }, [tagIds, transactions, periodType, currentDate]);
    
    const stats = useMemo(() => {
        const total = relatedTransactions.reduce((sum, t) => sum + t.amount, 0);
        const count = relatedTransactions.length;
        const average = count > 0 ? total / count : 0;
        return { total, count, average };
    }, [relatedTransactions]);

    const relatedCategoryNames = useMemo(() => {
        if (relatedTransactions.length === 0) return 'Keine';
        
        const categoryIds = new Set<string>();
        relatedTransactions.forEach(t => categoryIds.add(t.categoryId));
        
        return Array.from(categoryIds)
            .map(id => categoryMap.get(id)?.name)
            .filter(Boolean)
            .join(', ');
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

    if (relatedTransactions.length === 0) {
        return (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-96 bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 text-center">
                 <Hash className="text-slate-600 h-12 w-12 mb-4" />
                 <h2 className="text-xl font-bold text-white">Keine Daten für #{tagNames}</h2>
                 <p className="text-slate-400">Für den gewählten Zeitraum gibt es keine Transaktionen mit diesen Tags.</p>
            </motion.div>
        )
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div>
                 <h2 className="text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
                    #{tagNames}
                </h2>
                <p className="text-sm text-slate-400 mt-1">Kategorien: {relatedCategoryNames}</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard icon={Coins} title="Gesamtausgaben" value={formatCurrency(stats.total)} />
                <StatCard icon={BarChart2} title="Transaktionen" value={stats.count.toString()} />
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
                            <div key={t.id} className="flex items-center gap-3 bg-slate-800/50 hover:bg-slate-700/50 p-3 rounded-lg transition-colors">
                                <button
                                    onClick={() => handleTransactionClick(t, 'view')}
                                    className="w-full flex items-start gap-4 flex-1 min-w-0 text-left"
                                >
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: category.color }}>
                                        <Icon className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white truncate">{t.description}</p>
                                        <p className="text-sm text-slate-400">{format(parseISO(t.date), 'dd. MMMM yyyy, HH:mm')} Uhr</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-2">
                                        <p className="font-bold text-white text-lg">{formatCurrency(t.amount)}</p>
                                        <p className="text-xs text-slate-500">{category.name}</p>
                                    </div>
                                </button>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleTransactionClick(t, 'edit')}
                                        className="p-2 rounded-full text-slate-400 hover:bg-slate-600 hover:text-white"
                                        title="Bearbeiten"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Möchten Sie die Ausgabe "${t.description}" wirklich löschen?`)) {
                                                deleteTransaction(t.id);
                                            }
                                        }}
                                        className="p-2 rounded-full text-slate-400 hover:bg-slate-600 hover:text-red-400"
                                        title="Löschen"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
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
