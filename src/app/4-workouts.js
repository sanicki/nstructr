
/* ===================== Workouts ===================== */
const WK_KEY = 'motion-guide-workouts-v1', SESSION_KEY = 'motion-guide-session-v1', SOUND_KEY = 'motion-guide-sound-v1';
const uid = () => Math.random().toString(36).slice(2, 10);
const exById = id => S.lib.items.find(x => x.id === id) || findInDb(id);
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.max(0, Math.round(s)) % 60).padStart(2, '0')}`;
const fmtMin = s => (s < 90 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`);

function newItem(ex) {
  return {
    uid: uid(), ex: ex.id, sets: 1,
    reps: (ex.defaults && ex.defaults.reps) || 10, seconds: (ex.defaults && ex.defaults.seconds) || 30,
    rest: 20, tempo: 1,
    sides: ex.bilateral ? 'both' : null, dir: ex.direction ? 'both' : null
  };
}
/* null = first run: boot() seeds the list from the library's workouts once the library has loaded */
function loadWorkouts() {
  try { const d = JSON.parse(localStorage.getItem(WK_KEY) || 'null'); if (d && Array.isArray(d.list)) return d.list; } catch (e) { }
  return null;
}
/* a library workout file -> the editable form the app stores (block ids, item uids, defaults filled in) */
function hydrateWorkout(fw) {
  return {
    id: fw.id, name: fw.name, restBetween: num(fw.restBetween),
    blocks: fw.blocks.map(b => ({
      id: uid(), name: b.name, rounds: b.rounds || 1, roundRest: b.roundRest != null ? b.roundRest : 30,
      items: b.items.map(it => { const ex = exById(it.ex); return ex ? { ...newItem(ex), rest: 0, ...it, uid: uid() } : null; }).filter(Boolean)
    }))
  };
}
const WK = { list: loadWorkouts(), sound: (() => { try { return localStorage.getItem(SOUND_KEY) || 'beeps'; } catch (e) { return 'beeps'; } })() };
function saveWorkouts() { try { localStorage.setItem(WK_KEY, JSON.stringify({ list: WK.list })); } catch (e) { } }
const wkById = id => (WK.list || []).find(w => w.id === id);

/* ---------- timing ---------- */
const stepMs = k => (k.durationMs || 0) + (k.holdMs == null ? 500 : k.holdMs);
function itemSeconds(item) {
  const ex = exById(item.ex); if (!ex) return 0;
  const kfs = ex.keyframes, ph = phaseInfo(kfs), t = item.tempo || 1;
  const sum = idx => idx.reduce((s, i) => s + stepMs(kfs[i]), 0) / 1000 / t;
  const segs = (item.sides === 'both' ? 2 : 1) * (item.dir === 'both' ? 2 : 1);
  const alt = (item.sides === 'alternate' ? 2 : 1) * (item.dir === 'alternate' ? 2 : 1);
  const work = ex.measure === 'time'
    ? item.seconds + sum(ph.setup) + sum(ph.finish) + (kfs[ex.holdStep || ph.start].durationMs || 0) / 1000 / t
    : sum(ph.setup) + sum(ph.finish) + sum(ph.rep) * item.reps * alt;
  const guide = WK.sound === 'coach' ? sum(ph.setup) + sum(ph.rep) * alt + 2 * (ph.setup.length + ph.rep.length * alt) : 0;   // + ~2 s of speech a step
  return item.sets * segs * (work + guide) + (item.sets - 1) * (item.rest || 0);
}
function blockSeconds(b, w) {
  const r = b.rounds || 1, one = b.items.reduce((s, it) => s + itemSeconds(it), 0) + Math.max(0, b.items.length - 1) * ((w && w.restBetween) || 0);
  return one * r + (r - 1) * (b.roundRest || 0);
}
function workoutSeconds(w) {
  return w.blocks.reduce((s, b) => s + blockSeconds(b, w), 0) + Math.max(0, w.blocks.filter(b => b.items.length).length - 1) * (w.restBetween || 0);
}
/* the workout as the player runs it: every item of every round of every block, in order */
function flattenWorkout(w) {
  const out = [];
  w.blocks.forEach((b, bi) => {
    const rounds = Math.max(1, b.rounds || 1);
    for (let r = 0; r < rounds; r++) b.items.forEach((item, ii) => {
      if (exById(item.ex)) out.push({ item, block: b, bi, round: r, rounds, firstOfRound: ii === 0 && r > 0 });
    });
  });
  return out;
}
const workoutEquipment = w => [...new Set(w.blocks.flatMap(b => b.items).flatMap(it => (exById(it.ex) || {}).equipment || []))].sort();
function itemSummary(item) {
  const ex = exById(item.ex); if (!ex) return 'Missing exercise';
  const parts = [];
  const n = ex.measure === 'time' ? `${item.seconds} s` : `${item.reps} ${ex.repName && ex.repName !== 'rep' ? ex.repName + 's' : 'reps'}`;
  parts.push(item.sets > 1 ? `${item.sets} sets of ${n}` : n);
  const bl = ex.bilateral && ex.bilateral.labels, dl = ex.direction && ex.direction.labels;
  if (item.sides) parts.push(item.sides === 'both' ? (ex.measure === 'time' ? 'each side' : 'per side') : item.sides === 'alternate' ? 'alternating sides' : `${(bl && bl[item.sides]) || item.sides} only`);
  if (item.dir) parts.push(item.dir === 'both' ? 'each direction' : item.dir === 'alternate' ? 'alternating directions' : `${(dl && dl[item.dir]) || item.dir} only`);
  if (item.tempo && item.tempo !== 1) parts.push(`${item.tempo}× speed`);
  return parts.join(', ');
}

/* ---------- list ---------- */
function renderWorkouts() {
  renderHistory();
  $('#wkCount').textContent = `${WK.list.length} ${WK.list.length === 1 ? 'workout' : 'workouts'}`;
  const sess = loadSession(), sw = sess && wkById(sess.wid);
  $('#resumeSlot').innerHTML = sw ? `<div class="resume"><span class="icon">history</span><span class="txt"><span class="title-small" style="display:block">Resume ${esc(sw.name)}</span>
    <span class="body-small">From exercise ${sess.i + 1} of ${sw.blocks.flatMap(b => b.items).length}</span></span>
    <button class="btn filled stateful" data-wact="resume">Resume</button><button class="icon-btn stateful" data-wact="dropSession" aria-label="Discard"><span class="icon">close</span></button></div>` : '';
  $('#wkList').innerHTML = WK.list.map(w => {
    const n = w.blocks.flatMap(b => b.items).length;
    return `<article class="wk-card"><h2 class="title-medium">${esc(w.name)}</h2>
      <div class="wk-meta body-small"><span><span class="icon">schedule</span>About ${fmtMin(workoutSeconds(w))}</span><span><span class="icon">format_list_numbered</span>${n} exercises</span><span><span class="icon">view_agenda</span>${w.blocks.length} ${w.blocks.length === 1 ? 'block' : 'blocks'}</span></div>
      ${workoutEquipment(w).length ? `<div class="wk-meta body-small"><span><span class="icon">handyman</span>${esc(workoutEquipment(w).join(', '))}</span></div>` : ''}
      <div class="row"><button class="btn filled stateful" data-wstart="${esc(w.id)}"><span class="icon fill">play_arrow</span>Start</button>
      <a class="btn text stateful" href="#/workout/${encodeURIComponent(w.id)}" style="text-decoration:none"><span class="icon">edit</span>Edit</a></div></article>`;
  }).join('') || `<div class="empty-state"><span class="icon">fitness_center</span><p class="title-medium">No workouts yet</p></div>`;
}

/* ---------- AI prompt: a written routine -> workout JSON, using this library's exercise ids ---------- */
function routinePrompt() {
  const lines = allExercises().map(ex => {
    const bits = [ex.measure === 'time' ? 'time' : `reps (${ex.repName || 'rep'})`];
    if (ex.bilateral) bits.push('sides: L/R/both/alternate');
    if (ex.direction) bits.push(`dir: A=${ex.direction.labels.A}/B=${ex.direction.labels.B}`);
    return `${ex.id} | ${ex.name} | ${bits.join(', ')}`;
  }).join('\n');
  return `Convert the workout routine below into a workout file for my exercise animator.

Output ONLY valid JSON (no markdown fences, no commentary), in this shape:
{"format":"nstructr/workout","version":1,"workouts":[{"name":"...","restBetween":10,"blocks":[
  {"name":"Warm-up","rounds":1,"roundRest":30,"items":[
    {"ex":"<exercise id>","sets":1,"reps":10,"rest":20,"sides":"both","dir":"both","tempo":1},
    {"ex":"<exercise id>","seconds":30,"sides":"both"}]}]}]}

RULES
- "ex" must be an id from the EXERCISES list below. Pick the closest match by movement, not just by name.
- Rep-based exercises get "reps"; time-based ones get "seconds". Use the routine's numbers; for a range, use the lower end.
- "sides" (only for exercises marked sides): "L", "R", "both" (one side then the other) or "alternate". Reps count per side.
- "dir" (only for exercises marked dir): "A", "B", "both" or "alternate".
- "sets" and "rest" (seconds between sets) default to 1 and 20. "tempo" is a speed multiplier (1 = normal).
- Keep the routine's sections as blocks, in order. For a circuit ("repeat 3 times"), set the block's "rounds" and "roundRest".
- "restBetween" is the rest in seconds between exercises (0 for a straight-through routine).
- If an exercise in the routine has no reasonable match, leave it out and list it at the end of the workout name in brackets, e.g. "My Routine [missing: Turkish get-up]".

EXERCISES (id | name | measured by, options)
${lines}

ROUTINE
[PASTE THE ROUTINE HERE]`;
}

/* ---------- editor ---------- */
let EDIT = null;
function renderEditor() {
  const w = EDIT; if (!w) return;
  if (document.activeElement !== $('#wkName')) $('#wkName').value = w.name;
  const eq = workoutEquipment(w);
  $('#wkSummary').innerHTML = `<span class="chip"><span class="icon">schedule</span>About ${fmtMin(workoutSeconds(w))}</span>
    <span class="chip"><span class="icon">format_list_numbered</span>${w.blocks.flatMap(b => b.items).length} exercises</span>
    <label class="chip" style="gap:6px"><span class="icon">timer</span>Rest between exercises
      <select id="wkRestBetween" aria-label="Rest between exercises" style="font:inherit;background:transparent;color:inherit;border:0">${[0, 5, 10, 15, 20, 30, 45, 60, 90].map(s => `<option value="${s}"${s === (w.restBetween || 0) ? ' selected' : ''}>${s} s</option>`).join('')}</select></label>
    ${eq.map(q => `<span class="chip"><span class="icon">handyman</span>${esc(q)}</span>`).join('')}`;
  $('#wkBlocks').innerHTML = w.blocks.map((b, bi) => `<section class="block" data-block="${b.id}">
    <div class="block-head"><input value="${esc(b.name)}" data-bname="${b.id}" aria-label="Block name"><span class="count">${(b.rounds || 1) > 1 ? `<span class="icon" style="font-size:16px;vertical-align:-3px">repeat</span> ${b.rounds} rounds, ` : ''}${b.items.length} exercises, ${fmtMin(blockSeconds(b, w))}</span>
      <button class="icon-btn stateful" data-bmenu="${b.id}" aria-label="Block options"><span class="icon">more_vert</span></button></div>
    <ul class="items" data-items="${b.id}">${b.items.map(it => {
      const ex = exById(it.ex);
      return `<li class="wi" data-uid="${it.uid}"><span class="handle" data-handle aria-hidden="true"><span class="icon">drag_indicator</span></span>
        <button class="open stateful" data-iedit="${it.uid}">${ex ? thumbFor(ex) : ''}<span class="txt"><span class="title-small">${esc(ex ? ex.name : it.ex)}</span><span class="body-small muted">${esc(itemSummary(it))}</span></span></button>
        <button class="icon-btn stateful" data-imenu="${it.uid}" aria-label="Options for ${esc(ex ? ex.name : '')}"><span class="icon">more_vert</span></button></li>`;
    }).join('')}</ul>
    <div class="add-row"><button class="btn text stateful" data-addto="${b.id}"><span class="icon">add</span>Add exercises</button></div></section>`).join('');
}
function findItem(uid_) {
  for (const b of EDIT.blocks) { const i = b.items.findIndex(x => x.uid === uid_); if (i >= 0) return { b, i, item: b.items[i] }; }
  return null;
}
function commitEdit() { saveWorkouts(); renderEditor(); }
function openMenu(anchor, entries) {
  const m = $('#menu');
  m.innerHTML = entries.map(([act, icon, label, cls]) => `<button class="stateful ${cls || ''}" data-mact="${act}" role="menuitem"><span class="icon">${icon}</span>${label}</button>`).join('');
  m.hidden = false;
  const r = anchor.getBoundingClientRect(), mw = 200, mh = entries.length * 48 + 16;
  m.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw)) + 'px';
  m.style.top = (r.bottom + mh > innerHeight - 8 ? Math.max(8, r.top - mh) : r.bottom) + 'px';
  m.querySelector('button').focus();
  return new Promise(res => { MENU_RESOLVE = res; });
}
let MENU_RESOLVE = null;
function closeMenu(val) { $('#menu').hidden = true; if (MENU_RESOLVE) { const r = MENU_RESOLVE; MENU_RESOLVE = null; r(val); } }
$('#menu').addEventListener('click', e => { const b = e.target.closest('[data-mact]'); if (b) closeMenu(b.dataset.mact); });
addEventListener('pointerdown', e => { if (!$('#menu').hidden && !e.target.closest('#menu')) closeMenu(null); }, true);
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#menu').hidden) closeMenu(null); });

async function itemMenu(btn, uid_) {
  const f = findItem(uid_); if (!f) return;
  const act = await openMenu(btn, [['settings', 'tune', 'Settings'], ['up', 'arrow_upward', 'Move up'], ['down', 'arrow_downward', 'Move down'], ['dup', 'content_copy', 'Duplicate'], ['view', 'visibility', 'View exercise'], ['del', 'delete', 'Remove', 'danger']]);
  const { b, i, item } = f, bi = EDIT.blocks.indexOf(b);
  if (act === 'settings') openItemSettings(uid_);
  if (act === 'up') { if (i > 0) b.items.splice(i - 1, 0, b.items.splice(i, 1)[0]); else if (bi > 0) EDIT.blocks[bi - 1].items.push(b.items.splice(i, 1)[0]); }
  if (act === 'down') { if (i < b.items.length - 1) b.items.splice(i + 1, 0, b.items.splice(i, 1)[0]); else if (bi < EDIT.blocks.length - 1) EDIT.blocks[bi + 1].items.unshift(b.items.splice(i, 1)[0]); }
  if (act === 'dup') b.items.splice(i + 1, 0, { ...item, uid: uid() });
  if (act === 'del') { b.items.splice(i, 1); snack('Removed from the workout'); }
  if (act === 'view') { go(`#/play/${encodeURIComponent(item.ex)}`); return; }
  if (act) commitEdit();
}
async function blockMenu(btn, id) {
  const bi = EDIT.blocks.findIndex(b => b.id === id); if (bi < 0) return;
  const act = await openMenu(btn, [['add', 'add', 'Add exercises'], ['rounds', 'repeat', 'Repeat block (circuit)'], ['up', 'arrow_upward', 'Move block up'], ['down', 'arrow_downward', 'Move block down'], ['del', 'delete', 'Delete block', 'danger']]);
  if (act === 'add') openPicker(id);
  if (act === 'rounds') { openBlockSettings(id); return; }
  if (act === 'up' && bi > 0) EDIT.blocks.splice(bi - 1, 0, EDIT.blocks.splice(bi, 1)[0]);
  if (act === 'down' && bi < EDIT.blocks.length - 1) EDIT.blocks.splice(bi + 1, 0, EDIT.blocks.splice(bi, 1)[0]);
  if (act === 'del') {
    if (EDIT.blocks[bi].items.length && !confirm(`Delete "${EDIT.blocks[bi].name}" and its ${EDIT.blocks[bi].items.length} exercises?`)) return;
    EDIT.blocks.splice(bi, 1);
  }
  if (act) commitEdit();
}

/* drag to reorder (touch, pen or mouse), across blocks */
let DRAG = null;
$('#wkBlocks').addEventListener('pointerdown', e => {
  const h = e.target.closest('[data-handle]'); if (!h) return;
  const li = h.closest('.wi'); e.preventDefault();
  li.setPointerCapture(e.pointerId);
  DRAG = { li, id: e.pointerId, y0: e.clientY };
  li.classList.add('dragging');
});
$('#wkBlocks').addEventListener('pointermove', e => {
  if (!DRAG || e.pointerId !== DRAG.id) return;
  const { li } = DRAG;
  const lists = [...document.querySelectorAll('#wkBlocks .items')];
  let target = null, before = null;
  for (const ul of lists) {
    const r = ul.getBoundingClientRect();
    if (e.clientY < r.top - 24 || e.clientY > r.bottom + 24) continue;
    target = ul;
    before = [...ul.children].find(c => c !== li && e.clientY < c.getBoundingClientRect().top + c.offsetHeight / 2) || null;
    break;
  }
  if (target && (li.parentElement !== target || li.nextElementSibling !== before)) target.insertBefore(li, before);
});
function endDrag(e) {
  if (!DRAG || (e && e.pointerId !== DRAG.id)) return;
  DRAG.li.classList.remove('dragging'); DRAG = null;
  // rebuild the order from the page
  const all = new Map(EDIT.blocks.flatMap(b => b.items).map(it => [it.uid, it]));
  for (const ul of document.querySelectorAll('#wkBlocks .items')) {
    const b = EDIT.blocks.find(x => x.id === ul.dataset.items);
    b.items = [...ul.children].map(li => all.get(li.dataset.uid)).filter(Boolean);
  }
  commitEdit();
}
$('#wkBlocks').addEventListener('pointerup', endDrag);
$('#wkBlocks').addEventListener('pointercancel', endDrag);

/* item settings */
let ITEM_EDIT = null;
function openItemSettings(uid_) {
  const f = findItem(uid_); if (!f) return;
  const it = f.item, ex = exById(it.ex); if (!ex) return;
  ITEM_EDIT = { ...it }; $('#itemDialog').dataset.mode = '';
  $('#itemTitle').textContent = ex.name;
  const stepper = (key, label, min, max, step, unit) => `<div class="form-row"><span class="lbl">${label}</span><div class="stepper">
    <button class="icon-btn stateful" data-step-key="${key}" data-delta="${-step}" data-min="${min}" data-max="${max}" aria-label="Less"><span class="icon">remove</span></button>
    <output id="st-${key}">${ITEM_EDIT[key]}${unit}</output>
    <button class="icon-btn stateful" data-step-key="${key}" data-delta="${step}" data-min="${min}" data-max="${max}" aria-label="More"><span class="icon">add</span></button></div></div>`;
  const seg = (key, label, opts) => `<div class="form-row"><span class="lbl">${label}</span><div class="segmented" role="group" aria-label="${label}">${opts.map(([v, l]) =>
    `<button class="stateful" data-seg-key="${key}" data-val="${v}" aria-pressed="${String(ITEM_EDIT[key]) === String(v)}"><span class="icon">check</span>${esc(l)}</button>`).join('')}</div></div>`;
  const bl = ex.bilateral && ex.bilateral.labels, dl = ex.direction && ex.direction.labels;
  $('#itemForm').innerHTML =
    (ex.measure === 'time' ? stepper('seconds', 'Hold for', 5, 600, 5, ' s') : stepper('reps', ex.repName && ex.repName !== 'rep' ? `${cap(ex.repName)}s` : 'Reps', 1, 200, 1, '')) +
    stepper('sets', 'Sets', 1, 10, 1, '') + stepper('rest', 'Rest between sets', 0, 300, 5, ' s') +
    (bl ? seg('sides', 'Sides', [['L', bl.L || 'Left'], ['R', bl.R || 'Right'], ['both', 'Both'], ['alternate', 'Alternate']]) : '') +
    (dl ? seg('dir', 'Direction', [['A', dl.A], ['B', dl.B], ['both', 'Both'], ['alternate', 'Alternate']]) : '') +
    seg('tempo', 'Speed', [[0.5, '0.5×'], [0.75, '0.75×'], [1, '1×'], [1.25, '1.25×'], [1.5, '1.5×']]) +
    `<p class="body-small muted" style="margin:0">${ex.measure === 'time' ? '' : (bl || dl) && (ITEM_EDIT.sides === 'both' || ITEM_EDIT.dir === 'both' || ITEM_EDIT.sides === 'alternate' || ITEM_EDIT.dir === 'alternate') ? 'Reps count for each side or direction. ' : ''}Estimated time: <span id="itemEst">${fmtMin(itemSeconds(ITEM_EDIT))}</span></p>`;
  $('#itemDialog').showModal();
}
$('#itemForm').addEventListener('click', e => {
  const s = e.target.closest('[data-step-key]');
  if (s) {
    const k = s.dataset.stepKey, v = Math.min(+s.dataset.max, Math.max(+s.dataset.min, (+ITEM_EDIT[k] || 0) + +s.dataset.delta));
    ITEM_EDIT[k] = v; $('#st-' + k).textContent = v + (k === 'seconds' || k === 'rest' ? ' s' : '');
  }
  const g = e.target.closest('[data-seg-key]');
  if (g) {
    const k = g.dataset.segKey; ITEM_EDIT[k] = k === 'tempo' ? +g.dataset.val : g.dataset.val;
    g.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === g)));
  }
  if (s || g) $('#itemEst').textContent = fmtMin(itemSeconds(ITEM_EDIT));
});
$('#itemSave').addEventListener('click', () => {
  if ($('#itemDialog').dataset.mode === 'block') {
    const b = EDIT.blocks.find(x => x.id === BLOCK_EDIT.id); if (b) { b.rounds = BLOCK_EDIT.rounds; b.roundRest = BLOCK_EDIT.roundRest; }
    $('#itemDialog').dataset.mode = ''; $('#itemDialog').close(); commitEdit(); return;
  }
  const f = findItem(ITEM_EDIT.uid); if (f) Object.assign(f.item, ITEM_EDIT);
  $('#itemDialog').close(); commitEdit();
});

/* block settings: how many rounds, and the rest between rounds */
let BLOCK_EDIT = null;
function openBlockSettings(id) {
  const b = EDIT.blocks.find(x => x.id === id); if (!b) return;
  BLOCK_EDIT = { id, rounds: b.rounds || 1, roundRest: b.roundRest != null ? b.roundRest : 30 };
  $('#itemTitle').textContent = `Repeat "${b.name}"`;
  const stepper = (key, label, min, max, step, unit) => `<div class="form-row"><span class="lbl">${label}</span><div class="stepper">
    <button class="icon-btn stateful" data-bstep="${key}" data-delta="${-step}" data-min="${min}" data-max="${max}" aria-label="Less"><span class="icon">remove</span></button>
    <output id="bst-${key}">${BLOCK_EDIT[key]}${unit}</output>
    <button class="icon-btn stateful" data-bstep="${key}" data-delta="${step}" data-min="${min}" data-max="${max}" aria-label="More"><span class="icon">add</span></button></div></div>`;
  $('#itemForm').innerHTML = stepper('rounds', 'Rounds', 1, 10, 1, '') + stepper('roundRest', 'Rest between rounds', 0, 300, 5, ' s') +
    `<p class="body-small muted" style="margin:0">Runs every exercise in the block, then starts again from the top: a circuit.</p>`;
  $('#itemDialog').dataset.mode = 'block';
  $('#itemDialog').showModal();
}
$('#itemForm').addEventListener('click', e => {
  const s = e.target.closest('[data-bstep]'); if (!s || !BLOCK_EDIT) return;
  const k = s.dataset.bstep, v = Math.min(+s.dataset.max, Math.max(+s.dataset.min, BLOCK_EDIT[k] + +s.dataset.delta));
  BLOCK_EDIT[k] = v; $('#bst-' + k).textContent = v + (k === 'roundRest' ? ' s' : '');
});

/* exercise picker */
let PICK = { block: null, chosen: new Set() };
function allExercises() {
  const seen = new Set(), out = [];
  for (const ex of [...S.lib.items, ...POSE_DB.exercises]) if (!seen.has(ex.id)) { seen.add(ex.id); out.push(ex); }
  return out;
}
function renderPicker() {
  const q = $('#pickSearch').value.trim().toLowerCase();
  const list = allExercises().filter(ex => !q || [ex.name, ex.sanskrit, ex.focus, ex.category, ex.library, ...(ex.equipment || [])].some(s => String(s || '').toLowerCase().includes(q)));
  $('#pickList').innerHTML = list.slice(0, 200).map(ex => `<li><label><input type="checkbox" data-pick="${esc(ex.id)}"${PICK.chosen.has(ex.id) ? ' checked' : ''}>
    ${thumbFor(ex)}<span class="txt"><span class="title-small">${esc(ex.name)}</span><span class="body-small muted">${esc(ex.library || typeOf(ex))}</span></span></label></li>`).join('');
  $('#pickAdd').textContent = PICK.chosen.size ? `Add ${PICK.chosen.size}` : 'Add';
  $('#pickAdd').disabled = !PICK.chosen.size;
}
function openPicker(blockId) { PICK = { block: blockId, chosen: new Set() }; $('#pickSearch').value = ''; renderPicker(); $('#pickDialog').showModal(); }
$('#pickSearch').addEventListener('input', renderPicker);
$('#pickList').addEventListener('change', e => { const c = e.target.closest('[data-pick]'); if (!c) return; c.checked ? PICK.chosen.add(c.dataset.pick) : PICK.chosen.delete(c.dataset.pick); $('#pickAdd').textContent = PICK.chosen.size ? `Add ${PICK.chosen.size}` : 'Add'; $('#pickAdd').disabled = !PICK.chosen.size; });
$('#pickAdd').addEventListener('click', () => {
  const b = EDIT.blocks.find(x => x.id === PICK.block) || EDIT.blocks[EDIT.blocks.length - 1];
  for (const id of PICK.chosen) { const ex = exById(id); if (ex) b.items.push(newItem(ex)); }
  $('#pickDialog').close(); commitEdit(); snack(`Added ${PICK.chosen.size} ${PICK.chosen.size === 1 ? 'exercise' : 'exercises'}`);
});

/* export / import */
function workoutJSON(w) {
  const custom = [...new Set(w.blocks.flatMap(b => b.items).map(i => i.ex))].filter(id => !findInDb(id)).map(exById).filter(Boolean);
  return JSON.stringify({ format: 'nstructr/workout', version: 1, workouts: [w], ...(custom.length ? { exercises: custom } : {}) }, null, 2);
}
function importWorkouts(data) {
  if (!data || !Array.isArray(data.workouts)) return [];
  const out = [];
  data.workouts.forEach((w, i) => {
    if (!w || typeof w.name !== 'string' || !Array.isArray(w.blocks)) throw new Error(`workouts[${i}] needs a "name" and "blocks".`);
    const clean = {
      id: (w.id && !wkById(w.id)) ? String(w.id) : uid(), name: w.name, restBetween: num(w.restBetween),
      blocks: w.blocks.map((b, bi) => ({
        id: uid(), name: String(b.name || `Block ${bi + 1}`), rounds: Math.max(1, Math.min(10, num(b.rounds) || 1)), roundRest: b.roundRest != null ? num(b.roundRest) : 30,
        items: (b.items || []).map((it, ii) => {
          const ex = exById(it.ex);
          if (!ex) throw new Error(`workouts[${i}].blocks[${bi}].items[${ii}]: no exercise called "${it.ex}" in the library or this file.`);
          return { ...newItem(ex), ...it, uid: uid() };
        })
      }))
    };
    WK.list.push(clean); out.push(clean);
  });
  saveWorkouts();
  return out;
}

/* share a workout as a .json file (the phone's share sheet), or copy it where sharing files isn't supported */
async function shareWorkout(w) {
  const text = workoutJSON(w), name = (w.name || 'workout').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() + '.json';
  try {
    const file = new File([text], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: w.name, text: `${w.name}: a workout for NstructR` }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    snack(`Saved ${name}`);
  } catch (e) { showJson(w.name, text); }
}

/* ===================== Workout player ===================== */
const WP = { w: null, flat: [], i: 0, set: 0, seg: 0, phase: 'idle', restLeft: 0, restNext: null, started: 0, beeped: {} };
function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; } }
function saveSession() { try { localStorage.setItem(SESSION_KEY, JSON.stringify({ wid: WP.w.id, i: WP.i })); } catch (e) { } }
function dropSession() { try { localStorage.removeItem(SESSION_KEY); } catch (e) { } }

/* sound: beeps (Web Audio) and speech (the browser's built-in voice) */
let AC = null;
function unlockAudio() {
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); AC.resume(); } catch (e) { }
  try { if ('speechSynthesis' in window) speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch (e) { }
}
function beep(freq = 880, ms = 120) {
  if (WK.sound === 'off' || !AC) return;
  try {
    const o = AC.createOscillator(), g = AC.createGain();
    o.frequency.value = freq; o.connect(g); g.connect(AC.destination);
    g.gain.setValueAtTime(0.0001, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.25, AC.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + ms / 1000);
    o.start(); o.stop(AC.currentTime + ms / 1000 + 0.02);
  } catch (e) { }
}
/* Speak a line. Lines queue up instead of cutting each other off. Returns a promise that resolves when the
   line has been spoken (or straight away if sound is off), so the guided run-through can wait for it.
   dropIfBusy: skip this line if something is still being said (rep counts, milestones). */
function say(text, coachOnly = false, { dropIfBusy = false } = {}) {
  if (text && !(coachOnly && WK.sound !== 'coach')) caption(text);
  const on = (WK.sound === 'voice' || WK.sound === 'coach') && !(coachOnly && WK.sound !== 'coach') && 'speechSynthesis' in window;
  if (!on || !text) return Promise.resolve();
  try {
    if (dropIfBusy && (speechSynthesis.speaking || speechSynthesis.pending)) return Promise.resolve();
    return new Promise(res => {
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      const u = new SpeechSynthesisUtterance(text); u.rate = 1;
      u.onend = fin; u.onerror = fin;
      setTimeout(fin, 1500 + text.split(/\s+/).length * 450);      // never wait forever on a voice that doesn't report back
      speechSynthesis.speak(u);
    });
  } catch (e) { return Promise.resolve(); }
}
let CAP_T = 0;
function caption(text) {
  const el = $('#wpCaption'); if (!el) return;
  el.innerHTML = `<span>${esc(text)}</span>`; el.classList.add('show');
  clearTimeout(CAP_T); CAP_T = setTimeout(() => el.classList.remove('show'), 1800 + text.split(/\s+/).length * 380);
}
function hush() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { } WP.speaking = false; }
const SOUND_MODES = [['off', 'volume_off', 'Silent'], ['beeps', 'notifications', 'Beeps'], ['voice', 'record_voice_over', 'Voice'], ['coach', 'sports', 'Coach']];
function setSound(mode) {
  WK.sound = mode; try { localStorage.setItem(SOUND_KEY, mode); } catch (e) { }
  const m = SOUND_MODES.find(x => x[0] === mode) || SOUND_MODES[1];
  if ($('#wpSound')) { $('#wpSound .icon').textContent = m[1]; $('#wpSoundLabel').textContent = m[2]; $('#wpSound').setAttribute('aria-label', `Sound: ${m[2]}. Tap to change.`); }
  if (mode === 'off' && 'speechSynthesis' in window) speechSynthesis.cancel();
}

/* keep the screen on while working out */
let WAKE = null;
async function wakeOn() { try { if ('wakeLock' in navigator && !WAKE) { WAKE = await navigator.wakeLock.request('screen'); WAKE.addEventListener('release', () => { WAKE = null; }); } } catch (e) { } }
function wakeOff() { try { if (WAKE) WAKE.release(); } catch (e) { } WAKE = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.view === 'wplay' && WP.phase !== 'done') wakeOn(); });

/* The steps of one set of one item: setup, then the reps (or the hold), then finish. "segs" splits a set into
   parts when both sides or both directions are done one after the other. */
function itemSegments(item) {
  const sides = item.sides === 'both' ? ['L', 'R'] : [item.sides && item.sides !== 'alternate' ? item.sides : 'L'];
  const dirs = item.dir === 'both' ? ['A', 'B'] : [item.dir && item.dir !== 'alternate' ? item.dir : 'A'];
  const out = [];
  for (const s of sides) for (const d of dirs) out.push({ side: s, dir: d });
  return out;
}
function resolveVersion(ex, seg, side, dir) {
  const props = side === 'R' ? mirrorProps(ex.props) : (ex.props || []);
  const R = resolveSequence(versionOf(ex, side, dir), seg, ex, props);
  return { R, props };
}
function segLabel(ex, item, segInfo) {
  const bl = ex.bilateral && ex.bilateral.labels, dl = ex.direction && ex.direction.labels, bits = [];
  if (item.sides === 'alternate') bits.push('alternating sides'); else if (item.sides && bl) bits.push(bl[segInfo.side]);
  if (item.dir === 'alternate') bits.push('alternating directions'); else if (item.dir && dl) bits.push(dl[segInfo.dir]);
  return bits.join(', ').toLowerCase();
}
function buildPlan(item, segInfo) {
  const ex = exById(item.ex), seg = { ...DEFAULT_SEGMENTS, ...((ex.figure && ex.figure.segments) || {}) };
  const ph = phaseInfo(ex.keyframes), tempo = item.tempo || 1;
  const altSide = item.sides === 'alternate', altDir = item.dir === 'alternate';
  const versions = [];
  if (altSide) versions.push(resolveVersion(ex, seg, 'L', segInfo.dir), resolveVersion(ex, seg, 'R', segInfo.dir));
  else if (altDir) versions.push(resolveVersion(ex, seg, segInfo.side, 'A'), resolveVersion(ex, seg, segInfo.side, 'B'));
  else versions.push(resolveVersion(ex, seg, segInfo.side, segInfo.dir));
  const plan = [], meta = [];
  const push = (r, m = {}) => { plan.push(r); meta.push(m); };
  const V0 = versions[0].R, guided = WK.sound === 'coach';
  const cueOf = r => r.cue || r.name || '';
  if (guided) {
    // walk through the exercise once, step by step: each step waits for both its animation and its spoken cue
    const label = segLabel(ex, item, segInfo);
    let first = true;
    // an instant step (like the seam where a circle starts again) has nothing to show, so it only carries the title
    const g = (r, extra = {}) => { push(r, { phase: 'guide', guided: true, say: ((first ? `${ex.name}${label ? ', ' + label : ''}. ` : '') + (r.dur && !r.quiet ? cueOf(r) : '')).trim(), ...extra }); first = false; };
    ph.setup.forEach(i => g(V0[i]));
    if (ex.measure === 'time') {
      const h = ex.holdStep != null ? ex.holdStep : ph.start;
      ph.rep.filter(i => i !== h).forEach(i => g(V0[i]));
    } else versions.forEach(v => ph.rep.forEach(i => g(v.R[i])));
    if (first) g(V0[ph.start]);
  } else ph.setup.forEach(i => push(V0[i], { phase: 'setup' }));
  if (ex.measure === 'time') {
    const h = ex.holdStep != null ? ex.holdStep : ph.start;
    ph.rep.forEach(i => push(i === h ? { ...V0[i], hold: item.seconds * 1000 * tempo } : V0[i], i === h ? { phase: 'hold', seconds: item.seconds, ...(guided ? { say: `Now hold for ${item.seconds} seconds.` } : {}) } : { phase: 'rep' }));
  } else {
    const total = item.reps * versions.length;
    for (let k = 0; k < total; k++) {
      const V = versions[k % versions.length].R;
      ph.rep.forEach((i, j) => push(V[i], { phase: 'rep', repNo: j === 0 ? Math.floor(k / versions.length) + 1 : null, repOf: item.reps, alt: versions.length > 1 ? k % versions.length : null }));
    }
  }
  const VL = versions[versions.length - 1].R;
  ph.finish.forEach(i => push(VL[i], { phase: 'finish' }));
  plan.walls = V0.walls; plan.supports = V0.supports;
  return { plan, meta, ex, seg, props: versions[0].props, tempo };
}
function stagePlan(p) {
  const prevLast = S.mode === 'workout' && S.resolved.length ? S.resolved[S.idx] : null;
  const exChanged = !S.ex || S.ex.id !== p.ex.id;
  S.mode = 'workout'; S.ex = p.ex; S.seg = p.seg; S.props = p.props; S.tempo = p.tempo; S.speed = 1;
  S.resolved = p.plan; S.planMeta = p.meta; S.idx = 0; S.prev = null; S.from = prevLast; S.planDone = false; S.t = 0;
  S.bandRest = bandRestLengths(S.props, p.plan, S.seg);
  let minX = Infinity, maxX = -Infinity;
  for (const r of p.plan) {
    const pos = place(r.pose, r.v, S.seg, r.rule), P = fk(r.pose, r.v, S.seg, pos.x, pos.y);
    for (const k of POINTS) { minX = Math.min(minX, P[k].x); maxX = Math.max(maxX, P[k].x); }
  }
  for (const x of p.plan.walls || []) if (x != null) { minX = Math.min(minX, x - 6); maxX = Math.max(maxX, x + 6); }
  for (const s of p.plan.supports || []) { minX = Math.min(minX, s.x0 - 6); maxX = Math.max(maxX, s.x1 + 6); }
  S.shiftX = isFinite(minX) ? W / 2 - (minX + maxX) / 2 : 0;
  if (exChanged) { buildFigure(); buildGuide(); }
  frameScene(p.plan);
  if (S.from && exChanged) S.from = null;         // a new exercise starts from its own first position
}

/* In the workout player the camera frames the whole exercise tightly (head to floor, both ends of the move),
   so the figure is as big as the screen allows. The overlays sit in bands above and below it. */
function frameScene(plan) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity;
  for (const r of plan) {
    const pos = place(r.pose, r.v, S.seg, r.rule), P = fk(r.pose, r.v, S.seg, pos.x + S.shiftX, pos.y);
    for (const k of POINTS) { minX = Math.min(minX, P[k].x); maxX = Math.max(maxX, P[k].x); minY = Math.min(minY, P[k].y); }
  }
  for (const x of plan.walls || []) if (x != null) { minX = Math.min(minX, x + S.shiftX); maxX = Math.max(maxX, x + S.shiftX); }
  for (const s of plan.supports || []) { minX = Math.min(minX, s.x0 + S.shiftX); maxX = Math.max(maxX, s.x1 + S.shiftX); minY = Math.min(minY, FLOOR - s.h - (s.backHeight || 0)); }
  if (!isFinite(minX)) return;
  const pad = 26, top = minY - 20 - pad, h = FLOOR + 16 - top, wv = Math.max(maxX - minX + pad * 2, 120);
  scene.setAttribute('viewBox', `${(minX + maxX) / 2 - wv / 2} ${top} ${wv} ${h}`);
  syncLimbWidth();
}
function resetScene() { scene.setAttribute('viewBox', '0 0 400 400'); syncLimbWidth(); }

function startWorkout(w, fromIndex = 0) {
  WP.w = w; WP.flat = flattenWorkout(w); WP.log = { start: Date.now(), done: [] }; WP.lastLogged = -1;
  if (!WP.flat.length) { snack('Add some exercises first.'); return; }
  WP.i = Math.min(fromIndex, WP.flat.length - 1); WP.set = 0; WP.seg = 0; WP.started = Date.now(); WP.phase = 'work';
  unlockAudio(); wakeOn(); enterFullscreen(); setSound(WK.sound);
  go(`#/wplay/${encodeURIComponent(w.id)}`);
  runCurrent(true);
  if (!WK.hinted) { WK.hinted = true; setTimeout(() => toast('Tap for controls'), 600); }
}
function current() { return WP.flat[WP.i]; }
function runCurrent(announce) {
  const cur = current(); if (!cur) return finishWorkout();
  const segs = itemSegments(cur.item);
  const segInfo = segs[WP.seg] || segs[0];
  const p = buildPlan(cur.item, segInfo);
  stagePlan(p);
  WP.phase = 'work'; WP.beeped = {}; WP.rep = 0;
  $('#wpRest').hidden = true; $('#wpDone').hidden = true;
  S.playing = true; setWpPlay(true);
  S.onStep = onWorkStep; S.onPlanEnd = onWorkEnd;
  saveSession();
  renderWpInfo();
  if (announce) {
    const ex = p.ex, bl = ex.bilateral && ex.bilateral.labels, dl = ex.direction && ex.direction.labels;
    const bits = [ex.name];
    if (segs.length > 1 && WP.seg > 0) bits[0] = cur.item.sides === 'both' && WP.seg > 0 ? 'Switch sides' : 'Switch direction';
    if (cur.item.sides && cur.item.sides !== 'alternate' && bl) bits.push(bl[segInfo.side]);
    if (cur.item.dir && cur.item.dir !== 'alternate' && dl) bits.push(dl[segInfo.dir]);
    if (WK.sound !== 'coach') say(bits.join('. ') + '.');
    else if (WP.seg > 0) say(bits[0] + '.');                  // "Switch sides." then the guided run-through for the new side
  }
  S.canAdvance = i => !(S.planMeta[i] && S.planMeta[i].guided && WP.speaking);
  onWorkStep(0);
}
function onWorkStep(i) {
  const m = S.planMeta[i] || {};
  if (m.say) {
    // the guided run-through: this step waits until its cue has been read out
    WP.speaking = true;
    const token = WP.speakToken = (WP.speakToken || 0) + 1;
    say(m.say).then(() => { if (WP.speakToken === token) WP.speaking = false; });
  }
  if (m.repNo && m.alt !== 1) {
    WP.rep = m.repNo;
    // coach counts the reps, but only when it isn't already talking
    say(WP.rep === m.repOf && m.repOf > 1 ? 'Last one' : String(WP.rep), true, { dropIfBusy: true });
  }
  renderWpCount();
}
function onWorkEnd() {
  const cur = current(); if (!cur) return;
  const segs = itemSegments(cur.item);
  if (WP.seg < segs.length - 1) { WP.seg++; beep(660, 160); return runCurrent(true); }
  WP.seg = 0;
  if (WP.set < cur.item.sets - 1) { WP.set++; return startRest(cur.item.rest || 0, 'set'); }
  WP.set = 0;
  logItem(cur);
  if (WP.i < WP.flat.length - 1) {
    WP.i++; saveSession();
    const nx = WP.flat[WP.i];
    if (nx.firstOfRound) return startRest(nx.block.roundRest != null ? nx.block.roundRest : 30, 'round');
    return startRest(WP.w.restBetween || 0, 'item');
  }
  finishWorkout();
}
function startRest(seconds, kind) {
  if (seconds <= 0) return runCurrent(true);
  WP.phase = 'rest'; WP.restLeft = seconds; WP.restLast = performance.now(); WP.beeped = {}; S.canAdvance = null;
  const cur = current(), ex = exById(cur.item.ex);
  $('#wpRest').hidden = false; $('#wpControls').classList.remove('show');
  $('#wpRestLabel').textContent = kind === 'set' ? 'Rest before the next set' : kind === 'round' ? `Rest before round ${cur.round + 1} of ${cur.rounds}` : 'Rest';
  $('#wpRestNext').textContent = kind === 'set' ? `Next: set ${WP.set + 1} of ${cur.item.sets}` : `Next: ${ex.name}`;
  // show where the next exercise starts
  stagePlan(buildPlan(cur.item, itemSegments(cur.item)[0]));
  S.playing = false; S.t = S.resolved[0].dur; S.planDone = false;
  S.onStep = null; S.onPlanEnd = null;
  renderWpInfo();
  say(kind === 'set' ? `Rest ${seconds} seconds.` : kind === 'round' ? `Round ${cur.round} done. Rest ${seconds} seconds.` : `Rest ${seconds} seconds. Next: ${ex.name}.`);
  beep(520, 200);
}
/* ---------- history ---------- */
const LOG_KEY = 'motion-guide-log-v1';
function loadLog() { try { const d = JSON.parse(localStorage.getItem(LOG_KEY) || 'null'); return Array.isArray(d) ? d : []; } catch (e) { return []; } }
function saveLog(list) { try { localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(-500))); } catch (e) { } }
function logItem(entry) {
  if (!WP.log || !entry || WP.lastLogged === WP.i) return;
  WP.lastLogged = WP.i;
  const it = entry.item, ex = exById(it.ex);
  WP.log.done.push({ ex: it.ex, name: ex ? ex.name : it.ex, category: ex && ex.category, measure: ex && ex.measure,
    sets: it.sets, ...(ex && ex.measure === 'time' ? { seconds: it.seconds } : { reps: it.reps }), ...(it.sides ? { sides: it.sides } : {}), ...(it.dir ? { dir: it.dir } : {}), block: entry.block.name, round: entry.round + 1 });
}
function writeSession(completed) {
  if (!WP.log || !WP.log.done.length) return;
  const list = loadLog();
  list.push({ id: uid(), workout: WP.w.id, name: WP.w.name, start: new Date(WP.log.start).toISOString(), end: new Date().toISOString(),
    seconds: Math.round((Date.now() - WP.log.start) / 1000), completed, exercisesDone: WP.log.done.length, exercisesTotal: WP.flat.length, exercises: WP.log.done });
  saveLog(list); WP.log = null;
}
function renderHistory() {
  const list = loadLog().slice().reverse();
  $('#historyList').innerHTML = list.length ? list.slice(0, 50).map(s => {
    const d = new Date(s.start);
    return `<li class="item"><span class="open" style="cursor:default"><span class="icon" style="color:var(--md-primary)">${s.completed ? 'task_alt' : 'timelapse'}</span>
      <span class="txt"><span class="title-small">${esc(s.name)}</span><span class="body-small muted">${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}: ${fmtMin(s.seconds)}, ${s.exercisesDone} of ${s.exercisesTotal} exercises${s.completed ? '' : ' (stopped early)'}</span></span></span>
      <button class="icon-btn stateful" data-logdel="${s.id}" aria-label="Delete this entry"><span class="icon">delete</span></button></li>`;
  }).join('') : '<li class="body-medium muted" style="padding:8px 4px">Finished workouts show up here.</li>';
  $('#historyActions').hidden = !list.length;
}

function finishWorkout() {
  S.canAdvance = null;
  logItem(current() || WP.flat[WP.flat.length - 1]);
  writeSession(true);
  WP.phase = 'done'; S.playing = false; S.onPlanEnd = null; S.onStep = null;
  $('#wpRest').hidden = true; $('#wpDone').hidden = false; $('#wpControls').classList.remove('show');
  $('#wpDoneText').textContent = `${WP.w.name}: ${WP.flat.length} exercises in ${fmtMin((Date.now() - WP.started) / 1000)}.`;
  dropSession(); wakeOff();
  say('Workout complete. Well done.'); beep(880, 180); setTimeout(() => beep(1175, 260), 200);
  renderWpInfo();
}
function setWpPlay(p) {
  const b = $('#wpPlay'); b.innerHTML = `<span class="icon fill">${p ? 'pause' : 'play_arrow'}</span>`; b.setAttribute('aria-label', p ? 'Pause' : 'Play');
  // paused: controls stay up. Resumed: if they're showing, they fade shortly after. Starting an exercise never shows them.
  if (!p) showControls(true);
  else if ($('#wpControls').classList.contains('show')) showControls(false, 1200);
}

/* ---------- gestures: tap to pause, swipe to skip, hold ✕ to leave ---------- */
let CTRL_T = 0, CTRL_SHOWN_AT = 0;
function showControls(stay, ms = 4000) {
  const c = $('#wpControls');
  if (!c.classList.contains('show')) CTRL_SHOWN_AT = performance.now();
  c.classList.add('show'); clearTimeout(CTRL_T);
  if (!stay) CTRL_T = setTimeout(() => { if (isPaused()) return; c.classList.remove('show'); }, ms);
}
const isPaused = () => (WP.phase === 'rest' ? WP.paused : !S.playing) && WP.phase !== 'done';
function toast(text) {
  const t = $('#wpToast'); t.textContent = text; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1600);
}
const G = { x: 0, y: 0, t: 0, id: null };
$('#wpRoot').addEventListener('pointerdown', e => {
  if (e.target.closest('button')) return;
  G.x = e.clientX; G.y = e.clientY; G.t = performance.now(); G.id = e.pointerId;
});
$('#wpRoot').addEventListener('pointerup', e => {
  if (G.id !== e.pointerId || e.target.closest('button')) return;
  G.id = null;
  const dx = e.clientX - G.x, dy = e.clientY - G.y, dt = performance.now() - G.t;
  if (WP.phase === 'done') return;
  const ctl = $('#wpControls'), shown = ctl.classList.contains('show');
  // swipe: a long, deliberate sideways stroke, and only while the controls are hidden
  if (!shown && Math.abs(dx) > Math.max(110, innerWidth * 0.33) && Math.abs(dx) > Math.abs(dy) * 2 && dt < 700) {
    if (dx < 0) { wpAction('nextItem'); toast('Next exercise'); } else { wpAction('prevItem'); toast('Previous exercise'); }
    return;
  }
  if (Math.hypot(dx, dy) < 24 && dt < 700) {                                        // tap
    if (!shown) showControls(isPaused());                                            // first tap: just show the controls
    else if (e.target === ctl) { clearTimeout(CTRL_T); ctl.classList.remove('show'); } // tap empty space: hide them
  }
});
/* ✕ has to be held for a moment, so a stray tap can't end the workout */
(() => {
  const btn = $('#wpExit'); let t0 = 0, raf = 0;
  const tick = () => { const p = Math.min(1, (performance.now() - t0) / 800); btn.style.setProperty('--p', (p * 100).toFixed(0) + '%');
    if (p >= 1) { stop(); exitWorkout(); return; } raf = requestAnimationFrame(tick); };
  const stop = () => { cancelAnimationFrame(raf); btn.style.setProperty('--p', '0%'); };
  btn.addEventListener('pointerdown', e => { e.preventDefault(); t0 = performance.now(); raf = requestAnimationFrame(tick); showControls(true); });
  btn.addEventListener('pointerup', () => { if (performance.now() - t0 < 800) toast('Hold ✕ to exit'); stop(); showControls(isPaused()); });
  btn.addEventListener('pointerleave', stop); btn.addEventListener('pointercancel', stop);
  btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); exitWorkout(); } });
})();
function exitWorkout() { go(`#/workout/${WP.w.id}`); }
/* full screen while working out (hides the phone's status bar where allowed) */
const FS_KEY = 'nstructr-fullscreen-v1';
const installedApp = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
const wantFullscreen = () => { try { return localStorage.getItem(FS_KEY) !== 'off'; } catch (e) { return true; } };
function enterFullscreen() { if (installedApp() || !wantFullscreen()) return; try { const el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => { }); } catch (e) { } }
function leaveFullscreen() { try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => { }); } catch (e) { } }
function renderWpInfo() {
  const cur = current(); if (!cur) return;
  const ex = exById(cur.item.ex), segs = itemSegments(cur.item), sg = segs[WP.seg] || segs[0];
  const bl = ex.bilateral && ex.bilateral.labels, dl = ex.direction && ex.direction.labels;
  $('#wpBlock').textContent = cur.rounds > 1 ? `${cur.block.name}, round ${cur.round + 1} of ${cur.rounds}` : cur.block.name;
  $('#wpName').textContent = ex.name;
  const bits = [];
  if (cur.item.sets > 1) bits.push(`Set ${WP.set + 1} of ${cur.item.sets}`);
  if (cur.item.sides === 'alternate') bits.push('Alternating sides');
  else if (cur.item.sides && bl) bits.push(bl[sg.side]);
  if (cur.item.dir === 'alternate') bits.push('Alternating directions');
  else if (cur.item.dir && dl) bits.push(dl[sg.dir]);
  $('#wpSet').textContent = bits.join(', ');
  renderSegments();
  renderWpCount();
  requestAnimationFrame(layoutWp);
}
/* stack the screen from the top: title band, then room for a two-line caption, then the figure.
   Measured, because the title band's height depends on the screen and the exercise name. */
function layoutWp() {
  if (S.view !== 'wplay') return;
  const top = $('#wpRoot .ov-top').getBoundingClientRect().bottom;
  const cap = $('#wpCaption'), fs = parseFloat(getComputedStyle(cap).fontSize) || 18;
  cap.style.top = Math.round(top + 4) + 'px';
  $('#wpStageSlot').style.top = Math.round(top + 8 + fs * 1.25 * 2 + 10) + 'px';
  syncLimbWidth();
}
addEventListener('resize', () => requestAnimationFrame(layoutWp));

/* the bottom bar: one segment per block, filling as you go */
function renderSegments() {
  const blocks = WP.w.blocks.filter(b => b.items.length);
  const done = WP.phase === 'done' ? WP.flat.length : WP.i;
  let seen = 0;
  $('#wpSegs').innerHTML = blocks.map(b => {
    const n = WP.flat.filter(x => x.block === b).length;
    const f = Math.max(0, Math.min(1, (done - seen) / n)); seen += n;
    return `<i style="flex:${n}"><b style="width:${(f * 100).toFixed(1)}%"></b></i>`;
  }).join('');
}
function renderWpCount() {
  const cur = current(); if (!cur || WP.phase === 'done') { $('#wpCount').textContent = ''; return; }
  const ex = exById(cur.item.ex);
  if (WP.phase === 'rest') { $('#wpCount').textContent = ''; return; }
  if (ex.measure === 'time') {
    const m = S.planMeta[S.idx] || {}, r = S.resolved[S.idx];
    if (m.guided) { $('#wpCount').innerHTML = '<small>run-through</small>'; return; }
    if (m.phase === 'hold') {
      const left = S.t < r.dur ? m.seconds : Math.max(0, Math.ceil((r.dur + r.hold - S.t) / 1000 / (S.tempo || 1)));   // counts down once you're in the pose
      $('#wpCount').textContent = fmtTime(left);
      if (left <= 3 && left > 0 && !WP.beeped['h' + left]) { WP.beeped['h' + left] = 1; beep(left === 1 ? 880 : 660); }
      if (S.t >= r.dur) {
        if (m.seconds >= 30 && left <= Math.round(m.seconds / 2) && left > 10 && !WP.beeped.half) { WP.beeped.half = 1; say('Halfway', true, { dropIfBusy: true }); }
        if (m.seconds >= 20 && left <= 10 && left > 3 && !WP.beeped.ten) { WP.beeped.ten = 1; say('10 seconds', true, { dropIfBusy: true }); }
      }
    } else $('#wpCount').textContent = fmtTime(cur.item.seconds);
  } else {
    const name = ex.repName && ex.repName !== 'rep' ? ex.repName + 's' : 'reps';
    const m = S.planMeta[S.idx] || {};
    const html = m.guided ? `<small>run-through</small>` : `${WP.rep || 0}/${cur.item.reps}<small>${name}</small>`;
    if ($('#wpCount').innerHTML !== html) $('#wpCount').innerHTML = html;
  }
}
/* a light ticker for countdowns (rest and holds) */
setInterval(() => {
  if (S.view !== 'wplay') return;
  if (WP.phase === 'rest' && !WP.paused) {
    const now = performance.now(); WP.restLeft -= (now - WP.restLast) / 1000; WP.restLast = now;
    const left = Math.max(0, Math.ceil(WP.restLeft));
    $('#wpRestTime').textContent = fmtTime(left);
    if (left <= 3 && left > 0 && !WP.beeped['r' + left]) { WP.beeped['r' + left] = 1; beep(left === 1 ? 880 : 660); }
    if (WP.restLeft <= 0) runCurrent(true);
  } else if (WP.phase === 'rest') WP.restLast = performance.now();
  if (WP.phase === 'work') renderWpCount();
}, 200);

/* The tap that reveals the controls must not also press whatever button appears under that finger: a control
   only responds to a touch that began after the controls were already showing. */
let LAST_DOWN_AT = 0;
$('#wpRoot').addEventListener('pointerdown', () => { LAST_DOWN_AT = performance.now(); }, true);
function wpAction(act) {
  if (S.view === 'wplay' && ['pause', 'nextItem', 'prevItem', 'sound'].includes(act) && LAST_DOWN_AT && LAST_DOWN_AT < CTRL_SHOWN_AT) return;
  if (act === 'pause') {
    if (WP.phase === 'rest') { WP.paused = !WP.paused; setWpPlay(!WP.paused); toast(WP.paused ? 'Paused' : 'Resumed'); return; }
    S.playing = !S.playing; setWpPlay(S.playing); toast(S.playing ? 'Resumed' : 'Paused'); return;
  }
  if (S.view === 'wplay' && WP.phase !== 'done' && act !== 'pause') showControls(isPaused());
  if (act === 'sound') {
    const k = SOUND_MODES.findIndex(x => x[0] === WK.sound), nx = SOUND_MODES[(k + 1) % SOUND_MODES.length];
    setSound(nx[0]); unlockAudio(); toast(`Sound: ${nx[2]}`); showControls(isPaused()); return;
  }
  if (act === 'restMore') { WP.restLeft += 15; return; }
  if (act === 'restSkip') { if (WP.phase === 'rest') runCurrent(true); return; }
  if (act === 'nextItem' || act === 'prevItem' || act === 'restSkip') hush();
  if (act === 'nextItem') { if (WP.i < WP.flat.length - 1) { WP.i++; WP.set = 0; WP.seg = 0; runCurrent(true); } else finishWorkout(); return; }
  if (act === 'prevItem') { WP.i = Math.max(0, WP.i - 1); WP.set = 0; WP.seg = 0; runCurrent(true); return; }
  if (act === 'finish') { go('#/workouts'); return; }
}

/* before-you-start sheet: equipment and any safety notes in the workout */
let PENDING_START = null;
function confirmStart(w, fromIndex = 0) {
  PENDING_START = { w, fromIndex };
  const eq = workoutEquipment(w);
  const notes = [...new Set(w.blocks.flatMap(b => b.items).map(it => ((exById(it.ex) || {}).prescription || {}).note).filter(n => n && /doctor|osteoporosis|heart|coach|spotter|blood pressure/i.test(n)))];
  $('#startTitle').textContent = w.name;
  $('#startBody').innerHTML = `<p class="body-medium" style="margin:0 0 12px">About ${fmtMin(workoutSeconds(w))}, ${w.blocks.flatMap(b => b.items).length} exercises${fromIndex ? `, starting at exercise ${fromIndex + 1}` : ''}.</p>
    ${eq.length ? `<p class="title-small" style="margin:0 0 6px">You'll need</p><div class="chips" style="margin:0 0 12px">${eq.map(q => `<span class="chip">${esc(q)}</span>`).join('')}</div>` : ''}
    ${notes.length ? `<p class="title-small" style="margin:0 0 6px">Safety</p><ul style="margin:0 0 12px;padding-left:20px">${notes.map(n => `<li class="body-small">${esc(n)}</li>`).join('')}</ul>` : ''}
    <p class="title-small" style="margin:0 0 6px">Sound</p>
    <div class="segmented" id="startSound" role="group" aria-label="Sound">${[['off', 'Silent'], ['beeps', 'Beeps'], ['voice', 'Voice'], ['coach', 'Coach']].map(([v, l]) => `<button class="stateful" data-sound="${v}" aria-pressed="${WK.sound === v}"><span class="icon">check</span>${l}</button>`).join('')}</div>
    ${installedApp() ? '' : `<label class="row" style="margin:12px 0 0;gap:10px"><input type="checkbox" id="fsToggle" ${wantFullscreen() ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--md-primary)"><span class="body-medium">Full screen (the browser shows a short notice when it starts)</span></label>`}
    <p class="body-small muted" style="margin:8px 0 0">Voice says each exercise, side switches and rests. Coach first walks you through one slow run-through of each exercise (and each side or direction), reading every step, then counts your reps and calls out hold milestones.</p>
    <p class="body-small muted" style="margin:12px 0 0">Stop if anything hurts. Rep-based sets move on by themselves when the reps are done.</p>`;
  $('#startDialog').showModal();
}
$('#startBody').addEventListener('change', e => { if (e.target.id === 'fsToggle') { try { localStorage.setItem(FS_KEY, e.target.checked ? 'on' : 'off'); } catch (err) { } } });
$('#startBody').addEventListener('click', e => { const b = e.target.closest('[data-sound]'); if (b) { setSound(b.dataset.sound); b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); } });
$('#startGo').addEventListener('click', () => { $('#startDialog').close(); if (PENDING_START) startWorkout(PENDING_START.w, PENDING_START.fromIndex); });


/* stage lives in the exercise player; the workout player borrows it */
function moveStage(toWorkout) {
  const box = $('#stageBox');
  if (toWorkout) $('#wpStageSlot').appendChild(box);
  else { const col = document.querySelector('#view-player .stage-col'); if (box.parentElement !== col) col.insertBefore(box, col.firstChild); }
}

/* all workout clicks */
document.querySelector('.shell').addEventListener('click', e => {
  const t = e.target.closest('button, a'); if (!t) return;
  const d = t.dataset;
  if (d.wstart) { const w = wkById(d.wstart); if (w) confirmStart(w); }
  else if (d.wact === 'new') {
    const w = { id: uid(), name: 'New workout', restBetween: 10, blocks: [{ id: uid(), name: 'Block 1', items: [] }] };
    WK.list.push(w); saveWorkouts(); go(`#/workout/${w.id}`);
  }
  else if (d.wact === 'resume') { const s = loadSession(), w = s && wkById(s.wid); if (w) confirmStart(w, s.i); }
  else if (d.wact === 'dropSession') { dropSession(); renderWorkouts(); }
  else if (d.wact === 'start' && EDIT) confirmStart(EDIT);
  else if (d.wact === 'addBlock' && EDIT) { EDIT.blocks.push({ id: uid(), name: `Block ${EDIT.blocks.length + 1}`, items: [] }); commitEdit(); }
  else if (d.wact === 'export' && EDIT) showJson(EDIT.name, workoutJSON(EDIT));
  else if (d.wact === 'share' && EDIT) shareWorkout(EDIT);
  else if (d.wact === 'exportLog') showJson('Workout history', JSON.stringify({ format: 'nstructr/log', version: 1, sessions: loadLog() }, null, 2));
  else if (d.wact === 'clearLog') { if (confirm('Clear all workout history?')) { saveLog([]); renderHistory(); } }
  else if (d.logdel) { saveLog(loadLog().filter(s => s.id !== d.logdel)); renderHistory(); }
  else if (d.act === 'copyRoutinePrompt') copyText(routinePrompt(), 'Prompt copied');
  else if (d.act === 'showRoutinePrompt') showJson('Prompt: written routine to workout', routinePrompt());
  else if (d.wact === 'duplicateWorkout' && EDIT) {
    const c = JSON.parse(JSON.stringify(EDIT)); c.id = uid(); c.name = EDIT.name + ' (copy)';
    c.blocks.forEach(b => { b.id = uid(); b.items.forEach(i => (i.uid = uid())); });
    WK.list.push(c); saveWorkouts(); go(`#/workout/${c.id}`); snack('Duplicated');
  }
  else if (d.wact === 'deleteWorkout' && EDIT) {
    if (!confirm(`Delete "${EDIT.name}"?`)) return;
    WK.list = WK.list.filter(w => w !== EDIT); saveWorkouts(); EDIT = null; go('#/workouts'); snack('Workout deleted');
  }
  else if (d.iedit) openItemSettings(d.iedit);
  else if (d.imenu) itemMenu(t, d.imenu);
  else if (d.bmenu) blockMenu(t, d.bmenu);
  else if (d.addto) openPicker(d.addto);
  else if (d.wact) wpAction(d.wact);
});
$('#wkName').addEventListener('input', e => { if (EDIT) { EDIT.name = e.target.value || 'Untitled workout'; saveWorkouts(); $('#barTitle').textContent = EDIT.name; } });
$('#wkBlocks').addEventListener('input', e => {
  const id = e.target.dataset && e.target.dataset.bname; if (!id || !EDIT) return;
  const b = EDIT.blocks.find(x => x.id === id); if (b) { b.name = e.target.value; saveWorkouts(); }
});
$('#wkSummary').addEventListener('change', e => { if (e.target.id === 'wkRestBetween' && EDIT) { EDIT.restBetween = +e.target.value; commitEdit(); } });
