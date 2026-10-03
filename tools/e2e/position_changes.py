import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
# Position changes (owner, Oct 2026): from one exercise to the next in another position (src/positions.js) NstructR and
# NstructR+ say how to get there while the figure moves, like an equipment change (between putting down and picking up): with a
# rest after "Rest N seconds. Next: …", with no rest while the move, slowed to last as long, plays. Every pair of
# positions has a line (POS_SAY, the ways into inversions composed with their neighbour on the route); a line to lying
# on the side names the side the next exercise lies on. "Pause at equipment changes" doesn't wait for a position alone.
SAY = "window.SAID = []; say = t => { SAID.push(t); return Promise.resolve(); };"
WK = """((ids, rest) => { localStorage.setItem('nstructr-rest-between-v1', String(rest)); WK.hinted = true;
  WK.list = WK.list.filter(w => w.id !== 't'); WK.list.push({ id: 't', name: 'T', blocks: [{ id: 'b', name: 'B', items: ids.map(id => ({ ...newItem(exById(id)), reps: 1, seconds: 3 })) }] });
  saveWorkouts(); startWorkout(wkById('t'), 0); if (WP.phase === 'rest') wpAction('restSkip'); })"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(viewport={'width': 412, 'height': 860}, service_workers='block'); pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_function("typeof exerciseChange === 'function'"); await pg.wait_for_timeout(300)
        check('every pair has a line', await pg.evaluate("""(() => { const P = POSITIONS_EX.POSITIONS; const out = [];
          for (const a of P) for (const c of P) if (a !== c && !positionLine(a, c, 'left')) out.push(a + '>' + c); return out; })()"""), [])
        check('lines', await pg.evaluate("""[['standing', 'supine'], ['plank', 'prone'], ['supine', 'down-dog'], ['dolphin', 'standing'], ['standing', 'side-lying']].map(([a, c]) => positionLine(a, c, 'right'))"""),
              ['Lower to the floor and roll onto your back.', 'Lower your body all the way down to the mat.',
               'Roll to one side, press up, and stand tall. Fold forward and walk your hands out to Downward Dog.',
               'Lower your knees and come up onto your hands. Tuck your toes, step forward, and rise to stand.',
               'Lower to your right side, stacking your hips and knees.'])
        check('changes', await pg.evaluate("""[['bw-squat', 'bw-glute-bridge', 'L'], ['fw-db-squat', 'band-glute-bridge', 'L'], ['bw-squat', 'bw-reverse-lunge', 'L'], ['bw-squat', 'side-clamshell', 'L'], ['bw-squat', 'side-clamshell', 'R']]
          .map(([a, c, s]) => { const x = exerciseChange(exById(a), exById(c), s); return x && [x.lines.join(' / '), x.equipment]; })"""),
              [['Lower to the floor and roll onto your back', False],
               ['Put the dumbbells down / Lower to the floor and roll onto your back / Pick up the resistance band', True],
               None, ['Lower to your left side, stacking your hips and knees', False], ['Lower to your right side, stacking your hips and knees', False]],
              'put down, change position, pick up; none standing to standing; the side lain on')
        check('estimate counts it', await pg.evaluate("""(() => { const w = { id: 'e', name: 'E', blocks: [{ id: 'b', name: 'B', items: ['bw-squat', 'bw-glute-bridge'].map(id => ({ ...newItem(exById(id)), reps: 1 })) }] };
          return equipmentSeconds(w); })()"""), 4.6, '0.5 + 9 words at 2.5 a second + 0.5')
        # with a rest: after the rest line
        await pg.evaluate(SAY); await pg.evaluate("setSound('voice'); setPref(EQUIP_PAUSE_KEY, 'on')")
        await pg.evaluate(WK + "(['bw-squat', 'bw-glute-bridge'], 5)"); await pg.wait_for_timeout(300)
        await pg.evaluate("S.speed = 20"); await pg.wait_for_function("WP.phase === 'rest'", timeout=30000); await pg.evaluate("S.speed = 1"); await pg.wait_for_timeout(900)
        check('rest: shown and said', await pg.evaluate("[$('#wpRestEquip').textContent, SAID.slice(-2), WP.waitReady, Math.round(WP.restLeft) > 5]"),
              ['Lower to the floor and roll onto your back', ['Rest 10 seconds. Next: Glute Bridge.', 'Lower to the floor and roll onto your back.'], False, True],
              'the rest is 5 s + the line; Pause at equipment changes on, but a position alone counts down')
        # no rest: said while the move, slowed to last as long, plays
        await pg.evaluate("hush(); WP.phase = 'done'"); await pg.evaluate(WK + "(['bw-squat', 'bw-glute-bridge'], 0)"); await pg.wait_for_timeout(300)
        await pg.evaluate("S.speed = 20"); await pg.wait_for_function("S.ex.id === 'bw-glute-bridge'", timeout=30000); await pg.evaluate("S.speed = 1"); await pg.wait_for_timeout(900)
        check('no rest: said while moving', await pg.evaluate("[WP.phase, $('#wpRest').hidden, S.trans > 0, S.resolved.slice(0, S.trans + 1).reduce((t, r, i) => t + r.dur + (i < S.trans ? r.hold : 0), 0) >= 4600, SAID.slice(-2)]"),
              ['work', True, True, True, ['Lower to the floor and roll onto your back.', 'Glute Bridge.']], 'the line, then the name')
        # the same position: nothing to say
        await pg.evaluate("hush(); WP.phase = 'done'; SAID.length = 0"); await pg.evaluate(WK + "(['bw-squat', 'bw-reverse-lunge'], 0)"); await pg.wait_for_timeout(300)
        await pg.evaluate("S.speed = 20"); await pg.wait_for_function("S.ex.id === 'bw-reverse-lunge'", timeout=30000); await pg.wait_for_timeout(600)
        check('same position: none', await pg.evaluate("SAID.filter(t => Object.values(POS_SAY).flatMap(Object.values).some(l => t.includes(l.split(',')[0].replace('{side} ', ''))))"), [], 'no position line said')
        await pg.evaluate("hush(); WP.phase = 'done'; setPref(EQUIP_PAUSE_KEY, 'off')")
        check('errors', errs, []); await b.close()
asyncio.run(main())
