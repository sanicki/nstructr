import asyncio, os, json
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
# Create with AI: what you have -> AI app opened with the instructions (filled in, or copied) -> paste the answer.
# Also: the AI app and rest between exercises are settings; Half Roll-Back has no band
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(viewport={'width': 412, 'height': 860}, permissions=['clipboard-read', 'clipboard-write'])
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        await pg.evaluate("window.OPENED=[]; window.open=(u)=>{ OPENED.push(u); return null; }; 0")
        await pg.click('#view-workouts [data-act="ai"]'); await pg.wait_for_timeout(300)
        print('opens from Workouts     ', await pg.evaluate("[$('#aiDialog').open, [...document.querySelectorAll('#aiKind .filter')].map(x=>x.textContent), $('#aiOpenLabel').textContent]"), '<- Workout goal, Workout routine, Missing exercise, Photo/Video, YouTube link; Gemini by default')
        print('picked at first         ', await pg.evaluate("$('#aiKind [aria-pressed=true]').dataset.aikind"), "<- plan ('Workout goal'); no Paste button:", await pg.evaluate("!$('#aiPaste')"))
        print('equal widths            ', await pg.evaluate("[...new Set([...document.querySelectorAll('#aiKind .filter')].map(b => Math.round(b.getBoundingClientRect().width)))]"), '<- one width')
        await pg.click('[data-aikind="name"]'); await pg.wait_for_timeout(100)
        print('apps A-Z, other last    ', await pg.evaluate("[...document.querySelectorAll('#setAiApp option')].map(o=>o.textContent)"))
        await pg.evaluate("setAiApp('claude')"); await pg.wait_for_timeout(100)
        await pg.click('#aiOpen'); await pg.wait_for_timeout(200)
        print('needs input first       ', await pg.evaluate("[OPENED.length, $('#snackbar').textContent]"))
        await pg.fill('#aiInput', 'Pilates leg circles'); await pg.click('#aiOpen'); await pg.wait_for_timeout(300)
        clip = await pg.evaluate("navigator.clipboard.readText()")
        u = await pg.evaluate("OPENED[0]")
        print('Claude link             ', u[:40] + '…', len(u), 'chars | filled in:', '?q=' in u, '| copied:', clip.startswith('Make this for my exercise app: Pilates leg circles'), '| web check:', 'search the web' in clip)
        print('  prompt size           ', len(clip), 'chars |', 'LIBRARY' in clip, '| snack:', await pg.evaluate("$('#snackbar').textContent"))
        await pg.evaluate("setAiApp('gemini')"); await pg.wait_for_timeout(100)
        await pg.click('[data-aikind="link"]'); await pg.fill('#aiInput', 'https://www.youtube.com/watch?v=abc'); await pg.click('#aiOpen'); await pg.wait_for_timeout(300)
        print('Gemini (no prefill)     ', await pg.evaluate("[OPENED[1], $('#aiAppHint').textContent.slice(0,40)]"), (await pg.evaluate("navigator.clipboard.readText()"))[:60])
        await pg.click('[data-aikind="media"]'); await pg.wait_for_timeout(100)
        print('photo/video: no input   ', await pg.evaluate("[$('#aiInputWrap').hidden, $('#aiKindHint').textContent.slice(0,40)]"))
        # answers: fenced exercise, a workout with a new exercise, "in the library"
        ex = await pg.evaluate("JSON.stringify({...findInDb('bw-squat'), id:'u-leg-circles', name:'Leg Circles', collections:undefined})")
        await pg.fill('#aiAnswer', 'Here you go:\n```json\n' + ex + '\n```\nEnjoy!'); await pg.click('#aiImport'); await pg.wait_for_timeout(400)
        print('fenced exercise answer  ', await pg.evaluate("[$('#aiDialog').open, location.hash, S.ex && S.ex.name]"))
        await pg.evaluate("$('#checkDialog').open && $('#checkKeep').click()")   # a copy of Squat: the library check asks
        wk = {'format': 'nstructr/workout', 'version': 2, 'workouts': [{'version': 2, 'name': 'AI Legs', 'blocks': [{'name': 'Main', 'items': [{'ex': 'bw-squat', 'reps': 10}, {'ex': 'u-hops', 'reps': 8}]}]}],
              'exercises': [json.loads(await pg.evaluate("JSON.stringify({...findInDb('calf-raise'), id:'u-hops', name:'Hops'})"))]}
        await pg.evaluate("openAi()"); await pg.fill('#aiAnswer', json.dumps(wk)); await pg.click('#aiImport'); await pg.wait_for_timeout(400)
        print('workout answer          ', await pg.evaluate("[location.hash.slice(0,10), EDIT && EDIT.name, EDIT && EDIT.blocks[0].items.map(i=>i.ex), !!exById('u-hops')]"))
        await pg.evaluate("openAi()"); await pg.fill('#aiAnswer', '{"inLibrary":"bw-reverse-lunge"}'); await pg.click('#aiImport'); await pg.wait_for_timeout(400)
        print('already in the library  ', await pg.evaluate("[location.hash, $('#snackbar').textContent]"))
        await pg.evaluate("openAi()"); await pg.fill('#aiAnswer', 'Sorry, I cannot help'); await pg.click('#aiImport'); await pg.wait_for_timeout(300)
        print('not JSON                ', await pg.evaluate("[$('#aiDialog').open, $('#snackbar').textContent.slice(0,50)]"))
        await pg.evaluate("$('#aiDialog').close()")
        # settings: the AI provider (Settings › Create with AI) and rest between exercises
        await pg.evaluate("go('#/settings')"); await pg.wait_for_timeout(300)
        print('AI provider in Settings ', await pg.evaluate("[$('#setAiApp').value, $('#setAiApp').selectedOptions[0].textContent, !!$('#aiDialog #setAiApp'), !$('#view-settings [data-act=\"ai\"]')]"), '<- gemini, Google (Gemini), not in the dialog, no Create button')
        await pg.select_option('#setAiApp', 'claude'); await pg.evaluate("openAi()")
        print('  picked in Settings    ', await pg.evaluate("[aiApp().id, $('#aiOpenLabel').textContent]")); await pg.evaluate("$('#aiDialog').close()")
        await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(400); await pg.evaluate("openAi()")
        print('  after reload          ', await pg.evaluate("[$('#setAiApp').value, $('#aiOpenLabel').textContent]")); await pg.evaluate("$('#aiDialog').close()")
        print('settings order          ', await pg.evaluate("[...document.querySelectorAll('#view-settings .settings-title')].map(h=>h.textContent)"), await pg.evaluate("[...document.querySelectorAll('#view-settings section')][1].querySelectorAll('.body-large')[0].textContent"))
        print('docs link               ', await pg.evaluate("[$('#view-settings a').href, $('#view-settings a').target]"))
        await pg.fill('#setRestSets', '45'); await pg.dispatch_event('#setRestSets', 'change')
        print('rest between sets       ', await pg.evaluate("[restSets(), (()=>{ const it={...newItem(exById('bw-squat')), sets:3, rest:5}; return itemSeconds(it) - itemSeconds({...it, sets:1})*3; })()]"), '<- 2 rests of 45 s, item rest ignored')
        w = "(()=>{ const w={id:'r',name:'R',blocks:[{id:'b',name:'B',items:[newItem(exById('bw-squat')),newItem(exById('bw-squat'))]}]}; return workoutSeconds(w); })()"
        t10 = await pg.evaluate(w)
        await pg.fill('#setRest', '29'); await pg.dispatch_event('#setRest', 'change'); await pg.click('[data-rest-delta="1"]'); await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        print('rest between exercises  ', await pg.evaluate("[$('#setRest').value, restGap()]"), '| workout time', t10, '->', await pg.evaluate(w), '(+20 s)')
        await pg.evaluate("go('#/workouts')"); await pg.wait_for_timeout(200)
        await pg.click('[data-wact="new"]'); await pg.wait_for_timeout(300)
        print('editor has no rest pick ', await pg.evaluate("!$('#wkRestBetween')"), '| export has none:', await pg.evaluate("!workoutJSON(EDIT).includes('restBetween')"))
        # cover screen: the dialog fills it and scrolls to the Add button
        await pg.set_viewport_size({'width': 360, 'height': 398}); await pg.evaluate("openAi()"); await pg.wait_for_timeout(300)
        await pg.locator('#aiImport').scroll_into_view_if_needed()
        print('cover: dialog, Add it   ', await pg.evaluate("(()=>{const d=$('#aiDialog').getBoundingClientRect(), a=$('#aiImport').getBoundingClientRect(); return [Math.round(d.width), Math.round(d.height), Math.round(a.bottom) <= innerHeight]})()"))
        await pg.evaluate("$('#aiDialog').close()")
        # Half Roll-Back: no band
        print('Half Roll-Back          ', await pg.evaluate("[findInDb('pil-half-roll-back').equipment, (findInDb('pil-half-roll-back').props||[]).length]"))
        print('errors', errs); await b.close()
asyncio.run(main())
