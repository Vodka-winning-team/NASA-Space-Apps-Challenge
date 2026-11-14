"""Build the height maps the website uses to work out the horizon of ANY place south of 85 degrees S.

Two layers, both from NASA LRO LOLA LDEM_80S_80M:
  docs/data/dem/coarse.js       the whole map at 640 m per pixel (8 x 8 blocks averaged), for far hills
  docs/data/dem/f_<row>_<col>.js  the full 80 m map in tiles of 128 x 128 pixels (10.24 km), for the
                                ground near the lander. Only tiles within TILE_RADIUS_KM of the pole are written.

Why two layers: near hills decide the horizon on ridge tops (often the blocking ground is under 1 km away),
so the website must see them at full detail; far hills are big and a coarse map is enough.
Checked against the six prepared sites (80 m everywhere): 80 m within 10 km plus 640 m beyond gives the
same survive/lost answer in 97 to 100 % of landing days (see engine/check_custom.mjs).

Heights are stored as base64 little-endian int16, exactly as in the NASA file (units of 0.5 m above the
1737.4 km sphere) for the tiles, and in whole metres for the coarse map.

Usage:  python build_custom.py      (needs data_raw/ldem_80s_80m.img)

Code written with AI assistance (Claude).
"""
import base64
import json
import os

import numpy as np

import moonmap

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "docs", "data", "dem")
COARSE_K = 8                 # 8 x 80 m = 640 m
TILE = 128                   # pixels per tile side (10.24 km)
MAX_LAT = -85.0              # custom places must be at or south of this latitude
REACH_KM = 18.2              # farthest fine-map distance the website needs (corner of the 25.6 km 3D square)


def write_js(path, key, obj):
    with open(path, "w") as f:
        f.write("window.%s=window.%s||{};window.%s[%s]=" % (key, key, key, json.dumps(obj.pop("_key"))))
        json.dump(obj, f, separators=(",", ":"))
        f.write(";" + chr(10))


def main():
    os.makedirs(OUT, exist_ok=True)
    raw = moonmap.dem()                                 # int16, units of 0.5 m
    n = moonmap.N

    # coarse layer: block means in metres; cell (i, j) is centred on fine pixel (k*i + (k-1)/2, k*j + (k-1)/2)
    k = COARSE_K
    m = n // k
    z = raw[:m * k, :m * k].astype(np.float32).reshape(m, k, m, k).mean(axis=(1, 3)) * 0.5
    zc = np.round(z).astype("<i2")
    write_js(os.path.join(OUT, "coarse.js"), "LANDER_DEM", {
        "_key": "coarse", "k": k, "n": m, "off": (k - 1) / 2.0, "unit_m": 1.0,
        "z_b64": base64.b64encode(zc.tobytes()).decode("ascii")})

    # fine tiles
    max_r_m = 2 * moonmap.R * np.tan(np.pi / 4 + np.radians(MAX_LAT) / 2)
    keep_r_px = (max_r_m + REACH_KM * 1000) / moonmap.SCALE + 2
    nt = (n + TILE - 1) // TILE
    count, total = 0, 0
    index = []
    for ti in range(nt):
        for tj in range(nt):
            r0, c0 = ti * TILE, tj * TILE
            r1, c1 = min(n, r0 + TILE), min(n, c0 + TILE)
            # nearest point of the tile to the pole (pixel coords)
            dr = max(r0 - moonmap.C0, 0, moonmap.C0 - (r1 - 1))
            dc = max(c0 - moonmap.C0, 0, moonmap.C0 - (c1 - 1))
            if np.hypot(dr, dc) > keep_r_px:
                continue
            t = np.zeros((TILE, TILE), dtype="<i2")
            t[:r1 - r0, :c1 - c0] = raw[r0:r1, c0:c1]
            path = os.path.join(OUT, "f_%d_%d.js" % (ti, tj))
            write_js(path, "LANDER_DEM", {"_key": "f_%d_%d" % (ti, tj), "unit_m": 0.5,
                                          "z_b64": base64.b64encode(t.tobytes()).decode("ascii")})
            index.append([ti, tj])
            count += 1
            total += os.path.getsize(path)
    with open(os.path.join(OUT, "index.js"), "w") as f:
        f.write("window.LANDER_DEM_INDEX=")
        json.dump({"tile": TILE, "n": n, "c0": moonmap.C0, "scale_m": moonmap.SCALE, "radius_m": moonmap.R,
                   "max_lat": MAX_LAT, "tiles": ["%d_%d" % (a, b) for a, b in index]}, f, separators=(",", ":"))
        f.write(";" + chr(10))
    print("coarse %dx%d (%d KB); %d fine tiles, %.1f MB" % (
        m, m, os.path.getsize(os.path.join(OUT, "coarse.js")) // 1024, count, total / 1e6))


if __name__ == "__main__":
    main()
