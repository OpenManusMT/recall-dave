"""A001 adapter for the Recall candidate scorer (packages/core/src/scorer.ts).

The harness passes the whole case (including `expected`, `tags`, ids and, for
ASR cases, the confirmed transcript). This adapter deliberately forwards ONLY
`source_text`, `key_ideas` (id + text) and `spoken_transcript` so the scorer
cannot read the answer key, the category or id ordering.

The scorer is stateless and deterministic; every call is scored afresh (no
caching), so the harness's 5 runs are 5 independent evaluations of each case.
"""
import atexit
import json
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
BUNDLE = os.path.join(HERE, ".build", "scorer-cli.mjs")
FORBIDDEN_KEYS = ("case_id", "source_id", "title", "difficulty", "tags", "expected", "asr")

_proc = None


def build_request(case):
    return {
        "source_text": case["source_text"],
        "key_ideas": [{"idea_id": k["idea_id"], "text": k["text"]} for k in case["key_ideas"]],
        "transcript": case["spoken_transcript"],
    }


def _close():
    global _proc
    if _proc is not None and _proc.poll() is None:
        _proc.stdin.close()
        _proc.wait(timeout=10)
    _proc = None


def _get():
    global _proc
    if _proc is None or _proc.poll() is not None:
        if not os.path.exists(BUNDLE):
            raise RuntimeError("Scorer bundle missing: run `npm run a001` from the repository root.")
        _proc = subprocess.Popen(
            ["node", BUNDLE],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True,
            encoding="utf-8",
        )
        atexit.register(_close)
    return _proc


def score_case(case):
    p = _get()
    p.stdin.write(json.dumps(build_request(case), ensure_ascii=False) + "\n")
    p.stdin.flush()
    line = p.stdout.readline()
    out = json.loads(line)
    if "error" in out:
        raise RuntimeError(out["error"])
    return {
        "label": out["label"],
        "score": out["score"],
        "clue_level": out["clue_level"],
        "action": out["action"],
        "evidence": out["evidence"],
    }
