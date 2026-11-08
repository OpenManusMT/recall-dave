"""Deterministic, free, offline fake providers (the default).

* ``FakeKeyIdeaProvider`` picks 1-3 verbatim source sentences with the most
  content words.
* ``FakeRecallScoringProvider`` is a transparent lexical baseline. It is NOT a
  validated scorer and has NOT passed the A001 gate; it exists so the app and
  tests can exercise the full pipeline. Its output still goes through the same
  safety post-processing as any other provider.
* ``FakeTranscriptionProvider`` returns a fixed transcript and confidence.

No randomness, clocks, network or global state: same input -> same output.
"""

from __future__ import annotations

import math

from ..config import MAX_KEY_IDEAS, ScoringWeights
from ..grounding import (
    QUALIFIER_FAMILIES,
    content_stems,
    detect_qualifiers,
    split_sentences,
    words,
)
from ..schemas import (
    Evidence,
    IdeaScore,
    KeyIdea,
    KeyIdeaResult,
    KeyIdeasRequest,
    RecallScoreRequest,
    RecallScoreResult,
    TranscriptionResult,
)
from .base import AudioInput

FAKE_TRANSCRIPT = "This is a fixed placeholder transcript from the offline fake transcriber."
FAKE_TRANSCRIPT_CONFIDENCE = 0.5
MAX_FAKE_IDEA_CHARS = 600

_RELATIONSHIP_CUES: tuple[tuple[str, frozenset[str]], ...] = (
    ("rule_exception", frozenset("unless except however exception".split())),
    ("cause_effect", frozenset("because so therefore causes cause leads helps reduce reduces thus".split())),
    ("sequence", frozenset("first then after before next finally later".split())),
    ("comparison", frozenset("than whereas unlike compared while more less".split())),
)

_ANTONYMS: tuple[tuple[str, str], ...] = (
    ("increase", "decrease"), ("increases", "decreases"), ("more", "less"), ("rise", "fall"),
    ("before", "after"), ("wet", "dry"), ("hot", "cold"), ("fast", "slow"),
    ("higher", "lower"), ("early", "late"), ("strengthen", "weaken"), ("north", "south"),
    ("east", "west"), ("above", "below"), ("inside", "outside"), ("always", "never"),
)
_CONTRAST_MARKERS = frozenset(["rather than", "instead of", "unlike", "than"])


def _truncate_on_word(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    cut = text[:limit]
    return cut[: cut.rfind(" ")] if " " in cut else cut


def _relationship(sentence: str) -> str:
    toks = set(words(sentence))
    for rel, cues in _RELATIONSHIP_CUES:
        if toks & cues:
            return rel
    return "fact"


class FakeKeyIdeaProvider:
    name = "fake"

    def extract_key_ideas(self, request: KeyIdeasRequest) -> KeyIdeaResult:
        sentences = [_truncate_on_word(s, MAX_FAKE_IDEA_CHARS) for s in split_sentences(request.source_text)]
        candidates = [(i, s, len(content_stems(s))) for i, s in enumerate(sentences) if len(words(s)) >= 2]
        if not candidates:
            # Nothing groundable; the grounding layer will reject this.
            text = _truncate_on_word(request.source_text.strip(), MAX_FAKE_IDEA_CHARS)
            candidates = [(0, text, len(content_stems(text)))]
        total_words = len(words(request.source_text))
        # "Normally 1-2 key ideas; hard max 3": roughly one idea per 60 words.
        wanted = max(1, min(MAX_KEY_IDEAS, math.ceil(total_words / 60)))
        k = min(wanted, request.max_ideas, len(candidates))
        top = sorted(candidates, key=lambda c: (-c[2], c[0]))[:k]
        top.sort(key=lambda c: c[0])  # keep source order
        best = max(c[2] for c in top) or 1
        ideas = [
            KeyIdea(
                idea_id=f"K{n}",
                idea=sentence,
                importance=round(count / best, 2),
                source_spans=[sentence],
                critical_qualifiers=sorted(detect_qualifiers(sentence))[:12],
                relationship=_relationship(sentence),
                confidence=0.5,
            )
            for n, (_, sentence, count) in enumerate(top, start=1)
        ]
        return KeyIdeaResult(chunk_id=request.chunk_id, ideas=ideas)


def _negations(text: str) -> int:
    toks = words(text)
    count = sum(1 for t in toks if t in QUALIFIER_FAMILIES["negation"])
    line = " " + " ".join(toks) + " "
    count += sum(1 for m in _CONTRAST_MARKERS if f" {m} " in line)
    return count


def _contradicts(idea_text: str, learner_text: str, coverage: float) -> bool:
    if coverage < 0.25:
        return False
    if _negations(learner_text) > _negations(idea_text):
        return True
    idea_toks, learner_toks = set(words(idea_text)), set(words(learner_text))
    for a, b in _ANTONYMS:
        if (a in learner_toks and b in idea_toks and a not in idea_toks) or (
            b in learner_toks and a in idea_toks and b not in idea_toks
        ):
            return True
    return False


def _best_sentence(text: str, target: set[str]) -> tuple[str, int]:
    best, best_overlap = "", 0
    for sentence in split_sentences(text):
        overlap = len(content_stems(sentence) & target)
        if overlap > best_overlap and len(words(sentence)) >= 2:
            best, best_overlap = sentence, overlap
    return best, best_overlap


class FakeRecallScoringProvider:
    """Transparent lexical-overlap baseline. Not A001-validated."""

    name = "fake"

    def __init__(self, weights: ScoringWeights | None = None) -> None:
        self.weights = weights or ScoringWeights()

    def _composite(self, coverage: float, entailment: float, relationship: float | None) -> float:
        w = self.weights
        parts = [(w.coverage, coverage), (w.entailment, entailment)]
        if relationship is not None:
            parts.append((w.relationship, relationship))
        total = sum(weight for weight, _ in parts) or 1.0
        return sum(weight * value for weight, value in parts) / total

    def score_recall(self, request: RecallScoreRequest) -> RecallScoreResult:
        learner = content_stems(request.learner_text)
        idea_scores: list[IdeaScore] = []
        evidence: list[Evidence] = []
        composites: list[float] = []
        for ref in request.key_ideas:
            target = content_stems(ref.text)
            coverage = round(len(target & learner) / len(target), 3) if target else 0.0
            contradiction = _contradicts(ref.text, request.learner_text, coverage)
            # Lexical proxy only: this baseline cannot judge entailment or
            # relationships, so it reports coverage and leaves relationship null.
            idea_scores.append(
                IdeaScore(
                    idea_id=ref.idea_id,
                    coverage=coverage,
                    entailment=coverage,
                    relationship_accuracy=None,
                    contradiction=contradiction,
                )
            )
            composites.append(self._composite(coverage, coverage, None))
            if coverage > 0 and not contradiction:
                learner_span, _ = _best_sentence(request.learner_text, target)
                source_span, overlap = _best_sentence(request.source_text, target)
                if learner_span and source_span and overlap:
                    evidence.append(Evidence(learner_span=learner_span, source_span=source_span))

        mean = sum(composites) / len(composites)
        if any(s.contradiction for s in idea_scores):
            label, action, clue, score = "contradiction", "correct_misconception_then_cue", 2, 0.1 * mean
        elif mean >= 0.6 and min(composites) >= 0.4:
            label, action, clue, score = "correct", "accept", 0, 0.55 + 0.45 * mean
        elif max(composites) >= 0.4:
            label, action, clue, score = "partial", "prompt_more", 1, 0.45 + 0.3 * mean
        elif mean >= 0.1:
            label, action, clue, score = "vague", "prompt_specifics", 1, 0.2 + 0.25 * mean
        else:
            label, action, clue, score = "incorrect", "give_clue", 2, 0.2 * mean
        return RecallScoreResult(
            case_id=request.case_id,
            label=label,
            score=round(min(score, 1.0), 3),
            clue_level=clue,
            action=action,
            idea_scores=idea_scores,
            evidence=evidence[:8],
        )


class FakeTranscriptionProvider:
    name = "fake"
    requires_file = False

    def transcribe(self, audio: AudioInput) -> TranscriptionResult:
        # Deliberately ignores the audio content: fixed, deterministic output.
        return TranscriptionResult(transcript=FAKE_TRANSCRIPT, confidence=FAKE_TRANSCRIPT_CONFIDENCE)
