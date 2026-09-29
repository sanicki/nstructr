import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Travelling ("travel": true): each rep carries on from where the last one ended. Played for a few reps: the figure
# only ever moves forward over the floor (backward, for a walk played Backward) (no slide back at the loop), the view keeps it centred, and the floor
# ticks scroll. The same in a workout.
SAMPLE = """(() => { const b = S.resolved[S.idx], a = S.prev != null && S.resolved[S.prev] ? S.resolved[S.prev] : (S.from || b);
  const raw = b.dur ? Math.min(1, S.t / b.dur) : 1, e = b.ease === 'linear' ? raw : easeInOut(raw), f = travelFrame(a, b, e), P = fkAt(f.pose, S.seg, f.pos);
  const lo = ['ankleL', 'ankleR'].filter(k => P[k].y < 4).map(k => P[k][AX]);
  return [P.pelvis[AX], lo, +$('#figShadow').getAttribute('cx'), $('#floorTicks').children.length, S.rep]; })()"""
async def run(pg, id, ax, secs):
    await pg.evaluate(f"window.AX = '{ax}'; S.speed = 3")
    out = []
    for _ in range(int(secs / 0.05)):
        out.append(await pg.evaluate(SAMPLE)); await pg.wait_for_timeout(50)
    pel = [o[0] for o in out]
    back = min(b - a for a, b in zip(pel, pel[1:])) if pel[-1] > pel[0] else min(a - b for a, b in zip(pel, pel[1:]))
    cx = [round(o[2]) for o in out]
    print(f'{id:18} reps {out[-1][4]} | went {pel[-1] - pel[0]:.0f} px | biggest step back {back:.1f} | pelvis on screen {min(cx)}–{max(cx)} | ticks {out[-1][3]}')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        for id, ax in [('bw-walking-lunge', 'z'), ('band-lateral-walk', 'x'), ('bal-heel-to-toe-walk', 'z'), ('fw-farmers-carry', 'z')]:
            await pg.goto(URL + '#/play/' + id, wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
            await pg.evaluate("setPlaying(true)")
            await run(pg, id, ax, 6)
        # walking backward (the Backward direction): the steps reversed, each keeping the foot the reversed move keeps
        await pg.goto(URL + '#/play/bal-heel-to-toe-walk', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        await pg.evaluate("setDir('B'); setPlaying(true)")
        await run(pg, 'heel-to-toe, back', 'z', 6)
        # in a workout: the plan's reps carry on too
        await pg.evaluate("localStorage.setItem('nstructr-rest-between-v1','0'); WK.hinted = true; setSound('off'); WK.list.push({id:'t',name:'T',blocks:[{id:'b',name:'B',items:[{...newItem(exById('bw-walking-lunge')),reps:3}]}]}); saveWorkouts(); go('#/workouts')")
        await pg.wait_for_timeout(300); await pg.evaluate("startWorkout(wkById('t'),0)"); await pg.wait_for_timeout(400)
        print('workout offsets (z)     ', await pg.evaluate("S.offs.map(o => Math.round(o.z))"))
        await run(pg, 'workout: walking lunge', 'z', 4)
        await pg.goto(URL + '#/play/bw-squat', wait_until='domcontentloaded'); await pg.wait_for_timeout(400)
        print('not travelling: ticks   ', await pg.evaluate("$('#floorTicks').children.length"))
        print('errors', errs); await b.close()
asyncio.run(main())
