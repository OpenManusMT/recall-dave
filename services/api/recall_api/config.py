"""Service configuration, read once from environment variables.

Every remote provider is OFF unless the operator sets the explicit consent flag
for it. Secrets (API keys) are kept out of ``repr`` so they never reach logs or
tracebacks by accident.
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass, field

__all__ = [
    "Settings",
    "ScoringWeights",
    "MAX_SOURCE_CHARS",
    "MAX_LEARNER_CHARS",
    "MAX_KEY_IDEAS",
    "MAX_IDEA_CHARS",
    "MAX_AUDIO_BYTES",
    "MAX_JSON_BODY_BYTES",
    "ID_PATTERN",
    "KNOWN_PROVIDERS",
]

# --- Input bounds (shared by schemas, middleware and tests) -----------------
MAX_SOURCE_CHARS = 4000
MAX_LEARNER_CHARS = 2000
MAX_KEY_IDEAS = 3
MAX_IDEA_CHARS = 1000
MAX_AUDIO_BYTES = 5 * 1024 * 1024
# Generous cap for JSON bodies: 4000 + 2000 chars plus key ideas, even if every
# character were a 6-byte JSON escape, stays well below this.
MAX_JSON_BODY_BYTES = 96 * 1024
# Multipart framing overhead allowed on top of the audio payload.
MULTIPART_OVERHEAD_BYTES = 64 * 1024

ID_PATTERN = r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$"

KNOWN_PROVIDERS = ("fake", "openai_compatible", "hosted")


@dataclass(frozen=True)
class ScoringWeights:
    """Per-idea weights from 03-ADAPTIVE-ALGORITHM.md section 3.

    These are an engineering hypothesis and must stay configurable.
    Contradiction is a hard override, not a weight.
    """

    coverage: float = 0.55
    entailment: float = 0.35
    relationship: float = 0.10


def _flag(env: Mapping[str, str], name: str) -> bool:
    """Consent flags are only ON for the exact value ``1``."""
    return env.get(name, "").strip() == "1"


def _opt(env: Mapping[str, str], name: str) -> str | None:
    value = env.get(name, "").strip()
    return value or None


def _origins(raw: str | None) -> tuple[str, ...]:
    if not raw:
        return ()
    out: list[str] = []
    for part in raw.split(","):
        origin = part.strip().rstrip("/")
        # Wildcards and the opaque "null" origin are never allowed.
        if not origin or origin in {"*", "null"}:
            continue
        if not (origin.startswith("https://") or origin.startswith("http://")):
            continue
        if origin not in out:
            out.append(origin)
    return tuple(out)


def _float(env: Mapping[str, str], name: str, default: float, lo: float, hi: float) -> float:
    raw = env.get(name, "").strip()
    if not raw:
        return default
    try:
        value = float(raw)
    except ValueError:
        return default
    return min(max(value, lo), hi)


@dataclass(frozen=True)
class Settings:
    provider: str = "fake"
    transcription_provider: str = "fake"

    llm_base_url: str | None = None
    llm_api_key: str | None = field(default=None, repr=False)
    llm_model: str = "local-model"
    allow_remote_text: bool = False
    llm_allow_insecure_http: bool = False
    request_timeout_s: float = 20.0

    hosted_provider_name: str = "hosted provider (unnamed placeholder)"
    hosted_base_url: str | None = None
    hosted_model: str | None = None
    hosted_api_key: str | None = field(default=None, repr=False)
    hosted_consent: bool = False

    provider_retention_note: str | None = None
    allowed_origins: tuple[str, ...] = ()
    log_level: str = "INFO"
    scoring_weights: ScoringWeights = field(default_factory=ScoringWeights)

    @classmethod
    def from_env(cls, environ: Mapping[str, str] | None = None) -> Settings:
        env = os.environ if environ is None else environ
        provider = (env.get("RECALL_PROVIDER", "").strip().lower() or "fake")
        transcription = (env.get("RECALL_TRANSCRIPTION_PROVIDER", "").strip().lower() or "fake")
        log_level = (env.get("RECALL_LOG_LEVEL", "").strip().upper() or "INFO")
        if log_level not in {"DEBUG", "INFO", "WARNING", "ERROR"}:
            log_level = "INFO"
        return cls(
            provider=provider,
            transcription_provider=transcription,
            llm_base_url=_opt(env, "RECALL_LLM_BASE_URL"),
            llm_api_key=_opt(env, "RECALL_LLM_API_KEY"),
            llm_model=_opt(env, "RECALL_LLM_MODEL") or "local-model",
            allow_remote_text=_flag(env, "RECALL_ALLOW_REMOTE_TEXT"),
            llm_allow_insecure_http=_flag(env, "RECALL_LLM_ALLOW_INSECURE_HTTP"),
            request_timeout_s=_float(env, "RECALL_LLM_TIMEOUT_S", 20.0, 1.0, 120.0),
            hosted_provider_name=_opt(env, "RECALL_HOSTED_PROVIDER_NAME")
            or "hosted provider (unnamed placeholder)",
            hosted_base_url=_opt(env, "RECALL_HOSTED_BASE_URL"),
            hosted_model=_opt(env, "RECALL_HOSTED_MODEL"),
            hosted_api_key=_opt(env, "RECALL_HOSTED_API_KEY"),
            hosted_consent=_flag(env, "RECALL_HOSTED_CONSENT"),
            provider_retention_note=_opt(env, "RECALL_PROVIDER_RETENTION_NOTE"),
            allowed_origins=_origins(env.get("RECALL_ALLOWED_ORIGINS")),
            log_level=log_level,
        )

    def secret_values(self) -> tuple[str, ...]:
        """Configured secrets, so the log filter can redact them verbatim."""
        return tuple(v for v in (self.llm_api_key, self.hosted_api_key) if v)
