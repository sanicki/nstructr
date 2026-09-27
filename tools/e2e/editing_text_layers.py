import asyncio, os, json
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# no copy without a change; editing an exercise's words; deleting your own exercise asks first; crossing legs
# change drawing order only while the legs are apart
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        answer = {'v': True}; asked = []
        def on_dialog(d): asked.append(d.message[:60]); asyncio.ensure_future(d.accept() if answer['v'] else d.dismiss())
        pg.on('dialog', on_dialog)
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
        asked.clear()
        await pg.click('#saveBtn'); await pg.wait_for_timeout(150); await pg.click('#saveBtn'); await pg.wait_for_timeout(150)
        print('bookmark on/off (own)   ', asked, await pg.evaluate("[S.lib.items.map(x=>x.id), isBookmarked(S.ex.id)]"), '<- no question, still mine')
        answer['v'] = False; asked.clear()
        await pg.evaluate("document.querySelector('#aboutPanel [data-del]').click()"); await pg.wait_for_timeout(200)
        print('Delete, Cancel          ', asked, await pg.evaluate("S.lib.items.map(x=>x.id)"))
        answer['v'] = True; asked.clear()
        await pg.evaluate("document.querySelector('#aboutPanel [data-del]').click()"); await pg.wait_for_timeout(300)
        print('Delete, OK              ', asked, await pg.evaluate("[S.lib.items.map(x=>x.id), location.hash]"))
        # a library exercise: bookmarking stores nothing but the id, no question either way
        await pg.evaluate("go('#/play/bw-squat')"); await pg.wait_for_timeout(300)
        await pg.click('#saveBtn'); await pg.wait_for_timeout(150)
        print('bookmark library        ', await pg.evaluate("[isBookmarked('bw-squat'), S.lib.items.length, !!document.querySelector('#aboutPanel [data-del]')]"))
        asked.clear(); await pg.click('#saveBtn'); await pg.wait_for_timeout(150)
        print('unbookmark library      ', asked, await pg.evaluate("[isBookmarked('bw-squat'), S.lib.items.length]"))
        # crossing legs, played for real (both sides, one full round): the drawing order only ever changes on a
        # frame where the legs are apart, and on every step that says a leg goes behind, it is behind
        for ex in ['star-excursion-4-point', 'star-excursion-balance']:
            for side in 'LR':
                q = await b.new_page(viewport={'width': 412, 'height': 860})
                await q.goto(URL + f'#/play/{ex}', wait_until='domcontentloaded'); await q.wait_for_timeout(400)
                r = await q.evaluate("""(side) => new Promise(res => {
                  setPlaying(false); setSide(side); S.idx = 0; S.prev = null; S.t = 0; S.rep = 1; S.speed = 2; setPlaying(true); hideExControls();
                  const order = () => [...$('#figRoot').children].map(g => g.id).join(' ');
                  let last = order(), swaps = 0, bad = [], wrong = [], seen = new Set();
                  const tick = () => {
                    const b = S.resolved[S.idx], a = S.prev != null ? S.resolved[S.prev] : b, raw = b.dur ? Math.min(1, S.t / b.dur) : 1;
                    const f = frameAt(a, b, b.ease === 'linear' ? raw : easeInOut(raw), S.seg), now = order();
                    if (now !== last) { swaps++; if (legsOverlap(fk(f.pose, f.v, S.seg, f.pos.x, f.pos.y))) bad.push(S.idx + ':' + b.name); last = now; }
                    // arrived on a step that puts a leg behind: that leg must be drawn before the other one
                    if (raw >= 1 && b.layers && !seen.has(S.idx)) { seen.add(S.idx);
                      for (const [leg, where] of Object.entries(b.layers)) { const kids = [...$('#figRoot').children].map(g => g.id), me = kids.indexOf('leg-' + leg.slice(-1)), other = kids.indexOf('leg-' + (leg.endsWith('L') ? 'R' : 'L'));
                        if ((where === 'back') !== (me < other)) wrong.push(S.idx + ':' + b.name + ' ' + leg + ' ' + where); } }
                    if (S.rep > 1) { setPlaying(false); res({ swaps, bad, wrong, steps: seen.size }); } else requestAnimationFrame(tick);
                  };
                  requestAnimationFrame(tick); })""", side)
                print(f'{ex[:22]:<22} {side}: {r["swaps"]} order changes, {len(r["bad"])} while legs overlap {r["bad"]}, crossing steps checked {r["steps"]}, wrong {r["wrong"]}')
                await q.close()
        print('errors', errs); await b.close()
asyncio.run(main())
