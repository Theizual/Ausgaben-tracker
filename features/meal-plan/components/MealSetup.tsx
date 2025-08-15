import React, { useState, FC } from 'react';
import { MealPrefs } from '@/shared/types';
import { Button, Logo } from '@/shared/ui';
import { toast } from 'react-hot-toast';

interface MealSetupProps {
    onSave: (prefs: MealPrefs) => void;
}

const defaultPrefs: MealPrefs = {
    people: { adults: 2, kids: 0 },
    diet: {},
    base: 'mix',
    meatRate: '1-2',
    sides: [],
    tipsEnabled: true,
};

export const MealSetup: FC<MealSetupProps> = ({ onSave }) => {
    const [prefs, setPrefs] = useState<MealPrefs>(defaultPrefs);

    const handleSave = () => {
        if (prefs.people.adults <= 0 && prefs.people.kids <= 0) {
            toast.error('Bitte geben Sie mindestens eine Person an.');
            return;
        }
        onSave(prefs);
    };
    
    const setPeople = (type: 'adults' | 'kids', value: string) => {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 0) {
            setPrefs(p => ({ ...p, people: { ...p.people, [type]: num } }));
        }
    };
    
    const setDiet = (type: 'vegetarian' | 'glutenFree' | 'lactoseFree', checked: boolean) => {
        setPrefs(p => ({ ...p, diet: { ...p.diet, [type]: checked } }));
    };

    return (
        <div className="max-w-2xl mx-auto text-center">
            <Logo />
            <h1 className="text-3xl font-bold text-white mt-8">Dein persönlicher Essensplaner</h1>
            <p className="text-slate-400 mt-2 mb-8">Erzähl uns kurz, was du magst, und wir erstellen einen wöchentlichen Plan, der zu dir und deinem Budget passt.</p>

            <div className="bg-slate-800/50 p-6 sm:p-8 rounded-2xl border border-slate-700/50 space-y-6 text-left">
                {/* People */}
                <div>
                    <h3 className="font-semibold text-white mb-2">Für wie viele Personen kochst du?</h3>
                    <div className="flex gap-4">
                        <div className="flex-1"><label htmlFor="adults" className="block text-sm text-slate-300 mb-1">Erwachsene</label><input type="number" id="adults" value={prefs.people.adults} onChange={e => setPeople('adults', e.target.value)} min="0" className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2 text-white" /></div>
                        <div className="flex-1"><label htmlFor="kids" className="block text-sm text-slate-300 mb-1">Kinder</label><input type="number" id="kids" value={prefs.people.kids} onChange={e => setPeople('kids', e.target.value)} min="0" className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2 text-white" /></div>
                    </div>
                </div>

                {/* Diet */}
                <div>
                    <h3 className="font-semibold text-white mb-2">Gibt es spezielle Ernährungsweisen?</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={!!prefs.diet.vegetarian} onChange={e => setDiet('vegetarian', e.target.checked)} className="w-4 h-4 rounded text-rose-500 bg-slate-600 border-slate-500" /> Vegetarisch</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={!!prefs.diet.glutenFree} onChange={e => setDiet('glutenFree', e.target.checked)} className="w-4 h-4 rounded text-rose-500 bg-slate-600 border-slate-500" /> Glutenfrei</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={!!prefs.diet.lactoseFree} onChange={e => setDiet('lactoseFree', e.target.checked)} className="w-4 h-4 rounded text-rose-500 bg-slate-600 border-slate-500" /> Laktosefrei</label>
                    </div>
                </div>
                
                {/* Meat Rate */}
                 <div>
                    <h3 className="font-semibold text-white mb-2">Wie oft möchtest du Fleisch/Fisch essen?</h3>
                    <div className="bg-slate-800 p-1 rounded-full grid grid-cols-2 sm:grid-cols-4 gap-1">
                        {(['none', '1-2', '3-5', 'daily'] as const).map(rate => <button key={rate} onClick={() => setPrefs(p => ({ ...p, meatRate: rate }))} className={`px-3 py-1.5 text-sm font-semibold rounded-full ${prefs.meatRate === rate ? 'bg-rose-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>{{none: 'Fleischfrei', '1-2': '1-2x Woche', '3-5': '3-5x Woche', daily: 'Täglich'}[rate]}</button>)}
                    </div>
                </div>

                {/* Base */}
                <div>
                    <h3 className="font-semibold text-white mb-2">Was ist deine liebste Sättigungsbeilage?</h3>
                    <div className="bg-slate-800 p-1 rounded-full grid grid-cols-2 sm:grid-cols-4 gap-1">
                        {(['mix', 'nudeln', 'reis', 'kartoffeln'] as const).map(base => <button key={base} onClick={() => setPrefs(p => ({ ...p, base }))} className={`px-3 py-1.5 text-sm font-semibold rounded-full ${prefs.base === base ? 'bg-rose-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>{{mix: 'Mix', nudeln: 'Nudeln', reis: 'Reis', kartoffeln: 'Kartoffeln'}[base]}</button>)}
                    </div>
                </div>

                <div className="pt-4">
                    <Button onClick={handleSave} className="w-full">Plan erstellen & Speichern</Button>
                </div>
            </div>
        </div>
    );
};