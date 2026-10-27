"""PDF data generator for crop damage certificates and environmental petitions.

Generates structured JSON that the frontend renders using jsPDF.
"""

from __future__ import annotations

import hashlib
import json
import base64
from datetime import datetime, timezone
from typing import Any


def _certificate_number() -> str:
    """Generate a unique certificate number based on timestamp."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    hash_suffix = hashlib.sha256(ts.encode()).hexdigest()[:8].upper()
    return f"SQ-CDC-{ts}-{hash_suffix}"


def _petition_number() -> str:
    """Generate a unique petition reference number."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    hash_suffix = hashlib.sha256(ts.encode()).hexdigest()[:8].upper()
    return f"SQ-ENV-{ts}-{hash_suffix}"


def generate_crop_certificate_data(
    damage_result: dict[str, Any],
    request_data: dict[str, Any],
) -> str:
    """Generate crop damage certificate data as base64-encoded JSON for frontend PDF rendering.

    Args:
        damage_result: Dict with ndvi_before, ndvi_after, ndvi_drop_pct, weather_data,
                       damage_severity, ai_assessment
        request_data: Dict with lat, lng, crop_type, damage_type, claim_date, farmer_name

    Returns:
        Base64-encoded JSON string containing all certificate fields.
    """
    now = datetime.now(timezone.utc)
    cert_number = _certificate_number()

    weather = damage_result.get("weather_data", {})
    weather_summary_parts = []
    if "avg_temperature" in weather:
        weather_summary_parts.append(f"Avg Temp: {weather['avg_temperature']:.1f}°C")
    if "total_precipitation" in weather:
        weather_summary_parts.append(f"Total Precip: {weather['total_precipitation']:.1f} mm")
    if "max_wind_speed" in weather:
        weather_summary_parts.append(f"Max Wind: {weather['max_wind_speed']:.1f} m/s")
    weather_summary = "; ".join(weather_summary_parts) if weather_summary_parts else "Weather data unavailable"

    severity = damage_result.get("damage_severity", "Unknown")
    ndvi_before = damage_result.get("ndvi_before", 0.0)
    ndvi_after = damage_result.get("ndvi_after", 0.0)
    ndvi_drop = damage_result.get("ndvi_drop_pct", 0.0)

    certificate = {
        "type": "crop_damage_certificate",
        "version": "2.0",
        "certificate_number": cert_number,
        "issued_date": now.isoformat(),
        "issued_by": "SatQuery Satellite Analytics Platform",

        "farmer_details": {
            "name": request_data.get("farmer_name") or "Not Specified",
            "claim_date": request_data.get("claim_date", ""),
        },

        "location": {
            "latitude": request_data.get("lat", 0.0),
            "longitude": request_data.get("lng", 0.0),
            "coordinates_display": f"{request_data.get('lat', 0.0):.4f}°N, {request_data.get('lng', 0.0):.4f}°E",
        },

        "crop_info": {
            "crop_type": request_data.get("crop_type", "Unknown"),
            "damage_type": request_data.get("damage_type", "Unknown"),
            "damage_type_display": request_data.get("damage_type", "unknown").replace("_", " ").title(),
        },

        "satellite_readings": {
            "ndvi_before": round(ndvi_before, 4),
            "ndvi_after": round(ndvi_after, 4),
            "ndvi_drop_pct": round(ndvi_drop, 2),
            "data_source": "Sentinel-2 L2A (ESA Copernicus)",
            "spatial_resolution": "10m",
        },

        "weather_summary": weather_summary,
        "weather_data": weather,

        "assessment": {
            "damage_severity": severity,
            "ai_assessment": damage_result.get("ai_assessment", ""),
            "confidence": "Satellite-verified with AI correlation",
        },

        "verification": {
            "statement": (
                f"This certificate verifies that satellite imagery analysis of the area at "
                f"coordinates ({request_data.get('lat', 0):.4f}, {request_data.get('lng', 0):.4f}) "
                f"shows a {ndvi_drop:.1f}% decline in vegetation health index (NDVI), "
                f"consistent with {request_data.get('damage_type', 'unknown').replace('_', ' ')} damage "
                f"to {request_data.get('crop_type', 'the crop')}. "
                f"Damage severity is assessed as: {severity}."
            ),
            "methodology": "Multi-temporal NDVI analysis with meteorological correlation",
            "data_sources": [
                "Sentinel-2 L2A Multispectral Imagery (ESA)",
                "NASA POWER Meteorological Data",
                "Gemini AI Assessment Engine",
            ],
            "disclaimer": (
                "This certificate is generated through automated satellite imagery analysis "
                "and AI-assisted assessment. It is intended to support crop insurance claims "
                "and should be used alongside ground-truth verification as required by the "
                "relevant agricultural authority."
            ),
        },

        "sections": [
            {
                "title": "Certificate of Crop Damage Assessment",
                "content": f"Certificate No: {cert_number}",
            },
            {
                "title": "Farmer & Location Details",
                "content": (
                    f"Farmer: {request_data.get('farmer_name') or 'Not Specified'}\n"
                    f"Location: {request_data.get('lat', 0):.4f}°N, {request_data.get('lng', 0):.4f}°E\n"
                    f"Crop: {request_data.get('crop_type', 'Unknown')}\n"
                    f"Claim Date: {request_data.get('claim_date', 'N/A')}"
                ),
            },
            {
                "title": "Satellite Vegetation Analysis",
                "content": (
                    f"Pre-event NDVI: {ndvi_before:.4f}\n"
                    f"Post-event NDVI: {ndvi_after:.4f}\n"
                    f"NDVI Decline: {ndvi_drop:.1f}%\n"
                    f"Source: Sentinel-2 L2A (10m resolution)"
                ),
            },
            {
                "title": "Weather Correlation",
                "content": weather_summary,
            },
            {
                "title": "AI Damage Assessment",
                "content": damage_result.get("ai_assessment", "Assessment not available"),
            },
            {
                "title": "Verification Statement",
                "content": (
                    f"This certificate verifies {severity.lower()} level damage "
                    f"to {request_data.get('crop_type', 'crops')} due to "
                    f"{request_data.get('damage_type', 'unknown').replace('_', ' ')}."
                ),
            },
        ],
    }

    json_bytes = json.dumps(certificate, indent=2).encode("utf-8")
    return base64.b64encode(json_bytes).decode("utf-8")


def generate_petition_data(
    env_result: dict[str, Any],
    analysis_type: str,
    request_data: dict[str, Any],
) -> str:
    """Generate RTI/NGT petition data as base64-encoded JSON for frontend PDF rendering.

    Args:
        env_result: Dict with area_changed_hectares, change_pct, ai_narrative, bounding_boxes
        analysis_type: 'deforestation', 'mining', or 'water_shrinkage'
        request_data: Dict with lat, lng, radius_km, start_date, end_date

    Returns:
        Base64-encoded JSON string containing all petition fields.
    """
    now = datetime.now(timezone.utc)
    petition_number = _petition_number()

    # Determine petition type and legal context
    petition_config = {
        "deforestation": {
            "petition_type": "NGT Complaint / RTI Application",
            "subject": "Complaint Regarding Illegal Deforestation Activity Detected via Satellite Surveillance",
            "legal_sections": [
                "Section 2 of the Forest (Conservation) Act, 1980",
                "Rule 5 of the Environment (Protection) Rules, 1986",
                "Section 14(1) of the National Green Tribunal Act, 2010",
            ],
            "authority": "National Green Tribunal / State Forest Department",
            "violation_type": "Unauthorized clearing of forest cover",
        },
        "mining": {
            "petition_type": "NGT Complaint / RTI Application",
            "subject": "Complaint Regarding Unauthorized Mining Activity Detected via Satellite Imagery",
            "legal_sections": [
                "Section 4 of the Mines and Minerals (Development and Regulation) Act, 1957",
                "Section 19 of the Environment (Protection) Act, 1986",
                "Section 14(1) of the National Green Tribunal Act, 2010",
            ],
            "authority": "National Green Tribunal / District Mining Officer",
            "violation_type": "Unauthorized or illegal mining operation",
        },
        "water_shrinkage": {
            "petition_type": "RTI Application / NGT Complaint",
            "subject": "Application for Information Regarding Shrinkage of Water Body Detected via Satellite Analysis",
            "legal_sections": [
                "Section 6(1) of the Right to Information Act, 2005",
                "Section 15(1) of the Water (Prevention and Control of Pollution) Act, 1974",
                "Section 14(1) of the National Green Tribunal Act, 2010",
            ],
            "authority": "Central/State Pollution Control Board / Municipal Authority",
            "violation_type": "Degradation or encroachment of water body",
        },
    }

    config = petition_config.get(analysis_type, petition_config["deforestation"])
    area_changed = env_result.get("area_changed_hectares", 0)
    change_pct = env_result.get("change_pct", 0)

    petition = {
        "type": "environmental_petition",
        "version": "2.0",
        "petition_number": petition_number,
        "generated_date": now.isoformat(),
        "generated_by": "SatQuery Environmental Watchdog Module",

        "petition_type": config["petition_type"],
        "subject": config["subject"],
        "authority": config["authority"],

        "location": {
            "latitude": request_data.get("lat", 0.0),
            "longitude": request_data.get("lng", 0.0),
            "radius_km": request_data.get("radius_km", 5.0),
            "coordinates_display": f"{request_data.get('lat', 0.0):.4f}°N, {request_data.get('lng', 0.0):.4f}°E",
        },

        "temporal_range": {
            "start_date": request_data.get("start_date", ""),
            "end_date": request_data.get("end_date", ""),
        },

        "evidence": {
            "area_affected_hectares": round(area_changed, 2),
            "change_percentage": round(change_pct, 2),
            "analysis_type": analysis_type,
            "analysis_type_display": analysis_type.replace("_", " ").title(),
            "violation_type": config["violation_type"],
            "data_source": "Sentinel-2 L2A Multispectral Imagery (ESA Copernicus)",
            "methodology": (
                "Multi-temporal satellite change detection using spectral indices "
                "(NDVI/NDWI/SWIR) with AI-assisted narrative generation"
            ),
            "bounding_boxes_count": len(env_result.get("bounding_boxes", [])),
            "bounding_boxes": env_result.get("bounding_boxes", []),
        },

        "legal_sections": config["legal_sections"],

        "ai_narrative": env_result.get("ai_narrative", ""),

        "prayer_clauses": [
            f"Direct an immediate site inspection at coordinates "
            f"({request_data.get('lat', 0):.4f}°N, {request_data.get('lng', 0):.4f}°E) "
            f"covering an area of {request_data.get('radius_km', 5)} km radius.",

            f"Take cognizance of the satellite-detected {analysis_type.replace('_', ' ')} "
            f"affecting approximately {area_changed:.2f} hectares ({change_pct:.1f}% change) "
            f"between {request_data.get('start_date', 'N/A')} and {request_data.get('end_date', 'N/A')}.",

            "Issue appropriate directions to the responsible authority to halt any ongoing "
            "unauthorized activity and initiate restoration proceedings.",

            "Direct the concerned authority to submit an action-taken report within 30 days.",

            "Provide information regarding any existing environmental clearances or permits "
            "issued for the said area under the Right to Information Act, 2005.",
        ],

        "sections": [
            {
                "title": config["petition_type"],
                "content": f"Reference No: {petition_number}\nDate: {now.strftime('%d %B %Y')}",
            },
            {
                "title": "To",
                "content": config["authority"],
            },
            {
                "title": "Subject",
                "content": config["subject"],
            },
            {
                "title": "1. Facts of the Case",
                "content": (
                    f"Through satellite imagery analysis of the area at coordinates "
                    f"({request_data.get('lat', 0):.4f}°N, {request_data.get('lng', 0):.4f}°E), "
                    f"within a {request_data.get('radius_km', 5)} km radius, it has been detected that "
                    f"significant {analysis_type.replace('_', ' ')} has occurred between "
                    f"{request_data.get('start_date', 'N/A')} and {request_data.get('end_date', 'N/A')}. "
                    f"The affected area measures approximately {area_changed:.2f} hectares, "
                    f"representing a {change_pct:.1f}% change in the monitored index."
                ),
            },
            {
                "title": "2. Satellite Evidence",
                "content": env_result.get("ai_narrative", "Detailed analysis report attached."),
            },
            {
                "title": "3. Legal Basis",
                "content": "This petition is filed under:\n" + "\n".join(
                    f"  • {section}" for section in config["legal_sections"]
                ),
            },
            {
                "title": "4. Prayer",
                "content": "The petitioner respectfully prays that the Hon'ble authority may be pleased to:\n"
                + "\n".join(f"  ({chr(97 + i)}) {clause}" for i, clause in enumerate([
                    "Direct an immediate site inspection.",
                    f"Take cognizance of {analysis_type.replace('_', ' ')} affecting {area_changed:.2f} hectares.",
                    "Issue directions to halt unauthorized activity and initiate restoration.",
                    "Direct submission of an action-taken report within 30 days.",
                ])),
            },
        ],

        "disclaimer": (
            "This petition has been auto-generated based on satellite imagery analysis by "
            "SatQuery. The evidence presented is derived from publicly available Sentinel-2 "
            "satellite data processed through spectral change detection algorithms. "
            "The petitioner should verify all facts and consult legal counsel before filing."
        ),
    }

    json_bytes = json.dumps(petition, indent=2).encode("utf-8")
    return base64.b64encode(json_bytes).decode("utf-8")
