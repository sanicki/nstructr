/* Static thumbnail of a resolved pose, drawn from the same 3D figure (projected with the step's camera, far to near) */
function poseThumbSVG(ex, kf, opts = {}) {
  const seg = { ...DEFAULT_SEGMENTS, ...((ex.figure && ex.figure.segments) || {}) };
  const seq = resolveSequence(ex.keyframes, seg, ex);
  const idx = ex.keyframes.indexOf(kf);
  const r = idx >= 0 ? seq[idx] : resolveKeyframe(kf, seg, ex);
  SUPPORTS = r.supports || seq.supports || [];
  const P = fkAt(r.pose, seg, place(r.pose, seg, r.rule)), Q = project(P, r.cam), cam = r.cam;
  const proj = p => project({ p }, cam).p;
  const pts = POINTS.map(k => Q[k]);
  let minX = Math.min(...pts.map(p => p.x)) - 26, maxX = Math.max(...pts.map(p => p.x)) + 26;
  const walls = (seq.walls || []).map(wl => (wl ? wallOnScreen(wl, cam) : null));
  for (const w of walls) if (w && w.show > 0.5) { minX = Math.min(minX, w.x - 12); maxX = Math.max(maxX, w.x + 12); }
  const surfaces = surfaceShapes(r.supports || seq.supports || [], cam);   // (the step's own: a rolling ball has moved)
  for (const s of surfaces) { minX = Math.min(minX, s.x0 - 8); maxX = Math.max(maxX, s.x1 + 8); }
  let minY = Math.min(...pts.map(p => p.y)) - 26, maxY = FLOOR + 14;
  // a carried stability ball, all of it
  const held = heldAt(r, r, 1, P);
  for (const pr of (ex.props || []).filter(carried)) { const c = proj(held || P.handL), rad = num(pr.r) || 58;
    minX = Math.min(minX, c.x - rad - 6); maxX = Math.max(maxX, c.x + rad + 6); minY = Math.min(minY, c.y - rad - 6); }
  for (const b of seq.bars || []) minY = Math.min(minY, FLOOR - num(b.y) - 12);
  const w = maxX - minX, h = maxY - minY, s = Math.max(w, h, 150);
  const vx = (minX + maxX) / 2 - s / 2, vy = maxY - s;
  const L = (a, b, c) => `<line x1="${Q[a].x.toFixed(1)}" y1="${Q[a].y.toFixed(1)}" x2="${Q[b].x.toFixed(1)}" y2="${Q[b].y.toFixed(1)}" class="${c}"/>`;
  const cls = { legL: 'tL', armL: 'tL', legR: 'tR', armR: 'tR', body: 'tc' };
  const rest = bandRestLengths(ex.props, seq, seg), M0 = rootM(r.pose.root);
  let over = '';
  const byId = new Map(BONES.map(bn => [bn.id, bn]));
  // a carried ball goes among the limbs, by depth (the near hand and foot on it, the far ones behind it)
  const ball = (ex.props || []).find(carried), ballSVG = ball ? weightSVG(ball, P, M0, proj, null, held) : '', ballD = held ? proj(held).d : Q.pelvis.d;
  let ballDone = !ballSVG;
  const figure = boneOrder(Q).map(id => { const bn = byId.get(id);
    const pre = !ballDone && (Q[bn.a].d + Q[bn.b].d) / 2 > ballD ? ((ballDone = true), ballSVG) : '';
    return pre + L(bn.a, bn.b, cls[bn.part]) +
    (bn.b === 'head' ? `<circle cx="${Q.head.x.toFixed(1)}" cy="${Q.head.y.toFixed(1)}" r="${seg.head}" class="th"/>` : ''); }).join('') + (ballDone ? '' : ballSVG);
  const back = (ex.props || []).map((pr, i) => {
    if (carried(pr)) return '';
    if (WEIGHT_TYPES.includes(pr.type)) { over += weightSVG(pr, P, M0, proj, pr.type === 'kettlebell' ? gripAt(r, r, 1) : null, pr.type === 'medball' ? heldAt(r, r, 1, P) : null); return ''; }
    if (pr.type === 'bar') { over += barSVG(pr, proj, 'tbar'); return ''; }
    if (pr.type === 'ring') { over += ringSVG(pr, P, proj, 'tring'); return ''; }
    if (pr.type === 'wall') { const wl = walls[i]; return wl && wl.show > 0.5 ? `<line class="tw" x1="${wl.x.toFixed(1)}" y1="${FLOOR + 7}" x2="${wl.x.toFixed(1)}" y2="${(vy - 5).toFixed(1)}"/>` : ''; }
    let route = propRoute(P, pr);
    if (!route) return '';
    if (pr.type === 'strap') route = strapPoints(route, rest[i]);
    const q = route.map(proj);
    const svg = pr.type === 'towel' || pr.type === 'strap' ? `<path class="${pr.type === 'strap' ? 'tst' : 'tt'}" d="M${q.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')}"/>`
      : `<path class="tb" d="${bandPathRoute(route, q, rest[i]).d}"/>` + bandAnchors(pr, q).map(p => anchorSVG(p, 'ta')).join('');
    if (q.reduce((a, p) => a + p.d, 0) / q.length < Q.pelvis.d) return svg;
    over += svg; return '';
  }).join('');
  const surf = surfaces.map(sh => `<path class="ts${sh.solid ? ' solid' : ''}${sh.ball ? ' ball' : ''}${sh.roller ? ' roller' : ''}${sh.block ? ' block' : ''}" d="${sh.d}"/>`).join('');
  return `<svg class="thumb" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${s.toFixed(1)} ${s.toFixed(1)}" aria-hidden="true">
    <line x1="${vx}" y1="${FLOOR + 7}" x2="${vx + s}" y2="${FLOOR + 7}" class="tf"/>${surf}${back}${figure}${over}</svg>`;
}
