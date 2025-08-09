

import React, { FC } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Modal, Tag, Trash2, Button } from '@/shared/ui';

const TRANSPARENT_INPUT_CLASSES = "bg-transparent font-medium text-white w-full focus:outline-none focus:bg-slate-600/50 rounded px-2 py-1";

export const TagManagerModal: FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { allAvailableTags, handleUpdateTag, handleDeleteTag } = useApp();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tag-Verwaltung">
            <div className="space-y-3">
                {allAvailableTags.map(tag => (
                    <div key={tag.id} className="flex items-center gap-3 bg-slate-700/50 p-2 rounded-lg">
                        <Tag className="h-5 w-5 text-slate-400 shrink-0 ml-2" />
                        <input
                            type="text"
                            defaultValue={tag.name}
                            onBlur={(e) => handleUpdateTag(tag.id, e.currentTarget.value.trim())}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                            className={TRANSPARENT_INPUT_CLASSES}
                        />
                        <Button
                            variant="destructive-ghost"
                            size="icon-auto"
                            onClick={() => { if (window.confirm(`Tag "${tag.name}" löschen?`)) handleDeleteTag(tag.id); }}
                        >
                            <Trash2 className="h-5 w-5" />
                        </Button>
                    </div>
                ))}
            </div>
        </Modal>
    );
};
