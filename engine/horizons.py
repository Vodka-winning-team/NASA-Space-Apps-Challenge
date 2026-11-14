"""Ask NASA/JPL Horizons where a body is in the sky of a site.

Service: https://ssd.jpl.nasa.gov/api/horizons.api (free, no key).
Returns azimuth (clockwise from north) and elevation of the body's centre,
plus its apparent width, with no atmosphere.

Code written with AI assistance (Claude).
"""
import datetime as dt
import time
import requests

API = "https://ssd.jpl.nasa.gov/api/horizons.api"
SUN, EARTH, MOON = "10", "399", "301"


def sky_track(target, center_body, lon_deg, lat_deg, alt_km, start, stop, step="1 h"):
    """Hourly azimuth, elevation (degrees) and angular width (degrees).

    target: body to look at ("10" Sun, "399" Earth, "301" Moon)
    center_body: body the observer stands on ("301" Moon, "399" Earth)
    start, stop: "YYYY-MM-DD" strings (UTC)
    """
    params = {
        "format": "text",
        "COMMAND": "'%s'" % target,
        "OBJ_DATA": "'NO'",
        "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'OBSERVER'",
        "CENTER": "'coord@%s'" % center_body,
        "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": "'%.6f,%.6f,%.4f'" % (lon_deg % 360.0, lat_deg, alt_km),
        "START_TIME": "'%s'" % start,
        "STOP_TIME": "'%s'" % stop,
        "STEP_SIZE": "'%s'" % step,
        "QUANTITIES": "'4,13'",
        "CSV_FORMAT": "'YES'",
        "APPARENT": "'AIRLESS'",
    }
    last = None
    for attempt in range(4):
        try:
            r = requests.get(API, params=params, timeout=180)
            r.raise_for_status()
            text = r.text
            if "$$SOE" in text:
                break
            last = text[-600:]
        except requests.RequestException as e:  # network hiccup: wait and retry
            last = str(e)
        time.sleep(5 * (attempt + 1))
    else:
        raise RuntimeError("Horizons gave no table: %s" % last)

    body = text.split("$$SOE")[1].split("$$EOE")[0].strip().splitlines()
    times, az, el, width = [], [], [], []
    for line in body:
        p = [s.strip() for s in line.split(",")]
        times.append(dt.datetime.strptime(p[0], "%Y-%b-%d %H:%M"))
        az.append(float(p[3]))
        el.append(float(p[4]))
        width.append(float(p[5]) / 3600.0)   # arcseconds to degrees
    return times, az, el, width
