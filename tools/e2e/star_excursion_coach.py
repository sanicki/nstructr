import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':860}); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.add_init_script("""window.SP={log:[],queue:[],busy:false};
          function next(){ if(SP.busy||!SP.queue.length) return; const u=SP.queue.shift(); SP.busy=true; SP.log.push(u.text); setTimeout(()=>{SP.busy=false; u.onend&&u.onend(); next();}, 60); }
          Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak:u=>{if(!u.text)return;SP.queue.push(u);next();},cancel:()=>{SP.queue.length=0},get speaking(){return SP.busy},get pending(){return SP.queue.length>0}}});
          window.SpeechSynthesisUtterance=function(t){this.text=t};""")
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(400)
        await pg.evaluate("""(()=>{WK.list.push({id:'s4',name:'S',blocks:[{id:'b',name:'B',items:[{...newItem(exById('star-excursion-4-point')),reps:1,sides:'both'}]}]}); setSound('coach'); startWorkout(wkById('s4')); if (WP.phase === 'rest' && WP.restKind === 'start') wpAction('restSkip');})()""")
        # every change of the guide label, recorded in the page (polling from here misses short ones under load)
        await pg.evaluate("S.speed=6; window.LABELS=[]; const el=$('#guideLabel'); new MutationObserver(() => { const t=el.textContent; if (t && t!==LABELS.at(-1)) LABELS.push(t); }).observe(el, {childList:true, characterData:true, subtree:true})")
        await pg.wait_for_function("WP.phase==='done'", timeout=120000)
        labels=await pg.evaluate("LABELS")
        said = await pg.evaluate("SP.log"); print('coach said:', said)
        check('coach said the workout, then the exercise name', said[:2], lambda v: len(v) == 2 and v[0] == 'S.' and 'Star' in v[1])
        check('coach called each reach', [w for w in said if w in ('Forward', 'Right', 'Back', 'Left') or w.lower() in ('forward.', 'right.', 'back.', 'left.')], lambda v: len(v) >= 4, 'at least 4 compass calls')
        check('compass labels shown:', labels, ['Forward', 'Right', 'Back', 'Left', 'Forward', 'Right', 'Back', 'Left', 'Forward', 'Left', 'Back', 'Right', 'Forward', 'Left', 'Back', 'Right'])
        await pg.goto(URL + '#/play/star-excursion-balance', wait_until='domcontentloaded'); await pg.wait_for_timeout(400)
        await pg.evaluate("setPlaying(false); S.idx=2; S.t=S.resolved[2].dur; draw()"); await pg.wait_for_timeout(100)
        await pg.locator('.stage').screenshot(path='/tmp/star_guide.png')
        check('errors', errs, []); await b.close()
asyncio.run(main())
