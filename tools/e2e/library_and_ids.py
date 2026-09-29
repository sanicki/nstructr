import asyncio, os, json
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# library workouts (listed on their own, start / customize / resume / exit), and "u-" ids on import
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':860}); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        print('first run: my workouts', await pg.evaluate("WK.list.length"), '| library', await pg.evaluate("LIB_WK.map(w=>w.id)"))
        # the library workout has no editor
        await pg.evaluate("go('#/workout/lib:beginner-yoga-20')"); await pg.wait_for_timeout(200)
        print('editing a library workout goes to    ', await pg.evaluate("location.hash"))
        # start it, exit: back to the list (no editor to go back to)
        await pg.evaluate("WK.hinted=true; setSound('off'); startWorkout(LIB_WK[0], 2)"); await pg.wait_for_timeout(300)
        print('playing                              ', await pg.evaluate("[location.hash, WP.i, S.ex.id]"))
        await pg.evaluate("logItem(current())")                                  # as if one exercise was done
        await pg.evaluate("exitWorkout()"); await pg.wait_for_timeout(300)
        print('after exit                           ', await pg.evaluate("location.hash"))
        print('history entry                        ', await pg.evaluate("(()=>{const s=loadLog().slice(-1)[0]; return s && [s.workout, s.library, s.completed]})()"))
        # resume a library workout after a reload
        await pg.evaluate("startWorkout(LIB_WK[0], 0)"); await pg.wait_for_timeout(200)
        await pg.evaluate("WP.i=4; saveSession()")
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        print('resume banner                        ', (await pg.inner_text('#resumeSlot')).replace('\n', ' | '))
        # an old install: a first-run copy under the plain library id stays a separate, editable workout
        await pg.evaluate("WK.list.push({...hydrateWorkout(LIBRARY_WORKOUTS.find(w => w.id === 'beginner-yoga-20'))}); saveWorkouts(); renderWorkouts()")
        print('old copy + library                   ', await pg.evaluate("[wkById('beginner-yoga-20').libId, wkById('lib:beginner-yoga-20').libId]"))
        # --- ids on import ---
        lib = await pg.evaluate("JSON.stringify(findInDb('bw-reverse-lunge'))")
        changed = json.loads(lib); changed['name'] = 'My Lunge'
        own = json.loads(lib); own['id'] = 'my-lunge'; own['name'] = 'Own Lunge'
        already = json.loads(lib); already['id'] = 'u-mine'; already['name'] = 'Already Mine'
        for label, ex in [('unchanged library copy', json.loads(lib)), ('changed, library id', changed), ('new id', own), ('already u-', already)]:
            await pg.evaluate(f"importAndShow([[{json.dumps(json.dumps(ex))}, 'x.json']])"); await pg.wait_for_timeout(100)
            # an unchanged library exercise is just bookmarked (nothing stored); the rest land in My exercises
            print(f'import {label:<30}', await pg.evaluate("[S.lib.items.length ? S.lib.items.slice(-1)[0].id : '(none stored)', [...BOOKMARKS].join(' ')]"))
        # a workout file with its own exercise: the reference follows the rename
        wk = {"version": 2, "name": "Ref Test", "blocks": [{"name": "B", "items": [{"ex": "bw-reverse-lunge", "reps": 3}, {"ex": "bw-squat-x", "reps": 3}]}]}
        sq = json.loads(lib); sq['id'] = 'bw-squat-x'; sq['name'] = 'Squat X'
        f = {"format": "nstructr/workout", "version": 2, "workouts": [wk], "exercises": [sq]}
        await pg.evaluate(f"importAndShow([[{json.dumps(json.dumps(f))}, 'w.json']])"); await pg.wait_for_timeout(200)
        print('workout refs after import            ', await pg.evaluate("WK.list.slice(-1)[0].blocks[0].items.map(i=>i.ex)"))
        # a file from a newer version is refused
        await pg.evaluate("""importAndShow([['{"version":3,"id":"x","name":"X","keyframes":[{}]}', 'new.json']])"""); await pg.wait_for_timeout(100)
        print('newer file                           ', await pg.inner_text('#snackbar'))
        # format 1 (the 2D poses, before Sep 2026) isn't read any more, as a file or in a workout file
        await pg.evaluate("""importAndShow([['{"version":1,"id":"x","name":"X","keyframes":[{"view":"side","pose":{"hipR":-30}}]}', 'old.json']])"""); await pg.wait_for_timeout(100)
        print('old (v1) file                        ', await pg.inner_text('#snackbar'))
        await pg.evaluate("""importAndShow([['{"id":"x","name":"X","keyframes":[{"view":"side","pose":{"hipR":-30}}]}', 'old.json']])"""); await pg.wait_for_timeout(100)
        print('v1 poses without a version           ', await pg.inner_text('#snackbar'))
        print('errors', errs); await b.close()
asyncio.run(main())
