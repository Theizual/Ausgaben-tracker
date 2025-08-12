import React, { FC, useState, useMemo, useRef } from 'react';
import { Modal, Button, getIconComponent, DesignPicker } from '@/shared/ui';
import { DEFAULT_GROUP_COLOR } from '@/constants';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import type { Group } from '@/shared/types';

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
    onSave: (design: { color: string; icon: string }) => void;
}

export const GroupDesignModal: FC<GroupDesignModalProps> = ({ group, onClose, onSave }) => {
    const [design, setDesign] = useState({
        color: group.color || DEFAULT_GROUP_COLOR,
        icon: group.icon || 'Package'
    });

    useEscapeKey(onClose);

    const handleSave = () => {
        onSave(design);
    };

    const footer = (
        <div className="flex justify-between items-center w-full">
            <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
            <Button variant="primary" onClick={handleSave}>Übernehmen</Button>
        </div>
    );
    
    const Icon = getIconComponent(design.icon);

    return (
        <Modal isOpen={true} onClose={onClose} title="" size="3xl" footer={footer}>
             <div 
                className="relative p-4 rounded-t-lg -m-6 mb-6"
                style={{ backgroundColor: hexToRgba(design.color, 0.15) }}
            >
                <div className="flex items-center gap-4">
                    <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-transparent border-2"
                        style={{ borderColor: design.color }}
                    >
                        <Icon className="h-6 w-6" style={{ color: design.color }}/>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Gruppe anpassen</p>
                        <h2 className="text-xl font-bold text-white">{group.name}</h2>
                    </div>
                </div>
            </div>
            <DesignPicker value={design} onChange={setDesign} />
        </Modal>
    );
};