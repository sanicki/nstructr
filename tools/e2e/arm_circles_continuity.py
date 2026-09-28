import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':860}); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        async def sample(label):
            out=await pg.evaluate("""(()=>{const res=[];
              for(let k=0;k<160;k++){ S.t+=40*(S.tempo||1); let cur=S.resolved[S.idx];
                while(S.t>=cur.dur+cur.hold){ const nx=nextIndex(S.idx); if(nx<0) return res; S.t-=cur.dur+cur.hold; S.prev=S.idx; S.idx=nx; cur=S.resolved[S.idx]; }
                const a=S.resolved[S.prev]||S.from||S.resolved[S.idx], b=S.resolved[S.idx];
                const raw=b.dur?Math.min(1,S.t/b.dur):1, e=b.ease==='linear'?raw:(raw<.5?4*raw**3:1-Math.pow(-2*raw+2,3)/2);
                const f=frameAt(a,b,e,S.seg); const P=project(fkAt(f.pose,S.seg,f.pos),f.cam);
                // the hand's clock angle around the shoulder, as drawn
                res.push(Math.atan2(P.handR.y-P.shoulderR.y, P.handR.x-P.shoulderR.x)*180/Math.PI); }
              return res;})()""")
            d=[((out[i+1]-out[i]+540)%360)-180 for i in range(len(out)-1)]
            print(f'{label}: {len(out)} frames, hand turns {min(d):.1f} to {max(d):.1f} degrees per 40 ms (never reverses: {all(x>0 for x in d) or all(x<0 for x in d)}), total {sum(d):.0f} degrees')
        await pg.goto(URL + '#/play/wu-arm-circles', wait_until='domcontentloaded'); await pg.wait_for_timeout(400)
        await pg.evaluate('setPlaying(false); S.idx=S.phase.start; S.prev=null; S.t=0'); await sample('forward, exercise player')
        await pg.click('[data-dir="B"]'); await pg.wait_for_timeout(100)
        await pg.evaluate('setPlaying(false); S.idx=S.phase.start; S.prev=null; S.t=0'); await sample('backward, exercise player')
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(400)
        await pg.evaluate("""(()=>{WK.list.push({id:'c',name:'C',blocks:[{id:'b',name:'B',items:[{...newItem(exById('wu-arm-circles')),reps:3,dir:'A'}]}]}); startWorkout(wkById('c')); S.playing=false;})()""")
        await pg.wait_for_timeout(100); await sample('3 circles in a workout')
        print(errs); await b.close()
asyncio.run(main())
