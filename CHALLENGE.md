# The official challenge, and how we measure up

Source: https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/ (read on 14 Nov 2026, 23:15).

## The challenge in one paragraph (official wording)

> Missions to the Moon's south pole face extreme lighting and communication constraints, and planning them takes careful coordination between science and engineering teams. Tools for determining Sun and Earth positions at candidate landing sites exist, but their complicated interfaces make it difficult to evaluate critical information with efficiency. Your challenge is to create an intuitive tool or application that lets mission planners, educators, and the public compare landing sites and dates quickly, visualizing Sun and Earth positions relative to the horizon to assess power generation potential and direct-to-Earth communication windows.

Difficulty: Intermediate to Advanced. Subjects: Human Exploration, Moon, Software, Space Exploration.

The background stresses one situation above all: **launch delays and hardware problems force planners to reconsider the landing date or place, and they need to compare alternatives fast.** That is what our "What if we land a few days later?" section does.

## Official resources

A global award needs at least one NASA resource from this list.

| Resource | What it is | Do we use it? |
|---|---|---|
| [Horizons System](https://ssd.jpl.nasa.gov/horizons/) (NASA/JPL) | Positions of the Sun and Earth as seen from any place on the Moon | **Yes. It is the core of our tool.** Every Sun and Earth position comes from it. |
| [Quickmap](https://quickmap.lroc.asu.edu/) (Arizona State University, LRO data) | Map viewer for lunar imagery and terrain | No |
| [Moon Trek](https://trek.nasa.gov/moon/) (NASA) | 3D viewer of the lunar surface | No |
| [CSA Moon Exploration](https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/) (partner agency, optional) | Canada's lunar exploration portal | No |

The challenge text also names **LOLA topography** as a suggested data source. We use it for every horizon.

Do not claim Quickmap or Moon Trek in the submission unless someone on the team really uses them, for example to check a landing place by eye. If someone does, note here what was checked.

## Official objectives, against what we have

| What the challenge suggests | Where we stand |
|---|---|
| Choose from a curated list of notable landing sites | Yes: six candidate south pole sites |
| Input custom lunar coordinates | Yes: "Somewhere else": type coordinates or tap the map, anywhere south of 85° S. The horizon is worked out in the browser from NASA LOLA (80 m near the lander, 640 m beyond 10 km). Tested against the six prepared sites: same verdict on 97 to 100% of landing days (`node engine/check_custom.mjs`) |
| Side-by-side or sequential comparison of sites | Yes: "How does another place compare?" shows two places on the same date, plus the two-year stripes for all six |
| Select landing dates, explore lunar days and seasons | Yes |
| Show Sun and Earth relative to the horizon | Yes: the view from the lander |
| **Time remaining before sunset or Earthset** (mentioned twice) | Yes: shown under the view, and it updates as the mission plays |
| **Solar elevation angle, shown prominently** | Yes: "Sun's height" under the view, with how far it clears the hills |
| Duration of sunlight, Earth visibility windows | Yes: percentages and the strips under the battery chart |
| 2D maps, 3D surface views | Yes: 2D view, a 2D map, and a 3D view of the ground (NASA LOLA) lit by the Sun at the chosen hour |
| Animations or timelines over lunar days | Yes: Play the mission |
| Serve planners and the public alike | Public: yes. Planners: no detailed numbers or export yet |
| Help when launch delays force a new date | Yes: this is our strongest section |
| Real topography for the horizon | Yes: LOLA, 80 m per pixel |
| No atmosphere, so no bending of light at the horizon | Yes: requested from Horizons as airless |
| Earth's libration (wobble) | Yes: included in the Horizons positions |

## Cheapest gaps to close, in order

Done on 14 Nov, 23:40: sunset and Earthset countdown, Sun's and Earth's height, side-by-side comparison (all in `docs/extras.js`).

Still open:

1. ~~Custom coordinates~~: done on 15 Nov (`docs/custom.js`, `docs/customcalc.js`).
2. **Detailed numbers or an export for planners.**
3. ~~A 3D surface view~~: done (`docs/terrain3d.js`).

---
Drafted with AI assistance (Claude). The quoted paragraph is NASA's text.
