# Contact sheet for tools/research.cjs: every step of each exercise, as the app draws its thumbnails, one row each.
#   python3 tools/research_sheet.py out.png <id...>    (against a served build: NSTRUCTR_URL, default http://127.0.0.1:8000/nstructr.html)

import asyncio, os, sys
from playwright.async_api import async_playwright
out, ids = sys.argv[1], sys.argv[2:]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1400, 'height': 800})
        await pg.goto(os.environ.get('NSTRUCTR_URL', 'http://127.0.0.1:8000/nstructr.html') + '#/exercises'); await pg.wait_for_timeout(800)
        html = await pg.evaluate("""ids => ids.map(id => { const ex = exById(id); if (!ex) return `<div>${id}?</div>`;
          return `<div style="display:flex;align-items:center;gap:6px;border-bottom:1px solid #ccc"><div style="width:170px;font:12px sans-serif">${ex.name}</div>` +
            ex.keyframes.map(k => `<div style="width:150px;height:150px">${poseThumbSVG(ex, k)}</div>`).join('') + '</div>'; }).join('')""", ids)
        await pg.evaluate("h => { document.body.innerHTML = h + '<style>body{background:#fff!important;overflow:visible!important} svg{width:150px;height:150px}</style>'; }", html)
        await pg.screenshot(path=out, full_page=True); await b.close()
asyncio.run(main())
