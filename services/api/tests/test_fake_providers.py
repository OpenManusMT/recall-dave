"""Fake deterministic adapters: free, offline, and still subject to the safety rules."""

from __future__ import annotations

from recall_api.grounding import span_in_text
from recall_api.providers.fake import (
    FAKE_TRANSCRIPT,
    FakeKeyIdeaProvider,
    FakeRecallScoringProvider,
)
from recall_api.schemas import KeyIdeasRequest, RecallScoreRequest

from .conftest import BEE_IDEAS, BEE_SOURCE, QUALIFIED_SOURCE, TOMATO_SOURCE, score_request

LONG_SOURCE = " ".join([BEE_SOURCE, TOMATO_SOURCE, QUALIFIED_SOURCE])


def test_fake_key_ideas_are_deterministic_five_times(client) -> None:
    payload = {"chunk_id": "C010", "source_text": LONG_SOURCE}
    outputs = [client.post("/v1/key-ideas", json=payload).json() for _ in range(5)]
    assert all(o == outputs[0] for o in outputs)


def test_fake_scoring_is_deterministic_five_times(client) -> None:
    payload = score_request("Bees come back and do a dance that tells the colony where food is.")
    outputs = [client.post("/v1/score-recall", json=payload).json() for _ in range(5)]
    assert all(o == outputs[0] for o in outputs)


def test_fake_transcription_is_deterministic_five_times(client) -> None:
    outputs = [
        client.post("/v1/transcribe", files={"audio": ("a.wav", b"RIFF" + bytes([i]) * 64, "audio/wav")}).json()
        for i in range(5)
    ]
    assert all(o == outputs[0] for o in outputs)
    assert outputs[0]["transcript"] == FAKE_TRANSCRIPT


def test_fake_key_ideas_pick_verbatim_sentences_with_most_content_words() -> None:
    result = FakeKeyIdeaProvider().extract_key_ideas(KeyIdeasRequest(chunk_id="C1", source_text=LONG_SOURCE))
    assert 1 <= len(result.ideas) <= 3
    for item in result.ideas:
        assert item.idea in LONG_SOURCE
        assert all(span_in_text(s, LONG_SOURCE) for s in item.source_spans)
    # Highest content-word sentence gets importance 1.0
    assert max(i.importance for i in result.ideas) == 1.0


def test_fake_key_ideas_respect_max_ideas_and_list_qualifiers(client) -> None:
    body = client.post(
        "/v1/key-ideas", json={"chunk_id": "C2", "source_text": QUALIFIED_SOURCE + " " + TOMATO_SOURCE, "max_ideas": 3}
    ).json()
    assert 1 <= len(body["ideas"]) <= 3 and body["rejected"] == []
    tomato = [i for i in body["ideas"] if "fungal" in i["idea"]]
    assert len(tomato) == 1
    assert {"can", "some"} <= set(tomato[0]["critical_qualifiers"])
    assert tomato[0]["relationship"] == "cause_effect"
    one = client.post("/v1/key-ideas", json={"chunk_id": "C2", "source_text": LONG_SOURCE, "max_ideas": 1}).json()
    assert len(one["ideas"]) == 1


def test_fake_key_ideas_ungroundable_input_returns_structured_422(client) -> None:
    response = client.post("/v1/key-ideas", json={"chunk_id": "C3", "source_text": "Hello"})
    assert response.status_code == 422
    assert response.json()["error"] == "no_grounded_ideas"


def test_fake_scorer_baseline_labels(client) -> None:
    def label(text: str) -> str:
        return client.post("/v1/score-recall", json=score_request(text)).json()["label"]

    assert label("The bees dance to tell the others where the food is.") in {"partial", "correct"}
    assert label("Volcanoes erupt molten rock.") == "incorrect"
    assert label("The dance tells the other bees how much nectar is available, but not where it is.") == "contradiction"


def test_fake_scorer_output_obeys_safety_rules(client) -> None:
    body = client.post(
        "/v1/score-recall",
        json=score_request("The dance tells the other bees how much nectar is available, but not where it is."),
    ).json()
    assert body["score"] <= 0.15 and body["action"] == "correct_misconception_then_cue"
    good = client.post("/v1/score-recall", json=score_request("The bees dance to tell the others where the food is.")).json()
    for ev in good["evidence"]:
        assert span_in_text(ev["source_span"], BEE_SOURCE)


def test_fake_scorer_weights_are_configurable() -> None:
    from recall_api.config import ScoringWeights

    request = RecallScoreRequest.model_validate(score_request("bees dance where food is"))
    default = FakeRecallScoringProvider().score_recall(request)
    custom = FakeRecallScoringProvider(ScoringWeights(coverage=1.0, entailment=0.0, relationship=0.0)).score_recall(request)
    assert default.label == custom.label  # coverage == entailment proxy in the baseline
    assert [s.idea_id for s in default.idea_scores] == [k["idea_id"] for k in BEE_IDEAS]
    assert all(s.relationship_accuracy is None for s in default.idea_scores)  # not assessed, not invented
