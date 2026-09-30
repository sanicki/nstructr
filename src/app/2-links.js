/* ===================== Linked variations (library/progressions.json, HANDOFF §5.4) =====================
   An exercise's easier and harder versions (the steps beside it in a progression) and its versions with other
   equipment. A user's copy of a library exercise (basedOn) has its original's links. Shown on the exercise page,
   and a workout item can swap to one (the editor; the player, for that session). */
var LINKS = { progressions: [], equipment: [] };
const linkKey = ex => (ex ? ex.basedOn || ex.id : null);
function linksOf(ex) {
  const id = linkKey(ex), out = { easier: [], harder: [], other: [] }; if (!id) return out;
  const add = (list, xid) => { const x = exById(xid); if (x && x.id !== ex.id && !list.includes(x)) list.push(x); };
  for (const p of LINKS.progressions || []) {
    const i = p.steps.indexOf(id); if (i < 0) continue;
    if (i > 0) add(out.easier, p.steps[i - 1]);
    if (i < p.steps.length - 1) add(out.harder, p.steps[i + 1]);
  }
  for (const g of LINKS.equipment || []) if (g.ids.includes(id)) g.ids.forEach(x => { if (x !== id) add(out.other, x); });
  return out;
}
const hasLinks = l => l.easier.length + l.harder.length + l.other.length > 0;
const LINK_KINDS = [['easier', 'Easier', 'trending_down'], ['harder', 'Harder', 'trending_up'], ['other', 'Other equipment', 'swap_horiz']];
/* the rows of links: on the exercise page they open the exercise, in the workout editor they swap the item */
function linkRowsHTML(l, attr) {
  return LINK_KINDS.filter(([k]) => l[k].length).map(([k, label, icon]) => `<div class="link-row"><span class="label-large">${label}</span><div class="link-btns">${
    l[k].map(x => `<button class="btn tonal stateful" ${attr}="${esc(x.id)}"><span class="icon">${icon}</span>${esc(x.name)}</button>`).join('')}</div></div>`).join('');
}
function linksHTML(ex) {
  const l = linksOf(ex);
  return hasLinks(l) ? `<section class="links" aria-labelledby="linksTitle"><h3 class="title-small" id="linksTitle">Variations</h3>${linkRowsHTML(l, 'data-openex')}</section>` : '';
}
document.addEventListener('click', e => { const b = e.target.closest('[data-openex]'); if (b) go(`#/play/${encodeURIComponent(b.dataset.openex)}`); });
/* a workout item swapped to another exercise: sets kept; reps or seconds kept when both count the same way (else the
   new one's defaults); sides and direction kept where the new one has them, and the order of them only when both have
   the same; the new exercise's own pace */
function swapItem(it, ex) {
  const old = exById(it.ex), d = newItem(ex), same = !!old && (old.measure === 'time') === (ex.measure === 'time');
  const n = { ...it, ex: ex.id, tempo: 1, reps: same ? it.reps : d.reps, seconds: same ? it.seconds : d.seconds,
    sides: ex.bilateral ? it.sides || d.sides : null, dir: ex.direction ? it.dir || d.dir : null };
  if (!old || !!old.bilateral !== !!ex.bilateral || !!old.direction !== !!ex.direction) delete n.order;
  return n;
}
