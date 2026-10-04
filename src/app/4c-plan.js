/* ===================== Workout player: the plan (the steps of one set of one exercise, the move between exercises, framing) ===================== */
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
  const props = side === 'R' ? mirrorProps(ex.props) : (ex.props || []), kfs = versionOf(ex, side, dir);
  const R = resolveSequence(kfs, seg, ex, props);
  return { R, props, kfs };
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
/* the words the coaching script takes from the app */
const scriptWords = () => ({ readyBegin: SAY.readyBegin, watchFirst: SAY.watchFirst, readyHold: SAY.readyHold });
/* one set (one side or direction of it) of a workout item: the coaching script (src/coach.js: the steps and what's said
   as each starts) and each step's resolved pose */
function buildPlan(item, segInfo) {
  const ex = exById(item.ex), seg = { ...DEFAULT_SEGMENTS }, tempo = item.tempo || 1;
  const versions = [];
  if (item.sides === 'alternate') versions.push(resolveVersion(ex, seg, 'L', segInfo.dir), resolveVersion(ex, seg, 'R', segInfo.dir));
  else if (item.dir === 'alternate') versions.push(resolveVersion(ex, seg, segInfo.side, 'A'), resolveVersion(ex, seg, segInfo.side, 'B'));
  else versions.push(resolveVersion(ex, seg, segInfo.side, segInfo.dir));
  // NstructR+ demonstrates an exercise when you come to it, and each side or direction the first time it comes up; not
  // again for its next sets (owner, Oct 2026). A new appearance (later in the workout, a later round, a swap to an
  // easier or harder version) is demonstrated again: WP.shown holds what this appearance has shown (runCurrent)
  const shown = WP.shown || new Set(), demoKey = demoKeyOf(item, segInfo);
  const guided = WK.sound === 'coach' && !shown.has(demoKey), label = segLabel(ex, item, segInfo);
  const meta = COACH.setScript(versions.map(v => v.kfs), { measure: ex.measure, reps: item.reps, seconds: item.seconds, holdStep: ex.holdStep,
    voiced: WK.sound === 'coach' || WK.sound === 'voice', guided, title: `${ex.name}${label ? ', ' + label : ''}`,
    watch: !shown.has(demoKeyOf(item)), words: scriptWords() });
  const plan = meta.map(st => {
    const r = versions[st.v].R[st.k];
    return st.still ? { ...r, dur: 0, hold: 0 } : st.arrived ? { ...r, dur: 0, hold: Math.max(r.hold, COACH.SAY_ONE_MS * tempo) } : st.phase === 'hold' ? { ...r, hold: item.seconds * 1000 * tempo } : r;
  });
  const V0 = versions[0].R;
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
