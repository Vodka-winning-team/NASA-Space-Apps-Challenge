# How close are we to NASA's own maps?

We checked our numbers against maps published by NASA Goddard.

**NASA's maps:** LOLA-derived polar illumination maps, NASA GSFC Planetary Geodesy Data Archive, https://pgda.gsfc.nasa.gov/products/69 (Mazarico et al. 2011, Icarus 211). Files `AVGVISIB_85S_060M_201608` (Sun) and `AVGVISIB_85S_060M_201608_EARTH` (Earth). They give the share of time the Sun (any part of its disc) or the Earth is visible, averaged over 18.6 years, at 60 m per pixel.

**Our numbers:** every hour of 2027 and 2028, from the 80 m height map, using the same definition (any part of the Sun's disc; centre of the Earth), for three solar panel heights.

Run it yourself: `python engine/validate.py`.

## Result

Share of time visible, in percent.

| Site | Sun, ours 0.5 m | Sun, ours 2 m | Sun, ours 10 m | Sun, NASA | Earth, ours 0.5 m | Earth, ours 2 m | Earth, ours 10 m | Earth, NASA |
|---|---|---|---|---|---|---|---|---|
| Malapert Massif | 70.7 | 78.8 | 85.8 | 64.0 | 62.3 | 69.1 | 82.7 | 70.9 |
| Mons Mouton | 74.7 | 76.8 | 82.6 | 73.8 | 58.0 | 60.9 | 68.7 | 60.7 |
| Nobile Rim 1 | 73.1 | 77.7 | 84.5 | 54.2 | 61.7 | 68.6 | 70.2 | 66.4 |
| de Gerlache Rim 2 | 65.8 | 71.3 | 75.1 | 60.9 | 51.8 | 55.7 | 57.3 | 54.1 |
| Haworth | 55.5 | 62.9 | 65.0 | 54.0 | 51.6 | 51.9 | 53.1 | 53.5 |
| Slater Plain | 51.4 | 53.6 | 54.3 | 48.5 | 43.5 | 43.5 | 43.6 | 46.3 |

| | Average difference from NASA | Largest difference |
|---|---|---|
| Earth, panel at 2 m | 1.7 points | 2.8 points |
| Sun, panel at 0.5 m | 6.0 points higher | 18.9 points (Nobile Rim 1) |
| Sun, panel at 2 m | 10.9 points higher | 23.5 points (Nobile Rim 1) |

## What we take from it

- **Earth visibility agrees well** with NASA: within 3 points at every site with the panel at 2 m.
- **Our sunlight is on the generous side** at every site. So a "Survived" by a small margin deserves caution. A "Died" is the safer signal.
- **Panel height matters a lot on ridge tops.** Raising the panel from 0.5 m to 10 m adds up to 15 points of sunlight at Malapert Massif. This is also where an 80 m map is weakest, because it cannot see small bumps close to the lander.

## Why the numbers differ

We have not proven the cause. Likely reasons:

- NASA's map is for the ground surface on a 60 m grid; ours puts a panel above an 80 m grid, which smooths the ground near the lander.
- NASA averages 18.6 years; we cover two.
- One NASA pixel is 60 m wide, and on ridge tops neighbouring pixels differ by 20 points or more, so the exact point chosen matters.

---
Drafted with AI assistance (Claude).
