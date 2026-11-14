"""Is the Moon in the sky over Port Louis, Mauritius? Hourly, from NASA/JPL Horizons.

Writes docs/data/moris.js: one character per hour, "1" when the Moon's centre
is at least MIN_EL degrees above the horizon at Port Louis.

Code written with AI assistance (Claude).
"""
import json
import os

import horizons
from build_sites import OUT, START, STOP

LAT, LON = -20.1609, 57.5012      # Port Louis
MIN_EL = 10.0                     # degrees; below this, buildings and haze get in the way

t, az, el, w = horizons.sky_track(horizons.MOON, horizons.EARTH, LON, LAT, 0.0, START, STOP)
bits = "".join("1" if e >= MIN_EL else "0" for e in el)
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, "moris.js"), "w") as f:
    f.write("window.LANDER_MORIS=")
    json.dump({"place": "Port Louis, Mauritius", "lat": LAT, "lon": LON, "min_el_deg": MIN_EL,
               "t0": t[0].strftime("%Y-%m-%dT%H:%MZ"), "step_h": 1, "n": len(t), "up": bits}, f)
    f.write(";\n")
print("hours", len(t), "moon up share %.1f%%" % (100.0 * bits.count("1") / len(bits)))
