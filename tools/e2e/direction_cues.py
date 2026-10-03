import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
# the other direction (B) plays the rep steps in reverse; each step's words still name where the body is, so the
# cue matches the compass (Hip Circles counterclockwise said "Backward" at the front until Sep 2026)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860})
        pg.on('pageerror', lambda e: errs.append(str(e)))
        for ex in ['wu-hip-circles', 'pil-leg-circles', 'wu-arm-circles']:
            await pg.goto(URL + f'#/play/{ex}', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
            for d in ['A', 'B']:
                await pg.evaluate(f"setPlaying(false); setDir('{d}')"); await pg.wait_for_timeout(100)
                rows = await pg.evaluate("S.resolved.map(r => [r.cue || '', r.guide ? r.guide.label : '']).filter(x => x[0] && x[1])")
                bad = [r for r in rows if r[1].split()[0].lower() not in r[0].lower() and not (r[1] == 'Up' and ('up' in r[0].lower() or 'ceiling' in r[0].lower()))]
                print(f'{ex:<16} {d}', rows, '| cue ≠ compass:', bad)
        check('errors', errs, []); await b.close()
asyncio.run(main())
