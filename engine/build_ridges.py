"""Build docs/data/ridges.js: which hill blocks the sky in each direction.

For every site and every direction (0.5 degree steps) we record the hill that
sets the horizon: how far away it is and how high it rises above the lander.
For every 2 degrees we also keep a terrain profile (side view) from the lander
out to just past that hill, so the website can draw a cross-section.

Data: NASA LRO LOLA LDEM_80S_80M (same height map and same method as
moonmap.horizon, panel 2 m above the ground). Needs data_raw/ldem_80s_80m.img.

Usage:  python build_ridges.py

Code written with AI assistance (Claude).
"""
import json
import os

import numpy as np

import moonmap

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "docs", "data", "ridges.js")
OBSERVER_M = 2.0
N_AZ = 720
PROFILE_EVERY = 4          # one side view every 4 directions = every 2 degrees
PROFILE_POINTS = 90


def distances(max_km=200.0):
    # same distance steps as moonmap.horizon, so the hill line matches
    return np.concatenate([
        np.arange(20.0, 2000.0, 20.0),
        np.arange(2000.0, 20000.0, 40.0),
        np.arange(20000.0, max_km * 1000.0 + 1, 80.0),
    ])


def site_ridges(lat, lon):
    R = moonmap.R
    z0 = float(moonmap.height(lat, lon))
    r1 = R + z0 + OBSERVER_M
    d = distances()
    az = np.arange(N_AZ) * (360.0 / N_AZ)
    elev, dist_km, rise_m, profiles = [], [], [], {}
    for i, a in enumerate(az):
        lat2, lon2 = moonmap._destination(lat, lon, a, d)
        z = moonmap.height(lat2, lon2)
        ok = ~np.isnan(z)
        dd, zz = d[ok], z[ok]
        th = dd / R
        r2 = R + zz
        el = np.degrees(np.arctan2(r2 * np.cos(th) - r1, r2 * np.sin(th)))
        k = int(np.argmax(el))
        elev.append(round(float(el[k]), 2))
        dist_km.append(round(float(dd[k]) / 1000.0, 2))
        # height of the hill top above the lander, after the Moon's curve drops it
        drop = R * (1 - np.cos(th[k]))
        rise_m.append(int(round(float(zz[k] - z0 - drop))))
        if i % PROFILE_EVERY == 0:
            # side view: from the lander to 1.3x the blocking distance (at least 3 km)
            end = max(3000.0, dd[k] * 1.3)
            x = np.linspace(0.0, end, PROFILE_POINTS)
            plat, plon = moonmap._destination(lat, lon, a, np.maximum(x, 1.0))
            pz = moonmap.height(plat, plon)
            pz = pz - z0 - R * (1 - np.cos(x / R))     # relative to lander ground, curve included
            profiles[str(i)] = {"end_km": round(end / 1000.0, 2),
                                "z": [None if np.isnan(v) else int(round(float(v))) for v in pz]}
    return {"step_deg": 360.0 / N_AZ, "observer_m": OBSERVER_M, "ground_m": round(z0, 1),
            "elev": elev, "dist_km": dist_km, "rise_m": rise_m,
            "profile_every": PROFILE_EVERY, "profiles": profiles}


def main():
    with open(os.path.join(HERE, "sites.json")) as f:
        sites = json.load(f)
    out = {}
    for s in sites:
        r = site_ridges(s["lat"], s["lon"])
        # check against the hill line the website already uses (panel 2 m)
        web = os.path.join(HERE, "..", "docs", "data", s["id"] + ".js")
        with open(web) as f:
            txt = f.read()
        stored = json.loads(txt[txt.index("]=") + 2: txt.rindex(";")])["horizons"]["2"]
        diff = np.abs(np.array(stored) - np.array(r["elev"])).max()
        far = np.array(r["dist_km"])
        print("%-10s max diff vs site file %.3f deg   blocking hill %4.1f to %5.1f km (median %.1f)"
              % (s["id"], diff, far.min(), far.max(), np.median(far)), flush=True)
        if diff > 0.02:
            raise RuntimeError("hill line does not match the site file for " + s["id"])
        del r["elev"]        # the website already has it
        out[s["id"]] = r
    with open(OUT, "w") as f:
        f.write("window.LANDER_RIDGES=")
        json.dump(out, f, separators=(",", ":"))
        f.write(";" + chr(10))
    print("wrote", OUT, os.path.getsize(OUT) // 1024, "KB")


if __name__ == "__main__":
    main()
