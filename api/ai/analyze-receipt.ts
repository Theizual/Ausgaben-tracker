import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed, use POST' });
  }

  try {
    const { base64Image, categories } = req.body as { base64Image?: string; categories?: string[] };

    if (!process.env.API_KEY) {
      return res.status(500).json({ error: 'Missing API_KEY environment variable' });
    }
    if (!base64Image || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'Missing payload: base64Image or categories' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
        },
    };

    const textPart = {
        text: `
        Analysiere den Kassenbeleg im Bild. Extrahiere den Gesamtbetrag (amount), 
        eine kurze Beschreibung des Händlers (description) und wähle die passendste 
        Kategorie für den Einkauf aus der folgenden Liste aus.
        
        Verfügbare Kategorien:
        ${categories.join(', ')}

        Gib nur das JSON-Objekt zurück.
        `.trim(),
    };

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            amount: {
                type: Type.NUMBER,
                description: 'Der Gesamtbetrag des Belegs als Zahl.',
            },
            description: {
                type: Type.STRING,
                description: 'Eine kurze Beschreibung des Händlers oder des Einkaufs.',
            },
            category: {
                type: Type.STRING,
                description: 'Die am besten passende Kategorie aus der vorgegebenen Liste.',
            },
        },
        required: ['amount', 'description', 'category'],
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        }
    });

    const jsonStr = response.text;
    const parsed = JSON.parse(jsonStr);
    
    // Normalize the output
    const amountNum =
      typeof parsed.amount === 'string'
        ? Number(parsed.amount.replace(',', '.'))
        : Number(parsed.amount ?? 0);

    const out = {
      amount: Number.isFinite(amountNum) ? amountNum : 0,
      description: (parsed.description ?? 'Unbekannter Beleg').toString().trim(),
      category: (parsed.category ?? '').toString().trim(),
    };
    
    return res.status(200).json(out);

  } catch (e: any) {
    console.error('Gemini AI analyze error:', e);
    const errorMessage = e?.response?.data?.error?.message || e.message || String(e);
    return res.status(500).json({ error: 'AI analyze failed', message: errorMessage });
  }
}
