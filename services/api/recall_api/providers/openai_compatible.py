"""OpenAI-compatible chat-completions adapter (e.g. a local model server).

Disabled unless ALL of these hold:

* ``RECALL_PROVIDER=openai_compatible``
* ``RECALL_LLM_BASE_URL`` is set (https, or http only for loopback hosts unless
  ``RECALL_LLM_ALLOW_INSECURE_HTTP=1``)
* ``RECALL_ALLOW_REMOTE_TEXT=1`` (explicit consent to send reading/answer text)

``RECALL_LLM_API_KEY`` is optional (local servers often need none). Requests go
only to ``<base>/v1/chat/completions``; redirects are not followed and URLs in
user text are never fetched. Errors are reported as fixed codes: provider
output is never echoed or logged because it may contain the user's text.
"""

from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import urlsplit

import httpx
from pydantic import ValidationError

from ..config import ScoringWeights, Settings
from ..logging_utils import get_logger
from ..prompts import build_key_idea_messages, build_scoring_messages
from ..schemas import KeyIdeaResult, KeyIdeasRequest, RecallScoreRequest, RecallScoreResult
from .base import ProviderError

log = get_logger(__name__)

LOOPBACK_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})
MAX_RESPONSE_BYTES = 256 * 1024
_FENCE = re.compile(r"^```(?:json)?\s*(.*?)\s*```$", re.DOTALL)


def check_base_url(url: str | None, *, allow_insecure_http: bool = False) -> str | None:
    """Return a reason string if ``url`` is unacceptable, else None."""
    if not url:
        return "base URL is not set"
    try:
        parts = urlsplit(url)
    except ValueError:
        return "base URL is not a valid URL"
    if parts.scheme not in {"http", "https"}:
        return "base URL must use https"
    if not parts.hostname:
        return "base URL has no host"
    if parts.username or parts.password:
        return "credentials must not be embedded in the base URL"
    if parts.query or parts.fragment:
        return "base URL must not contain a query or fragment"
    if parts.scheme == "http" and parts.hostname not in LOOPBACK_HOSTS and not allow_insecure_http:
        return "plain http is only allowed for loopback hosts"
    return None


def describe_destination(url: str) -> str:
    """scheme://host[:port] only - never paths, queries or credentials."""
    parts = urlsplit(url)
    host = parts.hostname or "unknown-host"
    if ":" in host:
        host = f"[{host}]"
    port = f":{parts.port}" if parts.port else ""
    return f"{parts.scheme}://{host}{port}"


def chat_completions_url(base_url: str) -> str:
    base = base_url.rstrip("/")
    if base.endswith("/v1"):
        return f"{base}/chat/completions"
    return f"{base}/v1/chat/completions"


def openai_compatible_status(settings: Settings) -> tuple[bool, str]:
    if settings.provider != "openai_compatible":
        return False, "not selected (RECALL_PROVIDER is not openai_compatible)"
    reason = check_base_url(settings.llm_base_url, allow_insecure_http=settings.llm_allow_insecure_http)
    if reason:
        return False, f"RECALL_LLM_BASE_URL: {reason}"
    if not settings.allow_remote_text:
        return False, "consent flag RECALL_ALLOW_REMOTE_TEXT=1 is not set"
    return True, "enabled: text is sent to the configured OpenAI-compatible endpoint"


class OpenAICompatibleClient:
    def __init__(
        self,
        *,
        name: str,
        base_url: str,
        model: str,
        api_key: str | None = None,
        timeout_s: float = 20.0,
        transport: httpx.BaseTransport | None = None,
        max_tokens: int = 1200,
    ) -> None:
        self.name = name
        self.endpoint = chat_completions_url(base_url)
        self.destination = describe_destination(base_url)
        self._model = model
        self._api_key = api_key
        self._timeout = httpx.Timeout(timeout_s)
        self._transport = transport
        self._max_tokens = max_tokens

    def __repr__(self) -> str:  # never include the key
        return f"OpenAICompatibleClient(name={self.name!r}, destination={self.destination!r})"

    def request_body(self, messages: list[dict[str, str]]) -> dict[str, Any]:
        return {
            "model": self._model,
            "messages": messages,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "max_tokens": self._max_tokens,
            "stream": False,
        }

    def complete_json(self, messages: list[dict[str, str]]) -> dict[str, Any]:
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        try:
            with httpx.Client(
                transport=self._transport, timeout=self._timeout, follow_redirects=False
            ) as client:
                response = client.post(self.endpoint, json=self.request_body(messages), headers=headers)
        except httpx.TimeoutException:
            log.warning("provider=%s outcome=timeout", self.name)
            raise ProviderError("provider_timeout", "the AI provider did not respond in time") from None
        except httpx.HTTPError:
            log.warning("provider=%s outcome=unreachable", self.name)
            raise ProviderError("provider_unreachable", "the AI provider could not be reached") from None

        if response.status_code != 200:
            log.warning("provider=%s outcome=http_status status=%d", self.name, response.status_code)
            raise ProviderError("provider_http_error", f"the AI provider returned HTTP {response.status_code}")
        if len(response.content) > MAX_RESPONSE_BYTES:
            raise ProviderError("provider_malformed_output", "the AI provider response was too large")
        try:
            envelope = response.json()
            content = envelope["choices"][0]["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError):
            raise ProviderError("provider_malformed_output", "the AI provider response was not valid JSON") from None
        if not isinstance(content, str):
            raise ProviderError("provider_malformed_output", "the AI provider response had no text content")
        content = content.strip()
        fenced = _FENCE.match(content)
        if fenced:
            content = fenced.group(1)
        try:
            parsed = json.loads(content)
        except ValueError:
            log.warning("provider=%s outcome=malformed_json", self.name)
            raise ProviderError("provider_malformed_output", "the AI provider did not return valid JSON") from None
        if not isinstance(parsed, dict):
            raise ProviderError("provider_malformed_output", "the AI provider did not return a JSON object")
        log.info("provider=%s outcome=ok", self.name)
        return parsed


def _validate(model: type, data: dict[str, Any]) -> Any:
    try:
        return model.model_validate(data)
    except ValidationError:
        # Do not chain: pydantic errors embed input values (possibly user text).
        raise ProviderError(
            "provider_schema_mismatch", "the AI provider output did not match the required schema"
        ) from None


class OpenAICompatibleKeyIdeaProvider:
    def __init__(self, client: OpenAICompatibleClient) -> None:
        self.client = client
        self.name = client.name

    def extract_key_ideas(self, request: KeyIdeasRequest) -> KeyIdeaResult:
        return _validate(KeyIdeaResult, self.client.complete_json(build_key_idea_messages(request)))


class OpenAICompatibleRecallScoringProvider:
    def __init__(self, client: OpenAICompatibleClient, weights: ScoringWeights | None = None) -> None:
        self.client = client
        self.name = client.name
        self.weights = weights or ScoringWeights()

    def score_recall(self, request: RecallScoreRequest) -> RecallScoreResult:
        messages = build_scoring_messages(request, self.weights)
        return _validate(RecallScoreResult, self.client.complete_json(messages))


def build_openai_compatible_client(
    settings: Settings, transport: httpx.BaseTransport | None = None
) -> OpenAICompatibleClient | None:
    enabled, _ = openai_compatible_status(settings)
    if not enabled or settings.llm_base_url is None:
        return None
    return OpenAICompatibleClient(
        name="openai_compatible",
        base_url=settings.llm_base_url,
        model=settings.llm_model,
        api_key=settings.llm_api_key,
        timeout_s=settings.request_timeout_s,
        transport=transport,
    )
