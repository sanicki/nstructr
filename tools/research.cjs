/* After an exercise is added: the mechanical half of the library research (the judgment half, what's the most common
   name and which versions are established, is a web search: .claude/skills/exercise-research/SKILL.md).
     node tools/research.cjs report [id...]        names, name clashes, and which equipment versions the library has
                                                  or lacks (default: every exercise); --md for Markdown
     node tools/research.cjs names <names.json>    apply renames and other names: {"id": [new name or null, [other names]]}
                                                  (a renamed exercise keeps its old name as another name; yoga keeps
                                                  its Sanskrit name first; refuses a name that another exercise has)
     node tools/research.cjs variants <defs.cjs> [id...]
                                                  write equipment versions from definitions (each starts from the
                                                  library exercise with the same movement) and check each one
   Then look at every step: python3 tools/research_sheet.py out.png <id...> (against a served build). */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), DIR = path.join(ROOT, 'library/exercises');
const { similarTo, nameKey, equipKinds, fingerprint, motionDistance } = require('../src/similar.js');
const { formatJson } = require('./format-json.cjs');
const load = () => fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
const save = ex => fs.writeFileSync(path.join(DIR, ex.id + '.json'), formatJson(ex));
/* the equipment headings of the AI prompt (src/app/5-ai.js), as kinds; '' = no equipment */
const KINDS = ['', 'band', 'door anchor', 'dumbbell', 'barbell', 'kettlebell', 'chair', 'bench', 'wall', 'step', 'towel'];
const GEAR = new Set(['door', 'anchor', 'band', 'banded', 'resistance', 'dumbbell', 'barbell', 'kettlebell', 'chair', 'bench', 'wall', 'step', 'towel', 'weighted', 'seated', 'standing', 'supported', 'assisted', 'at']);
const kindOf = ex => equipKinds(ex.equipment).join(' and ');
/* each name as its words, without equipment words ("Band Squat" -> squat) */
const cores = ex => [ex.name, ...(ex.otherNames || [])].map(n => nameKey(n).split(' ').filter(w => w && !GEAR.has(w))).filter(ws => ws.length);
const within = (a, b) => a.every(w => b.includes(w));

/* the library's other-equipment versions of ex: one of its names inside one of the other's (or the other way round,
   so Squat, Band Squat and Back Squat find each other), or moving the same within a few degrees. A checklist for a
   person, not a verdict. */
function versions(ex, lib, prints) {
  const mine = prints.get(ex.id) || fingerprint(ex), c = cores(ex), out = [];
  for (const x of lib) {
    if (x.id === ex.id || kindOf(x) === kindOf(ex)) continue;
    let d = Infinity; try { d = motionDistance(mine, prints.get(x.id)); } catch (e) { }
    const named = cores(x).some(a => c.some(b => within(a, b) || within(b, a)));
    if (d < 2.5 || named) out.push({ id: x.id, name: x.name, kind: kindOf(x) || 'no equipment', motion: Math.round(d * 10) / 10 });
  }
  return out.sort((a, b) => a.motion - b.motion);
}
function report(ids, md) {
  const lib = load(), prints = new Map(lib.map(x => [x.id, fingerprint(x)]));
  const owner = new Map();
  for (const x of lib) for (const n of [x.name, ...(x.otherNames || [])]) { const k = nameKey(n); owner.set(k, [...(owner.get(k) || []), x.id]); }
  const rows = [];
  for (const ex of lib.filter(x => !ids.length || ids.includes(x.id))) {
    const v = versions(ex, lib, prints), have = new Set([kindOf(ex), ...v.map(x => (x.kind === 'no equipment' ? '' : x.kind))]);
    const missing = KINDS.filter(k => !have.has(k) && !(k && kindOf(ex).split(' and ').includes(k)));
    const clashes = [ex.name, ...(ex.otherNames || [])].filter(n => owner.get(nameKey(n)).length > 1);
    const dup = similarTo(ex, lib, prints).filter(m => m.verdict === 'duplicate');
    rows.push({ ex, v, missing, clashes, dup });
  }
  const text = [];
  for (const { ex, v, missing, clashes, dup } of rows) {
    const line = (label, t) => text.push(md ? `- **${label}:** ${t}` : `  ${label}: ${t}`);
    text.push(md ? `**${ex.name}** (\`${ex.id}\`, ${kindOf(ex) || 'no equipment'})` : `${ex.id}  ${ex.name}  [${kindOf(ex) || 'no equipment'}]`);
    line('Names', [ex.name, ...(ex.otherNames || [])].join(' · ') || '—');
    if (clashes.length) line('⚠ Name also used by another exercise', clashes.join(', '));
    if (dup.length) line('⚠ Duplicate of', dup.map(d => d.id).join(', '));
    line('Equipment versions in the library', v.length ? v.map(x => `${x.name} (${x.kind})`).join(' · ') : 'none');
    line('No version yet with', missing.map(k => k || 'no equipment').join(', ') || '—');
  }
  if (!md) text.push(`\n${rows.length} exercise(s). Next: search the web for the most common name and other names, and for established versions with the equipment above (.claude/skills/exercise-research/SKILL.md).`);
  return text.join('\n');
}
function names(file) {
  const map = JSON.parse(fs.readFileSync(file, 'utf8')), lib = load();
  for (const [id, [name, add]] of Object.entries(map)) {
    const ex = lib.find(e => e.id === id); if (!ex) throw new Error(`no exercise "${id}"`);
    const list = [...(ex.otherNames || [])];
    if (name && name !== ex.name) { list.unshift(ex.name); ex.name = name; }
    const seen = new Set([nameKey(ex.name)]), out = [];
    for (const n of [...list, ...(add || [])]) { const k = nameKey(n); if (!seen.has(k)) { seen.add(k); out.push(n); } }
    const sk = (ex.collections || []).includes('Yoga') && out.find(n => /asana\b/i.test(n));   // Sanskrit first: it's shown under the name
    const others = sk ? [sk, ...out.filter(n => n !== sk)] : out;
    const { $schema, version, id: _, name: nm, otherNames, ...rest } = ex;
    Object.keys(ex).forEach(k => delete ex[k]);
    Object.assign(ex, { $schema, version, id, name: nm, ...(others.length ? { otherNames: others } : {}), ...rest });
  }
  const owner = new Map(); let bad = 0;
  for (const e of lib) for (const n of [e.name, ...(e.otherNames || [])]) {
    const k = nameKey(n);
    if (owner.has(k) && owner.get(k) !== e.id) { console.log(`✗ "${n}" is a name of both ${owner.get(k)} and ${e.id}`); bad++; }
    owner.set(k, e.id);
  }
  if (bad) { console.log('nothing written'); process.exit(1); }
  for (const id of Object.keys(map)) save(lib.find(e => e.id === id));
  console.log(`updated ${Object.keys(map).length} exercise(s)`);
}
function variants(file, only) {
  const { check } = require('./checks.cjs'), { pastFlexible } = require('./rom.cjs');
  const defs = require(path.resolve(file));
  let bad = 0;
  for (const d of defs) {
    if (only.length && !only.includes(d.id)) continue;
    const base = JSON.parse(fs.readFileSync(path.join(DIR, `${d.base}.json`), 'utf8'));
    let ex = JSON.parse(JSON.stringify(base));
    ex = (d.edit && d.edit(ex)) || ex;
    // no "props" in a definition: the base exercise's (its bench, its weights)
    const props = d.props === undefined ? base.props : typeof d.props === 'function' ? d.props(base.props || []) : d.props;
    (d.steps || []).forEach(([n, c], i) => { if (n) ex.keyframes[i].name = n; if (c) ex.keyframes[i].cue = c; });
    const { $schema, version, keyframes, prescription, measure, defaults, repName, bilateral, direction, holdStep, floorGuide } = ex;
    const out = { $schema, version, id: d.id, name: d.name, ...(d.otherNames && d.otherNames.length ? { otherNames: d.otherNames } : {}),
      category: d.category || base.category, focus: d.focus || base.focus, collections: d.collections, equipment: d.equipment,
      description: d.description, source: d.source, setup: d.setup, cues: d.cues,
      ...(d.prescription || prescription ? { prescription: d.prescription || prescription } : {}),
      keyframes, ...(props && props.length ? { props } : {}),
      ...(bilateral ? { bilateral } : {}), ...(direction ? { direction } : {}), ...(floorGuide ? { floorGuide } : {}),
      measure, ...(holdStep != null ? { holdStep } : {}), ...(defaults ? { defaults } : {}), ...(repName ? { repName } : {}) };
    for (const [k, v] of Object.entries(d.over || {})) { if (v === null) delete out[k]; else out[k] = v; }
    save(out);
    const { $schema: a, version: b, ...plain } = out;
    const issues = check(plain).map(i => i.msg), rom = pastFlexible(plain).map(x => `${x.label} step ${x.step}: ${x.joint} ${x.value}°`);
    const others = load().filter(x => x.id !== d.id);
    const sim = similarTo(plain, others).filter(m => m.verdict !== 'name').slice(0, 2);
    const clash = [d.name, ...(d.otherNames || [])].flatMap(n => others.filter(x => [x.name, ...(x.otherNames || [])].some(k => nameKey(k) === nameKey(n))).map(x => `"${n}" is ${x.id}'s`));
    const fail = issues.length || rom.length || sim.some(s => s.verdict === 'duplicate') || clash.length;
    if (fail) bad++;
    console.log(`${fail ? '✗' : '✓'} ${d.id}${issues.length ? ' | ' + issues.slice(0, 4).join('; ') : ''}${rom.length ? ' | range ' + rom.slice(0, 3).join('; ') : ''}${clash.length ? ' | ' + clash.join(', ') : ''}${sim.length ? ' | ' + sim.map(m => `${m.verdict} of ${m.id} (${m.motion}°)`).join(', ') : ''}`);
  }
  if (bad) process.exit(1);
}
module.exports = { versions, report, KINDS };
if (require.main === module) {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === 'report') console.log(report(args.filter(a => a !== '--md'), args.includes('--md')));
  else if (cmd === 'names' && args[0]) names(args[0]);
  else if (cmd === 'variants' && args[0]) variants(args[0], args.slice(1));
  else { console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]); process.exit(1); }
}
