import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Balls that move (batch 19): the hamstring curl's ball rolls under the heels (it stays under them, mid-move too, and
# its line turns); the ball pass carries it from the ankles to the hands; the chest pass throws it to the wall and back.
# All of it stays on the stage, and the thumbnails draw it.
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        at = """((i, t) => { setPlaying(false); const n = S.resolved.length; S.prev = (i - 1 + n) % n; S.idx = i; S.t = S.resolved[i].dur * t; draw();
          const f = frameAt(S.resolved[S.prev], S.resolved[i], easeAt(S.resolved[i].ease, t), S.seg); return { f, P: fkAt(f.pose, S.seg, f.pos) }; })"""
        await pg.goto(URL + '#/play/ball-hamstring-curl', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        rows = []
        for i, t in [(1, 1), (2, 0.5), (2, 1), (3, 0.5)]:
            rows.append(await pg.evaluate(f"""(() => {{ const {{ f, P }} = ({at})({i}, {t}); const s = f.supports.find(k => k.type === 'ball');
              return [S.resolved[{i}].name, {t}, 'ball z', Math.round(s.cz), 'ankle z', Math.round(P.ankleR.z), 'heel above ball top', Math.round(P.ankleR.y - 2 * s.r)]; }})()"""))
        print('curl: ball under heels  ', rows, '<- ball z ~ ankle z, heel ~0 above its top')
        print('curl: line on the ball  ', await pg.evaluate("document.querySelector('#propsBack path.surface.ball, path.surface.ball').getAttribute('d').includes('L')"))
        await pg.goto(URL + '#/play/ball-pass', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        rows = []
        for i in range(5):
            rows.append(await pg.evaluate(f"""(() => {{ const {{ P }} = ({at})({i}, 1); const c = document.querySelector('#scene circle.held-ball');
              const q = k => project({{ p: P[k] }}, S.curCam).p, m = ks => {{ const v = ks.map(q); return [v.reduce((s, p) => s + p.x, 0) / v.length + S.shiftX, v.reduce((s, p) => s + p.y, 0) / v.length]; }};
              const d = ks => {{ const [x, y] = m(ks); return Math.round(Math.hypot(x - +c.getAttribute('cx'), y - +c.getAttribute('cy'))); }};
              const vb = document.querySelector('#scene').getAttribute('viewBox').split(' ').map(Number), r = +c.getAttribute('r');
              return [S.resolved[{i}].name, 'to ankles', d(['ankleL', 'ankleR']), 'to hands', d(['handL', 'handR']), 'on stage', +c.getAttribute('cx') - r >= vb[0] - 1 && +c.getAttribute('cx') + r <= vb[0] + vb[2] + 1]; }})()"""))
        print('pass: ball held by      ', rows, '<- 0 to the ankles (feet), to the hands (hands), between at the passes; all on stage')
        await pg.goto(URL + '#/play/mb-chest-pass', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        rows = []
        for i, t in [(0, 1), (1, 1), (2, 0.5), (2, 1), (3, 0.5), (3, 1)]:
            rows.append(await pg.evaluate(f"""(() => {{ const {{ P }} = ({at})({i}, {t}); const c = document.querySelector('#scene circle.medball'), q = project({{ p: V3.lerp(P.handL, P.handR, 0.5) }}, S.curCam).p;
              return [{i}, {t}, 'ball ahead of the hands px', Math.round(+c.getAttribute('cx') - q.x - S.shiftX)]; }})()"""))
        print('chest pass: ball        ', rows, '<- 0 in the hands, then out to the wall (~110) and back to 0')
        print('thumbnails draw the ball', await pg.evaluate("['ball-pass', 'mb-chest-pass', 'ball-hamstring-curl'].map(id => /held-ball|medball|ts ball|ts solid ball/.test(thumbFor(exById(id))))"))
        await pg.set_viewport_size({'width': 360, 'height': 398})
        await pg.goto(URL + '#/play/ball-pass', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        print('360x398 sideways scroll ', await pg.evaluate("document.documentElement.scrollWidth > innerWidth"))
        print('errors', errs); await b.close()
asyncio.run(main())
