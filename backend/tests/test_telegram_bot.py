from fastapi.testclient import TestClient

from app import main, telegram_bot
from app.models import CropDamageRequest, CropDamageResult


def test_webhook_requires_token_and_secret(monkeypatch, tmp_path):
    monkeypatch.setattr(telegram_bot, "DATA_DIR", tmp_path)
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setenv("TELEGRAM_WEBHOOK_SECRET", "test_secret_123")
    monkeypatch.setattr(main, "DB", tmp_path / "jobs.sqlite3")

    with TestClient(main.app) as client:
        rejected = client.post(
            "/api/telegram/webhook",
            json={"update_id": 1, "message": {}},
        )
        assert rejected.status_code == 403

        accepted = client.post(
            "/api/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "test_secret_123"},
            json={"update_id": 2, "message": {}},
        )
        assert accepted.status_code == 200
        duplicate = client.post(
            "/api/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "test_secret_123"},
            json={"update_id": 2, "message": {}},
        )
        assert duplicate.json() == {"ok": True, "duplicate": True}


def test_claim_details_are_validated_without_guessing():
    details = telegram_bot._validate_claim_details(
        {
            "crop_type": "  Rice  ",
            "damage_type": "flood",
            "claim_date": "2024-07-25",
            "farmer_name": " Farmer ",
        }
    )
    assert details == {
        "crop_type": "Rice",
        "damage_type": "flood",
        "claim_date": "2024-07-25",
        "farmer_name": "Farmer",
    }

    invalid = telegram_bot._validate_claim_details(
        {
            "crop_type": None,
            "damage_type": "unknown",
            "claim_date": "2999-01-01",
            "farmer_name": None,
        }
    )
    assert invalid == {
        "crop_type": None,
        "damage_type": None,
        "claim_date": None,
        "farmer_name": None,
    }


def test_heuristic_extracts_supported_text_fields():
    details = telegram_bot._extract_claim_details_heuristic(
        "Rice crop damaged by flood on 2024-07-25"
    )
    assert details["crop_type"] == "Rice"
    assert details["damage_type"] == "flood"
    assert details["claim_date"] == "2024-07-25"


def test_certificate_pdf_is_a_real_pdf():
    request = CropDamageRequest(
        lat=26.2,
        lng=92.9,
        crop_type="Rice",
        damage_type="flood",
        claim_date="2024-07-25",
        farmer_name="Test Farmer",
    )
    result = CropDamageResult(
        ndvi_before=0.7,
        ndvi_after=0.4,
        ndvi_drop_pct=42.9,
        weather_data={"provider": "NASA POWER"},
        damage_severity="Substantial Damage",
        ai_assessment="Screening assessment.",
    )
    pdf = telegram_bot._create_certificate_pdf(result, request)
    assert pdf.startswith(b"%PDF-")


def test_claim_storage_updates_location_and_clears_state(monkeypatch, tmp_path):
    monkeypatch.setattr(telegram_bot, "DATA_DIR", tmp_path)
    telegram_bot.initialize_telegram_storage()
    telegram_bot._save_location(123, 26.2, 92.9)
    assert telegram_bot._get_claim(123) == {"lat": 26.2, "lng": 92.9, "context": ""}
    assert telegram_bot._append_claim_context(123, "Rice flood 2024-07-25").startswith("Rice")
    telegram_bot._clear_claim(123)
    assert telegram_bot._get_claim(123) is None
