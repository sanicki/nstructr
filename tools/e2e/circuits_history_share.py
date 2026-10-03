import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
import json
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
ASK_JS = """setInterval(() => { const d = document.getElementById('askDialog'); if (!d || !d.open) return;   // answers NstructR's confirm dialog
  (window.ASKED = window.ASKED || []).push(document.getElementById('askTitle').textContent + ' | ' + document.getElementById('askText').textContent.split('\\n').pop());
  document.getElementById(window.ASK_NO ? 'askNo' : 'askYes').click(); }, 40)"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':860}, accept_downloads=True); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.add_init_script(ASK_JS)
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        # capture speech
        await pg.evaluate("""window.SPOKEN=[]; Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak:u=>{if(u.text) SPOKEN.push(u.text); setTimeout(()=>u.onend&&u.onend(),50)}, cancel:()=>{}}}); window.SpeechSynthesisUtterance=function(t){this.text=t};""")
        await pg.evaluate("""(()=>{const mk=(id,o)=>({...newItem(exById(id)),...o});
          localStorage.setItem('nstructr-rest-between-v1','1'); WK.list.push({id:'circ',name:'Circuit Test',blocks:[
            {id:'b1',name:'Circuit',rounds:2,roundRest:2,items:[mk('bw-squat',{reps:3}), mk('core-forearm-plank',{seconds:20})]},
            {id:'b2',name:'Finisher',items:[mk('bw-reverse-lunge',{reps:2,sides:'alternate'})]}]});
          saveWorkouts(); setSound('coach'); startWorkout(wkById('circ'));})()""")
        check('estimate', await pg.evaluate("fmtMin(workoutSeconds(wkById('circ')))"), lambda t: t.endswith('min'))
        check('flattened', await pg.evaluate("WP.flat.map(x=>x.block.name+' r'+(x.round+1)+' '+x.item.ex)"), ['Circuit r1 bw-squat', 'Circuit r1 core-forearm-plank', 'Circuit r2 bw-squat', 'Circuit r2 core-forearm-plank', 'Finisher r1 bw-reverse-lunge'])
        seen=[]; last=None
        for k in range(2500):
            await pg.evaluate("S.speed=12; if (WP.phase==='rest') WP.restLeft=Math.min(WP.restLeft,0.05)")
            await pg.wait_for_timeout(20)
            st=await pg.evaluate("[WP.phase, WP.i, $('#wpBlock').textContent, $('#wpRestLabel').textContent]")
            if tuple(st)!=last: seen.append(st); last=tuple(st)
            if st[0]=='done': break
        for x in seen: print(x)
        check('phases and blocks', [x[:3] for x in seen], [['work', 0, 'Circuit, round 1 of 2'], ['rest', 1, 'Circuit, round 1 of 2'], ['work', 1, 'Circuit, round 1 of 2'], ['rest', 2, 'Circuit, round 2 of 2'],
              ['work', 2, 'Circuit, round 2 of 2'], ['rest', 3, 'Circuit, round 2 of 2'], ['work', 3, 'Circuit, round 2 of 2'], ['rest', 4, 'Finisher'], ['work', 4, 'Finisher'], ['done', 4, 'Finisher']])
        check('rest before round 2 says so', [x[3] for x in seen if x[1] == 2], has('Rest before round 2 of 2'))
        spoken = await pg.evaluate("SPOKEN"); print('spoken:', spoken)
        check('round end announced', spoken, lambda v: any(t.startswith('Round 1 done. Rest ') for t in v), 'Round 1 done. Rest … (2 s and the change of position)')
        check('each appearance demonstrated', [t for t in spoken if 'Watch me first' in t], lambda v: len(v) == 5)
        # history after finishing
        await pg.click('[data-wact="finish"]'); await pg.wait_for_timeout(300)
        log=await pg.evaluate("loadLog()")
        check('history entries', [len(log), {k:log[-1][k] for k in ['name','completed','exercisesDone','exercisesTotal']}, log[-1]['exercises'][0]],
              [1, {'name': 'Circuit Test', 'completed': True, 'exercisesDone': 5, 'exercisesTotal': 5}, {'ex': 'bw-squat', 'name': 'Squat', 'category': 'Strength', 'measure': 'reps', 'sets': 1, 'reps': 3, 'block': 'Circuit', 'round': 1}])
        # stop early -> partial entry
        await pg.evaluate("startWorkout(wkById('circ'))"); await pg.wait_for_timeout(200)
        await pg.evaluate("S.speed=20"); await pg.wait_for_timeout(1500)
        await pg.evaluate("go('#/workouts')"); await pg.wait_for_timeout(300)
        log=await pg.evaluate("loadLog()"); check('after early stop:', [len(log), {k:log[-1][k] for k in ['completed','exercisesDone','exercisesTotal']}], [2, {'completed': False, 'exercisesDone': 1, 'exercisesTotal': 5}])
        check('history UI:', await pg.inner_text('#historyList'), lambda t: '1 of 5 exercises (stopped early)' in t and '5 of 5 exercises' in t)
        # routine prompt
        pr=await pg.evaluate("aiPrompt('routine', 'Squats 3x10')"); check('routine prompt has ids', 'wu-arm-circles dir' in pr, True)
        # share falls back to a download here
        await pg.goto(URL + '#/workout/circ', wait_until='domcontentloaded'); await pg.wait_for_timeout(300)
        await pg.click('[data-share-wk="@edit"]'); await pg.wait_for_timeout(300)
        async with pg.expect_download() as dl: await pg.click('#shareFile')
        d=await dl.value; check('share fallback download:', d.suggested_filename, 'circuit-test.json')
        # block rounds dialog
        await pg.click('[data-bmenu="b1"]'); await pg.click('[data-mact="rounds"]'); await pg.wait_for_timeout(150)
        await pg.click('[data-bstep="rounds"][data-delta="1"]'); await pg.click('#itemSave'); await pg.wait_for_timeout(150)
        check('rounds now', [await pg.evaluate("wkById('circ').blocks[0].rounds"), await pg.inner_text('.block-head .count')], lambda v: v[0] == 3 and v[1].startswith('repeat 3 rounds, 2 exercises'))
        await pg.screenshot(path='/tmp/w_circ_edit.png')
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(300); await pg.screenshot(path='/tmp/w_hist.png', full_page=True)
        await pg.goto(URL + '#/create', wait_until='domcontentloaded'); await pg.wait_for_timeout(300); await pg.screenshot(path='/tmp/w_create.png')
        check('errors', errs, []); await b.close()
asyncio.run(main())
