// Public "Try the AI" endpoint for judges and students. No passcode and no per-user limits.
// Safeguards kept simple: input size cap, output size cap, and an on/off switch (TRY_ENABLED=false).
import { generatePack } from '../lib/generate.mjs';

const MIN = 400, MAX = 3000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  const { GROQ_API_KEY: key, GROQ_MODEL: model } = process.env;
  if (process.env.TRY_ENABLED === 'false') return res.status(503).json({ error: 'The live AI try-out is switched off. Please use the recorded demo.' });
  if (!key || !model) return res.status(503).json({ error: 'The live AI try-out is not set up yet.' });
  const text = String((req.body || {}).text || '').trim();
  if (text.length < MIN) return res.status(400).json({ error: `Paste at least ${MIN} characters of notes (a few sentences).` });
  if (text.length > MAX) return res.status(400).json({ error: `Please keep it under ${MAX} characters.` });
  try {
    const pack = await generatePack({ topic: 'Your notes', sub: 'Student-supplied notes', src: text, key, model,
      audience: 'Nigerian secondary school students preparing for exams', maxTokens: 1500 });
    return res.status(200).json({ ...pack,
      meta: { status: 'draft', note: 'Made from the pasted notes by AI. Check it before use.', generated_at: new Date().toISOString() } });
  } catch (e) { return res.status(502).json({ error: 'The AI could not make a valid pack this time. Please try again.' }); }
}
