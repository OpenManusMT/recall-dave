"""FastAPI app factory for the optional Recall AI/transcription adapter.

The Recall app works fully offline without this service. When deployed, it
keeps provider keys server-side and applies source-grounding and safety
post-processing to every provider's output.

Run: ``uvicorn recall_api.main:app`` (reads configuration from the environment).
"""

from __future__ import annotations

import time
from typing import Any

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from . import __version__
from .audio import AudioUploadError, parse_audio_upload, run_transcription
from .config import MAX_AUDIO_BYTES, MAX_JSON_BODY_BYTES, MULTIPART_OVERHEAD_BYTES, Settings
from .grounding import ground_key_ideas
from .logging_utils import configure_logging, get_logger, sensitive_scope
from .providers import ProviderBundle, ProviderError, build_disclosure, build_providers
from .safety import asr_uncertain_response, enforce_score_safety
from .schemas import (
    KeyIdeaResponse,
    KeyIdeaResult,
    KeyIdeasRequest,
    RecallScoreRequest,
    RecallScoreResponse,
    RecallScoreResult,
    TranscriptionResponse,
    TranscriptMeta,
)

log = get_logger(__name__)

TRANSCRIBE_PATH = "/v1/transcribe"


class ApiError(Exception):
    def __init__(self, status: int, error: str, detail: str, **extra: Any) -> None:
        super().__init__(error)
        self.status = status
        self.error = error
        self.detail = detail
        self.extra = extra


class PayloadTooLarge(StarletteHTTPException):
    def __init__(self) -> None:
        super().__init__(status_code=413, detail="request body is too large")


def _error_body(error: str, detail: str, **extra: Any) -> dict[str, Any]:
    return {"error": error, "detail": detail, **extra}


async def _send_json(send: Send, status: int, body: bytes) -> None:
    await send(
        {
            "type": "http.response.start",
            "status": status,
            "headers": [(b"content-type", b"application/json"), (b"cache-control", b"no-store")],
        }
    )
    await send({"type": "http.response.body", "body": body})


class BodySizeLimitMiddleware:
    """Rejects oversized bodies with 413 before they are parsed."""

    def __init__(self, app: ASGIApp, default_limit: int, path_limits: dict[str, int]) -> None:
        self.app = app
        self.default_limit = default_limit
        self.path_limits = path_limits

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        limit = self.path_limits.get(scope["path"], self.default_limit)
        for name, value in scope.get("headers", []):
            if name == b"content-length":
                try:
                    declared = int(value)
                except ValueError:
                    await _send_json(send, 400, b'{"error":"invalid_request","detail":"bad content-length"}')
                    return
                if declared > limit:
                    await _send_json(send, 413, b'{"error":"payload_too_large","detail":"request body is too large"}')
                    return
        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    raise PayloadTooLarge()
            return message

        await self.app(scope, limited_receive, send)


class PrivacyMiddleware:
    """Metadata-only request log plus no-store / nosniff response headers."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        started = time.perf_counter()
        status = 500

        async def send_wrapper(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                headers = list(message.get("headers", []))
                headers += [
                    (b"cache-control", b"no-store"),
                    (b"x-content-type-options", b"nosniff"),
                    (b"referrer-policy", b"no-referrer"),
                ]
                message = {**message, "headers": headers}
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            # Path only: no query string, headers or body.
            log.info(
                "request method=%s path=%s status=%d duration_ms=%d",
                scope.get("method", "?"),
                scope.get("path", "?"),
                status,
                int((time.perf_counter() - started) * 1000),
            )


def _provider_failure(exc: ProviderError) -> ApiError:
    log.warning("provider_error code=%s", exc.code)
    return ApiError(502, "provider_error", exc.detail, code=exc.code)


def create_app(
    settings: Settings | None = None,
    *,
    providers: ProviderBundle | None = None,
    http_transport: httpx.BaseTransport | None = None,
) -> FastAPI:
    """Build the app. ``providers``/``http_transport`` are injection points for tests."""
    settings = settings or Settings.from_env()
    configure_logging(settings.log_level, settings.secret_values())
    bundle = providers or build_providers(settings, http_transport=http_transport)

    app = FastAPI(
        title="Recall AI adapter (optional)",
        version=__version__,
        description="Optional source-grounded AI/transcription adapter. Remote providers are off by default.",
        docs_url=None,  # no third-party CDN assets
        redoc_url=None,
        openapi_url="/openapi.json",
    )
    app.state.settings = settings
    app.state.providers = bundle

    app.add_middleware(
        BodySizeLimitMiddleware,
        default_limit=MAX_JSON_BODY_BYTES,
        path_limits={TRANSCRIBE_PATH: MAX_AUDIO_BYTES + MULTIPART_OVERHEAD_BYTES},
    )
    if settings.allowed_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(settings.allowed_origins),
            allow_methods=["GET", "POST"],
            allow_headers=["Content-Type"],
            allow_credentials=False,
            max_age=600,
        )
    app.add_middleware(PrivacyMiddleware)

    # ---------------------------------------------------------------- errors
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(_error_body(exc.error, exc.detail, **exc.extra), status_code=exc.status)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Never echo submitted values back ("input"/"ctx" are omitted).
        errors = [
            {"loc": [str(p) for p in e.get("loc", ())], "msg": e.get("msg", ""), "type": e.get("type", "")}
            for e in exc.errors()
        ]
        return JSONResponse(_error_body("invalid_request", "request failed validation", errors=errors), 422)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        codes = {404: "not_found", 405: "method_not_allowed", 413: "payload_too_large"}
        error = codes.get(exc.status_code, "http_error")
        return JSONResponse(_error_body(error, str(exc.detail)), status_code=exc.status_code)

    @app.exception_handler(Exception)
    async def _unexpected(_: Request, exc: Exception) -> JSONResponse:
        log.error("unhandled_error type=%s", type(exc).__name__)
        return JSONResponse(_error_body("internal_error", "unexpected server error"), status_code=500)

    # ---------------------------------------------------------------- routes
    @app.get("/health")
    def health() -> dict[str, Any]:
        return {
            "status": "ok",
            "service": "recall-api",
            "version": __version__,
            "optional": True,
            "providers": {
                "key_ideas": bundle.key_ideas.name if bundle.key_ideas else None,
                "recall_scoring": bundle.scoring.name if bundle.scoring else None,
                "transcription": bundle.transcription.name if bundle.transcription else None,
            },
        }

    @app.get("/v1/providers")
    def providers_info() -> dict[str, Any]:
        return build_disclosure(settings, bundle)

    @app.post("/v1/key-ideas", response_model=KeyIdeaResponse)
    def key_ideas(request: KeyIdeasRequest) -> KeyIdeaResponse:
        with sensitive_scope(request.source_text):
            provider = bundle.key_ideas
            if provider is None:
                raise ApiError(503, "provider_unavailable", "no key-idea provider is enabled on this server")
            try:
                proposed = provider.extract_key_ideas(request)
                # Re-validate whatever the provider returned against the strict contract.
                raw = KeyIdeaResult.model_validate(
                    proposed.model_dump() if isinstance(proposed, KeyIdeaResult) else proposed
                )
            except ProviderError as exc:
                raise _provider_failure(exc) from None
            except ValidationError:
                raise _provider_failure(
                    ProviderError("provider_schema_mismatch", "provider output did not match the schema")
                ) from None
            outcome = ground_key_ideas(raw, request)
            rejected = [r.model_dump() for r in outcome.rejected]
            log.info("key_ideas provider=%s accepted=%d rejected=%d", provider.name, len(outcome.ideas), len(rejected))
            if not outcome.ideas:
                raise ApiError(
                    422,
                    "no_grounded_ideas",
                    "no proposed idea could be grounded verbatim in the source text",
                    chunk_id=request.chunk_id,
                    rejected=rejected,
                )
            return KeyIdeaResponse(
                chunk_id=request.chunk_id,
                ideas=outcome.ideas,
                provider=provider.name,
                flags=outcome.flags,
                rejected=outcome.rejected,
            )

    @app.post("/v1/score-recall", response_model=RecallScoreResponse)
    def score_recall(request: RecallScoreRequest) -> RecallScoreResponse:
        with sensitive_scope(request.source_text, request.learner_text, *(k.text for k in request.key_ideas)):
            if request.needs_transcript_confirmation:
                # Rule d: never score (or even send) an unconfirmed ASR transcript.
                log.info("score_recall outcome=asr_unconfirmed provider_called=false")
                return asr_uncertain_response(request)
            provider = bundle.scoring
            if provider is None:
                raise ApiError(503, "provider_unavailable", "no recall-scoring provider is enabled on this server")
            try:
                proposed = provider.score_recall(request)
                raw = RecallScoreResult.model_validate(
                    proposed.model_dump() if isinstance(proposed, RecallScoreResult) else proposed
                )
                result = enforce_score_safety(raw, request, provider.name)
            except ProviderError as exc:
                raise _provider_failure(exc) from None
            except ValidationError:
                raise _provider_failure(
                    ProviderError("provider_schema_mismatch", "provider output did not match the schema")
                ) from None
            log.info("score_recall provider=%s label=%s flags=%d", provider.name, result.label, len(result.flags))
            return result

    @app.post(TRANSCRIBE_PATH, response_model=TranscriptionResponse)
    async def transcribe(request: Request) -> TranscriptionResponse:
        provider = bundle.transcription
        if provider is None:
            raise ApiError(
                503,
                "transcription_unavailable",
                "transcription is not configured on this server; type the answer instead",
            )
        try:
            upload = parse_audio_upload(request.headers.get("content-type", ""), await request.body())
        except AudioUploadError as exc:
            raise ApiError(exc.status, exc.code, exc.detail) from None
        try:
            result = await run_in_threadpool(run_transcription, provider, upload)
        except ProviderError as exc:
            raise _provider_failure(exc) from None
        except ValidationError:
            raise _provider_failure(
                ProviderError("provider_schema_mismatch", "provider output did not match the schema")
            ) from None
        log.info("transcribe provider=%s outcome=ok", provider.name)
        return TranscriptionResponse(
            transcript=result.transcript,
            confidence=result.confidence,
            provider=provider.name,
            transcript_meta=TranscriptMeta(origin="asr", confirmed=False, asr_confidence=result.confidence),
        )

    return app


app = create_app()
