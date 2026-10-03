/* Step calls (HANDOFF §3, a keyframe's "call"): which counted exercises have several steps a rep, and their calls, or
   a draft from the step names for one that has none (to review by hand: a call goes only where the next move isn't
   obvious, and fits its step).
     node tools/calls.cjs            every counted exercise with 3 or more spoken steps a rep
     node tools/calls.cjs <id>...    those exercises */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'library', 'exercises');
const ids = process.argv.slice(2);
// a draft from a step name: lead-in verbs and "your"/"the" off, at most 3 words; a step back to the start gets none
const draft = name => {
  if (/^(back to|return|stand tall|sit tall|centre|center)\b/i.test(name || '')) return '';
  const w = (name || '').replace(/^(reach|lift|move|bring|take|go|step)\s+(your\s+|the\s+)?/i, '').replace(/\b(your|the)\s+/gi, '').replace(/[,.]/g, '').split(/\s+/).filter(Boolean);
  const t = w.slice(0, 3).join(' ');
  return t && !/\d/.test(t) ? t[0].toUpperCase() + t.slice(1) : '';
};
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  const ex = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (ids.length ? !ids.includes(ex.id) : ex.measure === 'time') continue;
  const rep = ex.keyframes.map((k, i) => ({ k, i })).filter(({ k }) => (k.phase || 'rep') === 'rep');
  if (!ids.length && rep.filter(({ k }) => !k.quiet).length < 3) continue;
  const has = rep.some(({ k }) => k.call);
  const line = rep.map(({ k, i }, j) => {
    if (j === 0) return `[${i}] ${k.name} = the count`;
    if (k.quiet) return null;
    const ms = (k.durationMs == null ? 1000 : k.durationMs) + (k.holdMs == null ? 500 : k.holdMs);
    const c = has ? k.call || '' : draft(k.name), fits = !c || c.split(' ').length / 2.5 * 1000 <= ms;
    return `[${i}] ${k.name}: ${c ? `"${c}"` : '—'}${fits ? '' : ` (too long for ${ms} ms)`}`;
  }).filter(Boolean);
  console.log(`${ex.id} (${has ? 'calls' : 'draft'})\n  ${line.join('\n  ')}`);
}
