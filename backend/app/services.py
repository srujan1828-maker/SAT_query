"""Core services: geocoding, Sentinel Hub imagery, Gemini AI, OSM Overpass, and image utilities."""

from __future__ import annotations

import asyncio
import base64
import io
import logging
import math
import os
import re
from dataclasses import dataclass
from urllib.parse import quote

import httpx
import numpy as np
from PIL import Image
from dotenv import load_dotenv

from app.models import Location

load_dotenv()
logger = logging.getLogger(__name__)

DEFAULT_GEOCHAT_TIMEOUT_SECONDS = 90.0
DEFAULT_GEOCHAT_ATTEMPTS = 2
SENTINEL_STAC_SEARCH_URL = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
SENTINEL_TILE_URL = (
    "https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad"
)


# ── Settings ────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Settings:
    geochat_url: str | None
    geochat_api_key: str | None
    geochat_timeout_seconds: float
    geochat_attempts: int
    gemini_api_key: str | None
    frontend_origins: tuple[str, ...]
    demo_mode: bool

    @classmethod
    def from_environment(cls) -> "Settings":
        """Load optional local `.env` values without exposing them through the API."""
        frontend_origins = tuple(
            origin.strip().rstrip("/")
            for origin in os.getenv("FRONTEND_URL", "").split(",")
            if origin.strip()
        )
        return cls(
            geochat_url=os.getenv("GEOCHAT_ENDPOINT_URL") or None,
            geochat_api_key=os.getenv("GEOCHAT_API_KEY") or None,
            geochat_timeout_seconds=positive_float_environment(
                "GEOCHAT_TIMEOUT_SECONDS", DEFAULT_GEOCHAT_TIMEOUT_SECONDS
            ),
            geochat_attempts=positive_int_environment(
                "GEOCHAT_ATTEMPTS", DEFAULT_GEOCHAT_ATTEMPTS
            ),
            gemini_api_key=os.getenv("GEMINI_API_KEY") or None,
            frontend_origins=frontend_origins,
            demo_mode=os.getenv("DEMO_MODE", "false").lower() == "true",
        )


def positive_float_environment(name: str, default: float) -> float:
    try:
        value = float(os.getenv(name, str(default)))
    except ValueError:
        return default
    return value if value > 0 else default


def positive_int_environment(name: str, default: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        return default
    return value if value > 0 else default


def geochat_infer_url(base_or_infer_url: str) -> str:
    """Accept either a tunnel base URL or the complete Contract A `/infer` URL."""
    normalized = base_or_infer_url.rstrip("/")
    return normalized if normalized.endswith("/infer") else f"{normalized}/infer"


# ── Gemini AI ───────────────────────────────────────────────────────────────

async def gemini_answer(
    prompt: str,
    image_data: bytes,
    gemini_api_key: str,
    image_content_type: str = "image/png",
    location: Location | None = None,
    task: str = "vqa",
    comparison_image_data: bytes | None = None,
    comparison_content_type: str = "image/png",
    primary_label: str = "Satellite Scene",
    comparison_label: str = "Comparison Scene",
) -> tuple[str | None, list[dict], bool]:
    """Call Google Gemini 1.5 Flash Vision for cloud AI multimodal satellite analysis."""
    b64_image = base64.b64encode(image_data).decode("utf-8")
    system_prompt = (
        "You are an expert Earth Observation and Satellite Remote Sensing Vision-Language Assistant "
        "named SatQuery for Smart India Hackathon. Analyze the provided Sentinel satellite imagery. "
        "Answer the user query thoroughly and professionally based on the real image evidence, "
        "highlighting geographical features, water bodies, urban areas, vegetation, or infrastructure. "
        "Keep your response concise, factual, and informative (2-4 sentences)."
    )
    loc_context = (
        f" Location: {location.name or 'Target area'} (lat: {location.lat:.4f}, lon: {location.lon:.4f})."
        if location
        else ""
    )
    user_text = f"{system_prompt}\n\nTask: {task}.{loc_context}\n\nQuestion: {prompt}"

    parts: list[dict] = []
    if comparison_image_data is not None:
        b64_comp = base64.b64encode(comparison_image_data).decode("utf-8")
        parts.append({"text": f"{user_text}\n\n[Primary Observation: {primary_label}]"})
        parts.append(
            {"inline_data": {"mime_type": image_content_type, "data": b64_image}}
        )
        parts.append(
            {"text": f"\n[Secondary Observation / Baseline: {comparison_label}]"}
        )
        parts.append(
            {"inline_data": {"mime_type": comparison_content_type, "data": b64_comp}}
        )
    else:
        parts.append({"text": user_text})
        parts.append(
            {"inline_data": {"mime_type": image_content_type, "data": b64_image}}
        )

    primary_model = os.getenv("GEMINI_MODEL") or "gemini-flash-latest"
    models_to_try = [primary_model]
    for m in ():
        if m not in models_to_try:
            models_to_try.append(m)

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1000,
        },
    }
    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_api_key}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        p = candidates[0].get("content", {}).get("parts", [])
                        if p:
                            text = p[0].get("text", "").strip()
                            if text:
                                return text, [], False
                else:
                    logger.warning(
                        "Gemini Vision model %s returned status %d: %s",
                        model_name,
                        resp.status_code,
                        resp.text[:200],
                    )
        except Exception as error:
            logger.warning(
                "Gemini Vision model %s call failed (%s)",
                model_name,
                type(error).__name__,
            )
    return None, [], False


async def analyze_with_gemini(prompt: str, image_b64: str | None = None) -> str | None:
    """Send a text prompt (with optional base64 image) to Gemini and return the response text."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not set")
        return None

    parts: list[dict] = [{"text": prompt}]
    if image_b64:
        parts.append({
            "inline_data": {
                "mime_type": "image/png",
                "data": image_b64,
            }
        })

    model_name = os.getenv("GEMINI_MODEL") or "gemini-flash-latest"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 2000},
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    p = candidates[0].get("content", {}).get("parts", [])
                    if p:
                        return p[0].get("text", "").strip()
            else:
                logger.warning("Gemini returned %d: %s", resp.status_code, resp.text[:300])
    except Exception as exc:
        logger.warning("Gemini call failed: %s", exc)

    return None


# ── GeoChat (legacy) ────────────────────────────────────────────────────────

async def geochat_answer(
    prompt: str,
    settings: Settings,
    image_data: bytes | None = None,
    image_content_type: str = "image/png",
    task: str = "vqa",
) -> tuple[str | None, list[dict], bool, str | None]:
    """Call Contract A with enough time and retries for cold-started inference."""
    if not settings.geochat_url:
        return None, [], False, None
    timeout = httpx.Timeout(settings.geochat_timeout_seconds, connect=10.0)
    if image_data is None:
        return None, [], False, "No verified image was supplied."
    model_image = image_data
    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(1, settings.geochat_attempts + 1):
            try:
                response = await client.post(
                    geochat_infer_url(settings.geochat_url),
                    data={"prompt": prompt, "task": task},
                    files={"image": ("scene", model_image, image_content_type)},
                    headers=(
                        {"Authorization": f"Bearer {settings.geochat_api_key}"}
                        if settings.geochat_api_key
                        else None
                    ),
                )
                response.raise_for_status()
                payload = response.json()
                raw_boxes = payload.get("boxes", [])
                boxes = raw_boxes if isinstance(raw_boxes, list) else []
                return (
                    str(payload.get("answer") or ""),
                    boxes,
                    bool(payload.get("model_confident")),
                    None,
                )
            except ValueError:
                logger.warning("GeoChat returned an invalid response; not retrying.")
                break
            except httpx.HTTPStatusError as error:
                if 400 <= error.response.status_code < 500:
                    logger.warning(
                        "GeoChat rejected the inference request with HTTP %s.",
                        error.response.status_code,
                    )
                    break
                response_detail = error.response.text.strip().replace("\n", " ")[:500]
                logger.warning(
                    "GeoChat returned HTTP %s on attempt %s/%s: %s",
                    error.response.status_code,
                    attempt,
                    settings.geochat_attempts,
                    response_detail or "no response body",
                )
            except httpx.HTTPError as error:
                logger.warning(
                    "GeoChat request failed on attempt %s/%s: %s",
                    attempt,
                    settings.geochat_attempts,
                    error,
                )

            if attempt < settings.geochat_attempts:
                await asyncio.sleep(0.5)
    return None, [], False, "The imagery model is temporarily unavailable."


# ── Geocode ─────────────────────────────────────────────────────────────────

POPULAR_LOCATIONS: list[dict] = [
    {
        "name": "New Delhi",
        "display_name": "New Delhi, Delhi, India",
        "lat": 28.6139,
        "lon": 77.2090,
        "category": "Capital Urban Core & Yamuna River",
    },
    {
        "name": "Kedarnath",
        "display_name": "Kedarnath, Rudraprayag, Uttarakhand, India",
        "lat": 30.7346,
        "lon": 79.0669,
        "category": "Himalayan Glacial & Flash Flood Risk",
    },
    {
        "name": "Mumbai Port",
        "display_name": "Mumbai, Maharashtra, India",
        "lat": 18.9667,
        "lon": 72.8258,
        "category": "Arabian Sea Coastal Development",
    },
    {
        "name": "Bangalore",
        "display_name": "Bengaluru, Karnataka, India",
        "lat": 12.9716,
        "lon": 77.5946,
        "category": "Silicon Valley Urban Sprawl",
    },
    {
        "name": "Brahmaputra River",
        "display_name": "Guwahati, Assam, India",
        "lat": 26.1856,
        "lon": 91.7539,
        "category": "Monsoon Inundation & SAR Radar",
    },
    {
        "name": "Chilika Lake",
        "display_name": "Chilika Lake, Odisha, India",
        "lat": 19.7165,
        "lon": 85.3214,
        "category": "Coastal Lagoon & Wetland Ecology",
    },
    {
        "name": "Suez Canal",
        "display_name": "Suez Canal, Ismailia Governorate, Egypt",
        "lat": 30.5852,
        "lon": 32.5658,
        "category": "Maritime Navigation Chokepoint",
    },
    {
        "name": "London",
        "display_name": "London, Greater London, England, United Kingdom",
        "lat": 51.5074,
        "lon": -0.1278,
        "category": "Temperate Urban & River Thames",
    },
    {
        "name": "Tokyo",
        "display_name": "Tokyo, Japan",
        "lat": 35.6762,
        "lon": 139.6503,
        "category": "Tokyo Bay Coastal Megacity",
    },
]


async def geocode_search(query: str) -> list[dict]:
    """Search and autocomplete locations for interactive geospatial map with instant fallback."""
    q = query.strip()
    if not q:
        return POPULAR_LOCATIONS[:6]

    # 1. Match local preset locations
    q_lower = q.lower()
    preset_matches = [
        loc
        for loc in POPULAR_LOCATIONS
        if q_lower in loc["name"].lower() or q_lower in loc["display_name"].lower()
    ]

    # 2. Check coordinates pattern: "lat, lon"
    coord_match = re.match(r"^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$", q)
    if coord_match:
        lat = float(coord_match.group(1))
        lon = float(coord_match.group(2))
        if -90 <= lat <= 90 and -180 <= lon <= 180:
            return [
                {
                    "name": f"Coordinate ({lat:.4f}, {lon:.4f})",
                    "display_name": f"Latitude: {lat:.4f}, Longitude: {lon:.4f}",
                    "lat": round(lat, 4),
                    "lon": round(lon, 4),
                    "category": "Direct Coordinate Target",
                }
            ]

    # 3. Query OpenStreetMap Nominatim for global real-time suggestions
    external_matches: list[dict] = []
    try:
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={quote(q)}&limit=6&addressdetails=1"
        headers = {"User-Agent": "SatQuery-Geospatial/1.0", "Accept-Language": "en"}
        async with httpx.AsyncClient(timeout=3.5) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                for item in data:
                    lat = float(item.get("lat", 0))
                    lon = float(item.get("lon", 0))
                    display_name = item.get("display_name", "")
                    name = item.get("name") or display_name.split(",")[0]
                    cat = item.get("type", "location").replace("_", " ").title()
                    external_matches.append(
                        {
                            "name": name,
                            "display_name": display_name,
                            "lat": round(lat, 4),
                            "lon": round(lon, 4),
                            "category": cat,
                        }
                    )
    except Exception as err:
        logger.debug("Geocoding lookup notice: %s", err)

    # Merge and deduplicate
    combined: list[dict] = []
    seen = set()
    for item in preset_matches + external_matches:
        coord_key = (round(item["lat"], 2), round(item["lon"], 2))
        if coord_key not in seen:
            seen.add(coord_key)
            combined.append(item)
    return combined[:6]


async def geocode_location(place_name: str) -> dict | None:
    """Geocode a place name to lat/lng using Nominatim. Returns {lat, lng, display_name} or None."""
    try:
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={quote(place_name)}&limit=1"
        headers = {"User-Agent": "SatQuery-Geospatial/2.0", "Accept-Language": "en"}
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                if data:
                    return {
                        "lat": float(data[0]["lat"]),
                        "lng": float(data[0]["lon"]),
                        "display_name": data[0].get("display_name", place_name),
                    }
    except Exception as exc:
        logger.warning("Geocode failed for '%s': %s", place_name, exc)
    return None


# ── Sentinel Hub ────────────────────────────────────────────────────────────

_sh_token_cache: dict[str, str] = {}


async def get_sentinel_hub_token() -> str | None:
    """Obtain an OAuth2 token for Sentinel Hub Process API."""
    client_id = os.getenv("SENTINEL_HUB_CLIENT_ID")
    client_secret = os.getenv("SENTINEL_HUB_CLIENT_SECRET")
    if not client_id or not client_secret:
        logger.warning("Sentinel Hub credentials not configured")
        return None

    # Simple cache (no expiry tracking for hackathon)
    if "token" in _sh_token_cache:
        return _sh_token_cache["token"]

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
            )
            resp.raise_for_status()
            token = resp.json()["access_token"]
            _sh_token_cache["token"] = token
            return token
    except Exception as exc:
        logger.error("Failed to get Sentinel Hub token: %s", exc)
        return None


def compute_bbox(lat: float, lng: float, radius_km: float) -> list[float]:
    """Compute [min_lng, min_lat, max_lng, max_lat] bounding box from center + radius."""
    lat_deg = radius_km / 111.32
    lng_deg = radius_km / (111.32 * math.cos(math.radians(lat)))
    return [
        round(lng - lng_deg, 6),
        round(lat - lat_deg, 6),
        round(lng + lng_deg, 6),
        round(lat + lat_deg, 6),
    ]


async def fetch_sentinel_image(
    bbox: list[float],
    evalscript: str,
    time_range: tuple[str, str],
    width: int = 512,
    height: int = 512,
    data_collection: str = "sentinel-2-l2a",
) -> bytes | None:
    """Fetch imagery from Sentinel Hub Process API.

    Args:
        bbox: [min_lng, min_lat, max_lng, max_lat]
        evalscript: JavaScript evalscript for Sentinel Hub
        time_range: (from_date, to_date) as ISO strings e.g. ("2024-06-01", "2024-06-30")
        width: pixel width
        height: pixel height
        data_collection: Sentinel Hub data collection identifier
    """
    token = await get_sentinel_hub_token()
    if not token:
        return None

    request_body = {
        "input": {
            "bounds": {
                "bbox": bbox,
                "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"},
            },
            "data": [
                {
                    "type": data_collection,
                    "dataFilter": {
                        "timeRange": {
                            "from": f"{time_range[0]}T00:00:00Z",
                            "to": f"{time_range[1]}T23:59:59Z",
                        }
                    },
                }
            ],
        },
        "output": {
            "width": width,
            "height": height,
            "responses": [
                {"identifier": "default", "format": {"type": "image/tiff"}},
            ],
        },
        "evalscript": evalscript,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://services.sentinel-hub.com/api/v1/process",
                json=request_body,
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code == 200:
                return resp.content
            else:
                logger.warning(
                    "Sentinel Hub returned %d: %s", resp.status_code, resp.text[:300]
                )
                return None
    except Exception as exc:
        logger.error("Sentinel Hub request failed: %s", exc)
        return None


# ── OSM Overpass API ────────────────────────────────────────────────────────

async def query_overpass_api(
    lat: float,
    lng: float,
    radius_m: float,
    element_type: str = "way",
    tags: dict[str, str] | None = None,
) -> list[dict]:
    """Query OpenStreetMap Overpass API for map features in a radius.

    Args:
        lat: center latitude
        lng: center longitude
        radius_m: search radius in meters
        element_type: OSM element type (node, way, relation)
        tags: dict of OSM tags to filter, e.g. {"highway": ""}  (empty = any value)

    Returns:
        List of OSM elements with tags and geometry.
    """
    tag_filters = ""
    if tags:
        for key, value in tags.items():
            if value:
                tag_filters += f'["{key}"="{value}"]'
            else:
                tag_filters += f'["{key}"]'

    query = f"""
    [out:json][timeout:25];
    (
      {element_type}{tag_filters}(around:{radius_m},{lat},{lng});
    );
    out body geom;
    """

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": query},
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("elements", [])
            else:
                logger.warning("Overpass API returned %d", resp.status_code)
                return []
    except Exception as exc:
        logger.warning("Overpass API query failed: %s", exc)
        return []


# ── Image Utilities ─────────────────────────────────────────────────────────

def image_to_base64(image_bytes: bytes, format: str = "PNG") -> str:
    """Convert raw image bytes to a base64-encoded PNG string."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        buf = io.BytesIO()
        img.save(buf, format=format)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception:
        # If it's already a valid image format, just encode directly
        return base64.b64encode(image_bytes).decode("utf-8")


def tiff_to_numpy(tiff_bytes: bytes) -> np.ndarray:
    """Load TIFF bytes into a numpy array (single-band FLOAT32)."""
    img = Image.open(io.BytesIO(tiff_bytes))
    return np.array(img, dtype=np.float32)


def numpy_to_png_b64(arr: np.ndarray, colormap: str = "grayscale") -> str:
    """Convert a 2D or 3D numpy array to a colorized PNG, returned as base64."""
    if arr.ndim == 3 and arr.shape[2] in (3, 4):
        # Already an RGB / RGBA array
        rgb = arr.astype(np.uint8)
        mode = "RGBA" if arr.shape[2] == 4 else "RGB"
        img = Image.fromarray(rgb, mode)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    # 2D array handling
    if arr.ndim > 2:
        arr = np.squeeze(arr)

    valid = arr[np.isfinite(arr)]
    if len(valid) == 0:
        norm = np.zeros_like(arr, dtype=np.float32)
    else:
        vmin, vmax = np.percentile(valid, [2, 98])
        if vmax <= vmin:
            vmax = vmin + 1.0
        norm = np.clip((arr - vmin) / (vmax - vmin), 0.0, 1.0)

    if colormap == "grayscale":
        rgb = np.stack([(norm * 255).astype(np.uint8)] * 3, axis=-1)
    elif colormap == "rdylgn":
        # Red → Yellow → Green
        r = np.clip((1 - norm) * 2, 0, 1) * 255
        g = np.clip(norm * 2, 0, 1) * 255
        b = np.full_like(norm, 30)
        rgb = np.stack([r, g, b], axis=-1).astype(np.uint8)
    elif colormap == "bwr":
        # Blue → White → Red for diff maps
        r = np.where(norm > 0.5, 255, norm * 2 * 255).astype(np.uint8)
        g = np.where(norm > 0.5, (1 - norm) * 2 * 255, norm * 2 * 255).astype(np.uint8)
        b = np.where(norm < 0.5, 255, (1 - norm) * 2 * 255).astype(np.uint8)
        rgb = np.stack([r, g, b], axis=-1).astype(np.uint8)
    else:
        rgb = np.stack([(norm * 255).astype(np.uint8)] * 3, axis=-1)

    img = Image.fromarray(rgb, "RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def compute_pixel_diff(
    img1_bytes: bytes,
    img2_bytes: bytes,
    threshold: float = 30.0,
) -> tuple[str, float, np.ndarray]:
    """Compute pixel-level difference between two single-band TIFF images.

    Args:
        img1_bytes: before image (TIFF)
        img2_bytes: after image (TIFF)
        threshold: absolute difference threshold for change detection

    Returns:
        (diff_b64, changed_pct, diff_array) — base64 PNG of the diff, percent changed, raw diff
    """
    arr1 = tiff_to_numpy(img1_bytes)
    arr2 = tiff_to_numpy(img2_bytes)

    # Ensure same shape
    min_h = min(arr1.shape[0], arr2.shape[0])
    min_w = min(arr1.shape[1], arr2.shape[1])
    arr1 = arr1[:min_h, :min_w]
    arr2 = arr2[:min_h, :min_w]

    diff = arr1 - arr2  # positive = decrease in value (e.g., backscatter drop)

    # Calculate percentage of changed pixels
    valid_mask = np.isfinite(diff)
    total_valid = valid_mask.sum()
    if total_valid == 0:
        changed_pct = 0.0
    else:
        changed_mask = (np.abs(diff) > threshold) & valid_mask
        changed_pct = float(changed_mask.sum() / total_valid * 100)

    diff_b64 = numpy_to_png_b64(diff, colormap="bwr")

    return diff_b64, changed_pct, diff
