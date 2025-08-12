import React, { useState, useEffect, FC } from 'react';
import { toast } from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import { Modal, Button, getIconComponent, ChevronDown, Trash2, DesignPicker } from '@/shared/ui';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';

const BASE_INPUT_CLASSES = "w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500";

export type CategoryFormData = {
    id: string;
    name: string;
    icon: string;
    groupId: string;
    color: string;
    budget?: number;
};

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
    onSave: (data: CategoryFormData) => void; 
    onDelete?: (category: CategoryFormData) => void;
}> = ({ isOpen, onClose, categoryData, onSave, onDelete }) => {
    const { groups } = useApp();
    const [formData, setFormData] = useState(categoryData);

    useEffect(() => { setFormData(categoryData); }, [categoryData]);
    useEscapeKey(onClose);

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
    
    const handleDesignChange = (newDesign: { color: string, icon: string }) => {
        if (formData) {
            setFormData({ ...formData, ...newDesign });
        }
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
        >
            <div 
                className="relative p-4 rounded-t-lg -m-6 mb-6"
                style={{ backgroundColor: hexToRgba(formData.color, 0.15) }}
            >
                <div className="flex items-center gap-4">
                    <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: formData.color }}
                    >
                        <IconComponent className="h-6 w-6 text-white"/>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Kategorie bearbeiten</p>
                        <h2 className="text-xl font-bold text-white">{formData.name || 'Neue Kategorie'}</h2>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label htmlFor="cat-name" className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                    <input id="cat-name" type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={BASE_INPUT_CLASSES} />
                </div>
                <div>
                    <label htmlFor="cat-group" className="block text-sm font-medium text-slate-300 mb-1">Gruppe</label>
                    <div className="relative">
                        <select id="cat-group" value={formData.groupId} onChange={e => setFormData({ ...formData, groupId: e.target.value })} className={`${BASE_INPUT_CLASSES} appearance-none pr-10`}>
                            {groups.map(g => <option key={g.id} value={g.id} className="bg-slate-800 text-white">{g.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            <DesignPicker 
                value={{ color: formData.color, icon: formData.icon }}
                onChange={handleDesignChange}
            />
        </Modal>
    );
};
