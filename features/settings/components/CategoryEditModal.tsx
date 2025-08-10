
import React, { useState, useMemo, useEffect, FC, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import { Modal, Button, getIconComponent, ChevronDown, Trash2, ColorPickerIcon } from '@/shared/ui';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { IconPicker } from './IconPicker';

const BASE_INPUT_CLASSES = "w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500";

export type CategoryFormData = {
    id: string;
    name: string;
    icon: string;
    groupId: string;
    color: string;
    budget?: number;
};

export const CategoryEditModal: FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    categoryData: CategoryFormData | null; 
    onSave: (data: CategoryFormData) => void; 
    onDelete?: (category: CategoryFormData) => void;
}> = ({ isOpen, onClose, categoryData, onSave, onDelete }) => {
    const { groups } = useApp();
    const [formData, setFormData] = useState(categoryData);
    const [isIconPickerOpen, setIconPickerOpen] = useState(false);
    const colorInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setFormData(categoryData); }, [categoryData]);
    useEscapeKey(() => { if (isIconPickerOpen) setIconPickerOpen(false); else onClose(); });

    const handleSave = () => {
        if (!formData || !formData.name.trim()) {
            toast.error("Der Kategoriename darf nicht leer sein.");
            return;
        }
        onSave(formData);
    };

    const handleDeleteClick = () => {
        if (formData && onDelete) {
            onDelete(formData);
        }
    };

    const handleColorPickerClick = () => {
        colorInputRef.current?.click();
    };
    
    const footer = (
         <div className={`flex items-center w-full ${onDelete ? 'justify-between' : 'justify-end'}`}>
            {onDelete && (
                <Button variant="destructive-ghost" onClick={handleDeleteClick}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Löschen
                </Button>
            )}
            <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
                <Button onClick={handleSave}>Speichern</Button>
            </div>
        </div>
    );

    if (!formData) {
        return null;
    }

    const IconComponent = getIconComponent(formData.icon);

    return (
        <>
            <Modal 
                isOpen={isOpen} 
                onClose={onClose} 
                title="Kategorie bearbeiten" 
                size="md" 
                footer={footer}
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-[auto,1fr,auto] items-end gap-4">
                        <button onClick={() => setIconPickerOpen(true)} className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity" style={{ backgroundColor: formData.color }}>
                            <IconComponent className="h-8 w-8 text-white" />
                        </button>
                        <div className="w-full">
                            <label htmlFor="cat-name" className="text-xs text-slate-400">Name</label>
                            <input id="cat-name" type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={BASE_INPUT_CLASSES} />
                        </div>
                        <div className="flex flex-col items-center">
                            <label htmlFor="cat-color-btn" className="block text-xs text-slate-400 text-center mb-2">Farbe</label>
                            <div className="relative flex items-center justify-center w-10 h-10">
                                <ColorPickerIcon
                                    id="cat-color-btn"
                                    size={20}
                                    onClick={handleColorPickerClick}
                                />
                                <input
                                    ref={colorInputRef}
                                    type="color"
                                    value={formData.color}
                                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                                    className="absolute w-0 h-0 opacity-0 pointer-events-none"
                                    tabIndex={-1}
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="cat-group" className="text-xs text-slate-400">Gruppe</label>
                        <div className="relative">
                            <select id="cat-group" value={formData.groupId} onChange={e => setFormData({ ...formData, groupId: e.target.value })} className={`${BASE_INPUT_CLASSES} appearance-none pr-10`}>
                                {groups.map(g => <option key={g.id} value={g.id} className="bg-slate-800 text-white">{g.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </Modal>
            <AnimatePresence>
            {isIconPickerOpen && <IconPicker onClose={() => setIconPickerOpen(false)} onSelect={(iconName) => { if(formData) { setFormData({ ...formData, icon: iconName }); } setIconPickerOpen(false); }} />}
            </AnimatePresence>
        </>
    );
};
