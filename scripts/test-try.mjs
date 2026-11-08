import assert from 'node:assert';
Object.assign(process.env, { GROQ_API_KEY: 'k', GROQ_MODEL: 'm' });
const good = { lesson: { title: 'Cell basics', body: 'x'.repeat(120), audio_script: 'y'.repeat(80) },
  questions: [1,2,3,4,5].map(i => ({ stem: 'Which part does job number ' + i + '?', options: ['A','B','C','D'], answer_index: 1, explanation: 'From the notes.', objective_hint: 'cell parts' })) };
globalThis.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(good) } }] }) });
const { default: h } = await import('../api/try.js');
const call = async text => { let out; await h({ method: 'POST', body: { text } }, { status: c => ({ json: j => (out = { c, j }) }) }); return out; };
const t = 'cell '.repeat(120);
assert.equal((await call('too short')).c, 400);
assert.equal((await call('x'.repeat(3001))).c, 400);
const ok = await call(t); assert.equal(ok.c, 200); assert.equal(ok.j.meta.status, 'draft');
process.env.TRY_ENABLED = 'false'; assert.equal((await call(t)).c, 503);
console.log('try tests passed');
