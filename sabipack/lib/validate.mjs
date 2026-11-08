// Checks an AI-generated pack before it is saved. Anything that fails is rejected, never shown to students.
export function validatePack(p) {
  const e = [];
  const s = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.length <= max;
  if (!p || typeof p !== 'object') return ['Pack is not an object'];
  const l = p.lesson;
  if (!l) e.push('Missing lesson');
  else {
    if (!s(l.title, 3, 80)) e.push('lesson.title must be 3-80 characters');
    if (!s(l.body, 100, 1400)) e.push('lesson.body must be 100-1400 characters');
    if (!s(l.audio_script, 60, 1000)) e.push('lesson.audio_script must be 60-1000 characters');
  }
  if (!Array.isArray(p.questions) || p.questions.length < 3 || p.questions.length > 8) e.push('questions must be an array of 3-8');
  else p.questions.forEach((q, i) => {
    const n = `question ${i + 1}`;
    if (!s(q.stem, 10, 300)) e.push(`${n}: stem must be 10-300 characters`);
    if (!Array.isArray(q.options) || q.options.length !== 4 || !q.options.every(o => s(o, 1, 120))) e.push(`${n}: needs exactly 4 options`);
    else if (new Set(q.options.map(o => o.trim().toLowerCase())).size !== 4) e.push(`${n}: options must be different`);
    if (!Number.isInteger(q.answer_index) || q.answer_index < 0 || q.answer_index > 3) e.push(`${n}: answer_index must be 0-3`);
    if (!s(q.explanation, 10, 400)) e.push(`${n}: explanation must be 10-400 characters`);
    if (!s(q.objective_hint, 3, 160)) e.push(`${n}: objective_hint is required`);
  });
  return e;
}
