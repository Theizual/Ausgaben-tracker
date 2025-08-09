

import React, { FC, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { Button, Plus, Trash2 } from '@/shared/ui';

const MotionDiv = motion.div;

const BASE_INPUT_CLASSES = "w-full bg-theme-input border border-theme-border rounded-md px-3 py-2 text-white placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-ring";
const TRANSPARENT_INPUT_CLASSES = "bg-transparent font-medium text-white w-full focus:outline-none focus:bg-slate-600/50 rounded px-2 py-1";

export const UserSettings: FC = () => {
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
        <MotionDiv key="users" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            <h3 className="text-lg font-semibold text-white mb-1">Benutzer verwalten</h3>
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
        </MotionDiv>
    );
};
