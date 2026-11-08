"""Provider interfaces and shared types.

Providers only *propose* results. The service validates every proposal against
the strict schemas and runs the grounding/safety post-processing on it, so a
provider can never bypass the safety rules.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable

from ..schemas import (
    KeyIdeaResult,
    KeyIdeasRequest,
    RecallScoreRequest,
    RecallScoreResult,
    TranscriptionResult,
)


class ProviderError(Exception):
    """A provider failed or returned unusable output.

    ``code`` and ``detail`` are fixed, safe strings chosen by our code. They
    never contain provider output, request text, audio or secrets.
    """

    def __init__(self, code: str, detail: str) -> None:
        super().__init__(code)
        self.code = code
        self.detail = detail


@dataclass(frozen=True)
class AudioInput:
    """Audio handed to a transcription provider.

    Exactly one of ``data`` (in memory) or ``path`` (a temporary file that the
    service deletes in a ``finally`` block) is set.
    """

    content_type: str
    data: bytes | None = field(default=None, repr=False)
    path: str | None = None


@runtime_checkable
class KeyIdeaProvider(Protocol):
    name: str

    def extract_key_ideas(self, request: KeyIdeasRequest) -> KeyIdeaResult: ...


@runtime_checkable
class RecallScoringProvider(Protocol):
    name: str

    def score_recall(self, request: RecallScoreRequest) -> RecallScoreResult: ...


@runtime_checkable
class TranscriptionProvider(Protocol):
    name: str
    # True if the provider needs a file path (e.g. a local CLI); the service
    # then writes a private temp file and always deletes it afterwards.
    requires_file: bool

    def transcribe(self, audio: AudioInput) -> TranscriptionResult: ...


@dataclass(frozen=True)
class ProviderStatus:
    name: str
    enabled: bool
    capabilities: tuple[str, ...]
    location: str
    reason: str


@dataclass
class ProviderBundle:
    key_ideas: KeyIdeaProvider | None
    scoring: RecallScoringProvider | None
    transcription: TranscriptionProvider | None
    statuses: list[ProviderStatus] = field(default_factory=list)
    # Where text/audio goes, for the /v1/providers disclosure.
    text_destination: str | None = None
    text_provider_label: str | None = None
