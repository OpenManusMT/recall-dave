"""Provider selection and the plain-English data-flow disclosure.

There is no silent fallback: if a remote provider is selected but not fully
enabled (missing URL, key or consent flag), text endpoints answer 503 instead
of quietly using the lexical baseline, and no outbound request is attempted.
"""

from __future__ import annotations

from typing import Any

import httpx

from ..config import KNOWN_PROVIDERS, MAX_AUDIO_BYTES, MAX_SOURCE_CHARS, Settings
from .base import (
    AudioInput,
    KeyIdeaProvider,
    ProviderBundle,
    ProviderError,
    ProviderStatus,
    RecallScoringProvider,
    TranscriptionProvider,
)
from .fake import FakeKeyIdeaProvider, FakeRecallScoringProvider, FakeTranscriptionProvider
from .hosted import build_hosted_client, hosted_status
from .openai_compatible import (
    OpenAICompatibleKeyIdeaProvider,
    OpenAICompatibleRecallScoringProvider,
    build_openai_compatible_client,
    openai_compatible_status,
)

__all__ = [
    "AudioInput",
    "KeyIdeaProvider",
    "ProviderBundle",
    "ProviderError",
    "ProviderStatus",
    "RecallScoringProvider",
    "TranscriptionProvider",
    "build_providers",
    "build_disclosure",
]

TEXT_CAPS = ("key_ideas", "recall_scoring")


def build_providers(settings: Settings, http_transport: httpx.BaseTransport | None = None) -> ProviderBundle:
    statuses: list[ProviderStatus] = []
    key_ideas: KeyIdeaProvider | None = None
    scoring: RecallScoringProvider | None = None
    transcription: TranscriptionProvider | None = None
    destination: str | None = None
    label: str | None = None

    fake_selected = settings.provider == "fake"
    if fake_selected:
        key_ideas = FakeKeyIdeaProvider()
        scoring = FakeRecallScoringProvider(settings.scoring_weights)
    statuses.append(
        ProviderStatus(
            name="fake",
            enabled=fake_selected,
            capabilities=TEXT_CAPS,
            location="in-process (this server); no network",
            reason="enabled (default offline provider)" if fake_selected else "not selected",
        )
    )

    oa_enabled, oa_reason = openai_compatible_status(settings)
    oa_client = build_openai_compatible_client(settings, http_transport) if oa_enabled else None
    if oa_client is not None:
        key_ideas = OpenAICompatibleKeyIdeaProvider(oa_client)
        scoring = OpenAICompatibleRecallScoringProvider(oa_client, settings.scoring_weights)
        destination, label = oa_client.destination, "OpenAI-compatible endpoint"
    statuses.append(
        ProviderStatus(
            name="openai_compatible",
            enabled=oa_client is not None,
            capabilities=TEXT_CAPS,
            location=oa_client.destination if oa_client else "none",
            reason=oa_reason,
        )
    )

    h_enabled, h_reason = hosted_status(settings)
    h_client = build_hosted_client(settings, http_transport) if h_enabled else None
    if h_client is not None:
        key_ideas = OpenAICompatibleKeyIdeaProvider(h_client)
        scoring = OpenAICompatibleRecallScoringProvider(h_client, settings.scoring_weights)
        destination, label = h_client.destination, settings.hosted_provider_name
    statuses.append(
        ProviderStatus(
            name="hosted",
            enabled=h_client is not None,
            capabilities=TEXT_CAPS,
            location=h_client.destination if h_client else "none",
            reason=h_reason,
        )
    )

    if settings.provider not in KNOWN_PROVIDERS:
        statuses.append(
            ProviderStatus(
                name=settings.provider[:40],
                enabled=False,
                capabilities=(),
                location="none",
                reason="unknown RECALL_PROVIDER value; no text provider is active",
            )
        )

    # The fixed fake transcript is only ever served in fully-offline fake mode,
    # so a real deployment can never mistake it for the learner's words.
    if settings.transcription_provider == "fake" and fake_selected:
        transcription = FakeTranscriptionProvider()
        t_reason = "enabled (fixed placeholder transcript for offline testing)"
    elif settings.transcription_provider == "none":
        t_reason = "disabled (RECALL_TRANSCRIPTION_PROVIDER=none)"
    elif not fake_selected:
        t_reason = "disabled: no real transcription adapter is configured for this deployment"
    else:
        t_reason = "disabled: unknown RECALL_TRANSCRIPTION_PROVIDER value"
    statuses.append(
        ProviderStatus(
            name="fake_transcription",
            enabled=transcription is not None,
            capabilities=("transcription",),
            location="in-process (this server); no network",
            reason=t_reason,
        )
    )

    return ProviderBundle(
        key_ideas=key_ideas,
        scoring=scoring,
        transcription=transcription,
        statuses=statuses,
        text_destination=destination,
        text_provider_label=label,
    )


def build_disclosure(settings: Settings, bundle: ProviderBundle) -> dict[str, Any]:
    remote = bundle.text_destination is not None
    text_active = bundle.key_ideas is not None
    if remote:
        retention = settings.provider_retention_note or (
            "Not stated by the operator. Check the provider's data-retention terms before enabling."
        )
        text_flow = (
            f"Reading text (up to {MAX_SOURCE_CHARS} characters), its key ideas and your typed or "
            f"confirmed answer are sent over the network to {bundle.text_provider_label} at "
            f"{bundle.text_destination} to extract key ideas and score recall."
        )
    elif text_active:
        retention = "Not applicable: no external AI provider is used."
        text_flow = (
            "Reading text and answers are processed in memory on this server by built-in offline "
            "providers (verbatim sentence picking and a transparent word-overlap baseline). "
            "Nothing is sent to any other service."
        )
    else:
        retention = "Not applicable: no AI provider is active."
        text_flow = (
            "No text provider is active, so AI requests are refused and no text is sent anywhere. "
            "The app keeps working offline without this service."
        )
    if bundle.transcription is not None:
        audio_flow = (
            f"Audio uploads (max {MAX_AUDIO_BYTES // (1024 * 1024)} MB) are held in memory only for the "
            "request and answered with a fixed placeholder transcript. Audio is never stored, "
            "forwarded or logged."
        )
    else:
        audio_flow = "Transcription is unavailable. Audio is not accepted and is not sent anywhere."

    active = {
        "key_ideas": bundle.key_ideas.name if bundle.key_ideas else None,
        "recall_scoring": bundle.scoring.name if bundle.scoring else None,
        "transcription": bundle.transcription.name if bundle.transcription else None,
    }
    return {
        "selected_provider": settings.provider if settings.provider in KNOWN_PROVIDERS else "unknown",
        "active": active,
        "providers": [
            {
                "name": s.name,
                "enabled": s.enabled,
                "capabilities": list(s.capabilities),
                "location": s.location,
                "reason": s.reason,
            }
            for s in bundle.statuses
        ],
        "consent": {
            "remote_text_allowed": settings.allow_remote_text,
            "hosted_consent": settings.hosted_consent,
        },
        "a001_gate_passed": False,
        "shadow_only": True,
        "data_flow": {
            "summary": " ".join([text_flow, audio_flow]),
            "text": text_flow,
            "audio": audio_flow,
            "service_retention": (
                "This service stores nothing. Requests are processed in memory and discarded after "
                "the response. Temporary audio files, if a provider needs one, are deleted "
                "immediately after use."
            ),
            "provider_retention": retention,
            "logging": (
                "Logs record only method, path, status and timing. Request bodies, reading text, "
                "answers, audio and secrets are never logged."
            ),
            "scoring_status": (
                "No scorer in this service has passed the A001 safety gate. Scores are shadow-only "
                "and must not drive the live review schedule."
            ),
        },
    }
