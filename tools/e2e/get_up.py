import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
# Turkish Get-Up: the bell arm stays straight up over the shoulder at every step, the right foot never moves, the
# left hand stays planted from "Up onto your hand" through the sweep; quiet steps aren't in the step list.
# Kettlebell Clean: hike (bell behind the hips), rack (bell at the shoulder).
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/play/kb-turkish-get-up', wait_until='domcontentloaded'); await pg.wait_for_timeout(700)
        rows = await pg.evaluate("""S.resolved.map(r => { SUPPORTS = r.supports; const P = fkAt(r.pose, S.seg, place(r.pose, S.seg, r.rule));
          return [r.name, r.quiet ? 'quiet' : '', Math.round(Math.hypot(P.handR.x - P.shoulderR.x, P.handR.z - P.shoulderR.z)), Math.round(P.handR.y - P.shoulderR.y),
            [P.ankleR.x, P.ankleR.y, P.ankleR.z].map(Math.round).join(','), [P.handL.x, P.handL.y, P.handL.z].map(Math.round).join(',')]; })""")
        print('step, bell: across / above the shoulder, right ankle, left hand')
        for r in rows: print('  ', r)
        check('bell straight over the shoulder', [(r[2], r[3]) for r in rows], lambda v: all(a <= 2 and h > 95 for a, h in v), 'across <= 2, above > 95')
        check('right ankle never moves', {r[4] for r in rows}, {'0,0,0'})
        planted = [r[5] for r in rows[2:rows.index(next(r for r in rows if r[0] == 'Sweep the leg back')) + 1]]
        check('left hand planted (hand up .. sweep)', planted, lambda v: all(abs(int(c) - int(o)) <= 6 for x in v for c, o in zip(x.split(','), v[0].split(','))), 'within 6 of where it lands')
        check('quiet steps', [r[0] for r in rows if r[1] == 'quiet'], ['Lift', 'Tuck', 'Swing', 'Swing back', 'Tuck back', 'Lift back'])
        print('steps listed             ', await pg.evaluate("[...document.querySelectorAll('#stepList .title-small')].map(x => x.textContent)"))
        await pg.goto(URL + '#/play/kb-clean', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        check('clean: bell z vs hips (hike < 0), bell height at the rack', await pg.evaluate("""S.resolved.map(r => { SUPPORTS = r.supports; const P = fkAt(r.pose, S.seg, place(r.pose, S.seg, r.rule)); return [r.name, Math.round(P.handR.z - P.pelvis.z), Math.round(P.handR.y - P.shoulderR.y)]; })"""), [['Hike back', 5, -70], ['Drive', 46, -59], ['Rack', 27, -2]])
        check('errors', errs, []); await b.close()
asyncio.run(main())
