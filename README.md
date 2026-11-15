# Will the lander survive?

NASA Space Apps Challenge 2026, Port Louis. Challenge: **Lunar Landing Site Navigator**.

Pick a landing site near the Moon's south pole and a landing date. The tool shows the Sun and Earth against the real horizon of that site, runs a battery through the mission, and tells you whether the lander survives. A calendar shows what happens if the landing is late.

- Idea in plain words: [IDEA.md](IDEA.md)
- Team plan: [PLAN.md](PLAN.md)
- Task list: [TASKS.md](TASKS.md)

## Open it

**Live:** https://vodka-winning-team.github.io/NASA-Space-Apps-Challenge/ (works on phones, and can be added to the home screen; after the first visit it also works offline).

Or double-click `docs/index.html`. It needs no internet and no installation.

## What is in this repo

| Folder | What |
|---|---|
| `docs/` | The website. `docs/data/` holds the numbers for each site. |
| `engine/` | Python scripts that build `docs/data/` from NASA data. |

## Rebuild the data (optional)

Needs Python 3 with `numpy` and `requests` (and `Pillow` for the map picture).

1. Download `ldem_80s_80m.img` (115 MB) from the NASA PDS Geosciences Node, LOLA polar gridded data, into `data_raw/`:
   https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/
2. `cd engine`, then run in this order:
   - `python build_sites.py`: the hill line, Sun and Earth for each site (asks NASA/JPL Horizons, needs internet)
   - `python build_moris.py`: the Moon over Port Louis
   - `python build_ridges.py`: which hill blocks each direction (run after `build_sites.py`; it checks against those files)
   - `python build_terrain.py`: the ground for the 3D view
   - `python build_map.py`: the small map picture
   - `python validate.py`: the check against NASA's sunlight maps (needs the NASA files listed in VALIDATION.md)
   - `python build_far.py path/to/bluemarble-2048.png`: the wider land and the Earth picture for the 3D mission replay
   - `python build_custom.py`: the height maps the website uses for "Somewhere else" (any place south of 85° S)
   - `node check_custom.mjs`: checks "Somewhere else" against the six prepared sites

## Data and sources

- **NASA LRO LOLA** gridded elevation, LDEM_80S_80M, NASA PDS Geosciences Node. Used for the horizon around each site.
- **NASA/JPL Horizons** (https://ssd.jpl.nasa.gov/horizons/). Used for the direction of the Sun and Earth from each site, and of the Moon from Port Louis, every hour of 2027 and 2028.
- **NASA SVS Blue Marble** (https://svs.gsfc.nasa.gov/2915). Used for the picture of the Earth in the 3D mission replay.
- **Wueller et al. (2026)**, JGR Planets 131(3), e2025JE009434, data at https://doi.org/10.5281/zenodo.17084058 (CC BY 4.0). Used for the coordinates of the six candidate landing sites.
- Fonts: Archivo and JetBrains Mono (SIL Open Font License).

## Limits

The battery is a simple model. "Earth in view" means line of sight, not a guaranteed radio link. The height map has 80 m pixels and ends at 80 degrees south. Full list in the "How this works" panel of the website.

This is a hackathon project. It is not a NASA product and is not endorsed by NASA.

## Use of AI

Code, data scripts and text in this repo were written with AI assistance (Claude, and OpenAI Codex for a code review and the hour-by-hour numbers section). All science comes from NASA data and published papers, listed above. No NASA logos or branding are used.

## 360° lunar look-around (phones)

In "Watch the mission", phones show a **Look around with your phone** button. Tap it and turn the phone to look around the landing site from the lander's eye; **Re-centre** faces the Sun's direction again, **Exit look-around** returns to the normal controls.

- It uses the phone's motion sensors only. The camera and location are never used.
- Directions are relative to the virtual Moon scene, not the real sky above you.
- It needs HTTPS and a browser that provides orientation readings; some browsers ask for motion permission first. If readings are unavailable or refused, dragging still works.
- Checked with simulated sensor readings in headless Chrome. Not yet checked on real Android or iPhone devices.
