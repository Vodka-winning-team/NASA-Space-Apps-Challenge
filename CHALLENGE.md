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
| Input custom lunar coordinates | **Missing** |
| Side-by-side or sequential comparison of sites | Partly: the two-year stripes compare all six; no side-by-side view of two |
| Select landing dates, explore lunar days and seasons | Yes |
| Show Sun and Earth relative to the horizon | Yes: the view from the lander |
| **Time remaining before sunset or Earthset** (mentioned twice) | **Missing** |
| **Solar elevation angle, shown prominently** | **Missing**: we have the number but do not show it |
| Duration of sunlight, Earth visibility windows | Yes: percentages and the strips under the battery chart |
| 2D maps, 3D surface views | 2D view and a 2D map; no 3D |
| Animations or timelines over lunar days | Yes: Play the mission |
| Serve planners and the public alike | Public: yes. Planners: no detailed numbers or export yet |
| Help when launch delays force a new date | Yes: this is our strongest section |
| Real topography for the horizon | Yes: LOLA, 80 m per pixel |
| No atmosphere, so no bending of light at the horizon | Yes: requested from Horizons as airless |
| Earth's libration (wobble) | Yes: included in the Horizons positions |

## Cheapest gaps to close, in order

1. **Sunset and Earthset countdown**: "Sun sets in 31 hours", "Earth sets in 5 hours" beside the view. Small.
2. **Sun's height above the level horizon, in degrees**, shown beside the view. Small.
3. **Side-by-side comparison of two places.** Medium.
4. **Custom coordinates** (land anywhere). Large, and the answers would be rougher than for the six prepared sites.

---
Drafted with AI assistance (Claude). The quoted paragraph is NASA's text.
