"""Check our numbers against NASA Goddard's published illumination maps.

NASA product: LOLA-derived polar illumination maps, NASA GSFC Planetary Geodesy
Data Archive (https://pgda.gsfc.nasa.gov/products/69), Mazarico et al. 2011.
  AVGVISIB_85S_060M_201608        share of time any part of the Sun is visible
  AVGVISIB_85S_060M_201608_EARTH  share of time the Earth is visible
Both averaged over 18.6 years at 60 m per pixel. Put the two .IMG files in
data_raw/pgda/ before running.

Ours: 2027 and 2028 only, 80 m per pixel height map, panel at 0.5, 2 or 10 m.

Code written with AI assistance (Claude).
"""
import json
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
R, N, C0, SC = 1737400.0, 5058, 2528.5, 60.0


def nasa_map(name):
    return np.fromfile(os.path.join(HERE, "..", "data_raw", "pgda", name), "<i2").reshape(N, N) * 0.00004


def pix(lat, lon):
    r = 2 * R * np.tan(np.pi / 4 + np.radians(lat) / 2)
    return int(round(C0 - r * np.cos(np.radians(lon)) / SC)), int(round(C0 + r * np.sin(np.radians(lon)) / SC))


def load(site_id):
    s = open(os.path.join(HERE, "..", "docs", "data", site_id + ".js")).read()
    return json.loads(s[s.index("]=") + 2:s.rindex(";")])


def share_above(hor, az, el, lift):
    hor = np.array(hor)
    n = len(hor)
    p = (np.array(az) % 360) / (360.0 / n)
    i = np.floor(p).astype(int)
    f = p - i
    h = hor[i % n] * (1 - f) + hor[(i + 1) % n] * f
    return float(((np.array(el) + lift) > h).mean() * 100)


sun, earth = nasa_map("AVGVISIB_85S_060M_201608.IMG"), nasa_map("AVGVISIB_85S_060M_201608_EARTH.IMG")
rows = []
for s in json.load(open(os.path.join(HERE, "sites.json"))):
    d = load(s["id"])
    i, j = pix(s["lat"], s["lon"])
    r = d["sun_width_deg"] / 2
    row = {"id": s["id"], "name": s["name"],
           "nasa_sun": round(float(sun[i, j]) * 100, 1), "nasa_earth": round(float(earth[i, j]) * 100, 1),
           "nasa_sun_nearby": [round(float(sun[i-1:i+2, j-1:j+2].min()) * 100, 1), round(float(sun[i-1:i+2, j-1:j+2].max()) * 100, 1)]}
    for h in ("0.5", "2", "10"):
        # same definition as NASA: Sun counts if any part of its disc shows; Earth by its centre
        row["sun_%s" % h] = round(share_above(d["horizons"][h], d["sun_az"], d["sun_el"], r), 1)
        row["earth_%s" % h] = round(share_above(d["horizons"][h], d["earth_az"], d["earth_el"], 0.0), 1)
    rows.append(row)

print("%-18s | %-24s | %-24s" % ("", "SUN visible, % of time", "EARTH visible, % of time"))
print("%-18s | %5s %5s %5s %6s | %5s %5s %5s %6s" % ("site", "0.5m", "2m", "10m", "NASA", "0.5m", "2m", "10m", "NASA"))
for r in rows:
    print("%-18s | %5.1f %5.1f %5.1f %6.1f | %5.1f %5.1f %5.1f %6.1f" % (
        r["name"], r["sun_0.5"], r["sun_2"], r["sun_10"], r["nasa_sun"],
        r["earth_0.5"], r["earth_2"], r["earth_10"], r["nasa_earth"]))
for key, label in (("sun", "Sun"), ("earth", "Earth")):
    for h in ("0.5", "2", "10"):
        diff = np.array([r["%s_%s" % (key, h)] - r["nasa_" + key] for r in rows])
        print("%-5s panel %4s m: mean difference %+5.1f points, mean size %4.1f, largest %4.1f" % (
            label, h, diff.mean(), np.abs(diff).mean(), np.abs(diff).max()))
with open(os.path.join(HERE, "..", "docs", "data", "validation.js"), "w") as f:
    f.write("window.LANDER_VALIDATION=" + json.dumps(rows) + ";" + chr(10))
