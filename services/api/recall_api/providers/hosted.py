"""Placeholder adapter for a named commercial (hosted) provider.

Never enabled by default. It is enabled only when ALL of these are set:

* ``RECALL_PROVIDER=hosted``
* ``RECALL_HOSTED_API_KEY`` (kept server-side; never sent to the app)
* ``RECALL_HOSTED_CONSENT=1`` (explicit consent to send text to that provider)
* ``RECALL_HOSTED_BASE_URL`` (https only) and ``RECALL_HOSTED_MODEL``

When enabled it reuses the OpenAI-compatible request shape
(``/v1/chat/completions``, JSON-only, temperature 0) against the hosted base
URL. ``RECALL_HOSTED_PROVIDER_NAME`` is used only for the disclosure text.
"""

from __future__ import annotations

import httpx

from ..config import Settings
from .openai_compatible import OpenAICompatibleClient, check_base_url


def hosted_status(settings: Settings) -> tuple[bool, str]:
    if settings.provider != "hosted":
        return False, "not selected (RECALL_PROVIDER is not hosted)"
    if not settings.hosted_api_key:
        return False, "RECALL_HOSTED_API_KEY is not set"
    if not settings.hosted_consent:
        return False, "consent flag RECALL_HOSTED_CONSENT=1 is not set"
    reason = check_base_url(settings.hosted_base_url, allow_insecure_http=False)
    if reason:
        return False, f"RECALL_HOSTED_BASE_URL: {reason}"
    if not settings.hosted_model:
        return False, "RECALL_HOSTED_MODEL is not set"
    return True, f"enabled: text is sent to {settings.hosted_provider_name}"


def build_hosted_client(
    settings: Settings, transport: httpx.BaseTransport | None = None
) -> OpenAICompatibleClient | None:
    enabled, _ = hosted_status(settings)
    if not enabled or settings.hosted_base_url is None or settings.hosted_model is None:
        return None
    return OpenAICompatibleClient(
        name="hosted",
        base_url=settings.hosted_base_url,
        model=settings.hosted_model,
        api_key=settings.hosted_api_key,
        timeout_s=settings.request_timeout_s,
        transport=transport,
    )
