
/* ===================== Share links ===================== */
/* A workout or an exercise travels inside the link itself, so no server is involved:
     <site>#/link/<kind>1<enc>.<data>
   kind: w = workout (a nstructr/workout file, with any of the user's own exercises it uses), e = exercise.
   A library workout is just named: #/link/l1.<library id> (the receiver has the library too).
   1 = link format version. enc: z = deflate-raw (CompressionStream) then base64url; j = plain JSON, base64url
   (browsers without CompressionStream). A library exercise needs none of this: its link is just #/play/<id>.
   Opening a link shows what it holds and adds it only if the user says so. */
const SHARE_SITE = 'https://sanicki.github.io/nstructr/';
const QR_MAX = 900;              // longer links make QR codes too dense to scan comfortably from a phone screen
const shareBase = () => (/^https?:$/.test(location.protocol) ? location.origin + location.pathname : SHARE_SITE);
const b64url = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64url = str => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; };
async function pipeBytes(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }

async function packLink(kind, data) {
  const json = new TextEncoder().encode(JSON.stringify(data));
  if ('CompressionStream' in window) {
    try { return `${shareBase()}#/link/${kind}1z.${b64url(await pipeBytes(json, new CompressionStream('deflate-raw')))}`; } catch (e) { }
  }
  return `${shareBase()}#/link/${kind}1j.${b64url(json)}`;
}
async function unpackLink(payload) {
  const lib = /^l1\.([a-z0-9-]+)$/.exec(payload), lw = lib && LIB_WK.find(w => w.libId === lib[1]);
  if (lib) { if (!lw) throw new Error('bad link'); return { kind: 'w', data: compactWorkout(lw) }; }
  const m = /^([we])1([zj])\.([A-Za-z0-9_-]+)$/.exec(payload);
  if (!m) throw new Error('bad link');
  let bytes = unb64url(m[3]);
  if (m[2] === 'z') {
    if (!('DecompressionStream' in window)) throw new Error('This browser can\'t open compressed links. Try Chrome, Edge, Firefox or Safari 16.4+.');
    bytes = await pipeBytes(bytes, new DecompressionStream('deflate-raw'));
  }
  return { kind: m[1], data: JSON.parse(new TextDecoder().decode(bytes)) };
}

/* the smallest workout file that still means the same thing: no runtime ids, no values that are the defaults */
function compactWorkout(w) {
  const file = JSON.parse(workoutJSON(w)), wk = file.workouts[0];
  if (w.libId) wk.name = `${w.name} (copy)`;
  delete wk.id; delete wk.libId; delete wk.description;
  wk.blocks = wk.blocks.map(b => {
    const o = { name: b.name, items: b.items.map(it => {
      const ex = exById(it.ex), x = { ex: it.ex };
      if (ex && ex.measure === 'time') x.seconds = it.seconds; else x.reps = it.reps;
      if (it.sets > 1) { x.sets = it.sets; x.rest = it.rest; }
      if (it.sides) x.sides = it.sides;
      if (it.dir) x.dir = it.dir;
      if (it.tempo && it.tempo !== 1) x.tempo = it.tempo;
      return x;
    }) };
    if ((b.rounds || 1) > 1) { o.rounds = b.rounds; o.roundRest = b.roundRest; }
    return o;
  });
  return file;
}

/* ---------- sending ---------- */
let SHARING = null;             // { url, name, file: [text, filename] }
async function openShare(what) {
  let url, name, file, desc;
  if (what.workout) {
    const w = what.workout, data = compactWorkout(w);
    url = w.libId ? `${shareBase()}#/link/l1.${w.libId}` : await packLink('w', data); name = w.name;
    const own = (data.exercises || []).length;
    desc = `${w.blocks.flatMap(b => b.items).length} exercises, about ${fmtMin(workoutSeconds(w))}${own ? `, including ${own} of your own` : ''}.`;
    file = [JSON.stringify(data, null, 2), (w.name || 'workout').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() + '.json'];
  } else {
    const ex = what.exercise; name = ex.name;
    const lib = findInDb(ex.id);
    url = lib && canonical(lib) === canonical(ex) ? `${shareBase()}#/play/${encodeURIComponent(ex.id)}` : await packLink('e', { format: 'nstructr/exercise', version: FILE_VERSION, exercises: [ex] });
    desc = lib && url.includes('#/play/') ? 'A library exercise: the link opens it.' : 'Your own exercise: the link carries all of it.';
    file = [JSON.stringify({ format: 'nstructr/exercise', version: FILE_VERSION, exercises: [ex] }, null, 2), (ex.id || 'exercise') + '.json'];
  }
  SHARING = { url, name, file };
  $('#shareTitle').textContent = `Share "${name}"`;
  $('#shareWhat').textContent = desc;
  $('#shareUrl').value = url;
  $('#shareQr').innerHTML = url.length <= QR_MAX ? qrSvg(url)
    : `<p class="body-small muted">Too long for a QR code (${url.length} characters): share the link or the file instead.</p>`;
  $('#shareSend').hidden = !navigator.share;
  $('#shareDialog').showModal();
}
/* a QR code as SVG: dark on white always (whatever the theme), with the standard quiet zone */
function qrSvg(text) {
  try {
    const q = qrcode(0, 'L'); q.addData(text); q.make();
    const n = q.getModuleCount(), m = 4; let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x + m} ${y + m}h1v1h-1z`;
    return `<svg viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" role="img" aria-label="QR code for the link" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  } catch (e) { return '<p class="body-small muted">Couldn\'t make a QR code for this link.</p>'; }
}
$('#shareCopy').addEventListener('click', () => SHARING && copyText(SHARING.url, 'Link copied'));
$('#shareSend').addEventListener('click', async () => {
  if (!SHARING) return;
  try { await navigator.share({ title: SHARING.name, text: `${SHARING.name}, for ${APP_NAME}`, url: SHARING.url }); } catch (e) { if (e && e.name !== 'AbortError') copyText(SHARING.url, 'Link copied'); }
});
$('#shareFile').addEventListener('click', () => { if (!SHARING) return; $('#shareDialog').close(); shareFile(SHARING.file[0], SHARING.file[1], SHARING.name); });
$('#shareUrl').addEventListener('focus', e => e.target.select());

/* ---------- receiving ---------- */
let INCOMING = null;
async function openSharedLink(payload) {
  let got;
  try { got = await unpackLink(payload); }
  catch (e) { snack(/browser/.test(e.message) ? e.message : 'This link is damaged or incomplete. Ask for it again.', 6000); return; }
  const d = got.data;
  INCOMING = d;
  if (got.kind === 'w') {
    const w = (d.workouts || [])[0] || d, known = new Map((d.exercises || []).map(x => [x.id, x]));
    const items = (w.blocks || []).flatMap(b => b.items || []);
    const names = items.map(it => (exById(it.ex) || known.get(it.ex) || { name: it.ex }).name);
    const missing = items.filter(it => !exById(it.ex) && !known.has(it.ex)).length;
    $('#linkTitle').textContent = 'A workout was shared with you';
    $('#linkBody').innerHTML = `<p class="title-medium" style="margin:0 0 4px">${esc(w.name || 'Workout')}</p>
      <p class="body-medium muted" style="margin:0 0 8px">${items.length} exercises in ${(w.blocks || []).length} ${(w.blocks || []).length === 1 ? 'block' : 'blocks'}${known.size ? `, ${known.size} of them made by the sender` : ''}.</p>
      <ul class="body-small">${names.slice(0, 12).map(n => `<li>${esc(n)}</li>`).join('')}${names.length > 12 ? `<li>and ${names.length - 12} more</li>` : ''}</ul>
      ${missing ? `<p class="body-small" style="color:var(--md-error)">${missing} of its exercises aren't in this version of the library.</p>` : ''}
      <p class="body-small muted" style="margin:8px 0 0">Add it to your workouts to start it or change it. Nothing is added unless you tap Add.</p>`;
  } else {
    const ex = (d.exercises || [])[0] || d;
    $('#linkTitle').textContent = 'An exercise was shared with you';
    $('#linkBody').innerHTML = `<p class="title-medium" style="margin:0 0 4px">${esc(ex.name || 'Exercise')}</p>
      <p class="body-medium muted" style="margin:0 0 8px">${esc([ex.focus, ex.category, (ex.equipment || []).join(', ')].filter(Boolean).join(' · '))}</p>
      ${ex.description ? `<p class="body-small" style="margin:0 0 8px">${esc(ex.description)}</p>` : ''}
      <p class="body-small muted" style="margin:0">Adding it puts it in Saved, as your own exercise. Nothing is added unless you tap Add.</p>`;
  }
  $('#linkDialog').showModal();
}
$('#linkAdd').addEventListener('click', () => {
  if (!INCOMING) return;
  const text = JSON.stringify(INCOMING); INCOMING = null;
  $('#linkDialog').close();
  LINK_IMPORT = true;
  try { importAndShow([[text, 'The link']]); } finally { LINK_IMPORT = false; }
});
$('#linkDialog').addEventListener('close', () => { INCOMING = null; });

/* share buttons: the workout editor, the workout cards, the exercise page */
document.querySelector('.shell').addEventListener('click', e => {
  const t = e.target.closest('[data-share-wk], [data-act="shareEx"]'); if (!t) return;
  e.stopPropagation();
  if (t.dataset.shareWk) { const w = t.dataset.shareWk === '@edit' ? EDIT : wkById(t.dataset.shareWk); if (w) openShare({ workout: w }); }
  else if (S.ex) openShare({ exercise: S.ex });
}, true);
