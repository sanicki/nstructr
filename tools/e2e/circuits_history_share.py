import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
import json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':860}, accept_downloads=True); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        # capture speech
        await pg.evaluate("""window.SPOKEN=[]; Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak:u=>{if(u.text) SPOKEN.push(u.text); setTimeout(()=>u.onend&&u.onend(),50)}, cancel:()=>{}}}); window.SpeechSynthesisUtterance=function(t){this.text=t};""")
        await pg.evaluate("""(()=>{const mk=(id,o)=>({...newItem(exById(id)),...o});
          WK.list.push({id:'circ',name:'Circuit Test',restBetween:1,blocks:[
            {id:'b1',name:'Circuit',rounds:2,roundRest:2,items:[mk('bw-squat',{reps:3}), mk('core-forearm-plank',{seconds:20})]},
            {id:'b2',name:'Finisher',items:[mk('bw-reverse-lunge',{reps:2,sides:'alternate'})]}]});
          saveWorkouts(); setSound('coach'); startWorkout(wkById('circ'));})()""")
        print('estimate', await pg.evaluate("fmtMin(workoutSeconds(wkById('circ')))"), '| flattened:', await pg.evaluate("WP.flat.map(x=>x.block.name+' r'+(x.round+1)+' '+x.item.ex)"))
        seen=[]; last=None
        for k in range(2500):
            await pg.evaluate("S.speed=12; if (WP.phase==='rest') WP.restLeft=Math.min(WP.restLeft,0.05)")
            await pg.wait_for_timeout(20)
            st=await pg.evaluate("[WP.phase, WP.i, $('#wpBlock').textContent, $('#wpRestLabel').textContent]")
            if tuple(st)!=last: seen.append(st); last=tuple(st)
            if st[0]=='done': break
        for s in seen: print(s)
        print('spoken:', await pg.evaluate("SPOKEN"))
        # history after finishing
        await pg.click('[data-wact="finish"]'); await pg.wait_for_timeout(300)
        log=await pg.evaluate("loadLog()")
        print('history entries', len(log), '| last:', {k:log[-1][k] for k in ['name','completed','exercisesDone','exercisesTotal','seconds']}, '| first exercise record:', log[-1]['exercises'][0])
        # stop early -> partial entry
        await pg.evaluate("startWorkout(wkById('circ'))"); await pg.wait_for_timeout(200)
        await pg.evaluate("S.speed=20"); await pg.wait_for_timeout(1500)
        await pg.evaluate("go('#/workouts')"); await pg.wait_for_timeout(300)
        log=await pg.evaluate("loadLog()"); print('after early stop:', len(log), {k:log[-1][k] for k in ['completed','exercisesDone','exercisesTotal']})
        print('history UI:', (await pg.inner_text('#historyList'))[:160].replace('\n',' | '))
        # routine prompt
        pr=await pg.evaluate("routinePrompt()"); print('prompt chars', len(pr), '| has ids:', 'wu-arm-circles | Standing Arm Circles' in pr, '| lines:', pr.count('\n'))
        # share falls back to a download here
        await pg.goto(URL + '#/workout/circ', wait_until='domcontentloaded'); await pg.wait_for_timeout(300)
        await pg.click('[data-share-wk="@edit"]'); await pg.wait_for_timeout(300)
        async with pg.expect_download() as dl: await pg.click('#shareFile')
        d=await dl.value; print('share fallback download:', d.suggested_filename)
        # block rounds dialog
        await pg.click('[data-bmenu="b1"]'); await pg.click('[data-mact="rounds"]'); await pg.wait_for_timeout(150)
        await pg.click('[data-bstep="rounds"][data-delta="1"]'); await pg.click('#itemSave'); await pg.wait_for_timeout(150)
        print('rounds now', await pg.evaluate("wkById('circ').blocks[0].rounds"), '| header:', await pg.inner_text('.block-head .count'))
        await pg.screenshot(path='/tmp/w_circ_edit.png')
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(300); await pg.screenshot(path='/tmp/w_hist.png', full_page=True)
        await pg.goto(URL + '#/create', wait_until='domcontentloaded'); await pg.wait_for_timeout(300); await pg.screenshot(path='/tmp/w_create.png')
        print('errors', errs); await b.close()
asyncio.run(main())
