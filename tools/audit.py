"""Accessibility and UI audit of a served build: axe-core (WCAG 2.1 A/AA + best practices) on every screen, in
light and dark, plus checks axe doesn't make: touch targets under 48 px (Material 3), text under 12 px, and
controls without a name, pages wider than the screen. Prints a report; exit code is 0 either way (read it).

    npm install && node tools/build.mjs && python3 -m http.server 8000 -d _site
    NSTRUCTR_URL=http://127.0.0.1:8000/nstructr.html python3 tools/audit.py [--json out.json]"""
import asyncio, os, sys, json
from collections import defaultdict
from playwright.async_api import async_playwright

URL = os.environ.get('NSTRUCTR_URL', 'http://localhost:8000/nstructr.html')
AXE = open(os.path.join(os.path.dirname(__file__), '..', 'node_modules', 'axe-core', 'axe.min.js')).read()

EXTRA = r"""(() => {
  const out = [], seen = new Set();
  const visible = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 && el.checkVisibility({opacityProperty: true, visibilityProperty: true}); };
  const sel = el => el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + (el.dataset && Object.keys(el.dataset).length ? `[data-${Object.keys(el.dataset)[0].replace(/[A-Z]/g, c => '-' + c.toLowerCase())}]` : '');
  const top = document.querySelector('dialog[open]') || document;
  for (const el of top.querySelectorAll('button, a[href], input, select, textarea, summary, [role=button], [tabindex]:not([tabindex="-1"])')) {
    if (!visible(el) || el.closest('[inert]') || el.classList.contains('vh')) continue;
    const r0 = el.getBoundingClientRect(), a = getComputedStyle(el, '::after');
    // a transparent ::after that extends the hit area counts (clipped by any scrolling/overflow-hidden parent)
    let r = { width: r0.width, height: r0.height };
    if (a.content !== 'none' && a.position === 'absolute') r = { width: Math.max(r0.width, parseFloat(a.width) || 0, parseFloat(a.minWidth) || 0), height: Math.max(r0.height, parseFloat(a.height) || 0) };
    const clip = [...(function* (n) { while ((n = n.parentElement)) yield n; })(el)].find(n => getComputedStyle(n).overflowY !== 'visible');
    if (clip && clip !== document.body && clip !== document.documentElement && !clip.matches('dialog, .ai-body, .pick-list, main, .view')) { const c = clip.getBoundingClientRect(); r = { width: Math.min(r.width, c.width), height: Math.min(r.height, c.height) }; }
    if (el.type === 'checkbox' || el.matches('input[type=search], textarea')) continue;
    // an inline link in a sentence is exempt (WCAG 2.5.8); M3 asks 48 x 48 for everything else
    if ((Math.round(r.width) < 48 || Math.round(r.height) < 48) && !(el.tagName === 'A' && getComputedStyle(el).display === 'inline')) {
      const k = 'target ' + sel(el); if (!seen.has(k)) { seen.add(k); out.push({kind: 'small target', el: sel(el), size: `${Math.round(r.width)}x${Math.round(r.height)}`, text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}); }
    }
  }
  const walker = document.createTreeWalker(top === document ? document.body : top, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode, el = t.parentElement; if (!t.textContent.trim() || !el || !visible(el) || el.closest('.icon, svg, [aria-hidden=true]')) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) { const k = 'font ' + sel(el); if (!seen.has(k)) { seen.add(k); out.push({kind: 'small text', el: sel(el), size: fs + 'px', text: t.textContent.trim().slice(0, 30)}); } }
  }
  if (document.documentElement.scrollWidth > innerWidth + 1) out.push({kind: 'page scrolls sideways', el: 'html', size: document.documentElement.scrollWidth + 'px wide', text: ''});
  return out;
})()"""

async def audit(pg, name, results):
    await pg.wait_for_timeout(400)
    await pg.evaluate(AXE)
    r = await pg.evaluate("""async () => { const ctx = document.querySelector('dialog[open]') || document;
      const r = await axe.run(ctx, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, resultTypes: ['violations'] });
      return r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({ target: n.target.join(' '), summary: (n.failureSummary || '').split('\\n').slice(1, 3).join(' ').slice(0, 160) })) })); }""")
    extra = await pg.evaluate(EXTRA)
    results[name] = {'axe': r, 'extra': extra}
    print(f'  {name:<28} axe: {sum(len(v["nodes"]) for v in r):>3} issues in {len(r):>2} rules | extra: {len(extra)}')

async def screens(b, theme, results):
    ctx = await b.new_context(viewport={'width': 412, 'height': 860}, has_touch=True)
    pg = await ctx.new_page(); pg.on('pageerror', lambda e: print('PAGE ERROR', e))
    await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
    await pg.evaluate(f"localStorage.setItem('nstructr-theme-v1','{theme}'); applyTheme('{theme}')")
    await pg.evaluate("""WK.list.push({id:'a', name:'Audit', blocks:[{id:'b', name:'Main', rounds:2, roundRest:30, items:[{...newItem(exById('bw-reverse-lunge')), sets:2, sides:'alternate'}, newItem(exById('core-forearm-plank'))]}]});
      saveWorkouts(); saveLog([{id:'h', wid:'a', name:'Audit', start:Date.now()-3600e3, seconds:600, exercisesDone:2, exercisesTotal:2, completed:true}]); go('#/workouts')""")
    T = lambda n: f'{theme}: {n}'
    await pg.click('[data-wtoggle="a"]'); await audit(pg, T('Workouts'), results)
    await pg.evaluate("go('#/workout/a')"); await audit(pg, T('Workout editor'), results)
    uid = await pg.evaluate("WK.list[0].blocks[0].items[0].uid")
    await pg.evaluate(f"openItemSettings('{uid}')"); await audit(pg, T('Exercise settings dialog'), results); await pg.evaluate("$('#itemDialog').close()")
    await pg.evaluate("openPicker && openPicker(WK.list[0].blocks[0].id)") if await pg.evaluate("typeof openPicker === 'function'") else None
    if await pg.evaluate("$('#pickDialog').open"): await audit(pg, T('Add exercises'), results); await pg.evaluate("$('#pickDialog').close()")
    await pg.evaluate("go('#/exercises')"); await audit(pg, T('Exercises'), results)
    await pg.evaluate("E.coll='Bodyweight'; renderExplore()"); await audit(pg, T('Exercises: collection'), results)
    await pg.evaluate("go('#/play/bw-reverse-lunge')"); await pg.wait_for_timeout(300); await pg.evaluate("setPlaying(false)")
    await audit(pg, T('Exercise page'), results)
    await pg.evaluate("showExControls(true)"); await audit(pg, T('Exercise page, controls'), results)
    await pg.click('#editPoseBtn'); await audit(pg, T('Edit (words)'), results)
    await pg.evaluate("closeEditor(); localStorage.setItem('nstructr-authoring-v1','on'); applyAuthoring(); openEditor()"); await audit(pg, T('Edit (poses)'), results)
    await pg.evaluate("closeEditor(); localStorage.setItem('nstructr-authoring-v1','off'); applyAuthoring()")
    await pg.evaluate("go('#/settings')"); await audit(pg, T('Settings'), results)
    await pg.evaluate("openAi()"); await audit(pg, T('Create with AI'), results); await pg.evaluate("$('#aiDialog').close()")
    await pg.evaluate("go('#/workouts')"); await pg.click('[data-share-wk="a"]'); await audit(pg, T('Share'), results); await pg.evaluate("$('#shareDialog').close()")
    await ctx.close()
    # the cover screen
    ctx = await b.new_context(viewport={'width': 360, 'height': 398}, has_touch=True)
    pg = await ctx.new_page()
    await pg.goto(URL + '#/workouts', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
    await pg.evaluate(f"localStorage.setItem('nstructr-theme-v1','{theme}'); applyTheme('{theme}')")
    await audit(pg, T('Cover: Workouts'), results)
    await pg.evaluate("WK.hinted=true; setSound('off'); startWorkout(LIB_WK[0], 3)"); await pg.wait_for_timeout(800)
    await audit(pg, T('Cover: player'), results)
    await pg.touchscreen.tap(180, 200); await audit(pg, T('Cover: player, controls'), results)
    await pg.evaluate("startRest(20,'item')"); await audit(pg, T('Cover: rest'), results)
    await ctx.close()

def report(results):
    rules, extra = defaultdict(lambda: {'impact': '', 'help': '', 'where': defaultdict(set)}), defaultdict(lambda: defaultdict(set))
    for screen, r in results.items():
        for v in r['axe']:
            x = rules[v['id']]; x['impact'], x['help'] = v['impact'], v['help']
            for n in v['nodes']: x['where'][n['target'] + ('  — ' + n['summary'] if n['summary'] else '')].add(screen)
        for e in r['extra']: extra[e['kind']][f"{e['el']} {e['size']} \"{e['text']}\""].add(screen)
    print('\n==== axe-core ====')
    order = {'critical': 0, 'serious': 1, 'moderate': 2, 'minor': 3}
    for rid, x in sorted(rules.items(), key=lambda kv: order.get(kv[1]['impact'], 9)):
        print(f"\n[{x['impact']}] {rid}: {x['help']}")
        for t, scr in sorted(x['where'].items()): print(f"   {t[:170]}\n      on: {', '.join(sorted(scr))[:200]}")
    for kind, items in extra.items():
        print(f'\n==== {kind} ({len(items)}) ====')
        for t, scr in sorted(items.items()): print(f"   {t[:120]}  ({len(scr)} screens)")

async def main():
    results = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for theme in ['light', 'dark']: await screens(b, theme, results)
        await b.close()
    report(results)
    if '--json' in sys.argv: json.dump(results, open(sys.argv[sys.argv.index('--json') + 1], 'w'), indent=1)

asyncio.run(main())
