"""Guards for the A001 integration (run by scripts/run-a001.mjs)."""
import hashlib
import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
PACK = os.path.join(ROOT, "spec-source", "Read-Remember-Codex-Pack-v0.2")
sys.path.insert(0, HERE)
import recall_adapter  # noqa: E402


def sha256(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


class AdapterTests(unittest.TestCase):
    def test_original_pack_is_unchanged(self):
        manifest = json.load(open(os.path.join(PACK, "MANIFEST.json"), encoding="utf-8"))
        for entry in manifest["files"]:
            self.assertEqual(sha256(os.path.join(PACK, entry["path"])), entry["sha256"], entry["path"])

    def test_holdout_is_frozen(self):
        d = os.path.join(HERE, "holdout")
        for line in open(os.path.join(d, "FROZEN.sha256"), encoding="utf-8"):
            digest, name = line.split()
            self.assertEqual(sha256(os.path.join(d, name)), digest, name)

    def test_scorer_never_sees_answer_key_or_ids(self):
        case = json.loads(open(os.path.join(PACK, "A001-harness", "cases.jsonl"), encoding="utf-8").readline())
        req = recall_adapter.build_request(case)
        self.assertEqual(set(req), {"source_text", "key_ideas", "transcript"})
        blob = json.dumps(req)
        for key in recall_adapter.FORBIDDEN_KEYS:
            self.assertNotIn(f'"{key}"', blob)
        self.assertEqual(set(req["key_ideas"][0]), {"idea_id", "text"})

    def test_asr_confirmed_transcript_is_not_forwarded(self):
        for line in open(os.path.join(PACK, "A001-harness", "cases.jsonl"), encoding="utf-8"):
            case = json.loads(line)
            if "asr" in case:
                req = recall_adapter.build_request(case)
                self.assertEqual(req["transcript"], case["spoken_transcript"])
                self.assertNotIn(case["asr"]["confirmed_transcript"], json.dumps(req))
                break


if __name__ == "__main__":
    unittest.main()
