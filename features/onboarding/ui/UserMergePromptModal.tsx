import React, { FC, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { User } from '@/shared/types';
import { Modal, Button, UserAvatar } from '@/shared/ui';
import { toast } from 'react-hot-toast';

interface UserMergePromptModalProps {
    isOpen: boolean;
    remoteUsers: User[];
    onClose: () => void;
}

export const UserMergePromptModal: FC<UserMergePromptModalProps> = ({ isOpen, remoteUsers, onClose }) => {
    const { 
        setCurrentUserId, 
        reassignUserForTransactions, 
        addUser,
        users: localUsers,
        setIsInitialSetupDone,
        deleteUser,
        loadFromSheet,
        syncData,
    } = useApp();

    const localDemoUser = localUsers.find(u => u.id === 'usr_demo');
    const [newUserName, setNewUserName] = useState(localDemoUser?.name !== 'Demo User' ? localDemoUser?.name || '' : '');

    const handleSelect = async (selectedUser: User) => {
        toast.loading('Benutzer wird zugeordnet...', { id: 'merge-toast' });
        
        // 1. Modify local state: reassign transactions, delete the demo user, and set the current user.
        reassignUserForTransactions('usr_demo', selectedUser.id, true);
        deleteUser('usr_demo', { silent: true });
        setCurrentUserId(selectedUser.id);
        
        // 2. Pull server data, but PRESERVE the local transaction changes we just made.
        await loadFromSheet({ preserveLocalTransactions: true });
        
        // 3. Mark setup as complete. This will NOT trigger another sync.
        setIsInitialSetupDone(true);
        
        // 4. Now do a final, regular sync to push the merged state to the server.
        await syncData();

        toast.success(`Willkommen zurück, ${selectedUser.name}!`, { id: 'merge-toast' });
        onClose();
    };
    
    const handleCreate = async () => {
        const trimmedName = newUserName.trim();
        if (!trimmedName) {
            toast.error('Bitte gib einen Namen ein.');
            return;
        }
        toast.loading('Neuer Benutzer wird angelegt...', { id: 'merge-toast' });
        
        try {
            // 1. Modify local state: add the new user, reassign transactions, delete demo, set current.
            const newUser = addUser(trimmedName);
            reassignUserForTransactions('usr_demo', newUser.id, true);
            deleteUser('usr_demo', { silent: true });
            setCurrentUserId(newUser.id);

            // 2. Pull server data, preserving local transactions AND the new user we just added.
            await loadFromSheet({ preserveLocalTransactions: true, preserveNewLocalUsers: true });
            
            // 3. Mark setup as complete.
            setIsInitialSetupDone(true);
            
            // 4. Final sync to push merged state (including the new user) to the server.
            await syncData();

            toast.success(`Benutzer "${trimmedName}" angelegt!`, { id: 'merge-toast' });
            onClose();

        } catch (e: any) {
             toast.error(e.message, { id: 'merge-toast' });
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Benutzerkonto zuordnen"
            size="md"
        >
            <div className="space-y-6">
                <div>
                    <p className="text-sm text-slate-300 mb-4">
                        Wir haben bestehende Benutzer in deinem Google Sheet gefunden. Welcher davon bist du?
                        Dadurch werden deine bisherigen lokalen Einträge diesem Benutzer zugeordnet.
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {remoteUsers.map(user => (
                            <div key={user.id} className="flex items-center gap-3 bg-slate-700/50 p-2 rounded-lg">
                                <UserAvatar name={user.name} color={user.color} size={32} />
                                <span className="font-medium text-white flex-1">{user.name}</span>
                                <Button size="sm" onClick={() => handleSelect(user)}>Das bin ich</Button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-600" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-slate-800 px-2 text-sm text-slate-400">Oder</span>
                    </div>
                </div>

                <div>
                    <p className="text-sm text-slate-300 mb-2">
                        Lege einen neuen Benutzer für dich an.
                    </p>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            placeholder="Dein Name"
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        <Button variant="secondary" onClick={handleCreate}>Anlegen</Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
