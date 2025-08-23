import React from 'react';
import { motion } from 'framer-motion';
import { useSyncContext, useUIContext, useUserContext } from '@/contexts/AppContext';
import { Info, ToggleSwitch, Trash2, Button, DownloadCloud, Sparkles, ChefHat } from '@/shared/ui';
import { APP_VERSION } from '@/constants';
import { settingsContentAnimation } from '@/shared/lib/animations';

export const GeneralSettings = () => {
    const { 
        isAutoSyncEnabled, setIsAutoSyncEnabled, resetAppData, loadFromSheet,
    } = useSyncContext();
    const { openChangelog } = useUIContext();
    const {
        isAiEnabled, setIsAiEnabled, isMealPlanEnabled, setIsMealPlanEnabled,
    } = useUserContext();

    return (
        <motion.div 
            key="general"
            variants={settingsContentAnimation}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col h-full"
        >
            <div className="flex-grow">
                <h3 className="text-lg font-semibold text-white mb-1">Allgemeine Einstellungen</h3>
                <p className="text-sm text-slate-400 mb-6">Verwalten Sie hier die Kerneinstellungen der Anwendung.</p>
                
                <div className="space-y-6">
                    {/* Sync Container */}
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                        <h4 className="text-md font-semibold text-white flex items-center gap-2 mb-3"><DownloadCloud className="h-5 w-5 text-green-400" /> Google Sheets Sync</h4>
                        <div className="space-y-3 pt-3 border-t border-slate-700/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label htmlFor="auto-sync-toggle" className="block text-sm font-medium text-slate-300">Automatische Hintergrund-Synchronisierung</label>
                                    <p className="text-xs text-slate-400 mt-1">Speichert Änderungen nach kurzer Inaktivität automatisch.</p>
                                </div>
                                <ToggleSwitch id="auto-sync-toggle" enabled={isAutoSyncEnabled} setEnabled={setIsAutoSyncEnabled} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="block text-sm font-medium text-slate-300">Vom Server neu laden</p>
                                    <p className="text-xs text-slate-400 mt-1">Überschreibt lokale Daten mit dem Stand aus Google Sheets.</p>
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
                    </div>

                    {/* AI Container */}
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                        <h4 className="text-md font-semibold text-white flex items-center gap-2 mb-3"><Sparkles className="h-5 w-5 text-purple-400" /> KI-Funktionen</h4>
                        <div className="pt-3 border-t border-slate-700/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label htmlFor="ai-features-toggle" className="block text-sm font-medium text-slate-300">KI-Belegscanner aktivieren</label>
                                    <p className="text-xs text-slate-400 mt-1">Ermöglicht das Scannen von Belegen per Kamera oder Bildupload.</p>
                                </div>
                                <ToggleSwitch id="ai-features-toggle" enabled={isAiEnabled} setEnabled={setIsAiEnabled} />
                            </div>
                        </div>
                    </div>

                    {/* Meal Plan Container */}
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                        <h4 className="text-md font-semibold text-white flex items-center gap-2 mb-3"><ChefHat className="h-5 w-5 text-green-400" /> Essensplanung</h4>
                        <div className="pt-3 border-t border-slate-700/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label htmlFor="meal-plan-toggle" className="block text-sm font-medium text-slate-300">Essensplaner-Modul aktivieren</label>
                                    <p className="text-xs text-slate-400 mt-1">Zeigt den Tab "Essensplanung" in der Hauptnavigation an.</p>
                                </div>
                                <ToggleSwitch id="meal-plan-toggle" enabled={isMealPlanEnabled} setEnabled={setIsMealPlanEnabled} />
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone Container */}
                    <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/30">
                        <h4 className="text-md font-semibold text-red-400 flex items-center gap-2 mb-3"><Trash2 className="h-5 w-5" /> Gefahrenzone</h4>
                        <div className="pt-3 border-t border-red-500/40">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h5 className="font-bold text-white">Anwendungsdaten zurücksetzen</h5>
                                    <p className="text-xs text-slate-400 mt-1">Löscht alle lokalen Daten für den aktuellen Modus. Dies kann nicht rückgängig gemacht werden.</p>
                                </div>
                                <Button variant="destructive" onClick={resetAppData}>
                                    <Trash2 className="h-4 w-4" /> Daten löschen
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* App Info Footer */}
            <div className="mt-8 pt-4 border-t border-slate-700 flex justify-between items-center text-sm flex-shrink-0">
                <div className="flex items-center gap-2 text-slate-400">
                    <Info className="h-4 w-4" />
                    <span>App-Version</span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={openChangelog} className="text-slate-400 hover:text-white transition-colors">
                        (Changelog)
                    </button>
                    <span className="font-mono text-slate-500 bg-slate-700/50 px-2 py-1 rounded-md">{APP_VERSION}</span>
                </div>
            </div>
        </motion.div>
    );
};