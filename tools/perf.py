"""Frame timing on a slow phone: CPU throttled 4x (Chrome DevTools), cover screen 360x398. Measures time to the
first drawn figure, then frame intervals while the exercise page and the workout player animate.

    NSTRUCTR_URL=http://127.0.0.1:8000/nstructr.html python3 tools/perf.py"""
import asyncio, os
from playwright.async_api import async_playwright
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
SAMPLE = """() => new Promise(res => { const t = []; let last = performance.now();
  const f = now => { t.push(now - last); last = now; if (t.length < 240) requestAnimationFrame(f); else res(t); }; requestAnimationFrame(f); })"""
def stats(t):
    t = sorted(t[10:]); n = len(t)
    return f'median {t[n // 2]:.1f} ms, 95th {t[int(n * .95)]:.1f} ms, worst {t[-1]:.1f} ms, frames over 33 ms: {sum(x > 33.4 for x in t)}/{n}'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for rate in [1, 4]:
            ctx = await b.new_context(viewport={'width': 360, 'height': 398}); pg = await ctx.new_page()
            cdp = await ctx.new_cdp_session(pg); await cdp.send('Emulation.setCPUThrottlingRate', {'rate': rate})
            await pg.goto(URL + '#/play/star-excursion-balance', wait_until='domcontentloaded')
            first = await pg.evaluate("performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd")
            await pg.wait_for_function("document.querySelector('#scene') && document.querySelector('#scene').innerHTML.length > 1000", timeout=20000)
            drawn = await pg.evaluate("performance.now()")
            print(f'CPU x{rate}: DOM ready {first:.0f} ms, figure drawn by {drawn:.0f} ms')
            await pg.evaluate("setPlaying(true)")
            print(f'  exercise page       {stats(await pg.evaluate(SAMPLE))}')
            await pg.evaluate("WK.hinted=true; setSound('off'); startWorkout(LIB_WK[0], 0)"); await pg.wait_for_timeout(500)
            print(f'  workout player      {stats(await pg.evaluate(SAMPLE))}')
            await pg.evaluate("exitWorkout(); go('#/exercises')"); await pg.wait_for_timeout(300)
            t = await pg.evaluate("(() => { const a = performance.now(); E.coll='All'; renderExplore(); return performance.now() - a; })()")
            print(f'  Exercises tab render {t:.0f} ms')
            await ctx.close()
        await b.close()
asyncio.run(main())
