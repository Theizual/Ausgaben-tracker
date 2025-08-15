import React, { FC } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Lightbulb } from '@/shared/ui';
import { AnimatePresence, motion } from 'framer-motion';

interface TipsCardProps {
    isVisible: boolean;
}

const tips = [
    "Plane deine Woche um saisonales Gemüse herum – das ist oft günstiger und frischer.",
    "Große Mengen kochen (Meal Prep) spart Zeit und Geld. Reste können am nächsten Tag Mittagessen sein.",
    "Hülsenfrüchte wie Linsen oder Bohnen sind eine günstige und gesunde Proteinquelle.",
    "Vergleiche Preise und achte auf Angebote. Ein Einkaufszettel hilft, Impulskäufe zu vermeiden.",
    "Resteverwertung ist King! Aus Gemüseresten lässt sich eine leckere Brühe kochen."
];

export const TipsCard: FC<TipsCardProps> = ({ isVisible }) => {
    const { mealPlanPrefs, setMealPlanPrefs } = useApp();

    const handleDisable = () => {
        if (mealPlanPrefs) {
            setMealPlanPrefs({ ...mealPlanPrefs, tipsEnabled: false });
        }
    };
    
    const randomTip = React.useMemo(() => tips[Math.floor(Math.random() * tips.length)], [isVisible]);
    
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="bg-sky-900/50 p-6 rounded-2xl border border-sky-700/50 space-y-3"
                >
                    <div className="flex items-center gap-3">
                        <Lightbulb className="h-6 w-6 text-sky-400" />
                        <h3 className="text-lg font-bold text-white">Spar-Tipp</h3>
                    </div>
                    <p className="text-sky-200 text-sm">{randomTip}</p>
                    <div className="text-right">
                        <button onClick={handleDisable} className="text-xs text-sky-400 hover:underline">
                            Tipps für diese Woche ausblenden
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};