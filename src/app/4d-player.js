/* ===================== Workout player: running a workout (state, the next exercise, rests, history, gestures, the screen) ===================== */
const WP = { w: null, flat: [], i: 0, set: 0, seg: 0, phase: 'idle', restLeft: 0, restNext: null, started: 0, beeped: {} };
function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; } }
function saveSession() { if (WP.test) return; try { localStorage.setItem(SESSION_KEY, JSON.stringify({ wid: WP.w.id, i: WP.i, ...(Object.keys(WP.swaps || {}).length ? { swaps: WP.swaps } : {}) })); } catch (e) { } }
function dropSession() { try { localStorage.removeItem(SESSION_KEY); } catch (e) { } }

/* keep the screen on while working out */
let WAKE = null;
async function wakeOn() { try { if ('wakeLock' in navigator && !WAKE) { WAKE = await navigator.wakeLock.request('screen'); WAKE.addEventListener('release', () => { WAKE = null; }); } } catch (e) { } }
function wakeOff() { try { if (WAKE) WAKE.release(); } catch (e) { } WAKE = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.view === 'wplay' && WP.phase !== 'done') wakeOn(); });

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
  if (need.length) { WP.phase = 'work'; const lines = [checklistLine(need)]; startRest(0, 'start', { seconds: equipSpoken([w.name, ...lines]), lines, need }); }
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
    const bits = [again ? SAY.set(WP.set + 1) : ex.name];
    if (segs.length > 1 && WP.seg > 0) { const prev = segs[WP.seg - 1]; bits[0] = prev.side !== segInfo.side ? (prev.dir !== segInfo.dir ? SAY.switchBoth : SAY.switchSides) : SAY.switchDir; }   // what actually changed
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
    say(repCheer() ? coachWord('cheer') : SAY.and, { dropIfBusy: true });
  }
  // a step call: what comes next in a multi-step rep ("1 … Forward. Right. Back. Left."); like a count, skipped if it's
  // still talking (the count wins)
  if (m.call) say(m.call, { dropIfBusy: true });
  renderWpCount();
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
  // the title card lists what you'll need as bullets (owner, Oct 2026); an equipment change says what to do on one line
  if (ch && ch.need) $('#wpRestEquip').innerHTML = `<span>You'll need:</span><ul class="ov-equip-list">${ch.need.map(q => `<li>${esc(q)}</li>`).join('')}</ul>`;
  else $('#wpRestEquip').textContent = ch ? ch.lines.join(' · ') : '';
  $('#wpRestEquip').hidden = !ch;
  $('#wpRestTime').textContent = WP.waitReady || title ? '' : fmtTime(Math.ceil(seconds)); $('#wpRestTime').hidden = WP.waitReady || title;
  $('[data-wact="restSkip"]').textContent = WP.waitReady ? 'Ready' : title ? 'Start' : 'Skip'; $('[data-wact="restMore"]').hidden = WP.waitReady || title;
  // show where the next exercise starts: moving there through the at-rest pose when it can, or straight there
  stagePlan(buildPlan(cur.item, itemSegments(cur.item)[0]));
  S.onStep = null; S.onPlanEnd = null; S.planDone = false;
  if (S.trans) { S.playing = true; S.t = 0; S.canAdvance = i => i < S.trans; }    // stops once it's in the first step
  else { S.playing = false; S.t = S.resolved[0].dur; }
  renderWpInfo();
  const rest = WP.waitReady ? '' : SAY.rest(Math.ceil(seconds));
  const first = (title ? `${WP.w.name}.` : kind === 'set' ? rest : kind === 'round' ? `${SAY.roundDone(cur.round)} ${rest}` : `${rest} ${SAY.next(ex.name)}`).trim();
  const token = WP.restToken = (WP.restToken || 0) + 1;
  // the title card stays until it has said all of it (a voice can be slower than its estimate), then half a second more
  WP.restTalking = title;
  say(first).then(() => ch && WP.restToken === token && WP.phase === 'rest' ? sayEquipment(ch, WP.waitReady ? ' ' + SAY.tapReady : '') : null)
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
