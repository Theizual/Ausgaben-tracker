











import React from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { FileText, Wallet, Info, ChevronRight, ToggleSwitch, Trash2, Button, DownloadCloud, Eye } from '@/shared/ui';
import { APP_VERSION } from '@/constants';

const MotionDiv = motion.div;

const MANAGER_LIST_ITEM_CLASSES = "w-full text-left bg-slate-700/50 hover:bg-slate-700 p-4 rounded-lg transition-colors flex justify-between items-center";

export const GeneralSettings = ({ onOpenTagManager }: {
    onOpenTagManager: () => void;
}) => {
    const { 
        isAutoSyncEnabled, setIsAutoSyncEnabled, openChangelog, resetAppData, loadFromSheet,
        quickAddHideGroups, setQuickAddHideGroups,
    } = useApp();

    const settingsAnimationVariants = {
        initial: { opacity: 0, x: 10 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -10 }
    };

    return (
        <MotionDiv variants={settingsAnimationVariants} initial="initial" animate="animate" exit="exit" key="general">
            <h3 className="text-lg font-semibold text-white mb-1">Allgemeine Einstellungen</h3>
            <p className="text-sm text-slate-400 mb-6">Verwalten Sie hier die Kerneinstellungen der Anwendung.</p>
            
            <div className="space-y-8">
                <div>
                    <h4 className="text-md font-semibold mb-3 text-white flex items-center gap-2"><FileText className="h-5 w-5 text-green-400" /> Google Sheets Sync</h4>
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700/50">
                        <div>
                            <label htmlFor="auto-sync-toggle" className="block text-sm font-medium text-slate-300">Automatische Hintergrund-Synchronisierung</label>
                            <p className="text-xs text-slate-400 mt-1">Speichert Änderungen nach kurzer Inaktivität automatisch.</p>
                        </div>
                        <ToggleSwitch id="auto-sync-toggle" enabled={isAutoSyncEnabled} setEnabled={setIsAutoSyncEnabled} />
                    </div>
                     <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700/50">
                        <div>
                            <p className="block text-sm font-medium text-slate-300">Vom Server neu laden</p>
                            <p className="text-xs text-slate-400 mt-1">Überschreibt lokale Daten mit dem Stand aus Google Sheets. Nützlich bei Synchronisierungsproblemen.</p>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                if (window.confirm("Sind Sie sicher? Alle nicht synchronisierten lokalen Änderungen gehen verloren. Dies kann nicht rückgängig gemacht werden.")) {
                                    loadFromSheet();
                                }
                            }}
                        >
                            <DownloadCloud className="h-4 w-4" />
                            Neu laden
                        </Button>
                    </div>
                </div>

                <div>
                    <h4 className="text-md font-semibold mb-3 text-white flex items-center gap-2"><Eye className="h-5 w-5 text-sky-400" /> Anzeige</h4>
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700/50">
                        <div>
                            <label htmlFor="hide-groups-toggle" className="block text-sm font-medium text-slate-300">Gruppen in "Schnell hinzufügen" ausblenden</label>
                            <p className="text-xs text-slate-400 mt-1">Zeigt standardmäßig nur Favoriten und zuletzt verwendete Kategorien an.</p>
                        </div>
                        <ToggleSwitch id="hide-groups-toggle" enabled={quickAddHideGroups} setEnabled={setQuickAddHideGroups} />
                    </div>
                </div>

                <div>
                    <h4 className="text-md font-semibold mb-3 text-white flex items-center gap-2"><Wallet className="h-5 w-5 text-purple-400" /> Datenverwaltung</h4>
                    <div className="pt-4 mt-4 border-t border-slate-700/50 space-y-3">
                        <button onClick={onOpenTagManager} className={MANAGER_LIST_ITEM_CLASSES}>
                            <div><span className="font-semibold text-white">Tag-Verwaltung</span><p className="text-xs text-slate-400 mt-1">Bestehende Tags umbenennen oder löschen.</p></div>
                            <ChevronRight className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                <div>
                    <h4 className="text-md font-semibold mb-3 text-white flex items-center gap-2"><Info className="h-5 w-5 text-sky-400" /> App Informationen</h4>
                    <div className="pt-4 mt-4 border-t border-slate-700/50 space-y-3">
                        <button onClick={openChangelog} className={MANAGER_LIST_ITEM_CLASSES}>
                            <div><span className="font-semibold text-white">Was ist neu? (Changelog)</span><p className="text-xs text-slate-400 mt-1">Änderungen und neue Funktionen der letzten Versionen anzeigen.</p></div>
                            <ChevronRight className="h-5 w-5 text-slate-400" />
                        </button>
                        <div className="flex justify-between items-center text-sm px-1">
                            <span className="text-slate-400">App-Version</span>
                            <span className="font-mono text-slate-500 bg-slate-700/50 px-2 py-1 rounded-md">{APP_VERSION}</span>
                        </div>
                    </div>
                </div>

                 <div>
                    <h4 className="text-md font-semibold mb-3 text-red-400 flex items-center gap-2">Gefahrenzone</h4>
                    <div className="pt-4 mt-4 border-t border-slate-700/50 space-y-3 bg-red-900/20 border-red-500/30 border p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                            <div>
                                <h5 className="font-bold text-white">Anwendungsdaten zurücksetzen</h5>
                                <p className="text-xs text-slate-400 mt-1">Löscht alle lokalen Daten (Transaktionen, Benutzer etc.) für den aktuellen Modus. Dies kann nicht rückgängig gemacht werden.</p>
                            </div>
                            <Button variant="destructive" onClick={resetAppData}>
                                <Trash2 className="h-4 w-4" /> Daten löschen
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </MotionDiv>
    );
};
