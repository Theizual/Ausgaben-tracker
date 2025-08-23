import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useTaxonomyContext, useUserContext } from '@/contexts/AppContext';
import type { SettingsTab, Group } from '@/shared/types';
import { Settings, X, LayoutGrid, Target, SlidersHorizontal, Users, Tag } from '@/shared/ui';
import { GeneralSettings } from './components/GeneralSettings';
import { UserSettings } from './components/UserSettings';
import { BudgetSettings } from './components/BudgetSettings';
import { CategoryLibrarySettings } from './components/CategoryLibrarySettings';
import { TagSettings } from './components/TagSettings';
import { GroupDesignModal } from './components/GroupDesignModal';
import { modalBackdropAnimation, modalContentAnimation } from '@/shared/lib/animations';

const TABS: { id: SettingsTab; label: string; icon: React.FC<any>; }[] = [
    { id: 'general', label: 'Allgemein', icon: SlidersHorizontal }, 
    { id: 'categories', label: 'Gruppen & Kategorien', icon: LayoutGrid },
    { id: 'tags', label: 'Tags', icon: Tag },
    { id: 'budget', label: 'Budget', icon: Target }, 
    { id: 'users', label: 'Benutzer', icon: Users },
];

const SettingsModal = ({ isOpen, onClose, initialTab }: { isOpen: boolean; onClose: () => void; initialTab?: SettingsTab; }) => {
    const { updateGroup, renameGroup } = useTaxonomyContext();
    const { updateGroupColor, currentUserId } = useUserContext();
    const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'general');
    const [editingGroupDesign, setEditingGroupDesign] = useState<Group | null>(null);
    const navRef = useRef<HTMLElement>(null);
    const [isNavCompact, setIsNavCompact] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const nav = navRef.current;
        if (!nav) return;

        const observer = new ResizeObserver(entries => {
            const navWidth = entries[0]?.contentRect.width;
            if (navWidth) {
                const isRow = getComputedStyle(nav).flexDirection === 'row';
                // Threshold based on approximate width of all tabs with labels.
                setIsNavCompact(isRow && navWidth < 550);
            }
        });
        observer.observe(nav);
        return () => observer.disconnect();
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    const handleSaveGroupDesign = useCallback((design: { name: string; color: string; icon: string }, changeColorForAll: boolean) => {
        if (!editingGroupDesign) return;

        const { name, color, icon } = design;
        const oldGroup = editingGroupDesign;

        if (name !== oldGroup.name) {
            renameGroup(oldGroup.id, name);
        }

        if (changeColorForAll) {
            // Update the global group color
            if (color !== oldGroup.color) {
                updateGroup(oldGroup.id, { color });
            }
             // Reset user override if it exists, to ensure global color is shown
            if (currentUserId) {
                updateGroupColor(currentUserId, name, ''); // Pass empty string or similar to signify reset
            }
        } else if (currentUserId) {
            // Update user-specific color override
            updateGroupColor(currentUserId, name, color);
        }
        
        if (icon !== oldGroup.icon) {
            updateGroup(oldGroup.id, { icon });
        }
        
        toast.success(`Gruppe "${name}" aktualisiert.`);
        setEditingGroupDesign(null);

    }, [editingGroupDesign, renameGroup, updateGroup, updateGroupColor, currentUserId]);


    const renderContent = () => {
        switch (activeTab) {
            case 'general': return <GeneralSettings />;
            case 'categories': return <CategoryLibrarySettings onEditGroupDesign={setEditingGroupDesign} />;
            case 'tags': return <TagSettings />;
            case 'budget': return <BudgetSettings />;
            case 'users': return <UserSettings />;
            default: return null;
        }
    };

    if (!isOpen) return <AnimatePresence />;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-40 p-4"
                        {...modalBackdropAnimation}
                        onClick={onClose}
                    >
                        <motion.div
                            className="bg-slate-800 rounded-2xl w-full max-w-5xl h-full max-h-[90vh] shadow-2xl border border-slate-700 flex flex-col md:flex-row overflow-hidden"
                            onClick={e => e.stopPropagation()}
                            {...modalContentAnimation}
                        >
                            <aside className="flex-shrink-0 bg-slate-900/50 md:w-56 border-b md:border-b-0 md:border-r border-slate-700">
                                <header className="p-4 border-b border-slate-700 hidden md:flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-slate-400" />
                                    <h2 className="text-lg font-bold text-white">Einstellungen</h2>
                                </header>
                                <nav ref={navRef} className="p-2 flex flex-row md:flex-col md:space-y-1 overflow-x-auto md:overflow-x-visible">
                                    {TABS.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`relative w-full text-left flex items-center gap-3 p-3 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap ${
                                                activeTab === tab.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                            }`}
                                        >
                                            <tab.icon className="h-5 w-5 flex-shrink-0" />
                                            {!isNavCompact && tab.label}
                                        </button>
                                    ))}
                                </nav>
                            </aside>
                            <main className="flex-grow p-6 overflow-y-auto custom-scrollbar relative">
                                <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-700 transition-colors md:hidden z-10" aria-label="Einstellungen schließen">
                                    <X className="h-5 w-5" />
                                </button>
                                <AnimatePresence mode="wait">
                                    {renderContent()}
                                </AnimatePresence>
                            </main>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {editingGroupDesign && (
                    <GroupDesignModal
                        group={editingGroupDesign}
                        onClose={() => setEditingGroupDesign(null)}
                        onSave={handleSaveGroupDesign}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default SettingsModal;