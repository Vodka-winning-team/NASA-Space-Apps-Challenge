"""Build docs/data/terrain_<site>.js: a square of ground around each site for the 3D view.

The square is 25.6 km across, sampled every 80 m (the map's own pixel size),
laid out east (columns) by north (rows, north first) around the landing site.
Heights are metres relative to the landing site's ground, with the Moon's
curve included (far edges sit a little lower).

Data: NASA LRO LOLA LDEM_80S_80M. Needs data_raw/ldem_80s_80m.img.
Stored as base64 little-endian int16 so the files stay small.

Usage:  python build_terrain.py

Code written with AI assistance (Claude).
"""
import base64
import json
import os

import numpy as np

import moonmap

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "docs", "data")
SIZE_M = 25600.0
STEP_M = 80.0


def tile(lat, lon):
    R = moonmap.R
    n = int(SIZE_M / STEP_M) + 1                      # 321 x 321 points
    half = SIZE_M / 2
    e = np.linspace(-half, half, n)                   # east, west to east
    nn = np.linspace(half, -half, n)                  # north, north row first
    E, N = np.meshgrid(e, nn)
    dist = np.hypot(E, N)
    bearing = np.degrees(np.arctan2(E, N)) % 360.0    # clockwise from north
    la, lo = moonmap._destination(lat, lon, bearing, np.maximum(dist, 0.01))
    z = moonmap.height(la, lo)
    z0 = float(moonmap.height(lat, lon))
    z = z - z0 - dist ** 2 / (2 * R)                   # relative to the site, curve included
    if np.isnan(z).any():
        raise RuntimeError("tile runs off the height map")
    zi = np.round(z).astype("<i2")
    return n, zi, float(z.min()), float(z.max())


def main():
    with open(os.path.join(HERE, "sites.json")) as f:
        sites = json.load(f)
    for s in sites:
        n, zi, lo, hi = tile(s["lat"], s["lon"])
        out = {"id": s["id"], "n": n, "step_m": STEP_M, "size_m": SIZE_M, "min_m": round(lo), "max_m": round(hi),
               "z_b64": base64.b64encode(zi.tobytes()).decode("ascii")}
        path = os.path.join(OUT, "terrain_" + s["id"] + ".js")
        with open(path, "w") as f:
            f.write("window.LANDER_TERRAIN=window.LANDER_TERRAIN||{};window.LANDER_TERRAIN[%s]=" % json.dumps(s["id"]))
            json.dump(out, f, separators=(",", ":"))
            f.write(";" + chr(10))
        print("%-10s %dx%d  heights %6.0f to %5.0f m  %d KB" % (s["id"], n, n, lo, hi, os.path.getsize(path) // 1024), flush=True)


if __name__ == "__main__":
    main()
