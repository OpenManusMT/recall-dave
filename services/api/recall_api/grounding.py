"""Source grounding: verbatim span checks, qualifier preservation, support checks.

The source text is the authority (04-AI-CONTRACTS.md). Every idea a provider
proposes must be backed by spans copied from the source; anything that cannot
be grounded is rejected, never repaired.

Matching is verbatim after a *meaning-preserving* normalisation only: Unicode
NFKC, curly quotes -> straight quotes, dash variants -> "-", whitespace
collapsed, case folded. Spans must also align to word boundaries.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

from .schemas import KeyIdea, KeyIdeaResult, KeyIdeasRequest, RejectedIdea

# --------------------------------------------------------------------------
# Normalisation and tokenisation
# --------------------------------------------------------------------------

_CHAR_MAP = str.maketrans(
    {
        "‘": "'", "’": "'", "‚": "'", "‛": "'", "′": "'", "`": "'",
        "“": '"', "”": '"', "„": '"', "‟": '"', "″": '"',
        "«": '"', "»": '"',
        "‐": "-", "‑": "-", "‒": "-", "–": "-", "—": "-", "−": "-",
    }
)
_WS = re.compile(r"\s+")
_WORD = re.compile(r"[a-z0-9]+(?:'[a-z]+)?")
_NUMBER = re.compile(r"\d+(?:[.,]\d+)?")
ELLIPSIS = "..."
MIN_SPAN_WORDS = 2

STOPWORDS = frozenset(
    """a an and or nor the to of in on for with is are was were be been being it its
    that this these those as at by from but if so than then they their them there into
    when which who whom whose what where why how also has have had do does did doing
    can could may might will would shall should must not no very just own same such
    our ours we you your he she him her his hers i me my mine us other others
    out up down over under again further once here all any both each few more most
    some only about around while because until against between through during before
    after above below off too s t don use used using rather like get got make made""".split()
)


def normalise(text: str) -> str:
    """Meaning-preserving normalisation used for every verbatim comparison."""
    out = unicodedata.normalize("NFKC", text).translate(_CHAR_MAP)
    return _WS.sub(" ", out).strip().casefold()


def _expand_contractions(norm: str) -> str:
    out = norm.replace("cannot", "can not").replace("n't", " not")
    return out


def words(text: str) -> list[str]:
    """Lower-case word tokens with negative contractions expanded."""
    return _WORD.findall(_expand_contractions(normalise(text)))


def stem(word: str) -> str:
    """Tiny, transparent suffix stripper (not linguistically complete)."""
    w = word[:-2] if word.endswith("'s") else word
    if len(w) >= 5 and w.endswith("ies"):
        w = w[:-3] + "y"
    elif len(w) >= 6 and w.endswith("ing"):
        w = w[:-3]
    elif len(w) >= 5 and w.endswith("ed"):
        w = w[:-2]
    elif len(w) >= 6 and w.endswith("ly"):
        w = w[:-2]
    elif len(w) >= 4 and w.endswith("s") and not w.endswith("ss"):
        w = w[:-1]
    if len(w) > 3 and w.endswith("e"):
        w = w[:-1]
    return w


def content_stems(text: str) -> set[str]:
    return {
        stem(w)
        for w in words(text)
        if (len(w) > 2 and w not in STOPWORDS) or w.isdigit()
    }


def numbers(text: str) -> set[str]:
    return {n.replace(",", ".") for n in _NUMBER.findall(normalise(text))}


_SENTENCE_BREAK = re.compile(r"(?:(?<=[.!?])|(?<=[.!?][\"'”’)]))\s+")


def split_sentences(text: str) -> list[str]:
    """Split into sentences that are verbatim substrings of ``text``."""
    return [s.strip() for s in _SENTENCE_BREAK.split(text) if s.strip()]


# --------------------------------------------------------------------------
# Verbatim span matching
# --------------------------------------------------------------------------


def _find_on_boundary(haystack: str, needle: str, start: int) -> int:
    idx = haystack.find(needle, start)
    while idx >= 0:
        before_ok = idx == 0 or not haystack[idx - 1].isalnum()
        end = idx + len(needle)
        after_ok = end == len(haystack) or not haystack[end].isalnum()
        if before_ok and after_ok:
            return idx
        idx = haystack.find(needle, idx + 1)
    return -1


def span_in_text(span: str, text: str, *, allow_ellipsis: bool = False) -> bool:
    """True if ``span`` occurs verbatim (normalised) in ``text``.

    With ``allow_ellipsis`` (evidence only, matching the contract example
    "communicate its location ... using a waggle dance"), the span may be
    several verbatim segments joined by "..." that occur in order.
    Each segment must contain at least ``MIN_SPAN_WORDS`` words.
    """
    hay = normalise(text)
    needle = normalise(span).strip(" \"'")
    if not needle:
        return False
    segments = [needle]
    if allow_ellipsis and ELLIPSIS in needle:
        segments = [s.strip(" \"'") for s in needle.split(ELLIPSIS)]
        segments = [s for s in segments if s]
        if not segments:
            return False
    pos = 0
    for seg in segments:
        if len(_WORD.findall(seg)) < MIN_SPAN_WORDS:
            return False
        idx = _find_on_boundary(hay, seg, pos)
        if idx < 0:
            return False
        pos = idx + len(seg)
    return True


# --------------------------------------------------------------------------
# Critical qualifiers
# --------------------------------------------------------------------------

CRITICAL_QUALIFIERS: tuple[str, ...] = (
    "usually", "often", "sometimes", "generally", "typically", "mostly", "rarely",
    "seldom", "may", "might", "can", "could", "most", "many", "some", "few",
    "unless", "except", "only", "if",
    "about", "around", "approximately", "roughly", "nearly", "almost",
    "at least", "at most", "up to",
    "never", "not", "no", "none", "without",
    "always",
)

# Qualifier families: an idea must keep at least one word from each family its
# spans contain. This allows paraphrase ("often" -> "frequently") but not
# dropping a hedge, negation, condition, approximation or universal.
QUALIFIER_FAMILIES: dict[str, frozenset[str]] = {
    "hedge": frozenset(
        """usually often sometimes generally typically mostly rarely seldom may might
        can could most many some few frequently commonly occasionally normally tend
        tends likely unlikely probably possibly mainly partly majority""".split()
    ),
    "negation": frozenset("not no never none without nor neither nothing nobody".split()),
    "condition": frozenset("unless except only if solely just when provided exception excluding but".split()),
    "approximation": frozenset(
        ["about", "around", "approximately", "roughly", "nearly", "almost", "at least",
         "at most", "up to", "circa", "close to", "estimated", "some"]
    ),
    "universal": frozenset("always every all each invariably consistently".split()),
}
_FAMILY_OF: dict[str, str] = {}
for _family in ("hedge", "negation", "condition", "approximation", "universal"):
    for _q in CRITICAL_QUALIFIERS:
        if _q in QUALIFIER_FAMILIES[_family] and _q not in _FAMILY_OF:
            _FAMILY_OF[_q] = _family


def _token_line(text: str) -> str:
    return " " + " ".join(words(text)) + " "


def detect_qualifiers(text: str) -> set[str]:
    """Canonical critical qualifiers present in ``text`` ("n't" -> "not")."""
    line = _token_line(text)
    return {q for q in CRITICAL_QUALIFIERS if f" {q} " in line}


def _families_present(text: str) -> set[str]:
    line = _token_line(text)
    return {
        fam for fam, members in QUALIFIER_FAMILIES.items() if any(f" {m} " in line for m in members)
    }


def qualifiers_listed(listed: list[str]) -> set[str]:
    canon: set[str] = set()
    for item in listed:
        canon |= detect_qualifiers(item)
        canon.add(" ".join(words(item)))
    return canon


# --------------------------------------------------------------------------
# Key-idea grounding
# --------------------------------------------------------------------------

MIN_IDEA_SUPPORT = 0.5


@dataclass
class GroundingOutcome:
    ideas: list[KeyIdea] = field(default_factory=list)
    rejected: list[RejectedIdea] = field(default_factory=list)
    flags: list[str] = field(default_factory=list)


def check_idea(idea: KeyIdea, source_text: str) -> tuple[KeyIdea | None, str | None, bool]:
    """Return (sanitised idea | None, rejection reason | None, qualifiers_sanitised)."""
    for span in idea.source_spans:
        if not span_in_text(span, source_text):
            return None, "source_span_not_in_source", False

    span_quals: set[str] = set()
    for span in idea.source_spans:
        span_quals |= detect_qualifiers(span)
    listed = qualifiers_listed(idea.critical_qualifiers)
    if not span_quals <= listed:
        return None, "critical_qualifier_not_listed", False

    # Qualifiers must also be preserved in the idea text itself.
    idea_families = _families_present(idea.idea)
    for q in span_quals:
        if _FAMILY_OF.get(q) not in idea_families:
            return None, "critical_qualifier_dropped_from_idea", False

    # Minimal lexical support check (a stand-in for, not a replacement of, a
    # real entailment verifier): no invented numbers or negation, and most of
    # the idea's content words must come from the source.
    if not numbers(idea.idea) <= numbers(source_text):
        return None, "number_not_in_source", False
    if "negation" in idea_families and not any(
        "negation" in _families_present(s) for s in idea.source_spans
    ):
        return None, "negation_not_in_source_span", False
    idea_stems = content_stems(idea.idea)
    if idea_stems:
        support = len(idea_stems & content_stems(source_text)) / len(idea_stems)
        if support < MIN_IDEA_SUPPORT:
            return None, "idea_not_supported_by_source", False

    # Keep only listed qualifiers that really occur in the spans.
    kept = [
        q for q in idea.critical_qualifiers
        if detect_qualifiers(q) & span_quals or " ".join(words(q)) in span_quals
    ]
    sanitised = kept != idea.critical_qualifiers
    if sanitised:
        idea = idea.model_copy(update={"critical_qualifiers": kept})
    return idea, None, sanitised


def ground_key_ideas(raw: KeyIdeaResult, request: KeyIdeasRequest) -> GroundingOutcome:
    out = GroundingOutcome()
    if raw.chunk_id != request.chunk_id:
        out.flags.append("chunk_id_overridden")
    seen: set[str] = set()
    sanitised_any = False
    for idea in raw.ideas:
        if idea.idea_id in seen:
            out.rejected.append(RejectedIdea(idea_id=idea.idea_id, reason="duplicate_idea_id"))
            continue
        seen.add(idea.idea_id)
        kept, reason, sanitised = check_idea(idea, request.source_text)
        if kept is None:
            out.rejected.append(RejectedIdea(idea_id=idea.idea_id, reason=reason or "rejected"))
            continue
        sanitised_any = sanitised_any or sanitised
        out.ideas.append(kept)
    if sanitised_any:
        out.flags.append("critical_qualifiers_sanitised")
    if out.rejected:
        out.flags.append("ideas_rejected")
    if len(out.ideas) > request.max_ideas:
        ranked = sorted(range(len(out.ideas)), key=lambda i: (-out.ideas[i].importance, i))
        keep = sorted(ranked[: request.max_ideas])
        out.ideas = [out.ideas[i] for i in keep]
        out.flags.append("ideas_truncated_to_max")
    return out
