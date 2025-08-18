import type { Recipe } from '@/shared/types';

interface OldIngredient {
    category: 'Obst & Gemüse' | 'Fleisch & Fisch' | 'Trockenwaren & Konserven' | 'Milchprodukte & Eier' | 'Backwaren' | 'Gewürze & Öle' | 'Sonstiges';
    name: string;
}

interface OldRecipe {
    id: string;
    title: string;
    link?: string;
    base: 'nudeln' | 'reis' | 'kartoffeln' | 'mix';
    tags: string[];
    estimatedPricePerServing: number;
    sideSuggestion?: string;
    isPremium?: boolean;
    ingredients: OldIngredient[];
    instructions?: string[];
}

// =========================================================================================
// == TEMPORÄRE REZEPTLISTE                                                               ==
// == Fügen Sie hier neue Rezepte ein. Nach erfolgreicher Synchronisierung kann diese     ==
// == Liste wieder geleert werden.                                                        ==
// =========================================================================================
const tempRecipes: readonly OldRecipe[] = [
    { id: 'r_temp_01', title: "Milchreisauflauf mit Apfel ohne Vorkochen", base: 'reis', tags: ['Vegetarisch', 'Süßspeise', 'Ofengericht'], estimatedPricePerServing: 1.8, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '250g Milchreis' }, { category: 'Milchprodukte & Eier', name: '1L Milch' }, { category: 'Milchprodukte & Eier', name: '2 Eier' }, { category: 'Backwaren', name: '100g Zucker' }, { category: 'Obst & Gemüse', name: '3 Äpfel' }, { category: 'Gewürze & Öle', name: 'Zimt' }, { category: 'Milchprodukte & Eier', name: 'Butter für die Form' }
    ], instructions: ["Ofen auf 180°C vorheizen und eine Auflaufform buttern.", "Milchreis, Milch, Zucker und Eier in der Form gut verquirlen.", "Äpfel entkernen, in Spalten schneiden und unter die Reismischung heben.", "Mit Zimt bestreuen und ca. 50-60 Minuten backen, bis der Reis gar ist."] },
    { id: 'r_temp_02', title: "Einfache Kartoffelsuppe", base: 'kartoffeln', tags: ['Vegetarisch', 'Suppe', 'Günstig'], estimatedPricePerServing: 1.5, ingredients: [
        { category: 'Obst & Gemüse', name: '1kg mehlige Kartoffeln' }, { category: 'Obst & Gemüse', name: '2 Karotten' }, { category: 'Obst & Gemüse', name: '1 Stange Lauch' }, { category: 'Obst & Gemüse', name: '1 Zwiebel' }, { category: 'Gewürze & Öle', name: '1.5L Gemüsebrühe' }, { category: 'Milchprodukte & Eier', name: '200ml Sahne' }, { category: 'Obst & Gemüse', name: 'Petersilie' }, { category: 'Fleisch & Fisch', name: '4 Wiener Würstchen (optional)' }
    ], instructions: ["Gemüse und Kartoffeln schälen und würfeln. Zwiebeln in Öl andünsten.", "Restliches Gemüse hinzufügen, kurz mitdünsten.", "Mit Gemüsebrühe ablöschen und 20-25 Minuten kochen lassen, bis alles weich ist.", "Suppe teilweise pürieren, Sahne unterrühren und mit Salz, Pfeffer und Muskat abschmecken.", "Optional Würstchen in Scheiben schneiden und in der Suppe erhitzen. Mit Petersilie garnieren."] },
    { id: 'r_temp_03', title: "Supersaftiger Apfelkuchen", base: 'mix', tags: ['Vegetarisch', 'Süßspeise', 'Kuchen'], estimatedPricePerServing: 1.2, ingredients: [
        { category: 'Obst & Gemüse', name: '1kg Äpfel' }, { category: 'Backwaren', name: '250g Mehl' }, { category: 'Backwaren', name: '200g Zucker' }, { category: 'Milchprodukte & Eier', name: '4 Eier' }, { category: 'Milchprodukte & Eier', name: '200g Butter (weich)' }, { category: 'Backwaren', name: '1 Pck. Backpulver' }, { category: 'Gewürze & Öle', name: '1 TL Zimt' }
    ], instructions: ["Äpfel schälen, entkernen und in kleine Würfel schneiden.", "Butter, Zucker und Eier schaumig schlagen.", "Mehl, Backpulver und Zimt mischen und unter die Eiermasse rühren.", "Apfelwürfel unter den Teig heben.", "In eine gefettete Springform füllen und bei 175°C ca. 50-60 Minuten backen."] },
    { id: 'r_temp_04', title: "Kürbisgulasch", base: 'mix', tags: ['Vegetarisch', 'Eintopf', 'Herbst', 'Vegan'], estimatedPricePerServing: 2.2, ingredients: [
        { category: 'Obst & Gemüse', name: '1 Hokkaido-Kürbis' }, { category: 'Obst & Gemüse', name: '2 Zwiebeln' }, { category: 'Obst & Gemüse', name: '2 rote Paprika' }, { category: 'Trockenwaren & Konserven', name: '400g gehackte Tomaten' }, { category: 'Gewürze & Öle', name: '3 EL Tomatenmark' }, { category: 'Gewürze & Öle', name: '2 EL Paprikapulver' }, { category: 'Gewürze & Öle', name: '500ml Gemüsebrühe' }
    ], instructions: ["Kürbis entkernen und würfeln. Zwiebeln und Paprika ebenfalls würfeln.", "Zwiebeln in Öl anbraten, Tomatenmark und Paprikapulver zugeben und kurz mitrösten.", "Kürbis und Paprika hinzufügen, mit Tomaten und Brühe ablöschen.", "Ca. 20-30 Minuten köcheln lassen, bis das Gemüse weich ist. Mit Salz und Pfeffer abschmecken."] },
    { id: 'r_temp_05', title: "Reis-Gemüse-Pfanne mit Frischkäse", base: 'reis', tags: ['Vegetarisch', 'Schnell', 'Pfannengericht'], estimatedPricePerServing: 2.0, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '250g Reis' }, { category: 'Obst & Gemüse', name: '1 Zucchini' }, { category: 'Obst & Gemüse', name: '1 Paprika' }, { category: 'Obst & Gemüse', name: '1 kleiner Brokkoli' }, { category: 'Milchprodukte & Eier', name: '200g Frischkäse' }, { category: 'Obst & Gemüse', name: 'Kräuter' }
    ], instructions: ["Reis nach Packungsanweisung kochen.", "Gemüse in mundgerechte Stücke schneiden.", "Gemüse in einer Pfanne anbraten, bis es gar aber noch bissfest ist.", "Gekochten Reis und Frischkäse unterrühren, bis eine cremige Sauce entsteht.", "Mit Salz, Pfeffer und Kräutern würzen."] },
    { id: 'r_temp_06', title: "Rindergulasch", base: 'kartoffeln', tags: ['Fleisch', 'Eintopf', 'Klassiker'], estimatedPricePerServing: 3.8, ingredients: [
        { category: 'Fleisch & Fisch', name: '1kg Rindergulasch' }, { category: 'Obst & Gemüse', name: '500g Zwiebeln' }, { category: 'Gewürze & Öle', name: '3 EL Tomatenmark' }, { category: 'Gewürze & Öle', name: '3 EL Paprikapulver edelsüß' }, { category: 'Gewürze & Öle', name: '500ml Rinderbrühe' }, { category: 'Gewürze & Öle', name: '250ml Rotwein (optional)' }
    ], instructions: ["Fleisch portionsweise scharf anbraten und aus dem Topf nehmen.", "Zwiebeln grob würfeln und im gleichen Topf goldbraun anbraten.", "Tomatenmark und Paprikapulver zugeben und kurz mitrösten.", "Mit Rotwein ablöschen, dann Brühe und Fleisch zugeben.", "Zugedeckt mindestens 2 Stunden schmoren lassen, bis das Fleisch zart ist."] },
    { id: 'r_temp_07', title: "Hähnchenschenkel im Backofen mit Gemüse", base: 'kartoffeln', tags: ['Fleisch', 'Ofengericht'], estimatedPricePerServing: 2.7, ingredients: [
        { category: 'Fleisch & Fisch', name: '4 Hähnchenschenkel' }, { category: 'Obst & Gemüse', name: '800g Kartoffeln' }, { category: 'Obst & Gemüse', name: '1 Zucchini' }, { category: 'Obst & Gemüse', name: '2 Paprika' }, { category: 'Gewürze & Öle', name: 'Olivenöl' }, { category: 'Gewürze & Öle', name: 'Rosmarin, Thymian' }
    ], instructions: ["Ofen auf 200°C vorheizen.", "Kartoffeln und Gemüse in Stücke schneiden und auf einem tiefen Backblech verteilen.", "Gemüse mit Öl, Salz, Pfeffer und Kräutern mischen.", "Hähnchenschenkel salzen und pfeffern und auf das Gemüse legen.", "Ca. 45-50 Minuten backen, bis das Hähnchen gar und knusprig ist."] },
    { id: 'r_temp_08', title: "Klassische italienische Lasagne", base: 'nudeln', tags: ['Fleisch', 'Ofengericht', 'Klassiker', 'Italienisch'], estimatedPricePerServing: 3.5, link: "https://www.kitchenstories.com/de/rezepte/klassische-italienische-lasagne", ingredients: [
        { category: 'Trockenwaren & Konserven', name: '12 Lasagneplatten' }, { category: 'Fleisch & Fisch', name: '500g gemischtes Hackfleisch' }, { category: 'Trockenwaren & Konserven', name: '800g gehackte Tomaten' }, { category: 'Milchprodukte & Eier', name: '1L Milch' }, { category: 'Milchprodukte & Eier', name: '50g Butter' }, { category: 'Backwaren', name: '50g Mehl' }, { category: 'Milchprodukte & Eier', name: '150g Parmesan' }
    ], instructions: ["Bolognese-Sauce aus Hackfleisch, Zwiebeln, Karotten und Tomaten kochen.", "Für die Béchamelsauce Butter schmelzen, Mehl einrühren und mit Milch ablöschen. Köcheln lassen bis sie andickt.", "Abwechselnd Bolognese, Béchamel, Lasagneplatten und Parmesan in eine Auflaufform schichten. Mit Béchamel und Parmesan abschließen.", "Bei 180°C ca. 30-40 Minuten goldbraun backen."] },
    { id: 'r_temp_09', title: "Puten-Sahne-Gulasch auf Bandnudeln", base: 'nudeln', tags: ['Fleisch', 'Schnell'], estimatedPricePerServing: 3.1, ingredients: [
        { category: 'Fleisch & Fisch', name: '600g Putenbrust' }, { category: 'Obst & Gemüse', name: '250g Champignons' }, { category: 'Obst & Gemüse', name: '2 Zwiebeln' }, { category: 'Milchprodukte & Eier', name: '200ml Sahne' }, { category: 'Gewürze & Öle', name: '100ml Brühe' }, { category: 'Gewürze & Öle', name: 'Paprikapulver' }, { category: 'Trockenwaren & Konserven', name: '500g Bandnudeln' }
    ], instructions: ["Putenfleisch in Würfel schneiden. Zwiebeln und Champignons schneiden.", "Fleisch in Öl scharf anbraten, dann herausnehmen.", "Zwiebeln und Champignons im Bratfett anbraten.", "Mit Paprikapulver bestäuben, mit Brühe ablöschen und Sahne zugeben.", "Fleisch wieder hinzufügen und alles kurz köcheln lassen. Mit Bandnudeln servieren."] },
    { id: 'r_temp_10', title: "Veganer Birnenkuchen ohne Zucker", base: 'mix', tags: ['Vegan', 'Süßspeise', 'Kuchen', 'Zuckerfrei'], estimatedPricePerServing: 1.9, ingredients: [
        { category: 'Backwaren', name: '250g Dinkelmehl' }, { category: 'Backwaren', name: '100g gemahlene Mandeln' }, { category: 'Trockenwaren & Konserven', name: '150ml Pflanzenmilch' }, { category: 'Gewürze & Öle', name: '100ml Rapsöl' }, { category: 'Obst & Gemüse', name: '3 reife Birnen' }, { category: 'Backwaren', name: '1 Pck. Backpulver' }, { category: 'Sonstiges', name: '100g Dattelsüße oder Erythrit' }
    ], instructions: ["Ofen auf 180°C vorheizen.", "Trockene Zutaten (Mehl, Mandeln, Backpulver, Süße) mischen.", "Pflanzenmilch und Öl hinzufügen und zu einem glatten Teig verrühren.", "Birnen schälen, entkernen, würfeln und unter den Teig heben.", "In eine Kastenform füllen und ca. 45 Minuten backen."] },
    { id: 'r_temp_11', title: "Zuckerfreier Geburtstagskuchen für Kinder", base: 'mix', tags: ['Vegetarisch', 'Süßspeise', 'Kuchen', 'Zuckerfrei', 'Kinder'], estimatedPricePerServing: 2.0, ingredients: [
        { category: 'Obst & Gemüse', name: '300g Karotten' }, { category: 'Backwaren', name: '200g Dinkelvollkornmehl' }, { category: 'Backwaren', name: '150g gemahlene Haselnüsse' }, { category: 'Milchprodukte & Eier', name: '3 Eier' }, { category: 'Obst & Gemüse', name: '150g Apfelmus (ungesüßt)' }, { category: 'Backwaren', name: '2 TL Backpulver' }, { category: 'Milchprodukte & Eier', name: '200g Frischkäse (für Frosting)' }
    ], instructions: ["Karotten fein reiben.", "Eier mit Apfelmus verquirlen.", "Mehl, Nüsse und Backpulver mischen und unter die Eimasse rühren. Karotten unterheben.", "Teig in eine Springform füllen und bei 180°C ca. 40 Minuten backen.", "Für das Frosting Frischkäse glatt rühren und auf dem abgekühlten Kuchen verteilen."] },
    { id: 'r_temp_12', title: "Kartoffel-Brokkoli-Auflauf", base: 'kartoffeln', tags: ['Vegetarisch', 'Ofengericht', 'Käse'], estimatedPricePerServing: 2.1, ingredients: [
        { category: 'Obst & Gemüse', name: '1kg Kartoffeln' }, { category: 'Obst & Gemüse', name: '500g Brokkoli' }, { category: 'Milchprodukte & Eier', name: '200ml Sahne' }, { category: 'Milchprodukte & Eier', name: '100ml Milch' }, { category: 'Milchprodukte & Eier', name: '150g geriebener Käse' }, { category: 'Gewürze & Öle', name: 'Muskatnuss' }
    ], instructions: ["Kartoffeln schälen, in Scheiben schneiden und 10 Minuten vorkochen. Brokkoli in Röschen teilen und 5 Minuten mitkochen.", "Abgetropftes Gemüse in eine Auflaufform schichten.", "Sahne und Milch mischen, mit Salz, Pfeffer und Muskat würzen und über das Gemüse gießen.", "Mit Käse bestreuen und bei 200°C ca. 20-25 Minuten goldbraun backen."] },
    { id: 'r_temp_13', title: "Reis-Hackfleisch-Pfanne mit Paprika", base: 'reis', tags: ['Fleisch', 'Schnell', 'Pfannengericht'], estimatedPricePerServing: 2.5, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '250g Reis' }, { category: 'Fleisch & Fisch', name: '500g Hackfleisch' }, { category: 'Obst & Gemüse', name: '2 Paprika (verschiedene Farben)' }, { category: 'Obst & Gemüse', name: '1 Zwiebel' }, { category: 'Trockenwaren & Konserven', name: '1 Dose Mais' }, { category: 'Gewürze & Öle', name: '200ml Brühe' }
    ], instructions: ["Reis kochen.", "Zwiebel würfeln, Paprika in Streifen schneiden.", "Hackfleisch in einer großen Pfanne krümelig anbraten. Zwiebeln und Paprika zugeben und mitbraten.", "Mais und Brühe hinzufügen, kurz köcheln lassen.", "Gekochten Reis unterrühren und alles mit Salz, Pfeffer und Paprikapulver abschmecken."] },
    { id: 'r_temp_14', title: 'Hackbällchen Toskana', base: 'reis', tags: ['Fleisch', 'Ofengericht', 'Italienisch', 'Käse'], estimatedPricePerServing: 3.3, ingredients: [
        { category: 'Fleisch & Fisch', name: '500g gemischtes Hackfleisch' }, { category: 'Trockenwaren & Konserven', name: '50g getrocknete Tomaten' }, { category: 'Milchprodukte & Eier', name: '200ml Sahne' }, { category: 'Trockenwaren & Konserven', name: '400g passierte Tomaten' }, { category: 'Milchprodukte & Eier', name: '150g Mozzarella' }
    ], instructions: ["Hackfleisch mit Salz, Pfeffer und gehackten getrockneten Tomaten mischen und zu Bällchen formen.", "Hackbällchen in einer Pfanne rundherum anbraten.", "Passierte Tomaten und Sahne in eine Auflaufform geben, würzen und vermischen.", "Hackbällchen in die Sauce setzen, mit Mozzarella belegen und bei 200°C ca. 20 Minuten backen."] },
    { id: 'r_temp_15', title: 'Rote Linsen Bolognese mit Pasta', base: 'nudeln', tags: ['Vegetarisch', 'Vegan', 'Günstig'], estimatedPricePerServing: 1.5, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '250g rote Linsen' }, { category: 'Obst & Gemüse', name: '1 Zwiebel' }, { category: 'Obst & Gemüse', name: '2 Karotten' }, { category: 'Trockenwaren & Konserven', name: '800g gehackte Tomaten' }, { category: 'Gewürze & Öle', name: '500ml Gemüsebrühe' }, { category: 'Trockenwaren & Konserven', name: '500g Pasta' }
    ], instructions: ["Zwiebel und Karotten fein würfeln und in Öl andünsten.", "Linsen hinzufügen und kurz mitbraten.", "Mit Tomaten und Brühe ablöschen und ca. 15 Minuten köcheln lassen, bis die Linsen gar sind.", "Mit italienischen Kräutern, Salz und Pfeffer abschmecken und zu Pasta servieren."] },
    { id: 'r_temp_16', title: 'Paella mit Hähnchen und Erbsen', base: 'reis', tags: ['Fleisch', 'Pfannengericht', 'Spanisch'], estimatedPricePerServing: 3.6, ingredients: [
        { category: 'Fleisch & Fisch', name: '400g Hähnchenbrust' }, { category: 'Trockenwaren & Konserven', name: '300g Paella-Reis' }, { category: 'Gewürze & Öle', name: '1g Safranfäden' }, { category: 'Trockenwaren & Konserven', name: '150g Erbsen (TK)' }, { category: 'Obst & Gemüse', name: '1 rote Paprika' }, { category: 'Gewürze & Öle', name: '1L Hühnerbrühe' }
    ], instructions: ["Hähnchen würfeln und in einer großen Pfanne anbraten, dann herausnehmen.", "Paprika und Zwiebeln in der Pfanne anbraten.", "Reis hinzufügen und glasig dünsten. Safran unterrühren.", "Mit heißer Brühe aufgießen, salzen und aufkochen lassen. Nicht mehr rühren.", "Ca. 10 Minuten köcheln lassen, dann Hähnchen und Erbsen darauf verteilen und weitere 10 Minuten garen, bis die Flüssigkeit absorbiert ist."] },
    { id: 'r_temp_17', title: 'Apfelpfannküchlein', base: 'mix', tags: ['Vegetarisch', 'Süßspeise', 'Schnell'], estimatedPricePerServing: 1.4, ingredients: [
        { category: 'Obst & Gemüse', name: '2 große Äpfel' }, { category: 'Backwaren', name: '200g Mehl' }, { category: 'Milchprodukte & Eier', name: '2 Eier' }, { category: 'Milchprodukte & Eier', name: '250ml Milch' }, { category: 'Gewürze & Öle', name: 'Zimt & Zucker' }
    ], instructions: ["Mehl, Eier und Milch zu einem glatten Teig verrühren.", "Äpfel schälen, entkernen und in Ringe schneiden.", "Apfelringe durch den Teig ziehen und in einer Pfanne mit Butter von beiden Seiten goldbraun ausbacken.", "Noch heiß in Zimt & Zucker wälzen."] },
    { id: 'r_temp_18', title: 'Italienischer Auberginenauflauf', base: 'mix', tags: ['Vegetarisch', 'Ofengericht', 'Italienisch', 'Käse'], estimatedPricePerServing: 2.8, ingredients: [
        { category: 'Obst & Gemüse', name: '2 Auberginen' }, { category: 'Trockenwaren & Konserven', name: '800g passierte Tomaten' }, { category: 'Milchprodukte & Eier', name: '250g Mozzarella' }, { category: 'Milchprodukte & Eier', name: '100g Parmesan' }, { category: 'Obst & Gemüse', name: 'Basilikum' }
    ], instructions: ["Auberginen in Scheiben schneiden, salzen und Wasser ziehen lassen. Trockentupfen und in Olivenöl anbraten.", "Eine einfache Tomatensauce aus passierten Tomaten, Knoblauch und Basilikum kochen.", "Auberginen, Tomatensauce, Mozzarellascheiben und Parmesan in eine Auflaufform schichten.", "Bei 180°C ca. 30 Minuten backen, bis der Käse goldbraun ist."] },
    { id: 'r_temp_19', title: 'Hähnchen mit Erbsen und Senf-Sahne-Sauce', base: 'reis', tags: ['Fleisch', 'Schnell', 'Pfannengericht'], estimatedPricePerServing: 2.9, ingredients: [
        { category: 'Fleisch & Fisch', name: '500g Hähnchengeschnetzeltes' }, { category: 'Trockenwaren & Konserven', name: '200g Erbsen (TK)' }, { category: 'Milchprodukte & Eier', name: '200ml Sahne' }, { category: 'Gewürze & Öle', name: '2 EL grober Senf' }, { category: 'Gewürze & Öle', name: '100ml Brühe' }
    ], instructions: ["Hähnchenfleisch in einer Pfanne anbraten und herausnehmen.", "Zwiebelwürfel im Bratfett andünsten.", "Mit Brühe ablöschen, Sahne und Senf einrühren und aufkochen.", "Erbsen und Hähnchen zugeben und einige Minuten in der Sauce gar ziehen lassen. Mit Reis oder Nudeln servieren."] },
    { id: 'r_temp_20', title: 'Reispfanne', base: 'reis', tags: ['Vegetarisch', 'Schnell', 'Pfannengericht', 'Vegan'], estimatedPricePerServing: 1.8, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '250g Reis' }, { category: 'Trockenwaren & Konserven', name: '500g TK-Pfannengemüse' }, { category: 'Obst & Gemüse', name: '1 Zwiebel' }, { category: 'Trockenwaren & Konserven', name: 'Sojasauce' }
    ], instructions: ["Reis kochen.", "Zwiebel würfeln und in einer großen Pfanne anbraten.", "TK-Gemüse hinzufügen und garen, bis es aufgetaut und bissfest ist.", "Gekochten Reis unterrühren und alles zusammen einige Minuten braten.", "Mit Sojasauce und Pfeffer abschmecken."] },
    { id: 'r_temp_21', title: 'Nudeln mit Lachs-Sahne-Sauce', base: 'nudeln', tags: ['Fisch', 'Schnell'], estimatedPricePerServing: 3.4, ingredients: [
        { category: 'Fleisch & Fisch', name: '300g Lachsfilet (ohne Haut)' }, { category: 'Trockenwaren & Konserven', name: '500g Bandnudeln' }, { category: 'Milchprodukte & Eier', name: '200ml Sahne' }, { category: 'Obst & Gemüse', name: '1 Zwiebel' }, { category: 'Obst & Gemüse', name: 'Dill' }
    ], instructions: ["Nudeln kochen.", "Lachs in Würfel schneiden. Zwiebel fein hacken.", "Zwiebel in Butter glasig dünsten.", "Lachs zugeben und kurz mitbraten, bis er gerade gar ist.", "Mit Sahne ablöschen, Dill unterrühren und mit Salz und Pfeffer abschmecken. Mit den Nudeln vermischen."] },
    { id: 'r_temp_22', title: 'Ofenkartoffeln', base: 'kartoffeln', tags: ['Vegetarisch', 'Ofengericht', 'Günstig', 'Vegan'], estimatedPricePerServing: 1.6, ingredients: [
        { category: 'Obst & Gemüse', name: '1kg festkochende Kartoffeln' }, { category: 'Obst & Gemüse', name: '2 Paprika' }, { category: 'Obst & Gemüse', name: '1 Zucchini' }, { category: 'Gewürze & Öle', name: 'Olivenöl' }, { category: 'Gewürze & Öle', name: 'Rosmarin' }
    ], instructions: ["Ofen auf 200°C vorheizen.", "Kartoffeln und Gemüse in mundgerechte Stücke oder Spalten schneiden.", "Alles auf einem Backblech verteilen, mit Olivenöl, Salz, Pfeffer und Rosmarin gut vermischen.", "Ca. 30-40 Minuten backen, bis die Kartoffeln goldbraun und gar sind. Dazu passt ein Kräuterquark."] },
    { id: 'r_temp_23', title: 'Gebratener Reis', base: 'reis', tags: ['Vegetarisch', 'Schnell', 'Günstig'], estimatedPricePerServing: 1.7, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '300g Reis (vom Vortag)' }, { category: 'Milchprodukte & Eier', name: '3 Eier' }, { category: 'Trockenwaren & Konserven', name: '150g Erbsen (TK)' }, { category: 'Obst & Gemüse', name: '2 Karotten' }, { category: 'Trockenwaren & Konserven', name: 'Sojasauce' }
    ], instructions: ["Karotten fein würfeln.", "Eier verquirlen und in einem Wok zu Rührei braten, dann herausnehmen.", "Karotten und Erbsen kurz anbraten.", "Kalten Reis hinzufügen und unter Rühren kräftig anbraten.", "Ei wieder zugeben und alles mit Sojasauce abschmecken."] },
    { id: 'r_temp_24', title: 'Hähnchen-Reis-Pfanne mit Brokkoli und Mais', base: 'reis', tags: ['Fleisch', 'Schnell', 'Pfannengericht'], estimatedPricePerServing: 2.6, ingredients: [
        { category: 'Fleisch & Fisch', name: '400g Hähnchenbrust' }, { category: 'Trockenwaren & Konserven', name: '250g Reis' }, { category: 'Obst & Gemüse', name: '300g Brokkoli' }, { category: 'Trockenwaren & Konserven', name: '1 Dose Mais' }, { category: 'Milchprodukte & Eier', name: '100ml Sahne' }
    ], instructions: ["Reis kochen. Brokkoli in Röschen teilen und kurz blanchieren.", "Hähnchen würfeln und in einer Pfanne anbraten.", "Brokkoli und Mais zugeben und kurz mitbraten.", "Mit Sahne und etwas Brühe ablöschen, kurz köcheln lassen.", "Gekochten Reis unterheben und alles gut vermischen."] },
    { id: 'r_temp_25', title: 'Gnocchi-Auflauf', base: 'kartoffeln', tags: ['Vegetarisch', 'Ofengericht', 'Käse', 'Schnell'], estimatedPricePerServing: 2.5, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '1kg Gnocchi (Kühlregal)' }, { category: 'Trockenwaren & Konserven', name: '800g gehackte Tomaten' }, { category: 'Obst & Gemüse', name: '200g Cherrytomaten' }, { category: 'Milchprodukte & Eier', name: '250g Mozzarella' }, { category: 'Obst & Gemüse', name: '1 Zwiebel' }
    ], instructions: ["Zwiebel anbraten, gehackte Tomaten zugeben und mit Salz, Pfeffer und italienischen Kräutern würzen.", "Gnocchi und halbierte Cherrytomaten zur Sauce geben und vermischen.", "Alles in eine Auflaufform füllen.", "Mit Mozzarella belegen und bei 200°C ca. 15-20 Minuten backen."] },
    { id: 'r_temp_26', title: 'Ratatouille', base: 'mix', tags: ['Vegetarisch', 'Vegan', 'Ofengericht', 'Gesund'], estimatedPricePerServing: 2.3, ingredients: [
        { category: 'Obst & Gemüse', name: '1 Aubergine' }, { category: 'Obst & Gemüse', name: '1 Zucchini' }, { category: 'Obst & Gemüse', name: '2 Paprika' }, { category: 'Trockenwaren & Konserven', name: '400g gehackte Tomaten' }, { category: 'Gewürze & Öle', name: 'Kräuter der Provence' }
    ], instructions: ["Gemüse in gleichmäßige Würfel schneiden.", "Zwiebel und Knoblauch in einem großen Topf andünsten.", "Das restliche Gemüse nach und nach zugeben und mit anbraten (erst Aubergine & Paprika, dann Zucchini).", "Mit gehackten Tomaten ablöschen, Kräuter hinzufügen.", "Zugedeckt ca. 20-30 Minuten schmoren lassen. Schmeckt am nächsten Tag noch besser."] },
    { id: 'r_temp_27', title: 'Klassisches Putenbrustgulasch', base: 'reis', tags: ['Fleisch', 'Eintopf'], estimatedPricePerServing: 3.0, ingredients: [
        { category: 'Fleisch & Fisch', name: '800g Putenbrust' }, { category: 'Obst & Gemüse', name: '3 Zwiebeln' }, { category: 'Obst & Gemüse', name: '2 rote Paprika' }, { category: 'Gewürze & Öle', name: '3 EL Tomatenmark' }, { category: 'Gewürze & Öle', name: '3 EL Paprikapulver edelsüß' }, { category: 'Gewürze & Öle', name: '500ml Hühnerbrühe' }
    ], instructions: ["Putenbrust würfeln. Zwiebeln und Paprika ebenfalls würfeln.", "Fleisch in Öl scharf anbraten und herausnehmen.", "Zwiebeln und Paprika im Bratfett andünsten.", "Tomatenmark und Paprikapulver zugeben, kurz mitrösten.", "Mit Brühe ablöschen, Fleisch wieder zugeben und ca. 20-25 Minuten köcheln lassen. Mit Reis oder Nudeln servieren."] },
    { id: 'r_temp_28', title: 'Blumenkohlauflauf mit Kartoffeln', base: 'kartoffeln', tags: ['Vegetarisch', 'Ofengericht', 'Käse', 'Günstig'], estimatedPricePerServing: 2.2, ingredients: [
        { category: 'Obst & Gemüse', name: '1 großer Blumenkohl' }, { category: 'Obst & Gemüse', name: '800g Kartoffeln' }, { category: 'Milchprodukte & Eier', name: '200ml Sahne' }, { category: 'Milchprodukte & Eier', name: '150g geriebener Käse' }, { category: 'Milchprodukte & Eier', name: '50g Butter' }, { category: 'Backwaren', name: '50g Mehl' }
    ], instructions: ["Blumenkohl und Kartoffeln in Salzwasser bissfest vorkochen.", "Aus Butter, Mehl, Milch und Kochwasser eine Béchamelsauce zubereiten.", "Gemüse in eine Auflaufform geben, mit der Sauce übergießen.", "Mit Käse bestreuen und bei 200°C ca. 20 Minuten goldbraun backen."] },
];
// =========================================================================================

const oldRecipes: readonly OldRecipe[] = [
    // Pasta
    { id: 'r001', title: 'Spaghetti Bolognese', base: 'nudeln', tags: ['Fleisch', 'Klassiker', 'Italienisch'], estimatedPricePerServing: 2.8, sideSuggestion: 'Salat', ingredients: [
        { category: 'Fleisch & Fisch', name: '500g Hackfleisch (Rind)' }, { category: 'Obst & Gemüse', name: '2 Zwiebeln' }, { category: 'Obst & Gemüse', name: '2 Karotten' }, { category: 'Obst & Gemüse', name: '1 Stange Sellerie' }, { category: 'Obst & Gemüse', name: '2 Zehen Knoblauch' }, { category: 'Trockenwaren & Konserven', name: '800g Passierte Tomaten' }, { category: 'Trockenwaren & Konserven', name: '2 EL Tomatenmark' }, { category: 'Trockenwaren & Konserven', name: '500g Spaghetti' }, { category: 'Gewürze & Öle', name: 'Olivenöl' }, { category: 'Gewürze & Öle', name: '100ml Rotwein (optional)' }, { category: 'Gewürze & Öle', name: 'Italienische Kräuter' }
    ], instructions: [
        "Gemüse klein schneiden und in Olivenöl andünsten.",
        "Hackfleisch zugeben und krümelig anbraten.",
        "Tomatenmark kurz mitrösten, optional mit Rotwein ablöschen.",
        "Passierte Tomaten und Gewürze hinzufügen und mindestens 30 Minuten köcheln lassen.",
        "Spaghetti nach Packungsanweisung kochen und mit der Sauce servieren."
    ]},
    { id: 'r002', title: 'Pesto-Nudeln mit Tomaten', base: 'nudeln', tags: ['Vegetarisch', 'Schnell', 'Günstig', 'Italienisch'], estimatedPricePerServing: 1.9, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '500g Nudeln (Penne o.ä.)' }, { category: 'Trockenwaren & Konserven', name: '1 Glas Grünes Pesto' }, { category: 'Obst & Gemüse', name: '250g Cherrytomaten' }, { category: 'Milchprodukte & Eier', name: '50g Parmesan' }, { category: 'Trockenwaren & Konserven', name: '50g Pinienkerne' }
    ], instructions: [
        "Nudeln nach Packungsanweisung kochen.",
        "Pinienkerne in einer Pfanne ohne Fett goldbraun rösten.",
        "Cherrytomaten halbieren.",
        "Nudeln abgießen, etwas Nudelwasser auffangen.",
        "Nudeln mit Pesto, Tomaten und etwas Nudelwasser vermengen, mit Parmesan und Pinienkernen servieren."
    ]},
    { id: 'r003', title: 'Linsen-Bolognese', base: 'nudeln', tags: ['Vegetarisch', 'Günstig', 'Vegan'], estimatedPricePerServing: 1.5, sideSuggestion: 'Salat', ingredients: [
        { category: 'Trockenwaren & Konserven', name: '250g Rote Linsen' }, { category: 'Obst & Gemüse', name: '2 Zwiebeln' }, { category: 'Obst & Gemüse', name: '2 Karotten' }, { category: 'Trockenwaren & Konserven', name: '800g Gehackte Tomaten (Dose)' }, { category: 'Trockenwaren & Konserven', name: '500g Spaghetti' }, { category: 'Gewürze & Öle', name: '500ml Gemüsebrühe' }
    ], instructions: [
        "Zwiebeln und Karotten fein würfeln und in Öl anbraten.",
        "Linsen hinzufügen und kurz mitbraten.",
        "Mit gehackten Tomaten und Gemüsebrühe ablöschen.",
        "Ca. 15-20 Minuten köcheln lassen, bis die Linsen gar sind.",
        "Mit Salz, Pfeffer und Kräutern abschmecken und zu Nudeln servieren."
    ]},
    { id: 'r004', title: 'Lachs-Sahne-Gratin', base: 'nudeln', tags: ['Fisch', 'Ofengericht'], estimatedPricePerServing: 3.5, isPremium: true, ingredients: [
        { category: 'Fleisch & Fisch', name: '500g Lachsfilet' }, { category: 'Trockenwaren & Konserven', name: '250g Bandnudeln' }, { category: 'Milchprodukte & Eier', name: '200ml Sahne' }, { category: 'Obst & Gemüse', name: '1 Stange Lauch' }, { category: 'Milchprodukte & Eier', name: '100g Geriebener Käse' }, { category: 'Obst & Gemüse', name: 'Dill' }
    ], instructions: [
        "Nudeln vorkochen. Lachs würfeln, Lauch in Ringe schneiden.",
        "Nudeln, Lachs und Lauch in eine Auflaufform geben.",
        "Sahne mit Salz, Pfeffer und Dill verrühren und darüber gießen.",
        "Mit Käse bestreuen und bei 180°C ca. 20-25 Minuten goldbraun backen."
    ]},
    { id: 'r017', title: 'Lasagne al Forno', base: 'nudeln', tags: ['Fleisch', 'Ofengericht', 'Klassiker'], estimatedPricePerServing: 3.2, sideSuggestion: 'Grüner Salat', ingredients: [
        { category: 'Trockenwaren & Konserven', name: '12 Lasagneplatten' }, { category: 'Fleisch & Fisch', name: '500g Hackfleisch' }, { category: 'Milchprodukte & Eier', name: '1L Milch' }, { category: 'Milchprodukte & Eier', name: '50g Butter' }, { category: 'Backwaren', name: '50g Mehl' }, { category: 'Milchprodukte & Eier', name: '150g Geriebener Käse (z.B. Gouda)' }, { category: 'Milchprodukte & Eier', name: '50g Parmesan' }
    ], instructions: [
        "Bolognese-Sauce zubereiten (siehe Rezept r001).",
        "Für die Béchamelsauce Butter schmelzen, Mehl einrühren und mit Milch ablöschen. Unter Rühren aufkochen lassen, bis sie andickt.",
        "Abwechselnd Bolognese, Béchamel und Lasagneplatten in eine Auflaufform schichten. Mit Béchamel abschließen.",
        "Mit Käse bestreuen und bei 180°C ca. 30-40 Minuten backen."
    ]},
    { id: 'r018', title: 'Käsespätzle mit Röstzwiebeln', base: 'nudeln', tags: ['Vegetarisch', 'Günstig', 'Käse'], estimatedPricePerServing: 2.1, sideSuggestion: 'Gurkensalat', ingredients: [
        { category: 'Milchprodukte & Eier', name: '1kg Spätzle (Kühlregal)' }, { category: 'Milchprodukte & Eier', name: '200g Bergkäse' }, { category: 'Milchprodukte & Eier', name: '150g Emmentaler' }, { category: 'Obst & Gemüse', name: '2 große Zwiebeln' }, { category: 'Sonstiges', name: 'Röstzwiebeln' }
    ], instructions: [
        "Zwiebeln in Ringe schneiden und in Butter goldbraun braten.",
        "Spätzle in einer Pfanne anbraten.",
        "Käse reiben und abwechselnd mit den Spätzle in eine Schüssel schichten.",
        "Mit den gebratenen Zwiebeln und Röstzwiebeln garnieren."
    ]},
    { id: 'r025', title: 'Pasta aglio e olio', base: 'nudeln', tags: ['Vegetarisch', 'Schnell', 'Günstig', 'Vegan'], estimatedPricePerServing: 1.2, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '500g Spaghetti' }, { category: 'Obst & Gemüse', name: '4-6 Zehen Knoblauch' }, { category: 'Gewürze & Öle', name: '100ml Olivenöl' }, { category: 'Gewürze & Öle', name: '1 TL Chiliflocken' }, { category: 'Obst & Gemüse', name: '1 Bund Petersilie' }
    ], instructions: [
        "Spaghetti kochen.",
        "Knoblauch in feine Scheiben schneiden.",
        "Reichlich Olivenöl in einer Pfanne erhitzen, Knoblauch und Chili darin sanft anbraten, bis der Knoblauch leicht golden ist.",
        "Nudeln abtropfen lassen, in die Pfanne geben, durchschwenken und mit gehackter Petersilie servieren."
    ]},
    { id: 'r026', title: 'Carbonara (Original)', base: 'nudeln', tags: ['Fleisch', 'Schwein', 'Klassiker'], estimatedPricePerServing: 2.9, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '400g Spaghetti' }, { category: 'Fleisch & Fisch', name: '150g Guanciale (oder Pancetta)' }, { category: 'Milchprodukte & Eier', name: '4 Eigelb' }, { category: 'Milchprodukte & Eier', name: '100g Pecorino Romano' }, { category: 'Gewürze & Öle', name: 'Schwarzer Pfeffer' }
    ], instructions: [
        "Guanciale in Würfel schneiden und in einer Pfanne knusprig auslassen.",
        "Eigelb mit geriebenem Pecorino und viel schwarzem Pfeffer verquirlen.",
        "Spaghetti kochen, abgießen (etwas Kochwasser aufbewahren) und in die Pfanne zum Speck geben.",
        "Pfanne vom Herd nehmen, die Ei-Käse-Mischung unterrühren. Bei Bedarf etwas Nudelwasser zugeben, um eine cremige Sauce zu erhalten."
    ]},
    { id: 'r027', title: 'Gnocchi in Salbeibutter', base: 'kartoffeln', tags: ['Vegetarisch', 'Schnell'], estimatedPricePerServing: 2.4, sideSuggestion: 'Parmesan', ingredients: [
        { category: 'Trockenwaren & Konserven', name: '1kg Gnocchi' }, { category: 'Milchprodukte & Eier', name: '100g Butter' }, { category: 'Obst & Gemüse', name: '1 Bund Salbei (frisch)' }, { category: 'Milchprodukte & Eier', name: 'Parmesan' }
    ], instructions: [
        "Gnocchi nach Packungsanweisung kochen.",
        "Butter in einer Pfanne schmelzen, Salbeiblätter hinzufügen und knusprig braten.",
        "Gnocchi abtropfen lassen und in der Salbeibutter schwenken.",
        "Mit frisch geriebenem Parmesan servieren."
    ]},
    // Rice
    { id: 'r005', title: 'Hähnchen-Curry', base: 'reis', tags: ['Fleisch', 'Asiatisch', 'Scharf'], estimatedPricePerServing: 2.9, sideSuggestion: 'Naan-Brot', ingredients: [
        { category: 'Fleisch & Fisch', name: '500g Hähnchenbrust' }, { category: 'Trockenwaren & Konserven', name: '400ml Kokosmilch' }, { category: 'Trockenwaren & Konserven', name: '2-3 EL Rote Currypaste' }, { category: 'Obst & Gemüse', name: '1 rote Paprika' }, { category: 'Obst & Gemüse', name: '1 Zucchini' }, { category: 'Trockenwaren & Konserven', name: '300g Basmatireis' }
    ], instructions: [
        "Reis kochen.",
        "Hähnchen in Würfel und Gemüse in Stücke schneiden.",
        "Hähnchen in einer Pfanne anbraten, dann Gemüse hinzufügen und mitbraten.",
        "Currypaste kurz mitrösten, dann mit Kokosmilch ablöschen.",
        "Alles zusammen ca. 10 Minuten köcheln lassen und mit Reis servieren."
    ]},
    { id: 'r006', title: 'Chili con Carne', base: 'reis', tags: ['Fleisch', 'Günstig', 'Eintopf'], estimatedPricePerServing: 2.0, sideSuggestion: 'Brot', ingredients: [
        { category: 'Fleisch & Fisch', name: '500g Hackfleisch' }, { category: 'Trockenwaren & Konserven', name: '1 Dose Kidneybohnen' }, { category: 'Trockenwaren & Konserven', name: '800g Gehackte Tomaten (Dose)' }, { category: 'Trockenwaren & Konserven', name: '1 Dose Mais' }, { category: 'Obst & Gemüse', name: '2 Zwiebeln' }, { category: 'Obst & Gemüse', name: '2 Zehen Knoblauch' }
    ], instructions: [
        "Zwiebeln und Knoblauch anbraten, Hackfleisch zugeben und anbraten.",
        "Tomaten, Bohnen und Mais hinzufügen.",
        "Mit Chili, Kreuzkümmel, Salz und Pfeffer würzen.",
        "Mindestens 30 Minuten köcheln lassen.",
        "Mit Reis oder Brot servieren."
    ]},
    { id: 'r007', title: 'Gemüse-Reispfanne', base: 'reis', tags: ['Vegetarisch', 'Schnell', 'Günstig', 'Vegan'], estimatedPricePerServing: 1.8, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '300g Reis' }, { category: 'Obst & Gemüse', name: '1 Paprika' }, { category: 'Obst & Gemüse', name: '1 Zucchini' }, { category: 'Obst & Gemüse', name: '1 kleiner Brokkoli' }, { category: 'Trockenwaren & Konserven', name: 'Sojasauce' }
    ], instructions: [
        "Reis kochen.",
        "Gemüse klein schneiden.",
        "Gemüse in einer Pfanne oder Wok anbraten, bis es gar aber noch bissfest ist.",
        "Gekochten Reis hinzufügen und mitbraten.",
        "Mit Sojasauce und Gewürzen abschmecken."
    ]},
    { id: 'r008', title: 'Risotto mit Pilzen', base: 'reis', tags: ['Vegetarisch', 'Pilze', 'Italienisch'], estimatedPricePerServing: 2.6, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '300g Risottoreis' }, { category: 'Obst & Gemüse', name: '400g Champignons' }, { category: 'Obst & Gemüse', name: '1 Zwiebel' }, { category: 'Gewürze & Öle', name: '150ml Weißwein' }, { category: 'Gewürze & Öle', name: '1L Gemüsebrühe' }, { category: 'Milchprodukte & Eier', name: '100g Parmesan' }
    ], instructions: [
        "Zwiebeln und Pilze anbraten.",
        "Risottoreis hinzufügen und glasig dünsten.",
        "Mit Weißwein ablöschen und einkochen lassen.",
        "Nach und nach heiße Gemüsebrühe zugeben und unter Rühren ca. 20 Minuten garen, bis der Reis cremig ist.",
        "Parmesan und Butter unterrühren."
    ]},
    { id: 'r019', title: 'Chicken Teriyaki Bowl', base: 'reis', tags: ['Fleisch', 'Schnell', 'Asiatisch'], estimatedPricePerServing: 3.4, sideSuggestion: 'Edamame', ingredients: [
        { category: 'Fleisch & Fisch', name: '500g Hähnchenbrust' }, { category: 'Trockenwaren & Konserven', name: '150ml Teriyakisauce' }, { category: 'Trockenwaren & Konserven', name: '300g Reis' }, { category: 'Obst & Gemüse', name: '1 Brokkoli' }, { category: 'Obst & Gemüse', name: '2 Karotten' }, { category: 'Trockenwaren & Konserven', name: 'Sesam' }
    ], instructions: [
        "Reis kochen, Brokkoli und Karotten dämpfen oder kochen.",
        "Hähnchen in Streifen schneiden und in einer Pfanne anbraten.",
        "Teriyakisauce hinzufügen und das Hähnchen darin glasieren.",
        "Alles in einer Schüssel anrichten und mit Sesam bestreuen."
    ]},
    { id: 'r023', title: 'Meeresfrüchte-Paella', base: 'reis', tags: ['Fisch', 'Meeresfrüchte'], estimatedPricePerServing: 4.5, isPremium: true, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '300g Paella-Reis' }, { category: 'Fleisch & Fisch', name: '500g Meeresfrüchte-Mix (TK)' }, { category: 'Obst & Gemüse', name: '1 rote Paprika' }, { category: 'Trockenwaren & Konserven', name: '150g Erbsen (TK)' }, { category: 'Gewürze & Öle', name: '1 Prise Safranfäden' }
    ], instructions: [
        "Zwiebeln und Paprika in einer großen Paella-Pfanne anbraten.",
        "Reis hinzufügen und kurz mitbraten.",
        "Mit Brühe und Safran ablöschen.",
        "Köcheln lassen, nach ca. 10 Minuten die Meeresfrüchte und Erbsen hinzufügen.",
        "Weitergaren, bis die Flüssigkeit absorbiert ist."
    ]},
    { id: 'r028', title: 'Gebratener Reis mit Ei', base: 'reis', tags: ['Vegetarisch', 'Schnell', 'Günstig'], estimatedPricePerServing: 1.7, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '300g Reis (vom Vortag)' }, { category: 'Milchprodukte & Eier', name: '3 Eier' }, { category: 'Trockenwaren & Konserven', name: '150g Erbsen (TK)' }, { category: 'Obst & Gemüse', name: '2 Frühlingszwiebeln' }, { category: 'Trockenwaren & Konserven', name: '4 EL Sojasauce' }
    ], instructions: [
        "Eier verquirlen und in einem Wok zu Rührei braten, dann herausnehmen.",
        "Erbsen und Frühlingszwiebeln kurz anbraten.",
        "Kalten Reis hinzufügen und unter Rühren kräftig anbraten.",
        "Ei wieder zugeben, mit Sojasauce abschmecken."
    ]},
    { id: 'r029', title: 'Kichererbsen-Curry', base: 'reis', tags: ['Vegetarisch', 'Vegan', 'Günstig', 'Asiatisch'], estimatedPricePerServing: 1.9, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '2 Dosen Kichererbsen' }, { category: 'Trockenwaren & Konserven', name: '400ml Kokosmilch' }, { category: 'Obst & Gemüse', name: '200g Spinat' }, { category: 'Gewürze & Öle', name: '2 EL Currypulver' }, { category: 'Trockenwaren & Konserven', name: '300g Reis' }
    ], instructions: [
        "Zwiebeln und Knoblauch anbraten, Currypulver hinzufügen und kurz mitrösten.",
        "Mit Kokosmilch und gehackten Tomaten (optional) ablöschen.",
        "Kichererbsen zugeben und ca. 10 Minuten köcheln lassen.",
        "Spinat unterheben und zusammenfallen lassen.",
        "Mit Reis servieren."
    ]},
    // Potatoes
    { id: 'r009', title: 'Kartoffel-Gratin', base: 'kartoffeln', tags: ['Vegetarisch', 'Günstig', 'Ofengericht', 'Käse'], estimatedPricePerServing: 1.6, sideSuggestion: 'Salat', ingredients: [
        { category: 'Obst & Gemüse', name: '1.5kg Kartoffeln' }, { category: 'Milchprodukte & Eier', name: '400ml Sahne' }, { category: 'Milchprodukte & Eier', name: '150g Geriebener Käse' }, { category: 'Obst & Gemüse', name: '1 Zehe Knoblauch' }, { category: 'Gewürze & Öle', name: 'Muskatnuss' }
    ], instructions: [
        "Kartoffeln in dünne Scheiben schneiden.",
        "Eine Auflaufform mit Knoblauch ausreiben.",
        "Kartoffelscheiben in die Form schichten.",
        "Sahne mit Salz, Pfeffer und Muskat würzen und über die Kartoffeln gießen.",
        "Mit Käse bestreuen und bei 180°C ca. 45-60 Minuten backen."
    ]},
    { id: 'r010', title: 'Bratkartoffeln mit Spiegelei', base: 'kartoffeln', tags: ['Vegetarisch', 'Schnell', 'Günstig'], estimatedPricePerServing: 1.4, ingredients: [
        { category: 'Obst & Gemüse', name: '1kg Kartoffeln (gekocht)' }, { category: 'Milchprodukte & Eier', name: '4 Eier' }, { category: 'Obst & Gemüse', name: '2 Zwiebeln' }, { category: 'Fleisch & Fisch', name: '100g Speck (optional)' }
    ], instructions: [
        "Gekochte Kartoffeln in Scheiben schneiden.",
        "Speck und Zwiebeln in einer Pfanne anbraten.",
        "Kartoffelscheiben hinzufügen und goldbraun und knusprig braten.",
        "In einer zweiten Pfanne Spiegeleier braten und auf den Bratkartoffeln servieren."
    ]},
    { id: 'r011', title: 'Ofenkartoffeln mit Quark', base: 'kartoffeln', tags: ['Vegetarisch', 'Schnell', 'Günstig'], estimatedPricePerServing: 1.2, sideSuggestion: 'Leinöl', ingredients: [
        { category: 'Obst & Gemüse', name: '4 große Kartoffeln' }, { category: 'Milchprodukte & Eier', name: '500g Quark' }, { category: 'Obst & Gemüse', name: '1 Bund Schnittlauch' }, { category: 'Gewürze & Öle', name: 'Leinöl' }
    ], instructions: [
        "Kartoffeln waschen, mit einer Gabel mehrmals einstechen und im Ofen bei 200°C ca. 1 Stunde backen, bis sie weich sind.",
        "Quark mit Salz, Pfeffer und Schnittlauch verrühren.",
        "Gebackene Kartoffeln aufschneiden und mit dem Quark füllen."
    ]},
    { id: 'r012', title: 'Kartoffelsuppe mit Würstchen', base: 'kartoffeln', tags: ['Fleisch', 'Günstig', 'Eintopf', 'Schwein'], estimatedPricePerServing: 1.8, sideSuggestion: 'Brot', ingredients: [
        { category: 'Obst & Gemüse', name: '1kg Kartoffeln' }, { category: 'Obst & Gemüse', name: '2 Karotten' }, { category: 'Obst & Gemüse', name: '1 Stück Sellerie' }, { category: 'Obst & Gemüse', name: '1 Stange Lauch' }, { category: 'Fleisch & Fisch', name: '4 Wiener Würstchen' }, { category: 'Gewürze & Öle', name: '1.5L Gemüsebrühe' }
    ], instructions: [
        "Gemüse und Kartoffeln schälen, würfeln und in einem Topf anbraten.",
        "Mit Gemüsebrühe auffüllen und ca. 20 Minuten kochen lassen, bis das Gemüse weich ist.",
        "Einen Teil der Suppe pürieren, um sie sämiger zu machen.",
        "Würstchen in Scheiben schneiden und in der Suppe erhitzen."
    ]},
    { id: 'r020', title: 'Shepherd\'s Pie', base: 'kartoffeln', tags: ['Fleisch', 'Ofengericht', 'Lamm'], estimatedPricePerServing: 3.1, sideSuggestion: 'Grüne Bohnen', ingredients: [
        { category: 'Fleisch & Fisch', name: '500g Lammhackfleisch' }, { category: 'Obst & Gemüse', name: '1kg Kartoffeln' }, { category: 'Trockenwaren & Konserven', name: '200g Erbsen (TK)' }, { category: 'Milchprodukte & Eier', name: '50g Butter' }, { category: 'Milchprodukte & Eier', name: '100ml Milch' }
    ], instructions: [
        "Eine Hackfleischsauce mit Zwiebeln, Karotten und Erbsen kochen.",
        "Kartoffeln kochen und zu Püree verarbeiten.",
        "Die Hackfleischsauce in eine Auflaufform geben.",
        "Das Kartoffelpüree darüber verteilen und mit einer Gabel ein Muster ziehen.",
        "Bei 200°C ca. 20-25 Minuten backen, bis die Oberfläche goldbraun ist."
    ]},
    { id: 'r022', title: 'Rindergulasch', base: 'kartoffeln', tags: ['Fleisch', 'Eintopf'], estimatedPricePerServing: 3.8, isPremium: true, ingredients: [
        { category: 'Fleisch & Fisch', name: '1kg Rindfleisch (Gulasch)' }, { category: 'Obst & Gemüse', name: '500g Zwiebeln' }, { category: 'Obst & Gemüse', name: '2 Paprika' }, { category: 'Trockenwaren & Konserven', name: '3 EL Tomatenmark' }, { category: 'Gewürze & Öle', name: '3 EL Paprikapulver edelsüß' }
    ], instructions: [
        "Rindfleisch portionsweise scharf anbraten.",
        "Zwiebeln hinzufügen und anbraten.",
        "Tomatenmark und Paprikapulver zugeben und kurz mitrösten.",
        "Mit Brühe oder Rotwein ablöschen und zugedeckt mindestens 1,5 Stunden schmoren lassen, bis das Fleisch zart ist."
    ]},
    { id: 'r030', title: 'Kartoffelpuffer mit Apfelmus', base: 'kartoffeln', tags: ['Vegetarisch', 'Günstig'], estimatedPricePerServing: 1.3, ingredients: [
        { category: 'Obst & Gemüse', name: '1kg Kartoffeln' }, { category: 'Milchprodukte & Eier', name: '2 Eier' }, { category: 'Obst & Gemüse', name: '1 Zwiebel' }, { category: 'Trockenwaren & Konserven', name: '1 Glas Apfelmus' }
    ], instructions: [
        "Kartoffeln und Zwiebeln fein reiben.",
        "Die geriebene Masse gut ausdrücken, um überschüssige Flüssigkeit zu entfernen.",
        "Mit Ei, Salz und Pfeffer vermengen.",
        "Kleine Puffer formen und in heißem Öl von beiden Seiten goldbraun ausbacken.",
        "Mit Apfelmus servieren."
    ]},
    { id: 'r031', title: 'Hähnchenschenkel vom Blech', base: 'kartoffeln', tags: ['Fleisch', 'Ofengericht'], estimatedPricePerServing: 2.5, sideSuggestion: 'Gemüse', ingredients: [
        { category: 'Fleisch & Fisch', name: '4 Hähnchenschenkel' }, { category: 'Obst & Gemüse', name: '800g Kartoffeln' }, { category: 'Obst & Gemüse', name: '2 Zweige Rosmarin' }, { category: 'Obst & Gemüse', name: '1 Paprika' }
    ], instructions: [
        "Kartoffeln und Gemüse in mundgerechte Stücke schneiden und auf einem Backblech verteilen.",
        "Hähnchenschenkel würzen.",
        "Alles mit Öl, Salz, Pfeffer und Rosmarin vermengen.",
        "Bei 200°C ca. 40-50 Minuten backen, bis das Hähnchen gar und knusprig ist."
    ]},
    // Mix / Other
    { id: 'r013', title: 'Flammkuchen', base: 'mix', tags: ['Fleisch', 'Schnell', 'Schwein'], estimatedPricePerServing: 2.2, ingredients: [
        { category: 'Backwaren', name: '1 Rolle Flammkuchenteig' }, { category: 'Milchprodukte & Eier', name: '200g Schmand' }, { category: 'Fleisch & Fisch', name: '150g Speckwürfel' }, { category: 'Obst & Gemüse', name: '2 Zwiebeln' }
    ], instructions: [
        "Flammkuchenteig auf einem Backblech ausrollen.",
        "Mit Schmand bestreichen, dabei einen kleinen Rand lassen.",
        "Zwiebeln in feine Ringe schneiden.",
        "Mit Speck und Zwiebeln belegen und bei hoher Hitze (ca. 220°C) 10-15 Minuten knusprig backen."
    ]},
    { id: 'r014', title: 'Gefüllte Paprika', base: 'mix', tags: ['Fleisch', 'Ofengericht'], estimatedPricePerServing: 2.7, sideSuggestion: 'Reis', ingredients: [
        { category: 'Obst & Gemüse', name: '4 große Paprika' }, { category: 'Fleisch & Fisch', name: '500g Hackfleisch' }, { category: 'Trockenwaren & Konserven', name: '100g Reis' }, { category: 'Gewürze & Öle', name: '400ml Tomatensauce' }
    ], instructions: [
        "Reis vorkochen.",
        "Hackfleisch mit Zwiebeln anbraten, mit dem Reis vermengen und würzen.",
        "Paprika halbieren, entkernen und mit der Hackfleisch-Reis-Mischung füllen.",
        "In eine Auflaufform setzen, etwas Tomatensauce angießen und bei 180°C ca. 30 Minuten backen."
    ]},
    { id: 'r015', title: 'Kürbissuppe mit Ingwer', base: 'mix', tags: ['Vegetarisch', 'Günstig', 'Suppe', 'Vegan'], estimatedPricePerServing: 1.5, sideSuggestion: 'Brot', ingredients: [
        { category: 'Obst & Gemüse', name: '1 Hokkaido-Kürbis' }, { category: 'Obst & Gemüse', name: '1 Stück Ingwer (ca. 2cm)' }, { category: 'Trockenwaren & Konserven', name: '400ml Kokosmilch' }, { category: 'Gewürze & Öle', name: '800ml Gemüsebrühe' }
    ], instructions: [
        "Kürbis entkernen und in Stücke schneiden (Hokkaido muss nicht geschält werden).",
        "Kürbis mit Zwiebeln und geriebenem Ingwer in einem Topf andünsten.",
        "Mit Gemüsebrühe ablöschen und ca. 20 Minuten weich kochen.",
        "Suppe fein pürieren, Kokosmilch unterrühren und mit Salz, Pfeffer und Curry abschmecken."
    ]},
    { id: 'r016', title: 'Wraps mit Hähnchen', base: 'mix', tags: ['Fleisch', 'Schnell'], estimatedPricePerServing: 3.0, ingredients: [
        { category: 'Backwaren', name: '8 Weizen-Tortillas' }, { category: 'Fleisch & Fisch', name: '500g Hähnchenbruststreifen' }, { category: 'Obst & Gemüse', name: '1 Kopf Eisbergsalat' }, { category: 'Obst & Gemüse', name: '2 Tomaten' }, { category: 'Sonstiges', name: '1 Glas Salsa-Sauce' }
    ], instructions: [
        "Hähnchenstreifen anbraten.",
        "Salat und Tomaten waschen und schneiden.",
        "Tortillas kurz erwärmen.",
        "Tortillas mit Salsa, Salat, Tomaten und Hähnchen füllen und aufrollen."
    ]},
    { id: 'r021', title: 'Shakshuka', base: 'mix', tags: ['Vegetarisch', 'Günstig', 'Schnell', 'Pfannengericht'], estimatedPricePerServing: 2.3, sideSuggestion: 'Fladenbrot', ingredients: [
        { category: 'Milchprodukte & Eier', name: '4-6 Eier' }, { category: 'Trockenwaren & Konserven', name: '800g Gehackte Tomaten (Dose)' }, { category: 'Obst & Gemüse', name: '1 Zwiebel' }, { category: 'Obst & Gemüse', name: '1 rote Paprika' }, { category: 'Milchprodukte & Eier', name: '150g Feta' }
    ], instructions: [
        "Zwiebeln und Paprika in einer Pfanne anbraten.",
        "Gehackte Tomaten hinzufügen und mit Kreuzkümmel, Paprikapulver, Salz und Pfeffer würzen. Ca. 10 Minuten köcheln lassen.",
        "Mit einem Löffel kleine Mulden in die Tomatensauce drücken und die Eier hineingleiten lassen.",
        "Bei geschlossenem Deckel ca. 5-8 Minuten garen, bis das Eiweiß gestockt ist.",
        "Mit zerbröseltem Feta und frischen Kräutern servieren."
    ]},
    { id: 'r024', title: 'Pizza Margherita', base: 'mix', tags: ['Vegetarisch', 'Schnell', 'Günstig', 'Käse'], estimatedPricePerServing: 2.0, ingredients: [
        { category: 'Backwaren', name: '1 Rolle Pizzateig' }, { category: 'Trockenwaren & Konserven', name: '200g Passierte Tomaten' }, { category: 'Milchprodukte & Eier', name: '250g Mozzarella' }, { category: 'Obst & Gemüse', name: 'Frischer Basilikum' }
    ], instructions: [
        "Pizzateig auf einem Backblech ausrollen.",
        "Passierte Tomaten mit Salz, Pfeffer und Oregano würzen und auf dem Teig verteilen.",
        "Mozzarella in Scheiben schneiden und auf der Pizza verteilen.",
        "Im vorgeheizten Ofen bei hoher Temperatur (ca. 220°C) 10-15 Minuten backen.",
        "Vor dem Servieren mit frischem Basilikum belegen."
    ]},
    { id: 'r032', title: 'Linsensalat mit Feta', base: 'mix', tags: ['Vegetarisch', 'Salat', 'Kalt', 'Käse'], estimatedPricePerServing: 2.4, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '250g Berglinsen' }, { category: 'Milchprodukte & Eier', name: '200g Feta' }, { category: 'Obst & Gemüse', name: '1 rote Paprika' }, { category: 'Obst & Gemüse', name: '3 Frühlingszwiebeln' }
    ], instructions: [
        "Linsen nach Packungsanweisung kochen und abkühlen lassen.",
        "Paprika und Frühlingszwiebeln klein schneiden.",
        "Feta würfeln.",
        "Alle Zutaten mit einem Dressing aus Olivenöl, Essig, Salz und Pfeffer vermengen."
    ]},
    { id: 'r033', title: 'Quesadillas mit Bohnen', base: 'mix', tags: ['Vegetarisch', 'Schnell', 'Käse'], estimatedPricePerServing: 2.1, sideSuggestion: 'Salsa', ingredients: [
        { category: 'Backwaren', name: '8 Weizen-Tortillas' }, { category: 'Trockenwaren & Konserven', name: '1 Dose Schwarze Bohnen' }, { category: 'Milchprodukte & Eier', name: '200g Geriebener Käse' }, { category: 'Trockenwaren & Konserven', name: '1 Dose Mais' }
    ], instructions: [
        "Eine Tortilla in eine Pfanne legen.",
        "Eine Hälfte mit Bohnen, Mais und Käse belegen.",
        "Die andere Hälfte darüber klappen und von beiden Seiten goldbraun braten, bis der Käse geschmolzen ist.",
        "In Stücke schneiden und mit Salsa oder Guacamole servieren."
    ]},
    { id: 'r034', title: 'Rinder-Steak mit Ofengemüse', base: 'mix', tags: ['Fleisch', 'Ofengericht'], estimatedPricePerServing: 5.5, isPremium: true, ingredients: [
        { category: 'Fleisch & Fisch', name: '2 Rindersteaks (à 250g)' }, { category: 'Obst & Gemüse', name: '800g Kartoffeln' }, { category: 'Obst & Gemüse', name: '1 Zucchini' }, { category: 'Obst & Gemüse', name: '2 Zweige Rosmarin' }
    ], instructions: [
        "Gemüse und Kartoffeln schneiden, mit Öl und Kräutern mischen und auf einem Blech verteilen. Bei 200°C ca. 30 Min. backen.",
        "Steak von beiden Seiten scharf anbraten.",
        "Steak im Ofen auf dem Gemüse für die letzten 5-10 Minuten mitgaren, je nach gewünschter Garstufe.",
        "Steak vor dem Anschneiden kurz ruhen lassen."
    ]},
    { id: 'r035', title: 'Dorade aus dem Ofen', base: 'mix', tags: ['Fisch', 'Ofengericht'], estimatedPricePerServing: 4.8, isPremium: true, sideSuggestion: 'Kartoffeln', ingredients: [
        { category: 'Fleisch & Fisch', name: '2 Doraden (ganz)' }, { category: 'Obst & Gemüse', name: '1 Zitrone' }, { category: 'Obst & Gemüse', name: '4 Zehen Knoblauch' }, { category: 'Obst & Gemüse', name: '4 Zweige Thymian' }
    ], instructions: [
        "Ofen auf 180°C vorheizen.",
        "Dorade waschen und trockentupfen. Haut mehrmals einschneiden.",
        "Fisch innen und außen salzen und pfeffern.",
        "Bauchhöhle mit Zitronenscheiben, Knoblauch und Kräutern füllen.",
        "In einer Auflaufform ca. 20-25 Minuten backen, bis das Fleisch weiß ist."
    ]},
    { id: 'r036', title: 'Linseneintopf', base: 'mix', tags: ['Vegetarisch', 'Eintopf', 'Günstig', 'Vegan'], estimatedPricePerServing: 1.2, sideSuggestion: 'Brot', ingredients: [
        { category: 'Trockenwaren & Konserven', name: '500g Tellerlinsen' }, { category: 'Obst & Gemüse', name: '1 Bund Suppengrün' }, { category: 'Obst & Gemüse', name: '2 Kartoffeln' }, { category: 'Gewürze & Öle', name: '2 EL Essig' }
    ], instructions: [
        "Suppengrün und Kartoffeln würfeln und in einem Topf anbraten.",
        "Linsen hinzufügen und mit Wasser oder Brühe bedecken.",
        "Ca. 45 Minuten köcheln lassen, bis die Linsen weich sind.",
        "Mit Salz, Pfeffer und einem Schuss Essig abschmecken."
    ]},
    { id: 'r037', title: 'Zucchini-Puffer', base: 'mix', tags: ['Vegetarisch', 'Günstig'], estimatedPricePerServing: 1.6, sideSuggestion: 'Quark-Dip', ingredients: [
        { category: 'Obst & Gemüse', name: '2 große Zucchini' }, { category: 'Milchprodukte & Eier', name: '2 Eier' }, { category: 'Backwaren', name: '4 EL Mehl' }, { category: 'Milchprodukte & Eier', name: '250g Quark' }
    ], instructions: [
        "Zucchini grob reiben, salzen und 10 Minuten Wasser ziehen lassen. Gut ausdrücken.",
        "Mit Ei, Mehl, Salz und Pfeffer vermengen.",
        "Kleine Puffer formen und in Öl goldbraun ausbacken.",
        "Mit einem Kräuterquark-Dip servieren."
    ]},
    { id: 'r038', title: 'Thai-Basilikum-Hähnchen', base: 'reis', tags: ['Fleisch', 'Asiatisch', 'Scharf', 'Schnell'], estimatedPricePerServing: 3.3, ingredients: [
        { category: 'Fleisch & Fisch', name: '500g Hähnchenhackfleisch' }, { category: 'Obst & Gemüse', name: '1 Bund Thai-Basilikum' }, { category: 'Obst & Gemüse', name: '2-3 Chilischoten' }, { category: 'Trockenwaren & Konserven', name: '3 EL Fischsauce' }
    ], instructions: [
        "Knoblauch und Chili in einem Wok anbraten.",
        "Hackfleisch hinzufügen und krümelig braten.",
        "Mit einer Sauce aus Sojasauce, Fischsauce und etwas Zucker ablöschen.",
        "Ganz zum Schluss eine große Handvoll Thai-Basilikum unterheben und sofort mit Reis servieren."
    ]},
    { id: 'r039', title: 'Spinat-Ricotta-Cannelloni', base: 'nudeln', tags: ['Vegetarisch', 'Ofengericht', 'Käse'], estimatedPricePerServing: 2.9, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '250g Cannelloni' }, { category: 'Milchprodukte & Eier', name: '500g Ricotta' }, { category: 'Obst & Gemüse', name: '450g Spinat (TK)' }, { category: 'Trockenwaren & Konserven', name: '500g Passierte Tomaten' }
    ], instructions: [
        "Aufgetauten Spinat gut ausdrücken und mit Ricotta, Salz, Pfeffer und Muskat vermischen.",
        "Die Cannelloni-Röhren mit der Masse füllen.",
        "Etwas Tomatensauce in eine Auflaufform geben, die Cannelloni darauflegen.",
        "Mit restlicher Tomatensauce bedecken, mit Käse bestreuen und bei 180°C ca. 30 Min. backen."
    ]},
    { id: 'r040', title: 'Couscous-Salat', base: 'mix', tags: ['Vegetarisch', 'Salat', 'Kalt', 'Schnell', 'Vegan'], estimatedPricePerServing: 2.0, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '250g Couscous' }, { category: 'Obst & Gemüse', name: '1 Gurke' }, { category: 'Obst & Gemüse', name: '2 Tomaten' }, { category: 'Obst & Gemüse', name: '1 Bund Minze' }
    ], instructions: [
        "Couscous mit heißer Gemüsebrühe übergießen und quellen lassen.",
        "Gurke und Tomaten fein würfeln.",
        "Minze fein hacken.",
        "Alles mit dem aufgelockerten Couscous vermengen und mit Zitronensaft, Olivenöl, Salz und Pfeffer abschmecken."
    ]},
    { id: 'r041', title: 'Hähnchen-Pfanne süß-sauer', base: 'reis', tags: ['Fleisch', 'Asiatisch', 'Schnell'], estimatedPricePerServing: 3.1, ingredients: [
        { category: 'Fleisch & Fisch', name: '500g Hähnchenbrust' }, { category: 'Obst & Gemüse', name: '1 Dose Ananas' }, { category: 'Obst & Gemüse', name: '1 rote Paprika' }, { category: 'Sonstiges', name: '1 Glas Süß-Sauer-Sauce' }
    ], instructions: [
        "Hähnchen würfeln und anbraten.",
        "Paprika und Ananasstücke hinzufügen und kurz mitbraten.",
        "Mit Süß-Sauer-Sauce ablöschen und kurz einköcheln lassen.",
        "Mit Reis servieren."
    ]},
    { id: 'r042', title: 'Tacos mit Hackfleisch', base: 'mix', tags: ['Fleisch', 'Schnell', 'Mexikanisch'], estimatedPricePerServing: 2.8, ingredients: [
        { category: 'Backwaren', name: '12 Taco-Schalen' }, { category: 'Fleisch & Fisch', name: '500g Hackfleisch' }, { category: 'Sonstiges', name: '1 Pck. Taco-Gewürz' }, { category: 'Obst & Gemüse', name: '1 Eisbergsalat' }, { category: 'Milchprodukte & Eier', name: '200g Sauerrahm' }
    ], instructions: [
        "Hackfleisch anbraten, mit Taco-Gewürz und etwas Wasser würzen und köcheln lassen.",
        "Taco-Schalen im Ofen erwärmen.",
        "Salat, Tomaten, Käse und andere Toppings vorbereiten.",
        "Jeder füllt seine Tacos selbst am Tisch."
    ]},
    { id: 'r043', title: 'Gefüllte Zucchini mit Feta', base: 'mix', tags: ['Vegetarisch', 'Ofengericht', 'Käse'], estimatedPricePerServing: 2.4, sideSuggestion: 'Baguette', ingredients: [
        { category: 'Obst & Gemüse', name: '2 große Zucchini' }, { category: 'Milchprodukte & Eier', name: '200g Feta' }, { category: 'Obst & Gemüse', name: '2 Tomaten' }, { category: 'Obst & Gemüse', name: '1 Zwiebel' }
    ], instructions: [
        "Zucchini längs halbieren und aushöhlen.",
        "Das Fruchtfleisch klein schneiden und mit gewürfelten Tomaten, Zwiebeln und Feta vermischen.",
        "Die Zucchinihälften mit der Masse füllen.",
        "Bei 180°C ca. 20-25 Minuten im Ofen backen."
    ]},
    { id: 'r044', title: 'Kartoffel-Lauch-Suppe', base: 'kartoffeln', tags: ['Vegetarisch', 'Suppe', 'Günstig'], estimatedPricePerServing: 1.4, ingredients: [
        { category: 'Obst & Gemüse', name: '800g Kartoffeln' }, { category: 'Obst & Gemüse', name: '2 Stangen Lauch' }, { category: 'Milchprodukte & Eier', name: '200ml Sahne' }, { category: 'Gewürze & Öle', name: '1L Gemüsebrühe' }
    ], instructions: [
        "Kartoffeln würfeln, Lauch in Ringe schneiden.",
        "Beides in einem Topf andünsten.",
        "Mit Gemüsebrühe ablöschen und weich kochen.",
        "Suppe pürieren, Sahne unterrühren und abschmecken."
    ]},
    { id: 'r045', title: 'Bratwurst mit Kartoffelpüree', base: 'kartoffeln', tags: ['Fleisch', 'Schwein', 'Klassiker'], estimatedPricePerServing: 2.2, sideSuggestion: 'Sauerkraut', ingredients: [
        { category: 'Fleisch & Fisch', name: '4 Bratwürste' }, { category: 'Obst & Gemüse', name: '1kg Kartoffeln' }, { category: 'Milchprodukte & Eier', name: '150ml Milch' }, { category: 'Milchprodukte & Eier', name: '1 EL Butter' }
    ], instructions: [
        "Kartoffeln kochen und zu Püree verarbeiten.",
        "Bratwürste in einer Pfanne goldbraun braten.",
        "Optional Sauerkraut erwärmen.",
        "Alles zusammen servieren."
    ]},
    { id: 'r046', title: 'Quiche Lorraine', base: 'mix', tags: ['Fleisch', 'Schwein', 'Ofengericht', 'Käse'], estimatedPricePerServing: 2.6, sideSuggestion: 'Salat', ingredients: [
        { category: 'Backwaren', name: '1 Rolle Mürbeteig' }, { category: 'Fleisch & Fisch', name: '150g Speck' }, { category: 'Milchprodukte & Eier', name: '3 Eier' }, { category: 'Milchprodukte & Eier', name: '200ml Sahne' }
    ], instructions: [
        "Eine Quicheform mit dem Teig auslegen.",
        "Speck anbraten und auf dem Teig verteilen.",
        "Eier und Sahne verquirlen, kräftig mit Salz, Pfeffer und Muskat würzen.",
        "Die Ei-Sahne-Mischung über den Speck gießen.",
        "Bei 180°C ca. 30-40 Minuten backen."
    ]},
    { id: 'r047', title: 'Fish and Chips', base: 'kartoffeln', tags: ['Fisch', 'Klassiker'], estimatedPricePerServing: 3.5, ingredients: [
        { category: 'Fleisch & Fisch', name: '600g Kabeljaufilet' }, { category: 'Obst & Gemüse', name: '1kg Kartoffeln' }, { category: 'Backwaren', name: '150g Mehl' }, { category: 'Sonstiges', name: '150ml Bier' }
    ], instructions: [
        "Kartoffeln in dicke Stifte schneiden und frittieren.",
        "Für den Bierteig Mehl, Bier, Salz und Backpulver vermischen.",
        "Fischfilets durch den Teig ziehen und ebenfalls goldbraun frittieren.",
        "Mit Remoulade und Essig servieren."
    ]},
    { id: 'r048', title: 'Falafel-Wraps mit Hummus', base: 'mix', tags: ['Vegetarisch', 'Vegan', 'Schnell'], estimatedPricePerServing: 2.3, ingredients: [
        { category: 'Backwaren', name: '4 große Fladenbrote' }, { category: 'Trockenwaren & Konserven', name: '1 Pck. Falafel (Fertigmischung)' }, { category: 'Sonstiges', name: '200g Hummus' }, { category: 'Obst & Gemüse', name: '1/2 Kopf Salat' }
    ], instructions: [
        "Falafel nach Packungsanweisung zubereiten (meist frittieren oder im Ofen backen).",
        "Fladenbrot erwärmen.",
        "Mit Hummus bestreichen und mit Falafel und Salat füllen."
    ]},
    { id: 'r049', title: 'Buddha Bowl mit Erdnusssauce', base: 'reis', tags: ['Vegetarisch', 'Vegan', 'Gesund'], estimatedPricePerServing: 3.0, ingredients: [
        { category: 'Trockenwaren & Konserven', name: '150g Quinoa' }, { category: 'Obst & Gemüse', name: '1 Süßkartoffel' }, { category: 'Trockenwaren & Konserven', name: '1 Dose Kichererbsen' }, { category: 'Sonstiges', name: '3 EL Erdnussbutter' }
    ], instructions: [
        "Quinoa kochen. Süßkartoffel würfeln und im Ofen rösten.",
        "Für die Sauce Erdnussbutter mit Sojasauce, Limettensaft, etwas Wasser und Ingwer glatt rühren.",
        "Alle Zutaten (Quinoa, Süßkartoffel, Kichererbsen, frisches Gemüse nach Wahl) in einer Schüssel anrichten.",
        "Mit der Erdnusssauce beträufeln."
    ]},
    { id: 'r050', title: 'Amerikanische Pancakes', base: 'mix', tags: ['Vegetarisch', 'Süßspeise', 'Schnell'], estimatedPricePerServing: 1.5, sideSuggestion: 'Ahornsirup', ingredients: [
        { category: 'Backwaren', name: '250g Mehl' }, { category: 'Milchprodukte & Eier', name: '2 Eier' }, { category: 'Milchprodukte & Eier', name: '250ml Milch' }, { category: 'Backwaren', name: '2 TL Backpulver' }, { category: 'Sonstiges', name: 'Ahornsirup' }
    ], instructions: [
        "Trockene Zutaten (Mehl, Zucker, Backpulver, Salz) vermischen.",
        "Flüssige Zutaten (Milch, Ei, geschmolzene Butter) verquirlen und unter die trockenen Zutaten heben.",
        "Kleine, dicke Pfannkuchen in einer Pfanne ausbacken.",
        "Mit Ahornsirup und Früchten servieren."
    ]},
    // 10 new recipes
    { id: 'r051', title: 'Gemüse-Lasagne', base: 'nudeln', tags: ['Vegetarisch', 'Ofengericht', 'Käse'], estimatedPricePerServing: 2.7, sideSuggestion: 'Salat', ingredients: [
        { category: 'Trockenwaren & Konserven', name: '12 Lasagneplatten' }, { category: 'Obst & Gemüse', name: '1 Zucchini' }, { category: 'Obst & Gemüse', name: '1 Aubergine' }, { category: 'Obst & Gemüse', name: '2 Paprika' }, { category: 'Trockenwaren & Konserven', name: '800g gehackte Tomaten' }, { category: 'Milchprodukte & Eier', name: '250g Ricotta' }, { category: 'Milchprodukte & Eier', name: '150g geriebener Käse' }
    ], instructions: [
        "Gemüse klein schneiden und in Olivenöl anbraten.",
        "Gehackte Tomaten hinzufügen und zu einer Sauce einkochen, würzen.",
        "Béchamelsauce zubereiten oder Ricotta als Alternative verwenden.",
        "Gemüsesauce, Lasagneplatten und Ricotta/Béchamel schichten.",
        "Mit Käse bestreuen und bei 180°C ca. 30-40 Minuten backen."
    ]},
    { id: 'r052', title: 'Königsberger Klopse', base: 'kartoffeln', tags: ['Fleisch', 'Klassiker'], estimatedPricePerServing: 3.0, sideSuggestion: 'Salzkartoffeln', ingredients: [
        { category: 'Fleisch & Fisch', name: '500g gemischtes Hackfleisch' }, { category: 'Backwaren', name: '1 altes Brötchen' }, { category: 'Milchprodukte & Eier', name: '1 Ei' }, { category: 'Trockenwaren & Konserven', name: '50g Kapern' }, { category: 'Milchprodukte & Eier', name: '200ml Sahne' }, { category: 'Gewürze & Öle', name: '1.5L Brühe' }
    ], instructions: [
        "Brötchen einweichen, ausdrücken und mit Hack, Ei und Zwiebeln zu einem Teig verarbeiten. Klopse formen.",
        "Klopse in der siedenden Brühe ca. 15 Minuten gar ziehen lassen.",
        "Für die Sauce eine Mehlschwitze herstellen, mit der Kochbrühe und Sahne ablöschen.",
        "Kapern hinzufügen und die Klopse in der Sauce servieren."
    ]},
    { id: 'r053', title: 'Zürcher Geschnetzeltes', base: 'reis', tags: ['Fleisch', 'Schnell', 'Pilze'], estimatedPricePerServing: 4.2, sideSuggestion: 'Rösti oder Reis', isPremium: true, ingredients: [
        { category: 'Fleisch & Fisch', name: '600g Kalbfleisch' }, { category: 'Obst & Gemüse', name: '250g Champignons' }, { category: 'Obst & Gemüse', name: '1 Zwiebel' }, { category: 'Milchprodukte & Eier', name: '200ml Sahne' }, { category: 'Gewürze & Öle', name: '100ml Weißwein' }
    ], instructions: [
        "Fleisch in Streifen schneiden und portionsweise scharf anbraten, dann beiseite stellen.",
        "Zwiebeln und Champignons in der gleichen Pfanne anbraten.",
        "Mit Weißwein ablöschen und etwas einkochen lassen.",
        "Sahne hinzufügen, aufkochen und das Fleisch wieder in die Sauce geben. Nicht mehr kochen lassen.",
        "Mit Salz und Pfeffer abschmecken."
    ]},
    { id: 'r054', title: 'Hähnchenfrikassee', base: 'reis', tags: ['Fleisch', 'Klassiker'], estimatedPricePerServing: 2.8, ingredients: [
        { category: 'Fleisch & Fisch', name: '500g Hähnchenbrust' }, { category: 'Trockenwaren & Konserven', name: '200g Spargel (Glas)' }, { category: 'Obst & Gemüse', name: '150g Champignons' }, { category: 'Trockenwaren & Konserven', name: '150g Erbsen (TK)' }, { category: 'Milchprodukte & Eier', name: '100ml Sahne' }
    ], instructions: [
        "Hähnchenbrust in Brühe garen, dann herausnehmen und in Stücke schneiden. Brühe aufbewahren.",
        "Eine helle Mehlschwitze zubereiten und mit der Hühnerbrühe und Sahne ablöschen.",
        "Hähnchen, Spargel, Erbsen und gebratene Champignons in die Sauce geben.",
        "Mit Zitronensaft, Salz und Pfeffer abschmecken."
    ]},
    { id: 'r055', title: 'Maultaschen in der Brühe', base: 'mix', tags: ['Fleisch', 'Schwein', 'Schnell', 'Suppe'], estimatedPricePerServing: 1.9, ingredients: [
        { category: 'Fleisch & Fisch', name: '1 Pck. Maultaschen' }, { category: 'Gewürze & Öle', name: '1L kräftige Rinderbrühe' }, { category: 'Obst & Gemüse', name: 'Schnittlauch' }
    ], instructions: [
        "Rinderbrühe zum Kochen bringen.",
        "Maultaschen in der Brühe ca. 10-15 Minuten gar ziehen lassen (nicht kochen).",
        "In tiefen Tellern anrichten und mit frisch geschnittenem Schnittlauch bestreuen."
    ]},
    { id: 'r056', title: 'Griechischer Bauernsalat', base: 'mix', tags: ['Vegetarisch', 'Salat', 'Kalt', 'Schnell', 'Käse'], estimatedPricePerServing: 2.5, ingredients: [
        { category: 'Obst & Gemüse', name: '1 Gurke' }, { category: 'Obst & Gemüse', name: '4 Tomaten' }, { category: 'Obst & Gemüse', name: '1 rote Zwiebel' }, { category: 'Obst & Gemüse', name: '1 grüne Paprika' }, { category: 'Trockenwaren & Konserven', name: '1 Glas Kalamata-Oliven' }, { category: 'Milchprodukte & Eier', name: '200g Feta' }
    ], instructions: [
        "Gemüse in grobe Stücke schneiden, Zwiebel in Ringe.",
        "Alles in einer Schüssel mischen.",
        "Ein Dressing aus Olivenöl, Zitronensaft, Oregano, Salz und Pfeffer anrühren.",
        "Den Feta im Ganzen auf den Salat legen, mit dem Dressing beträufeln und mit Oliven garnieren."
    ]},
    { id: 'r057', title: 'Currywurst mit Pommes', base: 'kartoffeln', tags: ['Fleisch', 'Schwein', 'Schnell'], estimatedPricePerServing: 2.2, ingredients: [
        { category: 'Fleisch & Fisch', name: '4 Bratwürste' }, { category: 'Trockenwaren & Konserven', name: '750g Pommes Frites (TK)' }, { category: 'Trockenwaren & Konserven', name: '200ml Ketchup' }, { category: 'Gewürze & Öle', name: '2 EL Currypulver' }
    ], instructions: [
        "Pommes im Ofen oder in der Fritteuse zubereiten.",
        "Bratwürste braten oder grillen und in Scheiben schneiden.",
        "Ketchup mit Currypulver und evtl. etwas Cola oder Apfelsaft zu einer Sauce verrühren.",
        "Wurst mit Sauce übergießen und mit Pommes servieren."
    ]},
    { id: 'r058', title: 'Tom Kha Gai Suppe', base: 'reis', tags: ['Fleisch', 'Asiatisch', 'Suppe', 'Scharf'], estimatedPricePerServing: 3.3, ingredients: [
        { category: 'Fleisch & Fisch', name: '400g Hähnchenbrust' }, { category: 'Trockenwaren & Konserven', name: '800ml Kokosmilch' }, { category: 'Obst & Gemüse', name: '200g Champignons' }, { category: 'Obst & Gemüse', name: '1 Stange Zitronengras' }, { category: 'Obst & Gemüse', name: '1 Stück Galgant' }, { category: 'Trockenwaren & Konserven', name: '2 EL Fischsauce' }
    ], instructions: [
        "Zitronengras und Galgant andrücken. Mit Kokosmilch und Hühnerbrühe aufkochen.",
        "Hähnchen in mundgerechte Stücke schneiden und in der Suppe garen.",
        "Champignons hinzufügen und einige Minuten mitkochen.",
        "Mit Fischsauce, Limettensaft und Chili abschmecken."
    ]},
    { id: 'r059', title: 'Rinderrouladen', base: 'kartoffeln', tags: ['Fleisch', 'Klassiker'], estimatedPricePerServing: 4.0, isPremium: true, sideSuggestion: 'Rotkohl', ingredients: [
        { category: 'Fleisch & Fisch', name: '4 Rinderrouladen' }, { category: 'Fleisch & Fisch', name: '8 Scheiben Speck' }, { category: 'Trockenwaren & Konserven', name: '4 Gewürzgurken' }, { category: 'Obst & Gemüse', name: '2 Zwiebeln' }, { category: 'Gewürze & Öle', name: 'Senf' }
    ], instructions: [
        "Rouladen mit Senf bestreichen, salzen und pfeffern.",
        "Mit Speck, Zwiebelscheiben und einer Gurke belegen, aufrollen und feststecken.",
        "Rouladen von allen Seiten scharf anbraten.",
        "Mit Wasser oder Brühe ablöschen und zugedeckt ca. 1,5 Stunden schmoren.",
        "Sauce andicken und mit Salzkartoffeln und Rotkohl servieren."
    ]},
    { id: 'r060', title: 'Kaiserschmarrn', base: 'mix', tags: ['Vegetarisch', 'Süßspeise', 'Schnell'], estimatedPricePerServing: 2.1, sideSuggestion: 'Apfelmus oder Zwetschgenröster', ingredients: [
        { category: 'Milchprodukte & Eier', name: '4 Eier' }, { category: 'Backwaren', name: '150g Mehl' }, { category: 'Milchprodukte & Eier', name: '250ml Milch' }, { category: 'Trockenwaren & Konserven', name: '50g Rosinen (optional)' }, { category: 'Sonstiges', name: 'Puderzucker' }
    ], instructions: [
        "Eier trennen. Eigelb mit Mehl, Milch und Zucker zu einem glatten Teig verrühren. Rosinen unterrühren.",
        "Eiweiß zu steifem Schnee schlagen und vorsichtig unter den Teig heben.",
        "Butter in einer großen Pfanne erhitzen, den Teig hineingießen und bei mittlerer Hitze goldbraun anbacken.",
        "Den Teig vierteln, wenden und ebenfalls goldbraun backen.",
        "Mit zwei Gabeln in mundgerechte Stücke reißen.",
        "Mit Puderzucker bestäuben und kurz karamellisieren lassen. Mit Apfelmus oder Zwetschgenröster servieren."
    ]},
    { id: 'r061', title: 'Kartoffel-Kohlrabi-Gemüse', base: 'kartoffeln', tags: ['Vegetarisch', 'Günstig', 'Schnell', 'Pfannengericht'], estimatedPricePerServing: 1.8, sideSuggestion: 'Spiegelei oder Frikadelle', ingredients: [
        { category: 'Obst & Gemüse', name: '800g Kartoffeln' }, { category: 'Obst & Gemüse', name: '2 Kohlrabi' }, { category: 'Obst & Gemüse', name: '1 Zwiebel' }, { category: 'Gewürze & Öle', name: '200ml Gemüsebrühe' }, { category: 'Milchprodukte & Eier', name: '200ml Sahne' }, { category: 'Obst & Gemüse', name: '1 Bund Petersilie' }, { category: 'Gewürze & Öle', name: 'Muskatnuss' }
    ], instructions: [
        "Kartoffeln und Kohlrabi schälen und in mundgerechte Würfel schneiden.",
        "Zwiebel würfeln und in einem Topf mit etwas Öl glasig dünsten.",
        "Kartoffel- und Kohlrabiwürfel dazugeben und kurz mitbraten.",
        "Mit Gemüsebrühe ablöschen und zugedeckt ca. 15-20 Minuten köcheln lassen, bis das Gemüse gar ist.",
        "Sahne unterrühren, mit Salz, Pfeffer und Muskatnuss abschmecken und gehackte Petersilie darüber streuen."
    ]},
    { id: 'r062', title: 'Blumenkohlauflauf mit Kartoffeln', base: 'kartoffeln', tags: ['Vegetarisch', 'Ofengericht', 'Käse', 'Günstig'], estimatedPricePerServing: 2.2, sideSuggestion: 'Grüner Salat', ingredients: [
        { category: 'Obst & Gemüse', name: '1 großer Blumenkohl' }, { category: 'Obst & Gemüse', name: '800g festkochende Kartoffeln' }, { category: 'Milchprodukte & Eier', name: '200ml Sahne' }, { category: 'Milchprodukte & Eier', name: '100ml Milch' }, { category: 'Milchprodukte & Eier', name: '150g geriebener Käse (z.B. Gouda)' }, { category: 'Obst & Gemüse', name: '1 Zwiebel' }, { category: 'Milchprodukte & Eier', name: '2 EL Butter' }, { category: 'Backwaren', name: '2 EL Mehl' }, { category: 'Gewürze & Öle', name: 'Muskatnuss' }
    ], instructions: [
        "Kartoffeln schälen und in dünne Scheiben schneiden. Blumenkohl in Röschen teilen. Beides in Salzwasser ca. 10 Minuten vorkochen.",
        "Für die Béchamelsauce Zwiebel fein würfeln, in Butter andünsten. Mehl dazugeben und anschwitzen.",
        "Mit Milch und Sahne ablöschen, unter Rühren aufkochen lassen und mit Salz, Pfeffer und Muskatnuss würzen.",
        "Kartoffeln und Blumenkohl in eine Auflaufform geben, die Sauce darüber verteilen.",
        "Mit Käse bestreuen und im vorgeheizten Ofen bei 200°C ca. 20-25 Minuten goldbraun backen."
    ]},
    { id: 'r063', title: 'Himbeerkuchen mit Biskuit und Pudding', base: 'mix', tags: ['Vegetarisch', 'Süßspeise', 'Kuchen'], estimatedPricePerServing: 1.5, ingredients: [
        { category: 'Milchprodukte & Eier', name: '4 Eier' }, { category: 'Backwaren', name: '200g Zucker' }, { category: 'Backwaren', name: '1 Pck. Vanillezucker' }, { category: 'Backwaren', name: '100g Mehl' }, { category: 'Backwaren', name: '50g Speisestärke' }, { category: 'Backwaren', name: '1 TL Backpulver' }, { category: 'Backwaren', name: '1 Pck. Vanillepuddingpulver' }, { category: 'Milchprodukte & Eier', name: '500ml Milch' }, { category: 'Obst & Gemüse', name: '500g Himbeeren (TK oder frisch)' }, { category: 'Backwaren', name: '1 Pck. Tortenguss, rot' }
    ], instructions: [
        "Für den Biskuit Eier mit Zucker und Vanillezucker schaumig schlagen. Mehl, Stärke und Backpulver mischen und unterheben.",
        "Teig in eine Springform (26cm) füllen und bei 180°C ca. 20-25 Minuten backen. Auskühlen lassen.",
        "Puddingpulver mit Zucker und etwas Milch anrühren. Restliche Milch aufkochen, Puddingpulver einrühren und kurz kochen lassen. Etwas abkühlen lassen und auf dem Biskuitboden verteilen.",
        "Himbeeren auf dem Pudding verteilen.",
        "Tortenguss nach Packungsanweisung zubereiten und über die Himbeeren geben. Kuchen kalt stellen bis der Guss fest ist."
    ]},
    { id: 'r064', title: 'Hähnchenbrust im Backofen mit Zitrone & Kräutern', base: 'mix', tags: ['Fleisch', 'Ofengericht', 'Schnell', 'Gesund'], estimatedPricePerServing: 3.2, sideSuggestion: 'Baguette oder Reis', ingredients: [
        { category: 'Fleisch & Fisch', name: '4 Hähnchenbrustfilets' }, { category: 'Obst & Gemüse', name: '1 Zitrone' }, { category: 'Obst & Gemüse', name: '4 Zehen Knoblauch' }, { category: 'Obst & Gemüse', name: '2 Zweige Rosmarin' }, { category: 'Gewürze & Öle', name: '4 EL Olivenöl' }, { category: 'Obst & Gemüse', name: '200g Cherrytomaten' }, { category: 'Gewürze & Öle', name: 'Salz und Pfeffer' }
    ], instructions: [
        "Ofen auf 200°C vorheizen.",
        "Hähnchenbrustfilets in eine Auflaufform legen. Mit Salz und Pfeffer würzen.",
        "Zitrone in Scheiben schneiden, Knoblauch andrücken.",
        "Olivenöl über das Hähnchen träufeln. Zitronenscheiben, Knoblauch, Rosmarin und Cherrytomaten um das Hähnchen herum verteilen.",
        "Im Ofen für ca. 25-30 Minuten backen, bis das Hähnchen gar ist."
    ]},
    { id: 'r065', title: 'Flaumiger Kaiserschmarrn', base: 'mix', tags: ['Vegetarisch', 'Süßspeise', 'Klassiker'], estimatedPricePerServing: 2.3, sideSuggestion: 'Apfelmus oder Zwetschgenröster', ingredients: [
        { category: 'Milchprodukte & Eier', name: '4 Eier' }, { category: 'Milchprodukte & Eier', name: '250ml Milch' }, { category: 'Backwaren', name: '150g Mehl' }, { category: 'Gewürze & Öle', name: '1 Prise Salz' }, { category: 'Backwaren', name: '30g Zucker' }, { category: 'Sonstiges', name: '50g Rosinen in Rum (optional)' }, { category: 'Milchprodukte & Eier', name: 'Butter zum Backen' }, { category: 'Backwaren', name: 'Puderzucker zum Bestäuben' }
    ], instructions: [
        "Eier trennen. Eigelb mit Milch, Mehl, Zucker und Salz zu einem glatten Teig verrühren. Rosinen unterrühren.",
        "Eiweiß zu steifem Schnee schlagen und vorsichtig unter den Teig heben.",
        "Butter in einer großen Pfanne erhitzen, den Teig hineingießen und bei mittlerer Hitze goldbraun anbacken.",
        "Den Teig vierteln, wenden und ebenfalls goldbraun backen.",
        "Mit zwei Gabeln in mundgerechte Stücke reißen.",
        "Mit Puderzucker bestäuben und kurz karamellisieren lassen. Mit Apfelmus oder Zwetschgenröster servieren."
    ]},
] as const;

export const getSeedRecipes = (): Recipe[] => {
    const now = new Date().toISOString();
    const allRecipes = [...oldRecipes, ...tempRecipes];
    return allRecipes.map(r => ({
        id: r.id,
        name: r.title,
        ingredients: r.ingredients,
        instructions: (r.instructions || []).join('\n'),
        price: r.estimatedPricePerServing,
        link: r.link,
        tags: r.tags,
        base: r.base,
        sideSuggestion: r.sideSuggestion,
        isPremium: r.isPremium,
        lastModified: now,
        version: 1,
    }));
};