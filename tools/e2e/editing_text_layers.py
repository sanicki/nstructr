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
        # deleting your own exercise asks first
        answer['v'] = False; asked.clear()
        await pg.click('#saveBtn'); await pg.wait_for_timeout(200)
        print('unbookmark own, Cancel  ', asked, await pg.evaluate("S.lib.items.map(x=>x.id)"))
        answer['v'] = True; asked.clear()
        await pg.click('#saveBtn'); await pg.wait_for_timeout(300)
        print('unbookmark own, OK      ', asked, await pg.evaluate("[S.lib.items.map(x=>x.id), location.hash]"))
        # a bookmarked library exercise just leaves Saved, no question
        await pg.evaluate("go('#/play/bw-squat')"); await pg.wait_for_timeout(300)
        await pg.click('#saveBtn'); await pg.wait_for_timeout(150); asked.clear()
        await pg.click('#saveBtn'); await pg.wait_for_timeout(150)
        print('unbookmark library      ', asked, await pg.evaluate("S.lib.items.map(x=>x.id)"))
        # crossing legs: the drawing order may only change on a frame where the legs are apart
        res = await pg.evaluate("""(() => {
          const out = [];
          for (const [ex, moves] of [['star-excursion-balance', [[11,12],[12,13],[13,14],[14,15],[15,16],[16,17]]], ['star-excursion-4-point', [[5,6],[6,7],[7,8],[8,9],[9,0],[1,2]]]])
            for (const side of ['L','R']) {
              selectExercise(ex); setPlaying(false); setSide(side);
              for (const [fr, to] of moves) {
                S.idx = to; S.prev = fr; let swaps = 0, bad = 0;
                for (let i = 0; i <= 40; i++) {
                  S.t = S.resolved[to].dur * i / 40; const before = S.legLayers; draw();
                  if (S.legLayers !== before) { swaps++; const a = S.resolved[fr], bb = S.resolved[to], raw = S.t / bb.dur, e = bb.ease === 'linear' ? raw : easeInOut(raw), f = frameAt(a, bb, e, S.seg);
                    if (legsOverlap(fk(f.pose, f.v, S.seg, f.pos.x, f.pos.y))) bad++; }
                }
                out.push(`${ex.slice(0,15)} ${side} ${fr}->${to}: ${swaps} swap(s), ${bad} while overlapping, ends ${S.legLayers}`);
              }
            }
          return out;
        })()""")
        print('\n'.join(res))
        print('errors', errs); await b.close()
asyncio.run(main())
