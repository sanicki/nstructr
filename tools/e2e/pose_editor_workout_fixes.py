import asyncio, os, json
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# pose editor (−/+ steppers, copy of a library exercise on first change, undo / revert step / discard all, own
# exercises edited in place), and workout fixes (pause stops speech, exit goes to the list, "(copy)" names)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        await pg.evaluate("localStorage.setItem('nstructr-authoring-v1','on'); go('#/play/bw-reverse-lunge')"); await pg.wait_for_timeout(500)
        await pg.click('#editPoseBtn'); await pg.wait_for_timeout(400)
        st = "[location.hash, S.ex.id, S.ex.name, S.ex.basedOn || '', S.idx, (S.ex.keyframes[S.idx].pose||{}).kneeR, findInDb('bw-reverse-lunge').keyframes[S.idx].pose.kneeR, S.lib.items.map(x=>x.id).join(' ')]"
        print('before                  ', await pg.evaluate(st))
        await pg.click('#editor [data-joint="kneeR"][data-jdelta="1"]'); await pg.wait_for_timeout(200)
        print('+ on right knee (5°)    ', await pg.evaluate(st))
        print('  undo shown, bar title ', await pg.evaluate("[getComputedStyle($('#editor [data-jundo=kneeR]')).visibility, $('#barTitle').textContent, $('#snackbar').textContent]"))
        await pg.click('[data-edstep="15"]'); await pg.click('#editor [data-joint="kneeR"][data-jdelta="-1"]'); await pg.wait_for_timeout(150)
        print('15° step, −             ', await pg.evaluate("(S.ex.keyframes[S.idx].pose||{}).kneeR"))
        await pg.click('#editor [data-jundo="kneeR"]'); await pg.wait_for_timeout(150)
        print('undo the joint          ', await pg.evaluate("[(S.ex.keyframes[S.idx].pose||{}).kneeR, getComputedStyle($('#editor [data-jundo=kneeR]')).visibility]"))
        # hold to repeat
        btn = await pg.evaluate("(()=>{const r=$('#editor [data-joint=hipR][data-jdelta=\"1\"]').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]})()")
        h0 = await pg.evaluate("(S.ex.keyframes[S.idx].pose||{}).hipR||0")
        await pg.mouse.move(*btn); await pg.mouse.down(); await pg.wait_for_timeout(1000); await pg.mouse.up(); await pg.wait_for_timeout(150)
        print('hold + for 1 s (hip)    ', h0, '->', await pg.evaluate("(S.ex.keyframes[S.idx].pose||{}).hipR"))
        await pg.click('[data-act="edRevertStep"]'); await pg.wait_for_timeout(150)
        print('revert this step        ', await pg.evaluate("JSON.stringify(S.ex.keyframes[S.idx]) === JSON.stringify(findInDb('bw-reverse-lunge').keyframes[S.idx])"))
        await pg.click('#editor [data-joint="neck"][data-jdelta="1"]'); await pg.wait_for_timeout(100)
        await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        print('after reload (saved)    ', await pg.evaluate("[location.hash, S.ex.id, S.ex.keyframes.map(k=>(k.pose||{}).neck||0).join('|'), S.lib.items.map(x=>x.id).join(' ')]"))
        await pg.click('#editPoseBtn'); await pg.wait_for_timeout(300)
        await pg.click('#editor [data-joint="neck"][data-jdelta="1"]'); await pg.wait_for_timeout(100)
        await pg.click('[data-act="edDiscard"]'); await pg.wait_for_timeout(300)
        print('discard (own copy)      ', await pg.evaluate("[location.hash, S.ex.id, S.ex.keyframes.map(k=>(k.pose||{}).neck||0).join('|')]"), '<- back to where editing started')
        # a fresh copy, then discard all: the copy is deleted and you're back on the library exercise
        await pg.evaluate("go('#/play/bw-squat')"); await pg.wait_for_timeout(400)
        await pg.click('#editPoseBtn'); await pg.wait_for_timeout(300)
        await pg.click('#editor [data-joint="hipR"][data-jdelta="1"]'); await pg.wait_for_timeout(150)
        print('copy made               ', await pg.evaluate("[S.ex.id, S.ex.name]"))
        await pg.click('[data-act="edDiscard"]'); await pg.wait_for_timeout(400)
        print('discard (new copy)      ', await pg.evaluate("[location.hash, S.ex.id, S.lib.items.some(x=>x.id.startsWith('u-bw-squat'))]"))
        # the copy shows under Saved, not the library
        await pg.evaluate("E.coll='My exercises'; go('#/exercises')"); await pg.wait_for_timeout(300)
        print('Saved shows             ', await pg.evaluate("[...document.querySelectorAll('#exploreBody .pose-card .t')].map(x=>x.textContent)"))
        # --- workouts ---
        await pg.evaluate("""window.SPOKEN=[]; window.CANCELS=0; Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
          speaking:false, pending:false, speak(u){ SPOKEN.push(u.text); this.speaking=true; this._u=u; setTimeout(()=>{ if(this._u===u){ this.speaking=false; u.onend&&u.onend(); } }, 3000); },
          cancel(){ CANCELS++; this.speaking=false; const u=this._u; this._u=null; u&&u.onend&&u.onend(); }}});""")
        await pg.evaluate("go('#/workouts')"); await pg.wait_for_timeout(200)
        await pg.click('[data-wtoggle="lib:full-body-routine"]'); await pg.click('[data-wcustom="lib:full-body-routine"]'); await pg.wait_for_timeout(300)
        print('Customize name          ', await pg.evaluate("EDIT.name"))
        await pg.evaluate("WK.hinted=true; setSound('coach'); startWorkout(LIB_WK[0], 0)"); await pg.wait_for_timeout(700)
        c0 = await pg.evaluate("CANCELS")
        await pg.evaluate("LAST_DOWN_AT=0; wpAction('pause')"); await pg.wait_for_timeout(200)
        print('pause mid-sentence      ', await pg.evaluate(f"[S.playing, CANCELS - {c0}, speechSynthesis.speaking, WP.speaking]"))
        n = await pg.evaluate("SPOKEN.length")
        await pg.evaluate("LAST_DOWN_AT=0; wpAction('pause')"); await pg.wait_for_timeout(200)
        print('resume re-reads the step', await pg.evaluate(f"[S.playing, SPOKEN.slice({n})]"))
        await pg.evaluate("exitWorkout()"); await pg.wait_for_timeout(300)
        print('exit goes to            ', await pg.evaluate("location.hash"))
        w = await pg.evaluate("WK.list[0].id")
        await pg.evaluate(f"startWorkout(wkById('{w}'), 0)"); await pg.wait_for_timeout(300)
        await pg.evaluate("exitWorkout()"); await pg.wait_for_timeout(300)
        print('exit (own workout) goes ', await pg.evaluate("location.hash"))
        print('errors', errs); await b.close()
asyncio.run(main())
