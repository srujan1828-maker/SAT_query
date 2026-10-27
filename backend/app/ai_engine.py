"""AI Freeform Engine.

Uses Gemini NLU to parse arbitrary natural language prompts, extract geospatial
coordinates and temporal constraints, classify intent, and route automatically to
Flood Triage, Crop Loss Verification, or Environmental Watchdog modules.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta
from typing import Any

from app.crop_damage_service import analyze_crop_damage
from app.environment_service import analyze_environment
from app.flood_service import analyze_flood
from app.models import (
    AIAnalysisRequest,
    AIAnalysisResult,
    CropDamageRequest,
    EnvironmentAnalysisRequest,
    FloodAnalysisRequest,
)
from app.services import analyze_with_gemini, geocode_location

logger = logging.getLogger(__name__)


async def classify_intent_and_extract(prompt: str) -> dict[str, Any]:
    """Uses Gemini NLU or heuristic NLP to extract location, intent, and parameters."""
    system_instruction = (
        "You are SatQuery's AI satellite intelligence orchestrator.\n"
        "Analyze the user's prompt and extract structured parameters in strictly valid JSON format.\n"
        "Return ONLY a JSON object with these keys:\n"
        "{\n"
        '  "intent": "flood_analysis" | "crop_damage" | "environment_watch" | "general_query",\n'
        '  "location_name": "place name or null",\n'
        '  "lat": float or null,\n'
        '  "lng": float or null,\n'
        '  "crop_type": "rice" | "wheat" | "cotton" | etc. or null,\n'
        '  "damage_type": "drought" | "hail" | "flood" | "unseasonal_rain" or null,\n'
        '  "env_type": "deforestation" | "mining" | "water_shrinkage" or null,\n'
        '  "start_date": "YYYY-MM-DD" or null,\n'
        '  "end_date": "YYYY-MM-DD" or null,\n'
        '  "radius_km": float\n'
        "}"
    )

    gemini_resp = await analyze_with_gemini(f"{system_instruction}\n\nUser prompt: {prompt}")
    
    parsed = None
    if gemini_resp:
        try:
            # Extract JSON block
            match = re.search(r"\{.*\}", gemini_resp, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
        except Exception as e:
            logger.warning("Failed to parse Gemini intent JSON: %s", e)

    if not parsed:
        # Robust heuristic fallback
        p_lower = prompt.lower()
        if any(w in p_lower for w in ["flood", "submerge", "rescue", "ndrf", "inundat", "boat", "monsoon"]):
            intent = "flood_analysis"
        elif any(w in p_lower for w in ["crop", "farm", "farmer", "pmfby", "yield", "drought", "hail", "harvest", "paddy", "wheat", "rice"]):
            intent = "crop_damage"
        elif any(w in p_lower for w in ["forest", "deforest", "tree", "mining", "sand", "lake", "water", "shrink", "encroach", "ngt", "dry"]):
            intent = "environment_watch"
        else:
            intent = "environment_watch"

        env_type = "water_shrinkage" if any(w in p_lower for w in ["lake", "pond", "water", "reservoir", "dry"]) else (
            "mining" if any(w in p_lower for w in ["mining", "sand", "quarry"]) else "deforestation"
        )
        
        parsed = {
            "intent": intent,
            "location_name": None,
            "lat": None,
            "lng": None,
            "crop_type": "Rice" if "rice" in p_lower or "paddy" in p_lower else "Wheat",
            "damage_type": "flood" if "flood" in p_lower else ("drought" if "drought" in p_lower else "unseasonal_rain"),
            "env_type": env_type,
            "start_date": (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d"),
            "end_date": datetime.now().strftime("%Y-%m-%d"),
            "radius_km": 5.0,
        }

    return parsed


async def route_and_execute(request: AIAnalysisRequest) -> AIAnalysisResult:
    """Classifies user intent, geocodes coordinates if necessary, executes the pipeline, and synthesizes results."""
    params = await classify_intent_and_extract(request.prompt)
    intent = params.get("intent", "environment_watch")

    # Resolve coordinates
    lat = request.lat or params.get("lat")
    lng = request.lng or params.get("lng")
    
    if lat is None or lng is None:
        loc_name = params.get("location_name")
        if not loc_name:
            # Check prompt for prominent cities/landmarks
            common_places = ["Assam", "Kerala", "Sukhna Lake", "Yamuna", "Haridwar", "Ludhiana", "Patna", "Bangalore", "Chandigarh", "Delhi"]
            for p in common_places:
                if p.lower() in request.prompt.lower():
                    loc_name = p
                    break
        
        if loc_name:
            geo = await geocode_location(loc_name)
            if geo and isinstance(geo, dict):
                lat = float(geo.get("lat", 26.2))
                lng = float(geo.get("lng", 92.9))
                
    # Default to Northern India agrarian / riverine coordinate if still unresolved
    if lat is None or lng is None:
        lat, lng = 26.2006, 92.9376  # Assam / Brahmaputra basin default

    radius_km = float(params.get("radius_km") or 5.0)

    # Route execution
    if intent == "flood_analysis":
        pre_d = params.get("start_date") or (datetime.now() - timedelta(days=45)).strftime("%Y-%m-%d")
        post_d = params.get("end_date") or datetime.now().strftime("%Y-%m-%d")
        
        f_req = FloodAnalysisRequest(
            lat=lat, lng=lng, radius_km=radius_km, pre_date=pre_d, post_date=post_d
        )
        res = await analyze_flood(f_req)
        
        module_used = "Emergency Flood Dispatch"
        result_dict = res.model_dump()
        narrative = (
            f"🚨 **Disaster Response Triage Report**\n\n"
            f"- **Target Coordinates:** {lat:.4f}°N, {lng:.4f}°E (AOI Radius: {radius_km} km)\n"
            f"- **Inundated Area:** {res.affected_area_km2} km² ({res.severity_level} Severity)\n"
            f"- **Operational Summary:** {res.summary}\n"
            f"- **Road & Bridge Triage:** {len([r for r in res.road_status if 'Submerged' in r['status']])} roads identified as submerged. "
            f"NDRF safe navigation route is generated and available for boat convoy export."
        )

    elif intent == "crop_damage":
        crop = params.get("crop_type") or "Rice"
        dmg = params.get("damage_type") or "flood"
        claim_d = params.get("end_date") or datetime.now().strftime("%Y-%m-%d")
        
        c_req = CropDamageRequest(
            lat=lat, lng=lng, crop_type=crop, damage_type=dmg, claim_date=claim_d, farmer_name="Self-Reported Pin"
        )
        res = await analyze_crop_damage(c_req)
        
        module_used = "Zero-Cost Crop Loss Verifier"
        result_dict = res.model_dump()
        narrative = (
            f"🌾 **Agricultural Claim Verification Report**\n\n"
            f"- **Crop Type:** {crop} | **Reported Peril:** {dmg.capitalize()}\n"
            f"- **Spectral Drop:** Canopy NDVI collapsed by {res.ndvi_drop_pct}% (Pre: {res.ndvi_before} → Post: {res.ndvi_after})\n"
            f"- **Damage Classification:** {res.damage_severity}\n"
            f"- **Weather Grounding:** NASA POWER recorded {res.weather_data.get('total_rainfall_mm')} mm rainfall with peak temps of {res.weather_data.get('peak_temperature_c')}°C.\n"
            f"- **Official Certificate:** A cryptographically timestamped PMFBY Claim Certificate has been auto-generated with legal standing."
        )

    else: # environment_watch or general_query
        env_t = params.get("env_type") or "deforestation"
        s_d = params.get("start_date") or (datetime.now() - timedelta(days=180)).strftime("%Y-%m-%d")
        e_d = params.get("end_date") or datetime.now().strftime("%Y-%m-%d")
        
        e_req = EnvironmentAnalysisRequest(
            lat=lat, lng=lng, radius_km=radius_km, start_date=s_d, end_date=e_d, analysis_type=env_t
        )
        res = await analyze_environment(e_req)
        
        module_used = "Environmental Watchdog & Petition Generator"
        result_dict = res.model_dump()
        narrative = (
            f"🌳 **Civic Accountability & Forensic Evidence**\n\n"
            f"- **Category:** {env_t.replace('_', ' ').capitalize()}\n"
            f"- **Verified Footprint:** Net loss of {res.area_changed_hectares} hectares ({res.change_pct}% change)\n"
            f"- **Hotspots Tracked:** {len(res.bounding_boxes)} high-confidence visual bounding boxes generated.\n"
            f"- **Legal Action:** {res.ai_narrative}\n"
            f"- **Legal Complaint:** Ready-to-file National Green Tribunal (NGT) and RTI petitions formatted with satellite proof."
        )

    return AIAnalysisResult(
        intent=intent,
        module_used=module_used,
        result=result_dict,
        narrative=narrative,
    )
