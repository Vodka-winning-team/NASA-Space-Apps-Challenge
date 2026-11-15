"""Build the pictures and heights for the 3D Moon globe on the website.

  docs/data/globe/moon.jpg    the whole Moon, 2048 x 1024, from the NASA SVS CGI Moon Kit
                              (LRO LROC WAC colour mosaic, lroc_color_poles_2k.tif, public domain:
                              https://svs.gsfc.nasa.gov/4720). Longitude 0 in the middle.
  docs/data/globe/pole.jpg    the south pole cap in detail (polar stereographic, the whole 80 S map),
                              shaded from NASA LRO LOLA LDEM_80S_80M, same picture style as the globe
  docs/data/globe/pole.js     heights of that cap on a 241 x 241 grid (2.5 km), for the relief on the globe

Usage:  python build_globe.py path/to/lroc_color_poles_2k.tif     (and data_raw/ldem_80s_80m.img)

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
OUT = os.path.join(HERE, "..", "docs", "data", "globe")
TEX_PX = 1536          # pole picture size
GRID = 241             # pole height grid
HALF_M = moonmap.C0 * moonmap.SCALE          # 303,960 m: the whole map, out to 80 S


def block_mean(a, n):
    k = a.shape[0] // n
    a = a[:k * n, :k * n]
    return a.reshape(n, k, n, k).mean(axis=(1, 3))


def main():
    os.makedirs(OUT, exist_ok=True)

    # 1. the whole Moon
    src = sys.argv[1]
    im = Image.open(src).convert("RGB")
    if im.size != (2048, 1024):
        im = im.resize((2048, 1024), Image.LANCZOS)
    im.save(os.path.join(OUT, "moon.jpg"), quality=86, optimize=True)
    globe_px = np.asarray(im, dtype=np.float32)

    # 2. the pole cap picture: hillshade of the LOLA map, toned to match the LROC colours around 80 S
    z = moonmap.dem().astype(np.float32) * 0.5
    zz = np.asarray(Image.fromarray(z, mode="F").resize((TEX_PX, TEX_PX), Image.BOX), dtype=np.float32)   # the whole map, edge to edge
    cell = 2 * HALF_M / TEX_PX
    gy, gx = np.gradient(zz, cell)
    az, alt = np.radians(315.0), np.radians(40.0)
    slope = np.arctan(np.hypot(gx, gy) * 1.4)
    aspect = np.arctan2(-gx, gy)
    shade = np.clip(np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect), 0, 1)
    ring = globe_px[int(1024 * (170.0 / 180.0)):int(1024 * (172.0 / 180.0))]      # 80-82 S on the LROC map
    tone = ring.reshape(-1, 3).mean(axis=0) / 255.0
    v = np.clip(0.30 + 0.85 * shade, 0, 1.15)
    rgb = np.clip(v[..., None] * tone[None, None, :] * 255 * 1.05, 0, 255).astype(np.uint8)
    Image.fromarray(rgb).save(os.path.join(OUT, "pole.jpg"), quality=82, optimize=True)

    # 3. the pole cap heights (metres above the 1737.4 km sphere)
    # sample exactly at grid nodes spanning -HALF_M..+HALF_M
    xs = np.linspace(-HALF_M, HALF_M, GRID)
    X, Y = np.meshgrid(xs, -xs)                    # row 0 = +y (toward longitude 0)
    rows = np.clip(np.round(moonmap.C0 - Y / moonmap.SCALE).astype(int), 0, moonmap.N - 1)
    cols = np.clip(np.round(moonmap.C0 + X / moonmap.SCALE).astype(int), 0, moonmap.N - 1)
    k = 16                                          # smooth over 16 px (1.3 km) so the 2.5 km grid does not alias
    pad = np.pad(z, k, mode="edge")
    cs = pad.cumsum(0).cumsum(1)
    def boxmean(r, c):
        r, c = r + k, c + k
        a = cs[r + k, c + k] - cs[r - k, c + k] - cs[r + k, c - k] + cs[r - k, c - k]
        return a / (2 * k) ** 2
    zg = np.round(boxmean(rows, cols)).astype("<i2")
    with open(os.path.join(OUT, "pole.js"), "w") as f:
        f.write("window.LANDER_GLOBE=")
        json.dump({"n": GRID, "half_m": HALF_M, "radius_m": moonmap.R, "min_m": int(zg.min()), "max_m": int(zg.max()),
                   "z_b64": base64.b64encode(zg.tobytes()).decode("ascii"),
                   "sources": "NASA SVS CGI Moon Kit (LRO LROC WAC colour); NASA LRO LOLA LDEM_80S_80M"}, f, separators=(",", ":"))
        f.write(";" + chr(10))
    for n in ("moon.jpg", "pole.jpg", "pole.js"):
        print(n, os.path.getsize(os.path.join(OUT, n)) // 1024, "KB")
    print("pole cap heights", zg.min(), "to", zg.max(), "m; tone", np.round(tone, 3))


if __name__ == "__main__":
    main()
