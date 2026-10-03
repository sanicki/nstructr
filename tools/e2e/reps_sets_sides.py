import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':860}); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        await pg.evaluate("""(()=>{const mk=(id,o)=>({...newItem(exById(id)),...o});
          localStorage.setItem('nstructr-rest-between-v1','1'); localStorage.setItem('nstructr-rest-sets-v1','1'); WK.list.push({id:'t1',name:'Test',blocks:[{id:'b',name:'B',items:[
            mk('bw-squat',{sets:2,reps:3,rest:1}), mk('core-bird-dog',{reps:2,sides:'alternate'}), mk('wu-arm-circles',{reps:2,dir:'alternate'}),
            mk('band-wall-sit-pull-apart',{reps:4}), mk('core-forearm-plank',{seconds:5})]}]}); saveWorkouts(); startWorkout(wkById('t1'));})()""")
        await pg.wait_for_timeout(300)
        log=[]; last=None
        for k in range(3000):
            await pg.evaluate("S.speed=25; if (WP.phase==='rest') WP.restLeft=Math.min(WP.restLeft,0.05)")
            await pg.wait_for_timeout(20)
            st=await pg.evaluate("[WP.phase, WP.i, WP.set, S.ex&&S.ex.id, $('#wpSet').textContent, $('#wpCount').textContent, S.idx, S.planMeta&&S.planMeta[S.idx]&&S.planMeta[S.idx].alt]")
            key=tuple(st[:6])
            if key!=last: log.append(st); last=key
            if st[0]=='done': break
        for l in log: print(l)
        rows = {(l[0], l[1], l[2], l[4], l[5]) for l in log}
        # each exercise counts all the way: both sets of squats, the alternating ones by whole reps (one side then the other)
        check('squats: 2 sets of 3', [('work', 0, s, f'Set {s + 1} of 2', '3/3reps') in rows for s in (0, 1)], [True, True])
        check('bird dog: 2 alternating', ('work', 1, 0, 'Alternating sides', '2/2reps') in rows, True)
        check('arm circles: 2 alternating', ('work', 2, 0, 'Alternating directions', '2/2circles') in rows, True)
        check('wall sit pull-apart: 4', ('work', 3, 0, '', '4/4pull-aparts') in rows, True)
        check('plank counts down', [r for r in rows if r[1] == 4 and r[0] == 'work' and r[4].startswith('0:0')] != [], True)
        check('rests between, then done', [log[0][0], log[-1][0], sorted({l[1] for l in log if l[0] == 'rest'})], ['rest', 'done', [0, 1, 2, 3, 4]])
        check('errors', errs, []); await b.close()
asyncio.run(main())
