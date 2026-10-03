"""Speed on a slow phone (Chrome DevTools' CPU throttling), cover screen 360x398.
Startup: from navigation to the Workouts tab showing the library's workouts, for both builds (the single file and
index.html + library/index.json), CPU x1/x4/x6, a first visit on slow 4G and a repeat visit (cached by the service
worker), with the main thread's script and layout time. Then frame intervals while the exercise page and the workout
player animate, and the Exercises tab's render time.

    NSTRUCTR_URL=http://127.0.0.1:8000/nstructr.html python3 tools/perf.py [--startup-only]"""
import asyncio, os, sys
from playwright.async_api import async_playwright
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
SAMPLE = """() => new Promise(res => { const t = []; let last = performance.now();
  const f = now => { t.push(now - last); last = now; if (t.length < 240) requestAnimationFrame(f); else res(t); }; requestAnimationFrame(f); })"""
def stats(t):
    t = sorted(t[10:]); n = len(t)
    return f'median {t[n // 2]:.1f} ms, 95th {t[int(n * .95)]:.1f} ms, worst {t[-1]:.1f} ms, frames over 33 ms: {sum(x > 33.4 for x in t)}/{n}'
SLOW_4G = {'offline': False, 'latency': 150, 'downloadThroughput': 1.6e6 / 8, 'uploadThroughput': 0.75e6 / 8}
READY = "typeof LIB_WK !== 'undefined' && LIB_WK.length > 0 && !!document.querySelector('#view-workouts .wk-card')"
async def startup(b, page, rate, net, repeat):
    ctx = await b.new_context(viewport={'width': 360, 'height': 398})
    if repeat:                                                   # a first visit installs the service worker and its cache
        first = await ctx.new_page(); await first.goto(page + '#/workouts', wait_until='load'); await first.wait_for_function(READY, timeout=60000)
        await first.wait_for_function("navigator.serviceWorker.controller || new Promise(r => navigator.serviceWorker.addEventListener('controllerchange', () => r(true)))", timeout=30000)
        await first.wait_for_timeout(1000); await first.close()
    pg = await ctx.new_page(); cdp = await ctx.new_cdp_session(pg)
    await cdp.send('Emulation.setCPUThrottlingRate', {'rate': rate})
    if net: await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', net)
    await cdp.send('Performance.enable')
    await pg.goto(page + '#/workouts', wait_until='commit'); await pg.wait_for_function(READY, timeout=120000, polling=50)
    ready = await pg.evaluate("performance.now()")
    m = {x['name']: x['value'] for x in (await cdp.send('Performance.getMetrics'))['metrics']}
    await ctx.close()
    return ready, m.get('ScriptDuration', 0) * 1000, (m.get('LayoutDuration', 0) + m.get('RecalcStyleDuration', 0)) * 1000
async def startups(b):
    base = URL.rsplit('/', 1)[0] + '/'
    print('startup: navigation to the Workouts tab ready (ms; script / layout+style ms)')
    for name, page in [('single file', base + 'nstructr.html'), ('index.html', base)]:
        for label, net, repeat in [('fast network', None, False), ('slow 4G, first visit', SLOW_4G, False), ('slow 4G, repeat visit', SLOW_4G, True)]:
            if repeat and name == 'single file': continue
            row = []
            for rate in [1, 4, 6]:
                t, js, lay = await startup(b, page, rate, net, repeat); row.append(f'x{rate} {t:5.0f} ({js:.0f} / {lay:.0f})')
            print(f'  {name:<11} {label:<22} ' + '   '.join(row))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        await startups(b)
        if '--startup-only' in sys.argv: await b.close(); return
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
