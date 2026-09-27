# NstructR

Exercise animations and workouts with a stick figure: 136 exercises (yoga, bodyweight, core, Pilates, bands,
free weights, chair-based, stretches, balance) and a workout player built to be used from the floor —
including on a Samsung Galaxy Z Flip cover screen — with optional voice coaching.

**Use it:** https://sanicki.github.io/nstructr/ (install it from the browser menu to use it offline and full screen).

## For users

Read the **[user guide](wiki/Home.md)**: getting started and installing, the exercise library, making
workouts, the workout player on the cover screen, Create with AI, editing exercises, sharing and backups,
settings, and troubleshooting.

Found an exercise that looks wrong, or have an idea? [Open an issue](https://github.com/sanicki/nstructr/issues).

## For developers

No framework and no bundler: plain JavaScript, one JSON file per exercise and workout, and a build script that
validates the library, runs animation checks and writes the site to `_site/`.

```sh
npm install                                   # once
node tools/build.mjs                          # validate + animation checks + build _site/
python3 -m http.server 8000 -d _site          # then open http://127.0.0.1:8000/
```

`--check-only` runs just the checks (what CI runs on pull requests); `--no-checks` builds fast while working on
the UI. The build deletes and recreates `_site/`, so restart the server after each build.

### Opening a pull request

1. Fork the repository (or create a branch if you have access) and branch from `main`.
2. Make your change. Keep to the conventions in [`CLAUDE.md`](CLAUDE.md) (the short rules) and
   [`HANDOFF.md`](HANDOFF.md) (formats, engine, design decisions). In particular:
   - Exercises and workouts are `library/exercises/<id>.json` and `library/workouts/<id>.json`; the file name is the
     `id`, and library ids never start with `u-`.
   - Every exercise must pass the animation checks for every side and direction: fix the poses rather than adding
     an exception to `tools/known-issues.json`.
   - Exercise text is in your own words, with the source cited. Spoken cues are short, plain directions.
   - Don't rename `localStorage` keys without a migration.
3. Run `node tools/build.mjs` and make sure it passes.
4. For app changes, run the browser tests that cover what you touched (Python Playwright), against a served
   build, and read their output (they print results, including an `errors` line that should be empty):
   ```sh
   pip install playwright pillow && playwright install chromium
   NSTRUCTR_URL=http://127.0.0.1:8000/nstructr.html python3 tools/e2e/<test>.py
   ```
   Check anything the workout player shows at 360×398 (the Flip7 cover screen), with nothing important at the
   bottom of the screen.
5. For UI changes, run `python3 tools/audit.py` (accessibility, 48 px touch targets, text size, sideways
   scrolling, in light and dark; see [`docs/audit-2026-09.md`](docs/audit-2026-09.md)) and fix what it reports.
6. Update `HANDOFF.md` (and the [user guide](wiki/Home.md) and its screenshots if users will notice) in the
   same pull request. Screenshots come from `tools/wiki_screenshots.py`.
7. Open the pull request against `main`, saying what changed and how you tested it. CI runs the build and the
   checks; merged changes deploy to GitHub Pages.

Contributions are accepted under the MIT license below.

## For AI assistants (LLMs)

Read these, in this order, before changing anything:

| File | What it's for |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Commands, rules and where the code is (short; read first). [`AGENTS.md`](AGENTS.md) points here too. |
| [`HANDOFF.md`](HANDOFF.md) | The full picture: file formats, engine pipeline, validation rules, UI inventory, storage keys, tests, roadmap, open questions |
| [`docs/3d-skeleton.md`](docs/3d-skeleton.md) | The proposed 3D skeleton (not built yet) |
| [`docs/audit-2026-09.md`](docs/audit-2026-09.md) | The Sep 2026 audit: accessibility, Material Design, security, performance |
| [`wiki/`](wiki/Home.md) | The user guide: how the app behaves from a user's side |
| `schema/*.schema.json` | JSON Schemas for exercise and workout files |

To *write* an exercise or workout for a user rather than change the code, use the app's **Create with AI**
(see [the guide](wiki/Create-with-AI.md)): its instructions describe the format.

## License

[MIT](LICENSE): the engine, the app and the exercise library.
