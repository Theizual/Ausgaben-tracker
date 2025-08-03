import React, { useState, useMemo, useCallback, useEffect, FC } from 'react';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import type { Category, RecurringTransaction, Tag } from '../types';
import { format, parseISO, formatCurrency } from '../utils/dateUtils';
import { iconMap, Settings, Loader2, X, TrendingDown, LayoutGrid, BarChart2, Sheet, Save, DownloadCloud, Target, Edit, Trash2, Plus, GripVertical, Wallet, SlidersHorizontal, Repeat, History, Tag as TagIcon, ChevronUp, ChevronDown } from './Icons';
import type { LucideProps } from 'lucide-react';

// Icon Picker Component
const IconPicker: FC<{
  onSelect: (iconName: string) => void;
  onClose: () => void;
}> = ({ onSelect, onClose }) => {
    const iconList = Object.keys(iconMap);
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
                    <h3 className="text-lg font-bold text-white">Symbol auswählen</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 p-4 overflow-y-auto">
                    {iconList.sort().map(iconName => {
                        const Icon = iconMap[iconName];
                        return (
                            <button
                                key={iconName}
                                onClick={() => onSelect(iconName)}
                                className="aspect-square flex items-center justify-center bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-rose-400"
                                title={iconName}
                            >
                                <Icon className="h-6 w-6" />
                            </button>
                        );
                    })}
                </div>
            </motion.div>
        </motion.div>
    );
};

const ToggleSwitch: React.FC<{
    enabled: boolean;
    setEnabled: (enabled: boolean) => void;
    id?: string;
}> = ({ enabled, setEnabled, id }) => {
    return (
        <button
            type="button"
            id={id}
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-rose-500 ${enabled ? 'bg-rose-600' : 'bg-slate-600'}`}
        >
            <span className="sr-only">Automatische Synchronisierung aktivieren</span>
            <motion.span
                layout
                transition={{ type: 'spring', stiffness: 700, damping: 30 }}
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
            />
        </button>
    );
};

const TagSettings: FC<{
    tags: Tag[];
    onUpdateTag: (tagId: string, newName: string) => void;
    onDeleteTag: (tagId: string) => void;
}> = ({ tags, onUpdateTag, onDeleteTag }) => {
    
    const handleUpdate = (tag: Tag, e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
        const newTag = (e.target as HTMLInputElement).value.trim();
        if (newTag && newTag !== tag.name) {
            onUpdateTag(tag.id, newTag);
        } else {
            (e.target as HTMLInputElement).value = tag.name; // Reset if invalid or unchanged
        }
    };
    
    return (
         <motion.div
            key="tags"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
        >
            <h3 className="text-lg font-semibold text-white mb-4">Tags verwalten</h3>
            <p className="text-sm text-slate-400 mb-6">
                Bearbeiten oder löschen Sie bestehende Tags. Änderungen werden sofort auf alle zugehörigen Transaktionen angewendet.
            </p>
            <div className="space-y-3">
                {tags.map(tag => (
                    <div key={tag.id} className="flex items-center gap-3 bg-slate-700/50 p-2 rounded-lg">
                        <TagIcon className="h-5 w-5 text-slate-400 shrink-0 ml-2" />
                        <input
                            type="text"
                            defaultValue={tag.name}
                            onBlur={(e) => handleUpdate(tag, e)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleUpdate(tag, e);
                                    (e.target as HTMLInputElement).blur();
                                }
                            }}
                            className="bg-transparent font-medium text-white w-full focus:outline-none focus:bg-slate-600/50 rounded px-2 py-1"
                        />
                         <button
                            onClick={() => {
                                if (window.confirm(`Möchten Sie den Tag "${tag.name}" wirklich löschen? Er wird von allen Transaktionen entfernt.`)) {
                                    onDeleteTag(tag.id);
                                }
                            }}
                            className="p-2 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
                {tags.length === 0 && (
                    <p className="text-center text-slate-500 py-4">Keine Tags vorhanden. Fügen Sie bei einer Transaktion einen neuen Tag hinzu.</p>
                )}
            </div>
        </motion.div>
    )
}

const BudgetSettings: FC<{
    categories: Category[];
    onBudgetChange: (id: string, value: string) => void;
}> = ({ categories, onBudgetChange }) => {
    
    const totalBudget = useMemo(() => {
        return categories.reduce((sum, cat) => sum + (cat.budget || 0), 0);
    }, [categories]);
    
    return (
        <motion.div
            key="budget"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
        >
             <div className="mb-6 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <h4 className="text-sm font-medium text-slate-400">Berechnetes Gesamtbudget</h4>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalBudget)}</p>
                <p className="text-xs text-slate-500 mt-1">Das Gesamtbudget ergibt sich aus der Summe aller Kategorienbudgets.</p>
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-4">Kategorienbudgets</h3>
            <p className="text-sm text-slate-400 mb-6">
                Passen Sie das Budget für jede Kategorie an. Das Gesamtbudget wird automatisch neu berechnet.
            </p>
            <div className="space-y-4">
                {categories.map(category => {
                    const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
                    const percentage = totalBudget > 0 ? ((category.budget || 0) / totalBudget) * 100 : 0;
                    return (
                        <div key={category.id} className="flex items-center gap-4 p-2 bg-slate-700/50 rounded-lg">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: category.color }}>
                                <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-white">{category.name}</p>
                                {percentage > 0 && <p className="text-xs text-slate-400">{percentage.toFixed(1)}% des Gesamtbudgets</p>}
                            </div>
                            <div className="relative w-40">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={category.budget?.toString().replace('.', ',') || ''}
                                    onChange={e => onBudgetChange(category.id, e.target.value)}
                                    placeholder="Budget"
                                    className="bg-slate-700 border border-slate-600 rounded-md py-1.5 pl-7 pr-2 text-white placeholder-slate-400 w-full focus:outline-none focus:ring-2 focus:ring-rose-500"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    )
}

const RecurringSettings: FC<{
    recurring: RecurringTransaction[];
    setRecurring: (r: RecurringTransaction[] | ((prev: RecurringTransaction[]) => RecurringTransaction[])) => void;
    categories: Category[];
}> = ({ recurring, setRecurring, categories }) => {
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleAdd = () => {
        const newRecurring: RecurringTransaction = {
            id: crypto.randomUUID(),
            amount: 0,
            description: '',
            categoryId: categories[0]?.id || '',
            frequency: 'monthly',
            startDate: new Date().toISOString().split('T')[0],
        };
        setRecurring(prev => [...prev, newRecurring]);
        setEditingId(newRecurring.id);
    };

    const handleUpdate = (id: string, field: keyof RecurringTransaction, value: any) => {
        setRecurring(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleDelete = (id: string) => {
        setRecurring(prev => prev.filter(r => r.id !== id));
    };
    
    return (
        <motion.div
            key="recurring"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
        >
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Wiederkehrende Ausgaben</h3>
                <button onClick={handleAdd} className="flex items-center gap-2 text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md font-semibold">
                    <Plus className="h-4 w-4"/>Neue Ausgabe
                </button>
            </div>
            <div className="space-y-3">
                {recurring.map(item => {
                    const isEditing = editingId === item.id;
                    const category = categories.find(c => c.id === item.categoryId);
                    const Icon = category ? iconMap[category.icon] || iconMap.MoreHorizontal : iconMap.MoreHorizontal;

                    if (isEditing) {
                        return (
                            <div key={item.id} className="bg-slate-700/80 p-4 rounded-lg space-y-4 ring-2 ring-rose-500">
                               <input type="text" value={item.description} onChange={e => handleUpdate(item.id, 'description', e.target.value)} placeholder="Beschreibung" className="w-full bg-slate-600 border-slate-500 rounded p-2 text-white"/>
                               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <input type="number" value={item.amount} onChange={e => handleUpdate(item.id, 'amount', parseFloat(e.target.value) || 0)} placeholder="Betrag" className="bg-slate-600 border-slate-500 rounded p-2 text-white"/>
                                <select value={item.categoryId} onChange={e => handleUpdate(item.id, 'categoryId', e.target.value)} className="bg-slate-600 border-slate-500 rounded p-2 text-white">
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <input type="date" value={format(parseISO(item.startDate), 'yyyy-MM-dd')} onChange={e => handleUpdate(item.id, 'startDate', e.target.value)} className="bg-slate-600 border-slate-500 rounded p-2 text-white"/>
                                <select value={item.frequency} onChange={e => handleUpdate(item.id, 'frequency', e.target.value as 'monthly' | 'yearly')} className="bg-slate-600 border-slate-500 rounded p-2 text-white">
                                    <option value="monthly">Monatlich</option>
                                    <option value="yearly">Jährlich</option>
                                </select>
                               </div>
                               <div className="flex justify-end gap-2">
                                <button onClick={() => setEditingId(null)} className="text-slate-300 hover:text-white px-3 py-1 rounded">Fertig</button>
                               </div>
                            </div>
                        )
                    }

                    return (
                        <div key={item.id} className="flex items-center gap-4 bg-slate-700/50 p-3 rounded-lg">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: category?.color || '#64748b' }}>
                                <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-white">{item.description}</p>
                                <p className="text-sm text-slate-400">{category?.name} &bull; {item.frequency === 'monthly' ? 'Monatlich' : 'Jährlich'} ab {format(parseISO(item.startDate), 'dd.MM.yyyy')}</p>
                            </div>
                            <div className="font-bold text-white text-lg">
                                {formatCurrency(item.amount)}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingId(item.id)} className="p-2 rounded-full hover:bg-slate-600"><Edit className="h-4 w-4 text-slate-400"/></button>
                                <button onClick={() => handleDelete(item.id)} className="p-2 rounded-full hover:bg-slate-600"><Trash2 className="h-4 w-4 text-red-400"/></button>
                            </div>
                        </div>
                    );
                })}
                 {recurring.length === 0 && <p className="text-center text-slate-500 py-4">Keine wiederkehrenden Ausgaben festgelegt.</p>}
            </div>
        </motion.div>
    )
};


const SettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    setCategories: (cats: Category[] | ((prev: Category[]) => Category[])) => void;
    categoryGroups: string[];
    setCategoryGroups: (groups: string[] | ((prev: string[]) => string[])) => void;
    isAutoSyncEnabled: boolean;
    setIsAutoSyncEnabled: (enabled: boolean) => void;
    recurringTransactions: RecurringTransaction[];
    setRecurringTransactions: (r: RecurringTransaction[] | ((prev: RecurringTransaction[]) => RecurringTransaction[])) => void;
    allAvailableTags: Tag[];
    onUpdateTag: (tagId: string, newName: string) => void;
    onDeleteTag: (tagId: string) => void;
}> = ({ 
    isOpen, onClose, categories, setCategories, categoryGroups, setCategoryGroups, 
    isAutoSyncEnabled, setIsAutoSyncEnabled,
    recurringTransactions, setRecurringTransactions,
    allAvailableTags, onUpdateTag, onDeleteTag
}) => {
    const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'budget' | 'categories' | 'tags' | 'recurring'>('general');
    const [editableGroups, setEditableGroups] = useState(categoryGroups);
    const [editableCategories, setEditableCategories] = useState(categories);
    const [editableRecurring, setEditableRecurring] = useState(recurringTransactions);
    const [pickingIconFor, setPickingIconFor] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setActiveSettingsTab('general');
            setEditableGroups(categoryGroups);
            setEditableCategories(categories);
            setEditableRecurring(recurringTransactions);
        }
    }, [isOpen, categories, categoryGroups, recurringTransactions]);

    const handleCategoryChange = (id: string, field: keyof Category, value: any) => {
        setEditableCategories(current =>
            current.map(cat => cat.id === id ? { ...cat, [field]: value } : cat)
        );
    };

    const handleCategoryBudgetChange = (id: string, value: string) => {
        const budgetValue = parseFloat(value.replace(',', '.'));
        const newBudgetValue = isNaN(budgetValue) || budgetValue < 0 ? undefined : budgetValue;
        handleCategoryChange(id, 'budget', newBudgetValue);
    };

    const handleGroupChange = (oldName: string, newName: string) => {
      if (oldName === newName || !newName.trim()) return;
      setEditableGroups(current => current.map(g => g === oldName ? newName : g));
      setEditableCategories(current => current.map(cat => cat.group === oldName ? { ...cat, group: newName } : cat));
    };

    const handleAddGroup = () => {
        const newGroupName = `Neue Gruppe ${editableGroups.length + 1}`;
        if (editableGroups.includes(newGroupName)) return;
        setEditableGroups(current => [...current, newGroupName]);
    };

    const handleDeleteGroup = (groupName: string) => {
        if (editableGroups.length <= 1) {
            alert("Die letzte Gruppe kann nicht gelöscht werden.");
            return;
        }
        const fallbackGroup = editableGroups.find(g => g !== groupName) || '';
        setEditableCategories(current => current.map(cat => cat.group === groupName ? { ...cat, group: fallbackGroup } : cat));
        setEditableGroups(current => current.filter(g => g !== groupName));
    };

    const handleMoveGroup = (index: number, direction: 'up' | 'down') => {
        setEditableGroups(current => {
            const newGroups = [...current];
            const otherIndex = direction === 'up' ? index - 1 : index + 1;
            if (otherIndex < 0 || otherIndex >= newGroups.length) {
                return newGroups;
            }
            [newGroups[index], newGroups[otherIndex]] = [newGroups[otherIndex], newGroups[index]];
            return newGroups;
        });
    };
    
    const handleAddCategory = (groupName: string) => {
        const newCategory: Category = {
            id: crypto.randomUUID(),
            name: "Neue Kategorie",
            color: "#8b5cf6",
            icon: "Plus",
            group: groupName
        };
        setEditableCategories(current => [...current, newCategory]);
    };
    
    const handleDeleteCategory = (id: string) => {
        setEditableCategories(current => current.filter(cat => cat.id !== id));
    };

    const handleSave = () => {
        setCategories(editableCategories);
        setCategoryGroups(editableGroups);
        setRecurringTransactions(editableRecurring);
        onClose();
    };

    if (!isOpen) return null;

    const settingsTabs = [
        { id: 'general', label: 'Allgemein', icon: SlidersHorizontal },
        { id: 'budget', label: 'Budgets', icon: Target },
        { id: 'categories', label: 'Kategorien', icon: LayoutGrid },
        { id: 'tags', label: 'Tags', icon: TagIcon },
        { id: 'recurring', label: 'Wiederkehrende Ausgaben', icon: History }
    ];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                    className="bg-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-700 flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center p-6 border-b border-slate-700 flex-shrink-0">
                        <h2 className="text-xl font-bold text-white">Einstellungen</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors"><X className="h-5 w-5" /></button>
                    </div>

                    <div className="flex border-b border-slate-700 px-6 pt-4 overflow-x-auto">
                        {settingsTabs.map(tab => (
                             <button 
                                key={tab.id}
                                onClick={() => setActiveSettingsTab(tab.id as any)} 
                                className={`flex items-center gap-2 pb-3 px-2 border-b-2 text-sm font-semibold transition-colors flex-shrink-0 mr-4 ${
                                    activeSettingsTab === tab.id
                                    ? 'border-rose-500 text-white' 
                                    : 'border-transparent text-slate-400 hover:text-white'
                                }`}
                            >
                                <tab.icon className="h-4 w-4"/>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6 max-h-[60vh] overflow-y-auto space-y-8">
                        <AnimatePresence mode="wait">
                            {activeSettingsTab === 'general' && (
                                <motion.div
                                    key="general"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-8"
                                >
                                    {/* Sync Settings */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                                            <Sheet className="h-5 w-5 text-green-400" /> Google Sheets Sync
                                        </h3>
                                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700/50">
                                            <div>
                                                <label htmlFor="auto-sync-toggle" className="block text-sm font-medium text-slate-300">Automatische Synchronisierung</label>
                                                <p className="text-xs text-slate-400 mt-1">Speichert Änderungen alle 5 Minuten im Hintergrund.</p>
                                            </div>
                                            <ToggleSwitch id="auto-sync-toggle" enabled={isAutoSyncEnabled} setEnabled={setIsAutoSyncEnabled} />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            
                            {activeSettingsTab === 'budget' && (
                                <BudgetSettings 
                                    categories={editableCategories}
                                    onBudgetChange={handleCategoryBudgetChange}
                                />
                            )}

                             {activeSettingsTab === 'tags' && (
                                <TagSettings 
                                    tags={allAvailableTags} 
                                    onUpdateTag={onUpdateTag} 
                                    onDeleteTag={onDeleteTag}
                                />
                             )}

                            {activeSettingsTab === 'categories' && (
                                 <motion.div
                                    key="categories"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-white">Kategorien & Gruppen</h3>
                                        <button onClick={handleAddGroup} className="flex items-center gap-2 text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md font-semibold"><Plus className="h-4 w-4"/>Neue Gruppe</button>
                                    </div>
                                    <div className="space-y-4">
                                        {editableGroups.map((groupName, index) => {
                                            const groupCategories = editableCategories.filter(c => c.group === groupName);
                                            return (
                                            <div key={groupName} className="bg-slate-700/40 p-4 rounded-lg">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="flex flex-col -my-1">
                                                        <button
                                                            onClick={() => handleMoveGroup(index, 'up')}
                                                            disabled={index === 0}
                                                            className="p-1 rounded-full text-slate-500 hover:bg-slate-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                                            title="Gruppe nach oben verschieben"
                                                        >
                                                            <ChevronUp className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleMoveGroup(index, 'down')}
                                                            disabled={index === editableGroups.length - 1}
                                                            className="p-1 rounded-full text-slate-500 hover:bg-slate-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                                            title="Gruppe nach unten verschieben"
                                                        >
                                                            <ChevronDown className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={groupName}
                                                        onBlur={(e) => handleGroupChange(groupName, e.target.value)}
                                                        onChange={(e) => setEditableGroups(current => current.map(g => g === groupName ? e.target.value : g))}
                                                        className="bg-transparent text-lg font-bold text-white w-full focus:outline-none focus:bg-slate-600/50 rounded px-2"
                                                    />
                                                    <button onClick={() => handleDeleteGroup(groupName)} className="p-1 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4"/></button>
                                                </div>
                                                <Reorder.Group
                                                    axis="y"
                                                    values={groupCategories}
                                                    onReorder={(newOrder) => {
                                                        const otherCategories = editableCategories.filter(c => c.group !== groupName);
                                                        setEditableCategories([...otherCategories, ...newOrder]);
                                                    }}
                                                    className="space-y-2 ml-4 pl-4 border-l-2 border-slate-600"
                                                >
                                                    {groupCategories.map(cat => {
                                                        const Icon = iconMap[cat.icon] || iconMap['MoreHorizontal'];
                                                        return (
                                                            <Reorder.Item key={cat.id} value={cat} as="div" className="bg-slate-700/50 p-3 rounded-lg">
                                                                <div className="flex items-start gap-3 w-full">
                                                                    <div className="text-slate-500 cursor-grab pt-1"><GripVertical className="h-5 w-5" /></div>
                                                                    
                                                                    <div className="flex-1 flex flex-col gap-3">
                                                                        <div className="flex items-center gap-3">
                                                                             <button
                                                                                type="button"
                                                                                onClick={() => setPickingIconFor(cat.id)}
                                                                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-rose-500"
                                                                                style={{ backgroundColor: cat.color }}
                                                                                title="Symbol ändern"
                                                                            >
                                                                                <Icon className="h-5 w-5 text-white" />
                                                                            </button>
                                                                             <input
                                                                                type="text"
                                                                                value={cat.name}
                                                                                onChange={e => handleCategoryChange(cat.id, 'name', e.target.value)}
                                                                                className="bg-transparent font-medium text-white w-full focus:outline-none"
                                                                            />
                                                                        </div>
                                                                         <div className="flex items-center gap-3">
                                                                            <input
                                                                                type="color"
                                                                                value={cat.color}
                                                                                onChange={e => handleCategoryChange(cat.id, 'color', e.target.value)}
                                                                                className="w-8 h-8 p-0 border-none rounded-md bg-transparent cursor-pointer"
                                                                                title="Farbe ändern"
                                                                            />
                                                                            <select
                                                                                value={cat.group}
                                                                                onChange={e => handleCategoryChange(cat.id, 'group', e.target.value)}
                                                                                className="bg-slate-600 text-sm rounded-md border-slate-500 p-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                                                            >
                                                                                {editableGroups.map(g => <option key={g} value={g}>{g}</option>)}
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                     <button onClick={() => handleDeleteCategory(cat.id)} className="p-1 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400">
                                                                        <Trash2 className="h-4 w-4"/>
                                                                    </button>
                                                                </div>
                                                            </Reorder.Item>
                                                        )
                                                    })}
                                                </Reorder.Group>
                                                <button onClick={() => handleAddCategory(groupName)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mt-3 ml-8"><Plus className="h-4 w-4"/>Kategorie hinzufügen</button>
                                            </div>
                                            )
                                        })}
                                    </div>
                                </motion.div>
                            )}

                             {activeSettingsTab === 'recurring' && (
                                <RecurringSettings
                                    recurring={editableRecurring}
                                    setRecurring={setEditableRecurring}
                                    categories={categories}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="p-6 border-t border-slate-700 flex justify-end">
                         <button onClick={handleSave} className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold px-6 py-2 rounded-lg shadow-md hover:opacity-90 transition-opacity">
                            <Save className="h-4 w-4" /> Speichern & Schließen
                        </button>
                    </div>
                </motion.div>
            </motion.div>
            {pickingIconFor && (
                <IconPicker
                    onClose={() => setPickingIconFor(null)}
                    onSelect={(iconName) => {
                        if (pickingIconFor) {
                             handleCategoryChange(pickingIconFor, 'icon', iconName);
                        }
                        setPickingIconFor(null);
                    }}
                />
            )}
        </AnimatePresence>
    );
};
export default SettingsModal;