"""POST /v1/transcribe: limits, availability and temporary-audio lifecycle."""

from __future__ import annotations

import os
import tempfile

import pytest

from recall_api.config import MAX_AUDIO_BYTES, Settings
from recall_api.providers.base import AudioInput, ProviderError
from recall_api.schemas import TranscriptionResult

from .conftest import bundle, client_for, openai_settings

WAV = b"RIFF\x00\x00\x00\x00WAVEfmt " + b"\x00" * 64


class FileNeedingTranscriber:
    """Stands in for a provider that needs a file path (e.g. a local CLI)."""

    name = "file_needing"
    requires_file = True

    def __init__(self, fail: bool = False) -> None:
        self.fail = fail
        self.seen_paths: list[str] = []
        self.saw_bytes: bytes | None = None

    def transcribe(self, audio: AudioInput) -> TranscriptionResult:
        assert audio.path is not None and audio.data is None
        self.seen_paths.append(audio.path)
        assert os.path.exists(audio.path)
        assert (os.stat(audio.path).st_mode & 0o077) == 0  # private to this process' user
        with open(audio.path, "rb") as fh:
            self.saw_bytes = fh.read()
        if self.fail:
            raise ProviderError("provider_unreachable", "transcriber failed")
        return TranscriptionResult(transcript="the bees dance", confidence=0.8)


def test_fake_transcription_returns_fixed_transcript_needing_confirmation(client) -> None:
    response = client.post("/v1/transcribe", files={"audio": ("answer.wav", WAV, "audio/wav")})
    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "fake"
    assert 0 <= body["confidence"] <= 1
    assert body["requires_confirmation"] is True and body["audio_retained"] is False
    assert body["transcript_meta"] == {"origin": "asr", "confirmed": False, "asr_confidence": body["confidence"]}


def test_transcript_meta_round_trips_into_asr_uncertain_scoring(client) -> None:
    meta = client.post("/v1/transcribe", files={"audio": ("a.wav", WAV, "audio/wav")}).json()["transcript_meta"]
    from .conftest import score_request

    body = client.post("/v1/score-recall", json=score_request(transcript_meta=meta)).json()
    assert body["label"] == "asr_uncertain" and body["score"] is None


def test_audio_over_5_mb_is_413(client) -> None:
    big = b"\x00" * (MAX_AUDIO_BYTES + 1)
    response = client.post("/v1/transcribe", files={"audio": ("big.wav", big, "audio/wav")})
    assert response.status_code == 413
    assert response.json()["error"] == "payload_too_large"


def test_body_far_over_limit_is_rejected_before_parsing(client) -> None:
    response = client.post(
        "/v1/transcribe",
        content=b"\x00" * (MAX_AUDIO_BYTES + 200_000),
        headers={"content-type": "multipart/form-data; boundary=x"},
    )
    assert response.status_code == 413


@pytest.mark.parametrize(
    ("files", "data", "status", "error"),
    [
        ({"audio": ("a.wav", b"", "audio/wav")}, None, 422, "empty_audio"),
        ({"other": ("a.wav", WAV, "audio/wav")}, None, 422, "missing_audio"),
        ({"audio": ("a.txt", b"hello", "text/plain")}, None, 415, "unsupported_media_type"),
        ({"other": ("b.bin", b"x", "application/octet-stream")}, {"audio": "not a file"}, 422, "invalid_audio"),
    ],
)
def test_bad_uploads_are_rejected(client, files, data, status: int, error: str) -> None:
    response = client.post("/v1/transcribe", files=files, data=data)
    assert response.status_code == status
    assert response.json()["error"] == error


def test_non_multipart_body_is_415(client) -> None:
    response = client.post("/v1/transcribe", content=WAV, headers={"content-type": "audio/wav"})
    assert response.status_code == 415


@pytest.mark.parametrize(
    "settings",
    [Settings(transcription_provider="none"), openai_settings()],
)
def test_transcription_unavailable_is_503_json(settings: Settings) -> None:
    client = client_for(settings)
    response = client.post("/v1/transcribe", files={"audio": ("a.wav", WAV, "audio/wav")})
    assert response.status_code == 503
    body = response.json()
    assert body["error"] == "transcription_unavailable"
    assert "detail" in body


def test_fake_transcriber_writes_no_temp_files(client, monkeypatch: pytest.MonkeyPatch) -> None:
    def forbidden(*_a, **_k):
        raise AssertionError("temp file created for an in-memory provider")

    monkeypatch.setattr(tempfile, "mkstemp", forbidden)
    monkeypatch.setattr(tempfile, "NamedTemporaryFile", forbidden)
    monkeypatch.setattr(tempfile, "SpooledTemporaryFile", forbidden)
    monkeypatch.setattr(tempfile, "TemporaryFile", forbidden)
    big_but_allowed = b"\x01" * (2 * 1024 * 1024)  # > Starlette's 1 MB spool threshold
    response = client.post("/v1/transcribe", files={"audio": ("a.wav", big_but_allowed, "audio/wav")})
    assert response.status_code == 200


def test_temp_audio_is_deleted_after_success() -> None:
    provider = FileNeedingTranscriber()
    client = client_for(providers=bundle(transcription=provider))
    response = client.post("/v1/transcribe", files={"audio": ("a.m4a", WAV, "audio/mp4")})
    assert response.status_code == 200 and response.json()["transcript"] == "the bees dance"
    assert provider.saw_bytes == WAV
    assert len(provider.seen_paths) == 1 and not os.path.exists(provider.seen_paths[0])


def test_temp_audio_is_deleted_even_when_provider_fails() -> None:
    provider = FileNeedingTranscriber(fail=True)
    client = client_for(providers=bundle(transcription=provider))
    response = client.post("/v1/transcribe", files={"audio": ("a.wav", WAV, "audio/wav")})
    assert response.status_code == 502
    assert response.json()["code"] == "provider_unreachable"
    assert len(provider.seen_paths) == 1 and not os.path.exists(provider.seen_paths[0])
