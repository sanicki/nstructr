import asyncio, os, re
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
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
      saveWorkouts(); startWorkout(wkById('c')); if (WP.phase === 'rest' && WP.restKind === 'start') wpAction('restSkip'); }})()""")
    await pg.wait_for_function("WP.phase === 'done' && !SP.busy && !SP.queue.length", timeout=120000)
    log = await pg.evaluate("SP.log"); await ctx.close(); return log
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        async def demos(items):
            ctx = await b.new_context(viewport={'width': 412, 'height': 860}, service_workers='block'); pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.add_init_script(VOICE)
            await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_function("typeof equipPauseOn === 'function'")
            await pg.evaluate(f"""(() => {{ localStorage.setItem('nstructr-rest-between-v1', '0'); localStorage.setItem('nstructr-rest-sets-v1', '0'); WK.hinted = true; setSound('coach'); setPref(ENCOURAGE_KEY, 'off');
              window.DEMO = []; const keep = onWorkStep; onWorkStep = i => {{ const m = S.planMeta[i] || {{}}; if (i === 0 || (i === S.trans)) DEMO.push(S.ex.id.replace(/^[a-z]+-/, '') + ' set ' + (WP.set + 1) + (WP.seg ? ' side 2' : '') + (S.planMeta.some(x => x.guided) ? ': demo' : ': no demo')); return keep(i); }};
              WK.list = WK.list.filter(w => w.id !== 'c'); WK.list.push({{ id: 'c', name: 'Demos', blocks: [{{ id: 'b', name: 'B', items: {items} }}] }});
              saveWorkouts(); startWorkout(wkById('c')); if (WP.phase === 'rest' && WP.restKind === 'start') wpAction('restSkip'); S.speed = 6; }})()""")
            await pg.wait_for_function("WP.phase === 'done'", timeout=180000)
            out = (await pg.evaluate("DEMO.filter((d, i) => d !== DEMO[i - 1])"), [t[:40] for t in await pg.evaluate("SP.log") if 'Watch me first' in t], [t[:24] for t in await pg.evaluate("SP.log") if t.startswith('Push-Up') or t.startswith('Set ')])
            await ctx.close(); return out
        # every run in its own browser context, all at once (about two minutes, the get-up the longest)
        star = {'ex': 'star-excursion-4-point', 'o': "{ reps: 2, sides: 'both' }"}
        (voice, coach, beeps, clock, getup, catcow, atw, push3, star2, ppp) = await asyncio.gather(
            run(b, 'voice', star, errs), run(b, 'coach', star, errs), run(b, 'beeps', star, errs),
            run(b, 'voice', {'ex': 'bal-clock-reach', 'o': '{ reps: 2 }'}, errs), run(b, 'voice', {'ex': 'kb-turkish-get-up', 'o': '{ reps: 1 }'}, errs),
            run(b, 'voice', {'ex': 'yoga-cat-cow', 'o': '{ reps: 2 }'}, errs), run(b, 'voice', {'ex': 'kb-around-the-world', 'o': "{ reps: 1, dir: 'B' }"}, errs),
            demos("[{ ...newItem(exById('bw-pushup')), reps: 2, sets: 3 }]"),
            demos("[{ ...newItem(exById('star-excursion-4-point')), reps: 1, sides: 'both', sets: 2 }]"),
            demos("['bw-pushup', 'core-crunch', 'bw-pushup'].map(id => ({ ...newItem(exById(id)), reps: 2 }))"))
        after = lambda log: log[log.index('Ready… Begin.') + 1:]
        # the right leg reaches left where the left leg reached right
        check('star, NstructR', ' '.join(t for t in voice if re.fullmatch(r'\d|Last one|Forward|Right|Back|Left|Switch sides.*', t)),
              lambda t: re.fullmatch(r'1 Forward Right Back Left Last one Forward Right Back Left Switch sides.* 1 Forward Left Back Right Last one Forward Left Back Right', t))
        check('star, NstructR+: run-through reads cues (after the workout title)', [t[:24] for t in coach[1:4]], ['4-Point Star Excursion, ', 'Lift the right foot. Kee', 'Forward. Bend the standi'])
        check('  then calls', after(coach)[:5], ['1', 'Forward', 'Right', 'Back', 'Left'])
        check('star, Beeps: nothing said', beeps, [])
        check("clock reach (no call on the count's step)", after(clock)[:6], ['1', 'Side', 'Down and back', 'Last one', 'Side', 'Down and back'])
        check('get-up', after(getup)[:12], ['1', 'Elbow', 'Hand', 'Hips', 'Sweep', 'Kneel', 'Stand', 'Kneel', 'Hand down', 'Leg through', 'Sit', 'Elbow'])
        check('cat-cow', after(catcow)[:6], ['1', 'Cow', 'Cat', 'Last one', 'Cow', 'Cat'])
        # the other way round the count takes the step it starts on (Left), so its call isn't said
        check('around the world, back', after(atw)[:3], ['1', 'Behind', 'Right'])
        # NstructR+ demonstrates once per appearance and side; later sets say "Set N", not the name again
        d, w, n = push3
        check('push-ups, 3 sets: demos', d, ['pushup set 1: demo', 'pushup set 2: no demo', 'pushup set 3: no demo'])
        check('  Watch me first once', len(w), 1)
        check('  then "Set 2", "Set 3"', [t[:9] for t in n], ['Push-Up. ', 'Set 2.', 'Set 3.'])
        d, w, n2 = star2
        check('star, both sides, 2 sets', d, ['excursion-4-point set 1: demo', 'excursion-4-point set 1 side 2: demo', 'excursion-4-point set 2: no demo', 'excursion-4-point set 2 side 2: no demo'])
        check('  Watch me first once', len(w), 1)
        check('  set 2 said', [t[:17] for t in n2], ['Set 2. Left leg.'])
        d, w, n = ppp
        check('push-ups, crunches, push-ups', [d, len(w)], [['pushup set 1: demo', 'crunch set 1: demo', 'pushup set 1: demo'], 3])
        check('errors', errs, []); await b.close()
asyncio.run(main())
