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
    ], instructions: [
        "Gemüse klein schneiden und in Olivenöl andünsten.",
        "Hackfleisch zugeben und krümelig anbraten.",
        "Tomatenmark kurz mitrösten, optional mit Rotwein ablöschen.",
        "Passierte Tomaten und Gewürze hinzufügen und mindestens 30 Minuten köcheln lassen.",
        "Spaghetti nach Packungsanweisung kochen und mit der Sauce servieren."
    ]},
    { id: 'r002', title: 'Pesto-Nudeln mit Tomaten', base: 'nudeln', tags: ['Vegetarisch', 'Schnell', 'Günstig', 'Italienisch'], estimatedPricePerServing: 1.9, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Nudeln (Penne o.ä.)' }, { category: 'Trockenwaren & Konserven', name: 'Grünes Pesto' }, { category: 'Obst & Gemüse', name: 'Cherrytomaten' }, { category: 'Milchprodukte & Eier', name: 'Parmesan' }, { category: 'Trockenwaren & Konserven', name: 'Pinienkerne' }
    ], instructions: [
        "Nudeln nach Packungsanweisung kochen.",
        "Pinienkerne in einer Pfanne ohne Fett goldbraun rösten.",
        "Cherrytomaten halbieren.",
        "Nudeln abgießen, etwas Nudelwasser auffangen.",
        "Nudeln mit Pesto, Tomaten und etwas Nudelwasser vermengen, mit Parmesan und Pinienkernen servieren."
    ]},
    { id: 'r003', title: 'Linsen-Bolognese', base: 'nudeln', tags: ['Vegetarisch', 'Günstig', 'Vegan'], estimatedPricePerServing: 1.5, sideSuggestion: 'Salat', ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Rote Linsen' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }, { category: 'Obst & Gemüse', name: 'Karotten' }, { category: 'Trockenwaren & Konserven', name: 'Gehackte Tomaten (Dose)' }, { category: 'Trockenwaren & Konserven', name: 'Spaghetti' }, { category: 'Gewürze & Öle', name: 'Gemüsebrühe' }
    ], instructions: [
        "Zwiebeln und Karotten fein würfeln und in Öl anbraten.",
        "Linsen hinzufügen und kurz mitbraten.",
        "Mit gehackten Tomaten und Gemüsebrühe ablöschen.",
        "Ca. 15-20 Minuten köcheln lassen, bis die Linsen gar sind.",
        "Mit Salz, Pfeffer und Kräutern abschmecken und zu Nudeln servieren."
    ]},
    { id: 'r004', title: 'Lachs-Sahne-Gratin', base: 'nudeln', tags: ['Fisch', 'Ofengericht'], estimatedPricePerServing: 3.5, isPremium: true, ingredients: [
        { category: 'Fleisch & Fisch', name: 'Lachsfilet' }, { category: 'Trockenwaren & Konserven', name: 'Bandnudeln' }, { category: 'Milchprodukte & Eier', name: 'Sahne' }, { category: 'Obst & Gemüse', name: 'Lauch' }, { category: 'Milchprodukte & Eier', name: 'Geriebener Käse' }, { category: 'Obst & Gemüse', name: 'Dill' }
    ], instructions: [
        "Nudeln vorkochen. Lachs würfeln, Lauch in Ringe schneiden.",
        "Nudeln, Lachs und Lauch in eine Auflaufform geben.",
        "Sahne mit Salz, Pfeffer und Dill verrühren und darüber gießen.",
        "Mit Käse bestreuen und bei 180°C ca. 20-25 Minuten goldbraun backen."
    ]},
    { id: 'r017', title: 'Lasagne al Forno', base: 'nudeln', tags: ['Fleisch', 'Ofengericht', 'Klassiker'], estimatedPricePerServing: 3.2, sideSuggestion: 'Grüner Salat', ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Lasagneplatten' }, { category: 'Fleisch & Fisch', name: 'Hackfleisch' }, { category: 'Milchprodukte & Eier', name: 'Milch' }, { category: 'Milchprodukte & Eier', name: 'Butter' }, { category: 'Backwaren', name: 'Mehl' }, { category: 'Milchprodukte & Eier', name: 'Geriebener Käse (z.B. Gouda)' }, { category: 'Milchprodukte & Eier', name: 'Parmesan' }
    ], instructions: [
        "Bolognese-Sauce zubereiten (siehe Rezept r001).",
        "Für die Béchamelsauce Butter schmelzen, Mehl einrühren und mit Milch ablöschen. Unter Rühren aufkochen lassen, bis sie andickt.",
        "Abwechselnd Bolognese, Béchamel und Lasagneplatten in eine Auflaufform schichten. Mit Béchamel abschließen.",
        "Mit Käse bestreuen und bei 180°C ca. 30-40 Minuten backen."
    ]},
    { id: 'r018', title: 'Käsespätzle mit Röstzwiebeln', base: 'nudeln', tags: ['Vegetarisch', 'Günstig', 'Käse'], estimatedPricePerServing: 2.1, sideSuggestion: 'Gurkensalat', ingredients: [
        { category: 'Milchprodukte & Eier', name: 'Spätzle (Kühlregal)' }, { category: 'Milchprodukte & Eier', name: 'Bergkäse' }, { category: 'Milchprodukte & Eier', name: 'Emmentaler' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }, { category: 'Sonstiges', name: 'Röstzwiebeln' }
    ], instructions: [
        "Zwiebeln in Ringe schneiden und in Butter goldbraun braten.",
        "Spätzle in einer Pfanne anbraten.",
        "Käse reiben und abwechselnd mit den Spätzle in eine Schüssel schichten.",
        "Mit den gebratenen Zwiebeln und Röstzwiebeln garnieren."
    ]},
    { id: 'r025', title: 'Pasta aglio e olio', base: 'nudeln', tags: ['Vegetarisch', 'Schnell', 'Günstig', 'Vegan'], estimatedPricePerServing: 1.2, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Spaghetti' }, { category: 'Obst & Gemüse', name: 'Knoblauch' }, { category: 'Gewürze & Öle', name: 'Olivenöl' }, { category: 'Gewürze & Öle', name: 'Chiliflocken' }, { category: 'Obst & Gemüse', name: 'Petersilie' }
    ], instructions: [
        "Spaghetti kochen.",
        "Knoblauch in feine Scheiben schneiden.",
        "Reichlich Olivenöl in einer Pfanne erhitzen, Knoblauch und Chili darin sanft anbraten, bis der Knoblauch leicht golden ist.",
        "Nudeln abtropfen lassen, in die Pfanne geben, durchschwenken und mit gehackter Petersilie servieren."
    ]},
    { id: 'r026', title: 'Carbonara (Original)', base: 'nudeln', tags: ['Fleisch', 'Schwein', 'Klassiker'], estimatedPricePerServing: 2.9, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Spaghetti' }, { category: 'Fleisch & Fisch', name: 'Guanciale (oder Pancetta)' }, { category: 'Milchprodukte & Eier', name: 'Eigelb' }, { category: 'Milchprodukte & Eier', name: 'Pecorino Romano' }, { category: 'Gewürze & Öle', name: 'Schwarzer Pfeffer' }
    ], instructions: [
        "Guanciale in Würfel schneiden und in einer Pfanne knusprig auslassen.",
        "Eigelb mit geriebenem Pecorino und viel schwarzem Pfeffer verquirlen.",
        "Spaghetti kochen, abgießen (etwas Kochwasser aufbewahren) und in die Pfanne zum Speck geben.",
        "Pfanne vom Herd nehmen, die Ei-Käse-Mischung unterrühren. Bei Bedarf etwas Nudelwasser zugeben, um eine cremige Sauce zu erhalten."
    ]},
    { id: 'r027', title: 'Gnocchi in Salbeibutter', base: 'kartoffeln', tags: ['Vegetarisch', 'Schnell'], estimatedPricePerServing: 2.4, sideSuggestion: 'Parmesan', ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Gnocchi' }, { category: 'Milchprodukte & Eier', name: 'Butter' }, { category: 'Obst & Gemüse', name: 'Salbei (frisch)' }, { category: 'Milchprodukte & Eier', name: 'Parmesan' }
    ], instructions: [
        "Gnocchi nach Packungsanweisung kochen.",
        "Butter in einer Pfanne schmelzen, Salbeiblätter hinzufügen und knusprig braten.",
        "Gnocchi abtropfen lassen und in der Salbeibutter schwenken.",
        "Mit frisch geriebenem Parmesan servieren."
    ]},
    // Rice
    { id: 'r005', title: 'Hähnchen-Curry', base: 'reis', tags: ['Fleisch', 'Asiatisch', 'Scharf'], estimatedPricePerServing: 2.9, sideSuggestion: 'Naan-Brot', ingredients: [
        { category: 'Fleisch & Fisch', name: 'Hähnchenbrust' }, { category: 'Trockenwaren & Konserven', name: 'Kokosmilch' }, { category: 'Trockenwaren & Konserven', name: 'Rote Currypaste' }, { category: 'Obst & Gemüse', name: 'Paprika' }, { category: 'Obst & Gemüse', name: 'Zucchini' }, { category: 'Trockenwaren & Konserven', name: 'Basmatireis' }
    ], instructions: [
        "Reis kochen.",
        "Hähnchen in Würfel und Gemüse in Stücke schneiden.",
        "Hähnchen in einer Pfanne anbraten, dann Gemüse hinzufügen und mitbraten.",
        "Currypaste kurz mitrösten, dann mit Kokosmilch ablöschen.",
        "Alles zusammen ca. 10 Minuten köcheln lassen und mit Reis servieren."
    ]},
    { id: 'r006', title: 'Chili con Carne', base: 'reis', tags: ['Fleisch', 'Günstig', 'Eintopf'], estimatedPricePerServing: 2.0, sideSuggestion: 'Brot', ingredients: [
        { category: 'Fleisch & Fisch', name: 'Hackfleisch' }, { category: 'Trockenwaren & Konserven', name: 'Kidneybohnen (Dose)' }, { category: 'Trockenwaren & Konserven', name: 'Gehackte Tomaten (Dose)' }, { category: 'Trockenwaren & Konserven', name: 'Mais (Dose)' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }, { category: 'Obst & Gemüse', name: 'Knoblauch' }
    ], instructions: [
        "Zwiebeln und Knoblauch anbraten, Hackfleisch zugeben und anbraten.",
        "Tomaten, Bohnen und Mais hinzufügen.",
        "Mit Chili, Kreuzkümmel, Salz und Pfeffer würzen.",
        "Mindestens 30 Minuten köcheln lassen.",
        "Mit Reis oder Brot servieren."
    ]},
    { id: 'r007', title: 'Gemüse-Reispfanne', base: 'reis', tags: ['Vegetarisch', 'Schnell', 'Günstig', 'Vegan'], estimatedPricePerServing: 1.8, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Reis' }, { category: 'Obst & Gemüse', name: 'Paprika' }, { category: 'Obst & Gemüse', name: 'Zucchini' }, { category: 'Obst & Gemüse', name: 'Brokkoli' }, { category: 'Trockenwaren & Konserven', name: 'Sojasauce' }
    ], instructions: [
        "Reis kochen.",
        "Gemüse klein schneiden.",
        "Gemüse in einer Pfanne oder Wok anbraten, bis es gar aber noch bissfest ist.",
        "Gekochten Reis hinzufügen und mitbraten.",
        "Mit Sojasauce und Gewürzen abschmecken."
    ]},
    { id: 'r008', title: 'Risotto mit Pilzen', base: 'reis', tags: ['Vegetarisch', 'Pilze', 'Italienisch'], estimatedPricePerServing: 2.6, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Risottoreis' }, { category: 'Obst & Gemüse', name: 'Champignons' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }, { category: 'Gewürze & Öle', name: 'Weißwein' }, { category: 'Gewürze & Öle', name: 'Gemüsebrühe' }, { category: 'Milchprodukte & Eier', name: 'Parmesan' }
    ], instructions: [
        "Zwiebeln und Pilze anbraten.",
        "Risottoreis hinzufügen und glasig dünsten.",
        "Mit Weißwein ablöschen und einkochen lassen.",
        "Nach und nach heiße Gemüsebrühe zugeben und unter Rühren ca. 20 Minuten garen, bis der Reis cremig ist.",
        "Parmesan und Butter unterrühren."
    ]},
    { id: 'r019', title: 'Chicken Teriyaki Bowl', base: 'reis', tags: ['Fleisch', 'Schnell', 'Asiatisch'], estimatedPricePerServing: 3.4, sideSuggestion: 'Edamame', ingredients: [
        { category: 'Fleisch & Fisch', name: 'Hähnchenbrust' }, { category: 'Trockenwaren & Konserven', name: 'Teriyakisauce' }, { category: 'Trockenwaren & Konserven', name: 'Reis' }, { category: 'Obst & Gemüse', name: 'Brokkoli' }, { category: 'Obst & Gemüse', name: 'Karotten' }, { category: 'Trockenwaren & Konserven', name: 'Sesam' }
    ], instructions: [
        "Reis kochen, Brokkoli und Karotten dämpfen oder kochen.",
        "Hähnchen in Streifen schneiden und in einer Pfanne anbraten.",
        "Teriyakisauce hinzufügen und das Hähnchen darin glasieren.",
        "Alles in einer Schüssel anrichten und mit Sesam bestreuen."
    ]},
    { id: 'r023', title: 'Meeresfrüchte-Paella', base: 'reis', tags: ['Fisch', 'Meeresfrüchte'], estimatedPricePerServing: 4.5, isPremium: true, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Paella-Reis' }, { category: 'Fleisch & Fisch', name: 'Meeresfrüchte-Mix (TK)' }, { category: 'Obst & Gemüse', name: 'Paprika' }, { category: 'Trockenwaren & Konserven', name: 'Erbsen (TK)' }, { category: 'Gewürze & Öle', name: 'Safranfäden' }
    ], instructions: [
        "Zwiebeln und Paprika in einer großen Paella-Pfanne anbraten.",
        "Reis hinzufügen und kurz mitbraten.",
        "Mit Brühe und Safran ablöschen.",
        "Köcheln lassen, nach ca. 10 Minuten die Meeresfrüchte und Erbsen hinzufügen.",
        "Weitergaren, bis die Flüssigkeit absorbiert ist."
    ]},
    { id: 'r028', title: 'Gebratener Reis mit Ei', base: 'reis', tags: ['Vegetarisch', 'Schnell', 'Günstig'], estimatedPricePerServing: 1.7, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Reis (vom Vortag)' }, { category: 'Milchprodukte & Eier', name: 'Eier' }, { category: 'Trockenwaren & Konserven', name: 'Erbsen (TK)' }, { category: 'Obst & Gemüse', name: 'Frühlingszwiebeln' }, { category: 'Trockenwaren & Konserven', name: 'Sojasauce' }
    ], instructions: [
        "Eier verquirlen und in einem Wok zu Rührei braten, dann herausnehmen.",
        "Erbsen und Frühlingszwiebeln kurz anbraten.",
        "Kalten Reis hinzufügen und unter Rühren kräftig anbraten.",
        "Ei wieder zugeben, mit Sojasauce abschmecken."
    ]},
    { id: 'r029', title: 'Kichererbsen-Curry', base: 'reis', tags: ['Vegetarisch', 'Vegan', 'Günstig', 'Asiatisch'], estimatedPricePerServing: 1.9, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Kichererbsen (Dose)' }, { category: 'Trockenwaren & Konserven', name: 'Kokosmilch' }, { category: 'Obst & Gemüse', name: 'Spinat' }, { category: 'Gewürze & Öle', name: 'Currypulver' }, { category: 'Trockenwaren & Konserven', name: 'Reis' }
    ], instructions: [
        "Zwiebeln und Knoblauch anbraten, Currypulver hinzufügen und kurz mitrösten.",
        "Mit Kokosmilch und gehackten Tomaten (optional) ablöschen.",
        "Kichererbsen zugeben und ca. 10 Minuten köcheln lassen.",
        "Spinat unterheben und zusammenfallen lassen.",
        "Mit Reis servieren."
    ]},
    // Potatoes
    { id: 'r009', title: 'Kartoffel-Gratin', base: 'kartoffeln', tags: ['Vegetarisch', 'Günstig', 'Ofengericht', 'Käse'], estimatedPricePerServing: 1.6, sideSuggestion: 'Salat', ingredients: [
        { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Milchprodukte & Eier', name: 'Sahne' }, { category: 'Milchprodukte & Eier', name: 'Geriebener Käse' }, { category: 'Obst & Gemüse', name: 'Knoblauch' }, { category: 'Gewürze & Öle', name: 'Muskatnuss' }
    ], instructions: [
        "Kartoffeln in dünne Scheiben schneiden.",
        "Eine Auflaufform mit Knoblauch ausreiben.",
        "Kartoffelscheiben in die Form schichten.",
        "Sahne mit Salz, Pfeffer und Muskat würzen und über die Kartoffeln gießen.",
        "Mit Käse bestreuen und bei 180°C ca. 45-60 Minuten backen."
    ]},
    { id: 'r010', title: 'Bratkartoffeln mit Spiegelei', base: 'kartoffeln', tags: ['Vegetarisch', 'Schnell', 'Günstig'], estimatedPricePerServing: 1.4, ingredients: [
        { category: 'Obst & Gemüse', name: 'Kartoffeln (gekocht)' }, { category: 'Milchprodukte & Eier', name: 'Eier' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }, { category: 'Fleisch & Fisch', name: 'Speck (optional)' }
    ], instructions: [
        "Gekochte Kartoffeln in Scheiben schneiden.",
        "Speck und Zwiebeln in einer Pfanne anbraten.",
        "Kartoffelscheiben hinzufügen und goldbraun und knusprig braten.",
        "In einer zweiten Pfanne Spiegeleier braten und auf den Bratkartoffeln servieren."
    ]},
    { id: 'r011', title: 'Ofenkartoffeln mit Quark', base: 'kartoffeln', tags: ['Vegetarisch', 'Schnell', 'Günstig'], estimatedPricePerServing: 1.2, sideSuggestion: 'Leinöl', ingredients: [
        { category: 'Obst & Gemüse', name: 'Große Kartoffeln' }, { category: 'Milchprodukte & Eier', name: 'Quark' }, { category: 'Obst & Gemüse', name: 'Schnittlauch' }, { category: 'Gewürze & Öle', name: 'Leinöl' }
    ], instructions: [
        "Kartoffeln waschen, mit einer Gabel mehrmals einstechen und im Ofen bei 200°C ca. 1 Stunde backen, bis sie weich sind.",
        "Quark mit Salz, Pfeffer und Schnittlauch verrühren.",
        "Gebackene Kartoffeln aufschneiden und mit dem Quark füllen."
    ]},
    { id: 'r012', title: 'Kartoffelsuppe mit Würstchen', base: 'kartoffeln', tags: ['Fleisch', 'Günstig', 'Eintopf', 'Schwein'], estimatedPricePerServing: 1.8, sideSuggestion: 'Brot', ingredients: [
        { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Obst & Gemüse', name: 'Karotten' }, { category: 'Obst & Gemüse', name: 'Sellerie' }, { category: 'Obst & Gemüse', name: 'Lauch' }, { category: 'Fleisch & Fisch', name: 'Wiener Würstchen' }, { category: 'Gewürze & Öle', name: 'Gemüsebrühe' }
    ], instructions: [
        "Gemüse und Kartoffeln schälen, würfeln und in einem Topf anbraten.",
        "Mit Gemüsebrühe auffüllen und ca. 20 Minuten kochen lassen, bis das Gemüse weich ist.",
        "Einen Teil der Suppe pürieren, um sie sämiger zu machen.",
        "Würstchen in Scheiben schneiden und in der Suppe erhitzen."
    ]},
    { id: 'r020', title: 'Shepherd\'s Pie', base: 'kartoffeln', tags: ['Fleisch', 'Ofengericht', 'Lamm'], estimatedPricePerServing: 3.1, sideSuggestion: 'Grüne Bohnen', ingredients: [
        { category: 'Fleisch & Fisch', name: 'Lammhackfleisch' }, { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Trockenwaren & Konserven', name: 'Erbsen (TK)' }, { category: 'Milchprodukte & Eier', name: 'Butter' }, { category: 'Milchprodukte & Eier', name: 'Milch' }
    ], instructions: [
        "Eine Hackfleischsauce mit Zwiebeln, Karotten und Erbsen kochen.",
        "Kartoffeln kochen und zu Püree verarbeiten.",
        "Die Hackfleischsauce in eine Auflaufform geben.",
        "Das Kartoffelpüree darüber verteilen und mit einer Gabel ein Muster ziehen.",
        "Bei 200°C ca. 20-25 Minuten backen, bis die Oberfläche goldbraun ist."
    ]},
    { id: 'r022', title: 'Rindergulasch', base: 'kartoffeln', tags: ['Fleisch', 'Eintopf'], estimatedPricePerServing: 3.8, isPremium: true, ingredients: [
        { category: 'Fleisch & Fisch', name: 'Rindfleisch (Gulasch)' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }, { category: 'Obst & Gemüse', name: 'Paprika' }, { category: 'Trockenwaren & Konserven', name: 'Tomatenmark' }, { category: 'Gewürze & Öle', name: 'Paprikapulver' }
    ], instructions: [
        "Rindfleisch portionsweise scharf anbraten.",
        "Zwiebeln hinzufügen und anbraten.",
        "Tomatenmark und Paprikapulver zugeben und kurz mitrösten.",
        "Mit Brühe oder Rotwein ablöschen und zugedeckt mindestens 1,5 Stunden schmoren lassen, bis das Fleisch zart ist."
    ]},
    { id: 'r030', title: 'Kartoffelpuffer mit Apfelmus', base: 'kartoffeln', tags: ['Vegetarisch', 'Günstig'], estimatedPricePerServing: 1.3, ingredients: [
        { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Milchprodukte & Eier', name: 'Eier' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }, { category: 'Trockenwaren & Konserven', name: 'Apfelmus' }
    ], instructions: [
        "Kartoffeln und Zwiebeln fein reiben.",
        "Die geriebene Masse gut ausdrücken, um überschüssige Flüssigkeit zu entfernen.",
        "Mit Ei, Salz und Pfeffer vermengen.",
        "Kleine Puffer formen und in heißem Öl von beiden Seiten goldbraun ausbacken.",
        "Mit Apfelmus servieren."
    ]},
    { id: 'r031', title: 'Hähnchenschenkel vom Blech', base: 'kartoffeln', tags: ['Fleisch', 'Ofengericht'], estimatedPricePerServing: 2.5, sideSuggestion: 'Gemüse', ingredients: [
        { category: 'Fleisch & Fisch', name: 'Hähnchenschenkel' }, { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Obst & Gemüse', name: 'Rosmarin' }, { category: 'Obst & Gemüse', name: 'Paprika' }
    ], instructions: [
        "Kartoffeln und Gemüse in mundgerechte Stücke schneiden und auf einem Backblech verteilen.",
        "Hähnchenschenkel würzen.",
        "Alles mit Öl, Salz, Pfeffer und Rosmarin vermengen.",
        "Bei 200°C ca. 40-50 Minuten backen, bis das Hähnchen gar und knusprig ist."
    ]},
    // Mix / Other
    { id: 'r013', title: 'Flammkuchen', base: 'mix', tags: ['Fleisch', 'Schnell', 'Schwein'], estimatedPricePerServing: 2.2, ingredients: [
        { category: 'Backwaren', name: 'Flammkuchenteig' }, { category: 'Milchprodukte & Eier', name: 'Schmand' }, { category: 'Fleisch & Fisch', name: 'Speckwürfel' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }
    ], instructions: [
        "Flammkuchenteig auf einem Backblech ausrollen.",
        "Mit Schmand bestreichen, dabei einen kleinen Rand lassen.",
        "Zwiebeln in feine Ringe schneiden.",
        "Mit Speck und Zwiebeln belegen und bei hoher Hitze (ca. 220°C) 10-15 Minuten knusprig backen."
    ]},
    { id: 'r014', title: 'Gefüllte Paprika', base: 'mix', tags: ['Fleisch', 'Ofengericht'], estimatedPricePerServing: 2.7, sideSuggestion: 'Reis', ingredients: [
        { category: 'Obst & Gemüse', name: 'Paprika' }, { category: 'Fleisch & Fisch', name: 'Hackfleisch' }, { category: 'Trockenwaren & Konserven', name: 'Reis' }, { category: 'Gewürze & Öle', name: 'Tomatensauce' }
    ], instructions: [
        "Reis vorkochen.",
        "Hackfleisch mit Zwiebeln anbraten, mit dem Reis vermengen und würzen.",
        "Paprika halbieren, entkernen und mit der Hackfleisch-Reis-Mischung füllen.",
        "In eine Auflaufform setzen, etwas Tomatensauce angießen und bei 180°C ca. 30 Minuten backen."
    ]},
    { id: 'r015', title: 'Kürbissuppe mit Ingwer', base: 'mix', tags: ['Vegetarisch', 'Günstig', 'Suppe', 'Vegan'], estimatedPricePerServing: 1.5, sideSuggestion: 'Brot', ingredients: [
        { category: 'Obst & Gemüse', name: 'Hokkaido-Kürbis' }, { category: 'Obst & Gemüse', name: 'Ingwer' }, { category: 'Trockenwaren & Konserven', name: 'Kokosmilch' }, { category: 'Gewürze & Öle', name: 'Gemüsebrühe' }
    ], instructions: [
        "Kürbis entkernen und in Stücke schneiden (Hokkaido muss nicht geschält werden).",
        "Kürbis mit Zwiebeln und geriebenem Ingwer in einem Topf andünsten.",
        "Mit Gemüsebrühe ablöschen und ca. 20 Minuten weich kochen.",
        "Suppe fein pürieren, Kokosmilch unterrühren und mit Salz, Pfeffer und Curry abschmecken."
    ]},
    { id: 'r016', title: 'Wraps mit Hähnchen', base: 'mix', tags: ['Fleisch', 'Schnell'], estimatedPricePerServing: 3.0, ingredients: [
        { category: 'Backwaren', name: 'Weizen-Tortillas' }, { category: 'Fleisch & Fisch', name: 'Hähnchenbruststreifen' }, { category: 'Obst & Gemüse', name: 'Salat' }, { category: 'Obst & Gemüse', name: 'Tomaten' }, { category: 'Sonstiges', name: 'Salsa-Sauce' }
    ], instructions: [
        "Hähnchenstreifen anbraten.",
        "Salat und Tomaten waschen und schneiden.",
        "Tortillas kurz erwärmen.",
        "Tortillas mit Salsa, Salat, Tomaten und Hähnchen füllen und aufrollen."
    ]},
    { id: 'r021', title: 'Shakshuka', base: 'mix', tags: ['Vegetarisch', 'Günstig', 'Schnell', 'Pfannengericht'], estimatedPricePerServing: 2.3, sideSuggestion: 'Fladenbrot', ingredients: [
        { category: 'Milchprodukte & Eier', name: 'Eier' }, { category: 'Trockenwaren & Konserven', name: 'Gehackte Tomaten (Dose)' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }, { category: 'Obst & Gemüse', name: 'Paprika' }, { category: 'Milchprodukte & Eier', name: 'Feta' }
    ], instructions: [
        "Zwiebeln und Paprika in einer Pfanne anbraten.",
        "Gehackte Tomaten hinzufügen und mit Kreuzkümmel, Paprikapulver, Salz und Pfeffer würzen. Ca. 10 Minuten köcheln lassen.",
        "Mit einem Löffel kleine Mulden in die Tomatensauce drücken und die Eier hineingleiten lassen.",
        "Bei geschlossenem Deckel ca. 5-8 Minuten garen, bis das Eiweiß gestockt ist.",
        "Mit zerbröseltem Feta und frischen Kräutern servieren."
    ]},
    { id: 'r024', title: 'Pizza Margherita', base: 'mix', tags: ['Vegetarisch', 'Schnell', 'Günstig', 'Käse'], estimatedPricePerServing: 2.0, ingredients: [
        { category: 'Backwaren', name: 'Pizzateig' }, { category: 'Trockenwaren & Konserven', name: 'Passierte Tomaten' }, { category: 'Milchprodukte & Eier', name: 'Mozzarella' }, { category: 'Obst & Gemüse', name: 'Basilikum' }
    ], instructions: [
        "Pizzateig auf einem Backblech ausrollen.",
        "Passierte Tomaten mit Salz, Pfeffer und Oregano würzen und auf dem Teig verteilen.",
        "Mozzarella in Scheiben schneiden und auf der Pizza verteilen.",
        "Im vorgeheizten Ofen bei hoher Temperatur (ca. 220°C) 10-15 Minuten backen.",
        "Vor dem Servieren mit frischem Basilikum belegen."
    ]},
    { id: 'r032', title: 'Linsensalat mit Feta', base: 'mix', tags: ['Vegetarisch', 'Salat', 'Kalt', 'Käse'], estimatedPricePerServing: 2.4, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Berglinsen' }, { category: 'Milchprodukte & Eier', name: 'Feta' }, { category: 'Obst & Gemüse', name: 'Paprika' }, { category: 'Obst & Gemüse', name: 'Frühlingszwiebeln' }
    ], instructions: [
        "Linsen nach Packungsanweisung kochen und abkühlen lassen.",
        "Paprika und Frühlingszwiebeln klein schneiden.",
        "Feta würfeln.",
        "Alle Zutaten mit einem Dressing aus Olivenöl, Essig, Salz und Pfeffer vermengen."
    ]},
    { id: 'r033', title: 'Quesadillas mit Bohnen', base: 'mix', tags: ['Vegetarisch', 'Schnell', 'Käse'], estimatedPricePerServing: 2.1, sideSuggestion: 'Salsa', ingredients: [
        { category: 'Backwaren', name: 'Weizen-Tortillas' }, { category: 'Trockenwaren & Konserven', name: 'Schwarze Bohnen (Dose)' }, { category: 'Milchprodukte & Eier', name: 'Geriebener Käse' }, { category: 'Trockenwaren & Konserven', name: 'Mais (Dose)' }
    ], instructions: [
        "Eine Tortilla in eine Pfanne legen.",
        "Eine Hälfte mit Bohnen, Mais und Käse belegen.",
        "Die andere Hälfte darüber klappen und von beiden Seiten goldbraun braten, bis der Käse geschmolzen ist.",
        "In Stücke schneiden und mit Salsa oder Guacamole servieren."
    ]},
    { id: 'r034', title: 'Rinder-Steak mit Ofengemüse', base: 'mix', tags: ['Fleisch', 'Ofengericht'], estimatedPricePerServing: 5.5, isPremium: true, ingredients: [
        { category: 'Fleisch & Fisch', name: 'Rindersteak' }, { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Obst & Gemüse', name: 'Zucchini' }, { category: 'Obst & Gemüse', name: 'Rosmarin' }
    ], instructions: [
        "Gemüse und Kartoffeln schneiden, mit Öl und Kräutern mischen und auf einem Blech verteilen. Bei 200°C ca. 30 Min. backen.",
        "Steak von beiden Seiten scharf anbraten.",
        "Steak im Ofen auf dem Gemüse für die letzten 5-10 Minuten mitgaren, je nach gewünschter Garstufe.",
        "Steak vor dem Anschneiden kurz ruhen lassen."
    ]},
    { id: 'r035', title: 'Dorade aus dem Ofen', base: 'mix', tags: ['Fisch', 'Ofengericht'], estimatedPricePerServing: 4.8, isPremium: true, sideSuggestion: 'Kartoffeln', ingredients: [
        { category: 'Fleisch & Fisch', name: 'Dorade (ganz)' }, { category: 'Obst & Gemüse', name: 'Zitrone' }, { category: 'Obst & Gemüse', name: 'Knoblauch' }, { category: 'Obst & Gemüse', name: 'Thymian' }
    ], instructions: [
        "Ofen auf 180°C vorheizen.",
        "Dorade waschen und trockentupfen. Haut mehrmals einschneiden.",
        "Fisch innen und außen salzen und pfeffern.",
        "Bauchhöhle mit Zitronenscheiben, Knoblauch und Kräutern füllen.",
        "In einer Auflaufform ca. 20-25 Minuten backen, bis das Fleisch weiß ist."
    ]},
    { id: 'r036', title: 'Linseneintopf', base: 'mix', tags: ['Vegetarisch', 'Eintopf', 'Günstig', 'Vegan'], estimatedPricePerServing: 1.2, sideSuggestion: 'Brot', ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Tellerlinsen' }, { category: 'Obst & Gemüse', name: 'Suppengrün' }, { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Gewürze & Öle', name: 'Essig' }
    ], instructions: [
        "Suppengrün und Kartoffeln würfeln und in einem Topf anbraten.",
        "Linsen hinzufügen und mit Wasser oder Brühe bedecken.",
        "Ca. 45 Minuten köcheln lassen, bis die Linsen weich sind.",
        "Mit Salz, Pfeffer und einem Schuss Essig abschmecken."
    ]},
    { id: 'r037', title: 'Zucchini-Puffer', base: 'mix', tags: ['Vegetarisch', 'Günstig'], estimatedPricePerServing: 1.6, sideSuggestion: 'Quark-Dip', ingredients: [
        { category: 'Obst & Gemüse', name: 'Zucchini' }, { category: 'Milchprodukte & Eier', name: 'Eier' }, { category: 'Backwaren', name: 'Mehl' }, { category: 'Milchprodukte & Eier', name: 'Quark' }
    ], instructions: [
        "Zucchini grob reiben, salzen und 10 Minuten Wasser ziehen lassen. Gut ausdrücken.",
        "Mit Ei, Mehl, Salz und Pfeffer vermengen.",
        "Kleine Puffer formen und in Öl goldbraun ausbacken.",
        "Mit einem Kräuterquark-Dip servieren."
    ]},
    { id: 'r038', title: 'Thai-Basilikum-Hähnchen', base: 'reis', tags: ['Fleisch', 'Asiatisch', 'Scharf', 'Schnell'], estimatedPricePerServing: 3.3, ingredients: [
        { category: 'Fleisch & Fisch', name: 'Hähnchenhackfleisch' }, { category: 'Obst & Gemüse', name: 'Thai-Basilikum' }, { category: 'Obst & Gemüse', name: 'Chilischoten' }, { category: 'Trockenwaren & Konserven', name: 'Fischsauce' }
    ], instructions: [
        "Knoblauch und Chili in einem Wok anbraten.",
        "Hackfleisch hinzufügen und krümelig braten.",
        "Mit einer Sauce aus Sojasauce, Fischsauce und etwas Zucker ablöschen.",
        "Ganz zum Schluss eine große Handvoll Thai-Basilikum unterheben und sofort mit Reis servieren."
    ]},
    { id: 'r039', title: 'Spinat-Ricotta-Cannelloni', base: 'nudeln', tags: ['Vegetarisch', 'Ofengericht', 'Käse'], estimatedPricePerServing: 2.9, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Cannelloni' }, { category: 'Milchprodukte & Eier', name: 'Ricotta' }, { category: 'Obst & Gemüse', name: 'Spinat (TK)' }, { category: 'Trockenwaren & Konserven', name: 'Passierte Tomaten' }
    ], instructions: [
        "Aufgetauten Spinat gut ausdrücken und mit Ricotta, Salz, Pfeffer und Muskat vermischen.",
        "Die Cannelloni-Röhren mit der Masse füllen.",
        "Etwas Tomatensauce in eine Auflaufform geben, die Cannelloni darauflegen.",
        "Mit restlicher Tomatensauce bedecken, mit Käse bestreuen und bei 180°C ca. 30 Min. backen."
    ]},
    { id: 'r040', title: 'Couscous-Salat', base: 'mix', tags: ['Vegetarisch', 'Salat', 'Kalt', 'Schnell', 'Vegan'], estimatedPricePerServing: 2.0, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Couscous' }, { category: 'Obst & Gemüse', name: 'Gurke' }, { category: 'Obst & Gemüse', name: 'Tomaten' }, { category: 'Obst & Gemüse', name: 'Minze' }
    ], instructions: [
        "Couscous mit heißer Gemüsebrühe übergießen und quellen lassen.",
        "Gurke und Tomaten fein würfeln.",
        "Minze fein hacken.",
        "Alles mit dem aufgelockerten Couscous vermengen und mit Zitronensaft, Olivenöl, Salz und Pfeffer abschmecken."
    ]},
    { id: 'r041', title: 'Hähnchen-Pfanne süß-sauer', base: 'reis', tags: ['Fleisch', 'Asiatisch', 'Schnell'], estimatedPricePerServing: 3.1, ingredients: [
        { category: 'Fleisch & Fisch', name: 'Hähnchenbrust' }, { category: 'Obst & Gemüse', name: 'Ananas (frisch oder Dose)' }, { category: 'Obst & Gemüse', name: 'Paprika' }, { category: 'Sonstiges', name: 'Süß-Sauer-Sauce' }
    ], instructions: [
        "Hähnchen würfeln und anbraten.",
        "Paprika und Ananasstücke hinzufügen und kurz mitbraten.",
        "Mit Süß-Sauer-Sauce ablöschen und kurz einköcheln lassen.",
        "Mit Reis servieren."
    ]},
    { id: 'r042', title: 'Tacos mit Hackfleisch', base: 'mix', tags: ['Fleisch', 'Schnell', 'Mexikanisch'], estimatedPricePerServing: 2.8, ingredients: [
        { category: 'Backwaren', name: 'Taco-Schalen' }, { category: 'Fleisch & Fisch', name: 'Hackfleisch' }, { category: 'Sonstiges', name: 'Taco-Gewürz' }, { category: 'Obst & Gemüse', name: 'Salat' }, { category: 'Milchprodukte & Eier', name: 'Sauerrahm' }
    ], instructions: [
        "Hackfleisch anbraten, mit Taco-Gewürz und etwas Wasser würzen und köcheln lassen.",
        "Taco-Schalen im Ofen erwärmen.",
        "Salat, Tomaten, Käse und andere Toppings vorbereiten.",
        "Jeder füllt seine Tacos selbst am Tisch."
    ]},
    { id: 'r043', title: 'Gefüllte Zucchini mit Feta', base: 'mix', tags: ['Vegetarisch', 'Ofengericht', 'Käse'], estimatedPricePerServing: 2.4, sideSuggestion: 'Baguette', ingredients: [
        { category: 'Obst & Gemüse', name: 'Zucchini' }, { category: 'Milchprodukte & Eier', name: 'Feta' }, { category: 'Obst & Gemüse', name: 'Tomaten' }, { category: 'Obst & Gemüse', name: 'Zwiebeln' }
    ], instructions: [
        "Zucchini längs halbieren und aushöhlen.",
        "Das Fruchtfleisch klein schneiden und mit gewürfelten Tomaten, Zwiebeln und Feta vermischen.",
        "Die Zucchinihälften mit der Masse füllen.",
        "Bei 180°C ca. 20-25 Minuten im Ofen backen."
    ]},
    { id: 'r044', title: 'Kartoffel-Lauch-Suppe', base: 'kartoffeln', tags: ['Vegetarisch', 'Suppe', 'Günstig'], estimatedPricePerServing: 1.4, ingredients: [
        { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Obst & Gemüse', name: 'Lauch' }, { category: 'Milchprodukte & Eier', name: 'Sahne' }, { category: 'Gewürze & Öle', name: 'Gemüsebrühe' }
    ], instructions: [
        "Kartoffeln würfeln, Lauch in Ringe schneiden.",
        "Beides in einem Topf andünsten.",
        "Mit Gemüsebrühe ablöschen und weich kochen.",
        "Suppe pürieren, Sahne unterrühren und abschmecken."
    ]},
    { id: 'r045', title: 'Bratwurst mit Kartoffelpüree', base: 'kartoffeln', tags: ['Fleisch', 'Schwein', 'Klassiker'], estimatedPricePerServing: 2.2, sideSuggestion: 'Sauerkraut', ingredients: [
        { category: 'Fleisch & Fisch', name: 'Bratwürste' }, { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Milchprodukte & Eier', name: 'Milch' }, { category: 'Milchprodukte & Eier', name: 'Butter' }
    ], instructions: [
        "Kartoffeln kochen und zu Püree verarbeiten.",
        "Bratwürste in einer Pfanne goldbraun braten.",
        "Optional Sauerkraut erwärmen.",
        "Alles zusammen servieren."
    ]},
    { id: 'r046', title: 'Quiche Lorraine', base: 'mix', tags: ['Fleisch', 'Schwein', 'Ofengericht', 'Käse'], estimatedPricePerServing: 2.6, sideSuggestion: 'Salat', ingredients: [
        { category: 'Backwaren', name: 'Mürbeteig' }, { category: 'Fleisch & Fisch', name: 'Speck' }, { category: 'Milchprodukte & Eier', name: 'Eier' }, { category: 'Milchprodukte & Eier', name: 'Sahne' }
    ], instructions: [
        "Eine Quicheform mit dem Teig auslegen.",
        "Speck anbraten und auf dem Teig verteilen.",
        "Eier und Sahne verquirlen, kräftig mit Salz, Pfeffer und Muskat würzen.",
        "Die Ei-Sahne-Mischung über den Speck gießen.",
        "Bei 180°C ca. 30-40 Minuten backen."
    ]},
    { id: 'r047', title: 'Fish and Chips', base: 'kartoffeln', tags: ['Fisch', 'Klassiker'], estimatedPricePerServing: 3.5, ingredients: [
        { category: 'Fleisch & Fisch', name: 'Kabeljaufilet' }, { category: 'Obst & Gemüse', name: 'Kartoffeln' }, { category: 'Backwaren', name: 'Mehl' }, { category: 'Sonstiges', name: 'Bier' }
    ], instructions: [
        "Kartoffeln in dicke Stifte schneiden und frittieren.",
        "Für den Bierteig Mehl, Bier, Salz und Backpulver vermischen.",
        "Fischfilets durch den Teig ziehen und ebenfalls goldbraun frittieren.",
        "Mit Remoulade und Essig servieren."
    ]},
    { id: 'r048', title: 'Falafel-Wraps mit Hummus', base: 'mix', tags: ['Vegetarisch', 'Vegan', 'Schnell'], estimatedPricePerServing: 2.3, ingredients: [
        { category: 'Backwaren', name: 'Fladenbrot' }, { category: 'Trockenwaren & Konserven', name: 'Falafel (Fertigmischung)' }, { category: 'Sonstiges', name: 'Hummus' }, { category: 'Obst & Gemüse', name: 'Salat' }
    ], instructions: [
        "Falafel nach Packungsanweisung zubereiten (meist frittieren oder im Ofen backen).",
        "Fladenbrot erwärmen.",
        "Mit Hummus bestreichen und mit Falafel und Salat füllen."
    ]},
    { id: 'r049', title: 'Buddha Bowl mit Erdnusssauce', base: 'reis', tags: ['Vegetarisch', 'Vegan', 'Gesund'], estimatedPricePerServing: 3.0, ingredients: [
        { category: 'Trockenwaren & Konserven', name: 'Quinoa' }, { category: 'Obst & Gemüse', name: 'Süßkartoffel' }, { category: 'Trockenwaren & Konserven', name: 'Kichererbsen' }, { category: 'Sonstiges', name: 'Erdnussbutter' }
    ], instructions: [
        "Quinoa kochen. Süßkartoffel würfeln und im Ofen rösten.",
        "Für die Sauce Erdnussbutter mit Sojasauce, Limettensaft, etwas Wasser und Ingwer glatt rühren.",
        "Alle Zutaten (Quinoa, Süßkartoffel, Kichererbsen, frisches Gemüse nach Wahl) in einer Schüssel anrichten.",
        "Mit der Erdnusssauce beträufeln."
    ]},
    { id: 'r050', title: 'Amerikanische Pancakes', base: 'mix', tags: ['Vegetarisch', 'Süßspeise', 'Schnell'], estimatedPricePerServing: 1.5, sideSuggestion: 'Ahornsirup', ingredients: [
        { category: 'Backwaren', name: 'Mehl' }, { category: 'Milchprodukte & Eier', name: 'Eier' }, { category: 'Milchprodukte & Eier', name: 'Milch' }, { category: 'Backwaren', name: 'Backpulver' }, { category: 'Sonstiges', name: 'Ahornsirup' }
    ], instructions: [
        "Trockene Zutaten (Mehl, Zucker, Backpulver, Salz) vermischen.",
        "Flüssige Zutaten (Milch, Ei, geschmolzene Butter) verquirlen und unter die trockenen Zutaten heben.",
        "Kleine, dicke Pfannkuchen in einer Pfanne ausbacken.",
        "Mit Ahornsirup und Früchten servieren."
    ]}
] as const;