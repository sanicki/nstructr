/* An exercise submitted from the app (src/app/5-submit.js) as a GitHub issue (.github/ISSUE_TEMPLATE/exercise.yml),
   checked and written into library/ for a pull request (.github/workflows/submission.yml).
     node tools/submission.mjs <issue body file> <issue number> <out dir>
   Writes <out dir>/report.md (the comment on the issue), and on success the library file and <out dir>/pr.md; exits 1
   when the submission can't go in as it is (the report says why).
   The issue is written by anyone: it's only ever read as data. The exercise travels as a share link (#/link/e1z.…,
   deflate-raw + base64url; e1j.… plain JSON). What it is:
     name   — the exercise's name is added to the target's other names (nothing else is taken)
     update — the exercise replaces the target, keeping the target's id, name and collections (a new name becomes
              another name)
     new    — a new library exercise: an id from its name, collections guessed (the reviewer can change them)
   Every result passes the same gates as the build: schema, animation checks, range of motion, and no duplicates
   (moving the same as a library exercise with the same equipment and measure), and no name another exercise has. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Ajv2020 = require('ajv/dist/2020').default;
const { check } = require('./checks.cjs');
const { pastFlexible } = require('./rom.cjs');
const { formatJson } = require('./format-json.cjs');
const { similarTo, nameKey } = require('../src/similar.js');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(ROOT, 'library/exercises');
const [bodyFile, number, outDir] = process.argv.slice(2);
const SITE = 'https://sanicki.github.io/nstructr/';

const problems = [], notes = [];
const md = s => String(s).replace(/[\\`*_{}[\]<>()#+|!~-]/g, c => '\\' + c).replace(/\s+/g, ' ').slice(0, 200);   // untrusted text, shown literally
function finish(ok, summary, file, prBody) {
  const report = [`### ${ok ? '✅' : '❌'} ${summary}`, '',
    ...problems.map(p => `- ❌ ${p}`), ...notes.map(n => `- ${n}`), '',
    ok ? 'A pull request has the change for review.' : 'Fix these and edit the issue (or open a new one from the app): it\'s checked again.',
    '', '<sub>Checked by tools/submission.mjs</sub>'].join('\n');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'report.md'), report + '\n');
  if (ok) fs.writeFileSync(path.join(outDir, 'pr.md'), `${prBody}\n\n${report}\n\nCloses #${number}\n`);
  console.log(report);
  process.exit(ok ? 0 : 1);
}
const fail = (summary, why) => { if (why) problems.push(why); finish(false, summary); };

// ---------- the issue form ----------
const body = fs.readFileSync(bodyFile, 'utf8').slice(0, 200000);
const field = label => {
  const m = new RegExp(`^###\\s*${label}\\s*$([\\s\\S]*?)(?=^###\\s|(?![\\s\\S]))`, 'm').exec(body);
  const v = m ? m[1].trim() : '';
  return v === '_No response_' ? '' : v;
};
const kind = field('What it is').toLowerCase(), targetId = field('Library exercise'), note = field('Note'), linkText = field('Exercise link');
if (!['name', 'update', 'new'].includes(kind)) fail('Not a submission I can read', '"What it is" should be name, update or new.');

// ---------- the exercise ----------
const m = /#\/link\/e1([zj])\.([A-Za-z0-9_-]{10,})/.exec(linkText);
if (!m) fail('No exercise found', '"Exercise link" should be the link the app made (it contains #/link/e1).');
let ex;
try {
  let bytes = Buffer.from(m[2], 'base64url');
  if (m[1] === 'z') bytes = zlib.inflateRawSync(bytes, { maxOutputLength: 2_000_000 });
  const data = JSON.parse(bytes.toString('utf8'));
  ex = data && data.format === 'nstructr/exercise' ? (data.exercises || [])[0] : null;
  if (!ex || typeof ex !== 'object' || Array.isArray(ex)) throw new Error('no exercise');
} catch (e) { fail('The exercise link is damaged', 'The link couldn\'t be read. Copy it again from the app.'); }
for (const k of ['$schema', 'version', 'id', 'basedOn', 'collections']) delete ex[k];
if (ex.sanskrit != null) { ex.otherNames = ex.otherNames || String(ex.sanskrit).split(/\s*,\s*/).filter(Boolean); delete ex.sanskrit; }
const name = String(ex.name || '').replace(/\s*\(copy\)\s*$/i, '').trim();
if (!name || name.length > 80) fail('The exercise needs a name', 'A name of 1 to 80 characters.');
ex.name = name;

const library = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
const byId = new Map(library.map(x => [x.id, x]));
const namesOf = x => [x.name, ...(x.otherNames || [])];
const hasName = (x, n) => namesOf(x).some(k => nameKey(k) === nameKey(n));
const target = targetId ? byId.get(targetId) : null;
if (kind !== 'new' && !target) fail('Which library exercise?', `"Library exercise" should be the id of a library exercise (got "${md(targetId)}").`);
const elsewhere = n => library.find(x => x !== target && hasName(x, n));

// ---------- what goes in the library ----------
let out, summary;
if (kind === 'name') {
  if (hasName(target, name)) fail(`“${md(target.name)}” already has that name`);
  const other = elsewhere(name);
  if (other) fail('That name is taken', `“${md(name)}” is already a name of \`${other.id}\` (${md(other.name)}).`);
  out = { ...target, otherNames: [...(target.otherNames || []), name] };
  if (!target.otherNames) {             // keep the library's field order: other names right after the name
    const { $schema, version, id, name: n, ...rest } = target;
    out = { $schema, version, id, name: n, otherNames: [name], ...rest };
  }
  summary = `Adds “${md(name)}” as another name for “${md(target.name)}”`;
} else {
  const renamed = kind === 'update' && !hasName(target, name);
  let otherNamesList = [...new Set([...(ex.otherNames || []), ...(renamed ? [name] : [])])].filter(n => !(kind === 'update' && nameKey(n) === nameKey(target.name)));
  // a copy of a library exercise brings that exercise's other names along: for a new one they're dropped, not refused
  const taken = otherNamesList.filter(n => { const o = elsewhere(n); return o && !(kind === 'update' && o === target); });
  if (kind === 'new' && taken.length) { otherNamesList = otherNamesList.filter(n => !taken.includes(n)); notes.push(`Other names left out, already the names of library exercises: ${taken.map(md).join(', ')}.`); }
  for (const n of kind === 'new' ? [name] : [name, ...otherNamesList]) { const other = elsewhere(n); if (other && !(kind === 'update' && other === target)) problems.push(`“${md(n)}” is already a name of \`${other.id}\` (${md(other.name)}): name how yours is different.`); }
  if (kind === 'update') {
    const { $schema, version, id, name: n, collections } = target;
    const { name: _, otherNames: __, ...rest } = ex;
    out = { $schema, version, id, name: n, ...(otherNamesList.length ? { otherNames: otherNamesList } : {}), ...rest, collections };
    // the library's field order where it has the field
    out = Object.fromEntries([...Object.keys(target).filter(k => k in out), ...Object.keys(out).filter(k => !(k in target))].map(k => [k, out[k]]));
    summary = `Changes “${md(target.name)}”`;
    if (renamed) notes.push(`Your name “${md(name)}” is added as another name; the library keeps “${md(target.name)}”.`);
  } else {
    const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '').replace(/^u-/, '') || 'exercise';
    let id = slug, i = 2;
    while (byId.has(id)) id = `${slug}-${i++}`;
    const { name: _, otherNames: __, ...rest } = ex;
    out = { $schema: '../../schema/exercise.schema.json', version: 2, id, name, ...(otherNamesList.length ? { otherNames: otherNamesList } : {}), category: rest.category, focus: rest.focus, collections: undefined, ...rest };
    summary = `Adds “${md(name)}” (\`${id}\`)`;
  }
}

// ---------- the same gates as the build ----------
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(JSON.parse(fs.readFileSync(path.join(ROOT, 'schema/exercise.schema.json'), 'utf8')));
const { $schema, version, ...plain } = out;
let similar = [];
if (!validate(out)) for (const e of validate.errors.slice(0, 10)) problems.push(`Format: ${md(e.instancePath || '(top)')} ${md(e.message)}`);
else {
  try {
    for (const is of check(plain).slice(0, 10)) problems.push(`Animation: ${md(is.msg)}`);
    for (const x of pastFlexible(plain).slice(0, 10)) problems.push(`Range of motion: ${x.label} step ${x.step}: ${x.joint} ${x.value}° is past what a flexible body can do (${x.range[0]}…${x.range[1]})`);
    if (kind !== 'name') similar = similarTo(plain, library.filter(x => x.id !== out.id));
  } catch (e) { problems.push(`The exercise couldn't be played: ${md(e.message)}`); }
}
if (kind === 'new' && !out.collections) {
  // where it shows in the app: like the closest library exercise with the same equipment, else by its equipment
  const near = similar.find(s => s.verdict !== 'name' && s.sameEquipment), eq = (out.equipment || []).join(' ').toLowerCase();
  out.collections = near ? byId.get(near.id).collections
    : [/band/.test(eq) ? 'Resistance band' : /dumbbell|barbell|kettlebell|weight/.test(eq) ? 'Free weights' : /chair/.test(eq) ? 'Chair-based' : 'Bodyweight'];
  notes.push(`Collections: ${out.collections.join(', ')} (a guess; the reviewer can change it).`);
}
const dup = similar.find(s => s.verdict === 'duplicate');
if (dup) problems.push(`It moves the same as \`${dup.id}\` (${md(dup.name)}), with the same equipment and measure. Suggest your name as another name for it, or your changes to it; a different exercise needs what sets it apart (its equipment, or held instead of repeated).`);
for (const s of similar.filter(s => s !== dup).slice(0, 4))
  notes.push(`${{ variant: 'Moves the same as', similar: 'Moves like', name: 'Has a name of' }[s.verdict]} \`${s.id}\` (${md(s.name)})${s.verdict === 'variant' ? `, ${s.sameEquipment ? 'measured differently' : 'with other equipment'}` : ''}: ${s.motion}° apart.`);
if (!out.source || !out.source.url) notes.push('⚠️ No source link: the library cites where each exercise comes from (Edit → Source link).');
if (kind === 'new' && !(out.cues || []).length) notes.push('No form cues.');
if (problems.length) finish(false, `Can't go in yet: ${summary.charAt(0).toLowerCase() + summary.slice(1)}`);

fs.writeFileSync(path.join(DIR, out.id + '.json'), formatJson(out));
notes.unshift(`File: \`library/exercises/${out.id}.json\` · try it after merging: ${SITE}#/play/${out.id}`);
if (note) notes.push(`Note from the submitter: ${md(note.slice(0, 1000))}`);
// the research to do before merging (names, equipment versions): .claude/skills/exercise-research/SKILL.md
const research = require('./research.cjs').report([out.id], true);
finish(true, summary, out.id, `${summary}, from #${number}.\n\n#### Before merging: names and equipment versions\n${research}\n\nCheck the name is the most common one and add other common names; look for established versions with the missing equipment (\`.claude/skills/exercise-research/SKILL.md\`).`);
