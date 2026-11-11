import assert from 'node:assert';
import { validateLesson, diagramErrors } from '../lib/validate.mjs';
Object.assign(process.env, { GROQ_API_KEY: 'k', GROQ_MODEL: 'm' });
const q = i => ({ stem: 'Which statement about osmosis number ' + i + ' is true?', options: ['A1', 'B1', 'C1', 'D1'], answer_index: 1, explanation: 'Because of the lesson.', objective_hint: 'osmosis' });
const lesson = () => ({ lesson: {
  title: 'Osmosis', big_idea: 'Osmosis is the movement of water through a membrane.', body: 'Osmosis is the movement of water through a partially permeable membrane. '.repeat(2), audio_script: 'Osmosis is the movement of water. '.repeat(4),
  sections: [{ heading: 'What it is', text: 'Water moves from a dilute solution to a concentrated one.' }, { heading: 'Where it happens', items: [['Root hair', 'takes in water from soil']] }],
  compare: { title: 'Osmosis and diffusion', headers: ['', 'Osmosis', 'Diffusion'], rows: [['Moves', 'water', 'any particles']] },
  example: 'A dry bean swells when soaked in water.', key_terms: [['Solute', 'the dissolved substance']], exam_trap: 'Osmosis is only about water.',
  diagrams: [{ type: 'flow', title: 'Water into a root', steps: [{ label: 'Soil water' }, { label: 'Root hair cell', note: 'osmosis' }, { label: 'Xylem' }] }] },
  questions: [1, 2, 3, 4, 5].map(q) });
assert.deepEqual(validateLesson(lesson()), []);
const bad = lesson(); bad.lesson.sections = [{ heading: 'x' }]; assert.ok(validateLesson(bad).some(x => x.includes('2-8 sections')));
const bad2 = lesson(); bad2.lesson.sections = [{ heading: 'x' }, { heading: 'Fine heading' }]; assert.ok(validateLesson(bad2).length >= 3, 'short heading and missing text are caught');
assert.ok(diagramErrors({ type: 'cycle', steps: [{ label: 'a' }, { label: 'b' }] }).length, 'cycle needs 3');
assert.ok(diagramErrors({ type: 'parts', steps: [{ label: 'a' }, { label: 'b' }] }).length, 'parts needs center');
assert.ok(diagramErrors({ type: 'svg', steps: [] }).length);
assert.deepEqual(diagramErrors({ type: 'parts', center: 'Cell', steps: [{ label: 'Nucleus', note: 'control' }, { label: 'Membrane' }] }), []);

let calls = 0, reply;
globalThis.fetch = async () => { calls++; const r = typeof reply === 'function' ? reply(calls) : reply; return { ok: true, json: async () => ({ choices: [{ message: { content: typeof r === 'string' ? r : JSON.stringify(r) } }] }) }; };
const { default: h } = await import('../api/lesson.js');
const call = async body => { let out; await h({ method: 'POST', body }, { status: c => ({ json: j => (out = { c, j }) }) }); return out; };
assert.equal((await call({ topic: 'ab' })).c, 400);
assert.equal((await call({ topic: 'x'.repeat(121) })).c, 400);
reply = lesson(); calls = 0;
const ok = await call({ topic: 'Osmosis', subject: 'Biology' });
assert.equal(ok.c, 200); assert.equal(ok.j.lesson.diagrams.length, 1); assert.equal(ok.j.meta.status, 'draft'); assert.equal(calls, 1);
// fenced JSON and think tags are tolerated
reply = '<think>hmm</think>```json\n' + JSON.stringify(lesson()) + '\n```'; assert.equal((await call({ topic: 'Osmosis' })).c, 200);
// invalid diagrams are dropped, the lesson survives
const d = lesson(); d.lesson.diagrams = [{ type: 'svg', steps: [] }, { type: 'flow', steps: [{ label: 'only one' }] }]; reply = d;
const dropped = await call({ topic: 'Osmosis' }); assert.equal(dropped.c, 200); assert.equal(dropped.j.lesson.diagrams, undefined);
// first answer broken, second good: it retries
calls = 0; reply = n => (n === 1 ? { lesson: { title: 'x' } } : lesson()); assert.equal((await call({ topic: 'Osmosis' })).c, 200); assert.equal(calls, 2, 'retried once');
// always broken: polite failure
reply = { nonsense: true }; assert.equal((await call({ topic: 'Osmosis' })).c, 502);
// unsuitable topic
reply = { error: 'not_suitable' }; const ns = await call({ topic: 'something unsuitable' }); assert.equal(ns.c, 422); assert.ok(ns.j.error.includes('not suitable'));
// switches
process.env.TRY_ENABLED = 'false'; assert.equal((await call({ topic: 'Osmosis' })).c, 503); delete process.env.TRY_ENABLED;
delete process.env.GROQ_MODEL; assert.equal((await call({ topic: 'Osmosis' })).c, 503);
console.log('lesson tests passed');
