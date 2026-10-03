import asyncio, os, re
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Step calls (a keyframe's "call", Oct 2026 pilot): in the counted reps of NstructR and NstructR+, a step with a call says
# it as it starts ("1 … Forward. Right. Back. Left."); never on the rep's first step (the count's), skipped if it's still
# talking (the count wins); the other side swaps left and right; Silent and Beeps say nothing; the NstructR+ run-through
# reads the cues as before. NstructR+ demonstrates an exercise when you come to it and each side the first time, not
# again for the next sets ("Watch me first." on the first demonstration of each appearance). Words of encouragement off (no cheers), WP.random fixed.
# A fake voice: one line at a time from a queue, a word every 250 ms (fast enough for every call to fit).
VOICE = """window.SP = { log: [], queue: [], busy: false };
  function next() { if (SP.busy || !SP.queue.length) return; const u = SP.queue.shift(); SP.busy = true; SP.log.push(u.text);
    setTimeout(() => { SP.busy = false; u.onend && u.onend(); next(); }, Math.max(150, u.text.split(/\\s+/).length * 250)); }
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak: u => { if (!u.text) return; SP.queue.push(u); next(); },
    cancel: () => { SP.queue.length = 0; }, get speaking() { return SP.busy; }, get pending() { return SP.queue.length > 0; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };"""
async def run(b, mode, item, errs):
    ctx = await b.new_context(viewport={'width': 412, 'height': 860}, service_workers='block'); pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.add_init_script(VOICE)
    await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_function("typeof equipPauseOn === 'function'")
    await pg.evaluate(f"""(() => {{ localStorage.setItem('nstructr-rest-between-v1', '0'); localStorage.setItem('nstructr-rest-sets-v1', '0'); WK.hinted = true; setSound('{mode}'); setPref(ENCOURAGE_KEY, 'off');
      WK.list = WK.list.filter(w => w.id !== 'c'); WK.list.push({{ id: 'c', name: 'Calls', blocks: [{{ id: 'b', name: 'B', items: [{{ ...newItem(exById('{item['ex']}')), ...{item['o']} }}] }}] }});
      saveWorkouts(); startWorkout(wkById('c')); }})()""")
    await pg.wait_for_function("WP.phase === 'done' && !SP.busy && !SP.queue.length", timeout=120000)
    log = await pg.evaluate("SP.log"); await ctx.close(); return log
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        star = {'ex': 'star-excursion-4-point', 'o': "{ reps: 2, sides: 'both' }"}
        log = await run(b, 'voice', star, errs)
        counted = [t for t in log if re.fullmatch(r'\d|Last one|Forward|Right|Back|Left|Switch sides.*', t)]
        print('star, NstructR          ', ' '.join(counted))
        print("  <- 1 Forward Right Back Left Last one Forward Right Back Left Switch sides… 1 Forward Left Back Right Last one Forward Left Back Right")
        print('                          (the right leg reaches left where the left leg reached right)')
        log = await run(b, 'coach', star, errs)
        i = log.index('Ready… Begin.')
        print('star, NstructR+: run-through reads cues', [t[:40] for t in log[0:3]], "<- ['4-Point Star Excursion, Left leg. Watch me…', 'Lift the right foot. …', 'Forward. Bend the standing knee …']")
        print('  then calls            ', ' '.join(log[i + 1:i + 6]), '<- 1 Forward Right Back Left')
        log = await run(b, 'beeps', star, errs)
        print('star, Beeps             ', log, '<- [] (nothing said)')
        log = await run(b, 'voice', {'ex': 'bal-clock-reach', 'o': '{ reps: 2 }'}, errs)
        i = log.index('Ready… Begin.')
        print('clock reach             ', ' '.join(log[i + 1:]), "<- 1 Side Down and back Last one Side Down and back … (no call on the count's step)")
        log = await run(b, 'voice', {'ex': 'kb-turkish-get-up', 'o': '{ reps: 1 }'}, errs)
        i = log.index('Ready… Begin.')
        print('get-up                  ', ' · '.join(log[i + 1:-1]), '<- 1 · Elbow · Hand · Hips · Sweep · Kneel · Stand · Kneel · Hand down · Leg through · Sit · Elbow')
        # NstructR+ demonstrates an exercise when you come to it and each side the first time it comes up; not again for
        # its next sets; again when it comes back later ("Watch me first." on each appearance's first demonstration)
        async def demos(items):
            ctx = await b.new_context(viewport={'width': 412, 'height': 860}, service_workers='block'); pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.add_init_script(VOICE)
            await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_function("typeof equipPauseOn === 'function'")
            await pg.evaluate(f"""(() => {{ localStorage.setItem('nstructr-rest-between-v1', '0'); localStorage.setItem('nstructr-rest-sets-v1', '0'); WK.hinted = true; setSound('coach'); setPref(ENCOURAGE_KEY, 'off');
              window.DEMO = []; const keep = onWorkStep; onWorkStep = i => {{ const m = S.planMeta[i] || {{}}; if (i === 0 || (i === S.trans)) DEMO.push(S.ex.id.replace(/^[a-z]+-/, '') + ' set ' + (WP.set + 1) + (WP.seg ? ' side 2' : '') + (S.planMeta.some(x => x.guided) ? ': demo' : ': no demo')); return keep(i); }};
              WK.list = WK.list.filter(w => w.id !== 'c'); WK.list.push({{ id: 'c', name: 'Demos', blocks: [{{ id: 'b', name: 'B', items: {items} }}] }});
              saveWorkouts(); startWorkout(wkById('c')); S.speed = 6; }})()""")
            await pg.wait_for_function("WP.phase === 'done'", timeout=180000)
            out = (await pg.evaluate("DEMO.filter((d, i) => d !== DEMO[i - 1])"), [t[:40] for t in await pg.evaluate("SP.log") if 'Watch me first' in t], [t[:24] for t in await pg.evaluate("SP.log") if t.startswith('Push-Up')])
            await ctx.close(); return out
        d, w, n = await demos("[{ ...newItem(exById('bw-pushup')), reps: 2, sets: 3 }]")
        print('push-ups, 3 sets        ', d, w, "<- set 1 demo, sets 2 and 3 no demo; Watch me first once")
        print('  named every set       ', n, "<- ['Push-Up. Watch me first. …', 'Push-Up.', 'Push-Up.'] (no demonstration: the name, as NstructR)")
        d, w, n = await demos("[{ ...newItem(exById('star-excursion-4-point')), reps: 1, sides: 'both', sets: 2 }]")
        print('star, both sides, 2 sets', d, w, "<- set 1 and set 1 side 2 demo; set 2 (both sides) no demo; Watch me first once")
        d, w, n = await demos("['bw-pushup', 'core-crunch', 'bw-pushup'].map(id => ({ ...newItem(exById(id)), reps: 2 }))")
        print('push-ups, crunches, push-ups', d, len(w), "<- ['pushup set 1: demo', 'crunch set 1: demo', 'pushup set 1: demo'] 3 (Watch me first each time)")
        print('errors', errs); await b.close()
asyncio.run(main())
