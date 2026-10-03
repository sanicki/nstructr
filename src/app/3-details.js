
/* ---------- Settings: Import & tools ---------- */
$('#formatRef').innerHTML = `
      <p>A file holds one exercise (or <code>{"format":"nstructr/exercise","exercises":[...]}</code> for several), with <code>"version":2</code>, an <code>id</code>, a <code>name</code> and a list of <code>keyframes</code>. Your own exercises' ids start with <code>u-</code> (like <code>u-banded-pull-apart</code>) so they never clash with the library; imported exercises without it get it added. Files in the older 2D format (version 1) can't be read.</p>
      <p> Each keyframe is a pose the figure moves into over <code>durationMs</code> and then holds for <code>holdMs</code>.</p>
      <p><code>pose</code> sets joint angles in degrees. The figure is jointed like an artist's mannequin. Ball joints take three numbers, <code>[forward, side, turn]</code>: ${JOINTS.filter(j => j[2].length === 3).map(j => `<code>${j[0]}</code>`).join(' ')}. Hinges take one: ${JOINTS.filter(j => j[2].length === 1).map(j => `<code>${j[0]}</code>`).join(' ')}. At 0 the figure stands straight, arms hanging. Signs follow the body, not the screen, so a pose looks the same from any camera: for a hip or shoulder, + forward swings the limb forward, + side lifts it out to its own side, + turn turns it out; for <code>root</code>, <code>torso</code>, <code>chest</code> and <code>neck</code>, + forward bends forward, + side leans to the right, + turn turns to the left. Knees and elbows bend with +; <code>ankleL</code>/<code>ankleR</code> + points the toes; <code>shrugL</code>/<code>shrugR</code> + lifts the shoulder toward the ear (a shrug, up to about 35).</p>
      <p><code>camera</code> is where you watch from, in degrees around the figure: <code>90</code> the side (facing right on screen), <code>0</code> the front. Between steps the camera turns. <code>anchor</code> pins a point (like <code>ankleL</code>) to the floor (<code>anchorX</code> sideways, <code>anchorZ</code> forward, from the middle of the stage), <code>plant</code> keeps a foot flat, and <code>touch</code> turns one joint until a point reaches the floor, for example <code>{"point":"toeR","adjust":"hipR"}</code> (a ball joint's forward number) or <code>"hipR.side"</code>. Without an anchor, the lowest point rests on the floor. Crossing legs need nothing special: a leg that's behind the other is drawn behind it.</p>
      <p>Optional: <code>floorGuide</code> draws a top-down star, and each keyframe's <code>guide.direction</code> (degrees clockwise from straight ahead) highlights one line. <code>bilateral</code> adds a Left/Right switch; write the keyframes for one side and the other is the mirror image.</p>
      <p>Equipment: <code>props</code> lists items drawn with the figure. A resistance band is <code>{"type":"band","from":"footL","to":"handL"}</code>. Either end can be a body point (<code>footL</code>/<code>footR</code> is the ball of the foot, <code>armpitL</code>/<code>armpitR</code> just under the shoulder, <code>backL</code>/<code>backR</code> across the shoulder blades) or a fixed spot such as <code>{"z":120,"y":40}</code> (px forward of the stage centre, and up from the floor; <code>x</code> is sideways). The band is just taut at its shortest and thins as it stretches; set <code>restLength</code> to choose its slack length yourself, and <code>via</code> to route it around body points (like behind the back). A towel is <code>{"type":"towel","from":"handR","to":"handL"}</code> and doesn't stretch. A wall is <code>{"type":"wall","at":"handR","keyframe":1}</code>: it stands where that body point is in that step and stays put, in front of or behind the figure; add <code>"beside":true</code> for a wall at its side. A wall is a line when you see it edge-on and fades as the camera turns to face it.</p>
      <p>Surfaces: <code>{"type":"chair","z":-12}</code>, <code>{"type":"bench","z":150}</code> or <code>{"type":"step","z":70}</code> (<code>z</code> is the centre, in px forward of the middle of the stage; optional <code>width</code> (front to back), <code>depth</code> (side to side), <code>height</code>, and for a chair <code>back</code> "behind"/"ahead" and <code>backHeight</code>). Anything that rests on the floor rests on a surface when it's above one: sit with <code>"anchor":"pelvis"</code> over a chair seat, or use <code>touch</code> to put a foot on a step. <code>{"hand":"handL","to":"chair"}</code> puts a hand on the chair back. Default sizes match the figure: chair seat 80 (shin height), bench 70, step 30.</p>
      <p>Weights: <code>{"type":"dumbbell","hand":"handR"}</code> (optional <code>axis</code>: <code>"lr"</code> bar left-right, <code>"fb"</code> front-back, <code>"ud"</code> held upright), <code>{"type":"kettlebell","hands":["handL","handR"]}</code>, <code>{"type":"barbell","from":"handL","to":"handR"}</code>. They're drawn in the hands; a bar seen end-on shows as its end plate. Balls: a medicine ball <code>{"type":"medball"}</code>; a stability ball <code>{"type":"ball","z":230}</code> to sit or lie on (<code>"rolls":true</code>: it rolls along the floor under the heels resting on it), or carried, <code>{"type":"ball","r":49,"hands":["handL","handR","ankleL","ankleR"]}</code>. A step's <code>holds</code> says what holds a kettlebell or ball in that step, e.g. <code>["handR"]</code>, <code>["ankleL","ankleR"]</code>, or a spot it was thrown to, <code>[{"x":0,"y":235,"z":240}]</code>; between steps it moves from one to the other.</p>
      <p>Reaching: a keyframe's <code>reach</code> puts a hand on something, e.g. <code>[{"hand":"handR","to":"ankleR"}]</code> (hold the ankle) or <code>{"hand":"handL","to":"wall"}</code>; <code>dx</code>/<code>dy</code>/<code>dz</code> nudge the spot (sideways, up, forward). Elbows and knees only ever bend the way a body's do.</p>
      <p>Reps: a step's <code>phase</code> is <code>"setup"</code> (played once first), <code>"rep"</code> (one rep, or the held step of a timed exercise) or <code>"finish"</code> (played once at the end); unmarked steps are all one rep. An exercise's <code>measure</code> is <code>"reps"</code> or <code>"time"</code>, <code>repName</code> names a rep ("circle", "pull-apart"), and <code>direction</code>, e.g. <code>{"labels":{"A":"Forward","B":"Backward"}}</code>, lets the rep be played in reverse. A step's <code>"ease":"linear"</code> moves at a constant speed instead of speeding up and slowing down, for circles and other continuous motion; <code>"in"</code> speeds up to the end (a push that lets go of a ball at full speed) and <code>"out"</code> starts fast and slows (a catch that gives).</p>
      <p>Workouts: <code>{"version":2,"name":"...","blocks":[{"name":"Warm-up","items":[{"ex":"wu-arm-circles","reps":10,"dir":"both"},{"ex":"core-forearm-plank","seconds":30},{"ex":"bw-reverse-lunge","reps":8,"sets":2,"sides":"alternate","tempo":1}]}]}</code> (or several in <code>{"format":"nstructr/workout","workouts":[...]}</code>). <code>sides</code> is <code>"L"</code>, <code>"R"</code>, <code>"both"</code> or <code>"alternate"</code> (reps count per side), <code>dir</code> the same with <code>"A"</code>/<code>"B"</code>. A block can repeat as a circuit with <code>"rounds":3</code> and <code>"roundRest":30</code>. Rests between exercises and between sets are settings, not part of the file. A workout file can carry its own <code>exercises</code> too.</p>
      <p>History exports as <code>{"format":"nstructr/log","sessions":[{"name","start","end","seconds","completed","exercisesDone","exercisesTotal","exercises":[{"ex","name","category","sets","reps"|"seconds","sides","dir","block","round"}]}]}</code>, with ISO dates, ready for a logger or tracker to read.</p>
      <p>Staying put: <code>keep</code> lists hands or feet that stay exactly where they were in the previous step, e.g. <code>["ankleL","ankleR"]</code> so the feet don't move while the hips lift. <code>{"point":"ankleR","keyframe":0}</code> puts it back exactly where it was in that step instead (a foot stepping back to its starting spot). The knees or elbows bend to make it work.</p>
    `;
async function copyText(text, done) {
  try { await navigator.clipboard.writeText(text); snack(done); }
  catch (e) { showJson('Copy this', text); snack('Select the text and copy it.'); }
}
/* a Material dialog instead of the browser's confirm(): resolves true on the action, false on Cancel / Esc / outside */
/* true (yes), false (cancel), or with alt ({label, danger}) a third answer, "alt" */
function ask(title, text, yes = 'OK', danger = false, alt = null, no = 'Cancel') {
  const d = $('#askDialog');
  $('#askTitle').textContent = title; $('#askText').textContent = text || ''; $('#askText').hidden = !text;
  $('#askYes').textContent = yes; $('#askNo').textContent = no; $('#askYes').classList.toggle('danger-btn', danger);
  $('#askAlt').hidden = !alt; $('#askAlt').textContent = alt ? alt.label : ''; $('#askAlt').classList.toggle('danger-text', !!(alt && alt.danger));
  return new Promise(res => {
    const done = v => { d.removeEventListener('close', onClose); $('#askYes').onclick = $('#askNo').onclick = $('#askAlt').onclick = null; if (d.open) d.close(); res(v); };
    const onClose = () => done(false);
    $('#askYes').onclick = () => done(true); $('#askNo').onclick = () => done(false); $('#askAlt').onclick = () => done('alt');
    d.addEventListener('close', onClose); d.showModal(); $('#askNo').focus();
  });
}
function showJson(title, text) {
  $('#jsonTitle').textContent = title; $('#jsonArea').value = text; $('#jsonDialog').showModal();
}

/* ---------- Player ---------- */
function renderPlayerInfo() {
  const ex = S.ex; if (!ex) return;
  const pr = ex.prescription || {};
  $('#exName').textContent = ex.name;
  $('#exSub').textContent = otherNames(ex).join(', ');
  const chips = [];
  const c = (icon, text) => chips.push(`<span class="chip"><span class="icon">${icon}</span>${esc(text)}</span>`);
  if (ex.focus) c('target', ex.focus);
  if (ex.category && ex.category !== ex.focus) c('category', ex.category);
  (ex.equipment || []).forEach(q => c(/band/i.test(q) ? 'fitness_center' : /towel/i.test(q) ? 'dry_cleaning' : /wall|door/i.test(q) ? 'door_front' : 'handyman', q));
  if (pr.reps) c('tag', /\d\s*$/.test(pr.reps) ? `${pr.reps} ${repWord(ex, /^\d+$/.test(pr.reps.trim()) ? +pr.reps : null)}` : pr.reps);
  const vis = visibleSteps();                               // quiet in-between points (circles) aren't steps of their own
  $('#stepsTitle').textContent = `Steps (${vis.length})`;
  // steps
  const phaseTag = i => { const ph = (S.ex.keyframes[i] || {}).phase; return ph === 'setup' ? ' <span class="tag">Setup</span>' : ph === 'finish' ? ' <span class="tag">Finish</span>' : ''; };
  $('#stepList').innerHTML = vis.map((i, n) => [S.resolved[i], i, n]).map(([r, i, n]) => `<li><button class="stateful" data-step="${i}"><span class="num">${n + 1}</span>
    <span class="title-small">${esc(r.name || 'Step ' + (i + 1))}${r.hold >= 3000 ? ` <span class="muted body-small">(hold ${Math.round(r.hold / 1000)} s)</span>` : ''}${phaseTag(i)}</span>
    ${r.cue ? `<span class="sub">${esc(r.cue)}</span>` : ''}</button></li>`).join('');
  // how to
  let how = '';
  if (ex.setup) how += `<h3 class="title-small">Setup</h3><ol>${ex.setup.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`;
  if (ex.cues) how += `<h3 class="title-small">Form</h3><ul>${ex.cues.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`;
  if (!how) how = '<p class="muted">No instructions for this exercise.</p>';
  // then: how long a round takes, where it comes from, and the note on reps
  const src = ex.source || {};
  how += `<p class="ex-time body-medium" id="exTime"><span class="icon">timer</span>About ${Math.round(S.total / 1000)} s per round${ex.bilateral ? ', each side' : ''}</p>`;
  if (/^https?:\/\//i.test(src.url || '')) how += `<p class="ex-src"><a class="source" href="${esc(src.url)}" target="_blank" rel="noopener"><span class="icon" style="font-size:18px">${/youtu/.test(src.url) ? 'play_circle' : 'open_in_new'}</span>${esc(src.title || 'Source')}</a></p>`;   // only web links: a shared file could carry javascript:
  if (src.note) how += `<p class="body-small muted">${esc(src.note)}</p>`;
  if (pr.note) how += `<div class="note"><span class="icon">info</span><span class="body-medium">${esc(pr.note)}</span></div>`;
  $('#howPanel').innerHTML = how;
  // about
  $('#aboutPanel').innerHTML = `${ex.description ? `<p class="body-large">${esc(ex.description)}</p>` : ''}
    ${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}
    ${musclesHTML(ex)}
    ${linksHTML(ex)}
    <div class="row" style="margin-top:12px">${findInDb(ex.id) ? '' : `<button class="btn tonal stateful" data-act="shareEx"><span class="icon">share</span>Share</button>`}
    <button class="btn text stateful authoring-only" data-act="json"><span class="icon">data_object</span>Show JSON</button>
    ${isOwn(ex.id) ? `<button class="btn text stateful danger" data-del="${esc(ex.id)}"><span class="icon">delete</span>Delete</button>` : ''}</div>`;
  updateSaveBtn();
  $('#adjustPanel').hidden = !XC.editing;
  updateEditor();
  S.shownIdx = -1;
}
function updateSaveBtn() {
  const saved = S.ex && isBookmarked(S.ex.id), b = $('#saveBtn');
  b.innerHTML = `<span class="icon${saved ? ' fill' : ''}">${saved ? 'bookmark' : 'bookmark_add'}</span>`;
  b.setAttribute('aria-label', saved ? 'Remove bookmark' : 'Bookmark');
  b.title = saved ? 'Bookmarked' : 'Bookmark';
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

/* ---------- Editing an exercise ----------
   The Edit button (pencil, top bar) is for everyone: the words (name, description, instructions, each step's name
   and spoken cue). Advanced exercise editor adds the poses and the camera, and the JSON. While editing, playback pauses and,
   on narrow screens, the figure stays pinned at the top so the change can be seen; the controls on the figure
   fade even while paused so they don't cover the pose. */
function openEditor() {
  if (!S.ex) return;
  setPlaying(false); hideExControls();
  jumpTo(S.idx);                                           // show the step's own pose, not wherever the animation paused
  XC.editing = true; document.body.classList.add('ex-editing');
  $('#adjustPanel').hidden = false; updateEditor();
  requestAnimationFrame(() => $('#adjustPanel').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
}
function closeEditor() {
  XC.editing = false; document.body.classList.remove('ex-editing');
  $('#adjustPanel').hidden = true;
}
$('#editPoseBtn').addEventListener('click', () => (XC.editing ? closeEditor() : openEditor()));

/* ---------- Sound in the exercise player ----------
   It follows the Instruction setting: Silent and Beeps stay quiet (there are no rests or holds to beep for); Coach and
   Instructor read each step's cue on the first pass through the exercise (the step waits for its line), then count the
   reps. Pausing stops the voice; a new side or direction starts a new first pass. */
const XS = { speaking: false, token: 0, last: '' };
const LOOP_KEY = 'nstructr-loop-v1', EXMUTE_KEY = 'nstructr-exmute-v1';
const loopOn = () => pref(LOOP_KEY, 'on') !== 'off';             // the exercise page repeats the exercise (off: once through, then stop)
const exMuted = () => pref(EXMUTE_KEY, 'on') !== 'off';          // the overlay's mute: quiets the exercise page only (muted until unmuted, since Sep 2026)
const exVoice = () => (WK.sound === 'voice' || WK.sound === 'coach') && !exMuted();
function renderExToggles() {
  const l = $('#loopBtn'), m = $('#muteBtn'); if (!l || !m) return;
  l.setAttribute('aria-pressed', String(loopOn())); l.setAttribute('aria-label', loopOn() ? 'Loop: on' : 'Loop: off');
  l.querySelector('.icon').textContent = loopOn() ? 'repeat_on' : 'repeat';
  const soundOn = WK.sound === 'voice' || WK.sound === 'coach', heard = soundOn && !exMuted();
  m.setAttribute('aria-pressed', String(!heard)); m.setAttribute('aria-label', heard ? 'Mute' : 'Unmute');
  m.querySelector('.icon').textContent = heard ? 'volume_up' : 'volume_off';
}
$('#loopBtn').addEventListener('click', () => {
  setPref(LOOP_KEY, loopOn() ? 'off' : 'on'); renderExToggles();
  snack(loopOn() ? 'Loop on: the exercise repeats' : 'Loop off: once through, then it stops');
});
$('#muteBtn').addEventListener('click', () => {
  if (!(WK.sound === 'voice' || WK.sound === 'coach')) { snack('The exercise voice follows Settings → Instruction: choose Coach or Instructor.', 5000); return; }
  setPref(EXMUTE_KEY, exMuted() ? 'off' : 'on'); renderExToggles();
  if (exMuted()) exHush(); else if (S.playing) { XS.last = ''; exStepSound(S.idx); }
});
function exStepSound(i) {
  if (S.view !== 'player' || S.mode === 'workout' || !S.playing || !exVoice() || XC.editing) return;
  const r = S.resolved[i]; if (!r) return;
  const key = [i, S.rep, S.side, S.dir].join(':'); if (key === XS.last) return;   // redrawing the same step says nothing new
  XS.last = key;
  if (S.rep === 1) {
    if (r.quiet || !(r.cue || r.name)) return;
    XS.speaking = true; const token = ++XS.token;
    say(r.cue || r.name).then(() => { if (XS.token === token) XS.speaking = false; });
  } else if (i === (S.phase ? S.phase.start : 0) && S.ex.measure !== 'time') say(String(S.rep), { dropIfBusy: true });
}
function exHush() { XS.token++; XS.speaking = false; XS.last = ''; try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { } }

/* ---------- Settings ---------- */
const THEME_KEY = 'nstructr-theme-v1', SPEED_KEY = 'nstructr-speed-v1', AUTHOR_KEY = 'nstructr-authoring-v1', REST_KEY = 'nstructr-rest-between-v1', REST_SETS_KEY = 'nstructr-rest-sets-v1', AUTOPLAY_KEY = 'nstructr-autoplay-v1', SPEECH_RATE_KEY = 'nstructr-speech-rate-v1', ENCOURAGE_KEY = 'nstructr-encourage-v1', EQUIP_PAUSE_KEY = 'nstructr-equip-pause-v1';
const pref = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
const setPref = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
const authoring = () => pref(AUTHOR_KEY, 'off') === 'on';
/* Advanced exercise editor shows the tools for making exercises (the poses and camera, JSON views, exporters) */
function applyAuthoring() {
  document.body.classList.toggle('authoring', authoring());
  if (S.ex) updateEditor();
}
/* exercises start playing when opened, unless turned off (or the system asks for reduced motion) */
const autoplay = () => pref(AUTOPLAY_KEY, 'on') !== 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
/* seconds of rest between exercises, in every workout (a setting since Sep 2026; workout files' "restBetween" is ignored) */
/* − / + buttons: one step per tap, hold to keep going (the tap that ends a hold adds nothing) */
function holdRepeat(box, sel, nudge) {
  let hold = null;
  const stop = () => { if (hold) { clearTimeout(hold.t); clearInterval(hold.i); } };
  box.addEventListener('pointerdown', e => {
    const b = e.target.closest(sel); if (!b || b.disabled) return;
    stop(); hold = { b, repeated: false };
    hold.t = setTimeout(() => { hold.repeated = true; hold.i = setInterval(() => nudge(b), 110); }, 450);
  });
  addEventListener('pointerup', stop); addEventListener('pointercancel', stop);
  box.addEventListener('click', e => {
    const b = e.target.closest(sel); if (!b) return;
    if (hold && hold.b === b && hold.repeated) { hold = null; return; }
    nudge(b);
  });
}
/* text-to-speech speed (SpeechSynthesisUtterance.rate): 0.5–3 in steps of 0.1, 1 = the voice's normal speed */
const speechRate = () => { const v = parseFloat(pref(SPEECH_RATE_KEY, '1')); return v >= 0.5 && v <= 3 ? v : 1; };
let RATE_T = 0;
function setRate(v, preview = true) {
  v = Math.min(3, Math.max(0.5, Math.round((+v || 1) * 10) / 10));
  setPref(SPEECH_RATE_KEY, String(v));
  $('#setRate').textContent = `${fmtNum(v, 1)}×`;
  document.querySelectorAll('[data-rate-delta]').forEach(b => { b.disabled = +b.dataset.rateDelta < 0 ? v <= 0.5 : v >= 3; });
  // hear it (once the buttons are let go), whatever the Instruction setting
  clearTimeout(RATE_T);
  if (preview && 'speechSynthesis' in window) RATE_T = setTimeout(() => {
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance('This is how fast I speak.'); u.lang = LANG; u.rate = speechRate(); speechSynthesis.speak(u); } catch (e) { }
  }, 400);
}
/* Coach's and Instructor's words of encouragement (on unless turned off) */
const encourageOn = () => pref(ENCOURAGE_KEY, 'on') !== 'off';
const restGap = () => { const v = parseFloat(pref(REST_KEY, '5')); return v >= 0 ? v : 5; };
/* seconds of rest between sets of an exercise, in every workout (a setting since Sep 2026; items' "rest" is ignored) */
const restSets = () => { const v = parseFloat(pref(REST_SETS_KEY, '10')); return v >= 0 ? v : 10; };
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}
function renderSettings() {
  const seg = (id, key, opts, cur) => { $(id).innerHTML = opts.map(([v, l]) => `<button class="stateful" data-${key}="${v}" aria-pressed="${String(v) === String(cur)}"><span class="icon">check</span>${l}</button>`).join(''); };
  seg('#setSound', 'setsound', SOUND_MODES.map(m => [m[0], m[2]]), WK.sound);
  seg('#setTheme', 'settheme', [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], pref(THEME_KEY, 'system'));
  $('#setFullscreen').checked = wantFullscreen();
  $('#setAutoplay').checked = pref(AUTOPLAY_KEY, 'on') !== 'off';
  $('#setRest').value = restGap(); $('#setRestSets').value = restSets(); setRate(speechRate(), false);
  $('#setAuthoring').checked = authoring();
  $('#setEncourage').checked = encourageOn(); $('#setEncourageRow').hidden = !['voice', 'coach'].includes(WK.sound);
  $('#setEquipPause').checked = equipPauseOn();
  renderPersistNote();
}
$('#view-settings').addEventListener('click', e => {
  const b = e.target.closest('[data-setsound], [data-settheme]'); if (!b) return;
  const d = b.dataset;
  if (d.setsound) { setSound(d.setsound); $('#setEncourageRow').hidden = !['voice', 'coach'].includes(d.setsound); }
  if (d.settheme) { setPref(THEME_KEY, d.settheme); applyTheme(d.settheme); }
  b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
});
$('#setFullscreen').addEventListener('change', e => setPref(FS_KEY, e.target.checked ? 'on' : 'off'));
/* Report a bug: GitHub's bug form (.github/ISSUE_TEMPLATE/bug.yml), with the phone and browser filled in */
const BUG_URL = 'https://github.com/sanicki/nstructr/issues/new?template=bug.yml';
function bugDevice() {
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  return `${navigator.userAgent} · screen ${innerWidth}×${innerHeight} · ${installed ? 'installed app' : 'browser'}`.slice(0, 300);
}
$('#bugLink').addEventListener('click', e => { e.currentTarget.href = `${BUG_URL}&device=${encodeURIComponent(bugDevice())}`; });
$('#setEncourage').addEventListener('change', e => setPref(ENCOURAGE_KEY, e.target.checked ? 'on' : 'off'));
$('#setEquipPause').addEventListener('change', e => setPref(EQUIP_PAUSE_KEY, e.target.checked ? 'on' : 'off'));
$('#setAutoplay').addEventListener('change', e => setPref(AUTOPLAY_KEY, e.target.checked ? 'on' : 'off'));
const REST_FIELDS = { between: [REST_KEY, '#setRest', () => restGap()], sets: [REST_SETS_KEY, '#setRestSets', () => restSets()] };
function setRest(which, v) {
  v = Math.min(300, Math.max(0, Math.round(+v || 0)));
  const [key, field] = REST_FIELDS[which]; setPref(key, String(v)); $(field).value = v;
}
$('#setRest').addEventListener('change', e => setRest('between', e.target.value));
$('#setRestSets').addEventListener('change', e => setRest('sets', e.target.value));
holdRepeat($('#view-settings'), '[data-rate-delta]', b => setRate(speechRate() + +b.dataset.rateDelta / 10));
holdRepeat($('#view-settings'), '[data-rest-delta]', b => setRest(b.dataset.restKey, REST_FIELDS[b.dataset.restKey][2]() + +b.dataset.restDelta));
$('#setAuthoring').addEventListener('change', e => { setPref(AUTHOR_KEY, e.target.checked ? 'on' : 'off'); applyAuthoring(); snack(e.target.checked ? 'Advanced exercise editor on: the Edit button (pencil) on any exercise now shows the poses and camera too' : 'Advanced exercise editor off', 6000); });

applyAuthoring();
