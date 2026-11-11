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

// ---- Lessons written by the AI from a typed topic (layered format, optional diagrams) ----
const str = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.length <= max;

// A diagram is a small recipe the app draws itself. The AI never sends raw drawing code.
export function diagramErrors(g) {
  const e = [];
  if (!g || typeof g !== 'object') return ['diagram is not an object'];
  const lim = { flow: [2, 8], cycle: [3, 6], parts: [2, 8] }[g.type];
  if (!lim) return ['diagram type must be flow, cycle or parts'];
  if (g.title !== undefined && !str(g.title, 1, 60)) e.push('diagram title too long');
  if (!Array.isArray(g.steps) || g.steps.length < lim[0] || g.steps.length > lim[1]) e.push(`diagram needs ${lim[0]}-${lim[1]} steps`);
  else g.steps.forEach((s, i) => {
    if (!s || !str(s.label, 1, 40)) e.push(`diagram step ${i + 1}: label must be 1-40 characters`);
    if (s && s.note !== undefined && !str(s.note, 1, 90)) e.push(`diagram step ${i + 1}: note too long`);
  });
  if (g.type === 'parts' && !str(g.center, 1, 40)) e.push('parts diagram needs a center label');
  return e;
}

export function validateLesson(p) {
  const e = validatePack(p);
  const l = p && p.lesson;
  if (!l) return e;
  if (!str(l.big_idea, 10, 400)) e.push('lesson.big_idea must be 10-400 characters');
  if (!Array.isArray(l.sections) || l.sections.length < 2 || l.sections.length > 8) e.push('lesson.sections must have 2-8 sections');
  else l.sections.forEach((s, i) => {
    const n = `section ${i + 1}`;
    if (!s || !str(s.heading, 3, 80)) e.push(`${n}: heading must be 3-80 characters`);
    const hasText = s && s.text !== undefined, hasItems = s && s.items !== undefined;
    if (!hasText && !hasItems) e.push(`${n}: needs text or items`);
    if (hasText && !str(s.text, 5, 1500)) e.push(`${n}: text must be 5-1500 characters`);
    if (hasItems && (!Array.isArray(s.items) || !s.items.length || s.items.length > 10 || !s.items.every(x => Array.isArray(x) && str(x[0], 1, 80) && str(x[1], 1, 400)))) e.push(`${n}: items must be 1-10 pairs of [name, detail]`);
  });
  if (l.example !== undefined && !str(l.example, 5, 800)) e.push('lesson.example too long');
  if (l.exam_trap !== undefined && !str(l.exam_trap, 5, 800)) e.push('lesson.exam_trap too long');
  if (l.key_terms !== undefined && (!Array.isArray(l.key_terms) || l.key_terms.length > 10 || !l.key_terms.every(k => Array.isArray(k) && str(k[0], 1, 80) && str(k[1], 1, 300)))) e.push('lesson.key_terms must be up to 10 pairs of [term, meaning]');
  const c = l.compare;
  if (c !== undefined && !(c && str(c.title, 1, 80) && Array.isArray(c.headers) && c.headers.length >= 2 && c.headers.length <= 4 && c.headers.every(h => typeof h === 'string' && h.length <= 40)
    && Array.isArray(c.rows) && c.rows.length >= 1 && c.rows.length <= 8 && c.rows.every(r => Array.isArray(r) && r.length === c.headers.length && r.every(v => typeof v === 'string' && v.length <= 80)))) e.push('lesson.compare has the wrong shape');
  if (l.diagrams !== undefined) {
    if (!Array.isArray(l.diagrams) || l.diagrams.length > 2) e.push('lesson.diagrams must be up to 2 diagrams');
    else l.diagrams.forEach((g, i) => diagramErrors(g).forEach(x => e.push(`diagram ${i + 1}: ${x}`)));
  }
  return e;
}
