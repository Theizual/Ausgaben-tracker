
import React, { useState, useMemo, useCallback, useEffect, FC, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../../contexts/AppContext';
import type { SettingsTab } from '../../types';
import { Settings, X, LayoutGrid, Target, SlidersHorizontal, Repeat, History, Users, ChevronLeft, ChevronRight } from '../../components/ui';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { GeneralSettings } from './components/GeneralSettings';
import { UserSettings } from './components/UserSettings';
import { BudgetSettings } from './components/BudgetSettings';
import { DisplaySettings } from './components/DisplaySettings';
import { TagManagerModal } from './components/TagManagerModal';
import { CategoryLibraryModal } from './components/CategoryLibraryModal';


const ANIMATION_CONFIG = {
    MODAL_SPRING: { type: 'spring' as const, bounce: 0.2, duration: 0.4 },
    CONTENT_FADE: { duration: 0.2 },
};

const TABS: { id: SettingsTab; label: string; icon: FC<any>; }[] = [
    { id: 'general', label: 'Allgemein', icon: SlidersHorizontal }, 
    { id: 'budget', label: 'Budget', icon: Target }, 
    { id: 'display', label: 'Anzeige', icon: LayoutGrid },
    { id: 'users', label: 'Benutzer', icon: Users },
];

const SettingsModal: FC<{ isOpen: boolean; onClose: () => void; initialTab?: SettingsTab; }> = ({ isOpen, onClose, initialTab }) => {
    const {
        allAvailableTags, handleUpdateTag, handleDeleteTag,
        categoryGroups, visibleCategoryGroups, updateVisibleGroups, currentUserId, groupColors, updateGroupColor
    } = useApp();

    const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'general');
    const [isTagManagerOpen, setTagManagerOpen] = useState(false);
    const [isCategoryLibraryOpen, setCategoryLibraryOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab || 'general');
        }
    }, [isOpen, initialTab]);

    const handleEscape = useCallback(() => {
        if (isCategoryLibraryOpen) setCategoryLibraryOpen(false);
        else if (isTagManagerOpen) setTagManagerOpen(false);
        else onClose();
    }, [isCategoryLibraryOpen, isTagManagerOpen, onClose]);
    
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') handleEscape();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleEscape]);

    const renderContent = () => {
        switch (activeTab) {
            case 'general': return <GeneralSettings onOpenTagManager={() => setTagManagerOpen(true)} onOpenCategoryLibrary={() => setCategoryLibraryOpen(true)} />;
            case 'budget': return <BudgetSettings />;
            case 'display': return <DisplaySettings />;
            case 'users': return <UserSettings />;
            default: return null;
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <motion.div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50" 
                onClick={onClose} 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
            >
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0.95, opacity: 0 }} 
                    transition={ANIMATION_CONFIG.MODAL_SPRING}
                    className="bg-slate-800/80 backdrop-blur-md rounded-xl w-full max-w-4xl shadow-2xl border border-slate-700 flex flex-col h-[90vh] md:h-[85vh]" 
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex flex-col md:flex-row flex-1 min-h-0">
                        {/* Spalte 1: Navigation */}
                        <aside className="w-full md:w-56 flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-700">
                           <div className="p-4 hidden md:block">
                             <h2 className="text-lg font-bold text-white">Einstellungen</h2>
                           </div>
                            <nav className="flex flex-row md:flex-col p-2 md:p-4 space-x-1 md:space-x-0 md:space-y-1 overflow-x-auto custom-scrollbar">
                                {TABS.map(tab => {
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button 
                                            key={tab.id} 
                                            onClick={() => setActiveTab(tab.id)} 
                                            className={`flex items-center gap-3 md:w-full text-left p-3 rounded-lg text-sm font-semibold transition-colors flex-shrink-0 ${
                                                isActive 
                                                ? 'bg-rose-500/20 text-rose-300' 
                                                : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                            }`}
                                        >
                                            <tab.icon className="h-5 w-5"/>
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </aside>

                        {/* Spalte 2: Inhalt */}
                        <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                            <AnimatePresence mode="wait">
                                {renderContent()}
                            </AnimatePresence>
                        </main>
                    </div>
                </motion.div>
            </motion.div>

            <AnimatePresence>
                {isTagManagerOpen && (
                    <TagManagerModal 
                        isOpen={isTagManagerOpen} 
                        onClose={() => setTagManagerOpen(false)} 
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                 {isCategoryLibraryOpen && (
                    <CategoryLibraryModal 
                        isOpen={isCategoryLibraryOpen} 
                        onClose={() => setCategoryLibraryOpen(false)} 
                    />
                 )}
            </AnimatePresence>
        </>
    );
};

export default SettingsModal;
