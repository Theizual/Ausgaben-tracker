import React, { useState, FC, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import type { Group } from '@/shared/types';
import { Button, Plus, Trash2, getIconComponent, GripVertical } from '@/shared/ui';
import { DEFAULT_GROUP_ID, FIXED_COSTS_GROUP_ID, DEFAULT_GROUP_COLOR } from '@/constants';
import { GroupDesignModal } from './GroupDesignModal';
import { settingsContentAnimation } from '@/shared/lib/animations';

export const GroupSettings: FC<{ onEditGroupDesign: (group: Group) => void }> = ({ onEditGroupDesign }) => {
    const { 
        groups, renameGroup, addGroup, deleteGroup, reorderGroups 
    } = useApp();

    const [orderedGroups, setOrderedGroups] = useState<Group[]>([]);
    const [newGroupName, setNewGroupName] = useState('');
    const [editingGroup, setEditingGroup] = useState<string | null>(null);
    const [groupNameValue, setGroupNameValue] = useState('');

    useEffect(() => {
        setOrderedGroups(groups);
    }, [groups]);

    const handleReorder = (newOrder: Group[]) => {
        setOrderedGroups(newOrder);
        reorderGroups(newOrder);
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

    return (
        <motion.div variants={settingsContentAnimation} initial="initial" animate="animate" exit="exit" key="groups">
            <h3 className="text-lg font-semibold text-white mb-1">Gruppen verwalten</h3>
            <p className="text-sm text-slate-400 mb-6">
                Erstellen, bearbeiten und löschen Sie Kategoriegruppen. Passen Sie das Design an und ändern Sie die Reihenfolge per Drag & Drop.
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

            <Reorder.Group axis="y" values={orderedGroups} onReorder={handleReorder}>
                <div className="space-y-2">
                    {orderedGroups.map(group => {
                        const GroupIcon = getIconComponent(group.icon);
                        const color = group.color || DEFAULT_GROUP_COLOR;
                        const isProtected = group.id === DEFAULT_GROUP_ID || group.id === FIXED_COSTS_GROUP_ID;
                        
                        return (
                            <Reorder.Item
                                key={group.id}
                                value={group}
                                className="bg-slate-700/50 p-2 rounded-lg hover:bg-slate-700/30 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-grow min-w-0">
                                        <div className="text-slate-500 cursor-grab touch-none" onPointerDown={(e) => e.preventDefault()}>
                                            <GripVertical className="h-5 w-5" />
                                        </div>
                                        <button 
                                            onClick={() => onEditGroupDesign(group)}
                                            className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 bg-transparent border-2 hover:bg-slate-700/50 transition-colors"
                                            style={{ borderColor: color }}
                                            title="Design ändern"
                                        >
                                            <GroupIcon className="h-5 w-5" style={{ color: color }} />
                                        </button>
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
                                                    className="w-full text-left p-1 -m-1"
                                                    disabled={isProtected}
                                                    title={isProtected ? "Diese Gruppe kann nicht umbenannt werden" : "Gruppenname bearbeiten"}
                                                >
                                                    <span className="font-medium text-white truncate">{group.name}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
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
                            </Reorder.Item>
                        );
                    })}
                </div>
            </Reorder.Group>
        </motion.div>
    );
};