# Tests

Browser tests for the website in headless Firefox, driven over WebDriver with plain Node (no packages to install).

Needs `firefox`, `geckodriver`, Node 22 or newer, and Python 3 (for a local web server). Run:

```bash
tests/run.sh
```

| File | What it checks |
|---|---|
| `general.mjs` | Page loads, verdict, no sideways scroll, every site x 24 dates, Play, shared links, "How do we save it?", Simple / Mission planner, offline cache |
| `phone.mjs` | The page inside an iframe exactly 360 or 390 px wide (Firefox windows cannot be that narrow): layout, rescue, Play |
| `custom.mjs` | "Somewhere else": limits, typed place, map tap, every section, shared link, map dots |
| `numbers.mjs` | "The numbers": CSV rows and columns, battery matches the verdict, custom places, download button |
| `stress.mjs` | Broken and hostile links, 60 rapid clicks, double clicks while a place is worked out, storage blocked, WebGL off |
| `review.mjs` | The fixes from the Codex review: compare switch, end-of-data countdown, keyboard hour, hook validation, 90° S, coordinate rounding, offline cache never saves errors |
| `../engine/check_custom.mjs` | "Somewhere else" maths against the six prepared sites |

Every test also fails on any JavaScript error in the console. Written with AI assistance (Claude).
