
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';

async function fetchHtml(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch URL with status ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error("Fetch error:", error);
        throw new Error("Could not retrieve content from the URL.");
    }
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed, use POST' });
  }

  try {
    const { url } = req.body as { url?: string };

    if (!process.env.API_KEY) {
      return res.status(500).json({ error: 'Missing API_KEY environment variable' });
    }
    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ error: 'A valid URL is required.' });
    }
    
    const html = await fetchHtml(url);
    // Limit input size to avoid exceeding token limits
    const truncatedHtml = html.substring(0, 30000);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Analysiere den folgenden HTML-Inhalt einer Rezept-Webseite.
      Extrahiere die folgenden Informationen und gib sie als JSON-Objekt zurück:
      1.  **title**: Der Name des Gerichts.
      2.  **tags**: Eine Liste von bis zu 5 relevanten Stichwörtern (z.B. "Vegetarisch", "Schnell", "Ofengericht", "Italienisch").
      3.  **base**: Die Haupt-Sättigungsbeilage. Muss einer der folgenden Werte sein: 'nudeln', 'reis', 'kartoffeln', 'mix'. Wähle 'mix' wenn es keine eindeutige Beilage ist oder etwas anderes (z.B. Brot, Salat).
      4.  **estimatedPricePerServing**: Eine realistische Schätzung der Kosten pro Portion in Euro, basierend auf deutschen Supermarktpreisen. Dies ist eine Schätzung, gib einfach eine plausible Zahl an.

      HTML-Inhalt:
      ${truncatedHtml}
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            },
            base: {
                type: Type.STRING,
                description: "Muss einer der folgenden Werte sein: 'nudeln', 'reis', 'kartoffeln', 'mix'"
            },
            estimatedPricePerServing: { type: Type.NUMBER }
        },
        required: ["title", "tags", "base", "estimatedPricePerServing"]
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        }
    });

    const jsonStr = response.text;
    const parsed = JSON.parse(jsonStr);

    const baseValues = ['nudeln', 'reis', 'kartoffeln', 'mix'];
    const validatedBase = baseValues.includes(parsed.base) ? parsed.base : 'mix';

    const out = {
        title: parsed.title || 'Unbekanntes Rezept',
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        base: validatedBase,
        estimatedPricePerServing: parsed.estimatedPricePerServing || 2.5
    };

    return res.status(200).json(out);

  } catch (e: any) {
    console.error('AI parse recipe error:', e);
    const errorMessage = e?.message || String(e);
    return res.status(500).json({ error: 'AI parsing failed', message: errorMessage });
  }
}
