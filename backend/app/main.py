"""FastAPI application with SatQuery v2.0 AI-powered intelligence endpoints."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timezone
import json
import logging
import os
import re
import sqlite3
import sys
import time
import uuid
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from app.ai_engine import route_and_execute
from app.crop_auto import AutoCropRequest
from app.crop_damage_service import analyze_crop_damage
from app.crop_scraper import scrape_online_crop_data
from app.crops import router as crop_router
from app.environment_service import analyze_environment
from app.flood_service import analyze_flood, calculate_safe_route, get_road_status
from app.imagery import ARTIFACTS, DATA_DIR, prune_artifacts
from app.models import (
    AIAnalysisRequest,
    AIAnalysisResult,
    CropDamageRequest,
    CropDamageResult,
    EnvironmentAnalysisRequest,
    EnvironmentAnalysisResult,
    FloodAnalysisRequest,
    FloodAnalysisResult,
    QueryRequest,
    SafeRouteRequest,
    SafeRouteResult,
)
from app.services import geocode_search
from app.telegram_bot import initialize_telegram_storage, router as telegram_router

logger = logging.getLogger(__name__)

DB = DATA_DIR / "jobs.sqlite3"
TASKS = {}
MAX_JOBS = int(os.getenv("MAX_ACTIVE_JOBS", "4"))
DEADLINE = int(os.getenv("ANALYSIS_TIMEOUT_SECONDS", "240"))


@contextmanager
def db():
    con = sqlite3.connect(DB, timeout=10)
    con.row_factory = sqlite3.Row
    try:
        with con:
            yield con
    finally:
        con.close()


@asynccontextmanager
async def lifespan(app):
    prune_artifacts()
    initialize_telegram_storage()
    with db() as con:
        con.execute(
            "CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, status TEXT, created REAL, request TEXT, result TEXT, message TEXT)"
        )
        con.execute("CREATE TABLE IF NOT EXISTS budget (client TEXT, stamp REAL)")
        con.execute(
            "UPDATE jobs SET status='failed', message='Worker restarted. Please retry.' WHERE status IN ('queued','running')"
        )
    yield
    tasks = list(TASKS.values())
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)


app = FastAPI(
    title="SatQuery AI Satellite Intelligence API",
    version="2.0.0",
    description="Emergency flood dispatch, crop damage verification, environmental watchdog, and AI analysis.",
    lifespan=lifespan,
)

app.include_router(crop_router)
app.include_router(telegram_router)

# Broad CORS for hackathon demo and preview environments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "service": "SatQuery v2.0 Intelligence Platform",
        "version": "2.0.0",
        "modules": [
            "Emergency Flood Dispatch & SAR Triage",
            "Zero-Cost Crop Loss & Insurance Verifier",
            "Environmental Justice & Civic Watchdog",
            "AI Freeform Planetary Orchestration",
        ],
    }


# ── SatQuery v2 Feature Endpoints ──────────────────────────────────────────

# 1. Flood Dispatch & Infrastructure Triage
@app.post("/api/flood/analyze", response_model=FloodAnalysisResult)
async def api_flood_analyze(request: FloodAnalysisRequest):
    try:
        return await analyze_flood(request)
    except Exception as e:
        logger.error("Flood analysis failed: %s", e, exc_info=True)
        raise HTTPException(500, f"Flood analysis error: {str(e)}")


@app.post("/api/flood/safe-route", response_model=SafeRouteResult)
async def api_flood_safe_route(request: SafeRouteRequest):
    try:
        return await calculate_safe_route(request)
    except Exception as e:
        logger.error("Safe route calculation failed: %s", e, exc_info=True)
        raise HTTPException(500, f"Safe route error: {str(e)}")


@app.post("/api/flood/roads")
async def api_flood_roads(request: dict):
    try:
        lat = float(request.get("lat", 26.2))
        lng = float(request.get("lng", 92.9))
        radius_km = float(request.get("radius_km", 5.0))
        zones = request.get("flood_zones", [])
        roads = await get_road_status(lat, lng, radius_km, zones)
        return {"roads": roads}
    except Exception as e:
        logger.error("Road status failed: %s", e, exc_info=True)
        raise HTTPException(500, f"Road status error: {str(e)}")


# 2. Agricultural Welfare & PMFBY Crop Loss Verifier
@app.post("/api/crop-damage/analyze", response_model=CropDamageResult)
async def api_crop_damage_analyze(request: CropDamageRequest):
    try:
        return await analyze_crop_damage(request)
    except Exception as e:
        logger.error("Crop damage analysis failed: %s", e, exc_info=True)
        raise HTTPException(500, f"Crop damage error: {str(e)}")


@app.get("/api/crops/scrape")
async def api_crop_scrape(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    crop_type: str = Query(..., min_length=1),
):
    """Scrapes online agricultural portal records for the district."""
    try:
        return await scrape_online_crop_data(lat, lng, crop_type)
    except Exception as e:
        logger.error("Crop scrape failed: %s", e, exc_info=True)
        raise HTTPException(500, f"Crop scraping error: {str(e)}")


# 3. Environmental Justice Watchdog
@app.post("/api/environment/analyze", response_model=EnvironmentAnalysisResult)
async def api_environment_analyze(request: EnvironmentAnalysisRequest):
    try:
        return await analyze_environment(request)
    except Exception as e:
        logger.error("Environment analysis failed: %s", e, exc_info=True)
        raise HTTPException(500, f"Environment analysis error: {str(e)}")


# 4. AI Freeform Autonomous Analysis
@app.post("/api/ai/analyze", response_model=AIAnalysisResult)
async def api_ai_analyze(request: AIAnalysisRequest):
    try:
        return await route_and_execute(request)
    except Exception as e:
        logger.error("AI freeform analysis failed: %s", e, exc_info=True)
        raise HTTPException(500, f"AI analysis error: {str(e)}")


# ── Location Geocode & Static Artifacts ─────────────────────────────────────

GEOCODE_LOCK = asyncio.Lock()
GEOCODE_CACHE = {}
LAST_GEOCODE = 0.0


@app.get("/api/geocode")
async def geocode(q: str = ""):
    global LAST_GEOCODE
    q = q.strip()[:200]
    if len(q) < 2:
        return {"results": []}
    async with GEOCODE_LOCK:
        if q.casefold() in GEOCODE_CACHE:
            return {"results": GEOCODE_CACHE[q.casefold()]}
        await asyncio.sleep(max(0, 1.1 - (time.monotonic() - LAST_GEOCODE)))
        matches = await geocode_search(q)
        LAST_GEOCODE = time.monotonic()
        if len(GEOCODE_CACHE) > 500:
            GEOCODE_CACHE.clear()
        GEOCODE_CACHE[q.casefold()] = matches
        return {"results": matches}


@app.get("/media/artifacts/{filename}")
async def artifact(filename: str):
    if not re.fullmatch(r"[a-f0-9]{64}\.png", filename):
        raise HTTPException(404)
    path = ARTIFACTS / filename
    if not path.is_file():
        raise HTTPException(404, "Evidence artifact expired or missing")
    return FileResponse(
        path,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=604800, immutable"},
    )
