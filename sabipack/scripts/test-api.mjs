// Tests the endpoint with a pretend Groq, so no key or internet is needed.
import assert from 'node:assert';
process.env.GROQ_API_KEY = 'k'; process.env.GROQ_MODEL = 'm'; process.env.MAKER_PASSCODE = 'pw';
const good = { lesson: { title: 'Cell basics', body: 'x'.repeat(120), audio_script: 'y'.repeat(80) },
  questions: [1,2,3,4,5].map(i => ({ stem: 'Which part does job number ' + i + '?', options: ['A','B','C','D'], answer_index: 1, explanation: 'From the source text.', objective_hint: 'cell parts' })) };
globalThis.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(good) } }] }) });
const { default: handler } = await import('../api/generate.js');
const call = async body => { let out; const res = { status: c => ({ json: j => (out = { c, j }) }) }; await handler({ method: 'POST', body }, res); return out; };
const base = { passcode: 'pw', subId: 'bio-11-1', text: 'cell '.repeat(120), attribution: 'OpenStax test', license: 'CC BY 4.0' };
assert.equal((await call({ ...base, passcode: 'no' })).c, 401);
assert.equal((await call({ ...base, text: '', url: 'https://evil.example.com/x' })).c, 400);
assert.equal((await call({ ...base, license: '' })).c, 400);
const ok = await call(base);
assert.equal(ok.c, 200); assert.equal(ok.j.meta.status, 'draft'); assert.equal(ok.j.subtopic_id, 'bio-11-1');
console.log('api tests passed');
