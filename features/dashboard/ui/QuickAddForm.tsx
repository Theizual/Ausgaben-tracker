import React, { useState, useMemo, FC, useRef } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useDataContext, useUserContext, useTaxonomyContext, useUIContext } from '@/contexts/AppContext';
import type { Transaction, Category, ViewMode, CategoryId, Tag, Group } from '@/shared/types';
import { Plus, Coins, Button, Camera, Upload, Trash2, GripVertical, Copy, ToggleSwitch, getIconComponent, ChevronDown } from '@/shared/ui';
import { CategoryButtons, TagInput, AvailableTags } from '@/shared/ui';
import { parseISO } from 'date-fns';
import { FIXED_COSTS_GROUP_ID } from '@/constants';
import { MoreCategoriesModal } from './MoreCategoriesModal';
import { AnalyzeReceiptResult } from '@/contexts/AppContext';
import { nanoid } from 'nanoid';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { clsx } from 'clsx';

const SingleQuickAdd: FC = () => {
    const { 
        addTransaction,
        addMultipleTransactions,
        allAvailableTags, 
        transactions,
        analyzeReceipt,
    } = useDataContext();
    const {
        categories, 
        groups,
    } = useTaxonomyContext();
    const {
        favoriteIds,
        recentCategoryIds,
        addRecent,
        quickAddShowFavorites,
        quickAddShowRecents,
        isAiEnabled,
    } = useUserContext();
    
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInputValue, setTagInputValue] = useState('');
    const [isMoreCategoriesOpen, setIsMoreCategoriesOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const recentlyUsedTags = useMemo(() => {
        const sortedTransactions = [...transactions].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        const recentTagIds = new Set<string>();

        for (const transaction of sortedTransactions) {
            if (recentTagIds.size >= 6) break;
            if (transaction.tagIds) {
                for (const tagId of transaction.tagIds) {
                    if (recentTagIds.size >= 6) break;
                    recentTagIds.add(tagId);
                }
            }
        }
        
        const tagMap = new Map(allAvailableTags.map(t => [t.id, t]));
        return Array.from(recentTagIds).map(id => tagMap.get(id)).filter((t): t is Tag => !!t);
    }, [transactions, allAvailableTags]);

    const favoriteCategories = useMemo(() => 
        favoriteIds.map(id => categories.find(c => c.id === id)).filter(Boolean) as Category[],
        [favoriteIds, categories]
    );

    const recentCategories = useMemo(() => 
        recentCategoryIds.map(id => categories.find(c => c.id === id)).filter(Boolean) as Category[],
        [recentCategoryIds, categories]
    );

    const { visibleGroupsForMainView, visibleCategoriesForMainView, someGroupsAreHidden } = useMemo(() => {
        const allFlexGroups = groups.filter(g => g.id !== FIXED_COSTS_GROUP_ID);
        const visibleGroups = allFlexGroups.filter(g => !g.isHiddenInQuickAdd);
        const visibleCategories = categories.filter(c => visibleGroups.some(g => g.id === c.groupId));
        const someHidden = visibleGroups.length < allFlexGroups.length;
        return { visibleGroupsForMainView: visibleGroups, visibleCategoriesForMainView: visibleCategories, someGroupsAreHidden: someHidden };
    }, [groups, categories]);


    const handleSelectCategory = (newCategoryId: string) => {
        setCategoryId(newCategoryId);
        addRecent(newCategoryId);
        if (isMoreCategoriesOpen) {
            setIsMoreCategoriesOpen(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount.replace(',', '.'));
        if (!numAmount || numAmount <= 0 || !description || !categoryId) {
            if (!categoryId) {
                toast.error("Bitte wählen Sie eine Kategorie aus.");
            } else if (!description) {
                toast.error("Bitte geben Sie eine Beschreibung ein.");
            } else {
                 toast.error("Bitte geben Sie einen gültigen Betrag ein.");
            }
            return;
        }

        const finalTags = [...tags];
        const trimmedInput = tagInputValue.trim();
        if (trimmedInput && !finalTags.includes(trimmedInput)) {
            finalTags.push(trimmedInput);
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
            addMultipleTransactions(transactionsToCreate, numAmount, { categoryId, tags: finalTags });
        } else {
            addTransaction({ 
                amount: numAmount, 
                description, 
                categoryId, 
                tags: finalTags,
            });
        }
        
        setAmount('');
        setDescription('');
        setTags([]);
        setTagInputValue('');
        setCategoryId('');
    };

    const handleTagClick = (tag: string) => {
        setTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            try {
                const result = await analyzeReceipt(base64String);
                if (result) {
                    setAmount(result.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                    setDescription(result.description);
                    if (result.categoryId) {
                        setCategoryId(result.categoryId);
                    }
                }
            } catch (error) {
                console.error("AI analysis failed:", error);
            }
        };
        reader.readAsDataURL(file);
        
        event.target.value = '';
    };

    const triggerFileInput = (useCamera: boolean) => {
        if (fileInputRef.current) {
            if (useCamera) {
                fileInputRef.current.setAttribute('capture', 'environment');
            } else {
                fileInputRef.current.removeAttribute('capture');
            }
            fileInputRef.current.click();
        }
    };

    return (
        <>
        <form onSubmit={handleSubmit} className="space-y-3">
             <div className="flex flex-col sm:flex-row gap-3">
                <div className="sm:w-40 flex-shrink-0">
                    <div className="flex items-center h-10 bg-slate-700 border border-slate-500 rounded-lg focus-within:ring-2 focus-within:ring-rose-500 px-4">
                        <Coins className="h-5 w-5 text-slate-400 shrink-0" />
                        <input
                            id="amount"
                            type="text"
                            inputMode="decimal"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="Betrag"
                            className="w-full bg-transparent border-none pl-3 pr-0 py-2 text-white placeholder-slate-400 focus:outline-none text-base"
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
                        placeholder="Beschreibung (mehrere mit Komma trennen)"
                        className="w-full h-10 bg-slate-700 border border-slate-500 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 text-base"
                        required
                    />
                </div>
            </div>
            
            {isAiEnabled && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelected} className="hidden" />
                    <Button type="button" variant="secondary" onClick={() => triggerFileInput(true)}>
                        <Camera className="h-4 w-4" /> Beleg scannen
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => triggerFileInput(false)}>
                        <Upload className="h-4 w-4" /> Bild hochladen
                    </Button>
                </div>
            )}
            
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1.5 ml-1 pt-1">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Kategorie wählen</h5>
                </div>
                 
                <div className="space-y-3">
                    {quickAddShowFavorites && favoriteCategories.length > 0 && (
                        <div>
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500/80 mb-1.5 ml-1">Favoriten</h5>
                            <CategoryButtons 
                                categories={favoriteCategories}
                                selectedCategoryId={categoryId}
                                onSelectCategory={handleSelectCategory}
                                showGroups={false}
                                favoriteIds={favoriteIds}
                            />
                        </div>
                    )}
                    {quickAddShowRecents && recentCategories.length > 0 && (
                        <div>
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500/80 mb-1.5 ml-1">Zuletzt verwendet</h5>
                            <CategoryButtons 
                                categories={recentCategories}
                                selectedCategoryId={categoryId}
                                onSelectCategory={handleSelectCategory}
                                showGroups={false}
                                favoriteIds={favoriteIds}
                            />
                        </div>
                    )}
                    
                    <CategoryButtons 
                        categories={visibleCategoriesForMainView}
                        groups={visibleGroupsForMainView}
                        selectedCategoryId={categoryId}
                        onSelectCategory={handleSelectCategory}
                        showGroups={true}
                        favoriteIds={favoriteIds}
                    />

                    {someGroupsAreHidden && (
                        <div className="flex justify-end pt-1">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setIsMoreCategoriesOpen(true)}
                            >
                                Alle Gruppen anzeigen
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-700/50">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-2 mb-1 ml-1">Schnellauswahl Tags</h5>
                <TagInput 
                    tags={tags} 
                    setTags={setTags}
                    inputValue={tagInputValue}
                    onInputChange={setTagInputValue}
                    allAvailableTags={allAvailableTags}
                />
                <AvailableTags 
                    availableTags={recentlyUsedTags}
                    selectedTags={tags}
                    onTagClick={handleTagClick}
                    size="sm"
                />
            </div>
            
            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold px-5 py-2 rounded-lg shadow-md hover:opacity-90 transition-opacity"
                    aria-label="Ausgabe hinzufügen"
                >
                    <Plus className="h-5 w-5" />
                    <span className="sm:inline">Hinzufügen</span>
                </button>
            </div>
        </form>
         <AnimatePresence>
            {isMoreCategoriesOpen && (
                 <MoreCategoriesModal
                    isOpen={isMoreCategoriesOpen}
                    onClose={() => setIsMoreCategoriesOpen(false)}
                    onSelectCategory={handleSelectCategory}
                />
            )}
        </AnimatePresence>
        </>
    );
};

// ... new components will go here
type GroupItem = {
    id: string;
    title: string;
    amount: string;
    categoryId?: string;
};

const GroupQuickAddItem: FC<{
    item: GroupItem;
    onUpdate: (id: string, field: keyof Omit<GroupItem, 'id'>, value: string) => void;
    onRemove: (id: string) => void;
    onDuplicate: (id: string) => void;
    onAddNew: () => void;
    categories: Category[];
    groups: Group[];
}> = ({ item, onUpdate, onRemove, onDuplicate, onAddNew, categories, groups }) => {
    const dragControls = useDragControls();

    const categoryOptions = useMemo(() => {
        const grouped = new Map<string, Category[]>();
        categories.forEach(cat => {
            if (!grouped.has(cat.groupId)) grouped.set(cat.groupId, []);
            grouped.get(cat.groupId)!.push(cat);
        });

        return Array.from(groups)
            .sort((a,b) => a.sortIndex - b.sortIndex)
            .map(group => ({
                ...group,
                categories: (grouped.get(group.id) || []).sort((a,b) => a.sortIndex - b.sortIndex)
            })).filter(g => g.categories.length > 0);
    }, [categories, groups]);
    
    return (
        <Reorder.Item
            value={item}
            dragListener={false}
            dragControls={dragControls}
            className="flex items-center gap-2"
        >
            <div onPointerDown={(e) => dragControls.start(e)} className="p-2 cursor-grab active:cursor-grabbing text-slate-500 touch-none">
                <GripVertical className="h-5 w-5" />
            </div>
            <input type="text" value={item.title} onChange={e => onUpdate(item.id, 'title', e.target.value)} onKeyDown={e => e.key === 'Enter' && onAddNew()} placeholder="Titel der Position" className="flex-grow bg-slate-700/80 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-rose-500" required />
            <input type="text" inputMode="decimal" value={item.amount} onChange={e => onUpdate(item.id, 'amount', e.target.value)} placeholder="Auto" className="w-20 bg-slate-700/80 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-right text-white focus:ring-2 focus:ring-rose-500" />
            <select value={item.categoryId || ''} onChange={e => onUpdate(item.id, 'categoryId', e.target.value)} className="w-36 bg-slate-700/80 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-rose-500">
                <option value="">Standard</option>
                {categoryOptions.map(group => (
                    <optgroup key={group.id} label={group.name}>
                        {group.categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </optgroup>
                ))}
            </select>
            <Button variant="ghost" size="icon-auto" className="p-1.5" onClick={() => onDuplicate(item.id)} title="Position duplizieren"><Copy className="h-4 w-4" /></Button>
            <Button variant="destructive-ghost" size="icon-auto" className="p-1.5" onClick={() => onRemove(item.id)} title="Position löschen"><Trash2 className="h-4 w-4" /></Button>
        </Reorder.Item>
    )
};

const GroupQuickAddForm = () => {
    const { addMultipleTransactions, allAvailableTags } = useDataContext();
    const { categories, groups } = useTaxonomyContext();
    const { addRecent } = useUserContext();

    // Group-level state
    const [totalAmount, setTotalAmount] = useState('');
    const [defaultCategoryId, setDefaultCategoryId] = useState('');
    const [defaultTags, setDefaultTags] = useState<string[]>([]);
    const [tagInputValue, setTagInputValue] = useState('');
    const [isGroupCategoryPickerOpen, setIsGroupCategoryPickerOpen] = useState(false);


    // Item-level state
    const [items, setItems] = useState<GroupItem[]>([
        { id: nanoid(5), title: '', amount: '', categoryId: '' },
        { id: nanoid(5), title: '', amount: '', categoryId: '' }
    ]);
    const [isAutoDistribute, setIsAutoDistribute] = useState(true);
    
    const flexibleCategories = useMemo(() => categories.filter(c => c.groupId !== FIXED_COSTS_GROUP_ID), [categories]);
    
    const selectedDefaultCategory = useMemo(() => {
        if (!defaultCategoryId) return null;
        return flexibleCategories.find(c => c.id === defaultCategoryId);
    }, [defaultCategoryId, flexibleCategories]);

    const handleAddItem = () => setItems([...items, { id: nanoid(5), title: '', amount: '', categoryId: '' }]);
    const handleUpdateItem = (id: string, field: keyof Omit<GroupItem, 'id'>, value: string) => setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    const handleRemoveItem = (id: string) => items.length > 1 ? setItems(items.filter(item => item.id !== id)) : toast.error("Die letzte Position kann nicht gelöscht werden.");
    const handleDuplicateItem = (id: string) => {
        const itemToDuplicate = items.find(item => item.id === id);
        if (itemToDuplicate) {
            const newItem = { ...itemToDuplicate, id: nanoid(5) };
            const index = items.findIndex(item => item.id === id);
            setItems(prev => [...prev.slice(0, index + 1), newItem, ...prev.slice(index + 1)]);
        }
    };
    
    const handleReset = () => {
        setTotalAmount('');
        setDefaultCategoryId('');
        setDefaultTags([]);
        setTagInputValue('');
        setItems([
            { id: nanoid(5), title: '', amount: '', categoryId: '' },
            { id: nanoid(5), title: '', amount: '', categoryId: '' }
        ]);
        setIsAutoDistribute(true);
    };

    const handleSave = () => {
        const totalAmountNum = parseFloat(totalAmount.replace(',', '.')) || 0;
        if (totalAmountNum <= 0) { toast.error("Bitte einen gültigen Gesamtbetrag eingeben."); return; }
        if (!defaultCategoryId) { toast.error("Bitte eine Standard-Kategorie auswählen."); return; }
        if (items.some(i => i.title.trim() === '')) { toast.error("Bitte für alle Positionen einen Titel eingeben."); return; }

        let finalItems = [...items];
        const sumOfItemAmounts = finalItems.reduce((sum, i) => sum + (parseFloat(i.amount.replace(',', '.')) || 0), 0);

        if (isAutoDistribute) {
            const itemsWithoutAmount = finalItems.filter(i => i.amount.trim() === '');
            if (itemsWithoutAmount.length > 0) {
                const remainingAmount = totalAmountNum - sumOfItemAmounts;
                if (remainingAmount < -0.01) { toast.error("Die Summe der Positionen übersteigt den Gesamtbetrag."); return; }
                
                const amountPerItemCents = Math.floor((remainingAmount / itemsWithoutAmount.length) * 100);
                let distributedSumCents = 0;

                itemsWithoutAmount.forEach(item => {
                    const itemAmount = amountPerItemCents / 100;
                    item.amount = itemAmount.toFixed(2).replace('.',',');
                    distributedSumCents += amountPerItemCents;
                });
                
                const roundingDiffCents = Math.round(remainingAmount * 100) - distributedSumCents;
                if (roundingDiffCents !== 0 && itemsWithoutAmount.length > 0) {
                    const lastItem = itemsWithoutAmount[itemsWithoutAmount.length - 1];
                    const currentAmount = parseFloat(lastItem.amount.replace(',', '.')) || 0;
                    lastItem.amount = (currentAmount + (roundingDiffCents / 100)).toFixed(2).replace('.',',');
                }
            }
        }
        
        const finalSumOfItems = finalItems.reduce((sum, i) => sum + (parseFloat(i.amount.replace(',', '.')) || 0), 0);
        if (Math.abs(finalSumOfItems - totalAmountNum) > 0.01) {
             toast.error(`Summe der Positionen (${formatCurrency(finalSumOfItems)}) stimmt nicht mit dem Gesamtbetrag (${formatCurrency(totalAmountNum)}) überein. Bitte Beträge prüfen.`);
             return;
        }

        const transactionsToCreate = finalItems.map(item => ({
            description: item.title,
            amount: parseFloat(item.amount.replace(',', '.')) || 0,
            categoryId: item.categoryId || defaultCategoryId
        }));
        
        addMultipleTransactions(transactionsToCreate, totalAmountNum, { categoryId: defaultCategoryId, tags: defaultTags });
        handleReset();
    };

    return (
        <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
            {/* Group Defaults */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center h-10 bg-slate-700 border border-slate-500 rounded-lg focus-within:ring-2 focus-within:ring-rose-500 px-4">
                    <Coins className="h-5 w-5 text-slate-400 shrink-0" />
                    <input type="text" inputMode="decimal" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="Gesamtbetrag" className="w-full bg-transparent border-none pl-3 pr-0 py-2 text-white placeholder-slate-400 focus:outline-none text-base" required />
                </div>
                 <div>
                    <button
                        type="button"
                        onClick={() => setIsGroupCategoryPickerOpen(true)}
                        className="w-full h-10 bg-slate-700 border border-slate-500 rounded-lg px-4 text-left flex items-center gap-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                        {selectedDefaultCategory ? (
                            <>
                                {React.createElement(getIconComponent(selectedDefaultCategory.icon), { className: 'h-5 w-5', style: { color: selectedDefaultCategory.color } })}
                                <span className="font-medium">{selectedDefaultCategory.name}</span>
                            </>
                        ) : (
                            <span className="text-slate-400">Standard-Kategorie wählen...</span>
                        )}
                    </button>
                </div>
            </div>
             <TagInput tags={defaultTags} setTags={setDefaultTags} inputValue={tagInputValue} onInputChange={setTagInputValue} allAvailableTags={allAvailableTags} />

             <div className="pt-3 border-t border-slate-700/50">
                <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2">
                    {items.map(item => <GroupQuickAddItem key={item.id} item={item} onUpdate={handleUpdateItem} onRemove={handleRemoveItem} onDuplicate={handleDuplicateItem} onAddNew={handleAddItem} categories={flexibleCategories} groups={groups.filter(g => g.id !== FIXED_COSTS_GROUP_ID)} />)}
                </Reorder.Group>
                <Button type="button" variant="secondary" size="sm" onClick={handleAddItem} className="mt-3"><Plus className="h-4 w-4"/>Position hinzufügen</Button>
             </div>
             {/* Footer */}
             <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
                <div className="flex items-center gap-2">
                    <ToggleSwitch enabled={isAutoDistribute} setEnabled={setIsAutoDistribute} id="auto-distribute-toggle" />
                    <label htmlFor="auto-distribute-toggle" className="text-sm text-slate-300 cursor-pointer">Auto-Verteilung</label>
                </div>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="secondary" onClick={handleReset}>Zurücksetzen</Button>
                    <button type="submit" className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold px-5 py-2 rounded-lg shadow-md hover:opacity-90 transition-opacity"><Plus className="h-5 w-5" />Gruppe erfassen</button>
                </div>
             </div>
              <AnimatePresence>
                {isGroupCategoryPickerOpen && (
                    <MoreCategoriesModal
                        isOpen={isGroupCategoryPickerOpen}
                        onClose={() => setIsGroupCategoryPickerOpen(false)}
                        onSelectCategory={(catId) => {
                            setDefaultCategoryId(catId);
                            addRecent(catId);
                            setIsGroupCategoryPickerOpen(false);
                        }}
                    />
                )}
            </AnimatePresence>
        </form>
    );
};


export const QuickAddForm: FC = () => {
    const [activeView, setActiveView] = useState<'single' | 'group'>('single');
    
    const formAnimation = {
        initial: { opacity: 0, y: -10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 10 },
        transition: { duration: 0.2 }
    };

    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                 <div className="flex bg-slate-800 p-1 rounded-full mb-4 self-start">
                    <button onClick={() => setActiveView('single')} className={clsx('px-4 py-1.5 text-sm font-semibold rounded-full transition-colors w-1/2', activeView === 'single' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50')}>
                        Einzeln
                    </button>
                    <button onClick={() => setActiveView('group')} className={clsx('px-4 py-1.5 text-sm font-semibold rounded-full transition-colors w-1/2', activeView === 'group' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50')}>
                        Gruppe
                    </button>
                </div>
                <AnimatePresence mode="wait">
                    <motion.div key={activeView} {...formAnimation}>
                        {activeView === 'single' ? <SingleQuickAdd /> : <GroupQuickAddForm />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
    );
};