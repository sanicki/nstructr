/* ===================== Submitting an exercise to the library =====================
   The app works out what the submission is, compares it with the library first (src/similar.js), then opens a
   prefilled GitHub issue form (.github/ISSUE_TEMPLATE/exercise.yml) carrying the exercise as a share link. A GitHub
   Action (tools/submission.mjs) checks it all again and opens a pull request for review. What it is ("kind"):
     name   — only the name differs from a library exercise: the name is added to that exercise's other names
     update — a change to a library exercise (a copy of it, or "changes to X" when it moves the same as X)
     new    — a new exercise: not one that moves the same as a library exercise with the same equipment and measure
              (a duplicate), nor with a name the library has
   Workouts can't be submitted yet. */
const SUBMIT_REPO = 'https://github.com/sanicki/nstructr';
const SUBMIT_URL_MAX = 8000;       // GitHub refuses much longer links: then the exercise link is copied, to paste in
const LIB_PRINTS = new Map();      // library motion fingerprints by id (the library doesn't change while the app runs)
const baseName = s => String(s || '').replace(/\s*\(copy\)\s*$/i, '').trim();
const hasName = (x, n) => [x.name, ...otherNames(x)].some(k => SIMILAR_EX.nameKey(k) === SIMILAR_EX.nameKey(n));
/* everything but what the library decides (id, collections) and what only says where a copy came from */
const exBody = e => canonical({ ...e, id: 0, name: 0, basedOn: 0, collections: 0 });
/* what ex can be submitted as: { intro: HTML, choices: [{ kind, target, label }], matches } */
function submissionPlan(ex) {
  const name = baseName(ex.name), base = ex.basedOn && findInDb(ex.basedOn);
  if (findInDb(ex.id) && canonical(findInDb(ex.id)) === canonical(ex)) return { intro: '<p>This is the library\'s own exercise.</p>', choices: [], matches: [] };
  if (base && exBody(ex) === exBody(base)) {
    if (hasName(base, name)) return { intro: `<p>This is the same as “${esc(base.name)}” in the library. Change it first, then submit your change.</p>`, choices: [], matches: [] };
    return { intro: `<p>Only the name is different from “${esc(base.name)}”, so it's suggested as another name for it.</p>`,
      choices: [{ kind: 'name', target: base.id, label: `“${name}” as another name for “${base.name}”` }], matches: [] };
  }
  const matches = SIMILAR_EX.similarTo(ex, POSE_DB.exercises, LIB_PRINTS).slice(0, 4);
  const dup = matches.find(m => m.verdict === 'duplicate'), clash = matches.find(m => hasName(findInDb(m.id), name));
  const choices = [], after = [];
  if (base) choices.push({ kind: 'update', target: base.id, label: `Changes to “${base.name}”` });
  if (dup && dup.id !== (base && base.id)) {
    const d = findInDb(dup.id);
    if (!hasName(d, name)) choices.push({ kind: 'name', target: d.id, label: `“${name}” as another name for “${d.name}”` });
    choices.push({ kind: 'update', target: d.id, label: `Changes to “${d.name}”` });
  }
  // a new exercise can't be a duplicate, or share a name with one in the library
  if (dup) after.push('To submit it as a new exercise, it needs what sets it apart: its equipment (Edit → Equipment), or held instead of repeated.');
  else if (clash) after.push(`To submit it as a new exercise, give it a name of its own: “${name}” is already in the library.`);
  else choices.push({ kind: 'new', label: base ? 'A new exercise (it\'s different from the original)' : 'A new exercise' });
  const why = m => ({
    duplicate: `moves the same as <b>${esc(m.name)}</b>, with the same equipment`,
    variant: `moves the same as <b>${esc(m.name)}</b>, ${!m.sameEquipment ? 'with other equipment' : m.sameMeasure ? '' : 'but one is held and the other repeated'}`,
    similar: `moves like <b>${esc(m.name)}</b>`,
    name: `has the same name as <b>${esc(m.name)}</b>`
  }[m.verdict] + (m.sameName && m.verdict !== 'name' ? ' (and has its name)' : ''));
  const shown = matches.filter(m => !base || m.id !== base.id);
  const intro = shown.length
    ? `<p style="margin:0">Compared with the library, yours:</p><ul class="submit-matches body-medium">${shown.map(m => `<li>${why(m)}</li>`).join('')}</ul>`
    : base ? `<p>Your changes to “${esc(base.name)}” in the library.</p>` : '<p>Nothing in the library moves like it.</p>';
  return { intro: intro + after.map(t => `<p class="body-small muted">${esc(t)}</p>`).join(''), choices, matches };
}

let SUBMITTING = null;             // { ex, plan }
function openSubmit(ex) {
  const plan = submissionPlan(ex);
  SUBMITTING = { ex, plan };
  $('#submitTitle').textContent = `Submit “${baseName(ex.name)}”`;
  $('#submitBody').innerHTML = plan.intro;
  const box = $('#submitChoices');
  box.hidden = !plan.choices.length;
  box.innerHTML = '<legend class="field-label">Suggest</legend>' + plan.choices.map((c, i) =>
    `<label class="choice body-large"><input type="radio" name="submitKind" value="${i}"${i ? '' : ' checked'}><span>${esc(c.label)}</span></label>`).join('');
  $('#submitNote').value = '';
  $('#submitNoteWrap').hidden = !plan.choices.length;
  $('#submitGo').disabled = !plan.choices.length;
  $('#submitDialog').showModal();
}
const submitChoice = () => SUBMITTING && SUBMITTING.plan.choices[+(($('#submitChoices input:checked') || {}).value || 0)];
/* the prefilled issue link: its field ids are the issue form's (kind, target, note, exercise) */
async function submissionUrl(ex, c, note) {
  const target = c.target && findInDb(c.target), name = baseName(ex.name);
  const file = { format: 'nstructr/exercise', version: FILE_VERSION, exercises: [{ ...clone(ex), name }] };
  const link = await packLink('e', file);
  const title = c.kind === 'name' ? `Other name for ${target.name}: ${name}` : c.kind === 'update' ? `Change to ${target.name}` : `New exercise: ${name}`;
  const q = new URLSearchParams({ template: 'exercise.yml', title, kind: c.kind, target: c.target || '', note, exercise: link });
  const url = `${SUBMIT_REPO}/issues/new?${q}`;
  if (url.length <= SUBMIT_URL_MAX) return { url };
  q.delete('exercise');
  return { url: `${SUBMIT_REPO}/issues/new?${q}`, paste: link };
}
$('#submitGo').addEventListener('click', async () => {
  const c = submitChoice(); if (!c) return;
  const note = $('#submitNote').value.trim();
  const { url, paste } = await submissionUrl(SUBMITTING.ex, c, note);
  $('#submitDialog').close();
  if (paste) await copyText(paste, 'Exercise link copied: paste it into “Exercise link” on GitHub');
  window.open(url, '_blank', 'noopener');
});
$('#submitDialog').addEventListener('close', () => { SUBMITTING = null; });
$('#shareSubmit').addEventListener('click', () => {
  if (!SHARING || !SHARING.exercise) return;
  $('#shareDialog').close(); openSubmit(SHARING.exercise);
});
