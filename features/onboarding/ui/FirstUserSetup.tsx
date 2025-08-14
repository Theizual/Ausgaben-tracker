import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button, UserAvatar, Logo } from '@/shared/ui';
import { toast } from 'react-hot-toast';

export const FirstUserSetup = () => {
    const { addUser, setCurrentUserId, setIsInitialSetupDone, syncData } = useApp();
    const [name, setName] = useState('');
    
    const colors = ['#3b82f6', '#ec4899', '#10b981', '#f97316', '#8b5cf6', '#d946ef'];
    const [selectedColor, setSelectedColor] = useState(colors[Math.floor(Math.random() * colors.length)]);

    const handleCreateUser = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            toast.error('Bitte gib einen Namen ein.');
            return;
        }

        try {
            toast.loading('Benutzer wird erstellt...', { id: 'first-user-toast' });

            const newUser = addUser(trimmedName, selectedColor);
            setCurrentUserId(newUser.id);
            setIsInitialSetupDone(true);
            
            setTimeout(async () => {
                await syncData();
                toast.success(`Willkommen, ${trimmedName}!`, { id: 'first-user-toast' });
            }, 100);

        } catch (e: any) {
            toast.error(e.message, { id: 'first-user-toast' });
        }
    };
    
    return (
        <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-sm text-center">
                <Logo />
                <h1 className="text-2xl font-bold text-white mt-8 mb-2">Willkommen!</h1>
                <p className="text-slate-400 mb-8">Bitte lege deinen ersten Benutzer an, um zu starten.</p>

                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
                    <UserAvatar name={name || '?'} color={selectedColor} size={64} className="mx-auto" />
                    
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Dein Name"
                        className="w-full text-center bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        onKeyDown={e => e.key === 'Enter' && handleCreateUser()}
                        autoFocus
                    />
                    
                    <div className="flex justify-center gap-3 pt-2">
                        {colors.map(color => (
                            <button
                                key={color}
                                onClick={() => setSelectedColor(color)}
                                className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white' : ''}`}
                                style={{ backgroundColor: color }}
                                aria-label={`Farbe ${color} wählen`}
                            />
                        ))}
                    </div>

                    <Button onClick={handleCreateUser} className="w-full mt-4">
                        Los geht's
                    </Button>
                </div>
            </div>
        </div>
    );
};
