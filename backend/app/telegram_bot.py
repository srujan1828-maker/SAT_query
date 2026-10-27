"""Telegram webhook for crop-loss claim intake."""

from __future__ import annotations

import base64
import hmac
import io
import json
import logging
import os
import re
import sqlite3
import time
from datetime import date
from typing import Any

import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from xml.sax.saxutils import escape

from app.imagery import DATA_DIR
from app.models import CropDamageRequest
from app.crop_damage_service import analyze_crop_damage

logger = logging.getLogger(__name__)
router = APIRouter()

TELEGRAM_API = "https://api.telegram.org"
MAX_UPDATE_BYTES = 1024 * 1024
MAX_VOICE_BYTES = 20 * 1024 * 1024
MAX_CLAIM_CONTEXT = 6000
ALLOWED_DAMAGE_TYPES = {"drought", "hail", "flood", "unseasonal_rain"}


def initialize_telegram_storage() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DATA_DIR / "jobs.sqlite3", timeout=10) as connection:
        connection.execute(
            """CREATE TABLE IF NOT EXISTS telegram_updates (
                update_id INTEGER PRIMARY KEY,
                created_at INTEGER NOT NULL
            )"""
        )
        connection.execute(
            """CREATE TABLE IF NOT EXISTS telegram_claims (
                chat_id INTEGER PRIMARY KEY,
                latitude REAL,
                longitude REAL,
                claim_context TEXT NOT NULL DEFAULT '',
                updated_at INTEGER NOT NULL
            )"""
        )
        connection.execute(
            "DELETE FROM telegram_updates WHERE created_at < ?",
            (int(time.time()) - 7 * 24 * 60 * 60,),
        )
        connection.execute(
            "DELETE FROM telegram_claims WHERE updated_at < ?",
            (int(time.time()) - 24 * 60 * 60,),
        )


def _record_update_once(update_id: int) -> bool:
    with sqlite3.connect(DATA_DIR / "jobs.sqlite3", timeout=10) as connection:
        cursor = connection.execute(
            "INSERT OR IGNORE INTO telegram_updates (update_id, created_at) VALUES (?, ?)",
            (update_id, int(time.time())),
        )
        return cursor.rowcount == 1


def _get_claim(chat_id: int) -> dict[str, Any] | None:
    with sqlite3.connect(DATA_DIR / "jobs.sqlite3", timeout=10) as connection:
        row = connection.execute(
            "SELECT latitude, longitude, claim_context, updated_at FROM telegram_claims WHERE chat_id = ?",
            (chat_id,),
        ).fetchone()
    if row is None:
        return None
    if row[3] < int(time.time()) - 24 * 60 * 60:
        _clear_claim(chat_id)
        return None
    return {"lat": row[0], "lng": row[1], "context": row[2]}


def _save_location(chat_id: int, latitude: float, longitude: float) -> None:
    with sqlite3.connect(DATA_DIR / "jobs.sqlite3", timeout=10) as connection:
        connection.execute(
            """INSERT INTO telegram_claims
                (chat_id, latitude, longitude, claim_context, updated_at)
                VALUES (?, ?, ?, '', ?)
                ON CONFLICT(chat_id) DO UPDATE SET
                    latitude=excluded.latitude,
                    longitude=excluded.longitude,
                    claim_context='',
                    updated_at=excluded.updated_at""",
            (chat_id, latitude, longitude, int(time.time())),
        )


def _append_claim_context(chat_id: int, text: str) -> str:
    with sqlite3.connect(DATA_DIR / "jobs.sqlite3", timeout=10) as connection:
        row = connection.execute(
            "SELECT claim_context FROM telegram_claims WHERE chat_id = ?",
            (chat_id,),
        ).fetchone()
        context = f"{row[0]}\n{text}".strip() if row else text
        context = context[-MAX_CLAIM_CONTEXT:]
        connection.execute(
            "UPDATE telegram_claims SET claim_context = ?, updated_at = ? WHERE chat_id = ?",
            (context, int(time.time()), chat_id),
        )
    return context


def _clear_claim(chat_id: int) -> None:
    with sqlite3.connect(DATA_DIR / "jobs.sqlite3", timeout=10) as connection:
        connection.execute("DELETE FROM telegram_claims WHERE chat_id = ?", (chat_id,))


def _secret_is_configured() -> bool:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    secret = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")
    return bool(token and secret and re.fullmatch(r"[A-Za-z0-9_-]{1,256}", secret))


async def _telegram_request(
    method: str,
    *,
    payload: dict[str, Any] | None = None,
    files: dict[str, Any] | None = None,
) -> dict[str, Any]:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError("Telegram bot is not configured.")
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{TELEGRAM_API}/bot{token}/{method}",
            data=payload if files else None,
            json=payload if not files else None,
            files=files,
        )
        response.raise_for_status()
        body = response.json()
    if not body.get("ok"):
        raise RuntimeError(f"Telegram {method} request was rejected.")
    return body.get("result", {})


async def _send_message(chat_id: int, text: str) -> None:
    await _telegram_request(
        "sendMessage",
        payload={"chat_id": chat_id, "text": text[:4000]},
    )


async def _download_voice(file_id: str) -> bytes:
    metadata = await _telegram_request("getFile", payload={"file_id": file_id})
    file_path = metadata.get("file_path")
    file_size = metadata.get("file_size")
    if not isinstance(file_path, str) or not file_path or ".." in file_path.split("/"):
        raise RuntimeError("Telegram did not provide a valid voice file.")
    if isinstance(file_size, int) and file_size > MAX_VOICE_BYTES:
        raise ValueError("Voice notes must be 20 MB or smaller.")

    token = os.getenv("TELEGRAM_BOT_TOKEN")
    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.get(f"{TELEGRAM_API}/file/bot{token}/{file_path}")
        response.raise_for_status()
    if len(response.content) > MAX_VOICE_BYTES:
        raise ValueError("Voice notes must be 20 MB or smaller.")
    return response.content


async def _extract_claim_details(
    context: str,
    voice_bytes: bytes | None = None,
) -> dict[str, Any] | None:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return _extract_claim_details_heuristic(context)

    prompt = (
        "Extract crop insurance claim details from the farmer's messages. "
        "If the input contains an audio attachment, transcribe it in any language "
        "and use the transcript. Return only one JSON object with keys "
        "crop_type, damage_type, claim_date, farmer_name. Use null for unknown "
        "values. damage_type must be one of drought, hail, flood, unseasonal_rain. "
        "claim_date must be YYYY-MM-DD. Do not guess missing values or infer a "
        "farmer name from account metadata. Messages:\n"
        f"{context}"
    )
    parts: list[dict[str, Any]] = [{"text": prompt}]
    if voice_bytes is not None:
        parts.append(
            {
                "inline_data": {
                    "mime_type": "audio/ogg",
                    "data": base64.b64encode(voice_bytes).decode("ascii"),
                }
            }
        )
    model = os.getenv("GEMINI_MODEL") or "gemini-flash-latest"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                params={"key": api_key},
                json={
                    "contents": [{"parts": parts}],
                    "generationConfig": {"temperature": 0, "maxOutputTokens": 256},
                },
            )
        response.raise_for_status()
        candidates = response.json().get("candidates", [])
        text = candidates[0]["content"]["parts"][0]["text"] if candidates else ""
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            logger.warning("Gemini returned no structured Telegram claim details.")
            return _extract_claim_details_heuristic(context)
        parsed = json.loads(match.group(0))
        return _validate_claim_details(parsed)
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as error:
        logger.warning("Telegram claim extraction failed (%s).", type(error).__name__)
        return _extract_claim_details_heuristic(context)


def _validate_claim_details(details: dict[str, Any]) -> dict[str, Any]:
    crop_type = details.get("crop_type")
    crop_type = crop_type.strip()[:100] if isinstance(crop_type, str) else None
    damage_type = details.get("damage_type")
    if damage_type not in ALLOWED_DAMAGE_TYPES:
        damage_type = None
    claim_date = details.get("claim_date")
    if isinstance(claim_date, str):
        try:
            parsed_date = date.fromisoformat(claim_date)
            claim_date = parsed_date.isoformat() if parsed_date <= date.today() else None
        except ValueError:
            claim_date = None
    else:
        claim_date = None
    farmer_name = details.get("farmer_name")
    farmer_name = farmer_name.strip()[:200] if isinstance(farmer_name, str) else None
    return {
        "crop_type": crop_type or None,
        "damage_type": damage_type,
        "claim_date": claim_date,
        "farmer_name": farmer_name or None,
    }


def _extract_claim_details_heuristic(context: str) -> dict[str, Any]:
    lowered = context.casefold()
    damage_type = next(
        (
            candidate
            for candidate, words in {
                "drought": ("drought", "सूखा"),
                "hail": ("hail", "hailstorm", "ओले"),
                "flood": ("flood", "inundation", "बाढ़"),
                "unseasonal_rain": ("unseasonal rain", "heavy rain", "बेमौसम बारिश"),
            }.items()
            if any(word in lowered for word in words)
        ),
        None,
    )
    crop_type = next(
        (
            crop
            for crop in ("rice", "paddy", "wheat", "cotton", "maize", "sugarcane")
            if crop in lowered
        ),
        None,
    )
    if crop_type == "paddy":
        crop_type = "Rice"
    elif crop_type:
        crop_type = crop_type.title()
    match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", context)
    claim_date = None
    if match:
        try:
            parsed_date = date.fromisoformat(match.group(1))
            if parsed_date <= date.today():
                claim_date = parsed_date.isoformat()
        except ValueError:
            pass
    return {
        "crop_type": crop_type,
        "damage_type": damage_type,
        "claim_date": claim_date,
        "farmer_name": None,
    }


def _create_certificate_pdf(result: Any, request: CropDamageRequest) -> bytes:
    output = io.BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="SatQuery Crop Damage Screening Report",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CertificateTitle",
        parent=styles["Title"],
        textColor=colors.HexColor("#143326"),
        alignment=TA_CENTER,
        fontSize=17,
        leading=22,
        spaceAfter=8,
    )
    body_style = ParagraphStyle(
        "CertificateBody",
        parent=styles["BodyText"],
        fontSize=9,
        leading=13,
        spaceAfter=7,
    )
    story = [
        Paragraph("SatQuery Crop Damage Screening Report", title_style),
        Paragraph(
            "Automated satellite and weather screening for supporting a crop insurance claim. "
            "This report is not an official government certificate or a guarantee of insurance eligibility.",
            body_style,
        ),
        Spacer(1, 5 * mm),
    ]
    rows = [
        ["Farmer", request.farmer_name or "Not specified"],
        ["Crop", request.crop_type],
        ["Reported damage", request.damage_type.replace("_", " ").title()],
        ["Claim date", request.claim_date],
        ["Farm coordinates", f"{request.lat:.5f}, {request.lng:.5f}"],
        ["NDVI before / after", f"{result.ndvi_before:.3f} / {result.ndvi_after:.3f}"],
        ["NDVI change", f"{result.ndvi_drop_pct:.1f}%"],
        ["Screening category", result.damage_severity],
        [
            "Weather source",
            str(result.weather_data.get("provider", "NASA POWER; availability varies")),
        ],
    ]
    table = Table(rows, colWidths=[43 * mm, 115 * mm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#edf4ef")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#18231d")),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5ce")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.extend(
        [
            table,
            Spacer(1, 7 * mm),
            Paragraph("Automated assessment", styles["Heading2"]),
            Paragraph(escape(result.ai_assessment), body_style),
            Paragraph(
                "Limitations: Satellite screening can be affected by cloud cover, acquisition timing, "
                "field boundaries, mixed land cover, and data availability. Independently verify "
                "imagery, measurements, and official scheme requirements before relying on this report.",
                body_style,
            ),
        ]
    )
    document.build(story)
    return output.getvalue()


async def _send_certificate(chat_id: int, result: Any, request: CropDamageRequest) -> None:
    content = _create_certificate_pdf(result, request)
    filename = f"satquery-crop-screening-{request.claim_date}.pdf"
    await _telegram_request(
        "sendDocument",
        payload={
            "chat_id": str(chat_id),
            "caption": "Crop damage screening report. Verify the observations and scheme requirements independently.",
        },
        files={"document": (filename, content, "application/pdf")},
    )


async def _handle_message(message: dict[str, Any]) -> None:
    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    if not isinstance(chat_id, int):
        return
    if chat.get("type") != "private":
        await _send_message(chat_id, "For privacy, please message me directly rather than in a group.")
        return

    text = message.get("text", "")
    command = ""
    if isinstance(text, str) and text.strip():
        command = text.strip().split(maxsplit=1)[0].split("@", 1)[0].casefold()
    if command == "/start":
        _clear_claim(chat_id)
        await _send_message(
            chat_id,
            "Welcome to SatQuery crop-loss screening. Share your farm's GPS location, "
            "then send a text or voice note describing the crop, damage type, and event date. "
            "A farmer name is optional. Send /cancel to clear the current claim.",
        )
        return
    if isinstance(text, str) and text.strip().casefold() == "/cancel":
        _clear_claim(chat_id)
        await _send_message(chat_id, "The current claim details have been cleared.")
        return

    location = message.get("location")
    if isinstance(location, dict):
        try:
            latitude = float(location["latitude"])
            longitude = float(location["longitude"])
        except (KeyError, TypeError, ValueError):
            await _send_message(chat_id, "I couldn't read that GPS location. Please share a valid location pin.")
            return
        if not (-80 <= latitude <= 80 and -180 <= longitude <= 180):
            await _send_message(chat_id, "That location is outside the currently supported latitude range.")
            return
        _save_location(chat_id, latitude, longitude)
        await _send_message(
            chat_id,
            "Location saved. Now describe the crop, the reported damage, and the event date. "
            "You can type a message or send a voice note.",
        )
        return

    claim = _get_claim(chat_id)
    if claim is None or claim["lat"] is None or claim["lng"] is None:
        await _send_message(chat_id, "First share your farm's GPS location using Telegram's location attachment.")
        return

    voice = message.get("voice")
    voice_bytes = None
    if isinstance(voice, dict) and isinstance(voice.get("file_id"), str):
        if not os.getenv("GEMINI_API_KEY"):
            await _send_message(chat_id, "Voice-note processing needs GEMINI_API_KEY configured on the backend. You can send the claim details as text instead.")
            return
        try:
            voice_bytes = await _download_voice(voice["file_id"])
        except (httpx.HTTPError, RuntimeError, ValueError) as error:
            logger.warning("Telegram voice download failed (%s).", type(error).__name__)
            await _send_message(chat_id, "I couldn't retrieve that voice note. Please retry or send the details as text.")
            return
        claim_text = "[Voice note attached]"
    elif isinstance(text, str) and text.strip():
        claim_text = text.strip()[:2000]
    else:
        await _send_message(chat_id, "Send crop details as text or as a Telegram voice note.")
        return

    context = _append_claim_context(chat_id, claim_text)
    details = await _extract_claim_details(context, voice_bytes)
    if details is None:
        await _send_message(chat_id, "I couldn't interpret the claim. Please send the crop, damage type, and event date (YYYY-MM-DD) as text.")
        return
    missing = [
        name
        for name, value in (
            ("crop type", details["crop_type"]),
            ("damage type (drought, hail, flood, or unseasonal rain)", details["damage_type"]),
            ("event date (YYYY-MM-DD)", details["claim_date"]),
        )
        if not value
    ]
    if missing:
        known_details = ", ".join(
            f"{name}={value}"
            for name, value in (
                ("crop_type", details["crop_type"]),
                ("damage_type", details["damage_type"]),
                ("claim_date", details["claim_date"]),
                ("farmer_name", details["farmer_name"]),
            )
            if value
        )
        if known_details:
            _append_claim_context(
                chat_id,
                f"Previously extracted claim details (farmer may correct these): {known_details}",
            )
        await _send_message(chat_id, "Please provide " + ", ".join(missing) + ". You can send all missing details in one message.")
        return

    request = CropDamageRequest(
        lat=claim["lat"],
        lng=claim["lng"],
        crop_type=details["crop_type"],
        damage_type=details["damage_type"],
        claim_date=details["claim_date"],
        farmer_name=details["farmer_name"],
    )
    await _send_message(chat_id, "Thanks. I'm analyzing the reported location and will send the screening result shortly.")
    try:
        result = await analyze_crop_damage(request)
        await _send_message(
            chat_id,
            (
                f"Crop damage screening\n"
                f"Crop: {request.crop_type}\n"
                f"Reported event: {request.damage_type.replace('_', ' ').title()} on {request.claim_date}\n"
                f"NDVI change: {result.ndvi_drop_pct:.1f}%\n"
                f"Screening category: {result.damage_severity}\n\n"
                f"{result.ai_assessment[:1800]}\n\n"
                "This is an automated screening result, not an official claim decision. Verify the data and scheme requirements."
            ),
        )
        await _send_certificate(chat_id, result, request)
    except Exception:
        logger.exception("Telegram crop claim analysis or delivery failed.")
        await _send_message(chat_id, "The analysis or report delivery failed. Please retry with /start.")
    finally:
        _clear_claim(chat_id)


async def _process_update(update: dict[str, Any]) -> None:
    message = update.get("message")
    if not isinstance(message, dict):
        return
    try:
        await _handle_message(message)
    except Exception:
        logger.exception("Failed to process a Telegram message.")
        chat_id = (message.get("chat") or {}).get("id")
        if isinstance(chat_id, int):
            try:
                await _send_message(chat_id, "I couldn't process that request. Please retry with /start.")
            except Exception:
                logger.exception("Could not send Telegram error response.")


@router.post("/api/telegram/webhook")
async def telegram_webhook(request: Request, background_tasks: BackgroundTasks):
    if not _secret_is_configured():
        raise HTTPException(503, "Telegram webhook is not configured.")
    expected_secret = os.environ["TELEGRAM_WEBHOOK_SECRET"]
    supplied_secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if not hmac.compare_digest(
        supplied_secret.encode("utf-8"), expected_secret.encode("utf-8")
    ):
        raise HTTPException(403, "Invalid webhook secret.")
    body = await request.body()
    if len(body) > MAX_UPDATE_BYTES:
        raise HTTPException(413, "Telegram update is too large.")
    try:
        update = json.loads(body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(400, "Invalid Telegram update.")
    update_id = update.get("update_id") if isinstance(update, dict) else None
    if not isinstance(update_id, int):
        raise HTTPException(400, "Telegram update is missing a valid update_id.")
    if not _record_update_once(update_id):
        return {"ok": True, "duplicate": True}
    background_tasks.add_task(_process_update, update)
    return {"ok": True}
