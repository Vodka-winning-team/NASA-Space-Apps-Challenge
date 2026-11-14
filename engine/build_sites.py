"""Build the data files the website reads: one JSON file per landing site.

For each site:
  1. horizon: the hill line around the site, from NASA's LOLA height map
  2. Sun and Earth sky positions every hour, from NASA/JPL Horizons

Usage:  python build_sites.py            (all sites in sites.json)
        python build_sites.py MMO01      (one site)

Code written with AI assistance (Claude).
"""
import json
import os
import sys

import numpy as np

import horizons
import moonmap

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "docs", "data")
START, STOP = "2027-01-01", "2029-01-01"     # two full years, hourly, UTC
OBSERVER_M = 2.0                             # default solar panel / antenna height above ground
HEIGHTS_M = [0.5, 2.0, 10.0]                 # panel heights the website lets you compare


def r2(values):
    return [round(float(v), 2) for v in values]


def build(site):
    lat, lon = site["lat"], site["lon"]
    az, hor, reach, z0 = moonmap.horizon(lat, lon, observer_m=OBSERVER_M)
    alt_km = (z0 + OBSERVER_M) / 1000.0
    t, s_az, s_el, s_w = horizons.sky_track(horizons.SUN, horizons.MOON, lon, lat, alt_km, START, STOP)
    t2, e_az, e_el, e_w = horizons.sky_track(horizons.EARTH, horizons.MOON, lon, lat, alt_km, START, STOP)
    if t != t2:
        raise RuntimeError("Sun and Earth tables do not line up")
    by_height = {}
    for hm in HEIGHTS_M:
        by_height["%g" % hm] = r2(moonmap.horizon(lat, lon, observer_m=hm)[1])
    out = dict(site)
    out.update({
        "ground_m": round(z0, 1),
        "observer_m": OBSERVER_M,
        "horizon_step_deg": 360.0 / len(az),
        "horizon": r2(hor),
        "horizons": by_height,
        "horizon_reach_km_min": round(float(reach.min()), 1),
        "t0": t[0].strftime("%Y-%m-%dT%H:%MZ"),
        "step_h": 1,
        "n": len(t),
        "sun_az": r2(s_az), "sun_el": r2(s_el),
        "earth_az": r2(e_az), "earth_el": r2(e_el),
        "sun_width_deg": round(float(np.mean(s_w)), 3),
        "earth_width_deg": round(float(np.mean(e_w)), 3),
    })
    os.makedirs(OUT, exist_ok=True)
    # written as a small script so the page also works when opened from disk
    path = os.path.join(OUT, site["id"] + ".js")
    with open(path, "w") as f:
        f.write("window.LANDER_DATA=window.LANDER_DATA||{};window.LANDER_DATA[%s]=" % json.dumps(site["id"]))
        json.dump(out, f, separators=(",", ":"))
        f.write(";" + chr(10))
    return out, path


def quick_stats(d):
    """Share of hours with the Sun's centre / Earth's centre above the hill line."""
    step = d["horizon_step_deg"]
    hor = np.array(d["horizon"])
    n = len(hor)

    def above(az, el):
        az = np.array(az) % 360.0
        i = np.floor(az / step).astype(int) % n
        f = az / step - np.floor(az / step)
        h = hor[i] * (1 - f) + hor[(i + 1) % n] * f
        return np.array(el) > h

    sun = above(d["sun_az"], d["sun_el"])
    earth = above(d["earth_az"], d["earth_el"])
    return sun.mean() * 100, earth.mean() * 100, (sun & earth).mean() * 100


def main():
    with open(os.path.join(HERE, "sites.json")) as f:
        sites = json.load(f)
    want = sys.argv[1:]
    index = []
    for s in sites:
        if want and s["id"] not in want:
            continue
        d, path = build(s)
        su, ea, both = quick_stats(d)
        print("%-10s ground %7.0f m  sun %5.1f%%  earth %5.1f%%  both %5.1f%%  %d KB"
              % (s["id"], d["ground_m"], su, ea, both, os.path.getsize(path) // 1024), flush=True)
    if not want:
        for s in sites:
            index.append({k: s[k] for k in ("id", "name", "region", "lat", "lon")})
        with open(os.path.join(OUT, "sites.js"), "w") as f:
            f.write("window.LANDER_SITES=")
            json.dump(index, f, indent=1)
            f.write(";" + chr(10))


if __name__ == "__main__":
    main()
