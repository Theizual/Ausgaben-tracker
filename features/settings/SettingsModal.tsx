





import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion, MotionProps } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { SettingsTab } from '@/shared/types';
import { Settings, X, LayoutGrid, Target, SlidersHorizontal, Users, BookOpen } from '@/shared/ui';
import { GeneralSettings } from './components/GeneralSettings';
import { UserSettings } from './components/UserSettings';
import { BudgetSettings } from './components/BudgetSettings';
import { GroupSettings } from './components/GroupSettings';
import { TagManagerModal } from './components/TagManagerModal';
import { CategoryLibrarySettings } from './components/CategoryLibraryModal';

const ANIMATION_CONFIG = {
    MODAL_SPRING: { type: 'spring' as const, bounce: 0.2, duration: 0.4 },
    CONTENT_FADE: { duration: 0.2 },
};

const TABS: { id: SettingsTab; label: string; icon: React.FC<any>; }[] = [
    { id: 'general', label: 'Allgemein', icon: SlidersHorizontal }, 
    { id: 'categories', label: 'Kategorien', icon: BookOpen },
    { id: 'budget', label: 'Budget', icon: Target }, 
    { id: 'groups', label: 'Gruppen', icon: LayoutGrid },
    { id: 'users', label: 'Benutzer', icon: Users },
];

const SettingsModal = ({ isOpen, onClose, initialTab }: { isOpen: boolean; onClose: () => void; initialTab?: SettingsTab; }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'general');
    const [isTagManagerOpen, setTagManagerOpen] = useState(false);
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
                setIsNavCompact(isRow && navWidth < 450);
            }
        });
        
        observer.observe(nav);
        return () => observer.disconnect();
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab || 'general');
        }
    }, [isOpen, initialTab]);

    const handleEscape = useCallback(() => {
        if (isTagManagerOpen) setTagManagerOpen(false);
        else onClose();
    }, [isTagManagerOpen, onClose]);
    
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') handleEscape();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleEscape]);

    // Verhindert das Scrollen des Hintergrunds, wenn das Modal geöffnet ist
    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [isOpen]);


    const renderContent = () => {
        switch (activeTab) {
            case 'general': return <GeneralSettings onOpenTagManager={() => setTagManagerOpen(true)} />;
            case 'categories': return <CategoryLibrarySettings />;
            case 'budget': return <BudgetSettings />;
            case 'groups': return <GroupSettings />;
            case 'users': return <UserSettings />;
            default: return null;
        }
    };

    if (!isOpen) return null;

    const backdropAnimation: MotionProps = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
    };
    
    const modalAnimation: MotionProps = {
        initial: { scale: 0.95, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0.95, opacity: 0 },
        transition: ANIMATION_CONFIG.MODAL_SPRING,
    };

    return (
        <>
            <motion.div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" 
                onClick={onClose} 
                {...backdropAnimation}
            >
                <motion.div 
                    {...modalAnimation}
                    className="bg-slate-800/80 backdrop-blur-md rounded-xl w-full max-w-4xl shadow-2xl border border-slate-700 flex flex-col h-[90vh] md:h-[85vh]" 
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex flex-col md:flex-row flex-1 min-h-0">
                        {/* Spalte 1: Navigation */}
                        <aside className="w-full md:w-56 flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-700">
                           <div className="p-4 hidden md:block">
                             <h2 className="text-lg font-bold text-white">Einstellungen</h2>
                           </div>
                            <nav ref={navRef} className="flex flex-row md:flex-col p-2 md:p-4 md:space-y-1 justify-around md:justify-start">
                                {TABS.map(tab => {
                                    const isActive = activeTab === tab.id;
                                    const showLabel = isActive || !isNavCompact;
                                    return (
                                        <button 
                                            key={tab.id} 
                                            onClick={() => setActiveTab(tab.id)} 
                                            className={`flex items-center justify-center md:justify-start gap-3 md:w-full text-left p-3 rounded-lg text-sm font-semibold transition-colors ${
                                                isActive 
                                                ? 'bg-rose-500/20 text-rose-300' 
                                                : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                            }`}
                                            title={tab.label}
                                            aria-label={tab.label}
                                            aria-selected={isActive}
                                        >
                                            <tab.icon className="h-5 w-5 flex-shrink-0"/>
                                            <span className={showLabel ? 'inline' : 'hidden'}>{tab.label}</span>
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
        </>
    );
};

export default SettingsModal;