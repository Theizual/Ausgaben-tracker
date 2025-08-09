
import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../../contexts/AppContext';

export const DisplaySettings: FC = () => {
    const { categoryGroups, visibleCategoryGroups, updateVisibleGroups, currentUserId, groupColors, updateGroupColor } = useApp();

    const handleToggleGroup = (groupName: string) => {
        if (!currentUserId) return;
        const newVisible = visibleCategoryGroups.includes(groupName)
            ? visibleCategoryGroups.filter(g => g !== groupName)
            : [...visibleCategoryGroups, groupName];
        updateVisibleGroups(currentUserId, newVisible);
    };

    const handleColorChange = (groupName: string, color: string) => {
        if (!currentUserId) return;
        updateGroupColor(currentUserId, groupName, color);
    }

    const DEFAULT_GROUP_COLOR = '#a855f7'; // A default fallback color

    return (
        <motion.div key="display" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            <h3 className="text-lg font-semibold text-white mb-1">Anzeige anpassen</h3>
            <p className="text-sm text-slate-400 mb-6">
                Passen Sie das Erscheinungsbild der App an. Wählen Sie aus, welche Kategoriegruppen sichtbar sein sollen und weisen Sie jeder Gruppe eine eindeutige Farbe zu.
            </p>
            <div className="space-y-3">
                {categoryGroups.map(group => (
                    <div key={group} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg hover:bg-slate-700/30 transition-colors">
                        <div className="flex items-center gap-4">
                            <input
                                type="color"
                                value={groupColors[group] || DEFAULT_GROUP_COLOR}
                                onChange={(e) => handleColorChange(group, e.target.value)}
                                className="w-10 h-10 p-0 border-none rounded-md bg-transparent cursor-pointer flex-shrink-0"
                                title={`Farbe für Gruppe "${group}" ändern`}
                            />
                            <span className="font-medium text-white">{group}</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={visibleCategoryGroups.includes(group)}
                            onChange={() => handleToggleGroup(group)}
                            className="w-5 h-5 rounded text-rose-500 bg-slate-600 border-slate-500 focus:ring-rose-500 shrink-0"
                            title={`Sichtbarkeit für Gruppe "${group}" umschalten`}
                        />
                    </div>
                ))}
            </div>
        </motion.div>
    );
};
