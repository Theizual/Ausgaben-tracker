import React, { useState, useMemo, useCallback, useEffect, FC, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '../contexts/AppContext';
import type { Category, RecurringTransaction, Tag, User, SettingsTab } from '../types';
import { format, parseISO, formatCurrency } from '../utils/dateUtils';
import { Settings, Loader2, X, TrendingDown, LayoutGrid, BarChart2, Sheet, Save, DownloadCloud, Target, Edit, Trash2, Plus, Wallet, SlidersHorizontal, Repeat, History, Tag as TagIcon, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, FlaskConical, Users, CheckCircle2, ChevronRight as ChevronRightIcon, Info, iconMap, Search } from './Icons';
import type { LucideProps } from 'lucide-react';
import { APP_VERSION, INITIAL_CATEGORIES, INITIAL_GROUPS } from '../constants';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { generateUUID } from '../utils/uuid';
import { getIconComponent } from './Icons';
import { Button } from './ui/Button';

// --- Local Constants & Helpers ---

const BASE_INPUT_CLASSES = "w-full bg-theme-input border border-theme-border rounded-md px-3 py-2 text-white placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-ring";
const TRANSPARENT_INPUT_CLASSES = "bg-transparent font-medium text-white w-full focus:outline-none focus:bg-slate-600/50 rounded px-2 py-1";

const ANIMATION_CONFIG = {
    MODAL_SPRING: { type: 'spring' as const, bounce: 0.3, duration: 0.4 },
    EXPAND_DURATION_NORMAL: 0.3,
};

// --- Child Components ---

const ToggleSwitch: FC<{ enabled: boolean; setEnabled: (enabled: boolean) => void; id?: string; }> = ({ enabled, setEnabled, id }) => (
    <button type="button" id={id} role="switch" aria-checked={enabled} onClick={() => setEnabled(!enabled)}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-rose-500 ${enabled ? 'bg-rose-600' : 'bg-slate-600'}`}>
        <motion.span layout transition={{ type: 'spring', stiffness: 700, damping: 30 }}
            className={`inline-block w-4 h-4 transform bg-white rounded-full ${enabled ? 'translate-x-6' : 'translate-x-1'}`}/>
    </button>
);

const UserSettings: FC = () => {
    const { users, addUser, updateUser, deleteUser } = useApp();
    const [newUserName, setNewUserName] = useState('');

    const handleAddUser = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newUserName.trim();
        if (trimmedName) {
            addUser(trimmedName);
            setNewUserName('');
        }
    }, [addUser, newUserName]);

    const handleNameUpdate = useCallback((id: string, name: string) => updateUser(id, { name }), [updateUser]);

    return (
        <motion.div key="users" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
            <h3 className="text-lg font-semibold text-white mb-4">Benutzer verwalten</h3>
            <p className="text-sm text-slate-400 mb-6">Legen Sie Benutzer an, um Ausgaben zuzuordnen. Der aktuell ausgewählte Benutzer wird neuen Transaktionen automatisch zugewiesen.</p>
            <form onSubmit={handleAddUser} className="flex gap-3 mb-6">
                <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.currentTarget.value)} placeholder="Neuer Benutzername..." className={BASE_INPUT_CLASSES} />
                <Button type="submit" size="sm"><Plus className="h-4 w-4"/> Hinzufügen</Button>
            </form>
            <div className="space-y-3">
                {users.map(user => (
                    <div key={user.id} className="flex items-center gap-4 bg-slate-700/50 p-2 rounded-lg">
                        <input type="color" value={user.color} onChange={(e) => updateUser(user.id, { color: e.currentTarget.value })} className="w-10 h-10 p-0 border-none rounded-md bg-transparent cursor-pointer flex-shrink-0" title="Farbe ändern"/>
                        <input type="text" defaultValue={user.name} onBlur={(e) => handleNameUpdate(user.id, e.currentTarget.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className={TRANSPARENT_INPUT_CLASSES} />
                        <Button variant="destructive-ghost" size="icon-auto" onClick={() => { if (window.confirm(`Benutzer "${user.name}" löschen?`)) deleteUser(user.id); }} aria-label={`Benutzer ${user.name} löschen`}><Trash2 className="h-5 w-5" /></Button>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

const BudgetSettings: FC = () => {
    const { categories, updateCategory } = useApp();
    const totalBudget = useMemo(() => categories.reduce((sum, cat) => sum + (cat.budget || 0), 0), [categories]);
    
    const handleBudgetChange = useCallback((id: string, value: string) => {
        const trimmedValue = value.trim();
        const budgetValue = Number(trimmedValue.replace(',', '.'));
        updateCategory(id, { budget: !isNaN(budgetValue) && budgetValue >= 0 ? budgetValue : undefined });
    }, [updateCategory]);

    return (
        <motion.div key="budget" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
            <div className="mb-6 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <h4 className="text-sm font-medium text-slate-400">Berechnetes Gesamtbudget</h4>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalBudget)}</p>
                <p className="text-xs text-slate-500 mt-1">Summe aller Kategorienbudgets.</p>
            </div>
            <h3 className="text-lg font-semibold text-white mb-4">Kategorienbudgets</h3>
            <p className="text-sm text-slate-400 mb-6">Passen Sie das Budget für jede Kategorie an.</p>
            <div className="space-y-4">
                {categories.map(category => {
                    const Icon = getIconComponent(category.icon);
                    return (
                        <div key={category.id} className="flex items-center gap-4 p-2 bg-slate-700/50 rounded-lg">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: category.color }}><Icon className="h-5 w-5 text-white" /></div>
                            <div className="flex-1"><p className="font-medium text-white">{category.name}</p></div>
                            <div className="relative w-40">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                                <input type="text" inputMode="decimal" defaultValue={category.budget?.toString().replace('.', ',') || ''} onBlur={e => handleBudgetChange(category.id, e.currentTarget.value)}
                                    placeholder="Budget" className={`${BASE_INPUT_CLASSES} pl-7`}/>
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};

const RecurringSettings: FC = () => {
    const { categories, recurringTransactions, addRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction } = useApp();
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleAdd = useCallback(() => {
        const newId = generateUUID();
        addRecurringTransaction({ amount: 0, description: 'Neue Ausgabe', categoryId: categories[0]?.id || '', frequency: 'monthly', startDate: new Date().toISOString().split('T')[0] }, newId);
        setEditingId(newId);
    }, [categories, addRecurringTransaction]);

    const handleUpdate = useCallback((id: string, updates: Partial<RecurringTransaction>) => {
        const itemToUpdate = recurringTransactions.find(r => r.id === id);
        if (itemToUpdate) updateRecurringTransaction({ ...itemToUpdate, ...updates });
    }, [recurringTransactions, updateRecurringTransaction]);
    
    return (
        <motion.div key="recurring" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Wiederkehrende Ausgaben</h3>
                <Button onClick={handleAdd} variant="secondary" size="sm"><Plus className="h-4 w-4"/>Neue Ausgabe</Button>
            </div>
            <div className="space-y-3">
                {recurringTransactions.map(item => {
                    const isEditing = editingId === item.id;
                    const category = categories.find(c => c.id === item.categoryId);
                    const Icon = getIconComponent(category?.icon);

                    return isEditing ? (
                        <div key={item.id} className="bg-slate-700/80 p-4 rounded-lg space-y-4 ring-2 ring-rose-500">
                           <input type="text" value={item.description} onChange={e => handleUpdate(item.id, {description: e.currentTarget.value})} placeholder="Beschreibung" className={BASE_INPUT_CLASSES}/>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <input type="number" value={item.amount} onChange={e => handleUpdate(item.id, {amount: Number(e.currentTarget.value.replace(',', '.')) || 0})} placeholder="Betrag" className={BASE_INPUT_CLASSES}/>
                            <select value={item.categoryId} onChange={e => handleUpdate(item.id, {categoryId: e.currentTarget.value})} className={BASE_INPUT_CLASSES}>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <input type="date" value={format(parseISO(item.startDate), 'yyyy-MM-dd')} onChange={e => handleUpdate(item.id, {startDate: e.currentTarget.value})} className={BASE_INPUT_CLASSES}/>
                            <select value={item.frequency} onChange={e => { const val = e.currentTarget.value; if(val === 'monthly' || val === 'yearly') handleUpdate(item.id, {frequency: val}); }} className={BASE_INPUT_CLASSES}>
                                <option value="monthly">Monatlich</option><option value="yearly">Jährlich</option>
                            </select>
                           </div>
                           <div className="flex justify-end gap-2"><Button variant="link" onClick={() => setEditingId(null)} className="px-3 py-1">Fertig</Button></div>
                        </div>
                    ) : (
                        <div key={item.id} className="flex items-center gap-4 bg-slate-700/50 p-3 rounded-lg">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: category?.color || '#64748b' }}><Icon className="h-5 w-5 text-white" /></div>
                            <div className="flex-1"><p className="font-semibold text-white">{item.description}</p><p className="text-sm text-slate-400">{category?.name} &bull; {item.frequency === 'monthly' ? 'Monatlich' : 'Jährlich'} ab {format(parseISO(item.startDate), 'dd.MM.yyyy')}</p></div>
                            <div className="font-bold text-white text-lg">{formatCurrency(item.amount)}</div>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon-auto" onClick={() => setEditingId(item.id)}><Edit className="h-4 w-4 text-slate-400"/></Button>
                                <Button variant="destructive-ghost" size="icon-auto" onClick={() => {if(window.confirm('Diese wiederkehrende Ausgabe löschen?')) deleteRecurringTransaction(item.id)}}><Trash2 className="h-4 w-4"/></Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};

const ManagerModal: FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
    useEscapeKey(onClose);
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[60] p-4" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div className="bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}
                        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={ANIMATION_CONFIG.MODAL_SPRING}>
                        <header className="flex justify-between items-center p-6 border-b border-slate-700 flex-shrink-0">
                            <h2 className="text-xl font-bold text-white">{title}</h2>
                            <Button variant="ghost" size="icon-auto" onClick={onClose}><X className="h-5 w-5" /></Button>
                        </header>
                        <main className="p-6 flex-grow overflow-y-auto custom-scrollbar">{children}</main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// --- Main Component ---

const SettingsModal: FC<{ isOpen: boolean; onClose: () => void; initialTab?: SettingsTab; }> = ({ isOpen, onClose, initialTab }) => {
    const {
        isAutoSyncEnabled, setIsAutoSyncEnabled, openChangelog, allAvailableTags, handleUpdateTag, handleDeleteTag
    } = useApp();

    const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('general');
    const [isTagManagerOpen, setTagManagerOpen] = useState(false);
    const [isCategoryLibraryOpen, setCategoryLibraryOpen] = useState(false);

    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveSettingsTab(initialTab);
        }
    }, [isOpen, initialTab]);

    const handleEscape = useCallback(() => {
        if (isCategoryLibraryOpen) setCategoryLibraryOpen(false);
        else if (isTagManagerOpen) setTagManagerOpen(false);
        else onClose();
    }, [isCategoryLibraryOpen, isTagManagerOpen, onClose]);
    useEscapeKey(handleEscape);
    
    const settingsTabs: { id: SettingsTab; label: string; icon: FC<LucideProps>; }[] = [
        { id: 'general', label: 'Allgemein', icon: SlidersHorizontal }, { id: 'users', label: 'Benutzer', icon: Users },
        { id: 'budget', label: 'Budgets', icon: Target }, { id: 'recurring', label: 'Wiederkehrende Ausgaben', icon: History }
    ];
    
    const MANAGER_LIST_ITEM_CLASSES = "w-full text-left bg-slate-700/50 hover:bg-slate-700 p-4 rounded-lg transition-colors flex justify-between items-center";

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end md:items-center z-50" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={ANIMATION_CONFIG.MODAL_SPRING}
                    className="bg-slate-800 rounded-t-2xl md:rounded-2xl w-full max-w-4xl shadow-2xl border-t md:border border-slate-700 flex flex-col max-h-[90vh] md:max-h-[85vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-6 border-b border-slate-700 flex-shrink-0">
                        <h2 className="text-xl font-bold text-white">Einstellungen</h2>
                        <Button variant="ghost" size="icon-auto" onClick={onClose}><X className="h-5 w-5" /></Button>
                    </div>
                    <div className="flex border-b border-slate-700 px-6 pt-4 overflow-x-auto custom-scrollbar">
                        {settingsTabs.map(tab => (<button key={tab.id} onClick={() => setActiveSettingsTab(tab.id)} className={`flex items-center gap-2 pb-3 px-2 border-b-2 text-sm font-semibold flex-shrink-0 mr-4 ${activeSettingsTab === tab.id ? 'border-rose-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}><tab.icon className="h-4 w-4"/> {tab.label}</button>))}
                    </div>
                    <div className="p-6 flex-grow overflow-y-auto space-y-8 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeSettingsTab === 'general' && (
                                <motion.div key="general" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-8">
                                    <div><h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2"><Sheet className="h-5 w-5 text-green-400" /> Google Sheets Sync</h3><div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700/50"><div><label htmlFor="auto-sync-toggle" className="block text-sm font-medium text-slate-300">Automatische Hintergrund-Synchronisierung</label><p className="text-xs text-slate-400 mt-1">Speichert Änderungen nach kurzer Inaktivität automatisch.</p></div><ToggleSwitch id="auto-sync-toggle" enabled={isAutoSyncEnabled} setEnabled={setIsAutoSyncEnabled} /></div></div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2"><Wallet className="h-5 w-5 text-purple-400" /> Datenverwaltung</h3>
                                        <div className="pt-4 mt-4 border-t border-slate-700/50 space-y-3">
                                            <button onClick={() => setTagManagerOpen(true)} className={MANAGER_LIST_ITEM_CLASSES}>
                                                <div><span className="font-semibold text-white">Tag-Verwaltung</span><p className="text-xs text-slate-400 mt-1">Bestehende Tags umbenennen oder löschen.</p></div>
                                                <ChevronRightIcon className="h-5 w-5 text-slate-400" />
                                            </button>
                                            <button onClick={() => setCategoryLibraryOpen(true)} className={MANAGER_LIST_ITEM_CLASSES}>
                                                <div><span className="font-semibold text-white">Kategorien-Bibliothek</span><p className="text-xs text-slate-400 mt-1">Vordefinierte Kategorien zum Setup hinzufügen oder anpassen.</p></div>
                                                <ChevronRightIcon className="h-5 w-5 text-slate-400" />
                                            </button>
                                        </div>
                                    </div>
                                    <div><h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2"><Info className="h-5 w-5 text-sky-400" /> App Informationen</h3><div className="pt-4 mt-4 border-t border-slate-700/50 space-y-3"><button onClick={openChangelog} className={MANAGER_LIST_ITEM_CLASSES}><div><span className="font-semibold text-white">Was ist neu? (Changelog)</span><p className="text-xs text-slate-400 mt-1">Änderungen und neue Funktionen der letzten Versionen anzeigen.</p></div><ChevronRightIcon className="h-5 w-5 text-slate-400" /></button><div className="flex justify-between items-center text-sm px-1"><span className="text-slate-400">App-Version</span><span className="font-mono text-slate-500 bg-slate-700/50 px-2 py-1 rounded-md">{APP_VERSION}</span></div></div></div>
                                </motion.div>
                            )}
                            {activeSettingsTab === 'users' && <UserSettings />}
                            {activeSettingsTab === 'budget' && <BudgetSettings />}
                            {activeSettingsTab === 'recurring' && <RecurringSettings />}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
            <ManagerModal isOpen={isTagManagerOpen} onClose={() => setTagManagerOpen(false)} title="Tag-Verwaltung">
                <div className="space-y-3">
                    {allAvailableTags.map(tag => (
                        <div key={tag.id} className="flex items-center gap-3 bg-slate-700/50 p-2 rounded-lg">
                            <TagIcon className="h-5 w-5 text-slate-400 shrink-0 ml-2" />
                            <input type="text" defaultValue={tag.name} onBlur={(e) => handleUpdateTag(tag.id, e.currentTarget.value.trim())} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} className={TRANSPARENT_INPUT_CLASSES} />
                            <Button variant="destructive-ghost" size="icon-auto" onClick={() => { if (window.confirm(`Tag "${tag.name}" löschen?`)) handleDeleteTag(tag.id); }}><Trash2 className="h-5 w-5" /></Button>
                        </div>
                    ))}
                </div>
            </ManagerModal>
            <CategoryLibraryModal isOpen={isCategoryLibraryOpen} onClose={() => setCategoryLibraryOpen(false)} />
        </AnimatePresence>
    );
};

type CategoryFormData = {
    id: string;
    name: string;
    icon: string;
    group: string;
    color: string;
    budget?: number;
};

const IconPicker: FC<{ onSelect: (iconName: string) => void; onClose: () => void; }> = ({ onSelect, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const availableIcons = useMemo(() => Object.keys(iconMap).sort(), []);
    const filteredIcons = useMemo(() => availableIcons.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase())), [availableIcons, searchTerm]);

    useEscapeKey(onClose);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[70] p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-700 flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-700 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Icon suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-theme-input border border-theme-border rounded-md pl-9 pr-3 py-1.5 text-white placeholder-theme-text-muted"
                            autoFocus
                        />
                    </div>
                </header>
                <main className="p-4 overflow-y-auto custom-scrollbar grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-2">
                    {filteredIcons.map(iconName => {
                        const IconComponent = iconMap[iconName];
                        return (
                            <button key={iconName} onClick={() => onSelect(iconName)} className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-slate-700 aspect-square" title={iconName}>
                                <IconComponent className="h-6 w-6 text-slate-300" />
                                <span className="text-xs text-slate-500 truncate w-full text-center">{iconName}</span>
                            </button>
                        );
                    })}
                </main>
            </div>
        </div>
    );
};

const CategoryEditModal: FC<{ isOpen: boolean; onClose: () => void; categoryData: CategoryFormData | null; onSave: (data: CategoryFormData) => void; }> = ({ isOpen, onClose, categoryData, onSave }) => {
    const { categoryGroups } = useApp();
    const [formData, setFormData] = useState(categoryData);
    const [isIconPickerOpen, setIconPickerOpen] = useState(false);

    useEffect(() => { setFormData(categoryData); }, [categoryData]);
    useEscapeKey(() => { if (isIconPickerOpen) setIconPickerOpen(false); else onClose(); });

    const handleSave = () => {
        if (!formData || !formData.name.trim()) {
            toast.error("Der Kategoriename darf nicht leer sein.");
            return;
        }
        onSave(formData);
    };

    if (!formData) {
        return null;
    }

    const IconComponent = getIconComponent(formData.icon);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[70] p-4" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div className="bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-700 flex flex-col" onClick={e => e.stopPropagation()}
                        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={ANIMATION_CONFIG.MODAL_SPRING}>
                        <header className="flex justify-between items-center p-6 border-b border-slate-700">
                            <h2 className="text-xl font-bold text-white">Kategorie bearbeiten</h2>
                            <Button variant="ghost" size="icon-auto" onClick={onClose}><X className="h-5 w-5" /></Button>
                        </header>
                        <main className="p-6 space-y-4">
                            <div className="grid grid-cols-[auto,1fr,auto] items-end gap-4">
                                <button onClick={() => setIconPickerOpen(true)} className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity" style={{ backgroundColor: formData.color }}>
                                    <IconComponent className="h-8 w-8 text-white" />
                                </button>
                                <div className="w-full">
                                    <label htmlFor="cat-name" className="text-xs text-slate-400">Name</label>
                                    <input id="cat-name" type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={BASE_INPUT_CLASSES} />
                                </div>
                                <div>
                                    <label htmlFor="cat-color" className="block text-xs text-slate-400 text-center mb-1">Farbe</label>
                                    <input
                                        id="cat-color"
                                        type="color"
                                        value={formData.color}
                                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                                        className="w-10 h-10 p-0 border-none rounded-lg bg-transparent cursor-pointer"
                                        title="Farbe ändern"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="cat-group" className="text-xs text-slate-400">Gruppe</label>
                                <select id="cat-group" value={formData.group} onChange={e => setFormData({ ...formData, group: e.target.value })} className={BASE_INPUT_CLASSES}>
                                    {categoryGroups.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                        </main>
                        <footer className="p-4 bg-slate-800/50 border-t border-slate-700 flex justify-end gap-3">
                            <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
                            <Button onClick={handleSave}>Speichern</Button>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
            {isIconPickerOpen && <IconPicker onClose={() => setIconPickerOpen(false)} onSelect={(iconName) => { if(formData) { setFormData({ ...formData, icon: iconName }); } setIconPickerOpen(false); }} />}
        </AnimatePresence>
    );
};


const CategoryLibraryModal: FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { categories, categoryGroups, upsertCategory, deleteCategory, renameGroup, addGroup, deleteGroup } = useApp();
    const [editingCategory, setEditingCategory] = useState<CategoryFormData | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [editingGroup, setEditingGroup] = useState<string | null>(null);
    const [groupNameValue, setGroupNameValue] = useState('');
    
    const existingCategoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
    
    const unassignedCategories = useMemo(() => {
        return INITIAL_CATEGORIES.filter(cat => !existingCategoryMap.has(cat.id));
    }, [existingCategoryMap]);

    const groupedAndSortedCategories = useMemo(() => {
        const groupMap = new Map<string, Category[]>();
        categories.forEach(category => {
            const group = category.group;
            if (!groupMap.has(group)) groupMap.set(group, []);
            groupMap.get(group)!.push(category);
        });
        
        return categoryGroups.map(groupName => ({
            name: groupName,
            categories: groupMap.get(groupName) || []
        }));
    }, [categories, categoryGroups]);

    const handleOpenEditor = (libraryCategory: Omit<Category, 'lastModified' | 'version'> | Category) => {
        const existingVersion = existingCategoryMap.get(libraryCategory.id);
        const categoryToEdit = existingVersion ?
            { ...existingVersion } :
            { ...libraryCategory, budget: libraryCategory.budget || 0 }; // Ensure budget is number
        setEditingCategory(categoryToEdit);
    };
    
    const handleSaveCategory = (data: CategoryFormData) => {
        upsertCategory(data);
        toast.success(`Kategorie "${data.name}" gespeichert.`);
        setEditingCategory(null);
    };

    const handleRenameGroup = (oldName: string) => {
        if (!oldName || !groupNameValue.trim() || oldName === groupNameValue.trim()) {
            setEditingGroup(null);
            return;
        }
        renameGroup(oldName, groupNameValue.trim());
        setEditingGroup(null);
    };

    const handleAddGroup = () => {
        if (newGroupName.trim()) {
            addGroup(newGroupName.trim());
            setNewGroupName('');
        }
    };
    
    const handleDeleteGroup = (groupName: string) => {
        if (groupName === 'Sonstiges') {
            toast.error('Die Standardgruppe "Sonstiges" kann nicht gelöscht werden.');
            return;
        }
        
        if (window.confirm(`Gruppe "${groupName}" wirklich löschen? Zugehörige Kategorien werden automatisch in "Sonstiges" verschoben.`)) {
            // The hook handles all the logic now
            deleteGroup(groupName);
        }
    };

    useEscapeKey(() => { editingCategory ? setEditingCategory(null) : onClose(); });

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[60] p-4" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div className="bg-slate-900 rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-700 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}
                        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={ANIMATION_CONFIG.MODAL_SPRING}>
                        <header className="flex justify-between items-center p-6 border-b border-slate-700 flex-shrink-0">
                            <h2 className="text-xl font-bold text-white">Kategorien-Bibliothek</h2>
                            <Button variant="ghost" size="icon-auto" onClick={onClose}><X className="h-5 w-5" /></Button>
                        </header>
                        <main className="p-6 flex-grow overflow-y-auto custom-scrollbar space-y-6">
                            {unassignedCategories.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 ml-1">Nicht zugeordnete Kategorien</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {unassignedCategories.map(category => {
                                            const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
                                            return (
                                                <button
                                                    key={category.id}
                                                    type="button"
                                                    onClick={() => handleOpenEditor(category)}
                                                    className="w-12 h-12 flex items-center justify-center rounded-lg bg-slate-700/80 hover:bg-slate-700 border-2 transition-colors duration-200"
                                                    style={{ borderColor: category.color }}
                                                    title={`${category.name} (Hinzufügen)`}
                                                >
                                                    <Icon className="h-6 w-6" style={{ color: category.color }} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                             {unassignedCategories.length > 0 && groupedAndSortedCategories.length > 0 && (
                                <div className="border-b border-slate-700/50"></div>
                            )}

                            {groupedAndSortedCategories.map(group => (
                                <div key={group.name}>
                                    {editingGroup === group.name ? (
                                        <div className="flex items-center gap-2 mb-3">
                                            <input
                                                type="text"
                                                value={groupNameValue}
                                                onChange={(e) => setGroupNameValue(e.target.value)}
                                                onBlur={() => handleRenameGroup(group.name)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleRenameGroup(group.name);
                                                    }
                                                    if (e.key === 'Escape') {
                                                        e.preventDefault();
                                                        setEditingGroup(null);
                                                    }
                                                }}
                                                className="text-xs font-bold uppercase tracking-wider text-white bg-theme-input rounded p-1 ml-1 w-full max-w-xs focus:ring-2 focus:ring-theme-ring focus:outline-none"
                                                autoFocus
                                            />
                                        </div>
                                    ) : (
                                        <button onClick={() => { setEditingGroup(group.name); setGroupNameValue(group.name); }} className="w-full text-left rounded" title="Gruppenname bearbeiten">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 ml-1 hover:text-white transition-colors">{group.name}</h4>
                                        </button>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        {group.categories.length > 0 ? (
                                            group.categories.map(category => {
                                                const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
                                                return (
                                                    <button
                                                        key={category.id}
                                                        type="button"
                                                        onClick={() => handleOpenEditor(category)}
                                                        className="w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-200 border-2 bg-slate-700/50 opacity-80 hover:opacity-100 relative"
                                                        style={{ borderColor: category.color }}
                                                        title={`${category.name} (Bearbeiten)`}
                                                    >
                                                        <Icon className="h-6 w-6" style={{ color: category.color }} />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteCategory(category.id);
                                                            }}
                                                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-slate-900 hover:bg-red-400 transition-colors"
                                                            title={`${category.name} entfernen`}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="flex items-center w-full">
                                                <p className="text-sm text-slate-500 italic px-2">In dieser Gruppe befindet sich keine Kategorie.</p>
                                                {group.name !== 'Sonstiges' && (
                                                    <Button
                                                        variant="destructive-ghost"
                                                        size="icon-auto"
                                                        onClick={() => handleDeleteGroup(group.name)}
                                                        title={`Leere Gruppe "${group.name}" löschen`}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <div className="border-b border-slate-700/50 my-6"></div>
                            
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 ml-1">Neue Kategoriegruppe</h4>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddGroup(); }}
                                        placeholder="Name der neuen Gruppe"
                                        className={`flex-grow ${BASE_INPUT_CLASSES}`}
                                    />
                                    <Button
                                        onClick={handleAddGroup}
                                        variant="primary"
                                        size="icon"
                                        title="Neue Gruppe hinzufügen"
                                    >
                                        <Plus className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                        </main>
                         <footer className="p-4 border-t border-slate-700 flex-shrink-0 text-right">
                            <Button onClick={onClose}>Fertig</Button>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
            <CategoryEditModal isOpen={!!editingCategory} onClose={() => setEditingCategory(null)} categoryData={editingCategory} onSave={handleSaveCategory} />
        </AnimatePresence>
    );
};

export default SettingsModal;
