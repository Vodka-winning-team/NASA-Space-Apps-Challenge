"""Read NASA's LOLA south pole height map and compute the horizon around a site.

Data: LRO LOLA gridded elevation LDEM_80S_80M (80 m per pixel, 80S to 90S),
NASA PDS Geosciences Node. Polar stereographic, Moon radius 1737.4 km.

Code written with AI assistance (Claude).
"""
import os
import numpy as np

R = 1737400.0          # reference radius of the Moon, metres
SCALE = 80.0           # metres per pixel
N = 7600               # pixels per side
C0 = 3799.5            # pixel offset of the pole (0-based)

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, "..", "data_raw", "ldem_80s_80m.img")

_dem = None


def dem():
    """Height above the reference sphere, metres, as a 7600 x 7600 array."""
    global _dem
    if _dem is None:
        raw = np.fromfile(IMG, dtype="<i2")
        if raw.size != N * N:
            raise ValueError("unexpected height map size: %d" % raw.size)
        _dem = raw.reshape(N, N)
    return _dem


def latlon_to_pix(lat_deg, lon_deg):
    """Latitude/longitude (degrees, east positive) to (row, col), 0-based floats."""
    lat = np.radians(lat_deg)
    lon = np.radians(lon_deg)
    r = 2.0 * R * np.tan(np.pi / 4.0 + lat / 2.0)
    x = r * np.sin(lon)
    y = r * np.cos(lon)
    return C0 - y / SCALE, C0 + x / SCALE


def pix_to_latlon(row, col):
    x = (col - C0) * SCALE
    y = (C0 - row) * SCALE
    r = np.hypot(x, y)
    lat = -90.0 + np.degrees(2.0 * np.arctan(0.5 * r / R))
    lon = np.degrees(np.arctan2(x, y)) % 360.0
    return lat, lon


def height(lat_deg, lon_deg):
    """Bilinear height (metres) at lat/lon. NaN outside the map."""
    d = dem()
    row, col = latlon_to_pix(np.asarray(lat_deg, float), np.asarray(lon_deg, float))
    ok = (row >= 0) & (row <= N - 1.001) & (col >= 0) & (col <= N - 1.001)
    r0 = np.clip(np.floor(row).astype(int), 0, N - 2)
    c0 = np.clip(np.floor(col).astype(int), 0, N - 2)
    fr = row - r0
    fc = col - c0
    h = (d[r0, c0] * (1 - fr) * (1 - fc) + d[r0, c0 + 1] * (1 - fr) * fc
         + d[r0 + 1, c0] * fr * (1 - fc) + d[r0 + 1, c0 + 1] * fr * fc) * 0.5
    return np.where(ok, h, np.nan)


def _destination(lat_deg, lon_deg, bearing_deg, dist_m):
    """Point reached from (lat, lon) going dist_m along a great circle.
    Bearing is clockwise from local north, like NASA/JPL Horizons azimuth."""
    lat1 = np.radians(lat_deg)
    lon1 = np.radians(lon_deg)
    b = np.radians(bearing_deg)
    a = dist_m / R
    sin_lat2 = np.sin(lat1) * np.cos(a) + np.cos(lat1) * np.sin(a) * np.cos(b)
    lat2 = np.arcsin(np.clip(sin_lat2, -1, 1))
    lon2 = lon1 + np.arctan2(np.sin(b) * np.sin(a) * np.cos(lat1),
                             np.cos(a) - np.sin(lat1) * sin_lat2)
    return np.degrees(lat2), np.degrees(lon2)


def horizon(lat_deg, lon_deg, observer_m=2.0, n_az=720, max_km=200.0):
    """Terrain horizon as seen from a site.

    Returns (az_deg, elev_deg, reach_km): for each azimuth, the highest
    elevation angle of the terrain, and how far the map let us look.
    The Moon's curvature is included. There is no air, so no refraction.
    """
    z0 = float(height(lat_deg, lon_deg))
    r1 = R + z0 + observer_m
    az = np.arange(n_az) * (360.0 / n_az)
    # distance steps: fine close to the site, coarser far away
    d = np.concatenate([
        np.arange(20.0, 2000.0, 20.0),
        np.arange(2000.0, 20000.0, 40.0),
        np.arange(20000.0, max_km * 1000.0 + 1, 80.0),
    ])
    best = np.full(n_az, -90.0)
    reach = np.zeros(n_az)
    for i, a in enumerate(az):
        lat2, lon2 = _destination(lat_deg, lon_deg, a, d)
        z = height(lat2, lon2)
        ok = ~np.isnan(z)
        if not ok.any():
            continue
        th = d[ok] / R
        r2 = R + z[ok]
        el = np.degrees(np.arctan2(r2 * np.cos(th) - r1, r2 * np.sin(th)))
        best[i] = el.max()
        reach[i] = d[ok].max() / 1000.0
    return az, best, reach, z0
