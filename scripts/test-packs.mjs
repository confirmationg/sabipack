import fs from 'node:fs';
import assert from 'node:assert';
import { validatePack } from '../lib/validate.mjs';
const idx = JSON.parse(fs.readFileSync('public/packs/index.json', 'utf8'));
const syl = JSON.parse(fs.readFileSync('content/syllabus.json', 'utf8'));
const ids = new Set(syl.topics.flatMap(t => t.subtopics.map(s => s.id)));
for (const p of idx) {
  const pk = JSON.parse(fs.readFileSync(`public/packs/${p.id}.json`, 'utf8'));
  assert.deepEqual(validatePack(pk), [], p.id);
  assert.ok(ids.has(pk.subtopic_id), 'unknown syllabus id ' + p.id);
  assert.ok(['draft','reviewed'].includes(pk.meta.status));
  if (pk.lesson.sections) for (const sec of pk.lesson.sections) assert.ok(sec.heading && (sec.text || (sec.items && sec.items.length)), 'section ' + sec.heading);
}
console.log('pack tests passed (' + idx.length + ' packs)');
