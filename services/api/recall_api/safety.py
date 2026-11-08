"""Server-side safety post-processing for recall scores.

Applied to EVERY provider's output (fake, OpenAI-compatible, hosted, or any
injected provider) after schema validation and before anything is returned.

Rules (see 04-AI-CONTRACTS.md and A001-harness/SCHEMA.md):

a. (key ideas: see ``grounding.py``)
b. Evidence: each ``source_span`` must be verbatim in the source and each
   ``learner_span`` verbatim in the learner text, otherwise the item is dropped.
   A positive label (correct/partial) with no surviving evidence is downgraded
   to ``vague`` / ``prompt_specifics`` and flagged.
c. Contradiction: label ``contradiction`` => score <= 0.15 and action
   ``correct_misconception_then_cue`` (never accept). A provider that flags a
   contradiction on any idea cannot also call the answer correct/partial.
d. ASR: an unconfirmed ASR transcript is never scored; the provider is not
   called (see ``asr_uncertain_response`` and the route in ``main.py``).
e. Score (and clue level) are null iff label is ``asr_uncertain``.

What this layer can NOT do: detect a contradiction that a provider labels
``correct`` with plausible, verbatim evidence. That is why no scorer may drive
the live schedule until it passes the A001 gate.
"""

from __future__ import annotations

from .grounding import span_in_text
from .providers.base import ProviderError
from .schemas import (
    CONTRADICTION_MAX_SCORE,
    LABEL_ACTIONS,
    POSITIVE_LABELS,
    VAGUE_MAX_SCORE,
    RecallScoreRequest,
    RecallScoreResponse,
    RecallScoreResult,
)

DEFAULT_CLUE_LEVEL = {"correct": 0, "partial": 1, "incorrect": 2, "contradiction": 2, "vague": 1}


def asr_uncertain_response(request: RecallScoreRequest, provider: str = "none") -> RecallScoreResponse:
    """Rule d: unconfirmed ASR is never scored and the provider is never called."""
    return RecallScoreResponse(
        case_id=request.case_id,
        label="asr_uncertain",
        score=None,
        clue_level=None,
        action="confirm_transcript",
        idea_scores=[],
        evidence=[],
        provider=provider,
        flags=["asr_unconfirmed_not_scored"],
    )


def enforce_score_safety(
    raw: RecallScoreResult, request: RecallScoreRequest, provider: str
) -> RecallScoreResponse:
    flags: list[str] = []
    if raw.case_id != request.case_id:
        flags.append("case_id_overridden")

    known = {k.idea_id for k in request.key_ideas}
    idea_scores, seen = [], set()
    for s in raw.idea_scores:
        if s.idea_id in known and s.idea_id not in seen:
            idea_scores.append(s)
            seen.add(s.idea_id)
    if len(idea_scores) != len(raw.idea_scores):
        flags.append("idea_scores_dropped")

    # b. evidence grounding
    evidence = [
        e
        for e in raw.evidence
        if span_in_text(e.source_span, request.source_text, allow_ellipsis=True)
        and span_in_text(e.learner_span, request.learner_text, allow_ellipsis=True)
    ]
    if len(evidence) != len(raw.evidence):
        flags.append("evidence_dropped")

    label, score, clue, action = raw.label, raw.score, raw.clue_level, raw.action

    # e. asr_uncertain carries no score and no clue
    if label == "asr_uncertain":
        if score is not None or clue is not None or action != "confirm_transcript":
            flags.append("asr_uncertain_normalised")
        return RecallScoreResponse(
            case_id=request.case_id,
            label="asr_uncertain",
            score=None,
            clue_level=None,
            action="confirm_transcript",
            idea_scores=idea_scores,
            evidence=evidence,
            provider=provider,
            flags=flags,
        )
    if score is None:
        # A memory label with no score is not a safe, interpretable result.
        raise ProviderError("provider_output_invalid", "score missing for a non-ASR label")

    # c. contradiction overrides
    if label in POSITIVE_LABELS and any(s.contradiction for s in idea_scores):
        label = "contradiction"
        flags.append("contradiction_flag_overrides_label")
    if label == "contradiction":
        if score > CONTRADICTION_MAX_SCORE:
            score = CONTRADICTION_MAX_SCORE
            flags.append("contradiction_score_clamped")
        if action != "correct_misconception_then_cue":
            action = "correct_misconception_then_cue"
            flags.append("contradiction_action_corrected")

    # b. a positive judgement must be grounded
    if label in POSITIVE_LABELS and not evidence:
        label, action = "vague", "prompt_specifics"
        score = min(score, VAGUE_MAX_SCORE)
        if clue is None or clue < 1:
            clue = 1
        flags.append("ungrounded_positive_downgraded")

    if action not in LABEL_ACTIONS[label]:
        action = LABEL_ACTIONS[label][0]
        flags.append("action_normalised")
    if clue is None:
        clue = DEFAULT_CLUE_LEVEL[label]
        flags.append("clue_level_defaulted")

    return RecallScoreResponse(
        case_id=request.case_id,
        label=label,
        score=round(score, 4),
        clue_level=clue,
        action=action,
        idea_scores=idea_scores,
        evidence=evidence,
        provider=provider,
        flags=flags,
    )
