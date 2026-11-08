"""Privacy-preserving logging.

Policy: logs record only operational metadata (method, path without query,
status, duration, provider outcome codes). They never contain request bodies,
reading text, learner text, audio or secrets.

Defence in depth on top of "don't log it":

* ``RedactingFilter`` rewrites every record it sees: secret-looking strings
  (bearer tokens, ``sk-...`` keys, ``api_key=...``, URL credentials, long
  opaque tokens), configured secret values and any text registered for the
  current request via ``sensitive_scope`` are replaced with ``[REDACTED]``.
  Exception tracebacks are dropped (they can embed user input) and replaced
  by the exception type name. Query strings are stripped from uvicorn's
  access log.
* ``PrivacyFormatter`` applies the same redaction to the final formatted line.
"""

from __future__ import annotations

import contextlib
import contextvars
import logging
import re
import sys
from collections.abc import Iterable, Iterator

REDACTED = "[REDACTED]"
LOGGER_ROOT = "recall_api"

_SECRET_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/=-]{4,}"),
    re.compile(r"\bsk-[A-Za-z0-9_-]{8,}"),
    re.compile(r"(?i)\b(api[_-]?key|access[_-]?token|token|secret|password|authorization)\b(\s*[=:]\s*)\S+"),
    re.compile(r"(?i)(://)[^/\s:@]+:[^/\s@]+@"),
    re.compile(r"\b[A-Za-z0-9_-]{40,}\b"),
)

_sensitive: contextvars.ContextVar[tuple[str, ...]] = contextvars.ContextVar(
    "recall_sensitive_values", default=()
)
_secrets: list[str] = []
MIN_SENSITIVE_FRAGMENT = 12


def register_secrets(values: Iterable[str]) -> None:
    """Remember configured secret values so they are redacted verbatim."""
    for v in values:
        if v and v not in _secrets:
            _secrets.append(v)


def _fragments(text: str) -> list[str]:
    parts = [text.strip()]
    parts += [p.strip() for p in re.split(r"(?<=[.!?\n])\s+", text)]
    return [p for p in parts if len(p) >= MIN_SENSITIVE_FRAGMENT]


@contextlib.contextmanager
def sensitive_scope(*texts: str | None) -> Iterator[None]:
    """Mark user-supplied text for the duration of a request.

    Any log line produced in this context that contains the text (or one of
    its sentences) has it replaced with ``[REDACTED]``.
    """
    values: list[str] = list(_sensitive.get())
    for t in texts:
        if t:
            values.extend(_fragments(t))
    token = _sensitive.set(tuple(sorted(set(values), key=len, reverse=True)))
    try:
        yield
    finally:
        _sensitive.reset(token)


def redact(text: str) -> str:
    out = text
    for value in _sensitive.get():
        if value in out:
            out = out.replace(value, REDACTED)
    for value in _secrets:
        out = out.replace(value, REDACTED)
    for pattern in _SECRET_PATTERNS:
        if pattern.groups >= 2:
            out = pattern.sub(lambda m: f"{m.group(1)}{m.group(2)}{REDACTED}", out)
        elif pattern.groups == 1:
            out = pattern.sub(lambda m: f"{m.group(1)}{REDACTED}@", out)
        else:
            out = pattern.sub(REDACTED, out)
    return out


def _strip_query(path: object) -> object:
    return path.split("?", 1)[0] if isinstance(path, str) else path


class RedactingFilter(logging.Filter):
    """Rewrites records in place; never drops them."""

    def filter(self, record: logging.LogRecord) -> bool:
        if getattr(record, "_recall_redacted", False):
            return True
        if record.exc_info or record.exc_text:
            exc_type = record.exc_info[0].__name__ if record.exc_info and record.exc_info[0] else "Exception"
            record.exc_info = None
            record.exc_text = None
            record.stack_info = None
            suffix = f" [exception {exc_type}; details suppressed for privacy]"
        else:
            suffix = ""
        if record.name.startswith("uvicorn.access") and isinstance(record.args, tuple) and len(record.args) == 5:
            # uvicorn's AccessFormatter needs the 5-tuple; keep its shape.
            client, method, path, version, status = record.args
            record.args = (client, method, redact(str(_strip_query(path))), version, status)
        else:
            try:
                message = record.getMessage()
            except Exception:  # malformed format args: keep only the template
                message = str(record.msg)
            record.msg = redact(message) + suffix
            record.args = None
        record._recall_redacted = True
        return True


class PrivacyFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return redact(super().format(record))


_FILTER = RedactingFilter()
_HANDLER_MARK = "_recall_privacy_handler"
WATCHED_LOGGERS = ("uvicorn", "uvicorn.error", "uvicorn.access", "httpx", "httpcore", "fastapi")


def _add_filter(target: logging.Logger | logging.Handler) -> None:
    if not any(isinstance(f, RedactingFilter) for f in target.filters):
        target.addFilter(_FILTER)


def get_logger(name: str) -> logging.Logger:
    """Module logger with the redacting filter attached (records are rewritten
    before any handler, including pytest's caplog, sees them)."""
    logger = logging.getLogger(name)
    _add_filter(logger)
    return logger


def configure_logging(level: str = "INFO", secrets: Iterable[str] = ()) -> None:
    """Idempotent: safe to call for every ``create_app``."""
    register_secrets(secrets)
    root = logging.getLogger(LOGGER_ROOT)
    _add_filter(root)
    root.setLevel(level)
    if not any(getattr(h, _HANDLER_MARK, False) for h in root.handlers):
        handler = logging.StreamHandler(sys.stderr)
        handler.setFormatter(PrivacyFormatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
        handler.addFilter(_FILTER)
        setattr(handler, _HANDLER_MARK, True)
        root.addHandler(handler)
    for name in WATCHED_LOGGERS:
        logger = logging.getLogger(name)
        _add_filter(logger)
        for h in logger.handlers:
            _add_filter(h)
    for h in logging.getLogger().handlers:
        _add_filter(h)
