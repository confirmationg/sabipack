// Pack Maker endpoint. Keys live in Vercel environment settings, never in the page.
import fs from 'node:fs';
import path from 'node:path';
import { generatePack } from '../lib/generate.mjs';

const MAX = 12000;
const strip = h => h.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const isOpenStax = h => h === 'openstax.org' || h.endsWith('.openstax.org');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  const { passcode, subId, text, url, attribution, license } = req.body || {};
  const { GROQ_API_KEY: key, GROQ_MODEL: model, MAKER_PASSCODE: pc } = process.env;
  if (!key || !model || !pc) return res.status(500).json({ error: 'Server is missing GROQ_API_KEY, GROQ_MODEL or MAKER_PASSCODE.' });
  if (passcode !== pc) return res.status(401).json({ error: 'Wrong passcode.' });

  const syl = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content/syllabus.json'), 'utf8'));
  let topic, sub;
  for (const t of syl.topics) for (const s of t.subtopics) if (s.id === subId) { topic = t; sub = s; }
  if (!sub) return res.status(400).json({ error: 'Pick a sub-topic.' });

  let src = String(text || '').trim();
  if (!src && url) {
    let u;
    try { u = new URL(url); } catch { return res.status(400).json({ error: 'That link is not valid.' }); }
    if (u.protocol !== 'https:' || !isOpenStax(u.hostname)) return res.status(400).json({ error: 'Only openstax.org links are allowed. Paste the text instead.' });
    const r = await fetch(u, { headers: { 'User-Agent': 'SabiPack/0.1' } });
    if (!r.ok || !isOpenStax(new URL(r.url).hostname)) return res.status(502).json({ error: 'Could not open that page. Paste the text instead.' });
    src = strip(await r.text());
    if (src.length < 400) return res.status(422).json({ error: 'Could not read text from that page (it may need a browser to load). Paste the text instead.' });
  }
  if (src.length < 400) return res.status(400).json({ error: 'Add at least a few paragraphs of source text.' });
  const a = String(attribution || (url ? url : '')).trim().slice(0, 200), l = String(license || '').trim().slice(0, 80);
  if (!a || !l) return res.status(400).json({ error: 'Fill in the source and the license shown on the page.' });

  try {
    const pack = await generatePack({ topic: topic.title, sub: sub.title, src: src.slice(0, MAX), key, model });
    return res.status(200).json({ subtopic_id: subId, topic: topic.title, subtopic: sub.title, ...pack,
      meta: { attribution: 'Source: ' + a, license: 'License: ' + l, model, generated_at: new Date().toISOString(), status: 'draft', source_chars: Math.min(src.length, MAX) } });
  } catch (e) { return res.status(502).json({ error: e.message }); }
}
