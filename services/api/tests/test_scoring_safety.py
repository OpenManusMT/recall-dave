"""Safety rules (b)-(e) for recall scoring, applied to any provider's output."""

from __future__ import annotations

import pytest

from .conftest import GOOD_EVIDENCE, ScriptedScorer, bundle, client_for, score_request


def _result(**overrides: object) -> dict:
    base = {
        "label": "correct",
        "score": 0.92,
        "clue_level": 0,
        "action": "accept",
        "idea_scores": [
            {"idea_id": "K1", "coverage": 0.9, "entailment": 0.9, "relationship_accuracy": 1.0, "contradiction": False},
        ],
        "evidence": GOOD_EVIDENCE,
    }
    base.update(overrides)
    return base


def _post(scorer: ScriptedScorer, **request_overrides: object):
    client = client_for(providers=bundle(scoring=scorer))
    return client.post("/v1/score-recall", json=score_request(**request_overrides))


def test_grounded_correct_result_passes_through() -> None:
    body = _post(ScriptedScorer(_result())).json()
    assert (body["label"], body["action"], body["score"]) == ("correct", "accept", 0.92)
    assert body["shadow_only"] is True and body["flags"] == []


# --- (b) evidence -------------------------------------------------------------


def test_evidence_with_hallucinated_source_span_is_dropped_and_positive_downgraded() -> None:
    fake_evidence = [{"learner_span": "Bees dance to show where food is", "source_span": "bees navigate using magnetism"}]
    body = _post(ScriptedScorer(_result(evidence=fake_evidence))).json()
    assert body["evidence"] == []
    assert body["label"] == "vague" and body["action"] == "prompt_specifics"
    assert body["score"] <= 0.45
    assert {"evidence_dropped", "ungrounded_positive_downgraded"} <= set(body["flags"])


def test_evidence_learner_span_must_come_from_the_learner_text() -> None:
    invented = [{"learner_span": "the dance shows distance and direction", "source_span": "perform a waggle dance"}]
    body = _post(ScriptedScorer(_result(label="partial", action="prompt_more", score=0.6, evidence=invented))).json()
    assert body["label"] == "vague"
    assert "ungrounded_positive_downgraded" in body["flags"]


def test_partial_with_no_evidence_is_downgraded_with_clue() -> None:
    body = _post(ScriptedScorer(_result(label="partial", action="prompt_more", score=0.6, clue_level=0, evidence=[]))).json()
    assert body["label"] == "vague" and body["clue_level"] >= 1


def test_negative_labels_do_not_need_evidence() -> None:
    body = _post(ScriptedScorer(_result(label="incorrect", action="give_clue", score=0.1, clue_level=3, evidence=[]))).json()
    assert (body["label"], body["action"], body["clue_level"]) == ("incorrect", "give_clue", 3)


# --- (c) contradiction --------------------------------------------------------


def test_contradiction_high_score_is_clamped_and_action_corrected() -> None:
    body = _post(ScriptedScorer(_result(label="contradiction", score=0.9, action="accept"))).json()
    assert body["label"] == "contradiction"
    assert body["score"] <= 0.15
    assert body["action"] == "correct_misconception_then_cue"
    assert {"contradiction_score_clamped", "contradiction_action_corrected"} <= set(body["flags"])


def test_idea_level_contradiction_flag_overrides_positive_label() -> None:
    scores = [{"idea_id": "K1", "coverage": 0.9, "entailment": 0.1, "relationship_accuracy": 0.0, "contradiction": True}]
    body = _post(ScriptedScorer(_result(idea_scores=scores))).json()
    assert body["label"] == "contradiction" and body["action"] != "accept"
    assert body["score"] <= 0.15
    assert "contradiction_flag_overrides_label" in body["flags"]


def test_contradiction_with_null_score_is_rejected_not_guessed() -> None:
    response = _post(ScriptedScorer(_result(label="contradiction", score=None, action="correct_misconception_then_cue")))
    assert response.status_code == 502
    assert response.json()["code"] == "provider_output_invalid"


# --- (d) ASR ------------------------------------------------------------------


def test_unconfirmed_asr_is_never_scored_and_provider_not_called() -> None:
    scorer = ScriptedScorer(_result())
    body = _post(
        scorer, transcript_meta={"origin": "asr", "confirmed": False, "asr_confidence": 0.99}
    ).json()
    assert scorer.calls == 0
    assert body["label"] == "asr_uncertain"
    assert body["score"] is None and body["clue_level"] is None
    assert body["action"] == "confirm_transcript"
    assert body["idea_scores"] == [] and body["evidence"] == []


def test_unconfirmed_asr_works_even_with_no_scoring_provider() -> None:
    client = client_for(providers=bundle())
    body = client.post(
        "/v1/score-recall", json=score_request(transcript_meta={"origin": "asr", "confirmed": False})
    ).json()
    assert body["label"] == "asr_uncertain"


def test_confirmed_asr_is_scored() -> None:
    scorer = ScriptedScorer(_result())
    body = _post(scorer, transcript_meta={"origin": "asr", "confirmed": True, "asr_confidence": 0.4}).json()
    assert scorer.calls == 1 and body["label"] == "correct"


# --- (e) score null iff asr_uncertain -----------------------------------------


def test_provider_asr_uncertain_with_score_is_nulled() -> None:
    body = _post(ScriptedScorer(_result(label="asr_uncertain", score=0.7, clue_level=2, action="accept"))).json()
    assert body["score"] is None and body["clue_level"] is None
    assert body["action"] == "confirm_transcript"
    assert "asr_uncertain_normalised" in body["flags"]


@pytest.mark.parametrize("label", ["correct", "partial", "incorrect", "vague"])
def test_null_score_for_memory_label_is_a_safe_error(label: str) -> None:
    response = _post(ScriptedScorer(_result(label=label, score=None)))
    assert response.status_code == 502
    assert response.json()["error"] == "provider_error"


# --- coherence ----------------------------------------------------------------


def test_accept_action_is_never_paired_with_a_non_correct_label() -> None:
    body = _post(ScriptedScorer(_result(label="incorrect", score=0.1, action="accept", clue_level=None))).json()
    assert body["action"] == "give_clue"
    assert body["clue_level"] == 2
    assert {"action_normalised", "clue_level_defaulted"} <= set(body["flags"])


def test_unknown_idea_ids_are_dropped_and_case_id_forced() -> None:
    scores = [{"idea_id": "K9", "coverage": 1.0, "entailment": 1.0, "relationship_accuracy": 1.0, "contradiction": False}]
    scorer = ScriptedScorer(_result(idea_scores=scores))
    scorer.result["case_id"] = "SOMETHING-ELSE"
    body = _post(scorer).json()
    assert body["case_id"] == "C001" and body["idea_scores"] == []
    assert {"idea_scores_dropped", "case_id_overridden"} <= set(body["flags"])


def test_no_scoring_provider_returns_503() -> None:
    response = client_for(providers=bundle()).post("/v1/score-recall", json=score_request())
    assert response.status_code == 503
    assert response.json()["error"] == "provider_unavailable"
