import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# A weight passed from hand to hand (Kettlebell Around the World): each step's "holds" says which hands hold it; the
# bell is at that hand, or between both at a pass, and moves from one grip to the next; passed behind the back it's
# drawn behind the body; the other direction and the thumbnail work too.
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/play/kb-around-the-world', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        state = """(t => { setPlaying(false); S.t = S.resolved[S.idx].dur * t; draw(); const r = S.resolved[S.idx], f = frameAt(S.resolved[S.prev], r, 1, S.seg);
          const P = fkAt(f.pose, S.seg, f.pos), Q = project(P, S.curCam), bell = [...document.querySelectorAll('#scene circle.wt')].pop(), c = [+bell.getAttribute('cx'), +bell.getAttribute('cy')];
          const d = k => Math.round(Math.hypot(Q[k].x + S.shiftX - c[0], Q[k].y - c[1]));
          return [r.name, JSON.stringify(S.grip), 'bell to handL/handR px', d('handL'), d('handR'), 'behind body', !!bell.closest('#propsBack, .props-back') || bell.compareDocumentPosition(document.querySelector('#figRoot')) === Node.DOCUMENT_POSITION_FOLLOWING]; })"""
        for i in range(4):
            await pg.evaluate(f"S.prev = {(i - 1) % 4}; S.idx = {i}")
            print('step', i, await pg.evaluate(f"({state})(1)"))
        await pg.evaluate("S.prev = 0; S.idx = 1")
        print('halfway front -> right', await pg.evaluate(f"({state})(0.5)"), '<- grip between both and the right hand')
        print('thumbnail has the bell   ', await pg.evaluate("poseThumbSVG(exById('kb-around-the-world'), exById('kb-around-the-world').keyframes[1]).includes('wt')"))
        print('direction B steps        ', await pg.evaluate("reverseReps(exById('kb-around-the-world').keyframes).map(k => [k.name, (k.holds || []).join('+')])"))
        print('errors', errs); await b.close()
asyncio.run(main())
