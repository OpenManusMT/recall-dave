"""Audio upload handling for /v1/transcribe.

* The multipart body is parsed in memory (bounded by the request size limit),
  so audio is never spooled to disk by the framework.
* A temporary file is written only if the provider declares
  ``requires_file = True``. It is created privately (``mkstemp``, mode 0600)
  and deleted in a ``finally`` block whether transcription succeeds or fails.
* Nothing here logs audio bytes, filenames or transcripts.
"""

from __future__ import annotations

import os
import tempfile
from dataclasses import dataclass, field

from python_multipart.exceptions import FormParserError
from python_multipart.multipart import MultipartParser, parse_options_header

from .config import MAX_AUDIO_BYTES
from .providers.base import AudioInput, TranscriptionProvider
from .schemas import TranscriptionResult

AUDIO_FIELD = "audio"
ALLOWED_AUDIO_TYPES = frozenset(
    {
        "audio/wav", "audio/x-wav", "audio/wave", "audio/mp4", "audio/m4a", "audio/x-m4a",
        "audio/aac", "audio/mpeg", "audio/webm", "audio/ogg", "audio/x-caf", "audio/flac",
        "application/octet-stream",
    }
)
_SUFFIX = {
    "audio/wav": ".wav", "audio/x-wav": ".wav", "audio/wave": ".wav", "audio/mp4": ".m4a",
    "audio/m4a": ".m4a", "audio/x-m4a": ".m4a", "audio/aac": ".aac", "audio/mpeg": ".mp3",
    "audio/webm": ".webm", "audio/ogg": ".ogg", "audio/x-caf": ".caf", "audio/flac": ".flac",
}
MAX_PARTS = 4


class AudioUploadError(Exception):
    def __init__(self, status: int, code: str, detail: str) -> None:
        super().__init__(code)
        self.status = status
        self.code = code
        self.detail = detail


@dataclass
class _Part:
    headers: dict[bytes, bytes] = field(default_factory=dict)
    data: bytearray = field(default_factory=bytearray)


@dataclass(frozen=True)
class AudioUpload:
    content_type: str
    data: bytes = field(repr=False)


def parse_audio_upload(content_type_header: str, body: bytes) -> AudioUpload:
    ctype, params = parse_options_header(content_type_header)
    if ctype != b"multipart/form-data":
        raise AudioUploadError(415, "unsupported_media_type", "send audio as multipart/form-data")
    boundary = params.get(b"boundary")
    if not boundary:
        raise AudioUploadError(422, "invalid_multipart", "multipart boundary is missing")

    parts: list[_Part] = []
    current = _Part()
    header_name = bytearray()
    header_value = bytearray()

    def on_part_begin() -> None:
        nonlocal current
        current = _Part()
        if len(parts) >= MAX_PARTS:
            raise AudioUploadError(422, "invalid_multipart", "too many form parts")

    def on_part_data(data: bytes, start: int, end: int) -> None:
        current.data.extend(data[start:end])
        if len(current.data) > MAX_AUDIO_BYTES:
            raise AudioUploadError(413, "payload_too_large", "audio exceeds the 5 MB limit")

    def on_part_end() -> None:
        parts.append(current)

    def on_header_field(data: bytes, start: int, end: int) -> None:
        header_name.extend(data[start:end])

    def on_header_value(data: bytes, start: int, end: int) -> None:
        header_value.extend(data[start:end])

    def on_header_end() -> None:
        current.headers[bytes(header_name).lower()] = bytes(header_value)
        header_name.clear()
        header_value.clear()

    callbacks = {
        "on_part_begin": on_part_begin,
        "on_part_data": on_part_data,
        "on_part_end": on_part_end,
        "on_header_field": on_header_field,
        "on_header_value": on_header_value,
        "on_header_end": on_header_end,
    }
    try:
        parser = MultipartParser(boundary, callbacks)  # type: ignore[arg-type]
        parser.write(body)
        parser.finalize()
    except AudioUploadError:
        raise
    except (FormParserError, ValueError):
        raise AudioUploadError(422, "invalid_multipart", "the multipart body could not be parsed") from None

    for part in parts:
        _, disp = parse_options_header(part.headers.get(b"content-disposition", b""))
        if disp.get(b"name") != AUDIO_FIELD.encode():
            continue
        if b"filename" not in disp:
            raise AudioUploadError(422, "invalid_audio", "the 'audio' field must be a file upload")
        part_type = parse_options_header(part.headers.get(b"content-type", b"application/octet-stream"))[0]
        media = part_type.decode("latin-1").lower()
        if media not in ALLOWED_AUDIO_TYPES:
            raise AudioUploadError(415, "unsupported_media_type", "the uploaded file is not a supported audio type")
        if not part.data:
            raise AudioUploadError(422, "empty_audio", "the uploaded audio is empty")
        return AudioUpload(content_type=media, data=bytes(part.data))
    raise AudioUploadError(422, "missing_audio", "a multipart file field named 'audio' is required")


def run_transcription(provider: TranscriptionProvider, upload: AudioUpload) -> TranscriptionResult:
    """Call the provider, writing a private temp file only if it needs one."""
    path: str | None = None
    try:
        if provider.requires_file:
            fd, path = tempfile.mkstemp(prefix="recall-audio-", suffix=_SUFFIX.get(upload.content_type, ".bin"))
            with os.fdopen(fd, "wb") as fh:
                fh.write(upload.data)
            audio = AudioInput(content_type=upload.content_type, path=path)
        else:
            audio = AudioInput(content_type=upload.content_type, data=upload.data)
        result = provider.transcribe(audio)
    finally:
        if path is not None:
            try:
                os.unlink(path)
            except FileNotFoundError:
                pass
    return TranscriptionResult.model_validate(
        result.model_dump() if isinstance(result, TranscriptionResult) else result
    )
