import React, { FC, useState, useEffect, useMemo } from 'react';
import { Modal, Button, getIconComponent, ToggleSwitch } from '@/shared/ui';
import type { Category, RecurringTransaction } from '@/shared/types';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/shared/utils/dateUtils';
import { toast } from 'react-hot-toast';
import { calculateNextDates } from '../lib/recurring-date-helpers';

interface RecurringConfigModalProps {
    data: {
        recurring: RecurringTransaction;
        category: Category;
    };
    onClose: () => void;
    onSave: (recurring: RecurringTransaction) => void;
}

const BASE_INPUT_CLASSES = "w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500";

const frequencyOptions: { value: RecurringTransaction['frequency'], label: string }[] = [
    { value: 'monthly', label: 'Monatlich' },
    { value: 'bimonthly', label: 'Alle 2 Monate' },
    { value: 'quarterly', label: 'Vierteljährlich' },
    { value: 'semiannually', label: 'Halbjährlich' },
    { value: 'yearly', label: 'Jährlich' },
];

export const RecurringConfigModal: FC<RecurringConfigModalProps> = ({ data, onClose, onSave }) => {
    const { recurring, category } = data;
    const [formState, setFormState] = useState(recurring);

    useEffect(() => {
        setFormState(recurring);
    }, [recurring]);

    const handleSave = () => {
        if (!formState.startDate) {
            toast.error("Ein Startdatum ist erforderlich.");
            return;
        }
        if (formState.endDate && parseISO(formState.endDate) < parseISO(formState.startDate)) {
            toast.error("Das Enddatum darf nicht vor dem Startdatum liegen.");
            return;
        }
        onSave(formState);
    };
    
    const handleInputChange = (field: keyof RecurringTransaction, value: string | number | boolean) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    const nextDates = useMemo(() => calculateNextDates(formState, 3), [formState]);
    
    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
            <Button onClick={handleSave}>Speichern</Button>
        </div>
    );
    
    const Icon = getIconComponent(category.icon);

    return (
        <Modal isOpen={true} onClose={onClose} title="Fixkosten planen" footer={footer} size="lg">
            <div className="flex items-center gap-3 mb-6 p-3 -m-3 bg-slate-800/50 rounded-t-lg">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: category.color }}>
                    <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">{category.name}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="rec-amount" className="block text-sm font-medium text-slate-300 mb-1">Betrag</label>
                    <input type="number" id="rec-amount" value={formState.amount} onChange={e => handleInputChange('amount', Number(e.target.value))} className={BASE_INPUT_CLASSES} />
                </div>
                <div>
                    <label htmlFor="rec-frequency" className="block text-sm font-medium text-slate-300 mb-1">Intervall</label>
                    <select id="rec-frequency" value={formState.frequency} onChange={e => handleInputChange('frequency', e.target.value)} className={BASE_INPUT_CLASSES}>
                        {frequencyOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="rec-day" className="block text-sm font-medium text-slate-300 mb-1">Stichtag (Tag im Monat)</label>
                    <input type="number" id="rec-day" value={formState.dayOfMonth || ''} onChange={e => handleInputChange('dayOfMonth', Number(e.target.value))} min="1" max="31" placeholder="z.B. 1 oder 15" className={BASE_INPUT_CLASSES} />
                </div>
                 <div className="flex items-end">
                    <div className="w-full">
                        <label htmlFor="rec-active" className="block text-sm font-medium text-slate-300 mb-1">Automatisch buchen</label>
                         <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg h-[42px]">
                            <p className="text-sm text-slate-300">Aktiviert</p>
                            <ToggleSwitch enabled={formState.active ?? true} setEnabled={val => handleInputChange('active', val)} id="rec-active" />
                        </div>
                    </div>
                </div>
                <div>
                    <label htmlFor="rec-start" className="block text-sm font-medium text-slate-300 mb-1">Startdatum</label>
                    <input type="date" id="rec-start" value={format(parseISO(formState.startDate), 'yyyy-MM-dd')} onChange={e => handleInputChange('startDate', e.target.value)} className={BASE_INPUT_CLASSES} />
                </div>
                <div>
                    <label htmlFor="rec-end" className="block text-sm font-medium text-slate-300 mb-1">Enddatum (optional)</label>
                    <input type="date" id="rec-end" value={formState.endDate ? format(parseISO(formState.endDate), 'yyyy-MM-dd') : ''} onChange={e => handleInputChange('endDate', e.target.value)} className={BASE_INPUT_CLASSES} />
                </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-700">
                <h4 className="text-sm font-semibold text-white mb-2">Vorschau der nächsten Buchungen</h4>
                <div className="space-y-1 text-sm text-slate-400">
                    {nextDates.map((date, i) => (
                        <p key={i}>{format(date, 'EEEE, dd. MMMM yyyy')}</p>
                    ))}
                    {nextDates.length === 0 && <p className="italic">Keine zukünftigen Buchungen geplant.</p>}
                </div>
            </div>
        </Modal>
    );
};
