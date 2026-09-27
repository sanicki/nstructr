
/* ---------- Settings: Import & tools ---------- */
$('#formatRef').innerHTML = `
      <p>A file holds one exercise (or <code>{"format":"nstructr/exercise","exercises":[...]}</code> for several), with <code>"version":1</code>, an <code>id</code>, a <code>name</code> and a list of <code>keyframes</code>. Your own exercises' ids start with <code>u-</code> (like <code>u-banded-pull-apart</code>) so they never clash with the library; imported exercises without it get it added.</p>
      <p> Each keyframe is a pose the figure moves into over <code>durationMs</code> and then holds for <code>holdMs</code>.</p>
      <p><code>pose</code> sets joint angles in degrees: ${JOINT_KEYS.map(k => `<code>${k}</code>`).join(' ')}. Every angle is relative to the parent bone, and positive turns clockwise on screen. At 0 the spine points up and every limb hangs straight down; <code>torso</code> tilts the lower back from the pelvis and <code>chest</code> bends the upper back from mid-spine. In side view the figure faces right, so negative <code>hipR</code> swings the leg forward and positive <code>kneeR</code> bends the knee.</p>
      <p><code>view</code> is <code>"side"</code> or <code>"front"</code>. <code>anchor</code> pins a point (like <code>ankleL</code>) to the floor, <code>plant</code> keeps a foot flat, and <code>touch</code> turns one joint until a point reaches the floor, for example <code>{"point":"toeR","adjust":"hipR"}</code>. Without an anchor, the lowest point rests on the floor.</p>
      <p>Optional: <code>floorGuide</code> draws a top-down star, and each keyframe's <code>guide.direction</code> (degrees clockwise from straight ahead) highlights one line. <code>bilateral</code> adds a Left/Right switch; write the keyframes for the left leg and the right side is mirrored for you.</p>
      <p>Equipment: <code>props</code> lists items drawn with the figure. A resistance band is <code>{"type":"band","from":"footL","to":"handL"}</code>. Either end can be a body point (<code>footL</code>/<code>footR</code> is the ball of the foot, <code>armpitL</code>/<code>armpitR</code> just under the shoulder, <code>backL</code>/<code>backR</code> across the shoulder blades) or a fixed spot such as <code>{"x":120,"y":40}</code>, in px from the stage centre and the floor. The band is just taut at its shortest and thins as it stretches; set <code>restLength</code> to choose its slack length yourself, <code>via</code> to route it around body points (like behind the back), and <code>layer</code> (<code>"front"</code>/<code>"back"</code>) to draw it in front of or behind the body. A towel is <code>{"type":"towel","from":"handR","to":"handL"}</code> and doesn't stretch. A wall is <code>{"type":"wall","at":"handR","keyframe":1}</code>: it stands where that body point is in that step and stays put. Add <code>"view":"side"</code> for a wall that's behind or in front of the body (it fades out when the camera turns to face the figure), or <code>"view":"front"</code> for one beside it.</p>
      <p>Surfaces: <code>{"type":"chair","x":-12}</code>, <code>{"type":"bench","x":150}</code> or <code>{"type":"step","x":70}</code> (<code>x</code> is the centre, in px from the middle of the stage; optional <code>width</code>, <code>height</code>, and for a chair <code>back</code> "left"/"right" and <code>backHeight</code>). Anything that rests on the floor rests on a surface when it's above one: sit with <code>"anchor":"pelvis"</code> over a chair seat, or use <code>touch</code> to put a foot on a step. <code>{"hand":"handL","to":"chair"}</code> puts a hand on the chair back. Default sizes match the figure: chair seat 80 (shin height), bench 70, step 30.</p>
      <p>Weights: <code>{"type":"dumbbell","hand":"handR"}</code> (optional <code>axis</code>: <code>"lr"</code> bar left-right, <code>"fb"</code> front-back, <code>"ud"</code> held upright), <code>{"type":"kettlebell","hands":["handL","handR"]}</code>, <code>{"type":"barbell","from":"handL","to":"handR"}</code>. They're drawn in the hands; from the side a barbell shows as its end plate.</p>
      <p>Reaching: a keyframe's <code>reach</code> puts a hand on something, e.g. <code>[{"hand":"handR","to":"ankleR"}]</code> (hold the ankle) or <code>{"hand":"handL","to":"wall"}</code>; <code>dx</code>/<code>dy</code> nudge the spot and <code>bend</code> (1 or -1) picks which way the elbow bends.</p>
      <p>Reps: a step's <code>phase</code> is <code>"setup"</code> (played once first), <code>"rep"</code> (one rep, or the held step of a timed exercise) or <code>"finish"</code> (played once at the end); unmarked steps are all one rep. An exercise's <code>measure</code> is <code>"reps"</code> or <code>"time"</code>, <code>repName</code> names a rep ("circle", "pull-apart"), and <code>direction</code>, e.g. <code>{"labels":{"A":"Forward","B":"Backward"}}</code>, lets the rep be played in reverse. A step's <code>"ease":"linear"</code> moves at a constant speed instead of speeding up and slowing down, for circles and other continuous motion.</p>
      <p>Workouts: <code>{"version":1,"name":"...","restBetween":10,"blocks":[{"name":"Warm-up","items":[{"ex":"wu-arm-circles","reps":10,"dir":"both"},{"ex":"core-forearm-plank","seconds":30},{"ex":"bw-reverse-lunge","reps":8,"sets":2,"rest":20,"sides":"alternate","tempo":1}]}]}</code> (or several in <code>{"format":"nstructr/workout","workouts":[...]}</code>). <code>sides</code> is <code>"L"</code>, <code>"R"</code>, <code>"both"</code> or <code>"alternate"</code> (reps count per side), <code>dir</code> the same with <code>"A"</code>/<code>"B"</code>. A block can repeat as a circuit with <code>"rounds":3</code> and <code>"roundRest":30</code>. A workout file can carry its own <code>exercises</code> too.</p>
      <p>History exports as <code>{"format":"nstructr/log","sessions":[{"name","start","end","seconds","completed","exercisesDone","exercisesTotal","exercises":[{"ex","name","category","sets","reps"|"seconds","sides","dir","block","round"}]}]}</code>, with ISO dates, ready for a logger or tracker to read.</p>
      <p>Staying put: <code>keep</code> lists hands or feet that stay exactly where they were in the previous step, e.g. <code>["ankleL","ankleR"]</code> so the feet don't move while the hips lift. <code>{"point":"ankleR","keyframe":0}</code> puts it back exactly where it was in that step instead (a foot stepping back to its starting spot). The knees or elbows bend to make it work.</p>
      <p>Foreshortening: <code>armDepthL</code>/<code>armDepthR</code>, <code>forearmDepthL</code>/<code>forearmDepthR</code>, <code>thighDepthL</code>/<code>thighDepthR</code> and <code>shinDepthL</code>/<code>shinDepthR</code> turn that segment toward the camera; at 90 it points straight at you and shows no length. Use them for movements across the picture's depth, like arms swinging out to the sides.</p>
    `;
function aiPromptText() { return $('#aiPrompt').innerHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); }
async function copyText(text, done) {
  try { await navigator.clipboard.writeText(text); snack(done); }
  catch (e) { showJson('Copy this', text); snack('Select the text and copy it.'); }
}
function showJson(title, text) {
  $('#jsonTitle').textContent = title; $('#jsonArea').value = text; $('#jsonDialog').showModal();
}

/* ---------- Player ---------- */
function renderPlayerInfo() {
  const ex = S.ex; if (!ex) return;
  const pr = ex.prescription || {};
  $('#exKicker').textContent = ex.library || (isSaved(ex.id) ? 'My exercise' : '');
  $('#exName').textContent = ex.name;
  $('#exSub').textContent = ex.sanskrit || '';
  const chips = [];
  const c = (icon, text) => chips.push(`<span class="chip"><span class="icon">${icon}</span>${esc(text)}</span>`);
  if (ex.focus) c('target', ex.focus);
  if (ex.category && ex.category !== ex.focus) c('category', ex.category);
  (ex.equipment || []).forEach(q => c(/band/i.test(q) ? 'fitness_center' : /towel/i.test(q) ? 'dry_cleaning' : /wall|door/i.test(q) ? 'door_front' : 'handyman', q));
  if (pr.reps) c('tag', /\d\s*$/.test(pr.reps) ? `${pr.reps} ${ex.repName && ex.repName !== 'rep' ? ex.repName + 's' : 'reps'}` : pr.reps);
  if (pr.rounds) c('repeat', `${pr.rounds} rounds${pr.sides === 'both' ? ' per side' : ''}`);
  c('timer', `${Math.round(S.total / 1000)} s per round`);
  $('#exChips').innerHTML = chips.join('');
  // steps
  const phaseTag = i => { const ph = (S.ex.keyframes[i] || {}).phase; return ph === 'setup' ? ' <span class="tag">Setup</span>' : ph === 'finish' ? ' <span class="tag">Finish</span>' : ''; };
  $('#stepList').innerHTML = S.resolved.map((r, i) => `<li><button class="stateful" data-step="${i}"><span class="num">${i + 1}</span>
    <span class="title-small">${esc(r.name || 'Step ' + (i + 1))}${r.hold >= 3000 ? ` <span class="muted body-small">(hold ${Math.round(r.hold / 1000)} s)</span>` : ''}${phaseTag(i)}</span>
    ${r.cue ? `<span class="sub">${esc(r.cue)}</span>` : ''}</button></li>`).join('');
  // how to
  let how = '';
  if (ex.setup) how += `<h3 class="title-small">Setup</h3><ol>${ex.setup.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`;
  if (ex.cues) how += `<h3 class="title-small">Form</h3><ul>${ex.cues.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`;
  if (pr.note) how += `<div class="note"><span class="icon">info</span><span class="body-medium">${esc(pr.note)}</span></div>`;
  $('#howPanel').innerHTML = how || '<p class="muted">No instructions for this exercise.</p>';
  // about
  const src = ex.source || {};
  $('#aboutPanel').innerHTML = `${ex.description ? `<p class="body-large">${esc(ex.description)}</p>` : ''}
    ${src.url ? `<p><a class="source" href="${esc(src.url)}" target="_blank" rel="noopener"><span class="icon" style="font-size:18px">${/youtu/.test(src.url) ? 'play_circle' : 'open_in_new'}</span>${esc(src.title || 'Source')}</a></p>` : ''}
    ${src.note ? `<p class="body-small muted">${esc(src.note)}</p>` : ''}
    <div class="row" style="margin-top:12px"><button class="btn tonal stateful" data-act="json"><span class="icon">data_object</span>Show JSON</button>
    ${isSaved(ex.id) ? `<button class="btn text stateful" data-del="${esc(ex.id)}"><span class="icon">bookmark_remove</span>Remove from Saved</button>` : ''}</div>`;
  updateSaveBtn();
  $('#adjustPanel').hidden = !authoring();
  updateEditor();
  S.shownIdx = -1;
}
function updateSaveBtn() {
  const saved = S.ex && isSaved(S.ex.id), b = $('#saveBtn');
  b.innerHTML = `<span class="icon${saved ? ' fill' : ''}">${saved ? 'bookmark' : 'bookmark_add'}</span>`;
  b.setAttribute('aria-label', saved ? 'Remove from Saved' : 'Save');
  b.title = saved ? 'Saved' : 'Save';
}

/* ---------- Exercise player: tap the figure for controls, like the workout player ----------
   The first tap only shows the controls; a control responds only to a press that started after they were
   showing (so the revealing tap can't hit a button that appears under the finger). Tapping the figure again
   hides them; they fade by themselves while playing, and stay while paused. */
const XC = { shownAt: 0, downAt: 0, t: 0 };
function showExControls(stay) {
  const c = $('#exControls');
  if (!c.classList.contains('show')) XC.shownAt = performance.now();
  c.classList.add('show'); clearTimeout(XC.t);
  // while editing a pose they fade even when paused, so they don't cover the pose
  if (XC.editing || (!stay && S.playing)) XC.t = setTimeout(() => { if (S.playing || XC.editing) c.classList.remove('show'); }, 2500);
}
function hideExControls() { clearTimeout(XC.t); $('#exControls').classList.remove('show'); }
$('#exStageWrap').addEventListener('pointerdown', () => { XC.downAt = performance.now(); }, true);
$('#exStageWrap').addEventListener('click', e => {
  if (S.view !== 'player') return;
  const btn = e.target.closest('.ex-cbtn'), shown = $('#exControls').classList.contains('show');
  if (btn) {
    // keyboard presses (detail 0) always count; a pointer press only once the controls were already up
    if (e.detail !== 0 && (!shown || XC.downAt < XC.shownAt)) { e.stopPropagation(); e.preventDefault(); showExControls(); return; }
    setTimeout(() => showExControls(!S.playing), 0);         // after the button's own handler
    return;
  }
  if (shown) hideExControls(); else showExControls(!S.playing);
}, true);
$('#exStageWrap').addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && S.view === 'player') showExControls(!S.playing); });
$('#exControls').addEventListener('focusin', () => showExControls(true));

/* ---------- Exercise details: a panel you pull up (phones); a side column on wide screens ---------- */
const sheetDocked = () => matchMedia('(min-width: 840px), (max-height: 520px)').matches;   // a column / part of the page, not a sheet
function setSheet(open, half = false) {
  const sh = $('#exSheet');
  sh.classList.toggle('open', open); sh.classList.toggle('half', open && half); sh.style.transform = '';
  if (!half) XC.editing = false;
  $('#sheetHead').setAttribute('aria-expanded', String(open));
  $('#sheetScrim').hidden = !open || half || sheetDocked();
  if (!open) $('#sheetBody').scrollTop = 0;
}
(() => {
  const head = $('#sheetHead'), sh = $('#exSheet');
  let drag = null;
  head.addEventListener('pointerdown', e => {
    if (sheetDocked()) return;
    // closed = only the header showing, above the safe area (and above the camera cutouts on short screens)
    const lift = (parseFloat(getComputedStyle(document.documentElement).paddingBottom) || 0) + (matchMedia('(max-height: 520px)').matches ? innerHeight * 0.22 : 0);
    drag = { y0: e.clientY, t0: performance.now(), open: sh.classList.contains('open'), moved: false, id: e.pointerId,
      base: new DOMMatrixReadOnly(getComputedStyle(sh).transform).m42, closedY: sh.offsetHeight - head.offsetHeight - lift };
    head.setPointerCapture(e.pointerId);
  });
  head.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y0;
    if (Math.abs(dy) > 6) drag.moved = true;
    if (!drag.moved) return;
    sh.classList.add('dragging');
    const y = Math.max(0, Math.min(drag.closedY, drag.base + dy));
    sh.style.transform = `translateY(${y}px)`;
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y0, v = dy / Math.max(1, performance.now() - drag.t0), moved = drag.moved, was = drag.open;
    const y = drag.base + dy, closedY = drag.closedY;
    drag = null; sh.classList.remove('dragging');
    if (!moved) { setSheet(!was); return; }                         // a tap toggles
    setSheet(v < -0.3 || (v <= 0.3 && y < closedY * 0.6));          // a flick, or let go high enough
  };
  head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
  head.addEventListener('click', e => { if (e.detail === 0 && !sheetDocked()) setSheet(!sh.classList.contains('open')); });   // keyboard
  $('#sheetScrim').addEventListener('click', () => setSheet(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && sh.classList.contains('open') && S.view === 'player') setSheet(false); });
})();

/* Authoring mode: the pencil in the top bar opens the pose editor. On phones the panel opens halfway so the
   figure stays visible above it; use the controls on the figure to pick the step to edit. */
function openPoseEditor() {
  if (!S.ex) return;
  setPlaying(false); hideExControls();
  $('#adjustPanel').hidden = false;
  if (sheetDocked()) { XC.editing = true; $('#adjustPanel').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  setSheet(true, true); XC.editing = true;
  requestAnimationFrame(() => { $('#sheetBody').scrollTop = $('#adjustPanel').offsetTop - $('#sheetBody').offsetTop; });
}
$('#editPoseBtn').addEventListener('click', openPoseEditor);

/* ---------- Settings ---------- */
const THEME_KEY = 'nstructr-theme-v1', SPEED_KEY = 'nstructr-speed-v1', AUTHOR_KEY = 'nstructr-authoring-v1';
const pref = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
const setPref = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
const authoring = () => pref(AUTHOR_KEY, 'off') === 'on';
const defaultSpeed = () => +pref(SPEED_KEY, '1') || 1;
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}
function renderSettings() {
  const seg = (id, key, opts, cur) => { $(id).innerHTML = opts.map(([v, l]) => `<button class="stateful" data-${key}="${v}" aria-pressed="${String(v) === String(cur)}"><span class="icon">check</span>${l}</button>`).join(''); };
  seg('#setSound', 'setsound', [['off', 'Silent'], ['beeps', 'Beeps'], ['voice', 'Voice'], ['coach', 'Coach']], WK.sound);
  seg('#setTheme', 'settheme', [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], pref(THEME_KEY, 'system'));
  seg('#setSpeed', 'setspeed', [[0.5, '0.5×'], [1, '1×'], [2, '2×']], defaultSpeed());
  $('#setFullscreen').checked = wantFullscreen();
  $('#setAuthoring').checked = authoring();
  renderPersistNote();
}
$('#view-settings').addEventListener('click', e => {
  const b = e.target.closest('[data-setsound], [data-settheme], [data-setspeed]'); if (!b) return;
  const d = b.dataset;
  if (d.setsound) setSound(d.setsound);
  if (d.settheme) { setPref(THEME_KEY, d.settheme); applyTheme(d.settheme); }
  if (d.setspeed) setPref(SPEED_KEY, d.setspeed);
  b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
});
$('#setFullscreen').addEventListener('change', e => setPref(FS_KEY, e.target.checked ? 'on' : 'off'));
$('#setAuthoring').addEventListener('change', e => { setPref(AUTHOR_KEY, e.target.checked ? 'on' : 'off'); snack(e.target.checked ? 'Authoring mode on: open any exercise and tap the Edit pose button (sliders) at the top' : 'Authoring mode off', 6000); });
