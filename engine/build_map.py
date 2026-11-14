"""Draw the small map of the Moon's south pole used on the website.

It is a shaded picture of NASA's LOLA height map (LDEM_80S_80M), not a photo.
Top of the picture is longitude 0, the side of the Moon that faces Earth.

Code written with AI assistance (Claude).
"""
import os

import numpy as np
from PIL import Image

import moonmap

HALF_KM = 215.0      # the picture is a square 430 km across, centred on the pole
OUT_PX = 640

half = int(HALF_KM * 1000 / moonmap.SCALE)
c = int(round(moonmap.C0))
z = moonmap.dem()[c - half:c + half, c - half:c + half].astype(np.float32) * 0.5
k = z.shape[0] // OUT_PX
z = z[:k * OUT_PX, :k * OUT_PX].reshape(OUT_PX, k, OUT_PX, k).mean(axis=(1, 3))
cell = moonmap.SCALE * k

# hillshade: light from the upper left, 35 degrees above the ground
gy, gx = np.gradient(z, cell)
az, alt = np.radians(315.0), np.radians(35.0)
slope = np.arctan(np.hypot(gx, gy) * 1.6)
aspect = np.arctan2(-gx, gy)
shade = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
shade = np.clip(shade, 0, 1)
height = (z - z.min()) / (z.max() - z.min())
v = np.clip(0.10 + 0.72 * shade + 0.16 * height, 0, 1)
rgb = np.stack([v * 232, v * 228, v * 216], axis=-1).astype(np.uint8)   # same warm grey as the page text
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "map.jpg")
Image.fromarray(rgb).save(out, quality=84)
print("map", rgb.shape, os.path.getsize(out) // 1024, "KB; half width km", HALF_KM)
