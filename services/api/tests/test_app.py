"""Health, disclosure, CORS, body limits and response headers."""

from __future__ import annotations

from recall_api.config import Settings

from .conftest import BEE_SOURCE, client_for, openai_settings, score_request


def test_health(client) -> None:
    body = client.get("/health").json()
    assert body["status"] == "ok" and body["optional"] is True
    assert body["providers"] == {"key_ideas": "fake", "recall_scoring": "fake", "transcription": "fake"}


def test_providers_disclosure_default_is_offline(client) -> None:
    body = client.get("/v1/providers").json()
    assert body["selected_provider"] == "fake"
    assert body["active"] == {"key_ideas": "fake", "recall_scoring": "fake", "transcription": "fake"}
    enabled = {p["name"]: p["enabled"] for p in body["providers"]}
    assert enabled["fake"] is True and enabled["openai_compatible"] is False and enabled["hosted"] is False
    assert body["a001_gate_passed"] is False and body["shadow_only"] is True
    flow = body["data_flow"]
    assert "Nothing is sent to any other service" in flow["text"]
    assert "never stored" in flow["audio"]
    assert "never logged" in flow["logging"]
    assert "A001" in flow["scoring_status"]


def test_providers_disclosure_remote_names_destination_and_retention() -> None:
    settings = openai_settings(
        llm_base_url="https://models.example.com:8443/v1", provider_retention_note="Provider keeps nothing (per contract)."
    )
    body = client_for(settings).get("/v1/providers").json()
    assert body["active"]["key_ideas"] == "openai_compatible"
    assert body["active"]["transcription"] is None
    assert "https://models.example.com:8443" in body["data_flow"]["text"]
    assert body["data_flow"]["provider_retention"] == "Provider keeps nothing (per contract)."
    assert "unavailable" in body["data_flow"]["audio"]
    assert body["consent"]["remote_text_allowed"] is True


def test_settings_from_env_requires_exact_consent_flag() -> None:
    env = {
        "RECALL_PROVIDER": "openai_compatible",
        "RECALL_LLM_BASE_URL": "http://localhost:1234",
        "RECALL_ALLOW_REMOTE_TEXT": "true",  # only "1" counts
        "RECALL_ALLOWED_ORIGINS": "https://app.example, *, null, http://localhost:5173/",
    }
    settings = Settings.from_env(env)
    assert settings.allow_remote_text is False
    assert settings.allowed_origins == ("https://app.example", "http://localhost:5173")
    assert client_for(settings).post(
        "/v1/key-ideas", json={"chunk_id": "C1", "source_text": BEE_SOURCE}
    ).status_code == 503


def test_cors_default_allows_no_origin(client) -> None:
    response = client.options(
        "/v1/score-recall",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in response.headers
    get = client.get("/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in get.headers


def test_cors_only_for_listed_origins() -> None:
    client = client_for(Settings(allowed_origins=("https://recall.example",)))
    ok = client.options(
        "/v1/score-recall",
        headers={"Origin": "https://recall.example", "Access-Control-Request-Method": "POST"},
    )
    assert ok.headers.get("access-control-allow-origin") == "https://recall.example"
    other = client.options(
        "/v1/score-recall",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert other.headers.get("access-control-allow-origin") != "https://evil.example"


def test_json_body_over_limit_is_413(client) -> None:
    response = client.post(
        "/v1/score-recall",
        content=b'{"case_id":"C1","pad":"' + b"a" * 200_000 + b'"}',
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 413
    assert response.json()["error"] == "payload_too_large"


def test_responses_are_not_cacheable_and_docs_are_disabled(client) -> None:
    response = client.post("/v1/score-recall", json=score_request())
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert client.get("/docs").status_code == 404  # no third-party CDN assets
    assert client.get("/openapi.json").status_code == 200


def test_unknown_route_is_json_404(client) -> None:
    response = client.get("/v1/analytics")
    assert response.status_code == 404 and response.json()["error"] == "not_found"


def test_streamed_body_without_content_length_is_still_limited(client) -> None:
    def chunks():
        yield b'{"case_id":"C1","pad":"'
        for _ in range(40):
            yield b"a" * 4096
        yield b'"}'

    response = client.post("/v1/score-recall", content=chunks(), headers={"content-type": "application/json"})
    assert response.status_code == 413
    assert response.json()["error"] == "payload_too_large"
