export interface Recipe {
    id: string;
    title: string;
    link: string;
    base: 'nudeln' | 'reis' | 'kartoffeln' | 'mix';
    tags: ('vegetarian' | 'cheap' | 'quick' | 'meat' | 'fish' | 'glutenFree' | 'lactoseFree')[];
    gramsPerServing: number;
    pricePer100g: number;
    sideSuggestion?: string;
}

export const recipes: readonly Recipe[] = [
    // Pasta
    { id: 'r001', title: 'Spaghetti Bolognese', link: 'https://www.chefkoch.de/rezepte/1183241224168230/Spaghetti-Bolognese.html', base: 'nudeln', tags: ['meat', 'quick'], gramsPerServing: 120, pricePer100g: 1.8, sideSuggestion: 'Salat' },
    { id: 'r002', title: 'Pesto-Nudeln mit Tomaten', link: 'https://www.eat.de/rezept/pesto-nudeln/', base: 'nudeln', tags: ['vegetarian', 'quick', 'cheap'], gramsPerServing: 125, pricePer100g: 1.1, sideSuggestion: 'Rucola' },
    { id: 'r003', title: 'Linsen-Bolognese', link: 'https://www.eat.de/rezept/linsen-bolognese/', base: 'nudeln', tags: ['vegetarian', 'cheap'], gramsPerServing: 110, pricePer100g: 0.9, sideSuggestion: 'Salat' },
    { id: 'r004', title: 'Lachs-Sahne-Gratin', link: 'https://www.chefkoch.de/rezepte/1018331207137979/Lachs-Sahne-Gratin-mit-Bandnudeln.html', base: 'nudeln', tags: ['fish'], gramsPerServing: 150, pricePer100g: 2.2 },

    // Rice
    { id: 'r005', title: 'Hähnchen-Curry', link: 'https://www.chefkoch.de/rezepte/1179041223841913/Haehnchen-Curry.html', base: 'reis', tags: ['meat'], gramsPerServing: 200, pricePer100g: 1.7, sideSuggestion: 'Naan-Brot' },
    { id: 'r006', title: 'Chili con Carne', link: 'https://www.chefkoch.de/rezepte/1153231221379963/Chili-con-carne.html', base: 'reis', tags: ['meat', 'cheap'], gramsPerServing: 220, pricePer100g: 1.3, sideSuggestion: 'Brot' },
    { id: 'r007', title: 'Gemüse-Reispfanne', link: 'https://www.eat.de/rezept/gemuese-reispfanne/', base: 'reis', tags: ['vegetarian', 'quick', 'cheap'], gramsPerServing: 250, pricePer100g: 1.0 },
    { id: 'r008', title: 'Risotto mit Pilzen', link: 'https://www.eat.de/rezept/risotto-mit-pilzen/', base: 'reis', tags: ['vegetarian'], gramsPerServing: 180, pricePer100g: 1.6 },

    // Potatoes
    { id: 'r009', title: 'Kartoffel-Gratin', link: 'https://www.chefkoch.de/rezepte/53351019253457/Der-beste-Kartoffelgratin.html', base: 'kartoffeln', tags: ['vegetarian', 'cheap'], gramsPerServing: 300, pricePer100g: 0.8, sideSuggestion: 'Salat' },
    { id: 'r010', title: 'Bratkartoffeln mit Spiegelei', link: 'https://www.chefkoch.de/rezepte/601611159826359/Omas-Bratkartoffeln.html', base: 'kartoffeln', tags: ['vegetarian', 'quick', 'cheap'], gramsPerServing: 350, pricePer100g: 0.7 },
    { id: 'r011', title: 'Ofenkartoffeln mit Quark', link: 'https://www.eat.de/rezept/ofenkartoffeln-mit-quark/', base: 'kartoffeln', tags: ['vegetarian', 'quick', 'cheap'], gramsPerServing: 400, pricePer100g: 0.6, sideSuggestion: 'Salat' },
    { id: 'r012', title: 'Kartoffelsuppe', link: 'https://www.chefkoch.de/rezepte/621211162180183/Omas-Kartoffelsuppe.html', base: 'kartoffeln', tags: ['vegetarian', 'cheap'], gramsPerServing: 500, pricePer100g: 0.5, sideSuggestion: 'Brot' },

    // Mix / Other
    { id: 'r013', title: 'Flammkuchen', link: 'https://www.chefkoch.de/rezepte/393281127885986/Els-sser-Flammkuchen.html', base: 'mix', tags: ['meat', 'quick'], gramsPerServing: 250, pricePer100g: 1.2 },
    { id: 'r014', title: 'Gefüllte Paprika', link: 'https://www.chefkoch.de/rezepte/2012111325996229/Gefuellte-Paprika-mit-Hackfleisch.html', base: 'mix', tags: ['meat'], gramsPerServing: 300, pricePer100g: 1.5, sideSuggestion: 'Reis' },
    { id: 'r015', title: 'Kürbissuppe', link: 'https://www.eat.de/rezept/kuerbissuppe/', base: 'mix', tags: ['vegetarian', 'cheap'], gramsPerServing: 500, pricePer100g: 0.7, sideSuggestion: 'Brot' },
    { id: 'r016', title: 'Wraps mit Hähnchen', link: 'https://www.eat.de/rezept/wraps-mit-haehnchen/', base: 'mix', tags: ['meat', 'quick'], gramsPerServing: 280, pricePer100g: 1.9 },
] as const;