"""
Routing — OSRM with straight-line fallback.
More waypoints = smoother animation on the frontend.
"""

import httpx
import math
from typing import List, Tuple

OSRM_BASE = "http://router.project-osrm.org/route/v1/driving"


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a  = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _interpolate(start: Tuple[float,float], end: Tuple[float,float], steps: int = 80) -> List[Tuple[float,float]]:
    """Create a straight-line route with many small steps for smooth animation."""
    lat1, lon1 = start
    lat2, lon2 = end
    return [(lat1 + i/steps*(lat2-lat1), lon1 + i/steps*(lon2-lon1)) for i in range(steps + 1)]


async def get_route(start_lat, start_lon, end_lat, end_lon) -> dict:
    url    = f"{OSRM_BASE}/{start_lon},{start_lat};{end_lon},{end_lat}"
    params = {"overview": "full", "geometries": "geojson", "steps": "false"}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json()

        rt           = data["routes"][0]
        raw_coords   = rt["geometry"]["coordinates"]   # [lon, lat]
        coords       = [(c[1], c[0]) for c in raw_coords]
        distance_km  = rt["distance"] / 1000
        duration_min = rt["duration"] / 60

        print(f"[OSRM] {len(coords)} pts · {distance_km:.1f} km · {duration_min:.1f} min")
        return {"coords": coords, "distance_km": round(distance_km, 2), "duration_min": round(duration_min, 2), "source": "osrm"}

    except Exception as e:
        print(f"[OSRM] Failed ({e}) → fallback")
        distance_km  = haversine_km(start_lat, start_lon, end_lat, end_lon)
        duration_min = (distance_km / 40) * 60   # 40 km/h city speed
        coords       = _interpolate((start_lat, start_lon), (end_lat, end_lon), steps=80)
        print(f"[Fallback] {len(coords)} pts · {distance_km:.1f} km · {duration_min:.1f} min")
        return {"coords": coords, "distance_km": round(distance_km, 2), "duration_min": round(duration_min, 2), "source": "fallback"}
