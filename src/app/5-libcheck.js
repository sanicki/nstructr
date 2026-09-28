/* ===================== After an import: is it already in the library? =====================
   Create with AI (or any file or link) can bring exercises of its own. Two things are offered, in one dialog:
   - a new exercise that moves the same as a library one, with the same equipment and measure (src/similar.js): use
     the library's instead (on by default): the imported workouts point at it, and the new copy goes unless
     something else uses it;
   - a name the library doesn't know (the new exercise's, or the "calledInSource" the AI gives for each workout item):
     suggest it as another name for the library exercise (Submit to library, src/app/5-submit.js).
   Nothing is asked when there's nothing to say. */
let CHECK = null;                  // { swaps: [{ ex, lib }], names: [{ name, lib }], workouts }
function importCheck(newExs, called) {
  const swaps = [], names = [], seen = new Set();
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
    const lib = findInDb(c.ex) || (swaps.find(s => s.ex.id === c.ex) || {}).lib;
    if (lib) addName(c.name, lib);
  }
  return { swaps, names };
}
function checkImport(newExs, called, workouts) {
  const { swaps, names } = importCheck(newExs, called);
  if (!swaps.length && !names.length) return;
  CHECK = { swaps, names, workouts };
  $('#checkTitle').textContent = swaps.length ? 'Already in the library' : 'Other names';
  $('#checkBody').innerHTML =
    (swaps.length ? `<p class="body-medium" style="margin:0">${swaps.length === 1 ? 'This new exercise moves' : 'These new exercises move'} the same as one in the library, with the same equipment:</p>
      <fieldset class="choices"><legend class="vh">Use the library's</legend>${swaps.map((s, i) =>
        `<label class="choice body-large"><input type="checkbox" data-swap="${i}" checked><span>Use <b>${esc(s.lib.name)}</b> instead of your new “${esc(s.ex.name)}”</span></label>`).join('')}</fieldset>` : '') +
    (names.length ? `<span class="field-label">Names the library doesn't know yet</span>${names.map((n, i) =>
        `<div class="check-name body-medium"><span>“${esc(n.name)}” for <b>${esc(n.lib.name)}</b></span><button class="btn text stateful" data-suggest="${i}">Suggest it</button></div>`).join('')}
      <p class="body-small muted" style="margin:4px 0 0">Suggesting opens a GitHub issue (you need a free account). Once accepted, everyone finds the exercise by that name too.</p>` : '');
  $('#checkKeep').hidden = !swaps.length;
  $('#checkDialog').showModal();
}
/* the checked swaps: imported workouts use the library exercise; the new one goes if nothing else uses it */
function applyChecks() {
  if (!CHECK) return;
  const on = CHECK.swaps.filter((s, i) => ($(`#checkBody [data-swap="${i}"]`) || {}).checked);
  if (!on.length) return;
  for (const { ex, lib } of on) {
    for (const w of CHECK.workouts) for (const b of w.blocks) for (const it of b.items) if (it.ex === ex.id) it.ex = lib.id;
    const used = WK.list.some(w => w.blocks.some(b => b.items.some(it => it.ex === ex.id)));
    if (!used) { S.lib.items = S.lib.items.filter(x => x.id !== ex.id); if (BOOKMARKS && BOOKMARKS.delete(ex.id)) saveBookmarks(); }
  }
  saveWorkouts(); saveLib();
  snack(on.length === 1 ? `Using the library's ${on[0].lib.name}` : `Using ${on.length} library exercises`);
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
