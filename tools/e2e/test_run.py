import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# The workout editor's Test button: a trial run. It saves no Resume entry and adds nothing to History, finished or
# not, and leaving goes back to the editor. Start on a card still does both.
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 412, 'height': 860}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script("""Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak:u=>{ setTimeout(()=>u.onend&&u.onend(),30); },cancel:()=>{},get speaking(){return false},get pending(){return false}}});
          window.SpeechSynthesisUtterance=function(t){this.text=t};""")
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(800)
        await pg.evaluate("""(() => { WK.list.push({ id: 't', name: 'Trial', blocks: [{ id: 'b', name: 'Main', items: [{ ...newItem(exById('bw-squat')), uid: 'a', reps: 2 }, { ...newItem(exById('core-forearm-plank')), uid: 'c', seconds: 5 }] }] }); saveWorkouts();
          localStorage.removeItem(SESSION_KEY); saveLog([]); })()""")
        await pg.goto(URL + '#/workout/t'); await pg.wait_for_timeout(400)
        print('button label             ', await pg.evaluate("$('#view-workout [data-wact=\"start\"]').textContent.replace(/\\S+(?=Test)/, '')"), '(expect Test)')
        await pg.click('#view-workout [data-wact="start"]'); await pg.wait_for_timeout(600)
        print('runs, test mode          ', await pg.evaluate("[location.hash, WP.test]"), "(expect ['#/wplay/t', true])")
        await pg.evaluate("WP.i = 1; saveSession()"); await pg.wait_for_timeout(100)
        print('no Resume entry          ', await pg.evaluate("localStorage.getItem(SESSION_KEY)"), '(expect None)')
        await pg.evaluate("exitWorkout()"); await pg.wait_for_timeout(600)
        print('stopped: back to editor  ', await pg.evaluate("[location.hash, loadLog().length]"), "(expect ['#/workout/t', 0])")
        await pg.click('#view-workout [data-wact="start"]'); await pg.wait_for_timeout(600)
        await pg.evaluate("finishWorkout()"); await pg.wait_for_timeout(300)
        print('finished: no history     ', await pg.evaluate("[loadLog().length, localStorage.getItem(SESSION_KEY)]"), '(expect [0, None])')
        await pg.evaluate("exitWorkout()"); await pg.wait_for_timeout(500)
        print('done: back to editor     ', await pg.evaluate("location.hash"), '(expect #/workout/t)')
        # a real start from the card still saves and logs
        await pg.goto(URL + '#/workouts'); await pg.wait_for_timeout(400)
        await pg.click('[data-wstart="t"]'); await pg.wait_for_timeout(600)
        await pg.evaluate("WP.i = 1; saveSession()")
        print('Start: Resume saved      ', await pg.evaluate("[WP.test, !!localStorage.getItem(SESSION_KEY)]"), '(expect [false, true])')
        await pg.evaluate("finishWorkout()"); await pg.wait_for_timeout(300)
        print('Start: history added     ', await pg.evaluate("loadLog().length"), '(expect 1)')
        await pg.evaluate("exitWorkout()"); await pg.wait_for_timeout(400)
        print('Start: back to Workouts  ', await pg.evaluate("location.hash"), '(expect #/workouts)')
        print('errors', errs)
        await b.close()
asyncio.run(main())
