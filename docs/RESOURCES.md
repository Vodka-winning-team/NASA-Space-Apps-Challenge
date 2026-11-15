# Resources we used (task S1)

Every data source, paper and tool behind "Will the lander survive?", with a link and what we used it for. All links open without a login.

The official challenge page and its Resources tab are copied in [CHALLENGE.md](../CHALLENGE.md). The challenge page is https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/ .

## 1. From the official Resources tab

A global award needs at least one NASA resource from this list. We use Horizons.

| Resource | Link | Used? | What for |
|---|---|---|---|
| **NASA/JPL Horizons System** | https://ssd.jpl.nasa.gov/horizons/ (we call its API: https://ssd.jpl.nasa.gov/api/horizons.api) | **Yes** | The direction (azimuth and elevation) and apparent size of the Sun and the Earth in the sky of each of the six sites, every hour of 2027 and 2028. Asked for as seen from a point on the Moon's surface, with no atmosphere (`AIRLESS`). Earth's wobble in the sky (libration) is included in these positions. Also the direction of the Moon from Port Louis, Mauritius, every hour, for the "Can Mauritius see it?" section. Script: `engine/horizons.py`. |
| Quickmap (Arizona State University, LRO data) | https://quickmap.lroc.asu.edu/ | No | Not used. |
| Moon Trek (NASA) | https://trek.nasa.gov/moon/ | No | Not used. |
| CSA Moon Exploration (Canadian Space Agency, partner agency, optional) | https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/ | No | Not used. |

## 2. Named in the challenge text

The challenge text names **LOLA topography** as a suggested data source. It is not one of the four links on the Resources tab, but it is NASA data and we use it everywhere.

| Resource | Link | What for |
|---|---|---|
| **NASA LRO LOLA gridded elevation, LDEM_80S_80M** (Lunar Reconnaissance Orbiter, Lunar Orbiter Laser Altimeter; south pole height map, 80 m per pixel, from 80° S to the pole), NASA PDS Geosciences Node | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ (file `ldem_80s_80m.img`, 115 MB) | 1. The hill line (horizon) around each site: we look out in 720 directions (every 0.5°), up to 200 km, and keep the highest hill in each direction. The Moon's curve is included. Done for solar panel heights of 0.5 m, 2 m and 10 m above the ground (`engine/moonmap.py`, `engine/build_sites.py`).<br>2. "Which hill hid the Sun?": the hill that blocks each direction, and a side view of the ground (`engine/build_ridges.py`).<br>3. The 3D view: a square of ground 25.6 km across around each site (`engine/build_terrain.py`).<br>4. The small map of the south pole on the page, a shaded picture of the height map, not a photo (`engine/build_map.py`).<br>5. The 3D mission replay: the wider land around each site, out to the edge of the map, at 1.6 km detail (`engine/build_far.py`). |

5. "Somewhere else" (land anywhere south of 85° S): the same LOLA map, cut into 80 m tiles for the ground within about 18 km of the lander, plus a copy averaged to 640 m for hills further away (`engine/build_custom.py`). The browser works out the hill line, the side views and the 3D ground from these. Rebuilding each of the six prepared sites this way gives the same survived/lost answer on 97 to 100% of landing days (`engine/check_custom.mjs`).

## 3. Other NASA resources we used

| Resource | Link | What for |
|---|---|---|
| **NASA GSFC Planetary Geodesy Data Archive (PGDA): LOLA-derived polar illumination maps** (Mazarico et al. 2011). Files `AVGVISIB_85S_060M_201608` (Sun) and `AVGVISIB_85S_060M_201608_EARTH` (Earth): share of time the Sun or Earth is visible, averaged over 18.6 years, 60 m per pixel. | https://pgda.gsfc.nasa.gov/products/69 | Only to check our numbers. We compared our share of time with Sun and Earth in view at the six sites against these maps. Results in [VALIDATION.md](../VALIDATION.md) and in the "How this works" panel of the website. Script: `engine/validate.py`. |
| **NASA Scientific Visualization Studio (SVS): The Blue Marble** (the whole Earth from NASA satellite data, `bluemarble-2048.png`, public domain) | https://svs.gsfc.nasa.gov/2915 | The picture on the Earth in the 3D mission replay (`docs/data/far/earth.jpg`, built by `engine/build_far.py`). The Earth is put where NASA/JPL Horizons says it is and lit from the Sun's side, so it shows its real phase. |

## 4. Papers and other data (not from a space agency)

| Resource | Link | What for |
|---|---|---|
| **Wueller et al. (2026)**, JGR Planets 131(3), e2025JE009434 | Paper: https://doi.org/10.1029/2025JE009434 . Data: https://doi.org/10.5281/zenodo.17084058 (CC BY 4.0) | The coordinates of the six candidate landing sites: Malapert Massif (MMA_K2023), Mons Mouton (MMO01), Nobile Rim 1 (NR101), de Gerlache Rim 2 (dGR201), Haworth (HW06), Slater Plain (SP07). See `engine/sites.json`. |
| **Mazarico, E. et al. (2011)**, "Illumination conditions of the lunar polar regions using LOLA topography", Icarus 211 | https://doi.org/10.1016/j.icarus.2010.10.030 | The paper behind NASA's illumination maps above. We cite it for the validation. |

## 5. Software, fonts and hosting

| Resource | Link | Licence | What for |
|---|---|---|---|
| three.js r147 (with OrbitControls) | https://github.com/mrdoob/three.js/releases/tag/r147 | MIT (copy in `docs/vendor/LICENSE-three.txt`) | The 3D view of the ground. Stored in `docs/vendor/`, so it works offline. |
| Archivo (font) | https://fonts.google.com/specimen/Archivo | SIL Open Font License | Main text. Stored in `docs/fonts/`. |
| JetBrains Mono (font) | https://fonts.google.com/specimen/JetBrains+Mono | SIL Open Font License | Small labels and numbers. Stored in `docs/fonts/`. |
| Python 3 with numpy and requests (Pillow for the map picture) | https://numpy.org/ , https://requests.readthedocs.io/ , https://python-pillow.org/ | Open source | The engine scripts in `engine/` that turn NASA data into the website's data files. |
| GitHub Pages | https://pages.github.com/ | Free hosting | The public link: https://vodka-winning-team.github.io/NASA-Space-Apps-Challenge/ |

The website itself is plain HTML, CSS and JavaScript (drawing on canvas). It has no framework and no build step.

## 6. AI tools

| Tool | What for |
|---|---|
| Claude (Anthropic) | Code, data scripts and text, written with AI assistance. |
| OpenAI Codex | Review, and parts of the work on the last night (for example the science task planner, `docs/planner.js`). |

All science comes from the NASA data and the papers above. No AI-made images. No NASA logos or branding.

## Not used

Quickmap, Moon Trek and the CSA portal are on the Resources tab, but nobody on the team used them. Do not claim them in the submission. If someone does use one (for example to look at a landing place by eye), add a line here saying what was checked.

---
Drafted with AI assistance (Claude).
