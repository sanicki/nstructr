import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
# Yoga block and strap: a block is a small surface the hand rests on (touch); a strap is drawn like the towel. As
# played: the hand is on the block's top (41), the block and the strap are drawn (player and thumbnail), and the
# Exercises filter has them as equipment.
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        for id, hand in [('yoga-triangle-block', 'handR'), ('yoga-half-moon-block', 'handR'), ('yoga-pyramid-blocks', 'handL')]:
            await pg.goto(URL + '#/play/' + id, wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
            r = await pg.evaluate(f"""(() => {{ setPlaying(false); jumpTo(1); S.t = S.resolved[1].dur; draw();
              const f = frameAt(S.resolved[1], S.resolved[1], 1, S.seg), P = fkAt(f.pose, S.seg, f.pos);
              return [Math.round(P.{hand}.y), document.querySelectorAll('#propsBack .surface.solid').length]; }})()""")
            print(f'{id:28} hand at {r[0]} (block top 41) | blocks drawn {r[1]}')
        for id in ['yoga-seated-forward-bend-strap', 'yoga-reclining-hand-to-big-toe']:
            await pg.goto(URL + '#/play/' + id, wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
            # a strap doesn't stretch: route plus hanging ends is the same length in every frame of every move
            lens = await pg.evaluate("""(() => { const R = S.resolved, i = S.props.findIndex(p => p.type === 'strap'), out = [];
              for (let a = 0; a < R.length; a++) for (let b = 0; b < R.length; b++) if (a !== b) for (let s = 0; s <= 10; s++) {
                const f = frameAt(R[a], R[b], s / 10, S.seg), P = fkAt(f.pose, S.seg, f.pos), pts = propRoute(P, S.props[i]);
                out.push(routeLength(strapPoints(pts, S.bandRest[i]))); }
              return [Math.min(...out), Math.max(...out), S.bandRest[i]]; })()""")
            print(f'{id:28} strap length {lens[0]:.1f}–{lens[1]:.1f} (fixed {lens[2]:.1f})')
            print(f'{id:28} strap drawn', await pg.evaluate("document.querySelectorAll('#scene .strap').length"),
                  '| thumbnail', await pg.evaluate(f"poseThumbSVG(exById('{id}'), exById('{id}').keyframes[1]).includes('tst')"))
        await pg.goto(URL + '#/exercises', wait_until='domcontentloaded'); await pg.wait_for_timeout(400)
        check('equipment filter', await pg.evaluate("[...document.querySelectorAll('#fEquip [data-equip]')].map(x => x.dataset.equip).filter(x => /Yoga (block|strap)/.test(x))"), ['Yoga block', 'Yoga strap'])
        check('errors', errs, []); await b.close()
asyncio.run(main())
