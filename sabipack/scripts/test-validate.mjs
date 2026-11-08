import assert from 'node:assert';
import { validatePack } from '../lib/validate.mjs';
const good = { lesson: { title: 'Cell basics', body: 'x'.repeat(120), audio_script: 'y'.repeat(80) },
  questions: [1,2,3].map(i => ({ stem: 'Which part releases energy ' + i + '?', options: ['A','B','C','D'], answer_index: 1, explanation: 'Because of the source text.', objective_hint: 'cell parts' })) };
assert.deepStrictEqual(validatePack(good), []);
const bad = structuredClone(good); bad.questions[0].options = ['A','A','C','D']; bad.questions[1].answer_index = 7;
const errs = validatePack(bad);
assert.ok(errs.some(x => x.includes('different')) && errs.some(x => x.includes('answer_index')));
assert.ok(validatePack({}).length > 0);
console.log('validate tests passed');
