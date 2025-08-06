
import React, { useState, useMemo, useCallback, useEffect, FC, useRef } from 'react';
import { AnimatePresence, motion, Reorder, PanInfo } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '../contexts/AppContext';
import type { Category, RecurringTransaction, Tag, User, SettingsTab } from '../types';
import { format, parseISO, formatCurrency } from '../utils/dateUtils';
import { Settings, Loader2, X, TrendingDown, LayoutGrid, BarChart2, Sheet, Save, DownloadCloud, Target, Edit, Trash2, Plus, GripVertical, Wallet, SlidersHorizontal, Repeat, History, Tag as TagIcon, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, FlaskConical, Users, CheckCircle2, ChevronRight as ChevronRightIcon, Info, iconMap } from './Icons';
import type { LucideProps } from 'lucide-react';
import { APP_VERSION } from '../constants';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { generateUUID } from '../utils/uuid';
import { getIconComponent } from './Icons';

// --- Local Constants & Helpers ---

const MotionDiv = motion('div');
const MotionSpan = motion('span');

const STYLES = {
    DELETE_BUTTON: "p-3 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors",
    MANAGER_LIST_ITEM: "w-full text-left bg-slate-700/50 hover:bg-slate-700 p-4 rounded-lg transition-colors flex justify-between items-center",
    INPUT_FIELD: "bg-transparent font-medium text-white w-full focus:outline-none focus:bg-slate-600/50 rounded px-2 py-1",
    PRIMARY_BUTTON: "flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold px-4 py-2 rounded-md transition-colors",
    SECONDARY_BUTTON: "flex items-center gap-2 text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md font-semibold",
    BASE_INPUT: "w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500",
};

const ANIMATION_CONFIG = {
    HOVER_DELAY: 400,
    MODAL_SPRING: { type: 'spring' as const, bounce: 0.3, duration: 0.4 },
    EXPAND_DURATION_FAST: 0,
    EXPAND_DURATION_NORMAL: 0.3,
};

// --- Child Components ---

const IconPicker: FC<{
  onSelect: (iconName: string) => void;
  onClose: () => void;
}> = ({ onSelect, onClose }) => {
    const iconList = useMemo(() => Object.keys(iconMap).sort(), []);
    
    const ICONS_PER_PAGE = 50;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(iconList.length / ICONS_PER_PAGE);

    const paginatedIcons = useMemo(() => {
        const startIndex = (currentPage - 1) * ICONS_PER_PAGE;
        return iconList.slice(startIndex, startIndex + ICONS_PER_PAGE);
    }, [currentPage, iconList]);

    useEscapeKey(onClose);

    return (
        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[70]" onClick={onClose}>
            <MotionDiv initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                transition={ANIMATION_CONFIG.MODAL_SPRING}
                className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700 flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
                    <h3 className="text-lg font-bold text-white">Symbol auswählen</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors"><X className="h-5 w-5" /></button>
                </header>
                <main className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 p-4 overflow-y-auto flex-grow">
                    {paginatedIcons.map(iconName => {
                        const Icon = getIconComponent(iconName);
                        return (
                            <button key={iconName} onClick={() => onSelect(iconName)}
                                className="aspect-square flex items-center justify-center bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-rose-400"
                                title={iconName}>
                                <Icon className="h-6 w-6" />
                            </button>
                        );
                    })}
                </main>
                <footer className="flex justify-between items-center p-4 border-t border-slate-700 flex-shrink-0">
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-full hover:bg-slate-700 disabled:opacity-50"><ChevronLeft className="h-5 w-5"/></button>
                    <span className="text-sm font-medium text-slate-400">Seite {currentPage} von {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-full hover:bg-slate-700 disabled:opacity-50"><ChevronRight className="h-5 w-5"/></button>
                </footer>
            </MotionDiv>
        </MotionDiv>
    );
};

const ToggleSwitch: FC<{ enabled: boolean; setEnabled: (enabled: boolean) => void; id?: string; }> = ({ enabled, setEnabled, id }) => (
    <button type="button" id={id} role="switch" aria-checked={enabled} onClick={() => setEnabled(!enabled)}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-rose-500 ${enabled ? 'bg-rose-600' : 'bg-slate-600'}`}>
        <MotionSpan layout transition={{ type: 'spring', stiffness: 700, damping: 30 }}
            className={`inline-block w-4 h-4 transform bg-white rounded-full ${enabled ? 'translate-x-6' : 'translate-x-1'}`}/>
    </button>
);

const UserSettings: FC = () => {
    const { users, addUser, updateUser, deleteUser } = useApp();
    const [newUserName, setNewUserName] = useState('');

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newUserName.trim();
        if (trimmedName) {
            addUser(trimmedName);
            setNewUserName('');
        }
    };

    const handleNameUpdate = useCallback((id: string, name: string) => updateUser(id, { name }), [updateUser]);

    return (
        <MotionDiv key="users" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
            <h3 className="text-lg font-semibold text-white mb-4">Benutzer verwalten</h3>
            <p className="text-sm text-slate-400 mb-6">Legen Sie Benutzer an, um Ausgaben zuzuordnen. Der aktuell ausgewählte Benutzer wird neuen Transaktionen automatisch zugewiesen.</p>
            <form onSubmit={handleAddUser} className="flex gap-3 mb-6">
                <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.currentTarget.value)} placeholder="Neuer Benutzername..." className={STYLES.BASE_INPUT} />
                <button type="submit" className={STYLES.PRIMARY_BUTTON}><Plus className="h-4 w-4"/> Hinzufügen</button>
            </form>
            <div className="space-y-3">
                {users.map(user => (
                    <div key={user.id} className="flex items-center gap-4 bg-slate-700/50 p-2 rounded-lg">
                        <input type="color" value={user.color} onChange={(e) => updateUser(user.id, { color: e.currentTarget.value })} className="w-10 h-10 p-0 border-none rounded-md bg-transparent cursor-pointer flex-shrink-0" title="Farbe ändern"/>
                        <input type="text" defaultValue={user.name} onBlur={(e) => handleNameUpdate(user.id, e.currentTarget.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className={STYLES.INPUT_FIELD} />
                        <button onClick={() => { if (window.confirm(`Benutzer "${user.name}" löschen?`)) deleteUser(user.id); }} className={STYLES.DELETE_BUTTON}><Trash2 className="h-5 w-5" /></button>
                    </div>
                ))}
            </div>
        </MotionDiv>
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
        <MotionDiv key="budget" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
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
                                    placeholder="Budget" className="bg-slate-700 border border-slate-600 rounded-md py-1.5 pl-7 pr-2 text-white placeholder-slate-400 w-full focus:outline-none focus:ring-2 focus:ring-rose-500"/>
                            </div>
                        </div>
                    );
                })}
            </div>
        </MotionDiv>
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
        <MotionDiv key="recurring" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Wiederkehrende Ausgaben</h3>
                <button onClick={handleAdd} className={STYLES.SECONDARY_BUTTON}><Plus className="h-4 w-4"/>Neue Ausgabe</button>
            </div>
            <div className="space-y-3">
                {recurringTransactions.map(item => {
                    const isEditing = editingId === item.id;
                    const category = categories.find(c => c.id === item.categoryId);
                    const Icon = getIconComponent(category?.icon);

                    return isEditing ? (
                        <div key={item.id} className="bg-slate-700/80 p-4 rounded-lg space-y-4 ring-2 ring-rose-500">
                           <input type="text" value={item.description} onChange={e => handleUpdate(item.id, {description: e.currentTarget.value})} placeholder="Beschreibung" className={STYLES.BASE_INPUT}/>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <input type="number" value={item.amount} onChange={e => handleUpdate(item.id, {amount: Number(e.currentTarget.value.replace(',', '.')) || 0})} placeholder="Betrag" className={STYLES.BASE_INPUT}/>
                            <select value={item.categoryId} onChange={e => handleUpdate(item.id, {categoryId: e.currentTarget.value})} className={STYLES.BASE_INPUT}>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <input type="date" value={format(parseISO(item.startDate), 'yyyy-MM-dd')} onChange={e => handleUpdate(item.id, {startDate: e.currentTarget.value})} className={STYLES.BASE_INPUT}/>
                            <select value={item.frequency} onChange={e => { const val = e.currentTarget.value; if(val === 'monthly' || val === 'yearly') handleUpdate(item.id, {frequency: val}); }} className={STYLES.BASE_INPUT}>
                                <option value="monthly">Monatlich</option><option value="yearly">Jährlich</option>
                            </select>
                           </div>
                           <div className="flex justify-end gap-2"><button onClick={() => setEditingId(null)} className="text-slate-300 hover:text-white px-3 py-1 rounded">Fertig</button></div>
                        </div>
                    ) : (
                        <div key={item.id} className="flex items-center gap-4 bg-slate-700/50 p-3 rounded-lg">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: category?.color || '#64748b' }}><Icon className="h-5 w-5 text-white" /></div>
                            <div className="flex-1"><p className="font-semibold text-white">{item.description}</p><p className="text-sm text-slate-400">{category?.name} &bull; {item.frequency === 'monthly' ? 'Monatlich' : 'Jährlich'} ab {format(parseISO(item.startDate), 'dd.MM.yyyy')}</p></div>
                            <div className="font-bold text-white text-lg">{formatCurrency(item.amount)}</div>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingId(item.id)} className="p-2 rounded-full hover:bg-slate-600"><Edit className="h-4 w-4 text-slate-400"/></button>
                                <button onClick={() => {if(window.confirm('Diese wiederkehrende Ausgabe löschen?')) deleteRecurringTransaction(item.id)}} className="p-2 rounded-full hover:bg-slate-600"><Trash2 className="h-4 w-4 text-red-400"/></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </MotionDiv>
    );
};

const ManagerModal: FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
    useEscapeKey(onClose);
    return (
        <AnimatePresence>
            {isOpen && (
                <MotionDiv className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[60] p-4" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <MotionDiv className="bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}
                        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={ANIMATION_CONFIG.MODAL_SPRING}>
                        <header className="flex justify-between items-center p-6 border-b border-slate-700 flex-shrink-0">
                            <h2 className="text-xl font-bold text-white">{title}</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700"><X className="h-5 w-5" /></button>
                        </header>
                        <main className="p-6 flex-grow overflow-y-auto custom-scrollbar">{children}</main>
                    </MotionDiv>
                </MotionDiv>
            )}
        </AnimatePresence>
    );
};

// --- Main Component ---

const IconRenderer: FC<{ iconName: string } & LucideProps> = ({ iconName, ...props }) => {
    const Icon = getIconComponent(iconName);
    return <Icon {...props} />;
};

const SettingsModal: FC<{ isOpen: boolean; onClose: () => void; initialTab?: SettingsTab; }> = ({ isOpen, onClose, initialTab }) => {
    const {
        categories, categoryGroups, updateCategory, addCategory, deleteCategory, addGroup,
        updateGroupName, reorderGroups, deleteGroup, reorderCategories, moveCategoryToGroup,
        isAutoSyncEnabled, setIsAutoSyncEnabled, openChangelog, allAvailableTags, handleUpdateTag, handleDeleteTag
    } = useApp();

    const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('general');
    const [pickingIconFor, setPickingIconFor] = useState<string | null>(null);
    const [isCategoryManagerOpen, setCategoryManagerOpen] = useState(false);
    const [isTagManagerOpen, setTagManagerOpen] = useState(false);
    const [openGroupName, setOpenGroupName] = useState<string | null>(null);
    const [isDraggingCategory, setIsDraggingCategory] = useState(false);
    const [originGroupName, setOriginGroupName] = useState<string | null>(null);
    
    const groupItemRefs = useRef<Map<string, HTMLElement | null>>(new Map());
    const hoverTimeoutRef = useRef<number | null>(null);
    const lastHoveredGroupRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isOpen) setOpenGroupName(categoryGroups[0] || null);
        else if (initialTab) setActiveSettingsTab(initialTab);
    }, [isOpen, initialTab, categoryGroups]);

    // Global timeout cleanup
    useEffect(() => () => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); }, []);

    const handleEscape = useCallback(() => {
        if (isCategoryManagerOpen) setCategoryManagerOpen(false);
        else if (isTagManagerOpen) setTagManagerOpen(false);
        else if (pickingIconFor) setPickingIconFor(null);
        else onClose();
    }, [isCategoryManagerOpen, isTagManagerOpen, pickingIconFor, onClose]);
    useEscapeKey(handleEscape);

    const handleCategoryDragEnd = useCallback((info: PanInfo, category: Category) => {
        // Cleanup hover logic
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        lastHoveredGroupRef.current = null;
        
        // Find drop target
        const { point } = info;
        for (const [groupName, element] of groupItemRefs.current.entries()) {
            if (element && groupName !== category.group) {
                const rect = element.getBoundingClientRect();
                if (point.x > rect.left && point.x < rect.right && point.y > rect.top && point.y < rect.bottom) {
                    moveCategoryToGroup(category.id, groupName);
                    return; // Exit after moving
                }
            }
        }
    }, [moveCategoryToGroup]);

    const handleCategoryDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const { point } = info;
        let hoveredGroup: string | null = null;
        for (const [groupName, element] of groupItemRefs.current.entries()) {
            if (element) {
                const rect = element.getBoundingClientRect();
                if (point.x > rect.left && point.x < rect.right && point.y > rect.top && point.y < rect.bottom) {
                    hoveredGroup = groupName; break;
                }
            }
        }
        if (hoveredGroup !== lastHoveredGroupRef.current) {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            lastHoveredGroupRef.current = hoveredGroup;
            if (hoveredGroup && hoveredGroup !== openGroupName) {
                hoverTimeoutRef.current = window.setTimeout(() => {
                    if (lastHoveredGroupRef.current === hoveredGroup) setOpenGroupName(hoveredGroup);
                }, ANIMATION_CONFIG.HOVER_DELAY);
            }
        }
    }, [openGroupName]);
    
    const settingsTabs: { id: SettingsTab; label: string; icon: FC<LucideProps>; }[] = [
        { id: 'general', label: 'Allgemein', icon: SlidersHorizontal }, { id: 'users', label: 'Benutzer', icon: Users },
        { id: 'budget', label: 'Budgets', icon: Target }, { id: 'recurring', label: 'Wiederkehrende Ausgaben', icon: History }
    ];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <MotionDiv className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end md:items-center z-50" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <MotionDiv initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={ANIMATION_CONFIG.MODAL_SPRING}
                    className="bg-slate-800 rounded-t-2xl md:rounded-2xl w-full max-w-4xl shadow-2xl border-t md:border border-slate-700 flex flex-col max-h-[90vh] md:max-h-[85vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-6 border-b border-slate-700 flex-shrink-0">
                        <h2 className="text-xl font-bold text-white">Einstellungen</h2><button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700"><X className="h-5 w-5" /></button>
                    </div>
                    <div className="flex border-b border-slate-700 px-6 pt-4 overflow-x-auto custom-scrollbar">
                        {settingsTabs.map(tab => (<button key={tab.id} onClick={() => setActiveSettingsTab(tab.id)} className={`flex items-center gap-2 pb-3 px-2 border-b-2 text-sm font-semibold flex-shrink-0 mr-4 ${activeSettingsTab === tab.id ? 'border-rose-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}><tab.icon className="h-4 w-4"/> {tab.label}</button>))}
                    </div>
                    <div className="p-6 flex-grow overflow-y-auto space-y-8 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeSettingsTab === 'general' && (
                                <MotionDiv key="general" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-8">
                                    <div><h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2"><Sheet className="h-5 w-5 text-green-400" /> Google Sheets Sync</h3><div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700/50"><div><label htmlFor="auto-sync-toggle" className="block text-sm font-medium text-slate-300">Automatische Hintergrund-Synchronisierung</label><p className="text-xs text-slate-400 mt-1">Speichert Änderungen nach kurzer Inaktivität automatisch.</p></div><ToggleSwitch id="auto-sync-toggle" enabled={isAutoSyncEnabled} setEnabled={setIsAutoSyncEnabled} /></div></div>
                                    <div><h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2"><Wallet className="h-5 w-5 text-purple-400" /> Datenverwaltung</h3><div className="pt-4 mt-4 border-t border-slate-700/50 space-y-3"><button onClick={() => setCategoryManagerOpen(true)} className={STYLES.MANAGER_LIST_ITEM}><div><span className="font-semibold text-white">Kategorien-Verwaltung</span><p className="text-xs text-slate-400 mt-1">Kategorien und Gruppen bearbeiten, hinzufügen oder löschen.</p></div><ChevronRightIcon className="h-5 w-5 text-slate-400" /></button><button onClick={() => setTagManagerOpen(true)} className={STYLES.MANAGER_LIST_ITEM}><div><span className="font-semibold text-white">Tag-Verwaltung</span><p className="text-xs text-slate-400 mt-1">Bestehende Tags umbenennen oder löschen.</p></div><ChevronRightIcon className="h-5 w-5 text-slate-400" /></button></div></div>
                                    <div><h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2"><Info className="h-5 w-5 text-sky-400" /> App Informationen</h3><div className="pt-4 mt-4 border-t border-slate-700/50 space-y-3"><button onClick={openChangelog} className={STYLES.MANAGER_LIST_ITEM}><div><span className="font-semibold text-white">Was ist neu? (Changelog)</span><p className="text-xs text-slate-400 mt-1">Änderungen und neue Funktionen der letzten Versionen anzeigen.</p></div><ChevronRightIcon className="h-5 w-5 text-slate-400" /></button><div className="flex justify-between items-center text-sm px-1"><span className="text-slate-400">App-Version</span><span className="font-mono text-slate-500 bg-slate-700/50 px-2 py-1 rounded-md">{APP_VERSION}</span></div></div></div>
                                </MotionDiv>
                            )}
                            {activeSettingsTab === 'users' && <UserSettings />}
                            {activeSettingsTab === 'budget' && <BudgetSettings />}
                            {activeSettingsTab === 'recurring' && <RecurringSettings />}
                        </AnimatePresence>
                    </div>
                </MotionDiv>
            </MotionDiv>
            <ManagerModal isOpen={isCategoryManagerOpen} onClose={() => setCategoryManagerOpen(false)} title="Kategorien-Verwaltung">
                <div className="flex justify-between items-center mb-6"><p className="text-sm text-slate-400">Organisieren Sie Ihre Gruppen und Kategorien per Drag & Drop.</p><button onClick={addGroup} className={STYLES.SECONDARY_BUTTON}><Plus className="h-4 w-4"/>Neue Gruppe</button></div>
                <Reorder.Group axis="y" values={categoryGroups} onReorder={reorderGroups} className="space-y-2">
                    {categoryGroups.map((groupName) => {
                        const isOpen = openGroupName === groupName;
                        const isRelevantForOverflow = isDraggingCategory && groupName === openGroupName;

                        return (
                            <Reorder.Item key={groupName} value={groupName} className="bg-slate-700/40 rounded-lg" ref={(el) => groupItemRefs.current.set(groupName, el)}>
                                <div className="flex items-center p-3 cursor-pointer" onClick={() => setOpenGroupName(isOpen ? null : groupName)}>
                                    <div className="text-slate-500 cursor-grab active:cursor-grabbing" onPointerDown={(e) => e.stopPropagation()}><GripVertical className="h-6 w-6" /></div>
                                    <input type="text" defaultValue={groupName} onClick={(e) => e.stopPropagation()} onBlur={(e) => updateGroupName(groupName, e.currentTarget.value)} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} className="bg-transparent text-lg font-bold text-white w-full focus:outline-none focus:bg-slate-600/50 rounded px-2 mx-2"/>
                                    <ChevronDown className={`h-6 w-6 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                    <button onClick={(e) => { e.stopPropagation(); deleteGroup(groupName); }} className="p-2 ml-2 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400"><Trash2 className="h-5 w-5"/></button>
                                </div>
                                <motion.div 
                                    initial={false} 
                                    animate={{ height: isOpen ? 'auto' : 0 }} 
                                    transition={{ duration: isDraggingCategory ? ANIMATION_CONFIG.EXPAND_DURATION_FAST : ANIMATION_CONFIG.EXPAND_DURATION_NORMAL }} 
                                    style={{ overflow: isRelevantForOverflow ? 'visible' : 'hidden' }}
                                >
                                    <div className="pb-4 px-4">
                                        <Reorder.Group axis="y" values={categories.filter(c => c.group === groupName)} onReorder={(newOrder) => reorderCategories(groupName, newOrder)} className="space-y-2 ml-4 pl-4 border-l-2 border-slate-600">
                                        {categories.filter(c => c.group === groupName).map(cat => (
                                            <Reorder.Item 
                                                key={cat.id} 
                                                value={cat} 
                                                onDragStart={() => {
                                                    setIsDraggingCategory(true);
                                                    setOriginGroupName(cat.group);
                                                }} 
                                                onDrag={handleCategoryDrag} 
                                                onDragEnd={(_, info) => { 
                                                    setIsDraggingCategory(false); 
                                                    setOriginGroupName(null);
                                                    handleCategoryDragEnd(info, cat); 
                                                }}
                                                whileDrag={{ scale: 1.05, zIndex: 50, boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.3)' }} 
                                                className="bg-slate-700/50 p-2 rounded-lg flex items-center gap-3">
                                                <div className="text-slate-500 cursor-grab active:cursor-grabbing"><GripVertical className="h-5 w-5" /></div>
                                                <button type="button" onClick={() => setPickingIconFor(cat.id)} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110" style={{ backgroundColor: cat.color }} title="Symbol ändern">
                                                    <IconRenderer iconName={cat.icon} className="h-5 w-5 text-white" />
                                                </button>
                                                <input type="text" defaultValue={cat.name} onBlur={e => updateCategory(cat.id, { name: e.currentTarget.value })} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} className={STYLES.INPUT_FIELD}/>
                                                <input type="color" value={cat.color} onChange={e => updateCategory(cat.id, { color: e.currentTarget.value })} className="w-8 h-8 p-0 border-none rounded-md bg-transparent cursor-pointer" title="Farbe ändern"/>
                                                <button onClick={() => deleteCategory(cat.id)} className="p-2 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400"><Trash2 className="h-5 w-5"/></button>
                                            </Reorder.Item>
                                        ))}
                                        </Reorder.Group>
                                        <button onClick={() => addCategory(groupName)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mt-3 ml-8"><Plus className="h-4 w-4"/>Kategorie hinzufügen</button>
                                    </div>
                                </motion.div>
                            </Reorder.Item>
                        )
                    })}
                </Reorder.Group>
            </ManagerModal>
            <ManagerModal isOpen={isTagManagerOpen} onClose={() => setTagManagerOpen(false)} title="Tag-Verwaltung">
                <div className="space-y-3">
                    {allAvailableTags.map(tag => (
                        <div key={tag.id} className="flex items-center gap-3 bg-slate-700/50 p-2 rounded-lg">
                            <TagIcon className="h-5 w-5 text-slate-400 shrink-0 ml-2" />
                            <input type="text" defaultValue={tag.name} onBlur={(e) => handleUpdateTag(tag.id, e.currentTarget.value.trim())} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} className={STYLES.INPUT_FIELD} />
                            <button onClick={() => { if (window.confirm(`Tag "${tag.name}" löschen?`)) handleDeleteTag(tag.id); }} className={STYLES.DELETE_BUTTON}><Trash2 className="h-5 w-5" /></button>
                        </div>
                    ))}
                </div>
            </ManagerModal>
            {pickingIconFor && <IconPicker onClose={() => setPickingIconFor(null)} onSelect={(iconName) => { if (pickingIconFor) updateCategory(pickingIconFor, { icon: iconName }); setPickingIconFor(null); }}/>}
        </AnimatePresence>
    );
};

export default SettingsModal;
