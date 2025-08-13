import React, { FC, useState, useEffect } from 'react';
import { Modal, Button, getIconComponent, DesignPicker, X, Edit, ToggleSwitch } from '@/shared/ui';
import { DEFAULT_GROUP_COLOR } from '@/constants';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import type { Group } from '@/shared/types';
import { toast } from 'react-hot-toast';
import useLocalStorage from '@/shared/hooks/useLocalStorage';

const INLINE_INPUT_CLASSES = "font-bold text-white bg-white/10 rounded px-2 py-1 w-full focus:ring-2 focus:ring-rose-500 focus:outline-none";

const hexToRgba = (hex: string, alpha: number) => {
    let r = 0, g = 0, b = 0;
    if (!hex) hex = '#64748b';
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface GroupDesignModalProps {
    group: Group;
    onClose: () => void;
    onSave: (design: { name: string; color: string; icon: string }, changeColorForAll: boolean) => void;
}

export const GroupDesignModal: FC<GroupDesignModalProps> = ({ group, onClose, onSave }) => {
    const [design, setDesign] = useState({
        name: group.name,
        color: group.color || DEFAULT_GROUP_COLOR,
        icon: group.icon || 'Package'
    });
    const [isNameEditing, setIsNameEditing] = useState(false);
    const [changeColorForAll, setChangeColorForAll] = useLocalStorage('settings-changeColorForAll', true);

    useEffect(() => {
        setDesign({
            name: group.name,
            color: group.color || DEFAULT_GROUP_COLOR,
            icon: group.icon || 'Package'
        });
    }, [group]);

    useEscapeKey(() => {
        if(isNameEditing) setIsNameEditing(false);
        else onClose();
    });

    const handleSave = () => {
        if (!design.name.trim()) {
            toast.error("Gruppenname darf nicht leer sein.");
            return;
        }
        onSave(design, changeColorForAll);
    };
    
    const handleNameUpdate = () => {
        if(design.name.trim() === '') {
            setDesign(d => ({...d, name: group.name}));
        }
        setIsNameEditing(false);
    };

    const handleDesignChange = (newDesign: { color: string; icon: string; }) => {
        setDesign(prev => ({...prev, ...newDesign}));
    };

    const footer = (
        <div 
            className="p-3 flex justify-end items-center w-full transition-colors gap-3"
            style={{ backgroundColor: hexToRgba(design.color, 0.2) }}
        >
            <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
            <Button variant="primary" onClick={handleSave}>Übernehmen</Button>
        </div>
    );
    
    const Icon = getIconComponent(design.icon);

    return (
        <Modal isOpen={true} onClose={onClose} title="" size="3xl" footer={footer} padding="p-0" footerClassName="p-0">
             <header 
                className="relative p-3 flex items-center gap-4 transition-colors"
                style={{ backgroundColor: hexToRgba(design.color, 0.15) }}
            >
                <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-transparent border-2"
                    style={{ borderColor: design.color }}
                >
                    <Icon className="h-6 w-6" style={{ color: design.color }}/>
                </div>
                <div className="flex-grow min-w-0">
                    <p className="text-xs text-slate-400">Gruppe anpassen</p>
                    {isNameEditing ? (
                         <input type="text" value={design.name} onChange={e => setDesign(d => ({ ...d, name: e.target.value }))} onBlur={handleNameUpdate} onKeyDown={(e) => {if(e.key === 'Enter') handleNameUpdate(); if(e.key === 'Escape') {setDesign(d => ({...d, name: group.name})); setIsNameEditing(false);}}} className={`text-xl ${INLINE_INPUT_CLASSES}`} autoFocus />
                    ) : (
                        <div className="flex items-center gap-2 group" onClick={() => setIsNameEditing(true)}>
                            <h2 className="text-xl font-bold text-white truncate">{design.name}</h2>
                            <Edit className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-black/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
                    aria-label="Schließen"
                >
                    <X className="h-5 w-5" />
                </button>
            </header>

            <div className="p-6">
                <div className="p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <label htmlFor="color-override-toggle" className="block text-sm font-medium text-slate-300">Farbe für alle Benutzer ändern</label>
                            <p className="text-xs text-slate-400 mt-1">Wenn deaktiviert, gilt die Farbe nur für dich.</p>
                        </div>
                        <ToggleSwitch id="color-override-toggle" enabled={changeColorForAll} setEnabled={setChangeColorForAll} />
                    </div>
                    <DesignPicker value={design} onChange={handleDesignChange} />
                </div>
            </div>
        </Modal>
    );
};