import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':860}); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.add_init_script("""window.SP={log:[],queue:[],busy:false};
          function next(){ if(SP.busy||!SP.queue.length) return; const u=SP.queue.shift(); SP.busy=true; SP.log.push(u.text); setTimeout(()=>{SP.busy=false; u.onend&&u.onend(); next();}, 60); }
          Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak:u=>{if(!u.text)return;SP.queue.push(u);next();},cancel:()=>{SP.queue.length=0},get speaking(){return SP.busy},get pending(){return SP.queue.length>0}}});
          window.SpeechSynthesisUtterance=function(t){this.text=t};""")
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(400)
        await pg.evaluate("""(()=>{WK.list.push({id:'s4',name:'S',restBetween:0,blocks:[{id:'b',name:'B',items:[{...newItem(exById('star-excursion-4-point')),reps:1,sides:'both'}]}]}); setSound('coach'); startWorkout(wkById('s4'));})()""")
        labels=[]; last=None
        for k in range(1200):
            await pg.evaluate("S.speed=6"); await pg.wait_for_timeout(20)
            lab=await pg.evaluate("$('#guideLabel').textContent")
            if lab and lab!=last: labels.append(lab); last=lab
            if await pg.evaluate("WP.phase==='done'"): break
        print('coach said:', await pg.evaluate("SP.log"))
        print('compass labels shown:', labels)
        await pg.goto(URL + '#/play/star-excursion-balance', wait_until='domcontentloaded'); await pg.wait_for_timeout(400)
        await pg.evaluate("setPlaying(false); S.idx=2; S.t=S.resolved[2].dur; draw()"); await pg.wait_for_timeout(100)
        await pg.locator('.stage').screenshot(path='/tmp/star_guide.png')
        print('errors', errs); await b.close()
asyncio.run(main())
