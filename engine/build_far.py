"""Build the wide view around the landing sites for the 3D mission replay.

  docs/data/far/relief.js   heights of the whole 80 S map on a 381 x 381 grid (1.6 km), polar stereographic,
                            row 0 toward longitude 0. For the land beyond the 26 km detailed square.
  docs/data/far/shade.jpg   a picture of the same area that shows craters and ridges whatever the Sun's
                            direction: steep ground darker, high ground a little lighter (not a photo).
  docs/data/far/earth.jpg   the Earth, from NASA's Blue Marble (NASA SVS 2915, public domain).

Data: NASA LRO LOLA LDEM_80S_80M (data_raw/ldem_80s_80m.img).
Usage:  python build_far.py path/to/bluemarble-2048.png

Code written with AI assistance (Claude).
"""
import base64
import json
import os
import sys

import numpy as np
from PIL import Image

import moonmap

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "docs", "data", "far")
GRID = 381
TEX = 2048
HALF_M = moonmap.C0 * moonmap.SCALE


def main():
    os.makedirs(OUT, exist_ok=True)
    z = moonmap.dem().astype(np.float32) * 0.5

    # heights: mean over the 1.6 km around each grid node
    xs = np.linspace(-HALF_M, HALF_M, GRID)
    X, Y = np.meshgrid(xs, -xs)
    rows = np.clip(np.round(moonmap.C0 - Y / moonmap.SCALE).astype(int), 0, moonmap.N - 1)
    cols = np.clip(np.round(moonmap.C0 + X / moonmap.SCALE).astype(int), 0, moonmap.N - 1)
    k = 10
    pad = np.pad(z.astype(np.float64), k, mode="edge")
    cs = pad.cumsum(0).cumsum(1)
    r, c = rows + k, cols + k
    zg = (cs[r + k, c + k] - cs[r - k, c + k] - cs[r + k, c - k] + cs[r - k, c - k]) / (2 * k) ** 2
    zg = np.round(zg).astype("<i2")
    with open(os.path.join(OUT, "relief.js"), "w") as f:
        f.write("window.LANDER_FAR=")
        json.dump({"n": GRID, "half_m": HALF_M, "radius_m": moonmap.R,
                   "z_b64": base64.b64encode(zg.tobytes()).decode("ascii"),
                   "source": "NASA LRO LOLA LDEM_80S_80M"}, f, separators=(",", ":"))
        f.write(";" + chr(10))

    # picture: slope and height only, so it does not fight the moving sunlight
    zz = np.asarray(Image.fromarray(z, mode="F").resize((TEX, TEX), Image.BOX), dtype=np.float32)
    cell = 2 * HALF_M / TEX
    gy, gx = np.gradient(zz, cell)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    big = np.asarray(Image.fromarray(zz, mode="F").resize((TEX // 16, TEX // 16), Image.BOX).resize((TEX, TEX), Image.BICUBIC), dtype=np.float32)
    local = np.clip((zz - big) / 900.0, -1, 1)                 # above or below the ground around it
    v = np.clip(0.80 - 0.016 * slope + 0.16 * local, 0.25, 1.0)
    rgb = np.stack([v * 255, v * 252, v * 243], axis=-1).astype(np.uint8)
    Image.fromarray(rgb).save(os.path.join(OUT, "shade.jpg"), quality=80, optimize=True)

    if len(sys.argv) > 1:
        Image.open(sys.argv[1]).convert("RGB").resize((1024, 512), Image.LANCZOS).save(os.path.join(OUT, "earth.jpg"), quality=84, optimize=True)
    for n in sorted(os.listdir(OUT)):
        print(n, os.path.getsize(os.path.join(OUT, n)) // 1024, "KB")


if __name__ == "__main__":
    main()
