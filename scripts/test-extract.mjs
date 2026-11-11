import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { unzipSync } from '../public/vendor/fflate.mjs';
import * as pdfjs from '../public/vendor/pdf.min.mjs';
import { chunkText, docxText, pdfText } from '../public/extract.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(path.resolve('public/vendor/pdf.worker.min.mjs')).href;
const fx = f => new Uint8Array(fs.readFileSync('scripts/fixtures/' + f));

const d = docxText(fx('sample.docx'), unzipSync);
assert.ok(d.includes('Osmosis & diffusion notes'), 'heading and ampersand decoded');
assert.ok(d.includes('partially permeable membrane'));
assert.ok(d.includes('Active transport') && d.includes('Yes <and> "uses" ATP'), 'table text and entities');
assert.throws(() => docxText(new Uint8Array([1, 2, 3]), unzipSync), /Word/);
assert.throws(() => docxText(fx('sample.pdf'), unzipSync), /Word/);

const p = await pdfText(fx('sample.pdf'), pdfjs);
assert.equal(p.pages, 2);
assert.ok(p.text.includes('nucleus controls the activities') && p.text.includes('ribosomes make proteins'), 'text from both pages');
await assert.rejects(() => pdfText(fx('scan.pdf'), pdfjs), /NO_TEXT/);

const long = Array.from({ length: 40 }, (_, i) => `Paragraph ${i}. ` + 'The cell is the basic unit of life. '.repeat(8)).join('\n\n');
const parts = chunkText(long, 2800);
assert.ok(parts.length > 3 && parts.every(x => x.length <= 2800), 'chunks respect the limit');
assert.equal(parts.join(' ').replace(/\s+/g, ' ').length >= long.replace(/\s+/g, ' ').length - parts.length * 2, true, 'nothing lost');
const one = 'x'.repeat(7000);
assert.ok(chunkText(one, 2800).every(x => x.length <= 2800) && chunkText(one, 2800).join('').length === 7000, 'very long single paragraph');
assert.deepEqual(chunkText('Short note.', 2800), ['Short note.']);
assert.deepEqual(chunkText('   ', 2800), []);
console.log('extract tests passed');
