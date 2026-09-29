import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Foam roller: drawn in the player and the thumbnails (a filled circle end-on); the shin, thigh or back rests on it
# at both ends of the roll and all the way between (rolling, not floating); a workout item is timed; Exercises finds
# them under Foam roller.
ROLLS = [('roller-calves', 'shinR'), ('roller-hamstrings', 'thighR'), ('roller-quads', 'thighR'), ('roller-upper-back', 'back')]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        for id, seg in ROLLS:
            await pg.goto(URL + '#/play/' + id, wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
            drawn = await pg.evaluate("[document.querySelectorAll('#scene .surface.roller').length, getComputedStyle($('#scene .surface.roller')).fill]")
            thumb = await pg.evaluate(f"poseThumbSVG(exById('{id}'), exById('{id}').keyframes[0]).includes('roller')")
            gaps = await pg.evaluate(f"""(() => {{ const R = S.resolved, out = [];
              for (let e = 0; e <= 1.0001; e += 0.125) {{ const f = frameAt(R[0], R[1], e, S.seg); SUPPORTS = R.supports; out.push(+clearance(fkAt(f.pose, S.seg, f.pos), '{seg}').toFixed(1)); }}
              return out; }})()""")
            print(f'{id:18} drawn, fill, thumb', drawn, thumb, f'| {seg} above the roller through the roll', gaps, '<- all ~0')
        # a workout item: timed (seconds, not reps), rolling back and forth
        print('in a workout            ', await pg.evaluate("(() => { const it = newItem(exById('roller-calves')); return [it.seconds, it.reps, exById('roller-calves').measure]; })()"))
        await pg.goto(URL + '#/exercises', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        await pg.fill('#search', 'foam'); await pg.wait_for_timeout(300)
        print('search "foam"           ', await pg.evaluate("[...document.querySelectorAll('#exploreBody .pose-card .t')].map(x => x.textContent)"))
        print('equipment filter        ', await pg.evaluate("[...document.querySelectorAll('[data-equip]')].map(x => x.dataset.equip).filter(x => /roller/i.test(x))"))
        await pg.set_viewport_size({'width': 360, 'height': 398})
        await pg.goto(URL + '#/play/roller-quads', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        print('360x398 sideways scroll ', await pg.evaluate("document.documentElement.scrollWidth > innerWidth"))
        print('errors', errs); await b.close()
asyncio.run(main())
