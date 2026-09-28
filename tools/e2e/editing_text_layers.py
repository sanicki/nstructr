import asyncio, os, json
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
ASK_JS = """setInterval(() => { const d = document.getElementById('askDialog'); if (!d || !d.open) return;   // answers NstructR's confirm dialog
  (window.ASKED = window.ASKED || []).push(document.getElementById('askTitle').textContent + ' | ' + document.getElementById('askText').textContent.split('\\n').pop());
  document.getElementById(window.ASK_NO ? 'askNo' : 'askYes').click(); }, 40)"""
# no copy without a change; editing an exercise's words; deleting your own exercise asks first; crossing legs
# change drawing order only while the legs are apart
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script(ASK_JS)
        async def asked(): return [a[:60] for a in await pg.evaluate('window.ASKED || []')]
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        await pg.evaluate("localStorage.setItem('nstructr-authoring-v1','on'); go('#/play/bw-reverse-lunge')"); await pg.wait_for_timeout(500)
        await pg.click('#editPoseBtn'); await pg.wait_for_timeout(300)
        await pg.click('#viewSeg [data-view="side"]'); await pg.wait_for_timeout(150)      # already Side
        await pg.click('[data-edstep="1"]'); await pg.wait_for_timeout(100)
        print('tap active Side, step   ', await pg.evaluate("[S.ex.id, S.lib.items.length]"), '<- no copy')
        # step words: the step name makes the copy; the list and the caption follow
        await pg.fill('#edStepName', 'Lift the front foot'); await pg.press('#edStepName', 'Tab'); await pg.wait_for_timeout(200)
        print('step name edited        ', await pg.evaluate("[S.ex.id, S.ex.name, S.ex.keyframes[S.idx].name, $('#stepName').textContent, [...document.querySelectorAll('#stepList .title-small')][S.idx].textContent.trim()]"))
        # exercise words
        await pg.click('.text-edit summary'); await pg.wait_for_timeout(150)
        await pg.fill('[data-field="name"]', 'My Lunge'); await pg.press('[data-field="name"]', 'Tab')
        await pg.fill('[data-field="setup"]', 'Stand tall.\n\nFeet hip-width apart.'); await pg.press('[data-field="setup"]', 'Tab')
        await pg.fill('[data-field="equipment"]', 'Mat, Wall'); await pg.press('[data-field="equipment"]', 'Tab')
        await pg.fill('[data-field="source.note"]', ''); await pg.press('[data-field="source.note"]', 'Tab'); await pg.wait_for_timeout(200)
        print('exercise words          ', await pg.evaluate("[S.ex.id, S.ex.name, S.ex.setup, S.ex.equipment, S.ex.source, $('#barTitle').textContent, $('#exName').textContent]"))
        await pg.fill('[data-field="name"]', ''); await pg.press('[data-field="name"]', 'Tab'); await pg.wait_for_timeout(100)
        print('empty name refused      ', await pg.evaluate("[S.ex.name, $('[data-field=name]').value]"))
        print('library untouched       ', await pg.evaluate("[findInDb('bw-reverse-lunge').name, findInDb('bw-reverse-lunge').keyframes[1].name]"))
        await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        print('after reload            ', await pg.evaluate("[S.ex.id, S.ex.name, S.ex.setup]"))
        # discard all: words and poses back, the copy deleted
        await pg.click('#editPoseBtn'); await pg.wait_for_timeout(300)
        await pg.click('.text-edit summary'); await pg.fill('[data-field="description"]', 'Changed.'); await pg.press('[data-field="description"]', 'Tab'); await pg.wait_for_timeout(100)
        await pg.click('[data-act="edDiscard"]'); await pg.wait_for_timeout(300)
        print('discard (words)         ', await pg.evaluate("[S.ex.id, S.ex.name, S.ex.description === findInDb('bw-reverse-lunge').description]"), '<- back to where this editing started')
        # the bookmark is only a flag; deleting your own exercise is its own action and asks first
        await pg.evaluate('window.ASKED = []')
        await pg.click('#saveBtn'); await pg.wait_for_timeout(150); await pg.click('#saveBtn'); await pg.wait_for_timeout(150)
        print('bookmark on/off (own)   ', await asked(), await pg.evaluate("[S.lib.items.map(x=>x.id), isBookmarked(S.ex.id)]"), '<- no question, still mine')
        await pg.evaluate('window.ASK_NO = true'); await pg.evaluate('window.ASKED = []')
        await pg.evaluate("document.querySelector('#aboutPanel [data-del]').click()"); await pg.wait_for_timeout(200)
        print('Delete, Cancel          ', await asked(), await pg.evaluate("S.lib.items.map(x=>x.id)"))
        await pg.evaluate('window.ASK_NO = false'); await pg.evaluate('window.ASKED = []')
        await pg.evaluate("document.querySelector('#aboutPanel [data-del]').click()"); await pg.wait_for_timeout(300)
        print('Delete, OK              ', await asked(), await pg.evaluate("[S.lib.items.map(x=>x.id), location.hash]"))
        # a library exercise: bookmarking stores nothing but the id, no question either way
        await pg.evaluate("go('#/play/bw-squat')"); await pg.wait_for_timeout(300)
        await pg.click('#saveBtn'); await pg.wait_for_timeout(150)
        print('bookmark library        ', await pg.evaluate("[isBookmarked('bw-squat'), S.lib.items.length, !!document.querySelector('#aboutPanel [data-del]')]"))
        await pg.evaluate('window.ASKED = []'); await pg.click('#saveBtn'); await pg.wait_for_timeout(150)
        print('unbookmark library      ', await asked(), await pg.evaluate("[isBookmarked('bw-squat'), S.lib.items.length]"))
        # crossing legs, played for real (both sides, one full round): in 3D each bone is drawn by its depth, so where
        # a leg crosses behind the standing leg it is behind. On every reach: the shins are stacked by depth, and in the
        # front view a reach across the body (behind the standing leg) is drawn behind it
        for ex in ['star-excursion-4-point', 'star-excursion-balance']:
            for side in 'LR':
                q = await b.new_page(viewport={'width': 412, 'height': 860})
                await q.goto(URL + f'#/play/{ex}', wait_until='domcontentloaded'); await q.wait_for_timeout(400)
                r = await q.evaluate("""(side) => new Promise(res => {
                  setPlaying(false); setSide(side); S.idx = 0; S.prev = null; S.t = 0; S.rep = 1; S.speed = 2; setPlaying(true); hideExControls();
                  const reach = side === 'L' ? 'R' : 'L', stand = side;
                  let checked = 0, across = 0, wrong = [], seen = new Set();
                  const tick = () => {
                    const b = S.resolved[S.idx], raw = b.dur ? Math.min(1, S.t / b.dur) : 1;
                    if (raw >= 1 && b.name.startsWith('Reach') && !seen.has(S.idx)) {
                      seen.add(S.idx); checked++;
                      const kids = [...$('#figRoot').children].map(g => g.dataset.bone), me = kids.indexOf(`knee${reach}-ankle${reach}`), other = kids.indexOf(`knee${stand}-ankle${stand}`);
                      const Q = stepScreen(b), dm = (Q['knee' + reach].d + Q['ankle' + reach].d) / 2, ds = (Q['knee' + stand].d + Q['ankle' + stand].d) / 2;
                      if (Math.abs(dm - ds) > 2 && (dm < ds) !== (me < other)) wrong.push(S.idx + ':' + b.name + ' (not by depth)');
                      // "Reach left" on the first side (reaching with the right leg) crosses behind; mirrored on the second
                      if (b.cam === 0 && b.name === (side === 'L' ? 'Reach left' : 'Reach right')) { across++; if (me > other) wrong.push(S.idx + ':' + b.name + ' (in front)'); }
                    }
                    if (S.rep > 1) { setPlaying(false); res({ checked, across, wrong }); } else requestAnimationFrame(tick);
                  };
                  requestAnimationFrame(tick); })""", side)
                print(f'{ex[:22]:<22} {side}: reaches checked {r["checked"]} (across behind, front view: {r["across"]}), wrong {r["wrong"]}')
                await q.close()
        print('errors', errs); await b.close()
asyncio.run(main())
