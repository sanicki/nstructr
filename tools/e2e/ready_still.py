import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# "Ready… Begin." waits where the figure is (the end of the setup or of NstructR+'s demonstration; with neither, the
# position a rep ends in), and the rep's first move comes with "1". Oct 2026: it moved into the rep's first step, so
# Side Stepping took its first step before "Begin".
VOICE = """window.SP = { log: [], queue: [], busy: false };
  function next() { if (SP.busy || !SP.queue.length) return; const u = SP.queue.shift(); SP.busy = true; SP.log.push(u.text);
    setTimeout(() => { SP.busy = false; u.onend && u.onend(); next(); }, Math.max(150, 300 + u.text.split(/\\s+/).length * 400)); }
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak: u => { if (!u.text) return; SP.queue.push(u); next(); },
    cancel: () => { SP.queue.length = 0; }, get speaking() { return SP.busy; }, get pending() { return SP.queue.length > 0; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };"""
# every animation frame: where the feet are on screen and what's being said
WATCH = """ms => new Promise(res => { const out = [], t0 = performance.now();
  const f = now => { const q = s => { const e = document.querySelector('#scene .foot' + s) || document.querySelector('#scene [data-j="ankle' + s + '"]'); return e ? Math.round(e.getBoundingClientRect().x) : null; };
    const m = S.planMeta[S.idx] || {}, bones = [...document.querySelectorAll('#scene .bone')].map(e => e.getAttribute('d') || [e.getAttribute('x1'), e.getAttribute('y1'), e.getAttribute('x2'), e.getAttribute('y2')].join()).join('|');
    out.push({ t: Math.round(now - t0), said: SP.log[SP.log.length - 1], ready: !!m.ready, rep: m.repNo || 0, idx: S.idx, bones });
    if (now - t0 < ms) requestAnimationFrame(f); else res(out); };
  requestAnimationFrame(f); })"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        for mode in ['voice', 'coach']:
            ctx = await b.new_context(viewport={'width': 412, 'height': 860}, service_workers='block'); pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.add_init_script(VOICE)
            await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_function("typeof equipPauseOn === 'function'")
            await pg.evaluate(f"""(() => {{ localStorage.setItem('nstructr-rest-between-v1', '0'); WK.hinted = true; setSound('{mode}'); setPref(ENCOURAGE_KEY, 'off');
              WK.list = WK.list.filter(w => w.id !== 'r'); WK.list.push({{ id: 'r', name: 'R', blocks: [{{ id: 'b', name: 'B', items: [{{ ...newItem(exById('bal-side-stepping')), reps: 2, sides: 'L' }}] }}] }});
              saveWorkouts(); startWorkout(wkById('r')); }})()""")
            await pg.wait_for_function("S.planMeta[S.idx] && S.planMeta[S.idx].ready", timeout=60000)
            fr = await pg.evaluate(WATCH, 4000)
            ready = [f for f in fr if f['ready']]
            moved = len(set(f['bones'] for f in ready)) - 1 if ready else None   # how many times the drawing changed
            first = next((f for f in fr if f['rep'] == 1), None)
            print(mode.ljust(6), 'during Ready… Begin.: figure changed', moved, 'times over', len(ready), 'frames <- 0',
                  '| "1" said as rep 1 starts:', first and first['said'], "<- '1' (then the first side step)")
            await ctx.close()
        # every reps exercise: the ready step is the frame before it, held (no move), or with nothing before it the rep's end
        ctx = await b.new_context(viewport={'width': 412, 'height': 860}, service_workers='block'); pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_function("typeof equipPauseOn === 'function'")
        bad = await pg.evaluate("""(async () => { const idx = await (await fetch('library/index.json')).json(); const out = []; WP.shown = new Set();
          for (const mode of ['voice', 'coach']) { setSound(mode);
            for (const ex of idx.exercises.filter(e => e.measure !== 'time')) {
              const it = { ...newItem(ex), reps: 1 }, seg = itemSegments(it)[0]; WP.i = 0; WP.set = 0; WP.seg = 0;
              let p; try { p = buildPlan(it, seg); } catch (e) { out.push(ex.id + ': ' + e.message); continue; }
              const r = p.meta.findIndex(m => m.ready); if (r < 0) { out.push(ex.id + ': no ready step'); continue; }
              const R = p.plan[r];
              if (r > 0 ? (R.dur !== 0 || JSON.stringify(R.pose) !== JSON.stringify(p.plan[r - 1].pose)) : R.step !== phaseInfo(ex.keyframes).end) out.push(mode + ' ' + ex.id);
            } }
          return out; })()""")
        print('every reps exercise: ready step holds still', bad[:8], len(bad), '<- [] 0')
        print('errors', errs); await b.close()
asyncio.run(main())
