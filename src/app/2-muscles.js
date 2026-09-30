/* ===================== Muscle groups (HANDOFF §13, docs/muscles.md) =====================
   Each exercise rates 11 groups 1–3 ("muscles": 3 primary, 2 secondary, 1 stabilizer) and lists the groups it
   stretches. The exercise page shows them on a front and back outline of the stick figure (capsule limbs, round head),
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
function musclesOf(ex) {
  if (!ex) return null;
  if (ex.muscles) return { muscles: ex.muscles, stretches: ex.stretches || [] };
  const base = ex.basedOn && exById(ex.basedOn);
  return base && base.muscles ? { muscles: base.muscles, stretches: base.stretches || [] } : null;
}
/* the outline: fill(g) gives a group's fill (null = empty), stretched(g) whether it's outlined as stretched */
function muscleFigure(fill, stretched, label) {
  const f = n => n.toFixed(1);
  const attrs = g => { const s = stretched(g); return `fill="${fill(g) || 'var(--mg-empty)'}" stroke="${s ? 'var(--mg-stretch)' : 'var(--mg-line)'}" stroke-width="${s ? 4 : 1.5}"${s ? ' stroke-dasharray="6 3"' : ''}`; };
  const cap = (x1, y1, x2, y2, w, g) => {
    const len = Math.hypot(x2 - x1, y2 - y1), r = w / 2, nx = -(y2 - y1) / len * r, ny = (x2 - x1) / len * r;
    return `<path d="M${f(x1 + nx)} ${f(y1 + ny)}L${f(x2 + nx)} ${f(y2 + ny)}A${r} ${r} 0 0 0 ${f(x2 - nx)} ${f(y2 - ny)}L${f(x1 - nx)} ${f(y1 - ny)}A${r} ${r} 0 0 0 ${f(x1 + nx)} ${f(y1 + ny)}Z" ${attrs(g)}/>`;
  };
  const view = (front, x0) => {
    const X = x => x + x0;
    const arm = d => { const sx = X(100 + d * 27), ex = X(100 + d * 40), hx = X(100 + d * 47);
      return cap(sx, 70, ex, 120, 14, front ? 'biceps' : 'triceps') + cap(ex, 120, hx, 168, 12, 'biceps'); };
    const leg = d => { const hx = X(100 + d * 11), kx = X(100 + d * 14), ax = X(100 + d * 15);
      return cap(hx, 158, kx, 230, 18, front ? 'frontThigh' : 'backThigh') + cap(kx, 230, ax, 296, 14, 'lowerLegs'); };
    const top = bottom => `M${X(80)} 70 Q${X(80)} 60 ${X(90)} 60 L${X(110)} 60 Q${X(120)} 60 ${X(120)} 70 L${X(120)} ${bottom} L${X(80)} ${bottom} Z`;
    const torso = front
      ? `<path d="${top(104)}" ${attrs('chest')}/><path d="M${X(80)} 104 L${X(120)} 104 L${X(119)} 150 Q${X(118)} 162 ${X(100)} 162 Q${X(82)} 162 ${X(81)} 150 Z" ${attrs('core')}/>`
      : `<path d="${top(112)}" ${attrs('upperBack')}/><path d="M${X(80)} 112 L${X(120)} 112 L${X(120)} 138 L${X(80)} 138 Z" ${attrs('lowerBack')}/>
         <path d="M${X(80)} 138 L${X(120)} 138 L${X(119)} 152 Q${X(118)} 166 ${X(100)} 164 Q${X(82)} 166 ${X(81)} 152 Z" ${attrs('glutes')}/>
         <line x1="${X(100)}" y1="140" x2="${X(100)}" y2="164" stroke="var(--mg-line)" stroke-width="1.5"/>`;
    const shoulders = [-1, 1].map(d => `<circle cx="${X(100 + d * 25)}" cy="68" r="11" ${attrs('shoulders')}/>`).join('');
    return `${leg(-1)}${leg(1)}${arm(-1)}${arm(1)}${torso}${shoulders}
      <rect x="${X(95)}" y="44" width="10" height="16" rx="4" fill="var(--md-on-surface)"/><circle cx="${X(100)}" cy="30" r="17" fill="var(--md-on-surface)"/>
      <text x="${X(100)}" y="318" text-anchor="middle" font-size="13" fill="var(--md-on-surface-variant)">${front ? 'Front' : 'Back'}</text>`;
  };
  return `<svg class="mg-map" viewBox="0 0 400 326" role="img" aria-label="${esc(label)}">${view(true, 0)}${view(false, 200)}</svg>`;
}
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
    <div class="mg-legend body-small" aria-hidden="true">${[3, 2, 1].map(v => mgSwatch(`var(--mg-${v})`, false, RATING_NAMES[v])).join('')}${mgSwatch('var(--mg-empty)', true, 'Stretched')}</div>
    <ul class="mg-list body-medium">${list}</ul></section>`;
}
