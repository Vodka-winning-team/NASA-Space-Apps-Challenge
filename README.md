# Will the lander survive?

NASA Space Apps Challenge 2026, Port Louis. Challenge: **Lunar Landing Site Navigator**.

Pick a landing site near the Moon's south pole and a landing date. The tool shows the Sun and Earth against the real horizon of that site, runs a battery through the mission, and tells you whether the lander survives. A calendar shows what happens if the landing is late.

- Idea in plain words: [IDEA.md](IDEA.md)
- Team plan: [PLAN.md](PLAN.md)
- Task list: [TASKS.md](TASKS.md)

## Open it

Double-click `docs/index.html`. It needs no internet and no installation.

## What is in this repo

| Folder | What |
|---|---|
| `docs/` | The website. `docs/data/` holds the numbers for each site. |
| `engine/` | Python scripts that build `docs/data/` from NASA data. |

## Rebuild the data (optional)

Needs Python 3 with `numpy` and `requests`.

1. Download `ldem_80s_80m.img` (115 MB) from the NASA PDS Geosciences Node, LOLA polar gridded data, into `data_raw/`:
   https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/
2. `cd engine`, then `python build_sites.py` and `python build_moris.py`.

## Data and sources

- **NASA LRO LOLA** gridded elevation, LDEM_80S_80M, NASA PDS Geosciences Node. Used for the horizon around each site.
- **NASA/JPL Horizons** (https://ssd.jpl.nasa.gov/horizons/). Used for the direction of the Sun and Earth from each site, and of the Moon from Port Louis, every hour of 2027 and 2028.
- **Wueller et al. (2026)**, JGR Planets 131(3), e2025JE009434, data at https://doi.org/10.5281/zenodo.17084058 (CC BY 4.0). Used for the coordinates of the six candidate landing sites.
- Fonts: Archivo and JetBrains Mono (SIL Open Font License).

## Limits

The battery is a simple model. "Earth in view" means line of sight, not a guaranteed radio link. The height map has 80 m pixels and ends at 80 degrees south. Full list in the "How this works" panel of the website.

This is a hackathon project. It is not a NASA product and is not endorsed by NASA.

## Use of AI

Code, data scripts and text in this repo were written with AI assistance (Claude). No NASA logos or branding are used.
