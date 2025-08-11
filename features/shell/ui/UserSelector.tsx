
import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { CheckCircle2, Settings, User, Users, UserAvatar } from '@/shared/ui';

// User Selector Component
export const UserSelector: React.FC = () => {
    const { users, currentUser, setCurrentUserId, openSettings } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleManageUsers = () => {
        setIsOpen(false);
        openSettings('users');
    };

    const handleOpenGeneralSettings = () => {
        setIsOpen(false);
        openSettings('general');
    };

    if (users.length === 0) {
        return (
            <button onClick={handleManageUsers} className="hidden sm:flex items-center gap-2 text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md font-semibold text-slate-300">
                <User className="h-4 w-4"/>Benutzer hinzufügen
            </button>
        )
    }

    if (!currentUser) return null;

    return (
        <div className="relative" ref={wrapperRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-700 transition-colors">
                <UserAvatar name={currentUser.name} color={currentUser.color} size={24} />
                <span className="hidden sm:inline font-semibold text-sm text-slate-200">{currentUser.name}</span>
            </button>
            <AnimatePresence>
                {isOpen && (
                     <motion.div 
                        initial={{ opacity: 0, y: -5, scale: 0.95 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute z-40 top-full mt-2 right-0 w-60 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2"
                    >
                         <p className="px-4 py-1 text-xs text-slate-400 font-semibold uppercase">Benutzer wechseln</p>
                        {users.map(user => (
                            <button
                                key={user.id}
                                onClick={() => {
                                    setCurrentUserId(user.id);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50"
                            >
                                <UserAvatar name={user.name} color={user.color} size={24} />
                                <span className="font-medium text-white flex-1">{user.name}</span>
                                {currentUser.id === user.id && <CheckCircle2 className="h-5 w-5 text-rose-400" />}
                            </button>
                        ))}
                         <div className="border-t border-slate-700 my-2"></div>
                         <button onClick={handleManageUsers} className="w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50 text-slate-300">
                            <Users className="h-5 w-5"/>
                            <span className="font-medium">Benutzer verwalten</span>
                        </button>
                         <button onClick={handleOpenGeneralSettings} className="w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50 text-slate-300">
                            <Settings className="h-5 w-5"/>
                            <span className="font-medium">Einstellungen</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
