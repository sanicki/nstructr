/* ===================== Muscle groups (HANDOFF §13, docs/muscles.md) =====================
   Each exercise rates 11 groups 1–3 ("muscles": 3 primary, 2 secondary, 1 stabilizer) and lists the groups it
   stretches. The exercise page shows them on a front and back outline of the stick figure (its own standing body),
   coloured by rating (the --mg-* colours: darker = more in the light theme, brighter = more in the dark one), stretched
   groups outlined in dashed blue, with a legend and a text list. A user's copy of a library exercise (basedOn) that
   has no ratings of its own shows its original's. */
const MUSCLE_GROUPS = ['shoulders', 'chest', 'upperBack', 'lowerBack', 'biceps', 'triceps', 'core', 'frontThigh', 'glutes', 'backThigh', 'lowerLegs'];
const MUSCLE_NAMES = { shoulders: 'Shoulders', chest: 'Chest', upperBack: 'Upper back', lowerBack: 'Lower back', biceps: 'Biceps and forearms',
  triceps: 'Triceps', core: 'Core', frontThigh: 'Front of thighs', glutes: 'Glutes', backThigh: 'Back of thighs', lowerLegs: 'Calves and shins' };
/* the text list's headings (the owner's seven) */
const MUSCLE_HEADS = [['Arms', ['biceps', 'triceps']], ['Shoulders', ['shoulders']], ['Chest', ['chest']], ['Back', ['upperBack', 'lowerBack']],
  ['Core', ['core']], ['Upper legs and glutes', ['frontThigh', 'glutes', 'backThigh']], ['Lower legs', ['lowerLegs']]];
const RATING_NAMES = { 3: 'Primary', 2: 'Secondary', 1: 'Stabilizer' };
/* only known groups with 1–3, only known groups stretched (an imported file can carry anything; these go into SVG) */
function cleanMuscles(m, st) {
  const muscles = {}, stretches = MUSCLE_GROUPS.filter(g => Array.isArray(st) && st.includes(g));
  if (m && typeof m === 'object') for (const g of MUSCLE_GROUPS) if ([1, 2, 3].includes(m[g])) muscles[g] = m[g];
  return { muscles, stretches };
}
function musclesOf(ex) {
  if (!ex) return null;
  if (ex.muscles) return cleanMuscles(ex.muscles, ex.stretches);
  const base = ex.basedOn && exById(ex.basedOn);
  return base && base.muscles ? cleanMuscles(base.muscles, base.stretches) : null;
}
/* ---------- a workout's total: set-equivalents per group (HANDOFF §13) ----------
   Each set counts toward a sweet spot: the exercise's suggested reps ("8–12"; 12–15 when it gives none), 30–60 s for
   a hold. Below it a set counts in proportion, in it 1, above it with diminishing returns up to 1½ (about 1.3 at twice
   the sweet spot). Then × the block's rounds, × ½ when only one side is done (each side's muscles get their own sets),
   × 1 for a primary group, ½ secondary, ¼ stabilizer. Stretches don't count. */
const MG_WEIGHT = { 3: 1, 2: 0.5, 1: 0.25 };
function sweetSpot(ex) {
  if (ex.measure === 'time') return [30, 60];
  const r = String((ex.prescription || {}).reps || '').replace(/\d+\s*(rounds|sets)\s+of\s*/i, ''), m = /(\d+)(?:\s*[–-]\s*(\d+))?/.exec(r);
  return m && +m[1] > 0 ? [+m[1], +(m[2] || m[1])] : [12, 15];
}
function setCredit(amount, [lo, hi]) {
  if (!(amount > 0)) return 0;
  if (amount < lo) return amount / lo;
  if (amount <= hi) return 1;
  return 1 + 0.5 * (1 - Math.exp(-0.916 * (amount - hi) / hi));
}
function itemMuscles(item, out = {}, rounds = 1) {
  const ex = exById(item.ex), r = musclesOf(ex); if (!r) return out;
  const both = v => v === 'both' || v === 'alternate';
  const amount = (ex.measure === 'time' ? item.seconds : item.reps) * (both(item.dir) ? 2 : 1);
  const sets = (item.sets || 1) * rounds * (item.sides && !both(item.sides) ? 0.5 : 1), c = sets * setCredit(amount, sweetSpot(ex));
  for (const [g, v] of Object.entries(r.muscles)) out[g] = (out[g] || 0) + c * MG_WEIGHT[v];
  return out;
}
function workoutMuscles(w) {
  const out = {};
  for (const b of w.blocks) for (const it of b.items) itemMuscles(it, out, Math.max(1, b.rounds || 1));
  return out;
}
/* set-equivalents -> a colour: green up to 2, amber 2–5, red above 5 (to 8), a gradient within each band */
function mgScale(v) {
  if (!(v >= 0.05)) return null;
  const mix = (a, b, t) => `color-mix(in srgb, var(--mg-${b}) ${Math.round(Math.min(1, t) * 100)}%, var(--mg-${a}))`;
  return v <= 2 ? mix('g0', 'g1', v / 2) : v <= 5 ? mix('a0', 'a1', (v - 2) / 3) : mix('r0', 'r1', (v - 5) / 3);
}
const mgNum = v => fmtNum(Math.round(v * 10) / 10);
/* the scale under a workout's map: 0 · 2 · 5 · 8+ */
const MG_SCALE = `<div class="mg-scale" aria-hidden="true"><div class="mg-bar"></div><div class="mg-ticks body-small"><span style="left:0">0</span><span style="left:25%">2</span><span style="left:62.5%">5</span><span style="left:100%">8+</span></div></div>`;
/* a workout's muscles: compact (its card: a small map and the three groups worked most) or full (the editor: map,
   scale and every group's number under the seven headings) */
function workoutMusclesHTML(w, compact) {
  const items = w.blocks.flatMap(b => b.items), rated = items.filter(it => musclesOf(exById(it.ex)));
  if (!rated.length) return '';
  // every group one of its exercises stretches: outlined in dashed blue, as on an exercise's own map
  const st = new Set(rated.flatMap(it => musclesOf(exById(it.ex)).stretches));
  const t = workoutMuscles(w), on = MUSCLE_GROUPS.filter(g => t[g] >= 0.05), unrated = items.length - rated.length;
  const top = [...on].sort((a, b) => t[b] - t[a]).slice(0, 3), stList = MUSCLE_GROUPS.filter(g => st.has(g));
  const label = 'Muscle map, estimated work in set-equivalents. ' + on.map(g => `${MUSCLE_NAMES[g]}: ${mgNum(t[g])}`).join('. ') +
    (stList.length ? `. Stretched: ${stList.length === MUSCLE_GROUPS.length ? 'every group' : stList.map(g => MUSCLE_NAMES[g]).join(', ')}` : '');
  const fig = muscleFigure(g => mgScale(t[g]), g => st.has(g), label);
  const stText = stList.length === MUSCLE_GROUPS.length ? 'every muscle group' : stList.length > 3 ? `${stList.length} muscle groups` : stList.map(g => MUSCLE_NAMES[g].toLowerCase()).join(', ');
  if (compact) return `<div class="mg-card">${fig.replace(/<text[^>]*>[^<]*<\/text>/g, '').replace('viewBox="0 0 400 326"', 'viewBox="0 8 400 296"')}<p class="body-small">${top.length ? `Most work: ${top.map(g => MUSCLE_NAMES[g].toLowerCase()).join(', ').replace(/^./, c => c.toUpperCase())}` : ''}${top.length && stList.length ? '<br>' : ''}${stList.length ? `Stretches ${stText}` : ''}</p></div>`;
  const words = g => [t[g] >= 0.05 ? mgNum(t[g]) : '', st.has(g) ? 'stretched' : ''].filter(Boolean).join(', ');
  const list = MUSCLE_HEADS.map(([h, gs]) => { const x = gs.filter(g => t[g] >= 0.05 || st.has(g));
    return x.length ? `<li><b>${h}:</b> ${x.map(g => MUSCLE_NAMES[g] === h ? words(g) : `${MUSCLE_NAMES[g].toLowerCase()} ${words(g)}`).join('; ')}</li>` : ''; }).join('');
  return `${fig}${MG_SCALE}<div class="mg-legend body-small" aria-hidden="true">${stList.length ? mgSwatch('var(--mg-empty)', true, 'Stretched') : ''}${mgSides()}</div><p class="body-small muted mg-note">Estimated work, in sets: green up to 2, amber 2–5, red above 5. A set near the suggested reps counts 1; muscles that help count ½, those that steady you ¼. Stretches don't add to the sets: a dashed blue outline marks every group the workout stretches.${unrated ? ` ${plural(unrated, { one: '# exercise has', other: '# exercises have' })} no muscle ratings.` : ''}</p>
    <ul class="mg-list body-medium">${list}</ul>`;
}
/* "Works the front of thighs and glutes" for a card's label */
function worksText(ex) {
  const r = musclesOf(ex); if (!r) return '';
  const p = MUSCLE_GROUPS.filter(g => r.muscles[g] === 3).map(g => MUSCLE_NAMES[g].toLowerCase());
  return p.length ? `Works ${p.length > 1 ? p.slice(0, -1).join(', ') + ' and ' + p[p.length - 1] : p[0]}` : '';
}
/* The outline is the animated figure itself (owner, Oct 2026: shaped alike): the engine's standing body, arms 15° out
   and feet a little apart, seen from the front (camera 0) and the back (180), drawn as even capsules along its bones
   (MG_LIMB wide), a slimmer torso split into its groups, the shoulders as limb-wide circles at the arm joints, a short
   neck, the head, and plain hands and feet. Each limb is outlined in its side's colour, as in the player (right blue,
   left purple: seen from the front, the figure's right is on the left). fill(g) gives a group's fill (null = empty),
   stretched(g) whether it's outlined as stretched (dashed, over the side colour). */
const MG_LIMB = 14, MG_TORSO = 29;
let MG_BODY = null;
function mgBody() {
  if (MG_BODY) return MG_BODY;
  const seg = DEFAULT_SEGMENTS, pose = normPose({ shoulderL: [0, 15, 0], shoulderR: [0, 15, 0], hipL: [0, 4, 0], hipR: [0, 4, 0] });
  const P = fkAt(pose, seg, { x: 0, y: 0, z: 0 }), low = Math.min(...Object.values(P).map(q => q.y));
  for (const k in P) P[k] = { ...P[k], y: P[k].y - low };
  // screen points of each view, scaled so the head's top is at 12 and the floor at 300 (of the 326-high map)
  const top = P.headTop.y + 2, s = 288 / top;
  const view = yaw => { const Q = project(P, yaw), out = {}; for (const k in Q) out[k] = { x: 100 + (Q[k].x - CX) * s, y: 300 - (FLOOR - Q[k].y) * s }; return out; };
  return (MG_BODY = { front: view(0), back: view(180), s, head: seg.head * s });
}
function muscleFigure(fill, stretched, label) {
  const f = n => n.toFixed(1), B = mgBody();
  // a part's fill and outline: the side's colour for a limb, the line colour for the body; stretched: dashed blue
  const attrs = (g, side) => { const st = g && stretched(g), line = side === 'R' ? 'var(--md-primary)' : side === 'L' ? 'var(--md-tertiary)' : 'var(--mg-line)';
    return `fill="${(g && fill(g)) || 'var(--mg-empty)'}" stroke="${st ? 'var(--mg-stretch)' : line}" stroke-width="${st ? 4 : side ? 2 : 1.5}"${st ? ' stroke-dasharray="6 3"' : ''}`; };
  const cap = (a, b, w, g, side) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 0.01, r = w / 2, nx = -(b.y - a.y) / len * r, ny = (b.x - a.x) / len * r;
    return `<path d="M${f(a.x + nx)} ${f(a.y + ny)}L${f(b.x + nx)} ${f(b.y + ny)}A${r} ${r} 0 0 0 ${f(b.x - nx)} ${f(b.y - ny)}L${f(a.x - nx)} ${f(a.y - ny)}A${r} ${r} 0 0 0 ${f(a.x + nx)} ${f(a.y + ny)}Z" ${attrs(g, side)}/>`;
  };
  const dot = (p, r, g, side) => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(r)}" ${attrs(g, side)}/>`;
  const view = (front, x0) => {
    const V = front ? B.front : B.back, Q = {}; for (const k in V) Q[k] = { x: V[k].x + x0, y: V[k].y };
    const legs = ['L', 'R'].map(d => cap(Q['ankle' + d], Q['toe' + d], 10, null, d) +
      cap(Q['hip' + d], Q['knee' + d], MG_LIMB, front ? 'frontThigh' : 'backThigh', d) + cap(Q['knee' + d], Q['ankle' + d], MG_LIMB, 'lowerLegs', d)).join('');
    const arms = ['L', 'R'].map(d => cap(Q['shoulder' + d], Q['elbow' + d], MG_LIMB, front ? 'biceps' : 'triceps', d) +
      cap(Q['elbow' + d], Q['hand' + d], MG_LIMB, 'biceps', d) + dot(Q['hand' + d], 6.5 * B.s, null, d)).join('');
    // the torso: from the shoulders to just below the hips, MG_TORSO wide, rounded at the shoulders; split into its groups
    const cx = (Q.shoulderL.x + Q.shoulderR.x) / 2, l = cx - MG_TORSO / 2, rgt = cx + MG_TORSO / 2;
    const y0 = Math.min(Q.shoulderL.y, Q.shoulderR.y) - MG_LIMB / 2, y1 = Math.max(Q.hipL.y, Q.hipR.y) + 6, at = t => y0 + (y1 - y0) * t, rr = 8;
    const box = (a, b, g, roundTop, roundBottom) => `<path d="M${f(l)} ${f(a + (roundTop ? rr : 0))}${roundTop ? `Q${f(l)} ${f(a)} ${f(l + rr)} ${f(a)}L${f(rgt - rr)} ${f(a)}Q${f(rgt)} ${f(a)} ${f(rgt)} ${f(a + rr)}` : `L${f(rgt)} ${f(a)}`}` +
      `L${f(rgt)} ${f(b - (roundBottom ? rr : 0))}${roundBottom ? `Q${f(rgt)} ${f(b)} ${f(rgt - rr)} ${f(b)}L${f(l + rr)} ${f(b)}Q${f(l)} ${f(b)} ${f(l)} ${f(b - rr)}` : `L${f(l)} ${f(b)}`}Z" ${attrs(g)}/>`;
    const torso = front ? box(y0, at(0.43), 'chest', true, false) + box(at(0.43), y1, 'core', false, true)
      : box(y0, at(0.51), 'upperBack', true, false) + box(at(0.51), at(0.76), 'lowerBack', false, false) + box(at(0.76), y1, 'glutes', false, true) +
        `<line x1="${f(cx)}" y1="${f(at(0.78))}" x2="${f(cx)}" y2="${f(y1)}" stroke="var(--mg-line)" stroke-width="1.5"/>`;
    const shoulders = ['L', 'R'].map(d => dot(Q['shoulder' + d], MG_LIMB / 2, 'shoulders')).join('');
    const neck = cap({ x: cx, y: y0 + 2 }, { x: Q.head.x, y: Q.head.y + B.head - 2 }, 8, null);
    return `${legs}${torso}${arms}${shoulders}${neck}${dot(Q.head, B.head, null)}
      <text x="${100 + x0}" y="318" text-anchor="middle" font-size="13" fill="var(--md-on-surface-variant)">${front ? 'Front' : 'Back'}</text>`;
  };
  return `<svg class="mg-map" viewBox="0 0 400 326" role="img" aria-label="${esc(label)}">${view(true, 0)}${view(false, 200)}</svg>`;
}
/* the side colours' key (the limbs' outlines, as in the player) */
const mgSides = () => ['R', 'L'].map(d => `<span class="mg-key"><svg width="22" height="14" aria-hidden="true"><rect x="1.5" y="1.5" width="19" height="11" rx="5.5" fill="var(--mg-empty)" stroke="var(--md-${d === 'R' ? 'primary' : 'tertiary'})" stroke-width="2"/></svg>${d === 'R' ? 'Right' : 'Left'}</span>`).join('');
/* one swatch of the legend */
const mgSwatch = (fill, stretch, label) => `<span class="mg-key"><svg width="22" height="14" aria-hidden="true"><rect x="1.5" y="1.5" width="19" height="11" rx="5.5" fill="${fill}" stroke="${stretch ? 'var(--mg-stretch)' : 'var(--mg-line)'}" stroke-width="${stretch ? 2.5 : 1.5}"${stretch ? ' stroke-dasharray="4 2"' : ''}/></svg>${label}</span>`;
/* the exercise page's section: map, legend, and a list under the seven headings */
function musclesHTML(ex) {
  const r = musclesOf(ex); if (!r) return '';
  const { muscles: m, stretches: s } = r;
  if (!Object.keys(m).length && !s.length) return '';
  const words = g => [m[g] ? RATING_NAMES[m[g]].toLowerCase() : '', s.includes(g) ? 'stretched' : ''].filter(Boolean).join(', ');
  const list = MUSCLE_HEADS.map(([h, gs]) => { const on = gs.filter(g => m[g] || s.includes(g));
    return on.length ? `<li><b>${h}:</b> ${on.map(g => MUSCLE_NAMES[g] === h ? words(g) : `${MUSCLE_NAMES[g].toLowerCase()} (${words(g)})`).join('; ')}</li>` : ''; }).join('');
  const label = MUSCLE_GROUPS.filter(g => m[g] || s.includes(g)).map(g => `${MUSCLE_NAMES[g]}: ${words(g)}`).join('. ');
  return `<section class="muscles" aria-labelledby="musclesTitle"><h3 class="title-small" id="musclesTitle">Muscles${s.length ? (Object.keys(m).length ? ' worked and stretched' : ' stretched') : ' worked'}</h3>
    ${muscleFigure(g => m[g] ? `var(--mg-${m[g]})` : null, g => s.includes(g), 'Muscle map. ' + label)}
    <div class="mg-legend body-small" aria-hidden="true">${[3, 2, 1].map(v => mgSwatch(`var(--mg-${v})`, false, RATING_NAMES[v])).join('')}${mgSwatch('var(--mg-empty)', true, 'Stretched')}${mgSides()}</div>
    <ul class="mg-list body-medium">${list}</ul></section>`;
}
