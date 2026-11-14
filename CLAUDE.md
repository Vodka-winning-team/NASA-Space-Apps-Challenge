# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Will the lander survive?": a NASA Space Apps 2026 entry (Port Louis) for the **Lunar Landing Site Navigator** challenge. The user picks one of six south-pole landing sites and a date. The site draws the Sun and Earth against that site's real horizon, runs a battery through the mission and says whether the lander survives. Team docs: `IDEA.md` (pitch), `PLAN.md` (roles and timeline), `TASKS.md` (live task list, so update it when you finish a task), `CHALLENGE.md` (official objectives vs. what's built), `VALIDATION.md` (comparison with NASA's illumination maps).

## Two halves

- `engine/`: Python 3 scripts (`numpy`, `requests`, plus `Pillow` for `build_map.py`). They turn NASA data into `docs/data/*.js`.
- `docs/`: the website, as static files. No build step, no npm, no framework. Plain ES5 IIFEs with `"use strict"` and `var`. three.js r147 is vendored in `docs/vendor/`.

The generated `docs/data/*.js` files are committed. Only touch the engine when the data itself must change.

## Commands

```bash
# Run the site: double-click docs/index.html (file:// works, offline).
# To exercise the service worker / PWA it must be served over http:
python3 -m http.server -d docs 8000

# Rebuild data (needs data_raw/ldem_80s_80m.img, 115 MB, from the PDS LOLA polar GDR; data_raw/ is gitignored)
cd engine
python build_sites.py          # all sites; calls NASA/JPL Horizons over the network (slow)
python build_sites.py MMO01    # one site (does not rewrite sites.js)
python build_moris.py          # Moon over Port Louis (Horizons only, no DEM)
python build_ridges.py         # must run AFTER build_sites: it asserts its hill line matches the site files within 0.02°
python build_terrain.py        # 3D ground tiles
python build_map.py            # docs/map.jpg
python validate.py             # needs NASA PGDA AVGVISIB .IMG files in data_raw/pgda/; writes docs/data/validation.js
python build_custom.py         # docs/data/dem/: 640 m coarse map + 80 m tiles (128 px) within ~170 km of the pole
node check_custom.mjs          # rebuilds the six sites the "custom place" way and compares (horizon, Sun/Earth, verdicts)
```

There is no linter. `validate.py` is the numeric check against NASA. Front-end: `tests/run.sh` runs browser tests in headless Firefox (needs `firefox`, `geckodriver`, Node 22+, Python 3; no npm packages): desktop, true 360/390 px phone widths (page inside an iframe, since Firefox windows can't be that narrow), custom places, the CSV, hostile links/rapid clicks/no WebGL/no storage, `file://`, and fixes from the Codex review. Every test also fails on any console error. Run it before pushing.

## Data contract (engine → website)

Every data file is a **JS script that sets a `window.LANDER_*` global**, not JSON. That's how the page works from `file://` without `fetch`. There is no `docs/DATA_FORMAT.md` (PLAN.md mentions one). The format is defined by what the build scripts write:

- `LANDER_SITES` (`sites.js`): the site index, from `engine/sites.json` (coords from Wueller et al. 2026).
- `LANDER_DATA[id]` (`<id>.js`): the horizon at 720 azimuths (0.5° steps), `horizons` keyed by panel height `"0.5"`/`"2"`/`"10"` m, and hourly `sun_az/sun_el/earth_az/earth_el` from `t0` = 2027-01-01T00:00Z for `n` hours (through 2028).
- `LANDER_RIDGES`: which hill blocks each direction, plus side-view profiles.
- `LANDER_TERRAIN[id]`: a 321×321 int16 base64 height grid. `terrain3d.js` lazy-loads it.
- `LANDER_MORIS`: a bit string, Moon up over Port Louis per hour.
- `LANDER_VALIDATION`: rows for the validation table.

Conventions: azimuth is clockwise from north (the Horizons convention), elevations are in degrees, and there is no atmosphere (Horizons is asked for `AIRLESS`). A time index everywhere means hours since `T0` = 2027-01-01 UTC.

## Website architecture

- `app.js` owns state (`site, start, days, batt, mast, hour`) and the science. `prep()` gives the fraction of the Sun's disc above the hills and whether Earth's centre is in view, per hour, cached per site|panel. `sim()` is the battery model: `RATE = 3` energy per hour in full Sun, load 1 per hour, battery measured in hours of load, dead lander never recovers. `refresh()` redraws everything and writes the state to the URL hash, which `readHash()` reads back.
- Add-on modules (`planner.js`, `extras.js`, `rescue.js`, `terrain3d.js`) **must not edit app.js calculations**. They plug in through `window.LANDER_APP`: `onRefresh(f)`, `onHour(f)`, `get()`, `setHour`, `setStart`, `setSite`, and `set({site, start, days, batt, mast})` to change several at once. Script order in `index.html` matters: data first, then `app.js`, then the add-ons.
- `mode.js` switches between **Simple** (the default) and **Mission planner**. Sections with class `pro` show only in planner mode. The choice is saved in `localStorage`, and `?mode=planner` / `?mode=simple` in the URL forces one. Hidden canvases have no size, so the switch fires `resize` to make charts redraw. New detailed sections should get `class="pro"`.
- **Custom places** ("Somewhere else"): `customcalc.js` (pure maths, also runs in Node) reproduces the engine in the browser: horizon from 80 m tiles within 10 km + the 640 m coarse map out to 200 km, ridge profiles, a 3D terrain square, and Sun/Earth tracks rotated from the nearest prepared site's Horizons table (Earth parallax corrected). `custom.js` lazy-loads `data/dem/*.js` with script tags (works on file://), then pushes a 7th entry into `LANDER_SITES`/`LANDER_DATA`/`LANDER_RIDGES`/`LANDER_TERRAIN` so every section treats it like a prepared site. Its id encodes the coordinates (`P<lat>_<lon>`), so a shared link rebuilds it; `app.js` saves the opening hash in `window.LANDER_HASH0` for this. The dem files are deliberately NOT in `sw.js` FILES (41 MB); the fetch handler caches the ones a user actually loads.
- `rescue.js` ("How do we save it?") appears only when the lander is lost. It tries five single changes (land later, bigger battery, higher panel, another site, shorter mission) using the same `sim()`, and each fix can be applied and undone.
- `planner.js` reimplements the sim to add science-task loads. Keep it consistent with `app.js` `sim()` if the battery model changes.

## Checklists

- **Adding or renaming any file under `docs/`:** add it to `FILES` in `docs/sw.js` and bump `CACHE` (`lander-vN`). Otherwise offline/PWA users get stale or missing files. The service worker is network-first, saves only good same-origin answers (never 404/500 pages), keeps `data/dem/*` in a separate `lander-dem` cache that survives updates, and on activate deletes only old `lander-vN` caches.
- **Adding a site:** add it to `engine/sites.json` and run the build scripts. Then add its `<script src="data/<id>.js">` to `index.html` and both data files to `sw.js`.

## Project rules (from PLAN.md / README)

- `main` must always open and run, offline, with no internet. The demo is offline.
- Write user-facing text in plain, short English. Be honest about limits: the battery model is simple, "Earth in view" means line of sight only, and our sunlight numbers run high vs. NASA.
- AI use must be disclosed. New files carry a "Written with AI assistance (Claude)" note like the existing ones. No NASA logos or branding.
- Cite every NASA data source used. Don't claim Quickmap or Moon Trek unless someone actually used them.
