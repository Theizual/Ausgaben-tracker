

import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Repeat, BarChart2, Tags } from '@/shared/ui';

// Responsive MainTabs Component
export const MainTabs: React.FC<{ 
    activeTab: string; 
    setActiveTab: (tab: 'dashboard' | 'transactions' | 'statistics' | 'tags') => void;
}> = ({ activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'dashboard', label: 'Übersicht', icon: LayoutGrid },
        { id: 'transactions', label: 'Transaktionen', icon: Repeat },
        { id: 'statistics', label: 'Statistiken', icon: BarChart2 },
        { id: 'tags', label: 'Tags', icon: Tags },
    ];
    
    return (
        <nav>
            {/* Mobile Tabs */}
            <div className="md:hidden">
                <div className="flex justify-around items-center h-14">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`relative flex flex-1 flex-col items-center justify-center gap-1 h-full transition-colors ${
                                activeTab === tab.id ? 'text-rose-400' : 'text-slate-400 hover:text-white'
                            }`}
                            title={tab.label}
                        >
                            <tab.icon className="h-6 w-6" />
                            <span className="text-xs font-medium">{tab.label}</span>
                             {activeTab === tab.id && (
                                <motion.div layoutId="active-mobile-tab" className="absolute bottom-0 h-1 w-8 bg-rose-400 rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Desktop Tabs */}
            <div className="hidden md:flex pb-3 items-center space-x-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`relative flex items-center justify-center rounded-lg text-sm font-medium transition-all gap-2 p-3 px-4 py-2
                            ${
                                activeTab === tab.id
                                    ? 'text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`
                        }
                        title={tab.label}
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="active-desktop-tab"
                                className="absolute inset-0 bg-gradient-to-r from-rose-500 to-red-600 rounded-lg shadow-lg"
                            />
                        )}
                        <tab.icon className="relative z-10 h-5 w-5" />
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
};
