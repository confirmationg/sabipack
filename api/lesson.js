// "Ask the AI": a student types a topic and gets a full lesson, quiz and simple diagrams.
// Public (no sign-in). Safeguards: topic length cap, output cap, and an on/off switch (TRY_ENABLED=false).
import { generateLesson } from '../lib/lesson.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  const { GROQ_API_KEY: key, GROQ_MODEL: model } = process.env;
  if (process.env.TRY_ENABLED === 'false') return res.status(503).json({ error: 'The live AI is switched off. Please use the lessons already on your phone.' });
  if (!key || !model) return res.status(503).json({ error: 'The AI is not set up yet.' });
  const b = req.body || {};
  const topic = String(b.topic || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  const subject = String(b.subject || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60);
  if (topic.length < 3) return res.status(400).json({ error: 'Type a topic of at least 3 letters.' });
  if (topic.length > 120) return res.status(400).json({ error: 'Please keep the topic under 120 characters.' });
  try {
    const out = await generateLesson({ topic, subject, key, model });
    if (out.error) return res.status(422).json({ error: 'That topic is not suitable for a school lesson. Try a school topic.' });
    return res.status(200).json({ ...out, meta: { status: 'draft', model, generated_at: new Date().toISOString() } });
  } catch { return res.status(502).json({ error: 'The AI could not write a good lesson this time. Please try again.' }); }
}
