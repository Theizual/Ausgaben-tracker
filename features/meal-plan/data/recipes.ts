export interface Ingredient {
    category: 'Obst & Gemüse' | 'Fleisch & Fisch' | 'Trockenwaren & Konserven' | 'Milchprodukte & Eier' | 'Backwaren' | 'Gewürze & Öle' | 'Sonstiges';
    name: string;
}

export interface Recipe {
    id: string;
    title: string;
    link?: string;
    base: 'nudeln' | 'reis' | 'kartoffeln' | 'mix';
    tags: string[];
    estimatedPricePerServing: number;
    sideSuggestion?: string;
    isPremium?: boolean;
    ingredients: Ingredient[];
    instructions?: string[];
}

export const recipes: readonly Recipe[] = [
    // Pasta
    { id: 'r001', title: 'Spaghetti Bolognese', base: 'nudeln', tags: ['Fleisch', 'Klassiker', 'Italienisch'], estimatedPricePerServing: 2.8, sideSuggestion: 'Salat', ingredients: [
        { category: 'Fleisch & Fisch', name: 'Hackfleisch (Rind)' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }, { category: 'Obst & Gemüse', name: 'Karotten' }, { category: 'Obst & Gemüse', name: 'Sellerie' }, { category: 'Obst & Gemüse', name: 'Knoblauch' }, { category: 'Trockenwaren & Konserven', name: 'Passierte Tomaten' }, { category: 'Trockenwaren & Konserven', name: 'Tomatenmark' }, { category: 'Trockenwaren & Konserven', name: 'Spaghetti' }, { category: 'Gewürze & Öle', name: 'Olivenöl' }, { category: 'Gewürze & Öle', name: 'Rotwein (optional)' }, { category: 'Gewürze & Öle', name: 'Italienische Kräuter' }
    ]},
    { id: 'r002', title: 'Pesto-Nudeln mit Tomaten', base: 'nudeln', tags: ['Vegetarisch', 'Schnell', 'Günstig', 'Italienisch'], estimatedPricePerServing: 1.9, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Nudeln (Penne o.ä.)' }, { category: 'Trockenwaren & Konserven', name: 'Grünes Pesto' }, { category: 'Obst & Gemüse', name: 'Cherrytomaten' }, { category: 'Milchprodukte & Eier', name: 'Parmesan' }, { category: 'Trockenwaren & Konserven', name: 'Pinienkerne' }
    ]},
    { id: 'r003', title: 'Linsen-Bolognese', base: 'nudeln', tags: ['Vegetarisch', 'Günstig', 'Vegan'], estimatedPricePerServing: 1.5, sideSuggestion: 'Salat', ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Rote Linsen' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }, { category: 'Obst & Gemüse', name: 'Karotten' }, { category: 'Trockenwaren & Konserven', name: 'Gehackte Tomaten (Dose)' }, { category: 'Trockenwaren & Konserven', name: 'Spaghetti' }, { category: 'Gewürze & Öle', name: 'Gemüsebrühe' }
    ]},
    { id: 'r004', title: 'Lachs-Sahne-Gratin', base: 'nudeln', tags: ['Fisch', 'Ofengericht'], estimatedPricePerServing: 3.5, isPremium: true, ingredients: [
        { category: 'Fleisch & Fisch', name: 'Lachsfilet' }, { category: 'Trockenwaren & Konserven', name: 'Bandnudeln' }, { category: 'Milchprodukte & Eier', name: 'Sahne' }, { category: 'Obst & Gemüse', name: 'Lauch' }, { category: 'Milchprodukte & Eier', name: 'Geriebener Käse' }, { category: 'Obst & Gemüse', name: 'Dill' }
    ]},
    { id: 'r017', title: 'Lasagne al Forno', base: 'nudeln', tags: ['Fleisch', 'Ofengericht', 'Klassiker'], estimatedPricePerServing: 3.2, sideSuggestion: 'Grüner Salat', ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Lasagneplatten' }, { category: 'Fleisch & Fisch', name: 'Hackfleisch' }, { category: 'Milchprodukte & Eier', name: 'Milch' }, { category: 'Milchprodukte & Eier', name: 'Butter' }, { category: 'Backwaren', name: 'Mehl' }, { category: 'Milchprodukte & Eier', name: 'Geriebener Käse (z.B. Gouda)' }, { category: 'Milchprodukte & Eier', name: 'Parmesan' }
    ]},
    { id: 'r018', title: 'Käsespätzle mit Röstzwiebeln', base: 'nudeln', tags: ['Vegetarisch', 'Günstig', 'Käse'], estimatedPricePerServing: 2.1, sideSuggestion: 'Gurkensalat', ingredients: [
        { category: 'Milchprodukte & Eier', name: 'Spätzle (Kühlregal)' }, { category: 'Milchprodukte & Eier', name: 'Bergkäse' }, { category: 'Milchprodukte & Eier', name: 'Emmentaler' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }, { category: 'Sonstiges', name: 'Röstzwiebeln' }
    ]},
    { id: 'r025', title: 'Pasta aglio e olio', base: 'nudeln', tags: ['Vegetarisch', 'Schnell', 'Günstig', 'Vegan'], estimatedPricePerServing: 1.2, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Spaghetti' }, { category: 'Obst & Gemüse', name: 'Knoblauch' }, { category: 'Gewürze & Öle', name: 'Olivenöl' }, { category: 'Obst & Gemüse', name: 'Chiliflocken' }, { category: 'Obst & Gemüse', name: 'Petersilie' }
    ]},
    { id: 'r026', title: 'Carbonara (Original)', base: 'nudeln', tags: ['Fleisch', 'Schwein', 'Klassiker'], estimatedPricePerServing: 2.9, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Spaghetti' }, { category: 'Fleisch & Fisch', name: 'Guanciale (oder Pancetta)' }, { category: 'Milchprodukte & Eier', name: 'Eigelb' }, { category: 'Milchprodukte & Eier', name: 'Pecorino Romano' }, { category: 'Gewürze & Öle', name: 'Schwarzer Pfeffer' }
    ]},
    { id: 'r027', title: 'Gnocchi in Salbeibutter', base: 'kartoffeln', tags: ['Vegetarisch', 'Schnell'], estimatedPricePerServing: 2.4, sideSuggestion: 'Parmesan', ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Gnocchi' }, { category: 'Milchprodukte & Eier', name: 'Butter' }, { category: 'Obst & Gemüse', name: 'Salbei (frisch)' }, { category: 'Milchprodukte & Eier', name: 'Parmesan' }
    ]},
    // Rice
    { id: 'r005', title: 'Hähnchen-Curry', base: 'reis', tags: ['Fleisch', 'Asiatisch', 'Scharf'], estimatedPricePerServing: 2.9, sideSuggestion: 'Naan-Brot', ingredients: [
        { category: 'Fleisch & Fisch', name: 'Hähnchenbrust' }, { category: 'Trockenwaren & Konserven', name: 'Kokosmilch' }, { category: 'Trockenwaren & Konserven', name: 'Rote Currypaste' }, { category: 'Obst & Gemüse', name: 'Paprika' }, { category: 'Obst & Gemüse', name: 'Zucchini' }, { category: 'Trockenwaren & Konserven', name: 'Basmatireis' }
    ]},
    { id: 'r006', title: 'Chili con Carne', base: 'reis', tags: ['Fleisch', 'Günstig', 'Eintopf'], estimatedPricePerServing: 2.0, sideSuggestion: 'Brot', ingredients: [
        { category: 'Fleisch & Fisch', name: 'Hackfleisch' }, { category: 'Trockenwaren & Konserven', name: 'Kidneybohnen (Dose)' }, { category: 'Trockenwaren & Konserven', name: 'Gehackte Tomaten (Dose)' }, { category: 'Trockenwaren & Konserven', name: 'Mais (Dose)' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }, { category: 'Obst & Gemüse', name: 'Knoblauch' }
    ]},
    { id: 'r007', title: 'Gemüse-Reispfanne', base: 'reis', tags: ['Vegetarisch', 'Schnell', 'Günstig', 'Vegan'], estimatedPricePerServing: 1.8, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Reis' }, { category: 'Obst & Gemüse', name: 'Paprika' }, { category: 'Obst & Gemüse', name: 'Zucchini' }, { category: 'Obst & Gemüse', name: 'Brokkoli' }, { category: 'Trockenwaren & Konserven', name: 'Sojasauce' }
    ]},
    { id: 'r008', title: 'Risotto mit Pilzen', base: 'reis', tags: ['Vegetarisch', 'Pilze', 'Italienisch'], estimatedPricePerServing: 2.6, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Risottoreis' }, { category: 'Obst & Gemüse', name: 'Champignons' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }, { category: 'Gewürze & Öle', name: 'Weißwein' }, { category: 'Gewürze & Öle', name: 'Gemüsebrühe' }, { category: 'Milchprodukte & Eier', name: 'Parmesan' }
    ]},
    { id: 'r019', title: 'Chicken Teriyaki Bowl', base: 'reis', tags: ['Fleisch', 'Schnell', 'Asiatisch'], estimatedPricePerServing: 3.4, sideSuggestion: 'Edamame', ingredients: [
        { category: 'Fleisch & Fisch', name: 'Hähnchenbrust' }, { category: 'Trockenwaren & Konserven', name: 'Teriyakisauce' }, { category: 'Trockenwaren & Konserven', name: 'Reis' }, { category: 'Obst & Gemüse', name: 'Brokkoli' }, { category: 'Obst & Gemüse', name: 'Karotten' }, { category: 'Trockenwaren & Konserven', name: 'Sesam' }
    ]},
    { id: 'r023', title: 'Meeresfrüchte-Paella', base: 'reis', tags: ['Fisch', 'Meeresfrüchte'], estimatedPricePerServing: 4.5, isPremium: true, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Paella-Reis' }, { category: 'Fleisch & Fisch', name: 'Meeresfrüchte-Mix (TK)' }, { category: 'Obst & Gemüse', name: 'Paprika' }, { category: 'Trockenwaren & Konserven', name: 'Erbsen (TK)' }, { category: 'Gewürze & Öle', name: 'Safranfäden' }
    ]},
    { id: 'r028', title: 'Gebratener Reis mit Ei', base: 'reis', tags: ['Vegetarisch', 'Schnell', 'Günstig'], estimatedPricePerServing: 1.7, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Reis (vom Vortag)' }, { category: 'Milchprodukte & Eier', name: 'Eier' }, { category: 'Trockenwaren & Konserven', name: 'Erbsen (TK)' }, { category: 'Obst & Gemüse', name: 'Frühlingszwiebeln' }, { category: 'Trockenwaren & Konserven', name: 'Sojasauce' }
    ]},
    { id: 'r029', title: 'Kichererbsen-Curry', base: 'reis', tags: ['Vegetarisch', 'Vegan', 'Günstig', 'Asiatisch'], estimatedPricePerServing: 1.9, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Kichererbsen (Dose)' }, { category: 'Trockenwaren & Konserven', name: 'Kokosmilch' }, { category: 'Obst & Gemüse', name: 'Spinat' }, { category: 'Gewürze & Öle', name: 'Currypulver' }, { category: 'Trockenwaren & Konserven', name: 'Reis' }
    ]},
    // Potatoes
    { id: 'r009', title: 'Kartoffel-Gratin', base: 'kartoffeln', tags: ['Vegetarisch', 'Günstig', 'Ofengericht', 'Käse'], estimatedPricePerServing: 1.6, sideSuggestion: 'Salat', ingredients: [
        { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Milchprodukte & Eier', name: 'Sahne' }, { category: 'Milchprodukte & Eier', name: 'Geriebener Käse' }, { category: 'Obst & Gemüse', name: 'Knoblauch' }, { category: 'Gewürze & Öle', name: 'Muskatnuss' }
    ]},
    { id: 'r010', title: 'Bratkartoffeln mit Spiegelei', base: 'kartoffeln', tags: ['Vegetarisch', 'Schnell', 'Günstig'], estimatedPricePerServing: 1.4, ingredients: [
        { category: 'Obst & Gemüse', name: 'Kartoffeln (gekocht)' }, { category: 'Milchprodukte & Eier', name: 'Eier' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }, { category: 'Fleisch & Fisch', name: 'Speck (optional)' }
    ]},
    { id: 'r011', title: 'Ofenkartoffeln mit Quark', base: 'kartoffeln', tags: ['Vegetarisch', 'Schnell', 'Günstig'], estimatedPricePerServing: 1.2, sideSuggestion: 'Leinöl', ingredients: [
        { category: 'Obst & Gemüse', name: 'Große Kartoffeln' }, { category: 'Milchprodukte & Eier', name: 'Quark' }, { category: 'Obst & Gemüse', name: 'Schnittlauch' }, { category: 'Gewürze & Öle', name: 'Leinöl' }
    ]},
    { id: 'r012', title: 'Kartoffelsuppe mit Würstchen', base: 'kartoffeln', tags: ['Fleisch', 'Günstig', 'Eintopf', 'Schwein'], estimatedPricePerServing: 1.8, sideSuggestion: 'Brot', ingredients: [
        { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Obst & Gemüse', name: 'Karotten' }, { category: 'Obst & Gemüse', name: 'Sellerie' }, { category: 'Obst & Gemüse', name: 'Lauch' }, { category: 'Fleisch & Fisch', name: 'Wiener Würstchen' }, { category: 'Gewürze & Öle', name: 'Gemüsebrühe' }
    ]},
    { id: 'r020', title: 'Shepherd\'s Pie', base: 'kartoffeln', tags: ['Fleisch', 'Ofengericht', 'Lamm'], estimatedPricePerServing: 3.1, sideSuggestion: 'Grüne Bohnen', ingredients: [
        { category: 'Fleisch & Fisch', name: 'Lammhackfleisch' }, { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Trockenwaren & Konserven', name: 'Erbsen (TK)' }, { category: 'Milchprodukte & Eier', name: 'Butter' }, { category: 'Milchprodukte & Eier', name: 'Milch' }
    ]},
    { id: 'r022', title: 'Rindergulasch', base: 'kartoffeln', tags: ['Fleisch', 'Eintopf'], estimatedPricePerServing: 3.8, isPremium: true, ingredients: [
        { category: 'Fleisch & Fisch', name: 'Rindfleisch (Gulasch)' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }, { category: 'Obst & Gemüse', name: 'Paprika' }, { category: 'Trockenwaren & Konserven', name: 'Tomatenmark' }, { category: 'Gewürze & Öle', name: 'Paprikapulver' }
    ]},
    { id: 'r030', title: 'Kartoffelpuffer mit Apfelmus', base: 'kartoffeln', tags: ['Vegetarisch', 'Günstig'], estimatedPricePerServing: 1.3, ingredients: [
        { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Milchprodukte & Eier', name: 'Eier' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }, { category: 'Trockenwaren & Konserven', name: 'Apfelmus' }
    ]},
    { id: 'r031', title: 'Hähnchenschenkel vom Blech', base: 'kartoffeln', tags: ['Fleisch', 'Ofengericht'], estimatedPricePerServing: 2.5, sideSuggestion: 'Gemüse', ingredients: [
        { category: 'Fleisch & Fisch', name: 'Hähnchenschenkel' }, { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Obst & Gemüse', name: 'Rosmarin' }, { category: 'Obst & Gemüse', name: 'Paprika' }
    ]},
    // Mix / Other
    { id: 'r013', title: 'Flammkuchen', base: 'mix', tags: ['Fleisch', 'Schnell', 'Schwein'], estimatedPricePerServing: 2.2, ingredients: [
        { category: 'Backwaren', name: 'Flammkuchenteig' }, { category: 'Milchprodukte & Eier', name: 'Schmand' }, { category: 'Fleisch & Fisch', name: 'Speckwürfel' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }
    ]},
    { id: 'r014', title: 'Gefüllte Paprika', base: 'mix', tags: ['Fleisch', 'Ofengericht'], estimatedPricePerServing: 2.7, sideSuggestion: 'Reis', ingredients: [
        { category: 'Obst & Gemüse', name: 'Paprika' }, { category: 'Fleisch & Fisch', name: 'Hackfleisch' }, { category: 'Trockenwaren & Konserven', name: 'Reis' }, { category: 'Gewürze & Öle', name: 'Tomatensauce' }
    ]},
    { id: 'r015', title: 'Kürbissuppe mit Ingwer', base: 'mix', tags: ['Vegetarisch', 'Günstig', 'Suppe', 'Vegan'], estimatedPricePerServing: 1.5, sideSuggestion: 'Brot', ingredients: [
        { category: 'Obst & Gemüse', name: 'Hokkaido-Kürbis' }, { category: 'Obst & Gemüse', name: 'Ingwer' }, { category: 'Trockenwaren & Konserven', name: 'Kokosmilch' }, { category: 'Gewürze & Öle', name: 'Gemüsebrühe' }
    ]},
    { id: 'r016', title: 'Wraps mit Hähnchen', base: 'mix', tags: ['Fleisch', 'Schnell'], estimatedPricePerServing: 3.0, ingredients: [
        { category: 'Backwaren', name: 'Weizen-Tortillas' }, { category: 'Fleisch & Fisch', name: 'Hähnchenbruststreifen' }, { category: 'Obst & Gemüse', name: 'Salat' }, { category: 'Obst & Gemüse', name: 'Tomaten' }, { category: 'Sonstiges', name: 'Salsa-Sauce' }
    ]},
    { id: 'r021', title: 'Shakshuka', base: 'mix', tags: ['Vegetarisch', 'Günstig', 'Schnell', 'Pfannengericht'], estimatedPricePerServing: 2.3, sideSuggestion: 'Fladenbrot', ingredients: [
        { category: 'Milchprodukte & Eier', name: 'Eier' }, { category: 'Trockenwaren & Konserven', name: 'Gehackte Tomaten (Dose)' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }, { category: 'Obst & Gemüse', name: 'Paprika' }, { category: 'Milchprodukte & Eier', name: 'Feta' }
    ]},
    { id: 'r024', title: 'Pizza Margherita', base: 'mix', tags: ['Vegetarisch', 'Schnell', 'Günstig', 'Käse'], estimatedPricePerServing: 2.0, ingredients: [
        { category: 'Backwaren', name: 'Pizzateig' }, { category: 'Trockenwaren & Konserven', name: 'Passierte Tomaten' }, { category: 'Milchprodukte & Eier', name: 'Mozzarella' }, { category: 'Obst & Gemüse', name: 'Basilikum' }
    ]},
    { id: 'r032', title: 'Linsensalat mit Feta', base: 'mix', tags: ['Vegetarisch', 'Salat', 'Kalt', 'Käse'], estimatedPricePerServing: 2.4, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Berglinsen' }, { category: 'Milchprodukte & Eier', name: 'Feta' }, { category: 'Obst & Gemüse', name: 'Paprika' }, { category: 'Obst & Gemüse', name: 'Frühlingszwiebeln' }
    ]},
    { id: 'r033', title: 'Quesadillas mit Bohnen', base: 'mix', tags: ['Vegetarisch', 'Schnell', 'Käse'], estimatedPricePerServing: 2.1, sideSuggestion: 'Salsa', ingredients: [
        { category: 'Backwaren', name: 'Weizen-Tortillas' }, { category: 'Trockenwaren & Konserven', name: 'Schwarze Bohnen (Dose)' }, { category: 'Milchprodukte & Eier', name: 'Geriebener Käse' }, { category: 'Trockenwaren & Konserven', name: 'Mais (Dose)' }
    ]},
    { id: 'r034', title: 'Rinder-Steak mit Ofengemüse', base: 'mix', tags: ['Fleisch', 'Ofengericht'], estimatedPricePerServing: 5.5, isPremium: true, ingredients: [
        { category: 'Fleisch & Fisch', name: 'Rindersteak' }, { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Obst & Gemüse', name: 'Zucchini' }, { category: 'Obst & Gemüse', name: 'Rosmarin' }
    ]},
    { id: 'r035', title: 'Dorade aus dem Ofen', base: 'mix', tags: ['Fisch', 'Ofengericht'], estimatedPricePerServing: 4.8, isPremium: true, sideSuggestion: 'Kartoffeln', ingredients: [
        { category: 'Fleisch & Fisch', name: 'Dorade (ganz)' }, { category: 'Obst & Gemüse', name: 'Zitrone' }, { category: 'Obst & Gemüse', name: 'Knoblauch' }, { category: 'Obst & Gemüse', name: 'Thymian' }
    ]},
    { id: 'r036', title: 'Linseneintopf', base: 'mix', tags: ['Vegetarisch', 'Eintopf', 'Günstig', 'Vegan'], estimatedPricePerServing: 1.2, sideSuggestion: 'Brot', ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Tellerlinsen' }, { category: 'Obst & Gemüse', name: 'Suppengrün' }, { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Gewürze & Öle', name: 'Essig' }
    ]},
    { id: 'r037', title: 'Zucchini-Puffer', base: 'mix', tags: ['Vegetarisch', 'Günstig'], estimatedPricePerServing: 1.6, sideSuggestion: 'Quark-Dip', ingredients: [
        { category: 'Obst & Gemüse', name: 'Zucchini' }, { category: 'Milchprodukte & Eier', name: 'Eier' }, { category: 'Backwaren', name: 'Mehl' }, { category: 'Milchprodukte & Eier', name: 'Quark' }
    ]},
    { id: 'r038', title: 'Thai-Basilikum-Hähnchen', base: 'reis', tags: ['Fleisch', 'Asiatisch', 'Scharf', 'Schnell'], estimatedPricePerServing: 3.3, ingredients: [
        { category: 'Fleisch & Fisch', name: 'Hähnchenhackfleisch' }, { category: 'Obst & Gemüse', name: 'Thai-Basilikum' }, { category: 'Obst & Gemüse', name: 'Chilischoten' }, { category: 'Trockenwaren & Konserven', name: 'Fischsauce' }
    ]},
    { id: 'r039', title: 'Spinat-Ricotta-Cannelloni', base: 'nudeln', tags: ['Vegetarisch', 'Ofengericht', 'Käse'], estimatedPricePerServing: 2.9, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Cannelloni' }, { category: 'Milchprodukte & Eier', name: 'Ricotta' }, { category: 'Obst & Gemüse', name: 'Spinat (TK)' }, { category: 'Trockenwaren & Konserven', name: 'Passierte Tomaten' }
    ]},
    { id: 'r040', title: 'Couscous-Salat', base: 'mix', tags: ['Vegetarisch', 'Salat', 'Kalt', 'Schnell', 'Vegan'], estimatedPricePerServing: 2.0, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Couscous' }, { category: 'Obst & Gemüse', name: 'Gurke' }, { category: 'Obst & Gemüse', name: 'Tomaten' }, { category: 'Obst & Gemüse', name: 'Minze' }
    ]},
    { id: 'r041', title: 'Hähnchen-Pfanne süß-sauer', base: 'reis', tags: ['Fleisch', 'Asiatisch', 'Schnell'], estimatedPricePerServing: 3.1, ingredients: [
        { category: 'Fleisch & Fisch', name: 'Hähnchenbrust' }, { category: 'Obst & Gemüse', name: 'Ananas (frisch oder Dose)' }, { category: 'Obst & Gemüse', name: 'Paprika' }, { category: 'Sonstiges', name: 'Süß-Sauer-Sauce' }
    ]},
    { id: 'r042', title: 'Tacos mit Hackfleisch', base: 'mix', tags: ['Fleisch', 'Schnell', 'Mexikanisch'], estimatedPricePerServing: 2.8, ingredients: [
        { category: 'Backwaren', name: 'Taco-Schalen' }, { category: 'Fleisch & Fisch', name: 'Hackfleisch' }, { category: 'Sonstiges', name: 'Taco-Gewürz' }, { category: 'Obst & Gemüse', name: 'Salat' }, { category: 'Milchprodukte & Eier', name: 'Sauerrahm' }
    ]},
    { id: 'r043', title: 'Gefüllte Zucchini mit Feta', base: 'mix', tags: ['Vegetarisch', 'Ofengericht', 'Käse'], estimatedPricePerServing: 2.4, sideSuggestion: 'Baguette', ingredients: [
        { category: 'Obst & Gemüse', name: 'Zucchini' }, { category: 'Milchprodukte & Eier', name: 'Feta' }, { category: 'Obst & Gemüse', name: 'Tomaten' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }
    ]},
    { id: 'r044', title: 'Kartoffel-Lauch-Suppe', base: 'kartoffeln', tags: ['Vegetarisch', 'Suppe', 'Günstig'], estimatedPricePerServing: 1.4, ingredients: [
        { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Obst & Gemüse', name: 'Lauch' }, { category: 'Milchprodukte & Eier', name: 'Sahne' }, { category: 'Gewürze & Öle', name: 'Gemüsebrühe' }
    ]},
    { id: 'r045', title: 'Bratwurst mit Kartoffelpüree', base: 'kartoffeln', tags: ['Fleisch', 'Schwein', 'Klassiker'], estimatedPricePerServing: 2.2, sideSuggestion: 'Sauerkraut', ingredients: [
        { category: 'Fleisch & Fisch', name: 'Bratwürste' }, { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Milchprodukte & Eier', name: 'Milch' }, { category: 'Milchprodukte & Eier', name: 'Butter' }
    ]},
    { id: 'r046', title: 'Quiche Lorraine', base: 'mix', tags: ['Fleisch', 'Schwein', 'Ofengericht', 'Käse'], estimatedPricePerServing: 2.6, sideSuggestion: 'Salat', ingredients: [
        { category: 'Backwaren', name: 'Mürbeteig' }, { category: 'Fleisch & Fisch', name: 'Speck' }, { category: 'Milchprodukte & Eier', name: 'Eier' }, { category: 'Milchprodukte & Eier', name: 'Sahne' }
    ]},
    { id: 'r047', title: 'Fish and Chips', base: 'kartoffeln', tags: ['Fisch', 'Klassiker'], estimatedPricePerServing: 3.5, ingredients: [
        { category: 'Fleisch & Fisch', name: 'Kabeljaufilet' }, { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Backwaren', name: 'Mehl' }, { category: 'Sonstiges', name: 'Bier' }
    ]},
    { id: 'r048', title: 'Falafel-Wraps mit Hummus', base: 'mix', tags: ['Vegetarisch', 'Vegan', 'Schnell'], estimatedPricePerServing: 2.3, ingredients: [
        { category: 'Backwaren', name: 'Fladenbrot' }, { category: 'Trockenwaren & Konserven', name: 'Falafel (Fertigmischung)' }, { category: 'Sonstiges', name: 'Hummus' }, { category: 'Obst & Gemüse', name: 'Salat' }
    ]},
    { id: 'r049', title: 'Buddha Bowl mit Erdnusssauce', base: 'reis', tags: ['Vegetarisch', 'Vegan', 'Gesund'], estimatedPricePerServing: 3.0, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Quinoa' }, { category: 'Obst & Gemüse', name: 'Süßkartoffel' }, { category: 'Trockenwaren & Konserven', name: 'Kichererbsen' }, { category: 'Sonstiges', name: 'Erdnussbutter' }
    ]},
    { id: 'r050', title: 'Amerikanische Pancakes', base: 'mix', tags: ['Vegetarisch', 'Süßspeise', 'Schnell'], estimatedPricePerServing: 1.5, sideSuggestion: 'Ahornsirup', ingredients: [
        { category: 'Backwaren', name: 'Mehl' }, { category: 'Milchprodukte & Eier', name: 'Eier' }, { category: 'Milchprodukte & Eier', name: 'Milch' }, { category: 'Backwaren', name: 'Backpulver' }, { category: 'Sonstiges', name: 'Ahornsirup' }
    ]}
] as const;