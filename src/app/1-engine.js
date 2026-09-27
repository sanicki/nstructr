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
    for (const [k, v] of Object.entries(kf.pose || {})) {
      if (!JOINT_KEYS.includes(k)) fail(`${p}.pose.${k} isn't a known joint. Joints: ${JOINT_KEYS.join(', ')}.`);
      if (typeof v !== 'number' || !isFinite(v)) fail(`${p}.pose.${k} must be a number of degrees.`);
    }
    if (kf.view != null && !['side', 'front'].includes(kf.view)) fail(`${p}.view must be "side" or "front".`);
    if (kf.anchor != null && !POINTS.includes(kf.anchor)) fail(`${p}.anchor must be one of: ${POINTS.join(', ')}.`);
    if (kf.plant != null && (!Array.isArray(kf.plant) || kf.plant.some(s => s !== 'L' && s !== 'R'))) fail(`${p}.plant must be a list of "L" and/or "R".`);
    if (kf.touch != null) {
      if (!Array.isArray(kf.touch)) fail(`${p}.touch must be a list.`);
      kf.touch.forEach((t, k) => {
        if (!t || !POINTS.includes(t.point)) fail(`${p}.touch[${k}].point must be one of: ${POINTS.join(', ')}.`);
        if (!JOINT_KEYS.includes(t.adjust)) fail(`${p}.touch[${k}].adjust must be a joint name.`);
      });
    }
    if (kf.keep != null && (!Array.isArray(kf.keep) || kf.keep.some(k => !/^(ankle|hand)[LR]$/.test(typeof k === 'string' ? k : (k && k.point) || '') || (typeof k === 'object' && !(Number.isInteger(k.keyframe) && k.keyframe >= 0 && k.keyframe < ex.keyframes.length)))))
      fail(`${p}.keep must list ankleL/ankleR/handL/handR, or {"point": "ankleR", "keyframe": 0} to return to where it was in that step.`);
    if (kf.quiet != null && typeof kf.quiet !== 'boolean') fail(`${p}.quiet must be true or false.`);
    if (kf.layers != null && (typeof kf.layers !== 'object' || Object.entries(kf.layers).some(([k, v]) => !['legL', 'legR'].includes(k) || !['front', 'back'].includes(v))))
      fail(`${p}.layers must look like {"legR": "back"}: legL/legR, "front" or "back".`);
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
        const hands = pr.type === 'barbell' ? [pr.from, pr.to] : (pr.hands || [pr.hand]);
        if (!hands.length || hands.some(h => !['handL', 'handR'].includes(h))) fail(`${p} (a ${pr.type}) needs ${pr.type === 'barbell' ? '"from" and "to" hands' : '"hand"'}: "handL" or "handR".`);
        if (pr.axis != null && !['lr', 'fb', 'ud'].includes(pr.axis)) fail(`${p}.axis must be "lr", "fb" or "ud".`);
        return;
      }
      if (SURFACE_TYPES.includes(pr.type)) {
        if (!isFinite(pr.x)) fail(`${p} (a ${pr.type}) needs "x": its centre in px from the middle of the stage.`);
        for (const f of ['width', 'height', 'backHeight']) if (pr[f] != null && !(pr[f] > 0)) fail(`${p}.${f} must be a positive number.`);
        if (pr.back != null && !['left', 'right'].includes(pr.back)) fail(`${p}.back must be "left" or "right".`);
        return;
      }
      if (pr.type === 'wall') {
        if (!((typeof pr.at === 'string' && POINTS.includes(pr.at)) || isFinite(pr.x))) fail(`${p} (a wall) needs "at" (a body point it stands against) or "x".`);
        if (pr.view != null && !['side', 'front'].includes(pr.view)) fail(`${p}.view must be "side" or "front".`);
        return;
      }
      for (const end of ['from', 'to']) {
        const v = pr[end];
        const ok = (typeof v === 'string' && POINTS.includes(v)) || (v && typeof v === 'object' && isFinite(v.x) && isFinite(v.y));
        if (!ok) fail(`${p}.${end} must be a body point (${POINTS.join(', ')}) or a floor spot like {"x": 120, "y": 40}.`);
      }
      if (pr.restLength != null && !(pr.restLength > 0)) fail(`${p}.restLength must be a positive number.`);
      if (pr.via != null && (!Array.isArray(pr.via) || pr.via.some(v => !POINTS.includes(v)))) fail(`${p}.via must be a list of body points.`);
      if (pr.layer != null && !['front', 'back'].includes(pr.layer)) fail(`${p}.layer must be "front" or "back".`);
    });
  }
  const clone = JSON.parse(JSON.stringify(ex));
  clone.id = typeof ex.id === 'string' && ex.id.trim() ? ex.id.trim() : slug(ex.name);
  return clone;
}

/* ---------- Library persistence ---------- */
const findInDb = id => POSE_DB.exercises.find(it => it.id === id);
const clone = o => JSON.parse(JSON.stringify(o));
function loadLib() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) { const d = JSON.parse(raw); if (Array.isArray(d.items)) return d; } } catch (e) { }
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
  if (dir === 'B') kfs = reverseReps(kfs).map(k => ({ ...k, name: swapDirWords(k.name), cue: swapDirWords(k.cue) }));
  if (side === 'R') kfs = kfs.map(k => {
    const m = { ...mirrorKeyframe(k), name: swapWords(k.name), cue: swapWords(k.cue) };
    if (m.guide) m.guide = { ...m.guide, label: swapWords(m.guide.label) };      // "Back left" becomes "Back right" too
    return m;
  });
  return kfs;
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
  // Frame the whole sequence: one constant horizontal shift so every keyframe stays on stage (nothing slides)
  let minX = Infinity, maxX = -Infinity;
  for (const r of S.resolved) {
    const pos = place(r.pose, r.v, S.seg, r.rule), P = fk(r.pose, r.v, S.seg, pos.x, pos.y);
    for (const k of POINTS) { minX = Math.min(minX, P[k].x); maxX = Math.max(maxX, P[k].x); }
  }
  for (const x of S.resolved.walls || []) if (x != null) { minX = Math.min(minX, x - 6); maxX = Math.max(maxX, x + 6); }
  for (const s of S.resolved.supports || []) { minX = Math.min(minX, s.x0 - 6); maxX = Math.max(maxX, s.x1 + 6); }
  S.shiftX = isFinite(minX) ? W / 2 - (minX + maxX) / 2 : 0;
  S.idx = Math.min(S.idx, S.resolved.length - 1);
  S.shownIdx = -1;
}

/* ---------- Figure: nested <g> pendulums driven by CSS custom properties ---------- */
const scene = $('#scene');
function buildFigure() {
  const g = S.seg;
  const rotG = (tx, ty, varName, inner, cls = '') =>
    `<g class="${cls}" style="transform: translate(${tx}, ${ty}) rotate(calc(var(--${varName}) * 1deg))">${inner}</g>`;
  const leg = s => rotG(`calc(var(--hx-${s}) * 1px)`, '0px', 'hip' + s,
    `<line class="bone" x2="0" y2="${g.thigh}" vector-effect="non-scaling-stroke" style="transform: scale(1, var(--st-${s}))"/>` +
    rotG('0px', `calc(var(--st-${s}) * ${g.thigh}px)`, 'knee' + s,
      `<line class="bone" x2="0" y2="${g.shin}" vector-effect="non-scaling-stroke" style="transform: scale(1, var(--ss-${s}))"/>` +
      rotG('0px', `calc(var(--ss-${s}) * ${g.shin}px)`, 'ankle' + s,
        `<g style="transform: scale(var(--foot-${s}), 1)"><line class="bone" x2="1" y2="0" vector-effect="non-scaling-stroke"/></g>`)), `side-${s}`);
  const lower = g.torso / 2, upper = g.torso - lower;
  const arm = s => rotG(`calc(var(--sx-${s}) * 1px)`, `${-upper + SHOULDER_DROP}px`, 'shoulder' + s,
    `<line class="bone" x2="0" y2="${g.upperArm}" vector-effect="non-scaling-stroke" style="transform: scale(1, var(--su-${s}))"/>` +
    rotG('0px', `calc(var(--su-${s}) * ${g.upperArm}px)`, 'elbow' + s,
      `<line class="bone" x2="0" y2="${g.lowerArm}" vector-effect="non-scaling-stroke" style="transform: scale(1, var(--sf-${s}))"/>` +
      `<g style="transform: translate(0px, calc(var(--sf-${s}) * ${g.lowerArm}px))"><circle class="hand" r="6.5"/></g>`), `side-${s}`);
  const facing = S.ex && S.ex.facing === 'left' ? `style="transform: translate(${W}px, 0) scale(-1, 1)"` : '';
  scene.innerHTML =
    `<line class="floor-line" x1="${-5 * W}" y1="${FLOOR + 7}" x2="${6 * W}" y2="${FLOOR + 7}"/>` +
    `<g ${facing}>` +
    `<g style="transform: translate(calc(var(--root-x) * 1px), 0)"><ellipse class="shadow" cy="${FLOOR + 7}" rx="52" ry="6"/></g>` +
    `<g id="propsBack"></g>` +
    `<g id="figRoot" style="transform: translate(calc(var(--root-x) * 1px), calc(var(--root-y) * 1px)) rotate(calc(var(--root) * 1deg))">` +
      `<g id="leg-L">${leg('L')}</g>` +
      `<g class="core" id="figCore" style="transform: rotate(calc(var(--torso) * 1deg))">` +
        `<line class="bone" x2="0" y2="${-lower}"/>` +
        rotG('0px', `${-lower}px`, 'chest',
          arm('L') +
          `<line class="bone" x2="0" y2="${-upper}"/>` +
          rotG('0px', `${-upper}px`, 'neck', `<line class="bone" x2="0" y2="${-g.neck}"/><circle class="head" cy="${-(g.neck + g.head)}" r="${g.head}"/>`) +
          arm('R')) +
      `</g>` +
      `<g id="leg-R">${leg('R')}</g>` +
    `</g><g id="propsFront"></g></g>`;
  S.legLayers = 'back,front,L';
}
/* Legs are drawn left behind the body, right in front, unless a step says otherwise ("layers"): a leg crossing
   behind or in front of the standing leg, for the move into and out of that step. The drawing order only changes
   on a frame where the two legs don't overlap on screen, so the swap itself is never visible: the leg is seen
   to travel behind (or in front), instead of flicking there while they still cross. */
const segsCross = (p, q, r, t) => {
  const d = (q.x - p.x) * (t.y - r.y) - (q.y - p.y) * (t.x - r.x); if (!d) return false;
  const u = ((r.x - p.x) * (t.y - r.y) - (r.y - p.y) * (t.x - r.x)) / d, w = ((r.x - p.x) * (q.y - p.y) - (r.y - p.y) * (q.x - p.x)) / d;
  return u > 0 && u < 1 && w > 0 && w < 1;
};
function legsOverlap(P) {
  const chain = s => ['hip', 'knee', 'ankle', 'toe'].map(k => P[k + s]), L = chain('L'), R = chain('R');
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (segsCross(L[i], L[i + 1], R[j], R[j + 1])) return true;
  return false;
}
function layerLegs(a, b, f) {
  const said = s => (b.layers && b.layers['leg' + s]) || (a.layers && a.layers['leg' + s]) || null;
  const want = s => said(s) || (s === 'L' ? 'back' : 'front');
  // both on the same side of the body: the leg the step names goes outermost (furthest back, or on top), so a
  // leg crossing behind passes behind the standing leg and one crossing in front passes over it
  let first = 'L';
  if (want('L') === want('R')) { const named = said('R') ? 'R' : said('L') ? 'L' : null; if (named) first = (want(named) === 'back') === (named === 'R') ? 'R' : 'L'; }
  const key = want('L') + ',' + want('R') + ',' + first;
  if (key === S.legLayers) return;
  if (legsOverlap(fk(f.pose, f.v, S.seg, f.pos.x, f.pos.y))) return;       // wait until they're apart
  S.legLayers = key;
  const root = $('#figRoot'), core = $('#figCore'); if (!root || !core) return;
  for (const s of first === 'L' ? ['L', 'R'] : ['R', 'L']) { const g = $('#leg-' + s); if (want(s) === 'back') root.insertBefore(g, core); else root.appendChild(g); }
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

function applyPose(pose, v, pos, anchorX) {
  const st = scene.style, gm = viewGeom(S.seg, v);
  for (const k of JOINT_KEYS) st.setProperty('--' + k, pose[k].toFixed(3));
  st.setProperty('--root-x', pos.x.toFixed(2)); st.setProperty('--root-y', pos.y.toFixed(2));
  st.setProperty('--anchor-x', anchorX.toFixed(2));
  for (const s of ['L', 'R']) {
    st.setProperty('--hx-' + s, gm.hx[s].toFixed(2)); st.setProperty('--sx-' + s, gm.sx[s].toFixed(2));
    st.setProperty('--foot-' + s, gm.foot[s].toFixed(3));
    st.setProperty('--su-' + s, depthScale(pose['armDepth' + s]).toFixed(4));
    st.setProperty('--sf-' + s, depthScale(pose['forearmDepth' + s]).toFixed(4));
    st.setProperty('--st-' + s, depthScale(pose['thighDepth' + s]).toFixed(4));
    st.setProperty('--ss-' + s, depthScale(pose['shinDepth' + s]).toFixed(4));
  }
}

/* ---------- Equipment ---------- */
function drawProps(P) {
  let back = '', front = '';
  // chairs, benches and steps sit behind the figure
  for (const sh of surfaceShapes(S.resolved.supports || [])) {
    back += `<path class="surface${sh.solid ? ' solid' : ''}" transform="translate(${S.shiftX.toFixed(1)} 0)" d="${sh.d}"/>`;
  }
  S.props.forEach((pr, i) => {
    if (SURFACE_TYPES.includes(pr.type)) return;
    if (WEIGHT_TYPES.includes(pr.type)) { front += weightSVG(pr, P, S.curV || 0); return; }
    if (pr.type === 'wall') {
      const x = S.resolved.walls[i] + S.shiftX;
      // a wall seen from the side is a line; if it only makes sense from one camera, fade it out as the camera turns
      const op = pr.view === 'side' ? 1 - (S.curV || 0) : pr.view === 'front' ? (S.curV || 0) : 1;
      if (op < 0.02) return;
      back += `<line class="wall" style="opacity:${(0.55 * op).toFixed(2)}" x1="${x.toFixed(1)}" y1="${FLOOR + 7}" x2="${x.toFixed(1)}" y2="${FLOOR - 330}"/>`;
      return;
    }
    const pts = propRoute(P, pr);
    if (!pts) return;
    if (pr.type === 'towel') {
      const svg = `<path class="towel" d="M${pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')}"/>`;
      if (pr.layer === 'back') back += svg; else front += svg;
      return;
    }
    if (!pts) return;
    const bp = bandPathRoute(pts, S.bandRest[i]);
    // a stretched band thins and deepens in colour as the tension builds
    const svg = `<path class="band" d="${bp.d}" style="stroke-width:${bp.width.toFixed(2)};opacity:${Math.min(1, 0.7 + (bp.stretch - 1) * 0.8).toFixed(2)}"/>`;
    const far = pr.layer ? pr.layer === 'back' : [pr.from, pr.to].some(end => typeof end === 'string' && end.endsWith('L'));
    if (far) back += svg; else front += svg;
  });
  $('#propsBack').innerHTML = back; $('#propsFront').innerHTML = front;
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
  const ph = S.phase || { start: 0, end: S.resolved.length - 1 };
  if (i >= ph.end || i + 1 >= S.resolved.length) { S.rep++; return ph.start; }
  return i + 1;
}
function frame(ts) {
  const dt = S.last ? Math.min(100, ts - S.last) : 0; S.last = ts;
  const n = S.resolved.length;
  if (n && S.playing && !S.planDone) {
    S.t += dt * S.speed * (S.tempo || 1);
    let cur = S.resolved[S.idx];
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
function draw() {
  const n = S.resolved.length, b = S.resolved[S.idx];
  const a = S.prev != null && S.resolved[S.prev] ? S.resolved[S.prev] : (S.from || b);
  // "smooth" steps speed up and slow down; "linear" ones keep a constant speed, so a chain of them flows like a clock hand
  const raw = b.dur ? Math.min(1, S.t / b.dur) : 1;
  const e = b.ease === 'linear' ? raw : easeInOut(raw);
  const f = frameAt(a, b, e, S.seg);
  applyPose(f.pose, f.v, { x: f.pos.x + S.shiftX, y: f.pos.y }, CX + lerp(a.rule.anchorX, b.rule.anchorX, e) + S.shiftX);
  S.curV = f.v;
  layerLegs(a, b, f);
  if (S.props && S.props.length) drawProps(fk(f.pose, f.v, S.seg, f.pos.x + S.shiftX, f.pos.y));
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
function onStepChange() {
  const r = S.resolved[S.idx];
  if (S.mode === 'workout') return;                 // the workout player shows its own info
  $('#stepNum').textContent = S.idx + 1;
  $('#stepName').textContent = r.name || `Step ${S.idx + 1}`;
  $('#stepCue').textContent = r.cue || '';
  document.querySelectorAll('#stepList button').forEach((btn, i) => {
    if (i === S.idx) {
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
  S.playing = p;
  const btn = $('#playBtn');
  btn.innerHTML = `<span class="icon fill">${p ? 'pause' : 'play_arrow'}</span>`;
  btn.setAttribute('aria-label', p ? 'Pause' : 'Play');
  if (S.view === 'player' && typeof showExControls === 'function' && !XC.editing) p ? showExControls() : showExControls(true);   // paused: controls stay up (not while editing a pose)
}
function jumpTo(i) {
  const n = S.resolved.length; if (!n) return;
  S.idx = (i + n) % n; S.prev = S.idx > 0 ? S.idx - 1 : null; S.planDone = false;
  S.t = S.resolved[S.idx].dur; draw();
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

