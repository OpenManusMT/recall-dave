"""Shared fixtures. No test may reach the network: real transports are blocked."""

from __future__ import annotations

import json
import socket
from collections.abc import Callable
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient

from recall_api.config import Settings
from recall_api.main import create_app
from recall_api.providers import ProviderBundle

BEE_SOURCE = (
    "Honeybees that find a good source of nectar return to the hive and perform a waggle "
    "dance. The direction of the dance helps other bees work out where the food lies "
    "relative to the sun, while features of the dance also communicate distance."
)
BEE_IDEAS = [
    {"idea_id": "K1", "text": "Honeybees use a waggle dance to tell other bees where food is."},
    {"idea_id": "K2", "text": "The dance communicates both direction and distance."},
]
TOMATO_SOURCE = (
    "Tomato plants grow best when their soil stays evenly moist rather than repeatedly "
    "drying out and becoming waterlogged. Watering at soil level also helps keep the "
    "leaves dry, which can reduce the conditions that favour some fungal diseases."
)
QUALIFIED_SOURCE = (
    "Cats usually sleep for about fifteen hours a day. Kittens don't hunt until they are "
    "several weeks old. Most adult cats prefer to eat several small meals."
)

# Clearly fake credential used only to prove redaction / header handling.
TEST_KEY = "sk-test-0000000000000000-not-a-real-key"


@pytest.fixture(autouse=True)
def _no_real_network(monkeypatch: pytest.MonkeyPatch) -> None:
    def refuse(*_a: Any, **_k: Any) -> Any:
        raise AssertionError("a test attempted a real network connection")

    monkeypatch.setattr(httpx.HTTPTransport, "handle_request", refuse)
    monkeypatch.setattr(httpx.AsyncHTTPTransport, "handle_async_request", refuse)
    monkeypatch.setattr(socket.socket, "connect", refuse)
    monkeypatch.setattr(socket, "create_connection", refuse)


def client_for(
    settings: Settings | None = None,
    *,
    providers: ProviderBundle | None = None,
    transport: httpx.BaseTransport | None = None,
) -> TestClient:
    return TestClient(create_app(settings or Settings(), providers=providers, http_transport=transport))


@pytest.fixture
def client() -> TestClient:
    return client_for(Settings())


def bundle(key_ideas: Any = None, scoring: Any = None, transcription: Any = None) -> ProviderBundle:
    return ProviderBundle(key_ideas=key_ideas, scoring=scoring, transcription=transcription)


class ScriptedKeyIdeas:
    """Returns a fixed (possibly unsafe) provider proposal."""

    name = "scripted"

    def __init__(self, ideas: list[dict[str, Any]], chunk_id: str | None = None) -> None:
        self.ideas = ideas
        self.chunk_id = chunk_id
        self.calls = 0

    def extract_key_ideas(self, request: Any) -> dict[str, Any]:
        self.calls += 1
        return {"chunk_id": self.chunk_id or request.chunk_id, "ideas": self.ideas}


class ScriptedScorer:
    name = "scripted"

    def __init__(self, result: dict[str, Any]) -> None:
        self.result = result
        self.calls = 0

    def score_recall(self, request: Any) -> dict[str, Any]:
        self.calls += 1
        return {"case_id": request.case_id, **self.result}


def idea(**overrides: Any) -> dict[str, Any]:
    base = {
        "idea_id": "K1",
        "idea": "Honeybees perform a waggle dance after finding nectar.",
        "importance": 1.0,
        "source_spans": ["return to the hive and perform a waggle dance"],
        "critical_qualifiers": [],
        "relationship": "sequence",
        "confidence": 0.9,
    }
    base.update(overrides)
    return base


def score_request(learner_text: str = "Bees dance to show where food is.", **overrides: Any) -> dict[str, Any]:
    body = {
        "case_id": "C001",
        "source_text": BEE_SOURCE,
        "key_ideas": BEE_IDEAS,
        "learner_text": learner_text,
        "transcript_meta": {"origin": "typed", "confirmed": True},
    }
    body.update(overrides)
    return body


GOOD_EVIDENCE = [
    {
        "learner_span": "Bees dance to show where food is",
        "source_span": "perform a waggle dance",
    }
]


def chat_response(content: str | dict[str, Any], status: int = 200) -> httpx.Response:
    text = content if isinstance(content, str) else json.dumps(content)
    return httpx.Response(
        status, json={"id": "x", "choices": [{"index": 0, "message": {"role": "assistant", "content": text}}]}
    )


def recording_transport(
    responder: Callable[[httpx.Request], httpx.Response],
) -> tuple[httpx.MockTransport, list[httpx.Request]]:
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return responder(request)

    return httpx.MockTransport(handler), calls


def openai_settings(**overrides: Any) -> Settings:
    values: dict[str, Any] = {
        "provider": "openai_compatible",
        "llm_base_url": "http://127.0.0.1:8080",
        "llm_model": "test-model",
        "llm_api_key": TEST_KEY,
        "allow_remote_text": True,
    }
    values.update(overrides)
    return Settings(**values)
