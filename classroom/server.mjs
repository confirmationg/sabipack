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
const UPLOADS = path.join(here, 'uploads');
const RESOURCE_INDEX = path.join(UPLOADS, 'resources.json');
fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync(RESOURCE_INDEX)) fs.writeFileSync(RESOURCE_INDEX, '[]');
const PORT = Number(process.env.PORT || process.argv[2] || 8080);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' };

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

function readResources() {
  try { return JSON.parse(fs.readFileSync(RESOURCE_INDEX, 'utf8')); } catch { return []; }
}
function saveResources(items) { fs.writeFileSync(RESOURCE_INDEX, JSON.stringify(items, null, 2)); }
function classroomPage() {
  const resources = readResources();
  const rows = resources.map(r => `<article class="item"><div class="fileicon">${esc(r.type.toUpperCase())}</div><div class="filemeta"><b>${esc(r.title)}</b><span>${esc(r.type.toUpperCase())} · ${esc(r.sizeLabel)}</span></div><a class="btn" href="/classroom/resource/${encodeURIComponent(r.id)}">${r.type === 'pdf' || r.type === 'txt' ? 'Open lesson' : 'Download'}</a></article>`).join('');
  const packs = all().map(p => `<article class="item"><div class="fileicon">PK</div><div class="filemeta"><b>${esc(p.title)}</b><span>${esc(p.sub)} · SabiPack file</span></div><a class="btn" href="/classroom/download/${encodeURIComponent(p.id)}" download>Get pack</a></article>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b7048"><title>SabiPack | Student classroom</title>
<style>:root{--g:#0b7048;--d:#123c2b;--m:#e5f2e9;--bg:#f5f7f3;--ink:#17251d;--muted:#65746a;--line:#dce5dc}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}.top{background:var(--d);color:white;padding:22px max(18px,calc((100% - 920px)/2))}.brand{font-size:22px;font-weight:850}.brand span{color:#a9e1be}.wrap{max-width:920px;margin:auto;padding:26px 18px 50px}.hero{background:linear-gradient(130deg,#0b7048,#12452f);color:white;border-radius:20px;padding:24px;margin-bottom:20px}.hero small{color:#bfe8ce;font-size:11px;font-weight:800;letter-spacing:.14em}.hero h1{font-size:clamp(26px,5vw,36px);line-height:1.1;margin:7px 0}.hero p{margin:0;color:#e0f0e5}.actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:17px}.btn{display:inline-block;background:var(--g);color:white;text-decoration:none;font-weight:800;padding:11px 15px;border-radius:11px;font-size:13px}.btn.light{background:white;color:var(--d)}h2{font-size:20px;margin:22px 0 9px}.sub{color:var(--muted);font-size:13px}.list{display:grid;gap:10px}.item{display:flex;align-items:center;gap:12px;background:white;border:1px solid var(--line);border-radius:15px;padding:13px}.fileicon{width:43px;height:43px;display:grid;place-items:center;flex:none;border-radius:12px;background:var(--m);color:var(--d);font-weight:850;font-size:11px}.filemeta{min-width:0;flex:1}.filemeta b{display:block;overflow-wrap:anywhere}.filemeta span{display:block;color:var(--muted);font-size:12px}.empty,.info{padding:15px;border-radius:14px;background:white;border:1px solid var(--line);color:var(--muted);font-size:13px}.info{background:var(--m);color:var(--d);margin-top:18px}.foot{margin-top:22px;font-size:12px;color:var(--muted)}@media(max-width:480px){.item{align-items:flex-start}.item .btn{margin-left:auto;white-space:nowrap}.filemeta{padding-top:2px}}</style></head><body>
<header class="top"><div class="brand">Sabi<span>Pack</span> · Classroom</div></header><main class="wrap"><section class="hero"><small>YOUR CLASSROOM LEARNING HUB</small><h1>Welcome to your class.</h1><p>Get your teacher’s lesson materials, build your own study packs and keep learning offline.</p><div class="actions"><a class="btn light" href="/">Open SabiPack app</a><a class="btn" href="/classroom/teacher">Teacher workspace</a></div></section>
<h2>Teacher’s lesson materials</h2><p class="sub">Resources published to this local classroom network.</p><div class="list">${rows || '<div class="empty">No lesson materials have been published yet. Check with your teacher.</div>'}</div>
<h2>Ready-made class packs</h2><p class="sub">Download a SabiPack file, then import it in the app under Share.</p><div class="list">${packs || '<div class="empty">No class packs are available yet.</div>'}</div>
<div class="info"><b>Turn notes into your own pack:</b> download a PDF, text file or PPTX, open the SabiPack app, choose “Create a learning pack”, review the extracted text and generate your lesson and quiz. PowerPoint .ppt files need to be saved as .pptx before text extraction. AI pack creation requires an internet connection once; saved packs work offline.</div><div class="foot">Connected through your teacher’s local Wi-Fi. This classroom page does not require mobile data.</div></main></body></html>`;
}
function teacherPage() {
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b7048"><title>SabiPack | Teacher workspace</title>
<style>
:root{--green:#0b7048;--deep:#123c2b;--mint:#e5f2e9;--paper:#f5f7f3;--ink:#17251d;--muted:#65746a;--line:#dce5dc;--white:#fff;--amber:#f4bd55;--red:#a83a32}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 Inter,system-ui,-apple-system,Segoe UI,sans-serif}.top{background:var(--deep);color:white;padding:22px max(20px,calc((100% - 1100px)/2));display:flex;align-items:center;justify-content:space-between;gap:16px}.brand{font-size:22px;font-weight:850;letter-spacing:-.04em}.brand span{color:#a9e1be}.top small{display:block;color:#c6d9cd;font-size:12px;letter-spacing:.1em;text-transform:uppercase}.toplinks{display:flex;gap:10px;flex-wrap:wrap}.toplinks a{color:white;text-decoration:none;border:1px solid #6b8e79;border-radius:10px;padding:9px 13px;font-weight:700;font-size:13px}.wrap{max-width:1100px;margin:auto;padding:28px 20px 50px}.intro{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:22px}.eyebrow{color:var(--green);font-size:11px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}h1,h2,p{margin-top:0}h1{font-size:clamp(27px,4vw,38px);line-height:1.1;letter-spacing:-.04em;margin:5px 0 8px}.muted{color:var(--muted)}.status{display:inline-flex;align-items:center;gap:8px;background:var(--mint);color:var(--deep);padding:8px 12px;border-radius:999px;font-size:12px;font-weight:800}.dot{width:8px;height:8px;border-radius:50%;background:#15975d}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin-bottom:20px}.stat,.panel{background:var(--white);border:1px solid var(--line);border-radius:18px;box-shadow:0 5px 20px #193c2510}.stat{padding:17px}.stat strong{display:block;font-size:29px;line-height:1.1;color:var(--green)}.stat span{display:block;color:var(--muted);font-size:12px;margin-top:5px}.layout{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(320px,.9fr);gap:16px;align-items:start}.panel{padding:21px}.panel h2{font-size:19px;letter-spacing:-.02em;margin-bottom:5px}.sub{font-size:13px;color:var(--muted);margin-bottom:18px}.field{display:block;font-size:13px;font-weight:750;margin:13px 0 6px}input[type=text],input[type=file]{width:100%;border:1px solid var(--line);border-radius:11px;padding:12px;background:#fbfcfa;color:var(--ink);font:inherit}input[type=file]{padding:13px;border-style:dashed;background:#f7faf6}.btn{border:0;border-radius:11px;background:var(--green);color:white;font:inherit;font-weight:800;padding:13px 17px;cursor:pointer}.btn:disabled{opacity:.6;cursor:wait}.btn.secondary{background:var(--mint);color:var(--deep)}.btn.remove{background:#fff0ed;color:var(--red);padding:8px 11px;font-size:12px}.submit{width:100%;margin-top:14px}.hint{font-size:12px;color:var(--muted);margin:10px 0 0}.notice{margin-top:13px;padding:11px 13px;border-radius:11px;background:var(--mint);color:var(--deep);font-size:13px;min-height:42px}.notice.error{background:#fff0ed;color:var(--red)}.list-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}.items{display:grid;gap:10px}.item{border:1px solid var(--line);border-radius:13px;padding:13px;display:flex;justify-content:space-between;align-items:center;gap:12px}.item-title{font-weight:800;overflow-wrap:anywhere}.meta{font-size:12px;color:var(--muted);margin-top:3px}.actions{display:flex;align-items:center;gap:7px;flex:none}.actions a{font-size:12px;font-weight:800;color:var(--green);text-decoration:none}.empty{padding:22px;text-align:center;border:1px dashed var(--line);border-radius:13px;color:var(--muted);font-size:13px}.student-link{margin-top:17px;padding:15px;border-radius:14px;background:var(--deep);color:white;display:flex;justify-content:space-between;align-items:center;gap:12px}.student-link p{margin:3px 0 0;color:#c7dbcf;font-size:12px}.student-link a{color:#fff;font-weight:800;text-decoration:none;white-space:nowrap}@media(max-width:760px){.layout{grid-template-columns:1fr}.intro{align-items:flex-start;flex-direction:column}.stats{gap:8px}.stat{padding:12px}.stat strong{font-size:24px}.top{align-items:flex-start;flex-direction:column}.item{align-items:flex-start}.actions{flex-direction:column;align-items:flex-end}}
</style></head><body>
<header class="top"><div><div class="brand">Sabi<span>Pack</span></div><small>Teacher workspace · Offline classroom</small></div><nav class="toplinks"><a href="/classroom">Student classroom ↗</a><a href="/">Open app ↗</a></nav></header>
<div class="wrap"><section class="intro"><div><div class="eyebrow">Your classroom hub</div><h1>Teach. Share. Empower.</h1><p class="muted">Publish lesson materials to students connected to your local Wi-Fi. No internet is needed in the classroom.</p></div><div class="status"><i class="dot"></i> Local classroom server</div></section>
<section class="stats"><div class="stat"><strong id="count-all">0</strong><span>Published resources</span></div><div class="stat"><strong id="count-pdf">0</strong><span>PDF & text resources</span></div><div class="stat"><strong id="count-slides">0</strong><span>PowerPoint resources</span></div></section>
<div class="layout"><section class="panel"><div class="eyebrow">Resource centre</div><h2>Publish a lesson</h2><p class="sub">Add a title and choose a file. Students on this classroom network can open or download it immediately.</p>
<form id="upload"><label class="field" for="title">Lesson or resource title</label><input id="title" name="title" type="text" maxlength="120" required placeholder="e.g. Human circulatory system"><label class="field" for="file">Select lesson material</label><input id="file" name="file" type="file" accept=".pdf,.ppt,.pptx,.txt" required><p class="hint">Supported: PDF, PowerPoint (.ppt / .pptx) and text (.txt). Maximum file size: 100 MB.</p><button class="btn submit" id="publish">Publish to students</button><div class="notice" id="status" role="status">Your files stay on this classroom device.</div></form></section>
<section class="panel"><div class="list-head"><div><div class="eyebrow">Class library</div><h2 style="margin:4px 0 0">Published materials</h2></div><button class="btn secondary" id="refresh">Refresh</button></div><div class="items" id="items"><div class="empty">Loading classroom resources…</div></div><div class="student-link"><div><b>Student access page</b><p>Share this classroom address with your students.</p></div><a href="/classroom">Open page →</a></div></section></div>
</div>
<script>
const $=s=>document.querySelector(s);function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function refresh(){const box=$('#items');box.innerHTML='<div class="empty">Loading…</div>';try{const r=await fetch('/classroom/api/resources');if(!r.ok)throw Error('Could not load resources');const a=await r.json();$('#count-all').textContent=a.length;$('#count-pdf').textContent=a.filter(x=>x.type==='pdf'||x.type==='txt').length;$('#count-slides').textContent=a.filter(x=>x.type==='ppt'||x.type==='pptx').length;box.innerHTML=a.length?a.map(x=>'<article class="item"><div><div class="item-title">'+esc(x.title)+'</div><div class="meta">'+esc(x.type.toUpperCase())+' · '+esc(x.sizeLabel)+'</div></div><div class="actions"><a href="/classroom/resource/'+encodeURIComponent(x.id)+'">Open / download</a><button class="btn remove" data-remove="'+esc(x.id)+'">Remove</button></div></article>').join(''):'<div class="empty">No materials published yet. Upload your first lesson to get started.</div>'}catch(e){box.innerHTML='<div class="empty">'+esc(e.message)+'</div>'}}
async function removeItem(id){if(!confirm('Remove this published material?'))return;try{const r=await fetch('/classroom/api/resources/'+encodeURIComponent(id),{method:'DELETE'});if(!r.ok)throw Error('Could not remove this resource');await refresh()}catch(e){alert(e.message)}}
$('#items').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b)removeItem(b.dataset.remove)});$('#refresh').onclick=refresh;
$('#upload').addEventListener('submit',async e=>{e.preventDefault();const status=$('#status'),btn=$('#publish');btn.disabled=true;btn.textContent='Publishing…';status.className='notice';status.textContent='Uploading your lesson…';try{const r=await fetch('/classroom/api/upload',{method:'POST',body:new FormData(e.target)});const j=await r.json();if(!r.ok)throw Error(j.error||'Upload failed');status.textContent='Published successfully. Students can access this resource now.';e.target.reset();await refresh()}catch(err){status.className='notice error';status.textContent=err.message}finally{btn.disabled=false;btn.textContent='Publish to students'}});refresh();
</script></body></html>`;
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  note(req.socket.remoteAddress);
  const send = (code, type, body, extra = {}) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-cache', ...extra }); res.end(body); };
  let pathname; try { pathname = decodeURIComponent(url.pathname); } catch { return send(400, 'text/plain', 'Bad request'); }
  if (req.method === 'POST' && pathname === '/classroom/api/upload') {
    const chunks = []; let total = 0;
    req.on('data', chunk => { total += chunk.length; if (total > 100 * 1024 * 1024) { send(413,'application/json',JSON.stringify({error:'Maximum file size is 100 MB'})); req.destroy(); } else chunks.push(chunk); });
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        const boundary = (req.headers['content-type'] || '').match(/boundary=(?:"([^"]+)"|([^;]+))/)?.slice(1).find(Boolean);
        if (!boundary) return send(400,'application/json',JSON.stringify({error:'Invalid upload'}));
        const parts = body.toString('latin1').split('--' + boundary);
        let title='', filename='', data=null;
        for (const part of parts) {
          const cut=part.indexOf('\r\n\r\n'); if(cut<0) continue;
          const headers=part.slice(0,cut); const value=part.slice(cut+4).replace(/\r\n--?$/,'').replace(/\r\n$/,'');
          const name=headers.match(/name="([^"]+)"/)?.[1];
          if(name==='title') title=Buffer.from(value,'latin1').toString('utf8').trim();
          if(name==='file'){filename=headers.match(/filename="([^"]*)"/)?.[1]||'';data=Buffer.from(value,'latin1');}
        }
        const ext=path.extname(filename).toLowerCase();
        if(!title||!data?.length) return send(400,'application/json',JSON.stringify({error:'Enter a title and choose a file'}));
        if(!['.pdf','.ppt','.pptx','.txt'].includes(ext)) return send(400,'application/json',JSON.stringify({error:'Supported formats: PDF, PPT, PPTX and TXT'}));
        const id=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8), stored=id+ext;
        fs.writeFileSync(path.join(UPLOADS,stored),data);
        const items=readResources();items.unshift({id,title:title.slice(0,120),filename:path.basename(filename),stored,type:ext.slice(1),size:data.length,sizeLabel:data.length<1048576?Math.ceil(data.length/1024)+' KB':(data.length/1048576).toFixed(1)+' MB',uploaded:new Date().toISOString()});saveResources(items);
        return send(201,'application/json',JSON.stringify({ok:true}));
      } catch(e){return send(500,'application/json',JSON.stringify({error:e.message}));}
    }); return;
  }
  if(req.method==='GET'&&pathname==='/classroom/api/resources') return send(200,'application/json',JSON.stringify(readResources().map(({id,title,type,sizeLabel,uploaded})=>({id,title,type,sizeLabel,uploaded}))));
  if(req.method==='DELETE'&&pathname.startsWith('/classroom/api/resources/')){
    const id=pathname.slice('/classroom/api/resources/'.length),items=readResources(),item=items.find(x=>x.id===id);
    if(!item)return send(404,'application/json',JSON.stringify({error:'Not found'}));
    try{fs.unlinkSync(path.join(UPLOADS,item.stored));}catch{} saveResources(items.filter(x=>x.id!==id));return send(200,'application/json',JSON.stringify({ok:true}));
  }
  if(req.method==='GET'&&pathname.startsWith('/classroom/resource/')){
    const id=pathname.slice('/classroom/resource/'.length),item=readResources().find(x=>x.id===id);
    if(!item)return send(404,'text/plain','Not found');
    const file=path.join(UPLOADS,item.stored);if(!fs.existsSync(file))return send(404,'text/plain','File missing');
    const types={pdf:'application/pdf',txt:'text/plain; charset=utf-8',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
    const inline=item.type==='pdf'||item.type==='txt';
    return send(200,types[item.type]||'application/octet-stream',fs.readFileSync(file),{'Content-Disposition':`${inline?'inline':'attachment'}; filename="${safeName(item.title)}.${item.type}"`});
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'text/plain', 'Method not allowed');

  if (pathname.startsWith('/api/')) return send(503, 'application/json', JSON.stringify({ error: 'No internet in classroom mode. Packs, lessons and quizzes still work.' }));
  if (pathname === '/classroom' || pathname === '/classroom/') return send(200, 'text/html; charset=utf-8', classroomPage());
  if (pathname === '/classroom/teacher' || pathname === '/classroom/teacher/') return send(200, 'text/html; charset=utf-8', teacherPage());
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

// Some phones (for example Android in Termux) do not allow listing network addresses, so this must not crash.
function lanAddresses() {
  try { return Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address); }
  catch { return []; }
}

server.on('error', e => {
  console.log(e.code === 'EADDRINUSE' ? `\nPort ${PORT} is already in use. Close the other program or run with a different port, for example:  PORT=9090 node classroom/server.mjs\n` : `\nCould not start: ${e.message}\n`);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  const addrs = lanAddresses();
  console.log('\nSabiPack classroom server is running.\n');
  console.log('1. Turn on this device\'s Wi-Fi hotspot, or connect it to the classroom Wi-Fi router.');
  if (addrs.length) {
    console.log('2. Students join that Wi-Fi and open one of these addresses in their browser:');
    addrs.forEach(a => console.log(`     http://${a}:${PORT}`));
  } else {
    console.log('2. This device could not list its own address. Open its hotspot or Wi-Fi settings, find the IP address');
    console.log(`   (for a phone hotspot it is often 192.168.x.1), and tell students to open  http://THAT-ADDRESS:${PORT}`);
  }
  console.log('3. Student classroom page: /classroom');
  console.log('4. Teacher dashboard: /classroom/teacher\n');
  console.log('No internet is needed. Keep this window open. Press Ctrl+C to stop.\n');
});
