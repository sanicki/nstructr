import asyncio, os, json
# point at the served multi-file build (the service worker isn't used by nstructr.html), e.g.
#   python3 -m http.server 8000 -d _site  ->  NSTRUCTR_SITE=http://127.0.0.1:8000/
SITE = os.environ.get('NSTRUCTR_SITE', 'http://localhost:8000/')
from playwright.async_api import async_playwright
# installable app: manifest + icons, service worker, works offline, storage persistence, Export/Import everything
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width': 1280, 'height': 860}, accept_downloads=True)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(SITE + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(800)
        man = await pg.evaluate("fetch(document.querySelector('link[rel=manifest]').href).then(r=>r.json())")
        print('manifest                ', man['display'], man['display_override'], [i['src'] + ' ' + i['purpose'] for i in man['icons']])
        icons = await pg.evaluate("Promise.all([...document.querySelectorAll('link[rel=manifest]')].length ? " +
            json.dumps([i['src'] for i in man['icons']]) + ".map(s=>fetch(s).then(r=>r.status)) : [])")
        print('icon fetches            ', icons)
        await pg.evaluate("navigator.serviceWorker.ready"); await pg.wait_for_timeout(300)
        print('service worker          ', await pg.evaluate("[!!navigator.serviceWorker.controller || 'not yet controlling', caches.keys()]"),
              await pg.evaluate("caches.keys()"))
        # offline: reload and everything still works (the library comes from the cache)
        await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        await ctx.set_offline(True)
        await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(800)
        print('offline reload          ', await pg.evaluate("[POSE_DB.exercises.length, LIB_WK.length, !!navigator.serviceWorker.controller]"))
        await pg.evaluate("go('#/play/bw-squat')"); await pg.wait_for_timeout(400)
        print('offline exercise player ', await pg.evaluate("[S.view, S.ex && S.ex.id, S.resolved.length]"))
        await pg.goto(SITE + 'index.html?x=1#/explore', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        print('offline other URL       ', await pg.evaluate("[S.view, POSE_DB.exercises.length]"))
        await ctx.set_offline(False)
        # storage persistence note on the Create page
        await pg.evaluate("go('#/create')"); await pg.wait_for_timeout(400)
        print('persist note            ', await pg.inner_text('#persistNote'))
        # backup: make some data and change some settings, export it, wipe everything, import it back
        await pg.evaluate("""(()=>{const c=customizeWorkout(LIB_WK[0]); c.name='Mine'; saveWorkouts();
          S.lib.items.push({...clone(findInDb('bw-squat')), id:'u-mine', name:'Mine'}); saveLib(); BOOKMARKS.add('bw-lunge'); saveBookmarks(); setSound('voice');
          setPref(REST_KEY,'12'); setPref(THEME_KEY,'dark'); setPref(LOOP_KEY,'off'); setPref(AI_KEY,'claude');
          saveLog([{id:'s1',workout:c.id,name:'Mine',start:'2026-09-01T10:00:00Z',end:'2026-09-01T10:30:00Z',seconds:1800,completed:true,exercisesDone:24,exercisesTotal:24,exercises:[]}]);})()""")
        async with pg.expect_download() as dl: await pg.click('[data-act="backup"]')
        d = await dl.value; path = await d.path(); text = open(path).read(); data = json.loads(text)
        print('export                  ', d.suggested_filename, data['format'], data['version'], {k: len(data[k]) for k in ('workouts', 'exercises', 'history')}, data['settings'])
        await pg.evaluate("localStorage.clear()"); await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        print('after wipe              ', await pg.evaluate("[WK.list.length, S.lib.items.length, loadLog().length, WK.sound]"))
        await pg.set_input_files('#fileInput', path); await pg.wait_for_timeout(400)
        print('asks: merge or replace  ', await pg.evaluate("[$('#askDialog').open, $('#askTitle').textContent, $('#askNo').textContent, $('#askAlt').textContent, $('#askYes').textContent]"))
        await pg.click('#askYes'); await pg.wait_for_timeout(600)
        print('after import (Merge)    ', await pg.evaluate("[WK.list.map(w=>w.name), S.lib.items.map(x=>x.id), [...BOOKMARKS], loadLog().length, WK.sound, location.hash]"))
        print('settings back           ', await pg.evaluate("[restGap(), pref(THEME_KEY,'system'), document.documentElement.dataset.theme, loopOn(), aiApp().id]"), "<- 12, dark, dark, false, claude")
        print('snackbar                ', await pg.inner_text('#snackbar'))
        # importing the same backup again changes nothing (merge by id)
        await pg.set_input_files('#fileInput', path); await pg.wait_for_timeout(300); await pg.click('#askYes'); await pg.wait_for_timeout(400)
        print('merge again             ', await pg.evaluate("[WK.list.length, S.lib.items.length, loadLog().length]"), '<- unchanged')
        # things that aren't in the backup: Merge keeps them, Cancel changes nothing, Replace removes them
        extra = """(()=>{const c=customizeWorkout(LIB_WK[1]); c.name='Extra'; saveWorkouts(); S.lib.items.push({...clone(findInDb('bw-squat')), id:'u-extra', name:'Extra'}); saveLib();
          BOOKMARKS.add('pil-hundred'); saveBookmarks(); saveLog([...loadLog(), {id:'s2',name:'Extra',start:'2026-09-02T10:00:00Z',seconds:60,completed:true,exercisesDone:1,exercisesTotal:1}]);
          setPref(GROUP_KEY,'on'); localStorage.setItem(SESSION_KEY, JSON.stringify({wid:c.id,i:2})); })()"""
        state = "[WK.list.map(w=>w.name), S.lib.items.map(x=>x.id), [...BOOKMARKS], loadLog().map(x=>x.id), pref(GROUP_KEY,'off'), !!loadSession(), restGap()]"
        await pg.evaluate(extra)
        print('with extras             ', await pg.evaluate(state))
        await pg.set_input_files('#fileInput', path); await pg.wait_for_timeout(300); await pg.click('#askNo'); await pg.wait_for_timeout(400)
        print('Cancel                  ', await pg.evaluate(state), '<- unchanged')
        await pg.set_input_files('#fileInput', path); await pg.wait_for_timeout(300); await pg.click('#askAlt'); await pg.wait_for_timeout(600)
        print('Replace                 ', await pg.evaluate(state), '<- only the backup: Mine, u-mine, bw-lunge, s1, grouping as backed up, no resume, rest 12')
        print('snackbar                ', await pg.inner_text('#snackbar'))
        print('errors', errs); await b.close()
asyncio.run(main())
