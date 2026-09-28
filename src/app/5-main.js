
/* ---------- Pose editor (Authoring mode) ----------
   Each joint has − and + buttons (hold to repeat) in steps of 1°, 5° or 15°, and an undo that brings it back to
   how it was when editing started. The first change to a library exercise makes the user's own copy,
   "<name> (copy)", saved like an imported exercise; the user's own exercises are changed in place (saved as you
   go). "Discard all changes" undoes everything since editing started (and removes a copy made for it). */
const ED = { step: 5, orig: null };        // orig: { id, ex (as it was), keyframes, madeCopy: original id or null }
function editorOrigin() {
  if (!ED.orig || ED.orig.id !== S.ex.id) ED.orig = { id: S.ex.id, ex: clone(S.ex), keyframes: clone(S.ex.keyframes), madeCopy: null };
  return ED.orig;
}
/* before the first change: a library exercise (or a bookmarked copy of one) becomes the user's own copy */
function ensureOwnCopy() {
  const lib = findInDb(S.ex.id);
  if (!lib) { if (!S.lib.items.includes(S.ex)) { S.lib.items.push(S.ex); } return; }
  const base = 'u-' + S.ex.id.replace(/^u-/, '') + '-copy';
  let id = base, n = 2; while (S.lib.items.some(x => x.id === id) || findInDb(id)) id = `${base}-${n++}`;
  const copy = { ...clone(S.ex), id, name: `${lib.name} (copy)`, basedOn: lib.id };
  delete copy.library;
  S.lib.items.push(copy);
  const origKfs = ED.orig && ED.orig.id === S.ex.id ? ED.orig.keyframes : clone(copy.keyframes);
  S.ex = copy; ED.orig = { id, ex: clone(copy), keyframes: origKfs, madeCopy: lib.id };
  history.replaceState(null, '', `#/play/${encodeURIComponent(id)}`); lastList = lastList || '#/exercises';
  $('#barTitle').textContent = copy.name; document.title = `${copy.name} · ${APP_NAME}`;
  $('#shareExBtn').hidden = false;                                   // it's the user's own now, so it can be shared
  renderPlayerInfo();
  snack(`Editing your copy, "${copy.name}". Changes are saved as you go.`, 5000);
}
/* apply a change to the exercise; nothing happens (and no copy is made) unless it actually changes something */
function editExercise(change) {
  const trial = clone(S.ex); change(trial);
  if (JSON.stringify(trial) === JSON.stringify(S.ex)) return false;
  editorOrigin(); ensureOwnCopy();
  change(S.ex); saveLib();
  return true;
}
/* the editor's rows: the camera, then every joint (ball joints: forward, side, turn; hinges one number) */
const POSE_ROWS = [{
  key: 'camera', label: 'Camera (90 side, 0 front)', auto: () => false, resolved: r => r.cam,
  get: kf => (kf.camera != null ? num(kf.camera) : 90), set: (kf, v) => { kf.camera = v; }
}].concat(JOINTS.flatMap(([j, name, parts]) => parts.map((part, i) => {
  const ball = parts.length === 3, key = ball ? `${j}.${i}` : j;
  return {
    key, label: ball || parts[0] !== 'Bend' ? `${name}: ${part.toLowerCase()}` : name,
    auto: r => r.auto.has(j) || (ball && r.auto.has(`${j}.${COMPONENTS[i]}`)),
    resolved: r => (ball ? r.pose[j][i] : r.pose[j]),
    get: kf => { const v = kf.pose && kf.pose[j]; return ball ? num(Array.isArray(v) ? v[i] : 0) : num(v); },
    set: (kf, v) => {
      kf.pose = kf.pose || {};
      if (ball) { const a = Array.isArray(kf.pose[j]) ? kf.pose[j].slice() : [0, 0, 0]; a[i] = v; if (a.some(Boolean)) kf.pose[j] = a; else delete kf.pose[j]; }
      else if (v) kf.pose[j] = v; else delete kf.pose[j];
    }
  };
})));
function editPose(change) {
  if (S.side !== 'L') return;
  const i = S.idx;
  if (!editExercise(ex => change(ex.keyframes[i]))) return;
  setPlaying(false); rebuild(); jumpTo(i); updateEditor();
}
/* text: the exercise's own fields, and the current step's name and spoken cue */
const lines = v => v.split('\n').map(x => x.trim()).filter(Boolean);
const TEXT_FIELDS = [
  ['name', 'Name', 'input'], ['sanskrit', 'Other names (separate with commas)', 'input'], ['focus', 'Focus', 'input'], ['category', 'Category', 'input'],
  ['equipment', 'Equipment (separate with commas)', 'input', v => v.split(',').map(x => x.trim()).filter(Boolean), v => (v || []).join(', ')],
  ['description', 'Description', 'textarea'],
  ['setup', 'Setup (one per line)', 'textarea', lines, v => (v || []).join('\n')],
  ['cues', 'Form cues (one per line)', 'textarea', lines, v => (v || []).join('\n')],
  ['prescription.reps', 'Suggested reps', 'input'], ['prescription.note', 'Note', 'textarea'],
  ['repName', 'One rep is called (e.g. "circle")', 'input', null, null, ex => ex.measure !== 'time'],
  ['bilateral.labels.L', 'First side is called', 'input', null, null, ex => !!ex.bilateral], ['bilateral.labels.R', 'Second side is called', 'input', null, null, ex => !!ex.bilateral],
  ['direction.labels.A', 'Direction A is called', 'input', null, null, ex => !!ex.direction], ['direction.labels.B', 'Direction B is called', 'input', null, null, ex => !!ex.direction],
  ['source.title', 'Source title', 'input'], ['source.url', 'Source link', 'input'], ['source.note', 'Source note', 'textarea']
];
const getPath = (o, p) => p.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
function setPath(o, p, v) {
  const ks = p.split('.'), last = ks.pop();
  const t = ks.reduce((x, k) => (x[k] = x[k] && typeof x[k] === 'object' ? x[k] : {}), o);
  if (v === '' || v == null || (Array.isArray(v) && !v.length)) delete t[last]; else t[last] = v;
  // drop objects emptied by the edit (e.g. a source with nothing left)
  for (let i = ks.length; i > 0; i--) { const parent = getPath(o, ks.slice(0, i - 1).join('.')) || o, key = ks[i - 1], obj = i > 1 ? parent[key] : o[key]; if (obj && typeof obj === 'object' && !Object.keys(obj).length) delete (i > 1 ? parent : o)[key]; }
}
function renderTextForm() {
  const ex = S.ex, box = $('#textForm'); if (!box || !ex) return;
  box.innerHTML = TEXT_FIELDS.filter(f => !f[5] || f[5](ex)).map(([path, label, kind, , show]) => {
    const v = show ? show(getPath(ex, path)) : (getPath(ex, path) || '');
    const ctl = kind === 'textarea' ? `<textarea data-field="${path}" rows="${/setup|cues/.test(path) ? 4 : 2}">${esc(v)}</textarea>` : `<input data-field="${path}" value="${esc(v)}" autocomplete="off">`;
    return `<label class="field"><span class="field-label">${label}</span>${ctl}</label>`;
  }).join('');
}
$('#view-player').addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.field) {
    const f = TEXT_FIELDS.find(x => x[0] === el.dataset.field), v = f[3] ? f[3](el.value) : el.value.trim();
    if (f[0] === 'name' && !v) { el.value = S.ex.name; return; }                     // an exercise always has a name
    if (!editExercise(ex => setPath(ex, f[0], v))) return;
    renderPlayerInfo(); renderTextForm();
    $('#barTitle').textContent = S.ex.name; document.title = `${S.ex.name} · ${APP_NAME}`;
    return;
  }
  if (el.dataset.sfield) {
    const k = el.dataset.sfield, v = el.value.trim(), i = S.idx;
    if (!editExercise(ex => { const kf = ex.keyframes[i]; if (v) kf[k] = v; else delete kf[k]; })) return;
    rebuild(); S.shownIdx = -1; renderPlayerInfo(); draw();
  }
});
function updateEditor() {
  const box = $('#editor'); if (!box || !S.ex || !S.resolved.length) return;
  const kf = S.ex.keyframes[S.idx], r = S.resolved[S.idx];
  const locked = S.side === 'R';
  const orig = ED.orig && ED.orig.id === S.ex.id ? ED.orig.keyframes[S.idx] : null;
  if (box.dataset.built !== S.ex.id) {
    box.dataset.built = S.ex.id;
    box.innerHTML = `<div class="editor-head"><span class="title-small" id="edTitle"></span>
      <span class="editor-steps"><button class="icon-btn stateful" data-act="edPrev" aria-label="Previous step"><span class="icon">chevron_left</span></button>
        <button class="icon-btn stateful" data-act="edNext" aria-label="Next step"><span class="icon">chevron_right</span></button></span></div>
      <div class="editor-tools authoring-only"><div class="segmented" id="viewSeg" role="group" aria-label="Camera view">
          <button class="stateful" data-view="side"><span class="icon">check</span>Side</button>
          <button class="stateful" data-view="front"><span class="icon">check</span>Front</button></div>
        <div class="segmented" id="edStepSeg" role="group" aria-label="Change by">${[1, 5, 15].map(n => `<button class="stateful" data-edstep="${n}"><span class="icon">check</span>${n}°</button>`).join('')}</div></div>
      <div class="step-text"><label class="field"><span class="field-label">Step name</span><input id="edStepName" data-sfield="name" autocomplete="off"></label>
        <label class="field"><span class="field-label">Spoken cue</span><input id="edStepCue" data-sfield="cue" autocomplete="off"></label></div>
      <p class="body-small muted" id="edNote" style="margin:0 0 8px"></p>
      <div class="joints authoring-only">${POSE_ROWS.map(({ key, label }) => `<div class="joint" data-jrow="${key}"><span class="jl">${label}</span>
        <button class="icon-btn stateful jbtn" data-jdelta="-1" data-joint="${key}" aria-label="${label}: less"><span class="icon">remove</span></button>
        <output id="o-${key.replace('.', '-')}"></output>
        <button class="icon-btn stateful jbtn" data-jdelta="1" data-joint="${key}" aria-label="${label}: more"><span class="icon">add</span></button>
        <button class="icon-btn stateful jundo" data-jundo="${key}" aria-label="${label}: undo" title="Back to how it was"><span class="icon">undo</span></button></div>`).join('')}</div>
      <div class="row" style="margin-top:12px;flex-wrap:wrap"><button class="btn tonal stateful" data-act="edRevertStep"><span class="icon">undo</span>Revert this step</button>
        <button class="btn text stateful danger" data-act="edDiscard"><span class="icon">delete_history</span>Discard all changes</button>
        <button class="btn text stateful authoring-only" data-act="json"><span class="icon">data_object</span>Show JSON</button></div>`;
  }
  $('#edTitle').textContent = `Step ${S.idx + 1}: ${r.name || ''}`;
  if (box.dataset.textFor !== S.ex.id) { box.dataset.textFor = S.ex.id; renderTextForm(); }
  // the step's words as written (for the first side; the other side's left/right are swapped for you)
  if (document.activeElement !== $('#edStepName')) $('#edStepName').value = kf.name || '';
  if (document.activeElement !== $('#edStepCue')) $('#edStepCue').value = kf.cue || '';
  const labels = (S.ex.bilateral && S.ex.bilateral.labels) || {};
  $('#edNote').textContent = (findInDb(S.ex.id) ? 'Your first change makes your own copy of this exercise, "(copy)", and leaves the library one as it is. ' : 'Changes are saved as you go. ')
    + (!authoring() ? 'Step words are written for the first side; the other side swaps left and right for you.'
      : locked ? `Switch to ${labels.L || 'the first side'} to change the pose: the other side is mirrored from it.` : 'Joints marked auto are set for you (feet planted, hands reaching).');
  const cam = kf.camera != null ? kf.camera : 90;
  document.querySelectorAll('#viewSeg button').forEach(b => { b.setAttribute('aria-pressed', String(cam === (b.dataset.view === 'side' ? 90 : 0))); b.disabled = locked; });
  document.querySelectorAll('#edStepSeg button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.edstep === ED.step)));
  const changed = orig && JSON.stringify(orig) !== JSON.stringify(kf);
  $('#editor [data-act="edRevertStep"]').disabled = locked || !changed;
  $('#editor [data-act="edDiscard"]').disabled = !(ED.orig && ED.orig.id === S.ex.id && (ED.orig.madeCopy || JSON.stringify(ED.orig.ex) !== JSON.stringify(S.ex)));
  for (const row of POSE_ROWS) {
    const k = row.key, auto = row.auto(r), val = locked || auto ? row.resolved(r) : row.get(kf);
    $('#o-' + k.replace('.', '-')).textContent = auto ? 'auto' : `${Math.round(val)}°`;
    document.querySelectorAll(`#editor [data-joint="${k}"]`).forEach(b => (b.disabled = locked || auto));
    const u = $(`#editor [data-jundo="${k}"]`);
    u.style.visibility = !locked && orig && row.get(orig) !== row.get(kf) ? 'visible' : 'hidden';
  }
}
/* − / +: one step per tap; hold to keep going */
(() => {
  const box = $('#editor'); let hold = null;
  const nudge = b => editPose(kf => { const row = POSE_ROWS.find(x => x.key === b.dataset.joint); row.set(kf, Math.round(row.get(kf) + +b.dataset.jdelta * ED.step)); });
  const stop = () => { if (hold) { clearTimeout(hold.t); clearInterval(hold.i); } };
  box.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-jdelta]'); if (!b || b.disabled) return;
    stop(); hold = { b, repeated: false };
    hold.t = setTimeout(() => { hold.repeated = true; hold.i = setInterval(() => nudge(b), 110); }, 450);
  });
  addEventListener('pointerup', stop); addEventListener('pointercancel', stop);
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-jdelta]');
    if (b) { if (hold && hold.b === b && hold.repeated) { hold = null; return; } nudge(b); return; }
    const u = e.target.closest('[data-jundo]');
    if (u) { const row = POSE_ROWS.find(x => x.key === u.dataset.jundo), o = ED.orig.keyframes[S.idx]; editPose(kf => row.set(kf, row.get(o))); return; }
    const st = e.target.closest('[data-edstep]'); if (st) { ED.step = +st.dataset.edstep; updateEditor(); }
  });
})();
function revertStep() {
  const o = ED.orig && ED.orig.id === S.ex.id && ED.orig.keyframes[S.idx]; if (!o) return;
  editPose(kf => { for (const k of Object.keys(kf)) delete kf[k]; Object.assign(kf, clone(o)); });
  snack(`Step ${S.idx + 1} is back to how it was`);
}
async function discardEdits() {
  const o = ED.orig; if (!o || o.id !== S.ex.id) return;
  if (!(await ask(o.madeCopy ? `Discard your changes?` : 'Undo every change?', o.madeCopy ? `Your copy, "${S.ex.name}", is deleted and the library exercise is left as it was.` : `"${S.ex.name}" goes back to how it was when you started editing.`, 'Discard', true))) return;
  if (!ED.orig || ED.orig !== o) return;
  if (o.madeCopy) {
    S.lib.items = S.lib.items.filter(x => x.id !== o.id); saveLib(); ED.orig = null; if (BOOKMARKS.delete(o.id)) saveBookmarks();
    history.replaceState(null, '', `#/play/${encodeURIComponent(o.madeCopy)}`); S.ex = null; route();
    snack('Changes discarded'); return;
  }
  for (const k of Object.keys(S.ex)) delete S.ex[k];
  Object.assign(S.ex, clone(o.ex));                                  // the saved object itself, so Saved sees it
  setPlaying(false); rebuild(); jumpTo(S.idx); $('#editor').dataset.textFor = ''; renderPlayerInfo(); saveLib();
  $('#barTitle').textContent = S.ex.name;
  snack('Changes discarded');
}

/* ---------- Actions ---------- */
function selectExercise(id) {
  S.ex = S.lib.items.find(it => it.id === id) || (findInDb(id) ? clone(findInDb(id)) : null);
  if (!S.ex) return false;
  S.seg = { ...DEFAULT_SEGMENTS };
  ED.orig = null;
  S.side = 'L'; S.dir = 'A'; S.idx = 0; S.prev = null; S.from = null; S.rep = 1; S.planDone = false; S.tempo = 1; S.onStep = null; S.onPlanEnd = null; S.canAdvance = null; S.speed = 1;
  const dirs = S.ex.direction && S.ex.direction.labels;
  $('#dirCtl').hidden = !dirs;
  if (dirs) document.querySelectorAll('#dirSeg button').forEach(b => { b.querySelector('.lbl').textContent = dirs[b.dataset.dir]; b.setAttribute('aria-pressed', String(b.dataset.dir === 'A')); });
  const bil = !!S.ex.bilateral;
  $('#sideCtl').hidden = !bil;
  if (bil) {
    const labels = S.ex.bilateral.labels || {};
    document.querySelectorAll('#sideSeg button').forEach(b => {
      b.querySelector('.lbl').textContent = labels[b.dataset.side] || (b.dataset.side === 'L' ? 'Left' : 'Right');
      b.setAttribute('aria-pressed', String(b.dataset.side === 'L'));
    });
  }
  rebuild(); buildFigure(); buildGuide(); requestAnimationFrame(syncLimbWidth);
  S.t = S.resolved.length ? S.resolved[0].dur : 0;
  $('#editor').dataset.built = '';
  closeEditor(); exHush(); renderPlayerInfo(); draw();
  S.canAdvance = () => !XS.speaking;                          // on the first pass, a step waits for its spoken cue
  S.onPlanEnd = () => { setPlaying(false); showExControls(true); };   // Loop off: stop at the end, controls up
  renderExToggles();
  const miss = S.resolved.findIndex(r => r.misses.length);
  if (miss >= 0) {
    const m = S.resolved[miss].misses[0];
    snack(`Step ${miss + 1}: turning ${m.adjust} can't bring ${m.point} to the floor (off by ${Math.round(Math.abs(m.gap))}px). Adjust the other joints in that pose.`, 7000);
  }
  saveLib();
  return true;
}
function setDir(dir) {
  if (dir === S.dir) return;
  S.dir = dir; S.rep = 1; exHush();
  document.querySelectorAll('#dirSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dir === dir)));
  rebuild(); S.idx = S.phase.start; S.prev = null; S.t = S.resolved[S.idx].dur; renderPlayerInfo(); draw();
}
function setSide(side) {
  if (side === S.side) return;
  S.side = side; S.rep = 1; exHush();
  document.querySelectorAll('#sideSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.side === side)));
  const keepT = S.t; rebuild(); S.t = Math.min(keepT, S.resolved[S.idx].dur + S.resolved[S.idx].hold - 1);
  renderPlayerInfo(); draw();
}
/* the bookmark: only ever a flag (your own exercises stay in My exercises either way) */
function toggleSave() {
  if (!S.ex) return;
  const on = !isBookmarked(S.ex.id);
  if (on) BOOKMARKS.add(S.ex.id); else BOOKMARKS.delete(S.ex.id);
  saveBookmarks(); snack(on ? `Bookmarked ${S.ex.name}` : `Removed the bookmark from ${S.ex.name}`); renderPlayerInfo();
}
/* deleting is only for the user's own exercises, and asks first (saying which workouts use it) */
async function removeSaved(id) {
  const it = S.lib.items.find(x => x.id === id); if (!it || findInDb(id)) return;
  const uses = (WK.list || []).filter(w => w.blocks.some(b => b.items.some(i => i.ex === id))).map(w => `"${w.name}"`);
  if (!(await ask(`Delete "${it.name}"?`, `It's your own exercise, so it will be gone from this device (a backup or an exported file can bring it back).${uses.length ? `\n\nIt's used in ${uses.join(', ')}, which will show it as missing.` : ''}`, 'Delete', true))) return;
  S.lib.items = S.lib.items.filter(x => x.id !== id); saveLib();
  if (BOOKMARKS.delete(id)) saveBookmarks();
  snack(`Deleted ${it.name}`);
  if (S.view === 'player' && S.ex && S.ex.id === id) { E.coll = MINE; go('#/exercises'); }
  if (S.view === 'exercises') renderExplore();
}
/* Users' own exercises have ids starting "u-", so a library update can never overwrite one (the build rejects
   "u-" ids in library/). An imported exercise keeps its id if it already starts with "u-", if it's an unchanged
   copy of a library exercise (that's just a saved library exercise), or if it updates one of the user's own
   saved exercises. Anything else gets "u-" in front, and workouts in the same file are pointed at the new id. */
const FILE_VERSION = 2;
const canonical = o => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).filter(x => x !== '$schema' && x !== 'version').sort().map(x => [x, v[x]])) : v));
/* From a shared link the exercise is someone else's: one with the same id as a different exercise of the user's
   own gets a new id instead of replacing it (LINK_IMPORT, set while a link is imported). */
let LINK_IMPORT = false;
function claimIds(list, workouts) {
  const renamed = {};
  const mine = id => S.lib.items.find(it => it.id === id);
  const free = (ex, id) => {                                   // an id that won't overwrite something different
    if (!LINK_IMPORT || !mine(id) || canonical(mine(id)) === canonical({ ...ex, id })) return id;
    let n = 2; while (mine(`${id}-${n}`) || findInDb(`${id}-${n}`)) n++;
    return `${id}-${n}`;
  };
  const out = list.map(ex => {
    const lib = findInDb(ex.id);
    let id = ex.id;
    if (!id.startsWith('u-') && !(lib ? canonical(lib) === canonical(ex) : (!LINK_IMPORT && mine(id)))) id = 'u-' + id;
    if (!findInDb(id)) id = free(ex, id);
    if (id === ex.id) return ex;
    renamed[ex.id] = id;
    return { ...ex, id };
  });
  for (const w of workouts || []) for (const b of (w && w.blocks) || []) for (const it of (b && b.items) || []) if (it && renamed[it.ex]) it.ex = renamed[it.ex];
  return out;
}
/* an imported exercise: an unchanged library one is just bookmarked; the user's own is added (or replaced) */
function keepImported(ex) {
  if (findInDb(ex.id)) { BOOKMARKS.add(ex.id); saveBookmarks(); return; }
  const i = S.lib.items.findIndex(it => it.id === ex.id); if (i >= 0) S.lib.items[i] = ex; else S.lib.items.push(ex);
}
/* Every file carries "version". Older versions get upgraded here as the formats change; newer ones are refused. */
function upgradeFile(data) {
  const v = data && typeof data === 'object' && data.version;
  if (typeof v === 'number' && v > FILE_VERSION) throw new Error(`it was made by a newer version of ${APP_NAME} (file version ${v}). Update the app and try again.`);
  // format 1 (2D poses, before Sep 2026) isn't read any more: its exercises were converted to 3D in the library
  if (typeof v === 'number' && v < FILE_VERSION) throw new Error(`it's in an old format (file version ${v}) that this version of ${APP_NAME} can't read.`);
  return data;
}
function importText(text, label) {
  let data;
  try { data = JSON.parse(text); } catch (e) { throw new Error(`${label ? label + ' is' : "That's"} not valid JSON (${e.message}).`); }
  data = upgradeFile(data);
  if (data && data.format === BACKUP_FORMAT) { RESTORED = restoreBackup(data); return []; }   // Export everything
  if (data && Array.isArray(data.blocks) && !data.workouts) data = { workouts: [data] };   // one workout file
  if (data && Array.isArray(data.workouts)) {                    // a workout file (may bring its own exercises)
    data = { ...data, workouts: JSON.parse(JSON.stringify(data.workouts)) };
    const exs = Array.isArray(data.exercises) && data.exercises.length ? claimIds(normalizeImport({ exercises: data.exercises }), data.workouts) : [];
    for (const ex of exs) keepImported(ex);
    const ws = importWorkouts(data);
    IMPORTED_WORKOUTS.push(...ws);
    return [];
  }
  const list = claimIds(normalizeImport(data));
  for (const ex of list) {
    keepImported(ex);
  }
  return list;
}
let IMPORTED_WORKOUTS = [], RESTORED = null;
function importAndShow(texts) {
  const added = []; IMPORTED_WORKOUTS = []; RESTORED = null;
  try { for (const [text, label] of texts) added.push(...importText(text, label)); }
  catch (e) { snack(`Couldn't import: ${e.message}`, 6000); if (!added.length && !IMPORTED_WORKOUTS.length && !RESTORED) return false; }
  saveLib();
  if (RESTORED) {
    const n = (k, one, many) => `${RESTORED[k]} ${RESTORED[k] === 1 ? one : many}`;
    snack(`Restored ${n('workouts', 'workout', 'workouts')}, ${n('exercises', 'saved exercise', 'saved exercises')} and ${n('sessions', 'history entry', 'history entries')}`, 6000);
    if (location.hash === '#/workouts') route(); else go('#/workouts');
    return true;
  }
  if (IMPORTED_WORKOUTS.length) {
    snack(IMPORTED_WORKOUTS.length === 1 ? `Imported workout: ${IMPORTED_WORKOUTS[0].name}` : `Imported ${IMPORTED_WORKOUTS.length} workouts`);
    go(`#/workout/${IMPORTED_WORKOUTS[0].id}`);
    return true;
  }
  snack(added.length === 1 ? `Imported ${added[0].name}` : `Imported ${added.length} exercises`);
  go(`#/play/${encodeURIComponent(added[0].id)}`);
  return true;
}
async function importFiles(files) {
  const texts = [];
  for (const f of files) texts.push([await f.text(), f.name]);
  if (texts.length) importAndShow(texts);
}
let snackTimer = 0;
function snack(msg, ms = 3500) {
  const el = $('#snackbar'); el.textContent = msg; el.classList.add('show');
  clearTimeout(snackTimer); snackTimer = setTimeout(() => el.classList.remove('show'), ms);
}

/* ---------- Routing ---------- */
const TITLES = { workouts: APP_NAME, exercises: 'Exercises', settings: 'Settings' };
/* older links: Explore and Saved are now the Exercises tab (Saved is a filter there), Create is in Settings */
const OLD_ROUTES = { '#/explore': '#/exercises', '#/saved': '#/exercises', '#/create': '#/settings' };
let lastList = '#/workouts';
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
function route() {
  // a shared workout or exercise: show it (and offer to add it) over whatever page comes up
  const lm = /^#\/link\/(.+)$/.exec(location.hash);
  if (lm) { history.replaceState(null, '', ['exercises', 'settings'].includes(S.view) && document.body.dataset.view ? `#/${S.view}` : '#/workouts'); openSharedLink(lm[1]); }
  if (OLD_ROUTES[location.hash]) { if (location.hash === '#/saved') E.coll = SAVED; history.replaceState(null, '', OLD_ROUTES[location.hash]); }
  const h = location.hash || '#/workouts';
  const mPlay = h.match(/^#\/play\/(.+)$/), mEdit = h.match(/^#\/workout\/(.+)$/), mRun = h.match(/^#\/wplay\/(.+)$/);
  let view = mPlay ? 'player' : mEdit ? 'workout' : mRun ? 'wplay' : (h.replace('#/', '') || 'workouts');
  if (!['exercises', 'settings', 'player', 'workouts', 'workout', 'wplay'].includes(view)) view = 'workouts';
  const leavingWorkout = S.view === 'wplay' && view !== 'wplay', leavingPlayer = S.view === 'player' && view !== 'player';
  if (leavingWorkout) {                                        // stop the workout, give the stage back
    S.onStep = null; S.onPlanEnd = null; S.canAdvance = null; S.playing = false; wakeOff(); leaveFullscreen(); moveStage(false); resetScene(); buildFigure();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (WP.phase !== 'done') { writeSession(false); WP.phase = 'idle'; renderWorkouts(); }
    S.ex = null;                                               // the exercise player rebuilds next time
  }
  if (view === 'player') {
    const id = decodeURIComponent(mPlay[1]);
    if (!S.ex || S.ex.id !== id || S.mode !== 'explore') {
      if (!selectExercise(id)) { snack("That exercise isn't in the library."); go('#/exercises'); return; }
      setPlaying(autoplay());
    }
  } else if (view === 'workout') {
    EDIT = wkById(decodeURIComponent(mEdit[1]));
    if (!EDIT || isLibWorkout(EDIT)) { EDIT = null; go('#/workouts'); return; }
    lastList = h;
  } else if (view === 'wplay') {
    const w = wkById(decodeURIComponent(mRun[1]));
    if (!w || WP.w !== w || WP.phase === 'idle') { go(w && !isLibWorkout(w) ? `#/workout/${w.id}` : '#/workouts'); return; }
    moveStage(true);
  } else lastList = h;
  S.view = view;
  if (view === 'player' && S.playing) exStepSound(S.idx);     // it started playing before the view switched: read the first step now
  document.body.dataset.view = view;
  document.querySelectorAll('.view').forEach(v => (v.hidden = v.id !== 'view-' + view));
  const navFor = view === 'player' ? lastList.replace('#/', '').split('/')[0].replace(/^workout$/, 'workouts') : (view === 'workout' || view === 'wplay') ? 'workouts' : view;
  document.querySelectorAll('.nav-item').forEach(a => { if (a.dataset.nav === navFor) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const sub = view === 'player' || view === 'workout' || view === 'wplay';
  $('#backBtn').hidden = !sub;
  $('#saveBtn').hidden = view !== 'player';
  $('#shareExBtn').hidden = view !== 'player' || !S.ex || !!findInDb(S.ex.id);      // library exercises: everyone has them
  if (view === 'player') { applyAuthoring(); renderExToggles(); }
  $('#editPoseBtn').hidden = view !== 'player';
  if (leavingPlayer) exHush();                             // only the exercise page's own voice: a workout starting now has already begun speaking
  if (view !== 'player' && XC.editing) closeEditor();
  document.querySelector('.bar-brand').style.display = sub ? 'none' : '';
  $('#barTitle').textContent = view === 'player' ? (S.ex ? S.ex.name : '') : view === 'workout' ? EDIT.name : view === 'wplay' ? WP.w.name : TITLES[view];
  document.title = view === 'player' && S.ex ? `${S.ex.name} · ${APP_NAME}` : APP_NAME;
  if (view === 'exercises') renderExplore();
  if (view === 'settings') renderSettings();
  if (view === 'workouts') renderWorkouts();
  if (view === 'workout') renderEditor();
  if (view === 'wplay') { setSound(WK.sound); renderWpInfo(); requestAnimationFrame(syncLimbWidth); }
  if (view === 'player') { requestAnimationFrame(syncLimbWidth); if (S.playing) hideExControls(); else showExControls(true); }
  if (view !== 'wplay') scrollTo(0, 0);
}
addEventListener('hashchange', route);

/* ---------- Wiring ---------- */
$('#playBtn').addEventListener('click', () => setPlaying(!S.playing));      // (the overlay shows these first: see 3-details.js)
$('#prevBtn').addEventListener('click', () => stepBy(-1));
$('#nextBtn').addEventListener('click', () => stepBy(1));
$('#sideSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setSide(b.dataset.side); });
$('#dirSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setDir(b.dataset.dir); });
$('#backBtn').addEventListener('click', () => {
  if (S.view === 'wplay') { exitWorkout(); return; }
  if (S.view === 'workout') { go('#/workouts'); return; }
  go(lastList.startsWith('#/workout/') ? lastList : lastList);
});
$('#saveBtn').addEventListener('click', toggleSave);
$('#search').addEventListener('input', e => { E.q = e.target.value; renderExplore(); });
$('#clearSearch').addEventListener('click', () => { E.q = ''; $('#search').value = ''; renderExplore(); $('#search').focus(); });
$('#fileInput').addEventListener('change', e => { importFiles([...e.target.files]); e.target.value = ''; });
$('#pasteImport').addEventListener('click', () => {
  const text = $('#pasteArea').value.trim();
  if (!text) { snack('Paste some JSON first.'); return; }
  if (importAndShow([[text, '']])) $('#pasteDialog').close();
});
document.querySelectorAll('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
$('#copyJson').addEventListener('click', () => copyText($('#jsonArea').value, 'Copied'));
// one click handler for everything inside the app
document.querySelector('.shell').addEventListener('click', e => {
  const t = e.target.closest('button, a'); if (!t) return;
  const d = t.dataset;
  if (d.open) go(`#/play/${encodeURIComponent(d.open)}`);
  else if (d.coll) { E.coll = d.coll; E.type = 'All'; renderExplore(); scrollTo(0, 0); }
  else if (d.type) { E.type = d.type; renderExplore(); }
  else if (d.equip) { E.equip = d.equip; renderExplore(); }
  else if (d.step != null) jumpTo(+d.step);
  else if (d.del) removeSaved(d.del);
  else if (d.act === 'clearFilters') { Object.assign(E, { coll: 'All', type: 'All', equip: 'Any', q: '' }); $('#search').value = ''; renderExplore(); }
  else if (d.act === 'import') $('#fileInput').click();
  else if (d.act === 'paste') { $('#pasteArea').value = ''; $('#pasteDialog').showModal(); }
  else if (d.act === 'exportAll') showJson('Your exercises', JSON.stringify({ format: 'nstructr/exercise', version: FILE_VERSION, exercises: S.lib.items }, null, 2));
  else if (d.act === 'edPrev' || d.act === 'edNext') { setPlaying(false); jumpTo(S.idx + (d.act === 'edNext' ? 1 : -1)); }
  else if (d.act === 'edRevertStep') revertStep();
  else if (d.act === 'edDone') closeEditor();
  else if (d.act === 'edDiscard') discardEdits();
  else if (d.act === 'json') showJson(S.ex.name, JSON.stringify({ format: 'nstructr/exercise', version: FILE_VERSION, exercises: [S.ex] }, null, 2));
  else if (d.view && S.side === 'L') editPose(kf => { kf.camera = d.view === 'side' ? 90 : 0; });
});
document.addEventListener('keydown', e => {
  if (S.view === 'wplay' && !e.target.closest('input, textarea, dialog') && e.key === ' ') { e.preventDefault(); LAST_DOWN_AT = 0; wpAction('pause'); return; }
  if (S.view === 'wplay' && e.key === 'Escape' && !document.querySelector('dialog[open]')) { exitWorkout(); return; }   // a keyboard can't "hold
  if (S.view !== 'player' || e.target.closest('input, textarea, dialog') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); setPlaying(!S.playing); }
  else if (e.key === 'ArrowRight') stepBy(1);
  else if (e.key === 'ArrowLeft') stepBy(-1);
});
let dragDepth = 0;
addEventListener('dragenter', e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { dragDepth++; $('#drop').classList.add('show'); } });
addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('#drop').classList.remove('show'); });
addEventListener('dragover', e => e.preventDefault());
addEventListener('drop', e => { e.preventDefault(); dragDepth = 0; $('#drop').classList.remove('show'); if (e.dataTransfer?.files?.length) importFiles([...e.dataTransfer.files]); });
addEventListener('scroll', () => $('#appBar').classList.toggle('scrolled', scrollY > 4), { passive: true });

async function boot() {
  let b = window.NSTRUCTR_BUNDLE;
  if (!b) {
    try { const r = await fetch('library/index.json', { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status); b = await r.json(); }
    catch (e) { b = { exercises: [], workouts: [] }; setTimeout(() => snack("Couldn't load the exercise library. Check your connection and reload.", 8000), 300); }
  }
  POSE_DB = { exercises: b.exercises || [] };
  LIBRARY_WORKOUTS = b.workouts || [];
  hydrateLibrary();
  migrateSaved();                                            // bookmarks and My exercises (once; see 2-explore.js)
  if (WK.list === null) { WK.list = []; saveWorkouts(); }     // first run: library workouts are listed on their own
  setPlaying(S.playing);
  route();
  requestAnimationFrame(frame);
}
