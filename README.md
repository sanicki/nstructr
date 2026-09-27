# NstructR

Exercise animations and workouts with a stick figure: 136 exercises (yoga, bodyweight, core, Pilates, bands,
free weights, chair-based, stretches, balance) and a workout player built to be used from the floor —
including on a Samsung Galaxy Z Flip cover screen — with optional voice coaching.

**Use it:** https://sanicki.github.io/nstructr/ (or download `nstructr.html` from the latest build and open it; it works offline as a single file).

**Develop:** `npm install && node tools/build.mjs`, then `python3 -m http.server 8000 -d _site`.
Exercises and workouts live in `library/` as one JSON file each; see `HANDOFF.md` for the formats and the
animation checks every exercise must pass.

License: [MIT](LICENSE): the engine, the app and the exercise library.
