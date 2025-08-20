import React from 'react';
import { IconPicker } from '@/features/settings/components/IconPicker';

export const IconPickerModal = ({ isOpen, onClose, onSelect } : {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (iconName: string) => void;
}) => {
    if (!isOpen) return null;
    return <IconPicker onClose={onClose} onSelect={onSelect} />;
};
