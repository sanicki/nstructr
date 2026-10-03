import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# With a voice slower than the app's estimate (2.5 words a second; a phone's voice can be slower), Oct 2026:
# - the workout title card stays until it has said its name and "You'll need …" (it moved on mid-sentence);
# - an equipment change with no rest says what to do, then the exercise's name, then "Ready… Begin." (the name was
#   queued only once the equipment line had been said, so it could come after "Ready… Begin.").
# A fake voice: one line at a time from a queue, MS a word.
VOICE = """window.SP = { log: [], queue: [], busy: false };
  function next() { if (SP.busy || !SP.queue.length) return; const u = SP.queue.shift(); SP.busy = true; SP.log.push({ text: u.text, t: performance.now() });
    setTimeout(() => { SP.busy = false; SP.log[SP.log.length - 1].end = performance.now(); u.onend && u.onend(); next(); }, Math.max(150, u.text.split(/\\s+/).length * MS)); }
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak: u => { if (!u.text) return; SP.queue.push(u); next(); },
    cancel: () => { SP.queue.length = 0; }, get speaking() { return SP.busy; }, get pending() { return SP.queue.length > 0; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(viewport={'width': 412, 'height': 860}, service_workers='block'); pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script(VOICE.replace('MS', '600'))   # 1.5 times slower than the estimate (and within say()'s give-up time)
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_function("typeof equipPauseOn === 'function'")
        await pg.evaluate("""(() => { localStorage.setItem('nstructr-rest-between-v1', '0'); WK.hinted = true; setSound('voice');
          WK.list = WK.list.filter(w => w.id !== 's'); WK.list.push({ id: 's', name: 'Order', blocks: [{ id: 'b', name: 'B', items: ['fw-db-curl', 'chair-arm-raises'].map(id => ({ ...newItem(exById(id)), reps: 1 })) }] });
          saveWorkouts(); startWorkout(wkById('s')); })()""")
        await pg.wait_for_function("WP.phase === 'work'", timeout=30000)
        log = await pg.evaluate("SP.log")
        said = [l for l in log if l['text'].startswith("You'll need")][0]
        print('title card: stayed      ', said.get('end', 1e12) <= await pg.evaluate("performance.now()"), "<- True (moved on after \"You'll need: …\" was said, not in the middle)")
        await pg.wait_for_function("(i => i >= 0 && SP.log.length >= i + 3)(SP.log.findIndex(l => l.text.startsWith('Put the dumbbells down')))", timeout=60000)
        log = [l['text'] for l in await pg.evaluate("SP.log")]
        i = next(k for k, t in enumerate(log) if t.startswith('Put the dumbbells down'))
        print('no rest, change: order  ', log[i:i + 3], "<- ['Put the dumbbells down. Position yourself by your chair.', 'Seated Arm Raises.', 'Ready… Begin.']")
        print('errors', errs); await b.close()
asyncio.run(main())
