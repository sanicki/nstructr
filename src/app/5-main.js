
/* ---------- Adjust tab (pose editor) ---------- */
function updateEditor() {
  const box = $('#editor'); if (!box || !S.ex || !S.resolved.length) return;
  const kf = S.ex.keyframes[S.idx], r = S.resolved[S.idx];
  const locked = S.side === 'R';
  if (box.dataset.built !== S.ex.id) {
    box.dataset.built = S.ex.id;
    box.innerHTML = `<div class="editor-head"><span class="title-small" id="edTitle"></span>
      <div class="segmented" id="viewSeg" role="group" aria-label="Camera view">
        <button class="stateful" data-view="side"><span class="icon">check</span>Side</button>
        <button class="stateful" data-view="front"><span class="icon">check</span>Front</button></div></div>
      <p class="body-small muted" id="edNote" style="margin:0 0 8px"></p>
      ${JOINTS.map(([k, label]) => `<div class="joint"><label for="j-${k}">${label}</label>
        <input type="range" id="j-${k}" data-joint="${k}" min="-360" max="360" step="1"><output id="o-${k}" for="j-${k}"></output></div>`).join('')}
      <div class="row" style="margin-top:12px"><button class="btn tonal stateful" data-act="json"><span class="icon">data_object</span>Show JSON</button></div>`;
  }
  $('#edTitle').textContent = `Step ${S.idx + 1}: ${r.name || ''}`;
  const labels = (S.ex.bilateral && S.ex.bilateral.labels) || {};
  $('#edNote').textContent = locked ? `Switch to ${labels.L || 'the first side'} to edit. The other side is mirrored from it.`
    : 'Edits apply to the step shown and pause playback. Joints marked auto are set for you (feet planted, hands reaching).'
      + (isSaved(S.ex.id) ? '' : ' Save the exercise to keep your changes.');
  document.querySelectorAll('#viewSeg button').forEach(b => { b.setAttribute('aria-pressed', String((kf.view || 'side') === b.dataset.view)); b.disabled = locked; });
  for (const k of JOINT_KEYS) {
    const input = $('#j-' + k), out = $('#o-' + k), auto = r.auto.has(k);
    const val = auto ? r.pose[k] : num(kf.pose && kf.pose[k]);
    if (document.activeElement !== input) input.value = Math.round(locked ? r.pose[k] : val);
    input.disabled = locked || auto;
    out.textContent = auto ? 'auto' : `${Math.round(locked ? r.pose[k] : val)}°`;
  }
}

/* ---------- Actions ---------- */
function selectExercise(id) {
  S.ex = S.lib.items.find(it => it.id === id) || (findInDb(id) ? clone(findInDb(id)) : null);
  if (!S.ex) return false;
  S.seg = { ...DEFAULT_SEGMENTS, ...((S.ex.figure && S.ex.figure.segments) || {}) };
  S.side = 'L'; S.dir = 'A'; S.idx = 0; S.prev = null; S.from = null; S.rep = 1; S.planDone = false; S.tempo = 1; S.onStep = null; S.onPlanEnd = null; S.canAdvance = null; S.speed = +(document.querySelector('#speedSeg [aria-pressed="true"]') || { dataset: { speed: 1 } }).dataset.speed;
  const dirs = S.ex.direction && S.ex.direction.labels;
  $('#dirSeg').hidden = !dirs;
  if (dirs) document.querySelectorAll('#dirSeg button').forEach(b => { b.querySelector('.lbl').textContent = dirs[b.dataset.dir]; b.setAttribute('aria-pressed', String(b.dataset.dir === 'A')); });
  const bil = !!S.ex.bilateral;
  $('#sideSeg').hidden = !bil;
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
  renderPlayerInfo(); selectTab('steps'); draw();
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
  S.dir = dir; S.rep = 1;
  document.querySelectorAll('#dirSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dir === dir)));
  rebuild(); S.idx = S.phase.start; S.prev = null; S.t = S.resolved[S.idx].dur; renderPlayerInfo(); draw();
}
function setSide(side) {
  if (side === S.side) return;
  S.side = side; S.rep = 1;
  document.querySelectorAll('#sideSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.side === side)));
  const keepT = S.t; rebuild(); S.t = Math.min(keepT, S.resolved[S.idx].dur + S.resolved[S.idx].hold - 1);
  renderPlayerInfo(); draw();
}
function toggleSave() {
  if (!S.ex) return;
  if (isSaved(S.ex.id)) removeSaved(S.ex.id);
  else { S.lib.items.push(S.ex); saveLib(); snack(`Saved ${S.ex.name}`); renderPlayerInfo(); }
}
function removeSaved(id) {
  const it = S.lib.items.find(x => x.id === id);
  S.lib.items = S.lib.items.filter(x => x.id !== id);
  saveLib();
  const builtIn = !!findInDb(id);
  snack(builtIn ? `Removed ${it ? it.name : 'exercise'} from Saved` : `Deleted ${it ? it.name : 'exercise'}`);
  if (S.view === 'player' && S.ex && S.ex.id === id) { if (builtIn) renderPlayerInfo(); else go('#/saved'); }
  if (S.view === 'saved') renderSaved();
}
/* Users' own exercises have ids starting "u-", so a library update can never overwrite one (the build rejects
   "u-" ids in library/). An imported exercise keeps its id if it already starts with "u-", if it's an unchanged
   copy of a library exercise (that's just a saved library exercise), or if it updates one of the user's own
   saved exercises. Anything else gets "u-" in front, and workouts in the same file are pointed at the new id. */
const FILE_VERSION = 1;
const canonical = o => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).filter(x => x !== '$schema' && x !== 'version').sort().map(x => [x, v[x]])) : v));
function claimIds(list, workouts) {
  const renamed = {};
  const out = list.map(ex => {
    if (ex.id.startsWith('u-')) return ex;
    const lib = findInDb(ex.id);
    if (lib ? canonical(lib) === canonical(ex) : S.lib.items.some(it => it.id === ex.id)) return ex;
    renamed[ex.id] = 'u-' + ex.id;
    return { ...ex, id: renamed[ex.id] };
  });
  for (const w of workouts || []) for (const b of (w && w.blocks) || []) for (const it of (b && b.items) || []) if (it && renamed[it.ex]) it.ex = renamed[it.ex];
  return out;
}
/* Every file carries "version". Older versions get upgraded here as the formats change; newer ones are refused. */
function upgradeFile(data) {
  const v = data && typeof data === 'object' && data.version;
  if (typeof v === 'number' && v > FILE_VERSION) throw new Error(`it was made by a newer version of ${APP_NAME} (file version ${v}). Update the app and try again.`);
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
    for (const ex of exs) { const i = S.lib.items.findIndex(it => it.id === ex.id); if (i >= 0) S.lib.items[i] = ex; else S.lib.items.push(ex); }
    const ws = importWorkouts(data);
    IMPORTED_WORKOUTS.push(...ws);
    return [];
  }
  const list = claimIds(normalizeImport(data));
  for (const ex of list) {
    const i = S.lib.items.findIndex(it => it.id === ex.id);
    if (i >= 0) S.lib.items[i] = ex; else S.lib.items.push(ex);
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
const TITLES = { workouts: APP_NAME, explore: 'Explore', saved: 'Saved', create: 'Create' };
let lastList = '#/workouts';
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
function route() {
  const h = location.hash || '#/workouts';
  const mPlay = h.match(/^#\/play\/(.+)$/), mEdit = h.match(/^#\/workout\/(.+)$/), mRun = h.match(/^#\/wplay\/(.+)$/);
  let view = mPlay ? 'player' : mEdit ? 'workout' : mRun ? 'wplay' : (h.replace('#/', '') || 'workouts');
  if (!['explore', 'saved', 'create', 'player', 'workouts', 'workout', 'wplay'].includes(view)) view = 'workouts';
  const leavingWorkout = S.view === 'wplay' && view !== 'wplay';
  if (leavingWorkout) {                                        // stop the workout, give the stage back
    S.onStep = null; S.onPlanEnd = null; S.canAdvance = null; S.playing = false; wakeOff(); leaveFullscreen(); moveStage(false); resetScene(); buildFigure();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (WP.phase !== 'done') { writeSession(false); WP.phase = 'idle'; renderWorkouts(); }
    S.ex = null;                                               // the exercise player rebuilds next time
  }
  if (view === 'player') {
    const id = decodeURIComponent(mPlay[1]);
    if (!S.ex || S.ex.id !== id || S.mode !== 'explore') {
      if (!selectExercise(id)) { snack("That exercise isn't in the library."); go('#/explore'); return; }
      setPlaying(!matchMedia('(prefers-reduced-motion: reduce)').matches);
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
  document.body.dataset.view = view;
  document.querySelectorAll('.view').forEach(v => (v.hidden = v.id !== 'view-' + view));
  const navFor = view === 'player' ? lastList.replace('#/', '').split('/')[0] : (view === 'workout' || view === 'wplay') ? 'workouts' : view;
  document.querySelectorAll('.nav-item').forEach(a => { if (a.dataset.nav === navFor) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const sub = view === 'player' || view === 'workout' || view === 'wplay';
  $('#backBtn').hidden = !sub;
  $('#saveBtn').hidden = view !== 'player';
  document.querySelector('.bar-brand').style.display = sub ? 'none' : '';
  $('#barTitle').textContent = view === 'player' ? (S.ex ? S.ex.name : '') : view === 'workout' ? EDIT.name : view === 'wplay' ? WP.w.name : TITLES[view];
  document.title = view === 'player' && S.ex ? `${S.ex.name} · ${APP_NAME}` : APP_NAME;
  if (view === 'explore') renderExplore();
  if (view === 'saved') renderSaved();
  if (view === 'workouts') renderWorkouts();
  if (view === 'create') renderPersistNote();
  if (view === 'workout') renderEditor();
  if (view === 'wplay') { setSound(WK.sound); renderWpInfo(); requestAnimationFrame(syncLimbWidth); }
  if (view === 'player') requestAnimationFrame(syncLimbWidth);
  if (view !== 'wplay') scrollTo(0, 0);
}
addEventListener('hashchange', route);

/* ---------- Wiring ---------- */
$('#playBtn').addEventListener('click', () => setPlaying(!S.playing));
$('#prevBtn').addEventListener('click', () => jumpTo(S.idx - 1));
$('#nextBtn').addEventListener('click', () => jumpTo(S.idx + 1));
$('#sideSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setSide(b.dataset.side); });
$('#dirSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setDir(b.dataset.dir); });
$('#speedSeg').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  S.speed = +b.dataset.speed;
  document.querySelectorAll('#speedSeg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
});
$('#backBtn').addEventListener('click', () => {
  if (S.view === 'wplay') { exitWorkout(); return; }
  if (S.view === 'workout') { go('#/workouts'); return; }
  go(lastList.startsWith('#/workout/') ? lastList : lastList);
});
$('#saveBtn').addEventListener('click', toggleSave);
document.querySelector('.tabs').addEventListener('click', e => { const t = e.target.closest('.tab'); if (t) selectTab(t.dataset.tab); });
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
document.querySelectorAll('.theme-btn').forEach(btn => btn.addEventListener('click', () => {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  document.querySelectorAll('.theme-btn .icon').forEach(i => (i.textContent = dark ? 'dark_mode' : 'light_mode'));
}));
// one click handler for everything inside the app
document.querySelector('.shell').addEventListener('click', e => {
  const t = e.target.closest('button, a'); if (!t) return;
  const d = t.dataset;
  if (d.open) go(`#/play/${encodeURIComponent(d.open)}`);
  else if (d.coll) { E.coll = d.coll; E.type = 'All'; E.equip = 'Any'; renderExplore(); scrollTo(0, 0); }
  else if (d.type) { E.type = d.type; renderExplore(); }
  else if (d.equip) { E.equip = d.equip; renderExplore(); }
  else if (d.step != null) jumpTo(+d.step);
  else if (d.del) removeSaved(d.del);
  else if (d.act === 'clearFilters') { Object.assign(E, { coll: 'All', type: 'All', equip: 'Any', q: '' }); $('#search').value = ''; renderExplore(); }
  else if (d.act === 'import') $('#fileInput').click();
  else if (d.act === 'paste') { $('#pasteArea').value = ''; $('#pasteDialog').showModal(); }
  else if (d.act === 'copyPrompt') copyText(aiPromptText(), 'Prompt copied');
  else if (d.act === 'showPrompt') showJson('Prompt for making an exercise from a video', aiPromptText());
  else if (d.act === 'exportAll') showJson('Your saved exercises', JSON.stringify({ format: 'nstructr/exercise', version: 1, exercises: S.lib.items }, null, 2));
  else if (d.act === 'json') showJson(S.ex.name, JSON.stringify({ format: 'nstructr/exercise', version: 1, exercises: [S.ex] }, null, 2));
  else if (d.view && S.side === 'L') {
    S.ex.keyframes[S.idx].view = d.view; setPlaying(false); rebuild(); jumpTo(S.idx); updateEditor(); saveLib();
  }
});
$('#editor').addEventListener('input', e => {
  const k = e.target.dataset && e.target.dataset.joint; if (!k || S.side !== 'L') return;
  const kf = S.ex.keyframes[S.idx]; kf.pose = kf.pose || {}; kf.pose[k] = +e.target.value;
  setPlaying(false); rebuild(); jumpTo(S.idx);
  $('#o-' + k).textContent = `${e.target.value}°`;
  saveLib();
});
document.addEventListener('keydown', e => {
  if (S.view === 'wplay' && !e.target.closest('input, textarea, dialog') && e.key === ' ') { e.preventDefault(); LAST_DOWN_AT = 0; wpAction('pause'); return; }
  if (S.view !== 'player' || e.target.closest('input, textarea, dialog') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); setPlaying(!S.playing); }
  else if (e.key === 'ArrowRight') jumpTo(S.idx + 1);
  else if (e.key === 'ArrowLeft') jumpTo(S.idx - 1);
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
  if (WK.list === null) { WK.list = []; saveWorkouts(); }     // first run: library workouts are listed on their own
  setPlaying(S.playing);
  route();
  requestAnimationFrame(frame);
}
