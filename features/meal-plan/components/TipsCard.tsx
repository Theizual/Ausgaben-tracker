import React, { FC, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Lightbulb, Button } from '@/shared/ui';
import { AnimatePresence, motion } from 'framer-motion';

interface TipsCardProps {
    isVisible: boolean;
}

const tips = [
    "Plane deine Woche um saisonales Gemüse herum – das ist oft günstiger und frischer.",
    "Große Mengen kochen (Meal Prep) spart Zeit und Geld. Reste können am nächsten Tag Mittagessen sein.",
    "Hülsenfrüchte wie Linsen oder Bohnen sind eine günstige und gesunde Proteinquelle.",
    "Vergleiche Preise und achte auf Angebote. Ein Einkaufszettel hilft, Impulskäufe zu vermeiden.",
    "Resteverwertung ist King! Aus Gemüseresten lässt sich eine leckere Brühe kochen.",
    "Leitungswasser ist ein hervorragender und quasi kostenloser Durstlöscher. Verzichte auf teure Getränke.",
    "Eigenmarken von Supermärkten sind oft genauso gut wie Markenprodukte, aber deutlich günstiger.",
    "Achte auf den Grundpreis (Preis pro kg/Liter), um wirklich das günstigste Angebot zu finden.",
    "Ganze Früchte und Gemüse sind günstiger als vorgeschnittene, verpackte Varianten.",
    "Nutze Kundenkarten und Supermarkt-Apps, um von Rabatten und Sonderangeboten zu profitieren.",
    "Selbstgemacht schmeckt oft am besten und ist günstiger: Brot, Dips oder Müsliriegel lassen sich einfach vorbereiten.",
    "Kaffee für unterwegs? Brüh ihn zu Hause und nimm ihn im Thermobecher mit. Das spart auf Dauer viel Geld.",
    "Ein gut genutzter Tiefkühler ist dein bester Freund: Friere Reste, Brot oder Großeinkäufe ein.",
    "Ein kleiner Kräutergarten auf dem Fensterbrett versorgt dich mit frischen Aromen und ist günstiger als gekaufte Kräuter.",
    "Plane einmal pro Woche ein 'Kühlschrank-Leerfeg-Essen', um Lebensmittel zu verwerten, die weg müssen.",
    "Gehe niemals hungrig einkaufen. Ein voller Magen trifft bessere und günstigere Entscheidungen.",
    "Die teuersten Produkte stehen oft auf Augenhöhe. Bücke dich oder strecke dich – die günstigeren Alternativen sind oft oben oder unten im Regal."
];

export const TipsCard: FC<TipsCardProps> = ({ isVisible }) => {
    const { mealPlanPrefs, setMealPlanPrefs } = useApp();
    const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * tips.length));

    const handleDisable = () => {
        if (mealPlanPrefs) {
            setMealPlanPrefs({ ...mealPlanPrefs, tipsEnabled: false });
        }
    };
    
    const handleNextTip = () => {
        setTipIndex(prev => (prev + 1) % tips.length);
    };

    const tipAnimation = {
        key: tipIndex,
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
    };
    
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    {...{
                        initial: { opacity: 0, y: 20 },
                        animate: { opacity: 1, y: 0 },
                        exit: { opacity: 0, y: 20 },
                    }}
                    className="bg-sky-900/50 p-6 rounded-2xl border border-sky-700/50 space-y-3"
                >
                    <div className="flex items-center gap-3">
                        <Lightbulb className="h-6 w-6 text-sky-400" />
                        <h3 className="text-lg font-bold text-white">Spar-Tipp</h3>
                    </div>
                    <AnimatePresence mode="wait">
                        <motion.div {...tipAnimation} className="text-sky-200 text-sm min-h-[4.5em]">
                            {tips[tipIndex]}
                        </motion.div>
                    </AnimatePresence>
                    <div className="flex justify-between items-center pt-2">
                        <button onClick={handleDisable} className="text-xs text-sky-400 hover:underline">
                            Tipps ausblenden
                        </button>
                        <Button onClick={handleNextTip} variant="secondary" size="sm">
                            Nächster Tipp
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};