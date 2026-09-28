/* NstructR build
   node tools/build.mjs              validate + check + bundle + assemble the site in _site/
   node tools/build.mjs --check-only validate + check only (what pull requests run)
   node tools/build.mjs --no-checks  skip the (slower) animation checks

   1. Every file in library/ is validated against schema/*.schema.json.
   2. Every exercise is played through (both sides, both directions) and checked for floating/sinking poses,
      snapping limbs and planted feet/hands that wander. Accepted deviations live in tools/known-issues.json.
   3. library/index.json bundles the whole library; the app loads it (and caches it for offline use).
   4. _site/ is what GitHub Pages serves: index.html + src/ + library/, the web app manifest, icons and a service
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
for (const w of workouts) w.blocks.forEach((b, bi) => b.items.forEach((it, ii) => {
  if (!ids.has(it.ex)) errors.push(`library/workouts/${w.id}.json: blocks[${bi}].items[${ii}] uses "${it.ex}", which isn't in the library`);
}));
// references inside exercises that the schema can't see
for (const ex of exercises) ex.keyframes.forEach((k, i) => (k.keep || []).forEach(x => {
  if (typeof x === 'object' && x.keyframe >= ex.keyframes.length) errors.push(`${ex.id}: keyframes[${i}].keep points at step ${x.keyframe}, which doesn't exist`);
}));
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
// ---------- 2b. the 3D skeleton (step 1) must still draw today's picture from each step's own view ----------
if (!args.has('--no-checks') && !errors.length) {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/check3d.cjs')], { encoding: 'utf8' });
  console.log(r.stdout.split('\n')[0]);
  if (r.status !== 0) errors.push('3D skeleton: differs from the 2D picture (node tools/check3d.cjs for details)');
}
if (errors.length) { console.error('\n' + errors.map(e => '✗ ' + e).join('\n')); process.exit(1); }
if (args.has('--check-only')) process.exit(0);

// ---------- 3. bundle ----------
const bundle = { format: 'nstructr/library', version: 1, generated: new Date().toISOString(), exercises, workouts };
fs.writeFileSync(path.join(ROOT, 'library/index.json'), JSON.stringify(bundle));

// ---------- 4. assemble the site ----------
const SITE = path.join(ROOT, '_site');
fs.rmSync(SITE, { recursive: true, force: true });
const copy = (from, to = from) => fs.cpSync(path.join(ROOT, from), path.join(SITE, to), { recursive: true });
copy('src'); copy('library'); copy('schema'); copy('icons'); copy('manifest.webmanifest');
fs.rmSync(path.join(SITE, 'src/sw.js'));
const appFiles = fs.readdirSync(path.join(ROOT, 'src/app')).filter(f => f.endsWith('.js')).sort();
const head = rd('src/head.html'), body = rd('src/body.html');
const scripts = ['src/core.js', 'src/thumb.js', 'src/vendor/qrcode.js', ...appFiles.map(f => `src/app/${f}`)];
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
console.log(`built _site/ (index.html, nstructr.html ${(fs.statSync(path.join(SITE, 'nstructr.html')).size / 1024).toFixed(0)} KB, library/index.json ${(fs.statSync(path.join(ROOT, 'library/index.json')).size / 1024).toFixed(0)} KB)`);
