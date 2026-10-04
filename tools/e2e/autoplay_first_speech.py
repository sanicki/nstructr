import asyncio, os
# point at a served build, e.g.  python3 -m http.server 8000 -d _site
URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
from playwright.async_api import async_playwright
from check import check, near, below, at_least, has, all_true
# a workout's first line is heard (nothing cancels it on the way into the player); Settings > Exercises > Autoplay;
# Grok and Vibe copy the instructions instead of a link; "Unspecified"
FAKE = """window.SPOKEN=[]; window.CANCELS=[]; Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
  speaking:false, pending:false, getVoices(){ return []; }, speak(u){ SPOKEN.push(u.text); this.speaking=true; this._u=u; setTimeout(()=>{ if(this._u===u){ this.speaking=false; this._u=null; u.onend&&u.onend(); } }, 2500); },
  cancel(){ if (this._u) CANCELS.push(this._u.text); this.speaking=false; const u=this._u; this._u=null; u&&u.onend&&u.onend(); }}}); 0"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        pg = await b.new_page(viewport={'width': 360, 'height': 398})
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
        await pg.evaluate(FAKE)
        await pg.evaluate("setSound('voice')")
        await pg.click('[data-wstart]'); await pg.wait_for_timeout(1500)
        check('first lines, not cut off', await pg.evaluate("[SPOKEN.filter(Boolean).slice(0,1), CANCELS.filter(Boolean)]"), [["20-Minute Beginner's Yoga."], []], 'the workout title first; cancelled: none')
        await pg.wait_for_timeout(2500)
        check('  then the first exercise', await pg.evaluate("SPOKEN.filter(Boolean).slice(1,2)"), ['Easy Pose.'])
        await pg.evaluate("exitWorkout()"); await pg.wait_for_timeout(300)
        # coming from an exercise page that is speaking, to Workouts: that voice stops
        await pg.evaluate("SPOKEN.length=0; CANCELS.length=0; go('#/play/bw-squat')"); await pg.wait_for_timeout(600)
        await pg.evaluate("go('#/workouts')"); await pg.wait_for_timeout(300)
        check('leaving an exercise', await pg.evaluate("[SPOKEN.length > 0, CANCELS.length > 0]"), [False, False], 'its line is stopped')
        # autoplay
        await pg.evaluate("go('#/play/calf-raise')"); await pg.wait_for_timeout(400)
        a = await pg.evaluate("S.playing")
        await pg.evaluate("go('#/settings')"); await pg.wait_for_timeout(200)
        print('settings sections       ', await pg.evaluate("[...document.querySelectorAll('#view-settings .settings-title')].map(h=>h.textContent)"), await pg.evaluate("$('#setAutoplay').checked"))
        await pg.click('#setAutoplay'); await pg.wait_for_timeout(100)
        await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_timeout(400)
        await pg.evaluate("go('#/play/bw-reverse-lunge')"); await pg.wait_for_timeout(400)
        print('autoplay on -> off      ', a, '->', await pg.evaluate("[S.playing, localStorage.getItem('nstructr-autoplay-v1')]"))
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(200)
        check('Play (Space) plays', await pg.evaluate("S.playing"), True)
        # AI apps
        await pg.evaluate("openAi()"); await pg.wait_for_timeout(200)
        check('AI apps', await pg.evaluate("[...document.querySelectorAll('#setAiApp option')].map(o=>o.textContent)"), ['Alibaba (Qwen)', 'Anthropic (Claude)', 'ByteDance (Doubao)', 'DeepSeek', 'Google (Gemini)', 'Microsoft (Copilot)', 'Mistral (Vibe)', 'Moonshot (Kimi)', 'OpenAI (ChatGPT)', 'xAI (Grok)', 'Unspecified'])
        check('copy only', await pg.evaluate("AI_APPS.filter(a=>!a.q).map(a=>a.name)"), ['Qwen', 'Doubao', 'DeepSeek', 'Gemini', 'Vibe', 'Kimi', 'Grok', 'Unspecified'])
        check('errors', errs, []); await b.close()
asyncio.run(main())
