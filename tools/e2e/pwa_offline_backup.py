import asyncio, os, json
# point at the served multi-file build (the service worker isn't used by nstructr.html), e.g.
#   python3 -m http.server 8000 -d _site  ->  NSTRUCTR_SITE=http://127.0.0.1:8000/
SITE = os.environ.get('NSTRUCTR_SITE', 'http://localhost:8000/')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
# installable app: manifest + icons, service worker, works offline, storage persistence, Export/Import everything
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width': 1280, 'height': 860}, accept_downloads=True)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(SITE + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(800)
        man = await pg.evaluate("fetch(document.querySelector('link[rel=manifest]').href).then(r=>r.json())")
        check('manifest', [man['display'], man['display_override'], [i['src'] + ' ' + i['purpose'] for i in man['icons']]], ['fullscreen', ['fullscreen', 'standalone'], ['icons/icon-192.png any', 'icons/icon-512.png any', 'icons/maskable-192.png maskable', 'icons/maskable-512.png maskable']])
        icons = await pg.evaluate("Promise.all([...document.querySelectorAll('link[rel=manifest]')].length ? " +
            json.dumps([i['src'] for i in man['icons']]) + ".map(s=>fetch(s).then(r=>r.status)) : [])")
        check('icon fetches', icons, [200, 200, 200, 200])
        await pg.evaluate("navigator.serviceWorker.ready"); await pg.wait_for_timeout(300)
        check('service worker, cache', [await pg.evaluate("!!navigator.serviceWorker.controller"), await pg.evaluate("caches.keys()")], lambda v: v[0] and len(v[1]) == 1 and v[1][0].startswith('nstructr-'), 'controlling, one nstructr-… cache')
        # offline: reload and everything still works (the library comes from the cache)
        await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        await ctx.set_offline(True)
        await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(800)
        check('offline reload', await pg.evaluate("[POSE_DB.exercises.length, LIB_WK.length, !!navigator.serviceWorker.controller]"), lambda v: v[0] > 300 and v[1] >= 5 and v[2], 'the library, the workouts, controlled')
        await pg.evaluate("go('#/play/bw-squat')"); await pg.wait_for_timeout(400)
        check('offline exercise player', await pg.evaluate("[S.view, S.ex && S.ex.id, S.resolved.length > 0]"), ['player', 'bw-squat', True])
        await pg.goto(SITE + 'index.html?x=1#/explore', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        check('offline other URL', await pg.evaluate("[S.view, POSE_DB.exercises.length > 300]"), ['exercises', True])
        await ctx.set_offline(False)
        # storage persistence note on the Create page
        await pg.evaluate("go('#/create')"); await pg.wait_for_timeout(400)
        check('persist note', await pg.inner_text('#persistNote'), has('Installing the app'))
        # backup: make some data and change some settings, export it, wipe everything, import it back
        await pg.evaluate("""(()=>{const c=customizeWorkout(LIB_WK[0]); c.name='Mine'; saveWorkouts();
          S.lib.items.push({...clone(findInDb('bw-squat')), id:'u-mine', name:'Mine'}); saveLib(); BOOKMARKS.add('bw-lunge'); saveBookmarks(); setSound('voice');
          setPref(REST_KEY,'12'); setPref(THEME_KEY,'dark'); setPref(LOOP_KEY,'off'); setPref(AI_KEY,'claude');
          saveLog([{id:'s1',workout:c.id,name:'Mine',start:'2026-09-01T10:00:00Z',end:'2026-09-01T10:30:00Z',seconds:1800,completed:true,exercisesDone:24,exercisesTotal:24,exercises:[]}]);})()""")
        async with pg.expect_download() as dl: await pg.click('[data-act="backup"]')
        d = await dl.value; path = await d.path(); text = open(path).read(); data = json.loads(text)
        check('export', [data['format'], data['version'], {k: len(data[k]) for k in ('workouts', 'exercises', 'history')}, data['settings']['restBetween'], data['settings']['theme'], data['settings']['aiApp']], ['nstructr/backup', 2, {'workouts': 1, 'exercises': 1, 'history': 1}, 12, 'dark', 'claude'])
        check('  file name', d.suggested_filename, lambda n: n.startswith('nstructr-backup-') and n.endswith('.json'))
        await pg.evaluate("localStorage.clear()"); await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        check('after wipe', await pg.evaluate("[WK.list.length, loadLog().length]"), [0, 0])
        await pg.set_input_files('#fileInput', path); await pg.wait_for_timeout(400)
        check('asks: merge or replace', await pg.evaluate("[$('#askDialog').open, $('#askTitle').textContent, $('#askNo').textContent, $('#askAlt').textContent, $('#askYes').textContent]"), [True, 'Restore this backup?', 'Cancel', 'Replace', 'Merge'])
        await pg.click('#askYes'); await pg.wait_for_timeout(600)
        check('after import (Merge)', await pg.evaluate("[WK.list.map(w=>w.name), S.lib.items.map(x=>x.id), [...BOOKMARKS].includes('bw-lunge'), loadLog().length, WK.sound, location.hash]"), [['Mine'], ['u-mine'], True, 1, 'voice', '#/workouts'])
        check('settings back', await pg.evaluate("[restGap(), pref(THEME_KEY,'system'), document.documentElement.dataset.theme, loopOn(), aiApp().id]"), [12, 'dark', 'dark', False, 'claude'])
        check('snackbar', await pg.inner_text('#snackbar'), 'Restored: 1 workout, 1 saved exercise and 1 history entry')
        # importing the same backup again changes nothing (merge by id)
        await pg.set_input_files('#fileInput', path); await pg.wait_for_timeout(300); await pg.click('#askYes'); await pg.wait_for_timeout(400)
        check('merge again', await pg.evaluate("[WK.list.length, S.lib.items.length, loadLog().length]"), [1, 1, 1], 'unchanged')
        # things that aren't in the backup: Merge keeps them, Cancel changes nothing, Replace removes them
        extra = """(()=>{const c=customizeWorkout(LIB_WK[1]); c.name='Extra'; saveWorkouts(); S.lib.items.push({...clone(findInDb('bw-squat')), id:'u-extra', name:'Extra'}); saveLib();
          BOOKMARKS.add('pil-hundred'); saveBookmarks(); saveLog([...loadLog(), {id:'s2',name:'Extra',start:'2026-09-02T10:00:00Z',seconds:60,completed:true,exercisesDone:1,exercisesTotal:1}]);
          setPref(GROUP_KEY,'on'); localStorage.setItem(SESSION_KEY, JSON.stringify({wid:c.id,i:2})); })()"""
        state = "[WK.list.map(w=>w.name), S.lib.items.map(x=>x.id), [...BOOKMARKS], loadLog().map(x=>x.id), pref(GROUP_KEY,'off'), !!loadSession(), restGap()]"
        await pg.evaluate(extra)
        with_extras = await pg.evaluate(state); check('with extras', with_extras, [['Mine', 'Extra'], ['u-mine', 'u-extra'], ['u-mine', 'bw-lunge', 'pil-hundred'], ['s1', 's2'], 'on', True, 12])
        await pg.set_input_files('#fileInput', path); await pg.wait_for_timeout(300); await pg.click('#askNo'); await pg.wait_for_timeout(400)
        check('Cancel', await pg.evaluate(state), with_extras, 'unchanged')
        await pg.set_input_files('#fileInput', path); await pg.wait_for_timeout(300); await pg.click('#askAlt'); await pg.wait_for_timeout(600)
        check('Replace', await pg.evaluate(state), [['Mine'], ['u-mine'], ['bw-lunge'], ['s1'], 'off', False, 12], 'only the backup: Mine, u-mine, bw-lunge, s1, grouping as backed up, no resume, rest 12')
        check('snackbar', await pg.inner_text('#snackbar'), 'Replaced with the backup: 1 workout, 1 saved exercise and 1 history entry')
        check('errors', errs, []); await b.close()
asyncio.run(main())
