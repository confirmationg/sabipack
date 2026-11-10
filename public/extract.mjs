// Pulls plain text out of Word and PDF files, on the phone. Nothing here sends the file anywhere.

// Splits text into parts of at most `max` characters, at paragraph or sentence breaks.
export function chunkText(text, max = 2800) {
  const paras = String(text).replace(/\r/g, '').split(/\n{2,}/).map(p => p.replace(/[ \t]+/g, ' ').trim()).filter(Boolean);
  const out = []; let cur = '';
  const flush = () => { if (cur.trim()) out.push(cur.trim()); cur = ''; };
  for (let p of paras) {
    while (p.length > max) {
      let cut = p.lastIndexOf('. ', max);
      if (cut < max * 0.5) cut = p.lastIndexOf(' ', max);
      if (cut < 1) cut = max; else cut += 1;
      flush(); out.push(p.slice(0, cut).trim()); p = p.slice(cut).trim();
    }
    if (cur && cur.length + p.length + 2 > max) flush();
    cur += (cur ? '\n\n' : '') + p;
  }
  flush();
  return out;
}

const dec = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, '&');

// bytes: Uint8Array of a .docx file. unzipSync: from fflate.
export function docxText(bytes, unzipSync) {
  let files;
  try { files = unzipSync(bytes, { filter: f => f.name === 'word/document.xml' }); } catch { throw new Error('This does not look like a Word (.docx) file.'); }
  const x = files['word/document.xml'];
  if (!x) throw new Error('This does not look like a Word (.docx) file.');
  const xml = new TextDecoder('utf-8').decode(x);
  const lines = xml.split(/<\/w:p>/).map(p => {
    let t = ''; const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>/g; let m;
    while ((m = re.exec(p))) { if (m[1] !== undefined) t += dec(m[1]); else t += m[0].startsWith('<w:tab') ? '\t' : '\n'; }
    return t.trim();
  }).filter(Boolean);
  return lines.join('\n\n');
}

// bytes: Uint8Array of a PDF. pdfjs: the pdf.js module. Throws Error('NO_TEXT') for scanned PDFs.
export async function pdfText(bytes, pdfjs, maxPages = 40) {
  const doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise;
  const n = Math.min(doc.numPages, maxPages); const paras = [];
  for (let i = 1; i <= n; i++) {
    const tc = await (await doc.getPage(i)).getTextContent(); let txt = '';
    for (const it of tc.items) if ('str' in it) txt += it.str + (it.hasEOL ? '\n' : '');
    let para = '';
    for (const ln of txt.split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean)) {
      if (!para) { para = ln; continue; }
      if (para.length < 45 || /^([\u2022\-*]|\d+[.)])\s/.test(ln)) { paras.push(para); para = ln; } else para += ' ' + ln;
    }
    if (para) paras.push(para);
  }
  const text = paras.join('\n\n');
  if (text.replace(/\s/g, '').length < 50) throw new Error('NO_TEXT');
  return { text, pages: doc.numPages, read: n };
}
