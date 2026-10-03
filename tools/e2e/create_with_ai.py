import asyncio, os, json
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
# Create with AI: what you have -> AI app opened with the instructions (filled in, or copied) -> paste the answer.
# Qwen opens its mainland app only on a phone set up for mainland China (language region or time zone).
# Also: the AI app and rest between exercises are settings; Half Roll-Back has no band
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(viewport={'width': 412, 'height': 860}, permissions=['clipboard-read', 'clipboard-write'])
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        await pg.evaluate("window.OPENED=[]; window.open=(u)=>{ OPENED.push(u); return null; }; 0")
        await pg.click('#view-workouts [data-act="ai"]'); await pg.wait_for_timeout(300)
        check('opens from Workouts', await pg.evaluate("[$('#aiDialog').open, [...document.querySelectorAll('#aiKind .filter')].map(x=>x.textContent), $('#aiOpenLabel').textContent]"), [True, ['checkWorkout goal', 'checkWorkout routine', 'checkMissing exercise', 'checkPhoto/Video', 'checkYouTube link'], 'Open Gemini'])
        check('picked at first, no Paste', [await pg.evaluate("$('#aiKind [aria-pressed=true]').dataset.aikind"), await pg.evaluate("!$('#aiPaste')")], ['plan', True])
        check('equal widths', await pg.evaluate("[...new Set([...document.querySelectorAll('#aiKind .filter')].map(b => Math.round(b.getBoundingClientRect().width)))]"), lambda v: len(v) == 1, 'one width')
        await pg.click('[data-aikind="name"]'); await pg.wait_for_timeout(100)
        check('apps A-Z, other last', await pg.evaluate("[...document.querySelectorAll('#setAiApp option')].map(o=>o.textContent)"), ['Alibaba (Qwen)', 'Anthropic (Claude)', 'ByteDance (Doubao)', 'DeepSeek', 'Google (Gemini)', 'Microsoft (Copilot)', 'Mistral (Vibe)', 'Moonshot (Kimi)', 'OpenAI (ChatGPT)', 'xAI (Grok)', 'Unspecified'])
        await pg.evaluate("setAiApp('claude')"); await pg.wait_for_timeout(100)
        await pg.click('#aiOpen'); await pg.wait_for_timeout(200)
        check('needs input first', await pg.evaluate("[OPENED.length, $('#snackbar').textContent]"), [0, 'Add the exercise name first.'])
        await pg.fill('#aiInput', 'Pilates leg circles'); await pg.click('#aiOpen'); await pg.wait_for_timeout(300)
        clip = await pg.evaluate("navigator.clipboard.readText()")
        u = await pg.evaluate("OPENED[0]")
        check('Claude link (copied, not filled in)', [u, clip.startswith('Make this for my exercise app: Pilates leg circles'), 'search the web' in clip], ['https://claude.ai/new', True, True])
        check('prompt has the library', ['LIBRARY' in clip, await pg.evaluate("$('#snackbar').textContent")], [True, "Instructions copied. Paste them into Claude's chat and send them."])
        await pg.evaluate("setAiApp('gemini')"); await pg.wait_for_timeout(100)
        await pg.click('[data-aikind="link"]'); await pg.fill('#aiInput', 'https://www.youtube.com/watch?v=abc'); await pg.click('#aiOpen'); await pg.wait_for_timeout(300)
        check('Gemini (no prefill)', [*(await pg.evaluate("[OPENED[1], $('#aiAppHint').textContent.slice(0,40)]")), (await pg.evaluate("navigator.clipboard.readText()"))[:60]], ['https://gemini.google.com/app', "Gemini can't take the instructions in a ", 'Watch or read this and make what it shows for my exercise ap'])
        await pg.click('[data-aikind="media"]'); await pg.wait_for_timeout(100)
        check('photo/video: no input', await pg.evaluate("[$('#aiInputWrap').hidden, $('#aiKindHint').textContent.slice(0,40)]"), [True, 'Attach your photo or video in the AI app'])
        # answers: fenced exercise, a workout with a new exercise, "in the library"
        ex = await pg.evaluate("JSON.stringify({...findInDb('bw-squat'), id:'u-leg-circles', name:'Leg Circles', collections:undefined})")
        await pg.fill('#aiAnswer', 'Here you go:\n```json\n' + ex + '\n```\nEnjoy!'); await pg.click('#aiImport'); await pg.wait_for_timeout(400)
        check('fenced exercise answer', await pg.evaluate("[$('#aiDialog').open, location.hash, S.ex && S.ex.name]"), [False, '#/play/u-leg-circles', 'Leg Circles'])
        await pg.evaluate("$('#checkDialog').open && $('#checkKeep').click()")   # a copy of Squat: the library check asks
        wk = {'format': 'nstructr/workout', 'version': 2, 'workouts': [{'version': 2, 'name': 'AI Legs', 'blocks': [{'name': 'Main', 'items': [{'ex': 'bw-squat', 'reps': 10}, {'ex': 'u-hops', 'reps': 8}]}]}],
              'exercises': [json.loads(await pg.evaluate("JSON.stringify({...findInDb('calf-raise'), id:'u-hops', name:'Hops'})"))]}
        await pg.evaluate("openAi()"); await pg.fill('#aiAnswer', json.dumps(wk)); await pg.click('#aiImport'); await pg.wait_for_timeout(400)
        check('workout answer', await pg.evaluate("[location.hash.slice(0,10), EDIT && EDIT.name, EDIT && EDIT.blocks[0].items.map(i=>i.ex), !!exById('u-hops')]"), ['#/workout/', 'AI Legs', ['bw-squat', 'u-hops'], True])
        await pg.evaluate("openAi()"); await pg.fill('#aiAnswer', '{"inLibrary":"bw-reverse-lunge"}'); await pg.click('#aiImport'); await pg.wait_for_timeout(400)
        check('already in the library', await pg.evaluate("[location.hash, $('#snackbar').textContent]"), ['#/play/bw-reverse-lunge', 'Reverse Lunge is already in the library'])
        await pg.evaluate("openAi()"); await pg.fill('#aiAnswer', 'Sorry, I cannot help'); await pg.click('#aiImport'); await pg.wait_for_timeout(300)
        check('not JSON', await pg.evaluate("[$('#aiDialog').open, $('#snackbar').textContent.slice(0,50)]"), [True, "Couldn't import: The answer is not valid JSON (Une"])
        await pg.evaluate("$('#aiDialog').close()")
        # settings: the AI provider (Settings › Create with AI) and rest between exercises
        await pg.evaluate("go('#/settings')"); await pg.wait_for_timeout(300)
        check('AI provider in Settings', await pg.evaluate("[$('#setAiApp').value, $('#setAiApp').selectedOptions[0].textContent, !!$('#aiDialog #setAiApp'), !$('#view-settings [data-act=\"ai\"]')]"), ['gemini', 'Google (Gemini)', False, True], 'not in the dialog, no Create button')
        await pg.select_option('#setAiApp', 'claude'); await pg.evaluate("openAi()")
        check('picked in Settings', await pg.evaluate("[aiApp().id, $('#aiOpenLabel').textContent]"), ['claude', 'Open Claude']); await pg.evaluate("$('#aiDialog').close()")
        await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(400); await pg.evaluate("openAi()")
        check('after reload', await pg.evaluate("[$('#setAiApp').value, $('#aiOpenLabel').textContent]"), ['claude', 'Open Claude']); await pg.evaluate("$('#aiDialog').close()")
        check('settings order', [await pg.evaluate("[...document.querySelectorAll('#view-settings .settings-title')].map(h=>h.textContent)"), await pg.evaluate("[...document.querySelectorAll('#view-settings section')][1].querySelectorAll('.body-large')[0].textContent")], [['Documentation', 'Workouts', 'Exercises', 'Display', 'Create with AI', 'Import & tools'], 'Rest between exercises'])
        check('docs link', await pg.evaluate("[$('#view-settings a').href, $('#view-settings a').target]"), ['https://github.com/sanicki/nstructr/blob/main/wiki/Home.md', '_blank'])
        await pg.fill('#setRestSets', '45'); await pg.dispatch_event('#setRestSets', 'change')
        check('rest between sets', await pg.evaluate("[restSets(), (()=>{ const it={...newItem(exById('bw-squat')), sets:3, rest:5}; return itemSeconds(it) - itemSeconds({...it, sets:1})*3; })()]"), [45, 90], '2 rests of 45 s, item rest ignored')
        w = "(()=>{ const w={id:'r',name:'R',blocks:[{id:'b',name:'B',items:[newItem(exById('bw-squat')),newItem(exById('bw-squat'))]}]}; return workoutSeconds(w); })()"
        t10 = await pg.evaluate(w); gap0 = await pg.evaluate("restGap()")
        await pg.fill('#setRest', '29'); await pg.dispatch_event('#setRest', 'change'); await pg.click('[data-rest-delta="1"]'); await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        check('rest between exercises', [*(await pg.evaluate("[$('#setRest').value, restGap()]")), round(await pg.evaluate(w) - t10, 1)], ['30', 30, 30 - gap0], 'the one gap grows')
        await pg.evaluate("go('#/workouts')"); await pg.wait_for_timeout(200)
        await pg.click('[data-wact="new"]'); await pg.wait_for_timeout(300)
        check('editor and export have no rest pick', [await pg.evaluate("!$('#wkRestBetween')"), await pg.evaluate("!workoutJSON(EDIT).includes('restBetween')")], [True, True])
        # cover screen: the dialog fills it and scrolls to the Add button
        await pg.set_viewport_size({'width': 360, 'height': 398}); await pg.evaluate("openAi()"); await pg.wait_for_timeout(300)
        await pg.locator('#aiImport').scroll_into_view_if_needed()
        check('cover: dialog, Add it', await pg.evaluate("(()=>{const d=$('#aiDialog').getBoundingClientRect(), a=$('#aiImport').getBoundingClientRect(); return [Math.round(d.width), Math.round(d.height), Math.round(a.bottom) <= innerHeight]})()"), [360, 398, True])
        await pg.evaluate("$('#aiDialog').close()")
        # Half Roll-Back: no band
        check('Half Roll-Back: no band', await pg.evaluate("[findInDb('pil-half-roll-back').equipment, (findInDb('pil-half-roll-back').props||[]).length]"), [['Yoga mat'], 0])
        # Qwen: which of its two apps, by the phone's language and time zone
        seen = []
        for loc, tz in [('en-US', 'America/New_York'), ('zh-CN', 'Asia/Shanghai'), ('en-US', 'Asia/Shanghai'), ('zh-CN', 'Europe/London'), ('zh-TW', 'Asia/Taipei'), ('zh-HK', 'Asia/Hong_Kong')]:
            c = await b.new_context(locale=loc, timezone_id=tz); q = await c.new_page()
            await q.goto(URL + '#/workouts', wait_until='domcontentloaded'); await q.wait_for_timeout(300)
            seen.append((loc, tz, await q.evaluate("aiUrl(AI_APPS.find(a => a.id === 'qwen'))"), await q.evaluate("aiUrl(aiApp())"))); await c.close()
        check('Qwen app by language and time zone', [x[2] for x in seen], ['https://chat.qwen.ai/', 'https://www.qianwen.com/', 'https://www.qianwen.com/', 'https://www.qianwen.com/', 'https://chat.qwen.ai/', 'https://chat.qwen.ai/'])
        check('default app stays Gemini', {x[3] for x in seen}, {'https://gemini.google.com/app'})
        check('errors', errs, []); await b.close()
asyncio.run(main())
