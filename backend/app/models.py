"""Pydantic models for all SatQuery v2.0 API endpoints."""

from __future__ import annotations

from datetime import date as Date
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, model_validator


# ── Legacy v1 models (kept for backwards compat) ───────────────────────────

Mode = Literal["vqa", "change_detection", "fusion", "fusion_demo"]
Confidence = Literal["high", "medium", "low", "uncertain"]


class Location(BaseModel):
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lon: float = Field(ge=-180, le=180, allow_inf_nan=False)
    name: str | None = Field(default=None, max_length=200)


class DateRange(BaseModel):
    start: Date
    end: Date

    @model_validator(mode="after")
    def ordered(self):
        if self.end <= self.start:
            raise ValueError("The after date must be later than the before date.")
        return self


class QueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
    language: Literal["en", "hi"] = "en"
    location: Location
    date: Date | None = None
    date_range: DateRange | None = None
    mode: Mode = "vqa"
    radius_km: float = Field(default=2.5, ge=0.25, le=5, allow_inf_nan=False)
    tolerance_days: int = Field(default=10, ge=0, le=30)
    optical_views: bool = False

    @model_validator(mode="after")
    def valid(self):
        if not self.query.strip():
            raise ValueError("Enter a question.")
        if abs(self.location.lat) > 80:
            raise ValueError(
                "This imagery workflow currently supports latitudes between -80 and 80."
            )
        dates = (
            [self.date]
            if self.mode != "change_detection"
            else (
                [self.date_range.start, self.date_range.end] if self.date_range else []
            )
        )
        if not dates or any(d is None for d in dates):
            raise ValueError("Select the required observation date(s).")
        if any(d > Date.today() for d in dates):
            raise ValueError("Future observations are unavailable.")
        return self


class OpticalView(BaseModel):
    kind: Literal["false_colour", "ndvi", "scene_classes"]
    url: str
    sha256: str
    label: str
    method: str
    legend: list[str] = Field(default_factory=list)


class ImageResult(BaseModel):
    id: str
    url: str
    sensor: str
    date: Date
    role: Literal["single", "before", "after", "optical", "radar"]
    scene_id: str
    collection: str
    source_url: str
    requested_date: Date
    date_offset_days: int
    bbox: list[float]
    crs: str = "EPSG:4326"
    width: int
    height: int
    resolution_m: float
    sha256: str
    usable_fraction: float
    views: list[OpticalView] = Field(default_factory=list)
    view_warnings: list[str] = Field(default_factory=list)
    render_method: str


class OverlayBox(BaseModel):
    image_id: str
    label: str
    x_min: float = Field(ge=0, le=1)
    y_min: float = Field(ge=0, le=1)
    x_max: float = Field(ge=0, le=1)
    y_max: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)

    @model_validator(mode="after")
    def ordered(self):
        if self.x_max <= self.x_min or self.y_max <= self.y_min:
            raise ValueError("Invalid box bounds")
        return self


class APIError(BaseModel):
    code: str
    message: str


class QueryResponse(BaseModel):
    mode: Mode
    answer_text: str
    images: list[ImageResult] = Field(default_factory=list)
    overlay_boxes: list[OverlayBox] = Field(default_factory=list)
    change_summary: str | None = None
    confidence_flag: Confidence = "uncertain"
    used_cache_fallback: bool = False
    error: APIError | None = None
    analysis_status: Literal["complete", "partial", "unavailable"] = "unavailable"
    warnings: list[str] = Field(default_factory=list)
    metrics: dict | None = None
    change_geojson: dict | None = None
    request: QueryRequest | None = None
    pipeline_version: str = "aoi-scl-screening-v1"
    model_provider: str | None = None


# ── SatQuery v2 models ─────────────────────────────────────────────────────

# -- Flood Analysis --

class FloodAnalysisRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    radius_km: float = Field(default=5.0, ge=0.5, le=50)
    pre_date: str = Field(..., description="ISO date before disaster, e.g. 2024-06-01")
    post_date: str = Field(..., description="ISO date after disaster, e.g. 2024-07-15")


class FloodAnalysisResult(BaseModel):
    affected_area_km2: float
    submerged_zones: list[list[list[float]]] = Field(
        default_factory=list,
        description="List of polygon coordinate rings [[lng, lat], ...]",
    )
    road_status: list[dict[str, Any]] = Field(default_factory=list)
    severity_level: str
    sar_before_b64: str
    sar_after_b64: str
    diff_b64: str
    summary: str


class SafeRouteRequest(BaseModel):
    start_lat: float = Field(ge=-90, le=90)
    start_lng: float = Field(ge=-180, le=180)
    end_lat: float = Field(ge=-90, le=90)
    end_lng: float = Field(ge=-180, le=180)
    flood_zones: list[list[list[float]]] = Field(
        default_factory=list,
        description="List of polygon coordinate rings to avoid",
    )


class SafeRouteResult(BaseModel):
    route_coords: list[list[float]]
    distance_km: float
    estimated_time: str
    avoid_zones: list[list[list[float]]] = Field(default_factory=list)
    geojson: dict[str, Any]


# -- Crop Damage --

class CropDamageRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    crop_type: str = Field(min_length=1, max_length=100)
    damage_type: Literal["drought", "hail", "flood", "unseasonal_rain"]
    claim_date: str = Field(..., description="ISO date of the damage event")
    farmer_name: Optional[str] = Field(default=None, max_length=200)


class CropDamageResult(BaseModel):
    ndvi_before: float
    ndvi_after: float
    ndvi_drop_pct: float
    weather_data: dict[str, Any]
    damage_severity: str
    ai_assessment: str
    certificate_b64: str = Field(
        default="", description="Base64-encoded PDF certificate data (JSON for frontend)"
    )


# -- Environment Analysis --

class EnvironmentAnalysisRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    radius_km: float = Field(default=5.0, ge=0.5, le=50)
    start_date: str = Field(..., description="ISO start date")
    end_date: str = Field(..., description="ISO end date")
    analysis_type: Literal["deforestation", "mining", "water_shrinkage"]


class EnvironmentAnalysisResult(BaseModel):
    area_changed_hectares: float
    change_pct: float
    before_b64: str
    after_b64: str
    diff_b64: str
    bounding_boxes: list[dict[str, Any]] = Field(default_factory=list)
    ai_narrative: str
    petition_b64: str = Field(
        default="", description="Base64-encoded petition data (JSON for frontend)"
    )


# -- AI Freeform Mode --

class AIAnalysisRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=5000)
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)


class AIAnalysisResult(BaseModel):
    intent: str
    module_used: str
    result: dict[str, Any]
    narrative: str
