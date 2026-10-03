"""Run the browser tests: serve _site/ (build it first: node tools/build.mjs), run the tests a few at a time, keep each
one's output, and exit with an error if any failed (a ✗ check, a page error, a crash or a timeout).
    python3 tools/e2e/run.py                 the tests in FAST (what pull requests run)
    python3 tools/e2e/run.py --all           every test (nightly)
    python3 tools/e2e/run.py name name ...   those tests
    options: --jobs N (4), --timeout S (300 a test), --out DIR (e2e-output)"""
import argparse, functools, glob, http.server, os, subprocess, sys, threading, time
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
# quick and central: speech and workouts, transitions, the cover screen, the tabs, imports and sharing, offline
FAST = ['ready_still', 'speech_order', 'encouragement', 'equipment_changes', 'test_run', 'reps_sets_sides', 'transitions',
        'tabs_settings_player', 'gestures_cover', 'layout_overlap', 'library_and_ids', 'workouts_tab', 'exercises_tab',
        'security_imports', 'share_links', 'pwa_offline_backup', 'muscles', 'variations']
# need the internet (source links, AI apps): never run by default
ONLINE = []

def serve(port):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Quiet, directory=os.path.join(ROOT, '_site'))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

def run(name, url, timeout, out):
    t0 = time.time(); path = os.path.join(HERE, name + '.py')
    try:
        p = subprocess.run([sys.executable, path], env={**os.environ, 'NSTRUCTR_URL': url, 'NSTRUCTR_SITE': url.rsplit('/', 1)[0] + '/'}, cwd=ROOT,
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=timeout)
        code, text = p.returncode, p.stdout
    except subprocess.TimeoutExpired as e:
        code, text = 'timeout', (e.stdout or b'').decode('utf8', 'replace') if isinstance(e.stdout, bytes) else (e.stdout or '')
    with open(os.path.join(out, name + '.txt'), 'w') as f: f.write(text)
    return name, code, time.time() - t0, text

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('tests', nargs='*'); ap.add_argument('--all', action='store_true')
    ap.add_argument('--jobs', type=int, default=4); ap.add_argument('--timeout', type=int, default=300)
    ap.add_argument('--out', default=os.path.join(ROOT, 'e2e-output')); ap.add_argument('--port', type=int, default=8765)
    a = ap.parse_args()
    names = a.tests or (sorted(os.path.basename(f)[:-3] for f in glob.glob(os.path.join(HERE, '*.py'))
                               if not os.path.basename(f).startswith(('check', 'run', '_'))) if a.all else FAST)
    names = [n for n in names if n not in ONLINE or n in a.tests]
    if not os.path.exists(os.path.join(ROOT, '_site', 'nstructr.html')): sys.exit('build first: node tools/build.mjs')
    os.makedirs(a.out, exist_ok=True); serve(a.port); url = f'http://127.0.0.1:{a.port}/nstructr.html'
    failed = []
    with ThreadPoolExecutor(a.jobs) as pool:
        for name, code, secs, text in pool.map(lambda n: run(n, url, a.timeout, a.out), names):
            ok = code == 0
            print(f"{'ok  ' if ok else 'FAIL'} {name:<32} {secs:5.0f} s" + ('' if ok else f'  ({code})'), flush=True)
            if not ok:
                failed.append(name)
                for line in [l for l in text.splitlines() if l.startswith(('✗', 'FAILED', 'Traceback')) or 'Error' in l][:8]: print('       ' + line)
    print(f'\n{len(names) - len(failed)} of {len(names)} passed' + (f'; failed: {", ".join(failed)}' if failed else '') + f' (output in {os.path.relpath(a.out, ROOT)}/)')
    sys.exit(1 if failed else 0)

if __name__ == '__main__': main()
