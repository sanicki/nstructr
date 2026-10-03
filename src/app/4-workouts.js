
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
// the Instruction setting: NstructR ('voice') by default since Oct 2026 (NstructR+ until then); a choice already made stays
const WK = { list: loadWorkouts(), sound: (() => { try { return localStorage.getItem(SOUND_KEY) || 'voice'; } catch (e) { return 'voice'; } })() };
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
/* An item's time: its coaching script (src/coach.js) timed, the moves at the item's tempo and the lines at the speech
   rate (a step that waits for its line takes the longer of the two), for each set, side and direction; NstructR+'s
   demonstration once for each side or direction in the first set ("Watch me first." once); the rests between sets. */
function itemSeconds(item) {
  const ex = exById(item.ex); if (!ex) return 0;
  const segs = (item.sides === 'both' ? 2 : 1) * (item.dir === 'both' ? 2 : 1);
  const versions = item.sides === 'alternate' || item.dir === 'alternate' ? [ex.keyframes, ex.keyframes] : [ex.keyframes];
  const voiced = WK.sound === 'voice' || WK.sound === 'coach';
  const timed = guided => COACH.scriptSeconds(COACH.setScript(versions, { measure: ex.measure, reps: item.reps, seconds: item.seconds, holdStep: ex.holdStep,
    voiced, guided, title: ex.name, watch: false, words: scriptWords() }), versions, { tempo: item.tempo || 1, speech: t => speechSeconds(t) });
  const set = timed(false), demo = WK.sound === 'coach' ? segs * (timed(true) - set) + speechSeconds(SAY.watchFirst) : 0;
  return item.sets * segs * set + demo + (item.sets - 1) * restSets();
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
// how long the words take to say, with the silence before and after
const equipSpoken = lines => EQUIP_PAD + speechSeconds(lines.join(' ')) + EQUIP_PAD;
const checklistLine = need => SAY.need(listWords(need.map(q => q.toLowerCase())));
const fetchKey = q => q === 'Dumbbell' ? 'Dumbbells' : q;                     // one dumbbell or two: the same to fetch
const equipOf = ex => new Set(((ex && ex.equipment) || []).map(fetchKey).filter(q => EQUIP[q]));
/* what changes from one exercise to the next: { seconds, lines } or null */
function equipmentChange(fromEx, toEx) {
  const a = equipOf(fromEx), b = equipOf(toEx);
  const put = [...a].filter(q => !b.has(q)), got = [...b].filter(q => !a.has(q)), all = [...put, ...got];
  if (!all.length) return null;
  const drop = put.map(q => EQUIP[q].drop).filter(Boolean), get = got.map(q => EQUIP[q].get), lines = [...drop, ...get];
  // stepping away from furniture (a chair to nothing) has nothing to do or say: no change (it said a lone "." before)
  return lines.length ? { seconds: equipSpoken(lines), lines, drop, get } : null;
}
/* the side lying down in an exercise's first step, as written ('left' or 'right'; mirrored for its right side) */
function lyingSideWord(ex, side = 'L') {
  try {
    const seg = { ...DEFAULT_SEGMENTS }, P = POSITIONS_EX.pointsOf(resolveSequence(ex.keyframes, seg, ex, ex.props || [])[0], seg);
    return (P.shoulderL.y < P.shoulderR.y) === (side !== 'R') ? 'left' : 'right';
  } catch (e) { return ''; }
}
/* what changes from one exercise to the next, in the order you do it (owner, Oct 2026): put down what you're done with,
   change position, pick up what's next ("Put the dumbbells down. Sit down on your mat with feet flat or legs crossed.
   Pick up the resistance band."): { seconds, lines, equipment } or null. equipment: there's equipment to deal
   with ("Pause at equipment changes" waits only for that). side: the next exercise's first side ('L' or 'R'), so a line
   to lying on the side names it; none for an estimate (the same length) */
function exerciseChange(fromEx, toEx, side = null) {
  const eq = equipmentChange(fromEx, toEx), a = fromEx && posOf(fromEx).end, b = toEx && posOf(toEx).start;
  const pos = positionLine(a, b, side && b && b.startsWith('side-lying') ? lyingSideWord(toEx, side) : '').replace(/\.$/, '');
  const lines = [...(eq ? eq.drop : []), ...(pos ? [pos] : []), ...(eq ? eq.get : [])];
  return lines.length ? { seconds: equipSpoken(lines), lines, equipment: !!eq } : null;
}
// everything a workout (from one of its exercises on) uses, for the title card
const neededFrom = (flat, i) => [...new Set(flat.slice(i).flatMap(e => [...equipOf(exById(e.item.ex))]))];
const listWords = xs => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
const equipPauseOn = () => pref(EQUIP_PAUSE_KEY, 'off') === 'on';
/* the time the changes add to a workout: what's said between its exercises (equipment, position), and the checklist */
function equipmentSeconds(w) {
  const flat = flattenWorkout(w), need = flat.length ? neededFrom(flat, 0) : []; let t = need.length ? equipSpoken([w.name, checklistLine(need)]) : 0;   // the title card: its name, then the list
  for (let i = 1; i < flat.length; i++) { const c = exerciseChange(exById(flat[i - 1].item.ex), exById(flat[i].item.ex)); if (c) t += c.seconds; }
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
