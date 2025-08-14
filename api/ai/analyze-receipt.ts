import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed, use POST' });
  }

  try {
    const { base64Image, categories } = req.body as { base64Image?: string; categories?: string[] };

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
    }
    if (!base64Image || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'Missing payload: base64Image or categories' });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const system = `
Du bist ein Assistent, der Kassenbelege erkennt und strukturierte Felder extrahiert.
Gib ausschließlich ein JSON mit Feldern { "amount": number, "description": string, "category": string } zurück.
Die Kategorie muss aus dieser Liste stammen: ${categories.join(', ')}.
Betrag als Zahl (Dezimalpunkt oder -komma werden akzeptiert).
Beschreibung kurz (z.B. Händlername).
`.trim();

    const userText = `
Analysiere das folgende Belegfoto und extrahiere amount, description, category (nur aus der Liste).
Gib nur das JSON-Objekt zurück, ohne Erklärungen.
`.trim();

    const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            { type: 'image_url', image_url: { url: imageDataUrl } }
          ]
        }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);

    // Normalisieren
    const amountNum =
      typeof parsed.amount === 'string'
        ? Number(parsed.amount.replace(',', '.'))
        : Number(parsed.amount ?? 0);

    const out = {
      amount: Number.isFinite(amountNum) ? amountNum : 0,
      description: (parsed.description ?? '').toString().trim(),
      category: (parsed.category ?? '').toString().trim(),
    };

    return res.status(200).json(out);
  } catch (e: any) {
    console.error('AI analyze error:', e);
    return res.status(500).json({ error: 'AI analyze failed', message: e?.message || String(e) });
  }
}
