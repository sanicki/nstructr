import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
# Between exercises (src/positions.js, stagePlan in src/app/4c-plan.js): two exercises in the same position (Squat ->
# Lateral Raise, both standing; the camera turns from the side to the front) move through the at-rest pose, the frame
# glides and nothing jumps; a change of position (standing -> lying on the back) follows the moves between positions
# (sit down, lie back) with no jump; to a chair, up to standing beside it as it fades in; no position (a foam roller)
# and Clamshell's mirrored other side crossfade; with a rest, the move happens during the rest (a
# rest that ends first waits) and stops in the next exercise's first pose.
WK = """(rest => { localStorage.setItem('nstructr-rest-between-v1', String(rest)); WK.hinted = true; setSound('off');
  const it = id => ({ ...newItem(exById(id)), reps: 2 });
  WK.list = WK.list.filter(w => w.id !== 't'); WK.list.push({ id: 't', name: 'T', blocks: [{ id: 'b', name: 'B', items: [it('bw-squat'), it('bhf-lateral-raise'), it('bw-glute-bridge'), it('chair-arm-raises')] }] });
  saveWorkouts(); startWorkout(wkById('t'), 0); if (WP.restKind === 'start') wpAction('restSkip'); })"""   # past the title card (the workout has a chair)
# every animation frame for ms: where the head is on screen, the viewBox, the number of scene pictures
WATCH = """ms => new Promise(res => { const out = [], t0 = performance.now();
  const f = now => { const h = document.querySelector('#scene circle.head').getBoundingClientRect();
    out.push({ t: now - t0, x: h.x + h.width / 2, y: h.y + h.height / 2, vb: scene.getAttribute('viewBox'), n: document.querySelectorAll('svg.scene').length, px: S.drawnX, idx: S.idx, trans: S.trans, ex: S.ex.id + (WP.seg ? ' (2nd side)' : '') });
    if (now - t0 < ms) requestAnimationFrame(f); else res(out); };
  requestAnimationFrame(f); })"""
def snaps(fr):
    # frames where the head moves far more than in the frames either side (a jump, not just a quick move)
    # (speed, px per ms, so a dropped frame isn't counted as a jump)
    d = [((c['x'] - a['x']) ** 2 + (c['y'] - a['y']) ** 2) ** 0.5 / max(1, c['t'] - a['t']) for a, c in zip(fr, fr[1:])]
    return [round(d[i] * 16.7, 1) for i in range(1, len(d) - 1) if d[i] * 16.7 > 3 and d[i] > 2.5 * (d[i - 1] + d[i + 1]) / 2]
def rev(vals, th=0.5):
    # how many times a path turns back (wiggles under th px ignored)
    n, sign, ext = 0, 0, vals[0]
    for v in vals[1:]:
        if sign >= 0 and v > ext: ext = v; sign = sign or 1
        elif sign <= 0 and v < ext: ext = v; sign = sign or -1
        elif abs(v - ext) > th: n += 1; sign = -sign; ext = v
    return n
def jump(fr):
    # the largest move in one 60 fps frame (px): a slow machine's longer frames aren't counted as jumps, a real jump
    # (a teleport in one frame) still is
    return round(max((((b['x'] - a['x']) ** 2 + (b['y'] - a['y']) ** 2) ** 0.5 * 16.7 / max(16.7, b['t'] - a['t']) for a, b in zip(fr, fr[1:])), default=0), 1)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        check('positions', await pg.evaluate("['bw-squat', 'bhf-lateral-raise', 'bw-glute-bridge'].map(id => { const p = posOf(exById(id)); return p.start + '>' + p.end; })"), ['standing>standing', 'standing>standing', 'supine>supine'])
        # no rest: Squat -> Lateral Raise (same position, side camera -> front)
        await pg.evaluate(WK + '(0)'); await pg.wait_for_timeout(1500)
        check('first exercise: no move', await pg.evaluate('S.trans'), 0, 'nothing to come from')
        await pg.evaluate("wpAction('nextItem')")
        fr = await pg.evaluate(WATCH, 2200)
        vbs = sorted(set(f['vb'] for f in fr))
        check('same position: moves', [fr[0]['trans'], *await pg.evaluate("[S.planMeta[0].phase, S.resolved[0].name]")], [1, 'transition', 'Standing'], 'through Standing')
        check('  frame glides (viewBoxes)', len(vbs), at_least(20), 'many, not one cut')
        check('  largest step (px)', jump(fr), below(4), 'small: no jump')
        check('  one picture', max(f['n'] for f in fr), 1, 'no crossfade')
        check('  ends in the exercise', await pg.evaluate("S.idx >= S.trans"), True)
        # Lateral Raise -> Glute Bridge: standing to lying on the back, along the moves between positions
        await pg.evaluate("wpAction('nextItem')")
        way = await pg.evaluate("S.resolved.slice(0, S.trans).map(r => r.name)")
        fr = await pg.evaluate(WATCH, 6500)
        check('change of position', way, ['Standing', 'Squat', 'Sit back', 'Seated', 'Lying on your back'])
        check('  no snaps, one picture', [snaps(fr), max(f['n'] for f in fr)], [[], 1])
        check('  no weights or band', await pg.evaluate("document.querySelector('#propsFront').innerHTML.length"), 0, 'Glute Bridge has none')
        # Glute Bridge -> Chair Arm Raises: up to standing in front of the chair, which fades in as the figure sits on it
        await pg.evaluate("wpAction('nextItem')")
        way = await pg.evaluate("S.resolved.slice(0, S.trans).map(r => r.name)")
        check('to a chair', [way[-1], await pg.evaluate("posOf(exById('chair-arm-raises')).start")], ['Standing', 'standing'], 'you walk up to furniture')
        await pg.wait_for_function("S.idx === S.trans && S.t > S.resolved[S.trans].dur * 0.3 && S.t < S.resolved[S.trans].dur * 0.7", timeout=15000)
        check('  chair fading in', await pg.evaluate("[+$('#propsBack').style.opacity > 0 && +$('#propsBack').style.opacity < 1, $('#propsBack').innerHTML.includes('surface')]"), [True, True])
        # no position to go through (a foam roller exercise): a crossfade; Clamshell's other side (mirrored, the head the
        # other way): a crossfade, not a flip through the air
        await pg.evaluate("hush(); WP.phase = 'done'")
        await pg.evaluate("""(() => { localStorage.setItem('nstructr-rest-between-v1', '0'); WK.list = WK.list.filter(w => w.id !== 't');
          WK.list.push({ id: 't', name: 'T', blocks: [{ id: 'b', name: 'B', items: [{ ...newItem(exById('roller-hamstrings')), reps: 1 }, { ...newItem(exById('side-clamshell')), reps: 1, sides: 'both' }] }] });
          saveWorkouts(); startWorkout(wkById('t'), 0); })()"""); await pg.wait_for_timeout(400)
        await pg.evaluate("wpAction('nextItem')"); fr = await pg.evaluate(WATCH, 500)
        check('no position: crossfade', [fr[0]['trans'], max(f['n'] for f in fr)], [0, 2])
        await pg.wait_for_timeout(300); await pg.evaluate("S.idx = S.resolved.length - 1; S.t = S.resolved[S.idx].dur; onWorkEnd()"); fr = await pg.evaluate(WATCH, 1500)
        check('Clamshell other side', [fr[0]['trans'], max(f['n'] for f in fr), snaps(fr)], [0, 2, []], 'a crossfade, no flip')
        # with a rest: the move happens in the rest and waits in the first pose
        await pg.evaluate("hush(); WP.phase = 'done'"); await pg.evaluate(WK + '(5)'); await pg.wait_for_timeout(300)
        await pg.evaluate("S.speed = 20"); await pg.wait_for_timeout(2500)        # through the squats quickly
        await pg.evaluate("S.speed = 1"); await pg.wait_for_function("WP.phase === 'rest'", timeout=15000)
        await pg.wait_for_timeout(2600)
        check('rest: moved, waiting', await pg.evaluate("[WP.phase, S.trans, S.idx, S.playing, S.planDone, S.ex.id]"), ['rest', 1, 1, True, False, 'bhf-lateral-raise'])
        await pg.evaluate("wpAction('restSkip')"); await pg.wait_for_timeout(200)
        check('after the rest', await pg.evaluate("[WP.phase, S.trans, S.planMeta[0].phase !== 'transition']"), ['work', 0, True])
        # a rest shorter than the move (1 s; Lateral Raise -> Glute Bridge takes about 5): the rest waits until it's there
        await pg.evaluate("hush(); WP.phase = 'done'"); await pg.evaluate(WK + '(1)'); await pg.wait_for_timeout(300)
        await pg.evaluate("wpAction('nextItem'); S.speed = 20"); await pg.wait_for_timeout(2500); await pg.evaluate("S.speed = 1")
        await pg.wait_for_function("WP.phase === 'rest' && S.ex.id === 'bw-glute-bridge'", timeout=15000); await pg.wait_for_timeout(2000)
        check('short rest: still moving', await pg.evaluate("[WP.phase, WP.restLeft <= 0, S.idx < S.trans]"), ['rest', True, True])
        await pg.wait_for_function("WP.phase === 'work'", timeout=10000)
        check('  then starts, arrived', await pg.evaluate("[WP.phase, S.planMeta[0].phase !== 'transition']"), ['work', True])
        # the owner's case (Oct 2026): Side Stepping (travels) -> Neck Stretch, both sides: before, the figure jumped 88 px
        # into the neck stretch (the travel was forgotten) and 104 px between its sides (a side is placed elsewhere)
        await pg.evaluate("hush(); WP.phase = 'done'")
        await pg.evaluate("""(() => { localStorage.setItem('nstructr-rest-between-v1', '0'); setSound('off'); WK.list = WK.list.filter(w => w.id !== 't');
          WK.list.push({ id: 't', name: 'T', blocks: [{ id: 'b', name: 'B', items: [{ ...newItem(exById('bal-side-stepping')), reps: 2 }, { ...newItem(exById('mayo-neck')), seconds: 3, sides: 'both' }] }] });
          saveWorkouts(); startWorkout(wkById('t'), 0); })()""")
        fr = await pg.evaluate(WATCH, 22000)
        # into the neck stretch: the figure's place on screen and the view's middle each move one way only (Oct 2026:
        # the rest pose stood at its own spot, so the figure and the view went out to it and back: a bounce)
        into = [f for f in fr if f['ex'] == 'mayo-neck'][:120]
        check('into neck: no back-and-forth', [rev([f['px'] for f in into]), rev([float(f['vb'].split()[0]) + float(f['vb'].split()[2]) / 2 for f in into])], [0, 0], 'figure, view middle')
        check('side stepping, neck L/R: step', jump(fr), below(4), 'largest step small (was 104 px)')
        # Chair Incline Push-Up -> Tibialis Raise (owner, Oct 2026): the move's first frame placed the push-up on the next
        # exercise's surfaces (a wall, no chair), so the hands went to the floor, the feet under it, and the floor clamp
        # bent both legs: the far leg popped out. Each end is placed on its own surfaces now.
        await pg.evaluate("hush(); WP.phase = 'done'")
        await pg.evaluate("""(() => { localStorage.setItem('nstructr-rest-between-v1', '0'); setSound('off'); WK.list = WK.list.filter(w => w.id !== 't');
          WK.list.push({ id: 't', name: 'T', blocks: [{ id: 'b', name: 'B', items: ['chair-incline-pushup', 'wall-tibialis-raise'].map(id => ({ ...newItem(exById(id)), reps: 1 })) }] });
          saveWorkouts(); startWorkout(wkById('t'), 0); if (WP.restKind === 'start') wpAction('restSkip'); })()"""); await pg.wait_for_timeout(300)
        await pg.evaluate("S.idx = S.resolved.length - 1; S.t = S.resolved[S.idx].dur; onWorkEnd(); S.playing = false")
        check('push-up -> tibialis: legs', await pg.evaluate("""(() => { const a = S.from, b = S.resolved[0], f0 = frameAt(a, b, 0, S.seg), f1 = frameAt(a, b, 0.002, S.seg);
          const P0 = fkAt(f0.pose, S.seg, f0.pos), P1 = fkAt(f1.pose, S.seg, f1.pos);
          return Math.round(Math.max(...['kneeL', 'kneeR', 'ankleL', 'ankleR', 'toeL', 'toeR'].map(k => Math.hypot(P1[k].x - P0[k].x, P1[k].y - P0[k].y, P1[k].z - P0[k].z)))); })()"""), below(2), 'under 2 (was 61: a knee and foot jumped up)')
        # reduced motion: cuts
        await pg.emulate_media(reduced_motion='reduce')
        await pg.evaluate("hush(); WP.phase = 'done'"); await pg.evaluate(WK + '(0)'); await pg.wait_for_timeout(300)
        await pg.evaluate("wpAction('nextItem')"); await pg.wait_for_timeout(100)
        check('reduced motion', await pg.evaluate("[S.trans, document.querySelectorAll('svg.scene').length]"), [0, 1])
        check('errors', errs, []); await b.close()
asyncio.run(main())
