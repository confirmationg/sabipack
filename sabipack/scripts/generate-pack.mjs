// Command-line version (optional). Most people should use /maker.html instead.
// Usage: GROQ_API_KEY=... GROQ_MODEL=... node scripts/generate-pack.mjs bio-11-1
import fs from 'node:fs';
import { generatePack } from '../lib/generate.mjs';
const subId = process.argv[2], key = process.env.GROQ_API_KEY, model = process.env.GROQ_MODEL;
if (!subId || !key || !model) { console.error('Usage: GROQ_API_KEY=... GROQ_MODEL=... node scripts/generate-pack.mjs <subtopic-id>'); process.exit(1); }
const syl = JSON.parse(fs.readFileSync('content/syllabus.json', 'utf8'));
let topic, sub;
for (const t of syl.topics) for (const s of t.subtopics) if (s.id === subId) { topic = t; sub = s; }
if (!sub) { console.error('Unknown sub-topic id: ' + subId); process.exit(1); }
const srcPath = `content/sources/${subId}.md`;
if (!fs.existsSync(srcPath)) { console.error(`No source text at ${srcPath}. We never generate lessons without a source.`); process.exit(1); }
const src = fs.readFileSync(srcPath, 'utf8');
const attribution = (src.match(/^Source:.*$/m) || [])[0], license = (src.match(/^License:.*$/m) || [])[0];
if (!attribution || !license) { console.error('Source file must start with "Source:" and "License:" lines.'); process.exit(1); }
try {
  const pack = await generatePack({ topic: topic.title, sub: sub.title, src, key, model });
  fs.writeFileSync(`content/packs/${subId}.json`, JSON.stringify({ subtopic_id: subId, topic: topic.title, subtopic: sub.title, ...pack,
    meta: { source_file: srcPath, attribution, license, model, generated_at: new Date().toISOString(), status: 'draft' } }, null, 1));
  console.log(`Saved content/packs/${subId}.json (status: draft).`);
} catch (e) { console.error(e.message); process.exit(1); }
