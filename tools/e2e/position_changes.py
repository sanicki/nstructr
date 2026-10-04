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
        # a seated line says how the next exercise sits (the owner's lines offered a choice: "feet flat or legs crossed")
        check('seated: how it sits', await pg.evaluate("['yoga-staff', 'yoga-seated-forward-bend', 'pil-saw', 'core-russian-twist', 'yoga-cow-face-arms-strap', 'pil-seal', 'pil-rolling-ball', 'seated-hamstring-stretch'].map(id => seatStyle(exById(id)))"),
              ['flat', 'long', 'wide', 'bent', 'crossed', 'soles', 'tucked', 'one-leg'])
        check('  the lines', await pg.evaluate("[['standing', 'flat'], ['all-fours', 'crossed'], ['kneeling', 'long'], ['standing', 'heels'], ['all-fours', 'heels'], ['kneeling', 'heels']].map(([a, h]) => positionLine(a, 'seated', '', h))"),
              ['Sit down on your mat with your feet flat.', 'Shift your hips back and sit on your mat with your legs crossed.', 'Sit your hips down to the floor with your legs out in front.',
               'Kneel down and sit back on your heels.', 'Shift your hips back to sit on your heels.', 'Sit your hips back onto your heels.'])
        check('  no "or" left', await pg.evaluate("Object.values(POS_SAY).flatMap(Object.values).filter(l => typeof l === 'string' && / or /.test(l))"), [])
        check('changes', await pg.evaluate("""[['bw-squat', 'bw-glute-bridge', 'L'], ['fw-db-squat', 'band-glute-bridge', 'L'], ['bw-squat', 'bw-reverse-lunge', 'L'], ['bw-squat', 'side-clamshell', 'L'], ['bw-squat', 'side-clamshell', 'R']]
          .map(([a, c, s]) => { const x = exerciseChange(exById(a), exById(c), s); return x && [x.lines.join(' / '), x.equipment]; })"""),
              [['Lower to the floor and roll onto your back', False],
               ['Put the dumbbells down / Lower to the floor and roll onto your back / Pick up the resistance band and loop it around your thighs, just above the knees', True],
               None, ['Lower to your left side, stacking your hips and knees', False], ['Lower to your right side, stacking your hips and knees', False]],
              'put down, change position, pick up (and where it goes); none standing to standing; the side lain on')
        # where the equipment goes (owner, Oct 2026): with picking it up, or on its own when it stays but moves (the same
        # chair under the hands, then the feet); worked out from the props and what rests on the furniture (placementsOf)
        check('placements', await pg.evaluate("""[['bench-incline-pushup', 'bench-decline-pushup'], ['bhf-bicep-curl', 'band-glute-bridge'], ['bw-squat', 'bhf-bicep-curl'], ['chair-dip', 'chair-incline-pushup'],
          ['bw-squat', 'band-pallof-press'], ['bw-wall-pushup', 'bw-wall-sit'], ['chair-sit-to-stand', 'chair-calf-raise'], ['bhf-bicep-curl', 'band-overhead-press']]
          .map(([a, c]) => { const x = exerciseChange(exById(a), exById(c), 'L'); return x && x.lines.join(' / '); })"""),
              ['Hinge forward, plant your hands, and step back to plank / Put your feet up on the bench',
               'Lower to the floor and roll onto your back / Loop the band around your thighs, just above the knees',
               'Pick up the resistance band, then put both feet on the middle of it and hold the ends',
               'Position yourself by your wall / Put your hands on the seat',
               'Set up your door anchor / Pick up the resistance band and anchor it at chest height, side-on to the anchor',
               'Stand with your back against the wall', 'Stand behind the chair, holding the back', None],
              'what you go to before what you carry; nothing when it stays where it was')
        check('  an exercise\'s own', await pg.evaluate("""(() => { const a = { ...exById('bhf-bicep-curl') }, c = { ...exById('band-glute-bridge'), placement: { 'Resistance band': 'put {it} on above your knees' } };
          return exerciseChange(a, c).lines.slice(-1)[0]; })()"""), 'Put the band on above your knees')
        check('estimate counts it', await pg.evaluate("""(() => { const w = { id: 'e', name: 'E', blocks: [{ id: 'b', name: 'B', items: ['bw-squat', 'bw-glute-bridge'].map(id => ({ ...newItem(exById(id)), reps: 1 })) }] };
          return equipmentSeconds(w); })()"""), 6, 'the change 0.5 + 9 words at 2.5 a second + 0.5 = 4.6, the title card 0.5 + 1 word + 0.5 = 1.4')
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
        check('same position: none', await pg.evaluate("SAID.filter(t => Object.values(POS_SAY).flatMap(Object.values).map(l => typeof l === 'function' ? l('long') : l).some(l => t.includes(l.split(',')[0].replace('{side} ', ''))))"), [], 'no position line said')
        await pg.evaluate("hush(); WP.phase = 'done'; setPref(EQUIP_PAUSE_KEY, 'off')")
        check('errors', errs, []); await b.close()
asyncio.run(main())
