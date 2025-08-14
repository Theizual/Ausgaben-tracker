import React from 'react';
import { Modal, Button } from '@/shared/ui';
import { IconPicker } from '@/features/settings/components/IconPicker';

export const IconPickerModal = ({ isOpen, onClose, onSelect } : {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (iconName: string) => void;
}) => {
    const footer = (
        <div className="flex justify-end w-full">
            <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Icon auswählen" size="2xl" footer={footer}>
            <IconPicker onSelect={onSelect} onClose={onClose} />
        </Modal>
    );
};