






import React, { useState } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import { Button, Plus, Trash2, getIconComponent } from '@/shared/ui';
import { DEFAULT_GROUP_ID, FIXED_COSTS_GROUP_ID, DEFAULT_GROUP_COLOR } from '@/constants';

const MotionDiv = motion.div;

export const GroupSettings = () => {
    const { 
        groups, visibleCategoryGroups, updateVisibleGroups, currentUserId, updateGroupColor,
        renameGroup, addGroup, deleteGroup 
    } = useApp();

    const [newGroupName, setNewGroupName] = useState('');
    const [editingGroup, setEditingGroup] = useState<string | null>(null);
    const [groupNameValue, setGroupNameValue] = useState('');

    const handleToggleGroupVisibility = (groupName: string) => {
        if (!currentUserId) return;
        const newVisible = visibleCategoryGroups.includes(groupName)
            ? visibleCategoryGroups.filter(g => g !== groupName)
            : [...visibleCategoryGroups, groupName];
        updateVisibleGroups(currentUserId, newVisible);
    };

    const handleColorChange = (groupName: string, color: string) => {
        if (!currentUserId) return;
        updateGroupColor(currentUserId, groupName, color);
    };
    
    const handleRenameGroup = (id: string) => {
        if (!id || !groupNameValue.trim()) {
            setEditingGroup(null);
            return;
        }
        renameGroup(id, groupNameValue.trim());
        setEditingGroup(null);
    };

    const handleAddGroup = () => {
        if (newGroupName.trim()) {
            addGroup(newGroupName.trim());
            setNewGroupName('');
        }
    };
    
    const handleDeleteGroup = (group: { id: string, name: string }) => {
        if (group.id === DEFAULT_GROUP_ID || group.id === FIXED_COSTS_GROUP_ID) {
            toast.error(`Die Gruppe "${group.name}" kann nicht gelöscht werden.`);
            return;
        }
        if (window.confirm(`Gruppe "${group.name}" wirklich löschen? Zugehörige Kategorien werden in "Sonstiges" verschoben.`)) {
            deleteGroup(group.id);
        }
    };

    const settingsAnimationVariants = {
        initial: { opacity: 0, x: 10 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -10 }
    };

    return (
        <MotionDiv variants={settingsAnimationVariants} initial="initial" animate="animate" exit="exit">
            <h3 className="text-lg font-semibold text-white mb-1">Gruppen verwalten</h3>
            <p className="text-sm text-slate-400 mb-6">
                Erstellen, bearbeiten und löschen Sie Kategoriegruppen. Passen Sie außerdem die Farbe und Sichtbarkeit für jeden Benutzer individuell an.
            </p>

            <div className="flex gap-3 mb-6">
                <input 
                    type="text" 
                    value={newGroupName} 
                    onChange={e => setNewGroupName(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                    placeholder="Neue Gruppe hinzufügen" 
                    className="w-full max-w-xs bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500" 
                />
                <Button onClick={handleAddGroup}><Plus className="h-4 w-4"/> Erstellen</Button>
            </div>

            <div className="space-y-3">
                {groups.map(group => {
                    const GroupIcon = getIconComponent(group.icon);
                    const color = group.color || DEFAULT_GROUP_COLOR;
                    const isProtected = group.id === DEFAULT_GROUP_ID || group.id === FIXED_COSTS_GROUP_ID;

                    return (
                        <div key={group.id} className="bg-slate-700/50 p-3 rounded-lg hover:bg-slate-700/30 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-grow min-w-0">
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => handleColorChange(group.name, e.target.value)}
                                        className="w-10 h-10 p-0 border-none rounded-md bg-transparent cursor-pointer flex-shrink-0"
                                        title={`Farbe für Gruppe "${group.name}" ändern`}
                                    />
                                    <div className="flex-grow min-w-0">
                                        {editingGroup === group.id ? (
                                            <input 
                                                type="text" 
                                                value={groupNameValue} 
                                                onChange={(e) => setGroupNameValue(e.target.value)} 
                                                onBlur={() => handleRenameGroup(group.id)} 
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRenameGroup(group.id); } if (e.key === 'Escape') { e.preventDefault(); setEditingGroup(null); }}} 
                                                className="font-medium text-white bg-slate-600/50 rounded px-2 py-1 w-full focus:ring-2 focus:ring-rose-500 focus:outline-none" 
                                                autoFocus 
                                            />
                                        ) : (
                                            <button 
                                                onClick={() => { if (!isProtected) { setEditingGroup(group.id); setGroupNameValue(group.name); }}}
                                                className="w-full text-left flex items-center gap-2"
                                                disabled={isProtected}
                                                title={isProtected ? "Diese Gruppe kann nicht umbenannt werden" : "Gruppenname bearbeiten"}
                                            >
                                                <GroupIcon className="h-5 w-5 flex-shrink-0" style={{ color }} />
                                                <span className="font-medium text-white truncate">{group.name}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                                     <div className="flex items-center gap-2" title={`Sichtbarkeit für Gruppe "${group.name}" umschalten`}>
                                        <span className="text-xs text-slate-400 hidden sm:inline">Sichtbar</span>
                                        <input
                                            type="checkbox"
                                            checked={visibleCategoryGroups.includes(group.name)}
                                            onChange={() => handleToggleGroupVisibility(group.name)}
                                            className="w-5 h-5 rounded text-rose-500 bg-slate-600 border-slate-500 focus:ring-rose-500 shrink-0 cursor-pointer"
                                        />
                                    </div>
                                    {!isProtected && (
                                        <Button
                                            variant="destructive-ghost"
                                            size="icon-auto"
                                            onClick={() => handleDeleteGroup(group)}
                                            title="Gruppe löschen"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </MotionDiv>
    );
};