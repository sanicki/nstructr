import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Medicine ball, Pilates ring, stability ball: drawn in the player and the thumbnails; the ring flattens as it's
# pressed; the ball holds what's over it on its curve (the seat on top, the heels on it).
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        for id, sel, cls in [('mb-russian-twist', '#scene .medball', 'medball'), ('ring-chest-press', '#scene .ring', 'tring'), ('ball-seated-march', '#scene .surface.ball', 'ball')]:
            await pg.goto(URL + '#/play/' + id, wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
            print(f'{id:22} drawn', await pg.evaluate(f"document.querySelectorAll('{sel}').length"), '| thumbnail', await pg.evaluate(f"poseThumbSVG(exById('{id}'), exById('{id}').keyframes[0]).includes('{cls}')"))
        # the ring: its width across the press (on screen, front view) shrinks from hold to squeeze
        await pg.goto(URL + '#/play/ring-chest-press', wait_until='domcontentloaded'); await pg.wait_for_timeout(400)
        w = await pg.evaluate("""[0, 1].map(i => { setPlaying(false); jumpTo(i); S.t = S.resolved[i].dur; draw(); const r = $('#scene .ring').getBBox(); return [Math.round(r.width), Math.round(r.height)]; })""")
        print('ring hold → squeeze      ', w, '<- narrower and taller when squeezed')
        # on the ball: the pelvis sits on its top; the heels rest on it
        for id, pt, i in [('ball-seated-march', 'pelvis', 0), ('ball-bridge', 'ankleL', 0), ('ball-bridge', 'ankleL', 1)]:
            await pg.goto(URL + '#/play/' + id, wait_until='domcontentloaded'); await pg.wait_for_timeout(400)
            print(f'{id:22} step {i} {pt} to the ball', await pg.evaluate(f"(() => {{ const r = S.resolved[{i}]; SUPPORTS = S.resolved.supports; const P = fkAt(r.pose, S.seg, place(r.pose, S.seg, r.rule)); return Math.round(P.{pt}.y - supportAt(P.{pt})); }})()"), 'px')
        print('errors', errs); await b.close()
asyncio.run(main())
