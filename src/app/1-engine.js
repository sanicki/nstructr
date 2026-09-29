/* ===== App ===== */
const STORE_KEY = 'pose-player-library-v1';            // kept from the Pose Player days so saved exercises survive
const APP_NAME = 'NstructR';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'exercise';
const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ---------- Import & validation ---------- */
function normalizeImport(data) {
  let list;
  if (Array.isArray(data)) list = data;
  else if (data && Array.isArray(data.exercises)) list = data.exercises;
  else if (data && data.exercise && typeof data.exercise === 'object') list = [data.exercise];
  else if (data && Array.isArray(data.keyframes)) list = [data];
  else throw new Error('No exercises found. Expected an "exercises" array, or one exercise with "keyframes".');
  if (!list.length) throw new Error('The "exercises" array is empty.');
  return list.map((ex, i) => validateExercise(ex, list.length > 1 || data.exercises ? `exercises[${i}]` : 'exercise'));
}
function validateExercise(ex, path) {
  const fail = m => { throw new Error(m); };
  if (!ex || typeof ex !== 'object') fail(`${path} must be an object.`);
  if (typeof ex.name !== 'string' || !ex.name.trim()) fail(`${path}.name is missing.`);
  if (!Array.isArray(ex.keyframes) || !ex.keyframes.length) fail(`${path}.keyframes needs at least one keyframe.`);
  ex.keyframes.forEach((kf, j) => {
    const p = `${path}.keyframes[${j}]`;
    if (!kf || typeof kf !== 'object') fail(`${p} must be an object.`);
    if (kf.pose != null && (typeof kf.pose !== 'object' || Array.isArray(kf.pose))) fail(`${p}.pose must be an object of joint angles.`);
    const deg = v => typeof v === 'number' && isFinite(v);
    for (const [k, v] of Object.entries(kf.pose || {})) {
      if (!JOINT_KEYS.includes(k)) fail(`${p}.pose.${k} isn't a known joint. Joints: ${JOINT_KEYS.join(', ')}.`);
      if (BALL.has(k) ? !(Array.isArray(v) && v.length === 3 && v.every(deg)) : !deg(v))
        fail(BALL.has(k) ? `${p}.pose.${k} must be three numbers of degrees: [forward, side, turn].` : `${p}.pose.${k} must be a number of degrees.`);
    }
    if (kf.view != null || kf.layers != null) fail(`${p} uses "view"/"layers" from the old 2D format; use "camera" (90 side, 0 front) and 3D joint angles.`);
    if (kf.camera != null && !deg(kf.camera)) fail(`${p}.camera must be a number of degrees (90 = side view, 0 = front).`);
    for (const f of ['anchorX', 'anchorY', 'anchorZ', 'lift']) if (kf[f] != null && !deg(kf[f])) fail(`${p}.${f} must be a number.`);
    if (kf.anchor != null && !POINTS.includes(kf.anchor)) fail(`${p}.anchor must be one of: ${POINTS.join(', ')}.`);
    if (kf.plant != null && (!Array.isArray(kf.plant) || kf.plant.some(s => s !== 'L' && s !== 'R'))) fail(`${p}.plant must be a list of "L" and/or "R".`);
    if (kf.touch != null) {
      if (!Array.isArray(kf.touch)) fail(`${p}.touch must be a list.`);
      kf.touch.forEach((t, k) => {
        if (!t || !POINTS.includes(t.point)) fail(`${p}.touch[${k}].point must be one of: ${POINTS.join(', ')}.`);
        const ref = jointRef(t.adjust || ''), part = String(t.adjust || '').split('.')[1];
        if (!JOINT_KEYS.includes(ref.j) || (part && (!BALL.has(ref.j) || !COMPONENTS.includes(part))))
          fail(`${p}.touch[${k}].adjust must be a joint name, or a ball joint's number like "hipR.side" (${COMPONENTS.join(', ')}).`);
      });
    }
    if (kf.keep != null && (!Array.isArray(kf.keep) || kf.keep.some(k => !/^(ankle|hand)[LR]$/.test(typeof k === 'string' ? k : (k && k.point) || '') || (typeof k === 'object' && !(Number.isInteger(k.keyframe) && k.keyframe >= 0 && k.keyframe < ex.keyframes.length)))))
      fail(`${p}.keep must list ankleL/ankleR/handL/handR, or {"point": "ankleR", "keyframe": 0} to return to where it was in that step.`);
    if (kf.quiet != null && typeof kf.quiet !== 'boolean') fail(`${p}.quiet must be true or false.`);
    if (kf.ease != null && !['smooth', 'linear'].includes(kf.ease)) fail(`${p}.ease must be "smooth" or "linear".`);
    if (kf.phase != null && !['setup', 'rep', 'finish'].includes(kf.phase)) fail(`${p}.phase must be "setup", "rep" or "finish".`);
    for (const f of ['durationMs', 'holdMs']) if (kf[f] != null && (typeof kf[f] !== 'number' || kf[f] < 0)) fail(`${p}.${f} must be a positive number of milliseconds.`);
  });
  if (ex.measure != null && !['reps', 'time'].includes(ex.measure)) fail(`${path}.measure must be "reps" or "time".`);
  if (ex.direction != null && !(ex.direction && ex.direction.labels)) fail(`${path}.direction needs "labels", e.g. {"A": "Forward", "B": "Backward"}.`);
  if (ex.props != null) {
    if (!Array.isArray(ex.props)) fail(`${path}.props must be a list.`);
    ex.props.forEach((pr, k) => {
      const p = `${path}.props[${k}]`;
      if (!pr || !PROP_TYPES.includes(pr.type)) fail(`${p}.type must be one of: ${PROP_TYPES.join(', ')}.`);
      if (WEIGHT_TYPES.includes(pr.type)) {
        const hands = pr.type === 'barbell' ? [pr.from, pr.to] : pr.type === 'medball' ? (pr.hands || ['handL', 'handR']) : (pr.hands || [pr.hand]);
        if (!hands.length || hands.some(h => !['handL', 'handR'].includes(h))) fail(`${p} (a ${pr.type}) needs ${pr.type === 'barbell' ? '"from" and "to" hands' : '"hand"'}: "handL" or "handR".`);
        if (pr.axis != null && !['lr', 'fb', 'ud'].includes(pr.axis)) fail(`${p}.axis must be "lr", "fb" or "ud".`);
        return;
      }
      for (const f of ['x', 'z']) if (pr[f] != null && !isFinite(pr[f])) fail(`${p}.${f} must be a number.`);
      if (pr.type === 'bar') {
        if (!(num(pr.y) > 0)) fail(`${p} (a pull-up bar) needs "y": its height, e.g. 385.`);
        return;
      }
      if (SURFACE_TYPES.includes(pr.type)) {
        for (const f of ['width', 'depth', 'height', 'backHeight']) if (pr[f] != null && !(pr[f] > 0)) fail(`${p}.${f} must be a positive number.`);
        if (pr.back != null && !['behind', 'ahead'].includes(pr.back)) fail(`${p}.back must be "behind" or "ahead".`);
        return;
      }
      if (pr.type === 'wall') {
        if (pr.at != null && !(typeof pr.at === 'string' && POINTS.includes(pr.at))) fail(`${p}.at must be a body point the wall stands against.`);
        return;
      }
      for (const end of ['from', 'to']) {
        const v = pr[end];
        const ok = (typeof v === 'string' && POINTS.includes(v)) || (v && typeof v === 'object' && ['x', 'y', 'z'].every(c => v[c] == null || isFinite(v[c])));
        if (!ok) fail(`${p}.${end} must be a body point (${POINTS.join(', ')}) or a fixed spot like {"z": 120, "y": 40}.`);
      }
      if (pr.restLength != null && !(pr.restLength > 0)) fail(`${p}.restLength must be a positive number.`);
      if (pr.via != null && (!Array.isArray(pr.via) || pr.via.some(v => !POINTS.includes(v)))) fail(`${p}.via must be a list of body points.`);
    });
  }
  const clone = modernize(JSON.parse(JSON.stringify(ex)));
  if (clone.otherNames != null && !(Array.isArray(clone.otherNames) && clone.otherNames.every(n => typeof n === 'string'))) fail(`${path}.otherNames must be a list of names.`);
  clone.id = typeof ex.id === 'string' && ex.id.trim() ? ex.id.trim() : slug(ex.name);
  if (Array.isArray(clone.equipment)) clone.equipment = equipNames(clone.equipment);
  return clone;
}
/* equipment is matched without case or extra spaces: "resistance band" (from an AI or a file) is the library's
   "Resistance band", so it shows under the same filter */
const equipKey = q => String(q).trim().replace(/\s+/g, ' ').toLowerCase();
function equipName(q) {
  const k = equipKey(q);
  for (const ex of POSE_DB.exercises) for (const x of ex.equipment || []) if (equipKey(x) === k) return x;
  return String(q).trim().replace(/\s+/g, ' ');
}
const equipNames = list => [...new Map(list.filter(q => typeof q === 'string' && q.trim()).map(q => [equipKey(q), equipName(q)])).values()];

/* Fields renamed since (Sep 2026): "sanskrit" (one text, comma-separated) is "otherNames" (a list), and "library" (one
   collection) is "collections" (a list). Files, links and saved exercises written before are read the new way. */
function modernize(ex) {
  if (!ex || typeof ex !== 'object') return ex;
  if (ex.sanskrit != null) { if (!ex.otherNames) ex.otherNames = String(ex.sanskrit).split(/\s*,\s*/).filter(Boolean); delete ex.sanskrit; }
  if (ex.library != null) { if (!ex.collections) ex.collections = [String(ex.library)]; delete ex.library; }
  return ex;
}
const otherNames = ex => (Array.isArray(ex.otherNames) ? ex.otherNames : []);

/* ---------- Library persistence ---------- */
const findInDb = id => POSE_DB.exercises.find(it => it.id === id);
const clone = o => JSON.parse(JSON.stringify(o));
function loadLib() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) { const d = JSON.parse(raw); if (Array.isArray(d.items)) { d.items.forEach(modernize); return d; } } } catch (e) { }
  return { items: [] };
}
let saveTimer = 0;
const writeLib = () => { clearTimeout(saveTimer); saveTimer = 0; try { localStorage.setItem(STORE_KEY, JSON.stringify({ items: S.lib.items, current: S.ex && S.ex.id })); } catch (e) { } };
function saveLib() { clearTimeout(saveTimer); saveTimer = setTimeout(writeLib, 250); }
// don't lose the last quarter second of edits when the app is closed or hidden
addEventListener('pagehide', () => { if (saveTimer) writeLib(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && saveTimer) writeLib(); });

/* ---------- State ---------- */
const S = {
  lib: loadLib(), ex: null, seg: DEFAULT_SEGMENTS, side: 'L', resolved: [], idx: 0, t: 0,
  playing: !matchMedia('(prefers-reduced-motion: reduce)').matches, speed: 1, shiftX: 0, rep: 1, view: 'explore', dir: 'A', prev: null, mode: 'explore', last: 0, shownIdx: -1, total: 1, offsets: []
};

const WORD_SWAP = { left: 'right', right: 'left', Left: 'Right', Right: 'Left', LEFT: 'RIGHT', RIGHT: 'LEFT' };
const swapWords = s => (typeof s === 'string' ? s.replace(/\b(left|right|Left|Right|LEFT|RIGHT)\b/g, m => WORD_SWAP[m]) : s);
const sideVersion = kf => (S.side === 'R' ? { ...mirrorKeyframe(kf), name: swapWords(kf.name), cue: swapWords(kf.cue) } : kf);
/* an exercise's steps for a given side and direction */
function versionOf(ex, side, dir) {
  let kfs = ex.keyframes;
  // the other direction plays the rep steps in reverse. Names and cues stay as written: they name positions
  // ("Forward.", "Out to the side."), which don't change when the circle runs the other way
  if (dir === 'B') kfs = reverseReps(kfs);
  if (side === 'R') kfs = kfs.map(k => {
    const m = { ...mirrorKeyframe(k), name: swapWords(k.name), cue: swapWords(k.cue) };
    if (m.guide) m.guide = { ...m.guide, label: swapWords(m.guide.label) };      // "Back left" becomes "Back right" too
    return m;
  });
  return kfs;
}

/* where a resolved step's body points are on screen (its own camera; dx = the framing shift) */
function stepScreen(r, seg = S.seg, dx = 0) {
  SUPPORTS = r.supports || SUPPORTS;
  const Q = project(fkAt(r.pose, seg, place(r.pose, seg, r.rule)), r.cam);
  if (dx) for (const k in Q) Q[k].x += dx;
  return Q;
}
/* the screen x range of a sequence: every step's body, walls and surfaces */
function sequenceSpan(R, seg, dx = 0, centre = false) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity;
  for (const r of R) {
    // (a travelling exercise is drawn with the view following the pelvis: each step centred on it)
    const Q = stepScreen(r, seg, dx);
    if (centre) { const d = W / 2 - Q.pelvis.x; for (const k in Q) Q[k].x += d; }
    for (const k of POINTS) { minX = Math.min(minX, Q[k].x); maxX = Math.max(maxX, Q[k].x); minY = Math.min(minY, Q[k].y); }
    for (const wl of R.walls || []) if (wl) { const w = wallOnScreen(wl, r.cam); if (w.show > 0.02) { minX = Math.min(minX, w.x + dx - 6); maxX = Math.max(maxX, w.x + dx + 6); } }
    for (const sh of surfaceShapes(R.supports, r.cam)) { minX = Math.min(minX, sh.x0 + dx - 6); maxX = Math.max(maxX, sh.x1 + dx + 6); }
  }
  for (const s of R.supports || []) minY = Math.min(minY, FLOOR - s.h - (s.backHeight || 0));
  for (const b of R.bars || []) minY = Math.min(minY, FLOOR - num(b.y) - 6);
  return { minX, maxX, minY };
}
function rebuild() {
  if (!S.ex) { S.resolved = []; return; }
  S.props = S.side === 'R' ? mirrorProps(S.ex.props) : (S.ex.props || []);
  S.resolved = resolveSequence(versionOf(S.ex, S.side, S.dir), S.seg, S.ex, S.props);
  S.phase = phaseInfo(S.ex.keyframes);
  S.mode = 'explore';
  S.offsets = []; let acc = 0;
  for (const r of S.resolved) { S.offsets.push(acc); acc += r.dur + r.hold; }
  S.total = acc || 1;
  S.bandRest = bandRestLengths(S.props, S.resolved, S.seg);
  S.travel = !!S.ex.travel; S.off = { x: 0, z: 0 };
  // Frame the whole sequence: one constant horizontal shift so every keyframe stays on stage (nothing slides)
  const { minX, maxX, minY } = sequenceSpan(S.resolved, S.seg, 0, S.travel);
  S.shiftX = isFinite(minX) ? W / 2 - (minX + maxX) / 2 : 0;
  // the stage is 400 square with the floor near the bottom; something higher (a pull-up bar) widens the view, still square
  // (only when clearly beyond the top: arms overhead just reach it and keep the usual view)
  const top = isFinite(minY) && minY < -20 ? minY - 16 : 0, side = 400 - top;
  scene.setAttribute('viewBox', `${(W - side) / 2} ${top} ${side} ${side}`); syncLimbWidth();
  S.idx = Math.min(S.idx, S.resolved.length - 1);
  S.shownIdx = -1;
}

/* ---------- Figure: a 3D skeleton, projected and drawn far to near ----------
   Each part (the legs, the arms, the body) is a group of lines; every frame moves the lines to the projected points
   and, when the order by depth changes, re-stacks the groups. A leg crossing behind the other is behind because it is. */
const scene = $('#scene');
const FIG = { bones: [], order: [] };
function buildFigure() {
  const cls = { legL: 'side-L', armL: 'side-L', legR: 'side-R', armR: 'side-R', body: 'core' };
  // each bone in its own group (with the hand at the end of a forearm, the head on the neck), so they can be stacked
  const extra = { 'elbowL-handL': '<circle class="hand" r="6.5" data-at="handL"/><g class="wts" data-hand="handL"></g>',
    'elbowR-handR': '<circle class="hand" r="6.5" data-at="handR"/><g class="wts" data-hand="handR"></g>', 'neckBase-head': `<circle class="head" r="${S.seg.head}" data-at="head"/>` };
  scene.innerHTML =
    `<line class="floor-line" x1="${-5 * W}" y1="${FLOOR + 7}" x2="${6 * W}" y2="${FLOOR + 7}"/>` +
    `<ellipse class="shadow" id="figShadow" cy="${FLOOR + 7}" rx="52" ry="6"/><g class="floor-ticks" id="floorTicks"></g>` +
    `<g id="propsBack"></g><g id="figRoot">` +
    BONES.map(bn => `<g class="${cls[bn.part]}" data-bone="${bn.id}"><line class="bone" vector-effect="non-scaling-stroke"/>${extra[bn.id] || ''}</g>`).join('') +
    `</g><g id="propsFront"></g>`;
  FIG.bones = BONES.map(bn => { const g = scene.querySelector(`[data-bone="${bn.id}"]`); return { ...bn, g, line: g.querySelector('line'), dots: [...g.querySelectorAll('[data-at]')] }; });
  FIG.order = BONES.map(bn => bn.id);
}

/* keep every bone the same thickness at any zoom: scale the screen-pixel limbs to the scene's current scale */
function syncLimbWidth() {
  const vb = scene.viewBox && scene.viewBox.baseVal, r = scene.getBoundingClientRect();
  if (!vb || !vb.width || !r.width) return;
  const s = Math.min(r.width / vb.width, r.height / vb.height);          // preserveAspectRatio "meet"
  scene.style.setProperty('--limb-px', (10 * s).toFixed(2) + 'px');
}
if ('ResizeObserver' in window) new ResizeObserver(syncLimbWidth).observe(scene);
addEventListener('resize', syncLimbWidth);

/* draw one frame: Q = screen points */
function applyPose(Q) {
  const f = n => n.toFixed(1);
  for (const bn of FIG.bones) {
    const a = Q[bn.a], b = Q[bn.b], ln = bn.line;
    ln.setAttribute('x1', f(a.x)); ln.setAttribute('y1', f(a.y)); ln.setAttribute('x2', f(b.x)); ln.setAttribute('y2', f(b.y));
    for (const d of bn.dots) { const p = Q[d.dataset.at]; d.setAttribute('cx', f(p.x)); d.setAttribute('cy', f(p.y)); }
  }
  $('#figShadow').setAttribute('cx', f(Q.pelvis.x));
  const order = boneOrder(Q, FIG.order);
  if (order.join() !== FIG.order.join()) {
    FIG.order = order;
    const root = $('#figRoot'), byId = new Map(FIG.bones.map(bn => [bn.id, bn.g]));
    for (const id of order) root.appendChild(byId.get(id));
  }
}

/* ---------- Equipment ---------- */
function drawProps(P, Q, pose, cam) {
  let back = '', front = '';
  const dx = S.shiftX, proj = p => { const q = project({ p }, cam).p; return { x: q.x + dx, y: q.y, d: q.d }; };
  // chairs, benches and steps sit behind the figure
  for (const sh of surfaceShapes(S.resolved.supports || [], cam)) back += `<path class="surface${sh.solid ? ' solid' : ''}${sh.ball ? ' ball' : ''}${sh.block ? ' block' : ''}" transform="translate(${dx.toFixed(1)} 0)" d="${sh.d}"/>`;
  const M0 = rootM(pose.root), wts = { handL: '', handR: '' };
  S.props.forEach((pr, i) => {
    if (SURFACE_TYPES.includes(pr.type)) return;
    if (WEIGHT_TYPES.includes(pr.type)) {
      const svg = weightSVG(pr, P, M0, proj);
      // a weight in one hand is drawn with that arm (behind the body if the arm is); a barbell in front
      if (pr.hand && wts[pr.hand] != null) wts[pr.hand] += svg; else front += svg;
      return;
    }
    if (pr.type === 'bar') { front += barSVG(pr, proj, 'bar'); return; }
    if (pr.type === 'ring') { front += ringSVG(pr, P, proj, 'ring'); return; }
    if (pr.type === 'wall') {
      const wl = S.resolved.walls[i]; if (!wl) return;
      // a wall seen edge-on is a line; one that faces the camera fades out as it turns
      const w = wallOnScreen(wl, cam); if (w.show < 0.02) return;
      back += `<line class="wall" style="opacity:${(0.55 * w.show).toFixed(2)}" x1="${(w.x + dx).toFixed(1)}" y1="${FLOOR + 7}" x2="${(w.x + dx).toFixed(1)}" y2="${FLOOR - 330}"/>`;
      return;
    }
    let pts = propRoute(P, pr);
    if (!pts) return;
    if (pr.type === 'strap') pts = strapPoints(pts, S.bandRest[i]);
    const q = pts.map(proj);
    // in front of the body or behind it, by depth
    const far = q.reduce((s, p) => s + p.d, 0) / q.length < Q.pelvis.d;
    if (pr.type === 'towel' || pr.type === 'strap') {                  // (a yoga strap is drawn like the towel)
      const svg = `<path class="${pr.type}" d="M${q.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')}"/>`;
      if (far) back += svg; else front += svg;
      return;
    }
    const bp = bandPathRoute(pts, q, S.bandRest[i]);
    // a stretched band thins and deepens in colour as the tension builds
    const svg = `<path class="band" d="${bp.d}" style="stroke-width:${bp.width.toFixed(2)};opacity:${Math.min(1, 0.7 + (bp.stretch - 1) * 0.8).toFixed(2)}"/>`;
    if (far) back += svg; else front += svg;
    back += bandAnchors(pr, q).map(p => anchorSVG(p, 'anchor')).join('');
  });
  $('#propsBack').innerHTML = back; $('#propsFront').innerHTML = front;
  document.querySelectorAll('#scene .wts').forEach(g => { const v = wts[g.dataset.hand] || ''; if (g.innerHTML !== v) g.innerHTML = v; });
}

/* ---------- Floor guide (top-down star) ---------- */
function buildGuide() {
  const fg = S.ex && S.ex.floorGuide;
  $('#guide').hidden = !fg;
  if (!fg) return;
  const arms = Math.max(2, Math.round(fg.arms || 8)), R = 46;
  let html = `<path class="facing" d="M0 -58 l-5 7 h10 z"/>`;
  for (let i = 0; i < arms; i++) {
    const d = i * 360 / arms, [x, y] = [Math.sin(d * Math.PI / 180) * R, -Math.cos(d * Math.PI / 180) * R];
    html += `<line class="arm" data-dir="${d}" x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
  }
  html += `<line class="arm active" id="guideRay" x1="0" y1="0" x2="0" y2="0" style="opacity:0"/><circle class="tip" id="guideTip" r="6" style="opacity:0"/>`;
  html += `<rect class="stance" x="-4" y="-7" width="8" height="14" rx="4"/>`;
  $('#guideSvg').innerHTML = html;
}
function drawGuide(a, b, e) {
  if (!S.ex || !S.ex.floorGuide) return;
  const g = b.guide || a.guide, op = b.guide ? e : (a.guide ? 1 - e : 0);
  const ray = $('#guideRay'), tip = $('#guideTip');
  if (!g) { ray.style.opacity = 0; tip.style.opacity = 0; $('#guideLabel').textContent = ''; return; }
  const flip = S.ex.facing === 'left' ? -1 : 1;
  const d = num(g.direction) * flip * Math.PI / 180, R = 46;
  const x = Math.sin(d) * R, y = -Math.cos(d) * R;
  ray.setAttribute('x2', x.toFixed(1)); ray.setAttribute('y2', y.toFixed(1)); ray.style.opacity = op;
  tip.setAttribute('cx', x.toFixed(1)); tip.setAttribute('cy', y.toFixed(1)); tip.style.opacity = op;
  $('#guideLabel').textContent = op > .5 ? (g.label || '') : '';
}

/* ---------- Playback ---------- */
/* Which step comes next. Exploring: setup plays once, then the rep (or hold) loops. In a workout the plan is a
   straight line and the workout controller takes over at its end. */
function nextIndex(i) {
  if (S.mode === 'workout') return i + 1 < S.resolved.length ? i + 1 : -1;
  // the exercise page with Loop off: once through (setup, one rep, finish), then it stops
  if (typeof loopOn === 'function' && !loopOn()) return i + 1 < S.resolved.length ? i + 1 : -1;
  const ph = S.phase || { start: 0, end: S.resolved.length - 1 };
  if (i >= ph.end || i + 1 >= S.resolved.length) {
    S.rep++;
    // travelling: the next rep carries on from where this one ended
    if (S.travel) { const d = travelOf(S.resolved[ph.end], S.resolved[ph.start], S.seg); S.off = { x: S.off.x + d.x, z: S.off.z + d.z }; }
    return ph.start;
  }
  return i + 1;
}
function frame(ts) {
  const dt = S.last ? Math.min(100, ts - S.last) : 0; S.last = ts;
  const n = S.resolved.length;
  if (n && S.playing && !S.planDone) {
    S.t += dt * S.speed * (S.tempo || 1);
    let cur = S.resolved[S.idx];
    // a hold can wait to start counting (Coach is still saying how to get into the pose)
    if (cur.hold && S.t > cur.dur && S.holdWait && S.holdWait(S.idx)) S.t = cur.dur;
    while (S.t >= cur.dur + cur.hold) {
      // a step can wait (the guided run-through waits for its spoken cue to finish)
      if (S.canAdvance && !S.canAdvance(S.idx)) { S.t = cur.dur + cur.hold; break; }
      const nx = nextIndex(S.idx);
      if (nx < 0) { S.t = cur.dur + cur.hold; S.planDone = true; if (S.onPlanEnd) setTimeout(S.onPlanEnd, 0); break; }
      S.t -= cur.dur + cur.hold; S.prev = S.idx; S.idx = nx; cur = S.resolved[S.idx];
      if (S.onStep) S.onStep(S.idx);
    }
  }
  if (n) draw();
  requestAnimationFrame(frame);
}
/* a frame of a travelling exercise (S.travel) is where the step is plus how far the reps so far have gone; the move
   from a rep's end into the next rep's start begins from the end moved back (travelStep), not a slide to the start */
function travelFrame(a, b, e) {
  if (!S.travel) return frameAt(a, b, e, S.seg);
  const ph = S.phase || {};
  if (a && a !== b && a !== S.from && a.step === ph.end && b.step === ph.start) a = travelStep(a, b, S.seg);
  const f = frameAt(a, b, e, S.seg), off = S.mode === 'workout' ? (S.offs && S.offs[S.idx]) || { x: 0, z: 0 } : S.off;
  f.pos = { ...f.pos, x: f.pos.x + off.x, z: f.pos.z + off.z };
  return f;
}
/* marks on the floor every 60 px along the way it travels, so moving across it reads as moving */
function drawFloorTicks(P, cam) {
  const g = $('#floorTicks'); if (!g) return;
  if (!S.travel) { if (g.firstChild) g.innerHTML = ''; return; }
  let out = '';
  for (const ax of ['x', 'z']) {
    const at = P.pelvis[ax], k0 = Math.floor(at / 60);
    for (let k = k0 - 8; k <= k0 + 8; k++) {
      const q = project({ p: { x: ax === 'x' ? k * 60 : P.pelvis.x, y: 0, z: ax === 'z' ? k * 60 : P.pelvis.z } }, cam).p;
      out += `<line x1="${(q.x + S.shiftX).toFixed(1)}" y1="${FLOOR + 7}" x2="${(q.x + S.shiftX).toFixed(1)}" y2="${FLOOR + 17}"/>`;
    }
  }
  g.innerHTML = out;
}
function draw() {
  const n = S.resolved.length, b = S.resolved[S.idx];
  const a = S.prev != null && S.resolved[S.prev] ? S.resolved[S.prev] : (S.from || b);
  // "smooth" steps speed up and slow down; "linear" ones keep a constant speed, so a chain of them flows like a clock hand
  const raw = b.dur ? Math.min(1, S.t / b.dur) : 1;
  const e = b.ease === 'linear' ? raw : easeInOut(raw);
  const f = travelFrame(a, b, e), P = fkAt(f.pose, S.seg, f.pos), Q = project(P, f.cam);
  if (S.travel) S.shiftX = W / 2 - Q.pelvis.x;                  // the view follows the figure over a marked floor
  for (const k in Q) Q[k].x += S.shiftX;
  drawFloorTicks(P, f.cam);
  applyPose(Q);
  S.curCam = f.cam;
  if (S.props && S.props.length) drawProps(P, Q, f.pose, f.cam);
  drawGuide(a, b, e);
  if (S.mode !== 'workout') $('#progressBar').style.width = ((S.offsets[S.idx] + Math.min(S.t, b.dur + b.hold)) / S.total * 100).toFixed(2) + '%';
  // hold countdown for long holds (stretches), in real seconds at the current speed
  const holding = b.hold >= 3000 && S.t > b.dur && S.mode !== 'workout';
  const chip = $('#holdChip');
  if (holding) {
    const left = Math.ceil((b.dur + b.hold - S.t) / 1000 / S.speed);
    const txt = `Hold ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    if (chip.hidden) chip.hidden = false;
    if ($('#holdText').textContent !== txt) $('#holdText').textContent = txt;
  } else if (!chip.hidden) chip.hidden = true;
  const rep = S.mode === 'workout' ? '' : `${cap(S.ex && S.ex.repName || 'rep')} ${S.rep}`;
  $('#repChip').hidden = S.mode === 'workout' || (S.ex && S.ex.measure === 'time');
  if ($('#repText').textContent !== rep) $('#repText').textContent = rep;
  if (S.shownIdx !== S.idx) { S.shownIdx = S.idx; onStepChange(); }
}
/* Steps a person sees: quiet steps (the in-between points of a circle) are part of the motion, not steps of their
   own. While one plays, the step before it stays up; the Steps list, the numbering and ◀ ▶ skip them. */
const visibleSteps = () => { const v = S.resolved.map((r, i) => (r.quiet ? -1 : i)).filter(i => i >= 0); return v.length ? v : S.resolved.map((r, i) => i); };
function shownStep(i) { const v = visibleSteps(); let s = v[0]; for (const j of v) if (j <= i) s = j; return s; }
function stepBy(delta) {                            // the next or previous step a person sees, from where the figure is
  const v = visibleSteps(), cur = shownStep(S.idx), k = v.indexOf(cur);
  jumpTo(v[(k + delta + v.length) % v.length]);
}
function onStepChange() {
  if (S.mode === 'workout') return;                 // the workout player shows its own info
  const si = shownStep(S.idx), r = S.resolved[si], n = visibleSteps().indexOf(si) + 1;
  $('#stepNum').textContent = n;
  $('#stepName').textContent = r.name || `Step ${n}`;
  $('#stepCue').textContent = r.cue || '';
  if (typeof exStepSound === 'function') exStepSound(S.idx);
  document.querySelectorAll('#stepList button').forEach(btn => {
    if (+btn.dataset.step === si) {
      btn.setAttribute('aria-current', 'step');
      const list = btn.closest('.list'), li = btn.parentElement;
      if (list && (li.offsetTop < list.scrollTop || li.offsetTop + li.offsetHeight > list.scrollTop + list.clientHeight))
        list.scrollTo({ top: li.offsetTop - list.clientHeight / 2 + li.offsetHeight / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    else btn.removeAttribute('aria-current');
  });
  updateEditor();
}
function setPlaying(p) {
  // after a run-through with Loop off, Play starts again from the top
  if (p && S.planDone && S.mode !== 'workout') { S.planDone = false; S.rep = 1; S.idx = 0; S.prev = null; S.t = 0; if (typeof exHush === 'function') exHush(); }
  S.playing = p;
  const btn = $('#playBtn');
  btn.innerHTML = `<span class="icon fill">${p ? 'pause' : 'play_arrow'}</span>`;
  btn.setAttribute('aria-label', p ? 'Pause' : 'Play');
  if (S.view === 'player' && typeof showExControls === 'function' && !XC.editing) p ? showExControls() : showExControls(true);   // paused: controls stay up (not while editing a pose)
  // the exercise player's voice: pausing stops it; playing again reads the current step (on the first pass)
  if (S.view === 'player' && S.mode !== 'workout' && typeof exHush === 'function') { if (!p) exHush(); else exStepSound(S.idx); }
}
function jumpTo(i) {
  const n = S.resolved.length; if (!n) return;
  S.idx = (i + n) % n; S.prev = S.idx > 0 ? S.idx - 1 : null; S.planDone = false;
  S.t = S.resolved[S.idx].dur; draw();
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

