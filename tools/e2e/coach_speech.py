import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':860}); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        # a fake voice: 90 ms per word, spoken one at a time from a queue, reports when done; counts cancels
        await pg.add_init_script("""
          window.SP={log:[],cancels:0,queue:[],busy:false};
          function next(){ if(SP.busy||!SP.queue.length) return; const u=SP.queue.shift(); SP.busy=true; const t0=performance.now();
            SP.log.push({text:u.text,start:t0}); setTimeout(()=>{SP.busy=false; SP.log[SP.log.length-1].end=performance.now(); u.onend&&u.onend(); next();}, Math.max(150,u.text.split(/\\s+/).length*90)); }
          Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
            speak:u=>{ if(!u.text) return; SP.queue.push(u); next(); }, cancel:()=>{SP.cancels++; SP.queue.length=0;},
            get speaking(){return SP.busy}, get pending(){return SP.queue.length>0} }});
          window.SpeechSynthesisUtterance=function(t){this.text=t};""")
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        await pg.evaluate("""(()=>{const mk=(id,o)=>({...newItem(exById(id)),...o});
          localStorage.setItem('nstructr-rest-between-v1','1'); WK.list.push({id:'g',name:'Guided',blocks:[{id:'b',name:'B',items:[
            mk('wu-arm-circles',{reps:2,dir:'both'}), mk('mayo-calf',{seconds:4,sides:'L'}), mk('bw-reverse-lunge',{reps:2,sides:'alternate'})]}]});
          setSound('coach'); window.STEPLOG=[]; startWorkout(wkById('g'));
          const orig=S.onStep; })()""")
        # record every step change with timing, and whether it was a guided step
        await pg.evaluate("""(()=>{let last=-1,lastEx=null; setInterval(()=>{ if(S.idx!==last||S.ex&&S.ex.id!==lastEx){ const m=(S.planMeta||[])[S.idx]||{};
             STEPLOG.push({t:performance.now(), ex:S.ex&&S.ex.id, idx:S.idx, guided:!!m.guided, say:m.say||'', rep:m.repNo||null, phase:WP.phase}); last=S.idx; lastEx=S.ex&&S.ex.id; } }, 5); })()""")
        for k in range(600):
            await pg.evaluate("if (WP.phase==='rest') WP.restLeft=Math.min(WP.restLeft,0.05)")
            await pg.wait_for_timeout(100)
            if await pg.evaluate("WP.phase==='done'"): break
        steps=await pg.evaluate("STEPLOG"); sp=await pg.evaluate("SP")
        check('cancels during the workout:', sp['cancels'], 0)
        print('spoken, in order:'); 
        for l in sp['log']: print('   ', round(l['start']), '-', round(l.get('end',0)), '|', l['text'])
        # for each guided step: did it wait for its own line to finish?
        bad=0
        for i in range(len(steps)-1):
            s=steps[i]
            if not s['guided'] or not s['say']: continue
            line=next((l for l in sp['log'] if l['text'].endswith(s['say'][-20:]) and abs(l['start']-s['t'])<400), None)
            if line and steps[i+1]['t'] < line.get('end',1e12)-15: bad+=1; print('   advanced early:', s['say'][:50])
        print('guided steps that moved on before their line finished:', bad, 'of', sum(1 for s in steps if s['guided']))
        check('errors', errs, []); await b.close()
asyncio.run(main())
