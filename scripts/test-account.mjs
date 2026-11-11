import assert from 'node:assert';
import fs from 'node:fs';
fs.rmSync('/tmp/acct-test.db', { force: true });
Object.assign(process.env, { TURSO_DATABASE_URL: 'file:/tmp/acct-test.db', AUTH_SECRET: 'x'.repeat(40) });
const { default: h } = await import('../api/account.js');
const call = async body => { let out; await h({ method: 'POST', body }, { status: c => ({ json: j => (out = { c, j }) }) }); return out; };
const su = { action: 'signup', email: ' Ada@Example.com ', password: 'goodpass1', name: 'Ada' };
assert.equal((await call({ ...su, email: 'bad' })).c, 400);
assert.equal((await call({ ...su, password: 'short' })).c, 400);
assert.equal((await call({ ...su, name: '  ' })).c, 400);
const a = await call(su); assert.equal(a.c, 200); assert.equal(a.j.user.email, 'ada@example.com'); assert.ok(a.j.token.includes('.')); assert.equal(a.j.data, null);
assert.equal((await call({ ...su, email: 'ADA@example.com' })).c, 409, 'duplicate email');
const raw = fs.readFileSync('/tmp/acct-test.db'); assert.ok(!raw.includes('goodpass1'), 'password never stored in plain text');
const l = await call({ action: 'login', email: 'ada@example.com', password: 'goodpass1' }); assert.equal(l.c, 200); const tok = l.j.token;
assert.equal((await call({ action: 'load', token: tok })).c, 200);
assert.equal((await call({ action: 'load', token: tok + 'x' })).c, 401, 'tampered token');
assert.equal((await call({ action: 'load', token: 'nope' })).c, 401);
const data = { subjects: ['Biology'], packs: [{ id: 1, lesson: { title: 'T' } }], last: 'bio-11-1' };
assert.equal((await call({ action: 'save', token: tok, data, name: 'Ada O' })).c, 200);
const back = await call({ action: 'load', token: tok }); assert.deepEqual(back.j.data, data); assert.equal(back.j.user.name, 'Ada O');
assert.equal((await call({ action: 'save', token: tok, data: 'x' })).c, 400);
assert.equal((await call({ action: 'save', token: tok, data: { packs: Array(61).fill(1) } })).c, 413);
assert.equal((await call({ action: 'save', token: tok, data: { x: 'y'.repeat(260000) } })).c, 413);
const l2 = await call({ action: 'login', email: 'ada@example.com', password: 'goodpass1' }); assert.deepEqual(l2.j.data, data, 'login returns the backup');
// lockout after 5 wrong passwords
for (let i = 0; i < 5; i++) assert.equal((await call({ action: 'login', email: 'ada@example.com', password: 'wrongpass' + i })).c, 401);
assert.equal((await call({ action: 'login', email: 'ada@example.com', password: 'goodpass1' })).c, 429, 'locked after 5 failures');
assert.equal((await call({ action: 'login', email: 'nobody@example.com', password: 'whatever1' })).c, 401);
// delete needs the right password
const bob = await call({ ...su, email: 'bob@example.com', name: 'Bob' });
assert.equal((await call({ action: 'delete', token: bob.j.token, password: 'nope' })).c, 401);
assert.equal((await call({ action: 'delete', token: bob.j.token, password: 'goodpass1' })).c, 200);
assert.equal((await call({ action: 'load', token: bob.j.token })).c, 401, 'deleted account cannot load');
// switched off without settings
delete process.env.AUTH_SECRET; assert.equal((await call({ action: 'login', email: 'a@b.co', password: 'x' })).c, 503);
console.log('account tests passed');
