

import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { Sheet, Wallet, Info, ChevronRight, ToggleSwitch, Trash2, Button } from '@/shared/ui';
import { APP_VERSION } from '@/constants';

const MotionDiv = motion.div;

const MANAGER_LIST_ITEM_CLASSES = "w-full text-left bg-slate-700/50 hover:bg-slate-700 p-4 rounded-lg transition-colors flex justify-between items-center";

export const GeneralSettings: FC<{
    onOpenTagManager: () => void;
    onOpenCategoryLibrary: () => void;
}> = ({ onOpenTagManager, onOpenCategoryLibrary }) => {
    const { isAutoSyncEnabled, setIsAutoSyncEnabled, openChangelog, resetAppData } = useApp();

    return (
        <MotionDiv key="general" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            <h3 className="text-lg font-semibold text-white mb-1">Allgemeine Einstellungen</h3>
            <p className="text-sm text-slate-400 mb-6">Verwalten Sie hier die Kerneinstellungen der Anwendung.</p>
            
            <div className="space-y-8">
                <div>
                    <h4 className="text-md font-semibold mb-3 text-white flex items-center gap-2"><Sheet className="h-5 w-5 text-green-400" /> Google Sheets Sync</h4>
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700/50">
                        <div>
                            <label htmlFor="auto-sync-toggle" className="block text-sm font-medium text-slate-300">Automatische Hintergrund-Synchronisierung</label>
                            <p className="text-xs text-slate-400 mt-1">Speichert Änderungen nach kurzer Inaktivität automatisch.</p>
                        </div>
                        <ToggleSwitch id="auto-sync-toggle" enabled={isAutoSyncEnabled} setEnabled={setIsAutoSyncEnabled} />
                    </div>
                </div>

                <div>
                    <h4 className="text-md font-semibold mb-3 text-white flex items-center gap-2"><Wallet className="h-5 w-5 text-purple-400" /> Datenverwaltung</h4>
                    <div className="pt-4 mt-4 border-t border-slate-700/50 space-y-3">
                        <button onClick={onOpenTagManager} className={MANAGER_LIST_ITEM_CLASSES}>
                            <div><span className="font-semibold text-white">Tag-Verwaltung</span><p className="text-xs text-slate-400 mt-1">Bestehende Tags umbenennen oder löschen.</p></div>
                            <ChevronRight className="h-5 w-5 text-slate-400" />
                        </button>
                        <button onClick={onOpenCategoryLibrary} className={MANAGER_LIST_ITEM_CLASSES}>
                            <div><span className="font-semibold text-white">Kategorien-Bibliothek</span><p className="text-xs text-slate-400 mt-1">Vordefinierte Kategorien zum Setup hinzufügen oder anpassen.</p></div>
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
