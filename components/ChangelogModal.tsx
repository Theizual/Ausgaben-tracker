
import React, { FC, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Gift } from './Icons';
import { APP_VERSION, CHANGELOG } from '../constants';

const MotionDiv = motion('div');
const MotionSpan = motion('span');

const ToggleSwitch: React.FC<{
    enabled: boolean;
    setEnabled: (enabled: boolean) => void;
    id?: string;
}> = ({ enabled, setEnabled, id }) => {
    return (
        <button
            type="button"
            id={id}
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-rose-500 ${enabled ? 'bg-rose-600' : 'bg-slate-600'}`}
        >
            <span className="sr-only">Toggle</span>
            <MotionSpan
                layout
                transition={{ type: 'spring', stiffness: 700, damping: 30 }}
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
            />
        </button>
    );
};

interface ChangelogModalProps {
    onClose: () => void;
    isAutoShowEnabled: boolean;
    onToggleAutoShow: () => void;
}

const ChangelogModal: FC<ChangelogModalProps> = ({ onClose, isAutoShowEnabled, onToggleAutoShow }) => {

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <MotionDiv
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <MotionDiv
                className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            >
                <header className="relative p-6 text-center border-b border-slate-700 flex-shrink-0">
                    <div className="absolute top-4 right-4">
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="inline-flex items-center justify-center p-3 bg-rose-500/20 text-rose-400 rounded-full mb-3">
                         <Gift className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Was ist neu in Version {APP_VERSION}?</h2>
                    <p className="text-slate-400 mt-1">Hier sind die neuesten Änderungen und Verbesserungen.</p>
                </header>
                <main className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {CHANGELOG.map(log => (
                        <div key={log.version}>
                            <h3 className="text-lg font-semibold text-white">
                                Version {log.version}
                                <span className="text-sm font-normal text-slate-500 ml-2">{log.date}</span>
                            </h3>
                            <p className="text-rose-300/80 font-medium mb-3">{log.title}</p>
                            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
                                {log.changes.map((change, index) => (
                                    <li key={index}>{change}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </main>
                <footer className="p-6 border-t border-slate-700 flex-shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <label htmlFor="autoshow-changelog" className="text-sm text-slate-400">Changelog bei Updates automatisch anzeigen</label>
                        <ToggleSwitch enabled={isAutoShowEnabled} setEnabled={() => onToggleAutoShow()} id="autoshow-changelog" />
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
                    >
                        Verstanden
                    </button>
                </footer>
            </MotionDiv>
        </MotionDiv>
    );
};

export default ChangelogModal;
