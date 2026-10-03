/* NstructR build
   node tools/build.mjs              validate + check + bundle + assemble the site in _site/
   node tools/build.mjs --check-only validate + check only (what pull requests run)
   node tools/build.mjs --no-checks  skip the (slower) animation checks

   1. Every file in library/ is validated against schema/*.schema.json.
   2. Every exercise is played through (both sides, both directions) and checked for floating/sinking poses,
      snapping limbs and planted feet/hands that wander. Accepted deviations live in tools/known-issues.json.
   3. library/index.json bundles the whole library; the app loads it (and caches it for offline use).
   4. _site/ is what GitHub Pages serves: index.html + src/ + library/, the web app manifest, icons, og.png (the link
      preview image: tools/og-image.cjs) and a service
      worker (so the installed app works offline), and nstructr.html, a single file with everything inlined that
      also works opened straight from disk. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Ajv2020 = require('ajv/dist/2020').default;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = new Set(process.argv.slice(2));
const rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const errors = [], warnings = [];

// ---------- 1. validate ----------
const ajv = new Ajv2020({ allErrors: true, strict: false });
const vEx = ajv.compile(JSON.parse(rd('schema/exercise.schema.json')));
const vWk = ajv.compile(JSON.parse(rd('schema/workout.schema.json')));
const loadDir = (dir, validate, kind) => fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith('.json')).sort().map(f => {
  let data;
  try { data = JSON.parse(rd(path.join(dir, f))); } catch (e) { errors.push(`${dir}/${f}: not valid JSON (${e.message})`); return null; }
  if (!validate(data)) for (const e of validate.errors) errors.push(`${dir}/${f}: ${e.instancePath || '(top)'} ${e.message}${e.params && e.params.allowedValues ? ` (${e.params.allowedValues.join(', ')})` : ''}${e.params && e.params.additionalProperty ? ` "${e.params.additionalProperty}"` : ''}`);
  if (data.id && data.id + '.json' !== f) errors.push(`${dir}/${f}: file name must be "${data.id}.json"`);
  if (data.id && data.id.startsWith('u-')) errors.push(`${dir}/${f}: "u-" ids are for users' own ${kind}s; give it a library id`);
  const { $schema, version, ...rest } = data;
  return rest;
}).filter(Boolean);
const exercises = loadDir('library/exercises', vEx, 'exercise');
const workouts = loadDir('library/workouts', vWk, 'workout');
const ids = new Set();
for (const ex of exercises) { if (ids.has(ex.id)) errors.push(`duplicate exercise id "${ex.id}"`); ids.add(ex.id); }
// the library workouts' default order (people can reorder them in the app): library/workout-order.json
{
  const order = JSON.parse(rd('library/workout-order.json')).order, have = new Set(workouts.map(w => w.id));
  for (const id of have) if (!order.includes(id)) errors.push(`library/workout-order.json: add "${id}" (every library workout has a place in the order)`);
  for (const id of order) if (!have.has(id)) errors.push(`library/workout-order.json: "${id}" isn't a library workout`);
  workouts.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}
for (const w of workouts) w.blocks.forEach((b, bi) => b.items.forEach((it, ii) => {
  if (!ids.has(it.ex)) errors.push(`library/workouts/${w.id}.json: blocks[${bi}].items[${ii}] uses "${it.ex}", which isn't in the library`);
}));
// references inside exercises that the schema can't see
for (const ex of exercises) ex.keyframes.forEach((k, i) => (k.keep || []).forEach(x => {
  if (typeof x === 'object' && x.keyframe >= ex.keyframes.length) errors.push(`${ex.id}: keyframes[${i}].keep points at step ${x.keyframe}, which doesn't exist`);
}));
// step calls (HANDOFF §3): said as the step starts in the counted reps, so one must fit in the step and isn't on the
// rep's first step (the count is said there)
for (const ex of exercises) {
  const rep = ex.keyframes.map((k, i) => ((k.phase || 'rep') === 'rep' ? i : -1)).filter(i => i >= 0);
  ex.keyframes.forEach((k, i) => {
    if (!k.call) return;
    const words = k.call.split(' ').length, ms = (k.durationMs == null ? 1000 : k.durationMs) + (k.holdMs == null ? 500 : k.holdMs);
    if ((k.phase || 'rep') !== 'rep' || ex.measure === 'time') errors.push(`${ex.id}: keyframes[${i}].call: calls are said in counted reps only (a rep step of a reps exercise)`);
    else if (i === rep[0]) errors.push(`${ex.id}: keyframes[${i}].call: the rep's first step has the count, not a call`);
    if (words / 2.5 * 1000 > ms) errors.push(`${ex.id}: keyframes[${i}].call "${k.call}" takes about ${(words / 2.5).toFixed(1)} s to say; the step lasts ${ms / 1000} s`);
  });
}
// one name for each piece of equipment: a mat is "Yoga mat" (src/similar.js)
{ const { isMat, MAT } = require('../src/similar.js');
  for (const ex of exercises) for (const q of ex.equipment || []) if (isMat(q) && q !== MAT) errors.push(`${ex.id}: equipment "${q}": call it "${MAT}"`); }
// muscle groups (HANDOFF §13, docs/muscles.md; written by tools/muscles.cjs): every library exercise rates them
for (const ex of exercises) if (!ex.muscles) errors.push(`${ex.id}: a library exercise needs "muscles" (the groups it works, 1–3; {} for none): add it to tools/muscles.cjs and run it`);
for (const ex of exercises) if (!(ex.collections || []).length) errors.push(`${ex.id}: a library exercise needs "collections" (where the app shows it: Bodyweight, Yoga...)`);
// linked variations (library/progressions.json, HANDOFF §5.4): easier/harder steps and equipment groups
const links = JSON.parse(rd('library/progressions.json'));
{
  const vLinks = ajv.compile(JSON.parse(rd('schema/progressions.schema.json'))), byId = new Map(exercises.map(ex => [ex.id, ex]));
  if (!vLinks(links)) for (const e of vLinks.errors) errors.push(`library/progressions.json: ${e.instancePath || '(top)'} ${e.message}`);
  const { equipKinds } = require('../src/similar.js');
  for (const c of links.progressions || []) for (const id of c.steps) if (!byId.has(id)) errors.push(`library/progressions.json: progression "${c.name}" lists "${id}", which isn't in the library`);
  for (const g of links.equipment || []) {
    for (const id of g.ids) if (!byId.has(id)) errors.push(`library/progressions.json: equipment group "${g.name}" lists "${id}", which isn't in the library`);
    const kinds = g.ids.filter(id => byId.has(id)).map(id => equipKinds(byId.get(id).equipment).join(' and ') || 'no equipment');
    kinds.forEach((k, i) => { if (kinds.indexOf(k) !== i) errors.push(`library/progressions.json: equipment group "${g.name}" has two exercises with ${k} (${g.ids[kinds.indexOf(k)]}, ${g.ids[i]}); each member uses other equipment`); });
    // the same move with other equipment works the same muscles: a group most members are for (3), all of them work
    // (one may add a group, as a band pull-apart does to a wall sit)
    const rated = g.ids.map(id => byId.get(id)).filter(ex => ex && ex.muscles);
    for (const m of new Set(rated.flatMap(ex => Object.keys(ex.muscles)))) if (rated.filter(ex => ex.muscles[m] === 3).length * 2 > rated.length)
      for (const b of rated) if (!b.muscles[m]) warnings.push(`library/progressions.json: equipment group "${g.name}" is for ${m}, but ${b.id} doesn't work it (tools/muscles.cjs)`);
  }
  for (const n of links.notLinked || []) for (const id of n.ids) if (!byId.has(id)) errors.push(`library/progressions.json: notLinked lists "${id}", which isn't in the library`);
}
console.log(`validated ${exercises.length} exercises, ${workouts.length} workouts`);

// ---------- 2. animation checks ----------
if (!args.has('--no-checks') && !errors.length) {
  const { check } = require('./checks.cjs');
  const known = JSON.parse(rd('tools/known-issues.json'));
  let n = 0;
  for (const ex of exercises) {
    const allow = known[ex.id] || {};
    for (const is of check(ex)) {
      if (allow[is.kind] != null && is.px <= allow[is.kind]) continue;
      errors.push(`${ex.id}: ${is.msg}`); n++;
    }
  }
  console.log(n ? `animation checks: ${n} problem(s)` : 'animation checks: all exercises pass');
}
// ---------- 2b. range of motion: no pose past what a flexible body can do (docs/3d-skeleton.md, "Joint model") ----------
if (!args.has('--no-checks') && !errors.length) {
  const { pastFlexible } = require('./rom.cjs');
  let n = 0;
  for (const ex of exercises) for (const x of pastFlexible(ex)) {
    errors.push(`${ex.id}: ${x.label} step ${x.step} "${x.name}": ${x.joint} ${x.value}° is past what a flexible body can do (${x.range[0]}…${x.range[1]})`); n++;
  }
  console.log(n ? `range of motion: ${n} joint(s) out of range` : 'range of motion: every pose is within reach of a flexible body');
}
// ---------- 2c. no duplicates: two library exercises may not move the same with the same equipment and measure (src/similar.js) ----------
if (!args.has('--no-checks') && !errors.length) {
  const { similarTo } = require('../src/similar.js');
  const prints = new Map(), seen = new Set();
  let variants = 0;
  for (const ex of exercises) for (const m of similarTo(ex, exercises, prints)) {
    const pair = [ex.id, m.id].sort().join(' ~ ');
    if (seen.has(pair)) continue;
    seen.add(pair);
    if (m.verdict === 'duplicate') errors.push(`${pair}: move the same (${m.motion}°) with the same equipment and measure; make one exercise (add the other's name to "otherNames")`);
    if (m.verdict === 'variant') variants++;
    // the same move with other equipment or measure, but not linked (library/progressions.json): suggest it, unless it's ruled out
    const linked = [...links.equipment.map(g => g.ids), ...links.progressions.map(c => c.steps)].some(l => l.includes(ex.id) && l.includes(m.id));
    const ruledOut = (links.notLinked || []).some(n => n.ids.includes(ex.id) && n.ids.includes(m.id));
    if (m.verdict === 'variant' && !linked && !ruledOut) warnings.push(`${pair}: move the same (other equipment or measure) but aren't linked: add them to an equipment group or a progression in library/progressions.json, or to its "notLinked" with why`);
  }
  const d = errors.length;
  console.log(d ? `duplicates: ${d}` : `duplicates: none (${variants} variant pair(s): same motion, other equipment or measure)`);
}
// ---------- 2c2. starting and ending positions (src/positions.js): the workout player moves between exercises through the
// at-rest pose of a shared position; each rest pose must hold up, and the build says how many exercises it can place ----------
if (!args.has('--no-checks') && !errors.length) {
  const PX = require('../src/positions.js');
  for (const m of PX.checkRest()) errors.push(`rest pose ${m}`);
  // each move between positions, both ways, passes the same animation and range-of-motion checks as an exercise
  { const { check } = require('./checks.cjs'), { pastFlexible } = require('./rom.cjs');
    for (const m of PX.MOVES) for (const [a, b] of [[m.a, m.b], [m.b, m.a]]) {
      const via = a === m.a ? m.via : [...m.via].reverse();
      const kfs = [{ name: PX.LABELS[a], ...PX.REST[a] }, ...via, { name: PX.LABELS[b], ...PX.REST[b] }]
        .map((k, i, all) => ({ durationMs: 900, holdMs: 0, camera: 90, ...k, phase: i === 0 ? 'setup' : i === all.length - 1 ? 'finish' : 'rep' }));
      if (kfs.length === 2) kfs.splice(1, 0, { ...kfs[1], name: 'arrive', phase: 'rep', durationMs: 0 });
      const ex = { id: `move ${a} > ${b}`, keyframes: kfs };
      for (const x of check(ex)) errors.push(`move ${a} > ${b}: ${x.msg || x}`);
      for (const x of pastFlexible(ex)) errors.push(`move ${a} > ${b}: "${x.name}" ${x.joint} ${x.value}° is past what a flexible body can do`);
    } }
  const count = {}, unplaced = [];
  for (const ex of exercises) {
    const p = PX.positionsOf(ex);
    for (const k of [p.start, p.end]) count[k || 'other'] = (count[k || 'other'] || 0) + 1;
    if ((!p.start || !p.end) && !PX.onEquipment(ex) && ex.startPosition !== 'other' && ex.endPosition !== 'other') unplaced.push(`${ex.id} (${p.start || '?'} → ${p.end || '?'})`);
  }
  console.log(`positions: ${PX.MOVES.length} moves between them, checked both ways; starts and ends: ${Object.entries(count).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  if (unplaced.length) console.log(`positions: not placed, so a crossfade (add startPosition/endPosition, "other" if none fits): ${unplaced.join(', ')}`);
}
// ---------- 2d. equipment: what's listed is drawn and what's drawn is listed, spelled one way (the Exercises filter) ----------
if (!args.has('--no-checks') && !errors.length) {
  const DRAWN = { roller: /foam roller/, ball: /stability ball|swiss ball|exercise ball/, medball: /medicine ball|med ball/, ring: /pilates ring|magic circle/, bar: /pull-?up bar|chin-?up bar|\bbar\b/, block: /block/, strap: /strap/, towel: /towel/, wall: /wall|door/, chair: /chair/, bench: /bench/, step: /step/, band: /band/, dumbbell: /dumbbell/, barbell: /barbell/, kettlebell: /kettlebell/ };
  const spelled = new Map(), n0 = errors.length;
  for (const ex of exercises) {
    const types = new Set((ex.props || []).map(p => p.type)), eq = ex.equipment || [];
    for (const q of eq) {
      const k = q.toLowerCase();
      if (spelled.has(k) && spelled.get(k) !== q) errors.push(`${ex.id}: equipment "${q}" is spelled "${spelled.get(k)}" elsewhere`);
      spelled.set(k, q);
      const drawn = Object.entries(DRAWN).filter(([, re]) => re.test(k)).map(([t]) => t);
      if (drawn.length && !drawn.some(t => types.has(t))) errors.push(`${ex.id}: lists "${q}" but no ${drawn.join(' or ')} is drawn (optional equipment goes in the setup text, not "equipment")`);
    }
    for (const t of types) if (DRAWN[t] && !eq.some(q => DRAWN[t].test(q.toLowerCase()))) errors.push(`${ex.id}: draws a ${t} that "equipment" doesn't list`);
  }
  const n = errors.length - n0;
  console.log(n ? `equipment: ${n} problem(s)` : 'equipment: every listed item is drawn, every drawn one listed');
}
if (warnings.length) console.warn('\n' + warnings.map(w => '⚠ ' + w).join('\n') + '\n');
if (errors.length) { console.error('\n' + errors.map(e => '✗ ' + e).join('\n')); process.exit(1); }
if (args.has('--check-only')) process.exit(0);

// ---------- 3. bundle ----------
const bundle = { format: 'nstructr/library', version: 2, generated: new Date().toISOString(), exercises, workouts, links: { progressions: links.progressions, equipment: links.equipment } };
fs.writeFileSync(path.join(ROOT, 'library/index.json'), JSON.stringify(bundle));

// ---------- 4. assemble the site ----------
const SITE = path.join(ROOT, '_site');
fs.rmSync(SITE, { recursive: true, force: true });
const copy = (from, to = from) => fs.cpSync(path.join(ROOT, from), path.join(SITE, to), { recursive: true });
copy('src'); copy('library'); copy('schema'); copy('icons'); copy('manifest.webmanifest');
fs.rmSync(path.join(SITE, 'src/sw.js'));
const appFiles = fs.readdirSync(path.join(ROOT, 'src/app')).filter(f => f.endsWith('.js')).sort();
const head = rd('src/head.html'), body = rd('src/body.html');
const scripts = ['src/core.js', 'src/similar.js', 'src/positions.js', 'src/thumb.js', 'src/vendor/qrcode.js', ...appFiles.map(f => `src/app/${f}`)];
// the installable app: manifest, icons, and a service worker that caches everything it needs
const pwaHead = head.replace('</title>', `</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">`);
fs.writeFileSync(path.join(SITE, 'index.html'), pwaHead + body + scripts.map(s => `<script src="${s}"></script>`).join('\n') + '\n</body></html>\n');
const assets = ['index.html', 'manifest.webmanifest', 'library/index.json', ...scripts,
  ...fs.readdirSync(path.join(ROOT, 'icons')).sort().map(f => `icons/${f}`)];
const hash = crypto.createHash('sha256');
for (const a of assets) hash.update(a).update(fs.readFileSync(path.join(SITE, a)));
fs.writeFileSync(path.join(SITE, 'sw.js'), rd('src/sw.js').replace('__VERSION__', hash.digest('hex').slice(0, 12)).replace('__ASSETS__', JSON.stringify(['./', ...assets])));
// single file: everything inline, the library included
const inline = s => rd(s).replace(/<\/script/gi, '<\\/script');
fs.writeFileSync(path.join(SITE, 'nstructr.html'), head + body + '<script>\nwindow.NSTRUCTR_BUNDLE = ' + JSON.stringify(bundle).replace(/<\/script/gi, '<\\/script') + ';\n' +
  scripts.map(inline).join('\n') + '\n</script>\n</body></html>\n');
fs.writeFileSync(path.join(SITE, '.nojekyll'), '');
// the link-preview image (og:image in src/head.html): library figures, drawn with the engine
fs.writeFileSync(path.join(SITE, 'og.png'), require('./og-image.cjs').ogImage(exercises));
console.log(`built _site/ (index.html, nstructr.html ${(fs.statSync(path.join(SITE, 'nstructr.html')).size / 1024).toFixed(0)} KB, library/index.json ${(fs.statSync(path.join(ROOT, 'library/index.json')).size / 1024).toFixed(0)} KB)`);
