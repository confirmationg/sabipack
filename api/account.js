// Optional cloud accounts: email + password, plus a small backup of subjects and saved packs.
// No email is sent, so there is no email check and no "forgot password". Guests can still use everything.
import crypto from 'node:crypto';
import { createClient } from '@libsql/client';

let db, ready;
const getDb = () => db || (process.env.TURSO_DATABASE_URL ? (db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })) : null);
const init = d => ready || (ready = d.execute('CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, data TEXT, fails INTEGER DEFAULT 0, locked_until INTEGER DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)'));
const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw, salt, 64, (e, k) => (e ? rej(e) : res(k))));
const b64 = s => Buffer.from(s).toString('base64url');
const mac = (p, secret) => crypto.createHmac('sha256', secret).update(p).digest('base64url');
const sign = (o, secret) => { const p = b64(JSON.stringify(o)); return p + '.' + mac(p, secret); };
function verify(tok, secret) {
  if (typeof tok !== 'string') return null;
  const [p, s] = tok.split('.'); if (!p || !s) return null;
  const a = Buffer.from(s), e = Buffer.from(mac(p, secret));
  if (a.length !== e.length || !crypto.timingSafeEqual(a, e)) return null;
  try { const o = JSON.parse(Buffer.from(p, 'base64url').toString()); return o.exp > Date.now() ? o : null; } catch { return null; }
}
const clean = s => String(s || '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
const MAX_DATA = 250000, DAY = 86400000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  const secret = process.env.AUTH_SECRET, d = getDb();
  if (!d || !secret || secret.length < 32) return res.status(503).json({ error: 'Accounts are not switched on yet. You can still use SabiPack without one.' });
  try { await init(d); } catch { ready = null; return res.status(503).json({ error: 'The account service is not available right now.' }); }
  const b = req.body || {}, now = Date.now();
  const tokenFor = u => sign({ uid: u.id, exp: now + 30 * DAY }, secret);
  const parse = u => { try { return u.data ? JSON.parse(u.data) : null; } catch { return null; } };
  const userOf = async tok => { const t = verify(tok, secret); if (!t) return null; const r = await d.execute({ sql: 'SELECT * FROM users WHERE id=?', args: [t.uid] }); return r.rows[0] || null; };
  try {
    if (b.action === 'signup') {
      const email = clean(b.email).toLowerCase(), name = clean(b.name).slice(0, 40), pw = typeof b.password === 'string' ? b.password : '';
      if (email.length > 120 || !/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
      if (pw.length < 8 || pw.length > 100) return res.status(400).json({ error: 'Choose a password of at least 8 characters.' });
      if (!name) return res.status(400).json({ error: 'Tell us what to call you.' });
      const salt = crypto.randomBytes(16).toString('hex'), hash = (await scrypt(pw, salt)).toString('hex');
      try { await d.execute({ sql: 'INSERT INTO users(email,name,salt,hash,created_at,updated_at) VALUES(?,?,?,?,?,?)', args: [email, name, salt, hash, now, now] }); }
      catch (e) { if (/UNIQUE|constraint/i.test(String(e.message))) return res.status(409).json({ error: 'That email already has an account. Sign in instead.' }); throw e; }
      const u = (await d.execute({ sql: 'SELECT * FROM users WHERE email=?', args: [email] })).rows[0];
      return res.status(200).json({ token: tokenFor(u), user: { email, name }, data: null });
    }
    if (b.action === 'login') {
      const email = clean(b.email).toLowerCase(), pw = typeof b.password === 'string' ? b.password : '';
      const u = (await d.execute({ sql: 'SELECT * FROM users WHERE email=?', args: [email] })).rows[0];
      if (!u) { await scrypt(pw, 'x'.repeat(32)); return res.status(401).json({ error: 'Wrong email or password.' }); }
      if (Number(u.locked_until) > now) return res.status(429).json({ error: 'Too many tries. Please wait a few minutes and try again.' });
      const ok = crypto.timingSafeEqual(await scrypt(pw, u.salt), Buffer.from(u.hash, 'hex'));
      if (!ok) {
        const f = Number(u.fails) + 1;
        await d.execute({ sql: 'UPDATE users SET fails=?, locked_until=? WHERE id=?', args: [f >= 5 ? 0 : f, f >= 5 ? now + 15 * 60000 : 0, u.id] });
        return res.status(401).json({ error: 'Wrong email or password.' });
      }
      await d.execute({ sql: 'UPDATE users SET fails=0, locked_until=0 WHERE id=?', args: [u.id] });
      return res.status(200).json({ token: tokenFor(u), user: { email: u.email, name: u.name }, data: parse(u) });
    }
    const u = await userOf(b.token);
    if (!u) return res.status(401).json({ error: 'Please sign in again.' });
    if (b.action === 'load') return res.status(200).json({ user: { email: u.email, name: u.name }, data: parse(u) });
    if (b.action === 'save') {
      if (!b.data || typeof b.data !== 'object' || Array.isArray(b.data)) return res.status(400).json({ error: 'Nothing to save.' });
      if (Array.isArray(b.data.packs) && b.data.packs.length > 60) return res.status(413).json({ error: 'Too many packs to back up. Delete some and try again.' });
      const s = JSON.stringify(b.data);
      if (s.length > MAX_DATA) return res.status(413).json({ error: 'Too much to back up. Delete some packs and try again.' });
      const name = clean(b.name).slice(0, 40) || u.name;
      await d.execute({ sql: 'UPDATE users SET data=?, name=?, updated_at=? WHERE id=?', args: [s, name, now, u.id] });
      return res.status(200).json({ ok: true, name });
    }
    if (b.action === 'delete') {
      const pw = typeof b.password === 'string' ? b.password : '';
      if (!crypto.timingSafeEqual(await scrypt(pw, u.salt), Buffer.from(u.hash, 'hex'))) return res.status(401).json({ error: 'Wrong password.' });
      await d.execute({ sql: 'DELETE FROM users WHERE id=?', args: [u.id] });
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: 'Unknown request.' });
  } catch { return res.status(500).json({ error: 'Something went wrong. Please try again.' }); }
}
