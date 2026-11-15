# Tests

Browser tests for the website in headless Firefox, driven over WebDriver with plain Node (no packages to install).

Needs Bash (for `tests/run.sh`), `firefox`, `geckodriver`, Node 22 or newer, and Python 3 (for a local web server). Run:

```bash
tests/run.sh
```

| File | What it checks |
|---|---|
| `general.mjs` | Page loads, verdict, no sideways scroll, every site x 24 dates, Play, shared links, "How do we save it?", Simple / Mission planner, offline cache |
| `phone.mjs` | The page inside an iframe exactly 360 or 390 px wide (Firefox windows cannot be that narrow): layout, rescue, Play |
| `custom.mjs` | "Somewhere else": limits, typed place, map tap, every section, shared link, map dots |
| `numbers.mjs` | "The numbers": 12-column interval CSV, start/end UTC boundaries, first dark-hour battery, final mission time, battery matches the verdict, custom places, download button |
| `stress.mjs` | Broken and hostile links, 60 rapid clicks, double clicks while a place is worked out, storage blocked, WebGL off |
| `review.mjs` | The fixes from the Codex review: compare switch, end-of-data countdown, keyboard hour, hook validation, 90° S, coordinate rounding, offline cache never saves errors |
| `replay.mjs` | The 3D mission replay: starts beside the lander following the Sun, arrow cursor, the wheel scrolls the page and Ctrl + wheel zooms, + and −, Play, looking around, zooming out over the region, the lander's eye, Look at Earth, a blocking ridge found and labelled, the flat 360° view |
| `science.mjs` | Disc area boundaries, symmetry, exposure hours, Earth windows, 4,308-case sweep and rescue consistency |
| `../engine/check_custom.mjs` | Six-site consistency; finite geometry/fractions, nonempty comparisons and worst verdict agreement at least 96% |

Every test also fails on any JavaScript error in the console. Written with AI assistance (Claude).

The 96% regression floor was chosen from the audit's existing 96.9% baseline with less than one percentage point tolerance, before running the corrected checker. This is a consistency gate, not physical accuracy. Invalid inputs or agreement below the floor exit nonzero. The runner records checker failures through the same helper as browser failures. Run pure numerical checks separately with `node tests/science.mjs` and `node engine/check_custom.mjs`; the full runner requires Bash, Firefox and geckodriver on PATH (plain PowerShell is insufficient).

Earth samples represent half-open hourly intervals [i, i+1), clipped to the selected mission. Ties select the earliest longest outage. The next visible interval includes an interval already visible at landing. Powered windows end at battery depletion, independently of the full geometric schedule.

Corrected-area result (2026-11-15): worst custom/prepared agreement is 95.8333% (Mons Mouton, 60 days / 240-hour battery), so the predeclared 96% gate currently fails. The threshold is intentionally retained; investigate that geometry/near-threshold battery sensitivity separately rather than relaxing it after observing the result.

## Phone look-around (gyro)

- `node tests/gyro.mjs`: the pure orientation maths in `docs/gyro.js` (neutral pose, turns, portrait/landscape, re-centre, 359 to 0 wrap, bad readings). No browser needed.
- `tests/gyro_sim.mjs` with `tests/_gyro_sim.html`: the whole mode in headless Chrome at 390 px with simulated sensor events (no readings, denied, granted, enter/exit, time moving, place/panel/camera changes). See the usage line at the top of the script.
- Neither replaces a real phone: motion permission prompts and real sensors must be checked by hand on Android Chrome and iPhone Safari over HTTPS.
