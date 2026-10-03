
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
/* the user's own workouts; null = first run (boot() starts it empty: library workouts are listed separately) */
function loadWorkouts() {
  try { const d = JSON.parse(localStorage.getItem(WK_KEY) || 'null'); if (d && Array.isArray(d.list)) return d.list; } catch (e) { }
  return null;
}
/* a library workout file -> the editable form the app stores (block ids, item uids, defaults filled in) */
function hydrateWorkout(fw) {
  return {
    id: fw.id, name: fw.name,
    blocks: fw.blocks.map(b => ({
      id: uid(), name: b.name, rounds: b.rounds || 1, roundRest: b.roundRest != null ? b.roundRest : 30,
      items: b.items.map(it => { const ex = exById(it.ex); return ex ? { ...newItem(ex), rest: 0, ...it, uid: uid() } : null; }).filter(Boolean)
    }))
  };
}
const WK = { list: loadWorkouts(), sound: (() => { try { return localStorage.getItem(SOUND_KEY) || 'coach'; } catch (e) { return 'coach'; } })() };
function saveWorkouts() { try { localStorage.setItem(WK_KEY, JSON.stringify({ list: WK.list })); } catch (e) { } }
/* Library workouts aren't copied into the user's list: they're shown in their own section, so library updates
   reach everyone. Their runtime ids carry a "lib:" prefix so they never clash with the user's workouts (older
   installs have a first-run copy of the routine under the plain library id). "Customize" copies one into the
   user's list. */
const LIB_PREFIX = 'lib:';
let LIB_WK = [];
function hydrateLibrary() { LIB_WK = LIBRARY_WORKOUTS.map(fw => ({ ...hydrateWorkout(fw), id: LIB_PREFIX + fw.id, libId: fw.id, description: fw.description })); orderLibrary(); }
const isLibWorkout = w => !!(w && w.libId);
const wkById = id => (WK.list || []).find(w => w.id === id) || LIB_WK.find(w => w.id === id);
function customizeWorkout(w) {
  const c = JSON.parse(JSON.stringify(w)); c.id = uid(); c.name = `${w.name} (copy)`; delete c.libId; delete c.description;
  c.blocks.forEach(b => { b.id = uid(); b.items.forEach(i => (i.uid = uid())); });
  WK.list.push(c); saveWorkouts();
  return c;
}

/* ---------- timing ---------- */
const stepMs = k => (k.durationMs || 0) + (k.holdMs == null ? 500 : k.holdMs);
/* one rep at the exercise's own pace, in seconds; a workout item's "tempo" divides it (2 = twice as fast) */
function repSeconds(ex) { const ph = phaseInfo(ex.keyframes); return ph.rep.reduce((s, i) => s + stepMs(ex.keyframes[i]), 0) / 1000; }
const round1 = x => Math.round(x * 10) / 10;
function itemSeconds(item) {
  const ex = exById(item.ex); if (!ex) return 0;
  const kfs = ex.keyframes, ph = phaseInfo(kfs), t = item.tempo || 1;
  const sum = idx => idx.reduce((s, i) => s + stepMs(kfs[i]), 0) / 1000 / t;
  const segs = (item.sides === 'both' ? 2 : 1) * (item.dir === 'both' ? 2 : 1);
  const alt = (item.sides === 'alternate' ? 2 : 1) * (item.dir === 'alternate' ? 2 : 1);
  const work = ex.measure === 'time'
    ? item.seconds + sum(ph.setup) + sum(ph.finish) + (kfs[ex.holdStep || ph.start].durationMs || 0) / 1000 / t
    : sum(ph.setup) + sum(ph.finish) + sum(ph.rep) * item.reps * alt;
  // NstructR+: + ~2 s of speech a step. With a voice, a hold waits for its line (NstructR+: the pose's cue, then
  // "Ready… Hold for N seconds", ~2.5 words a second) and reps for "Ready… Begin"
  const voiced = WK.sound === 'voice' || WK.sound === 'coach', words = s => s.split(/\s+/).filter(Boolean).length / 2.5 / speechRate();
  const hk = ex.measure === 'time' ? kfs[ex.holdStep != null ? ex.holdStep : ph.start] : null;
  const holdLine = hk && voiced ? Math.max(0, words(`${WK.sound === 'coach' && !hk.quiet ? hk.cue || hk.name || '' : ''} Ready… ${plural(item.seconds, { one: 'Hold for # second.', other: 'Hold for # seconds.' })}`) - (hk.durationMs || 0) / 1000 / t) : 0;
  const readyLine = !hk && voiced ? Math.max(words(READY_BEGIN), (kfs[ph.start].durationMs || 0) / 1000 / t) : 0;   // (into the starting pose while it's said; rep 1 then waits that move's time)
  const guide = holdLine + readyLine;
  // NstructR+'s demonstration: each side or direction once, in the first set ("Watch me first." once)
  const demo = WK.sound === 'coach' ? segs * (sum(ph.setup) + sum(ph.rep) * alt + 2 * (ph.setup.length + ph.rep.length * alt)) + words(WATCH_FIRST) : 0;
  return item.sets * segs * (work + guide) + demo + (item.sets - 1) * restSets();
}
function blockSeconds(b, w) {
  const r = b.rounds || 1, one = b.items.reduce((s, it) => s + itemSeconds(it), 0) + Math.max(0, b.items.length - 1) * restGap();
  return one * r + (r - 1) * (b.roundRest || 0);
}
function workoutSeconds(w) {
  return w.blocks.reduce((s, b) => s + blockSeconds(b, w), 0) + Math.max(0, w.blocks.filter(b => b.items.length).length - 1) * restGap() + equipmentSeconds(w);
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
/* ---------- Equipment changes (Oct 2026) ----------
   Between two exercises with different equipment the person has to put things down and get or set up others. The time
   for it is what it takes to say so: half a second of silence, the words ("Put the dumbbells down. Position yourself by
   your chair."), half a second (EQUIP_PAD; the words timed at the speech speed, as the time estimate does). With a rest
   it's added to the rest, which shows and says what to do; with no rest there's no rest screen: the words are said
   (and captioned) while the figure moves into the next exercise, and that move is slowed to last at least as long. A
   workout with equipment starts with a title card (its name, what you'll need) timed the same way. With "Pause at equipment changes" it
   waits for Ready instead (a rest screen even with no rest). The yoga mat stays down. get / drop: what to say: pick up
   and put down what's easy to carry; position yourself by furniture and the wall. */
const EQUIP = {
  // easy to pick up and put down
  Dumbbells: { get: 'Pick up the dumbbells', drop: 'Put the dumbbells down' },
  Kettlebell: { get: 'Pick up the kettlebell', drop: 'Put the kettlebell down' },
  'Medicine ball': { get: 'Pick up the medicine ball', drop: 'Put the medicine ball down' },
  'Resistance band': { get: 'Pick up the resistance band', drop: 'Put the band down' },
  Towel: { get: 'Pick up a towel', drop: 'Put the towel down' },
  'Yoga block': { get: 'Pick up a yoga block', drop: 'Put the block down' },
  'Yoga strap': { get: 'Pick up the yoga strap', drop: 'Put the strap down' },
  'Pilates ring': { get: 'Pick up the Pilates ring', drop: 'Put the ring down' },
  Barbell: { get: 'Pick up the barbell', drop: 'Put the barbell down' },
  'Stability ball': { get: 'Pick up the stability ball', drop: 'Put the ball down' },
  'Foam roller': { get: 'Pick up the foam roller', drop: 'Put the roller down' },
  // too big to carry about: you go to them (owner, Oct 2026: "position yourself by your chair")
  Chair: { get: 'Position yourself by your chair' },
  Bench: { get: 'Position yourself by your bench' },
  Step: { get: 'Position yourself by your step' },
  Wall: { get: 'Position yourself by your wall' },
  'Pull-up bar': { get: 'Position yourself under your pull-up bar' },
  'Door anchor': { get: 'Set up your door anchor' }
};
const EQUIP_PAD = 0.5;
// how long the words take to say, with the silence before and after (~2.5 words a second at 1.0×)
const equipSpoken = lines => EQUIP_PAD + lines.join(' ').split(/\s+/).filter(Boolean).length / 2.5 / speechRate() + EQUIP_PAD;
const checklistLine = need => `You'll need: ${listWords(need.map(q => q.toLowerCase()))}`;
const fetchKey = q => q === 'Dumbbell' ? 'Dumbbells' : q;                     // one dumbbell or two: the same to fetch
const equipOf = ex => new Set(((ex && ex.equipment) || []).map(fetchKey).filter(q => EQUIP[q]));
/* what changes from one exercise to the next: { seconds, lines } or null */
function equipmentChange(fromEx, toEx) {
  const a = equipOf(fromEx), b = equipOf(toEx);
  const put = [...a].filter(q => !b.has(q)), got = [...b].filter(q => !a.has(q)), all = [...put, ...got];
  if (!all.length) return null;
  const lines = [...put.map(q => EQUIP[q].drop).filter(Boolean), ...got.map(q => EQUIP[q].get)];
  // stepping away from furniture (a chair to nothing) has nothing to do or say: no change (it said a lone "." before)
  return lines.length ? { seconds: equipSpoken(lines), lines } : null;
}
// everything a workout (from one of its exercises on) uses, for the title card
const neededFrom = (flat, i) => [...new Set(flat.slice(i).flatMap(e => [...equipOf(exById(e.item.ex))]))];
const listWords = xs => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
const equipPauseOn = () => pref(EQUIP_PAUSE_KEY, 'off') === 'on';
/* the time the equipment adds to a workout: the changes between its exercises in order, and the checklist */
function equipmentSeconds(w) {
  const flat = flattenWorkout(w), need = flat.length ? neededFrom(flat, 0) : []; let t = need.length ? equipSpoken([w.name, checklistLine(need)]) : 0;   // the title card: its name, then the list
  for (let i = 1; i < flat.length; i++) { const c = equipmentChange(exById(flat[i - 1].item.ex), exById(flat[i].item.ex)); if (c) t += c.seconds; }
  return t;
}
function itemSummary(item) {
  const ex = exById(item.ex); if (!ex) return 'Missing exercise';
  const parts = [];
  const n = ex.measure === 'time' ? `${item.seconds} s` : `${fmtNum(item.reps)} ${repWord(ex, item.reps)}`;
  parts.push(item.sets > 1 ? plural(item.sets, { one: `# set of ${n}`, other: `# sets of ${n}` }) : n);
  const bl = ex.bilateral && ex.bilateral.labels, dl = ex.direction && ex.direction.labels;
  if (item.sides) parts.push(item.sides === 'both' ? (ex.measure === 'time' ? 'each side' : 'per side') : item.sides === 'alternate' ? 'alternating sides' : `${(bl && bl[item.sides]) || item.sides} only`);
  if (item.dir) parts.push(item.dir === 'both' ? 'each direction' : item.dir === 'alternate' ? 'alternating directions' : `${(dl && dl[item.dir]) || item.dir} only`);
  if (item.tempo && item.tempo !== 1 && ex.measure !== 'time') parts.push(`${round1(repSeconds(ex) / item.tempo)} s per rep`);
  return parts.join(', ');
}

/* ---------- list ---------- */
function renderWorkouts() {
  renderHistory();
  $('#wkCount').textContent = WK.list.length ? String(WK.list.length) : '';
  const sess = loadSession(), sw = sess && wkById(sess.wid);
  $('#resumeSlot').innerHTML = sw ? `<div class="resume"><span class="icon">history</span><span class="txt"><span class="title-small" style="display:block">Resume ${esc(sw.name)}</span>
    <span class="body-small">From exercise ${sess.i + 1} of ${sw.blocks.flatMap(b => b.items).length}</span></span>
    <button class="btn filled stateful" data-wact="resume">Resume</button><button class="icon-btn stateful" data-wact="dropSession" aria-label="Discard"><span class="icon">close</span></button></div>` : '';
  $('#wkEmpty').hidden = !!WK.list.length;
  $('#wkList').innerHTML = WK.list.map(w => wkCard(w)).join('');
  $('#libWkSection').hidden = !LIB_WK.length;
  $('#libWkList').innerHTML = LIB_WK.map(w => wkCard(w)).join('');
}
/* A card is collapsed to: drag handle, Start, name. Tapping the name shows the details. Your own workouts can be
   swiped left to show a trash can (tap it to delete). Both lists can be put in any order by dragging the handle. */
const WK_OPEN = new Set();
function wkCard(w) {
  const n = w.blocks.flatMap(b => b.items).length, lib = isLibWorkout(w), open = WK_OPEN.has(w.id), eq = workoutEquipment(w);
  return `<article class="wk-card${open ? ' open' : ''}" data-wk="${esc(w.id)}">
    ${lib ? '' : `<button class="wk-del stateful" data-wdel="${esc(w.id)}" aria-label="Delete ${esc(w.name)}" tabindex="-1"><span class="icon">delete</span></button>`}
    <div class="wk-face">
      <div class="wk-row">
        <span class="handle" data-wkhandle aria-hidden="true"><span class="icon">drag_indicator</span></span>
        <button class="wk-start stateful" data-wstart="${esc(w.id)}" aria-label="Start ${esc(w.name)}"><span class="icon fill">play_arrow</span></button>
        <button class="wk-title stateful" data-wtoggle="${esc(w.id)}" aria-expanded="${open}"><span class="title-medium">${esc(w.name)}</span><span class="icon">expand_more</span></button>
      </div>
      <div class="wk-details"${open ? '' : ' hidden'}>
        ${lib && w.description ? `<p class="body-small muted" style="margin:0">${esc(w.description)}</p>` : ''}
        <div class="wk-meta body-small"><span><span class="icon">schedule</span>About ${fmtMin(workoutSeconds(w))}</span><span><span class="icon">format_list_numbered</span>${plural(n, { one: '# exercise', other: '# exercises' })}</span><span><span class="icon">view_agenda</span>${plural(w.blocks.length, { one: '# block', other: '# blocks' })}</span></div>
        ${eq.length ? `<div class="wk-meta body-small"><span><span class="icon">handyman</span>${esc(eq.join(', '))}</span></div>` : ''}
        ${workoutMusclesHTML(w, true)}
        ${wkExerciseList(w)}
        <div class="row">${lib ? `<button class="btn tonal stateful" data-wcustom="${esc(w.id)}"><span class="icon">edit</span>Customize</button>`
          : `<a class="btn tonal stateful" href="#/workout/${encodeURIComponent(w.id)}" style="text-decoration:none"><span class="icon">edit</span>Edit</a>
             <button class="icon-btn stateful wk-share" data-share-wk="${esc(w.id)}" aria-label="Share ${esc(w.name)}" title="Share"><span class="icon">share</span></button>`}</div>
        ${safetyHtml(w)}
      </div>
    </div></article>`;
}
/* an open card lists its exercises (thumbnail and name, by block); tapping one opens it on the exercise page */
function wkExerciseList(w) {
  const many = w.blocks.filter(b => b.items.length).length > 1;
  return `<div class="wk-exlist">${w.blocks.filter(b => b.items.length).map(b => `${many ? `<p class="label-medium wk-exblock">${esc(b.name)}</p>` : ''}<ul class="wk-exs">${
    b.items.map(it => { const ex = exById(it.ex); return ex ? `<li><button class="stateful" data-open="${esc(ex.id)}">${thumbFor(ex)}<span class="body-medium">${esc(ex.name)}</span></button></li>` : ''; }).join('')}</ul>`).join('')}</div>`;
}
function deleteWorkout(id) {
  const w = wkById(id); if (!w || isLibWorkout(w)) return;
  WK.list = WK.list.filter(x => x !== w); saveWorkouts();
  const sess = loadSession(); if (sess && sess.wid === id) dropSession();
  WK_OPEN.delete(id); renderWorkouts(); snack(`Deleted ${w.name}`);
}
/* the library's workouts in the order this person put them (new library workouts go at the end) */
const LIB_ORDER_KEY = 'nstructr-libwk-order-v1';
function orderLibrary() {
  let order = []; try { order = JSON.parse(localStorage.getItem(LIB_ORDER_KEY) || '[]'); } catch (e) { }
  const at = id => { const i = order.indexOf(id); return i < 0 ? 1e9 : i; };
  LIB_WK.sort((a, b) => at(a.libId) - at(b.libId));
}
(() => {
  const lists = [$('#wkList'), $('#libWkList')];
  let drag = null, swipe = null;
  const closeSwipes = except => document.querySelectorAll('.wk-card.swiped').forEach(c => { if (c !== except) { c.classList.remove('swiped'); c.querySelector('.wk-face').style.transform = ''; } });
  for (const list of lists) {
    list.addEventListener('pointerdown', e => {
      const card = e.target.closest('.wk-card'); if (!card) return;
      if (e.target.closest('[data-wkhandle]')) {                 // reorder
        e.preventDefault(); closeSwipes();
        card.setPointerCapture(e.pointerId); drag = { card, list, id: e.pointerId }; card.classList.add('dragging'); return;
      }
      if (list.dataset.list !== 'mine' || (e.target.closest('button, a') && !e.target.closest('[data-wtoggle]'))) return;   // swipe from the name or the card
      swipe = { card, x0: e.clientX, y0: e.clientY, id: e.pointerId, base: card.classList.contains('swiped') ? -88 : 0, moved: false };
    });
    list.addEventListener('pointermove', e => {
      if (drag && e.pointerId === drag.id) {
        const before = [...drag.list.children].find(c => c !== drag.card && e.clientY < c.getBoundingClientRect().top + c.offsetHeight / 2) || null;
        if (drag.card.nextElementSibling !== before) drag.list.insertBefore(drag.card, before);
        return;
      }
      if (!swipe || e.pointerId !== swipe.id) return;
      const dx = e.clientX - swipe.x0, dy = e.clientY - swipe.y0;
      if (!swipe.moved) { if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) { if (Math.abs(dy) > 10) swipe = null; return; } swipe.moved = true; swipe.card.setPointerCapture(e.pointerId); closeSwipes(swipe.card); swipe.card.classList.add('swiping'); }
      swipe.card.querySelector('.wk-face').style.transform = `translateX(${Math.max(-110, Math.min(0, swipe.base + dx))}px)`;
    });
    const end = e => {
      if (drag && e.pointerId === drag.id) {
        drag.card.classList.remove('dragging');
        const ids = [...drag.list.children].map(c => c.dataset.wk);
        if (drag.list.dataset.list === 'mine') { WK.list = ids.map(id => WK.list.find(w => w.id === id)).filter(Boolean); saveWorkouts(); }
        else { try { localStorage.setItem(LIB_ORDER_KEY, JSON.stringify(ids.map(id => (LIB_WK.find(w => w.id === id) || {}).libId))); } catch (err) { } orderLibrary(); }
        drag = null; return;
      }
      if (!swipe || e.pointerId !== swipe.id) return;
      const { card, moved, base } = swipe, dx = e.clientX - swipe.x0; swipe = null;
      card.classList.remove('swiping');
      if (!moved) { if (card.classList.contains('swiped')) { closeSwipes(); e.preventDefault(); } return; }
      const open = base + dx < -44;
      card.classList.toggle('swiped', open); card.querySelector('.wk-face').style.transform = open ? 'translateX(-88px)' : '';
      card.dataset.justSwiped = '1'; setTimeout(() => delete card.dataset.justSwiped, 0);
    };
    list.addEventListener('pointerup', end); list.addEventListener('pointercancel', end);
    list.addEventListener('click', e => {
      const card = e.target.closest('.wk-card'); if (!card) return;
      if (card.dataset.justSwiped) { e.stopPropagation(); e.preventDefault(); return; }          // the click that ends a swipe
      if (card.classList.contains('swiped') && !e.target.closest('[data-wdel]')) { e.stopPropagation(); e.preventDefault(); closeSwipes(); return; }
      const t = e.target.closest('[data-wtoggle]');
      if (t) { e.stopPropagation(); const id = t.dataset.wtoggle; WK_OPEN.has(id) ? WK_OPEN.delete(id) : WK_OPEN.add(id);
        card.classList.toggle('open', WK_OPEN.has(id)); card.querySelector('.wk-details').hidden = !WK_OPEN.has(id); t.setAttribute('aria-expanded', String(WK_OPEN.has(id))); }
      const d = e.target.closest('[data-wdel]'); if (d) { e.stopPropagation(); deleteWorkout(d.dataset.wdel); }
    }, true);
  }
  addEventListener('pointerdown', e => { if (!e.target.closest('.wk-card.swiped')) closeSwipes(); }, true);
})();


/* ---------- editor ---------- */
let EDIT = null;
function renderEditor() {
  const w = EDIT; if (!w) return;
  if (document.activeElement !== $('#wkName')) $('#wkName').value = w.name;
  $('#view-workout [data-wact="duplicateWorkout"]').disabled = !w.blocks.some(b => b.items.length);   // nothing to copy yet
  const eq = workoutEquipment(w);
  $('#wkSummary').innerHTML = `<span class="chip"><span class="icon">schedule</span>About ${fmtMin(workoutSeconds(w))}</span>
    <span class="chip"><span class="icon">format_list_numbered</span>${plural(w.blocks.flatMap(b => b.items).length, { one: '# exercise', other: '# exercises' })}</span>
    ${eq.map(q => `<span class="chip"><span class="icon">handyman</span>${esc(q)}</span>`).join('')}`;
  const mg = workoutMusclesHTML(w, false);
  $('#wkMusclesBox').hidden = !mg; $('#wkMuscles').innerHTML = mg;
  $('#wkBlocks').innerHTML = w.blocks.map((b, bi) => `<section class="block" data-block="${b.id}">
    <div class="block-head"><input value="${esc(b.name)}" data-bname="${b.id}" aria-label="Block name"><span class="count">${(b.rounds || 1) > 1 ? `<span class="icon" style="font-size:16px;vertical-align:-3px">repeat</span> ${plural(b.rounds, { one: '# round', other: '# rounds' })}, ` : ''}${plural(b.items.length, { one: '# exercise', other: '# exercises' })}, ${fmtMin(blockSeconds(b, w))}</span>
      <button class="icon-btn stateful" data-bmenu="${b.id}" aria-label="Block options"><span class="icon">more_vert</span></button></div>
    <ul class="items" data-items="${b.id}">${b.items.map(it => {
      const ex = exById(it.ex);
      return `<li class="wi" data-uid="${it.uid}"><span class="handle" data-handle aria-hidden="true"><span class="icon">drag_indicator</span></span>
        ${ex ? `<button class="wi-thumb stateful" data-open="${esc(ex.id)}" aria-label="Open ${esc(ex.name)}" title="Open the exercise">${thumbFor(ex)}</button>` : ''}<button class="open stateful" data-iedit="${it.uid}"><span class="txt"><span class="title-small">${esc(ex ? ex.name : it.ex)}</span><span class="body-small muted">${esc(itemSummary(it))}</span></span></button>
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
    const b = EDIT.blocks[bi];
    if (b.items.length && !(await ask(`Delete "${b.name}"?`, plural(b.items.length, { one: 'Its # exercise goes too.', other: 'Its # exercises go too.' }), 'Delete', true))) return;
    EDIT.blocks.splice(EDIT.blocks.indexOf(b), 1);
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
  const it = f.item; if (!exById(it.ex)) return;
  ITEM_EDIT = { ...it }; $('#itemDialog').dataset.mode = '';
  renderItemForm();
  $('#itemDialog').showModal();
}
/* the item dialog's form, for ITEM_EDIT (again after a swap to an easier, harder or other-equipment version) */
function renderItemForm() {
  const ex = exById(ITEM_EDIT.ex), f = findItem(ITEM_EDIT.uid), was = f && f.item.ex !== ITEM_EDIT.ex && exById(f.item.ex);
  $('#itemTitle').textContent = ex.name;
  const stepper = (key, label, min, max, step, unit) => `<div class="form-row"><span class="lbl">${label}</span><div class="stepper">
    <button class="icon-btn stateful" data-step-key="${key}" data-delta="${-step}" data-min="${min}" data-max="${max}" aria-label="Less"><span class="icon">remove</span></button>
    <output id="st-${key}">${ITEM_EDIT[key]}${unit}</output>
    <button class="icon-btn stateful" data-step-key="${key}" data-delta="${step}" data-min="${min}" data-max="${max}" aria-label="More"><span class="icon">add</span></button></div></div>`;
  const seg = (key, label, opts) => `<div class="form-row"><span class="lbl">${label}</span><div class="segmented" role="group" aria-label="${label}">${opts.map(([v, l]) =>
    `<button class="stateful" data-seg-key="${key}" data-val="${v}" aria-pressed="${String(ITEM_EDIT[key]) === String(v)}"><span class="icon">check</span>${esc(l)}</button>`).join('')}</div></div>`;
  const bl = ex.bilateral && ex.bilateral.labels, dl = ex.direction && ex.direction.labels;
  $('#itemForm').innerHTML = (was ? `<div class="note" role="status"><span class="icon">swap_horiz</span><span class="body-medium">Swapped from ${esc(was.name)}. Save to keep it.</span></div>` : '') +
    (ex.measure === 'time' ? stepper('seconds', 'Hold for', 5, 600, 5, ' s') : stepper('reps', ex.repName && ex.repName !== 'rep' ? `${cap(ex.repName)}s` : 'Reps', 1, 200, 1, '')) +
    stepper('sets', 'Sets', 1, 10, 1, '') +
    (bl ? seg('sides', 'Sides', [['L', bl.L || 'Left'], ['R', bl.R || 'Right'], ['both', 'Both'], ['alternate', 'Alternate']]) : '') +
    (dl ? seg('dir', 'Direction', [['A', dl.A], ['B', dl.B], ['both', 'Both'], ['alternate', 'Alternate']]) : '') +
    '<div class="form-row" id="orderRow" hidden></div>' +
    (ex.measure === 'time' ? '' : `<div class="form-row"><span class="lbl">Seconds per ${esc(ex.repName || 'rep')}<span class="body-small muted" style="display:block">Usual: ${round1(repSeconds(ex))} s</span></span><div class="stepper">
      <button class="icon-btn stateful" data-rep-delta="-0.1" aria-label="Faster"><span class="icon">remove</span></button>
      <input id="st-repSec" class="num-field" type="number" inputmode="decimal" step="0.1" min="${round1(Math.max(0.3, repSeconds(ex) / 4))}" max="${round1(repSeconds(ex) * 4)}" value="${round1(repSeconds(ex) / (ITEM_EDIT.tempo || 1))}" aria-label="Seconds per rep">
      <button class="icon-btn stateful" data-rep-delta="0.1" aria-label="Slower"><span class="icon">add</span></button></div></div>`) +
    `<p class="body-small muted" style="margin:0">${ex.measure === 'time' ? '' : (bl || dl) && (ITEM_EDIT.sides === 'both' || ITEM_EDIT.dir === 'both' || ITEM_EDIT.sides === 'alternate' || ITEM_EDIT.dir === 'alternate') ? 'Reps count for each side or direction. ' : ''}Estimated time: <span id="itemEst">${fmtMin(itemSeconds(ITEM_EDIT))}</span></p>` +
    (hasLinks(linksOf(ex)) ? `<div class="links"><h3 class="title-small">Swap for</h3>${linkRowsHTML(linksOf(ex), 'data-swapto')}</div>` : '');
  renderOrder();
}
/* with more than one side-and-direction combination, the order they come in (↑ ↓ to move one) */
function renderOrder() {
  const row = $('#orderRow'), ex = ITEM_EDIT && exById(ITEM_EDIT.ex); if (!row || !ex) return;
  const segs = itemSegments(ITEM_EDIT);
  if (ITEM_EDIT.order && itemSegments({ ...ITEM_EDIT, order: null }).map(x => x.side + x.dir).join() === segs.map(x => x.side + x.dir).join()) ITEM_EDIT.order = null;
  row.hidden = segs.length < 2;
  row.innerHTML = segs.length < 2 ? '' : `<span class="lbl">Order</span><ol class="order-list">${segs.map((x, i) => `<li><span class="num">${i + 1}</span><span class="t">${esc(segName(ex, ITEM_EDIT, x))}</span>
    <button class="icon-btn stateful" data-omove="${i}" data-odelta="-1" aria-label="Move up"${i ? '' : ' disabled'}><span class="icon">arrow_upward</span></button>
    <button class="icon-btn stateful" data-omove="${i}" data-odelta="1" aria-label="Move down"${i < segs.length - 1 ? '' : ' disabled'}><span class="icon">arrow_downward</span></button></li>`).join('')}</ol>`;
}
$('#itemForm').addEventListener('click', e => {
  const m = e.target.closest('[data-omove]');
  if (m && ITEM_EDIT) {
    const keys = itemSegments(ITEM_EDIT).map(x => x.side + x.dir), i = +m.dataset.omove, j = i + +m.dataset.odelta;
    if (j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j], keys[i]]; ITEM_EDIT.order = keys; renderOrder();
    const again = $(`#orderRow [data-omove="${j}"][data-odelta="${m.dataset.odelta}"]`) || $(`#orderRow [data-omove="${j}"]`); if (again) again.focus();
    return;
  }
});
$('#itemForm').addEventListener('click', e => {
  const s = e.target.closest('[data-step-key]');
  if (s) {
    const k = s.dataset.stepKey, v = Math.min(+s.dataset.max, Math.max(+s.dataset.min, (+ITEM_EDIT[k] || 0) + +s.dataset.delta));
    ITEM_EDIT[k] = v; $('#st-' + k).textContent = v + (k === 'seconds' || k === 'rest' ? ' s' : '');
  }

  const g = e.target.closest('[data-seg-key]');
  if (g) {
    const k = g.dataset.segKey; ITEM_EDIT[k] = k === 'tempo' ? +g.dataset.val : g.dataset.val;
    if (k === 'sides' || k === 'dir') { ITEM_EDIT.order = null; renderOrder(); }
    g.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === g)));
  }
  if (s || g) $('#itemEst').textContent = fmtMin(itemSeconds(ITEM_EDIT));
});
/* seconds per rep -> the item's tempo (kept as a multiplier in files, so older files mean the same) */
holdRepeat($('#itemForm'), '[data-rep-delta]', b => { const f = $('#st-repSec'); f.value = round1((+f.value || 0) + +b.dataset.repDelta); setRepSeconds(); f.value = round1(repSeconds(exById(ITEM_EDIT.ex)) / (ITEM_EDIT.tempo || 1)); });
function setRepSeconds() {
  const f = $('#st-repSec'), ex = ITEM_EDIT && exById(ITEM_EDIT.ex); if (!f || !ex) return;
  const nat = repSeconds(ex), sec = Math.min(+f.max, Math.max(+f.min, round1(+f.value || nat)));
  ITEM_EDIT.tempo = sec === round1(nat) ? 1 : Math.round(nat / sec * 1000) / 1000;
  $('#itemEst').textContent = fmtMin(itemSeconds(ITEM_EDIT));
}
$('#itemForm').addEventListener('change', e => { if (e.target.id === 'st-repSec') { setRepSeconds(); const f = e.target, ex = exById(ITEM_EDIT.ex); f.value = round1(repSeconds(ex) / (ITEM_EDIT.tempo || 1)); } });
$('#itemForm').addEventListener('input', e => { if (e.target.id === 'st-repSec' && e.target.value !== '') setRepSeconds(); });
$('#itemSave').addEventListener('click', () => {
  if ($('#itemDialog').dataset.mode === 'block') {
    const b = EDIT.blocks.find(x => x.id === BLOCK_EDIT.id); if (b) { b.rounds = BLOCK_EDIT.rounds; b.roundRest = BLOCK_EDIT.roundRest; }
    $('#itemDialog').dataset.mode = ''; $('#itemDialog').close(); commitEdit(); return;
  }
  if (!ITEM_EDIT.order) delete ITEM_EDIT.order;
  const f = findItem(ITEM_EDIT.uid); if (f) { Object.assign(f.item, ITEM_EDIT); if (!ITEM_EDIT.order) delete f.item.order; }
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
/* swap the item to an easier, harder or other-equipment version (saved with the dialog's Save) */
$('#itemForm').addEventListener('click', e => {
  const b = e.target.closest('[data-swapto]'), ex = b && ITEM_EDIT && exById(b.dataset.swapto); if (!ex) return;
  ITEM_EDIT = swapItem(ITEM_EDIT, ex); renderItemForm(); $('#itemForm').scrollTop = 0;
});
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
  const list = allExercises().filter(ex => !q || [ex.name, ...otherNames(ex), ex.focus, ex.category, ...(ex.collections || []), ...(ex.equipment || []), ...muscleWords(ex)].some(s => String(s || '').toLowerCase().includes(q)));
  $('#pickList').innerHTML = list.slice(0, 200).map(ex => `<li><label><input type="checkbox" data-pick="${esc(ex.id)}"${PICK.chosen.has(ex.id) ? ' checked' : ''}>
    ${thumbFor(ex)}<span class="txt"><span class="title-small">${esc(ex.name)}</span><span class="body-small muted">${esc((ex.collections || [])[0] || typeOf(ex))}</span></span></label></li>`).join('');
  $('#pickAdd').textContent = PICK.chosen.size ? `Add ${PICK.chosen.size}` : 'Add';
  $('#pickAdd').disabled = !PICK.chosen.size;
}
function openPicker(blockId) { PICK = { block: blockId, chosen: new Set() }; $('#pickSearch').value = ''; renderPicker(); $('#pickDialog').showModal(); }
$('#pickSearch').addEventListener('input', renderPicker);
$('#pickList').addEventListener('change', e => { const c = e.target.closest('[data-pick]'); if (!c) return; c.checked ? PICK.chosen.add(c.dataset.pick) : PICK.chosen.delete(c.dataset.pick); $('#pickAdd').textContent = PICK.chosen.size ? `Add ${PICK.chosen.size}` : 'Add'; $('#pickAdd').disabled = !PICK.chosen.size; });
$('#pickAdd').addEventListener('click', () => {
  const b = EDIT.blocks.find(x => x.id === PICK.block) || EDIT.blocks[EDIT.blocks.length - 1];
  for (const id of PICK.chosen) { const ex = exById(id); if (ex) b.items.push(newItem(ex)); }
  $('#pickDialog').close(); commitEdit(); snack(plural(PICK.chosen.size, { one: 'Added # exercise', other: 'Added # exercises' }));
});

/* export / import */
function workoutJSON(w) {
  const custom = [...new Set(w.blocks.flatMap(b => b.items).map(i => i.ex))].filter(id => !findInDb(id)).map(exById).filter(Boolean);
  return JSON.stringify({ format: 'nstructr/workout', version: FILE_VERSION, workouts: [{ ...w, restBetween: undefined }], ...(custom.length ? { exercises: custom } : {}) }, null, 2);
}
function importWorkouts(data) {
  if (!data || !Array.isArray(data.workouts)) return [];
  const out = [];
  data.workouts.forEach((w, i) => {
    if (!w || typeof w.name !== 'string' || !Array.isArray(w.blocks)) throw new Error(`workouts[${i}] needs a "name" and "blocks".`);
    const clean = {
      id: (w.id && !wkById(w.id)) ? String(w.id) : uid(), name: w.name,
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


/* ===================== Workout player ===================== */
const WP = { w: null, flat: [], i: 0, set: 0, seg: 0, phase: 'idle', restLeft: 0, restNext: null, started: 0, beeped: {} };
function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; } }
function saveSession() { if (WP.test) return; try { localStorage.setItem(SESSION_KEY, JSON.stringify({ wid: WP.w.id, i: WP.i, ...(Object.keys(WP.swaps || {}).length ? { swaps: WP.swaps } : {}) })); } catch (e) { } }
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
   dropIfBusy: skip this line if something is still being said (rep counts, milestones). NstructR and NstructR+ say the
   same lines (counts, milestones, encouragement since Oct 2026); only NstructR+ adds the walk-through. */
let SAY_UNTIL = 0;                                               // when the lines queued so far should all have been said
function say(text, { dropIfBusy = false } = {}) {
  if (!/[\p{L}\p{N}]/u.test(text || '')) return Promise.resolve();   // nothing to say (a voice reads a lone "." as "dot")
  caption(text);
  const on = (WK.sound === 'voice' || WK.sound === 'coach') && 'speechSynthesis' in window;
  if (!on || !text) return Promise.resolve();
  try {
    if (dropIfBusy && (speechSynthesis.speaking || speechSynthesis.pending)) return Promise.resolve();
    return new Promise(res => {
      let done = false, timer = 0; const fin = () => { if (!done) { done = true; clearTimeout(timer); res(); } };
      const u = new SpeechSynthesisUtterance(text); u.lang = LANG; u.rate = speechRate();   // the voice for the text's language, not the phone's
      u.onend = fin; u.onerror = fin;
      // never wait forever on a voice that doesn't report back: give up this long after the line starts (or, with no
      // start reported, after the lines queued before it should be done too). Oct 2026: counted from when it was
      // queued, a line behind others gave up before it was said: "Ready… Begin." let the count start early, "1" came
      // late and "2" was dropped as it was still talking ("1. 3.")
      const ms = 1500 + text.split(/\s+/).length * 450 / Math.min(1, speechRate()), now = performance.now();
      SAY_UNTIL = Math.max(now, SAY_UNTIL) + ms;
      timer = setTimeout(fin, SAY_UNTIL - now);
      u.onstart = () => { clearTimeout(timer); timer = setTimeout(fin, ms); };
      try { speechSynthesis.speak(u); } catch (e) { fin(); }        // a throw here would otherwise leave a guided step waiting forever
    });
  } catch (e) { return Promise.resolve(); }
}
let CAP_T = 0;
function caption(text) {
  const el = $('#wpCaption'); if (!el) return;
  el.innerHTML = `<span>${esc(text)}</span>`; el.classList.add('show');
  clearTimeout(CAP_T); CAP_T = setTimeout(() => el.classList.remove('show'), 1800 + text.split(/\s+/).length * 380);
}
function hush() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { } WP.speaking = false; SAY_UNTIL = 0; }
/* the Instruction setting. Stored values stay as they were (HANDOFF §11); the names changed twice in Oct 2026: 'voice' is
   shown as "NstructR" (was "Voice", then "Coach"), 'coach' as "NstructR+" (was "Coach", then "Instructor") */
const SOUND_MODES = [['off', 'volume_off', 'Silent'], ['beeps', 'notifications', 'Beeps'], ['voice', 'record_voice_over', 'NstructR'], ['coach', 'sports', 'NstructR+']];
function setSound(mode) {
  WK.sound = mode; try { localStorage.setItem(SOUND_KEY, mode); } catch (e) { }
  const m = SOUND_MODES.find(x => x[0] === mode) || SOUND_MODES[1];
  if ($('#wpSound')) { $('#wpSound .icon').textContent = m[1]; $('#wpSoundLabel').textContent = m[2]; $('#wpSound').setAttribute('aria-label', `Instruction: ${m[2]}. Tap to change.`); }
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
  for (const s of sides) for (const d of dirs) out.push({ side: s, dir: d });   // default: every direction on one side, then the other side
  // the user's own order ("order": ["LA", "RA", "LB", "RB"]), when it is exactly these combinations
  const key = x => x.side + x.dir, o = item.order;
  if (Array.isArray(o) && o.length === out.length && out.every(x => o.includes(key(x)))) return o.map(k => out.find(x => key(x) === k));
  return out;
}
function segName(ex, item, x) {                     // "Right leg, across first"
  const bl = ex.bilateral && ex.bilateral.labels, dl = ex.direction && ex.direction.labels, bits = [];
  if (item.sides === 'both') bits.push(bl ? bl[x.side] : x.side === 'L' ? 'First side' : 'Second side');
  if (item.dir === 'both') bits.push(dl ? dl[x.dir] : x.dir);
  return bits.join(', ');
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
// what NstructR+ has demonstrated: this appearance of the exercise (WP.i, its id: a swap is new) and, with segInfo, a side
// or direction of it
const demoKeyOf = (item, segInfo) => `${WP.i}:${item.ex}` + (segInfo ? `:${segInfo.side || ''}${segInfo.dir || ''}` : '');
function buildPlan(item, segInfo) {
  const ex = exById(item.ex), seg = { ...DEFAULT_SEGMENTS };
  const ph = phaseInfo(ex.keyframes), tempo = item.tempo || 1;
  const altSide = item.sides === 'alternate', altDir = item.dir === 'alternate';
  const versions = [];
  if (altSide) versions.push(resolveVersion(ex, seg, 'L', segInfo.dir), resolveVersion(ex, seg, 'R', segInfo.dir));
  else if (altDir) versions.push(resolveVersion(ex, seg, segInfo.side, 'A'), resolveVersion(ex, seg, segInfo.side, 'B'));
  else versions.push(resolveVersion(ex, seg, segInfo.side, segInfo.dir));
  const plan = [], meta = [];
  const push = (r, m = {}) => { plan.push(r); meta.push(m); };
  // NstructR+ demonstrates an exercise when you come to it, and each side or direction the first time it comes up; not
  // again for its next sets (owner, Oct 2026). A new appearance (later in the workout, a later round, a swap to an
  // easier or harder version) is demonstrated again: WP.shown holds what this appearance has shown (runCurrent)
  const shown = WP.shown || new Set(), demoKey = demoKeyOf(item, segInfo);
  const V0 = versions[0].R, guided = WK.sound === 'coach' && !shown.has(demoKey), voiced = WK.sound === 'coach' || WK.sound === 'voice';
  const cueOf = r => r.cue || r.name || '';
  const h = ex.measure === 'time' ? (ex.holdStep != null ? ex.holdStep : ph.start) : null;
  let holdCued = false;                                          // the run-through already read the held step's cue
  if (guided) {
    // walk through the exercise once, step by step: each step waits for both its animation and its spoken cue
    const label = segLabel(ex, item, segInfo);
    let first = true;
    // an instant step (like the seam where a circle starts again) has nothing to show, so it only carries the title
    // its first line names it; this appearance's first demonstration also says to watch, not join in yet ("Squat. Watch
    // me first. Feet hip-width apart."; owner, Oct 2026)
    const watch = !shown.has(demoKeyOf(item)) ? WATCH_FIRST + ' ' : '';
    const g = (r, extra = {}) => { push(r, { phase: 'guide', guided: true, say: ((first ? `${ex.name}${label ? ', ' + label : ''}. ${watch}` : '') + (r.dur && !r.quiet ? cueOf(r) : '')).trim(), ...extra }); first = false; };
    ph.setup.forEach(i => g(V0[i]));
    if (ex.measure === 'time') ph.rep.filter(i => i !== h).forEach(i => g(V0[i]));
    else versions.forEach(v => ph.rep.forEach(i => g(v.R[i])));
    if (first) { g(V0[ph.start]); holdCued = ph.start === h; }
  } else ph.setup.forEach(i => push(V0[i], { phase: 'setup' }));
  if (ex.measure === 'time') {
    // with a voice the count starts after "Ready… Hold for N seconds." (NstructR+ first reads the held step's own cue,
    // how to get into the pose, unless the run-through just did)
    const cue = guided && !holdCued && !V0[h].quiet ? cueOf(V0[h]).trim() : '';
    const holdSay = () => `${cue ? cue + (/[.!?…]$/.test(cue) ? ' ' : '. ') : ''}Ready… ${plural(item.seconds, { one: 'Hold for # second.', other: 'Hold for # seconds.' })}`;
    ph.rep.forEach(i => push(i === h ? { ...V0[i], hold: item.seconds * 1000 * tempo } : V0[i], i === h ? { phase: 'hold', seconds: item.seconds, ...(voiced ? { say: holdSay() } : {}) } : { phase: 'rep' }));
  } else {
    // with a voice, "Ready… Begin." as it gets into the starting pose; the count ("1", "2" …) starts once it's said
    if (voiced) push({ ...V0[ph.start], hold: 0 }, { phase: 'ready', ready: true, say: READY_BEGIN });
    const total = item.reps * versions.length;
    for (let k = 0; k < total; k++) {
      const V = versions[k % versions.length].R;
      // a step's call ("Forward", "Out to the right") as it starts; never on the rep's first step, where the count is said.
      // Rep 1's first step is already in place after "Ready… Begin.": it waits as long as the move would have taken, so
      // the rep keeps its rhythm and "1" has time before the next step's call
      ph.rep.forEach((i, j) => push(voiced && k === 0 && j === 0 ? { ...V[i], dur: 0, hold: V[i].hold + V[i].dur } : V[i], { phase: 'rep', repNo: j === 0 ? Math.floor(k / versions.length) + 1 : null, repOf: item.reps, alt: versions.length > 1 ? k % versions.length : null, ...(voiced && j > 0 && V[i].call ? { call: V[i].call } : {}) }));
    }
  }
  const VL = versions[versions.length - 1].R;
  ph.finish.forEach(i => push(VL[i], { phase: 'finish' }));
  plan.walls = V0.walls; plan.supports = V0.supports;
  return { plan, meta, ex, seg, props: versions[0].props, tempo, demoKey: guided ? demoKey : null };
}
/* Between two exercises the figure doesn't jump: when one ends in the position the next starts in (standing, all
   fours, lying on the back…; src/positions.js), it moves through that position's at-rest pose into the next exercise,
   and the camera turns and the frame pans and zooms with it. Otherwise (a change of position, equipment it rests on,
   a position it can't place) the old picture crossfades into the new one. Oct 2026. */
const POS_CACHE = new WeakMap();                                 // per exercise object: an edited exercise is worked out again
const posOf = ex => { if (!POS_CACHE.has(ex)) POS_CACHE.set(ex, POSITIONS_EX.positionsOf(ex)); return POS_CACHE.get(ex); };
const SIDE_CAM = 90;
const REST_MS = 1000, ARRIVE_MS = 800, XFADE_MS = 350;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// the frames from one exercise into the next, or null (a crossfade): through the at-rest pose of the position the last
// ended in and, when the next starts in another, along the quickest route of moves between positions (src/positions.js:
// stand -> half kneel -> kneel -> all fours -> lie down…). They stand halfway between where the last exercise left the
// figure and where the next one starts (at their own spot on the floor the figure, and the view following it, would go
// out there and back: a bounce), and the camera turns from the last exercise's to the next one's along the way.
function transitionFrames(fromEx, toEx, fromLast, toFirst, onlyIfMoving = false) {
  const seg = { ...DEFAULT_SEGMENTS }, at = f => { const g = frameAt(f, f, 1, seg); return fkAt(g.pose, seg, g.pos); };
  let a = posOf(fromEx).end, b = posOf(toEx).start;
  if (!a || !b) return null;
  const A = at(fromLast), B = at(toFirst);
  // lying on the side: which side this exercise (or this side of it) lies on
  if (a === 'side-lying') a = POSITIONS_EX.lyingSide(A, seg);
  if (b === 'side-lying') b = POSITIONS_EX.lyingSide(B, seg);
  // a side-lying exercise's other side is mirrored, head the other way: no honest move between them (a crossfade)
  if (a.startsWith('side-lying') && b.startsWith('side-lying') && a !== b) return onlyIfMoving ? 'fade' : null;
  const route = POSITIONS_EX.positionPath(a, b); if (!route || (onlyIfMoving && !route.length)) return null;
  const kfs = [{ name: POSITIONS_EX.LABELS[a], ...POSITIONS_EX.REST[a], durationMs: REST_MS, holdMs: route.length ? 0 : 150 }, ...route.map((k, i) => ({ ...k, holdMs: i === route.length - 1 ? 150 : 0 }))];
  // lying face down, the arms are by the sides in some exercises (Cobra) and overhead in others (Superman): the last rest
  // pose takes the next exercise's, so they move as the body lowers rather than sweep through the floor after
  if (b === 'prone') { const last = kfs[kfs.length - 1], arm = {}; for (const j of ['shoulderL', 'shoulderR', 'elbowL', 'elbowR']) if (toFirst.pose[j] != null) arm[j] = toFirst.pose[j]; kfs[kfs.length - 1] = { ...last, pose: { ...last.pose, ...arm } }; }
  const R = resolveSequence(kfs, seg, { keyframes: kfs }, []);                // on the floor: no equipment on the way
  // each step takes as long as the body has to travel (standing to a crouch is a long way, kneeling to all fours short)
  const far = (P, Q) => Math.max(...['head', 'pelvis', 'handL', 'handR', 'ankleL', 'ankleR'].map(k => V3.dist(P[k], Q[k])));
  // where each end is: the feet when standing (in front of the chair, under the bar, not in or on them), else the pelvis.
  // The first rest pose is where the last exercise left the figure, the last where the next one starts, the steps
  // between spread along the way; a single rest pose (the same position) stands halfway
  const spot = (P, pos) => pos === 'standing' ? V3.lerp(P.ankleL, P.ankleR, .5) : P.pelvis;
  const RP = R.map(at), n = R.length;
  const s0 = V3.sub(spot(A, a), spot(RP[0], a)), s1 = V3.sub(spot(B, b), spot(RP[n - 1], b));
  R.forEach((r, i) => { r.dur = Math.round(Math.min(1500, Math.max(600, 350 + 5 * far(i ? RP[i - 1] : A, RP[i])))); });
  // lying on the back runs head to toe away from the camera's usual side view, lying on the side across it: on the way
  // to or from the side the camera turns a quarter so the back-lying steps are seen lengthwise too
  const lyingBack = kfs.map(k => k.name === POSITIONS_EX.LABELS.supine || k.name === 'Arm up');
  const sideTurn = i => !lyingBack[i] ? 0 : (b.startsWith('side-lying') ? SIDE_CAM * (b === 'side-lying' ? 1 : -1) : a.startsWith('side-lying') ? SIDE_CAM * (a === 'side-lying' ? 1 : -1) : 0);
  return R.map((r, i) => {
    const d = V3.lerp(s0, s1, n > 1 ? i / (n - 1) : .5);
    return { ...r, rule: { ...r.rule, x: num(r.rule.x) + d.x, z: num(r.rule.z) + d.z }, step: -1,
      cam: fromLast.cam + (toFirst.cam - fromLast.cam) * (i + 1) / n + sideTurn(i) };   // the camera turns from the last exercise's to the next one's
  });
}
// during a rest: the figure is still moving into the next exercise's first pose
const onTheWay = () => WP.phase === 'rest' && S.trans > 0 && (S.idx < S.trans || S.t < S.resolved[S.trans].dur);
function stagePlan(p, minMs = 0) {
  const prevLast = S.mode === 'workout' && S.resolved.length ? S.resolved[S.idx] : null;
  const prevEx = S.ex, exChanged = !S.ex || S.ex.id !== p.ex.id;
  const fromBox = scene.getAttribute('viewBox'), drawnX = S.drawnX;
  let plan = p.plan, meta = p.meta, trans = 0, fade = false;
  // a new exercise; or the same one's other side when that is another position (Clamshell: from one side, onto the back,
  // onto the other; straight across it flipped through the air)
  if (prevLast && !reducedMotion() && (exChanged || prevEx)) {
    let way = transitionFrames(prevEx, p.ex, prevLast, plan[0], !exChanged);
    if (way === 'fade') { way = null; fade = true; }
    if (way) {
      const arrive = { ...plan[0], dur: Math.max(plan[0].dur, ARRIVE_MS) };    // into the first step from the last rest pose
      plan = Object.assign([...way, arrive, ...plan.slice(1)], { walls: plan.walls, supports: plan.supports });
      meta = [...way.map(() => ({ phase: 'transition' })), ...meta]; trans = way.length;
    } else if (exChanged) fade = true;
  }
  // an equipment change with no rest: the way into the next exercise lasts at least as long as saying what to do; with no
  // way in (a crossfade, reduced motion) the first pose waits that long
  if (minMs > 0) {
    const span = plan.slice(0, trans + 1).reduce((t, r, i) => t + r.dur + (i < trans ? r.hold : 0), 0);
    if (trans && span < minMs) { const k = minMs / span; plan = Object.assign(plan.map((r, i) => i <= trans ? { ...r, dur: Math.round(r.dur * k), hold: i < trans ? Math.round(r.hold * k) : r.hold } : r), { walls: plan.walls, supports: plan.supports }); }
    else if (!trans) { plan = Object.assign([{ ...plan[0], dur: 0, hold: minMs, step: -1 }, ...plan], { walls: plan.walls, supports: plan.supports }); meta = [{ phase: 'transition' }, ...meta]; trans = 1; }
  }
  if (fade) crossfadeScene();
  // the last exercise's equipment (and band or weights) fades out as the figure leaves it; the next one's fades in as it
  // arrives (draw in src/app/1-engine.js)
  S.oldProps = trans ? { back: $('#propsBack').innerHTML, front: $('#propsFront').innerHTML, shift: S.shiftX } : null;
  S.mode = 'workout'; S.ex = p.ex; S.seg = p.seg; S.props = p.props; S.tempo = p.tempo; S.speed = 1;
  S.resolved = plan; S.planMeta = meta; S.trans = trans; S.idx = 0; S.prev = null; S.from = prevLast; S.planDone = false; S.t = 0;
  S.bandRest = bandRestLengths(S.props, plan, S.seg);
  // travelling: how far along each step of the plan is (each rep carries on from where the last one ended)
  S.travel = !!p.ex.travel; S.phase = phaseInfo(p.ex.keyframes); S.offs = [{ x: 0, z: 0 }];
  for (let i = 1; i < plan.length; i++) {
    const a = plan[i - 1], b = plan[i], o = S.offs[i - 1];
    const d = S.travel && a.step === S.phase.end && b.step === S.phase.start ? travelOf(a, b, S.seg) : { x: 0, z: 0 };
    S.offs.push({ x: o.x + d.x, z: o.z + d.z });
  }
  const own = plan.slice(trans);                                   // the frame fits the exercise, not the way into it
  const { minX, maxX } = sequenceSpan(own, S.seg, 0, S.travel);
  S.shiftX = isFinite(minX) ? W / 2 - (minX + maxX) / 2 : 0;
  if (exChanged) { buildFigure(); buildGuide(); }
  frameScene(own);
  S.glide = null;
  if (S.from && (exChanged || fade) && !trans) { S.from = null; return; }   // a cut: the new exercise (or side) starts from its own first position
  if (!S.from || reducedMotion() || !isFinite(drawnX)) return;
  // carrying on from the last pose (the next exercise, set or side): the figure goes from where it was on screen to
  // where it will be in one smooth move, whatever way the body goes (a side is placed elsewhere; a travelling exercise
  // had moved along; the rest pose is between), and the frame zooms to the new one around the middle of the screen
  const first = frameAt(plan[trans], plan[trans], 1, S.seg), x1 = S.travel ? W / 2 : project(fkAt(first.pose, S.seg, first.pos), first.cam).pelvis.x + S.shiftX;
  const steps = plan.slice(0, trans + 1).map((r, i) => r.dur + (i < trans ? r.hold : 0)), total = steps.reduce((t, d) => t + d, 0);
  const ms = Math.max(total / (S.tempo || 1), 600);
  if (total > 0) S.glide = { steps, total, last: trans, x0: drawnX, x1, toShift: S.shiftX };
  glideView(fromBox, scene.getAttribute('viewBox'), ms, trans ? boxFor(plan.slice(0, trans)) : null);
}
/* zoom (and pan) from the old frame to the new one in one smooth move (one ease from start to end: it never stops on
   the way); if a pose passed through (viaBox) is bigger than the frame halfway, the halfway frame grows to fit it,
   around its own middle, so the view breathes out and in rather than swinging sideways */
let GLIDE = 0;
function glideView(fromBox, toBox, ms, viaBox) {
  const nums = b => (b || '').split(' ').map(Number), ok = v => v.length === 4 && !v.some(isNaN);
  const a = nums(fromBox), c = nums(toBox), v = nums(viaBox);
  if (!ok(a) || !ok(c)) return;
  let m = a.map((x, i) => (x + c[i]) / 2);
  if (ok(v)) {
    const w = Math.max(m[2], v[2]), h = Math.max(m[3], v[3]);
    m = [m[0] + m[2] / 2 - w / 2, m[1] + m[3] - h, w, h];          // wider about the middle, taller upward (the floor stays put)
  }
  // a quadratic curve through the halfway frame: smooth, no stop in the middle
  const at = u => a.map((x, i) => { const k = 2 * m[i] - (x + c[i]) / 2; return (1 - u) * (1 - u) * x + 2 * u * (1 - u) * k + u * u * c[i]; });
  const t0 = performance.now(), id = ++GLIDE;
  const step = now => {
    if (id !== GLIDE || S.view !== 'wplay') return;
    const u = easeGlide(Math.min(1, (now - t0) / ms));
    scene.setAttribute('viewBox', at(u).map(x => x.toFixed(1)).join(' '));
    syncLimbWidth();
    if (now - t0 < ms) requestAnimationFrame(step);
  };
  scene.setAttribute('viewBox', fromBox);
  requestAnimationFrame(step);
}
/* the picture as it is fades out over the new one as it fades in */
function crossfadeScene() {
  GLIDE++;
  if (!scene.parentNode || !scene.getBoundingClientRect().width) return;
  const old = scene.cloneNode(true);
  old.removeAttribute('id'); old.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  old.setAttribute('aria-hidden', 'true'); old.removeAttribute('role'); old.removeAttribute('aria-label');
  old.style.cssText += `;position:absolute;left:${scene.offsetLeft}px;top:${scene.offsetTop}px;width:${scene.offsetWidth}px;height:${scene.offsetHeight}px;margin:0;pointer-events:none`;
  scene.parentNode.insertBefore(old, scene.nextSibling);
  const a = old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: XFADE_MS, easing: 'ease-in-out' });
  a.onfinish = a.oncancel = () => old.remove();
  scene.animate([{ opacity: 0 }, { opacity: 1 }], { duration: XFADE_MS, easing: 'ease-in-out' });
}

/* In the workout player the camera frames the whole exercise tightly (head to floor, both ends of the move),
   so the figure is as big as the screen allows. The overlays sit in bands above and below it. */
function boxFor(plan) {
  const { minX, maxX, minY } = sequenceSpan(plan, S.seg, S.shiftX, S.travel);
  if (!isFinite(minX)) return null;
  const pad = 26, top = minY - 20 - pad, h = FLOOR + 16 - top, wv = Math.max(maxX - minX + pad * 2, 120);
  return `${(minX + maxX) / 2 - wv / 2} ${top} ${wv} ${h}`;
}
function frameScene(plan) {
  GLIDE++;
  const box = boxFor(plan); if (!box) return;
  scene.setAttribute('viewBox', box);
  syncLimbWidth();
}
function resetScene() { scene.setAttribute('viewBox', '0 0 400 400'); syncLimbWidth(); }

/* test: started from the workout editor (Test): a trial run, so no Resume entry and nothing in History; leaving
   goes back to the editor */
function startWorkout(w, fromIndex = 0, swaps = null, test = false) {
  WP.w = w; WP.flat = flattenWorkout(w); WP.test = test; WP.log = test ? null : { start: Date.now(), done: [] }; WP.lastLogged = -1;
  if (!WP.flat.length) { snack('Add some exercises first.'); return; }
  WP.swaps = {}; WP.orig = {}; WP.shown = new Set(); WP.named = new Set();
  for (const [u, id] of Object.entries(swaps || {})) { const e = WP.flat.find(x => x.item.uid === u), to = exById(id); if (e && to) swapInSession(e.item, to); }   // resumed: this session's swaps again
  WP.i = Math.min(fromIndex, WP.flat.length - 1); WP.set = 0; WP.seg = 0; WP.started = Date.now(); WP.phase = 'work';
  unlockAudio(); wakeOn(); enterFullscreen(); setSound(WK.sound); keepStorage(); installDue();
  go(`#/wplay/${encodeURIComponent(w.id)}`);
  S.mode = 'start';                                               // no transition into the first exercise
  // a workout with equipment starts with a title card: its name and what to have at hand, then the first exercise
  const need = neededFrom(WP.flat, WP.i);
  if (need.length) { WP.phase = 'work'; const lines = [checklistLine(need)]; startRest(0, 'start', { seconds: equipSpoken([w.name, ...lines]), lines }); }
  else runCurrent(true);
  if (!WK.hinted) { WK.hinted = true; setTimeout(() => toast('Tap for controls'), 600); }
}
function current() { return WP.flat[WP.i]; }
/* Swap to an easier or harder version, for this session only (the workout asks at the end whether to keep it): the
   item, in every round still to come, becomes the new exercise; the set starts again, with NstructR+'s run-through. */
function swapInSession(item, to) {
  const u = item.uid, n = swapItem(item, to);
  if (!WP.orig[u]) WP.orig[u] = item;
  WP.flat.forEach(e => { if (e.item.uid === u) e.item = n; });
  if (to.id === WP.orig[u].ex) delete WP.swaps[u]; else WP.swaps[u] = to.id;
}
function swapCurrent(kind) {
  const cur = current(); if (!cur || WP.phase !== 'work') return;
  const to = linksOf(exById(cur.item.ex))[kind][0]; if (!to) return;
  logSets(cur, cur.item, WP.set - (cur.setBase || 0)); cur.setBase = WP.set;   // sets already done were the old exercise
  swapInSession(cur.item, to);
  hush(); WP.seg = 0; runCurrent(true); showControls(false, 1200);
  toast(`${kind === 'easier' ? 'Easier' : 'Harder'}: ${to.name}`);
}
/* after the workout: keep this session's swaps in the workout? (a library workout keeps them in the user's own copy) */
async function offerKeepSwaps(w, swaps) {
  const items = w.blocks.flatMap(b => b.items);
  const list = Object.entries(swaps || {}).map(([u, id]) => [items.find(x => x.uid === u), exById(id)]).filter(([it, to]) => it && to && exById(it.ex));
  if (!list.length) return;
  const lib = isLibWorkout(w);
  const text = list.map(([it, to]) => `${exById(it.ex).name} → ${to.name}`).join('\n') + (lib ? '\n\nThis is a library workout: the changes go in your own copy.' : '');
  if (!(await ask('Keep these changes in the workout?', text, 'Keep', false, null, "Don't keep"))) return;
  let target = w;
  if (lib) target = customizeWorkout(w);                          // the same blocks and items, in order, with new ids
  const where = u => { for (const [bi, b] of w.blocks.entries()) { const ii = b.items.findIndex(x => x.uid === u); if (ii >= 0) return target.blocks[bi].items[ii]; } return null; };
  for (const [it, to] of list) { const t = where(it.uid); if (t) Object.assign(t, swapItem(t, to)); }
  saveWorkouts(); renderWorkouts();
  snack(lib ? `Saved in your copy, "${target.name}".` : 'Changes saved in the workout.');
}
function runCurrent(announce) {
  const cur = current(); if (!cur) return finishWorkout();
  const segs = itemSegments(cur.item);
  const segInfo = segs[WP.seg] || segs[0];
  const p = buildPlan(cur.item, segInfo);
  if (p.demoKey) { WP.shown.add(p.demoKey); WP.shown.add(demoKeyOf(cur.item)); }   // demonstrated: not again for the next sets
  stagePlan(p, WP.equipChange ? WP.equipChange.seconds * 1000 : 0);
  WP.phase = 'work'; WP.beeped = {}; WP.rep = 0;
  $('#wpRest').hidden = true; $('#wpDone').hidden = true;
  S.playing = true; setWpPlay(true);
  S.onStep = onWorkStep; S.onPlanEnd = onWorkEnd;
  saveSession();
  renderWpInfo();
  if (announce) {
    const ex = p.ex, bl = ex.bilateral && ex.bilateral.labels, dl = ex.direction && ex.direction.labels;
    // the next set of the same exercise is "Set 2", not its name again (owner, Oct 2026); a new appearance or a swap names it
    const again = WP.set > 0 && WP.named.has(demoKeyOf(cur.item));
    const bits = [again ? `Set ${fmtNum(WP.set + 1)}` : ex.name];
    if (segs.length > 1 && WP.seg > 0) { const prev = segs[WP.seg - 1]; bits[0] = prev.side !== segInfo.side ? (prev.dir !== segInfo.dir ? 'Switch sides and direction' : 'Switch sides') : 'Switch direction'; }   // what actually changed
    if (cur.item.sides && cur.item.sides !== 'alternate' && bl) bits.push(bl[segInfo.side]);
    if (cur.item.dir && cur.item.dir !== 'alternate' && dl) bits.push(dl[segInfo.dir]);
    // NstructR+ demonstrating: "Switch sides." then the demonstration names it; not demonstrating (a later set): as NstructR
    const named = WK.sound !== 'coach' || !p.demoKey ? bits.join('. ') + '.' : WP.seg > 0 ? bits[0] + '.' : '';
    // (both at once: queued only after the equipment line had been said, the name could come after "Ready… Begin.",
    // which the first step queues once the move in, timed from an estimate of that line, is over)
    if (WP.equipChange) { const ch = WP.equipChange; setTimeout(() => { say(`${ch.lines.join('. ')}.`); if (named) say(named); }, EQUIP_PAD * 1000); }
    else if (named) say(named);
  }
  WP.named.add(demoKeyOf(cur.item));                             // its name has been said: the next set is "Set 2"
  WP.equipChange = null;
  S.canAdvance = i => !(S.planMeta[i] && (S.planMeta[i].guided || S.planMeta[i].ready) && WP.speaking);   // the run-through's cues, "Ready… Begin"
  S.holdWait = i => !!(S.planMeta[i] && S.planMeta[i].phase === 'hold' && S.planMeta[i].say && WP.speaking);   // the count starts after "Ready… Hold for N seconds"
  onWorkStep(0);
}
/* NstructR's and NstructR+'s words: "Ready… Begin." before the count (it starts at "1"; Oct 2026), varied when words of
   encouragement are on: a random "Last one", and now and then a word of encouragement in place of a count (never the
   first or last) or of an alternating rep's "and", or every 10 s of a hold (never at halfway or in the last 10 s), and
   a finished phrase as each set (and side) ends ("Last one. Finished!"; Oct 2026).
   WP.random can be replaced (tests). */
const READY_BEGIN = 'Ready… Begin.', WATCH_FIRST = 'Watch me first.';
// the first of each is the plain word, said when words of encouragement are off. Cheers stay short: one in place of a
// count that is still being said when the next count comes drops it. (More words, owner, Oct 2026.)
const CHEERS = ['Good', 'Keep going', 'Breathe', 'Doing great', 'Nice', 'Steady', "That's it", 'Nice work', 'Looking good'];
const COACH_WORDS = {
  done: ['Great job!', 'Fantastic!', 'Finished!', 'Well done!', 'Nice work!', 'Excellent!', 'Way to go!', 'Nailed it!'],
  last: ['Last one', 'One more', 'Last rep', 'Final rep'],
  cheer: CHEERS,
  holdCheer: [...CHEERS, 'Stay with it', 'Hold it there', 'Breathe easy', 'Relax your shoulders'],   // (a hold only)
  half: ['Halfway', 'Halfway there', 'Halfway. Keep it up'],
  ten: ['10 seconds', '10 seconds left', 'Last 10 seconds'],
  end: ['Workout complete. Well done.', 'Workout complete. Great work today.', "That's the workout. Well done!"],
};
const coachRandom = () => (WP.random || Math.random)();
// a word isn't picked twice in a row for the same moment ("Good. Breathe. Good.", never "Good. Good.")
const COACH_LAST = {};
const coachWord = kind => {
  if (!encourageOn()) return COACH_WORDS[kind][0];
  const all = COACH_WORDS[kind], pick = all.length > 1 ? all.filter(w => w !== COACH_LAST[kind]) : all;
  return (COACH_LAST[kind] = pick[Math.floor(coachRandom() * pick.length)]);
};
const cheerChance = p => encourageOn() && coachRandom() < p;
// a count swapped for a cheer: 20%, halved for the rep right after one that cheered (and for as long as they keep cheering)
const REP_CHEER = 0.2;
function repCheer() { const hit = cheerChance(WP.cheered ? REP_CHEER / 2 : REP_CHEER); WP.cheered = hit; return hit; }
function onWorkStep(i) {
  const m = S.planMeta[i] || {};
  if (m.say) speakGuided(m.say);
  if (m.repNo && m.alt !== 1) {
    WP.rep = m.repNo;
    // NstructR and NstructR+ count the reps: 1, 2, 3 … "Last one". Numbers are skipped if it's already talking; "1" never is
    const first = WP.rep === 1, last = WP.rep === m.repOf;
    if (first) WP.cheered = false;
    say(first ? '1' : last ? coachWord('last') : repCheer() ? coachWord('cheer') : String(WP.rep), { dropIfBusy: !first });
  } else if (m.repNo && m.alt) {
    // alternating sides or directions: a rep is one side then the other, so the other half is "and" ("1 and 2 and 3…";
    // Oct 2026); like a middle count, it can be a word of encouragement instead ("1 and 2 Good 3…")
    say(repCheer() ? coachWord('cheer') : 'and', { dropIfBusy: true });
  }
  // a step call: what comes next in a multi-step rep ("1 … Forward. Right. Back. Left."); like a count, skipped if it's
  // still talking (the count wins)
  if (m.call) say(m.call, { dropIfBusy: true });
  renderWpCount();
}
/* the guided run-through: a step waits until its cue has been read out */
function speakGuided(text) {
  WP.speaking = true;
  const token = WP.speakToken = (WP.speakToken || 0) + 1;
  say(text).then(() => { if (WP.speakToken === token) WP.speaking = false; });
}
function onWorkEnd() {
  const cur = current(); if (!cur) return;
  if (encourageOn() && (WK.sound === 'voice' || WK.sound === 'coach')) say(coachWord('done'));
  const segs = itemSegments(cur.item);
  if (WP.seg < segs.length - 1) { WP.seg++; beep(660, 160); return runCurrent(true); }
  WP.seg = 0;
  if (WP.set < cur.item.sets - 1) { WP.set++; return startRest(restSets(), 'set'); }
  WP.set = 0;
  logItem(cur);
  if (WP.i < WP.flat.length - 1) {
    WP.i++; saveSession();
    const nx = WP.flat[WP.i], ch = equipmentChange(exById(cur.item.ex), exById(nx.item.ex));
    const rest = nx.firstOfRound ? (nx.block.roundRest != null ? nx.block.roundRest : 30) : restGap();
    // no rest between: no rest screen; the move into the next exercise takes as long as saying what to do
    if (ch && rest <= 0 && !equipPauseOn()) { WP.equipChange = ch; return runCurrent(true); }
    return startRest(rest, nx.firstOfRound ? 'round' : 'item', ch);
  }
  finishWorkout();
}
/* the equipment words, after half a second of silence */
function sayEquipment(ch, tail = '') { return new Promise(res => setTimeout(() => say(`${ch.lines.join('. ')}.${tail}`).then(res), EQUIP_PAD * 1000)); }
/* ch: an equipment change ({ seconds, lines }, equipmentChange) or, for kind 'start', the checklist ({ seconds: 0,
   lines: ["You'll need …"] }): the rest gets its seconds added and says its lines; with "Pause at equipment changes" it
   waits for Ready instead of counting down to the next exercise */
function startRest(seconds, kind, ch = null) {
  if (ch) seconds += ch.seconds;
  if (seconds <= 0) return runCurrent(true);
  WP.phase = 'rest'; WP.restLeft = seconds; WP.restLast = performance.now(); WP.beeped = {}; S.canAdvance = null; S.holdWait = null;
  WP.waitReady = !!ch && equipPauseOn();
  const cur = current(), ex = exById(cur.item.ex);
  $('#wpRest').hidden = false; $('#wpControls').classList.remove('show');
  // 'start': the workout's title card, what you'll need for it (not the first exercise: that has its own start); no
  // countdown, Start (Ready when pausing)
  const title = kind === 'start'; WP.restKind = kind;
  $('#wpRestLabel').textContent = title ? 'Workout' : kind === 'set' ? 'Rest before the next set' : kind === 'round' ? `Rest before round ${cur.round + 1} of ${cur.rounds}` : 'Rest';
  $('#wpRestTitle').textContent = title ? WP.w.name : ''; $('#wpRestTitle').hidden = !title;
  $('#wpRestNext').textContent = title ? '' : kind === 'set' ? `Next: set ${WP.set + 1} of ${cur.item.sets}` : `Next: ${ex.name}`; $('#wpRestNext').hidden = title;
  $('#wpRestEquip').textContent = ch ? ch.lines.join(' · ') : ''; $('#wpRestEquip').hidden = !ch;
  $('#wpRestTime').textContent = WP.waitReady || title ? '' : fmtTime(Math.ceil(seconds)); $('#wpRestTime').hidden = WP.waitReady || title;
  $('[data-wact="restSkip"]').textContent = WP.waitReady ? 'Ready' : title ? 'Start' : 'Skip'; $('[data-wact="restMore"]').hidden = WP.waitReady || title;
  // show where the next exercise starts: moving there through the at-rest pose when it can, or straight there
  stagePlan(buildPlan(cur.item, itemSegments(cur.item)[0]));
  S.onStep = null; S.onPlanEnd = null; S.planDone = false;
  if (S.trans) { S.playing = true; S.t = 0; S.canAdvance = i => i < S.trans; }    // stops once it's in the first step
  else { S.playing = false; S.t = S.resolved[0].dur; }
  renderWpInfo();
  const rest = WP.waitReady ? '' : plural(Math.ceil(seconds), { one: 'Rest # second.', other: 'Rest # seconds.' });
  const first = (title ? `${WP.w.name}.` : kind === 'set' ? rest : kind === 'round' ? `Round ${fmtNum(cur.round)} done. ${rest}` : `${rest} Next: ${ex.name}.`).trim();
  const token = WP.restToken = (WP.restToken || 0) + 1;
  // the title card stays until it has said all of it (a voice can be slower than its estimate), then half a second more
  WP.restTalking = title;
  say(first).then(() => ch && WP.restToken === token && WP.phase === 'rest' ? sayEquipment(ch, WP.waitReady ? " Tap Ready when you're set." : '') : null)
    .then(() => { if (WP.restToken === token && WP.restTalking) { WP.restTalking = false; WP.restLeft = Math.max(WP.restLeft, EQUIP_PAD); } });
  beep(520, 200);
}
/* ---------- history ---------- */
const LOG_KEY = 'motion-guide-log-v1';
function loadLog() { try { const d = JSON.parse(localStorage.getItem(LOG_KEY) || 'null'); return Array.isArray(d) ? d : []; } catch (e) { return []; } }
function saveLog(list) { try { localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(-500))); } catch (e) { } }
function logItem(entry) {
  if (!WP.log || !entry || WP.lastLogged === WP.i) return;
  WP.lastLogged = WP.i;
  logSets(entry, entry.item, entry.item.sets - (entry.setBase || 0));
}
/* sets of one exercise into this session's history (after a swap mid-item, the sets done before it are the old one's) */
function logSets(entry, it, sets) {
  const ex = exById(it.ex); if (!WP.log || sets < 1) return;
  WP.log.done.push({ ex: it.ex, name: ex ? ex.name : it.ex, category: ex && ex.category, measure: ex && ex.measure,
    sets, ...(ex && ex.measure === 'time' ? { seconds: it.seconds } : { reps: it.reps }), ...(it.sides ? { sides: it.sides } : {}), ...(it.dir ? { dir: it.dir } : {}), block: entry.block.name, round: entry.round + 1 });
}
function writeSession(completed) {
  if (!WP.log || !WP.log.done.length) return;
  const list = loadLog();
  list.push({ id: uid(), workout: WP.w.libId || WP.w.id, ...(isLibWorkout(WP.w) ? { library: true } : {}), name: WP.w.name, start: new Date(WP.log.start).toISOString(), end: new Date().toISOString(),
    seconds: Math.round((Date.now() - WP.log.start) / 1000), completed, exercisesDone: WP.log.done.length, exercisesTotal: WP.flat.length, exercises: WP.log.done });
  saveLog(list); WP.log = null;
}
function renderHistory() {
  const list = loadLog().slice().reverse();
  $('#historyList').innerHTML = list.length ? list.slice(0, 50).map(s => {
    const d = new Date(s.start);
    return `<li class="item"><span class="open" style="cursor:default"><span class="icon" style="color:var(--md-primary)">${s.completed ? 'task_alt' : 'timelapse'}</span>
      <span class="txt"><span class="title-small">${esc(s.name)}</span><span class="body-small muted">${d.toLocaleDateString(LANG, { weekday: 'short', month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString(LANG, { hour: 'numeric', minute: '2-digit' })}: ${fmtMin(s.seconds)}, ${fmtNum(s.exercisesDone)} of ${plural(s.exercisesTotal, { one: '# exercise', other: '# exercises' })}${s.completed ? '' : ' (stopped early)'}</span></span></span>
      <button class="icon-btn stateful" data-logdel="${s.id}" aria-label="Delete this entry"><span class="icon">delete</span></button></li>`;
  }).join('') : '<li class="body-medium muted" style="padding:8px 4px">Finished workouts show up here.</li>';
  $('#historyActions').hidden = !list.length;
}

function finishWorkout() {
  S.canAdvance = null; S.holdWait = null;
  logItem(current() || WP.flat[WP.flat.length - 1]);
  writeSession(true);
  WP.phase = 'done'; S.playing = false; S.onPlanEnd = null; S.onStep = null;
  $('#wpRest').hidden = true; $('#wpDone').hidden = false; $('#wpControls').classList.remove('show');
  $('#wpDoneText').textContent = `${WP.w.name}: ${plural(WP.flat.length, { one: '# exercise', other: '# exercises' })} in ${fmtMin((Date.now() - WP.started) / 1000)}.`;
  if (!WP.test) dropSession();
  wakeOff();
  say(coachWord('end')); beep(880, 180); setTimeout(() => beep(1175, 260), 200);
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
  btn.addEventListener('pointerup', () => { if (performance.now() - t0 < 800) toast('Hold ✕ to exit'); stop(); showControls(isPaused()); setTimeout(() => (t0 = 0), 0); });
  btn.addEventListener('pointerleave', stop); btn.addEventListener('pointercancel', stop);
  btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); exitWorkout(); } });
  // a screen reader's double-tap (TalkBack, VoiceOver) arrives as a click with no pointer press: nothing to hold, so it exits
  btn.addEventListener('click', e => { if (e.detail === 0 && !t0) exitWorkout(); t0 = 0; });
})();
const afterWorkout = () => (WP.test && WP.w && !isLibWorkout(WP.w) ? `#/workout/${encodeURIComponent(WP.w.id)}` : '#/workouts');
function exitWorkout() { go(afterWorkout()); }
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
  // easier and harder versions, under the play controls (not while resting)
  const l = linksOf(ex);
  $('#wpSwap').innerHTML = WP.phase !== 'work' ? '' : [['easier', 'Easier', 'trending_down'], ['harder', 'Harder', 'trending_up']].filter(([k]) => l[k].length)
    .map(([k, label, icon]) => `<button class="ov-pill" data-wact="${k}" aria-label="${label}: ${esc(l[k][0].name)}"><span class="icon">${icon}</span>${label}</button>`).join('');
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
        if (m.seconds >= 30 && left <= Math.round(m.seconds / 2) && left > 10 && !WP.beeped.half) { WP.beeped.half = 1; say(coachWord('half'), { dropIfBusy: true }); }
        if (m.seconds >= 20 && left <= 10 && left > 3 && !WP.beeped.ten) { WP.beeped.ten = 1; say(coachWord('ten'), { dropIfBusy: true }); }
        // every 10 s held, a 40% chance of a word of encouragement: not where "Halfway" is said, not in the last 10 s
        const mark = Math.floor((m.seconds - left) / 10) * 10, half = m.seconds >= 30 ? Math.round(m.seconds / 2) : -1;
        if (mark >= 10 && left > 10 && !WP.beeped['c' + mark]) {
          WP.beeped['c' + mark] = 1;
          if (Math.abs(m.seconds - mark - half) > 5 && cheerChance(0.4)) say(coachWord('holdCheer'), { dropIfBusy: true });
        }
      }
    } else $('#wpCount').textContent = fmtTime(cur.item.seconds);
  } else {
    const name = repWord(ex, cur.item.reps);
    const m = S.planMeta[S.idx] || {};
    const html = m.guided ? `<small>run-through</small>` : `${WP.rep || 0}/${cur.item.reps}<small>${name}</small>`;
    if ($('#wpCount').innerHTML !== html) $('#wpCount').innerHTML = html;
  }
}
/* a light ticker for countdowns (rest and holds) */
setInterval(() => {
  if (S.view !== 'wplay') return;
  if (WP.phase === 'rest' && WP.waitReady) WP.restLast = performance.now();            // waits for Ready
  else if (WP.phase === 'rest' && !WP.paused) {
    const now = performance.now(); WP.restLeft -= (now - WP.restLast) / 1000; WP.restLast = now;
    const left = Math.max(0, Math.ceil(WP.restLeft));
    if (WP.restKind !== 'start') $('#wpRestTime').textContent = fmtTime(left);   // the title card has no countdown
    if (left <= 3 && left > 0 && !WP.beeped['r' + left]) { WP.beeped['r' + left] = 1; beep(left === 1 ? 880 : 660); }
    if (WP.restLeft <= 0 && !onTheWay() && !WP.restTalking) runCurrent(true);
  } else if (WP.phase === 'rest') WP.restLast = performance.now();
  if (WP.phase === 'work') renderWpCount();
}, 200);

/* The tap that reveals the controls must not also press whatever button appears under that finger: a control
   only responds to a touch that began after the controls were already showing. */
let LAST_DOWN_AT = 0;
$('#wpRoot').addEventListener('pointerdown', () => { LAST_DOWN_AT = performance.now(); }, true);
function wpAction(act) {
  if (S.view === 'wplay' && ['pause', 'nextItem', 'prevItem', 'sound', 'easier', 'harder'].includes(act) && LAST_DOWN_AT && LAST_DOWN_AT < CTRL_SHOWN_AT) return;
  if (act === 'pause') {
    // pausing stops the voice mid-sentence; resuming a guided step reads its line again
    if (WP.phase === 'rest') { WP.paused = !WP.paused; if (WP.paused) hush(); setWpPlay(!WP.paused); toast(WP.paused ? 'Paused' : 'Resumed'); return; }
    S.playing = !S.playing;
    if (!S.playing) hush(); else { const m = S.planMeta[S.idx] || {}; if (m.guided && m.say) speakGuided(m.say); }
    setWpPlay(S.playing); toast(S.playing ? 'Resumed' : 'Paused'); return;
  }
  if (S.view === 'wplay' && WP.phase !== 'done' && act !== 'pause') showControls(isPaused());
  if (act === 'sound') {
    const k = SOUND_MODES.findIndex(x => x[0] === WK.sound), nx = SOUND_MODES[(k + 1) % SOUND_MODES.length];
    setSound(nx[0]); unlockAudio(); toast(`Instruction: ${nx[2]}`); showControls(isPaused()); return;
  }
  if (act === 'easier' || act === 'harder') { swapCurrent(act); return; }
  if (act === 'restMore') { WP.restLeft += 15; return; }
  if (act === 'restSkip') { WP.waitReady = false; if (WP.phase === 'rest') { if (onTheWay()) WP.restLeft = 0; else runCurrent(true); } return; }   // still getting into position: starts as soon as it's there
  if (act === 'nextItem' || act === 'prevItem' || act === 'restSkip') hush();
  if (act === 'nextItem') { if (WP.i < WP.flat.length - 1) { WP.i++; WP.set = 0; WP.seg = 0; runCurrent(true); } else finishWorkout(); return; }
  if (act === 'prevItem') { WP.i = Math.max(0, WP.i - 1); WP.set = 0; WP.seg = 0; runCurrent(true); return; }
  if (act === 'finish') { go(afterWorkout()); return; }
}

/* Start goes straight into the workout (no "before you start" sheet): the time and equipment are on the card,
   and the safety notes from the sources are at the bottom of the card (safetyNotes). */
const safetyNotes = w => [...new Set(w.blocks.flatMap(b => b.items).map(it => ((exById(it.ex) || {}).prescription || {}).note).filter(n => n && /doctor|osteoporosis|heart|coach|spotter|blood pressure/i.test(n)))];
const safetyHtml = w => { const n = safetyNotes(w); return n.length ? `<div class="note wk-safety"><span class="icon">health_and_safety</span><div>${n.map(x => `<p class="body-small" style="margin:0">${esc(x)}</p>`).join('')}</div></div>` : ''; };
function confirmStart(w, fromIndex = 0, swaps = null, test = false) { startWorkout(w, fromIndex, swaps, test); }


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
  else if (d.wcustom) { const w = wkById(d.wcustom); if (w) { const c = customizeWorkout(w); go(`#/workout/${c.id}`); snack(`Copied to your workouts. Changes stay in your copy.`); } }
  else if (d.wact === 'new') {
    const w = { id: uid(), name: 'New workout', blocks: [{ id: uid(), name: 'Block 1', items: [] }] };
    WK.list.push(w); saveWorkouts(); go(`#/workout/${w.id}`);
  }
  else if (d.wact === 'resume') { const s = loadSession(), w = s && wkById(s.wid); if (w) confirmStart(w, s.i, s.swaps); }
  else if (d.wact === 'dropSession') { dropSession(); renderWorkouts(); }
  else if (d.wact === 'start' && EDIT) confirmStart(EDIT, 0, null, true);       // Test: a trial run (startWorkout)
  else if (d.wact === 'addBlock' && EDIT) { EDIT.blocks.push({ id: uid(), name: `Block ${EDIT.blocks.length + 1}`, items: [] }); commitEdit(); }
  else if (d.wact === 'export' && EDIT) showJson(EDIT.name, workoutJSON(EDIT));
  else if (d.wact === 'clearLog') ask('Clear all workout history?', 'Every finished workout is removed from History.', 'Clear', true).then(y => { if (y) { saveLog([]); renderHistory(); } });
  else if (d.logdel) { saveLog(loadLog().filter(s => s.id !== d.logdel)); renderHistory(); }
  else if (d.wact === 'duplicateWorkout' && EDIT) {
    const c = JSON.parse(JSON.stringify(EDIT)); c.id = uid(); c.name = EDIT.name + ' (copy)';
    c.blocks.forEach(b => { b.id = uid(); b.items.forEach(i => (i.uid = uid())); });
    WK.list.push(c); saveWorkouts(); go(`#/workout/${c.id}`); snack('Duplicated');
  }
  else if (d.wact === 'deleteWorkout' && EDIT) {
    const w = EDIT;
    ask(`Delete "${w.name}"?`, '', 'Delete', true).then(y => { if (!y) return; WK.list = WK.list.filter(x => x !== w); saveWorkouts(); if (EDIT === w) EDIT = null; go('#/workouts'); snack('Workout deleted'); });
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
