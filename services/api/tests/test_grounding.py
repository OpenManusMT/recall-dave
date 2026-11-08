"""Safety rule (a): key ideas must be grounded verbatim in the source."""

from __future__ import annotations

from recall_api.grounding import detect_qualifiers, normalise, span_in_text, split_sentences

from .conftest import BEE_SOURCE, QUALIFIED_SOURCE, ScriptedKeyIdeas, bundle, client_for, idea


def _post(provider: ScriptedKeyIdeas, source: str = BEE_SOURCE, **extra: object):
    client = client_for(providers=bundle(key_ideas=provider))
    return client.post("/v1/key-ideas", json={"chunk_id": "C001", "source_text": source, **extra})


def test_span_matching_normalises_whitespace_quotes_and_case() -> None:
    source = "The sign said “no entry” — visitors  must\nwait."
    assert span_in_text('said "No entry" - visitors must wait', source)
    assert not span_in_text("said no entry", source)  # quotes are part of the text
    assert not span_in_text("visitors may wait", source)


def test_span_matching_requires_word_boundaries_and_two_words() -> None:
    assert not span_in_text("aggle dance", BEE_SOURCE)  # inside "waggle"
    assert not span_in_text("dance", BEE_SOURCE)  # single word is not a span
    assert span_in_text("waggle dance", BEE_SOURCE)


def test_ellipsis_only_allowed_for_evidence_segments_in_order() -> None:
    span = "return to the hive ... perform a waggle dance"
    assert span_in_text(span, BEE_SOURCE, allow_ellipsis=True)
    assert not span_in_text(span, BEE_SOURCE)
    assert not span_in_text("perform a waggle dance ... return to the hive", BEE_SOURCE, allow_ellipsis=True)


def test_qualifier_detection_handles_contractions() -> None:
    assert {"usually", "about"} <= detect_qualifiers("Cats usually sleep for about fifteen hours")
    assert "not" in detect_qualifiers("Kittens don’t hunt")
    assert "not" in detect_qualifiers("They cannot fly")
    assert normalise("  A B ") == "a b"


def test_split_sentences_returns_verbatim_substrings() -> None:
    for sentence in split_sentences(QUALIFIED_SOURCE):
        assert sentence in QUALIFIED_SOURCE


def test_grounded_idea_is_accepted() -> None:
    response = _post(ScriptedKeyIdeas([idea()]))
    assert response.status_code == 200
    body = response.json()
    assert [i["idea_id"] for i in body["ideas"]] == ["K1"]
    assert body["provider"] == "scripted" and body["rejected"] == []


def test_hallucinated_span_is_rejected_and_422_when_none_survive() -> None:
    hallucinated = idea(source_spans=["bees dance to warn the hive about wasps"], idea="Bees warn about wasps.")
    response = _post(ScriptedKeyIdeas([hallucinated]))
    assert response.status_code == 422
    body = response.json()
    assert body["error"] == "no_grounded_ideas"
    assert body["rejected"] == [{"idea_id": "K1", "reason": "source_span_not_in_source"}]


def test_any_ungrounded_span_rejects_the_whole_idea() -> None:
    mixed = idea(source_spans=["perform a waggle dance", "the queen decides where to fly"])
    good = idea(idea_id="K2")
    body = _post(ScriptedKeyIdeas([mixed, good])).json()
    assert [i["idea_id"] for i in body["ideas"]] == ["K2"]
    assert body["rejected"][0]["idea_id"] == "K1"
    assert "ideas_rejected" in body["flags"]


def test_span_with_unlisted_critical_qualifier_is_rejected() -> None:
    unlisted = idea(
        idea="Cats usually sleep for about fifteen hours a day.",
        source_spans=["Cats usually sleep for about fifteen hours a day"],
        critical_qualifiers=["usually"],  # "about" missing
        relationship="fact",
    )
    response = _post(ScriptedKeyIdeas([unlisted]), source=QUALIFIED_SOURCE)
    assert response.status_code == 422
    assert response.json()["rejected"][0]["reason"] == "critical_qualifier_not_listed"


def test_listed_qualifiers_including_negative_contraction_are_accepted() -> None:
    ok = idea(
        idea="Kittens do not hunt until they are several weeks old.",
        source_spans=["Kittens don't hunt until they are several weeks old"],
        critical_qualifiers=["n't"],
        relationship="sequence",
    )
    response = _post(ScriptedKeyIdeas([ok]), source=QUALIFIED_SOURCE)
    assert response.status_code == 200, response.json()


def test_qualifier_dropped_from_idea_text_is_rejected() -> None:
    absolutist = idea(
        idea="Cats sleep fifteen hours every day.",  # hedge and approximation dropped
        source_spans=["Cats usually sleep for about fifteen hours a day"],
        critical_qualifiers=["usually", "about"],
        relationship="fact",
    )
    response = _post(ScriptedKeyIdeas([absolutist]), source=QUALIFIED_SOURCE)
    assert response.status_code == 422
    assert response.json()["rejected"][0]["reason"] == "critical_qualifier_dropped_from_idea"


def test_unsupported_number_and_unsupported_idea_are_rejected() -> None:
    invented_number = idea(idea="Honeybees perform a waggle dance 12 times after finding nectar.")
    unsupported = idea(
        idea_id="K2", idea="Quantum entanglement explains apian navigation magnetically.",
    )
    body = _post(ScriptedKeyIdeas([invented_number, unsupported])).json()
    reasons = {r["idea_id"]: r["reason"] for r in body["rejected"]}
    assert reasons == {"K1": "number_not_in_source", "K2": "idea_not_supported_by_source"}


def test_chunk_id_is_forced_to_the_request_and_qualifiers_sanitised() -> None:
    provider = ScriptedKeyIdeas([idea(critical_qualifiers=["never"])], chunk_id="OTHER")
    body = _post(provider).json()
    assert body["chunk_id"] == "C001"
    assert "chunk_id_overridden" in body["flags"]
    assert body["ideas"][0]["critical_qualifiers"] == []  # "never" is not in the span
    assert "critical_qualifiers_sanitised" in body["flags"]


def test_ideas_truncated_to_requested_max() -> None:
    ideas = [
        idea(idea_id="K1", importance=0.2),
        idea(idea_id="K2", importance=0.9, source_spans=["features of the dance also communicate distance"],
             idea="Features of the dance also communicate distance.", relationship="fact"),
    ]
    body = _post(ScriptedKeyIdeas(ideas), max_ideas=1).json()
    assert [i["idea_id"] for i in body["ideas"]] == ["K2"]
    assert "ideas_truncated_to_max" in body["flags"]


def test_provider_schema_violation_is_a_safe_502() -> None:
    response = _post(ScriptedKeyIdeas([idea(relationship="vibes")]))
    assert response.status_code == 502
    assert response.json() == {
        "error": "provider_error",
        "detail": "provider output did not match the schema",
        "code": "provider_schema_mismatch",
    }
