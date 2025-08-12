



import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { Button, Plus, Trash2, UserAvatar } from '@/shared/ui';

const MotionDiv = motion.div;

const BASE_INPUT_CLASSES = "w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500";
const TRANSPARENT_INPUT_CLASSES = "bg-transparent font-medium text-white w-full focus:outline-none focus:bg-slate-600/50 rounded px-2 py-1";

export const UserSettings = () => {
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

    const settingsAnimationVariants = {
        initial: { opacity: 0, x: 10 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -10 }
    };

    return (
        <MotionDiv variants={settingsAnimationVariants} initial="initial" animate="animate" exit="exit" key="users">
            <h3 className="text-lg font-semibold text-white mb-1">Benutzer verwalten</h3>
            <p className="text-sm text-slate-400 mb-6">Legen Sie Benutzer an, um Ausgaben zuzuordnen. Der aktuell ausgewählte Benutzer wird neuen Transaktionen automatisch zugewiesen.</p>
            <form onSubmit={handleAddUser} className="flex gap-3 mb-6">
                <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.currentTarget.value)} placeholder="Neuer Benutzername..." className={BASE_INPUT_CLASSES} />
                <Button type="submit" size="sm"><Plus className="h-4 w-4"/> Hinzufügen</Button>
            </form>
            <div className="space-y-3">
                {users.map(user => (
                    <div key={user.id} className="flex items-center gap-3 bg-slate-700/50 p-2 rounded-lg">
                        <div className="relative flex-shrink-0">
                             <button
                                type="button"
                                onClick={(e) => (e.currentTarget.nextElementSibling as HTMLElement)?.click()}
                                className="rounded-full transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-500 focus-visible:ring-offset-slate-800"
                                aria-label={`Farbe für ${user.name} ändern`}
                                title={`Farbe für ${user.name} ändern`}
                            >
                                <UserAvatar name={user.name} color={user.color} size={28} />
                            </button>
                            <input
                                type="color"
                                value={user.color}
                                onChange={(e) => updateUser(user.id, { color: e.currentTarget.value })}
                                className="absolute w-0 h-0 opacity-0 pointer-events-none"
                                tabIndex={-1}
                            />
                        </div>
                        <input type="text" defaultValue={user.name} onBlur={(e) => handleNameUpdate(user.id, e.currentTarget.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className={TRANSPARENT_INPUT_CLASSES} />
                        <Button variant="destructive-ghost" size="icon-auto" onClick={() => { if (window.confirm(`Benutzer "${user.name}" löschen?`)) deleteUser(user.id); }} aria-label={`Benutzer ${user.name} löschen`}><Trash2 className="h-5 w-5" /></Button>
                    </div>
                ))}
            </div>
        </MotionDiv>
    );
};
