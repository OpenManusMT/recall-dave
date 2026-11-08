"""Strict pydantic v2 models mirroring 04-AI-CONTRACTS.md.

Two families of models live here:

* Provider-output contracts (``KeyIdeaResult``, ``RecallScoreResult``): exactly
  what any provider, fake or remote, must return. Remote JSON is validated
  against these before any post-processing.
* API request/response models: bounded inputs and the final, post-processed
  responses. ``RecallScoreResponse`` re-asserts every safety invariant so a bug
  in post-processing can never leak an unsafe result.

All models forbid extra keys and use strict typing (no "0.9" -> 0.9 coercion).
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from .config import (
    ID_PATTERN,
    MAX_IDEA_CHARS,
    MAX_KEY_IDEAS,
    MAX_LEARNER_CHARS,
    MAX_SOURCE_CHARS,
)

STRICT = ConfigDict(extra="forbid", strict=True)

Identifier = Annotated[str, StringConstraints(pattern=ID_PATTERN)]
Unit = Annotated[float, Field(ge=0.0, le=1.0)]
ClueLevel = Annotated[int, Field(ge=0, le=5)]
NonBlank = r"\S"

Relationship = Literal["cause_effect", "sequence", "comparison", "rule_exception", "fact"]
Label = Literal["correct", "partial", "incorrect", "contradiction", "vague", "asr_uncertain"]
Action = Literal[
    "accept",
    "prompt_more",
    "give_clue",
    "correct_misconception_then_cue",
    "prompt_specifics",
    "confirm_transcript",
]

# Which actions are coherent for each label. The first entry is canonical.
LABEL_ACTIONS: dict[str, tuple[str, ...]] = {
    "correct": ("accept",),
    "partial": ("prompt_more", "give_clue"),
    "incorrect": ("give_clue", "prompt_more"),
    "contradiction": ("correct_misconception_then_cue",),
    "vague": ("prompt_specifics", "prompt_more"),
    "asr_uncertain": ("confirm_transcript",),
}
POSITIVE_LABELS = frozenset({"correct", "partial"})
CONTRADICTION_MAX_SCORE = 0.15
VAGUE_MAX_SCORE = 0.45


class _Strict(BaseModel):
    model_config = STRICT


# --------------------------------------------------------------------------
# Key ideas
# --------------------------------------------------------------------------


class KeyIdea(_Strict):
    idea_id: Identifier
    idea: Annotated[str, StringConstraints(min_length=1, max_length=MAX_IDEA_CHARS, pattern=NonBlank)]
    importance: Unit
    source_spans: Annotated[
        list[Annotated[str, StringConstraints(min_length=1, max_length=MAX_IDEA_CHARS)]],
        Field(min_length=1, max_length=4),
    ]
    critical_qualifiers: Annotated[
        list[Annotated[str, StringConstraints(min_length=1, max_length=40)]],
        Field(max_length=12),
    ] = Field(default_factory=list)
    relationship: Relationship
    confidence: Unit


class KeyIdeaResult(_Strict):
    """Provider-output contract for key-idea extraction."""

    chunk_id: Identifier
    ideas: Annotated[list[KeyIdea], Field(min_length=1, max_length=MAX_KEY_IDEAS)]


class KeyIdeasRequest(_Strict):
    chunk_id: Identifier
    source_text: Annotated[
        str, StringConstraints(min_length=1, max_length=MAX_SOURCE_CHARS, pattern=NonBlank)
    ]
    max_ideas: Annotated[int, Field(ge=1, le=MAX_KEY_IDEAS)] = MAX_KEY_IDEAS


class RejectedIdea(_Strict):
    idea_id: str
    reason: str


class KeyIdeaResponse(KeyIdeaResult):
    """Grounded key ideas plus transparent post-processing metadata."""

    provider: str
    flags: list[str] = Field(default_factory=list)
    rejected: list[RejectedIdea] = Field(default_factory=list)


# --------------------------------------------------------------------------
# Recall scoring
# --------------------------------------------------------------------------


class KeyIdeaRef(_Strict):
    idea_id: Identifier
    text: Annotated[str, StringConstraints(min_length=1, max_length=MAX_IDEA_CHARS, pattern=NonBlank)]


class TranscriptMeta(_Strict):
    origin: Literal["typed", "asr"]
    confirmed: bool = False
    asr_confidence: Unit | None = None


class RecallScoreRequest(_Strict):
    case_id: Identifier
    source_text: Annotated[
        str, StringConstraints(min_length=1, max_length=MAX_SOURCE_CHARS, pattern=NonBlank)
    ]
    key_ideas: Annotated[list[KeyIdeaRef], Field(min_length=1, max_length=MAX_KEY_IDEAS)]
    learner_text: Annotated[
        str, StringConstraints(min_length=1, max_length=MAX_LEARNER_CHARS, pattern=NonBlank)
    ]
    transcript_meta: TranscriptMeta

    @model_validator(mode="after")
    def _unique_ids(self) -> RecallScoreRequest:
        ids = [k.idea_id for k in self.key_ideas]
        if len(ids) != len(set(ids)):
            raise ValueError("key_ideas idea_id values must be unique")
        return self

    @property
    def needs_transcript_confirmation(self) -> bool:
        return self.transcript_meta.origin == "asr" and not self.transcript_meta.confirmed


class IdeaScore(_Strict):
    idea_id: Identifier
    coverage: Unit
    entailment: Unit
    relationship_accuracy: Unit | None = None
    contradiction: bool


class Evidence(_Strict):
    learner_span: Annotated[str, StringConstraints(min_length=1, max_length=MAX_LEARNER_CHARS)]
    source_span: Annotated[str, StringConstraints(min_length=1, max_length=MAX_SOURCE_CHARS)]


class RecallScoreResult(_Strict):
    """Provider-output contract for recall scoring.

    Pairing rules (score/clue null iff ``asr_uncertain``) are enforced by the
    safety layer and asserted again on ``RecallScoreResponse``; they are not
    rejected here so the server can repair a provider's ASR answer safely.
    """

    case_id: Identifier
    label: Label
    score: Unit | None
    clue_level: ClueLevel | None
    action: Action
    idea_scores: Annotated[list[IdeaScore], Field(max_length=MAX_KEY_IDEAS)] = Field(
        default_factory=list
    )
    evidence: Annotated[list[Evidence], Field(max_length=8)] = Field(default_factory=list)


class RecallScoreResponse(RecallScoreResult):
    provider: str
    flags: list[str] = Field(default_factory=list)
    # No scorer here has passed the A001 gate: results must not drive the live schedule.
    shadow_only: Literal[True] = True

    @model_validator(mode="after")
    def _safety_invariants(self) -> RecallScoreResponse:
        asr = self.label == "asr_uncertain"
        if (self.score is None) != asr:
            raise ValueError("score must be null if and only if label is asr_uncertain")
        if (self.clue_level is None) != asr:
            raise ValueError("clue_level must be null if and only if label is asr_uncertain")
        if self.action not in LABEL_ACTIONS[self.label]:
            raise ValueError("action is not allowed for this label")
        if self.label == "contradiction" and (self.score or 0.0) > CONTRADICTION_MAX_SCORE:
            raise ValueError("contradiction score exceeds the safety cap")
        if self.label in POSITIVE_LABELS and not self.evidence:
            raise ValueError("a positive label requires source-grounded evidence")
        return self


# --------------------------------------------------------------------------
# Transcription
# --------------------------------------------------------------------------


class TranscriptionResult(_Strict):
    """Provider-output contract for transcription."""

    transcript: Annotated[str, StringConstraints(max_length=MAX_LEARNER_CHARS)]
    confidence: Unit


class TranscriptionResponse(_Strict):
    transcript: str
    confidence: Unit
    provider: str
    transcript_meta: TranscriptMeta
    requires_confirmation: Literal[True] = True
    audio_retained: Literal[False] = False
