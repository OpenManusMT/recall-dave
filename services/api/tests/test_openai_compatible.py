"""OpenAI-compatible and hosted adapters, exercised only through httpx.MockTransport."""

from __future__ import annotations

import json

import httpx
import pytest

from recall_api.config import Settings
from recall_api.providers.openai_compatible import chat_completions_url, check_base_url

from .conftest import (
    BEE_SOURCE,
    GOOD_EVIDENCE,
    TEST_KEY,
    chat_response,
    client_for,
    idea,
    openai_settings,
    recording_transport,
    score_request,
)

GOOD_KEY_IDEAS = {"chunk_id": "C001", "ideas": [idea()]}
CORRECT_SCORE = {
    "case_id": "C001",
    "label": "correct",
    "score": 0.93,
    "clue_level": 0,
    "action": "accept",
    "idea_scores": [
        {"idea_id": "K1", "coverage": 0.92, "entailment": 0.96, "relationship_accuracy": 1.0, "contradiction": False}
    ],
    "evidence": GOOD_EVIDENCE,
}


def _client(content: object, settings: Settings | None = None, status: int = 200):
    transport, calls = recording_transport(lambda _req: chat_response(content, status))  # type: ignore[arg-type]
    return client_for(settings or openai_settings(), transport=transport), calls


def test_good_json_key_ideas_and_request_shape() -> None:
    client, calls = _client(GOOD_KEY_IDEAS)
    response = client.post("/v1/key-ideas", json={"chunk_id": "C001", "source_text": BEE_SOURCE})
    assert response.status_code == 200, response.json()
    assert response.json()["provider"] == "openai_compatible"
    assert len(calls) == 1
    req = calls[0]
    assert req.method == "POST"
    assert str(req.url) == "http://127.0.0.1:8080/v1/chat/completions"
    assert req.headers["authorization"] == f"Bearer {TEST_KEY}"
    body = json.loads(req.content)
    assert body["temperature"] == 0
    assert body["response_format"] == {"type": "json_object"}
    assert body["model"] == "test-model" and body["stream"] is False
    assert [m["role"] for m in body["messages"]] == ["system", "user"]


def test_good_json_scoring_passes_safety() -> None:
    client, calls = _client(CORRECT_SCORE)
    body = client.post("/v1/score-recall", json=score_request()).json()
    assert (body["label"], body["action"], body["provider"]) == ("correct", "accept", "openai_compatible")
    assert len(calls) == 1


def test_api_key_is_optional_for_local_servers() -> None:
    client, calls = _client(GOOD_KEY_IDEAS, openai_settings(llm_api_key=None))
    assert client.post("/v1/key-ideas", json={"chunk_id": "C001", "source_text": BEE_SOURCE}).status_code == 200
    assert "authorization" not in calls[0].headers


@pytest.mark.parametrize(
    "content",
    ["not json at all", '{"chunk_id": "C001", "ideas": [', "[1, 2, 3]", "```json\n{oops}\n```"],
)
def test_malformed_json_is_a_safe_error(content: str) -> None:
    client, _ = _client(content)
    response = client.post("/v1/key-ideas", json={"chunk_id": "C001", "source_text": BEE_SOURCE})
    assert response.status_code == 502
    body = response.json()
    assert body["error"] == "provider_error" and body["code"] == "provider_malformed_output"
    assert "oops" not in response.text and "ideas" not in body["detail"]


def test_fenced_json_is_tolerated() -> None:
    client, _ = _client("```json\n" + json.dumps(GOOD_KEY_IDEAS) + "\n```")
    assert client.post("/v1/key-ideas", json={"chunk_id": "C001", "source_text": BEE_SOURCE}).status_code == 200


def test_schema_mismatch_and_http_errors_are_safe() -> None:
    client, _ = _client({**CORRECT_SCORE, "label": "brilliant", "comment": "Bees dance to show where food is"})
    response = client.post("/v1/score-recall", json=score_request())
    assert response.status_code == 502 and response.json()["code"] == "provider_schema_mismatch"
    assert "Bees dance" not in response.text

    client, _ = _client({"error": "overloaded"}, status=503)
    response = client.post("/v1/score-recall", json=score_request())
    assert response.status_code == 502 and response.json()["code"] == "provider_http_error"


def test_timeout_is_a_safe_error() -> None:
    def boom(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow", request=request)

    client = client_for(openai_settings(), transport=httpx.MockTransport(boom))
    response = client.post("/v1/score-recall", json=score_request())
    assert response.status_code == 502 and response.json()["code"] == "provider_timeout"


def test_hallucinated_span_from_model_is_rejected() -> None:
    hallucinated = {"chunk_id": "C001", "ideas": [idea(source_spans=["bees vote on a new queen every spring"])]}
    client, _ = _client(hallucinated)
    response = client.post("/v1/key-ideas", json={"chunk_id": "C001", "source_text": BEE_SOURCE})
    assert response.status_code == 422
    assert response.json()["rejected"][0]["reason"] == "source_span_not_in_source"


def test_contradiction_labelled_correct_by_model_is_not_fixable() -> None:
    """Documented limitation: post-processing cannot see that a grounded-looking
    'correct' is really a contradiction. This is why the A001 gate is mandatory
    and every score is shadow-only."""
    contradiction_answer = "Bees dance to show where food is not."
    mislabelled = {**CORRECT_SCORE, "evidence": [{"learner_span": "Bees dance to show where food is", "source_span": "perform a waggle dance"}]}
    client, _ = _client(mislabelled)
    body = client.post("/v1/score-recall", json=score_request(contradiction_answer)).json()
    assert body["label"] == "correct"  # NOT fixable server-side
    assert body["shadow_only"] is True


def test_model_contradiction_with_high_score_is_clamped() -> None:
    client, _ = _client({**CORRECT_SCORE, "label": "contradiction", "score": 0.88, "action": "accept"})
    body = client.post("/v1/score-recall", json=score_request()).json()
    assert body["label"] == "contradiction"
    assert body["score"] <= 0.15 and body["action"] == "correct_misconception_then_cue"


def test_unconfirmed_asr_never_reaches_the_model() -> None:
    client, calls = _client(CORRECT_SCORE)
    body = client.post(
        "/v1/score-recall", json=score_request(transcript_meta={"origin": "asr", "confirmed": False})
    ).json()
    assert body["label"] == "asr_uncertain" and calls == []


@pytest.mark.parametrize(
    "settings",
    [
        openai_settings(allow_remote_text=False),  # no consent flag
        openai_settings(llm_base_url=None),  # no base URL
        openai_settings(provider="fake_typo"),  # unknown provider
        openai_settings(llm_base_url="http://models.example.com"),  # plain http to remote host
        openai_settings(llm_base_url="https://user:pw@models.example.com"),  # creds in URL
        Settings(llm_base_url="https://models.example.com", allow_remote_text=True),  # not selected
    ],
)
def test_disabled_adapter_attempts_no_outbound_request(settings: Settings) -> None:
    client, calls = _client(GOOD_KEY_IDEAS, settings)
    if settings.provider == "fake":
        # Fake stays active; the remote adapter is simply not used.
        assert client.post("/v1/key-ideas", json={"chunk_id": "C001", "source_text": BEE_SOURCE}).json()["provider"] == "fake"
    else:
        for path, payload in [
            ("/v1/key-ideas", {"chunk_id": "C001", "source_text": BEE_SOURCE}),
            ("/v1/score-recall", score_request()),
        ]:
            response = client.post(path, json=payload)
            assert response.status_code == 503
            assert response.json()["error"] == "provider_unavailable"
    assert calls == []
    status = {p["name"]: p for p in client.get("/v1/providers").json()["providers"]}
    assert status["openai_compatible"]["enabled"] is False


def test_base_url_rules() -> None:
    assert check_base_url("http://localhost:11434") is None
    assert check_base_url("https://models.example.com") is None
    assert check_base_url("http://models.example.com") is not None
    assert check_base_url("http://models.example.com", allow_insecure_http=True) is None
    assert check_base_url("ftp://models.example.com") is not None
    assert check_base_url("https://models.example.com/?x=1") is not None
    assert chat_completions_url("http://localhost:11434/v1/") == "http://localhost:11434/v1/chat/completions"
    assert chat_completions_url("https://h.example") == "https://h.example/v1/chat/completions"


# --- hosted placeholder ---------------------------------------------------------


def _hosted(**overrides: object) -> Settings:
    values: dict = {
        "provider": "hosted",
        "hosted_api_key": TEST_KEY,
        "hosted_consent": True,
        "hosted_base_url": "https://api.hosted.example",
        "hosted_model": "hosted-test-model",
        "hosted_provider_name": "Example Hosted AI",
    }
    values.update(overrides)
    return Settings(**values)


def test_hosted_disabled_by_default() -> None:
    status = {p["name"]: p for p in client_for(Settings()).get("/v1/providers").json()["providers"]}
    assert status["hosted"]["enabled"] is False
    assert Settings.from_env({}).provider == "fake"


@pytest.mark.parametrize(
    "overrides",
    [{"hosted_api_key": None}, {"hosted_consent": False}, {"hosted_base_url": None}, {"hosted_base_url": "http://api.hosted.example"}],
)
def test_hosted_requires_key_consent_and_https(overrides: dict) -> None:
    client, calls = _client(GOOD_KEY_IDEAS, _hosted(**overrides))
    response = client.post("/v1/key-ideas", json={"chunk_id": "C001", "source_text": BEE_SOURCE})
    assert response.status_code == 503 and calls == []


def test_hosted_enabled_reuses_openai_request_shape() -> None:
    client, calls = _client(GOOD_KEY_IDEAS, _hosted())
    response = client.post("/v1/key-ideas", json={"chunk_id": "C001", "source_text": BEE_SOURCE})
    assert response.status_code == 200 and response.json()["provider"] == "hosted"
    assert str(calls[0].url) == "https://api.hosted.example/v1/chat/completions"
    assert calls[0].headers["authorization"] == f"Bearer {TEST_KEY}"
    assert json.loads(calls[0].content)["temperature"] == 0
    disclosure = client.get("/v1/providers").json()
    assert "Example Hosted AI" in disclosure["data_flow"]["text"]
    assert "https://api.hosted.example" in disclosure["data_flow"]["text"]


def test_keys_never_exposed_by_endpoints_or_repr() -> None:
    settings = _hosted(llm_api_key=TEST_KEY)
    client, _ = _client(GOOD_KEY_IDEAS, settings)
    for path in ("/health", "/v1/providers", "/openapi.json"):
        assert TEST_KEY not in client.get(path).text
    assert TEST_KEY not in repr(settings)
    assert TEST_KEY not in repr(client.app.state.providers.key_ideas.client)
