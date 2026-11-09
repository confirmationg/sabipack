// SabiPack classroom server: lets one computer serve the app and its packs to a whole class
// over local Wi-Fi, with no internet. Run:  node classroom/server.mjs   (optional: PORT=9000)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, '..', 'public');
const EXTRA = path.join(here, 'packs'); // teacher drops exported .sabipack.txt files here
const PORT = Number(process.env.PORT || process.argv[2] || 8080);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8' };

// Counts devices in memory only. Nothing is written to disk and no addresses are kept.
const devices = new Set();
const note = ip => { const h = String(ip); if (!devices.has(h)) { devices.add(h); console.log(`Device connected. ${devices.size} device${devices.size > 1 ? 's' : ''} so far.`); } };

function builtins() {
  const idx = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'packs', 'index.json'), 'utf8'));
  return idx.map(p => ({ id: p.id, title: p.title, sub: 'JAMB Biology', builtin: true, file: path.join(PUBLIC, 'packs', p.id + '.json') }));
}
function extras() {
  if (!fs.existsSync(EXTRA)) return [];
  return fs.readdirSync(EXTRA).filter(f => /\.sabipack\.(txt|json)$/.test(f)).map(f => {
    try {
      const o = JSON.parse(fs.readFileSync(path.join(EXTRA, f), 'utf8'));
      if (o.format !== 'sabipack' || !Array.isArray(o.packs) || !o.packs.length) return null;
      return { id: 'x-' + f, title: (o.packs[0].lesson && o.packs[0].lesson.title) || f, sub: 'Teacher pack', file: path.join(EXTRA, f) };
    } catch { return null; }
  }).filter(Boolean);
}
const all = () => [...builtins(), ...extras()];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeName = t => String(t).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'pack';

function exportBody(p) {
  const raw = fs.readFileSync(p.file, 'utf8');
  if (!p.builtin) return raw;
  const o = JSON.parse(raw);
  return JSON.stringify({ format: 'sabipack', version: 1, exported: new Date().toISOString(), packs: [{ lesson: o.lesson, questions: o.questions, meta: o.meta || {}, subject: 'Biology' }] });
}

function classroomPage(host) {
  const rows = all().map(p => `<div class="card"><div><b>${esc(p.title)}</b><br><span class="note">${esc(p.sub)}</span></div><a class="btn" href="/classroom/download/${encodeURIComponent(p.id)}" download>Download</a></div>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SabiPack classroom</title>
<style>body{font:16px/1.45 system-ui,sans-serif;margin:0;padding:16px;max-width:560px;margin-inline:auto;background:#F6F3EC;color:#14221C}.card{display:flex;justify-content:space-between;align-items:center;gap:12px;background:#fff;border:1px solid #D9D4C7;border-radius:16px;padding:14px;margin-top:12px}.btn{background:#0B7A4B;color:#fff;font-weight:700;text-decoration:none;padding:12px 16px;border-radius:12px}.note{font-size:14px;color:#4B5A52}.info{background:#DDEBE2;border-radius:16px;padding:14px;margin-top:16px;font-size:14px}@media(prefers-color-scheme:dark){body{background:#0F1A15;color:#EEF3EF}.card{background:#17261F;border-color:#2B4137}.note{color:#A9B8AF}.info{background:#1E3A2E}.btn{background:#3FBF85;color:#08130E}}</style></head><body>
<h1>SabiPack classroom</h1><p class="note">You are on your teacher's Wi-Fi. No internet is needed.</p>
<a class="btn" href="/" style="display:block;text-align:center">Open the SabiPack app</a>
<h2>Class packs</h2>${rows || '<p class="note">No packs yet.</p>'}
<div class="info"><b>After you download a pack:</b> open SabiPack, go to <b>Share</b>, tap <b>Import a pack file</b> and choose the file. It will then work with no internet.</div>
</body></html>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  note(req.socket.remoteAddress);
  const send = (code, type, body, extra = {}) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-cache', ...extra }); res.end(body); };
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'text/plain', 'Method not allowed');
  let pathname; try { pathname = decodeURIComponent(url.pathname); } catch { return send(400, 'text/plain', 'Bad request'); }

  if (pathname.startsWith('/api/')) return send(503, 'application/json', JSON.stringify({ error: 'No internet in classroom mode. Packs, lessons and quizzes still work.' }));
  if (pathname === '/classroom' || pathname === '/classroom/') return send(200, 'text/html; charset=utf-8', classroomPage());
  if (pathname === '/classroom/stats') return send(200, 'application/json', JSON.stringify({ devices: devices.size, packs: all().length }));
  if (pathname.startsWith('/classroom/download/')) {
    const id = pathname.slice('/classroom/download/'.length);
    const p = all().find(x => x.id === id);
    if (!p) return send(404, 'text/plain', 'Not found');
    return send(200, 'text/plain; charset=utf-8', exportBody(p), { 'Content-Disposition': `attachment; filename="${safeName(p.title)}.sabipack.txt"` });
  }

  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(PUBLIC, rel);
  if (!file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(404, 'text/plain', 'Not found');
  send(200, MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', fs.readFileSync(file));
});

server.listen(PORT, '0.0.0.0', () => {
  const addrs = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log('\nSabiPack classroom server is running.\n');
  console.log('1. Turn on this device\'s Wi-Fi hotspot, or connect it to the classroom Wi-Fi router.');
  console.log('2. Students join that Wi-Fi and open one of these addresses in their browser:');
  (addrs.length ? addrs : ['(no network found yet)']).forEach(a => console.log(`     http://${a}:${PORT}`));
  console.log(`3. Class packs page: /classroom   (teacher packs go in classroom/packs)\n`);
  console.log('No internet is needed. Press Ctrl+C to stop.\n');
});
