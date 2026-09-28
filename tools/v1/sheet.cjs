/* Contact sheet for checking a conversion by eye: each step (and the middle of each move) of an exercise, today's 2D
   figure (grey, from the v1 files in git at a revision) beside the v2 3D figure.
     node tools/v1/sheet.cjs out.html [rev] id... */
const fs = require('fs'), { execSync } = require('child_process');
const C1 = require('./core-v1.cjs'), C2 = require('../../src/core.js');
const [out, rev, ...ids] = process.argv.slice(2);
const seg = C2.DEFAULT_SEGMENTS;
const line = (a, b, c, w = 8) => `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const COL = { legL: '#8a6d9e', armL: '#8a6d9e', legR: '#36618e', armR: '#36618e', body: '#222' };
function fig2(Q, order) {
  let s = '';
  if (!order) { for (const id of C2.boneOrder(Q)) { const bn = C2.BONES.find(x => x.id === id); s += line(Q[bn.a], Q[bn.b], COL[bn.part]); } }
  else for (const part of order) for (const [a, b] of C2.PARTS[part]) s += line(Q[a], Q[b], COL[part]);
  return s + `<circle cx="${Q.head.x}" cy="${Q.head.y}" r="18" fill="#222"/>`;
}
let html = '<html><body style="font:12px sans-serif;background:#fff">';
for (const id of ids) {
  const ex2 = JSON.parse(fs.readFileSync(`library/exercises/${id}.json`, 'utf8'));
  let ex1 = null; try { ex1 = JSON.parse(execSync(`git show ${rev}:library/exercises/${id}.json`, { encoding: 'utf8' })); } catch (e) { }
  const R2 = C2.resolveSequence(ex2.keyframes, seg, ex2), R1 = ex1 ? C1.resolveSequence(ex1.keyframes, C1.DEFAULT_SEGMENTS, ex1) : null;
  html += `<h3>${id}</h3><div style="display:flex;flex-wrap:wrap;gap:4px">`;
  const cells = [];
  R2.forEach((r, i) => { const j = (i + 1) % R2.length; cells.push([i, i, 1, r.name]); if (R2.length > 1) cells.push([i, j, 0.5, `→ ${R2[j].name}`]); });
  for (const [ia, ib, e, name] of cells) {
    let svg = `<svg width="220" height="220" viewBox="-60 -40 520 430"><line x1="-60" y1="${C2.FLOOR + 6}" x2="460" y2="${C2.FLOOR + 6}" stroke="#ccc" stroke-width="3"/>`;
    for (const s of C2.surfaceShapes(R2.supports, R2[ib].cam)) svg += `<path d="${s.d}" stroke="#999" stroke-width="5" fill="${s.solid ? '#ddd' : 'none'}"/>`;
    if (R1) {
      const s1 = C1.DEFAULT_SEGMENTS, f = C1.frameAt(R1[ia], R1[ib], e, s1), P = C1.fk(f.pose, f.v, s1, f.pos.x, f.pos.y);
      svg += `<g opacity="0.35">${fig2(P, ["legL", "armL", "body", "armR", "legR"]).replace(/stroke="[^"]+"/g, "stroke=\"#e33\"").replace(/fill="#222"/, "fill=\"#e33\"")}</g>`;
    }
    const f = C2.frameAt(R2[ia], R2[ib], e, seg), Q = C2.project(C2.fkAt(f.pose, seg, f.pos), f.cam);
    svg += `<g opacity="0.9">${fig2(Q)}</g></svg>`;
    html += `<div style="width:220px">${svg}<div>${e < 1 ? '½ ' : ''}${name}</div></div>`;
  }
  html += '</div>';
}
fs.writeFileSync(out, html + '</body></html>');
