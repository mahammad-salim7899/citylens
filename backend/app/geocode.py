"""
Reverse geocoding via OpenStreetMap Nominatim (free, no key).

Done on the server so we can send the identifying User-Agent that
Nominatim's usage policy requires, and cache results. Returns a short
citizen-friendly address ("Kottara, Mangaluru, Karnataka").
"""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from functools import lru_cache

from . import config


def _readable(data: dict) -> str | None:
    a = data.get("address") or {}
    locality = a.get("suburb") or a.get("neighbourhood") or a.get("quarter") or a.get("village") or a.get("hamlet") or a.get("road")
    city = a.get("city") or a.get("town") or a.get("municipality") or a.get("county") or a.get("state_district")
    parts: list[str] = []
    for p in (locality, city, a.get("state")):
        if p and p not in parts:
            parts.append(p)
    return ", ".join(parts) or data.get("display_name")


@lru_cache(maxsize=512)
def _lookup(lat: float, lon: float) -> tuple[str | None, str | None]:
    qs = urllib.parse.urlencode({"format": "jsonv2", "lat": lat, "lon": lon, "zoom": 16, "accept-language": "en"})
    req = urllib.request.Request(f"{config.NOMINATIM_URL}?{qs}", headers={"User-Agent": config.NOMINATIM_USER_AGENT})
    with urllib.request.urlopen(req, timeout=8) as res:
        data = json.load(res)
    return _readable(data), data.get("display_name")


def reverse(lat: float, lon: float) -> dict:
    try:
        # Round to ~11 m so nearby lookups share the cache.
        address, full = _lookup(round(lat, 4), round(lon, 4))
    except Exception:  # noqa: BLE001 — offline / rate-limited
        address, full = None, None
    return {"address": address, "address_full": full}
