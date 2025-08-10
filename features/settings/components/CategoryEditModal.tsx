import React, { useState, useMemo, useEffect, FC } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import { Modal, Button, getIconComponent } from '@/shared/ui';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { IconPicker } from './IconPicker';

const BASE_INPUT_CLASSES = "w-full bg-theme-input border border-theme-border rounded-md px-3 py-2 text-white placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-ring";

export type CategoryFormData = {
    id: string;
    name: string;
    icon: string;
    groupId: string;
    color: string;
    budget?: number;
};

export const CategoryEditModal: FC<{ isOpen: boolean; onClose: () => void; categoryData: CategoryFormData | null; onSave: (data: CategoryFormData) => void; }> = ({ isOpen, onClose, categoryData, onSave }) => {
    const { groups } = useApp();
    const [formData, setFormData] = useState(categoryData);
    const [isIconPickerOpen, setIconPickerOpen] = useState(false);

    useEffect(() => { setFormData(categoryData); }, [categoryData]);
    useEscapeKey(() => { if (isIconPickerOpen) setIconPickerOpen(false); else onClose(); });

    const handleSave = () => {
        if (!formData || !formData.name.trim()) {
            toast.error("Der Kategoriename darf nicht leer sein.");
            return;
        }
        onSave(formData);
    };
    
    const footer = (
         <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
            <Button onClick={handleSave}>Speichern</Button>
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
                        <div>
                            <label htmlFor="cat-color" className="block text-xs text-slate-400 text-center mb-1">Farbe</label>
                            <input
                                id="cat-color"
                                type="color"
                                value={formData.color}
                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                className="w-10 h-10 p-0 border-none rounded-lg bg-transparent cursor-pointer"
                                title="Farbe ändern"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="cat-group" className="text-xs text-slate-400">Gruppe</label>
                        <select id="cat-group" value={formData.groupId} onChange={e => setFormData({ ...formData, groupId: e.target.value })} className={BASE_INPUT_CLASSES}>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                </div>
            </Modal>
            <AnimatePresence>
            {isIconPickerOpen && <IconPicker onClose={() => setIconPickerOpen(false)} onSelect={(iconName) => { if(formData) { setFormData({ ...formData, icon: iconName }); } setIconPickerOpen(false); }} />}
            </AnimatePresence>
        </>
    );
};