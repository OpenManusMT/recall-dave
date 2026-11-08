"""Logs never contain request bodies, reading text, learner text, audio or secrets."""

from __future__ import annotations

import logging

import pytest

from recall_api.logging_utils import (
    REDACTED,
    PrivacyFormatter,
    RedactingFilter,
    get_logger,
    redact,
    register_secrets,
    sensitive_scope,
)

from .conftest import (
    TEST_KEY,
    chat_response,
    client_for,
    openai_settings,
    recording_transport,
    score_request,
)

PRIVATE_SOURCE = (
    "Zanzibar cormorants nest beside the turquoise lagoon every winter. "
    "Their chicks usually fledge after about seven weeks."
)
PRIVATE_ANSWER = "Cormorant chicks from the turquoise lagoon fledge quickly, Quillon-Marigold."
AUDIO_MARKER = b"AUDIO-MARKER-PRIVATE-WAVEFORM"


def _exercise_all_endpoints(client) -> None:
    client.post("/v1/key-ideas", json={"chunk_id": "P1", "source_text": PRIVATE_SOURCE})
    client.post(
        "/v1/score-recall",
        json=score_request(
            PRIVATE_ANSWER,
            source_text=PRIVATE_SOURCE,
            key_ideas=[{"idea_id": "K1", "text": "Cormorant chicks usually fledge after about seven weeks."}],
        ),
    )
    client.post(
        "/v1/score-recall",
        json=score_request(PRIVATE_ANSWER, transcript_meta={"origin": "asr", "confirmed": False}),
    )
    client.post("/v1/transcribe", files={"audio": ("private-name.wav", AUDIO_MARKER * 10, "audio/wav")})
    client.post("/v1/key-ideas", json={"chunk_id": "P1", "source_text": PRIVATE_SOURCE + "x" * 5000})


def _assert_clean(text: str) -> None:
    for needle in ("Zanzibar", "turquoise", "Quillon-Marigold", "seven weeks", "AUDIO-MARKER", "private-name"):
        assert needle not in text, f"{needle!r} leaked into logs"


def test_no_submitted_text_or_audio_in_logs_fake_mode(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.DEBUG)
    _exercise_all_endpoints(client_for())
    assert "path=/v1/score-recall status=200" in caplog.text  # metadata IS logged
    _assert_clean(caplog.text)


def test_no_text_or_key_in_logs_with_remote_adapter(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.DEBUG)
    transport, calls = recording_transport(lambda _r: chat_response("not json, but contains Zanzibar"))
    client = client_for(openai_settings(), transport=transport)
    _exercise_all_endpoints(client)
    assert calls  # the adapter really was exercised
    _assert_clean(caplog.text)
    assert TEST_KEY not in caplog.text


@pytest.mark.parametrize(
    "secret",
    [
        "Authorization: Bearer abcdefghijklmnop.qrstu",
        f"using key {TEST_KEY}",
        "api_key=supersecretvalue123",
        "https://admin:hunter2@models.example.com/v1",
        "token: " + "Z" * 48,
    ],
)
def test_secret_like_strings_are_redacted(secret: str) -> None:
    out = redact(secret)
    assert REDACTED in out
    for fragment in ("abcdefghijklmnop", "0000000000000000", "supersecretvalue123", "hunter2", "Z" * 48):
        assert fragment not in out


def test_configured_secret_values_are_redacted_verbatim(caplog: pytest.LogCaptureFixture) -> None:
    register_secrets(["plainsecretwithoutprefix"])
    logger = get_logger("recall_api.test_secret")
    with caplog.at_level(logging.INFO):
        logger.info("connecting with %s", "plainsecretwithoutprefix")
    assert "plainsecretwithoutprefix" not in caplog.text and REDACTED in caplog.text


def test_sensitive_scope_redacts_user_text_even_if_logged_by_mistake(caplog: pytest.LogCaptureFixture) -> None:
    logger = get_logger("recall_api.test_scope")
    with caplog.at_level(logging.INFO), sensitive_scope(PRIVATE_SOURCE):
        logger.info("oops, logging the body: %s", PRIVATE_SOURCE)
        logger.info("and one sentence: %s", "Their chicks usually fledge after about seven weeks.")
    _assert_clean(caplog.text)
    assert caplog.text.count(REDACTED) >= 2


def test_exception_details_are_suppressed(caplog: pytest.LogCaptureFixture) -> None:
    logger = get_logger("recall_api.test_exc")
    with caplog.at_level(logging.INFO):
        try:
            raise ValueError(f"bad input: {PRIVATE_ANSWER}")
        except ValueError:
            logger.exception("failure")
    _assert_clean(caplog.text)
    assert "ValueError" in caplog.text


def test_uvicorn_access_log_query_string_is_stripped() -> None:
    record = logging.LogRecord(
        "uvicorn.access", logging.INFO, __file__, 1, '%s - "%s %s HTTP/%s" %d',
        ("127.0.0.1:5000", "GET", "/v1/providers?text=Zanzibar", "1.1", 200), None,
    )
    RedactingFilter().filter(record)
    message = record.getMessage()
    assert "Zanzibar" not in message and "/v1/providers" in message


def test_privacy_formatter_redacts_final_line() -> None:
    record = logging.LogRecord("x", logging.INFO, __file__, 1, "Bearer abcdefghijklmnopqrstuvwxyz", None, None)
    assert "abcdefghijklmnopqrstuvwxyz" not in PrivacyFormatter("%(message)s").format(record)


def test_unhandled_errors_return_generic_500_without_details(caplog: pytest.LogCaptureFixture) -> None:
    from .conftest import bundle

    class Exploding:
        name = "exploding"

        def score_recall(self, request):
            raise RuntimeError(f"crash while handling {request.learner_text}")

    caplog.set_level(logging.DEBUG)
    from fastapi.testclient import TestClient

    from recall_api.main import create_app

    client = TestClient(create_app(providers=bundle(scoring=Exploding())), raise_server_exceptions=False)
    response = client.post("/v1/score-recall", json=score_request(PRIVATE_ANSWER))
    assert response.status_code == 500
    assert response.json() == {"error": "internal_error", "detail": "unexpected server error"}
    _assert_clean(caplog.text)
    _assert_clean(response.text)
