"""Strict contract models (04-AI-CONTRACTS.md) and bounded request inputs."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from recall_api.schemas import (
    KeyIdeaResult,
    RecallScoreResponse,
    RecallScoreResult,
    TranscriptMeta,
)

from .conftest import BEE_SOURCE, idea, score_request


def test_key_idea_result_accepts_contract_example() -> None:
    result = KeyIdeaResult.model_validate({"chunk_id": "C001", "ideas": [idea(critical_qualifiers=["usually"])]})
    assert result.ideas[0].relationship == "sequence"


def test_key_idea_result_forbids_extra_keys() -> None:
    with pytest.raises(ValidationError):
        KeyIdeaResult.model_validate({"chunk_id": "C001", "ideas": [idea()], "note": "extra"})
    with pytest.raises(ValidationError):
        KeyIdeaResult.model_validate({"chunk_id": "C001", "ideas": [idea(verified=True)]})


@pytest.mark.parametrize("count", [0, 4])
def test_key_idea_result_requires_one_to_three_ideas(count: int) -> None:
    ideas = [idea(idea_id=f"K{i}") for i in range(count)]
    with pytest.raises(ValidationError):
        KeyIdeaResult.model_validate({"chunk_id": "C001", "ideas": ideas})


@pytest.mark.parametrize(
    "bad",
    [
        {"relationship": "analogy"},
        {"confidence": 1.2},
        {"importance": -0.1},
        {"confidence": "0.9"},  # strict: no string coercion
        {"source_spans": []},
        {"idea_id": "bad id with spaces"},
    ],
)
def test_key_idea_field_constraints(bad: dict) -> None:
    with pytest.raises(ValidationError):
        KeyIdeaResult.model_validate({"chunk_id": "C001", "ideas": [idea(**bad)]})


def _score(**overrides: object) -> dict:
    base = {
        "case_id": "C001",
        "label": "correct",
        "score": 0.9,
        "clue_level": 0,
        "action": "accept",
        "idea_scores": [
            {"idea_id": "K1", "coverage": 0.9, "entailment": 0.9, "relationship_accuracy": 1.0, "contradiction": False}
        ],
        "evidence": [{"learner_span": "a b", "source_span": "c d"}],
    }
    base.update(overrides)
    return base


@pytest.mark.parametrize(
    "bad",
    [
        {"label": "great"},
        {"action": "celebrate"},
        {"clue_level": 6},
        {"clue_level": -1},
        {"score": 1.5},
        {"score": "0.9"},
        {"extra": 1},
    ],
)
def test_recall_score_result_constraints(bad: dict) -> None:
    with pytest.raises(ValidationError):
        RecallScoreResult.model_validate(_score(**bad))


def test_response_invariant_score_null_iff_asr_uncertain() -> None:
    with pytest.raises(ValidationError):
        RecallScoreResponse.model_validate(
            _score(label="asr_uncertain", action="confirm_transcript", score=0.5, clue_level=None, provider="x")
        )
    with pytest.raises(ValidationError):
        RecallScoreResponse.model_validate(_score(score=None, provider="x"))
    ok = RecallScoreResponse.model_validate(
        _score(label="asr_uncertain", action="confirm_transcript", score=None, clue_level=None, provider="x")
    )
    assert ok.score is None and ok.shadow_only is True


def test_response_invariant_contradiction_never_accepted() -> None:
    with pytest.raises(ValidationError):
        RecallScoreResponse.model_validate(_score(label="contradiction", score=0.1, action="accept", provider="x"))
    with pytest.raises(ValidationError):
        RecallScoreResponse.model_validate(
            _score(label="contradiction", score=0.6, action="correct_misconception_then_cue", provider="x")
        )


def test_transcript_meta_bounds() -> None:
    with pytest.raises(ValidationError):
        TranscriptMeta.model_validate({"origin": "voice", "confirmed": True})
    with pytest.raises(ValidationError):
        TranscriptMeta.model_validate({"origin": "asr", "confirmed": False, "asr_confidence": 1.01})


@pytest.mark.parametrize(
    "overrides",
    [
        {"source_text": "x" * 4001},
        {"learner_text": "y" * 2001},
        {"learner_text": "   "},
        {"key_ideas": [{"idea_id": f"K{i}", "text": "An idea."} for i in range(4)]},
        {"key_ideas": [{"idea_id": "K1", "text": "a"}, {"idea_id": "K1", "text": "b"}]},
        {"case_id": "../../etc/passwd"},
        {"transcript_meta": {"origin": "typed", "confirmed": True, "unexpected": 1}},
    ],
)
def test_score_request_bounds_return_422(client, overrides: dict) -> None:
    response = client.post("/v1/score-recall", json=score_request(**overrides))
    assert response.status_code == 422
    assert response.json()["error"] == "invalid_request"


def test_key_idea_request_bounds_return_422(client) -> None:
    assert client.post("/v1/key-ideas", json={"chunk_id": "C1", "source_text": "z" * 4001}).status_code == 422
    assert client.post("/v1/key-ideas", json={"chunk_id": "C1", "source_text": BEE_SOURCE, "max_ideas": 4}).status_code == 422
    assert client.post("/v1/key-ideas", json={"chunk_id": "C 1", "source_text": BEE_SOURCE}).status_code == 422


def test_validation_errors_do_not_echo_submitted_text(client) -> None:
    secret_text = "MY-PRIVATE-READING " * 300  # > 4000 chars
    response = client.post("/v1/key-ideas", json={"chunk_id": "C1", "source_text": secret_text})
    assert response.status_code == 422
    assert "MY-PRIVATE-READING" not in response.text
