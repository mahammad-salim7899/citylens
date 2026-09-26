"""No-parking zone lookup (simple radius geofences from config.py)."""
from __future__ import annotations

import math

from . import config


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def find_no_parking_zone(lat: float | None, lon: float | None) -> dict | None:
    if lat is None or lon is None:
        return None
    for z in config.NO_PARKING_ZONES:
        if haversine_m(lat, lon, z["lat"], z["lon"]) <= z["radius_m"]:
            return z
    return None
