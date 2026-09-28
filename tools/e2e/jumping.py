import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Jumping (a step's "lift"): as the player draws it, the airborne step has nothing on the floor (lowest body point
# about "lift" above it), the steps before and after rest on it, and the move up rises smoothly (no jump in height).
LOWEST = """(i, e) => { const a = S.resolved[i - 1] || S.resolved[i], b = S.resolved[i], f = frameAt(a, b, e, S.seg), P = fkAt(f.pose, S.seg, f.pos);
  return Math.round(Math.min(...CONTACT_POINTS.map(k => P[k].y - supportAt(P[k])))); }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        for id, want in [('bw-jump-squat', 45), ('bw-jumping-jacks', 20), ('wu-high-knees', 6)]:
            await pg.goto(URL + '#/play/' + id, wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
            steps = await pg.evaluate("S.resolved.map((r, i) => [i, r.name, r.rule.lift || 0])")
            air = [s for s in steps if s[2]]
            lows = await pg.evaluate(f"(() => {{ const low = {LOWEST}; return S.resolved.map((r, i) => low(i, 1)); }})()")
            rise = await pg.evaluate(f"(() => {{ const low = {LOWEST}; const i = {air[0][0]}; return [0, .25, .5, .75, 1].map(e => low(i, e)); }})()")
            print(f'{id:18} airborne {[s[1] for s in air]} lowest point per step {lows} | rising {rise} <- airborne ≈ {want}, others 0')
        print('errors', errs); await b.close()
asyncio.run(main())
