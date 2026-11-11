// SabiPack classroom server: lets one computer serve the app and its packs to a whole class
// over local Wi-Fi, with no internet. Run:  node classroom/server.mjs   (optional: PORT=9000)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, '..', 'public');
const EXTRA = path.join(here, 'packs'); // teacher drops exported .sabipack.txt files here
const UPLOADS = path.join(here, 'uploads');
const RESOURCE_INDEX = path.join(UPLOADS, 'resources.json');
const ASSESSMENT_INDEX = path.join(UPLOADS, 'assessments.json');
const SUBMISSION_INDEX = path.join(UPLOADS, 'assessment-submissions.json');
const ATTEMPT_INDEX = path.join(UPLOADS, 'assessment-attempts.json');
const AUTH_INDEX = path.join(UPLOADS, 'teacher-auth.json');
fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync(RESOURCE_INDEX)) fs.writeFileSync(RESOURCE_INDEX, '[]');
for (const f of [ASSESSMENT_INDEX, SUBMISSION_INDEX, ATTEMPT_INDEX]) if (!fs.existsSync(f)) fs.writeFileSync(f, '[]');
let teacherPin;
try { teacherPin = JSON.parse(fs.readFileSync(AUTH_INDEX, 'utf8')).pin; } catch {}
if (!teacherPin) {
  teacherPin = String(crypto.randomInt(100000, 1000000));
  fs.writeFileSync(AUTH_INDEX, JSON.stringify({ pin: teacherPin }, null, 2));
  fs.writeFileSync(path.join(UPLOADS, 'TEACHER-LOGIN-PIN.txt'), `SabiPack Teacher PIN: ${teacherPin}\nKeep this PIN private. Students do not need it.\n`);
}
console.log(`\\nSabiPack teacher login PIN: ${teacherPin}`);
console.log(`PIN file: ${path.join(UPLOADS, 'TEACHER-LOGIN-PIN.txt')}\\n`);
const teacherSessions = new Set();
const readJson = file => { try { const v=JSON.parse(fs.readFileSync(file,'utf8')); return Array.isArray(v)?v:[]; } catch { return []; } };
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2));
const cookieValue = (req, name) => String(req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);
const isTeacher = req => { const token=cookieValue(req,'sabipack_teacher'); return !!token && teacherSessions.has(token); };
const PORT = Number(process.env.PORT || process.argv[2] || 8080);
// Optional: point local AI requests at the deployed SabiPack API (never put API keys in the browser).
const API_ORIGIN = String(process.env.SABIPACK_API_ORIGIN || '').trim().replace(/\/$/, '');
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
  const rows = resources.map(r => { const supported = ['pdf','txt','pptx'].includes(r.type); return `<article class="item"><div class="fileicon">${esc(r.type.toUpperCase())}</div><div class="filemeta"><b>${esc(r.title)}</b><span>${esc(r.type.toUpperCase())} · ${esc(r.sizeLabel)}</span></div><div class="resource-actions"><a class="btn secondary" href="/classroom/resource/${encodeURIComponent(r.id)}">${r.type === 'pdf' || r.type === 'txt' ? 'Open lesson' : 'Download'}</a>${supported ? `<a class="btn" href="/?classroomResource=${encodeURIComponent(r.id)}">Create My Pack</a>` : `<span class="unsupported">Save as .pptx to create a pack</span>`}</div></article>`; }).join('');
  const packs = all().map(p => `<article class="item"><div class="fileicon">PK</div><div class="filemeta"><b>${esc(p.title)}</b><span>${esc(p.sub)} · SabiPack file</span></div><a class="btn" href="/classroom/download/${encodeURIComponent(p.id)}" download>Get pack</a></article>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0B7A4B"><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet"><title>SabiPack | Student classroom</title>
<style>:root{--g:#0B7A4B;--d:#14221C;--m:#DDEBE2;--bg:#F6F3EC;--ink:#14221C;--muted:#4B5A52;--line:#D9D4C7}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 'DM Sans',system-ui,sans-serif}.top{background:var(--ink);color:white;padding:22px max(18px,calc((100% - 920px)/2))}.brand{font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:850}.brand span{color:var(--amber)}.wrap{max-width:920px;margin:auto;padding:26px 18px 50px}.hero{background:linear-gradient(130deg,#0b7048,#12452f);color:white;border-radius:20px;padding:24px;margin-bottom:20px}.hero small{color:#bfe8ce;font-size:11px;font-weight:800;letter-spacing:.14em}.hero h1{font-size:clamp(26px,5vw,36px);line-height:1.1;margin:7px 0}.hero p{margin:0;color:#e0f0e5}.actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:17px}.btn{display:inline-block;background:var(--g);color:white;text-decoration:none;font-weight:800;padding:11px 15px;border-radius:11px;font-size:13px}.btn.light{background:white;color:var(--d)}h2{font-size:20px;margin:22px 0 9px}.sub{color:var(--muted);font-size:13px}.list{display:grid;gap:10px}.item{display:flex;align-items:center;gap:12px;background:white;border:1px solid var(--line);border-radius:15px;padding:13px}.resource-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end}.btn.secondary{background:#e6eee8;color:var(--d)}.unsupported{font-size:11px;color:var(--muted);max-width:120px}.fileicon{width:43px;height:43px;display:grid;place-items:center;flex:none;border-radius:12px;background:var(--m);color:var(--d);font-weight:850;font-size:11px}.filemeta{min-width:0;flex:1}.filemeta b{display:block;overflow-wrap:anywhere}.filemeta span{display:block;color:var(--muted);font-size:12px}.empty,.info{padding:15px;border-radius:14px;background:white;border:1px solid var(--line);color:var(--muted);font-size:13px}.info{background:var(--m);color:var(--d);margin-top:18px}.foot{margin-top:22px;font-size:12px;color:var(--muted)}@media(max-width:560px){.item{align-items:flex-start;flex-wrap:wrap}.resource-actions{width:100%;justify-content:flex-start;padding-left:55px}.resource-actions .btn{white-space:nowrap}.filemeta{padding-top:2px}}</style></head><body>
<header class="top"><div class="brand">Sabi<span>Pack</span> · Classroom</div></header><main class="wrap"><section class="hero"><small>YOUR CLASSROOM LEARNING HUB</small><h1>Welcome to your class.</h1><p>Get your teacher’s lesson materials, build your own study packs and keep learning offline.</p><div class="actions"><a class="btn light" href="/">Open SabiPack app</a></div></section>
<div class="info"><b>Assessments:</b> <a class="btn" href="/classroom/tests">View available tests</a></div><h2>Teacher’s lesson materials</h2><p class="sub">Resources published to this local classroom network.</p><div class="list">${rows || '<div class="empty">No lesson materials have been published yet. Check with your teacher.</div>'}</div>
<h2>Ready-made class packs</h2><p class="sub">Download a SabiPack file, then import it in the app under Share.</p><div class="list">${packs || '<div class="empty">No class packs are available yet.</div>'}</div>
<div class="info"><b>Create a personal pack directly from a teacher’s note:</b> tap <b>Create My Pack</b> beside a PDF, PPTX or text resource. SabiPack opens Pack Studio with the teacher’s file already loaded. Review the extracted text, choose the whole document or a section, then generate and save your lesson and quiz. You can still download and import a file manually if you prefer. Older .ppt files must be saved as .pptx first. AI pack creation requires internet once; saved packs work offline.</div><div class="foot">Connected through your teacher’s local Wi-Fi. This classroom page does not require mobile data.</div></main></body></html>`;
}

function teacherLoginPage() {
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SabiPack Teacher Login</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f3ec;color:#14221c;font:16px system-ui}.card{width:min(90%,390px);padding:28px;background:#fff;border:1px solid #ddd;border-radius:18px;box-sizing:border-box}input,button{width:100%;box-sizing:border-box;padding:13px;border-radius:10px;font:inherit;margin-top:12px}input{border:1px solid #ccc}button{border:0;background:#0b7a4b;color:#fff;font-weight:800}small{color:#56645b}#msg{color:#a33}</style></head><body><form class="card" id="login"><h1>Teacher workspace</h1><p>Enter the private teacher PIN shown on the computer running SabiPack.</p><input id="pin" type="password" inputmode="numeric" autocomplete="current-password" placeholder="Teacher PIN" required><button>Unlock workspace</button><p id="msg"></p><small>Students can access published resources and tests without this PIN.</small></form><script>document.querySelector('#login').onsubmit=async e=>{e.preventDefault();const r=await fetch('/classroom/api/teacher/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:document.querySelector('#pin').value})});const j=await r.json();if(r.ok)location.reload();else document.querySelector('#msg').textContent=j.error||'Incorrect PIN'};</script></body></html>`;
}

function teacherPage() {
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0B7A4B"><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet"><title>SabiPack | Teacher workspace</title>
<style>
:root{--green:#0B7A4B;--deep:#14221C;--mint:#DDEBE2;--paper:#F6F3EC;--ink:#14221C;--muted:#4B5A52;--line:#D9D4C7;--white:#fff;--amber:#F2B84B;--red:#a83a32}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 'DM Sans',system-ui,-apple-system,Segoe UI,sans-serif}.top{background:var(--ink);color:white;padding:22px max(20px,calc((100% - 1100px)/2));display:flex;align-items:center;justify-content:space-between;gap:16px}.brand{font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:850;letter-spacing:-.04em}.brand span{color:var(--amber)}.top small{display:block;color:#c6d9cd;font-size:12px;letter-spacing:.1em;text-transform:uppercase}.toplinks{display:flex;gap:10px;flex-wrap:wrap}.toplinks a{color:white;text-decoration:none;border:1px solid #6b8e79;border-radius:10px;padding:9px 13px;font-weight:700;font-size:13px}.wrap{max-width:1100px;margin:auto;padding:28px 20px 50px}.intro{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:22px}.eyebrow{color:var(--green);font-size:11px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}h1,h2,p{margin-top:0}h1{font-size:clamp(27px,4vw,38px);line-height:1.1;letter-spacing:-.04em;margin:5px 0 8px}.muted{color:var(--muted)}.status{display:inline-flex;align-items:center;gap:8px;background:var(--mint);color:var(--deep);padding:8px 12px;border-radius:999px;font-size:12px;font-weight:800}.dot{width:8px;height:8px;border-radius:50%;background:#15975d}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin-bottom:20px}.stat,.panel{background:var(--white);border:1px solid var(--line);border-radius:18px;box-shadow:0 5px 20px #193c2510}.stat{padding:17px}.stat strong{display:block;font-size:29px;line-height:1.1;color:var(--green)}.stat span{display:block;color:var(--muted);font-size:12px;margin-top:5px}.layout{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(320px,.9fr);gap:16px;align-items:start}.panel{padding:21px}.panel h2{font-size:19px;letter-spacing:-.02em;margin-bottom:5px}.sub{font-size:13px;color:var(--muted);margin-bottom:18px}.field{display:block;font-size:13px;font-weight:750;margin:13px 0 6px}input[type=text],input[type=file]{width:100%;border:1px solid var(--line);border-radius:11px;padding:12px;background:#fbfcfa;color:var(--ink);font:inherit}input[type=file]{padding:13px;border-style:dashed;background:#f7faf6}.btn{border:0;border-radius:11px;background:var(--green);color:white;font:inherit;font-weight:800;padding:13px 17px;cursor:pointer}.btn:disabled{opacity:.6;cursor:wait}.btn.secondary{background:var(--mint);color:var(--deep)}.btn.remove{background:#fff0ed;color:var(--red);padding:8px 11px;font-size:12px}.submit{width:100%;margin-top:14px}.hint{font-size:12px;color:var(--muted);margin:10px 0 0}.notice{margin-top:13px;padding:11px 13px;border-radius:11px;background:var(--mint);color:var(--deep);font-size:13px;min-height:42px}.notice.error{background:#fff0ed;color:var(--red)}.list-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}.items{display:grid;gap:10px}.item{border:1px solid var(--line);border-radius:13px;padding:13px;display:flex;justify-content:space-between;align-items:center;gap:12px}.item-title{font-weight:800;overflow-wrap:anywhere}.meta{font-size:12px;color:var(--muted);margin-top:3px}.actions{display:flex;align-items:center;gap:7px;flex:none}.actions a{font-size:12px;font-weight:800;color:var(--green);text-decoration:none}.empty{padding:22px;text-align:center;border:1px dashed var(--line);border-radius:13px;color:var(--muted);font-size:13px}.student-link{margin-top:17px;padding:15px;border-radius:14px;background:var(--deep);color:white;display:flex;justify-content:space-between;align-items:center;gap:12px}.student-link p{margin:3px 0 0;color:#c7dbcf;font-size:12px}.student-link a{color:#fff;font-weight:800;text-decoration:none;white-space:nowrap}@media(max-width:760px){.layout{grid-template-columns:1fr}.intro{align-items:flex-start;flex-direction:column}.stats{gap:8px}.stat{padding:12px}.stat strong{font-size:24px}.top{align-items:flex-start;flex-direction:column}.item{align-items:flex-start}.actions{flex-direction:column;align-items:flex-end}}
</style></head><body>
<header class="top"><div><div class="brand">Sabi<span>Pack</span></div><small>Teacher workspace · Offline classroom</small></div><nav class="toplinks"><a href="/classroom">Student classroom ↗</a><a href="/">Open app ↗</a></nav></header>
<div class="wrap"><section class="intro"><div><div class="eyebrow">Your classroom hub</div><h1>Teach. Share. Empower.</h1><p class="muted">Publish lesson materials to students connected to your local Wi-Fi. No internet is needed in the classroom.</p></div><div class="status"><i class="dot"></i> Local classroom server</div></section>
<section class="stats"><div class="stat"><strong id="count-all">0</strong><span>Published resources</span></div><div class="stat"><strong id="count-pdf">0</strong><span>PDF & text resources</span></div><div class="stat"><strong id="count-slides">0</strong><span>PowerPoint resources</span></div></section>
<div class="layout"><section class="panel"><div class="eyebrow">Resource centre</div><h2>Publish a lesson</h2><p class="sub">Add a title and choose a file. Students on this classroom network can open or download it immediately.</p>
<form id="upload"><label class="field" for="title">Lesson or resource title</label><input id="title" name="title" type="text" maxlength="120" required placeholder="e.g. Human circulatory system"><label class="field" for="file">Select lesson material</label><input id="file" name="file" type="file" accept=".pdf,.ppt,.pptx,.txt" required><p class="hint">Supported: PDF, PowerPoint (.ppt / .pptx) and text (.txt). Maximum file size: 100 MB.</p><button class="btn submit" id="publish">Publish to students</button><div class="notice" id="status" role="status">Your files stay on this classroom device.</div></form></section>
<section class="panel"><div class="list-head"><div><div class="eyebrow">Class library</div><h2 style="margin:4px 0 0">Published materials</h2></div><button class="btn secondary" id="refresh">Refresh</button></div><div class="items" id="items"><div class="empty">Loading classroom resources…</div></div><div class="student-link" style="display:block"><b>Student access address</b><p>Students must be connected to this laptop’s Wi-Fi or hotspot. Share one of the addresses below with them.</p><div id="student-addresses" style="display:grid;gap:8px;margin-top:12px"><span style="color:#d5e8dc">Finding this laptop’s network address…</span></div><a href="/classroom" style="display:inline-block;margin-top:12px">Preview student page →</a></div></section></div>
</div>
${assessmentPanel()}
<script>
const $=s=>document.querySelector(s);function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function refresh(){const box=$('#items');box.innerHTML='<div class="empty">Loading…</div>';try{const r=await fetch('/classroom/api/resources');if(!r.ok)throw Error('Could not load resources');const a=await r.json();$('#count-all').textContent=a.length;$('#count-pdf').textContent=a.filter(x=>x.type==='pdf'||x.type==='txt').length;$('#count-slides').textContent=a.filter(x=>x.type==='ppt'||x.type==='pptx').length;box.innerHTML=a.length?a.map(x=>'<article class="item"><div><div class="item-title">'+esc(x.title)+'</div><div class="meta">'+esc(x.type.toUpperCase())+' · '+esc(x.sizeLabel)+'</div></div><div class="actions"><a href="/classroom/resource/'+encodeURIComponent(x.id)+'">Open / download</a><button class="btn remove" data-remove="'+esc(x.id)+'">Remove</button></div></article>').join(''):'<div class="empty">No materials published yet. Upload your first lesson to get started.</div>'}catch(e){box.innerHTML='<div class="empty">'+esc(e.message)+'</div>'}}
async function removeItem(id){if(!confirm('Remove this published material?'))return;try{const r=await fetch('/classroom/api/resources/'+encodeURIComponent(id),{method:'DELETE'});if(!r.ok)throw Error('Could not remove this resource');await refresh()}catch(e){alert(e.message)}}
$('#items').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b)removeItem(b.dataset.remove)});$('#refresh').onclick=refresh;
async function loadStudentAddresses(){const box=$('#student-addresses');try{const r=await fetch('/classroom/api/addresses');const d=await r.json();const urls=(d.addresses||[]).map(ip=>'http://'+ip+':'+d.port+'/classroom');if(!urls.length){box.innerHTML='<span style="color:#fff">No Wi-Fi address found yet. Connect the laptop to Wi-Fi or turn on Mobile Hotspot, then refresh this page.</span>';return}box.innerHTML=urls.map(u=>'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><code style="background:#214c39;padding:8px 10px;border-radius:8px;overflow-wrap:anywhere">'+esc(u)+'</code><button class="btn secondary" type="button" data-copy-url="'+esc(u)+'">Copy</button></div>').join('');}catch(e){box.textContent='Could not find network addresses. Check that the classroom server is running.'}}
boxCopy();function boxCopy(){document.addEventListener('click',async e=>{const b=e.target.closest('[data-copy-url]');if(!b)return;try{await navigator.clipboard.writeText(b.dataset.copyUrl);b.textContent='Copied';setTimeout(()=>b.textContent='Copy',1400)}catch{prompt('Copy this student address:',b.dataset.copyUrl)}})}
$('#upload').addEventListener('submit',async e=>{e.preventDefault();const status=$('#status'),btn=$('#publish');btn.disabled=true;btn.textContent='Publishing…';status.className='notice';status.textContent='Uploading your lesson…';try{const r=await fetch('/classroom/api/upload',{method:'POST',body:new FormData(e.target)});const j=await r.json();if(!r.ok)throw Error(j.error||'Upload failed');status.textContent='Published successfully. Students can access this resource now.';e.target.reset();await refresh()}catch(err){status.className='notice error';status.textContent=err.message}finally{btn.disabled=false;btn.textContent='Publish to students'}});refresh();loadStudentAddresses();
</script></body></html>`;
}

function assessmentPage() {
 return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SabiPack Assessments</title><style>body{margin:0;background:#f6f3ec;color:#14221c;font:15px/1.5 system-ui}.wrap{max-width:850px;margin:auto;padding:24px 16px}.card{background:#fff;border:1px solid #ddd8cb;border-radius:16px;padding:18px;margin:14px 0}.btn{background:#0b7a4b;color:white;border:0;border-radius:10px;padding:11px 15px;font-weight:800;cursor:pointer}.muted{color:#56645b;font-size:13px}input{padding:11px;border:1px solid #ccc;border-radius:9px;box-sizing:border-box;margin:5px 0 12px}#test{display:none}.q{padding:14px 0;border-top:1px solid #eee}.opt{display:block;padding:7px 0}</style></head><body><main class="wrap"><a href="/classroom">← Classroom home</a><h1>Class assessments</h1><p class="muted">Tests run on your teacher's local classroom server. No mobile data is needed.</p><section id="identity" class="card"><h2>Student details</h2><label>Full name</label><input id="name" style="width:100%" required><label>Student ID</label><input id="sid" style="width:100%" required><button class="btn" id="continue">View available tests</button></section><section id="tests"></section><section id="test" class="card"></section></main><script>
const $=s=>document.querySelector(s);let student=null,timer=null;
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function load(){const r=await fetch('/classroom/api/assessments');const a=await r.json();$('#tests').innerHTML=a.length?a.map(x=>'<article class="card"><h3>'+esc(x.title)+'</h3><p class="muted">'+x.count+' questions · '+x.duration+' minutes</p><button class="btn" data-id="'+esc(x.id)+'">Start test</button></article>').join(''):'<div class="card">No tests are currently available.</div>'}
$('#continue').onclick=()=>{if(!$('#name').value.trim()||!$('#sid').value.trim())return alert('Enter your name and student ID');student={name:$('#name').value.trim(),studentId:$('#sid').value.trim()};$('#identity').style.display='none';load()};
$('#tests').onclick=async e=>{const b=e.target.closest('[data-id]');if(!b)return;const id=b.dataset.id;let r=await fetch('/classroom/api/assessments/'+encodeURIComponent(id));let exam=await r.json();if(!r.ok)return alert(exam.error||'Could not open test');r=await fetch('/classroom/api/assessments/'+encodeURIComponent(id)+'/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({studentId:student.studentId})});const attempt=await r.json();if(!r.ok)return alert(attempt.error||'Could not start test');$('#tests').style.display='none';const end=attempt.expiresAt;$('#test').style.display='block';$('#test').innerHTML='<h2>'+esc(exam.title)+'</h2><p id="clock" class="muted"></p><form id="answers">'+exam.questions.map((q,i)=>'<div class="q"><b>'+(i+1)+'. '+esc(q.text)+'</b>'+q.options.map((o,k)=>'<label class="opt"><input type="radio" name="q'+i+'" value="'+k+'"> '+esc(o)+'</label>').join('')+'</div>').join('')+'<button class="btn">Submit answers</button></form>';function tick(){const left=Math.max(0,Math.ceil((end-Date.now())/1000));$('#clock').textContent='Time remaining: '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0');if(!left){clearInterval(timer);document.querySelector('#answers').requestSubmit()}}tick();timer=setInterval(tick,1000);$('#answers').onsubmit=async ev=>{ev.preventDefault();clearInterval(timer);const answers=exam.questions.map((q,i)=>{const v=document.querySelector('input[name="q'+i+'"]:checked');return v?Number(v.value):-1});const outR=await fetch('/classroom/api/assessments/'+encodeURIComponent(id)+'/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...student,answers,attemptToken:attempt.attemptToken})});const out=await outR.json();$('#test').innerHTML=outR.ok?'<h2>Submission received</h2><p>Your score: <b>'+out.score+' / '+out.total+'</b></p><p>'+out.percentage+'%</p><p class="muted">Saved on the classroom server.</p>':'<h2>Submission not accepted</h2><p>'+esc(out.error||'Please contact your teacher.')+'</p>'}};
</script></main></body></html>`;
}
function assessmentPanel() {
 return `<section class="panel" style="margin-top:18px"><div class="eyebrow">Assessment centre</div><h2>Create a class test</h2><p class="sub">Enter one question per line in this format: Question | Option 1 | Option 2 | Option 3 | Option 4 | Correct option number (1–4). Use at least 3 questions.</p><form id="assessment-form"><label class="field">Test title</label><input id="exam-title" type="text" maxlength="120" required placeholder="e.g. Biology revision test"><label class="field">Duration (minutes)</label><input id="exam-duration" type="number" min="1" max="180" value="30" required><label class="field">Questions</label><textarea id="exam-questions" rows="8" required style="width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:11px;padding:12px;font:13px/1.5 monospace" placeholder="The functional unit of the kidney is | Neuron | Nephron | Alveolus | Osteon | 2&#10;The heart has how many chambers? | Two | Three | Four | Five | 3&#10;Blood is pumped from the left ventricle into the | Aorta | Vena cava | Pulmonary vein | Right atrium | 1"></textarea><button class="btn submit">Publish assessment</button><div class="notice" id="exam-status">Published tests will appear at /classroom/tests.</div></form><h2 style="margin-top:24px">Student results</h2><div id="exam-results" class="items">Loading…</div><button class="btn secondary" type="button" id="refresh-results">Refresh results</button></section>
<script>
document.querySelector('#assessment-form').onsubmit=async e=>{e.preventDefault();const status=document.querySelector('#exam-status');const questions=document.querySelector('#exam-questions').value.split(/\\r?\\n/).map(line=>line.split('|').map(x=>x.trim())).filter(x=>x.length);const r=await fetch('/classroom/api/teacher/assessments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:document.querySelector('#exam-title').value,duration:Number(document.querySelector('#exam-duration').value),questions})});const j=await r.json();status.textContent=r.ok?'Assessment published. Students can now take it.':(j.error||'Could not publish');if(r.ok){e.target.reset();loadResults()}};
async function loadResults(){const box=document.querySelector('#exam-results');try{const r=await fetch('/classroom/api/teacher/results');const a=await r.json();box.innerHTML=a.length?a.map(x=>'<div class="item"><div><b>'+x.studentName+'</b><div class="meta">'+x.studentId+' · '+x.title+'</div></div><b>'+x.score+'/'+x.total+' ('+x.percentage+'%)</b></div>').join(''):'<div class="empty">No student submissions yet.</div>'}catch{box.textContent='Could not load results'}}document.querySelector('#refresh-results').onclick=loadResults;loadResults();
</script>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  note(req.socket.remoteAddress);
  const send = (code, type, body, extra = {}) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-cache', ...extra }); res.end(body); };
  let pathname; try { pathname = decodeURIComponent(url.pathname); } catch { return send(400, 'text/plain', 'Bad request'); }
  if (req.method === 'POST' && pathname === '/classroom/api/teacher/login') {
    const chunks=[]; req.on('data',c=>chunks.push(c)); req.on('end',()=>{
      let body={}; try{body=JSON.parse(Buffer.concat(chunks).toString())}catch{}
      if(String(body.pin||'')!==teacherPin)return send(401,'application/json',JSON.stringify({error:'Incorrect teacher PIN'}));
      const token=crypto.randomBytes(32).toString('hex');teacherSessions.add(token);
      return send(200,'application/json',JSON.stringify({ok:true}),{'Set-Cookie':`sabipack_teacher=${token}; HttpOnly; SameSite=Strict; Path=/classroom; Max-Age=28800`});
    });return;
  }
  if (req.method === 'POST' && pathname === '/classroom/api/teacher/logout') {
    const token=cookieValue(req,'sabipack_teacher');if(token)teacherSessions.delete(token);
    return send(200,'application/json',JSON.stringify({ok:true}),{'Set-Cookie':'sabipack_teacher=; HttpOnly; SameSite=Strict; Path=/classroom; Max-Age=0'});
  }
  if (pathname.startsWith('/classroom/api/teacher/') && !isTeacher(req)) return send(401,'application/json',JSON.stringify({error:'Teacher login required'}));
  if (req.method === 'POST' && pathname === '/classroom/api/upload' && !isTeacher(req)) return send(401,'application/json',JSON.stringify({error:'Teacher login required'}));
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
  if (pathname.startsWith('/api/')) {
    if (req.method !== 'POST') return send(405, 'application/json; charset=utf-8', JSON.stringify({ error: 'Use POST for this SabiPack service.' }));
    if (!API_ORIGIN) return send(503, 'application/json; charset=utf-8', JSON.stringify({ error: 'AI services are not connected in local classroom mode yet. Configure SABIPACK_API_ORIGIN with your deployed SabiPack website address. Classroom downloads and saved packs still work offline.' }));
    const chunks = []; let total = 0;
    req.on('data', c => { total += c.length; if (total > 12 * 1024 * 1024) { send(413, 'application/json; charset=utf-8', JSON.stringify({ error: 'Request is too large.' })); req.destroy(); } else chunks.push(c); });
    req.on('end', async () => {
      try {
        const upstream = await fetch(API_ORIGIN + pathname + url.search, { method: 'POST', headers: { 'Content-Type': req.headers['content-type'] || 'application/json' }, body: Buffer.concat(chunks) });
        const body = await upstream.text();
        send(upstream.status, upstream.headers.get('content-type') || 'application/json; charset=utf-8', body);
      } catch (e) { send(502, 'application/json; charset=utf-8', JSON.stringify({ error: 'Could not reach the SabiPack online AI service. Check the laptop internet connection and API address.' })); }
    });
    return;
  }

  if(req.method==='GET'&&pathname==='/classroom/api/assessments') return send(200,'application/json',JSON.stringify(readJson(ASSESSMENT_INDEX).filter(x=>x.active!==false).map(x=>({id:x.id,title:x.title,duration:x.duration,count:x.questions.length}))));
  if(req.method==='GET'&&pathname.startsWith('/classroom/api/assessments/')){
    const id=pathname.split('/')[4],exam=readJson(ASSESSMENT_INDEX).find(x=>x.id===id&&x.active!==false);
    if(!exam)return send(404,'application/json',JSON.stringify({error:'Assessment not found'}));
    return send(200,'application/json',JSON.stringify({id:exam.id,title:exam.title,duration:exam.duration,questions:exam.questions.map(q=>({text:q.text,options:q.options}))}));
  }
  if(req.method==='POST'&&pathname==='/classroom/api/teacher/assessments'){
    const chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>{
      let body={};try{body=JSON.parse(Buffer.concat(chunks).toString())}catch{}
      const title=String(body.title||'').trim().slice(0,120),duration=Math.max(1,Math.min(180,Number(body.duration)||30));
      const questions=(Array.isArray(body.questions)?body.questions:[]).map(q=>({text:String(q[0]||'').trim(),options:q.slice(1,5).map(v=>String(v).trim()),correct:Number(q[5])-1})).filter(q=>q.text&&q.options.length===4&&q.options.every(Boolean)&&Number.isInteger(q.correct)&&q.correct>=0&&q.correct<4);
      if(!title||questions.length<3||questions.length>50)return send(400,'application/json',JSON.stringify({error:'Provide a title and 3–50 valid questions in the required format'}));
      const exams=readJson(ASSESSMENT_INDEX),exam={id:crypto.randomUUID(),title,duration,questions,active:true,createdAt:new Date().toISOString()};exams.unshift(exam);writeJson(ASSESSMENT_INDEX,exams);return send(201,'application/json',JSON.stringify({ok:true,id:exam.id}));
    });return;
  }
  if(req.method==='GET'&&pathname==='/classroom/api/teacher/results') return send(200,'application/json',JSON.stringify(readJson(SUBMISSION_INDEX)));
  if(req.method==='POST'&&pathname.startsWith('/classroom/api/assessments/')&&pathname.endsWith('/start')){
    const id=pathname.split('/')[4],chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>{
      let body={};try{body=JSON.parse(Buffer.concat(chunks).toString())}catch{}
      const exam=readJson(ASSESSMENT_INDEX).find(x=>x.id===id&&x.active!==false),studentId=String(body.studentId||'').trim().slice(0,80);
      if(!exam||!studentId)return send(400,'application/json',JSON.stringify({error:'Assessment or student ID is missing'}));
      if(readJson(SUBMISSION_INDEX).some(x=>x.examId===id&&x.studentId.toLowerCase()===studentId.toLowerCase()))return send(409,'application/json',JSON.stringify({error:'A submission for this student ID already exists'}));
      const attempts=readJson(ATTEMPT_INDEX).filter(x=>!(x.examId===id&&x.studentId.toLowerCase()===studentId.toLowerCase()));
      const attempt={token:crypto.randomUUID(),examId:id,studentId,expiresAt:Date.now()+exam.duration*60000};attempts.push(attempt);writeJson(ATTEMPT_INDEX,attempts);
      return send(200,'application/json',JSON.stringify({attemptToken:attempt.token,expiresAt:attempt.expiresAt}));
    });return;
  }
  if(req.method==='POST'&&pathname.startsWith('/classroom/api/assessments/')&&pathname.endsWith('/submit')){
    const id=pathname.split('/')[4],chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>{
      let body={};try{body=JSON.parse(Buffer.concat(chunks).toString())}catch{}
      const exam=readJson(ASSESSMENT_INDEX).find(x=>x.id===id&&x.active!==false),studentName=String(body.name||'').trim().slice(0,100),studentId=String(body.studentId||'').trim().slice(0,80);
      if(!exam)return send(404,'application/json',JSON.stringify({error:'Assessment not found'}));
      if(!studentName||!studentId||!Array.isArray(body.answers)||body.answers.length!==exam.questions.length)return send(400,'application/json',JSON.stringify({error:'Complete your details and answer the questions'}));
      const submissions=readJson(SUBMISSION_INDEX);
      if(submissions.some(x=>x.examId===id&&x.studentId.toLowerCase()===studentId.toLowerCase()))return send(409,'application/json',JSON.stringify({error:'A submission for this student ID already exists'}));
      const attempts=readJson(ATTEMPT_INDEX),attempt=attempts.find(x=>x.token===body.attemptToken&&x.examId===id&&x.studentId.toLowerCase()===studentId.toLowerCase());
      if(!attempt)return send(403,'application/json',JSON.stringify({error:'Start this test before submitting'}));
      if(Date.now()>attempt.expiresAt+5000)return send(403,'application/json',JSON.stringify({error:'The test time has expired'}));
      const answers=body.answers.map(Number),score=exam.questions.reduce((n,q,i)=>n+(answers[i]===q.correct?1:0),0),total=exam.questions.length;
      const result={id:crypto.randomUUID(),examId:id,title:exam.title,studentName,studentId,score,total,percentage:Math.round(score/total*100),submittedAt:new Date().toISOString()};
      submissions.push(result);writeJson(SUBMISSION_INDEX,submissions);writeJson(ATTEMPT_INDEX,attempts.filter(x=>x.token!==attempt.token));
      return send(201,'application/json',JSON.stringify({score,total,percentage:result.percentage}));
    });return;
  }

  if(req.method==='GET'&&pathname==='/classroom/api/resources') return send(200,'application/json',JSON.stringify(readResources().map(({id,title,type,sizeLabel,uploaded})=>({id,title,type,sizeLabel,uploaded}))));
  if(req.method==='GET'&&pathname.startsWith('/classroom/api/resources/')){
    const id=pathname.slice('/classroom/api/resources/'.length),item=readResources().find(x=>x.id===id);
    if(!item)return send(404,'application/json',JSON.stringify({error:'This classroom resource is no longer available.'}));
    return send(200,'application/json',JSON.stringify({id:item.id,title:item.title,type:item.type,sizeLabel:item.sizeLabel,filename:item.filename||(`${safeName(item.title)}.${item.type}`),downloadUrl:`/classroom/resource/${encodeURIComponent(item.id)}`}));
  }
  if(req.method==='GET'&&pathname==='/classroom/api/addresses') return send(200,'application/json',JSON.stringify({port:PORT,addresses:lanAddresses()}));
  if(req.method==='DELETE'&&pathname.startsWith('/classroom/api/resources/')&&!isTeacher(req)) return send(401,'application/json',JSON.stringify({error:'Teacher login required'}));
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

  if (pathname === '/classroom' || pathname === '/classroom/') return send(200, 'text/html; charset=utf-8', classroomPage());
  if (pathname === '/classroom/tests' || pathname === '/classroom/tests/') return send(200, 'text/html; charset=utf-8', assessmentPage());
  if (pathname === '/classroom/teacher' || pathname === '/classroom/teacher/') return send(200, 'text/html; charset=utf-8', isTeacher(req) ? teacherPage() : teacherLoginPage());
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
