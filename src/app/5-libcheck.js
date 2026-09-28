/* ===================== After an import: is it already in the library? =====================
   Create with AI (or any file or link) can bring exercises of its own. What's offered, in one dialog:
   - a new exercise that moves the same as a library one, with the same equipment and measure (src/similar.js): use
     the library's instead (on by default): the imported workouts point at it, and the new copy goes unless
     something else uses it;
   - equipment that doesn't match (the AI's "equipmentInSource" for a workout item, against the library exercise it
     chose: a band squat matched to the plain squat): the library's version with that equipment when there is one
     (a name word in common, else the closest motion), otherwise the user's own copy with that equipment; both on by
     default;
   - a name the library doesn't know (the new exercise's, or the "calledInSource" the AI gives for each workout item):
     suggest it as another name for the library exercise (Submit to library, src/app/5-submit.js). Not for an item
     whose equipment doesn't match: that name belongs to the other version.
   Nothing is asked when there's nothing to say. */
let CHECK = null;                  // { swaps: [{ ex, lib }], gear: [{ at, lib, alt, name, equipment }], names: [{ name, lib }], workouts }
const GEAR_WORDS = new Set(['band', 'banded', 'resistance', 'tube', 'loop', 'mini', 'dumbbell', 'db', 'barbell', 'bb', 'kettlebell', 'kb', 'weight', 'weighted', 'chair', 'bench', 'wall', 'seated', 'standing']);
const printOf = ex => { if (!LIB_PRINTS.has(ex.id)) LIB_PRINTS.set(ex.id, SIMILAR_EX.fingerprint(ex)); return LIB_PRINTS.get(ex.id); };
const kindsOf = list => SIMILAR_EX.equipKinds(list).join('|');
const gearText = list => (list || []).filter(q => SIMILAR_EX.equipKinds([q]).length).join(', ');
/* the library exercise with exactly this equipment that is most like lib (and the source's name for it) */
function gearAlternative(lib, equipment, name) {
  const want = kindsOf(equipment);
  const words = t => SIMILAR_EX.nameKey(t).split(' ').filter(w => w && !GEAR_WORDS.has(w));
  const mine = new Set([...words(lib.name), ...words(name)]);
  let best = null;
  for (const x of POSE_DB.exercises) {
    if (x === lib || kindsOf(x.equipment) !== want) continue;
    const shared = Math.max(...[x.name, ...otherNames(x)].map(t => words(t).filter(w => mine.has(w)).length));
    let motion = Infinity; try { motion = SIMILAR_EX.motionDistance(printOf(lib), printOf(x)); } catch (e) { }
    if (!shared && motion >= 8) continue;
    if (!best || shared > best.shared || (shared === best.shared && motion < best.motion)) best = { x, shared, motion };
  }
  return best && best.x;
}
function importCheck(newExs, called) {
  const swaps = [], gear = [], names = [], seen = new Set();
  const addName = (name, lib) => {
    name = baseName(name); const k = lib.id + ':' + SIMILAR_EX.nameKey(name);
    if (!name || seen.has(k) || POSE_DB.exercises.some(x => hasName(x, name))) return;   // known, or another exercise's name
    seen.add(k); names.push({ name, lib });
  };
  for (const ex of newExs) {
    let dup = null;
    try { dup = SIMILAR_EX.similarTo(ex, POSE_DB.exercises, LIB_PRINTS).find(m => m.verdict === 'duplicate'); } catch (e) { }
    if (!dup) continue;
    const lib = findInDb(dup.id);
    swaps.push({ ex, lib }); addName(ex.name, lib);
  }
  for (const c of called) {
    const lib = findInDb(c.ex);
    if (lib && c.equipment && c.at && kindsOf(c.equipment) !== kindsOf(lib.equipment)) {
      const alt = gearAlternative(lib, c.equipment, c.name);
      gear.push({ at: c.at, lib, alt, name: baseName(c.name), equipment: c.equipment });
      if (alt && c.name) addName(c.name, alt);
      continue;
    }
    const to = lib || (swaps.find(s => s.ex.id === c.ex) || {}).lib;
    if (to && c.name) addName(c.name, to);
  }
  return { swaps, gear, names };
}
function checkImport(newExs, called, workouts) {
  const { swaps, gear, names } = importCheck(newExs, called);
  if (!swaps.length && !gear.length && !names.length) return;
  CHECK = { swaps, gear, names, workouts };
  const box = (attr, i, html) => `<label class="choice body-large"><input type="checkbox" ${attr}="${i}" checked><span>${html}</span></label>`;
  const uses = list => gearText(list) || 'no equipment';
  $('#checkTitle').textContent = swaps.length || gear.length ? 'Check against the library' : 'Other names';
  $('#checkBody').innerHTML =
    (swaps.length ? `<p class="body-medium" style="margin:0">Moves the same as one in the library, with the same equipment:</p>
      <fieldset class="choices"><legend class="vh">Use the library's</legend>${swaps.map((s, i) =>
        box('data-swap', i, `Use <b>${esc(s.lib.name)}</b> instead of your new “${esc(s.ex.name)}”`)).join('')}</fieldset>` : '') +
    (gear.length ? `<p class="body-medium" style="margin:0">Different equipment from the library exercise the AI picked:</p>
      <fieldset class="choices"><legend class="vh">Equipment</legend>${gear.map((g, i) => {
        const what = `${g.name ? `“${esc(g.name)}” uses` : 'The source uses'} ${esc(uses(g.equipment))}; <b>${esc(g.lib.name)}</b> uses ${esc(uses(g.lib.equipment))}`;
        return box('data-gear', i, g.alt ? `Use <b>${esc(g.alt.name)}</b>. ${what}.` : `Make your own copy of <b>${esc(g.lib.name)}</b> with ${esc(uses(g.equipment))}. ${what}.`);
      }).join('')}</fieldset>
      ${gear.some(g => !g.alt) ? '<p class="body-small muted" style="margin:0 0 8px">A copy goes in My exercises. The figure shows the equipment once it\'s added to the poses (Authoring mode).</p>' : ''}` : '') +
    (names.length ? `<span class="field-label">Names the library doesn't know yet</span>${names.map((n, i) =>
        `<div class="check-name body-medium"><span>“${esc(n.name)}” for <b>${esc(n.lib.name)}</b></span><button class="btn text stateful" data-suggest="${i}">Suggest it</button></div>`).join('')}
      <p class="body-small muted" style="margin:4px 0 0">Suggesting opens a GitHub issue (you need a free account). Once accepted, everyone finds the exercise by that name too.</p>` : '');
  $('#checkKeep').hidden = !swaps.length && !gear.length;
  $('#checkDialog').showModal();
}
/* a copy of a library exercise with the source's equipment (and name) */
function gearCopy(lib, equipment, name) {
  const nm = name && !hasName(lib, name) ? name : `${lib.name} with ${gearText(equipment).toLowerCase()}`;
  const slug = nm.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'exercise';
  let id = `u-${slug}`, n = 2; while (exById(id)) id = `u-${slug}-${n++}`;
  const keep = (lib.equipment || []).filter(q => !SIMILAR_EX.equipKinds([q]).length);          // a mat stays
  const copy = { ...clone(lib), id, name: nm, basedOn: lib.id, equipment: [...keep, ...equipment.filter(q => SIMILAR_EX.equipKinds([q]).length)] };
  delete copy.collections;
  S.lib.items.push(copy);
  return copy;
}
/* what's ticked: imported workouts use the library exercise (or the copy); a replaced new one goes if nothing uses it */
function applyChecks() {
  if (!CHECK) return;
  const ticked = (attr, list) => list.filter((x, i) => ($(`#checkBody [${attr}="${i}"]`) || {}).checked);
  const on = ticked('data-swap', CHECK.swaps), gear = ticked('data-gear', CHECK.gear);
  if (!on.length && !gear.length) return;
  for (const { ex, lib } of on) {
    for (const w of CHECK.workouts) for (const b of w.blocks) for (const it of b.items) if (it.ex === ex.id) it.ex = lib.id;
    const used = WK.list.some(w => w.blocks.some(b => b.items.some(it => it.ex === ex.id)));
    if (!used) { S.lib.items = S.lib.items.filter(x => x.id !== ex.id); if (BOOKMARKS && BOOKMARKS.delete(ex.id)) saveBookmarks(); }
  }
  let copies = 0;
  for (const g of gear) {
    const w = CHECK.workouts[g.at[0]], it = w && w.blocks[g.at[1]] && w.blocks[g.at[1]].items[g.at[2]];
    if (!it || it.ex !== g.lib.id) continue;
    const to = g.alt || gearCopy(g.lib, g.equipment, g.name);
    if (!g.alt) copies++;
    it.ex = to.id;
    it.sides = to.bilateral ? (it.sides || 'both') : null;
    it.dir = to.direction ? (it.dir || 'both') : null;
  }
  saveWorkouts(); saveLib();
  const n = on.length + gear.length - copies;
  snack([n ? `Using ${n} library ${n === 1 ? 'exercise' : 'exercises'}` : '', copies ? `${copies} ${copies === 1 ? 'copy' : 'copies'} in My exercises` : ''].filter(Boolean).join(', '));
  // an imported exercise's page shows the library one instead
  const shown = on.find(s => S.ex && S.ex.id === s.ex.id);
  if (shown) go(`#/play/${encodeURIComponent(shown.lib.id)}`); else route();
}
$('#checkDone').addEventListener('click', () => { applyChecks(); $('#checkDialog').close(); });
$('#checkKeep').addEventListener('click', () => $('#checkDialog').close());
$('#checkDialog').addEventListener('close', () => { CHECK = null; });
$('#checkBody').addEventListener('click', async e => {
  const b = e.target.closest('[data-suggest]'); if (!b || !CHECK) return;
  const { name, lib } = CHECK.names[+b.dataset.suggest];
  const { url, paste } = await submissionUrl({ ...clone(lib), id: 'u-name', name, basedOn: lib.id }, { kind: 'name', target: lib.id }, 'From an imported workout.');
  if (paste) await copyText(paste, 'Exercise link copied: paste it into “Exercise link” on GitHub');
  window.open(url, '_blank', 'noopener');
  b.disabled = true; b.textContent = 'Suggested';
});
