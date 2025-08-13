import React, { useState, useEffect, useMemo, FC } from 'react';
import { toast } from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import { Modal, Button, getIconComponent, ChevronDown, Trash2, DesignPicker, ToggleSwitch, Edit, X } from '@/shared/ui';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import type { CategoryFormData } from './CategoryLibrarySettings';
import useLocalStorage from '@/shared/hooks/useLocalStorage';

const BASE_INPUT_CLASSES = "w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500";
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

export const CategoryEditModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    categoryData: CategoryFormData | null;
    onSave: (data: CategoryFormData, changeColorForAll: boolean) => void;
    onDelete?: (category: CategoryFormData) => void;
}> = ({ isOpen, onClose, categoryData, onSave, onDelete }) => {
    const { groups } = useApp();
    const [formData, setFormData] = useState(categoryData);
    const [isNameEditing, setIsNameEditing] = useState(false);
    const [changeColorForAll, setChangeColorForAll] = useLocalStorage('settings-changeColorForAll', true);
    const isNewCategory = useMemo(() => categoryData?.id.startsWith('new_') ?? false, [categoryData]);

    useEffect(() => {
        setFormData(categoryData);
        if (isNewCategory) {
            setIsNameEditing(true);
        }
    }, [categoryData, isNewCategory]);

    useEscapeKey(() => {
        if (isNameEditing) setIsNameEditing(false);
        else onClose();
    });

    const handleSave = () => {
        if (!formData || !formData.name.trim()) {
            toast.error("Der Kategoriename darf nicht leer sein.");
            return;
        }
        onSave(formData, changeColorForAll);
    };

    const handleDeleteClick = () => {
        if (formData && onDelete) {
            onDelete(formData);
        }
    };

    const handleDesignChange = (newDesign: { color: string, icon: string }) => {
        if (formData) {
            setFormData({ ...formData, ...newDesign });
        }
    };
    
    const handleNameUpdate = () => {
        if(formData && formData.name.trim() === '') {
            setFormData(d => d ? {...d, name: categoryData?.name || ''} : null);
        }
        setIsNameEditing(false);
    };

    const footer = (
         <div 
            className="p-3 flex items-center w-full transition-colors" 
            style={{ backgroundColor: hexToRgba(formData?.color || '#64748b', 0.2) }}
        >
            <div className={`flex-grow ${onDelete ? 'visible' : 'invisible'}`}>
                 <Button variant="destructive-ghost" onClick={handleDeleteClick}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Löschen
                </Button>
            </div>
            <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
                <Button variant="primary" onClick={handleSave}>Speichern</Button>
            </div>
        </div>
    );

    if (!formData) {
        return null;
    }

    const IconComponent = getIconComponent(formData.icon);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title=""
            size="3xl"
            footer={footer}
            padding="p-0"
            footerClassName="p-0"
        >
            <header
                className="relative p-3 flex items-center gap-4 transition-colors"
                style={{ backgroundColor: hexToRgba(formData.color, 0.15) }}
            >
                <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-transparent border-2"
                    style={{ borderColor: formData.color }}
                >
                    <IconComponent className="h-6 w-6" style={{ color: formData.color }}/>
                </div>
                <div className="flex-grow min-w-0">
                    <p className="text-xs text-slate-400">Kategorie bearbeiten</p>
                    {isNameEditing ? (
                        <input id="cat-name-inline" type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} onBlur={handleNameUpdate} onKeyDown={(e) => {if(e.key === 'Enter') handleNameUpdate(); if(e.key === 'Escape') { setFormData(categoryData); setIsNameEditing(false);}}} className={`text-xl ${INLINE_INPUT_CLASSES}`} autoFocus />
                    ) : (
                         <div className="flex items-center gap-2 group" onClick={() => setIsNameEditing(true)}>
                            <h2 className="text-xl font-bold text-white truncate">{formData.name || 'Neue Kategorie'}</h2>
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
            
            <div className="p-6 space-y-4">
                 <div>
                    <label htmlFor="cat-group" className="block text-sm font-medium text-slate-300 mb-1">Gruppe</label>
                    <div className="relative">
                        <select id="cat-group" value={formData.groupId} onChange={e => setFormData({ ...formData, groupId: e.target.value })} className={`${BASE_INPUT_CLASSES} appearance-none pr-10`}>
                            {groups.map(g => <option key={g.id} value={g.id} className="bg-slate-800 text-white">{g.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                <div className="p-3 bg-slate-700/30 rounded-lg">
                    {!isNewCategory && (
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <label htmlFor="color-override-toggle" className="block text-sm font-medium text-slate-300">Farbe für alle Benutzer ändern</label>
                                <p className="text-xs text-slate-400 mt-1">Wenn deaktiviert, gilt die Farbe nur für dich.</p>
                            </div>
                            <ToggleSwitch id="color-override-toggle" enabled={changeColorForAll} setEnabled={setChangeColorForAll} />
                        </div>
                    )}

                    <DesignPicker
                        value={{ color: formData.color, icon: formData.icon }}
                        onChange={handleDesignChange}
                    />
                </div>
            </div>
        </Modal>
    );
};