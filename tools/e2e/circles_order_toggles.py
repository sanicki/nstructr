import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Leg Circles: 8 points on a circle, 4 of them steps; quiet points hidden from the step number, Steps list and ◀ ▶.
# A workout item's order of sides and directions; the switch announced is the one that happens.
# The exercise page's Loop (off: once through, then stop) and Mute toggles.
FAKE = """window.SPOKEN=[]; Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
  speaking:false, pending:false, getVoices(){ return []; }, speak(u){ SPOKEN.push(u.text); setTimeout(()=>{ u.onend&&u.onend(); }, 50); }, cancel(){} }}); 0"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}, has_touch=True)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/play/pil-leg-circles', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        await pg.evaluate("setPlaying(false)")
        print('keyframes / steps shown ', await pg.evaluate("[S.resolved.length, $('#stepsTitle').textContent, [...document.querySelectorAll('#stepList .title-small')].map(x=>x.textContent)]"))
        seen = []
        for _ in range(8):
            await pg.evaluate("stepBy(1)"); await pg.wait_for_timeout(50)
            seen.append(await pg.evaluate("[S.idx, $('#stepNum').textContent, $('#stepName').textContent]"))
        print('▶ through the steps     ', seen)
        await pg.evaluate("jumpTo(4)"); await pg.wait_for_timeout(50)
        print('on a quiet point        ', await pg.evaluate("[S.idx, S.resolved[4].quiet, $('#stepNum').textContent, $('#stepName').textContent, document.querySelector('#stepList [aria-current=step]').textContent.trim().slice(0,10)]"))
        print('circle radius (hip/depth)', await pg.evaluate("S.ex.keyframes.slice(2,10).map(k=>[k.pose.hipR, k.pose.thighDepthR])"))
        # workout order
        await pg.evaluate(FAKE)
        await pg.evaluate("WK.list.push({id:'o',name:'O',blocks:[{id:'b',name:'B',items:[{...newItem(exById('pil-leg-circles')),reps:1}]}]}); saveWorkouts(); go('#/workout/o')"); await pg.wait_for_timeout(300)
        uid = await pg.evaluate("WK.list.find(w=>w.id==='o').blocks[0].items[0].uid")
        await pg.evaluate(f"openItemSettings('{uid}')"); await pg.wait_for_timeout(200)
        order = "[...document.querySelectorAll('#orderRow .t')].map(x=>x.textContent)"
        print('default order           ', await pg.evaluate(order))
        await pg.click('#orderRow [data-omove="1"][data-odelta="1"]'); await pg.wait_for_timeout(100)
        print('move #2 down            ', await pg.evaluate(order), await pg.evaluate("ITEM_EDIT.order"))
        await pg.click('[data-seg-key="dir"][data-val="A"]'); await pg.wait_for_timeout(100)
        print('one direction           ', await pg.evaluate(order), await pg.evaluate("ITEM_EDIT.order"))
        await pg.click('[data-seg-key="dir"][data-val="both"]'); await pg.wait_for_timeout(100)
        await pg.click('#orderRow [data-omove="1"][data-odelta="1"]'); await pg.click('#itemSave'); await pg.wait_for_timeout(200)
        print('saved                   ', await pg.evaluate("[WK.list.find(w=>w.id==='o').blocks[0].items[0].order, itemSegments(WK.list.find(w=>w.id==='o').blocks[0].items[0]).map(x=>x.side+x.dir)]"))
        await pg.evaluate("localStorage.setItem('nstructr-rest-between-v1','0'); WK.hinted=true; setSound('voice'); SPOKEN.length=0; startWorkout(wkById('o'),0)")
        for _ in range(300):
            if await pg.evaluate("WP.phase==='done'"): break
            await pg.evaluate("S.speed=25; if (WP.phase==='rest') WP.restLeft=Math.min(WP.restLeft,0.05)"); await pg.wait_for_timeout(40)
        print('announced               ', await pg.evaluate("SPOKEN.filter(t=>/Switch|Leg Circles/.test(t))"))
        await pg.evaluate("exitWorkout()"); await pg.wait_for_timeout(300)
        share = await pg.evaluate("JSON.stringify(compactWorkout(wkById('o')).workouts[0].blocks[0].items[0])")
        print('in a share link         ', share)
        # loop and mute
        await pg.evaluate("setSound('voice'); go('#/play/bw-squat')"); await pg.wait_for_timeout(500)
        print('toggles                 ', await pg.evaluate("[$('#loopBtn').getAttribute('aria-label'), $('#muteBtn').getAttribute('aria-label')]"))
        await pg.evaluate("showExControls(true)"); await pg.wait_for_timeout(300)
        await pg.click('#loopBtn'); await pg.wait_for_timeout(100)
        await pg.evaluate("jumpTo(0); setPlaying(true); S.speed=8"); await pg.wait_for_timeout(2500)
        print('loop off: stops         ', await pg.evaluate("[S.playing, S.planDone, S.idx, S.rep, $('#exControls').classList.contains('show'), $('#loopBtn').getAttribute('aria-pressed')]"))
        await pg.evaluate("setPlaying(true)"); await pg.wait_for_timeout(100)
        print('Play again: from the top', await pg.evaluate("[S.playing, S.planDone, S.idx]"))
        await pg.evaluate("setPlaying(false); showExControls(true)"); await pg.wait_for_timeout(300)
        await pg.click('#muteBtn'); await pg.wait_for_timeout(100)
        await pg.evaluate("SPOKEN.length=0; jumpTo(0); XS.last=''; setPlaying(true); S.speed=1"); await pg.wait_for_timeout(800)
        print('muted: says nothing     ', await pg.evaluate("[SPOKEN.length, $('#muteBtn').getAttribute('aria-label'), localStorage.getItem('nstructr-exmute-v1')]"))
        await pg.evaluate("setPlaying(false); setSound('off'); renderExToggles(); showExControls(true)"); await pg.wait_for_timeout(300)
        await pg.click('#muteBtn'); await pg.wait_for_timeout(100)
        print('Sound Silent: explains  ', await pg.evaluate("$('#snackbar').textContent"))
        print('errors', errs); await b.close()
asyncio.run(main())
