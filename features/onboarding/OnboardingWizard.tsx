import React, { useState, FC, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { apiGet } from '@/shared/lib/http';
import { toast } from 'react-hot-toast';
import { Button, Logo, UserAvatar, CheckCircle2, Loader2, getIconComponent, ToggleSwitch } from '@/shared/ui';
import type { User } from '@/shared/types';

// --- LAYOUT & PROGRESS ---

const OnboardingLayout: FC<{ step: number, totalSteps: number, title: string, subtitle: string, children: React.ReactNode }> = 
({ step, totalSteps, title, subtitle, children }) => (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 text-center">
        <div className="w-full max-w-lg">
            <Logo className="mx-auto" />
            <div className="relative h-1 w-full max-w-xs mx-auto bg-slate-700 rounded-full my-8">
                <motion.div 
                    className="absolute top-0 left-0 h-full bg-rose-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(step / totalSteps) * 100}%`}}
                />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
            <p className="text-slate-400 mb-8">{subtitle}</p>
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 text-left">
                {children}
            </div>
        </div>
    </div>
);


// --- STEP 1: WELCOME ---

const WelcomeStep: FC<{ onNext: () => void; onExisting: () => Promise<void>; }> = ({ onNext, onExisting }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleExistingClick = async () => {
        setIsLoading(true);
        await onExisting();
        setIsLoading(false);
    };

    return (
        <div className="space-y-4">
            <p className="text-slate-300">
                Wähle eine Option, um fortzufahren. Wenn du die App bereits auf einem anderen Gerät eingerichtet hast, können wir deine Daten importieren.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button onClick={handleExistingClick} disabled={isLoading} variant="secondary" className="w-full justify-center">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Ich habe bereits ein Konto'}
                </Button>
                <Button onClick={onNext} className="w-full justify-center">
                    Neu hier? Jetzt starten
                </Button>
            </div>
        </div>
    );
};


// --- STEP 2: CREATE USER ---

const CreateUserStep: FC<{ onComplete: (name: string, color: string, showDemo: boolean) => void; onBack: () => void; }> = ({ onComplete, onBack }) => {
    const [name, setName] = useState('');
    const [showDemo, setShowDemo] = useState(true);
    const colors = ['#3b82f6', '#ec4899', '#10b981', '#f97316', '#8b5cf6', '#d946ef'];
    const [selectedColor, setSelectedColor] = useState(colors[Math.floor(Math.random() * colors.length)]);

    const handleContinue = () => {
        const trimmedName = name.trim();
        if (trimmedName.length < 2 || trimmedName.length > 40) {
            toast.error('Der Name muss zwischen 2 und 40 Zeichen lang sein.');
            return;
        }
        onComplete(trimmedName, selectedColor, showDemo);
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <UserAvatar name={name || '?'} color={selectedColor} size={64} className="mx-auto" />
                <div className="flex justify-center gap-3 pt-4">
                    {colors.map(color => (
                        <button key={color} onClick={() => setSelectedColor(color)} className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white' : ''}`} style={{ backgroundColor: color }} aria-label={`Farbe ${color} wählen`} />
                    ))}
                </div>
            </div>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Dein Name" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500" autoFocus />
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div>
                    <label htmlFor="show-demo-toggle" className="block text-sm font-medium text-slate-300">Demodaten anzeigen?</label>
                    <p className="text-xs text-slate-400 mt-1">Kann jederzeit in den Einstellungen geändert werden.</p>
                </div>
                <ToggleSwitch id="show-demo-toggle" enabled={showDemo} setEnabled={setShowDemo} />
            </div>
            <div className="flex justify-between items-center pt-4">
                <Button onClick={onBack} variant="secondary">Zurück</Button>
                <Button onClick={handleContinue}>Weiter</Button>
            </div>
        </div>
    );
};


// --- STEP 3: REVIEW CATEGORIES ---

const ReviewCategoriesStep: FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const { groups, categories } = useApp();

    const groupData = useMemo(() => {
        const groupMap = new Map(groups.map(g => [g.id, { ...g, categories: [] as any[] }]));
        categories.forEach(cat => {
            if(groupMap.has(cat.groupId)) {
                groupMap.get(cat.groupId)?.categories.push(cat);
            }
        });
        return Array.from(groupMap.values()).filter(g => g.categories.length > 0);
    }, [groups, categories]);

    return (
        <div className="space-y-4">
            <p className="text-slate-300">
                Wir haben ein Standard-Set an Gruppen und Kategorien für dich vorbereitet. Du kannst diese später jederzeit in den Einstellungen anpassen.
            </p>
            <div className="max-h-60 overflow-y-auto custom-scrollbar -mr-3 pr-3 space-y-3">
                {groupData.map(group => {
                    const GroupIcon = getIconComponent(group.icon);
                    return (
                        <div key={group.id}>
                            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-300 mb-2">
                                <GroupIcon className="h-4 w-4" style={{ color: group.color }} />
                                {group.name}
                            </h4>
                            <div className="flex flex-wrap gap-2 pl-6">
                                {group.categories.map(cat => (
                                    <div key={cat.id} className="flex items-center gap-1.5 px-2 py-1 bg-slate-700/50 rounded-full text-xs text-slate-300">
                                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: cat.color}} />
                                        {cat.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
            <div className="text-right pt-4">
                <Button onClick={onComplete}>Einrichtung abschließen</Button>
            </div>
        </div>
    );
};

// --- CONFIRMATION SCREEN ---

const ConfirmationScreen: FC<{ name: string }> = ({ name }) => (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
        >
            <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white">Willkommen, {name}!</h1>
            <p className="text-slate-400 mt-2">Deine Einrichtung ist abgeschlossen. Die App wird jetzt gestartet.</p>
        </motion.div>
    </div>
);


// --- MAIN WIZARD ---

export const OnboardingWizard = () => {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [userName, setUserName] = useState('');
    const { openUserMergeModal, addUser, setCurrentUserId, setShowDemoData, setIsInitialSetupDone, syncData } = useApp();
    const totalSteps = 3;

    const handleExisting = async () => {
        try {
            const { users: remoteUsers }: { users?: User[] } = await apiGet('/api/sheets/read?ranges=Users!A2:Z');
            const liveRemoteUsers = remoteUsers?.filter(u => !u.isDeleted) || [];
            
            if (liveRemoteUsers.length > 0) {
                openUserMergeModal(liveRemoteUsers);
            } else {
                toast('Keine vorhandenen Benutzer gefunden. Bitte lege einen neuen an.', { icon: 'ℹ️' });
                setStep(2);
            }
        } catch (error: any) {
            toast.error(`Fehler beim Abrufen der Benutzer: ${error.message}`);
        }
    };

    const handleCreateUser = (name: string, color: string, showDemo: boolean) => {
        setUserName(name);
        addUser(name, color);
        setCurrentUserId(addUser(name, color).id);
        setShowDemoData(showDemo);
        setStep(3);
    };
    
    const handleFinish = async () => {
        setIsLoading(true);
        // The user is already created locally. Now we finish the setup and sync.
        setTimeout(async () => {
            setIsInitialSetupDone(true);
            await syncData();
        }, 2000); // Show confirmation for 2 seconds
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return <OnboardingLayout step={1} totalSteps={totalSteps} title="Willkommen beim Ausgaben-Tracker!" subtitle="Lass uns alles für dich einrichten.">
                    <WelcomeStep onNext={() => setStep(2)} onExisting={handleExisting} />
                </OnboardingLayout>;
            case 2:
                return <OnboardingLayout step={2} totalSteps={totalSteps} title="Erstelle dein Benutzerkonto" subtitle="Dein Name wird verwendet, um Ausgaben zuzuordnen.">
                    <CreateUserStep onComplete={handleCreateUser} onBack={() => setStep(1)} />
                </OnboardingLayout>;
            case 3:
                return <OnboardingLayout step={3} totalSteps={totalSteps} title="Kategorien-Vorschau" subtitle="Hier ist ein empfohlener Startpunkt für deine Ausgaben.">
                    <ReviewCategoriesStep onComplete={handleFinish} />
                </OnboardingLayout>;
            default:
                return null;
        }
    };

    return isLoading ? <ConfirmationScreen name={userName} /> : <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>;
};